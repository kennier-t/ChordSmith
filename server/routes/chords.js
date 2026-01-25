const express = require('express');
const router = express.Router();
const chordService = require('../services/chordService');
const { authMiddleware } = require('./users');

router.get('/families', authMiddleware, async (req, res) => {
    try {
        const families = await chordService.getAllFamilies();
        res.json(families);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/families/:familyName/chords', authMiddleware, async (req, res) => {
    try {
        const chords = await chordService.getChordsForFamily(req.params.familyName, req.user.id);
        res.json(chords);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    try {
        const chord = await chordService.createChord(req.body, req.user.id);
        res.status(201).json(chord);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/', authMiddleware, async (req, res) => {
    try {
        const chords = await chordService.getChordsByUserId(req.user.id);
        res.json(chords);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const chord = await chordService.getChordById(req.params.id, req.user.id);
        res.json(chord);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const chord = await chordService.updateChord(req.params.id, req.body, req.user.id);
        res.json(chord);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        await chordService.deleteChord(req.params.id, req.user.id);
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;