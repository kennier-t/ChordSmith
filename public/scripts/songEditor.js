const SongEditor = (function() {
    'use strict';
    
    // Editor State
    let currentSongId = null;
    let editRootSongId = null;
    let versionSourceSongId = null;
    let versionList = [];
    let isAddVersionMode = false;
    let selectedChordIds = [];
    let layoutColumnCount = 1;
    let layoutDividerRatio = 0.5;
    let isDraggingDivider = false;
    let gutterResizeObserver = null;
    const DEFAULT_VISIBLE_EDITOR_LINES = Number(window.CHORDSMITH_EDITOR_VISIBLE_LINES) > 0
        ? Math.floor(Number(window.CHORDSMITH_EDITOR_VISIBLE_LINES))
        : 30;
    const lineNumberBindings = [
        { textareaId: 'song-content-textarea', gutterId: 'single-column-line-numbers' },
        { textareaId: 'song-content-column1-textarea', gutterId: 'column1-line-numbers' }
    ];

    // Variation Modal State
    let selectedVariationId = null;

    // DOM Elements
    let variationModal, variationGrid;

    function initialize() {
        // Main Editor Buttons
        const closeBtn = document.getElementById('close-song-editor-modal');
        const saveBtn = document.getElementById('save-song-btn');
        const cancelBtn = document.getElementById('cancel-song-edit-btn');
        const versionSelectBtn = document.getElementById('song-version-select-btn');
        const versionUpBtn = document.getElementById('song-version-up-btn');
        const versionDownBtn = document.getElementById('song-version-down-btn');
        const addVersionBtn = document.getElementById('add-song-version-btn');
        // ... other elements ...
        
        if (closeBtn) closeBtn.addEventListener('click', closeEditor);
        if (saveBtn) saveBtn.addEventListener('click', saveSong);
        if (cancelBtn) cancelBtn.addEventListener('click', closeEditor);
        if (versionSelectBtn) versionSelectBtn.addEventListener('click', toggleSongVersionDropdown);
        if (versionUpBtn) versionUpBtn.addEventListener('click', () => moveSelectedVersion(-1));
        if (versionDownBtn) versionDownBtn.addEventListener('click', () => moveSelectedVersion(1));
        if (addVersionBtn) addVersionBtn.addEventListener('click', openAddVersionForm);
        
        // --- PREVIOUSLY UNCHANGED INITIALIZE LOGIC ---
        const keyInput = document.getElementById('song-key-input');
        const layoutSelect = document.getElementById('song-layout-select');
        const layoutBtn = document.getElementById('song-layout-btn');
        const layoutDropdown = document.getElementById('song-layout-dropdown');
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
        if (layoutBtn) {
            layoutBtn.addEventListener('click', toggleLayoutDropdown);
        }
        if (layoutDropdown) {
            layoutDropdown.querySelectorAll('.custom-dropdown-item').forEach((item) => {
                item.addEventListener('click', () => {
                    selectLayoutOption(item.dataset.value || '1');
                });
            });
        }
        if (divider) {
            divider.addEventListener('mousedown', startDividerDrag);
        }
        const fontSizeInput = document.getElementById('song-content-font-size-input');
        if (fontSizeInput) {
            fontSizeInput.addEventListener('input', updateContentFontSize);
        }
        initializeLineNumberGutters();
        window.addEventListener('resize', () => {
            if (!document.getElementById('song-editor-modal').classList.contains('hidden')) {
                applyDividerPosition();
                refreshLineNumberGutters();
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

    function closeLayoutDropdown() {
        const dropdown = document.getElementById('song-layout-dropdown');
        const button = document.getElementById('song-layout-btn');
        if (dropdown) dropdown.classList.add('hidden');
        if (button) button.classList.remove('active');
    }

    function toggleLayoutDropdown() {
        const dropdown = document.getElementById('song-layout-dropdown');
        const button = document.getElementById('song-layout-btn');
        if (!dropdown || !button) return;
        const isVisible = !dropdown.classList.contains('hidden');
        if (isVisible) {
            closeLayoutDropdown();
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
        }
    }

    function updateLayoutDisplay() {
        const display = document.getElementById('song-layout-display');
        if (!display) return;
        const key = layoutColumnCount === 2 ? 'Two Columns' : 'Single Column';
        display.textContent = (translations[currentLanguage] && translations[currentLanguage][key]) || key;
    }

    function selectLayoutOption(value) {
        const layoutSelect = document.getElementById('song-layout-select');
        if (!layoutSelect) return;
        layoutSelect.value = String(parseInt(value, 10) === 2 ? 2 : 1);
        handleLayoutChange({ target: layoutSelect });
        closeLayoutDropdown();
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
        updateLayoutDisplay();
        refreshLineNumberGutters();
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
        refreshLineNumberGutters();
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
                delete textarea.dataset.defaultHeightApplied;
            });
        }
        refreshLineNumberGutters();
    }

    function initializeLineNumberGutters() {
        lineNumberBindings.forEach(({ textareaId, gutterId }) => {
            const textarea = document.getElementById(textareaId);
            const gutter = document.getElementById(gutterId);
            if (!textarea || !gutter) return;

            textarea.addEventListener('input', () => updateGutterForTextarea(textarea, gutter));
            textarea.addEventListener('scroll', () => {
                updateGutterForTextarea(textarea, gutter);
            });
        });

        if (typeof ResizeObserver !== 'undefined') {
            gutterResizeObserver = new ResizeObserver(() => {
                refreshLineNumberGutters();
            });

            lineNumberBindings.forEach(({ textareaId }) => {
                const textarea = document.getElementById(textareaId);
                if (textarea) {
                    gutterResizeObserver.observe(textarea);
                }
            });

            const twoColumnEditor = document.getElementById('two-column-editor');
            if (twoColumnEditor) {
                gutterResizeObserver.observe(twoColumnEditor);
            }
        }
    }

    function getVisualLineCount(textarea) {
        const styles = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(styles.lineHeight) || 16;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;
        const contentHeight = Math.max(0, textarea.scrollHeight - paddingTop - paddingBottom);
        return Math.max(1, Math.ceil(contentHeight / lineHeight));
    }

    function getVisibleLineCapacity(textarea) {
        const styles = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(styles.lineHeight) || 16;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;
        const visibleContentHeight = Math.max(0, textarea.clientHeight - paddingTop - paddingBottom);
        return Math.max(1, Math.floor(visibleContentHeight / lineHeight));
    }

    function setDefaultEditorHeight(textarea) {
        const styles = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(styles.lineHeight) || 16;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const paddingBottom = parseFloat(styles.paddingBottom) || 0;
        let targetHeight = Math.ceil((lineHeight * DEFAULT_VISIBLE_EDITOR_LINES) + paddingTop + paddingBottom);

        if (textarea.id === 'song-content-column1-textarea') {
            const twoColumnEditor = document.getElementById('two-column-editor');
            const column2 = document.getElementById('song-content-column2-textarea');
            if (twoColumnEditor) {
                for (let i = 0; i < 12; i++) {
                    twoColumnEditor.style.height = `${targetHeight}px`;
                    if (getVisibleLineCapacity(textarea) >= DEFAULT_VISIBLE_EDITOR_LINES) {
                        break;
                    }
                    targetHeight += 1;
                }
            }
            textarea.style.height = '';
            if (column2) {
                column2.style.height = '';
            }
            return;
        }

        for (let i = 0; i < 12; i++) {
            textarea.style.height = `${targetHeight}px`;
            if (getVisibleLineCapacity(textarea) >= DEFAULT_VISIBLE_EDITOR_LINES) {
                break;
            }
            targetHeight += 1;
        }
    }

    function buildLineNumbersText(startLine, endLine) {
        const lineCount = Math.max(0, endLine - startLine + 1);
        const lines = new Array(lineCount);
        for (let i = 0; i < lineCount; i++) {
            lines[i] = String(startLine + i);
        }
        return lines.join('\n');
    }

    function updateGutterForTextarea(textarea, gutter) {
        const styles = window.getComputedStyle(textarea);
        gutter.style.fontSize = styles.fontSize;
        gutter.style.lineHeight = styles.lineHeight;
        let content = gutter.querySelector('.line-number-content');
        if (!content) {
            content = document.createElement('span');
            content.className = 'line-number-content';
            gutter.textContent = '';
            gutter.appendChild(content);
        }

        const lineHeight = parseFloat(styles.lineHeight) || 16;
        const lineCount = getVisualLineCount(textarea);
        const visibleLineCapacity = getVisibleLineCapacity(textarea);
        const rawStart = Math.floor(textarea.scrollTop / lineHeight) + 1;
        const startLine = Math.max(1, rawStart);
        const endLine = Math.min(lineCount, startLine + visibleLineCapacity - 1);
        const offset = -(textarea.scrollTop - ((startLine - 1) * lineHeight));

        const previousStart = parseInt(gutter.dataset.startLine || '0', 10);
        const previousEnd = parseInt(gutter.dataset.endLine || '0', 10);
        if (previousStart !== startLine || previousEnd !== endLine) {
            content.textContent = buildLineNumbersText(startLine, endLine);
            gutter.dataset.startLine = String(startLine);
            gutter.dataset.endLine = String(endLine);
        }
        content.style.transform = `translateY(${offset}px)`;
    }

    function refreshLineNumberGutters() {
        lineNumberBindings.forEach(({ textareaId, gutterId }) => {
            const textarea = document.getElementById(textareaId);
            const gutter = document.getElementById(gutterId);
            if (!textarea || !gutter) return;
            if (!textarea.dataset.defaultHeightApplied) {
                setDefaultEditorHeight(textarea);
                textarea.dataset.defaultHeightApplied = 'true';
            }
            updateGutterForTextarea(textarea, gutter);
        });
    }

    function resetDefaultEditorHeights() {
        lineNumberBindings.forEach(({ textareaId }) => {
            const textarea = document.getElementById(textareaId);
            if (!textarea) return;
            delete textarea.dataset.defaultHeightApplied;
        });
    }

    function getSongVersionValue(song) {
        const parsed = parseInt(song && song.Version, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }

    function formatVersionLabel(versionItem) {
        const versionLabel = translations[currentLanguage]['Version'] || 'Version';
        const isOriginal = !!versionItem.IsOriginal;
        const originalSuffix = isOriginal
            ? ` (${translations[currentLanguage]['Original'] || 'Original'})`
            : '';
        return `${versionLabel} ${getSongVersionValue(versionItem)}${originalSuffix}`;
    }

    function getSelectedVersionIndex() {
        const versionId = parseInt(currentSongId, 10);
        return versionList.findIndex((row) => parseInt(row.Id, 10) === versionId);
    }

    function closeSongVersionDropdown() {
        const dropdown = document.getElementById('song-version-select-dropdown');
        const button = document.getElementById('song-version-select-btn');
        if (dropdown) dropdown.classList.add('hidden');
        if (button) button.classList.remove('active');
    }

    function toggleSongVersionDropdown() {
        const dropdown = document.getElementById('song-version-select-dropdown');
        const button = document.getElementById('song-version-select-btn');
        if (!dropdown || !button || button.disabled) return;

        const isVisible = !dropdown.classList.contains('hidden');
        if (isVisible) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
        }
    }

    function setTitleAndFolderReadOnlyState(readOnly) {
        const titleInput = document.getElementById('song-title-input');
        if (titleInput) {
            titleInput.disabled = !!readOnly;
        }
        document.querySelectorAll('.folder-checkbox').forEach((checkbox) => {
            checkbox.disabled = !!readOnly;
        });
    }

    function updateVersionButtonsState() {
        const upBtn = document.getElementById('song-version-up-btn');
        const downBtn = document.getElementById('song-version-down-btn');
        const selectedIndex = getSelectedVersionIndex();
        const hasMultipleVersions = versionList.length > 1;
        if (upBtn) {
            upBtn.disabled = !hasMultipleVersions || selectedIndex <= 0;
        }
        if (downBtn) {
            downBtn.disabled = !hasMultipleVersions || selectedIndex < 0 || selectedIndex >= versionList.length - 1;
        }
    }

    function renderVersionControls(song) {
        const versionManagement = document.getElementById('song-version-management');
        const versionSelectBtn = document.getElementById('song-version-select-btn');
        const versionSelectDisplay = document.getElementById('song-version-select-display');
        const versionSelectDropdown = document.getElementById('song-version-select-dropdown');
        const addVersionBtn = document.getElementById('add-song-version-btn');
        const hasMultipleVersions = versionList.length > 1;
        const isEditing = !!editRootSongId;
        const isOriginalVersion = !!(song && song.isOriginalVersion);

        if (versionManagement) {
            versionManagement.classList.toggle('hidden', !hasMultipleVersions || !isEditing);
        }

        if (addVersionBtn) {
            addVersionBtn.classList.toggle('hidden', !isEditing || isAddVersionMode);
        }

        if (!versionSelectBtn || !versionSelectDisplay || !versionSelectDropdown) return;
        versionSelectDropdown.innerHTML = '';
        versionSelectBtn.disabled = isAddVersionMode;
        closeSongVersionDropdown();

        const currentVersionItem = versionList.find((item) => parseInt(item.Id, 10) === parseInt(currentSongId, 10));
        versionSelectDisplay.textContent = currentVersionItem ? formatVersionLabel(currentVersionItem) : (translations[currentLanguage]['Version'] || 'Version');

        if (hasMultipleVersions && isEditing) {
            versionList.forEach((versionItem) => {
                const option = document.createElement('div');
                option.className = 'custom-dropdown-item';
                option.textContent = formatVersionLabel(versionItem);
                option.dataset.versionId = String(versionItem.Id);
                option.addEventListener('click', async () => {
                    await handleVersionSelectionChange(parseInt(versionItem.Id, 10));
                });
                versionSelectDropdown.appendChild(option);
            });
        }

        const shouldLockTitleAndFolders = isAddVersionMode || (isEditing && !isOriginalVersion);
        setTitleAndFolderReadOnlyState(shouldLockTitleAndFolders);
        updateVersionButtonsState();
        if (isAddVersionMode) {
            const upBtn = document.getElementById('song-version-up-btn');
            const downBtn = document.getElementById('song-version-down-btn');
            if (upBtn) upBtn.disabled = true;
            if (downBtn) downBtn.disabled = true;
        }
    }

    function applySongToForm(song) {
        if (!song) return;
        const savedColumnCount = parseInt(song.LayoutColumnCount, 10) === 2 ? 2 : 1;
        const savedDividerRatio = clampDividerRatio(song.LayoutDividerRatio);

        document.getElementById('song-title-input').value = song.Title || '';
        document.getElementById('song-date-input').value = song.SongDate || '';
        document.getElementById('song-notes-input').value = song.Notes || '';
        document.getElementById('song-key-input').value = song.SongKey || '';
        document.getElementById('song-capo-input').value = song.Capo || '';
        document.getElementById('song-bpm-input').value = song.BPM || '';
        document.getElementById('song-effects-input').value = song.Effects || '';
        document.getElementById('song-content-font-size-input').value = song.SongContentFontSizePt || '';
        const contentColumn1 = song.ContentTextColumn1 || song.ContentText || '';
        document.getElementById('song-content-textarea').value = contentColumn1;
        document.getElementById('song-content-column1-textarea').value = contentColumn1;
        document.getElementById('song-content-column2-textarea').value = song.ContentTextColumn2 || '';

        layoutDividerRatio = savedDividerRatio;
        resetDefaultEditorHeights();
        setLayoutColumnCount(savedColumnCount);
        applyDividerPosition();
        updateContentFontSize();
        refreshLineNumberGutters();
        selectedChordIds = song.chordIds || [];
    }

    async function loadSongForEditing(songId, options = {}) {
        const song = await SONGS_SERVICE.getSongById(songId);
        if (!song) {
            alert(translations[currentLanguage]['Song not found'] || 'Song not found');
            return false;
        }

        currentSongId = parseInt(song.Id, 10);
        applySongToForm(song);
        await updateSelectedChordsList();
        const folderIds = song.folderIds || [];
        document.querySelectorAll('.folder-checkbox').forEach(cb => {
            cb.checked = folderIds.includes(parseInt(cb.value, 10));
        });

        const fetchedVersions = Array.isArray(song.versions) ? [...song.versions].sort((a, b) => getSongVersionValue(a) - getSongVersionValue(b)) : [];
        versionList = fetchedVersions;
        if (!versionList.length) {
            versionList = [{ Id: song.Id, Version: getSongVersionValue(song), IsOriginal: !!song.isOriginalVersion }];
        }
        if (!editRootSongId && options.rootSongId) {
            editRootSongId = options.rootSongId;
        }
        renderVersionControls(song);
        return true;
    }

    function buildSongPayloadFromForm() {
        const singleContentText = document.getElementById('song-content-textarea').value;
        const column1Text = document.getElementById('song-content-column1-textarea').value;
        const column2Text = document.getElementById('song-content-column2-textarea').value;
        const selectedFolders = Array.from(document.querySelectorAll('.folder-checkbox:checked')).map(cb => parseInt(cb.value, 10));
        const effectiveContentText = layoutColumnCount === 2
            ? buildCombinedTextFromColumns(column1Text, column2Text)
            : singleContentText;

        return {
            title: document.getElementById('song-title-input').value.trim(),
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
    }

    async function handleVersionSelectionChange(versionSongId) {
        closeSongVersionDropdown();
        if (!Number.isFinite(versionSongId) || versionSongId <= 0) return;
        if (versionSongId === currentSongId) return;
        isAddVersionMode = false;
        await loadSongForEditing(versionSongId);
    }

    async function moveSelectedVersion(offset) {
        const selectedIndex = getSelectedVersionIndex();
        const targetIndex = selectedIndex + offset;
        if (selectedIndex < 0 || targetIndex < 0 || targetIndex >= versionList.length) return;

        const reordered = [...versionList];
        const [moved] = reordered.splice(selectedIndex, 1);
        reordered.splice(targetIndex, 0, moved);
        const orderedSongIds = reordered.map((item) => parseInt(item.Id, 10)).filter((id) => Number.isFinite(id) && id > 0);

        try {
            await SONGS_SERVICE.reorderSongVersions(currentSongId, orderedSongIds);
            versionList = reordered.map((item, index) => ({ ...item, Version: index + 1 }));
            const selectedSong = await SONGS_SERVICE.getSongById(currentSongId);
            if (selectedSong) {
                versionList = Array.isArray(selectedSong.versions) ? selectedSong.versions : versionList;
                renderVersionControls(selectedSong);
            }
        } catch (error) {
            alert(error.message || (translations[currentLanguage]['Error saving song: '] + 'Unable to reorder versions'));
        }
    }

    async function openAddVersionForm() {
        if (!currentSongId) return;
        isAddVersionMode = true;
        versionSourceSongId = currentSongId;
        const song = await SONGS_SERVICE.getSongById(currentSongId);
        if (!song) {
            alert(translations[currentLanguage]['Song not found'] || 'Song not found');
            return;
        }

        applySongToForm(song);
        await updateSelectedChordsList();
        const folderIds = song.folderIds || [];
        document.querySelectorAll('.folder-checkbox').forEach(cb => {
            cb.checked = folderIds.includes(parseInt(cb.value, 10));
        });
        renderVersionControls(song);
    }

    async function openEditor(songId = null) {
        currentSongId = songId;
        editRootSongId = null;
        versionSourceSongId = songId;
        versionList = [];
        isAddVersionMode = false;
        selectedChordIds = [];
        await refreshFolderCheckboxes();
        if (songId) {
            const entrySong = await SONGS_SERVICE.getSongById(songId);
            if (!entrySong) {
                alert(translations[currentLanguage]['Song not found'] || 'Song not found');
                return;
            }

            versionList = Array.isArray(entrySong.versions)
                ? [...entrySong.versions].sort((a, b) => getSongVersionValue(a) - getSongVersionValue(b))
                : [];
            if (!versionList.length) {
                versionList = [{ Id: entrySong.Id, Version: getSongVersionValue(entrySong), IsOriginal: !!entrySong.isOriginalVersion }];
            }

            const originalVersion = versionList.find((item) => getSongVersionValue(item) === 1) || versionList[0];
            const originalVersionId = parseInt(originalVersion && originalVersion.Id, 10);
            editRootSongId = Number.isFinite(originalVersionId) && originalVersionId > 0 ? originalVersionId : parseInt(entrySong.Id, 10);

            const requestedVersion = versionList.find((item) => parseInt(item.Id, 10) === parseInt(songId, 10));
            const initialVersionId = requestedVersion
                ? parseInt(requestedVersion.Id, 10)
                : editRootSongId;

            const loaded = await loadSongForEditing(initialVersionId, { rootSongId: editRootSongId });
            if (!loaded) return;
        } else {
            currentSongId = null;
            editRootSongId = null;
            versionSourceSongId = null;
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
            resetDefaultEditorHeights();
            setLayoutColumnCount(1);
            applyDividerPosition();
            updateContentFontSize();
            refreshLineNumberGutters();
            document.querySelectorAll('.folder-checkbox').forEach(cb => {
                cb.checked = false;
                cb.disabled = false;
            });
            updateSelectedChordsList();
            const versionManagement = document.getElementById('song-version-management');
            const addVersionBtn = document.getElementById('add-song-version-btn');
            if (versionManagement) versionManagement.classList.add('hidden');
            if (addVersionBtn) addVersionBtn.classList.add('hidden');
            setTitleAndFolderReadOnlyState(false);
        }
        document.getElementById('song-editor-modal').classList.remove('hidden');
        applyDividerPosition();
        refreshLineNumberGutters();
    }
    
    function closeEditor() {
        document.getElementById('song-editor-modal').classList.add('hidden');
        currentSongId = null;
        editRootSongId = null;
        versionSourceSongId = null;
        versionList = [];
        isAddVersionMode = false;
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
        if (!container) {
            console.error('Song editor folder container not found (#folder-selection)');
            return;
        }
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
        const songData = buildSongPayloadFromForm();
        const title = songData.title;
        if (!title) {
            alert(translations[currentLanguage]['Title is required'] || 'Title is required');
            return;
        }
        const effectiveContentText = songData.contentText;

        if (!effectiveContentText.trim()) {
            alert(translations[currentLanguage]['Song content cannot be empty'] || 'Song content cannot be empty');
            return;
        }
        const fontSizeValue = document.getElementById('song-content-font-size-input').value.trim();
        if (fontSizeValue && (parseFloat(fontSizeValue) < 6 || parseFloat(fontSizeValue) > 72)) {
            alert(translations[currentLanguage]['Font size must be between 6 and 72 pt'] || 'Font size must be between 6 and 72 pt');
            return;
        }
        try {
            if (isAddVersionMode && versionSourceSongId) {
                await SONGS_SERVICE.addSongVersion(versionSourceSongId, songData);
                alert(translations[currentLanguage]['Song version created successfully!'] || 'Song version created successfully!');
            } else if (currentSongId) {
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
            const localizedMessage = (translations[currentLanguage] && translations[currentLanguage][error.message]) || error.message;
            alert((translations[currentLanguage]['Error saving song: '] || 'Error saving song: ') + localizedMessage);
        }
    }

    document.addEventListener('click', (event) => {
        const versionDropdown = document.getElementById('song-version-select-dropdown');
        const versionButton = document.getElementById('song-version-select-btn');
        if (versionDropdown && versionButton && !versionButton.contains(event.target) && !versionDropdown.contains(event.target)) {
            closeSongVersionDropdown();
        }

        const layoutDropdown = document.getElementById('song-layout-dropdown');
        const layoutButton = document.getElementById('song-layout-btn');
        if (layoutDropdown && layoutButton && !layoutButton.contains(event.target) && !layoutDropdown.contains(event.target)) {
            closeLayoutDropdown();
        }
    });
    
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

