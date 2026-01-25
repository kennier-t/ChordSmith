const express = require('express');
const router = express.Router();
const userService = require('../services/userService');
const email = require('../utils/email');
const token = require('../utils/token');

router.post('/register', async (req, res) => {
  try {
    const { username, email: emailAddress, first_name, last_name, password } = req.body;
    const existingUser = await userService.findUserByEmail(emailAddress) || await userService.findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await userService.createUser({ username, email: emailAddress, first_name, last_name, password });
    const verificationToken = token.generateRandomToken();
    await userService.createVerificationToken(user.id, verificationToken);
    await email.sendVerificationEmail({ email: emailAddress }, verificationToken);
    res.status(201).json({ message: 'User created successfully. Please check your email to verify your account.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/verify', async (req, res) => {
    try {
        const { token: verificationToken } = req.query;
        const tokenRecord = await userService.findVerificationToken(verificationToken);
        if (!tokenRecord || tokenRecord.used_at || new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        await userService.markTokenAsUsed(tokenRecord.id);
        await userService.verifyUser(tokenRecord.user_id);
        const authToken = token.generateAuthToken(tokenRecord.user_id);
        const refreshToken = token.generateRefreshToken(tokenRecord.user_id);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false });
        res.cookie('authToken', authToken, { secure: false });
        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/login', async (req, res) => {
  try {
    const { email: emailAddress, password } = req.body;
    const user = await userService.findUserByEmail(emailAddress);
    if (!user || !await userService.verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.is_verified) {
        return res.status(401).json({ message: 'Please verify your email address' });
    }
    const authToken = token.generateAuthToken(user.id);
    const refreshToken = token.generateRefreshToken(user.id);
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false });
    res.cookie('authToken', authToken, { secure: false });
    res.header('Authorization', `Bearer ${authToken}`).json({ message: 'Logged in successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/logout', (req, res) => {
    res.clearCookie('refreshToken').json({ message: 'Logged out successfully' });
});

router.post('/refresh', (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found' });
    }
    const decoded = token.verifyToken(refreshToken);
    if (!decoded) {
        return res.status(401).json({ message: 'Invalid refresh token' });
    }
    const newAuthToken = token.generateAuthToken(decoded.id);
    const newRefreshToken = token.generateRefreshToken(decoded.id);
    res.cookie('refreshToken', newRefreshToken, { httpOnly: true, secure: false });
    res.cookie('authToken', newAuthToken, { secure: false });
    res.json({ message: 'Tokens refreshed successfully' });
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email: emailAddress } = req.body;
        const user = await userService.findUserByEmail(emailAddress);
        if (user) {
            const resetToken = token.generateRandomToken();
            await userService.createPasswordResetToken(user.id, resetToken);
            await email.sendPasswordResetEmail({ email: emailAddress }, resetToken);
        }
        res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token: resetToken, password } = req.body;
        const tokenRecord = await userService.findPasswordResetToken(resetToken);
        if (!tokenRecord || tokenRecord.used_at || new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }
        await userService.markPasswordResetTokenAsUsed(tokenRecord.id);
        await userService.updateUserPassword(tokenRecord.user_id, password);
        const authToken = token.generateAuthToken(tokenRecord.user_id);
        const refreshToken = token.generateRefreshToken(tokenRecord.user_id);
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false });
        res.header('Authorization', `Bearer ${authToken}`).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


module.exports = router;