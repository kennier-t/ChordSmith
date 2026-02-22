# ChordSmith Studio

ChordSmith Studio is a web app to create, manage, share, and export guitar chords and songs.

## What changed
- Backend database is now MySQL (cross-platform for Windows and macOS).
- DB access is environment-driven (`.env`), no hardcoded machine/SQL Server instance.
- Existing API routes and user-facing behavior are preserved.
- PDF generation logic remains client-side and unchanged.

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
- drops and recreates database `Chordsmith Studio`,
- creates all schema objects,
- seeds chord families/chords mappings,
- creates compatibility views.

## Data migration from SQL Server to MySQL

### Prerequisites
- Source SQL Server DB (old `ChordSmith`) reachable.
- Target MySQL DB already created with `database/setup-mysql.sql`.
- `.env` includes `SRC_MSSQL_*` variables and `DB_*` target variables.

### Run migration
```bash
npm run migrate:sqlserver-to-mysql
```

What it does:
- opens a SQL Server source connection,
- opens a MySQL target connection,
- migrates all relevant tables preserving IDs,
- verifies row counts table-by-table,
- commits on success,
- rolls back on any failure.

### Verification checklist
- Confirm migration command ends with: `Migration completed successfully. Row counts verified.`
- Login with migrated users.
- Open songs list, edit a song, save, reopen.
- Open chord families and verify diagrams/fingerings.
- Test share accept/reject flows.

## Rollback procedure

If migration fails or app behavior regresses:

1. Stop the Node app.
2. Restore SQL Server as source of truth (unchanged by migration script).
3. Recreate MySQL target from scratch:
- rerun `database/setup-mysql.sql` in MySQL Workbench.
4. Re-run migration only after fixing the issue.
5. To temporarily use old environment, switch back to the original SQL Server project copy.

## Troubleshooting
- `ER_ACCESS_DENIED_ERROR`: Check `DB_USER` / `DB_PASSWORD` in `.env`.
- `Unknown database 'Chordsmith Studio'`: Run `database/setup-mysql.sql` first.
- `Migration failed: Missing SQL Server source config vars`: fill `SRC_MSSQL_*` in `.env`.
- `pdftotext command failed`: install Poppler and ensure `pdftotext` is in PATH.

## Key Project Paths
- `server/server.js`: API bootstrap.
- `server/db.js`: MySQL DB connection and transactions.
- `server/routes/`: Auth, users, songs, chords, shares routes.
- `server/services/`: Business/data logic.
- `public/scripts/songPDFGenerator.js`: PDF generation (unchanged).
- `database/setup-mysql.sql`: MySQL bootstrap schema and seed script.
- `scripts/migrate-sqlserver-to-mysql.js`: data migration tool.

## License
Personal educational project.
