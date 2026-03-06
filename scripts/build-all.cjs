#!/usr/bin/env node
/**
 * build-all.cjs
 * builds appimage, deb, exe, and apk for pkm
 * outputs to /releases folder
 * 
 * usage:
 *   node scripts/build-all.cjs           # build all platforms
 *   node scripts/build-all.cjs --linux   # build linux only
 *   node scripts/build-all.cjs --apk     # build apk only
 *   node scripts/build-all.cjs --clean   # clean releases folder first
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RELEASES_DIR = path.join(__dirname, '..', 'releases');
const MONOREPO_ROOT = path.join(__dirname, '..');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
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

function warn(message) {
  log(colors.yellow, 'WARN', message);
}

function error(message) {
  log(colors.red, 'ERROR', message);
  process.exit(1);
}

function info(message) {
  log(colors.cyan, 'INFO', message);
}

function run(command, options = {}) {
  log(colors.yellow, 'RUN', command);
  try {
    execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      cwd: options.cwd || MONOREPO_ROOT,
      env: { ...process.env, ...options.env },
      ...options
    });
    return true;
  } catch (e) {
    if (options.ignoreError) {
      warn(`command failed but continuing: ${command}`);
      return false;
    }
    error(`command failed: ${command}\n${e.message}`);
  }
}

function ensureReleasesDir() {
  if (!fs.existsSync(RELEASES_DIR)) {
    fs.mkdirSync(RELEASES_DIR, { recursive: true });
    info(`created releases directory: ${RELEASES_DIR}`);
  }
}

function cleanReleasesDir() {
  if (fs.existsSync(RELEASES_DIR)) {
    info('cleaning releases directory...');
    const files = fs.readdirSync(RELEASES_DIR);
    for (const file of files) {
      const filePath = path.join(RELEASES_DIR, file);
      fs.unlinkSync(filePath);
      log(colors.red, 'DELETE', file);
    }
    success('releases directory cleaned');
  }
}

function getVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(MONOREPO_ROOT, 'package.json'), 'utf8'));
  const buildDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const shortCommit = execSync('git rev-parse --short HEAD', { cwd: MONOREPO_ROOT }).toString().trim();
  return {
    version: pkg.version || '0.0.0',
    buildDate,
    shortCommit,
    full: `${pkg.version || '0.0.0'}-${buildDate}-${shortCommit}`
  };
}

function detectPlatform() {
  const platform = process.platform;
  const arch = process.arch;
  return { platform, arch };
}

function copyElectronBuilds(version) {
  const electronReleaseDir = path.join(MONOREPO_ROOT, 'apps', 'desktop-electron', 'release');
  
  if (!fs.existsSync(electronReleaseDir)) {
    warn(`electron release directory not found: ${electronReleaseDir}`);
    return;
  }

  const files = fs.readdirSync(electronReleaseDir);
  const copies = [];

  for (const file of files) {
    const src = path.join(electronReleaseDir, file);
    const stat = fs.statSync(src);
    
    if (stat.isFile()) {
      let destName;
      
      if (file.endsWith('.AppImage')) {
        destName = `pkm-${version.full}-linux.AppImage`;
      } else if (file.endsWith('.deb')) {
        destName = `pkm-${version.full}.deb`;
      } else if (file.endsWith('.exe')) {
        destName = `pkm-${version.full}.exe`;
      } else if (file.endsWith('.dmg')) {
        destName = `pkm-${version.full}.dmg`;
      } else {
        // skip other files
        continue;
      }
      
      const dest = path.join(RELEASES_DIR, destName);
      fs.copyFileSync(src, dest);
      copies.push(destName);
      log(colors.green, 'COPY', `${file} -> ${destName}`);
    }
  }

  if (copies.length === 0) {
    warn('no electron build outputs found to copy');
  } else {
    success(`copied ${copies.length} electron build(s)`);
  }

  return copies;
}

function copyApk(version) {
  const apkPaths = [
    path.join(MONOREPO_ROOT, 'apps', 'mobile', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
    path.join(MONOREPO_ROOT, 'apps', 'mobile', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
    path.join(MONOREPO_ROOT, 'apps', 'mobile', 'pkm-release.apk')
  ];

  let found = false;
  for (const apkPath of apkPaths) {
    if (fs.existsSync(apkPath)) {
      const destName = `pkm-${version.full}.apk`;
      const dest = path.join(RELEASES_DIR, destName);
      fs.copyFileSync(apkPath, dest);
      success(`copied apk: ${destName}`);
      found = true;
      break;
    }
  }

  if (!found) {
    warn('apk not found at expected paths');
  }

  return found;
}

function createVersionJson(version) {
  const releases = {
    version: version.full,
    buildDate: new Date().toISOString(),
    commit: execSync('git rev-parse HEAD', { cwd: MONOREPO_ROOT }).toString().trim(),
    shortCommit: version.shortCommit,
    releases: {}
  };

  // detect what files exist
  const files = fs.readdirSync(RELEASES_DIR);
  
  for (const file of files) {
    if (file.endsWith('.AppImage')) {
      releases.releases.appimage = file;
    } else if (file.endsWith('.deb')) {
      releases.releases.deb = file;
    } else if (file.endsWith('.exe')) {
      releases.releases.exe = file;
    } else if (file.endsWith('.apk')) {
      releases.releases.apk = file;
    } else if (file.endsWith('.dmg')) {
      releases.releases.dmg = file;
    }
  }

  fs.writeFileSync(
    path.join(RELEASES_DIR, 'version.json'),
    JSON.stringify(releases, null, 2)
  );
  
  success('created version.json');
  return releases;
}

async function buildWebAssets() {
  step(1, 'building web assets...');
  run('npm run build', {
    env: {
      VITE_API_URL: process.env.VITE_API_URL || 'https://pkm.houseofmates.space/api'
    }
  });
  success('web assets built');
}

async function buildElectron() {
  step(2, 'building electron apps (appimage, deb, exe)...');
  const electronDir = path.join(MONOREPO_ROOT, 'apps', 'desktop-electron');
  
  // install electron-builder if needed
  info('ensuring electron-builder is available...');
  
  run('npm run build', { cwd: electronDir });
  success('electron apps built');
}

async function buildApk() {
  step(3, 'building android apk...');
  const mobileDir = path.join(MONOREPO_ROOT, 'apps', 'mobile');
  
  // build web for mobile
  info('building mobile web assets...');
  run('npm run build', { cwd: mobileDir });
  
  // sync capacitor
  info('syncing capacitor...');
  run('npx cap sync android', { cwd: mobileDir });
  
  // patch java version if needed
  const androidDir = path.join(mobileDir, 'android');
  const gradleFiles = execSync('find . -name "*.gradle"', { cwd: androidDir })
    .toString()
    .split('\n')
    .filter(f => f);
  
  for (const file of gradleFiles) {
    const filePath = path.join(androidDir, file);
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('JavaVersion.VERSION_21')) {
        content = content.replace(/JavaVersion\.VERSION_21/g, 'JavaVersion.VERSION_17');
        fs.writeFileSync(filePath, content);
        log(colors.yellow, 'PATCH', `patched java version in ${file}`);
      }
    }
  }
  
  // build apk
  info('building release apk...');
  run('./gradlew assembleRelease', { cwd: androidDir });
  
  success('apk built');
}

async function main() {
  const args = process.argv.slice(2);
  const buildLinux = args.includes('--linux') || args.length === 0;
  const buildApkFlag = args.includes('--apk') || args.length === 0;
  const clean = args.includes('--clean');
  const skipBuild = args.includes('--skip-build');

  console.log('');
  log(colors.magenta, 'PKM', 'release builder');
  log(colors.blue, 'BUILD', 'starting build for all platforms...');
  console.log('');

  const version = getVersion();
  const { platform } = detectPlatform();
  
  info(`version: ${version.full}`);
  info(`platform: ${platform}`);
  info(`targets: ${buildLinux ? 'linux (appimage, deb)' : ''} ${buildApkFlag ? 'android (apk)' : ''}`);
  console.log('');

  ensureReleasesDir();
  
  if (clean) {
    cleanReleasesDir();
  }

  // note: windows exe can only be built on windows
  if (platform === 'win32' && buildLinux) {
    warn('windows detected - can only build .exe, use wsl for linux builds');
  }

  try {
    if (!skipBuild) {
      await buildWebAssets();
    } else {
      info('skipping web build (--skip-build)');
    }

    if (buildLinux) {
      await buildElectron();
      copyElectronBuilds(version);
    }

    if (buildApkFlag) {
      // check for android sdk
      try {
        execSync('which sdkmanager', { stdio: 'pipe' });
        await buildApk();
        copyApk(version);
      } catch (e) {
        warn('android sdk not found, skipping apk build');
        warn('install android studio or android command line tools to build apk');
      }
    }

    // create version.json
    step(4, 'creating version manifest...');
    const releases = createVersionJson(version);

    // final summary
    console.log('');
    log(colors.green, 'COMPLETE', 'build finished!');
    console.log('');
    console.log('releases folder:');
    const files = fs.readdirSync(RELEASES_DIR);
    for (const file of files) {
      const filePath = path.join(RELEASES_DIR, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(1);
      console.log(`  ${colors.cyan}${file}${colors.reset} (${size} mb)`);
    }
    console.log('');

    if (releases.releases.exe && platform !== 'win32' && platform !== 'darwin') {
      warn('.exe was not built (requires windows)');
      warn('run this script on windows or use github actions for exe builds');
    }

  } catch (err) {
    error(err.message);
  }
}

// run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { getVersion, ensureReleasesDir, cleanReleasesDir };
