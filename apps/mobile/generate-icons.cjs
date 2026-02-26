// generate android app icons from the database icon with black background
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// source: database icon with transparent background
const SOURCE_IMAGE = path.join(__dirname, '../../pkm-extension/icon-database-transparent.png');
// android res directory
const RES_DIR = path.join(__dirname, 'android/app/src/main/res');

// icon sizes for each density
const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

// adaptive icon foreground sizes (108dp safe zone, icon goes inside the inner 72dp circle)
const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432
};

// background color (black)
const BG_COLOR = '#050505';

function generateIcons() {
  console.log('generating android app icons...');
  console.log('source:', SOURCE_IMAGE);
  console.log('background:', BG_COLOR);

  // check source exists
  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error('source image not found:', SOURCE_IMAGE);
    process.exit(1);
  }

  // check ffmpeg is available
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch (e) {
    console.error('ffmpeg not found. please install ffmpeg.');
    process.exit(1);
  }

  // generate launcher icons for each density
  Object.entries(SIZES).forEach(([dir, size]) => {
    const targetDir = path.join(RES_DIR, dir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    console.log(`generating ${size}px icon for ${dir}...`);

    const targetFile = path.join(targetDir, 'ic_launcher.png');
    const roundFile = path.join(targetDir, 'ic_launcher_round.png');

    // scale the icon to ~80% of canvas with padding, centered on black background
    const iconSize = Math.round(size * 0.75);
    const cmd = `ffmpeg -y -f lavfi -i "color=c=${BG_COLOR}:s=${size}x${size}" -i "${SOURCE_IMAGE}" -filter_complex "[1:v]scale=${iconSize}:${iconSize}:flags=lanczos[icon];[0:v][icon]overlay=(W-w)/2:(H-h)/2:format=auto" -vframes 1 "${targetFile}"`;

    try {
      execSync(cmd, { stdio: 'ignore' });
      console.log(`  ✓ ${targetFile}`);
    } catch (e) {
      console.error(`  ✗ failed to generate ${targetFile}:`, e.message);
    }

    // generate round icon (same image, android handles circular masking)
    try {
      execSync(cmd.replace(targetFile, roundFile), { stdio: 'ignore' });
      console.log(`  ✓ ${roundFile}`);
    } catch (e) {
      console.error(`  ✗ failed to generate ${roundFile}:`, e.message);
    }
  });

  // generate adaptive icon foreground PNGs (larger canvas with icon centered)
  Object.entries(FOREGROUND_SIZES).forEach(([dir, size]) => {
    const targetDir = path.join(RES_DIR, dir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fgFile = path.join(targetDir, 'ic_launcher_foreground.png');
    // the icon should fill about 66% of the adaptive icon canvas (the safe zone)
    const iconSize = Math.round(size * 0.55);

    console.log(`generating ${size}px adaptive foreground for ${dir}...`);

    // transparent background so only the foreground icon shows
    const cmd = `ffmpeg -y -f lavfi -i "color=c=black@0:s=${size}x${size},format=rgba" -i "${SOURCE_IMAGE}" -filter_complex "[1:v]scale=${iconSize}:${iconSize}:flags=lanczos[icon];[0:v][icon]overlay=(W-w)/2:(H-h)/2:format=auto" -vframes 1 "${fgFile}"`;

    try {
      execSync(cmd, { stdio: 'ignore' });
      console.log(`  ✓ ${fgFile}`);
    } catch (e) {
      console.error(`  ✗ failed to generate ${fgFile}:`, e.message);
    }
  });

  console.log('\ndone! icons generated with database icon on black background.');
}

generateIcons();
