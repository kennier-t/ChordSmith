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
- Select up to 8 chord diagrams per song.
- Organize songs in folders.
- Full song/folder CRUD.
- Song layout modes: single column and two columns with draggable divider.
- Two-column layout persists per song (column count, divider position, column content).
- Song editor includes a UI-only line-number gutter for the first text column.
- Song-list `PDF` action opens a preview page before download.

### Sharing and Multi-user
- User registration/login with JWT auth.
- Ownership model for songs and chords.
- Share songs and chords by recipient username.
- Accept/reject incoming shares.
- Editing shared items creates user-owned copies (fork behavior).

### PDF to Text
- Convert PDF files to text using `pdftotext -layout` while preserving spacing.

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript.
- Backend: Node.js + Express.
- Database: MySQL 8+.

## Quick Start (Windows and macOS)

1. Install MySQL Server 8+.
2. Install MySQL Workbench.
3. Clone this repo.
4. Create `.env` from `.env.example` and set your credentials.
5. In MySQL Workbench:
- Open a SQL tab connected to your local server.
- File -> Open SQL Script -> select `database/setup-mysql.sql`.
- Click Execute (lightning icon).
6. Install dependencies:
```bash
npm install
```
7. Start app:
```bash
npm start
```
8. Open:
- `http://localhost:3000`

## MySQL bootstrap script
- `database/setup-mysql.sql`

This script:
- drops and recreates database `ChordSmith`,
- creates all schema objects,
- seeds chord families/chords mappings,
- creates compatibility views.

## Existing DB rename script
If you already created the database as `Chordsmith Studio`, run:
- `database/rename-db-chordsmith-studio-to-chordsmith.sql`

## Troubleshooting
- `ER_ACCESS_DENIED_ERROR`: Check `DB_USER` / `DB_PASSWORD` in `.env`.
- `Unknown database 'ChordSmith'`: Run `database/setup-mysql.sql` first.
- `pdftotext command failed`: install Poppler and ensure `pdftotext` is in PATH.

## Key Project Paths
- `server/server.js`: API bootstrap.
- `server/db.js`: MySQL DB connection and transactions.
- `server/routes/`: Auth, users, songs, chords, shares routes.
- `server/services/`: Business/data logic.
- `public/scripts/songPDFGenerator.js`: PDF generation (unchanged).
- `database/setup-mysql.sql`: MySQL bootstrap schema and seed script.

## License
Personal educational project.
