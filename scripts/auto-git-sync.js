import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const DEBOUNCE_MS = 30000; // 30 seconds
const POLL_INTERVAL_MS = 5000; // 5 seconds
const EXCLUDE_PATHS = ['.git', 'node_modules', 'dist', '.gemini', 'release'];

let lastChangeDetectedAt = 0;
let pendingCommits = false;

function getGitStatus() {
    try {
        const status = execSync('git status --short').toString().trim();
        return status;
    } catch (e) {
        return '';
    }
}

function syncToGitHub() {
    console.log(`[${new Date().toLocaleTimeString()}] 🔄 Syncing to GitHub...`);
    try {
        execSync('git add .');
        const commitMsg = `PKM Auto-Sync: ${new Date().toISOString()}`;
        execSync(`git commit -m "${commitMsg}"`);

        // Push using the stored credentials or token
        // Assuming the user has git credentials configured or a token in .github_token
        let pushCmd = 'git push';
        if (fs.existsSync('.github_token')) {
            const token = fs.readFileSync('.github_token', 'utf8').trim();
            // Try to extract the remote URL to inject the token if needed
            // For now, assume git is configured to handle auth (helpers/SSH)
            // or the user is on a system where git push just works.
        }

        execSync(pushCmd);
        console.log(`[${new Date().toLocaleTimeString()}] ✅ Synced successfully.`);
        pendingCommits = false;
        lastChangeDetectedAt = 0;
    } catch (e) {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Sync failed: ${e.message}`);
    }
}

console.log(`🚀 PKM Auto-Git Daemon started (30s delay)...`);

setInterval(() => {
    const status = getGitStatus();
    const now = Date.now();

    if (status) {
        if (!pendingCommits) {
            console.log(`[${new Date().toLocaleTimeString()}] 📝 Changes detected. Waiting 30s before sync...`);
            pendingCommits = true;
        }
        lastChangeDetectedAt = now;
    } else if (pendingCommits) {
        // This might happen if changes were manually reverted within the polling interval
        console.log(`[${new Date().toLocaleTimeString()}] ✨ Workspace clean again. Skipping sync.`);
        pendingCommits = false;
        lastChangeDetectedAt = 0;
    }

    // If we have pending changes and 30s have passed since the LAST change
    if (pendingCommits && (now - lastChangeDetectedAt) >= DEBOUNCE_MS) {
        syncToGitHub();
    }
}, POLL_INTERVAL_MS);
