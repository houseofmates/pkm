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

  // generate icons for each density
  Object.entries(SIZES).forEach(([dir, size]) => {
    const targetDir = path.join(RES_DIR, dir);
    
    if (!fs.existsSync(targetDir)) {
      console.log(`skipping ${dir} (directory not found)`);
      return;
    }

    console.log(`generating ${size}px icon for ${dir}...`);

    // create a black background with the database icon centered
    // using ffmpeg: create black canvas, overlay icon centered
    const targetFile = path.join(targetDir, 'ic_launcher.png');
    const roundFile = path.join(targetDir, 'ic_launcher_round.png');
    
    // generate square icon with black background
    const cmd = `ffmpeg -y -f lavfi -i "color=c=${BG_COLOR}:s=${size}x${size}" -i "${SOURCE_IMAGE}" -filter_complex "[0:v][1:v]overlay=(W-w)/2:(H-h)/2:format=auto" -vframes 1 "${targetFile}"`;
    
    try {
      execSync(cmd, { stdio: 'ignore' });
      console.log(`  ✓ ${targetFile}`);
    } catch (e) {
      console.error(`  ✗ failed to generate ${targetFile}:`, e.message);
    }

    // generate round icon (same for now, android handles masking)
    if (fs.existsSync(roundFile)) {
      try {
        execSync(cmd.replace(targetFile, roundFile), { stdio: 'ignore' });
        console.log(`  ✓ ${roundFile}`);
      } catch (e) {
        console.error(`  ✗ failed to generate ${roundFile}:`, e.message);
      }
    }
  });

  console.log('\ndone! icons generated with database icon on black background.');
}

generateIcons();
