const db = require('../db');

async function createSong(song, userId) {
    const { title, songDate, notes, songKey, capo, bpm, effects, songContentFontSizePt, contentText, chordIds, folderIds } = song;
    const pool = await db.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        const songResult = await new sql.Request(transaction)
            .input('title', sql.NVarChar, title)
            .input('songDate', sql.NVarChar, songDate || '')
            .input('notes', sql.NVarChar, notes || '')
            .input('songKey', sql.NVarChar, songKey || '')
            .input('capo', sql.NVarChar, capo || '')
            .input('bpm', sql.NVarChar, bpm || '')
            .input('effects', sql.NVarChar, effects || '')
            .input('songContentFontSizePt', sql.Float, songContentFontSizePt ? parseFloat(songContentFontSizePt) : null)
            .input('contentText', sql.NVarChar, contentText)
            .input('creator_id', sql.Int, userId)
            .query(`
                INSERT INTO Songs (Title, SongDate, Notes, SongKey, Capo, BPM, Effects, SongContentFontSizePt, ContentText, creator_id, created_at, updated_at)
                OUTPUT INSERTED.Id
                VALUES (@title, @songDate, @notes, @songKey, @capo, @bpm, @effects, @songContentFontSizePt, @contentText, @creator_id, GETDATE(), GETDATE())
            `);
        
        const songId = songResult.recordset[0].Id;

        await new sql.Request(transaction)
            .input('user_id', sql.Int, userId)
            .input('song_id', sql.Int, songId)
            .query('INSERT INTO UserSongs (user_id, song_id, is_creator) VALUES (@user_id, @song_id, 1)');

        if (chordIds && chordIds.length > 0) {
            for (let i = 0; i < chordIds.length; i++) {
                if (chordIds[i] && chordIds[i] !== 'undefined' && !isNaN(parseInt(chordIds[i]))) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, songId)
                        .input('chordId', sql.Int, parseInt(chordIds[i]))
                        .input('displayOrder', sql.Int, i)
                        .query('INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)');
                }
            }
        }

        if (folderIds && folderIds.length > 0) {
            for (const folderId of folderIds) {
                if (folderId && folderId !== 'undefined' && !isNaN(parseInt(folderId))) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, songId)
                        .input('folderId', sql.Int, parseInt(folderId))
                        .query('INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)');
                }
            }
        }

        await transaction.commit();
        return { id: songId };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function getSongById(songId, userId) {
    const result = await db.query(`
        SELECT s.*, us.is_creator FROM Songs s
        LEFT JOIN UserSongs us ON s.id = us.song_id AND us.user_id = @userId
        WHERE s.id = @songId
    `, { userId, songId });
    return result.recordset[0];
}

async function getSongsByUserId(userId) {
    const result = await db.query(`
        SELECT s.*, us.is_creator FROM Songs s
        JOIN UserSongs us ON s.id = us.song_id
        WHERE us.user_id = @userId
    `, { userId });
    return result.recordset;
}

async function updateSong(songId, song, userId) {
    const originalSong = await getSongById(songId, userId);
    if (!originalSong) {
        throw new Error('Song not found');
    }

    if (originalSong.creator_id !== userId) {
        // Fork the song
        return await forkSong(songId, song, userId);
    }

    const { title, songDate, notes, songKey, capo, bpm, effects, songContentFontSizePt, contentText, chordIds, folderIds } = song;
    const pool = await db.connect();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
        await new sql.Request(transaction)
            .input('id', sql.Int, songId)
            .input('title', sql.NVarChar, title)
            .input('songDate', sql.NVarChar, songDate || '')
            .input('notes', sql.NVarChar, notes || '')
            .input('songKey', sql.NVarChar, songKey || '')
            .input('capo', sql.NVarChar, capo || '')
            .input('bpm', sql.NVarChar, bpm || '')
            .input('effects', sql.NVarChar, effects || '')
            .input('songContentFontSizePt', sql.Float, songContentFontSizePt ? parseFloat(songContentFontSizePt) : null)
            .input('contentText', sql.NVarChar, contentText)
            .query(`
                UPDATE Songs
                SET Title = @title, SongDate = @songDate, Notes = @notes,
                    SongKey = @songKey, Capo = @capo, BPM = @bpm,
                    Effects = @effects, SongContentFontSizePt = @songContentFontSizePt, ContentText = @contentText, updated_at = GETDATE()
                WHERE Id = @id
            `);

        await new sql.Request(transaction)
            .input('songId', sql.Int, songId)
            .query('DELETE FROM SongChordDiagrams WHERE SongId = @songId');
        
        await new sql.Request(transaction)
            .input('songId', sql.Int, songId)
            .query('DELETE FROM SongFolderMapping WHERE SongId = @songId');

        if (chordIds && chordIds.length > 0) {
            for (let i = 0; i < chordIds.length; i++) {
                if (chordIds[i] && chordIds[i] !== 'undefined' && !isNaN(parseInt(chordIds[i]))) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, songId)
                        .input('chordId', sql.Int, parseInt(chordIds[i]))
                        .input('displayOrder', sql.Int, i)
                        .query('INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)');
                }
            }
        }
        
        if (folderIds && folderIds.length > 0) {
            for (const folderId of folderIds) {
                if (folderId && folderId !== 'undefined' && !isNaN(parseInt(folderId))) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, songId)
                        .input('folderId', sql.Int, parseInt(folderId))
                        .query('INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)');
                }
            }
        }
        
        await transaction.commit();
        return { id: songId };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}


async function forkSong(originalSongId, song, userId) {
    const newSong = await createSong(song, userId);
    return newSong;
}

async function deleteSong(songId, userId) {
    const song = await getSongById(songId, userId);
    if (!song || song.creator_id !== userId) {
        throw new Error('Unauthorized');
    }
    await db.query('DELETE FROM Songs WHERE Id = @songId', { songId });
}

async function shareSong(songId, senderId, recipientUsername) {
    const recipient = await userService.findUserByUsername(recipientUsername);
    if (!recipient) {
        throw new Error('Recipient not found');
    }
    const song = await getSongById(songId, senderId);
    if (!song) {
        throw new Error('Song not found');
    }

    await db.query(
        'INSERT INTO SongShares (song_id, sender_user_id, recipient_user_id, payload) VALUES (@songId, @senderId, @recipientId, @payload)',
        { songId, senderId, recipientId: recipient.id, payload: JSON.stringify(song) }
    );
}

async function getIncomingShares(userId) {
    const result = await db.query('SELECT * FROM SongShares WHERE recipient_user_id = @userId AND status = \'pending\'', { userId });
    return result.recordset;
}

async function acceptShare(shareId, userId) {
    const shareResult = await db.query('SELECT * FROM SongShares WHERE id = @shareId AND recipient_user_id = @userId', { shareId, userId });
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
            .query('UPDATE SongShares SET status = \'accepted\' WHERE id = @shareId');

        await new sql.Request(transaction)
            .input('user_id', sql.Int, userId)
            .input('song_id', sql.Int, share.song_id)
            .query('INSERT INTO UserSongs (user_id, song_id, is_creator) VALUES (@user_id, @song_id, 0)');
        
        const chordIdsResult = await new sql.Request(transaction)
            .input('songId', sql.Int, share.song_id)
            .query('SELECT ChordId FROM SongChordDiagrams WHERE SongId = @songId');
        
        for (const record of chordIdsResult.recordset) {
            await new sql.Request(transaction)
                .input('user_id', sql.Int, userId)
                .input('chord_id', sql.Int, record.ChordId)
                .query('IF NOT EXISTS (SELECT 1 FROM UserChords WHERE user_id = @user_id AND chord_id = @chord_id) INSERT INTO UserChords (user_id, chord_id, is_creator) VALUES (@user_id, @chord_id, 0)');
        }

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function rejectShare(shareId, userId) {
    await db.query('UPDATE SongShares SET status = \'rejected\' WHERE id = @shareId AND recipient_user_id = @userId', { shareId, userId });
}

async function getAllFolders() {
    const result = await db.query('SELECT * FROM Folders ORDER BY Name');
    return result.recordset;
}

async function createFolder(folder, userId) {
    const { name } = folder;
    const result = await db.query('INSERT INTO Folders (Name) OUTPUT INSERTED.Id VALUES (@name)', { name });
    return { id: result.recordset[0].Id };
}

async function updateFolder(folderId, folder, userId) {
    const { name } = folder;
    await db.query('UPDATE Folders SET Name = @name WHERE Id = @folderId', { folderId, name });
    return { id: folderId };
}

async function deleteFolder(folderId, userId) {
    await db.query('DELETE FROM Folders WHERE Id = @folderId', { folderId });
}

async function getSongsByFolder(folderId, userId) {
    const parsedFolderId = parseInt(folderId);
    if (isNaN(parsedFolderId)) return [];
    const result = await db.query(`
        SELECT s.*, us.is_creator FROM Songs s
        JOIN UserSongs us ON s.id = us.song_id
        JOIN SongFolderMapping sfm ON s.id = sfm.SongId
        WHERE sfm.FolderId = @folderId AND us.user_id = @userId
    `, { folderId: parsedFolderId, userId });
    return result.recordset;
}

async function getSongChordDiagrams(songId, userId) {
    const parsedSongId = parseInt(songId);
    if (isNaN(parsedSongId)) return [];
    const result = await db.query(`
        SELECT scd.DisplayOrder, c.* FROM SongChordDiagrams scd
        JOIN Chords c ON scd.ChordId = c.Id
        WHERE scd.SongId = @songId
        ORDER BY scd.DisplayOrder
    `, { songId: parsedSongId });
    // Add frets etc. if needed, but for now basic
    return result.recordset;
}

async function getSongFolders(songId, userId) {
    const parsedSongId = parseInt(songId);
    if (isNaN(parsedSongId)) return [];
    const result = await db.query(`
        SELECT f.* FROM Folders f
        JOIN SongFolderMapping sfm ON f.Id = sfm.FolderId
        WHERE sfm.SongId = @songId
    `, { songId: parsedSongId });
    return result.recordset;
}

module.exports = {
    createSong,
    getSongById,
    getSongsByUserId,
    updateSong,
    deleteSong,
    shareSong,
    getIncomingShares,
    acceptShare,
    rejectShare,
    getAllFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    getSongsByFolder,
    getSongChordDiagrams,
    getSongFolders
};
const userService = require('./userService');
const sql = require('mssql/msnodesqlv8');
