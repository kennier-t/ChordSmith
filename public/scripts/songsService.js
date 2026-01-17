const SONGS_SERVICE = (function() {
    'use strict';
    
    const STORAGE_KEYS = {
        SONGS: 'chordFamilies_songs',
        FOLDERS: 'chordFamilies_folders',
        SONG_FOLDER_MAP: 'chordFamilies_songFolderMap',
        SONG_CHORD_DIAGRAMS: 'chordFamilies_songChordDiagrams',
        INITIALIZED: 'chordFamilies_songs_initialized'
    };
    
    function initialize() {
        if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
            return;
        }
        
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SONG_FOLDER_MAP, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.SONG_CHORD_DIAGRAMS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
    
    function getNextId(storageKey) {
        const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
        return items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    }
    
    function getAllFolders() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLDERS) || '[]');
    }
    
    function createFolder(name) {
        const folders = getAllFolders();
        const newFolder = {
            id: getNextId(STORAGE_KEYS.FOLDERS),
            name: name,
            createdDate: new Date().toISOString()
        };
        folders.push(newFolder);
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
        return newFolder;
    }
    
    function deleteFolder(folderId) {
        const folders = getAllFolders();
        const filtered = folders.filter(f => f.id !== folderId);
        localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(filtered));
        
        const mappings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_FOLDER_MAP) || '[]');
        const filteredMappings = mappings.filter(m => m.folderId !== folderId);
        localStorage.setItem(STORAGE_KEYS.SONG_FOLDER_MAP, JSON.stringify(filteredMappings));
    }
    
    function getAllSongs() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SONGS) || '[]');
    }
    
    function getSongById(songId) {
        const songs = getAllSongs();
        return songs.find(s => s.id === songId);
    }
    
    function getSongsByFolder(folderId) {
        const mappings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_FOLDER_MAP) || '[]');
        const songIds = mappings.filter(m => m.folderId === folderId).map(m => m.songId);
        const songs = getAllSongs();
        return songs.filter(s => songIds.includes(s.id));
    }
    
    function createSong(songData) {
        const songs = getAllSongs();
        const newSong = {
            id: getNextId(STORAGE_KEYS.SONGS),
            title: songData.title,
            songDate: songData.songDate || '',
            notes: songData.notes || '',
            songKey: songData.songKey || '',
            capo: songData.capo || '',
            bpm: songData.bpm || '',
            effects: songData.effects || '',
            contentText: songData.contentText,
            createdDate: new Date().toISOString(),
            modifiedDate: new Date().toISOString()
        };
        songs.push(newSong);
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
        
        if (songData.chordIds && songData.chordIds.length > 0) {
            saveSongChordDiagrams(newSong.id, songData.chordIds);
        }
        
        if (songData.folderIds && songData.folderIds.length > 0) {
            saveSongFolderMappings(newSong.id, songData.folderIds);
        }
        
        return newSong;
    }
    
    function updateSong(songId, songData) {
        const songs = getAllSongs();
        const index = songs.findIndex(s => s.id === songId);
        if (index === -1) {
            throw new Error('Song not found');
        }
        
        songs[index] = {
            ...songs[index],
            title: songData.title,
            songDate: songData.songDate || '',
            notes: songData.notes || '',
            songKey: songData.songKey || '',
            capo: songData.capo || '',
            bpm: songData.bpm || '',
            effects: songData.effects || '',
            contentText: songData.contentText,
            modifiedDate: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(songs));
        
        if (songData.chordIds !== undefined) {
            saveSongChordDiagrams(songId, songData.chordIds);
        }
        
        if (songData.folderIds !== undefined) {
            saveSongFolderMappings(songId, songData.folderIds);
        }
        
        return songs[index];
    }
    
    function deleteSong(songId) {
        const songs = getAllSongs();
        const filtered = songs.filter(s => s.id !== songId);
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(filtered));
        
        const diagrams = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_CHORD_DIAGRAMS) || '[]');
        const filteredDiagrams = diagrams.filter(d => d.songId !== songId);
        localStorage.setItem(STORAGE_KEYS.SONG_CHORD_DIAGRAMS, JSON.stringify(filteredDiagrams));
        
        const mappings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_FOLDER_MAP) || '[]');
        const filteredMappings = mappings.filter(m => m.songId !== songId);
        localStorage.setItem(STORAGE_KEYS.SONG_FOLDER_MAP, JSON.stringify(filteredMappings));
    }
    
    function saveSongChordDiagrams(songId, chordIds) {
        const diagrams = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_CHORD_DIAGRAMS) || '[]');
        const filtered = diagrams.filter(d => d.songId !== songId);
        
        chordIds.forEach((chordId, index) => {
            filtered.push({
                songId: songId,
                chordId: chordId,
                displayOrder: index
            });
        });
        
        localStorage.setItem(STORAGE_KEYS.SONG_CHORD_DIAGRAMS, JSON.stringify(filtered));
    }
    
    function getSongChordDiagrams(songId) {
        const diagrams = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_CHORD_DIAGRAMS) || '[]');
        return diagrams
            .filter(d => d.songId === songId)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map(d => d.chordId);
    }
    
    function saveSongFolderMappings(songId, folderIds) {
        const mappings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_FOLDER_MAP) || '[]');
        const filtered = mappings.filter(m => m.songId !== songId);
        
        folderIds.forEach(folderId => {
            filtered.push({
                songId: songId,
                folderId: folderId
            });
        });
        
        localStorage.setItem(STORAGE_KEYS.SONG_FOLDER_MAP, JSON.stringify(filtered));
    }
    
    function getSongFolders(songId) {
        const mappings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SONG_FOLDER_MAP) || '[]');
        const folderIds = mappings.filter(m => m.songId === songId).map(m => m.folderId);
        const folders = getAllFolders();
        return folders.filter(f => folderIds.includes(f.id));
    }
    
    initialize();
    
    return {
        getAllFolders,
        createFolder,
        deleteFolder,
        getAllSongs,
        getSongById,
        getSongsByFolder,
        createSong,
        updateSong,
        deleteSong,
        getSongChordDiagrams,
        getSongFolders
    };
})();
