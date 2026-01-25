// Application state
let currentFamily = null;
let currentChord = null;
let user = null;

// DOM elements
const familiesView = document.getElementById('families-view');
const familyView = document.getElementById('family-view');
const chordModal = document.getElementById('chord-modal');
const practiceModal = document.getElementById('practice-modal');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    initializeFamilyButtons();
    initializeBackButtons();
    initializeDownloadButtons();
    initializeUtilityButtons();
    initializeVariationIconHandler();
    initializePracticeButton();
    initializeLogoutButton();
    initializeShareButton();
});

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

async function checkAuth() {
    let token = getCookie('authToken');
    if (token) {
        localStorage.setItem('token', token);
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    } else {
        token = localStorage.getItem('token');
    }
    // alert('Token: ' + token + '\nCookie: ' + document.cookie);
    if (!token) {
        window.location.href = '/login.html';
    } else {
        // You can also verify the token with the server here if needed
        try {
            const res = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.message === 'Unauthorized') {
                // Try to refresh token
                const refreshRes = await fetch('/api/auth/refresh', {
                    method: 'POST'
                });
                if (refreshRes.ok) {
                    // Refresh successful, get new token
                    const newToken = getCookie('authToken');
                    if (newToken) {
                        localStorage.setItem('token', newToken);
                        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                        // Retry fetching user data
                        const retryRes = await fetch('/api/users/me', {
                            headers: {
                                'Authorization': `Bearer ${newToken}`
                            }
                        });
                        const retryData = await retryRes.json();
                        if (retryData.message === 'Unauthorized') {
                            logout();
                        } else {
                            user = retryData;
                            displayUserProfile();
                        }
                    } else {
                        logout();
                    }
                } else {
                    logout();
                }
            } else {
                user = data;
                displayUserProfile();
            }
        } catch (error) {
            logout();
        }
    }
}

function displayUserProfile() {
    const profileLink = document.createElement('a');
    profileLink.href = '/profile.html';
    profileLink.textContent = `Welcome, ${user.first_name}`;
    document.querySelector('header').appendChild(profileLink);
}

function initializeLogoutButton() {
    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.textContent = 'Logout';
    logoutBtn.addEventListener('click', logout);
    document.querySelector('header').appendChild(logoutBtn);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

// Initialize variation icon click handler
function initializeVariationIconHandler() {
    document.addEventListener('click', async (e) => {
        const trigger = e.target.closest('.variation-icon-trigger');
        if (trigger) {
            e.stopPropagation();
            const chordName = trigger.dataset.chordName;
            SongEditor.openVariationsModal(chordName, async (id) => {
                const chord = await DB_SERVICE.getChordById(id);
                showChordView(chord);
            });
        }
    });
}

// Initialize family buttons
function initializeFamilyButtons() {
    const familyButtons = document.querySelectorAll('.family-btn');
    console.log('Buttons found:', familyButtons.length);
    familyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const family = btn.dataset.family;
            console.log('Click on family:', family);
            showFamilyView(family);
        });
    });
}

// Initialize navigation buttons
function initializeBackButtons() {
    document.getElementById('back-to-families').addEventListener('click', () => {
        showView('families');
    });
    
    // Close modal
    document.getElementById('close-modal').addEventListener('click', () => {
        closeModal();
    });
    
    // Close modal when clicking on overlay
    chordModal.querySelector('.modal-overlay').addEventListener('click', () => {
        closeModal();
    });
}

// Initialize download buttons
function initializeDownloadButtons() {
    // Download complete family
    document.getElementById('download-family-png').addEventListener('click', () => {
        downloadFamily(currentFamily, 'png');
    });
    
    document.getElementById('download-family-svg').addEventListener('click', () => {
        downloadFamily(currentFamily, 'svg');
    });
    
    // Download individual chord from modal
    document.getElementById('download-modal-chord-png').addEventListener('click', () => {
        downloadChord(currentChord, 'png');
    });
    
    document.getElementById('download-modal-chord-svg').addEventListener('click', () => {
        downloadChord(currentChord, 'svg');
    });
}

// Initialize practice button
function initializePracticeButton() {
    document.getElementById('practice-family-btn').addEventListener('click', openPracticeModal);
    document.getElementById('close-practice-modal').addEventListener('click', closePracticeModal);
    document.getElementById('randomize-chords-btn').addEventListener('click', openPracticeModal);
}

// Show specific view
function showView(view) {
    familiesView.classList.add('hidden');
    familyView.classList.add('hidden');
    
    if (view === 'families') {
        familiesView.classList.remove('hidden');
    } else if (view === 'family') {
        familyView.classList.remove('hidden');
    }
}

// Show family view
async function showFamilyView(family) {
    console.log('showFamilyView called with:', family);
    currentFamily = family;
    const chords = await DB_SERVICE.getChordsForFamily(family);

    if (chords.length === 0) {
        alert(`Family ${family} is not yet implemented.`);
        return;
    }

    document.getElementById('family-title').textContent = translations[currentLanguage][`${family} Family`] || `${family} Family`;

    // Create variation count map
    const variationCount = {};
    chords.forEach(chord => {
        variationCount[chord.name] = (variationCount[chord.name] || 0) + 1;
    });

    // Render chord gallery
    const gallery = document.getElementById('chords-gallery');
    gallery.innerHTML = '';

    chords.forEach(chord => {
        const hasVariations = variationCount[chord.name] > 1;
        const card = createChordCard(chord, hasVariations);
        gallery.appendChild(card);
    });

    showView('family');
}


// Create chord card for gallery
function createChordCard(chord, hasVariations) {
    const card = document.createElement('div');
    card.className = 'chord-card';
    card.addEventListener('click', () => showChordView(chord));

    const title = document.createElement('h3');
    title.textContent = chord.name;
    card.appendChild(title);

    // Render thumbnail
    const renderer = new ChordRenderer(chord);
    if (hasVariations) {
        const div = document.createElement('div');
        div.className = 'chord-thumbnail';
        div.innerHTML = renderer.getSVGString(false, true);
        card.appendChild(div);
    } else {
        const img = document.createElement('img');
        img.className = 'chord-thumbnail';
        img.src = renderer.getDataURL('svg', false);
        card.appendChild(img);
    }

    return card;
}


// Show individual chord modal
function showChordView(chord) {
    currentChord = chord;
    document.getElementById('modal-chord-title').textContent = chord.name;
    
    // Render large preview
    const preview = document.getElementById('modal-chord-preview');
    preview.innerHTML = '';
    
    const renderer = new ChordRenderer(chord);
    const svgString = renderer.getSVGString(false);
    preview.innerHTML = svgString;
    
    // Show modal
    chordModal.classList.remove('hidden');
}


// Close modal
function closeModal() {
    chordModal.classList.add('hidden');
}

// Open practice modal
async function openPracticeModal() {
    if (!currentFamily) return;

    const chords = await DB_SERVICE.getChordsForFamily(currentFamily);
    if (chords.length === 0) {
        alert(translations[currentLanguage]['No chords available for practice in this family.'] || 'No chords available for practice in this family.');
        return;
    }

    // Shuffle chords
    const shuffledChords = chords.sort(() => Math.random() - 0.5);

    showPracticeView(shuffledChords);
}

// Show practice view
function showPracticeView(chords) {
    const modalBody = document.getElementById('practice-modal-body');
    modalBody.innerHTML = ''; // Clear previous chords

    chords.forEach(chord => {
        const chordView = document.createElement('div');
        chordView.className = 'chord-view';

        const renderer = new ChordRenderer(chord);
        const svgString = renderer.getSVGString(false); // Get full-size SVG
        
        chordView.innerHTML = svgString;
        modalBody.appendChild(chordView);
    });

    document.getElementById('practice-modal-title').textContent = `${currentFamily}${translations[currentLanguage][' Family Practice'] || ' Family Practice'}`;
    practiceModal.classList.remove('hidden');
}

// Close practice modal
function closePracticeModal() {
    practiceModal.classList.add('hidden');
}

// Download individual chord
async function downloadChord(chord, format) {
    const renderer = new ChordRenderer(chord);
    const filename = `${chord.name}.${format}`;
    
    if (format === 'svg') {
        const svgString = renderer.getSVGString(false);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        downloadBlob(blob, filename);
    } else {
        const blob = await renderer.getPNGBlob(false);
        downloadBlob(blob, filename);
    }
}

// Download complete family
async function downloadFamily(family, format) {
    const chords = await DB_SERVICE.getChordsForFamily(family);
    
    if (chords.length === 0) {
        alert('No chords available to download in this family.');
        return;
    }
    
    const zip = new JSZip();
    const folder = zip.folder(family);
    
    // Add each chord to ZIP
    for (const chord of chords) {
        const renderer = new ChordRenderer(chord);
        const filename = `${chord.name}.${format}`;
        
        if (format === 'svg') {
            const svgString = renderer.getSVGString(false);
            folder.file(filename, svgString);
        } else {
            const blob = await renderer.getPNGBlob(false);
            folder.file(filename, blob);
        }
    }
    
    // Generate and download ZIP
    const content = await zip.generateAsync({ type: 'blob' });
    downloadBlob(content, `${family}.zip`);
}

// Helper function to download blob
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize utility buttons
function initializeUtilityButtons() {
    const pdfToTextBtn = document.getElementById('pdf-to-text-btn');
    if (pdfToTextBtn) {
        pdfToTextBtn.addEventListener('click', () => {
            window.open('pdf-to-text.html', '_blank');
        });
    }

    const openSharesBtn = document.getElementById('open-shares-btn');
    if (openSharesBtn) {
        openSharesBtn.addEventListener('click', () => {
            window.open('shares.html', '_blank');
        });
    }
}

// Share modal logic
function initializeShareButton() {
    const shareModal = document.getElementById('share-modal');
    const closeShareModal = document.getElementById('close-share-modal');
    const shareBtn = document.getElementById('share-btn');

    document.getElementById('share-modal-chord-btn').addEventListener('click', () => {
        shareModal.classList.remove('hidden');
    });

    closeShareModal.addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });

    shareBtn.addEventListener('click', async () => {
        const recipient_username = document.getElementById('recipient-username').value;
        if (!recipient_username) {
            alert('Please enter a recipient username.');
            return;
        }

        try {
            const res = await fetch('/api/shares/chord', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ chord_id: currentChord.id, recipient_username })
            });
            const data = await res.json();
            alert(data.message);
            if (res.ok) {
                shareModal.classList.add('hidden');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred. Please try again.');
        }
    });
}
