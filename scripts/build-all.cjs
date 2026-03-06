#!/usr/bin/env node
/**
 * build-all.cjs
 * builds appimage, deb, exe, and apk for pkm
 * outputs to /releases folder
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RELEASES_DIR = path.join(__dirname, '..', 'releases');
const MONOREPO_ROOT = path.join(__dirname, '..');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function step(num, message) {
  log(colors.blue, `STEP ${num}`, message);
}

function success(message) {
  log(colors.green, 'SUCCESS', message);
}

function error(message) {
  log(colors.red, 'ERROR', message);
  process.exit(1);
}

function run(command, options = {}) {
  log(colors.yellow, 'RUN', command);
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: options.cwd || MONOREPO_ROOT,
      ...options
    });
  } catch (e) {
    error(`command failed: ${command}`);
  }
}

function ensureReleasesDir() {
  if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
  }
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(MONOREPO_ROOT, 'package.json'), 'utf8'));
  return pkg.version || '0.0.0';
}

function timestamp() {
  return Date.now();
}

async function main() {
  console.log('');
  log(colors.blue, 'BUILD', 'starting build for all platforms...');
  console.log('');

  ensureReleasesDir();

  const version = getVersion();
  const ts = timestamp();
  const buildId = `${version}-${ts}`;

  // step 1: build web assets
  step(1, 'building web assets...');
  run('npm run build', { env: { ...process.env, VITE_API_URL: 'https://pkm.houseofmates.space/api' } });
  success('web assets built');

  // step 2: build electron apps (appimage, deb, exe)
  step(2, 'building electron apps (appimage, deb, exe)...');
  run('npm run electron:build', { cwd: path.join(MONOREPO_ROOT, 'apps', 'desktop-electron') });
  success('electron apps built');

  // copy electron outputs to releases
  const electronReleaseDir = path.join(MONOREPO_ROOT, 'apps', 'desktop-electron', 'release');
  if (fs.existsSync(electronReleaseDir)) {
    const files = fs.readdirSync(electronReleaseDir);
    files.forEach(file => {
      const src = path.join(electronReleaseDir, file);
      const dest = path.join(RELEASES_DIR, `pkm-${file}`);
      fs.copyFileSync(src, dest);
      log(colors.green, 'COPY', `copied ${file} to releases/`);
    });
  }

  // step 3: build android apk
  step(3, 'building android apk...');
  const mobileDir = path.join(MONOREPO_ROOT, 'apps', 'mobile');
  
  // build web first
  run('npm run build', { cwd: mobileDir });
  
  // sync capacitor
  run('npx cap sync android', { cwd: mobileDir });
  
  // patch java version if needed
  const gradleFiles = execSync('find android -name "*.gradle" 2>/dev/null || true', { cwd: mobileDir })
    .toString()
    .split('\n')
    .filter(f => f);
  
  gradleFiles.forEach(file => {
    const filePath = path.join(mobileDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('JavaVersion.VERSION_21')) {
      content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
      fs.writeFileSync(filePath, content);
      log(colors.yellow, 'PATCH', `patched java version in ${file}`);
    }
  });
  
  // build apk
  run('./gradlew assembleRelease', { cwd: path.join(mobileDir, 'android') });
  
  // copy apk to releases
  const apkSource = path.join(mobileDir, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
  const apkDest = path.join(RELEASES_DIR, `pkm-apk-${buildId}.apk`);
  if (fs.existsSync(apkSource)) {
    fs.copyFileSync(apkSource, apkDest);
    log(colors.green, 'COPY', `copied apk to releases/`);
  } else {
    error(`apk not found at ${apkSource}`);
  }

  // step 4: create version.json
  step(4, 'creating version.json...');
  const versionJson = {
    version: ts.toString(),
    buildId,
    releaseDate: new Date().toISOString(),
    releases: {
      appimage: `pkm-${buildId}-linux.AppImage`,
      deb: `pkm-${buildId}.deb`,
      exe: `pkm-${buildId}.exe`,
      apk: `pkm-apk-${buildId}.apk`
    }
  };
  fs.writeFileSync(path.join(RELEASES_DIR, 'version.json'), JSON.stringify(versionJson, null, 2));
  success('version.json created');

  console.log('');
  log(colors.green, 'COMPLETE', 'all builds complete!');
  console.log('');
  console.log('outputs:');
  console.log(`  appimage: releases/pkm-${buildId}-linux.AppImage`);
  console.log(`  deb:     releases/pkm-${buildId}.deb`);
  console.log(`  exe:     releases/pkm-${buildId}.exe`);
  console.log(`  apk:     releases/pkm-apk-${buildId}.apk`);
  console.log('');
}

main().catch(err => {
  error(err.message);
});

