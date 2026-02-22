# ChordSmith Application Analysis

## 1. Executive Summary

ChordSmith is a monolithic web application with:

- Frontend: static HTML/CSS/vanilla JavaScript served directly by Express.
- Backend: Node.js + Express API (`server/server.js`).
- Database: Microsoft SQL Server (`database/setup-complete.sql`) accessed via `mssql` + `msnodesqlv8`.
- Rendering/export: client-side chord SVG/PNG generation and client-side song PDF generation using `jsPDF`.
- Authentication: JWT access/refresh tokens, with refresh token in HTTP-only cookie.

There is no frontend bundler, no TypeScript, no ORM, and no migration framework. SQL is executed through handwritten queries in service modules.

---

## 2. Technologies by Application Layer

## 2.1 Runtime / Platform

- Node.js (CommonJS project type): `package.json`
- Express 5: `package.json`, `server/server.js`
- CORS, body-parser, cookie-parser, multer: request parsing and upload handling

## 2.2 Backend API

- Express routing modules:
  - `server/routes/auth.js`
  - `server/routes/users.js`
  - `server/routes/songs.js`
  - `server/routes/chords.js`
  - `server/routes/shares.js`
- Service layer (business + SQL orchestration):
  - `server/services/userService.js`
  - `server/services/songService.js`
  - `server/services/chordService.js`

## 2.3 Database Access

- Driver stack:
  - `mssql`
  - `msnodesqlv8`
- Connection module:
  - `server/db.js`
- Access pattern:
  - SQL strings embedded directly in service files.
  - Frequent transaction usage for multi-step writes.

## 2.4 Frontend

- Static pages:
  - `public/index.html` (main app + modals)
  - `public/login.html`, `public/register.html`, `public/reset-password.html`
  - `public/profile.html`, `public/shares.html`, `public/pdf-to-text.html`
  - `public/song-pdf-preview.html`
- Core client modules:
  - `public/scripts/app.js` (main app shell + auth checks + family/chord UI)
  - `public/scripts/chordEditor.js` (custom chord editor UI)
  - `public/scripts/songEditor.js` (song metadata/content editor)
  - `public/scripts/songsManager.js` (folders/songs lists and actions)
  - `public/scripts/shares.js` (sharing UI)
  - `public/scripts/translation.js` (EN/ES localization)

## 2.5 Rendering / Export Tools

- Client-side PDF: `jsPDF` CDN in `public/index.html` + `public/scripts/songPDFGenerator.js`
- ZIP packaging: `JSZip` CDN in `public/index.html`
- Chord rendering: custom SVG/canvas renderer in `public/scripts/chordRenderer.js`
- PDF-to-text conversion on server: `pdftotext -layout` shell call in `server/server.js`

## 2.6 Security / Identity / Email

- Password hashing: `bcrypt`
- JWT: `jsonwebtoken` (`server/utils/token.js`)
- Email transport: `nodemailer` (`server/utils/email.js`)
- Tokenized account verification and password reset flows in `auth.js`

---

## 3. Repository Structure and Responsibilities

- `server/`
  - API bootstrap and middleware (`server/server.js`)
  - DB connector (`server/db.js`)
  - Route handlers and domain services
- `public/`
  - Complete UI (HTML, CSS, JS)
  - API consumers (`dbService-api.js`, `songsService-api.js`)
  - Feature scripts (songs, chords, sharing, PDF preview, translation)
- `database/`
  - Full bootstrap SQL script (`setup-complete.sql`)
  - Backup scripts and `.bak` files
- Root:
  - `package.json`
  - `.env` (runtime configuration)

---

## 4. Backend Architecture Details

## 4.1 API Bootstrap

`server/server.js`:

- Configures middleware (`cors`, JSON/body parsing, cookies).
- Serves static frontend from `public/`.
- Mounts API route groups:
  - `/api/auth`
  - `/api/users`
  - `/api/songs`
  - `/api/chords`
  - `/api/shares`
- Adds `/api/convert-pdf` endpoint (multipart upload + shelling out to `pdftotext`).
- Opens DB connection before listening.

## 4.2 Auth and User Management

`server/routes/auth.js` + `server/services/userService.js`:

- Register, verify email, login, logout, refresh, forgot/reset password.
- Stores verification/reset tokens in DB tables with expiry and used timestamps.
- Uses JWT access token (1h) + refresh token (7d) from `server/utils/token.js`.

`server/routes/users.js`:

- `GET /api/users/me`
- `PUT /api/users/me` (profile + language)
- `PUT /api/users/me/language` (language-only endpoint)
- `PUT /api/users/me/password`

## 4.3 Songs Domain

`server/routes/songs.js` + `server/services/songService.js`:

- Folder CRUD.
- Song CRUD.
- Song-to-folder mapping.
- Song-to-chord diagram mapping.
- User ownership mapping via `UserSongs`.
- Share acceptance/rejection logic.
- Song layout persistence fields:
  - `LayoutColumnCount`
  - `LayoutDividerRatio`
  - `ContentTextColumn1`
  - `ContentTextColumn2`
  - plus compatibility logic for `ContentText` reconstruction in service layer.

## 4.4 Chords Domain

`server/routes/chords.js` + `server/services/chordService.js`:

- Chord CRUD with fingerings and barres.
- Family filtering.
- Variation handling and default-variation switching.
- User ownership mapping via `UserChords`.
- Share acceptance/rejection logic.

## 4.5 Shares Domain

`server/routes/shares.js`:

- Send song/chord shares.
- List incoming shares.
- Accept/reject actions with type switch (`song` or `chord`).

---

## 5. Frontend Architecture Details

## 5.1 Main App Model

The frontend is script-driven, modal-heavy UI in `public/index.html`:

- Families/chords browsing
- Chord modal + practice modal
- Chord CRUD modal
- Songs manager modal
- Song editor modal
- Share modal

Primary orchestration:

- `app.js`: main page interactions, auth validation, family/chord browsing, utility navigation.
- `songsManager.js`: folders/songs list rendering, actions (edit, PDF preview, delete).
- `songEditor.js`: song create/edit, layout modes (single/two-column), divider drag, font sizing, line-number gutter behavior.
- `songPDFGenerator.js`: strict client-side song PDF generator.

## 5.2 API Communication Model

- `dbService-api.js`: chord-related API calls.
- `songsService-api.js`: song/folder-related API calls.
- Token read from `localStorage`; included as `Authorization: Bearer ...`.

## 5.3 Localization

- `translation.js` contains EN/ES dictionaries and page translation logic.
- Language can be toggled from UI.
- For authenticated users, language preference is persisted in DB (`Users.language_pref`) and reloaded.

## 5.4 Song PDF Flow

- Generation is client-side only.
- The song list `PDF` action opens a preview page.
- Preview page generates PDF using the same existing generator and allows explicit download.
- No server endpoint generates song PDF bytes.

---

## 6. Database Model Summary

Defined in `database/setup-complete.sql`.

## 6.1 Core Tables

- Auth/user tables:
  - `Users`
  - `UserVerificationTokens`
  - `PasswordResetTokens`
- Chords domain:
  - `Families`
  - `Chords`
  - `ChordFingerings`
  - `ChordBarres`
  - `ChordFamilyMapping`
- Songs domain:
  - `Folders`
  - `Songs`
  - `SongChordDiagrams`
  - `SongFolderMapping`
- Multi-user ownership/sharing:
  - `UserSongs`
  - `UserChords`
  - `SongShares`
  - `ChordShares`

## 6.2 Song Content and Layout Storage

Songs are currently modeled with:

- `LayoutColumnCount` (`1` or `2`)
- `LayoutDividerRatio` (bounded ratio)
- `ContentTextColumn1`
- `ContentTextColumn2`
- `SongContentFontSizePt`

This allows restoring editor layout and preserving PDF rendering behavior.

## 6.3 Bootstrap Script Behavior

`setup-complete.sql` currently:

- Drops and recreates the entire `ChordSmith` database.
- Recreates all schema objects and indexes.
- Seeds users/families/chords/fingerings/barres and mappings.

This is a full bootstrap script, not a non-destructive migration.

---

## 7. Build, Deployment, and Operations Characteristics

- Start command: `npm start` -> `node server/server.js`
- No CI/CD, no lint config, no test suite configured in `package.json`.
- No Dockerfile/compose present.
- Runtime configuration partially in `.env`, but DB connection is hardcoded in `server/db.js` (not reading `DB_CONNECTION_STRING`).

---

## 8. Why the Current App Is Effectively Windows-Centric

The following implementation choices make the current setup strongly tied to Windows environments:

## 8.1 SQL Server Driver and Connection Strategy

- `server/db.js` uses `mssql/msnodesqlv8` with:
  - ODBC Driver 17 naming in connection string.
  - `Trusted_Connection=yes` (Windows integrated auth pattern).
  - Hardcoded SQL Server Express instance: `DESKTOP-09RH2IA\\SQLEXPRESS`.

Implications:

- This exact connection setup typically assumes Windows host + local SQL Server Express + Windows auth context.
- It is not portable as-is to macOS.

## 8.2 Hardcoded Local Machine DB Configuration

- DB host/instance is hardcoded in source (`server/db.js`) instead of being environment-driven.
- Even if SQL Server were available elsewhere, code changes are required to run.

## 8.3 Tooling Assumptions Around SQL Setup

- Documentation/setup flow is centered on SSMS execution of `setup-complete.sql`.
- SSMS is a Windows-first workflow.

## 8.4 SQL Server Dependency

- The schema and service queries are SQL Server-specific.
- macOS does not run SQL Server natively in the same way as Windows desktop setups (usually requires containers/remote server).

## 8.5 Native Module / ODBC Expectations

- `msnodesqlv8` + ODBC runtime introduces platform-specific native dependency friction compared to pure-JS DB clients.
- Current project is configured and validated around Windows behavior.

## 8.6 External Binary for PDF-to-Text

- `/api/convert-pdf` depends on `pdftotext` available in system `PATH`.
- This can run cross-platform, but installation and PATH setup are OS-specific and currently undocumented per OS.

---

## 9. Important Current-State Gaps (Technical)

- Duplicate dependency entry for `resend` in `package.json`.
- `.env` currently contains secrets and should be treated as sensitive (rotate if exposed).
- DB connection does not consume `.env` `DB_CONNECTION_STRING`; source code hardcodes connection string.
- No automated tests and minimal runtime validation around environment prerequisites.

---

## 10. Conclusion

ChordSmith is a feature-rich, practical full-stack application built with a straightforward architecture:

- vanilla JS frontend + Express API + SQL Server backend
- direct SQL service layer
- client-side rendering/export for core chord/song workflows

Its current operational shape is optimized for Windows local development. The main blockers for macOS portability are not UI or JavaScript language compatibility; they are infrastructure and runtime choices (DB driver/auth/instance assumptions and local environment tooling).
