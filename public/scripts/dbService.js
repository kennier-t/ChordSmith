// Database Service - Simulates SQL Server using localStorage
// This service acts as the data access layer for the application

const DB_SERVICE = (function() {
    'use strict';
    
    const STORAGE_KEYS = {
        INITIALIZED: 'chordFamilies_initialized',
        FAMILIES: 'chordFamilies_families',
        CHORDS: 'chordFamilies_chords',
        FINGERINGS: 'chordFamilies_fingerings',
        BARRES: 'chordFamilies_barres',
        FAMILY_MAPPINGS: 'chordFamilies_familyMappings',
        NEXT_CHORD_ID: 'chordFamilies_nextChordId'
    };
    
    // Initialize database with original data if not already done
    function initialize() {
        if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
            return; // Already initialized
        }
        
        console.log('Initializing database with original chord data...');
        
        // Clear any existing data
        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
        
        // Initialize from CHORD_DATA (from chordData.js)
        const families = [];
        const chords = [];
        const fingerings = [];
        const barres = [];
        const familyMappings = [];
        let chordId = 1;
        
        // Create families
        const familyNames = Object.keys(CHORD_DATA);
        familyNames.forEach((name, index) => {
            families.push({ id: index + 1, name: name });
        });
        
        // Process each family's chords
        const chordNameToId = new Map();
        
        familyNames.forEach((familyName, familyIndex) => {
            const familyId = familyIndex + 1;
            const familyChords = CHORD_DATA[familyName];
            
            familyChords.forEach(chordData => {
                let currentChordId;
                
                // Check if chord already exists (same name)
                if (chordNameToId.has(chordData.name)) {
                    currentChordId = chordNameToId.get(chordData.name);
                    // Add family mapping for existing chord
                    familyMappings.push({
                        chordId: currentChordId,
                        familyId: familyId
                    });
                } else {
                    // Create new chord
                    currentChordId = chordId++;
                    chordNameToId.set(chordData.name, currentChordId);
                    
                    chords.push({
                        id: currentChordId,
                        name: chordData.name,
                        baseFret: chordData.baseFret,
                        isOriginal: true
                    });
                    
                    // Add fingerings
                    chordData.frets.forEach((fret, stringIndex) => {
                        fingerings.push({
                            chordId: currentChordId,
                            stringNumber: stringIndex + 1, // 1-based
                            fretNumber: fret,
                            fingerNumber: chordData.fingers[stringIndex]
                        });
                    });
                    
                    // Add barres
                    if (chordData.barres && chordData.barres.length > 0) {
                        chordData.barres.forEach(barreFret => {
                            barres.push({
                                chordId: currentChordId,
                                fretNumber: barreFret
                            });
                        });
                    }
                    
                    // Add first family mapping
                    familyMappings.push({
                        chordId: currentChordId,
                        familyId: familyId
                    });
                }
            });
        });
        
        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.FAMILIES, JSON.stringify(families));
        localStorage.setItem(STORAGE_KEYS.CHORDS, JSON.stringify(chords));
        localStorage.setItem(STORAGE_KEYS.FINGERINGS, JSON.stringify(fingerings));
        localStorage.setItem(STORAGE_KEYS.BARRES, JSON.stringify(barres));
        localStorage.setItem(STORAGE_KEYS.FAMILY_MAPPINGS, JSON.stringify(familyMappings));
        localStorage.setItem(STORAGE_KEYS.NEXT_CHORD_ID, chordId.toString());
        localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
        
        console.log(`Database initialized: ${families.length} families, ${chords.length} chords`);
    }
    
    // Get all families
    function getAllFamilies() {
        const data = localStorage.getItem(STORAGE_KEYS.FAMILIES);
        return data ? JSON.parse(data) : [];
    }
    
    // Get all chords
    function getAllChords() {
        const chords = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORDS) || '[]');
        const fingerings = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINGERINGS) || '[]');
        const barres = JSON.parse(localStorage.getItem(STORAGE_KEYS.BARRES) || '[]');
        
        return chords.map(chord => {
            const chordFingerings = fingerings.filter(f => f.chordId === chord.id);
            const chordBarres = barres.filter(b => b.chordId === chord.id);
            
            // Convert to array format [string1, string2, ..., string6]
            const frets = [];
            const fingers = [];
            
            for (let i = 1; i <= 6; i++) {
                const fingering = chordFingerings.find(f => f.stringNumber === i);
                frets.push(fingering ? fingering.fretNumber : 0);
                fingers.push(fingering ? fingering.fingerNumber : 0);
            }
            
            return {
                id: chord.id,
                name: chord.name,
                baseFret: chord.baseFret,
                isOriginal: chord.isOriginal,
                frets: frets,
                fingers: fingers,
                barres: chordBarres.map(b => b.fretNumber)
            };
        });
    }
    
    // Get chords for a specific family
    function getChordsForFamily(familyName) {
        const families = getAllFamilies();
        const family = families.find(f => f.name === familyName);
        
        if (!family) return [];
        
        const mappings = JSON.parse(localStorage.getItem(STORAGE_KEYS.FAMILY_MAPPINGS) || '[]');
        const familyChordIds = mappings
            .filter(m => m.familyId === family.id)
            .map(m => m.chordId);
        
        const allChords = getAllChords();
        return allChords.filter(c => familyChordIds.includes(c.id));
    }
    
    // Get only custom chords (not original)
    function getCustomChords() {
        return getAllChords().filter(c => !c.isOriginal);
    }
    
    // Check if chord name is unique
    function isChordNameUnique(name, excludeId = null) {
        const chords = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORDS) || '[]');
        return !chords.some(c => c.name === name && c.id !== excludeId);
    }
    
    // Create a new custom chord
    function createChord(chordData) {
        const chords = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORDS) || '[]');
        const fingerings = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINGERINGS) || '[]');
        const barres = JSON.parse(localStorage.getItem(STORAGE_KEYS.BARRES) || '[]');
        
        // Validate unique name
        if (!isChordNameUnique(chordData.name)) {
            throw new Error('Chord name already exists');
        }
        
        // Get next ID
        let nextId = parseInt(localStorage.getItem(STORAGE_KEYS.NEXT_CHORD_ID) || '1');
        const newChordId = nextId++;
        
        // Create chord
        const newChord = {
            id: newChordId,
            name: chordData.name,
            baseFret: chordData.baseFret || 1,
            isOriginal: false
        };
        
        chords.push(newChord);
        
        // Add fingerings
        chordData.frets.forEach((fret, index) => {
            fingerings.push({
                chordId: newChordId,
                stringNumber: index + 1,
                fretNumber: fret,
                fingerNumber: chordData.fingers[index]
            });
        });
        
        // Add barres
        if (chordData.barres && chordData.barres.length > 0) {
            chordData.barres.forEach(barreFret => {
                barres.push({
                    chordId: newChordId,
                    fretNumber: barreFret
                });
            });
        }
        
        // Save
        localStorage.setItem(STORAGE_KEYS.CHORDS, JSON.stringify(chords));
        localStorage.setItem(STORAGE_KEYS.FINGERINGS, JSON.stringify(fingerings));
        localStorage.setItem(STORAGE_KEYS.BARRES, JSON.stringify(barres));
        localStorage.setItem(STORAGE_KEYS.NEXT_CHORD_ID, nextId.toString());
        
        return newChordId;
    }
    
    // Update an existing custom chord
    function updateChord(chordId, chordData) {
        const chords = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORDS) || '[]');
        const chord = chords.find(c => c.id === chordId);
        
        if (!chord) {
            throw new Error('Chord not found');
        }
        
        if (chord.isOriginal) {
            throw new Error('Cannot edit original chords');
        }
        
        // Validate unique name (excluding current chord)
        if (!isChordNameUnique(chordData.name, chordId)) {
            throw new Error('Chord name already exists');
        }
        
        // Update chord
        chord.name = chordData.name;
        chord.baseFret = chordData.baseFret || 1;
        
        // Remove old fingerings and barres
        let fingerings = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINGERINGS) || '[]');
        let barres = JSON.parse(localStorage.getItem(STORAGE_KEYS.BARRES) || '[]');
        
        fingerings = fingerings.filter(f => f.chordId !== chordId);
        barres = barres.filter(b => b.chordId !== chordId);
        
        // Add new fingerings
        chordData.frets.forEach((fret, index) => {
            fingerings.push({
                chordId: chordId,
                stringNumber: index + 1,
                fretNumber: fret,
                fingerNumber: chordData.fingers[index]
            });
        });
        
        // Add new barres
        if (chordData.barres && chordData.barres.length > 0) {
            chordData.barres.forEach(barreFret => {
                barres.push({
                    chordId: chordId,
                    fretNumber: barreFret
                });
            });
        }
        
        // Save
        localStorage.setItem(STORAGE_KEYS.CHORDS, JSON.stringify(chords));
        localStorage.setItem(STORAGE_KEYS.FINGERINGS, JSON.stringify(fingerings));
        localStorage.setItem(STORAGE_KEYS.BARRES, JSON.stringify(barres));
        
        return true;
    }
    
    // Delete a custom chord
    function deleteChord(chordId) {
        let chords = JSON.parse(localStorage.getItem(STORAGE_KEYS.CHORDS) || '[]');
        const chord = chords.find(c => c.id === chordId);
        
        if (!chord) {
            throw new Error('Chord not found');
        }
        
        if (chord.isOriginal) {
            throw new Error('Cannot delete original chords');
        }
        
        // Remove chord
        chords = chords.filter(c => c.id !== chordId);
        
        // Remove fingerings and barres (cascade)
        let fingerings = JSON.parse(localStorage.getItem(STORAGE_KEYS.FINGERINGS) || '[]');
        let barres = JSON.parse(localStorage.getItem(STORAGE_KEYS.BARRES) || '[]');
        
        fingerings = fingerings.filter(f => f.chordId !== chordId);
        barres = barres.filter(b => b.chordId !== chordId);
        
        // Save
        localStorage.setItem(STORAGE_KEYS.CHORDS, JSON.stringify(chords));
        localStorage.setItem(STORAGE_KEYS.FINGERINGS, JSON.stringify(fingerings));
        localStorage.setItem(STORAGE_KEYS.BARRES, JSON.stringify(barres));
        
        return true;
    }
    
    // Get chord by ID
    function getChordById(chordId) {
        const allChords = getAllChords();
        return allChords.find(c => c.id === chordId);
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
