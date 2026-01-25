const express = require('express');
const router = express.Router();
const songService = require('../services/songService');
const { authMiddleware } = require('./users');

// Folders routes
router.get('/folders', authMiddleware, async (req, res) => {
    try {
        const folders = await songService.getAllFolders();
        res.json(folders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/folders', authMiddleware, async (req, res) => {
    try {
        const folder = await songService.createFolder(req.body, req.user.id);
        res.status(201).json(folder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/folders/:id', authMiddleware, async (req, res) => {
    try {
        const folder = await songService.updateFolder(req.params.id, req.body, req.user.id);
        res.json(folder);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/folders/:id', authMiddleware, async (req, res) => {
    try {
        await songService.deleteFolder(req.params.id, req.user.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/folders/:id/songs', authMiddleware, async (req, res) => {
    try {
        const songs = await songService.getSongsByFolder(req.params.id, req.user.id);
        res.json(songs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const song = await songService.createSong(req.body, req.user.id);
        res.status(201).json(song);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const songs = await songService.getSongsByUserId(req.user.id);
        res.json(songs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const song = await songService.getSongById(req.params.id, req.user.id);
        res.json(song);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const song = await songService.updateSong(req.params.id, req.body, req.user.id);
        res.json(song);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await songService.deleteSong(req.params.id, req.user.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:id/chords', authMiddleware, async (req, res) => {
    try {
        const chords = await songService.getSongChordDiagrams(req.params.id, req.user.id);
        res.json(chords);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:id/folders', authMiddleware, async (req, res) => {
    try {
        const folders = await songService.getSongFolders(req.params.id, req.user.id);
        res.json(folders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;