
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_IMAGE = '/home/house/.gemini/antigravity/brain/2049f63d-22e9-43e1-a144-f4322917ac2e/uploaded_image_1767134844877.png';
const RES_DIR = '/home/house/pkm/android/app/src/main/res';

const SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
};

try {
    // Check ffmpeg
    execSync('ffmpeg -version');
    console.log('ffmpeg found. Generating icons...');

    Object.entries(SIZES).forEach(([dir, size]) => {
        const targetDir = path.join(RES_DIR, dir);
        if (fs.existsSync(targetDir)) {
            const targetFile = path.join(targetDir, 'ic_launcher.png');
            console.log(`Generating ${size}px icon for ${dir}...`);
            // ffmpeg -i input.png -vf scale=48:48 output.png
            execSync(`ffmpeg -y -i "${SOURCE_IMAGE}" -vf scale=${size}:${size} "${targetFile}"`);

            const roundFile = path.join(targetDir, 'ic_launcher_round.png');
            if (fs.existsSync(roundFile)) {
                execSync(`ffmpeg -y -i "${SOURCE_IMAGE}" -vf scale=${size}:${size} "${roundFile}"`);
            }
        }
    });
    console.log('Icons generated successfully.');

} catch (e) {
    console.error('Error generating icons:', e.message);
}
