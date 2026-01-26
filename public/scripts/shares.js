const songSharesList = document.getElementById('song-shares-list');
const chordSharesList = document.getElementById('chord-shares-list');
const sendShareForm = document.getElementById('send-share-form');
const token = localStorage.getItem('token');

let userSongs = [];
let userChords = [];
let currentShareType = 'song';
let currentShareItem = '';

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    try {
        // Load user's songs and chords
        const [songsRes, chordsRes] = await Promise.all([
            fetch('/api/songs', { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch('/api/chords', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        if (songsRes.ok) {
            userSongs = await songsRes.json();
        }
        if (chordsRes.ok) {
            userChords = await chordsRes.json();
        }

        // Populate initial dropdown (songs by default)
        populateItemDropdown('song');

        // Load incoming shares
        const sharesRes = await fetch('/api/shares/incoming', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await sharesRes.json();
        if (sharesRes.ok) {
            renderShares(data.songShares, songSharesList, 'song');
            renderShares(data.chordShares, chordSharesList, 'chord');
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred. Please try again.');
    }
});

// Handle form submission
sendShareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = currentShareType;
    const itemId = currentShareItem;
    const recipientUsername = document.getElementById('recipient-username').value.trim();

    if (!itemId || !recipientUsername) {
        alert('Please select an item and enter a recipient username.');
        return;
    }

    try {
        const res = await fetch(`/api/shares/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                [`${type}_id`]: itemId,
                recipient_username: recipientUsername
            })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
            // Clear form
            sendShareForm.reset();
            Shares.selectTypeOption('song'); // Reset to songs
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred. Please try again.');
    }
});

function populateItemDropdown(type) {
    const dropdown = document.getElementById('share-item-dropdown');
    dropdown.innerHTML = '';
    const items = type === 'song' ? userSongs : userChords;
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'custom-dropdown-item';
        div.dataset.value = item.Id;
        div.textContent = type === 'song' ? item.Title : item.Name;
        div.onclick = () => Shares.selectItemOption(item.Id, div.textContent);
        dropdown.appendChild(div);
    });
}

function renderShares(shares, listElement, type) {
    listElement.innerHTML = '';
    shares.forEach(share => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        li.style.padding = '12px 0';
        li.style.borderBottom = '1px solid var(--border)';
        const payload = JSON.parse(share.payload);
        li.innerHTML = `
            <span style="color: var(--text-primary); font-size: 0.9rem;">${payload.Title || payload.Name} from ${payload.senderUsername}</span>
            <div style="display: flex; gap: 8px;">
                <button class="accept-share utility-btn" data-id="${share.id}" data-type="${type}" style="padding: 8px 16px; font-size: 0.8rem;">Accept</button>
                <button class="reject-share utility-btn" data-id="${share.id}" data-type="${type}" style="padding: 8px 16px; font-size: 0.8rem; background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%);">Reject</button>
            </div>
        `;
        listElement.appendChild(li);
    });
}

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('accept-share')) {
        const shareId = e.target.dataset.id;
        const type = e.target.dataset.type;
        if (type === 'song') {
            await showFolderSelectionModal(shareId, type);
        } else {
            await acceptShare(shareId, type, []);
        }
    } else if (e.target.classList.contains('reject-share')) {
        const shareId = e.target.dataset.id;
        const type = e.target.dataset.type;
        await rejectShare(shareId, type);
    }
});

async function showFolderSelectionModal(shareId, type) {
    try {
        const res = await fetch('/api/songs/folders', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const folders = await res.json();
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Select Folders for the Song</h3>
                <div id="folders-list">
                    ${folders.map(folder => `
                        <label>
                            <input type="checkbox" value="${folder.Id}"> ${folder.Name}
                        </label><br>
                    `).join('')}
                </div>
                <button id="accept-with-folders">Accept</button>
                <button id="cancel-accept">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('accept-with-folders').addEventListener('click', async () => {
            const selectedFolders = Array.from(document.querySelectorAll('#folders-list input:checked')).map(cb => parseInt(cb.value));
            await acceptShare(shareId, type, selectedFolders);
            document.body.removeChild(modal);
        });
        
        document.getElementById('cancel-accept').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    } catch (error) {
        console.error(error);
        alert('An error occurred loading folders. Please try again.');
    }
}

async function acceptShare(shareId, type, folderIds) {
    try {
        const res = await fetch(`/api/shares/${shareId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, folderIds })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
            window.location.reload();
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred. Please try again.');
    }
}

async function rejectShare(shareId, type) {
    try {
        const res = await fetch(`/api/shares/${shareId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type })
        });
        const data = await res.json();
        alert(data.message);
        if (res.ok) {
            window.location.reload();
        }
    } catch (error) {
        console.error(error);
        alert('An error occurred. Please try again.');
    }
}

const Shares = {
    toggleTypeDropdown() {
        const dropdown = document.getElementById('share-type-dropdown');
        const button = document.getElementById('share-type-btn');
        if (!dropdown || !button) return;
        const isVisible = !dropdown.classList.contains('hidden');
        if (isVisible) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
        }
    },

    selectTypeOption(value) {
        currentShareType = value;
        const displayElement = document.getElementById('share-type-display');
        const translationsMap = {
            'song': 'Song',
            'chord': 'Chord'
        };
        displayElement.textContent = translationsMap[value] || value;
        this.toggleTypeDropdown();
        populateItemDropdown(value);
        currentShareItem = ''; // Reset item
        document.getElementById('share-item-display').textContent = 'Select an item';
    },

    toggleItemDropdown() {
        const dropdown = document.getElementById('share-item-dropdown');
        const button = document.getElementById('share-item-btn');
        if (!dropdown || !button) return;
        const isVisible = !dropdown.classList.contains('hidden');
        if (isVisible) {
            dropdown.classList.add('hidden');
            button.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
        } else {
            dropdown.classList.remove('hidden');
            button.classList.add('active');
            button.setAttribute('aria-expanded', 'true');
        }
    },

    selectItemOption(value, text) {
        currentShareItem = value;
        document.getElementById('share-item-display').textContent = text;
        this.toggleItemDropdown();
    }
};