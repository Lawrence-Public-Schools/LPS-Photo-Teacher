console.log('LPS-Staff-Photo.js loaded'); // Log message to indicate script is loaded

// Utility: Detect if the browser is Safari/iOS
function isSafariOrIOS() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
} // Returns true if Safari or iOS device

// Utility: Detect if device is mobile
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
} // Returns true if mobile device

// Utility: Converts a base64 dataURL to Blobby
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(','); // Split the dataURL into header and data parts
    const mime = parts[0].match(/:(.*?);/)[1]; // Extract the MIME type from the header
    const binary = atob(parts[1]); // Decode the base64 data to binary string
    const array = []; // Create an array to hold byte values
    for (let i = 0; i < binary.length; i++) { // Loop through each character in the binary string
        array.push(binary.charCodeAt(i)); // Convert character to byte and add to array
    }
    return new Blob([new Uint8Array(array)], { type: mime }); // Create and return a Blob with the correct MIME type
}

// DOM element references
const startWebcamButton = document.getElementById('startWebcamButton');
const webcamContainer = document.getElementById('webcamContainer');
const video = document.getElementById('video');
const canvas = document.getElementById('videoCanvas');
const captureButton = document.getElementById('captureButton');
const previewImg = document.getElementById('previewImg');
const fileInput = document.getElementById('fileInput');
const submitButton = document.getElementById('submitButton');
const chooseFileLabel = document.getElementById('chooseFileLabel');
const imagePreview = document.getElementById('imagePreview');
const cancelButton = document.getElementById('cancelButton');
const flipCameraButton = document.getElementById('flipCameraButton');
const rotatePreviewBtn = document.getElementById('rotatePreviewBtn');
const clearPreviewButton = document.getElementById('clearPreviewButton');
const uploadActionButtons = document.getElementById('uploadActionButtons');

// State variables
let stream;
let capturedImageData = null;
let currentFacingMode = 'user';
let rotation = 0;

// Helper: center-crop and draw video to canvas at 5:6 aspect ratio (aspect = 120/144)
function drawCroppedVideoToCanvas(video, canvas, context) {
    const TARGET_ASPECT = 120 / 144;
    const vidW = video.videoWidth;
    const vidH = video.videoHeight;
    const vidAspect = vidW / vidH;
    let sx, sy, sw, sh;
    if (vidAspect > TARGET_ASPECT) {
        // Video is wider than target: crop sides
        sh = vidH;
        sw = sh * TARGET_ASPECT;
        sx = (vidW - sw) / 2;
        sy = 0;
    } else {
        // Video is taller than target: crop top/bottom
        sw = vidW;
        sh = sw / TARGET_ASPECT;
        sx = 0;
        sy = (vidH - sh) / 2;
    }
    context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
}

// Set video/canvas size and aspect ratio for preview
function setVideoAndCanvasSize() {
    video.width = TARGET_WIDTH;
    video.height = TARGET_HEIGHT;
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
}

// Show flip camera button on mobile
if (isMobileDevice()) {
    flipCameraButton.style.display = 'block';
}

// File input: preview and show confirm button
fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        uploadActionButtons.style.display = 'flex';
        submitButton.style.display = 'inline-block';
        chooseFileLabel.style.display = 'inline-block';
        imagePreview.style.display = 'block';
        const reader = new FileReader(); // Create a FileReader to read the file
        reader.onload = function (e) {
            previewImg.src = e.target.result; // Set preview image source to the selected file
            capturedImageData = null; // Clear webcam image if a file is chosen
        }
        reader.readAsDataURL(this.files[0]); // Read the file as a data URL
    } else { // If no file is selected
        uploadActionButtons.style.display = 'none';
        submitButton.style.display = 'none'; // Hide the confirm upload button
        chooseFileLabel.style.display = 'inline-block';
        imagePreview.style.display = 'none';
        previewImg.src = '#'; // Reset the preview image source
        capturedImageData = null;
    }
});

// Webcam: open popup and start camera
startWebcamButton.addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ video: true })
        .then((mediaStream) => {
            stream = mediaStream;
            currentFacingMode = 'user';
            video.onloadedmetadata = function () {
                // No need to set video/canvas size here; CSS controls display size
            };
            if (isSafariOrIOS()) {
                const context = canvas.getContext('2d');
                canvas.style.display = 'block';
                video.style.display = 'none';
                const updateCanvas = () => {
                    if (stream) {
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        if (currentFacingMode === 'user') {
                            context.save();
                            context.translate(canvas.width, 0);
                            context.scale(-1, 1);
                            drawCroppedVideoToCanvas(video, canvas, context);
                            context.restore();
                        } else {
                            drawCroppedVideoToCanvas(video, canvas, context);
                        }
                        requestAnimationFrame(updateCanvas);
                    }
                };
                video.srcObject = stream;
                video.play();
                updateCanvas();
            } else {
                video.srcObject = stream;
                video.style.display = 'block';
                canvas.style.display = 'none';
                // Mirror the video element for user-facing camera (desktop)
                if (currentFacingMode === 'user') {
                    video.style.transform = 'scaleX(-1)';
                } else {
                    video.style.transform = '';
                }
            }
            webcamContainer.style.display = 'block';
            startWebcamButton.style.display = 'none';
            imagePreview.style.display = 'none';
        })
        .catch((error) => console.error('Error accessing webcam:', error));
});

// Webcam: capture image
captureButton.addEventListener('click', () => {
    // Set canvas size to match display size (CSS: 360x432)
    canvas.width = 360;
    canvas.height = 432;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (currentFacingMode === 'user') {
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1); // Flip horizontally for user-facing camera
        drawCroppedVideoToCanvas(video, canvas, context);
        context.restore();
    } else {
        drawCroppedVideoToCanvas(video, canvas, context); // Draw video to canvas
    }
    capturedImageData = canvas.toDataURL('image/jpeg'); // Convert canvas to base64 data URL
    if (stream) {
        stream.getTracks().forEach((track) => track.stop()); // Stop all webcam tracks to release camera
    }
    previewImg.src = capturedImageData; // Set preview image source to captured data
    webcamContainer.style.display = 'none';
    startWebcamButton.style.display = 'block';
    uploadActionButtons.style.display = 'flex';
    submitButton.style.display = 'inline-block';
    chooseFileLabel.style.display = 'inline-block'; // Show the "Choose File" label
    imagePreview.style.display = 'block';
});

// Webcam: cancel and close
cancelButton.addEventListener('click', () => { // When the cancel button is clicked
    if (stream) {
        stream.getTracks().forEach((track) => track.stop()); // Stop all webcam tracks if streaming
    }
    webcamContainer.style.display = 'none'; // Hide the webcam popup/container
    startWebcamButton.style.display = 'block'; // Show the "Take a New Picture" button again
});

// Webcam: flip camera
if (flipCameraButton) {
    flipCameraButton.addEventListener('click', () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop()); // Stop all webcam tracks to release camera
            currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'; // Toggle facing mode
            const facingModeConstraint = { video: { facingMode: { ideal: currentFacingMode } } }; // Set facing mode constraint
            navigator.mediaDevices.getUserMedia(facingModeConstraint)
                .then((mediaStream) => {
                    stream = mediaStream;
                    video.onloadedmetadata = function () {
                        // No need to set video/canvas size here; CSS controls display size
                    };
                    if (isSafariOrIOS()) { // If Safari or iOS, use canvas for preview
                        const context = canvas.getContext('2d');
                        canvas.style.display = 'block';
                        video.style.display = 'none';
                        const updateCanvas = () => {
                            if (stream) {
                                context.clearRect(0, 0, canvas.width, canvas.height);
                                if (currentFacingMode === 'user') {
                                    context.save();
                                    context.translate(canvas.width, 0);
                                    context.scale(-1, 1); // Flip horizontally for user-facing camera
                                    drawCroppedVideoToCanvas(video, canvas, context);
                                    context.restore();
                                } else {
                                    drawCroppedVideoToCanvas(video, canvas, context);
                                }
                                requestAnimationFrame(updateCanvas);
                            }
                        };
                        video.srcObject = stream; // Set video source to the new stream
                        video.play();
                        updateCanvas();
                    } else {
                        video.srcObject = stream; // Set video source to the new stream
                        video.style.display = 'block';
                        canvas.style.display = 'none';
                        // Mirror the video element for user-facing camera (desktop)
                        if (currentFacingMode === 'user') {
                            video.style.transform = 'scaleX(-1)';
                        } else {
                            video.style.transform = '';
                        }
                    }
                })
                .catch((error) => console.error('Error flipping camera:', error));
        }
    });
}

// Image preview: rotate
if (rotatePreviewBtn && previewImg) { // If rotate button and preview image exist
    rotatePreviewBtn.addEventListener('click', function () { // When rotate button is clicked
        rotation = (rotation + 90) % 360; // Increase rotation by 90 degrees, keep within 0-359
        previewImg.style.transform = `rotate(${rotation}deg)`; // Apply rotation to preview image
    });
}

// Reset preview rotation on new file or capture
function resetPreviewRotation() { // Reset rotation state and preview image transform
    rotation = 0;
    if (previewImg) previewImg.style.transform = 'rotate(0deg)'; // Set preview image rotation to 0
}
fileInput.addEventListener('change', resetPreviewRotation); // Reset rotation when a new file is selected
captureButton.addEventListener('click', resetPreviewRotation); // Reset rotation when a new webcam photo is captured

// Confirm upload: handle file or captured image
const uploadForm = document.getElementById('uploadForm');
uploadForm.addEventListener('submit', function (event) { // When the form is submitted
    event.preventDefault(); // Always prevent default form submission
    // Get real values from hidden inputs
    const frn = document.querySelector('input[name="frn"]').value;
    const curtchrid = document.querySelector('input[name="curtchrid"]').value;
    // Always upload the most recently previewed image (file or webcam)
    if (capturedImageData) { // If a webcam photo was captured and is in preview
        const img = new window.Image(); // Create an image element
        img.onload = function () { // When image is loaded
            let canvas = document.createElement('canvas'); // Create a canvas for rotation
            let ctx = canvas.getContext('2d'); // Get canvas context
            if (rotation % 180 === 0) { // If rotation is 0 or 180
                canvas.width = img.width; // Set canvas width to image width
                canvas.height = img.height; // Set canvas height to image height
            } else { // If rotation is 90 or 270
                canvas.width = img.height; // Swap width and height
                canvas.height = img.width;
            }
            ctx.save(); // Save context state
            ctx.translate(canvas.width / 2, canvas.height / 2); // Move origin to center
            ctx.rotate((rotation * Math.PI) / 180); // Rotate canvas by current rotation
            ctx.drawImage(img, -img.width / 2, -img.height / 2); // Draw image centered
            ctx.restore(); // Restore context state
            canvas.toBlob(function (blob) { // Convert canvas to Blob
                const formData = new FormData(); // Create FormData for upload
                formData.append('ac', 'submitteacherphoto');
                formData.append('frn', frn);
                formData.append('curtchrid', curtchrid);
                formData.append('filename', blob, 'captured-image.jpg');
                fetch('LPS-Staff-Photo.html?frn=' + encodeURIComponent(frn), { // Send POST request to upload
                    method: 'POST',
                    body: formData,
                })
                    .then((response) => {
                        if (response.ok) { // If upload successful
                            location.reload(); // Reload page to show new photo
                        } else {
                            alert('Failed to upload the picture.'); // Show error if failed
                        }
                    })
                    .catch((error) => console.error('Error uploading picture (captured):', error)); // Log error
            }, 'image/jpeg'); // Use jpeg format
        };
        img.src = capturedImageData; // Set image source to captured data
    } else if (fileInput.files && fileInput.files.length > 0) { // If a file is selected and no webcam photo is in preview
        const file = fileInput.files[0]; // Get the selected file
        const reader = new FileReader(); // Create a FileReader to read the file
        reader.onload = function (e) { // When file is loaded
            const img = new window.Image(); // Create an image element
            img.onload = function () { // When image is loaded
                let canvas = document.createElement('canvas'); // Create a canvas for rotation
                let ctx = canvas.getContext('2d'); // Get canvas context
                if (rotation % 180 === 0) { // If rotation is 0 or 180
                    canvas.width = img.width; // Set canvas width to image width
                    canvas.height = img.height; // Set canvas height to image height
                } else { // If rotation is 90 or 270
                    canvas.width = img.height; // Swap width and height
                    canvas.height = img.width;
                }
                ctx.save(); // Save context state
                ctx.translate(canvas.width / 2, canvas.height / 2); // Move origin to center
                ctx.rotate((rotation * Math.PI) / 180); // Rotate canvas by current rotation
                ctx.drawImage(img, -img.width / 2, -img.height / 2); // Draw image centered
                ctx.restore(); // Restore context state
                canvas.toBlob(function (blob) { // Convert canvas to Blob
                    const formData = new FormData(); // Create FormData for upload
                    formData.append('ac', 'submitteacherphoto');
                    formData.append('frn', frn);
                    formData.append('curtchrid', curtchrid);
                    formData.append('filename', blob, file.name);
                    fetch('LPS-Staff-Photo.html?frn=' + encodeURIComponent(frn), { // Send POST request to upload
                        method: 'POST',
                        body: formData,
                    })
                        .then((response) => {
                            if (response.ok) { // If upload successful
                                location.reload(); // Reload page to show new photo
                            } else {
                                alert('Failed to upload the picture.'); // Show error if failed
                            }
                        })
                        .catch((error) => console.error('Error uploading picture:', error)); // Log error
                }, file.type || 'image/jpeg'); // Use file type or jpeg
            };
            img.src = e.target.result; // Set image source to file data
        };
        reader.readAsDataURL(file); // Read file as data URL
    }
});

// Clear preview: reset all states and hide UI
if (clearPreviewButton) {
    clearPreviewButton.addEventListener('click', function () {
        previewImg.src = '#';
        imagePreview.style.display = 'none';
        uploadActionButtons.style.display = 'none';
        submitButton.style.display = 'none';
        chooseFileLabel.style.display = 'inline-block';
        fileInput.value = '';
        capturedImageData = null;
        rotation = 0;
        if (previewImg) previewImg.style.transform = 'rotate(0deg)';
    });
}

// Working on crop preview functionality
// --- Crop Preview State ---
let crop = {
    scale: 1,
    minScale: 1,
    maxScale: 3,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    imgStartX: 0,
    imgStartY: 0,
    imgNaturalWidth: 0,
    imgNaturalHeight: 0,
    aspect: 360 / 432
};

const cropArea = document.querySelector('.crop-area');
const cropZoomSlider = document.getElementById('cropZoomSlider');

// --- Crop Preview Logic ---
function updateCropPreview() {
    if (!previewImg.src || previewImg.src === '#') return;
    const img = previewImg;
    const areaW = 360, areaH = 432;
    // Calculate scaled image size
    const scale = crop.scale;
    const imgW = crop.imgNaturalWidth * scale;
    const imgH = crop.imgNaturalHeight * scale;
    // Centered position
    const x = crop.offsetX;
    const y = crop.offsetY;
    img.style.width = imgW + 'px';
    img.style.height = imgH + 'px';
    img.style.left = x + 'px';
    img.style.top = y + 'px';
    img.style.transform = `rotate(${rotation}deg)`;
}

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

// When image loads, fit to crop area and set min zoom
previewImg.onload = function () {
    crop.imgNaturalWidth = previewImg.naturalWidth;
    crop.imgNaturalHeight = previewImg.naturalHeight;
    // Fit image to cover crop area
    const scaleX = 360 / crop.imgNaturalWidth;
    const scaleY = 432 / crop.imgNaturalHeight;
    crop.minScale = Math.max(scaleX, scaleY);
    crop.scale = crop.minScale;
    crop.maxScale = Math.max(3, crop.minScale);
    crop.offsetX = (360 - crop.imgNaturalWidth * crop.scale) / 2;
    crop.offsetY = (432 - crop.imgNaturalHeight * crop.scale) / 2;
    cropZoomSlider.min = crop.minScale;
    cropZoomSlider.max = crop.maxScale;
    cropZoomSlider.value = crop.scale;
    updateCropPreview();
};

// Zoom slider
cropZoomSlider.addEventListener('input', function () {
    const prevScale = crop.scale;
    crop.scale = parseFloat(this.value);
    // Adjust offset to zoom to center
    const centerX = 360 / 2 - crop.offsetX;
    const centerY = 432 / 2 - crop.offsetY;
    crop.offsetX -= (crop.scale - prevScale) * (centerX / prevScale);
    crop.offsetY -= (crop.scale - prevScale) * (centerY / prevScale);
    updateCropPreview();
});

// Drag logic
cropArea.addEventListener('pointerdown', function (e) {
    crop.dragging = true;
    crop.dragStartX = e.clientX;
    crop.dragStartY = e.clientY;
    crop.imgStartX = crop.offsetX;
    crop.imgStartY = crop.offsetY;
    cropArea.setPointerCapture(e.pointerId);
});
cropArea.addEventListener('pointermove', function (e) {
    if (!crop.dragging) return;
    const dx = e.clientX - crop.dragStartX;
    const dy = e.clientY - crop.dragStartY;
    crop.offsetX = crop.imgStartX + dx;
    crop.offsetY = crop.imgStartY + dy;
    // Clamp so image always covers crop area
    const imgW = crop.imgNaturalWidth * crop.scale;
    const imgH = crop.imgNaturalHeight * crop.scale;
    crop.offsetX = clamp(crop.offsetX, 360 - imgW, 0);
    crop.offsetY = clamp(crop.offsetY, 432 - imgH, 0);
    updateCropPreview();
});
cropArea.addEventListener('pointerup', function (e) {
    crop.dragging = false;
    cropArea.releasePointerCapture(e.pointerId);
});
cropArea.addEventListener('pointerleave', function (e) {
    crop.dragging = false;
});

// When file is chosen, reset crop
fileInput.addEventListener('change', function () {
    crop.offsetX = 0;
    crop.offsetY = 0;
    crop.scale = 1;
    updateCropPreview();
});

// When rotating, update preview
if (rotatePreviewBtn && previewImg) {
    rotatePreviewBtn.addEventListener('click', function () {
        updateCropPreview();
    });
}

// Crop and upload final image
function getCroppedImageBlob(callback) {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 432;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    ctx.drawImage(
        previewImg,
        -crop.offsetX / crop.scale,
        -crop.offsetY / crop.scale,
        360 / crop.scale,
        432 / crop.scale,
        0, 0, 360, 432
    );
    ctx.restore();
    canvas.toBlob(callback, 'image/jpeg');
}