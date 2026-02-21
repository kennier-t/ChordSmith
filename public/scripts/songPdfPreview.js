(() => {
    'use strict';

    const state = {
        songId: null,
        song: null,
        blobUrl: null
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

            const chords = await SONGS_SERVICE.getSongChordDiagrams(state.songId);
            const doc = await SongPDFGenerator.generatePDF(song, chords);
            const blob = doc.output('blob');

            state.song = song;
            state.blobUrl = URL.createObjectURL(blob);

            const frame = document.getElementById('pdf-preview-frame');
            frame.src = state.blobUrl;
            frame.classList.remove('hidden');
            setStatus('', '');
        } catch (error) {
            console.error(error);
            setStatus('Unable to load PDF preview.', 'Unable to load PDF preview.');
        }
    }

    function initialize() {
        const backBtn = document.getElementById('back-preview-btn');
        const downloadBtn = document.getElementById('download-preview-btn');

        if (backBtn) backBtn.addEventListener('click', goBackOrClose);
        if (downloadBtn) downloadBtn.addEventListener('click', downloadCurrentPdf);

        loadPreview();
    }

    window.addEventListener('beforeunload', () => {
        if (state.blobUrl) {
            URL.revokeObjectURL(state.blobUrl);
        }
    });

    document.addEventListener('DOMContentLoaded', initialize);
})();
