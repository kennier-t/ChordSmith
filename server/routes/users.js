const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const { verifyToken } = require('../utils/token');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    req.user = await userService.findUserById(decoded.id);
    next();
};

router.get('/me', authMiddleware, async (req, res) => {
    res.json(req.user);
});

router.put('/me', authMiddleware, async (req, res) => {
    try {
        const { username, email, first_name, last_name, language_pref } = req.body;
        if (language_pref && !['en', 'es'].includes(language_pref)) {
            return res.status(400).json({ message: 'Invalid language preference' });
        }
        const existingUserByUsername = await userService.findUserByUsername(username);
        if (existingUserByUsername && existingUserByUsername.id !== req.user.id) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const existingUserByEmail = await userService.findUserByEmail(email);
        if (existingUserByEmail && existingUserByEmail.id !== req.user.id) {
            return res.status(400).json({ message: 'Email already exists' });
        }
        const updatedUser = await userService.updateUser(req.user.id, { username, email, first_name, last_name, language_pref });
        res.json(updatedUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/me/language', authMiddleware, async (req, res) => {
    try {
        const { language_pref } = req.body;
        if (!['en', 'es'].includes(language_pref)) {
            return res.status(400).json({ message: 'Invalid language preference' });
        }
        await userService.updateUserLanguage(req.user.id, language_pref);
        res.json({ message: 'Language updated successfully', language_pref });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.put('/me/password', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        await userService.changeUserPassword(req.user.id, password);
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = {
    router,
    authMiddleware
};
