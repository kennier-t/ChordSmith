# ChordSmith

ChordSmith is a web app to create, manage, share, and export guitar chords and songs.

## Features

### Chords
- Browse 7 chord families: `C, D, E, F, G, A, B`.
- Open chord detail previews.
- Practice mode with randomized chord sets per family.
- Create custom chords with interactive canvas editing.
- Manage chord variations (including default variation).
- Full chord CRUD (create, edit, delete).
- Export chords as `PNG` or `SVG`.
- Export full chord families as ZIP packages.

### Songs
- Song editor with metadata: title, date, notes, key, capo, bpm, effects.
- Song versioning per title (multiple arrangements under one canonical song identity).
- Select up to 8 chord diagrams per song.
- Organize songs in folders.
- Full song/folder CRUD.
- Song layout modes: single column and two columns with draggable divider.
- Two-column layout persists per song (column count, divider position, column content).
- Song editor includes a UI-only line-number gutter for the first text column.
- Edit view shows version selector only when a song has multiple versions.
- Add new version flow clones current content/chords, locks title/folders, and stores next `Version`.
- Version order can be rearranged and is persisted.
- Title/folder edits are restricted to the original record and applied to all versions atomically.
- Song-list `PDF` action opens a preview page before download.
- PDF preview supports version switching (only for multi-version songs) and downloads current selection.

### Sharing and Multi-user
- User registration/login with JWT auth.
- Ownership model for songs and chords.
- Share songs and chords by recipient username.
- Accept/reject incoming shares.
- Editing shared items creates user-owned copies (fork behavior).

### PDF to Text
- Convert PDF files to text using `pdftotext -layout` while preserving spacing.

### ChordAI (Local, Guitar-focused)
- Open from the `ChordAI` button on the main page.
- Analyze either a YouTube URL or a local MP3 (one source at a time).
- Outputs:
  - chord + lyrics text (ChordPro-style layout),
  - player with real-time active chord highlighting,
  - grid/beats view (4 beats per bar).
- Runs locally and uses temporary files only (no DB writes).

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript.
- Backend: Node.js + Express.
- Database: MySQL 8+.

## What You Need
- A computer with Windows or macOS
- Internet connection (for downloading installers and packages)
- MySQL Server 8+
- MySQL Workbench
- Node.js 20 LTS (recommended)

## Important Notes Before You Start
- ChordSmith uses MySQL only.
- The database name used by default is `ChordSmith`.
- The setup script `database/setup.sql` recreates the database from scratch.
- Run `database/2026-02-28-song-versioning.sql` once after `setup.sql` to enable song versioning.
- If you already had a database named `Chordsmith Studio`, use `database/rename-db-chordsmith-studio-to-chordsmith.sql`.

## 0 to 100 Setup: Windows

### 1. Install Node.js
1. Open https://nodejs.org
2. Download and install Node.js LTS.
3. Open PowerShell and verify:
```powershell
node -v
npm -v
```

### 2. Install MySQL Server and Workbench
1. Install MySQL Server 8+ (MySQL Installer or official package).
2. Install MySQL Workbench.
3. Start MySQL Server service.

### 3. Download ChordSmith
If using Git:
```powershell
git clone <your-repo-url>
cd ChordSmith
```
If you already have the folder, open PowerShell in that folder.

### 4. Configure environment file
1. In the project root, copy `.env.example` to `.env`.
2. Open `.env` and set at least:
```env
PORT=3000
JWT_SECRET=put_a_long_random_secret_here
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=ChordSmith
DB_CONNECTION_LIMIT=10
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASS=your_email_password
EMAIL_FROM="ChordSmith <user@example.com>"
```
If you do not plan to use registration/password emails now, you can still run the app and set email values later.

### 5. Create database schema and seed data
1. Open MySQL Workbench.
2. Connect to your local MySQL server.
3. Go to `File` -> `Open SQL Script...`.
4. Open `database/setup.sql`.
5. Click the lightning bolt Execute button.
6. Confirm script runs without errors.
7. Run `database/2026-02-28-song-versioning.sql` once.

### 6. Install project dependencies
In PowerShell inside project root:
```powershell
npm install
```

### 7. Start the app
```powershell
npm start
```

### 8. Open the app
Open browser at:
- `http://localhost:3000`

### 9. Verify everything works
1. Register/login.
2. Open chord families and a chord detail.
3. Create a song and save it.
4. Reopen the song and confirm content/layout persists.
5. Preview/download PDF.
6. Test sharing flow if using multiple users.

## 0 to 100 Setup: macOS

### 1. Install Node.js
Option A (website):
1. Open https://nodejs.org
2. Download and install Node.js LTS.

Option B (Homebrew):
```bash
brew install node
```

Verify:
```bash
node -v
npm -v
```

### 2. Install MySQL Server and Workbench
Option A (official installers):
- Install MySQL Server 8+
- Install MySQL Workbench

Option B (Homebrew for server + official Workbench app):
```bash
brew install mysql
brew services start mysql
```

### 3. Download ChordSmith
If using Git:
```bash
git clone <your-repo-url>
cd ChordSmith
```
If already downloaded, open Terminal in the project folder.

### 4. Configure environment file
1. Copy `.env.example` to `.env`.
2. Update values (same fields as Windows), especially:
- `JWT_SECRET`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME=ChordSmith`

### 5. Create database schema and seed data
1. Open MySQL Workbench.
2. Connect to local MySQL server.
3. `File` -> `Open SQL Script...`.
4. Select `database/setup.sql`.
5. Click Execute (lightning icon).
6. Run `database/2026-02-28-song-versioning.sql` once.

### 6. Install dependencies and run
```bash
npm install
npm start
```

### 7. Open app
- `http://localhost:3000`

### 8. Verify flows
Run the same checks listed in Windows step 9.

## Optional: If your DB is still named `Chordsmith Studio`
Run in MySQL Workbench:
- `database/rename-db-chordsmith-studio-to-chordsmith.sql`

Then confirm `.env` has:
```env
DB_NAME=ChordSmith
```

## ChordAI Prerequisites (Windows + macOS)

ChordAI runs locally and requires additional tools:

1. Python 3.10+  
2. FFmpeg available in PATH  
3. yt-dlp available in PATH (required for YouTube source)  
4. Python packages from:
   - `server/services/chordai/requirements.txt`

### Install Python packages
From project root:

```bash
python -m pip install -r server/services/chordai/requirements.txt
```

If your Python executable is not `python`, set:

```env
CHORDAI_PYTHON=python3
```

Optional tuning:

```env
CHORDAI_WHISPER_MODEL=small
CHORDAI_WHISPER_COMPUTE_TYPE=int8
```

### FFmpeg install
- Windows: install FFmpeg and add `bin` folder to PATH.
- macOS (Homebrew):
```bash
brew install ffmpeg
```

### yt-dlp install
- Windows:
```powershell
python -m pip install yt-dlp
```
- macOS:
```bash
python3 -m pip install yt-dlp
```

### Verify ChordAI runtime
Start the app, log in, then call:
- `GET /api/chordai/health` (authenticated)

It should report:
- `python: true`
- `ffmpeg: true`
- `ytDlp: true` (needed for YouTube input)

## How to Use ChordAI
1. Open the app and log in.
2. Click `ChordAI` in the top bar.
3. Enter a YouTube URL or upload an MP3.
4. Choose language mode (`Auto-detect`, `English`, `Spanish`).
5. Click `Analyze`.
6. Review tabs:
   - `Chord + Lyrics`
   - `Player`
   - `Grid / Beats`
7. Use `Cleanup Temp Files` to remove temporary session files.

## PDF-to-Text Dependency (`pdftotext`)
The `/api/convert-pdf` feature requires `pdftotext` in PATH.

Windows:
1. Install Poppler for Windows.
2. Add Poppler `bin` folder to system PATH.
3. Restart terminal.
4. Verify:
```powershell
pdftotext -v
```

macOS:
```bash
brew install poppler
pdftotext -v
```

## Common Errors and Fixes
- `ER_ACCESS_DENIED_ERROR`
  - Check `DB_USER` and `DB_PASSWORD` in `.env`.
- `Unknown database 'ChordSmith'`
  - Run `database/setup.sql` again.
- App starts but login/register fails with email errors
  - Set valid SMTP values in `.env`, or postpone email-dependent flows.
- `pdftotext command failed`
  - Install Poppler and confirm command is in PATH.

## Key Files
- `server/server.js`: API bootstrap
- `server/db.js`: MySQL connection and transaction layer
- `server/routes/`: API routes
- `server/services/`: business/data logic
<<<<<<< HEAD
- `server/routes/chordai.js`: ChordAI API routes
- `server/services/chordaiService.js`: ChordAI job orchestration and cleanup
- `server/services/chordai/worker.py`: local audio analysis pipeline
- `public/chord-ai.html`: ChordAI page
- `public/scripts/chord-ai.js`: ChordAI UI logic and sync rendering
- `public/styles/chord-ai.css`: ChordAI page styles
- `database/setup-mysql.sql`: full DB bootstrap
=======
- `database/setup.sql`: full DB bootstrap
- `database/2026-02-28-song-versioning.sql`: song versioning migration
>>>>>>> origin/main
- `database/rename-db-chordsmith-studio-to-chordsmith.sql`: rename existing DB

## Migration Checklist (Production)
1. Take a verified full DB backup (and test restore).
2. Announce a short maintenance window or put write operations in maintenance mode.
3. Run `database/2026-02-28-song-versioning.sql` in the target `ChordSmith` database.
4. Validate:
   - `Songs.Version` exists and all rows have `Version >= 1`.
   - App can create new songs with unique titles.
   - Duplicate title create is blocked in normal Create flow.
   - Add new version succeeds and increments version order.
5. Smoke-test edit and PDF preview with a multi-version song.
6. Re-enable normal traffic.

## License
Personal educational project.
