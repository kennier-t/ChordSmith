const db = require('../db');
const userService = require('./userService');
const sql = require('mssql/msnodesqlv8');

function clampDividerRatio(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0.5;
    return Math.min(0.8, Math.max(0.2, numeric));
}

function normalizeSongLayoutInput(song) {
    const requestedColumnCount = Number(song.layoutColumnCount || song.LayoutColumnCount);
    const layoutColumnCount = requestedColumnCount === 2 ? 2 : 1;

    const providedSingleText = typeof song.contentText === 'string'
        ? song.contentText
        : (typeof song.ContentText === 'string' ? song.ContentText : '');

    const providedColumn1Text = typeof song.contentTextColumn1 === 'string'
        ? song.contentTextColumn1
        : (typeof song.ContentTextColumn1 === 'string' ? song.ContentTextColumn1 : null);

    const providedColumn2Text = typeof song.contentTextColumn2 === 'string'
        ? song.contentTextColumn2
        : (typeof song.ContentTextColumn2 === 'string' ? song.ContentTextColumn2 : null);

    let contentTextColumn1 = providedColumn1Text;
    let contentTextColumn2 = providedColumn2Text;

    if (layoutColumnCount === 1) {
        if (contentTextColumn1 === null) {
            contentTextColumn1 = providedSingleText;
        }
        if (contentTextColumn2 === null) {
            contentTextColumn2 = '';
        }
    } else {
        if (contentTextColumn1 === null) {
            contentTextColumn1 = '';
        }
        if (contentTextColumn2 === null) {
            contentTextColumn2 = '';
        }
    }

    const dividerRatio = clampDividerRatio(song.layoutDividerRatio || song.LayoutDividerRatio);

    let contentText = providedSingleText;
    if (layoutColumnCount === 2) {
        contentText = [contentTextColumn1, contentTextColumn2]
            .filter(part => typeof part === 'string' && part.length > 0)
            .join('\n\n');
    } else if (!contentText) {
        contentText = contentTextColumn1 || '';
    }

    return {
        layoutColumnCount,
        dividerRatio,
        contentTextColumn1: contentTextColumn1 || '',
        contentTextColumn2: contentTextColumn2 || '',
        contentText: contentText || ''
    };
}

async function createSong(song, userId) {
    const { title, songDate, notes, songKey, capo, bpm, effects, songContentFontSizePt, chordIds, folderIds } = song;
    const {
        layoutColumnCount,
        dividerRatio,
        contentTextColumn1,
        contentTextColumn2,
        contentText
    } = normalizeSongLayoutInput(song);

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
            .input('layoutColumnCount', sql.Int, layoutColumnCount)
            .input('layoutDividerRatio', sql.Decimal(6, 5), dividerRatio)
            .input('contentTextColumn1', sql.NVarChar, contentTextColumn1)
            .input('contentTextColumn2', sql.NVarChar, contentTextColumn2)
            .input('creator_id', sql.Int, userId)
            .query(`
                INSERT INTO Songs (
                    Title, SongDate, Notes, SongKey, Capo, BPM, Effects,
                    SongContentFontSizePt, ContentText, LayoutColumnCount,
                    LayoutDividerRatio, ContentTextColumn1, ContentTextColumn2,
                    creator_id, created_at, updated_at
                )
                OUTPUT INSERTED.Id
                VALUES (
                    @title, @songDate, @notes, @songKey, @capo, @bpm, @effects,
                    @songContentFontSizePt, @contentText, @layoutColumnCount,
                    @layoutDividerRatio, @contentTextColumn1, @contentTextColumn2,
                    @creator_id, GETDATE(), GETDATE()
                )
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
        SELECT s.*, us.is_creator,
               STUFF((
                   SELECT ',' + CAST(sfm.FolderId AS VARCHAR)
                   FROM SongFolderMapping sfm
                   WHERE sfm.SongId = s.Id AND us.is_creator = 1
                   FOR XML PATH('')
               ), 1, 1, '') AS folderIds,
               STUFF((
                   SELECT ', ' + f.Name
                   FROM SongFolderMapping sfm
                   JOIN Folders f ON sfm.FolderId = f.Id
                   WHERE sfm.SongId = s.Id AND us.is_creator = 1
                   FOR XML PATH('')
               ), 1, 2, '') AS folderNames,
               STUFF((
                    SELECT ',' + CAST(scd.ChordId AS VARCHAR)
                    FROM SongChordDiagrams scd
                    WHERE scd.SongId = s.Id
                    ORDER BY scd.DisplayOrder
                    FOR XML PATH('')
                ), 1, 1, '') AS chordIds
        FROM Songs s
        LEFT JOIN UserSongs us ON s.id = us.song_id AND us.user_id = @userId
        WHERE s.id = @songId
    `, { userId, songId });
    const song = result.recordset[0];
    if (song) {
        song.folderIds = song.folderIds ? song.folderIds.split(',').map(Number) : [];
        song.chordIds = song.chordIds ? song.chordIds.split(',').map(Number) : [];
    }
    return song;
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

    const { title, songDate, notes, songKey, capo, bpm, effects, songContentFontSizePt, chordIds, folderIds } = song;
    const {
        layoutColumnCount,
        dividerRatio,
        contentTextColumn1,
        contentTextColumn2,
        contentText
    } = normalizeSongLayoutInput(song);

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
            .input('layoutColumnCount', sql.Int, layoutColumnCount)
            .input('layoutDividerRatio', sql.Decimal(6, 5), dividerRatio)
            .input('contentTextColumn1', sql.NVarChar, contentTextColumn1)
            .input('contentTextColumn2', sql.NVarChar, contentTextColumn2)
            .query(`
                UPDATE Songs
                SET Title = @title, SongDate = @songDate, Notes = @notes,
                    SongKey = @songKey, Capo = @capo, BPM = @bpm,
                    Effects = @effects, SongContentFontSizePt = @songContentFontSizePt,
                    ContentText = @contentText, LayoutColumnCount = @layoutColumnCount,
                    LayoutDividerRatio = @layoutDividerRatio, ContentTextColumn1 = @contentTextColumn1,
                    ContentTextColumn2 = @contentTextColumn2, updated_at = GETDATE()
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
    if (!song) {
        throw new Error('Song not found');
    }
    if (song.creator_id === userId) {
        // Creator deletes the song entirely
        await db.query('DELETE FROM Songs WHERE Id = @songId', { songId });
    } else {
        // Non-creator removes the mapping
        await db.query('DELETE FROM UserSongs WHERE user_id = @userId AND song_id = @songId', { userId, songId });
        // Also remove from user's folders
        await db.query(`
            DELETE sfm FROM SongFolderMapping sfm
            JOIN Folders f ON sfm.FolderId = f.Id
            WHERE sfm.SongId = @songId AND f.creator_id = @userId
        `, { songId, userId });
    }
}

async function shareSong(songId, senderId, recipientUsername) {
    const recipient = await userService.findUserByUsername(recipientUsername);
    if (!recipient) {
        throw new Error('Recipient not found');
    }
    const sender = await userService.findUserById(senderId);
    const song = await getSongById(songId, senderId);
    if (!song) {
        throw new Error('Song not found');
    }

    await db.query(
        'INSERT INTO SongShares (song_id, sender_user_id, recipient_username, recipient_user_id, payload) VALUES (@songId, @senderId, @recipientUsername, @recipientId, @payload)',
        { songId, senderId, recipientUsername, recipientId: recipient.id, payload: JSON.stringify({ ...song, senderUsername: sender.username }) }
    );
}

async function getIncomingShares(userId) {
    const result = await db.query('SELECT * FROM SongShares WHERE recipient_user_id = @userId AND status = \'pending\'', { userId });
    return result.recordset;
}

async function acceptShare(shareId, userId, folderIds = []) {
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

        // Add to selected folders
        if (folderIds && folderIds.length > 0) {
            for (const folderId of folderIds) {
                await new sql.Request(transaction)
                    .input('songId', sql.Int, share.song_id)
                    .input('folderId', sql.Int, folderId)
                    .query('IF NOT EXISTS (SELECT 1 FROM SongFolderMapping WHERE SongId = @songId AND FolderId = @folderId) INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)');
            }
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

async function getAllFolders(userId) {
    const result = await db.query('SELECT * FROM Folders WHERE creator_id = @userId ORDER BY Name', { userId });
    return result.recordset;
}

async function createFolder(folder, userId) {
    const { name } = folder;
    const result = await db.query('INSERT INTO Folders (Name, creator_id) OUTPUT INSERTED.Id VALUES (@name, @userId)', { name, userId });
    return { id: result.recordset[0].Id };
}

async function updateFolder(folderId, folder, userId) {
    const { name } = folder;
    await db.query('UPDATE Folders SET Name = @name WHERE Id = @folderId AND creator_id = @userId', { folderId, name, userId });
    return { id: folderId };
}

async function deleteFolder(folderId, userId) {
    await db.query('DELETE FROM Folders WHERE Id = @folderId AND creator_id = @userId', { folderId, userId });
}

async function getSongsByFolder(folderId, userId) {
    const parsedFolderId = parseInt(folderId);
    if (isNaN(parsedFolderId)) return [];
    // First check if folder belongs to user
    const folderCheck = await db.query('SELECT Id FROM Folders WHERE Id = @folderId AND creator_id = @userId', { folderId: parsedFolderId, userId });
    if (folderCheck.recordset.length === 0) return [];
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

    // Add fingerings for each chord
    for (const chord of result.recordset) {
        // Get fingerings
        const fingeringResult = await db.query(`
            SELECT StringNumber, FretNumber, FingerNumber
            FROM ChordFingerings
            WHERE ChordId = @chordId
            ORDER BY StringNumber
        `, { chordId: chord.Id });

        // Get barres
        const barreResult = await db.query(`
            SELECT FretNumber
            FROM ChordBarres
            WHERE ChordId = @chordId
            ORDER BY FretNumber
        `, { chordId: chord.Id });

        chord.frets = new Array(6).fill(0);
        chord.fingers = new Array(6).fill(0);
        fingeringResult.recordset.forEach(f => {
            chord.frets[f.StringNumber - 1] = f.FretNumber;
            chord.fingers[f.StringNumber - 1] = f.FingerNumber;
        });
        chord.barres = barreResult.recordset.map(b => b.FretNumber);
    }

    return result.recordset;
}

async function getSongFolders(songId, userId) {
    const parsedSongId = parseInt(songId);
    if (isNaN(parsedSongId)) return [];
    const result = await db.query(`
        SELECT f.* FROM Folders f
        JOIN SongFolderMapping sfm ON f.Id = sfm.FolderId
        WHERE sfm.SongId = @songId AND f.creator_id = @userId
    `, { songId: parsedSongId, userId });
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
