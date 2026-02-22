import fs from 'fs';
import path from 'path';
import os from 'os';
import unzipper from 'unzipper';
import axios from 'axios';
import { parse as csvParse } from 'papaparse';
import yaml from 'js-yaml';

async function walk(dir, predicate) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results = [];
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            results.push(...await walk(full, predicate));
        } else if (ent.isFile() && predicate(full)) {
            results.push(full);
        }
    }
    return results;
}

async function parseMarkdownFile(filePath) {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    let frontmatter = {};
    let content = raw;
    if (raw.startsWith('---')) {
        const end = raw.indexOf('---', 3);
        if (end !== -1) {
            const fm = raw.slice(3, end);
            try {
                frontmatter = yaml.load(fm) || {};
            } catch {
                frontmatter = {};
            }
            content = raw.slice(end + 3).trimStart();
        }
    }
    const title = frontmatter.title || path.basename(filePath).replace(/\.md$/, '');
    return { path: filePath, title, frontmatter, content };
}

async function parseNotionExport(root) {
    const pages = [];
    const databases = [];
    const assets = [];

    const mdFiles = await walk(root, f => f.toLowerCase().endsWith('.md'));
    for (const md of mdFiles) {
        try {
            pages.push(await parseMarkdownFile(md));
        } catch (err) {
            console.error(`failed to parse markdown ${md}:`, err);
        }
    }

    const csvFiles = await walk(root, f => f.toLowerCase().endsWith('.csv'));
    for (const csv of csvFiles) {
        const name = path.basename(csv, '.csv');
        const rows = [];
        const content = await fs.promises.readFile(csv, 'utf-8');
        csvParse(content, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: h => h.trim(),
            complete: (res) => {
                if (res.errors.length) {
                    console.warn(`warnings parsing CSV ${csv}:`, res.errors);
                }
                rows.push(...res.data);
            }
        });
        const fields = rows.length > 0 ? Object.keys(rows[0]) : [];
        databases.push({ name, rows, fields });
    }

    const assetsDir = path.join(root, 'assets');
    if (fs.existsSync(assetsDir)) {
        const assetFiles = await walk(assetsDir, _ => true);
        assets.push(...assetFiles.map(f => path.relative(root, f)));
    }

    return { pages, databases, assets };
}

function guessType(values) {
    let hasString = false;
    let hasNumber = false;
    let hasBoolean = false;
    for (const v of values) {
        if (v == null || v === '') continue;
        if (typeof v === 'number') {
            hasNumber = true;
        } else if (typeof v === 'boolean') {
            hasBoolean = true;
        } else if (typeof v === 'string') {
            const maybeNum = Number(v);
            if (!isNaN(maybeNum) && v.trim() !== '') {
                hasNumber = true;
            } else if (v === 'true' || v === 'false') {
                hasBoolean = true;
            } else {
                hasString = true;
            }
        } else {
            hasString = true;
        }
    }
    if (hasString || (hasString && hasNumber)) return 'string';
    if (hasBoolean && !hasString && !hasNumber) return 'boolean';
    if (hasNumber && !hasString) return 'number';
    return 'string';
}

function transformWorkspace(ws) {
    const instructions = [];
    for (const db of ws.databases) {
        const sampleRows = db.rows.slice(0, 20);
        const fields = {};
        for (const field of db.fields) {
            const colValues = sampleRows.map(r => r[field]);
            fields[field] = guessType(colValues);
        }
        instructions.push({ type: 'createCollection', name: db.name, fields });
        for (const row of db.rows) {
            instructions.push({ type: 'createRecord', collection: db.name, data: row });
        }
    }
    instructions.push({ type: 'createCollection', name: 'pages', fields: { title: 'string', body: 'string' } });
    for (const page of ws.pages) {
        const data = { title: page.title, body: page.content, ...page.frontmatter };
        instructions.push({ type: 'createRecord', collection: 'pages', data });
    }
    return instructions;
}

async function unzipToTemp(zipPath) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notion-import-'));
    console.log(`extracting ${zipPath} -> ${tempDir}`);
    await fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise();
    return tempDir;
}

function getApiClient() {
    const base = process.env.NOCOBASE_URL || 'http://localhost:4100/api';
    const apiKey = process.env.ADMIN_API_KEY || process.env.NOCOBASE_API_KEY || process.env.AUTH;
    if (!apiKey) {
        console.error('Set ADMIN_API_KEY or NOCOBASE_API_KEY environment variable');
        process.exit(2);
    }
    const headers = {
        Authorization: apiKey.startsWith('Bearer') ? apiKey : `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };
    return axios.create({ baseURL: base.replace(/\/$/, ''), headers });
}

export async function run(zipFile, clientOverride, onProgress) {
    const report = (msg) => {
        if (onProgress) onProgress(msg);
        else console.log(msg);
    };
    const folder = await unzipToTemp(zipFile);
    report(`parsed export to ${folder}`);
    const ws = await parseNotionExport(folder);
    report(`found ${ws.pages.length} pages and ${ws.databases.length} databases`);
    const instructions = transformWorkspace(ws);
    const client = clientOverride || getApiClient();
    let collectionsCreated = 0;
    let recordsCreated = 0;
    for (const ins of instructions) {
        if (ins.type === 'createCollection') {
            try {
                report(`creating collection ${ins.name}`);
                await client.post(`/collections:create`, { name: ins.name, fields: ins.fields });
                collectionsCreated++;
            } catch (err) {
                report(`failed creating collection ${ins.name}: ${err.response?.data || err.message}`);
            }
        }
    }
    for (const ins of instructions) {
        if (ins.type === 'createRecord') {
            try {
                await client.post(`/records:${ins.collection}:create`, { values: ins.data });
                recordsCreated++;
                if (recordsCreated % 50 === 0) {
                    report(`imported ${recordsCreated} records so far`);
                }
            } catch (err) {
                report(`error creating record in ${ins.collection}: ${err.response?.data || err.message}`);
            }
        }
    }
    report(`import complete: ${collectionsCreated} collections, ${recordsCreated} records`);
}

if (process.argv[1] && process.argv[1].endsWith('notion-import.js')) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('usage: node scripts/notion-import.js <zip>');
        process.exit(1);
    }
    run(args[0]).catch(e => {
        console.error('import failed:', e);
        process.exit(1);
    });
}
