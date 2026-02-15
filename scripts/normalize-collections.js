#!/usr/bin/env node
/*
  normalize-collections.js

  Usage:
    NOCOBASE_URL=http://localhost:4100/api ADMIN_API_KEY="$ADMIN_API_KEY" node scripts/normalize-collections.js [--dry-run]

  The script will find collections whose title or name matches the target list
  and will set their `title` to the exact lowercase string and `hidden: true`.
*/

const axios = require('axios');

const base = process.env.NOCOBASE_URL;
const apiKey = process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY || process.env.AUTH;
const dryRun = process.argv.includes('--dry-run') || false;

if (!base || !apiKey) {
  console.error('Missing environment variables. Set NOCOBASE_URL and ADMIN_API_KEY.');
  console.error('Example: NOCOBASE_URL=http://localhost:4100/api ADMIN_API_KEY="$ADMIN_API_KEY" node scripts/normalize-collections.js --dry-run');
  process.exit(2);
}

const headers = {
  Authorization: apiKey.startsWith('Bearer') ? apiKey : `Bearer ${apiKey}`,
  'Content-Type': 'application/json'
};

const desiredTitles = [
  'dupe mates pages',
  'server-stats',
  'website pages',
  'public blocks',
  'dupe forms',
  'form submissions',
  'public pages'
];

function normalizeNameVariants(s) {
  return [
    s,
    s.replace(/\s+/g, '_'),
    s.replace(/\s+/g, '-'),
    s.replace(/\s+/g, '')
  ].map(x => x.toLowerCase());
}

(async function main() {
  try {
    const listUrl = `${base.replace(/\/$/, '')}/collections:list`;
    console.log('Fetching collections from', listUrl);
    const res = await axios.get(listUrl, { headers });
    const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);

    const updates = [];

    for (const col of list) {
      const title = (col.title || '').toLowerCase();
      const name = (col.name || '').toLowerCase();

      for (const desired of desiredTitles) {
        const variants = normalizeNameVariants(desired);

        if (title === desired || variants.includes(name)) {
          updates.push({ col, desired });
          break;
        }

        // Also match loose contains (in case of e.g., "Dupe Mates Pages - extra")
        if (title.includes(desired) || variants.some(v => name.includes(v))) {
          updates.push({ col, desired });
          break;
        }
      }
    }

    if (updates.length === 0) {
      console.log('No matching collections found to update. Exiting.');
      process.exit(0);
    }

    console.log(`Found ${updates.length} collection(s) to normalize:`);
    updates.forEach(u => console.log(` - ${u.col.name} (current title: "${u.col.title}") -> "${u.desired}"`));

    if (dryRun) {
      console.log('\nDry run enabled; no changes will be made.');
      process.exit(0);
    }

    for (const { col, desired } of updates) {
      const updateUrl = `${base.replace(/\/$/, '')}/collections/${encodeURIComponent(col.name)}:update`;
      console.log(`Updating ${col.name} -> title="${desired}", hidden=true`);
      try {
        await axios.post(updateUrl, { title: desired, hidden: true }, { headers });
        console.log(`  Updated ${col.name}`);
      } catch (err) {
        console.error(`  Failed to update ${col.name}:`, err.response?.data || err.message || err);
      }
    }

    console.log('Normalization complete.');
  } catch (err) {
    console.error('Error fetching collections:', err.response?.data || err.message || err);
    process.exit(1);
  }
})();
