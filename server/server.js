const express = require('express');
const sql = require('mssql/msnodesqlv8');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// SQL Server Configuration using msnodesqlv8 for Windows Authentication
const config = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=DESKTOP-09RH2IA\\SQLEXPRESS;Database=ChordFamilies;Trusted_Connection=yes;CharSet=UTF8;',
    options: {
        trustedConnection: true,
        useUTC: false
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

let pool;

// Initialize Database Connection
async function initializeDB() {
    try {
        pool = await sql.connect(config);
        console.log('✓ Connected to SQL Server');
    } catch (err) {
        console.error('✗ Database connection error:', err);
        process.exit(1);
    }
}

// =============================================
// CHORD ENDPOINTS
// =============================================

// GET all families
app.get('/api/families', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT Id as id, Name as name FROM Families ORDER BY Id');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET all chords
app.get('/api/chords', async (req, res) => {
    try {
        const chords = await pool.request().query('SELECT Id as id, Name as name, BaseFret as baseFret, IsOriginal as isOriginal FROM Chords ORDER BY Id');
        
        const result = [];
        
        for (const chord of chords.recordset) {
            // Get fingerings
            const fingerings = await pool.request()
                .input('chordId', sql.Int, chord.id)
                .query('SELECT StringNumber, FretNumber, FingerNumber FROM ChordFingerings WHERE ChordId = @chordId ORDER BY StringNumber');
            
            // Get barres
            const barres = await pool.request()
                .input('chordId', sql.Int, chord.id)
                .query('SELECT FretNumber FROM ChordBarres WHERE ChordId = @chordId');
            
            // Build arrays
            const frets = [];
            const fingers = [];
            
            for (let i = 1; i <= 6; i++) {
                const fingering = fingerings.recordset.find(f => f.StringNumber === i);
                frets.push(fingering ? fingering.FretNumber : 0);
                fingers.push(fingering ? fingering.FingerNumber : 0);
            }
            
            result.push({
                id: chord.id,
                name: chord.name,
                baseFret: chord.baseFret,
                isOriginal: chord.isOriginal,
                frets: frets,
                fingers: fingers,
                barres: barres.recordset.map(b => b.FretNumber)
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET chords for a specific family
app.get('/api/families/:familyName/chords', async (req, res) => {
    try {
        const { familyName } = req.params;
        
        const chordIds = await pool.request()
            .input('familyName', sql.NVarChar, familyName)
            .query(`
                SELECT DISTINCT c.Id 
                FROM Chords c
                INNER JOIN ChordFamilyMapping cfm ON c.Id = cfm.ChordId
                INNER JOIN Families f ON cfm.FamilyId = f.Id
                WHERE f.Name = @familyName
                ORDER BY c.Id
            `);
        
        const result = [];
        
        for (const record of chordIds.recordset) {
            const chord = await pool.request()
                .input('chordId', sql.Int, record.Id)
                .query('SELECT Id as id, Name as name, BaseFret as baseFret, IsOriginal as isOriginal FROM Chords WHERE Id = @chordId');
            
            if (chord.recordset.length === 0) continue;
            
            const chordData = chord.recordset[0];
            
            const fingerings = await pool.request()
                .input('chordId', sql.Int, chordData.id)
                .query('SELECT StringNumber, FretNumber, FingerNumber FROM ChordFingerings WHERE ChordId = @chordId ORDER BY StringNumber');
            
            const barres = await pool.request()
                .input('chordId', sql.Int, chordData.id)
                .query('SELECT FretNumber FROM ChordBarres WHERE ChordId = @chordId');
            
            const frets = [];
            const fingers = [];
            
            for (let i = 1; i <= 6; i++) {
                const fingering = fingerings.recordset.find(f => f.StringNumber === i);
                frets.push(fingering ? fingering.FretNumber : 0);
                fingers.push(fingering ? fingering.FingerNumber : 0);
            }
            
            result.push({
                id: chordData.id,
                name: chordData.name,
                baseFret: chordData.baseFret,
                isOriginal: chordData.isOriginal,
                frets: frets,
                fingers: fingers,
                barres: barres.recordset.map(b => b.FretNumber)
            });
        }
        
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET chord by ID
app.get('/api/chords/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const chord = await pool.request()
            .input('chordId', sql.Int, id)
            .query('SELECT Id as id, Name as name, BaseFret as baseFret, IsOriginal as isOriginal FROM Chords WHERE Id = @chordId');
        
        if (chord.recordset.length === 0) {
            return res.status(404).json({ error: 'Chord not found' });
        }
        
        const chordData = chord.recordset[0];
        
        const fingerings = await pool.request()
            .input('chordId', sql.Int, id)
            .query('SELECT StringNumber, FretNumber, FingerNumber FROM ChordFingerings WHERE ChordId = @chordId ORDER BY StringNumber');
        
        const barres = await pool.request()
            .input('chordId', sql.Int, id)
            .query('SELECT FretNumber FROM ChordBarres WHERE ChordId = @chordId');
        
        const frets = [];
        const fingers = [];
        
        for (let i = 1; i <= 6; i++) {
            const fingering = fingerings.recordset.find(f => f.StringNumber === i);
            frets.push(fingering ? fingering.FretNumber : 0);
            fingers.push(fingering ? fingering.FingerNumber : 0);
        }
        
        res.json({
            id: chordData.id,
            name: chordData.name,
            baseFret: chordData.baseFret,
            isOriginal: chordData.isOriginal,
            frets: frets,
            fingers: fingers,
            barres: barres.recordset.map(b => b.FretNumber)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST create new chord
app.post('/api/chords', async (req, res) => {
    try {
        const { name, baseFret, frets, fingers, barres } = req.body;
        
        // Check if name exists
        const existing = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('SELECT Id FROM Chords WHERE Name = @name');
        
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'Chord name already exists' });
        }
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Insert chord
            const chordResult = await new sql.Request(transaction)
                .input('name', sql.NVarChar, name)
                .input('baseFret', sql.Int, baseFret || 1)
                .query('INSERT INTO Chords (Name, BaseFret, IsOriginal) OUTPUT INSERTED.Id VALUES (@name, @baseFret, 0)');
            
            const chordId = chordResult.recordset[0].Id;
            
            // Insert fingerings
            for (let i = 0; i < 6; i++) {
                await new sql.Request(transaction)
                    .input('chordId', sql.Int, chordId)
                    .input('stringNumber', sql.Int, i + 1)
                    .input('fretNumber', sql.Int, frets[i])
                    .input('fingerNumber', sql.Int, fingers[i])
                    .query('INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)');
            }
            
            // Insert barres
            if (barres && barres.length > 0) {
                for (const barreFret of barres) {
                    await new sql.Request(transaction)
                        .input('chordId', sql.Int, chordId)
                        .input('fretNumber', sql.Int, barreFret)
                        .query('INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)');
                }
            }
            
            await transaction.commit();
            
            res.json({ id: chordId, message: 'Chord created successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT update chord
app.put('/api/chords/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, baseFret, frets, fingers, barres } = req.body;
        
        // Check if chord exists and is not original
        const chord = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT IsOriginal FROM Chords WHERE Id = @id');
        
        if (chord.recordset.length === 0) {
            return res.status(404).json({ error: 'Chord not found' });
        }
        
        if (chord.recordset[0].IsOriginal) {
            return res.status(403).json({ error: 'Cannot edit original chords' });
        }
        
        // Check if name exists (excluding current chord)
        const existing = await pool.request()
            .input('name', sql.NVarChar, name)
            .input('id', sql.Int, id)
            .query('SELECT Id FROM Chords WHERE Name = @name AND Id != @id');
        
        if (existing.recordset.length > 0) {
            return res.status(400).json({ error: 'Chord name already exists' });
        }
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Update chord
            await new sql.Request(transaction)
                .input('id', sql.Int, id)
                .input('name', sql.NVarChar, name)
                .input('baseFret', sql.Int, baseFret || 1)
                .query('UPDATE Chords SET Name = @name, BaseFret = @baseFret WHERE Id = @id');
            
            // Delete old fingerings and barres
            await new sql.Request(transaction)
                .input('chordId', sql.Int, id)
                .query('DELETE FROM ChordFingerings WHERE ChordId = @chordId');
            
            await new sql.Request(transaction)
                .input('chordId', sql.Int, id)
                .query('DELETE FROM ChordBarres WHERE ChordId = @chordId');
            
            // Insert new fingerings
            for (let i = 0; i < 6; i++) {
                await new sql.Request(transaction)
                    .input('chordId', sql.Int, id)
                    .input('stringNumber', sql.Int, i + 1)
                    .input('fretNumber', sql.Int, frets[i])
                    .input('fingerNumber', sql.Int, fingers[i])
                    .query('INSERT INTO ChordFingerings (ChordId, StringNumber, FretNumber, FingerNumber) VALUES (@chordId, @stringNumber, @fretNumber, @fingerNumber)');
            }
            
            // Insert new barres
            if (barres && barres.length > 0) {
                for (const barreFret of barres) {
                    await new sql.Request(transaction)
                        .input('chordId', sql.Int, id)
                        .input('fretNumber', sql.Int, barreFret)
                        .query('INSERT INTO ChordBarres (ChordId, FretNumber) VALUES (@chordId, @fretNumber)');
                }
            }
            
            await transaction.commit();
            
            res.json({ message: 'Chord updated successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE chord
app.delete('/api/chords/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const chord = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT IsOriginal FROM Chords WHERE Id = @id');
        
        if (chord.recordset.length === 0) {
            return res.status(404).json({ error: 'Chord not found' });
        }
        
        if (chord.recordset[0].IsOriginal) {
            return res.status(403).json({ error: 'Cannot delete original chords' });
        }
        
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Chords WHERE Id = @id');
        
        res.json({ message: 'Chord deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// SONGS ENDPOINTS
// =============================================

// GET all folders
app.get('/api/folders', async (req, res) => {
    try {
        const result = await pool.request().query('SELECT Id as id, Name as name, CreatedDate as createdDate FROM Folders ORDER BY Name');
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST create folder
app.post('/api/folders', async (req, res) => {
    try {
        const { name } = req.body;
        
        const result = await pool.request()
            .input('name', sql.NVarChar, name)
            .query('INSERT INTO Folders (Name) OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.CreatedDate VALUES (@name)');
        
        res.json({
            id: result.recordset[0].Id,
            name: result.recordset[0].Name,
            createdDate: result.recordset[0].CreatedDate
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE folder
app.delete('/api/folders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Folders WHERE Id = @id');
        
        res.json({ message: 'Folder deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET all songs
app.get('/api/songs', async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT Id as id, Title as title, SongDate as songDate, Notes as notes, 
                   SongKey as songKey, Capo as capo, BPM as bpm, Effects as effects,
                   ContentText as contentText, CreatedDate as createdDate, ModifiedDate as modifiedDate
            FROM Songs ORDER BY Title
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET song by ID
app.get('/api/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT Id as id, Title as title, SongDate as songDate, Notes as notes,
                       SongKey as songKey, Capo as capo, BPM as bpm, Effects as effects,
                       ContentText as contentText, CreatedDate as createdDate, ModifiedDate as modifiedDate
                FROM Songs WHERE Id = @id
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Song not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET songs by folder
app.get('/api/folders/:folderId/songs', async (req, res) => {
    try {
        const { folderId } = req.params;
        
        const result = await pool.request()
            .input('folderId', sql.Int, folderId)
            .query(`
                SELECT s.Id as id, s.Title as title, s.SongDate as songDate, s.Notes as notes,
                       s.SongKey as songKey, s.Capo as capo, s.BPM as bpm, s.Effects as effects,
                       s.ContentText as contentText, s.CreatedDate as createdDate, s.ModifiedDate as modifiedDate
                FROM Songs s
                INNER JOIN SongFolderMapping sfm ON s.Id = sfm.SongId
                WHERE sfm.FolderId = @folderId
                ORDER BY s.Title
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET song chord diagrams
app.get('/api/songs/:songId/chords', async (req, res) => {
    try {
        const { songId } = req.params;
        
        const result = await pool.request()
            .input('songId', sql.Int, songId)
            .query('SELECT ChordId as chordId FROM SongChordDiagrams WHERE SongId = @songId ORDER BY DisplayOrder');
        
        res.json(result.recordset.map(r => r.chordId));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// GET song folders
app.get('/api/songs/:songId/folders', async (req, res) => {
    try {
        const { songId } = req.params;
        
        const result = await pool.request()
            .input('songId', sql.Int, songId)
            .query(`
                SELECT f.Id as id, f.Name as name, f.CreatedDate as createdDate
                FROM Folders f
                INNER JOIN SongFolderMapping sfm ON f.Id = sfm.FolderId
                WHERE sfm.SongId = @songId
                ORDER BY f.Name
            `);
        
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST create song
app.post('/api/songs', async (req, res) => {
    try {
        const { title, songDate, notes, songKey, capo, bpm, effects, contentText, chordIds, folderIds } = req.body;
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Insert song
            const songResult = await new sql.Request(transaction)
                .input('title', sql.NVarChar, title)
                .input('songDate', sql.NVarChar, songDate || '')
                .input('notes', sql.NVarChar, notes || '')
                .input('songKey', sql.NVarChar, songKey || '')
                .input('capo', sql.NVarChar, capo || '')
                .input('bpm', sql.NVarChar, bpm || '')
                .input('effects', sql.NVarChar, effects || '')
                .input('contentText', sql.NVarChar, contentText)
                .query(`
                    INSERT INTO Songs (Title, SongDate, Notes, SongKey, Capo, BPM, Effects, ContentText)
                    OUTPUT INSERTED.Id
                    VALUES (@title, @songDate, @notes, @songKey, @capo, @bpm, @effects, @contentText)
                `);
            
            const songId = songResult.recordset[0].Id;
            
            // Insert chord diagrams
            if (chordIds && chordIds.length > 0) {
                for (let i = 0; i < chordIds.length; i++) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, songId)
                        .input('chordId', sql.Int, chordIds[i])
                        .input('displayOrder', sql.Int, i)
                        .query('INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)');
                }
            }
            
            // Insert folder mappings
            if (folderIds && folderIds.length > 0) {
                for (const folderId of folderIds) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, songId)
                        .input('folderId', sql.Int, folderId)
                        .query('INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)');
                }
            }
            
            await transaction.commit();
            
            res.json({ id: songId, message: 'Song created successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// PUT update song
app.put('/api/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, songDate, notes, songKey, capo, bpm, effects, contentText, chordIds, folderIds } = req.body;
        
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Update song
            await new sql.Request(transaction)
                .input('id', sql.Int, id)
                .input('title', sql.NVarChar, title)
                .input('songDate', sql.NVarChar, songDate || '')
                .input('notes', sql.NVarChar, notes || '')
                .input('songKey', sql.NVarChar, songKey || '')
                .input('capo', sql.NVarChar, capo || '')
                .input('bpm', sql.NVarChar, bpm || '')
                .input('effects', sql.NVarChar, effects || '')
                .input('contentText', sql.NVarChar, contentText)
                .query(`
                    UPDATE Songs 
                    SET Title = @title, SongDate = @songDate, Notes = @notes,
                        SongKey = @songKey, Capo = @capo, BPM = @bpm, 
                        Effects = @effects, ContentText = @contentText, ModifiedDate = GETDATE()
                    WHERE Id = @id
                `);
            
            // Delete old chord diagrams and folder mappings
            await new sql.Request(transaction)
                .input('songId', sql.Int, id)
                .query('DELETE FROM SongChordDiagrams WHERE SongId = @songId');
            
            await new sql.Request(transaction)
                .input('songId', sql.Int, id)
                .query('DELETE FROM SongFolderMapping WHERE SongId = @songId');
            
            // Insert new chord diagrams
            if (chordIds && chordIds.length > 0) {
                for (let i = 0; i < chordIds.length; i++) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, id)
                        .input('chordId', sql.Int, chordIds[i])
                        .input('displayOrder', sql.Int, i)
                        .query('INSERT INTO SongChordDiagrams (SongId, ChordId, DisplayOrder) VALUES (@songId, @chordId, @displayOrder)');
                }
            }
            
            // Insert new folder mappings
            if (folderIds && folderIds.length > 0) {
                for (const folderId of folderIds) {
                    await new sql.Request(transaction)
                        .input('songId', sql.Int, id)
                        .input('folderId', sql.Int, folderId)
                        .query('INSERT INTO SongFolderMapping (SongId, FolderId) VALUES (@songId, @folderId)');
                }
            }
            
            await transaction.commit();
            
            res.json({ message: 'Song updated successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE song
app.delete('/api/songs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Songs WHERE Id = @id');
        
        res.json({ message: 'Song deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// =============================================
// Start Server
// =============================================

initializeDB().then(() => {
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`🎸 Chord Families API Server`);
        console.log(`========================================`);
        console.log(`Server running on: http://localhost:${PORT}`);
        console.log(`Database: ${config.database}`);
        console.log(`Server: ${config.server}`);
        console.log(`========================================\n`);
    });
});
