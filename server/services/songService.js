const db = require('../db');
const userService = require('./userService');

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

    return {
        layoutColumnCount,
        dividerRatio,
        contentTextColumn1: contentTextColumn1 || '',
        contentTextColumn2: contentTextColumn2 || ''
    };
}

function buildLegacyContentText(song) {
    if (!song) return '';
    const existing = typeof song.ContentText === 'string' ? song.ContentText : '';
    if (existing) return existing;

    const columnCount = Number(song.LayoutColumnCount) === 2 ? 2 : 1;
    const col1 = typeof song.ContentTextColumn1 === 'string' ? song.ContentTextColumn1 : '';
    const col2 = typeof song.ContentTextColumn2 === 'string' ? song.ContentTextColumn2 : '';

    if (columnCount === 2) {
        if (!col1) return col2;
        if (!col2) return col1;
        return `${col1}\n\n${col2}`;
    }

    return col1;
}

function applyLegacyContentCompatibility(song) {
    if (!song) return song;
    song.ContentText = buildLegacyContentText(song);
    return song;
}

function toInt(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeChordPayload(chord) {
    const frets = Array.isArray(chord.frets) ? chord.frets.slice(0, 6) : [];
    const fingers = Array.isArray(chord.fingers) ? chord.fingers.slice(0, 6) : [];
    while (frets.length < 6) frets.push(0);
    while (fingers.length < 6) fingers.push(0);

    const cleanFrets = frets.map(v => toInt(v, 0));
    const cleanFingers = fingers.map(v => toInt(v, 0));

    const barres = Array.isArray(chord.barres)
        ? [...new Set(chord.barres.map(v => toInt(v, 0)).filter(v => v > 0))].sort((a, b) => a - b)
        : [];

    return {
        name: String(chord.name || chord.Name || '').trim(),
        baseFret: toInt(chord.baseFret || chord.BaseFret || 1, 1),
        isDefault: !!(chord.isDefault || chord.IsDefault),
        frets: cleanFrets,
        fingers: cleanFingers,
        barres
    };
}

function chordSignature(chord) {
    const normalized = normalizeChordPayload(chord);
    return JSON.stringify({
        name: normalized.name,
        baseFret: normalized.baseFret,
        frets: normalized.frets,
        fingers: normalized.fingers,
        barres: normalized.barres
    });
}

async function createSong(song, userId) {
    const { title, songDate, notes, songKey, capo, bpm, effects, songContentFontSizePt, chordIds, folderIds } = song;
    const {
        layoutColumnCount,
        dividerRatio,
        contentTextColumn1,
        contentTextColumn2
    } = normalizeSongLayoutInput(song);

    const tx = await db.beginTransaction();
    try {
        const songResult = await tx.query(
            `
                INSERT INTO Songs (
                    Title, SongDate, Notes, SongKey, Capo, BPM, Effects,
                    SongContentFontSizePt, LayoutColumnCount,
                    LayoutDividerRatio, ContentTextColumn1, ContentTextColumn2,
                    creator_id, created_at, updated_at
                )
                VALUES (
                    @title, @songDate, @notes, @songKey, @capo, @bpm, @effects,
                    @songContentFontSizePt, @layoutColumnCount,
                    @layoutDividerRatio, @contentTextColumn1, @contentTextColumn2,
                    @creator_id, UTC_TIMESTAMP(), UTC_TIMESTAMP()
                )
            `,
            {
                title,
                songDate: songDate || '',
                notes: notes || '',
                songKey: songKey || '',
                capo: capo || '',
                bpm: bpm || '',
                effects: effects || '',
                songContentFontSizePt: songContentFontSizePt ? parseFloat(songContentFontSizePt) : null,
                layoutColumnCount,
                layoutDividerRatio: dividerRatio,
                contentTextColumn1,
                contentTextColumn2,
                creator_id: userId
            }
        );

        const songId = songResult.insertId;

        await tx.query('INSERT INTO UserSongs (user_id, song_id, is_creator) VALUES (@user_id, @song_id, 1)', {
            user_id: userId,
            song_id: songId
        });

        if (chordIds && chordIds.length > 0) {
            for (let i = 0; i < chordIds.length; i++) {
                if (chordIds[i] && chordIds[i] !== 'undefined' && !isNaN(parseInt(chordIds[i], 10))) {
                    await tx.query('INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)', {
                        songId,
                        chordId: parseInt(chordIds[i], 10),
                        displayOrder: i
                    });
                }
            }
        }

        if (folderIds && folderIds.length > 0) {
            for (const folderId of folderIds) {
                if (folderId && folderId !== 'undefined' && !isNaN(parseInt(folderId, 10))) {
                    await tx.query('INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)', {
                        songId,
                        folderId: parseInt(folderId, 10)
                    });
                }
            }
        }

        await tx.commit();
        return { id: songId };
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.release();
    }
}

async function getSongById(songId, userId) {
    const result = await db.query(
        `
        SELECT s.*, us.is_creator,
               (
                   SELECT GROUP_CONCAT(sfm.FolderId ORDER BY sfm.FolderId SEPARATOR ',')
                   FROM SongFolderMapping sfm
                   WHERE sfm.SongId = s.Id AND us.is_creator = 1
               ) AS folderIds,
               (
                   SELECT GROUP_CONCAT(f.Name ORDER BY f.Name SEPARATOR ', ')
                   FROM SongFolderMapping sfm
                   JOIN Folders f ON sfm.FolderId = f.Id
                   WHERE sfm.SongId = s.Id AND us.is_creator = 1
               ) AS folderNames,
               (
                    SELECT GROUP_CONCAT(scd.ChordId ORDER BY scd.DisplayOrder SEPARATOR ',')
                    FROM SongChordDiagrams scd
                    WHERE scd.SongId = s.Id
                ) AS chordIds
        FROM Songs s
        LEFT JOIN UserSongs us ON s.id = us.song_id AND us.user_id = @userId
        WHERE s.id = @songId
    `,
        { userId, songId }
    );
    const song = result.recordset[0];
    if (song) {
        song.folderIds = song.folderIds ? song.folderIds.split(',').map(Number) : [];
        song.chordIds = song.chordIds ? song.chordIds.split(',').map(Number) : [];
        applyLegacyContentCompatibility(song);
    }
    return song;
}

async function getSongsByUserId(userId) {
    const result = await db.query(
        `
        SELECT s.*, us.is_creator FROM Songs s
        JOIN UserSongs us ON s.id = us.song_id
        WHERE us.user_id = @userId
    `,
        { userId }
    );
    return result.recordset.map(applyLegacyContentCompatibility);
}

async function updateSong(songId, song, userId) {
    const originalSong = await getSongById(songId, userId);
    if (!originalSong) {
        throw new Error('Song not found');
    }

    if (originalSong.creator_id !== userId) {
        return await forkSong(songId, song, userId);
    }

    const { title, songDate, notes, songKey, capo, bpm, effects, songContentFontSizePt, chordIds, folderIds } = song;
    const {
        layoutColumnCount,
        dividerRatio,
        contentTextColumn1,
        contentTextColumn2
    } = normalizeSongLayoutInput(song);

    const tx = await db.beginTransaction();
    try {
        await tx.query(
            `
                UPDATE Songs
                SET Title = @title, SongDate = @songDate, Notes = @notes,
                    SongKey = @songKey, Capo = @capo, BPM = @bpm,
                    Effects = @effects, SongContentFontSizePt = @songContentFontSizePt,
                    LayoutColumnCount = @layoutColumnCount,
                    LayoutDividerRatio = @layoutDividerRatio, ContentTextColumn1 = @contentTextColumn1,
                    ContentTextColumn2 = @contentTextColumn2, updated_at = UTC_TIMESTAMP()
                WHERE Id = @id
            `,
            {
                id: songId,
                title,
                songDate: songDate || '',
                notes: notes || '',
                songKey: songKey || '',
                capo: capo || '',
                bpm: bpm || '',
                effects: effects || '',
                songContentFontSizePt: songContentFontSizePt ? parseFloat(songContentFontSizePt) : null,
                layoutColumnCount,
                layoutDividerRatio: dividerRatio,
                contentTextColumn1,
                contentTextColumn2
            }
        );

        await tx.query('DELETE FROM SongChordDiagrams WHERE SongId = @songId', { songId });
        await tx.query('DELETE FROM SongFolderMapping WHERE SongId = @songId', { songId });

        if (chordIds && chordIds.length > 0) {
            for (let i = 0; i < chordIds.length; i++) {
                if (chordIds[i] && chordIds[i] !== 'undefined' && !isNaN(parseInt(chordIds[i], 10))) {
                    await tx.query('INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)', {
                        songId,
                        chordId: parseInt(chordIds[i], 10),
                        displayOrder: i
                    });
                }
            }
        }

        if (folderIds && folderIds.length > 0) {
            for (const folderId of folderIds) {
                if (folderId && folderId !== 'undefined' && !isNaN(parseInt(folderId, 10))) {
                    await tx.query('INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)', {
                        songId,
                        folderId: parseInt(folderId, 10)
                    });
                }
            }
        }

        await tx.commit();
        return { id: songId };
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.release();
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
        await db.query('DELETE FROM Songs WHERE Id = @songId', { songId });
    } else {
        await db.query('DELETE FROM UserSongs WHERE user_id = @userId AND song_id = @songId', { userId, songId });
        await db.query(
            `
            DELETE sfm
            FROM SongFolderMapping sfm
            JOIN Folders f ON sfm.FolderId = f.Id
            WHERE sfm.SongId = @songId AND f.creator_id = @userId
        `,
            { songId, userId }
        );
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
    const result = await db.query("SELECT * FROM SongShares WHERE recipient_user_id = @userId AND status = 'pending'", { userId });
    return result.recordset;
}

async function acceptShare(shareId, userId, folderIds = []) {
    const shareResult = await db.query('SELECT * FROM SongShares WHERE id = @shareId AND recipient_user_id = @userId', { shareId, userId });
    const share = shareResult.recordset[0];
    if (!share) {
        throw new Error('Share not found');
    }

    const tx = await db.beginTransaction();
    try {
        await tx.query("UPDATE SongShares SET status = 'accepted' WHERE id = @shareId", { shareId });

        await tx.query('INSERT IGNORE INTO UserSongs (user_id, song_id, is_creator) VALUES (@user_id, @song_id, 0)', {
            user_id: userId,
            song_id: share.song_id
        });

        const chordIdsResult = await tx.query('SELECT ChordId FROM SongChordDiagrams WHERE SongId = @songId', { songId: share.song_id });

        for (const record of chordIdsResult.recordset) {
            await tx.query('INSERT IGNORE INTO UserChords (user_id, chord_id, is_creator) VALUES (@user_id, @chord_id, 0)', {
                user_id: userId,
                chord_id: record.ChordId
            });
        }

        if (folderIds && folderIds.length > 0) {
            for (const folderId of folderIds) {
                const parsedFolderId = parseInt(folderId, 10);
                if (!isNaN(parsedFolderId)) {
                    await tx.query('INSERT IGNORE INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)', {
                        songId: share.song_id,
                        folderId: parsedFolderId
                    });
                }
            }
        }

        await tx.commit();
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.release();
    }
}

async function rejectShare(shareId, userId) {
    await db.query("UPDATE SongShares SET status = 'rejected' WHERE id = @shareId AND recipient_user_id = @userId", { shareId, userId });
}

async function getAllFolders(userId) {
    const result = await db.query('SELECT * FROM Folders WHERE creator_id = @userId ORDER BY Name', { userId });
    return result.recordset;
}

async function createFolder(folder, userId) {
    const { name } = folder;
    const result = await db.query('INSERT INTO Folders (Name, creator_id) VALUES (@name, @userId)', { name, userId });
    return { id: result.insertId };
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
    const parsedFolderId = parseInt(folderId, 10);
    if (isNaN(parsedFolderId)) return [];
    const folderCheck = await db.query('SELECT Id FROM Folders WHERE Id = @folderId AND creator_id = @userId', { folderId: parsedFolderId, userId });
    if (folderCheck.recordset.length === 0) return [];
    const result = await db.query(
        `
        SELECT s.*, us.is_creator FROM Songs s
        JOIN UserSongs us ON s.id = us.song_id
        JOIN SongFolderMapping sfm ON s.id = sfm.SongId
        WHERE sfm.FolderId = @folderId AND us.user_id = @userId
    `,
        { folderId: parsedFolderId, userId }
    );
    return result.recordset.map(applyLegacyContentCompatibility);
}

async function getSongChordDiagrams(songId, userId) {
    const parsedSongId = parseInt(songId, 10);
    if (isNaN(parsedSongId)) return [];
    const result = await db.query(
        `
        SELECT scd.DisplayOrder, c.* FROM SongChordDiagrams scd
        JOIN Chords c ON scd.ChordId = c.Id
        WHERE scd.SongId = @songId
        ORDER BY scd.DisplayOrder
    `,
        { songId: parsedSongId }
    );

    for (const chord of result.recordset) {
        const fingeringResult = await db.query(
            `
            SELECT StringNumber, FretNumber, FingerNumber
            FROM ChordFingerings
            WHERE ChordId = @chordId
            ORDER BY StringNumber
        `,
            { chordId: chord.Id }
        );

        const barreResult = await db.query(
            `
            SELECT FretNumber
            FROM ChordBarres
            WHERE ChordId = @chordId
            ORDER BY FretNumber
        `,
            { chordId: chord.Id }
        );

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
    const parsedSongId = parseInt(songId, 10);
    if (isNaN(parsedSongId)) return [];
    const result = await db.query(
        `
        SELECT f.* FROM Folders f
        JOIN SongFolderMapping sfm ON f.Id = sfm.FolderId
        WHERE sfm.SongId = @songId AND f.creator_id = @userId
    `,
        { songId: parsedSongId, userId }
    );
    return result.recordset;
}

function normalizeTextValue(value) {
    if (value === null || value === undefined) return '';
    return String(value);
}

function normalizeNumericValue(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

async function getAccessibleChordsWithDetails(userId) {
    const chordsResult = await db.query(
        `
        SELECT c.*, IFNULL(uc.is_creator, 0) as is_creator
        FROM Chords c
        LEFT JOIN UserChords uc ON c.id = uc.chord_id AND uc.user_id = @userId
        WHERE c.IsOriginal = 1 OR uc.user_id IS NOT NULL
    `,
        { userId }
    );

    const chords = chordsResult.recordset;
    if (chords.length === 0) return [];

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

    return chords.map(c => {
        const data = fingeringMap[c.Id] || { frets: new Array(6).fill(0), fingers: new Array(6).fill(0) };
        return {
            id: c.Id,
            name: c.Name,
            baseFret: c.BaseFret,
            isDefault: !!c.IsDefault,
            frets: data.frets,
            fingers: data.fingers,
            barres: (barreMap[c.Id] || []).slice().sort((a, b) => a - b)
        };
    });
}

function normalizeIdArray(values) {
    if (!Array.isArray(values)) return [];
    const unique = new Set();
    for (const value of values) {
        const id = toInt(value, 0);
        if (id > 0) unique.add(id);
    }
    return Array.from(unique);
}

async function exportContentPack(userId, selectedSongIds = []) {
    const user = await userService.findUserById(userId);
    const songs = await getSongsByUserId(userId);
    const requestedSongIds = normalizeIdArray(selectedSongIds);
    const requestedSongIdSet = new Set(requestedSongIds);
    const detailedSongs = [];
    const requiredChordIds = new Set();

    for (const song of songs) {
        if (requestedSongIdSet.size > 0 && !requestedSongIdSet.has(toInt(song.Id, 0))) {
            continue;
        }

        const fullSong = await getSongById(song.Id, userId);
        if (!fullSong) continue;
        detailedSongs.push({
            id: fullSong.Id,
            title: fullSong.Title,
            songDate: fullSong.SongDate || '',
            notes: fullSong.Notes || '',
            songKey: fullSong.SongKey || '',
            capo: fullSong.Capo || '',
            bpm: fullSong.BPM || '',
            effects: fullSong.Effects || '',
            songContentFontSizePt: fullSong.SongContentFontSizePt,
            layoutColumnCount: toInt(fullSong.LayoutColumnCount, 1),
            layoutDividerRatio: toNumber(fullSong.LayoutDividerRatio, 0.5),
            contentTextColumn1: fullSong.ContentTextColumn1 || '',
            contentTextColumn2: fullSong.ContentTextColumn2 || '',
            chordIds: Array.isArray(fullSong.chordIds) ? fullSong.chordIds : []
        });

        for (const chordId of fullSong.chordIds || []) {
            requiredChordIds.add(toInt(chordId, 0));
        }
    }

    const allAccessibleChords = await getAccessibleChordsWithDetails(userId);
    const chordsById = new Map(allAccessibleChords.map(chord => [toInt(chord.id, 0), chord]));
    const packChords = [];

    requiredChordIds.forEach(chordId => {
        const chord = chordsById.get(chordId);
        if (chord) {
            packChords.push(chord);
        }
    });

    return {
        format: 'chordsmith-content-pack',
        version: 1,
        exportedAt: new Date().toISOString(),
        exportedBy: {
            id: user.id,
            username: user.username
        },
        data: {
            chords: packChords,
            songs: detailedSongs
        }
    };
}

async function findMatchingChordId(tx, chord, userId) {
    const candidatesResult = await tx.query(
        `
        SELECT DISTINCT c.Id
        FROM Chords c
        LEFT JOIN UserChords uc ON uc.chord_id = c.Id
        WHERE c.Name = @name
          AND c.BaseFret = @baseFret
          AND (c.IsOriginal = 1 OR uc.user_id = @userId)
    `,
        { name: chord.name, baseFret: chord.baseFret, userId }
    );

    for (const candidate of candidatesResult.recordset) {
        const candidateId = candidate.Id;
        const fingeringResult = await tx.query(
            `
            SELECT StringNumber, FretNumber, FingerNumber
            FROM ChordFingerings
            WHERE ChordId = @chordId
            ORDER BY StringNumber
        `,
            { chordId: candidateId }
        );
        const barreResult = await tx.query(
            `
            SELECT FretNumber
            FROM ChordBarres
            WHERE ChordId = @chordId
            ORDER BY FretNumber
        `,
            { chordId: candidateId }
        );

        const candidatePayload = {
            name: chord.name,
            baseFret: chord.baseFret,
            frets: new Array(6).fill(0),
            fingers: new Array(6).fill(0),
            barres: barreResult.recordset.map(b => b.FretNumber)
        };
        fingeringResult.recordset.forEach(f => {
            candidatePayload.frets[f.StringNumber - 1] = f.FretNumber;
            candidatePayload.fingers[f.StringNumber - 1] = f.FingerNumber;
        });

        if (chordSignature(candidatePayload) === chordSignature(chord)) {
            return candidateId;
        }
    }

    return null;
}

async function importContentPack(pack, userId, options = {}) {
    if (!pack || pack.format !== 'chordsmith-content-pack' || !pack.data) {
        throw new Error('Invalid content pack format');
    }

    const chordsPayload = Array.isArray(pack.data.chords) ? pack.data.chords : [];
    const allSongsPayload = Array.isArray(pack.data.songs) ? pack.data.songs : [];
    const selectedSongIds = normalizeIdArray(options.songIds);
    const selectedSongIdSet = new Set(selectedSongIds);
    const songsPayload = selectedSongIdSet.size > 0
        ? allSongsPayload.filter(song => selectedSongIdSet.has(toInt(song.id || song.Id, 0)))
        : allSongsPayload;
    const requiredChordIdSet = new Set();
    for (const song of songsPayload) {
        const songChordIds = Array.isArray(song.chordIds)
            ? song.chordIds
            : (Array.isArray(song.ChordIds) ? song.ChordIds : []);
        for (const chordId of songChordIds) {
            const parsedId = toInt(chordId, 0);
            if (parsedId > 0) requiredChordIdSet.add(parsedId);
        }
    }
    const destinationFolderId = toInt(options.destinationFolderId, 0);

    const tx = await db.beginTransaction();
    const chordIdMap = new Map();
    let createdChords = 0;
    let createdSongs = 0;
    let assignedToFolder = 0;
    let linkedExistingSongs = 0;

    try {
        if (destinationFolderId > 0) {
            const folderCheck = await tx.query(
                'SELECT Id FROM Folders WHERE Id = @folderId AND creator_id = @userId',
                { folderId: destinationFolderId, userId }
            );
            if (folderCheck.recordset.length === 0) {
                throw new Error('Selected destination folder does not exist');
            }
        }

        for (const chordRaw of chordsPayload) {
            const originalId = toInt(chordRaw.id || chordRaw.Id, 0);
            if (originalId <= 0) continue;
            if (requiredChordIdSet.size > 0 && !requiredChordIdSet.has(originalId)) continue;

            const chord = normalizeChordPayload(chordRaw);
            if (!chord.name) continue;

            let chordId = await findMatchingChordId(tx, chord, userId);

            if (!chordId) {
                if (chord.isDefault) {
                    await tx.query('UPDATE Chords SET IsDefault = 0 WHERE Name = @name', { name: chord.name });
                }

                const insertChord = await tx.query(
                    'INSERT INTO Chords (Name, BaseFret, IsOriginal, IsDefault, creator_id, created_at, updated_at) VALUES (@name, @baseFret, 0, @isDefault, @creatorId, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
                    {
                        name: chord.name,
                        baseFret: chord.baseFret,
                        isDefault: chord.isDefault ? 1 : 0,
                        creatorId: userId
                    }
                );
                chordId = insertChord.insertId;
                createdChords += 1;

                await tx.query(
                    'INSERT IGNORE INTO UserChords (user_id, chord_id, is_creator) VALUES (@userId, @chordId, 1)',
                    { userId, chordId }
                );

                for (let i = 0; i < 6; i++) {
                    await tx.query(
                        'INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)',
                        {
                            chordId,
                            stringNumber: i + 1,
                            fretNumber: chord.frets[i],
                            fingerNumber: chord.fingers[i]
                        }
                    );
                }

                for (const barre of chord.barres) {
                    await tx.query(
                        'INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)',
                        { chordId, fretNumber: barre }
                    );
                }
            } else {
                await tx.query(
                    'INSERT IGNORE INTO UserChords (user_id, chord_id, is_creator) VALUES (@userId, @chordId, 0)',
                    { userId, chordId }
                );
            }

            chordIdMap.set(originalId, chordId);
        }

        for (const songRaw of songsPayload) {
            const title = String(songRaw.title || songRaw.Title || '').trim();
            if (!title) continue;
            const sourceSongId = toInt(songRaw.id || songRaw.Id, 0);

            const {
                layoutColumnCount,
                dividerRatio,
                contentTextColumn1,
                contentTextColumn2
            } = normalizeSongLayoutInput(songRaw);

            const rawChordIds = Array.isArray(songRaw.chordIds)
                ? songRaw.chordIds
                : (Array.isArray(songRaw.ChordIds) ? songRaw.ChordIds : []);
            const mappedChordIds = rawChordIds
                .map(chordId => chordIdMap.get(toInt(chordId, 0)))
                .filter(chordId => Number.isFinite(chordId) && chordId > 0);

            if (sourceSongId > 0) {
                const existingSongResult = await tx.query(
                    `SELECT Id, Title, SongDate, Notes, SongKey, Capo, BPM, Effects, SongContentFontSizePt,
                            LayoutColumnCount, LayoutDividerRatio, ContentTextColumn1, ContentTextColumn2
                     FROM Songs WHERE Id = @songId`,
                    { songId: sourceSongId }
                );

                if (existingSongResult.recordset.length > 0) {
                    const existingSong = existingSongResult.recordset[0];
                    const existingChordIdsResult = await tx.query(
                        'SELECT ChordId FROM SongChordDiagrams WHERE SongId = @songId ORDER BY DisplayOrder',
                        { songId: sourceSongId }
                    );
                    const existingChordIds = existingChordIdsResult.recordset.map(row => toInt(row.ChordId, 0));

                    const songContentMatches =
                        normalizeTextValue(existingSong.Title) === normalizeTextValue(title) &&
                        normalizeTextValue(existingSong.SongDate) === normalizeTextValue(songRaw.songDate || songRaw.SongDate || '') &&
                        normalizeTextValue(existingSong.Notes) === normalizeTextValue(songRaw.notes || songRaw.Notes || '') &&
                        normalizeTextValue(existingSong.SongKey) === normalizeTextValue(songRaw.songKey || songRaw.SongKey || '') &&
                        normalizeTextValue(existingSong.Capo) === normalizeTextValue(songRaw.capo || songRaw.Capo || '') &&
                        normalizeTextValue(existingSong.BPM) === normalizeTextValue(songRaw.bpm || songRaw.BPM || '') &&
                        normalizeTextValue(existingSong.Effects) === normalizeTextValue(songRaw.effects || songRaw.Effects || '') &&
                        normalizeNumericValue(existingSong.SongContentFontSizePt) === normalizeNumericValue(songRaw.songContentFontSizePt || songRaw.SongContentFontSizePt || null) &&
                        toInt(existingSong.LayoutColumnCount, 1) === toInt(layoutColumnCount, 1) &&
                        toNumber(existingSong.LayoutDividerRatio, 0.5) === toNumber(dividerRatio, 0.5) &&
                        normalizeTextValue(existingSong.ContentTextColumn1) === normalizeTextValue(contentTextColumn1) &&
                        normalizeTextValue(existingSong.ContentTextColumn2) === normalizeTextValue(contentTextColumn2) &&
                        arraysEqual(existingChordIds, mappedChordIds);

                    if (songContentMatches) {
                        await tx.query(
                            'INSERT IGNORE INTO UserSongs (user_id, song_id, is_creator) VALUES (@userId, @songId, 0)',
                            { userId, songId: sourceSongId }
                        );

                        for (const chordId of mappedChordIds) {
                            await tx.query(
                                'INSERT IGNORE INTO UserChords (user_id, chord_id, is_creator) VALUES (@userId, @chordId, 0)',
                                { userId, chordId }
                            );
                        }

                        if (destinationFolderId > 0) {
                            await tx.query(
                                'INSERT IGNORE INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)',
                                { songId: sourceSongId, folderId: destinationFolderId }
                            );
                            assignedToFolder += 1;
                        }

                        linkedExistingSongs += 1;
                        continue;
                    }
                }
            }

            const insertSong = await tx.query(
                `
                INSERT INTO Songs (
                    Title, SongDate, Notes, SongKey, Capo, BPM, Effects,
                    SongContentFontSizePt, LayoutColumnCount, LayoutDividerRatio,
                    ContentTextColumn1, ContentTextColumn2, creator_id, created_at, updated_at
                )
                VALUES (
                    @title, @songDate, @notes, @songKey, @capo, @bpm, @effects,
                    @songContentFontSizePt, @layoutColumnCount, @layoutDividerRatio,
                    @contentTextColumn1, @contentTextColumn2, @creatorId, UTC_TIMESTAMP(), UTC_TIMESTAMP()
                )
            `,
                {
                    title,
                    songDate: songRaw.songDate || songRaw.SongDate || '',
                    notes: songRaw.notes || songRaw.Notes || '',
                    songKey: songRaw.songKey || songRaw.SongKey || '',
                    capo: songRaw.capo || songRaw.Capo || '',
                    bpm: songRaw.bpm || songRaw.BPM || '',
                    effects: songRaw.effects || songRaw.Effects || '',
                    songContentFontSizePt: songRaw.songContentFontSizePt || songRaw.SongContentFontSizePt || null,
                    layoutColumnCount,
                    layoutDividerRatio: dividerRatio,
                    contentTextColumn1,
                    contentTextColumn2,
                    creatorId: userId
                }
            );
            const newSongId = insertSong.insertId;
            createdSongs += 1;

            await tx.query(
                'INSERT INTO UserSongs (user_id, song_id, is_creator) VALUES (@userId, @songId, 1)',
                { userId, songId: newSongId }
            );

            for (let i = 0; i < rawChordIds.length; i++) {
                const oldChordId = toInt(rawChordIds[i], 0);
                const newChordId = chordIdMap.get(oldChordId);
                if (!newChordId) continue;

                await tx.query(
                    'INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)',
                    { songId: newSongId, chordId: newChordId, displayOrder: i }
                );
            }
            if (destinationFolderId > 0) {
                await tx.query(
                    'INSERT IGNORE INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)',
                    { songId: newSongId, folderId: destinationFolderId }
                );
                assignedToFolder += 1;
            }
        }

        await tx.commit();
        return {
            success: true,
            imported: {
                chordsCreated: createdChords,
                songsCreated: createdSongs,
                assignedToFolder,
                linkedExistingSongs
            }
        };
    } catch (error) {
        await tx.rollback();
        throw error;
    } finally {
        tx.release();
    }
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
    getSongFolders,
    exportContentPack,
    importContentPack
};
