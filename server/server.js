require('dotenv').config();
const express = require('express');
const cors =require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const db = require('./db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users').router;
const songsRoutes = require('./routes/songs');
const chordsRoutes = require('./routes/chords');
const sharesRoutes = require('./routes/shares');


const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Multer configuration for PDF upload
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/songs', songsRoutes);
app.use('/api/chords', chordsRoutes);
app.use('/api/shares', sharesRoutes);




// =============================================
// PDF to Text Endpoints
// =============================================

// Serve pdf-to-text page
app.get('/pdf-to-text', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pdf-to-text.html'));
});

// Convert PDF to text using pdftotext -layout
app.post('/api/convert-pdf', upload.single('pdf'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file provided' });
        }

        // Validate file is PDF
        const filename = req.file.originalname;
        if (!filename.toLowerCase().endsWith('.pdf')) {
            return res.status(400).json({ error: 'File must be a PDF' });
        }

        // Create temporary files
        const tmpDir = os.tmpdir();
        const tmpPdfPath = path.join(tmpDir, `chord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`);
        const tmpTxtPath = tmpPdfPath.replace('.pdf', '.txt');

        try {
            // Write PDF buffer to temp file
            fs.writeFileSync(tmpPdfPath, req.file.buffer);

            // Run pdftotext -layout
            try {
                await execPromise(`pdftotext -layout "${tmpPdfPath}" "${tmpTxtPath}"`);
            } catch (err) {
                // Check if pdftotext is installed
                return res.status(500).json({
                    error: 'pdftotext command failed. Ensure poppler-utils is installed and in PATH.',
                    detail: err.message
                });
            }

            // Read the converted text
            let text = '';
            try {
                text = fs.readFileSync(tmpTxtPath, 'utf-8');
            } catch (err) {
                return res.status(500).json({ error: 'Failed to read converted text', detail: err.message });
            }

            // Return the text
            res.json({ text });
        } finally {
            // Clean up temporary files
            try {
                if (fs.existsSync(tmpPdfPath)) {
                    fs.unlinkSync(tmpPdfPath);
                }
                if (fs.existsSync(tmpTxtPath)) {
                    fs.unlinkSync(tmpTxtPath);
                }
            } catch (err) {
                console.error('Failed to clean up temp files:', err);
            }
        }
    } catch (err) {
        console.error('PDF conversion error:', err);
        res.status(500).json({ error: 'PDF conversion failed', detail: err.message });
    }
});

// =============================================
// Start Server
// =============================================

db.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`\n========================================`);
        console.log(`🎸 ChordSmith API Server`);
        console.log(`========================================`);
        console.log(`Server running on: http://localhost:${PORT}`);
        console.log(`========================================\n`);
    });
});
