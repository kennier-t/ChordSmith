const db = require('../db');
const userService = require('./userService');
const sql = require('mssql/msnodesqlv8');

async function createChord(chord, userId) {
    const { name, baseFret, frets, fingers, barres, isDefault } = chord;
    const pool = await db.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        if (isDefault) {
            await new sql.Request(transaction)
                .input('name', sql.NVarChar, name)
                .query('UPDATE Chords SET IsDefault = 0 WHERE Name = @name');
        }

        const chordResult = await new sql.Request(transaction)
            .input('name', sql.NVarChar, name)
            .input('baseFret', sql.Int, baseFret || 1)
            .input('isDefault', sql.Bit, isDefault || false)
            .input('creator_id', sql.Int, userId)
            .query('INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault, creator_id, created_at, updated_at) OUTPUT INSERTED.Id VALUES (@name, @baseFret, 0, @isDefault, @creator_id, GETDATE(), GETDATE())');
        
        const chordId = chordResult.recordset[0].Id;

        await new sql.Request(transaction)
            .input('user_id', sql.Int, userId)
            .input('chord_id', sql.Int, chordId)
            .query('INSERT INTO UserChords (user_id, chord_id, is_creator) VALUES (@user_id, @chord_id, 1)');
        
        for (let i = 0; i < 6; i++) {
            await new sql.Request(transaction)
                .input('chordId', sql.Int, chordId)
                .input('stringNumber', sql.Int, i + 1)
                .input('fretNumber', sql.Int, frets[i])
                .input('fingerNumber', sql.Int, fingers[i])
                .query('INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)');
        }
        
        if (barres && barres.length > 0) {
            for (const barreFret of barres) {
                await new sql.Request(transaction)
                    .input('chordId', sql.Int, chordId)
                    .input('fretNumber', sql.Int, barreFret)
                    .query('INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)');
            }
        }

        await transaction.commit();
        return { id: chordId };
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

async function getChordById(chordId, userId) {
    const result = await db.query(`
        SELECT c.*, uc.is_creator FROM Chords c
        LEFT JOIN UserChords uc ON c.id = uc.chord_id AND uc.user_id = @userId
        WHERE c.id = @chordId
    `, { userId, chordId });

    const chord = result.recordset[0];
    if (!chord) return null;

    // Get fingerings
    const fingeringResult = await db.query(`
        SELECT StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId = @chordId
        ORDER BY StringNumber
    `, { chordId });

    // Get barres
    const barreResult = await db.query(`
        SELECT FretNumber
        FROM ChordBarres
        WHERE ChordId = @chordId
        ORDER BY FretNumber
    `, { chordId });

    chord.frets = new Array(6).fill(0);
    chord.fingers = new Array(6).fill(0);
    fingeringResult.recordset.forEach(f => {
        chord.frets[f.StringNumber - 1] = f.FretNumber;
        chord.fingers[f.StringNumber - 1] = f.FingerNumber;
    });
    chord.barres = barreResult.recordset.map(b => b.FretNumber);

    return chord;
}

async function getChordsByUserId(userId) {
    const result = await db.query(`
        SELECT c.*, ISNULL(uc.is_creator, 0) as is_creator FROM Chords c
        LEFT JOIN UserChords uc ON c.id = uc.chord_id AND uc.user_id = @userId
        WHERE c.IsOriginal = 1 OR uc.user_id IS NOT NULL
    `, { userId });

    const chords = result.recordset;
    if (chords.length === 0) return chords;

    const chordIds = chords.map(c => c.Id);

    // Get fingerings
    const fingeringResult = await db.query(`
        SELECT ChordId, StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, StringNumber
    `);

    // Get barres
    const barreResult = await db.query(`
        SELECT ChordId, FretNumber
        FROM ChordBarres
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, FretNumber
    `);

    // Map fingerings
    const fingeringMap = {};
    fingeringResult.recordset.forEach(f => {
        if (!fingeringMap[f.ChordId]) {
            fingeringMap[f.ChordId] = { frets: new Array(6).fill(0), fingers: new Array(6).fill(0) };
        }
        fingeringMap[f.ChordId].frets[f.StringNumber - 1] = f.FretNumber;
        fingeringMap[f.ChordId].fingers[f.StringNumber - 1] = f.FingerNumber;
    });

    // Map barres
    const barreMap = {};
    barreResult.recordset.forEach(b => {
        if (!barreMap[b.ChordId]) barreMap[b.ChordId] = [];
        barreMap[b.ChordId].push(b.FretNumber);
    });

    // Attach to chords
    chords.forEach(c => {
        const data = fingeringMap[c.Id];
        c.frets = data ? data.frets : [];
        c.fingers = data ? data.fingers : [];
        c.barres = barreMap[c.Id] || [];
    });

    return chords;
}

async function updateChord(chordId, chord, userId) {
    const originalChord = await getChordById(chordId, userId);
    if (!originalChord) {
        throw new Error('Chord not found');
    }

    if (originalChord.creator_id !== userId) {
        return await forkChord(chordId, chord, userId);
    }

    const { name, baseFret, frets, fingers, barres, isDefault } = chord;
    const pool = await db.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        if (isDefault) {
            await new sql.Request(transaction)
                .input('name', sql.NVarChar, name)
                .input('id', sql.Int, chordId)
                .query('UPDATE Chords SET IsDefault = 0 WHERE Name = @name AND Id != @id');
        }

        await new sql.Request(transaction)
            .input('id', sql.Int, chordId)
            .input('name', sql.NVarChar, name)
            .input('baseFret', sql.Int, baseFret || 1)
            .input('isDefault', sql.Bit, isDefault || false)
            .query('UPDATE Chords SET Name = @name, BaseFret = @baseFret, IsDefault = @isDefault, updated_at = GETDATE() WHERE Id = @id');
        
        await new sql.Request(transaction)
            .input('chordId', sql.Int, chordId)
            .query('DELETE FROM ChordFingerings WHERE ChordId = @chordId');
        
        await new sql.Request(transaction)
            .input('chordId', sql.Int, chordId)
            .query('DELETE FROM ChordBarres WHERE ChordId = @chordId');
        
        for (let i = 0; i < 6; i++) {
            await new sql.Request(transaction)
                .input('chordId', sql.Int, chordId)
                .input('stringNumber', sql.Int, i + 1)
                .input('fretNumber', sql.Int, frets[i])
                .input('fingerNumber', sql.Int, fingers[i])
                .query('INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)');
        }
        
        if (barres && barres.length > 0) {
            for (const barreFret of barres) {
                await new sql.Request(transaction)
                    .input('chordId', sql.Int, chordId)
                    .input('fretNumber', sql.Int, barreFret)
                    .query('INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)');
            }
        }
        
        await transaction.commit();
        return { id: chordId };

    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

async function forkChord(originalChordId, chord, userId) {
    const newChord = await createChord(chord, userId);
    return newChord;
}

async function deleteChord(chordId, userId) {
    const chord = await getChordById(chordId, userId);
    if (!chord || chord.creator_id !== userId) {
        throw new Error('Unauthorized');
    }
    await db.query('DELETE FROM Chords WHERE Id = @chordId', { chordId });
}

async function shareChord(chordId, senderId, recipientUsername) {
    const recipient = await userService.findUserByUsername(recipientUsername);
    if (!recipient) {
        throw new Error('Recipient not found');
    }
    const chord = await getChordById(chordId, senderId);
    if (!chord) {
        throw new Error('Chord not found');
    }

    await db.query(
        'INSERT INTO ChordShares (chord_id, sender_user_id, recipient_user_id, payload) VALUES (@chordId, @senderId, @recipientId, @payload)',
        { chordId, senderId, recipientId: recipient.id, payload: JSON.stringify(chord) }
    );
}

async function getIncomingShares(userId) {
    const result = await db.query('SELECT * FROM ChordShares WHERE recipient_user_id = @userId AND status = \'pending\'', { userId });
    return result.recordset;
}

async function acceptShare(shareId, userId) {
    const shareResult = await db.query('SELECT * FROM ChordShares WHERE id = @shareId AND recipient_user_id = @userId', { shareId, userId });
    const share = shareResult.recordset[0];
    if (!share) {
        throw new Error('Share not found');
    }

    const pool = await db.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
        await new sql.Request(transaction)
            .input('shareId', sql.Int, shareId)
            .query('UPDATE ChordShares SET status = \'accepted\' WHERE id = @shareId');

        await new sql.Request(transaction)
            .input('user_id', sql.Int, userId)
            .input('chord_id', sql.Int, share.chord_id)
            .query('INSERT INTO UserChords (user_id, chord_id, is_creator) VALUES (@user_id, @chord_id, 0)');

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function rejectShare(shareId, userId) {
    await db.query('UPDATE ChordShares SET status = \'rejected\' WHERE id = @shareId AND recipient_user_id = @userId', { shareId, userId });
}

async function getAllFamilies() {
    const result = await db.query('SELECT * FROM Families ORDER BY Name');
    return result.recordset;
}

async function getChordsForFamily(familyName, userId) {
    const result = await db.query(`
        SELECT DISTINCT c.* FROM Chords c
        INNER JOIN ChordFamilyMapping cfm ON c.Id = cfm.ChordId
        INNER JOIN Families f ON cfm.FamilyId = f.Id
        WHERE f.Name = @familyName AND (c.IsOriginal = 1 OR EXISTS (
            SELECT 1 FROM UserChords uc WHERE uc.chord_id = c.Id AND uc.user_id = @userId
        ))
    `, { familyName, userId });

    const chords = result.recordset;
    if (chords.length === 0) return chords;

    const chordIds = chords.map(c => c.Id);

    // Get fingerings
    const fingeringResult = await db.query(`
        SELECT ChordId, StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, StringNumber
    `);

    // Get barres
    const barreResult = await db.query(`
        SELECT ChordId, FretNumber
        FROM ChordBarres
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, FretNumber
    `);

    // Map fingerings
    const fingeringMap = {};
    fingeringResult.recordset.forEach(f => {
        if (!fingeringMap[f.ChordId]) {
            fingeringMap[f.ChordId] = { frets: new Array(6).fill(0), fingers: new Array(6).fill(0) };
        }
        fingeringMap[f.ChordId].frets[f.StringNumber - 1] = f.FretNumber;
        fingeringMap[f.ChordId].fingers[f.StringNumber - 1] = f.FingerNumber;
    });

    // Map barres
    const barreMap = {};
    barreResult.recordset.forEach(b => {
        if (!barreMap[b.ChordId]) barreMap[b.ChordId] = [];
        barreMap[b.ChordId].push(b.FretNumber);
    });

    // Attach to chords
    chords.forEach(c => {
        const data = fingeringMap[c.Id];
        c.frets = data ? data.frets : [];
        c.fingers = data ? data.fingers : [];
        c.barres = barreMap[c.Id] || [];
    });

    return chords;
}

module.exports = {
    createChord,
    getChordById,
    getChordsByUserId,
    updateChord,
    deleteChord,
    shareChord,
    getIncomingShares,
    acceptShare,
    rejectShare,
    forkChord,
    getAllFamilies,
    getChordsForFamily
};
