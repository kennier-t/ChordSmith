// Songs Service - API Version
// This service connects to the Node.js backend API

const SONGS_SERVICE = (function() {
    'use strict';
    
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Helper function for API calls
    async function apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }
    
    // Initialize (no-op for API version)
    function initialize() {
        console.log('SONGS_SERVICE (API) initialized');
    }
    
    // =============================================
    // FOLDERS
    // =============================================
    
    async function getAllFolders() {
        return await apiCall('/folders');
    }
    
    async function createFolder(name) {
        return await apiCall('/folders', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }
    
    async function deleteFolder(folderId) {
        await apiCall(`/folders/${folderId}`, {
            method: 'DELETE'
        });
    }
    
    // =============================================
    // SONGS
    // =============================================
    
    async function getAllSongs() {
        return await apiCall('/songs');
    }
    
    async function getSongById(songId) {
        try {
            return await apiCall(`/songs/${songId}`);
        } catch (error) {
            console.error('Error getting song:', error);
            return null;
        }
    }
    
    async function getSongsByFolder(folderId) {
        return await apiCall(`/folders/${folderId}/songs`);
    }
    
    async function createSong(songData) {
        return await apiCall('/songs', {
            method: 'POST',
            body: JSON.stringify(songData)
        });
    }
    
    async function updateSong(songId, songData) {
        await apiCall(`/songs/${songId}`, {
            method: 'PUT',
            body: JSON.stringify(songData)
        });
        return songId;
    }
    
    async function deleteSong(songId) {
        await apiCall(`/songs/${songId}`, {
            method: 'DELETE'
        });
    }
    
    // =============================================
    // SONG CHORD DIAGRAMS
    // =============================================
    
    async function getSongChordDiagrams(songId) {
        return await apiCall(`/songs/${songId}/chords`);
    }
    
    // =============================================
    // SONG FOLDERS MAPPING
    // =============================================
    
    async function getSongFolders(songId) {
        return await apiCall(`/songs/${songId}/folders`);
    }
    
    // Initialize
    initialize();
    
    // Public API
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
