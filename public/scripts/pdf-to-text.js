// PDF to Text Functionality

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const filename = document.getElementById('filename');
const convertBtn = document.getElementById('convertBtn');
const result = document.getElementById('result');
const status = document.getElementById('status');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');
const backBtn = document.getElementById('back-btn');

let selectedFile = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    // Drop zone click to open file picker
    dropZone.addEventListener('click', () => fileInput.click());
    
    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and drop events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });
    });

    ['dragleave', 'dragend', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (eventName === 'drop') {
                handleDrop(e);
            }
            dropZone.classList.remove('dragover');
        });
    });

    // Convert button
    convertBtn.addEventListener('click', convertPDF);

    // Copy button
    copyBtn.addEventListener('click', copyToClipboard);

    // Clear button
    clearBtn.addEventListener('click', clearAll);

    // Back button
    backBtn.addEventListener('click', () => {
        // Si hay historial, retroceder. Si no, cerrar la ventana
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    });

    // Keyboard accessibility
    dropZone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInput.click();
        }
    });
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;
    handleFile(dt.files[0]);
}

function handleFile(file) {
    if (!file) return;

    // Validate file is PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        status.textContent = 'Error: Please select a PDF file';
        status.style.color = '#d32f2f';
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = '';
        }, 3000);
        return;
    }

    selectedFile = file;
    filename.textContent = file.name;
    convertBtn.disabled = false;
    status.textContent = 'Ready to convert';
    status.style.color = '';
}

async function convertPDF() {
    if (!selectedFile) {
        status.textContent = 'Error: No file selected';
        status.style.color = '#d32f2f';
        return;
    }

    convertBtn.disabled = true;
    status.textContent = 'Converting...';
    status.style.color = '';
    result.value = '';

    try {
        const formData = new FormData();
        formData.append('pdf', selectedFile);

        const response = await fetch('http://localhost:3000/api/convert-pdf', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            result.value = 'Error:\n' + (data.error || 'Unknown error');
            if (data.detail) {
                result.value += '\n\nDetails: ' + data.detail;
            }
            status.textContent = 'Error';
            status.style.color = '#d32f2f';
        } else {
            result.value = data.text || '';
            status.textContent = 'Completed';
            status.style.color = '';
        }
    } catch (err) {
        result.value = 'Connection error: ' + err.message;
        status.textContent = 'Connection error';
        status.style.color = '#d32f2f';
    } finally {
        convertBtn.disabled = false;
    }
}

async function copyToClipboard() {
    if (!result.value) {
        status.textContent = 'Nothing to copy';
        status.style.color = '#d32f2f';
        setTimeout(() => {
            status.textContent = 'Ready';
            status.style.color = '';
        }, 2000);
        return;
    }

    try {
        await navigator.clipboard.writeText(result.value);
        status.textContent = 'Copied to clipboard';
        status.style.color = '';
        
        // Reset status after 2 seconds
        setTimeout(() => {
            status.textContent = 'Ready';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        result.select();
        document.execCommand('copy');
        status.textContent = 'Copied (fallback)';
        status.style.color = '';
        
        setTimeout(() => {
            status.textContent = 'Ready';
        }, 2000);
    }
}

function clearAll() {
    result.value = '';
    selectedFile = null;
    filename.textContent = 'No file selected';
    convertBtn.disabled = true;
    status.textContent = 'Ready';
    status.style.color = '';
    fileInput.value = '';
}
