
import fs from 'fs';
import path from 'path';

console.log("--- Vite / Storage Diagnostics ---");

const cwd = process.cwd();
const viteConfigPath = path.join(cwd, 'vite.config.ts');
const storagePath = path.join(cwd, 'storage');

// 1. Check if 'storage' folder exists locally
if (fs.existsSync(storagePath)) {
    console.log(`[PASS] Local 'storage' directory found at: ${storagePath}`);
    // Check permissions roughly (on unix)
    try {
        const stats = fs.statSync(storagePath);
        console.log(`[INFO] Storage permissions: ${(stats.mode & 0o777).toString(8)}`);
    } catch (e) {
        console.log(`[WARN] Could not check permissions: ${e.message}`);
    }
} else {
    console.log(`[FAIL] Local 'storage' directory NOT found at: ${storagePath}`);
    console.log("       If you expected to serve local files, this directory must exist.");
}

// 2. check vite config for proxy settings (llm / nocobase)
if (fs.existsSync(viteConfigPath)) {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

    // Simple string check for now
    if (viteConfig.includes("'/storage':")) {
        console.log(`[WARN] Vite config has a proxy defined for '/storage'.`);
        const match = viteConfig.match(/'\/storage':\s*\{\s*target:\s*['"]([^'"]+)['"]/);
        if (match) {
            console.log(`       Target: ${match[1]}`);
            console.log(`       Cause of 403: You are proxying requests to a remote server instead of serving local files.`);
            console.log(`       If you want to serve the local 'storage' folder, you MUST remove or disable this proxy rule.`);
        }
    } else {
        console.log(`[PASS] No proxy rule found for '/storage'. Vite should serve it statically if it exists in 'public' or root (depending on config).`);
    }
} else {
    console.log(`[ERR] vite.config.ts not found.`);
}
