#!/usr/bin/env python3
import argparse
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def print_progress(percent, message):
    print(f"PROGRESS:{int(percent)}:{message}", flush=True)


def safe_float(value, fallback=0.0):
    try:
        return float(value)
    except Exception:
        return fallback


def run_cmd(args):
    proc = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or "Command failed")
    return proc.stdout.strip()


def prepare_audio_from_youtube(url, work_dir):
    print_progress(15, "Downloading YouTube audio")
    out_path = os.path.join(work_dir, "input_audio.%(ext)s")
    run_cmd(["yt-dlp", "-f", "bestaudio", "-o", out_path, url])

    found = None
    for p in Path(work_dir).glob("input_audio.*"):
        if p.is_file():
            found = str(p)
            break
    if not found:
        raise RuntimeError("Unable to download audio from YouTube")
    return found


def normalize_audio(input_path, work_dir):
    print_progress(25, "Normalizing audio")
    wav_path = os.path.join(work_dir, "analysis.wav")
    run_cmd([
        "ffmpeg", "-y", "-i", input_path, "-ac", "1", "-ar", "22050", wav_path
    ])
    return wav_path


def chord_templates():
    import numpy as np
    roots = list(range(12))
    templates = []
    qualities = {
        "": [0, 4, 7],
        "m": [0, 3, 7],
        "7": [0, 4, 7, 10],
        "maj7": [0, 4, 7, 11],
        "m7": [0, 3, 7, 10],
        "sus2": [0, 2, 7],
        "sus4": [0, 5, 7],
    }
    names = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    for root in roots:
        for q_name, intervals in qualities.items():
            vec = np.zeros(12)
            for i in intervals:
                vec[(root + i) % 12] = 1.0
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
            templates.append((f"{names[root]}{q_name}", vec))
    return templates


def detect_beats_and_chords(wav_path):
    print_progress(40, "Detecting beats and chords")
    import numpy as np
    import librosa

    y, sr = librosa.load(wav_path, sr=22050, mono=True)
    if len(y) == 0:
        return [], [], []

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr, trim=False)
    beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()
    if not beat_times:
        duration = librosa.get_duration(y=y, sr=sr)
        step = 0.5
        beat_times = [round(t, 3) for t in np.arange(0, duration, step).tolist()]

    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    frame_times = librosa.frames_to_time(range(chroma.shape[1]), sr=sr).tolist()
    templates = chord_templates()

    def chroma_for_window(start_t, end_t):
        idx = [i for i, t in enumerate(frame_times) if start_t <= t < end_t]
        if not idx:
            return None
        vec = np.mean(chroma[:, idx], axis=1)
        n = np.linalg.norm(vec)
        if n <= 0:
            return None
        return vec / n

    segments = []
    for i, start in enumerate(beat_times):
        end = beat_times[i + 1] if i + 1 < len(beat_times) else start + 0.5
        vec = chroma_for_window(start, end)
        if vec is None:
            continue
        best_name = "N"
        best_score = -1.0
        for name, tmpl in templates:
            score = float(np.dot(vec, tmpl))
            if score > best_score:
                best_score = score
                best_name = name
        confidence = max(0.0, min(1.0, (best_score + 1.0) / 2.0))
        segments.append({
            "name": best_name,
            "start": round(start, 3),
            "end": round(end, 3),
            "confidence": round(confidence, 3)
        })

    smoothed = []
    for seg in segments:
        if smoothed and smoothed[-1]["name"] == seg["name"]:
            smoothed[-1]["end"] = seg["end"]
            smoothed[-1]["confidence"] = round((smoothed[-1]["confidence"] + seg["confidence"]) / 2.0, 3)
        else:
            smoothed.append(seg)

    downbeats = beat_times[::4] if beat_times else []
    return smoothed, [round(x, 3) for x in beat_times], [round(x, 3) for x in downbeats]


def transcribe_lyrics(wav_path, language_mode):
    print_progress(70, "Transcribing lyrics")
    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        raise RuntimeError(
            "Missing faster-whisper. Install Python dependencies from server/services/chordai/requirements.txt"
        ) from exc

    model_size = os.environ.get("CHORDAI_WHISPER_MODEL", "small")
    compute_type = os.environ.get("CHORDAI_WHISPER_COMPUTE_TYPE", "int8")
    model = WhisperModel(model_size, compute_type=compute_type)

    language = None if language_mode == "auto" else language_mode
    segments, info = model.transcribe(
        wav_path,
        language=language,
        beam_size=5,
        word_timestamps=True,
        vad_filter=True
    )

    words = []
    for seg in segments:
        if not seg.words:
            continue
        for w in seg.words:
            token = (w.word or "").strip()
            if not token:
                continue
            words.append({
                "word": token,
                "start": round(safe_float(w.start), 3),
                "end": round(safe_float(w.end), 3)
            })

    return words, getattr(info, "language", None) or language_mode


def group_words_into_lines(words, max_gap=1.1):
    if not words:
        return []
    lines = []
    current = [words[0]]
    for word in words[1:]:
        prev = current[-1]
        gap = safe_float(word["start"]) - safe_float(prev["end"])
        if gap > max_gap:
            lines.append(current)
            current = [word]
        else:
            current.append(word)
    lines.append(current)
    return lines


def attach_chords_to_words(chords, lines):
    tolerance = 0.2
    placed = []
    for line in lines:
        for idx, w in enumerate(line):
            w["chord_before"] = []

    all_words = [w for line in lines for w in line]
    if not all_words:
        return lines

    for chord in chords:
        c_start = safe_float(chord.get("start"))
        target_idx = None
        for i, w in enumerate(all_words):
            if safe_float(w["start"]) >= c_start - tolerance:
                target_idx = i
                break
        if target_idx is None:
            target_idx = len(all_words) - 1
        all_words[target_idx]["chord_before"].append(chord["name"])
        placed.append(chord["name"])

    return lines


def render_chordpro_lines(lines):
    rendered = []
    for line in lines:
        lyric_line = ""
        chord_line = ""
        cursor = 0
        for w in line:
            if lyric_line:
                lyric_line += " "
            word_start = len(lyric_line)
            lyric_line += w["word"]

            while len(chord_line) < word_start:
                chord_line += " "
            if w.get("chord_before"):
                chord_name = w["chord_before"][-1]
                chord_line += chord_name
            cursor = len(lyric_line)
        if chord_line.strip():
            rendered.append(chord_line.rstrip())
        rendered.append(lyric_line.rstrip())
    return rendered


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=["youtube", "file"], required=True)
    parser.add_argument("--youtube-url", default="")
    parser.add_argument("--input-file", default="")
    parser.add_argument("--output", required=True)
    parser.add_argument("--output-audio", required=True)
    parser.add_argument("--language", choices=["auto", "en", "es"], default="auto")
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_audio_path = Path(args.output_audio)
    output_audio_path.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="chordai-worker-") as tmp_dir:
        input_audio = args.input_file
        if args.source == "youtube":
            if not args.youtube_url:
                raise RuntimeError("Missing YouTube URL")
            input_audio = prepare_audio_from_youtube(args.youtube_url, tmp_dir)
        elif not input_audio:
            raise RuntimeError("Missing input audio file")

        wav_path = normalize_audio(input_audio, tmp_dir)
        output_audio_path.write_bytes(Path(wav_path).read_bytes())
        chords, beats, downbeats = detect_beats_and_chords(wav_path)
        words, detected_language = transcribe_lyrics(wav_path, args.language)
        lines = group_words_into_lines(words)
        lines = attach_chords_to_words(chords, lines)
        chordpro_lines = render_chordpro_lines(lines)

        result = {
            "chordSegments": chords,
            "lyricWords": words,
            "beats": beats,
            "downbeats": downbeats,
            "metadata": {
                "languageRequested": args.language,
                "languageDetected": detected_language
            },
            "chordProText": "\n".join(chordpro_lines)
        }
        print_progress(100, "Done")
        output_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(str(exc), file=sys.stderr, flush=True)
        sys.exit(1)
