const SongEditor = (function() {
    'use strict';
    
    let currentSongId = null;
    let selectedChordIds = [];
    let personalizedLinePosition = 50; // Default percentage
    let isDraggingLine = false;
    
    function initialize() {
        const closeBtn = document.getElementById('close-song-editor-modal');
        const saveBtn = document.getElementById('save-song-btn');
        const cancelBtn = document.getElementById('cancel-song-edit-btn');
        const keyInput = document.getElementById('song-key-input');
        const columnGuidesSelect = document.getElementById('column-guides-select');
        
        if (closeBtn) closeBtn.addEventListener('click', closeEditor);
        if (saveBtn) saveBtn.addEventListener('click', saveSong);
        if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);
        
        // Mark Key field as manually edited when user types in it
        if (keyInput) {
            keyInput.addEventListener('input', function() {
                if (this.dataset.autoFilled === 'true') {
                    this.dataset.autoFilled = 'false';
                }
            });
        }
        
        // Column guides control
        if (columnGuidesSelect) {
            columnGuidesSelect.addEventListener('change', updateColumnGuides);
        }
        
        // Update guides on window resize
        window.addEventListener('resize', () => {
            if (!document.getElementById('song-editor-modal').classList.contains('hidden')) {
                updateColumnGuides();
            }
        });
        
        populateChordSelector();
    }
    
    function updateColumnGuides() {
        const select = document.getElementById('column-guides-select');
        const guidesContainer = document.getElementById('column-guides');
        const textarea = document.getElementById('song-content-textarea');
        const mode = select.value;
        
        guidesContainer.innerHTML = '';
        
        if (mode === 'none') {
            guidesContainer.classList.add('hidden');
            return;
        }
        
        guidesContainer.classList.remove('hidden');
        
        // Get textarea width including padding
        const textareaWidth = textarea.offsetWidth;
        const paddingLeft = parseInt(window.getComputedStyle(textarea).paddingLeft);
        const paddingRight = parseInt(window.getComputedStyle(textarea).paddingRight);
        const contentWidth = textareaWidth - paddingLeft - paddingRight;
        
        if (mode === 'personalized') {
            // Create single draggable line at personalized position
            const line = document.createElement('div');
            line.className = 'column-guide-line draggable';
            const linePosition = paddingLeft + (contentWidth * personalizedLinePosition / 100);
            line.style.left = `${linePosition}px`;
            
            // Add drag functionality
            line.addEventListener('mousedown', startDraggingLine);
            
            guidesContainer.appendChild(line);
        } else {
            // Original functionality for two/three columns
            const columns = mode === 'two' ? 2 : 3;
            const columnWidth = contentWidth / columns;
            
            // Create guide lines
            for (let i = 1; i < columns; i++) {
                const line = document.createElement('div');
                line.className = 'column-guide-line';
                line.style.left = `${paddingLeft + (columnWidth * i)}px`;
                guidesContainer.appendChild(line);
            }
        }
    }
    
    function startDraggingLine(e) {
        isDraggingLine = true;
        document.body.style.userSelect = 'none';
        e.target.classList.add('dragging');
        
        const handleMouseMove = (moveEvent) => {
            if (!isDraggingLine) return;
            
            const textarea = document.getElementById('song-content-textarea');
            const guidesContainer = document.getElementById('column-guides');
            const textareaRect = textarea.getBoundingClientRect();
            const containerRect = guidesContainer.getBoundingClientRect();
            
            const paddingLeft = parseInt(window.getComputedStyle(textarea).paddingLeft);
            const paddingRight = parseInt(window.getComputedStyle(textarea).paddingRight);
            const contentWidth = textarea.offsetWidth - paddingLeft - paddingRight;
            
            // Calculate mouse position relative to the textarea
            let newLeft = moveEvent.clientX - containerRect.left;
            
            // Constrain to content area
            newLeft = Math.max(paddingLeft, Math.min(newLeft, paddingLeft + contentWidth));
            
            // Update line position
            e.target.style.left = `${newLeft}px`;
            
            // Update personalized position percentage
            personalizedLinePosition = ((newLeft - paddingLeft) / contentWidth) * 100;
        };
        
        const handleMouseUp = () => {
            isDraggingLine = false;
            document.body.style.userSelect = '';
            e.target.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    async function openEditor(songId = null) {
        currentSongId = songId;
        selectedChordIds = [];
        
        // Refresh folders first
        await refreshFolderCheckboxes();
        
        if (songId) {
            const song = await SONGS_SERVICE.getSongById(songId);
            if (!song) {
                alert(translations[currentLanguage]['Song not found'] || 'Song not found');
                return;
            }
            
            document.getElementById('song-title-input').value = song.title;
            document.getElementById('song-date-input').value = song.songDate;
            document.getElementById('song-notes-input').value = song.notes;
            document.getElementById('song-key-input').value = song.songKey;
            document.getElementById('song-capo-input').value = song.capo;
            document.getElementById('song-bpm-input').value = song.bpm;
            document.getElementById('song-effects-input').value = song.effects;
            document.getElementById('song-content-textarea').value = song.contentText;
            
            selectedChordIds = await SONGS_SERVICE.getSongChordDiagrams(songId);
            await updateSelectedChordsList();
            
            // Mark the folders that this song belongs to
            const folderIds = (await SONGS_SERVICE.getSongFolders(songId)).map(f => f.id);
            document.querySelectorAll('.folder-checkbox').forEach(cb => {
                cb.checked = folderIds.includes(parseInt(cb.value));
            });
        } else {
            document.getElementById('song-title-input').value = '';
            document.getElementById('song-date-input').value = '';
            document.getElementById('song-notes-input').value = '';
            document.getElementById('song-key-input').value = '';
            document.getElementById('song-capo-input').value = '';
            document.getElementById('song-bpm-input').value = '';
            document.getElementById('song-effects-input').value = '';
            document.getElementById('song-content-textarea').value = '';
            
            document.querySelectorAll('.folder-checkbox').forEach(cb => {
                cb.checked = false;
            });
            
            updateSelectedChordsList();
        }
        
        document.getElementById('song-editor-modal').classList.remove('hidden');
        
        // Initialize column guides after modal is visible
        setTimeout(() => {
            updateColumnGuides();
        }, 100);
    }
    
    function closeEditor() {
        document.getElementById('song-editor-modal').classList.add('hidden');
        currentSongId = null;
        selectedChordIds = [];
    }
    
    async function populateChordSelector() {
        const container = document.getElementById('chord-selector-grid');
        const allChords = await DB_SERVICE.getAllChords();
        
        container.innerHTML = '';
        
        allChords.forEach(chord => {
            const item = document.createElement('div');
            item.className = 'chord-selector-item';
            item.onclick = () => addChordToSelection(chord.id);
            
            const title = document.createElement('h4');
            title.textContent = chord.name;
            
            const renderer = new ChordRenderer(chord);
            const svgString = renderer.getSVGString(false);
            
            item.appendChild(title);
            item.innerHTML += svgString;
            
            container.appendChild(item);
        });
    }
    
    function addChordToSelection(chordId) {
        if (selectedChordIds.length >= 8) {
            alert(translations[currentLanguage]['Maximum 8 chords allowed'] || 'Maximum 8 chords allowed');
            return;
        }
        
        if (selectedChordIds.includes(chordId)) {
            return;
        }
        
        selectedChordIds.push(chordId);
        updateSelectedChordsList();
        detectAndUpdateKey();
    }
    
    function removeChordFromSelection(index) {
        selectedChordIds.splice(index, 1);
        updateSelectedChordsList();
        detectAndUpdateKey();
    }
    
    async function moveChordUp(index) {
        if (index === 0) return;
        [selectedChordIds[index], selectedChordIds[index - 1]] = [selectedChordIds[index - 1], selectedChordIds[index]];
        await updateSelectedChordsList();
        detectAndUpdateKey();
    }
    
    async function moveChordDown(index) {
        if (index === selectedChordIds.length - 1) return;
        [selectedChordIds[index], selectedChordIds[index + 1]] = [selectedChordIds[index + 1], selectedChordIds[index]];
        await updateSelectedChordsList();
        detectAndUpdateKey();
    }
    
    async function updateSelectedChordsList() {
        const container = document.getElementById('selected-chords-list');
        container.innerHTML = '';
        
        if (selectedChordIds.length === 0) {
            container.innerHTML = '<div class="empty-message">No chords selected. Click on chords below to add them.</div>';
            return;
        }
        
        for (let index = 0; index < selectedChordIds.length; index++) {
            const chordId = selectedChordIds[index];
            const chord = await DB_SERVICE.getChordById(chordId);
            if (!chord) return;
            
            const item = document.createElement('div');
            item.className = 'selected-chord-item';
            
            const info = document.createElement('div');
            info.className = 'selected-chord-info';
            info.innerHTML = `<span>${index + 1}. ${chord.name}</span>`;
            
            const actions = document.createElement('div');
            actions.className = 'selected-chord-actions';
            actions.innerHTML = `
                <button class="mini-btn" onclick="SongEditor.moveChordUp(${index})" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button class="mini-btn" onclick="SongEditor.moveChordDown(${index})" ${index === selectedChordIds.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="mini-btn delete-btn" onclick="SongEditor.removeChordFromSelection(${index})">×</button>
            `;
            
            item.appendChild(info);
            item.appendChild(actions);
            container.appendChild(item);
        }
    }
    
    // Detect song key based on selected chords
    async function detectAndUpdateKey() {
        if (selectedChordIds.length === 0) {
            return;
        }
        
        const chordNames = [];
        for (const chordId of selectedChordIds) {
            const chord = await DB_SERVICE.getChordById(chordId);
            if (chord) {
                chordNames.push(chord.name);
            }
        }
        
        const detectedKey = detectKey(chordNames);
        const keyInput = document.getElementById('song-key-input');
        
        // Only update if the field is empty or user hasn't manually edited it
        if (!keyInput.value || keyInput.dataset.autoFilled === 'true') {
            keyInput.value = detectedKey;
            keyInput.dataset.autoFilled = 'true';
        }
    }
    
    // Key detection algorithm
    function detectKey(chordNames) {
        if (chordNames.length === 0) return '';
        
        // Common key patterns (I, IV, V, vi, ii, iii, vii°)
        const keyPatterns = {
            'C': ['C', 'F', 'G', 'Am', 'Dm', 'Em', 'Bdim'],
            'G': ['G', 'C', 'D', 'Em', 'Am', 'Bm', 'F#dim'],
            'D': ['D', 'G', 'A', 'Bm', 'Em', 'F#m', 'C#dim'],
            'A': ['A', 'D', 'E', 'F#m', 'Bm', 'C#m', 'G#dim'],
            'E': ['E', 'A', 'B', 'C#m', 'F#m', 'G#m', 'D#dim'],
            'B': ['B', 'E', 'F#', 'G#m', 'C#m', 'D#m', 'A#dim'],
            'F#': ['F#', 'B', 'C#', 'D#m', 'G#m', 'A#m', 'E#dim'],
            'F': ['F', 'Bb', 'C', 'Dm', 'Gm', 'Am', 'Edim'],
            'Bb': ['Bb', 'Eb', 'F', 'Gm', 'Cm', 'Dm', 'Adim'],
            'Eb': ['Eb', 'Ab', 'Bb', 'Cm', 'Fm', 'Gm', 'Ddim'],
            'Ab': ['Ab', 'Db', 'Eb', 'Fm', 'Bbm', 'Cm', 'Gdim'],
            'Db': ['Db', 'Gb', 'Ab', 'Bbm', 'Ebm', 'Fm', 'Cdim'],
            'Am': ['Am', 'Dm', 'Em', 'C', 'F', 'G', 'Bdim'],
            'Em': ['Em', 'Am', 'Bm', 'G', 'C', 'D', 'F#dim'],
            'Bm': ['Bm', 'Em', 'F#m', 'D', 'G', 'A', 'C#dim'],
            'F#m': ['F#m', 'Bm', 'C#m', 'A', 'D', 'E', 'G#dim'],
            'C#m': ['C#m', 'F#m', 'G#m', 'E', 'A', 'B', 'D#dim'],
            'G#m': ['G#m', 'C#m', 'D#m', 'B', 'E', 'F#', 'A#dim'],
            'Dm': ['Dm', 'Gm', 'Am', 'F', 'Bb', 'C', 'Edim'],
            'Gm': ['Gm', 'Cm', 'Dm', 'Bb', 'Eb', 'F', 'Adim'],
            'Cm': ['Cm', 'Fm', 'Gm', 'Eb', 'Ab', 'Bb', 'Ddim']
        };
        
        // Score each key based on how many chords match
        let bestKey = '';
        let bestScore = 0;
        
        for (const [key, pattern] of Object.entries(keyPatterns)) {
            let score = 0;
            let primaryScore = 0;
            
            chordNames.forEach((chordName, index) => {
                const chordIndex = pattern.indexOf(chordName);
                if (chordIndex !== -1) {
                    // Primary chords (I, IV, V) get higher weight
                    if (chordIndex < 3) {
                        primaryScore += 3;
                        // First chord gets extra weight
                        if (index === 0) primaryScore += 2;
                    } else {
                        score += 1;
                    }
                }
            });
            
            const totalScore = primaryScore * 2 + score;
            
            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestKey = key;
            }
        }
        
        return bestKey || chordNames[0].replace(/m$/, '').replace(/dim$/, '').replace(/7$/, '');
    }
    
    async function refreshFolderCheckboxes() {
        const container = document.getElementById('folder-selection');
        const folders = await SONGS_SERVICE.getAllFolders();
        
                container.innerHTML = '<h4 data-translate="Save to folders"></h4>';
                translatePage();
        
                if (folders.length === 0) {
                    container.innerHTML += '<p class="empty-message" data-translate="No folders available. Create one in Songs view first."></p>';
                    translatePage();
                    return;
                }        
        folders.forEach(folder => {
            const label = document.createElement('label');
            label.className = 'folder-checkbox-label';
            label.innerHTML = `
                <input type="checkbox" class="folder-checkbox" value="${folder.id}">
                <span>${folder.name}</span>
            `;
            container.appendChild(label);
        });
    }
    
    async function saveSong() {
        const title = document.getElementById('song-title-input').value.trim();
        
        if (!title) {
            alert(translations[currentLanguage]['Title is required'] || 'Title is required');
            return;
        }
        
        const contentText = document.getElementById('song-content-textarea').value;
        
        if (!contentText.trim()) {
            alert(translations[currentLanguage]['Song content cannot be empty'] || 'Song content cannot be empty');
            return;
        }
        
        const selectedFolders = Array.from(document.querySelectorAll('.folder-checkbox:checked')).map(cb => parseInt(cb.value));
        
        const songData = {
            title: title,
            songDate: document.getElementById('song-date-input').value.trim(),
            notes: document.getElementById('song-notes-input').value.trim(),
            songKey: document.getElementById('song-key-input').value.trim(),
            capo: document.getElementById('song-capo-input').value.trim(),
            bpm: document.getElementById('song-bpm-input').value.trim(),
            effects: document.getElementById('song-effects-input').value.trim(),
            contentText: contentText,
            chordIds: selectedChordIds,
            folderIds: selectedFolders
        };
        
        try {
            if (currentSongId) {
                await SONGS_SERVICE.updateSong(currentSongId, songData);
                alert(translations[currentLanguage]['Song updated successfully!'] || 'Song updated successfully!');
            } else {
                await SONGS_SERVICE.createSong(songData);
                alert(translations[currentLanguage]['Song created successfully!'] || 'Song created successfully!');
            }
            
            if (typeof SongsManager !== 'undefined' && SongsManager.refreshFoldersList) {
                await SongsManager.refreshFoldersList();
            }
            
            closeEditor();
        } catch (error) {
            alert(translations[currentLanguage]['Error saving song: '] + error.message);
        }
    }
    
    document.addEventListener('DOMContentLoaded', initialize);
    
    return {
        openEditor,
        closeEditor,
        addChordToSelection,
        removeChordFromSelection,
        moveChordUp,
        moveChordDown,
        saveSong
    };
})();
