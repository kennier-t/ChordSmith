const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const multer = require('multer');
const { authMiddleware } = require('./users');
const chordaiService = require('../services/chordaiService');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'temp', 'chordai-uploads');
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error, uploadDir);
        }
    },
    filename: (req, file, cb) => {
        const safeOriginal = String(file.originalname || 'input.mp3').replace(/[^\w.-]/g, '_');
        cb(null, `${Date.now()}-${safeOriginal}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const isMp3 = file.mimetype === 'audio/mpeg' || file.originalname.toLowerCase().endsWith('.mp3');
        cb(isMp3 ? null : new Error('Only MP3 files are supported'), isMp3);
    }
});

router.get('/health', authMiddleware, async (req, res) => {
    try {
        const health = await chordaiService.getHealth();
        res.json(health);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/analyze', authMiddleware, upload.single('audioFile'), async (req, res) => {
    try {
        const youtubeUrl = req.body.youtubeUrl || '';
        const language = req.body.language || 'auto';
        const filePath = req.file ? req.file.path : '';

        const started = await chordaiService.startAnalysis({
            youtubeUrl,
            filePath,
            language
        });
        res.status(202).json(started);
    } catch (error) {
        if (req.file && req.file.path) {
            fs.rm(req.file.path, { force: true }).catch(() => undefined);
        }
        res.status(400).json({ message: error.message || 'Invalid request' });
    }
});

router.get('/jobs/:jobId', authMiddleware, async (req, res) => {
    try {
        const job = chordaiService.getJob(req.params.jobId);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.json(job);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/jobs/:jobId/audio', authMiddleware, async (req, res) => {
    try {
        const audioPath = chordaiService.getJobAudioPath(req.params.jobId);
        if (!audioPath) {
            return res.status(404).json({ message: 'Audio not found' });
        }
        res.sendFile(path.resolve(audioPath));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/jobs/:jobId', authMiddleware, async (req, res) => {
    try {
        const deleted = await chordaiService.deleteJob(req.params.jobId);
        if (!deleted) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
