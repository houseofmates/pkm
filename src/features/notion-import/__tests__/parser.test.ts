import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseNotionExport } from '../parser';

// helper create a temporary test directory structure
async function makeSampleDir(): Promise<string> {
    const tmp = await fs.promises.mkdtemp(path.join(process.cwd(), 'test-notion-'));
    // create page
    const md = `---\ntitle: My Page\nfoo: bar\n---\nThis is content.`;
    await fs.promises.writeFile(path.join(tmp, 'page1.md'), md);
    // create database csv
    const csv = 'Name,Value\nAlice,10\nBob,20';
    await fs.promises.writeFile(path.join(tmp, 'db.csv'), csv);
    // asset subfolder
    await fs.promises.mkdir(path.join(tmp, 'assets'));
    await fs.promises.writeFile(path.join(tmp, 'assets', 'img.png'), 'data');
    return tmp;
}

describe('Notion parser', () => {
    it('should read pages, csvs and assets', async () => {
        const dir = await makeSampleDir();
        const ws = await parseNotionExport(dir);
        expect(ws.pages.length).toBe(1);
        expect(ws.pages[0].title).toBe('My Page');
        expect(ws.pages[0].frontmatter.foo).toBe('bar');

        expect(ws.databases.length).toBe(1);
        expect(ws.databases[0].name).toBe('db');
        expect(ws.databases[0].rows.length).toBe(2);
        expect(ws.databases[0].rows[0].Name).toBe('Alice');

        expect(ws.assets).toContain(path.join('assets', 'img.png'));
    });
});