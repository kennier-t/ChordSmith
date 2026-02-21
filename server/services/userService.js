const db = require('../db');
const bcrypt = require('bcrypt');

async function createUser(user) {
  const { username, email, first_name, last_name, password } = user;
  const password_hash = await bcrypt.hash(password, 10);
  const result = await db.query(
    'INSERT INTO Users (username, email, first_name, last_name, password_hash) OUTPUT INSERTED.id VALUES (@username, @email, @first_name, @last_name, @password_hash)',
    { username, email, first_name, last_name, password_hash }
  );
  return { id: result.recordset[0].id };
}

async function findUserByEmail(email) {
  const result = await db.query('SELECT * FROM Users WHERE email = @email', { email });
  return result.recordset[0];
}

async function findUserByUsername(username) {
  const result = await db.query('SELECT * FROM Users WHERE username = @username', { username });
  return result.recordset[0];
}

async function findUserById(id) {
    const result = await db.query('SELECT * FROM Users WHERE id = @id', { id });
    return result.recordset[0];
}

async function verifyPassword(password, password_hash) {
  return await bcrypt.compare(password, password_hash);
}

async function updateUser(id, user) {
    const { username, email, first_name, last_name, language_pref } = user;
    const result = await db.query(
        'UPDATE Users SET username = @username, email = @email, first_name = @first_name, last_name = @last_name, language_pref = @language_pref WHERE id = @id',
        { username, email, first_name, last_name, language_pref, id }
    );
    return result;
}

async function updateUserLanguage(id, language_pref) {
    const result = await db.query(
        'UPDATE Users SET language_pref = @language_pref WHERE id = @id',
        { language_pref, id }
    );
    return result;
}

async function updateUserPassword(id, password) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query('UPDATE Users SET password_hash = @password_hash WHERE id = @id', { password_hash, id });
    return result;
}

async function createVerificationToken(userId, token) {
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const result = await db.query(
        'INSERT INTO UserVerificationTokens (user_id, token, expires_at) VALUES (@userId, @token, @expires_at)',
        { userId, token, expires_at }
    );
    return result;
}

async function findVerificationToken(token) {
    const result = await db.query('SELECT * FROM UserVerificationTokens WHERE token = @token', { token });
    return result.recordset[0];
}

async function markTokenAsUsed(tokenId) {
    const result = await db.query('UPDATE UserVerificationTokens SET used_at = GETDATE() WHERE id = @tokenId', { tokenId });
    return result;
}

async function createPasswordResetToken(userId, token) {
    const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    const result = await db.query(
        'INSERT INTO PasswordResetTokens (user_id, token, expires_at) VALUES (@userId, @token, @expires_at)',
        { userId, token, expires_at }
    );
    return result;
}

async function findPasswordResetToken(token) {
    const result = await db.query('SELECT * FROM PasswordResetTokens WHERE token = @token', { token });
    return result.recordset[0];
}

async function markPasswordResetTokenAsUsed(tokenId) {
    const result = await db.query('UPDATE PasswordResetTokens SET used_at = GETDATE() WHERE id = @tokenId', { tokenId });
    return result;
}

async function verifyUser(userId) {
    const result = await db.query('UPDATE Users SET is_verified = 1 WHERE id = @userId', { userId });
    return result;
}

async function changeUserPassword(id, password) {
    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query('UPDATE Users SET password_hash = @password_hash WHERE id = @id', { password_hash, id });
    return result;
}


module.exports = {
  createUser,
  findUserByEmail,
  findUserByUsername,
  verifyPassword,
  updateUser,
  updateUserLanguage,
  updateUserPassword,
  createVerificationToken,
  findVerificationToken,
  markTokenAsUsed,
  createPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenAsUsed,
  verifyUser,
  findUserById,
  changeUserPassword
};
