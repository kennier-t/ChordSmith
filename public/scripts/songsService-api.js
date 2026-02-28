// Songs Service - API Version
// This service connects to the Node.js backend API

const SONGS_SERVICE = (function() {
    'use strict';
    
    const API_BASE_URL = 'http://localhost:3000/api';
    
    // Helper function for API calls
    async function apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers,
                ...options
            });
            
            if (!response.ok) {
                let error;
                try {
                    error = await response.json();
                } catch {
                    error = { error: `HTTP error! status: ${response.status}` };
                }
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            if (response.status === 204) {
                return null;
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
        return await apiCall('/songs/folders');
    }

    async function createFolder(name) {
        return await apiCall('/songs/folders', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    }

    async function renameFolder(folderId, newName) {
        return await apiCall(`/songs/folders/${folderId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: newName })
        });
    }

    async function deleteFolder(folderId) {
        await apiCall(`/songs/folders/${folderId}`, {
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

    async function getSongVersions(songId) {
        return await apiCall(`/songs/${songId}/versions`);
    }

    async function getSongsByFolder(folderId) {
        return await apiCall(`/songs/folders/${folderId}/songs`);
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

    async function addSongVersion(songId, songData) {
        return await apiCall(`/songs/${songId}/versions`, {
            method: 'POST',
            body: JSON.stringify(songData)
        });
    }

    async function reorderSongVersions(songId, orderedSongIds) {
        return await apiCall(`/songs/${songId}/versions/order`, {
            method: 'PUT',
            body: JSON.stringify({ orderedSongIds })
        });
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

    async function exportContentPack(songIds = []) {
        const normalizedSongIds = Array.isArray(songIds)
            ? songIds.map(id => Number.parseInt(id, 10)).filter(id => Number.isFinite(id) && id > 0)
            : [];

        const query = normalizedSongIds.length > 0
            ? `?songIds=${normalizedSongIds.join(',')}`
            : '';

        return await apiCall(`/songs/content-pack/export${query}`);
    }

    async function importContentPack(contentPack, options = {}) {
        return await apiCall('/songs/content-pack/import', {
            method: 'POST',
            body: JSON.stringify({ contentPack, options })
        });
    }
    
    // Initialize
    initialize();
    
    // Public API
    return {
        getAllFolders,
        createFolder,
        renameFolder,
        deleteFolder,
        getAllSongs,
        getSongById,
        getSongVersions,
        getSongsByFolder,
        createSong,
        updateSong,
        addSongVersion,
        reorderSongVersions,
        deleteSong,
        getSongChordDiagrams,
        getSongFolders,
        exportContentPack,
        importContentPack
    };
})();
