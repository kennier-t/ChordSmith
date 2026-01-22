// Chord Editor - Interactive visual editor for creating/editing custom chords

(function() {
    'use strict';
    
    // Editor state
    let editorState = {
        chordId: null,
        frets: [-1, -1, -1, -1, -1, -1], // 6 strings
        fingers: [0, 0, 0, 0, 0, 0],
        barres: [],
        baseFret: 1,
        isDragging: false,
        dragStartString: null
    };
    
    // Canvas dimensions
    const CANVAS = {
        width: 300,
        height: 400,
        margin: 40,
        strings: 6,
        frets: 4
    };
    
    // Initialize editor when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        initializeChordEditor();
    });
    
    function initializeChordEditor() {
        // Event listeners for buttons
        document.getElementById('create-new-chord-btn').addEventListener('click', () => {
            showEditorView();
        });
        
        document.getElementById('back-to-list-btn').addEventListener('click', () => {
            showListView();
        });
        
        document.getElementById('save-chord-btn').addEventListener('click', saveChord);
        document.getElementById('cancel-edit-btn').addEventListener('click', showListView);
        document.getElementById('delete-chord-btn').addEventListener('click', deleteChord);
        
        // Canvas event listeners
        const canvas = document.getElementById('chord-editor-canvas');
        canvas.addEventListener('mousedown', handleCanvasMouseDown);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
        canvas.addEventListener('mouseup', handleCanvasMouseUp);
        
        // Input listeners
        document.getElementById('base-fret-input').addEventListener('change', (e) => {
            editorState.baseFret = parseInt(e.target.value);
            drawChordDiagram();
        });
        
        // Override the openCreateChordModal in songChords.js
        const originalOpenCreateChordModal = window.openCreateChordModal;
        window.openCreateChordModal = function() {
            if (originalOpenCreateChordModal) {
                originalOpenCreateChordModal();
            }
            refreshCustomChordsList();
        };
    }
    
    async function showListView() {
        document.getElementById('chord-list-view').classList.remove('hidden');
        document.getElementById('chord-editor-view').classList.add('hidden');
        await refreshCustomChordsList();
    }
    
    async function showEditorView(chordId = null) {
        document.getElementById('chord-list-view').classList.add('hidden');
        document.getElementById('chord-editor-view').classList.remove('hidden');
        
        // Reset or load chord
        if (chordId) {
            await loadChordForEditing(chordId);
            document.getElementById('delete-chord-btn').classList.remove('hidden');
        } else {
            resetEditor();
            document.getElementById('delete-chord-btn').classList.add('hidden');
        }
        
        drawChordDiagram();
    }
    
    function resetEditor() {
        editorState = {
            chordId: null,
            frets: [-1, -1, -1, -1, -1, -1],
            fingers: [0, 0, 0, 0, 0, 0],
            barres: [],
            baseFret: 1,
            isDragging: false,
            dragStartString: null
        };
        
        document.getElementById('chord-name-input').value = '';
        document.getElementById('base-fret-input').value = '1';
        document.getElementById('is-default-checkbox').checked = false;
        document.getElementById('name-error').textContent = '';
    }
    
    async function loadChordForEditing(chordId) {
        const chord = await DB_SERVICE.getChordById(chordId);
        if (!chord) {
            alert('Chord not found');
            showListView();
            return;
        }
        
        if (chord.isOriginal) {
            alert('Cannot edit original chords');
            showListView();
            return;
        }
        
        editorState.chordId = chord.id;
        editorState.frets = [...chord.frets];
        editorState.fingers = [...chord.fingers];
        editorState.barres = [...chord.barres];
        editorState.baseFret = chord.baseFret;
        
        document.getElementById('chord-name-input').value = chord.name;
        document.getElementById('base-fret-input').value = chord.baseFret;
        document.getElementById('is-default-checkbox').checked = chord.isDefault;
        document.getElementById('name-error').textContent = '';
    }
    
    async function refreshCustomChordsList() {
        const container = document.getElementById('custom-chords-list');
        const customChords = await DB_SERVICE.getCustomChords();
        
        container.innerHTML = '';
        
        if (customChords.length === 0) {
            container.innerHTML = '<div class="empty-chords-message" data-translate="No custom chords yet. Create one!"></div>';
            translatePage();
            return;
        }
        
        // Sort by name, then by ID to group variations
        customChords.sort((a, b) => {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });

        customChords.forEach(chord => {
            const item = document.createElement('div');
            item.className = 'custom-chord-item';
            item.onclick = () => showEditorView(chord.id);
            
            const title = document.createElement('h4');
            title.textContent = chord.isDefault ? `${chord.name} (Default)` : chord.name;
            
            const renderer = new ChordRenderer(chord);
            const svgString = renderer.getSVGString(false);
            
            item.appendChild(title);
            item.innerHTML += svgString;
            
            container.appendChild(item);
        });
    }
    
    function drawChordDiagram() {
        const canvas = document.getElementById('chord-editor-canvas');
        const ctx = canvas.getContext('2d');
        
        // Clear canvas
        ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
        
        const margin = CANVAS.margin;
        const diagramWidth = CANVAS.width - margin * 2;
        const diagramHeight = CANVAS.height - margin * 2;
        const stringSpacing = diagramWidth / (CANVAS.strings - 1);
        const fretSpacing = diagramHeight / CANVAS.frets;
        
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 1;
        
        // Draw strings (vertical lines)
        for (let i = 0; i < CANVAS.strings; i++) {
            const x = margin + i * stringSpacing;
            ctx.beginPath();
            ctx.moveTo(x, margin);
            ctx.lineTo(x, margin + diagramHeight);
            ctx.stroke();
        }
        
        // Draw frets (horizontal lines)
        for (let i = 0; i <= CANVAS.frets; i++) {
            const y = margin + i * fretSpacing;
            ctx.lineWidth = (i === 0) ? 3 : 1; // Thicker first fret
            ctx.beginPath();
            ctx.moveTo(margin, y);
            ctx.lineTo(margin + diagramWidth, y);
            ctx.stroke();
            ctx.lineWidth = 1;
        }
        
        // Draw X markers for muted strings
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < CANVAS.strings; i++) {
            if (editorState.frets[i] === -1) {
                const x = margin + i * stringSpacing;
                ctx.fillText('X', x, margin - 15);
            }
        }
        
        // Draw barres first (so fingers overlay them)
        editorState.barres.forEach(barreFret => {
            const stringsWithBarre = [];
            for (let i = 0; i < CANVAS.strings; i++) {
                if (editorState.frets[i] === barreFret) {
                    stringsWithBarre.push(i);
                }
            }
            
            if (stringsWithBarre.length >= 2) {
                const minString = Math.min(...stringsWithBarre);
                const maxString = Math.max(...stringsWithBarre);
                const x1 = margin + minString * stringSpacing;
                const x2 = margin + maxString * stringSpacing;
                const fretPos = barreFret - editorState.baseFret;
                const y = margin + (fretPos + 0.5) * fretSpacing;
                
                // Draw line
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 18;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(x1, y);
                ctx.lineTo(x2, y);
                ctx.stroke();
                ctx.lineWidth = 1;
            }
        });
        
        // Draw finger dots
        const dotRadius = 12;
        for (let i = 0; i < CANVAS.strings; i++) {
            const fret = editorState.frets[i];
            const finger = editorState.fingers[i];
            
            if (fret > 0 && finger > 0) {
                const x = margin + i * stringSpacing;
                const fretPos = fret - editorState.baseFret;
                
                // Skip if out of bounds
                if (fretPos < 0 || fretPos >= CANVAS.frets) continue;
                
                const y = margin + (fretPos + 0.5) * fretSpacing;
                
                // Draw circle
                ctx.fillStyle = '#000';
                ctx.beginPath();
                ctx.arc(x, y, dotRadius, 0, 2 * Math.PI);
                ctx.fill();
                
                // Draw finger number
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(finger.toString(), x, y);
            }
        }
    }
    
    function handleCanvasMouseDown(event) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const stringIndex = getStringAtPosition(x);
        const fretNumber = getFretAtPosition(y);
        
        if (stringIndex === null) return;
        
        // Click above diagram = toggle X
        if (y < CANVAS.margin - 5) {
            toggleMutedString(stringIndex);
            return;
        }
        
        // Click on diagram
        if (fretNumber !== null && fretNumber >= 0 && fretNumber < CANVAS.frets) {
            const absoluteFret = fretNumber + editorState.baseFret;
            
            // Check if clicking on existing finger
            if (editorState.frets[stringIndex] === absoluteFret && editorState.fingers[stringIndex] > 0) {
                // Cycle through fingers or remove
                cycleFinger(stringIndex);
            } else {
                // Add new finger
                addFinger(stringIndex, absoluteFret);
            }
            
            // Start drag for potential barre
            editorState.isDragging = true;
            editorState.dragStartString = stringIndex;
        }
    }
    
    function handleCanvasMouseMove(event) {
        if (!editorState.isDragging) return;
        
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const stringIndex = getStringAtPosition(x);
        
        // Visual feedback could be added here
    }
    
    function handleCanvasMouseUp(event) {
        if (!editorState.isDragging) {
            editorState.isDragging = false;
            return;
        }
        
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const endString = getStringAtPosition(x);
        
        if (editorState.dragStartString !== null && endString !== null && 
            editorState.dragStartString !== endString) {
            // Create barre
            createBarre(editorState.dragStartString, endString);
        }
        
        editorState.isDragging = false;
        editorState.dragStartString = null;
    }
    
    function getStringAtPosition(x) {
        const margin = CANVAS.margin;
        const diagramWidth = CANVAS.width - margin * 2;
        const stringSpacing = diagramWidth / (CANVAS.strings - 1);
        
        for (let i = 0; i < CANVAS.strings; i++) {
            const stringX = margin + i * stringSpacing;
            if (Math.abs(x - stringX) < 15) {
                return i;
            }
        }
        return null;
    }
    
    function getFretAtPosition(y) {
        const margin = CANVAS.margin;
        const diagramHeight = CANVAS.height - margin * 2;
        const fretSpacing = diagramHeight / CANVAS.frets;
        
        if (y < margin || y > margin + diagramHeight) {
            return null;
        }
        
        const relativeY = y - margin;
        const fretNumber = Math.floor(relativeY / fretSpacing);
        
        return fretNumber;
    }
    
    function toggleMutedString(stringIndex) {
        if (editorState.frets[stringIndex] === -1) {
            // Unmute
            editorState.frets[stringIndex] = 0;
            editorState.fingers[stringIndex] = 0;
        } else {
            // Mute
            editorState.frets[stringIndex] = -1;
            editorState.fingers[stringIndex] = 0;
        }
        drawChordDiagram();
    }
    
    function addFinger(stringIndex, fret) {
        editorState.frets[stringIndex] = fret;
        editorState.fingers[stringIndex] = 1; // Default to finger 1
        drawChordDiagram();
    }
    
    function cycleFinger(stringIndex) {
        const currentFinger = editorState.fingers[stringIndex];
        
        if (currentFinger >= 4) {
            // Remove finger
            editorState.frets[stringIndex] = 0;
            editorState.fingers[stringIndex] = 0;
        } else {
            // Cycle to next finger
            editorState.fingers[stringIndex] = currentFinger + 1;
        }
        
        drawChordDiagram();
    }
    
    function createBarre(startString, endString) {
        const minString = Math.min(startString, endString);
        const maxString = Math.max(startString, endString);
        
        if (maxString - minString < 1) return; // Need at least 2 strings
        
        // Get fret from first string
        const fret = editorState.frets[startString];
        if (fret <= 0) return;
        
        // Apply to all strings in range
        for (let i = minString; i <= maxString; i++) {
            editorState.frets[i] = fret;
            editorState.fingers[i] = 1; // Barre uses finger 1
        }
        
        // Add to barres array if not already there
        if (!editorState.barres.includes(fret)) {
            editorState.barres.push(fret);
        }
        
        drawChordDiagram();
    }
    
    function saveChord() {
        const name = document.getElementById('chord-name-input').value.trim();
        const isDefault = document.getElementById('is-default-checkbox').checked;

        // Validation
        if (!name) {
            alert('Please enter a chord name');
            return;
        }
        
        // Check if at least one finger is placed
        const hasFingers = editorState.fingers.some(f => f > 0);
        if (!hasFingers) {
            alert('Please place at least one finger on the diagram');
            return;
        }
        
        const chordData = {
            name: name,
            baseFret: editorState.baseFret,
            frets: editorState.frets,
            fingers: editorState.fingers,
            barres: editorState.barres,
            isDefault: isDefault
        };
        
        try {
            if (editorState.chordId) {
                // Update existing
                DB_SERVICE.updateChord(editorState.chordId, chordData);
                alert('Chord updated successfully!');
            } else {
                // Create new
                DB_SERVICE.createChord(chordData);
                alert('Chord created successfully!');
            }
            
            // Refresh song chords selector
            if (typeof populateChordSelectors === 'function') {
                populateChordSelectors();
            }
            if (typeof updateAllSelectors === 'function') {
                updateAllSelectors();
            }
            
            showListView();
        } catch (error) {
            alert('Error saving chord: ' + error.message);
        }
    }
    
    function deleteChord() {
        if (!editorState.chordId) return;
        
        if (!confirm('Are you sure you want to delete this chord?')) {
            return;
        }
        
        try {
            DB_SERVICE.deleteChord(editorState.chordId);
            
            // Refresh song chords selector
            if (typeof populateChordSelectors === 'function') {
                populateChordSelectors();
            }
            if (typeof updateAllSelectors === 'function') {
                updateAllSelectors();
            }
            
            alert('Chord deleted successfully!');
            showListView();
        } catch (error) {
            alert('Error deleting chord: ' + error.message);
        }
    }
    
    // Expose functions globally for external access
    window.chordEditor = {
        showListView,
        showEditorView,
        refreshCustomChordsList
    };
})();
