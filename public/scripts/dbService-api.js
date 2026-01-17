// Database Service - API Version
// This service connects to the Node.js backend API

const DB_SERVICE = (function() {
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
    
    // No-op initialize - database is handled by backend
    function initialize() {
        console.log('DB_SERVICE (API) initialized');
    }
    
    // Get all families
    async function getAllFamilies() {
        return await apiCall('/families');
    }
    
    // Get all chords
    async function getAllChords() {
        return await apiCall('/chords');
    }
    
    // Get chords for a specific family
    async function getChordsForFamily(familyName) {
        return await apiCall(`/families/${encodeURIComponent(familyName)}/chords`);
    }
    
    // Get only custom chords (not original)
    async function getCustomChords() {
        const allChords = await getAllChords();
        return allChords.filter(c => !c.isOriginal);
    }
    
    // Get chord by ID
    async function getChordById(chordId) {
        try {
            return await apiCall(`/chords/${chordId}`);
        } catch (error) {
            console.error('Error getting chord:', error);
            return null;
        }
    }
    
    // Check if chord name is unique
    async function isChordNameUnique(name, excludeId = null) {
        const allChords = await getAllChords();
        return !allChords.some(c => c.name === name && c.id !== excludeId);
    }
    
    // Create a new custom chord
    async function createChord(chordData) {
        const result = await apiCall('/chords', {
            method: 'POST',
            body: JSON.stringify(chordData)
        });
        return result.id;
    }
    
    // Update an existing custom chord
    async function updateChord(chordId, chordData) {
        await apiCall(`/chords/${chordId}`, {
            method: 'PUT',
            body: JSON.stringify(chordData)
        });
        return true;
    }
    
    // Delete a custom chord
    async function deleteChord(chordId) {
        await apiCall(`/chords/${chordId}`, {
            method: 'DELETE'
        });
        return true;
    }
    
    // Public API
    return {
        initialize,
        getAllFamilies,
        getAllChords,
        getChordsForFamily,
        getCustomChords,
        getChordById,
        createChord,
        updateChord,
        deleteChord,
        isChordNameUnique
    };
})();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    DB_SERVICE.initialize();
});
