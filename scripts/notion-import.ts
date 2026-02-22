#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import os from 'os';
import unzipper from 'unzipper';
import axios from 'axios';
import { parseNotionExport } from '../src/features/notion-import/parser';
import { transformWorkspace, Instruction } from '../src/features/notion-import/transformer';

async function unzipToTemp(zipPath: string): Promise<string> {
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
    const instance = axios.create({ baseURL: base.replace(/\/$/, ''), headers });
    return instance;
}

export async function run(zipFile: string, clientOverride?: any, onProgress?: (msg: string) => void) {
    const report = (msg: string) => {
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
            } catch (err: any) {
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
            } catch (err: any) {
                report(`error creating record in ${ins.collection}: ${err.response?.data || err.message}`);
            }
        }
    }

    report(`import complete: ${collectionsCreated} collections, ${recordsCreated} records`);
}

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error('usage: npm run notion:import -- <path-to-zip>');
        process.exit(1);
    }
    run(args[0]).catch(err => {
        console.error('import failed:', err);
        process.exit(1);
    });
}
