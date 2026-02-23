(function() {
    'use strict';

    let currentJobId = null;
    let pollingHandle = null;
    let currentResult = null;

    const el = {
        backBtn: document.getElementById('back-btn'),
        youtubeUrl: document.getElementById('youtube-url'),
        audioFile: document.getElementById('audio-file'),
        languageMode: document.getElementById('language-mode'),
        analyzeBtn: document.getElementById('analyze-btn'),
        cleanupBtn: document.getElementById('cleanup-btn'),
        statusWrapper: document.getElementById('status-wrapper'),
        statusText: document.getElementById('status-text'),
        statusProgress: document.getElementById('status-progress'),
        resultsSection: document.getElementById('results-section'),
        chordProOutput: document.getElementById('chordpro-output'),
        copyChordProBtn: document.getElementById('copy-chordpro-btn'),
        audioPlayer: document.getElementById('audio-player'),
        currentChordDisplay: document.getElementById('current-chord-display'),
        gridContainer: document.getElementById('grid-container'),
        tabButtons: Array.from(document.querySelectorAll('.tab-btn')),
        tabPanels: Array.from(document.querySelectorAll('.tab-panel'))
    };

    function t(key, fallback) {
        return (translations[currentLanguage] && translations[currentLanguage][key]) || fallback || key;
    }

    function resetStatus() {
        el.statusWrapper.classList.add('hidden');
        el.statusText.textContent = '';
        el.statusProgress.style.width = '0%';
    }

    function setStatus(message, progress) {
        el.statusWrapper.classList.remove('hidden');
        el.statusText.textContent = message;
        const p = Math.max(0, Math.min(100, Number(progress) || 0));
        el.statusProgress.style.width = `${p}%`;
    }

    function clearResults() {
        currentResult = null;
        el.resultsSection.classList.add('hidden');
        el.chordProOutput.textContent = '';
        el.audioPlayer.removeAttribute('src');
        el.currentChordDisplay.textContent = '-';
        el.gridContainer.innerHTML = '';
    }

    function validateInput() {
        const youtubeUrl = el.youtubeUrl.value.trim();
        const file = el.audioFile.files && el.audioFile.files[0] ? el.audioFile.files[0] : null;
        if ((youtubeUrl && file) || (!youtubeUrl && !file)) {
            throw new Error(t('Provide either YouTube URL or MP3 file.', 'Provide either YouTube URL or MP3 file.'));
        }
        return { youtubeUrl, file };
    }

    function setMutualExclusion() {
        el.youtubeUrl.addEventListener('input', () => {
            if (el.youtubeUrl.value.trim().length > 0) {
                el.audioFile.value = '';
            }
        });
        el.audioFile.addEventListener('change', () => {
            const file = el.audioFile.files && el.audioFile.files[0] ? el.audioFile.files[0] : null;
            if (file) {
                el.youtubeUrl.value = '';
            }
        });
    }

    async function analyze() {
        try {
            clearResults();
            const { youtubeUrl, file } = validateInput();
            const formData = new FormData();
            formData.append('language', el.languageMode.value || 'auto');
            if (youtubeUrl) {
                formData.append('youtubeUrl', youtubeUrl);
            } else if (file) {
                formData.append('audioFile', file);
            }

            el.analyzeBtn.disabled = true;
            setStatus(t('Queued analysis...', 'Queued analysis...'), 5);

            const response = await fetch('/api/chordai/analyze', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message || 'Unable to start analysis');
            }
            currentJobId = payload.jobId;
            startPolling();
        } catch (error) {
            alert(error.message);
            el.analyzeBtn.disabled = false;
            resetStatus();
        }
    }

    function startPolling() {
        if (pollingHandle) {
            clearInterval(pollingHandle);
            pollingHandle = null;
        }
        pollingHandle = setInterval(fetchJob, 1400);
        fetchJob();
    }

    async function fetchJob() {
        if (!currentJobId) return;
        const response = await fetch(`/api/chordai/jobs/${currentJobId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const payload = await response.json();
        if (!response.ok) {
            stopPolling();
            el.analyzeBtn.disabled = false;
            alert(payload.message || 'Job failed');
            return;
        }

        setStatus(payload.statusMessage || payload.status, payload.progress || 0);
        if (payload.status === 'completed') {
            stopPolling();
            el.analyzeBtn.disabled = false;
            currentResult = payload.result || {};
            await renderResult(currentResult, payload.audioUrl || null);
        } else if (payload.status === 'failed') {
            stopPolling();
            el.analyzeBtn.disabled = false;
            alert(payload.error || 'Analysis failed');
        }
    }

    function stopPolling() {
        if (pollingHandle) {
            clearInterval(pollingHandle);
            pollingHandle = null;
        }
    }

    function formatChordLyrics(result) {
        if (result.chordProText && typeof result.chordProText === 'string') {
            return result.chordProText;
        }
        const words = Array.isArray(result.lyricWords) ? result.lyricWords : [];
        const chords = Array.isArray(result.chordSegments) ? result.chordSegments : [];
        if (!words.length) return '';

        const lines = [];
        let currentLine = [];
        for (let i = 0; i < words.length; i++) {
            if (i > 0) {
                const gap = (words[i].start || 0) - (words[i - 1].end || words[i - 1].start || 0);
                if (gap > 1.1) {
                    lines.push(currentLine);
                    currentLine = [];
                }
            }
            currentLine.push(words[i]);
        }
        if (currentLine.length) lines.push(currentLine);

        for (const line of lines) {
            line.forEach(w => { w.__chord = ''; });
        }

        const flatWords = lines.flat();
        for (const chord of chords) {
            const start = Number(chord.start) || 0;
            let chosen = flatWords[flatWords.length - 1];
            for (const word of flatWords) {
                if ((Number(word.start) || 0) >= start - 0.2) {
                    chosen = word;
                    break;
                }
            }
            chosen.__chord = chord.name || '';
        }

        const rendered = [];
        for (const line of lines) {
            let lyricLine = '';
            let chordLine = '';
            for (const word of line) {
                if (lyricLine.length > 0) lyricLine += ' ';
                const pos = lyricLine.length;
                lyricLine += word.word || '';
                while (chordLine.length < pos) chordLine += ' ';
                if (word.__chord) chordLine += word.__chord;
            }
            if (chordLine.trim().length) rendered.push(chordLine.trimEnd());
            rendered.push(lyricLine.trimEnd());
        }
        return rendered.join('\n');
    }

    function findActiveChord(chordSegments, time) {
        for (const seg of chordSegments) {
            const start = Number(seg.start) || 0;
            const end = Number(seg.end) || 0;
            if (time >= start && time < end) {
                return seg.name || '-';
            }
        }
        return '-';
    }

    function renderGrid(result) {
        const beats = Array.isArray(result.beats) ? result.beats : [];
        const downbeats = Array.isArray(result.downbeats) ? result.downbeats : [];
        const chords = Array.isArray(result.chordSegments) ? result.chordSegments : [];
        if (!beats.length) {
            el.gridContainer.innerHTML = `<p>${t('No beat grid available.', 'No beat grid available.')}</p>`;
            return;
        }

        const bars = [];
        for (let i = 0; i < beats.length; i += 4) {
            bars.push(beats.slice(i, i + 4));
        }

        const table = document.createElement('table');
        table.className = 'beats-grid';
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Bar</th><th>1</th><th>2</th><th>3</th><th>4</th></tr>';
        table.appendChild(thead);
        const tbody = document.createElement('tbody');

        bars.forEach((barBeats, barIndex) => {
            const tr = document.createElement('tr');
            const label = document.createElement('td');
            label.textContent = String(barIndex + 1);
            tr.appendChild(label);

            for (let i = 0; i < 4; i++) {
                const td = document.createElement('td');
                td.className = 'beat-cell';
                const beatTime = barBeats[i];
                if (typeof beatTime === 'number') {
                    td.dataset.beatTime = String(beatTime);
                    const chord = findActiveChord(chords, beatTime + 0.001);
                    td.textContent = chord === '-' ? '' : chord;
                }
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        el.gridContainer.innerHTML = '';
        el.gridContainer.appendChild(table);
    }

    function updatePlaybackHighlights() {
        if (!currentResult) return;
        const currentTime = Number(el.audioPlayer.currentTime) || 0;
        const chordSegments = Array.isArray(currentResult.chordSegments) ? currentResult.chordSegments : [];
        el.currentChordDisplay.textContent = findActiveChord(chordSegments, currentTime);

        const beatCells = Array.from(el.gridContainer.querySelectorAll('.beat-cell[data-beat-time]'));
        beatCells.forEach(cell => {
            const beatTime = Number(cell.dataset.beatTime) || 0;
            const inWindow = currentTime >= beatTime && currentTime < beatTime + 0.35;
            cell.classList.toggle('active', inWindow);
        });
    }

    async function loadAudioSource(audioUrl) {
        if (!audioUrl) {
            el.audioPlayer.removeAttribute('src');
            return;
        }
        const response = await fetch(audioUrl, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) {
            throw new Error(t('Unable to load analyzed audio.', 'Unable to load analyzed audio.'));
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        el.audioPlayer.src = objectUrl;
    }

    async function renderResult(result, audioUrl) {
        const chordPro = formatChordLyrics(result);
        el.chordProOutput.textContent = chordPro;
        await loadAudioSource(audioUrl);
        renderGrid(result);
        el.resultsSection.classList.remove('hidden');
    }

    async function copyChordPro() {
        const text = el.chordProOutput.textContent || '';
        if (!text.trim()) return;
        try {
            await navigator.clipboard.writeText(text);
            alert(t('Copied to clipboard', 'Copied to clipboard'));
        } catch (error) {
            alert(error.message);
        }
    }

    function switchTab(tabKey) {
        el.tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabKey));
        el.tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tabKey}`));
    }

    async function cleanupSession() {
        if (!currentJobId) {
            alert(t('No active analysis to clean up.', 'No active analysis to clean up.'));
            return;
        }
        await fetch(`/api/chordai/jobs/${currentJobId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        currentJobId = null;
        stopPolling();
        clearResults();
        resetStatus();
    }

    function initializeTabs() {
        el.tabButtons.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    }

    function initialize() {
        el.backBtn.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            } else {
                window.close();
            }
        });

        setMutualExclusion();
        initializeTabs();
        clearResults();
        resetStatus();

        el.analyzeBtn.addEventListener('click', analyze);
        el.cleanupBtn.addEventListener('click', cleanupSession);
        el.copyChordProBtn.addEventListener('click', copyChordPro);
        el.audioPlayer.addEventListener('timeupdate', updatePlaybackHighlights);
    }

    document.addEventListener('DOMContentLoaded', initialize);
})();
