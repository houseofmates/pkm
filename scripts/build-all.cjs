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
