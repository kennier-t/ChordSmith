const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

const JOB_TTL_MS = 60 * 60 * 1000;
const jobs = new Map();

function createJobId() {
    return crypto.randomBytes(16).toString('hex');
}

function getBaseTempDir() {
    return path.join(os.tmpdir(), 'chordsmith-chordai');
}

function getPythonExecutable() {
    return process.env.CHORDAI_PYTHON || 'python';
}

function getWorkerPath() {
    return path.join(__dirname, 'chordai', 'worker.py');
}

function parseLanguageMode(value) {
    const normalized = String(value || 'auto').trim().toLowerCase();
    return ['auto', 'en', 'es'].includes(normalized) ? normalized : 'auto';
}

async function ensureJobDir(jobId) {
    const jobDir = path.join(getBaseTempDir(), jobId);
    await fsp.mkdir(jobDir, { recursive: true });
    return jobDir;
}

function buildEmptyResult() {
    return {
        chordSegments: [],
        lyricWords: [],
        beats: [],
        downbeats: [],
        metadata: {}
    };
}

function validateAnalysisInput({ youtubeUrl, filePath }) {
    const url = String(youtubeUrl || '').trim();
    const hasUrl = url.length > 0;
    const hasFile = !!filePath;
    if ((hasUrl && hasFile) || (!hasUrl && !hasFile)) {
        throw new Error('Provide either a YouTube URL or an MP3 file');
    }
    if (hasUrl) {
        const isYoutube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);
        if (!isYoutube) {
            throw new Error('Only YouTube URLs are supported');
        }
    }
}

function setJob(jobId, patch) {
    const current = jobs.get(jobId);
    if (!current) return;
    jobs.set(jobId, { ...current, ...patch, updatedAt: Date.now() });
}

async function removePathSafe(targetPath) {
    if (!targetPath) return;
    try {
        await fsp.rm(targetPath, { recursive: true, force: true });
    } catch (error) {
        console.error('ChordAI cleanup failed:', error.message);
    }
}

function cleanupExpiredJobs() {
    const now = Date.now();
    for (const [jobId, job] of jobs.entries()) {
        if (now - job.createdAt > JOB_TTL_MS) {
            jobs.delete(jobId);
            removePathSafe(job.jobDir);
        }
    }
}

setInterval(cleanupExpiredJobs, 10 * 60 * 1000).unref();

async function runWorker(job) {
    const resultPath = path.join(job.jobDir, 'result.json');
    const outputAudioPath = path.join(job.jobDir, 'analysis.wav');
    const args = [
        getWorkerPath(),
        '--output', resultPath,
        '--output-audio', outputAudioPath,
        '--language', job.language
    ];

    if (job.youtubeUrl) {
        args.push('--source', 'youtube', '--youtube-url', job.youtubeUrl);
    } else {
        args.push('--source', 'file', '--input-file', job.sourceFilePath);
    }

    return await new Promise((resolve, reject) => {
        const stdoutChunks = [];
        const stderrChunks = [];
        const child = spawn(getPythonExecutable(), args, {
            cwd: path.resolve(path.join(__dirname, '..', '..')),
            stdio: ['ignore', 'pipe', 'pipe']
        });

        setJob(job.id, { status: 'processing', progress: 25, statusMessage: 'Running analysis...' });

        child.stdout.on('data', (chunk) => {
            const text = chunk.toString();
            stdoutChunks.push(text);
            const progressMatch = text.match(/PROGRESS:(\d+):(.*)/);
            if (progressMatch) {
                const progress = Math.max(0, Math.min(100, parseInt(progressMatch[1], 10)));
                const message = progressMatch[2].trim() || 'Processing...';
                setJob(job.id, { progress, statusMessage: message });
            }
        });

        child.stderr.on('data', (chunk) => {
            stderrChunks.push(chunk.toString());
        });

        child.on('error', (error) => reject(error));
        child.on('close', async (code) => {
            if (code !== 0) {
                const stderr = stderrChunks.join('\n').trim();
                const stdout = stdoutChunks.join('\n').trim();
                return reject(new Error(stderr || stdout || `ChordAI worker failed with exit code ${code}`));
            }

            try {
                const raw = await fsp.readFile(resultPath, 'utf-8');
                const parsed = JSON.parse(raw);
                resolve(parsed);
            } catch (error) {
                reject(new Error(`Unable to read analysis output: ${error.message}`));
            }
        });
    });
}

async function startAnalysis({ youtubeUrl, filePath, language }) {
    validateAnalysisInput({ youtubeUrl, filePath });

    const jobId = createJobId();
    const jobDir = await ensureJobDir(jobId);
    const normalizedLanguage = parseLanguageMode(language);
    const sourceFilePath = filePath || null;

    const job = {
        id: jobId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'queued',
        progress: 0,
        statusMessage: 'Queued',
        language: normalizedLanguage,
        youtubeUrl: youtubeUrl || null,
        sourceFilePath,
        jobDir,
        result: buildEmptyResult(),
        error: null
    };
    jobs.set(jobId, job);

    (async () => {
        try {
            setJob(jobId, { status: 'processing', progress: 10, statusMessage: 'Preparing audio...' });
            const result = await runWorker(job);
            setJob(jobId, {
                status: 'completed',
                progress: 100,
                statusMessage: 'Completed',
                result
            });
        } catch (error) {
            setJob(jobId, {
                status: 'failed',
                progress: 100,
                statusMessage: 'Failed',
                error: error.message
            });
        }
    })();

    return { jobId };
}

function getJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const audioPath = path.join(job.jobDir, 'analysis.wav');
    const audioAvailable = fs.existsSync(audioPath);
    return {
        id: job.id,
        status: job.status,
        progress: job.progress,
        statusMessage: job.statusMessage,
        error: job.error,
        result: job.status === 'completed' ? job.result : null,
        audioUrl: (job.status === 'completed' && audioAvailable) ? `/api/chordai/jobs/${job.id}/audio` : null
    };
}

function getJobAudioPath(jobId) {
    const job = jobs.get(jobId);
    if (!job) return null;
    const audioPath = path.join(job.jobDir, 'analysis.wav');
    return fs.existsSync(audioPath) ? audioPath : null;
}

async function deleteJob(jobId) {
    const job = jobs.get(jobId);
    if (!job) return false;
    jobs.delete(jobId);
    await removePathSafe(job.jobDir);
    if (job.sourceFilePath) {
        await removePathSafe(job.sourceFilePath);
    }
    return true;
}

function checkBinary(binary, args = ['--version']) {
    return new Promise((resolve) => {
        const child = spawn(binary, args, { stdio: 'ignore' });
        child.on('error', () => resolve(false));
        child.on('close', (code) => resolve(code === 0));
    });
}

async function getHealth() {
    const python = await checkBinary(getPythonExecutable(), ['--version']);
    const ffmpeg = await checkBinary('ffmpeg', ['-version']);
    const ytDlp = await checkBinary('yt-dlp', ['--version']);
    return {
        ok: python && ffmpeg,
        dependencies: {
            python,
            ffmpeg,
            ytDlp
        }
    };
}

module.exports = {
    parseLanguageMode,
    validateAnalysisInput,
    startAnalysis,
    getJob,
    getJobAudioPath,
    deleteJob,
    getHealth
};
