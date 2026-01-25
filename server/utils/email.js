const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendVerificationEmail(user, token) {
  const verificationLink = `http://localhost:3000/api/auth/verify?token=${token}`;
  console.log('Sending verification email to:', user.email);
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"ChordSmith" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Verify your ChordSmith account',
      html: `
        <h1>Welcome to ChordSmith!</h1>
        <p>Please click the following link to verify your account:</p>
        <a href="${verificationLink}">${verificationLink}</a>
      `,
    });
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }
}

async function sendPasswordResetEmail(user, token) {
  const resetLink = `http://localhost:3000/reset-password.html?token=${token}`;
  console.log('Sending password reset email to:', user.email);
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"ChordSmith" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Reset your ChordSmith password',
      html: `
        <h1>Password Reset</h1>
        <p>Please click the following link to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>If you did not request this change, you can ignore this email.</p>
      `,
    });
    console.log('Password reset email sent successfully');
  } catch (error) {
    console.error('Failed to send password reset email:', error);
  }
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};