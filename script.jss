let currentFile = null;
let uploadedFiles = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupUploadArea();
    loadFiles();
});

function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#764ba2';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#667eea';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#667eea';
        handleFiles(e.dataTransfer.files);
    });
    
    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });
}

async function handleFiles(files) {
    for (let file of files) {
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            progressFill.style.width = '100%';
            setTimeout(() => {
                progressBar.style.display = 'none';
            }, 500);
            
            uploadedFiles.push(result);
            currentFile = result.filename;
            displayFiles();
            showProcessingSection();
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed: ' + error.message);
    }
}

async function loadFiles() {
    try {
        const response = await fetch('/api/files');
        const data = await response.json();
        uploadedFiles = data.files || [];
        displayFiles();
        if (uploadedFiles.length > 0) {
            showProcessingSection();
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function displayFiles() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    uploadedFiles.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">${file.type === 'image' ? '🖼️' : '🎥'}</div>
                <div class="file-details">
                    <h3>${file.filename}</h3>
                    <p>${formatFileSize(file.size)} • ${file.type}</p>
                </div>
            </div>
            <button class="btn btn-secondary" onclick="selectFile('${file.filename}')">Select</button>
        `;
        fileList.appendChild(fileItem);
    });
    
    // Update style transfer selects
    updateStyleTransferSelects();
}

function updateStyleTransferSelects() {
    const contentSelect = document.getElementById('contentImageSelect');
    const styleSelect = document.getElementById('styleImageSelect');
    
    contentSelect.innerHTML = '';
    styleSelect.innerHTML = '';
    
    uploadedFiles.filter(f => f.type === 'image').forEach(file => {
        const option1 = document.createElement('option');
        option1.value = file.filename;
        option1.textContent = file.filename;
        contentSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = file.filename;
        option2.textContent = file.filename;
        styleSelect.appendChild(option2);
    });
}

function selectFile(filename) {
    currentFile = filename;
    document.querySelectorAll('.file-item').forEach(item => {
        item.style.background = '#f8f9ff';
    });
    event.target.closest('.file-item').style.background = '#e8e9ff';
}

function showProcessingSection() {
    document.getElementById('processingSection').style.display = 'block';
}

function showEnhancement() {
    if (!currentFile || !isImage(currentFile)) {
        alert('Please select an image file');
        return;
    }
    document.getElementById('enhancementSection').style.display = 'block';
    document.getElementById('styleTransferSection').style.display = 'none';
}

function showStyleTransfer() {
    const images = uploadedFiles.filter(f => f.type === 'image');
    if (images.length < 2) {
        alert('Please upload at least 2 images for style transfer');
        return;
    }
    document.getElementById('styleTransferSection').style.display = 'block';
    document.getElementById('enhancementSection').style.display = 'none';
}

function updateValue(type) {
    const value = document.getElementById(type).value;
    document.getElementById(type + 'Value').textContent = value;
}

async function analyzeMedia() {
    if (!currentFile) {
        alert('Please select a file first');
        return;
    }
    
    const resultsSection = document.getElementById('resultsSection');
    resultsSection.style.display = 'block';
    resultsSection.querySelector('#resultsContent').innerHTML = '<div class="loading">Analyzing media</div>';
    
    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_id: currentFile })
        });
        
        const analysis = await response.json();
        displayAnalysis(analysis);
    } catch (error) {
        console.error('Analysis error:', error);
        alert('Analysis failed: ' + error.message);
    }
}

function displayAnalysis(analysis) {
    const content = document.getElementById('resultsContent');
    
    let html = `
        <div class="result-item">
            <h4>Description</h4>
            <p>${analysis.description || 'No description available'}</p>
        </div>
    `;
    
    if (analysis.objects && analysis.objects.length > 0) {
        html += `
            <div class="result-item">
                <h4>Detected Objects</h4>
                <ul>
                    ${analysis.objects.map(obj => `<li>${obj}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (analysis.scenes && analysis.scenes.length > 0) {
        html += `
            <div class="result-item">
                <h4>Scenes</h4>
                <ul>
                    ${analysis.scenes.map(scene => `<li>${scene}</li>`).join('')}
                </ul>
            </div>
        `;
    }
    
    if (analysis.colors && Object.keys(analysis.colors).length > 0) {
        html += `
            <div class="result-item">
                <h4>Dominant Colors</h4>
                <div class="color-palette">
                    ${Object.keys(analysis.colors).map(color => 
                        `<div class="color-swatch" style="background-color: ${color}">${color}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }
    
    if (analysis.metadata) {
        html += `
            <div class="result-item">
                <h4>Metadata</h4>
                <ul>
                    ${Object.entries(analysis.metadata).map(([key, value]) => 
                        `<li><strong>${key}:</strong> ${value}</li>`
                    ).join('')}
                </ul>
            </div>
        `;
    }
    
    content.innerHTML = html;
}

async function enhanceImage() {
    if (!currentFile || !isImage(currentFile)) {
        alert('Please select an image file');
        return;
    }
    
    const brightness = parseFloat(document.getElementById('brightness').value);
    const contrast = parseFloat(document.getElementById('contrast').value);
    const sharpness = parseFloat(document.getElementById('sharpness').value);
    
    try {
        const response = await fetch('/api/enhance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                file_id: currentFile,
                brightness: brightness,
                contrast: contrast,
                sharpness: sharpness
            })
        });
        
        const result = await response.json();
        if (result.success) {
            displayProcessedMedia(result.processed_file);
        }
    } catch (error) {
        console.error('Enhancement error:', error);
        alert('Enhancement failed: ' + error.message);
    }
}

async function applyStyleTransfer() {
    const contentImage = document.getElementById('contentImageSelect').value;
    const styleImage = document.getElementById('styleImageSelect').value;
    
    if (!contentImage || !styleImage) {
        alert('Please select both content and style images');
        return;
    }
    
    try {
        const response = await fetch('/api/style-transfer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content_image: contentImage,
                style_image: styleImage
            })
        });
        
        const result = await response.json();
        if (result.success) {
            displayProcessedMedia(result.processed_file);
        }
    } catch (error) {
        console.error('Style transfer error:', error);
        alert('Style transfer failed: ' + error.message);
    }
}

async function processVideo() {
    if (!currentFile || !isVideo(currentFile)) {
        alert('Please select a video file');
        return;
    }
    
    const previewSection = document.getElementById('previewSection');
    previewSection.style.display = 'block';
    previewSection.querySelector('#mediaPreview').innerHTML = '<div class="loading">Processing video</div>';
    
    try {
        const response = await fetch('/api/video/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ file_id: currentFile })
        });
        
        const result = await response.json();
        if (result.success) {
            displayProcessedMedia(result.processed_file);
        }
    } catch (error) {
        console.error('Video processing error:', error);
        alert('Video processing failed: ' + error.message);
    }
}

function displayProcessedMedia(filePath) {
    const previewSection = document.getElementById('previewSection');
    previewSection.style.display = 'block';
    
    const isVideo = filePath.includes('.mp4') || filePath.includes('.avi') || filePath.includes('.mov');
    
    const mediaPreview = document.getElementById('mediaPreview');
    if (isVideo) {
        mediaPreview.innerHTML = `
            <video controls>
                <source src="${filePath}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        mediaPreview.innerHTML = `<img src="${filePath}" alt="Processed image">`;
    }
}

function isImage(filename) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
}

function isVideo(filename) {
    return /\.(mp4|avi|mov|mkv)$/i.test(filename);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
