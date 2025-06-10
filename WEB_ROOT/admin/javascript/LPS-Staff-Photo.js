console.log('LPS-Staff-Photo.js loaded'); // Log message to indicate script is loaded

// Utility: Detect if the browser is Safari/iOS
function isSafariOrIOS() {
    return /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || /iPad|iPhone|iPod/.test(navigator.userAgent);
} // Returns true if Safari or iOS device

// Utility: Detect if device is mobile
function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
} // Returns true if mobile device

// Utility: Converts a base64 dataURL to Blob
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

// State variables
let stream;
let capturedImageData = null;
let currentFacingMode = 'user';
let rotation = 0;

// Show flip camera button on mobile
if (isMobileDevice()) {
    flipCameraButton.style.display = 'block';
}

// File input: preview and show confirm button
fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
        submitButton.style.display = 'inline-block'; // Show the confirm upload button, hide the choose file label, show the image preview section
        chooseFileLabel.style.display = 'none';
        imagePreview.style.display = 'block';
        const reader = new FileReader(); // Create a FileReader to read the file
        reader.onload = function (e) {
            previewImg.src = e.target.result; // Set preview image source to the selected file
        }
        reader.readAsDataURL(this.files[0]); // Read the file as a data URL
    } else { // If no file is selected
        submitButton.style.display = 'none'; // Hide the confirm upload button, show choose file label, hide image preview section
        chooseFileLabel.style.display = 'inline-block';
        imagePreview.style.display = 'none';
        previewImg.src = '#'; // Reset the preview image source
    }
});

// Webcam: open popup and start camera
startWebcamButton.addEventListener('click', () => {
    navigator.mediaDevices.getUserMedia({ video: true }) // Request webcam access
        .then((mediaStream) => {
            stream = mediaStream; // Start the media stream
            currentFacingMode = 'user'; // Default to front camera
            if (isSafariOrIOS()) { // Special handling for Safari/iOS
                const context = canvas.getContext('2d');
                canvas.style.display = 'block'; // Show canvas if Safari/iOS and hide video element
                video.style.display = 'none';
                const updateCanvas = () => {
                    if (stream) {
                        if (currentFacingMode === 'user' && isMobileDevice()) {
                            context.save();
                            context.translate(canvas.width, 0);
                            context.scale(-1, 1); // Mirror for front camera
                            context.drawImage(video, 0, 0, canvas.width, canvas.height);
                            context.restore();
                        } else {
                            context.clearRect(0, 0, canvas.width, canvas.height);
                            context.drawImage(video, 0, 0, canvas.width, canvas.height); // Draw video frame if not mobile or not front camera
                        }
                        requestAnimationFrame(updateCanvas); // Continuously update canvas from the video stream
                    }
                };
                video.srcObject = stream; // Set video source, start video playback, and start updating canvas
                video.play();
                updateCanvas();
            } else {
                video.srcObject = stream; // Set video source, show video element, hide canvas
                video.style.display = 'block';
                canvas.style.display = 'none';
            }
            webcamContainer.style.display = 'block'; // Show webcam popup, hide start button, hide image preview
            startWebcamButton.style.display = 'none';
            imagePreview.style.display = 'none';
        })
        .catch((error) => console.error('Error accessing webcam:', error));
});

// Webcam: capture image
captureButton.addEventListener('click', () => {
    const context = canvas.getContext('2d'); // Get canvas drawing context
    canvas.width = 360;
    canvas.height = 432;
    if (currentFacingMode === 'user' && isMobileDevice()) {
        context.save();
        context.translate(canvas.width, 0);
        context.scale(-1, 1); // Mirror for front camera on mobile
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.restore();
    } else {
        context.drawImage(video, 0, 0, canvas.width, canvas.height); // Draw video frame to canvas if not mobile or not front camera
    }
    capturedImageData = canvas.toDataURL('image/jpeg'); // Save captured image as data URL
    if (stream) {
        stream.getTracks().forEach((track) => track.stop()); // Stop webcam stream
    }
    previewImg.src = capturedImageData; // Show captured image in preview, hide webcam popup, show "Take a New Picture" button, hide choose file label, and show image preview section
    webcamContainer.style.display = 'none';
    startWebcamButton.style.display = 'block';
    submitButton.style.display = 'inline-block';
    chooseFileLabel.style.display = 'none';
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
            stream.getTracks().forEach((track) => track.stop()); // Stop current webcam stream
        }
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user'; // Toggle camera facing mode
        const facingModeConstraint = { video: { facingMode: { ideal: currentFacingMode } } }; // Set facing mode constraint
        navigator.mediaDevices.getUserMedia(facingModeConstraint)
            .then((mediaStream) => {
                stream = mediaStream; // Start new media stream with selected camera
                if (isSafariOrIOS()) { // Special handling for Safari/iOS
                    const context = canvas.getContext('2d');
                    canvas.style.display = 'block'; // Show canvas for Safari/iOS
                    video.style.display = 'none'; // Hide video element
                    const updateCanvas = () => {
                        if (stream) {
                            if (currentFacingMode === 'user' && isMobileDevice()) {
                                context.save();
                                context.translate(canvas.width, 0);
                                context.scale(-1, 1); // Mirror for front camera
                                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                                context.restore();
                            } else {
                                context.clearRect(0, 0, canvas.width, canvas.height);
                                context.drawImage(video, 0, 0, canvas.width, canvas.height); // Draw video frame if not mirrored
                            }
                            requestAnimationFrame(updateCanvas); // Continuously update canvas
                        }
                    };
                    video.srcObject = stream; // Set video source to new stream, start video playback, and start updating canvas
                    video.play();
                    updateCanvas();
                } else {
                    video.srcObject = stream; // Set video source to new stream, show video element, hide canvas
                    video.style.display = 'block';
                    canvas.style.display = 'none';
                }
            })
            .catch((error) => console.error('Error flipping camera:', error)); // Log error if camera flip fails
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
    if (fileInput.files && fileInput.files.length > 0) { // If a file is selected
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
    } else if (capturedImageData) { // If a webcam photo was captured
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
    }
});