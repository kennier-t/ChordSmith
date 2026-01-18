// Song Chords Generator - Generates a horizontal image of chords for songs
// Maintains same dimensions as individual chords: 3.5cm high × 3cm wide per chord
// Final image: 3.5cm high × 18cm wide (6 chords)

const SONG_DIAGRAM_WIDTH_CM = 3.0;
const SONG_DIAGRAM_HEIGHT_CM = 3.5;
const SONG_CHORDS_BASE_COUNT = 6;
const SONG_CHORDS_MAX_COUNT = 8;

// Global variables
let selectedChords = [];
let allChordsData = [];

// Initialize Song Chords functionality
async function initializeSongChords() {
    // Get all available chords
    allChordsData = await getAllAvailableChords();
    
    // Populate the selectors
    populateChordSelectors();
    
    // Event listeners for buttons
    document.getElementById('gen-song-chords-btn').addEventListener('click', openGenSongModal);
    document.getElementById('close-gen-song-modal').addEventListener('click', closeGenSongModal);
    document.getElementById('create-chord-btn').addEventListener('click', openCreateChordModal);
    document.getElementById('close-create-chord-modal').addEventListener('click', closeCreateChordModal);
    
    // Close modals with overlay
    document.querySelector('#gen-song-modal .modal-overlay').addEventListener('click', closeGenSongModal);
    document.querySelector('#create-chord-modal .modal-overlay').addEventListener('click', closeCreateChordModal);
    
    // Generate song chords
    document.getElementById('generate-song-chords-btn').addEventListener('click', generateSongChords);
    
    // Download song chords
    document.getElementById('download-song-chords-png').addEventListener('click', () => downloadSongChords('png'));
    document.getElementById('download-song-chords-svg').addEventListener('click', () => downloadSongChords('svg'));
}

// Get all available chords from all families (original + custom)
async function getAllAvailableChords() {
    const chordMap = new Map();
    
    // Get all chords (includes both original and custom if DB_SERVICE is available)
    let allChords = [];
    
    if (typeof DB_SERVICE !== 'undefined') {
        // Use DB_SERVICE to get all chords (original + custom)
        allChords = await DB_SERVICE.getAllChords();
    } else {
        // Fallback: use getChordsForFamily
        const families = getAllFamilies();
        families.forEach(family => {
            const chords = getChordsForFamily(family);
            allChords.push(...chords);
        });
    }
    
    // Remove duplicates based on chord name
    allChords.forEach(chord => {
        if (!chordMap.has(chord.name)) {
            chordMap.set(chord.name, {
                ...chord,
                displayName: chord.name
            });
        }
    });
    
    // Convert map to array and sort alphabetically
    const uniqueChords = Array.from(chordMap.values());
    uniqueChords.sort((a, b) => a.name.localeCompare(b.name));
    
    return uniqueChords;
}

// Populate chord selectors
function populateChordSelectors() {
    const selects = document.querySelectorAll('.chord-select');
    
    selects.forEach(select => {
        // Add event listener to validate duplicates
        select.addEventListener('change', handleChordSelection);
    });
    
    // Populate initially
    updateAllSelectors();
}

// Update all selectors based on current selections
function updateAllSelectors() {
    const selects = document.querySelectorAll('.chord-select');
    const selectedValues = [];
    
    // Get all selected values
    selects.forEach(select => {
        if (select.value !== '') {
            selectedValues.push(select.value);
        }
    });
    
    // Actualizar cada selector
    selects.forEach(select => {
        const currentValue = select.value;
        
        // Limpiar y repoblar
        select.innerHTML = '<option value="">-- Select Chord --</option>';
        
        allChordsData.forEach((chord, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = chord.displayName;
            
            // Disable if already selected in another selector
            if (selectedValues.includes(index.toString()) && currentValue !== index.toString()) {
                option.disabled = true;
                option.textContent += ' (already selected)';
            }
            
            select.appendChild(option);
        });
        
        // Restaurar valor seleccionado
        select.value = currentValue;
    });
}

// Handle chord selection
function handleChordSelection(event) {
    updateAllSelectors();
    checkAndToggleSeventhChord();
}

// Check if first 6 chords are filled and enable/disable seventh and eighth
function checkAndToggleSeventhChord() {
    const selects = document.querySelectorAll('.chord-select:not(.chord-select-extra):not(.chord-select-extra-2)');
    const seventhSelect = document.querySelector('.chord-select-extra');
    const eighthSelect = document.querySelector('.chord-select-extra-2');
    
    // Count how many of the first 6 are selected
    let filledCount = 0;
    selects.forEach(select => {
        if (select.value !== '') {
            filledCount++;
        }
    });
    
    // Enable seventh chord only if first 6 are filled
    if (filledCount === 6) {
        seventhSelect.disabled = false;
        if (seventhSelect.options[0].text.includes('Fill first')) {
            seventhSelect.options[0].text = '-- Select Chord --';
        }
        
        // Enable eighth chord only if seventh is selected
        if (seventhSelect.value !== '') {
            eighthSelect.disabled = false;
            if (eighthSelect.options[0].text.includes('Fill chord')) {
                eighthSelect.options[0].text = '-- Select Chord --';
            }
        } else {
            eighthSelect.disabled = true;
            eighthSelect.value = '';
            eighthSelect.options[0].text = '-- Fill chord 7 first --';
        }
    } else {
        seventhSelect.disabled = true;
        seventhSelect.value = '';
        seventhSelect.options[0].text = '-- Fill first 6 chords --';
        
        eighthSelect.disabled = true;
        eighthSelect.value = '';
        eighthSelect.options[0].text = '-- Fill chord 7 first --';
    }
}

// Open Gen Song Chords modal
function openGenSongModal() {
    document.getElementById('gen-song-modal').classList.remove('hidden');
    document.getElementById('song-chords-preview').classList.add('hidden');
    // Clear selections
    document.querySelectorAll('.chord-select').forEach(select => {
        select.value = '';
    });
    // Update selectors to reflect no selections
    updateAllSelectors();
    // Reset seventh chord state
    checkAndToggleSeventhChord();
}

// Close Gen Song Chords modal
function closeGenSongModal() {
    document.getElementById('gen-song-modal').classList.add('hidden');
}

// Open Create Chord modal
function openCreateChordModal() {
    document.getElementById('create-chord-modal').classList.remove('hidden');
}

// Close Create Chord modal
function closeCreateChordModal() {
    document.getElementById('create-chord-modal').classList.add('hidden');
}

// Generate song chords image
function generateSongChords() {
    // Get selected chords (only first 6 or include extras if selected)
    selectedChords = [];
    const selects = document.querySelectorAll('.chord-select:not(.chord-select-extra):not(.chord-select-extra-2)');
    const seventhSelect = document.querySelector('.chord-select-extra');
    const eighthSelect = document.querySelector('.chord-select-extra-2');
    
    // Process first 6 chords
    selects.forEach(select => {
        if (select.value !== '') {
            const chordIndex = parseInt(select.value);
            selectedChords.push(allChordsData[chordIndex]);
        } else {
            selectedChords.push(null); // Empty space
        }
    });
    
    // Add seventh chord only if selected
    if (seventhSelect.value !== '') {
        const chordIndex = parseInt(seventhSelect.value);
        selectedChords.push(allChordsData[chordIndex]);
        
        // Add eighth chord only if selected
        if (eighthSelect.value !== '') {
            const chordIndex = parseInt(eighthSelect.value);
            selectedChords.push(allChordsData[chordIndex]);
        }
    }
    
    // Generate and show preview
    const previewContainer = document.getElementById('song-chords-image');
    previewContainer.innerHTML = '';
    
    const svgString = generateSongChordsSVG();
    previewContainer.innerHTML = svgString;
    
    // Show preview section
    document.getElementById('song-chords-preview').classList.remove('hidden');
}

// Generate SVG of song chords (6 or 7 or 8 horizontal chords)
function generateSongChordsSVG(transparent = false) {
    const bgColor = transparent ? 'none' : 'white';
    const chordCount = selectedChords.length;
    const totalWidth = SONG_DIAGRAM_WIDTH_CM * chordCount * CM_TO_PX;
    const totalHeight = SONG_DIAGRAM_HEIGHT_CM * CM_TO_PX;
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">`;
    
    // Fondo
    svg += `<rect width="${totalWidth}" height="${totalHeight}" fill="${bgColor}"/>`;
    
    // Dibujar cada acorde
    for (let i = 0; i < chordCount; i++) {
        const xOffset = i * DIAGRAM_WIDTH;
        const chord = selectedChords[i];
        
        if (chord) {
            // Dibujar acorde real
            svg += renderChordInSVG(chord, xOffset);
        } else {
            // Draw empty diagram
            svg += renderEmptyChordDiagram(xOffset);
        }
    }
    
    svg += '</svg>';
    return svg;
}

// Renderizar un acorde individual dentro del SVG grande
function renderChordInSVG(chord, xOffset) {
    const renderer = new ChordRenderer(chord);
    let chordSVG = renderer.getSVGString(false);
    
    // Extraer el contenido del SVG (sin las etiquetas svg y el fondo)
    const parser = new DOMParser();
    const doc = parser.parseFromString(chordSVG, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    let content = '';
    Array.from(svgElement.children).forEach(child => {
        if (child.tagName !== 'rect' || child.getAttribute('width') !== renderer.width.toString()) {
            // Agregar offset a todos los elementos
            const clonedChild = child.cloneNode(true);
            offsetSVGElement(clonedChild, xOffset, 0);
            content += new XMLSerializer().serializeToString(clonedChild);
        }
    });
    
    return content;
}

// Aplicar offset a un elemento SVG y sus hijos
function offsetSVGElement(element, xOffset, yOffset) {
    // Position attributes
    if (element.hasAttribute('x')) {
        element.setAttribute('x', parseFloat(element.getAttribute('x')) + xOffset);
    }
    if (element.hasAttribute('y')) {
        element.setAttribute('y', parseFloat(element.getAttribute('y')) + yOffset);
    }
    if (element.hasAttribute('x1')) {
        element.setAttribute('x1', parseFloat(element.getAttribute('x1')) + xOffset);
    }
    if (element.hasAttribute('y1')) {
        element.setAttribute('y1', parseFloat(element.getAttribute('y1')) + yOffset);
    }
    if (element.hasAttribute('x2')) {
        element.setAttribute('x2', parseFloat(element.getAttribute('x2')) + xOffset);
    }
    if (element.hasAttribute('y2')) {
        element.setAttribute('y2', parseFloat(element.getAttribute('y2')) + yOffset);
    }
    if (element.hasAttribute('cx')) {
        element.setAttribute('cx', parseFloat(element.getAttribute('cx')) + xOffset);
    }
    if (element.hasAttribute('cy')) {
        element.setAttribute('cy', parseFloat(element.getAttribute('cy')) + yOffset);
    }
    
    // Procesar hijos recursivamente
    Array.from(element.children).forEach(child => {
        offsetSVGElement(child, xOffset, yOffset);
    });
}

// Render empty diagram (only strings and frets structure)
function renderEmptyChordDiagram(xOffset) {
    const strings = 6;
    const frets = 4;
    const width = DIAGRAM_WIDTH;
    const height = DIAGRAM_HEIGHT;
    
    const titleHeight = 20;
    const topMargin = 8;
    const bottomMargin = 5;
    const sideMargin = 15;
    
    const diagramTop = titleHeight + topMargin;
    const diagramHeight = height - diagramTop - bottomMargin;
    const diagramLeft = sideMargin + xOffset;
    const diagramWidth = width - (sideMargin * 2);
    
    const stringSpacing = diagramWidth / (strings - 1);
    const fretSpacing = diagramHeight / frets;
    
    const nutThickness = 3;
    const fretThickness = 1;
    const stringThickness = 1;
    
    let svg = '';
    
    // Dibujar cuerdas (verticales)
    for (let i = 0; i < strings; i++) {
        const x = diagramLeft + i * stringSpacing;
        svg += `<line x1="${x}" y1="${diagramTop}" x2="${x}" y2="${diagramTop + diagramHeight}" stroke="black" stroke-width="${stringThickness}"/>`;
    }
    
    // Draw frets (horizontal) - first line thicker
    for (let i = 0; i <= frets; i++) {
        const y = diagramTop + i * fretSpacing;
        const thickness = (i === 0) ? nutThickness : fretThickness;
        svg += `<line x1="${diagramLeft}" y1="${y}" x2="${diagramLeft + diagramWidth}" y2="${y}" stroke="black" stroke-width="${thickness}"/>`;
    }
    
    return svg;
}

// Generar Canvas para PNG
function generateSongChordsCanvas(transparent = false) {
    const chordCount = selectedChords.length;
    const totalWidth = SONG_DIAGRAM_WIDTH_CM * chordCount * CM_TO_PX;
    const totalHeight = SONG_DIAGRAM_HEIGHT_CM * CM_TO_PX;
    
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    
    // Fondo
    if (!transparent) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, totalWidth, totalHeight);
    }
    
    // Dibujar cada acorde
    for (let i = 0; i < chordCount; i++) {
        const xOffset = i * DIAGRAM_WIDTH;
        const chord = selectedChords[i];
        
        if (chord) {
            // Dibujar acorde real
            const renderer = new ChordRenderer(chord);
            const chordCanvas = renderer.renderCanvas(false);
            ctx.drawImage(chordCanvas, xOffset, 0);
        } else {
            // Draw empty diagram
            renderEmptyChordDiagramCanvas(ctx, xOffset);
        }
    }
    
    return canvas;
}

// Render empty diagram on canvas
function renderEmptyChordDiagramCanvas(ctx, xOffset) {
    const strings = 6;
    const frets = 4;
    const width = DIAGRAM_WIDTH;
    const height = DIAGRAM_HEIGHT;
    
    const titleHeight = 20;
    const topMargin = 8;
    const bottomMargin = 5;
    const sideMargin = 15;
    
    const diagramTop = titleHeight + topMargin;
    const diagramHeight = height - diagramTop - bottomMargin;
    const diagramLeft = sideMargin + xOffset;
    const diagramWidth = width - (sideMargin * 2);
    
    const stringSpacing = diagramWidth / (strings - 1);
    const fretSpacing = diagramHeight / frets;
    
    const nutThickness = 3;
    const fretThickness = 1;
    const stringThickness = 1;
    
    ctx.strokeStyle = 'black';
    
    // Dibujar cuerdas (verticales)
    ctx.lineWidth = stringThickness;
    for (let i = 0; i < strings; i++) {
        const x = diagramLeft + i * stringSpacing;
        ctx.beginPath();
        ctx.moveTo(x, diagramTop);
        ctx.lineTo(x, diagramTop + diagramHeight);
        ctx.stroke();
    }
    
    // Draw frets (horizontal) - first line thicker
    for (let i = 0; i <= frets; i++) {
        const y = diagramTop + i * fretSpacing;
        const thickness = (i === 0) ? nutThickness : fretThickness;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        ctx.moveTo(diagramLeft, y);
        ctx.lineTo(diagramLeft + diagramWidth, y);
        ctx.stroke();
    }
}

// Download song chords
async function downloadSongChords(format) {
    const filename = `song-chords.${format}`;
    
    if (format === 'svg') {
        const svgString = generateSongChordsSVG(false);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        downloadBlob(blob, filename);
    } else {
        const canvas = generateSongChordsCanvas(false);
        canvas.toBlob(blob => {
            downloadBlob(blob, filename);
        }, 'image/png');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeSongChords();
});
