// Song Chords Generator - Genera una imagen horizontal de acordes para canciones
// Mantiene las mismas dimensiones que los acordes individuales: 3.5cm alto × 3cm ancho por acorde
// Imagen final: 3.5cm alto × 18cm ancho (6 acordes)

const SONG_DIAGRAM_WIDTH_CM = 3.0;
const SONG_DIAGRAM_HEIGHT_CM = 3.5;
const SONG_CHORDS_BASE_COUNT = 6;
const SONG_CHORDS_MAX_COUNT = 8;

// Variables globales
let selectedChords = [];
let allChordsData = [];

// Inicializar funcionalidad de Song Chords
function initializeSongChords() {
    // Obtener todos los acordes disponibles
    allChordsData = getAllAvailableChords();
    
    // Poblar los selectores
    populateChordSelectors();
    
    // Event listeners para botones
    document.getElementById('gen-song-chords-btn').addEventListener('click', openGenSongModal);
    document.getElementById('close-gen-song-modal').addEventListener('click', closeGenSongModal);
    document.getElementById('create-chord-btn').addEventListener('click', openCreateChordModal);
    document.getElementById('close-create-chord-modal').addEventListener('click', closeCreateChordModal);
    
    // Cerrar modales con overlay
    document.querySelector('#gen-song-modal .modal-overlay').addEventListener('click', closeGenSongModal);
    document.querySelector('#create-chord-modal .modal-overlay').addEventListener('click', closeCreateChordModal);
    
    // Generar acordes de canción
    document.getElementById('generate-song-chords-btn').addEventListener('click', generateSongChords);
    
    // Descargar acordes de canción
    document.getElementById('download-song-chords-png').addEventListener('click', () => downloadSongChords('png'));
    document.getElementById('download-song-chords-svg').addEventListener('click', () => downloadSongChords('svg'));
}

// Obtener todos los acordes disponibles de todas las familias (originales + custom)
function getAllAvailableChords() {
    const chordMap = new Map();
    
    // Get all chords (includes both original and custom if DB_SERVICE is available)
    let allChords = [];
    
    if (typeof DB_SERVICE !== 'undefined') {
        // Use DB_SERVICE to get all chords (original + custom)
        allChords = DB_SERVICE.getAllChords();
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
    
    // Convertir map a array y ordenar alfabéticamente
    const uniqueChords = Array.from(chordMap.values());
    uniqueChords.sort((a, b) => a.name.localeCompare(b.name));
    
    return uniqueChords;
}

// Poblar los selectores de acordes
function populateChordSelectors() {
    const selects = document.querySelectorAll('.chord-select');
    
    selects.forEach(select => {
        // Agregar event listener para validar duplicados
        select.addEventListener('change', handleChordSelection);
    });
    
    // Poblar inicialmente
    updateAllSelectors();
}

// Actualizar todos los selectores basándose en las selecciones actuales
function updateAllSelectors() {
    const selects = document.querySelectorAll('.chord-select');
    const selectedValues = [];
    
    // Obtener todos los valores seleccionados
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
            
            // Deshabilitar si ya está seleccionado en otro selector
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

// Manejar selección de acorde
function handleChordSelection(event) {
    updateAllSelectors();
    checkAndToggleSeventhChord();
}

// Verificar si los primeros 6 acordes están llenos y habilitar/deshabilitar el séptimo y octavo
function checkAndToggleSeventhChord() {
    const selects = document.querySelectorAll('.chord-select:not(.chord-select-extra):not(.chord-select-extra-2)');
    const seventhSelect = document.querySelector('.chord-select-extra');
    const eighthSelect = document.querySelector('.chord-select-extra-2');
    
    // Contar cuántos de los primeros 6 están seleccionados
    let filledCount = 0;
    selects.forEach(select => {
        if (select.value !== '') {
            filledCount++;
        }
    });
    
    // Habilitar séptimo acorde solo si los 6 primeros están llenos
    if (filledCount === 6) {
        seventhSelect.disabled = false;
        if (seventhSelect.options[0].text.includes('Fill first')) {
            seventhSelect.options[0].text = '-- Select Chord --';
        }
        
        // Habilitar octavo acorde solo si el séptimo está seleccionado
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

// Abrir modal de Gen Song Chords
function openGenSongModal() {
    document.getElementById('gen-song-modal').classList.remove('hidden');
    document.getElementById('song-chords-preview').classList.add('hidden');
    // Limpiar selecciones
    document.querySelectorAll('.chord-select').forEach(select => {
        select.value = '';
    });
    // Actualizar selectores para reflejar que no hay selecciones
    updateAllSelectors();
    // Resetear estado del séptimo acorde
    checkAndToggleSeventhChord();
}

// Cerrar modal de Gen Song Chords
function closeGenSongModal() {
    document.getElementById('gen-song-modal').classList.add('hidden');
}

// Abrir modal de Create Chord
function openCreateChordModal() {
    document.getElementById('create-chord-modal').classList.remove('hidden');
}

// Cerrar modal de Create Chord
function closeCreateChordModal() {
    document.getElementById('create-chord-modal').classList.add('hidden');
}

// Generar imagen de acordes de canción
function generateSongChords() {
    // Obtener acordes seleccionados (solo los primeros 6 o incluir extras si están seleccionados)
    selectedChords = [];
    const selects = document.querySelectorAll('.chord-select:not(.chord-select-extra):not(.chord-select-extra-2)');
    const seventhSelect = document.querySelector('.chord-select-extra');
    const eighthSelect = document.querySelector('.chord-select-extra-2');
    
    // Procesar primeros 6 acordes
    selects.forEach(select => {
        if (select.value !== '') {
            const chordIndex = parseInt(select.value);
            selectedChords.push(allChordsData[chordIndex]);
        } else {
            selectedChords.push(null); // Espacio vacío
        }
    });
    
    // Agregar séptimo acorde solo si está seleccionado
    if (seventhSelect.value !== '') {
        const chordIndex = parseInt(seventhSelect.value);
        selectedChords.push(allChordsData[chordIndex]);
        
        // Agregar octavo acorde solo si está seleccionado
        if (eighthSelect.value !== '') {
            const chordIndex = parseInt(eighthSelect.value);
            selectedChords.push(allChordsData[chordIndex]);
        }
    }
    
    // Generar y mostrar preview
    const previewContainer = document.getElementById('song-chords-image');
    previewContainer.innerHTML = '';
    
    const svgString = generateSongChordsSVG();
    previewContainer.innerHTML = svgString;
    
    // Mostrar sección de preview
    document.getElementById('song-chords-preview').classList.remove('hidden');
}

// Generar SVG de acordes de canción (6 o 7 acordes horizontales)
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
            // Dibujar diagrama vacío
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
    // Atributos de posición
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

// Renderizar diagrama vacío (solo estructura de cuerdas y trastes)
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
    
    // Dibujar trastes (horizontales) - primera línea más gruesa
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
            // Dibujar diagrama vacío
            renderEmptyChordDiagramCanvas(ctx, xOffset);
        }
    }
    
    return canvas;
}

// Renderizar diagrama vacío en canvas
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
    
    // Dibujar trastes (horizontales) - primera línea más gruesa
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

// Descargar acordes de canción
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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initializeSongChords();
});
