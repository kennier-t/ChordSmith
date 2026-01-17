const SongsManager = (function() {
    'use strict';
    
    let currentFolderId = null;
    let currentSortMode = 'date-asc'; // Default: oldest first
    
    function initialize() {
        document.getElementById('open-songs-btn').addEventListener('click', openSongsView);
        document.getElementById('close-songs-modal').addEventListener('click', closeSongsModal);
        document.getElementById('create-new-folder-btn').addEventListener('click', createNewFolder);
        document.getElementById('create-new-song-btn').addEventListener('click', () => {
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
        const folders = await SONGS_SERVICE.getAllFolders();
        const folder = folders.find(f => f.id === folderId);
        
        const folderTitleElement = document.getElementById('folder-title');
        if (folder) {
            folderTitleElement.innerHTML = `
                ${folder.name}
                <div class="folder-header-actions">
                    <button class="action-btn" onclick="SongsManager.renameFolder(${folder.id}, '${folder.name.replace(/'/g, "\\'")}')">Rename</button>
                    <button class="action-btn delete-btn" onclick="SongsManager.deleteFolder(${folder.id})">Delete</button>
                </div>
            `;
        } else {
            folderTitleElement.textContent = 'All Songs';
        }
        
        document.getElementById('folders-view').classList.add('hidden');
        document.getElementById('songs-list-view').classList.remove('hidden');
        await refreshSongsList(folderId);
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
                sorted.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
                break;
            case 'name-desc':
                sorted.sort((a, b) => b.folder.name.localeCompare(a.folder.name));
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
        
        container.innerHTML = '';
        
        if (folders.length === 0) {
            container.innerHTML = '<div class="empty-message">No folders yet. Create one to organize your songs!</div>';
            return;
        }
        
        // Get song counts for all folders
        const foldersWithSongCounts = [];
        for (const folder of folders) {
            const songs = await SONGS_SERVICE.getSongsByFolder(folder.id);
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
            item.onclick = () => showSongsListView(folder.id);
            item.innerHTML = `
                <div class="folder-icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 8.2C3 7.07989 3 6.51984 3.21799 6.09202C3.40973 5.71569 3.71569 5.40973 4.09202 5.21799C4.51984 5 5.0799 5 6.2 5H9.67452C10.1637 5 10.4083 5 10.6385 5.05526C10.8425 5.10425 11.0376 5.18506 11.2166 5.29472C11.4184 5.4184 11.5914 5.59135 11.9373 5.93726L12.0627 6.06274C12.4086 6.40865 12.5816 6.5816 12.7834 6.70528C12.9624 6.81494 13.1575 6.89575 13.3615 6.94474C13.5917 7 13.8363 7 14.3255 7H17.8C18.9201 7 19.4802 7 19.908 7.21799C20.2843 7.40973 20.5903 7.71569 20.782 8.09202C21 8.51984 21 9.0799 21 10.2V15.8C21 16.9201 21 17.4802 20.782 17.908C20.5903 18.2843 20.2843 18.5903 19.908 18.782C19.4802 19 18.9201 19 17.8 19H6.2C5.07989 19 4.51984 19 4.09202 18.782C3.71569 18.5903 3.40973 18.2843 3.21799 17.908C3 17.4802 3 16.9201 3 15.8V8.2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                <div class="folder-info">
                    <h3>${folder.name}</h3>
                    <span class="song-count">${songCount} song${songCount !== 1 ? 's' : ''}</span>
                </div>
            `;
            container.appendChild(item);
        }
    }
    
    async function refreshSongsList(folderId) {
        const container = document.getElementById('songs-list');
        const songs = folderId ? await SONGS_SERVICE.getSongsByFolder(folderId) : await SONGS_SERVICE.getAllSongs();
        
        container.innerHTML = '';
        
        if (songs.length === 0) {
            container.innerHTML = '<div class="empty-message">No songs in this folder. Create your first song!</div>';
            return;
        }
        
        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'song-item';
            item.innerHTML = `
                <div class="song-info">
                    <h3>${song.title}</h3>
                    <div class="song-meta">
                        ${song.songKey ? `Key: ${song.songKey}` : ''} 
                        ${song.capo ? `• Capo: ${song.capo}` : ''}
                        ${song.bpm ? `• BPM: ${song.bpm}` : ''}
                    </div>
                </div>
                <div class="song-actions">
                    <button class="action-btn" onclick="SongsManager.editSong(${song.id})">Edit</button>
                    <button class="action-btn" onclick="SongsManager.downloadSongPDF(${song.id})">PDF</button>
                    <button class="action-btn delete-btn" onclick="SongsManager.deleteSong(${song.id})">Delete</button>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    async function createNewFolder() {
        const name = prompt('Enter folder name:');
        if (name && name.trim()) {
            await SONGS_SERVICE.createFolder(name.trim());
            await refreshFoldersList();
        }
    }
    
    async function renameFolder(folderId, currentName) {
        const newName = prompt('Enter new folder name:', currentName);
        if (newName && newName.trim() && newName.trim() !== currentName) {
            await SONGS_SERVICE.renameFolder(folderId, newName.trim());
            await refreshFoldersList();
        }
    }
    
    async function deleteFolder(folderId) {
        if (confirm('Delete this folder? Songs will not be deleted, only removed from this folder.')) {
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
        await SongPDFGenerator.downloadPDF(song, chordIds, `${song.title}.pdf`);
    }
    
    async function deleteSong(songId) {
        const song = await SONGS_SERVICE.getSongById(songId);
        if (confirm(`Delete song "${song.title}"?`)) {
            await SONGS_SERVICE.deleteSong(songId);
            await refreshSongsList(currentFolderId);
        }
    }
    
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
        refreshSongsList
    };
})();
