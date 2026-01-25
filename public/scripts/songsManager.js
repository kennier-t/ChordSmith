const SongsManager = (function() {
    'use strict';
    
    let currentFolderId = null;
    let currentSortMode = 'date-asc'; // Default: oldest first for folders
    let currentAllSongsSortMode = 'key'; // Default: sort by key for ALL view
    let selectedValues = {}; // Selected values for each sort mode, e.g. {key: ['A', 'C'], folder: ['Folder1']}
    const ALL_FOLDER_ID = '__ALL__'; // Special ID for the ALL folder
    
    function initialize() {
        document.getElementById('open-songs-btn').addEventListener('click', openSongsView);
        document.getElementById('close-songs-modal').addEventListener('click', closeSongsModal);
        document.getElementById('create-new-folder-btn').addEventListener('click', createNewFolder);
        document.getElementById('create-new-song-btn').addEventListener('click', async () => {
            const folders = await SONGS_SERVICE.getAllFolders();
            if (folders.length === 0) {
                alert(translations[currentLanguage]['Please create at least one folder before creating a song.'] || 'Please create at least one folder before creating a song.');
                return;
            }
            SongEditor.openEditor();
        });
        document.getElementById('back-to-folders-btn').addEventListener('click', showFoldersView);
        document.getElementById('folder-sort-select').addEventListener('change', (e) => {
            currentSortMode = e.target.value;
            refreshFoldersList();
        });
    }
    
    function openSongsView() {
        document.getElementById('songs-modal').classList.remove('hidden');
        showFoldersView();
    }
    
    function closeSongsModal() {
        document.getElementById('songs-modal').classList.add('hidden');
    }
    
    async function showFoldersView() {
        currentFolderId = null;
        document.getElementById('folders-view').classList.remove('hidden');
        document.getElementById('songs-list-view').classList.add('hidden');
        await refreshFoldersList();
    }
    
    async function showSongsListView(folderId) {
        currentFolderId = folderId;
        
        const folderTitleElement = document.getElementById('folder-title');
        const sortControlContainer = document.getElementById('all-songs-sort-control');
        
        // Check if this is the ALL folder
        if (folderId === ALL_FOLDER_ID) {
            const allLabel = translations[currentLanguage]['All'] || 'All';
            folderTitleElement.innerHTML = allLabel;
            
            // Show the sort control for ALL view
            if (sortControlContainer) {
                sortControlContainer.classList.remove('hidden');
                // Set the current sort mode in the dropdown
                const sortDisplay = document.getElementById('all-songs-sort-display');
                if (sortDisplay) {
                    const translationsMap = {
                        'key': translations[currentLanguage]['Key'] || 'Key',
                        'folder': translations[currentLanguage]['Folder'] || 'Folder',
                        'artist': translations[currentLanguage]['Artist'] || 'Artist'
                    };
                    sortDisplay.textContent = translationsMap[currentAllSongsSortMode] || currentAllSongsSortMode;
                }
            }

            // Initialize value filter for ALL view
            updateValueFilter([], []);

            document.getElementById('folders-view').classList.add('hidden');
            document.getElementById('songs-list-view').classList.remove('hidden');
            await refreshAllSongsView();
        } else {
            // Regular folder view
            const folders = await SONGS_SERVICE.getAllFolders();
            const folder = folders.find(f => f.Id === folderId);
            
            if (folder) {
                folderTitleElement.innerHTML = `
                    ${folder.Name}
                    <div class="folder-header-actions">
                        <button class="action-btn" onclick="SongsManager.renameFolder(${folder.Id}, '${folder.Name.replace(/'/g, "\\'")}')" data-translate="Rename"></button>
                        <button class="action-btn delete-btn" onclick="SongsManager.deleteFolder(${folder.Id})" data-translate="Delete"></button>
                    </div>
                `;
                translatePage();
            } else {
                folderTitleElement.textContent = 'All Songs';
            }
            
            // Hide the sort control for regular folder view
            if (sortControlContainer) {
                sortControlContainer.classList.add('hidden');
            }
            
            document.getElementById('folders-view').classList.add('hidden');
            document.getElementById('songs-list-view').classList.remove('hidden');
            await refreshSongsList(folderId);
        }
    }
    
    function sortFolders(folders, foldersWithSongCounts, sortMode) {
        const sorted = [...foldersWithSongCounts];
        
        switch (sortMode) {
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.folder.createdDate) - new Date(b.folder.createdDate));
                break;
            case 'date-desc':
                sorted.sort((a, b) => new Date(b.folder.createdDate) - new Date(a.folder.createdDate));
                break;
            case 'name-asc':
                sorted.sort((a, b) => a.folder.Name.localeCompare(b.folder.Name));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.folder.Name.localeCompare(a.folder.Name));
                break;
            case 'songs-desc':
                sorted.sort((a, b) => b.songCount - a.songCount);
                break;
            case 'songs-asc':
                sorted.sort((a, b) => a.songCount - b.songCount);
                break;
        }
        
        return sorted;
    }
    
    async function refreshFoldersList() {
        const container = document.getElementById('folders-list');
        const folders = await SONGS_SERVICE.getAllFolders();
        const allSongs = await SONGS_SERVICE.getAllSongs();
        
        container.innerHTML = '';
        
        // Always add the ALL folder first (pinned at top)
        const allFolderItem = createAllFolderItem(allSongs.length);
        container.appendChild(allFolderItem);
        
        if (folders.length === 0) {
            // Still show the ALL folder even if no other folders exist
            return;
        }
        
        // Get song counts for all folders
        const foldersWithSongCounts = [];
        for (const folder of folders) {
            const songs = await SONGS_SERVICE.getSongsByFolder(folder.Id);
            foldersWithSongCounts.push({
                folder: folder,
                songCount: songs.length
            });
        }
        
        // Sort folders based on current sort mode
        const sortedFolders = sortFolders(folders, foldersWithSongCounts, currentSortMode);
        
        for (const { folder, songCount } of sortedFolders) {
            const item = document.createElement('div');
            item.className = 'folder-item';
            item.onclick = () => showSongsListView(folder.Id);
            const songWord = songCount !== 1
                ? (translations[currentLanguage]['songs'] || 'songs')
                : (translations[currentLanguage]['song'] || 'song');
            item.innerHTML = `
                <div class="folder-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="folder-info">
                    <h3>${folder.Name}</h3>
                    <span class="song-count">${songCount} ${songWord}</span>
                </div>
            `;
            container.appendChild(item);
        }
    }
    
    function createAllFolderItem(songCount) {
        const item = document.createElement('div');
        item.className = 'folder-item folder-item-all';
        item.onclick = () => showSongsListView(ALL_FOLDER_ID);
        
        const allLabel = translations[currentLanguage]['All'] || 'All';
        const songWord = songCount !== 1
            ? (translations[currentLanguage]['songs'] || 'songs')
            : (translations[currentLanguage]['song'] || 'song');
        
        item.innerHTML = `
            <div class="folder-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="folder-info">
                <h3>${allLabel}</h3>
                <span class="song-count">${songCount} ${songWord}</span>
            </div>
        `;
        
        return item;
    }
    
    async function refreshAllSongsView() {
        const container = document.getElementById('songs-list');
        const allSongs = await SONGS_SERVICE.getAllSongs();
        const folders = await SONGS_SERVICE.getAllFolders();

        container.innerHTML = '';

        if (allSongs.length === 0) {
            container.innerHTML = '<div class="empty-message" data-translate="No songs in this folder. Create your first song!">No songs in this folder. Create your first song!</div>';
            translatePage();
            return;
        }

        // Update value filter with available values
        await updateValueFilter(allSongs, folders);

        if (currentAllSongsSortMode === 'key') {
            await renderSongsGroupedByKey(container, allSongs);
        } else if (currentAllSongsSortMode === 'folder') {
            await renderSongsGroupedByFolder(container, allSongs, folders);
        } else if (currentAllSongsSortMode === 'artist') {
            await renderSongsGroupedByArtist(container, allSongs);
        }

        translatePage();
    }

    async function updateValueFilter(songs, folders) {
        const dropdownElement = document.getElementById('value-dropdown');
        const displayElement = document.getElementById('value-filter-display');
        if (!dropdownElement || !displayElement) return;

        // Ensure all sort modes have default selections
        if (!selectedValues['key']) selectedValues['key'] = [];
        if (!selectedValues['folder']) selectedValues['folder'] = [];
        if (!selectedValues['artist']) selectedValues['artist'] = [];

        let availableValues = [];

        if (currentAllSongsSortMode === 'key') {
            // Get unique keys
            const keys = new Set();
            for (const song of songs) {
                const key = song.songKey && song.songKey.trim()
                    ? song.songKey.trim()
                    : (translations[currentLanguage]['Unknown'] || 'Unknown');
                keys.add(key);
            }
            availableValues = Array.from(keys).sort((a, b) => {
                const unknownLabel = translations[currentLanguage]['Unknown'] || 'Unknown';
                if (a === unknownLabel) return 1;
                if (b === unknownLabel) return -1;
                return a.localeCompare(b);
            });
        } else if (currentAllSongsSortMode === 'folder') {
            // Get unique folder names
            const folderNames = new Set();
            const folderMap = {};
            for (const folder of folders) {
                folderMap[folder.Id] = folder.Name;
            }

            for (const song of songs) {
                const songFolders = await SONGS_SERVICE.getSongFolders(song.Id);
                if (songFolders.length === 0) {
                    folderNames.add(translations[currentLanguage]['Uncategorized'] || 'Uncategorized');
                } else {
                    for (const folder of songFolders) {
                        const folderName = folderMap[folder.Id] || folder.Name;
                        folderNames.add(folderName);
                    }
                }
            }
            availableValues = Array.from(folderNames).sort();
        } else if (currentAllSongsSortMode === 'artist') {
            // Get unique artists
            const artists = new Set();
            for (const song of songs) {
                const titleParts = song.Title.split(' - ');
                const artist = titleParts.length > 1 && titleParts[1].trim()
                    ? titleParts[1].trim()
                    : (translations[currentLanguage]['Unknown'] || 'Unknown');
                artists.add(artist);
            }
            availableValues = Array.from(artists).sort((a, b) => {
                const unknownLabel = translations[currentLanguage]['Unknown'] || 'Unknown';
                if (a === unknownLabel) return 1;
                if (b === unknownLabel) return -1;
                return a.localeCompare(b);
            });
        }

        // Initialize selected values if not set or empty
        if (!selectedValues[currentAllSongsSortMode] || selectedValues[currentAllSongsSortMode].length === 0) {
            selectedValues[currentAllSongsSortMode] = [...availableValues];
        }

        // Update display text
        const selectedCount = selectedValues[currentAllSongsSortMode].length;
        const totalCount = availableValues.length;
        if (selectedCount === totalCount) {
            displayElement.textContent = translations[currentLanguage]['All'] || 'All';
        } else {
            displayElement.textContent = `${selectedCount} of ${totalCount}`;
        }

        // Clear existing options
        dropdownElement.innerHTML = '';

        // Add options with checkboxes
        availableValues.forEach(value => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `value-${currentAllSongsSortMode}-${value.replace(/\s+/g, '-').toLowerCase()}`;
            checkbox.value = value;
            checkbox.checked = selectedValues[currentAllSongsSortMode].includes(value);
            checkbox.onchange = () => handleValueCheckboxChange(currentAllSongsSortMode, value, checkbox.checked);

            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = value;

            item.appendChild(checkbox);
            item.appendChild(label);
            dropdownElement.appendChild(item);
        });
    }

    function handleValueCheckboxChange(sortMode, value, isChecked) {
        if (!selectedValues[sortMode]) {
            selectedValues[sortMode] = [];
        }

        if (isChecked) {
            if (!selectedValues[sortMode].includes(value)) {
                selectedValues[sortMode].push(value);
            }
        } else {
            selectedValues[sortMode] = selectedValues[sortMode].filter(v => v !== value);
        }

        // Update display and refresh view
        updateValueFilterDisplay();
        refreshAllSongsView();
    }

    function updateValueFilterDisplay() {
        const displayElement = document.getElementById('value-filter-display');
        if (!displayElement) return;

        const selectedCount = selectedValues[currentAllSongsSortMode]?.length || 0;
        const totalCount = document.querySelectorAll('#value-dropdown .custom-dropdown-item').length;

        if (selectedCount === totalCount) {
            displayElement.textContent = translations[currentLanguage]['All'] || 'All';
        } else {
            displayElement.textContent = `${selectedCount} of ${totalCount}`;
        }
    }

    function toggleValueDropdown() {
        const dropdown = document.getElementById('value-dropdown');
        const button = document.getElementById('value-filter-btn');

        if (!dropdown || !button) return;

        const isVisible = !dropdown.classList.contains('hidden');

        if (isVisible) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
        }
    }

    function toggleSortDropdown() {
        const dropdown = document.getElementById('all-songs-sort-dropdown');
        const button = document.getElementById('all-songs-sort-btn');

        if (!dropdown || !button) return;

        const isVisible = !dropdown.classList.contains('hidden');

        if (isVisible) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
        }
    }

    function selectSortOption(value) {
        currentAllSongsSortMode = value;
        const displayElement = document.getElementById('all-songs-sort-display');
        if (displayElement) {
            const translationsMap = {
                'key': translations[currentLanguage]['Key'] || 'Key',
                'folder': translations[currentLanguage]['Folder'] || 'Folder',
                'artist': translations[currentLanguage]['Artist'] || 'Artist'
            };
            displayElement.textContent = translationsMap[value] || value;
        }
        toggleSortDropdown(); // Close the dropdown
        handleAllSongsSortChange(value);
    }

    async function renderSongsGroupedByKey(container, songs) {
        // Group songs by key, deduplicating by song id
        const songsByKey = {};
        const seenIds = new Set();
        
        for (const song of songs) {
            if (seenIds.has(song.Id)) continue;
            seenIds.add(song.Id);
            
            const key = song.songKey && song.songKey.trim() 
                ? song.songKey.trim() 
                : (translations[currentLanguage]['Unknown'] || 'Unknown');
            
            if (!songsByKey[key]) {
                songsByKey[key] = [];
            }
            songsByKey[key].push(song);
        }
        
        // Sort keys alphabetically, but put "Unknown" at the end
        const unknownLabel = translations[currentLanguage]['Unknown'] || 'Unknown';
        const sortedKeys = Object.keys(songsByKey).sort((a, b) => {
            if (a === unknownLabel) return 1;
            if (b === unknownLabel) return -1;
            return a.localeCompare(b);
        });
        
        // Filter keys based on selected values
        const selectedKeys = selectedValues[currentAllSongsSortMode] || sortedKeys;
        const filteredKeys = sortedKeys.filter(key => selectedKeys.includes(key));

        // Render each group
        for (const key of filteredKeys) {
            const groupSongs = songsByKey[key];
            const songCount = groupSongs.length;
            const songWord = songCount !== 1
                ? (translations[currentLanguage]['songs'] || 'songs')
                : (translations[currentLanguage]['song'] || 'song');

            // Create group header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'song-group-header';
            groupHeader.innerHTML = `
                <h4>${key}</h4>
                <span class="group-count">${songCount} ${songWord}</span>
            `;
            container.appendChild(groupHeader);

            // Create songs in this group
            for (const song of groupSongs) {
                const item = createSongItem(song);
                container.appendChild(item);
            }
        }
    }
    
    async function renderSongsGroupedByFolder(container, songs, folders) {
        // Create a map of folder id to folder name
        const folderMap = {};
        for (const folder of folders) {
            folderMap[folder.Id] = folder.Name;
        }
        
        // Group songs by folder
        // A song can appear in multiple folders, so we need to check each song's folders
        const songsByFolder = {};
        const uncategorizedSongs = [];
        
        for (const song of songs) {
            const songFolders = await SONGS_SERVICE.getSongFolders(song.Id);
            
            if (songFolders.length === 0) {
                uncategorizedSongs.push(song);
            } else {
                for (const folder of songFolders) {
                    const folderName = folderMap[folder.Id] || folder.Name;
                    if (!songsByFolder[folderName]) {
                        songsByFolder[folderName] = [];
                    }
                    songsByFolder[folderName].push(song);
                }
            }
        }
        
        // Sort folder names alphabetically
        const sortedFolderNames = Object.keys(songsByFolder).sort((a, b) => a.localeCompare(b));

        // Filter folder names based on selected values
        const selectedFolders = selectedValues[currentAllSongsSortMode] || sortedFolderNames;
        const filteredFolderNames = sortedFolderNames.filter(name => selectedFolders.includes(name));

        // Render each folder group
        for (const folderName of filteredFolderNames) {
            const groupSongs = songsByFolder[folderName];
            const songCount = groupSongs.length;
            const songWord = songCount !== 1
                ? (translations[currentLanguage]['songs'] || 'songs')
                : (translations[currentLanguage]['song'] || 'song');
            
            // Create group header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'song-group-header';
            groupHeader.innerHTML = `
                <h4>${folderName}</h4>
                <span class="group-count">${songCount} ${songWord}</span>
            `;
            container.appendChild(groupHeader);
            
            // Create songs in this group
            for (const song of groupSongs) {
                const item = createSongItem(song);
                container.appendChild(item);
            }
        }
        
        // Render uncategorized songs at the end if selected
        if (uncategorizedSongs.length > 0) {
            const uncategorizedLabel = translations[currentLanguage]['Uncategorized'] || 'Uncategorized';
            const selectedFolders = selectedValues[currentAllSongsSortMode] || [...sortedFolderNames, uncategorizedLabel];

            if (selectedFolders.includes(uncategorizedLabel)) {
                const songCount = uncategorizedSongs.length;
                const songWord = songCount !== 1
                    ? (translations[currentLanguage]['songs'] || 'songs')
                    : (translations[currentLanguage]['song'] || 'song');

                const groupHeader = document.createElement('div');
                groupHeader.className = 'song-group-header';
                groupHeader.innerHTML = `
                    <h4>${uncategorizedLabel}</h4>
                    <span class="group-count">${songCount} ${songWord}</span>
                `;
                container.appendChild(groupHeader);

                for (const song of uncategorizedSongs) {
                    const item = createSongItem(song);
                    container.appendChild(item);
                }
            }
        }
    }

    async function renderSongsGroupedByArtist(container, songs) {
        // Group songs by artist, deduplicating by song id
        const songsByArtist = {};
        const seenIds = new Set();

        for (const song of songs) {
            if (seenIds.has(song.Id)) continue;
            seenIds.add(song.Id);

            // Extract artist from title: "Song Name - Artist"
            const titleParts = song.Title.split(' - ');
            const artist = titleParts.length > 1 && titleParts[1].trim()
                ? titleParts[1].trim()
                : (translations[currentLanguage]['Unknown'] || 'Unknown');

            if (!songsByArtist[artist]) {
                songsByArtist[artist] = [];
            }
            songsByArtist[artist].push(song);
        }

        // Sort artists alphabetically, but put "Unknown" at the end
        const unknownLabel = translations[currentLanguage]['Unknown'] || 'Unknown';
        const sortedArtists = Object.keys(songsByArtist).sort((a, b) => {
            if (a === unknownLabel) return 1;
            if (b === unknownLabel) return -1;
            return a.localeCompare(b);
        });

        // Filter artists based on selected values
        const selectedArtists = selectedValues[currentAllSongsSortMode] || sortedArtists;
        const filteredArtists = sortedArtists.filter(artist => selectedArtists.includes(artist));

        // Render each group
        for (const artist of filteredArtists) {
            const groupSongs = songsByArtist[artist];
            const songCount = groupSongs.length;
            const songWord = songCount !== 1
                ? (translations[currentLanguage]['songs'] || 'songs')
                : (translations[currentLanguage]['song'] || 'song');

            // Create group header
            const groupHeader = document.createElement('div');
            groupHeader.className = 'song-group-header';
            groupHeader.innerHTML = `
                <h4>${artist}</h4>
                <span class="group-count">${songCount} ${songWord}</span>
            `;
            container.appendChild(groupHeader);

            // Create songs in this group
            for (const song of groupSongs) {
                const item = createSongItem(song);
                container.appendChild(item);
            }
        }
    }

    function createSongItem(song) {
        const item = document.createElement('div');
        item.className = 'song-item';
        item.innerHTML = `
            <div class="song-info">
                <h3>${song.Title}</h3>
                <div class="song-meta">
                    ${song.songKey ? `Key: ${song.songKey}` : ''} 
                    ${song.capo ? `• Capo: ${song.capo}` : ''}
                    ${song.bpm ? `• BPM: ${song.bpm}` : ''}
                </div>
            </div>
            <div class="song-actions">
                <button class="action-btn" onclick="SongsManager.editSong(${song.Id})" data-translate="Edit"></button>
                <button class="action-btn" onclick="SongsManager.downloadSongPDF(${song.Id})">PDF</button>
                <button class="action-btn delete-btn" onclick="SongsManager.deleteSong(${song.Id})" data-translate="Delete"></button>
            </div>
        `;
        return item;
    }
    
    async function refreshSongsList(folderId) {
        const container = document.getElementById('songs-list');
        const songs = folderId ? await SONGS_SERVICE.getSongsByFolder(folderId) : await SONGS_SERVICE.getAllSongs();
        
        container.innerHTML = '';
        
        if (songs.length === 0) {
            container.innerHTML = '<div class="empty-message" data-translate="No songs in this folder. Create your first song!">No songs in this folder. Create your first song!</div>';
            translatePage();
            return;
        }
        
        songs.forEach(song => {
            const item = createSongItem(song);
            container.appendChild(item);
        });
        translatePage();
    }
    
    async function createNewFolder() {
        const name = prompt(translations[currentLanguage]['Enter folder name:'] || 'Enter folder name:');
        if (name && name.trim()) {
            await SONGS_SERVICE.createFolder(name.trim());
            await refreshFoldersList();
        }
    }
    
    async function renameFolder(folderId, currentName) {
        const newName = prompt(translations[currentLanguage]['Enter new folder name:'] || 'Enter new folder name:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            await SONGS_SERVICE.renameFolder(folderId, newName.trim());
            await refreshFoldersList();
        }
    }
    
    async function deleteFolder(folderId) {
        if (confirm(translations[currentLanguage]['Delete this folder? Songs will not be deleted, only removed from this folder.'] || 'Delete this folder? Songs will not be deleted, only removed from this folder.')) {
            await SONGS_SERVICE.deleteFolder(folderId);
            await refreshFoldersList();
        }
    }
    
    function editSong(songId) {
        SongEditor.openEditor(songId);
    }
    
    async function downloadSongPDF(songId) {
        const song = await SONGS_SERVICE.getSongById(songId);
        if (!song) {
            alert('Song not found');
            return;
        }
        
        const chordIds = await SONGS_SERVICE.getSongChordDiagrams(songId);
        await SongPDFGenerator.downloadPDF(song, chordIds, `${song.Title}.pdf`);
    }
    
    async function deleteSong(songId) {
        const song = await SONGS_SERVICE.getSongById(songId);
        if (confirm(`${translations[currentLanguage]['Delete song'] || 'Delete song'} "${song.Title}"?`)) {
            await SONGS_SERVICE.deleteSong(songId);
            // Refresh the appropriate view
            if (currentFolderId === ALL_FOLDER_ID) {
                await refreshAllSongsView();
            } else {
                await refreshSongsList(currentFolderId);
            }
        }
    }
    
    // Handle sort mode change for ALL view
    function handleAllSongsSortChange(sortMode) {
        currentAllSongsSortMode = sortMode;
        refreshAllSongsView();
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('value-dropdown');
        const button = document.getElementById('value-filter-btn');

        if (dropdown && button && !button.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
        }
    });
    
    document.addEventListener('DOMContentLoaded', initialize);
    
    return {
        openSongsView,
        closeSongsModal,
        showFoldersView,
        showSongsListView,
        createNewFolder,
        renameFolder,
        deleteFolder,
        editSong,
        downloadSongPDF,
        deleteSong,
        refreshFoldersList,
        refreshSongsList,
        refreshAllSongsView,
        handleAllSongsSortChange,
        toggleValueDropdown,
        toggleSortDropdown,
        selectSortOption
    };
})();
