
import fs from 'fs';
import path from 'path';

// PLACEHOLDER IMAGE URL
const PLACEHOLDER_URL = "https://placehold.co/400x400?text=expired+link";
// REGEX TO MATCH DISCORD MEDIA LINKS
const DISCORD_LINK_REGEX = /https:\/\/media\.discordapp\.net\/attachments\/[^"'\s]+/;

function scanAndReplace(obj, stats) {
    if (typeof obj === 'string') {
        if (DISCORD_LINK_REGEX.test(obj)) {
            // Check for expiration if needed, but user asked to identify and replace.
            // We assume mostly all of them are the problem if the user is running this.
            // Specifically looking for "ex=" might be safer if some contain it and some don't.
            if (obj.includes('ex=')) {
                stats.found++;
                // Replace
                return PLACEHOLDER_URL;
            } else {
                // If it doesn't have expiration, it might be permanent or proxied differently?
                // For now, we'll only target those with 'ex=' as specifically mentioned "expired access tokens (e.g., ex=665667a7)"
                // If you want to replace ALL discord links, remove the inner check.
                // stats.skipped++;
            }
        }
        return obj;
    } else if (Array.isArray(obj)) {
        return obj.map(item => scanAndReplace(item, stats));
    } else if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = scanAndReplace(obj[key], stats);
        }
        return newObj;
    }
    return obj;
}

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
let targetFile = args.find(arg => !arg.startsWith('--'));

if (!targetFile) {
    // Default fallback
    targetFile = 'storage/data/db.json'; // Common NocoBase path example
    console.log(`No file specified, defaulting to attempt: ${targetFile}`);
}

// Resolve absolute path
targetFile = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(targetFile)) {
    console.error(`Error: File not found at ${targetFile}`);
    console.log(`Usage: node scripts/fix_discord_links.js <path/to/db.json> [--dry-run]`);
    process.exit(1);
}

console.log(`Scanning file: ${targetFile}`);
if (dryRun) console.log("running in DRY-RUN mode (no changes will be saved)");

try {
    const rawData = fs.readFileSync(targetFile, 'utf8');
    let data;
    try {
        data = JSON.parse(rawData);
    } catch (e) {
        console.error("Failed to parse JSON.");
        process.exit(1);
    }

    const stats = { found: 0, skipped: 0 };
    const newData = scanAndReplace(data, stats);

    console.log(`Found ${stats.found} expired Discord links.`);

    if (stats.found > 0 && !dryRun) {
        // Create backup
        const backupPath = targetFile + '.bak';
        fs.writeFileSync(backupPath, rawData);
        console.log(`Backup saved to ${backupPath}`);

        fs.writeFileSync(targetFile, JSON.stringify(newData, null, 2));
        console.log(`Successfully updated ${targetFile}`);
    } else if (stats.found === 0) {
        console.log("No expired links found.");
    }

} catch (err) {
    console.error("An error occurred:", err);
}
