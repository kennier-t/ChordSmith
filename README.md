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
- Song layout modes:
  - Single column (default).
  - Two columns with draggable divider.
- Two-column layout persists per song (column count, divider position, column content).
- PDF export preserves the existing document structure:
  - metadata at top,
  - lyrics/content area in the configured layout,
  - chord diagrams at the end.

### Sharing and Multi-user
- User registration/login with session support.
- Ownership model for songs and chords.
- Share songs and chords by recipient username.
- Accept/reject incoming shares.
- Editing shared items creates user-owned copies (fork behavior).

### Language and UX
- UI supports English and Spanish.
- Main language toggle switches app language live.
- User language preference is stored in `Users.language_pref`.
- Language preference is loaded from DB for authenticated users and applied automatically.

### PDF to Text
- Convert PDF files to text using `pdftotext -layout` while preserving spacing.

## Tech Stack
- Frontend: HTML, CSS, vanilla JavaScript.
- Backend: Node.js + Express.
- Database: SQL Server.

## Database Setup

Run:
- `database/setup-complete.sql`

This script initializes the full current schema from scratch, including:
- users/auth tables,
- chord domain tables,
- songs/folders/sharing tables,
- song layout columns for single/two-column editing.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure DB connection in:
- `server/db.js`

3. Run database setup in SSMS:
- `database/setup-complete.sql`

4. Start the app:
```bash
npm start
```

5. Open:
- `http://localhost:3000`

## Key Project Paths

- `server/server.js`: API bootstrap.
- `server/routes/`: Auth, users, songs, chords, shares routes.
- `server/services/`: Business/data logic.
- `public/scripts/app.js`: Main app behavior.
- `public/scripts/songEditor.js`: Song editing UI and layout behavior.
- `public/scripts/songPDFGenerator.js`: PDF generation.
- `public/scripts/translation.js`: i18n strings and language switching.
- `database/setup-complete.sql`: Full schema + seed setup.

## License

Personal educational project.
