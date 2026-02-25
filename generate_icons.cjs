
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_IMAGE = './pkm-extension/icon-database-transparent.png';
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
            execSync(`ffmpeg -f lavfi -i color=black:s=${size}x${size} -i "${SOURCE_IMAGE}" -filter_complex "[1:v]scale=${size}:${size}[scaled]; [0:v][scaled]overlay=(W-w)/2:(H-h)/2" -y "${targetFile}"`);

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
