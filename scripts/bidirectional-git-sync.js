#!/usr/bin/env node
/**
 * bidirectional-git-sync.js
 * 24/7 bidirectional sync between local filesystem and github
 * 
 * features:
 * - local → github: instant sync via fs.watch (debounced 10s)
 * - github → local: poll every 30s for remote changes
 * - conflict resolution: stash → pull → stash pop (auto-merge)
 * - jules/pr support: auto-pulls any changes made by external agents
 * - persistent logging via journald
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = '/home/house/pkm';
const DEBOUNCE_LOCAL_MS = 10000; // 10s debounce for local changes
const POLL_REMOTE_MS = 30000;    // 30s poll for remote changes
const MAX_RETRIES = 3;

// paths to ignore (don't trigger sync)
const IGNORE_PATHS = [
  '.git',
  'node_modules',
  'dist',
  '.vite',
  'release',
  '*.log',
  '.github_token'
];

let localChangeTimer = null;
let hasLocalChanges = false;
let isSyncing = false;
let watchHandles = [];

// logging helpers
const timestamp = () => new Date().toISOString();
const log = (msg) => console.log(`[${timestamp()}] ${msg}`);
const logError = (msg) => console.error(`[${timestamp()}] ERROR: ${msg}`);

// check if path should be ignored
function shouldIgnore(filepath) {
  const relPath = path.relative(REPO_DIR, filepath);
  return IGNORE_PATHS.some(ignore => {
    if (ignore.includes('*')) {
      const regex = new RegExp(ignore.replace('*', '.*'));
      return regex.test(relPath);
    }
    return relPath.startsWith(ignore) || relPath.includes(`/${ignore}/`);
  });
}

// execute git command with retry logic
function gitExec(command, options = {}) {
  const { retries = 0, cwd = REPO_DIR } = options;
  try {
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return result.trim();
  } catch (error) {
    if (retries < MAX_RETRIES) {
      log(`retrying: ${command} (attempt ${retries + 1}/${MAX_RETRIES})`);
      return gitExec(command, { ...options, retries: retries + 1 });
    }
    throw error;
  }
}

// check if we have a valid git repo
function validateRepo() {
  try {
    gitExec('git rev-parse --git-dir');
    return true;
  } catch (e) {
    return false;
  }
}

// get current branch
function getCurrentBranch() {
  try {
    return gitExec('git rev-parse --abbrev-ref HEAD');
  } catch (e) {
    return 'main';
  }
}

// check for local changes
function hasLocalModifications() {
  try {
    const status = gitExec('git status --porcelain');
    return status.length > 0;
  } catch (e) {
    return false;
  }
}

// check if remote has changes we don't have
function checkRemoteChanges() {
  try {
    // fetch without merging
    gitExec('git fetch origin');
    
    const local = gitExec('git rev-parse HEAD');
    const remote = gitExec(`git rev-parse origin/${getCurrentBranch()}`);
    const base = gitExec(`git merge-base HEAD origin/${getCurrentBranch()}`);
    
    if (local === remote) {
      return 'up-to-date';
    } else if (base === local) {
      return 'behind'; // we need to pull
    } else if (base === remote) {
      return 'ahead'; // we need to push
    } else {
      return 'diverged'; // need merge
    }
  } catch (e) {
    logError(`failed to check remote: ${e.message}`);
    return 'unknown';
  }
}

// sync local changes to github
async function syncToRemote() {
  if (isSyncing) return;
  isSyncing = true;
  
  try {
    if (!hasLocalModifications()) {
      log('no local changes to sync');
      isSyncing = false;
      return;
    }
    
    log('📝 syncing local changes to github...');
    
    // stage all changes
    gitExec('git add -A');
    
    // commit with timestamp
    const commitMsg = `auto-sync: local changes ${new Date().toISOString()}`;
    gitExec(`git commit -m "${commitMsg}" --no-verify`);
    
    // push to remote
    gitExec('git push origin HEAD');
    
    log('✅ local changes pushed to github');
    hasLocalChanges = false;
  } catch (error) {
    logError(`failed to push: ${error.message}`);
    
    // if push failed due to remote changes, we'll handle in next poll
    if (error.message.includes('rejected') || error.message.includes('behind')) {
      log('remote has changes, will pull and retry...');
    }
  } finally {
    isSyncing = false;
  }
}

// sync remote changes to local (handles jules/pr workflow)
async function syncFromRemote() {
  if (isSyncing) return;
  isSyncing = true;
  
  try {
    const remoteStatus = checkRemoteChanges();
    
    if (remoteStatus === 'up-to-date') {
      // nothing to do
    } else if (remoteStatus === 'behind') {
      log('📥 remote has new changes, pulling...');
      
      // if we have local changes, stash them first
      const hadLocalChanges = hasLocalModifications();
      if (hadLocalChanges) {
        log('stashing local changes before pull...');
        gitExec('git stash push -m "auto-stash-before-pull"');
      }
      
      // pull remote changes
      gitExec('git pull origin HEAD --no-rebase');
      log('✅ pulled remote changes to local filesystem');
      
      // restore stashed changes if any
      if (hadLocalChanges) {
        try {
          gitExec('git stash pop');
          log('✅ restored local changes');
          // now try to commit and push these
          setTimeout(() => syncToRemote(), 5000);
        } catch (stashError) {
          logError('conflict restoring stashed changes - manual resolution needed');
          log('run: git stash list && git stash pop');
          // notify somehow? write to a file?
          fs.writeFileSync(
            path.join(REPO_DIR, '.sync-conflict'), 
            `conflict detected at ${timestamp()}\nrun: git stash pop\n`
          );
        }
      }
    } else if (remoteStatus === 'diverged') {
      log('⚠️ branches have diverged, attempting merge...');
      
      // try to auto-merge
      try {
        gitExec('git pull origin HEAD --no-rebase');
        log('✅ auto-merge successful');
      } catch (mergeError) {
        logError('auto-merge failed, manual resolution needed');
        // abort the merge to keep repo clean
        try {
          gitExec('git merge --abort');
        } catch (e) {
          // ignore abort errors
        }
        fs.writeFileSync(
          path.join(REPO_DIR, '.sync-conflict'),
          `merge conflict at ${timestamp()}\nmanual resolution required\n`
        );
      }
    } else if (remoteStatus === 'ahead') {
      // we have local commits that need pushing
      setTimeout(() => syncToRemote(), 1000);
    }
  } catch (error) {
    logError(`sync from remote failed: ${error.message}`);
  } finally {
    isSyncing = false;
  }
}

// handle local file change event
function onLocalChange(eventType, filename) {
  if (!filename) return;
  if (shouldIgnore(filename)) return;
  
  // debounce rapid changes
  if (localChangeTimer) {
    clearTimeout(localChangeTimer);
  }
  
  hasLocalChanges = true;
  localChangeTimer = setTimeout(() => {
    syncToRemote();
  }, DEBOUNCE_LOCAL_MS);
  
  log(`📝 detected ${eventType}: ${filename} (will sync in ${DEBOUNCE_LOCAL_MS}ms)`);
}

// setup recursive file watcher
function setupWatcher() {
  log('👁️ setting up filesystem watcher...');
  
  const watchOptions = {
    recursive: true,
    persistent: true
  };
  
  try {
    const handle = fs.watch(REPO_DIR, watchOptions, onLocalChange);
    watchHandles.push(handle);
    log('✅ watching for local changes');
  } catch (error) {
    logError(`failed to setup watcher: ${error.message}`);
    // fallback to polling every 5s
    log('falling back to polling mode');
    setInterval(() => {
      if (hasLocalModifications() && !hasLocalChanges) {
        hasLocalChanges = true;
        setTimeout(() => syncToRemote(), DEBOUNCE_LOCAL_MS);
      }
    }, 5000);
  }
}

// cleanup on exit
function cleanup() {
  log('🛑 shutting down...');
  watchHandles.forEach(handle => {
    try {
      handle.close();
    } catch (e) {
      // ignore
    }
  });
  process.exit(0);
}

// main
async function main() {
  log('🚀 bidirectional git sync starting...');
  log(`📁 repository: ${REPO_DIR}`);
  log(`⏱️  local debounce: ${DEBOUNCE_LOCAL_MS}ms`);
  log(`⏱️  remote poll: ${POLL_REMOTE_MS}ms`);
  
  // validate repo
  if (!validateRepo()) {
    logError('not a valid git repository');
    process.exit(1);
  }
  
  // check initial state
  const branch = getCurrentBranch();
  log(`🌿 current branch: ${branch}`);
  
  // do initial sync check
  await syncFromRemote();
  
  // setup filesystem watcher for local → github
  setupWatcher();
  
  // setup polling for github → local (catches jules/pr changes)
  setInterval(() => {
    syncFromRemote();
  }, POLL_REMOTE_MS);
  
  // also check for local changes periodically as backup
  setInterval(() => {
    if (hasLocalModifications() && !isSyncing) {
      hasLocalChanges = true;
      syncToRemote();
    }
  }, POLL_REMOTE_MS * 2);
  
  log('✅ bidirectional sync active');
  log('   local changes → auto-push to github');
  log('   github changes (jules/prs) → auto-pull to local');
  
  // handle graceful shutdown
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

main().catch(error => {
  logError(`fatal error: ${error.message}`);
  process.exit(1);
});
