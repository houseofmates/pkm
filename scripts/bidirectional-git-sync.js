#!/usr/bin/env node
/**
 * bidirectional-git-sync.js
 * 24/7 bidirectional sync between local filesystem and github
 * 
 * features:
<<<<<<< HEAD
 * - local → github: instant sync via fs.watch (debounced 10s)
=======
 * - local → github: instant sync via fs.watch (debounced)
>>>>>>> main
 * - github → local: poll every 30s for remote changes
 * - conflict resolution: stash → pull → stash pop (auto-merge)
 * - jules/pr support: auto-pulls any changes made by external agents
 * - persistent logging via journald
<<<<<<< HEAD
=======
 * - cron-like scheduled sync every 5 minutes
 * - significant change detection for faster sync
 * - 3-way merge fallback on stash conflicts
 * - sync status written to .sync-status.json
 * - sigusr1 handler for immediate sync
>>>>>>> main
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = '/home/house/pkm';
<<<<<<< HEAD
const DEBOUNCE_LOCAL_MS = 10000; // 10s debounce for local changes
const POLL_REMOTE_MS = 30000;    // 30s poll for remote changes
const MAX_RETRIES = 3;
=======

const DEBOUNCE_LOCAL_MS = 10000; // 10s debounce for normal local changes
const SIGNIFICANT_DEBOUNCE_MS = 3000; // 3s debounce for significant changes
const POLL_REMOTE_MS = 30000;    // 30s poll for remote changes
const SCHEDULED_SYNC_MS = 300000; // 5 minutes cron-like sync
const MAX_RETRIES = 3;
const SIGNIFICANT_FILES_THRESHOLD = 5;
const SIGNIFICANT_SIZE_THRESHOLD = 100 * 1024; // 100kb
const SYNC_HEALTH_CHECK_MS = 60000; // 1 minute health check
const MAX_SYNC_FAILURES = 5; // Max consecutive failures before alerting
>>>>>>> main

// paths to ignore (don't trigger sync)
const IGNORE_PATHS = [
  '.git',
  'node_modules',
  'dist',
  '.vite',
  'release',
  '*.log',
<<<<<<< HEAD
  '.github_token'
=======
  '.github_token',
  '.sync-status.json',
  '.sync-conflict'
>>>>>>> main
];

let localChangeTimer = null;
let hasLocalChanges = false;
let isSyncing = false;
let watchHandles = [];
<<<<<<< HEAD
=======
let changedFiles = new Set();
let changedSizeEstimate = 0;
let consecutiveFailures = 0;
let lastSuccessfulSync = null;
let healthCheckTimer = null;
>>>>>>> main

// logging helpers
const timestamp = () => new Date().toISOString();
const log = (msg) => console.log(`[${timestamp()}] ${msg}`);
const logError = (msg) => console.error(`[${timestamp()}] ERROR: ${msg}`);

<<<<<<< HEAD
=======
// sync status file
const STATUS_FILE = path.join(REPO_DIR, '.sync-status.json');

function writeSyncStatus(status, extra = {}) {
  try {
    const payload = {
      status,
      lastSyncAt: timestamp(),
      lastError: extra.lastError || null,
      pendingChanges: extra.pendingChanges || false,
      remoteAhead: extra.remoteAhead || false,
      consecutiveFailures,
      lastSuccessfulSync,
      healthCheck: 'ok'
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(payload, null, 2));
  } catch (e) {
    logError(`failed to write sync status: ${e.message}`);
  }
}

function incrementFailureCount() {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_SYNC_FAILURES) {
    logError(`CRITICAL: ${consecutiveFailures} consecutive sync failures - manual intervention may be required`);
    writeSyncStatus('critical', {
      lastError: `${consecutiveFailures} consecutive failures`,
      pendingChanges: hasLocalModifications()
    });
  }
}

function resetFailureCount() {
  if (consecutiveFailures > 0) {
    log(`recovered from ${consecutiveFailures} consecutive failures`);
  }
  consecutiveFailures = 0;
  lastSuccessfulSync = timestamp();
}

function performHealthCheck() {
  try {
    // Check if git repo is healthy
    if (!validateRepo()) {
      logError('health check: git repository is corrupted');
      return false;
    }

    // Check if we can access remote
    const remoteStatus = checkRemoteChanges();
    if (remoteStatus === 'unknown') {
      logError('health check: cannot reach remote repository');
      return false;
    }

    // Check disk space (basic check)
    try {
      const stats = fs.statSync(REPO_DIR);
      // This is a basic check - in production you'd want more sophisticated monitoring
    } catch (e) {
      logError('health check: cannot access repository directory');
      return false;
    }

    return true;
  } catch (e) {
    logError(`health check failed: ${e.message}`);
    return false;
  }
}

function startHealthCheck() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);

  healthCheckTimer = setInterval(() => {
    const isHealthy = performHealthCheck();
    if (!isHealthy) {
      incrementFailureCount();
    } else {
      // Update status with healthy check
      const currentStatus = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8') || '{}');
      writeSyncStatus(currentStatus.status || 'unknown', {
        lastError: currentStatus.lastError,
        pendingChanges: currentStatus.pendingChanges
      });
    }
  }, SYNC_HEALTH_CHECK_MS);
}

>>>>>>> main
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
<<<<<<< HEAD
    const result = execSync(command, { 
      cwd, 
=======
    const result = execSync(command, {
      cwd,
>>>>>>> main
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

<<<<<<< HEAD
=======
// get list of changed files and estimated diff size
function getLocalChangeStats() {
  try {
    const status = gitExec('git status --porcelain');
    const files = status.split('\n').filter(Boolean).map(line => line.slice(3));
    const diff = gitExec('git diff --stat');
    const sizeMatch = diff.match(/(\d+)\s+insertions/);
    const insertions = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;
    return { files, insertions };
  } catch (e) {
    return { files: [], insertions: 0 };
  }
}

>>>>>>> main
// check if remote has changes we don't have
function checkRemoteChanges() {
  try {
    // fetch without merging
    gitExec('git fetch origin');
<<<<<<< HEAD
    
    const local = gitExec('git rev-parse HEAD');
    const remote = gitExec(`git rev-parse origin/${getCurrentBranch()}`);
    const base = gitExec(`git merge-base HEAD origin/${getCurrentBranch()}`);
    
=======

    const local = gitExec('git rev-parse HEAD');
    const remote = gitExec(`git rev-parse origin/${getCurrentBranch()}`);
    const base = gitExec(`git merge-base HEAD origin/${getCurrentBranch()}`);

>>>>>>> main
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
<<<<<<< HEAD
  
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
    
        // push to remote (bypass hooks since npm may not be available in systemd env)
        gitExec('git push origin HEAD --no-verify');

    
    log('✅ local changes pushed to github');
    hasLocalChanges = false;
  } catch (error) {
    logError(`failed to push: ${error.message}`);
    
=======

  try {
    if (!hasLocalModifications()) {
      log('no local changes to sync');
      writeSyncStatus('synced');
      isSyncing = false;
      return;
    }

    log('📝 syncing local changes to github...');

    // stage all changes
    gitExec('git add -A');

    // commit with timestamp
    const commitMsg = `auto-sync: local changes ${new Date().toISOString()}`;
    gitExec(`git commit -m "${commitMsg}" --no-verify`);

    // push to remote (bypass hooks since npm may not be available in systemd env)
    gitExec('git push origin HEAD --no-verify');

    log('✅ local changes pushed to github');
    hasLocalChanges = false;
    changedFiles.clear();
    changedSizeEstimate = 0;
    resetFailureCount();
    writeSyncStatus('synced');
  } catch (error) {
    logError(`failed to push: ${error.message}`);
    incrementFailureCount();
    writeSyncStatus('error', { lastError: error.message, pendingChanges: true });

>>>>>>> main
    // if push failed due to remote changes, we'll handle in next poll
    if (error.message.includes('rejected') || error.message.includes('behind')) {
      log('remote has changes, will pull and retry...');
    }
  } finally {
    isSyncing = false;
  }
}

<<<<<<< HEAD
=======
// attempt 3-way merge for a conflicted file after stash pop fails
function attemptThreeWayMerge(filePath) {
  try {
    const relative = path.relative(REPO_DIR, filePath);
    // get the three versions: base, local (stashed), remote (HEAD)
    const base = gitExec(`git show stash@{0}^3:"${relative}"`, { retries: 0 });
    const local = gitExec(`git show stash@{0}:"${relative}"`, { retries: 0 });
    const remote = gitExec(`git show HEAD:"${relative}"`, { retries: 0 });

    // write them to temp files
    const tmpBase = path.join('/tmp', `pkm-merge-base-${Date.now()}`);
    const tmpLocal = path.join('/tmp', `pkm-merge-local-${Date.now()}`);
    const tmpRemote = path.join('/tmp', `pkm-merge-remote-${Date.now()}`);

    fs.writeFileSync(tmpBase, base);
    fs.writeFileSync(tmpLocal, local);
    fs.writeFileSync(tmpRemote, remote);

    // run git merge-file
    try {
      execSync(`git merge-file -p "${tmpLocal}" "${tmpBase}" "${tmpRemote}" > "${filePath}"`, {
        cwd: REPO_DIR,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      log(`✅ 3-way merge resolved for ${relative}`);
      // stage the resolved file
      gitExec(`git add "${relative}"`);
      return true;
    } catch (mergeErr) {
      logError(`3-way merge failed for ${relative}: ${mergeErr.message}`);
      return false;
    }
  } catch (e) {
    logError(`could not set up 3-way merge for ${filePath}: ${e.message}`);
    return false;
  }
}

>>>>>>> main
// sync remote changes to local (handles jules/pr workflow)
async function syncFromRemote() {
  if (isSyncing) return;
  isSyncing = true;
<<<<<<< HEAD
  
  try {
    const remoteStatus = checkRemoteChanges();
    
    if (remoteStatus === 'up-to-date') {
      // nothing to do
    } else if (remoteStatus === 'behind') {
      log('📥 remote has new changes, pulling...');
      
=======

  try {
    const remoteStatus = checkRemoteChanges();

    if (remoteStatus === 'up-to-date') {
      writeSyncStatus('synced');
    } else if (remoteStatus === 'behind') {
      log('📥 remote has new changes, pulling...');

>>>>>>> main
      // if we have local changes, stash them first
      const hadLocalChanges = hasLocalModifications();
      if (hadLocalChanges) {
        log('stashing local changes before pull...');
        gitExec('git stash push -m "auto-stash-before-pull"');
      }
<<<<<<< HEAD
      
      // pull remote changes
      gitExec('git pull origin HEAD --no-rebase');
      log('✅ pulled remote changes to local filesystem');
      
=======

      // pull remote changes
      gitExec('git pull origin HEAD --no-rebase');
      log('✅ pulled remote changes to local filesystem');

>>>>>>> main
      // restore stashed changes if any
      if (hadLocalChanges) {
        try {
          gitExec('git stash pop');
          log('✅ restored local changes');
          // now try to commit and push these
          setTimeout(() => syncToRemote(), 5000);
        } catch (stashError) {
<<<<<<< HEAD
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
      
=======
          logError('conflict restoring stashed changes - attempting 3-way merge');

          // find conflicted files
          const status = gitExec('git status --porcelain');
          const conflicted = status.split('\n')
            .filter(line => line.startsWith('UU') || line.startsWith('AA') || line.startsWith('DD'))
            .map(line => line.slice(3).trim());

          let resolvedAny = false;
          for (const rel of conflicted) {
            const fullPath = path.join(REPO_DIR, rel);
            if (fs.existsSync(fullPath)) {
              const ok = attemptThreeWayMerge(fullPath);
              if (ok) resolvedAny = true;
            }
          }

          if (resolvedAny) {
            // commit the merge resolution
            try {
              gitExec('git commit -m "auto-merge: resolved stash conflicts" --no-verify');
              log('✅ committed merge resolution');
              setTimeout(() => syncToRemote(), 3000);
            } catch (commitErr) {
              logError(`failed to commit merge resolution: ${commitErr.message}`);
              writeSyncStatus('conflict', { lastError: commitErr.message });
              fs.writeFileSync(
                path.join(REPO_DIR, '.sync-conflict'),
                `conflict detected at ${timestamp()}\nrun: git stash pop\n`
              );
            }
          } else {
            writeSyncStatus('conflict', { lastError: stashError.message });
            fs.writeFileSync(
              path.join(REPO_DIR, '.sync-conflict'),
              `conflict detected at ${timestamp()}\nrun: git stash pop\n`
            );
          }
        }
      }
      writeSyncStatus('synced');
    } else if (remoteStatus === 'diverged') {
      log('⚠️ branches have diverged, attempting merge...');

>>>>>>> main
      // try to auto-merge
      try {
        gitExec('git pull origin HEAD --no-rebase');
        log('✅ auto-merge successful');
<<<<<<< HEAD
=======
        writeSyncStatus('synced');
>>>>>>> main
      } catch (mergeError) {
        logError('auto-merge failed, manual resolution needed');
        // abort the merge to keep repo clean
        try {
          gitExec('git merge --abort');
        } catch (e) {
          // ignore abort errors
        }
<<<<<<< HEAD
=======
        writeSyncStatus('conflict', { lastError: mergeError.message });
>>>>>>> main
        fs.writeFileSync(
          path.join(REPO_DIR, '.sync-conflict'),
          `merge conflict at ${timestamp()}\nmanual resolution required\n`
        );
      }
    } else if (remoteStatus === 'ahead') {
      // we have local commits that need pushing
      setTimeout(() => syncToRemote(), 1000);
<<<<<<< HEAD
    }
  } catch (error) {
    logError(`sync from remote failed: ${error.message}`);
=======
    } else {
      writeSyncStatus('error', { lastError: `unknown remote status: ${remoteStatus}` });
    }
  } catch (error) {
    logError(`sync from remote failed: ${error.message}`);
    writeSyncStatus('error', { lastError: error.message });
>>>>>>> main
  } finally {
    isSyncing = false;
  }
}

// handle local file change event
function onLocalChange(eventType, filename) {
  if (!filename) return;
  if (shouldIgnore(filename)) return;
<<<<<<< HEAD
  
=======

  const fullPath = path.join(REPO_DIR, filename);
  if (fs.existsSync(fullPath)) {
    try {
      const stat = fs.statSync(fullPath);
      changedSizeEstimate += stat.size;
    } catch { /* ignore */ }
  }
  changedFiles.add(filename);

  // determine if this is a significant change
  const isSignificant = changedFiles.size > SIGNIFICANT_FILES_THRESHOLD || changedSizeEstimate > SIGNIFICANT_SIZE_THRESHOLD;
  const debounceMs = isSignificant ? SIGNIFICANT_DEBOUNCE_MS : DEBOUNCE_LOCAL_MS;

>>>>>>> main
  // debounce rapid changes
  if (localChangeTimer) {
    clearTimeout(localChangeTimer);
  }
<<<<<<< HEAD
  
  hasLocalChanges = true;
  localChangeTimer = setTimeout(() => {
    syncToRemote();
  }, DEBOUNCE_LOCAL_MS);
  
  log(`📝 detected ${eventType}: ${filename} (will sync in ${DEBOUNCE_LOCAL_MS}ms)`);
=======

  hasLocalChanges = true;
  localChangeTimer = setTimeout(() => {
    syncToRemote();
  }, debounceMs);

  log(`📝 detected ${eventType}: ${filename} (${changedFiles.size} files, ~${Math.round(changedSizeEstimate / 1024)}kb) (will sync in ${debounceMs}ms)`);
>>>>>>> main
}

// setup recursive file watcher
function setupWatcher() {
  log('👁️ setting up filesystem watcher...');
<<<<<<< HEAD
  
=======

>>>>>>> main
  const watchOptions = {
    recursive: true,
    persistent: true
  };
<<<<<<< HEAD
  
=======

>>>>>>> main
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

<<<<<<< HEAD
// main
async function main() {
=======
// force immediate sync on sigusr1
function forceSync() {
  log('🔄 received SIGUSR1, forcing immediate sync');
  syncFromRemote().then(() => {
    if (hasLocalModifications()) {
      syncToRemote();
    }
  });
}

// main
async function main() {
  // pause mechanism: if .sync-pause exists, sleep forever instead of syncing
  const PAUSE_FILE = path.join(REPO_DIR, '.sync-pause');
  if (fs.existsSync(PAUSE_FILE)) {
    log('paused via .sync-pause file. sleeping...');
    // keep process alive so systemd doesn't aggressively restart
    while (true) {
      await new Promise(r => setTimeout(r, 60000));
    }
  }

>>>>>>> main
  log('🚀 bidirectional git sync starting...');
  log(`📁 repository: ${REPO_DIR}`);
  log(`⏱️  local debounce: ${DEBOUNCE_LOCAL_MS}ms`);
  log(`⏱️  remote poll: ${POLL_REMOTE_MS}ms`);
<<<<<<< HEAD
  
=======
  log(`⏱️  scheduled sync: ${SCHEDULED_SYNC_MS}ms`);

>>>>>>> main
  // validate repo
  if (!validateRepo()) {
    logError('not a valid git repository');
    process.exit(1);
  }
<<<<<<< HEAD
  
  // check initial state
  const branch = getCurrentBranch();
  log(`🌿 current branch: ${branch}`);
  
  // do initial sync check
  await syncFromRemote();
  
  // setup filesystem watcher for local → github
  setupWatcher();
  
=======

  // check initial state
  const branch = getCurrentBranch();
  log(`🌿 current branch: ${branch}`);

  // do initial sync check
  await syncFromRemote();

  // setup health monitoring
  startHealthCheck();

  // setup filesystem watcher for local → github
  setupWatcher();

>>>>>>> main
  // setup polling for github → local (catches jules/pr changes)
  setInterval(() => {
    syncFromRemote();
  }, POLL_REMOTE_MS);
<<<<<<< HEAD
  
=======

  // cron-like scheduled full sync every 5 minutes
  setInterval(() => {
    log('⏰ scheduled sync triggered');
    syncFromRemote();
  }, SCHEDULED_SYNC_MS);

>>>>>>> main
  // also check for local changes periodically as backup
  setInterval(() => {
    if (hasLocalModifications() && !isSyncing) {
      hasLocalChanges = true;
      syncToRemote();
    }
  }, POLL_REMOTE_MS * 2);
<<<<<<< HEAD
  
  log('✅ bidirectional sync active');
  log('   local changes → auto-push to github');
  log('   github changes (jules/prs) → auto-pull to local');
  
  // handle graceful shutdown
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
=======

  log('✅ bidirectional sync active');
  log('   local changes → auto-push to github');
  log('   github changes (jules/prs) → auto-pull to local');

  // handle graceful shutdown
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('SIGUSR1', forceSync);
>>>>>>> main
  process.on('exit', cleanup);
}

main().catch(error => {
  logError(`fatal error: ${error.message}`);
  process.exit(1);
});
