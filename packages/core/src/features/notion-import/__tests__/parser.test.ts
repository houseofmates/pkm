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
    // nested markdown
    await fs.promises.mkdir(path.join(tmp, 'sub'));
    await fs.promises.writeFile(path.join(tmp, 'sub', 'page2.md'), 'simple page');
    // create database csv
    const csv = 'Name,Value\nAlice,10\nBob,20';
    await fs.promises.writeFile(path.join(tmp, 'db.csv'), csv);
    // another csv nested
    await fs.promises.writeFile(path.join(tmp, 'sub', 'db2.csv'), 'X,Y\n1,2');
    // asset subfolder
    await fs.promises.mkdir(path.join(tmp, 'assets'));
    await fs.promises.writeFile(path.join(tmp, 'assets', 'img.png'), 'data');
    return tmp;
}

describe('Notion parser', () => {
    it('should read pages, csvs and assets', async () => {
        const dir = await makeSampleDir();
        const ws = await parseNotionExport(dir);
        // two pages from root and nested folder
        expect(ws.pages.length).toBe(2);
        const titles = ws.pages.map(p => p.title).sort();
        expect(titles).toEqual(expect.arrayContaining(['My Page', 'page2']));
        const page1 = ws.pages.find(p => p.title === 'My Page')!;
        expect(page1.frontmatter.foo).toBe('bar');

        // databases should include db and db2
        expect(ws.databases.length).toBe(2);
        const dbNames = ws.databases.map(d => d.name).sort();
        expect(dbNames).toEqual(expect.arrayContaining(['db', 'db2']));
        const db = ws.databases.find(d => d.name === 'db')!;
        expect(db.rows.length).toBe(2);
        expect(db.rows[0].Name).toBe('Alice');

        expect(ws.assets).toContain(path.join('assets', 'img.png'));
    });
});