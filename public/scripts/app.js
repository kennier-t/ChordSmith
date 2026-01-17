// Estado de la aplicación
let currentFamily = null;
let currentChord = null;

// Elementos del DOM
const familiesView = document.getElementById('families-view');
const familyView = document.getElementById('family-view');
const chordModal = document.getElementById('chord-modal');

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    initializeFamilyButtons();
    initializeBackButtons();
    initializeDownloadButtons();
});

// Inicializar botones de familias
function initializeFamilyButtons() {
    const familyButtons = document.querySelectorAll('.family-btn');
    console.log('Botones encontrados:', familyButtons.length);
    familyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const family = btn.dataset.family;
            console.log('Click en familia:', family);
            showFamilyView(family);
        });
    });
}

// Inicializar botones de navegación
function initializeBackButtons() {
    document.getElementById('back-to-families').addEventListener('click', () => {
        showView('families');
    });
    
    // Cerrar modal
    document.getElementById('close-modal').addEventListener('click', () => {
        closeModal();
    });
    
    // Cerrar modal al hacer click en el overlay
    document.querySelector('.modal-overlay').addEventListener('click', () => {
        closeModal();
    });
}

// Inicializar botones de descarga
function initializeDownloadButtons() {
    // Descargar familia completa
    document.getElementById('download-family-png').addEventListener('click', () => {
        downloadFamily(currentFamily, 'png');
    });
    
    document.getElementById('download-family-svg').addEventListener('click', () => {
        downloadFamily(currentFamily, 'svg');
    });
    
    // Descargar acorde individual desde modal
    document.getElementById('download-modal-chord-png').addEventListener('click', () => {
        downloadChord(currentChord, 'png');
    });
    
    document.getElementById('download-modal-chord-svg').addEventListener('click', () => {
        downloadChord(currentChord, 'svg');
    });
}

// Mostrar vista específica
function showView(view) {
    familiesView.classList.add('hidden');
    familyView.classList.add('hidden');
    
    if (view === 'families') {
        familiesView.classList.remove('hidden');
    } else if (view === 'family') {
        familyView.classList.remove('hidden');
    }
}

// Mostrar vista de familia
async function showFamilyView(family) {
    console.log('showFamilyView llamado con:', family);
    currentFamily = family;
    const chords = await DB_SERVICE.getChordsForFamily(family);
    console.log('Acordes encontrados:', chords.length, chords);
    
    if (chords.length === 0) {
        alert(`Family ${family} is not yet implemented.`);
        return;
    }
    
    document.getElementById('family-title').textContent = `${family} Family`;
    
    // Renderizar galería de acordes
    const gallery = document.getElementById('chords-gallery');
    gallery.innerHTML = '';
    
    chords.forEach(chord => {
        const card = createChordCard(chord);
        gallery.appendChild(card);
    });
    
    showView('family');
}

// Crear tarjeta de acorde para la galería
function createChordCard(chord) {
    const card = document.createElement('div');
    card.className = 'chord-card';
    card.addEventListener('click', () => showChordView(chord));
    
    const title = document.createElement('h3');
    title.textContent = chord.name;
    card.appendChild(title);
    
    // Renderizar thumbnail
    const renderer = new ChordRenderer(chord);
    const img = document.createElement('img');
    img.className = 'chord-thumbnail';
    img.src = renderer.getDataURL('svg', false);
    card.appendChild(img);
    
    return card;
}

// Mostrar modal de acorde individual
function showChordView(chord) {
    currentChord = chord;
    document.getElementById('modal-chord-title').textContent = chord.name;
    
    // Renderizar preview grande
    const preview = document.getElementById('modal-chord-preview');
    preview.innerHTML = '';
    
    const renderer = new ChordRenderer(chord);
    const svgString = renderer.getSVGString(false);
    preview.innerHTML = svgString;
    
    // Mostrar modal
    chordModal.classList.remove('hidden');
}

// Cerrar modal
function closeModal() {
    chordModal.classList.add('hidden');
}

// Descargar acorde individual
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

// Descargar familia completa
async function downloadFamily(family, format) {
    const chords = await DB_SERVICE.getChordsForFamily(family);
    
    if (chords.length === 0) {
        alert('No chords available to download in this family.');
        return;
    }
    
    const zip = new JSZip();
    const folder = zip.folder(family);
    
    // Agregar cada acorde al ZIP
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
    
    // Generar y descargar el ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${family}.zip`);
}

// Función auxiliar para descargar blob
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
