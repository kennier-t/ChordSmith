(() => {
    'use strict';

    const state = {
        songId: null,
        currentPreviewSongId: null,
        song: null,
        blobUrl: null,
        versions: []
    };

    function t(key, fallback) {
        return (translations[currentLanguage] && translations[currentLanguage][key]) || fallback || key;
    }

    function getSongIdFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const value = params.get('songId');
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    function setStatus(messageKey, fallback) {
        const status = document.getElementById('pdf-preview-status');
        if (!status) return;
        if (!messageKey) {
            status.textContent = '';
            status.removeAttribute('data-translate');
            return;
        }
        status.setAttribute('data-translate', messageKey);
        status.textContent = t(messageKey, fallback);
    }

    function goBackOrClose() {
        if (window.opener) {
            window.close();
            return;
        }

        if (window.history.length > 1) {
            window.history.back();
            return;
        }

        window.location.href = '/';
    }

    function downloadCurrentPdf() {
        if (!state.blobUrl || !state.song) return;
        const a = document.createElement('a');
        a.href = state.blobUrl;
        a.download = `${state.song.Title || 'song'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    function renderVersionSelector() {
        const container = document.getElementById('pdf-version-control');
        const select = document.getElementById('pdf-version-select');
        if (!container || !select) return;

        const hasMultipleVersions = Array.isArray(state.versions) && state.versions.length > 1;
        container.classList.toggle('hidden', !hasMultipleVersions);
        if (!hasMultipleVersions) {
            select.innerHTML = '';
            return;
        }

        const versionLabel = t('Version', 'Version');
        const originalLabel = t('Original', 'Original');
        select.innerHTML = '';
        state.versions.forEach((versionItem) => {
            const option = document.createElement('option');
            option.value = String(versionItem.Id);
            const versionNumber = Number.parseInt(versionItem.Version, 10) || 1;
            option.textContent = `${versionLabel} ${versionNumber}${versionItem.IsOriginal ? ` (${originalLabel})` : ''}`;
            select.appendChild(option);
        });
        select.value = String(state.currentPreviewSongId || state.songId);
    }

    async function loadPdfForSong(songId) {
        const song = await SONGS_SERVICE.getSongById(songId);
        if (!song) {
            setStatus('Song not found', 'Song not found');
            return;
        }

        const chords = await SONGS_SERVICE.getSongChordDiagrams(songId);
        const doc = await SongPDFGenerator.generatePDF(song, chords);
        const blob = doc.output('blob');
        if (state.blobUrl) {
            URL.revokeObjectURL(state.blobUrl);
        }

        state.song = song;
        state.currentPreviewSongId = songId;
        state.blobUrl = URL.createObjectURL(blob);

        const frame = document.getElementById('pdf-preview-frame');
        frame.src = state.blobUrl;
        frame.classList.remove('hidden');
        setStatus('', '');
        renderVersionSelector();
    }

    async function loadPreview() {
        state.songId = getSongIdFromQuery();
        if (!state.songId) {
            setStatus('Song not found', 'Song not found');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        try {
            const song = await SONGS_SERVICE.getSongById(state.songId);
            if (!song) {
                setStatus('Song not found', 'Song not found');
                return;
            }

            state.versions = Array.isArray(song.versions) ? song.versions : [];
            const defaultVersion = state.versions.find((versionItem) => Number.parseInt(versionItem.Version, 10) === 1) || state.versions[0];
            const defaultSongId = Number.parseInt(defaultVersion && defaultVersion.Id, 10);
            const previewSongId = Number.isFinite(defaultSongId) && defaultSongId > 0 ? defaultSongId : state.songId;
            await loadPdfForSong(previewSongId);
        } catch (error) {
            console.error(error);
            setStatus('Unable to load PDF preview.', 'Unable to load PDF preview.');
        }
    }

    function initialize() {
        const backBtn = document.getElementById('back-preview-btn');
        const downloadBtn = document.getElementById('download-preview-btn');
        const versionSelect = document.getElementById('pdf-version-select');

        if (backBtn) backBtn.addEventListener('click', goBackOrClose);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadCurrentPdf);
        if (versionSelect) {
            versionSelect.addEventListener('change', async (event) => {
                const selectedSongId = Number.parseInt(event.target.value, 10);
                if (!Number.isFinite(selectedSongId) || selectedSongId <= 0) return;
                if (selectedSongId === state.currentPreviewSongId) return;
                try {
                    await loadPdfForSong(selectedSongId);
                } catch (error) {
                    console.error(error);
                    setStatus('Unable to load PDF preview.', 'Unable to load PDF preview.');
                }
            });
        }

        loadPreview();
    }

    window.addEventListener('beforeunload', () => {
        if (state.blobUrl) {
            URL.revokeObjectURL(state.blobUrl);
        }
    });

    document.addEventListener('DOMContentLoaded', initialize);
})();
