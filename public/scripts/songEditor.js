const SongEditor = (function() {
    'use strict';
    
    // Editor State
    let currentSongId = null;
    let selectedChordIds = [];
    let layoutColumnCount = 1;
    let layoutDividerRatio = 0.5;
    let isDraggingDivider = false;

    // Variation Modal State
    let selectedVariationId = null;

    // DOM Elements
    let variationModal, variationGrid;

    function initialize() {
        // Main Editor Buttons
        const closeBtn = document.getElementById('close-song-editor-modal');
        const saveBtn = document.getElementById('save-song-btn');
        const cancelBtn = document.getElementById('cancel-song-edit-btn');
        // ... other elements ...
        
        if (closeBtn) closeBtn.addEventListener('click', closeEditor);
        if (saveBtn) saveBtn.addEventListener('click', saveSong);
        if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);
        
        // --- PREVIOUSLY UNCHANGED INITIALIZE LOGIC ---
        const keyInput = document.getElementById('song-key-input');
        const layoutSelect = document.getElementById('song-layout-select');
        const divider = document.getElementById('song-column-divider');
        if (keyInput) {
            keyInput.addEventListener('input', function() {
                if (this.dataset.autoFilled === 'true') {
                    this.dataset.autoFilled = 'false';
                }
            });
        }
        if (layoutSelect) {
            layoutSelect.addEventListener('change', handleLayoutChange);
        }
        if (divider) {
            divider.addEventListener('mousedown', startDividerDrag);
        }
        const fontSizeInput = document.getElementById('song-content-font-size-input');
        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', updateContentFontSize);
        }
        window.addEventListener('resize', () => {
            if (!document.getElementById('song-editor-modal').classList.contains('hidden')) {
                applyDividerPosition();
            }
        });
        // --- END OF UNCHANGED LOGIC ---
        
        // Get modal elements
        variationModal = document.getElementById('chord-variation-modal');
        variationGrid = document.getElementById('variation-grid');

        // Initialize listeners for the variation modal if it exists
        if (variationModal) {
            document.getElementById('close-variation-modal').addEventListener('click', closeVariationModal);
            document.getElementById('cancel-variation-btn').addEventListener('click', closeVariationModal);
            variationModal.querySelector('.modal-overlay').addEventListener('click', closeVariationModal);
            document.getElementById('add-variation-btn').addEventListener('click', () => {
                if (selectedVariationId) {
                    addChordToSelection(selectedVariationId);
                }
                closeVariationModal();
            });
        }
        
        // Populate available chords
        populateChordSelector();
    }

    function closeVariationModal() {
        if (variationModal) {
            variationModal.classList.add('hidden');
            variationModal.style.zIndex = '';
            variationModal.querySelector('.modal-content').classList.remove('variation-modal-content');
        }
        selectedVariationId = null;
        if (variationGrid) variationGrid.innerHTML = '';
    }

    // Reusable function to open variations modal
    async function openVariationsModal(chordIdOrName, onAdd) {
        if (!variationModal || !variationGrid) {
            console.error('Variation modal elements not found.');
            return;
        }

        // Allow wider modal for buttons
        variationModal.querySelector('.modal-content').classList.add('variation-modal-content');

        document.getElementById('variation-modal-title').textContent = `${translations[currentLanguage]['Variations for']} ${chordIdOrName}`;

        const variations = await DB_SERVICE.getChordVariations(chordIdOrName);
        variationGrid.innerHTML = '';
        selectedVariationId = null;

        if (variations.length === 0) {
            variationGrid.innerHTML = '<p>No variations found.</p>';
        } else {
            variations.forEach(variation => {
                const item = document.createElement('div');
                item.className = 'variation-item';
                if (variation.IsDefault) item.classList.add('is-default');
                item.dataset.chordId = variation.Id;

                const title = document.createElement('h4');
                title.textContent = variation.Name;

                const renderer = new ChordRenderer(variation);
                item.appendChild(title);
                item.innerHTML += renderer.getSVGString(false);

                item.addEventListener('click', () => {
                    const currentSelected = variationGrid.querySelector('.selected');
                    if (currentSelected) currentSelected.classList.remove('selected');
                    item.classList.add('selected');
                    selectedVariationId = variation.Id;
                    updateMakeDefaultBtn();
                });
                variationGrid.appendChild(item);
            });
        }

        // Make modal accessible
        variationModal.setAttribute('role', 'dialog');
        variationModal.setAttribute('aria-modal', 'true');

        // Ensure modal is on top
        variationModal.style.zIndex = '9999';

        variationModal.classList.remove('hidden');

        // Override add button for this instance
        const addBtn = document.getElementById('add-variation-btn');
        addBtn.onclick = () => {
            if (selectedVariationId) {
                onAdd(selectedVariationId);
            }
            closeVariationModal();
        };

        // Function to update button state
        const updateMakeDefaultBtn = () => {
            const makeDefaultBtn = document.getElementById('make-default-btn');
            if (makeDefaultBtn && selectedVariationId) {
                const variations = variationGrid.querySelectorAll('.variation-item');
                const selectedItem = Array.from(variations).find(item => item.dataset.chordId == selectedVariationId);
                const isDefault = selectedItem && selectedItem.classList.contains('is-default');
                makeDefaultBtn.disabled = isDefault;
                if (isDefault) {
                    makeDefaultBtn.className = 'editor-action-btn btn-secondary';
                    makeDefaultBtn.textContent = translations[currentLanguage]['Already Default'];
                } else {
                    makeDefaultBtn.className = 'editor-action-btn btn-primary';
                    makeDefaultBtn.textContent = translations[currentLanguage]['Make Default'];
                }
            }
        };

        // Add or update make default button
        let makeDefaultBtn = document.getElementById('make-default-btn');
        if (!makeDefaultBtn) {
            makeDefaultBtn = document.createElement('button');
            makeDefaultBtn.id = 'make-default-btn';
            makeDefaultBtn.textContent = translations[currentLanguage]['Make Default'];
            makeDefaultBtn.className = 'editor-action-btn btn-primary';
            addBtn.parentNode.insertBefore(makeDefaultBtn, addBtn);
        }

        makeDefaultBtn.onclick = async () => {
            if (selectedVariationId) {
                const variations = await DB_SERVICE.getChordVariations(chordIdOrName);
                const selected = variations.find(v => v.Id === selectedVariationId);
                if (selected && !selected.IsDefault) {
                    await DB_SERVICE.setDefaultVariation(selectedVariationId);
                    alert(translations[currentLanguage]['Default variation updated successfully']);
                    closeVariationModal();
                }
            }
        };

        // Initially update
        updateMakeDefaultBtn();
    };
    
    async function populateChordSelector() {
        const container = document.getElementById('chord-selector-grid');
        const allChords = await DB_SERVICE.getAllChords();
        container.innerHTML = '';

        const chordGroups = allChords.reduce((acc, chord) => {
            if (!acc[chord.Name]) acc[chord.Name] = [];
            acc[chord.Name].push(chord);
            return acc;
        }, {});

        for (const chordName in chordGroups) {
            const group = chordGroups[chordName];
            const defaultChord = group.find(c => c.IsDefault) || group[0];
            const hasVariations = group.length > 1;

            const item = document.createElement('div');
            item.className = 'chord-selector-item';

            item.addEventListener('click', (e) => {
                if (e.target.closest('.variation-btn')) return;
                addChordToSelection(defaultChord.Id);
            });

            const title = document.createElement('h4');
            title.textContent = defaultChord.name;
            const renderer = new ChordRenderer(defaultChord);
            item.appendChild(title);
            item.innerHTML += renderer.getSVGString(false);

            if (hasVariations) {
                const variationBtn = document.createElement('button');
                variationBtn.className = 'variation-btn';
                variationBtn.title = 'Choose variation';
                variationBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>`;
                
                variationBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    SongEditor.openVariationsModal(chordName, (id) => addChordToSelection(id));
                });
                item.appendChild(variationBtn);
            }
            container.appendChild(item);
        }
    }
    
    function addChordToSelection(chordId) {
        if (selectedChordIds.includes(chordId)) {
            return; // Silently ignore duplicates
        }
        if (selectedChordIds.length >= 8) {
            alert(translations[currentLanguage]['Maximum 8 chords allowed'] || 'Maximum 8 chords allowed');
            return;
        }
        selectedChordIds.push(chordId);
        updateSelectedChordsList(selectedChordIds.length - 1, null);
        detectAndUpdateKey();
    }
    
    // --- Layout + editor helpers ---
    function buildCombinedTextFromColumns(column1Text, column2Text) {
        const left = column1Text || '';
        const right = column2Text || '';
        if (!left) return right;
        if (!right) return left;
        return `${left}\n\n${right}`;
    }

    function clampDividerRatio(value) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return 0.5;
        return Math.min(0.8, Math.max(0.2, numeric));
    }

    function setLayoutColumnCount(count, syncSelect = true) {
        layoutColumnCount = count === 2 ? 2 : 1;
        const layoutSelect = document.getElementById('song-layout-select');
        const singleEditor = document.getElementById('single-column-editor');
        const twoColumnEditor = document.getElementById('two-column-editor');

        if (syncSelect && layoutSelect) {
            layoutSelect.value = String(layoutColumnCount);
        }

        if (layoutColumnCount === 2) {
            if (singleEditor) singleEditor.classList.add('hidden');
            if (twoColumnEditor) twoColumnEditor.classList.remove('hidden');
        } else {
            if (singleEditor) singleEditor.classList.remove('hidden');
            if (twoColumnEditor) twoColumnEditor.classList.add('hidden');
        }
    }

    function applyDividerPosition() {
        const twoColumnEditor = document.getElementById('two-column-editor');
        if (!twoColumnEditor) return;
        const ratio = clampDividerRatio(layoutDividerRatio);
        layoutDividerRatio = ratio;
        twoColumnEditor.style.setProperty('--divider-position', `${(ratio * 100).toFixed(2)}%`);
    }

    function handleLayoutChange(event) {
        const nextColumnCount = parseInt(event.target.value, 10) === 2 ? 2 : 1;

        if (nextColumnCount === layoutColumnCount) {
            setLayoutColumnCount(nextColumnCount, false);
            return;
        }

        const singleTextarea = document.getElementById('song-content-textarea');
        const column1Textarea = document.getElementById('song-content-column1-textarea');
        const column2Textarea = document.getElementById('song-content-column2-textarea');

        if (nextColumnCount === 2) {
            if (column1Textarea && column2Textarea) {
                const hasExistingTwoColumnContent = (column1Textarea.value || '').trim() || (column2Textarea.value || '').trim();
                if (!hasExistingTwoColumnContent && singleTextarea) {
                    column1Textarea.value = singleTextarea.value || '';
                    column2Textarea.value = '';
                }
            }
        } else if (singleTextarea && column1Textarea && column2Textarea) {
            singleTextarea.value = buildCombinedTextFromColumns(column1Textarea.value, column2Textarea.value);
        }

        setLayoutColumnCount(nextColumnCount, false);
    }

    function startDividerDrag(e) {
        e.preventDefault();
        isDraggingDivider = true;

        const divider = document.getElementById('song-column-divider');
        if (divider) divider.classList.add('dragging');
        document.body.style.userSelect = 'none';

        const handleMouseMove = (moveEvent) => {
            if (!isDraggingDivider) return;

            const twoColumnEditor = document.getElementById('two-column-editor');
            if (!twoColumnEditor) return;

            const rect = twoColumnEditor.getBoundingClientRect();
            const relativeX = moveEvent.clientX - rect.left;
            const rawRatio = relativeX / rect.width;
            layoutDividerRatio = clampDividerRatio(rawRatio);
            applyDividerPosition();
        };

        const handleMouseUp = () => {
            isDraggingDivider = false;
            document.body.style.userSelect = '';
            if (divider) divider.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }
    
    function updateContentFontSize() {
        const fontSizeInput = document.getElementById('song-content-font-size-input');
        const textareas = [
            document.getElementById('song-content-textarea'),
            document.getElementById('song-content-column1-textarea'),
            document.getElementById('song-content-column2-textarea')
        ].filter(Boolean);

        if (fontSizeInput && textareas.length > 0) {
            const fontSize = fontSizeInput.value.trim();
            const resolvedFontSize = (fontSize && !isNaN(parseFloat(fontSize)) && parseFloat(fontSize) >= 6 && parseFloat(fontSize) <= 72)
                ? `${fontSize}pt`
                : '11pt';

            textareas.forEach((textarea) => {
                textarea.style.fontSize = resolvedFontSize;
            });
        }
    }

    async function openEditor(songId = null) {
        currentSongId = songId;
        selectedChordIds = [];
        await refreshFolderCheckboxes();
        if (songId) {
            const song = await SONGS_SERVICE.getSongById(songId);
            if (!song) {
                alert(translations[currentLanguage]['Song not found'] || 'Song not found');
                return;
            }
            const savedColumnCount = parseInt(song.LayoutColumnCount, 10) === 2 ? 2 : 1;
            const savedDividerRatio = clampDividerRatio(song.LayoutDividerRatio);

            document.getElementById('song-title-input').value = song.Title;
            document.getElementById('song-date-input').value = song.SongDate;
            document.getElementById('song-notes-input').value = song.Notes;
            document.getElementById('song-key-input').value = song.SongKey;
            document.getElementById('song-capo-input').value = song.Capo;
            document.getElementById('song-bpm-input').value = song.BPM;
            document.getElementById('song-effects-input').value = song.Effects;
            document.getElementById('song-content-font-size-input').value = song.SongContentFontSizePt || '';
            document.getElementById('song-content-textarea').value = song.ContentText || '';
            document.getElementById('song-content-column1-textarea').value = song.ContentTextColumn1 || song.ContentText || '';
            document.getElementById('song-content-column2-textarea').value = song.ContentTextColumn2 || '';
            layoutDividerRatio = savedDividerRatio;
            setLayoutColumnCount(savedColumnCount);
            applyDividerPosition();
            updateContentFontSize();
            selectedChordIds = song.chordIds || [];
            await updateSelectedChordsList();
            const folderIds = song.folderIds || [];
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
            document.getElementById('song-content-font-size-input').value = '';
            document.getElementById('song-content-textarea').value = '';
            document.getElementById('song-content-column1-textarea').value = '';
            document.getElementById('song-content-column2-textarea').value = '';
            layoutDividerRatio = 0.5;
            setLayoutColumnCount(1);
            applyDividerPosition();
            updateContentFontSize();
            document.querySelectorAll('.folder-checkbox').forEach(cb => {
                cb.checked = false;
            });
            updateSelectedChordsList();
        }
        document.getElementById('song-editor-modal').classList.remove('hidden');
        applyDividerPosition();
    }
    
    function closeEditor() {
        document.getElementById('song-editor-modal').classList.add('hidden');
        currentSongId = null;
        selectedChordIds = [];
        layoutColumnCount = 1;
        layoutDividerRatio = 0.5;
    }
    
    function removeChordFromSelection(index) {
        selectedChordIds.splice(index, 1);
        updateSelectedChordsList(null, index);
        detectAndUpdateKey();
    }
    
    function moveChordUp(index) {
        if (index === 0) return;
        [selectedChordIds[index], selectedChordIds[index - 1]] = [selectedChordIds[index - 1], selectedChordIds[index]];
        swapChordItems(index, index - 1);
        detectAndUpdateKey();
    }
    
    function moveChordDown(index) {
        if (index === selectedChordIds.length - 1) return;
        [selectedChordIds[index], selectedChordIds[index + 1]] = [selectedChordIds[index + 1], selectedChordIds[index]];
        swapChordItems(index, index + 1);
        detectAndUpdateKey();
    }
    
    function swapChordItems(index1, index2) {
        const container = document.getElementById('selected-chords-list');
        const items = container.querySelectorAll('.selected-chord-item');
        const item1 = items[index1];
        const item2 = items[index2];
        if (!item1 || !item2) return;
        if (index1 < index2) {
            container.insertBefore(item2, item1);
        } else {
            container.insertBefore(item1, item2);
        }
        updateChordIndices();
    }
    
    async function updateSelectedChordsList(addedIndex = null, removedIndex = null) {
        const container = document.getElementById('selected-chords-list');
        if (selectedChordIds.length === 0) {
            container.innerHTML = '<div class="empty-message">No chords selected. Click on chords below to add them.</div>';
            return;
        }
        const emptyMsg = container.querySelector('.empty-message');
        if (emptyMsg) emptyMsg.remove();
        if (removedIndex !== null) {
            const items = container.querySelectorAll('.selected-chord-item');
            if (items[removedIndex]) items[removedIndex].remove();
            updateChordIndices();
            return;
        }
        if (addedIndex !== null && addedIndex === selectedChordIds.length - 1) {
            const chordId = selectedChordIds[addedIndex];
            const chord = await DB_SERVICE.getChordById(chordId);
            if (!chord) return;
            const item = createChordItem(chord, addedIndex);
            container.appendChild(item);
            if (addedIndex > 0) {
                const prevItem = container.querySelectorAll('.selected-chord-item')[addedIndex - 1];
                if (prevItem) {
                    const downBtn = prevItem.querySelector('.mini-btn:nth-child(2)');
                    if (downBtn) downBtn.disabled = false;
                }
            }
            return;
        }
        container.innerHTML = '';
        for (let index = 0; index < selectedChordIds.length; index++) {
            const chordId = selectedChordIds[index];
            const chord = await DB_SERVICE.getChordById(chordId);
            if (!chord) continue;
            const item = createChordItem(chord, index);
            container.appendChild(item);
        }
    }
    
    function createChordItem(chord, index) {
        const item = document.createElement('div');
        item.className = 'selected-chord-item';
        item.dataset.index = index;
        const info = document.createElement('div');
        info.className = 'selected-chord-info';
        info.innerHTML = `<span>${index + 1}. ${chord.Name}</span>`;
        const actions = document.createElement('div');
        actions.className = 'selected-chord-actions';
        actions.innerHTML = `
            <button class="mini-btn" onclick="SongEditor.moveChordUp(${index})" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button class="mini-btn" onclick="SongEditor.moveChordDown(${index})" ${index === selectedChordIds.length - 1 ? 'disabled' : ''}>↓</button>
            <button class="mini-btn delete-btn" onclick="SongEditor.removeChordFromSelection(${index})">×</button>
        `;
        item.appendChild(info);
        item.appendChild(actions);
        return item;
    }
    
    function updateChordIndices() {
        const container = document.getElementById('selected-chords-list');
        const items = container.querySelectorAll('.selected-chord-item');
        const totalItems = items.length;
        items.forEach((item, index) => {
            item.dataset.index = index;
            const info = item.querySelector('.selected-chord-info span');
            if (info) {
                const currentText = info.textContent;
                const chordName = currentText.replace(/^\d+\.\s*/, '');
                info.textContent = `${index + 1}. ${chordName}`;
            }
            const buttons = item.querySelectorAll('.mini-btn');
            if (buttons.length >= 3) {
                buttons[0].onclick = () => SongEditor.moveChordUp(index);
                buttons[0].disabled = index === 0;
                buttons[1].onclick = () => SongEditor.moveChordDown(index);
                buttons[1].disabled = index === totalItems - 1;
                buttons[2].onclick = () => SongEditor.removeChordFromSelection(index);
            }
        });
    }
    
    async function detectAndUpdateKey() {
        if (selectedChordIds.length === 0) return;
        const chordNames = [];
        for (const chordId of selectedChordIds) {
            const chord = await DB_SERVICE.getChordById(chordId);
            if (chord) chordNames.push(chord.Name);
        }
        const detectedKey = detectKey(chordNames);
        const keyInput = document.getElementById('song-key-input');
        if (!keyInput.value || keyInput.dataset.autoFilled === 'true') {
            keyInput.value = detectedKey;
            keyInput.dataset.autoFilled = 'true';
        }
    }
    
    function detectKey(chordNames) {
        if (chordNames.length === 0) return '';
        const keyPatterns = {'C':['C','F','G','Am','Dm','Em','Bdim'],'G':['G','C','D','Em','Am','Bm','F#dim'],'D':['D','G','A','Bm','Em','F#m','C#dim'],'A':['A','D','E','F#m','Bm','C#m','G#dim'],'E':['E','A','B','C#m','F#m','G#m','D#dim'],'B':['B','E','F#','G#m','C#m','D#m','A#dim'],'F#':['F#','B','C#','D#m','G#m','A#m','E#dim'],'F':['F','Bb','C','Dm','Gm','Am','Edim'],'Bb':['Bb','Eb','F','Gm','Cm','Dm','Adim'],'Eb':['Eb','Ab','Bb','Cm','Fm','Gm','Ddim'],'Ab':['Ab','Db','Eb','Fm','Bbm','Cm','Gdim'],'Db':['Db','Gb','Ab','Bbm','Ebm','Fm','Cdim'],'Am':['Am','Dm','Em','C','F','G','Bdim'],'Em':['Em','Am','Bm','G','C','D','F#dim'],'Bm':['Bm','Em','F#m','D','G','A','C#dim'],'F#m':['F#m','Bm','C#m','A','D','E','G#dim'],'C#m':['C#m','F#m','G#m','E','A','B','D#dim'],'G#m':['G#m','C#m','D#m','B','E','F#','A#dim'],'Dm':['Dm','Gm','Am','F','Bb','C','Edim'],'Gm':['Gm','Cm','Dm','Bb','Eb','F','Adim'],'Cm':['Cm','Fm','Gm','Eb','Ab','Bb','Ddim']};
        let bestKey = '', bestScore = 0;
        for (const [key, pattern] of Object.entries(keyPatterns)) {
            let score = 0, primaryScore = 0;
            chordNames.forEach((chordName, index) => {
                const chordIndex = pattern.indexOf(chordName);
                if (chordIndex !== -1) {
                    if (chordIndex < 3) {
                        primaryScore += 3;
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
            label.innerHTML = `<input type="checkbox" class="folder-checkbox" value="${folder.Id}"> <span>${folder.Name}</span>`;
            container.appendChild(label);
        });
    }
    
    async function saveSong() {
        const title = document.getElementById('song-title-input').value.trim();
        if (!title) {
            alert(translations[currentLanguage]['Title is required'] || 'Title is required');
            return;
        }
        const singleContentText = document.getElementById('song-content-textarea').value;
        const column1Text = document.getElementById('song-content-column1-textarea').value;
        const column2Text = document.getElementById('song-content-column2-textarea').value;
        const effectiveContentText = layoutColumnCount === 2
            ? buildCombinedTextFromColumns(column1Text, column2Text)
            : singleContentText;

        if (!effectiveContentText.trim()) {
            alert(translations[currentLanguage]['Song content cannot be empty'] || 'Song content cannot be empty');
            return;
        }
        const fontSizeValue = document.getElementById('song-content-font-size-input').value.trim();
        if (fontSizeValue && (parseFloat(fontSizeValue) < 6 || parseFloat(fontSizeValue) > 72)) {
            alert(translations[currentLanguage]['Font size must be between 6 and 72 pt'] || 'Font size must be between 6 and 72 pt');
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
            songContentFontSizePt: document.getElementById('song-content-font-size-input').value.trim(),
            contentText: effectiveContentText,
            layoutColumnCount: layoutColumnCount,
            layoutDividerRatio: layoutDividerRatio,
            contentTextColumn1: layoutColumnCount === 2 ? column1Text : singleContentText,
            contentTextColumn2: layoutColumnCount === 2 ? column2Text : '',
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
        saveSong,
        openVariationsModal
    };
})();

// Make SongEditor globally available
window.SongEditor = SongEditor;

