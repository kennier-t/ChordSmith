// Application state
let currentFamily = null;
let currentChord = null;
let selectedVariationId = null;
let activeChordNameForVariation = null;


// DOM elements
const familiesView = document.getElementById('families-view');
const familyView = document.getElementById('family-view');
const chordModal = document.getElementById('chord-modal');
const chordVariationModal = document.getElementById('chord-variation-modal');
const variationGrid = document.getElementById('variation-grid');


// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeFamilyButtons();
    initializeBackButtons();
    initializeDownloadButtons();
    initializeUtilityButtons();
    initializeVariationModal();

});

function initializeVariationModal() {
    // Close modal
    document.getElementById('close-variation-modal').addEventListener('click', closeVariationModal);
    document.getElementById('cancel-variation-btn').addEventListener('click', closeVariationModal);
    
    // Close modal when clicking on overlay
    chordVariationModal.querySelector('.modal-overlay').addEventListener('click', closeVariationModal);

    // Add selected variation to song
    document.getElementById('add-variation-btn').addEventListener('click', () => {
        if (selectedVariationId) {
            SongEditor.addChordToSelection(selectedVariationId);
        }
        closeVariationModal();
    });
}


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
    const allChordsInFamily = await DB_SERVICE.getChordsForFamily(family);
    
    if (allChordsInFamily.length === 0) {
        alert(`Family ${family} is not yet implemented.`);
        return;
    }

    // Group chords by name to handle variations
    const chordGroups = allChordsInFamily.reduce((acc, chord) => {
        if (!acc[chord.name]) {
            acc[chord.name] = [];
        }
        acc[chord.name].push(chord);
        return acc;
    }, {});

    // Determine the chord to display for each name (default or first)
    const chordsToDisplay = Object.values(chordGroups).map(group => {
        const defaultChord = group.find(c => c.isDefault);
        return defaultChord || group[0]; // Fallback to the first one if no default
    });

    document.getElementById('family-title').textContent = translations[currentLanguage][`${family} Family`] || `${family} Family`;
    
    // Render chord gallery
    const gallery = document.getElementById('chords-gallery');
    gallery.innerHTML = '';
    
    chordsToDisplay.forEach(chord => {
        const card = createChordCard(chord);
        gallery.appendChild(card);
    });
    
    showView('family');
}


// Create chord card for gallery
function createChordCard(chord) {
    const card = document.createElement('div');
    card.className = 'chord-card';
    
    // Main card click adds the default chord to the song editor
    card.addEventListener('click', (e) => {
        // Prevent firing when the variation button is clicked
        if (e.target.classList.contains('variation-btn')) return;
        SongEditor.addChordToSelection(chord.id);
        // Optional: add visual feedback
        card.style.transition = 'transform 0.1s ease';
        card.style.transform = 'scale(0.95)';
        setTimeout(() => card.style.transform = 'scale(1)', 100);
    });
    
    const title = document.createElement('h3');
    title.textContent = chord.name;
    card.appendChild(title);
    
    // Render thumbnail
    const renderer = new ChordRenderer(chord);
    const img = document.createElement('img');
    img.className = 'chord-thumbnail';
    img.src = renderer.getDataURL('svg', false);
    card.appendChild(img);

    // Add variation button
    const variationBtn = document.createElement('button');
    variationBtn.className = 'variation-btn';
    variationBtn.textContent = '...';
    variationBtn.title = 'Choose variation';
    variationBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click event
        showVariationModal(chord.name);
    });
    card.appendChild(variationBtn);
    
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

// Show modal with all variations for a chord name
async function showVariationModal(chordName) {
    activeChordNameForVariation = chordName;
    document.getElementById('variation-modal-title').textContent = `Variations for ${chordName}`;
    
    const variations = await DB_SERVICE.getChordVariations(chordName);
    variationGrid.innerHTML = '';

    if (variations.length === 0) {
        variationGrid.innerHTML = '<p>No variations found.</p>';
        return;
    }

    variations.forEach(variation => {
        const item = document.createElement('div');
        item.className = 'variation-item';
        if (variation.isDefault) {
            item.classList.add('is-default');
        }
        item.dataset.chordId = variation.id;

        const title = document.createElement('h4');
        title.textContent = variation.name;

        const renderer = new ChordRenderer(variation);
        const svgString = renderer.getSVGString(false);

        item.appendChild(title);
        item.innerHTML += svgString;

        item.addEventListener('click', () => {
            // Remove 'selected' from any other item
            const currentSelected = variationGrid.querySelector('.selected');
            if (currentSelected) {
                currentSelected.classList.remove('selected');
            }
            // Add 'selected' to the clicked item
            item.classList.add('selected');
            selectedVariationId = variation.id;
        });

        variationGrid.appendChild(item);
    });

    chordVariationModal.classList.remove('hidden');
}


// Close modal
function closeModal() {
    chordModal.classList.add('hidden');
}


function closeVariationModal() {
    chordVariationModal.classList.add('hidden');
    selectedVariationId = null;
    activeChordNameForVariation = null;
    variationGrid.innerHTML = '';
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
