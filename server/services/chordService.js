const db = require('../db');
const userService = require('./userService');

async function createChord(chord, userId) {
    const { name, baseFret, frets, fingers, barres, isDefault } = chord;
    const tx = await db.beginTransaction();
    try {
        if (isDefault) {
            await tx.query('UPDATE Chords SET IsDefault = 0 WHERE Name = @name', { name });
        }

        const chordResult = await tx.query(
            'INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault, creator_id, created_at, updated_at) VALUES (@name, @baseFret, 0, @isDefault, @creator_id, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
            {
                name,
                baseFret: baseFret || 1,
                isDefault: isDefault ? 1 : 0,
                creator_id: userId
            }
        );

        const chordId = chordResult.insertId;

        await tx.query('INSERT INTO UserChords (user_id, chord_id, is_creator) VALUES (@user_id, @chord_id, 1)', {
            user_id: userId,
            chord_id: chordId
        });

        for (let i = 0; i < 6; i++) {
            await tx.query('INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)', {
                chordId,
                stringNumber: i + 1,
                fretNumber: frets[i],
                fingerNumber: fingers[i]
            });
        }

        if (barres && barres.length > 0) {
            for (const barreFret of barres) {
                await tx.query('INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)', {
                    chordId,
                    fretNumber: barreFret
                });
            }
        }

        await tx.commit();
        return { id: chordId };
    } catch (err) {
        await tx.rollback();
        throw err;
    } finally {
        tx.release();
    }
}

async function getChordById(chordId, userId) {
    const result = await db.query(
        `
        SELECT c.*, uc.is_creator FROM Chords c
        LEFT JOIN UserChords uc ON c.id = uc.chord_id AND uc.user_id = @userId
        WHERE c.id = @chordId
    `,
        { userId, chordId }
    );

    const chord = result.recordset[0];
    if (!chord) return null;

    const fingeringResult = await db.query(
        `
        SELECT StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId = @chordId
        ORDER BY StringNumber
    `,
        { chordId }
    );

    const barreResult = await db.query(
        `
        SELECT FretNumber
        FROM ChordBarres
        WHERE ChordId = @chordId
        ORDER BY FretNumber
    `,
        { chordId }
    );

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
    const result = await db.query(
        `
        SELECT c.*, IFNULL(uc.is_creator, 0) as is_creator FROM Chords c
        LEFT JOIN UserChords uc ON c.id = uc.chord_id AND uc.user_id = @userId
        WHERE c.IsOriginal = 1 OR uc.user_id IS NOT NULL
    `,
        { userId }
    );

    const chords = result.recordset;
    if (chords.length === 0) return chords;

    const chordIds = chords.map(c => c.Id);

    const fingeringResult = await db.query(
        `
        SELECT ChordId, StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, StringNumber
    `
    );

    const barreResult = await db.query(
        `
        SELECT ChordId, FretNumber
        FROM ChordBarres
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, FretNumber
    `
    );

    const fingeringMap = {};
    fingeringResult.recordset.forEach(f => {
        if (!fingeringMap[f.ChordId]) {
            fingeringMap[f.ChordId] = { frets: new Array(6).fill(0), fingers: new Array(6).fill(0) };
        }
        fingeringMap[f.ChordId].frets[f.StringNumber - 1] = f.FretNumber;
        fingeringMap[f.ChordId].fingers[f.StringNumber - 1] = f.FingerNumber;
    });

    const barreMap = {};
    barreResult.recordset.forEach(b => {
        if (!barreMap[b.ChordId]) barreMap[b.ChordId] = [];
        barreMap[b.ChordId].push(b.FretNumber);
    });

    chords.forEach(c => {
        const data = fingeringMap[c.Id];
        c.frets = data ? data.frets : [];
        c.fingers = data ? data.fingers : [];
        c.barres = barreMap[c.Id] || [];
    });

    return chords;
}

async function getChordVariations(name, userId) {
    const result = await db.query(
        `
        SELECT c.*, IFNULL(uc.is_creator, 0) as is_creator FROM Chords c
        LEFT JOIN UserChords uc ON c.id = uc.chord_id AND uc.user_id = @userId
        WHERE c.Name = @name AND (c.IsOriginal = 1 OR uc.user_id IS NOT NULL)
        ORDER BY c.IsDefault DESC, c.Id
    `,
        { name, userId }
    );

    const chords = result.recordset;
    if (chords.length === 0) return chords;

    const chordIds = chords.map(c => c.Id);

    const fingeringResult = await db.query(
        `
        SELECT ChordId, StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, StringNumber
    `
    );

    const barreResult = await db.query(
        `
        SELECT ChordId, FretNumber
        FROM ChordBarres
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, FretNumber
    `
    );

    const fingeringMap = {};
    fingeringResult.recordset.forEach(f => {
        if (!fingeringMap[f.ChordId]) {
            fingeringMap[f.ChordId] = { frets: new Array(6).fill(0), fingers: new Array(6).fill(0) };
        }
        fingeringMap[f.ChordId].frets[f.StringNumber - 1] = f.FretNumber;
        fingeringMap[f.ChordId].fingers[f.StringNumber - 1] = f.FingerNumber;
    });

    const barreMap = {};
    barreResult.recordset.forEach(b => {
        if (!barreMap[b.ChordId]) barreMap[b.ChordId] = [];
        barreMap[b.ChordId].push(b.FretNumber);
    });

    chords.forEach(c => {
        const data = fingeringMap[c.Id];
        c.frets = data ? data.frets : [];
        c.fingers = data ? data.fingers : [];
        c.barres = barreMap[c.Id] || [];
    });

    return chords;
}

async function setDefaultVariation(chordId, userId) {
    const chord = await getChordById(chordId, userId);
    if (!chord) throw new Error('Chord not found or access denied');

    const tx = await db.beginTransaction();
    try {
        await tx.query('UPDATE Chords SET IsDefault = 0 WHERE Name = @name', { name: chord.Name });
        await tx.query('UPDATE Chords SET IsDefault = 1 WHERE Id = @chordId', { chordId });
        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    } finally {
        tx.release();
    }
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
    const tx = await db.beginTransaction();

    try {
        if (isDefault) {
            await tx.query('UPDATE Chords SET IsDefault = 0 WHERE Name = @name AND Id != @id', { name, id: chordId });
        }

        await tx.query('UPDATE Chords SET Name = @name, BaseFret = @baseFret, IsDefault = @isDefault, updated_at = UTC_TIMESTAMP() WHERE Id = @id', {
            id: chordId,
            name,
            baseFret: baseFret || 1,
            isDefault: isDefault ? 1 : 0
        });

        await tx.query('DELETE FROM ChordFingerings WHERE ChordId = @chordId', { chordId });
        await tx.query('DELETE FROM ChordBarres WHERE ChordId = @chordId', { chordId });

        for (let i = 0; i < 6; i++) {
            await tx.query('INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)', {
                chordId,
                stringNumber: i + 1,
                fretNumber: frets[i],
                fingerNumber: fingers[i]
            });
        }

        if (barres && barres.length > 0) {
            for (const barreFret of barres) {
                await tx.query('INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)', {
                    chordId,
                    fretNumber: barreFret
                });
            }
        }

        await tx.commit();
        return { id: chordId };
    } catch (err) {
        await tx.rollback();
        throw err;
    } finally {
        tx.release();
    }
}

async function forkChord(originalChordId, chord, userId) {
    const newChord = await createChord(chord, userId);
    return newChord;
}

async function deleteChord(chordId, userId) {
    const chord = await getChordById(chordId, userId);
    if (!chord) {
        throw new Error('Chord not found');
    }
    if (chord.creator_id === userId) {
        await db.query('DELETE FROM Chords WHERE Id = @chordId', { chordId });
    } else {
        await db.query('DELETE FROM UserChords WHERE user_id = @userId AND chord_id = @chordId', { userId, chordId });
    }
}

async function shareChord(chordId, senderId, recipientUsername) {
    const recipient = await userService.findUserByUsername(recipientUsername);
    if (!recipient) {
        throw new Error('Recipient not found');
    }
    const sender = await userService.findUserById(senderId);
    const chord = await getChordById(chordId, senderId);
    if (!chord) {
        throw new Error('Chord not found');
    }

    await db.query(
        'INSERT INTO ChordShares (chord_id, sender_user_id, recipient_username, recipient_user_id, payload) VALUES (@chordId, @senderId, @recipientUsername, @recipientId, @payload)',
        { chordId, senderId, recipientUsername, recipientId: recipient.id, payload: JSON.stringify({ ...chord, senderUsername: sender.username }) }
    );
}

async function getIncomingShares(userId) {
    const result = await db.query("SELECT * FROM ChordShares WHERE recipient_user_id = @userId AND status = 'pending'", { userId });
    return result.recordset;
}

async function acceptShare(shareId, userId) {
    const shareResult = await db.query('SELECT * FROM ChordShares WHERE id = @shareId AND recipient_user_id = @userId', { shareId, userId });
    const share = shareResult.recordset[0];
    if (!share) {
        throw new Error('Share not found');
    }

    const tx = await db.beginTransaction();
    try {
        await tx.query("UPDATE ChordShares SET status = 'accepted' WHERE id = @shareId", { shareId });

        await tx.query('INSERT IGNORE INTO UserChords (user_id, chord_id, is_creator) VALUES (@user_id, @chord_id, 0)', {
            user_id: userId,
            chord_id: share.chord_id
        });

        await tx.commit();
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.release();
    }
}

async function rejectShare(shareId, userId) {
    await db.query("UPDATE ChordShares SET status = 'rejected' WHERE id = @shareId AND recipient_user_id = @userId", { shareId, userId });
}

async function getAllFamilies() {
    const result = await db.query('SELECT * FROM Families ORDER BY Name');
    return result.recordset;
}

async function getChordsForFamily(familyName, userId) {
    const result = await db.query(
        `
        SELECT DISTINCT c.* FROM Chords c
        INNER JOIN ChordFamilyMapping cfm ON c.Id = cfm.ChordId
        INNER JOIN Families f ON cfm.FamilyId = f.Id
        WHERE f.Name = @familyName AND (c.IsOriginal = 1 OR EXISTS (
            SELECT 1 FROM UserChords uc WHERE uc.chord_id = c.Id AND uc.user_id = @userId
        ))
    `,
        { familyName, userId }
    );

    const chords = result.recordset;
    if (chords.length === 0) return chords;

    const chordIds = chords.map(c => c.Id);

    const fingeringResult = await db.query(
        `
        SELECT ChordId, StringNumber, FretNumber, FingerNumber
        FROM ChordFingerings
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, StringNumber
    `
    );

    const barreResult = await db.query(
        `
        SELECT ChordId, FretNumber
        FROM ChordBarres
        WHERE ChordId IN (${chordIds.join(',')})
        ORDER BY ChordId, FretNumber
    `
    );

    const fingeringMap = {};
    fingeringResult.recordset.forEach(f => {
        if (!fingeringMap[f.ChordId]) {
            fingeringMap[f.ChordId] = { frets: new Array(6).fill(0), fingers: new Array(6).fill(0) };
        }
        fingeringMap[f.ChordId].frets[f.StringNumber - 1] = f.FretNumber;
        fingeringMap[f.ChordId].fingers[f.StringNumber - 1] = f.FingerNumber;
    });

    const barreMap = {};
    barreResult.recordset.forEach(b => {
        if (!barreMap[b.ChordId]) barreMap[b.ChordId] = [];
        barreMap[b.ChordId].push(b.FretNumber);
    });

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
    getChordVariations,
    setDefaultVariation,
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
