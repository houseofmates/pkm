<<<<<<< HEAD
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseNotionExport, NodeFsSource } from '../parser';

=======
import { afterEach, describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { parseNotionExport, NodeFsSource } from '../parser';

const tempPaths: string[] = [];

>>>>>>> main
// helper to recursively find files and create nodefssource
async function walkSources(dir: string, root: string = dir): Promise<NodeFsSource[]> {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const results: NodeFsSource[] = [];
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        const rel = path.relative(root, full);
        if (ent.isDirectory()) {
            results.push(...await walkSources(full, root));
        } else if (ent.isFile()) {
            results.push(new NodeFsSource(full, rel));
        }
    }
    return results;
}

// helper create a temporary test directory structure
async function makeSampleDir(): Promise<string> {
<<<<<<< HEAD
    const tmp = await fs.promises.mkdtemp(path.join(process.cwd(), 'test-notion-'));
=======
    const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pkm-test-notion-'));
    tempPaths.push(tmp);
>>>>>>> main
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

<<<<<<< HEAD
=======
afterEach(async () => {
    await Promise.all(tempPaths.splice(0).map(p => fs.promises.rm(p, { recursive: true, force: true })));
});

>>>>>>> main
describe('Notion parser', () => {
    it('should read pages, csvs and assets', async () => {
        const dir = await makeSampleDir();
        const sources = await walkSources(dir);
        const ws = await parseNotionExport(sources);
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
<<<<<<< HEAD
});
=======
});
>>>>>>> main
