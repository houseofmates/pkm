// generate app icons for android APK with database icon on black background
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// source: database icon from extension
const SOURCE_ICON = path.join(__dirname, '../pkm-extension/icon-database-transparent.png');
// output: android res directory
const RES_DIR = path.join(__dirname, '../apps/mobile/android/app/src/main/res');

// android icon sizes
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
  console.log('generating app icons with database icon on black background...');
  
  // verify source exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`source icon not found: ${SOURCE_ICON}`);
    process.exit(1);
  }

  // check ffmpeg
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch (e) {
    console.error('ffmpeg not found. please install ffmpeg.');
    process.exit(1);
  }

  // generate each size
  Object.entries(SIZES).forEach(([dir, size]) => {
    const targetDir = path.join(RES_DIR, dir);
    
    if (!fs.existsSync(targetDir)) {
      console.log(`creating directory: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'ic_launcher.png');
    const roundFile = path.join(targetDir, 'ic_launcher_round.png');
    const foregroundFile = path.join(targetDir, 'ic_launcher_foreground.png');

    console.log(`generating ${size}px icons for ${dir}...`);

    // create black background with scaled icon centered
    // scale icon to 75% of canvas size so it fills nicely
    const iconSize = Math.floor(size * 0.75);
    const offset = Math.floor((size - iconSize) / 2);

    // generate square icon (ic_launcher.png)
    const cmd = `ffmpeg -y -f lavfi -i "color=c=${BG_COLOR}:s=${size}x${size}" -i "${SOURCE_ICON}" -filter_complex "[1:v]scale=${iconSize}:${iconSize}:force_original_aspect_ratio=decrease[icon];[0:v][icon]overlay=${offset}:${offset}" -frames:v 1 "${targetFile}"`;
    
    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`  created: ${targetFile}`);
    } catch (e) {
      console.error(`  failed to create ${targetFile}:`, e.message);
    }

    // generate round icon (same for now, android will mask it)
    try {
      fs.copyFileSync(targetFile, roundFile);
      console.log(`  created: ${roundFile}`);
    } catch (e) {
      console.error(`  failed to create ${roundFile}:`, e.message);
    }

    // generate foreground (transparent icon only, for adaptive icons)
    const fgCmd = `ffmpeg -y -i "${SOURCE_ICON}" -filter_complex "scale=${iconSize}:${iconSize}:force_original_aspect_ratio=decrease,format=rgba" -frames:v 1 "${foregroundFile}"`;
    
    try {
      execSync(fgCmd, { stdio: 'inherit' });
      console.log(`  created: ${foregroundFile}`);
    } catch (e) {
      console.error(`  failed to create ${foregroundFile}:`, e.message);
    }
  });

  console.log('\nicon generation complete!');
  console.log('icons location:', RES_DIR);
}

// run
generateIcons();
