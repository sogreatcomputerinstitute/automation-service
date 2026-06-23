const fs = require('fs');
const path = require('path');

/**
 * Uploads all files in the screenshot folder and safely wipes them from disk when done.
 * @param {string} description - The textual summary context for the execution run.
 * @param {string} endpointUrl - Your remote server API endpoint.
 */

// Ensure the folder exists right away so Puppeteer doesn't throw directory errors
const screenshotDir = path.join(__dirname, 'screenshots');
if (!fs.existsSync(screenshotDir)){
    fs.mkdirSync(screenshotDir);
}

async function sendAndCleanupScreenshots(description, endpointUrl, telegramid) {
    // Target the specific 'screenshots' folder relative to your script
    const directoryPath = path.join(__dirname, 'screenshots');
    let imageFiles = [];

    try {
        // 1. Safety check: Verify if the directory even exists
        if (!fs.existsSync(directoryPath)) {
            console.log('Screenshots folder does not exist. Skipping file sync.');
            return;
        }

        // 2. Scan the folder for images
        const files = fs.readdirSync(directoryPath);
        imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
        });

        if (imageFiles.length === 0) {
            console.log('No screenshots found in folder to upload.');
            return;
        }

        // 3. Construct Multi-part FormData Payload
        const formData = new FormData();
        formData.append('description', description);
        formData.append('timestamp', new Date().toISOString());

        for (const file of imageFiles) {
            const absolutePath = path.join(directoryPath, file);
            const fileBuffer = fs.readFileSync(absolutePath);
            const blob = new Blob([fileBuffer], { type: 'image/png' });
            
            formData.append('images', blob, file);
            console.log(`Payload staging: Added ${file}`);
        }

        // 4. Dispatch Payload over the Network
        console.log(`Transmitting files to server endpoint...`);
        const response = await fetch(`${endpointUrl}/${telegramid}`, {
            method: 'POST',
            body: formData, // Node automatically configures multi-part boundary string headers
        });

        if (!response.ok) {
            throw new Error(`Server network failure: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Upload verified successfully by remote receiver:', result);
        return result;

    } catch (error) {
        console.error('An error occurred during file sync pipeline:', error);
    } finally {
        // 5. LOCAL CLEANUP LOOP: This runs *no matter what* (even if fetch threw an error)
        if (imageFiles.length > 0) {
            console.log('Initiating disk cleanup protocol inside screenshots folder...');
            
            for (const file of imageFiles) {
                const targetFilePath = path.join(directoryPath, file);
                try {
                    if (fs.existsSync(targetFilePath)) {
                        fs.unlinkSync(targetFilePath); // Deletes the file immediately
                        console.log(`Successfully purged from server disk: ${file}`);
                    }
                } catch (cleanupError) {
                    console.error(`Failed to wipe asset file ${file}:`, cleanupError);
                }
            }
        }
    }
}

module.exports = sendAndCleanupScreenshots;
