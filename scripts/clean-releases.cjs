#!/usr/bin/env node
/**
 * clean-releases.cjs
 * removes all files from the releases folder
 */

const fs = require('fs');
const path = require('path');

const RELEASES_DIR = path.join(__dirname, '..', 'releases');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function log(color, prefix, message) {
  console.log(`${color}[${prefix}]${colors.reset} ${message}`);
}

function main() {
  if (!fs.existsSync(RELEASES_DIR)) {
    log(colors.yellow, 'WARN', 'releases folder does not exist');
    process.exit(0);
  }

  const files = fs.readdirSync(RELEASES_DIR);
  
  if (files.length === 0) {
    log(colors.green, 'INFO', 'releases folder is already empty');
    process.exit(0);
  }

  console.log(`found ${files.length} file(s) in releases folder:`);
  
  for (const file of files) {
    const filePath = path.join(RELEASES_DIR, file);
    const stats = fs.statSync(filePath);
    const size = stats.isFile() ? `${(stats.size / 1024 / 1024).toFixed(1)} mb` : 'dir';
    console.log(`  - ${file} (${size})`);
  }

  // check for --force flag
  if (process.argv.includes('--force') || process.argv.includes('-f')) {
    console.log('');
    for (const file of files) {
      const filePath = path.join(RELEASES_DIR, file);
      fs.rmSync(filePath, { recursive: true, force: true });
      log(colors.red, 'DELETE', file);
    }
    log(colors.green, 'DONE', `cleaned ${files.length} file(s)`);
  } else {
    console.log('');
    log(colors.yellow, 'DRY RUN', 'no files deleted (use --force to actually delete)');
  }
}

main();
