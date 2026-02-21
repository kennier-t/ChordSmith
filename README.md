# ChordSmith

A web application for visualizing, creating, sharing, and downloading guitar chord diagrams and songs.

## Features

### 🎸 Browse and Create Chords
- **7 Musical Families**: C, D, E, F, G, A, B
- Each family displays its related chords in an organized gallery.
- Click any chord to view it in detail.
- **Practice Mode**: Practice chords within each family with randomized selection.
- **Interactive Canvas Editor**: Draw chords visually without traditional forms.
- **Chord Variants**: Create multiple variations of the same chord name with different fingerings.
- **Edit & Delete**: Full CRUD functionality for your custom chords.

### 🎼 Create and Manage Songs
- **Song Editor**: Create songs with metadata (Title, Date, Notes, Key, Capo, BPM, Effects).
- **Text Editor**: Paste or type song lyrics and chords.
- **Chord Diagrams**: Select up to 8 chord diagrams to include with each song.
- **Folders**: Organize songs into folders.
- **PDF Export**: Download songs as formatted PDF documents.
- **Full CRUD**: Create, edit, delete your songs and folders.

### 👥 Multi-user and Sharing
- **User Registration and Login**: Create an account and log in to save your work.
- **Persistent Sessions**: Stay logged in between visits.
- **Ownership**: Songs and chords you create belong to you.
- **Sharing**: Share your songs and chords with other users by their username.
- **Forking**: When you edit a shared song or chord, a new copy is created that belongs to you, leaving the original untouched.
- **Incoming Shares**: View and manage songs and chords shared with you.

### 🎵 Generate Song Chord Sequences
- Select up to 8 chords for your song.
- Generates a visual diagram of the entire chord progression.

### 💾 Download Options
- **Individual chords**: PNG or SVG format.
- **Complete families**: Downloads as a ZIP file.
- **Song sequences**: Export your chord progressions.

### 📄 PDF to Text Converter
- **Extract text from PDFs**: Convert PDF files to plain text, preserving layout.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- SQL Server with ODBC Driver 17 installed
- Windows Authentication configured for SQL Server
- `pdftotext` (from poppler-utils) installed and in system PATH (for PDF to Text feature)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up the database:
    - Open SQL Server Management Studio (SSMS).
    - Run `database/setup-complete.sql` once. This script creates the full current schema (users, sharing, folders, song layout columns) and seed data from scratch.
4.  Update the connection string in `server/db.js` with your server name.
5.  Start the server:
    ```bash
    npm start
    ```
6.  Open your browser and navigate to `http://localhost:3000`.

## How It Works

### Data Storage
- All user, song, and chord data is stored in a SQL Server database.
- Library chords are global, while user-created content is private until shared.

### Architecture

**Backend (Node.js/Express):**
- `server/server.js`: Express API server.
- `server/db.js`: Database connection management.
- `server/routes/`: API routes for auth, users, songs, chords, and shares.
- `server/services/`: Business logic for all backend operations.
- `server/utils/`: Utility functions for email and JWT.

**Frontend:**
- `public/`: All frontend files.
- `public/scripts/app.js`: Main application logic.
- `public/scripts/dbService-api.js`: API client for chord operations.
- `public/scripts/songsService-api.js`: API client for songs/folders.
- And many more...

## Project Structure

```
ChordSmith/
├── public/                 # Frontend files
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── reset-password.html
│   ├── profile.html
│   ├── shares.html
│   ├── scripts/
│   └── styles/
├── server/                 # Backend files
│   ├── server.js
│   ├── db.js
│   ├── routes/
│   ├── services/
│   └── utils/
├── database/               # Database scripts
│   ├── setup-complete.sql
│   └── setup-backup.sql
├── package.json
└── README.md
```

## License

Personal educational project.
