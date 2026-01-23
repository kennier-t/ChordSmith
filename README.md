# Chord Families

A web application for visualizing, creating, and downloading guitar chord diagrams organized by musical families.

## Features

### 🎸 Browse Chord Families
- **7 Musical Families**: C, D, E, F, G, A, B
- Each family displays its related chords in an organized gallery
- Click any chord to view it in detail
- **Practice Mode**: Practice chords within each family with randomized selection

### ✏️ Create Custom Chords
- **Interactive Canvas Editor**: Draw chords visually without traditional forms
- **Click on fret**: Add finger positions (cycles 1→2→3→4→remove)
- **Click above string**: Mark strings as not played (X)
- **Drag horizontally**: Create barre chords automatically
- **Chord Variants**: Create multiple variations of the same chord name with different fingerings
- **Unique names**: Validates chord names in real-time
- **Edit & Delete**: Full CRUD functionality for custom chords

### 🎼 Create and Manage Songs
- **Song Editor**: Create songs with metadata (Title, Date, Notes, Key, Capo, BPM, Effects)
- **Text Editor**: Paste or type song lyrics and chords (preserves formatting)
- **Column Guides**: Visual guides to align chords and lyrics in columns (none, 2-column, 3-column, or personalized)
- **Chord Diagrams**: Select up to 8 chord diagrams to include with each song
- **Folders**: Organize songs into folders (many-to-many relationship)
- **PDF Export**: Download songs as formatted PDF documents
- **Full CRUD**: Create, edit, delete songs and folders

### 🎵 Generate Song Chord Sequences
- Select up to 8 chords for your song
- Generates a visual diagram of the entire chord progression
- Includes both original and custom chords

### 💾 Download Options
- **Individual chords**: PNG or SVG format
- **Complete families**: Downloads as ZIP file
- **Song sequences**: Export your chord progressions

### 📄 PDF to Text Converter
- **Extract text from PDFs**: Convert PDF files to plain text preserving layout and spacing
- **Preserves formatting**: Uses `pdftotext -layout` to maintain alignment and tabulation
- **Copy ready**: Perfect for copying song lyrics and chords without losing spacing
- **Standalone tool**: Quick access from main menu

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- SQL Server with ODBC Driver 17 installed
- Windows Authentication configured for SQL Server
- `pdftotext` (from poppler-utils) installed and in system PATH (for PDF to Text feature)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the database:
   - Open SQL Server Management Studio (SSMS)
   - Run `database/setup-complete.sql`
   - This single script creates everything: database, tables, views, and initial data
4. Update the connection string in `server/server.js` with your server name
5. Start the server:
   ```bash
   npm start
   ```
6. Open your browser and navigate to `http://localhost:3000`

### Usage

1. Click on any family button (C, D, E, F, G, A, B) to explore chords
2. Click "Create Chord" to build your own custom chords
3. Click "Songs" to manage your song library and folders
4. Use "Gen Song Chords" to create chord sequences
5. Click "PDF → Text" to convert PDFs to text (preserving layout)

## Technologies

**Frontend:**
- HTML5 Canvas for interactive chord editing
- Vanilla JavaScript (no frameworks)
- CSS3 for responsive design
- jsPDF for PDF generation

**Backend:**
- Node.js + Express for API server
- SQL Server for data persistence
- msnodesqlv8 for Windows Authentication
- multer for file uploads
- pdftotext (poppler) for PDF conversion


## How It Works

### Data Storage
- All chord data is stored in browser localStorage
- Original chords are protected and cannot be edited or deleted
- Custom chords are saved automatically and persist across sessions

### Chord Editor
- Canvas-based interface with 6 strings and 4 frets
- Interactive click and drag functionality
- Real-time visual feedback
- Validates finger positions and chord names

### Architecture

**Backend (Node.js/Express):**
- `server/server.js`: Express API server with SQL Server integration
- RESTful endpoints for chords, songs, folders
- Static file serving from public directory

**Frontend:**
- `dbService-api.js`: API client for chord operations
- `songsService-api.js`: API client for songs/folders
- `chordEditor.js`: Interactive canvas chord editor
- `songEditor.js`: Song creation and editing
- `songsManager.js`: Songs and folders management
- `chordRenderer.js`: SVG/PNG rendering engine
- `songPDFGenerator.js`: PDF generation for songs
- `songChords.js`: Chord sequence generator
- `pdf-to-text.js`: PDF to text conversion functionality
- `app.js`: Main application logic

## Project Structure

```
Chord-Families/
├── public/                 # Frontend files
│   ├── index.html          # Main page
│   ├── pdf-to-text.html    # PDF to text converter page
│   ├── debug.html          # Debug page
│   ├── scripts/            # JavaScript files
│   │   ├── app.js          # Core application
│   │   ├── chordData.js    # Chord data
│   │   ├── chordRenderer.js # SVG/PNG rendering
│   │   ├── chordEditor.js  # Interactive editor
│   │   ├── dbService-api.js # API client for chords
│   │   ├── songsService-api.js # API client for songs
│   │   ├── songEditor.js   # Song editor
│   │   ├── songsManager.js # Songs/folders manager
│   │   ├── songPDFGenerator.js # PDF generator
│   │   ├── songChords.js   # Chord sequences
│   │   ├── pdf-to-text.js  # PDF to text conversion
│   │   └── guitar-pattern.js # Background pattern
│   └── styles/             # CSS files
│       ├── styles.css      # Main styles
│       ├── pdf-to-text.css # PDF converter styles
│       └── guitar-pattern.css # Pattern styles
├── server/                 # Backend files
│   └── server.js           # Express API server
├── database/               # Database scripts
│   ├── ChordFamilies-Database.sql # Main schema
│   ├── ChordFamilies-Songs-Extension.sql # Songs extension
│   └── setup scripts       # Configuration scripts
├── package.json            # Dependencies
└── README.md              # Documentation
```

## Browser Support

Works on all modern browsers that support:
- HTML5 Canvas
- localStorage API
- ES6 JavaScript

## License

Personal educational project.

---

**Note**: Custom chords are stored locally in your browser. Clear browser data will delete custom chords.
