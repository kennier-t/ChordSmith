const express = require('express');
const router = express.Router();
const songService = require('../services/songService');
const { authMiddleware } = require('./users');

function handleSongError(error, res) {
    console.error(error);
    const status = Number.isInteger(error.status) ? error.status : 500;
    const message = error.message || 'Internal server error';
    if (status >= 500) {
        return res.status(500).json({ error: 'Internal server error' });
    }
    return res.status(status).json({ error: message, code: error.code || 'REQUEST_ERROR' });
}

// Folders routes
router.get('/folders', authMiddleware, async (req, res) => {
    try {
        const folders = await songService.getAllFolders(req.user.id);
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

router.get('/content-pack/export', authMiddleware, async (req, res) => {
    try {
        const queryValue = req.query.songIds;
        const selectedSongIds = typeof queryValue === 'string' && queryValue.trim()
            ? queryValue.split(',').map(v => v.trim()).filter(Boolean)
            : [];
        const pack = await songService.exportContentPack(req.user.id, selectedSongIds);
        res.json(pack);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/content-pack/import', authMiddleware, async (req, res) => {
    try {
        const contentPack = req.body && req.body.contentPack ? req.body.contentPack : req.body;
        const options = req.body && req.body.contentPack ? (req.body.options || {}) : {};
        const result = await songService.importContentPack(contentPack, req.user.id, options);
        res.status(201).json(result);
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: error.message || 'Invalid content pack' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const song = await songService.createSong(req.body, req.user.id);
        res.status(201).json(song);
    } catch (error) {
        handleSongError(error, res);
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
        handleSongError(error, res);
    }
});

router.get('/:id/versions', authMiddleware, async (req, res) => {
    try {
        const versions = await songService.getSongVersions(req.params.id, req.user.id);
        res.json(versions);
    } catch (error) {
        handleSongError(error, res);
    }
});

router.post('/:id/versions', authMiddleware, async (req, res) => {
    try {
        const song = await songService.addSongVersion(req.params.id, req.body, req.user.id);
        res.status(201).json(song);
    } catch (error) {
        handleSongError(error, res);
    }
});

router.put('/:id/versions/order', authMiddleware, async (req, res) => {
    try {
        const orderedSongIds = Array.isArray(req.body && req.body.orderedSongIds) ? req.body.orderedSongIds : [];
        const result = await songService.reorderSongVersions(req.params.id, orderedSongIds, req.user.id);
        res.json(result);
    } catch (error) {
        handleSongError(error, res);
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const song = await songService.updateSong(req.params.id, req.body, req.user.id);
        res.json(song);
    } catch (error) {
        handleSongError(error, res);
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
