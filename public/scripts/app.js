// Application state
let currentFamily = null;
let currentChord = null;

// DOM elements
const familiesView = document.getElementById('families-view');
const familyView = document.getElementById('family-view');
const chordModal = document.getElementById('chord-modal');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeFamilyButtons();
    initializeBackButtons();
    initializeDownloadButtons();
    initializeUtilityButtons();
});

// Initialize family buttons
function initializeFamilyButtons() {
    const familyButtons = document.querySelectorAll('.family-btn');
    console.log('Buttons found:', familyButtons.length);
    familyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const family = btn.dataset.family;
            console.log('Click on family:', family);
            showFamilyView(family);
        });
    });
}

// Initialize navigation buttons
function initializeBackButtons() {
    document.getElementById('back-to-families').addEventListener('click', () => {
        showView('families');
    });
    
    // Close modal
    document.getElementById('close-modal').addEventListener('click', () => {
        closeModal();
    });
    
    // Close modal when clicking on overlay
    document.querySelector('.modal-overlay').addEventListener('click', () => {
        closeModal();
    });
}

// Initialize download buttons
function initializeDownloadButtons() {
    // Download complete family
    document.getElementById('download-family-png').addEventListener('click', () => {
        downloadFamily(currentFamily, 'png');
    });
    
    document.getElementById('download-family-svg').addEventListener('click', () => {
        downloadFamily(currentFamily, 'svg');
    });
    
    // Download individual chord from modal
    document.getElementById('download-modal-chord-png').addEventListener('click', () => {
        downloadChord(currentChord, 'png');
    });
    
    document.getElementById('download-modal-chord-svg').addEventListener('click', () => {
        downloadChord(currentChord, 'svg');
    });
}

// Show specific view
function showView(view) {
    familiesView.classList.add('hidden');
    familyView.classList.add('hidden');
    
    if (view === 'families') {
        familiesView.classList.remove('hidden');
    } else if (view === 'family') {
        familyView.classList.remove('hidden');
    }
}

// Show family view
async function showFamilyView(family) {
    console.log('showFamilyView called with:', family);
    currentFamily = family;
    const chords = await DB_SERVICE.getChordsForFamily(family);
    console.log('Chords found:', chords.length, chords);
    
    if (chords.length === 0) {
        alert(`Family ${family} is not yet implemented.`);
        return;
    }
    
    document.getElementById('family-title').textContent = `${family} Family`;
    
    // Render chord gallery
    const gallery = document.getElementById('chords-gallery');
    gallery.innerHTML = '';
    
    chords.forEach(chord => {
        const card = createChordCard(chord);
        gallery.appendChild(card);
    });
    
    showView('family');
}

// Create chord card for gallery
function createChordCard(chord) {
    const card = document.createElement('div');
    card.className = 'chord-card';
    card.addEventListener('click', () => showChordView(chord));
    
    const title = document.createElement('h3');
    title.textContent = chord.name;
    card.appendChild(title);
    
    // Render thumbnail
    const renderer = new ChordRenderer(chord);
    const img = document.createElement('img');
    img.className = 'chord-thumbnail';
    img.src = renderer.getDataURL('svg', false);
    card.appendChild(img);
    
    return card;
}

// Show individual chord modal
function showChordView(chord) {
    currentChord = chord;
    document.getElementById('modal-chord-title').textContent = chord.name;
    
    // Render large preview
    const preview = document.getElementById('modal-chord-preview');
    preview.innerHTML = '';
    
    const renderer = new ChordRenderer(chord);
    const svgString = renderer.getSVGString(false);
    preview.innerHTML = svgString;
    
    // Show modal
    chordModal.classList.remove('hidden');
}

// Close modal
function closeModal() {
    chordModal.classList.add('hidden');
}

// Download individual chord
async function downloadChord(chord, format) {
    const renderer = new ChordRenderer(chord);
    const filename = `${chord.name}.${format}`;
    
    if (format === 'svg') {
        const svgString = renderer.getSVGString(false);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        downloadBlob(blob, filename);
    } else {
        const blob = await renderer.getPNGBlob(false);
        downloadBlob(blob, filename);
    }
}

// Download complete family
async function downloadFamily(family, format) {
    const chords = await DB_SERVICE.getChordsForFamily(family);
    
    if (chords.length === 0) {
        alert('No chords available to download in this family.');
        return;
    }
    
    const zip = new JSZip();
    const folder = zip.folder(family);
    
    // Add each chord to ZIP
    for (const chord of chords) {
        const renderer = new ChordRenderer(chord);
        const filename = `${chord.name}.${format}`;
        
        if (format === 'svg') {
            const svgString = renderer.getSVGString(false);
            folder.file(filename, svgString);
        } else {
            const blob = await renderer.getPNGBlob(false);
            folder.file(filename, blob);
        }
    }
    
    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${family}.zip`);
}

// Helper function to download blob
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize utility buttons
function initializeUtilityButtons() {
    const pdfToTextBtn = document.getElementById('pdf-to-text-btn');
    if (pdfToTextBtn) {
        pdfToTextBtn.addEventListener('click', () => {
            window.open('pdf-to-text.html', '_blank');
        });
    }
}
