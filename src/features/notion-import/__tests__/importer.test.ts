import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
// dynamically load the script using node import so vite doesn't try to bundle an external TS file
let run: (zip: string, client?: any) => Promise<void>;
import childProcess from 'child_process';

// helper to create zipped sample workspace
async function makeZippedSample(): Promise<string> {
    const tmp = await fs.promises.mkdtemp(path.join(process.cwd(), 'test-notion-'));
    // create a markdown page with frontmatter and some body text
    const md = `---\ntitle: MyPage\nfoo: bar\n---\nThis is the body text.`;
    await fs.promises.writeFile(path.join(tmp, 'page.md'), md);
    // create nested directory with another markdown page
    await fs.promises.mkdir(path.join(tmp, 'subfolder'));
    await fs.promises.writeFile(path.join(tmp, 'subfolder', 'other.md'), `# heading`);
    // create two CSV databases, one in a nested folder as well
    const csv1 = 'Name,Value\nX,1';
    const csv2 = 'A,B\n1,2';
    await fs.promises.writeFile(path.join(tmp, 'db.csv'), csv1);
    await fs.promises.writeFile(path.join(tmp, 'subfolder', 'db2.csv'), csv2);
    const zipPath = path.join(process.cwd(), `sample-${Date.now()}.zip`);
    // use system zip command by running in the temp directory; this avoids escaping issues
    childProcess.execSync(`zip -r ${zipPath} .`, { cwd: tmp });
    return zipPath;
}

beforeAll(async () => {
    const mod = await import(path.resolve(__dirname, '../../../../scripts/notion-import.js'));
    run = mod.run;
});

describe('notion importer integration', () => {
    it('runs through import steps with a fake client', async () => {
        const zipfile = await makeZippedSample();
        const calls: any[] = [];
        const fake = {
            post: async (url: string, body: any) => {
                // copy the body so later assertions don't get mutated
                calls.push({ url, body: JSON.parse(JSON.stringify(body)) });
                return { data: {} };
            }
        };
        await run(zipfile, fake);

        // verify we created collections for both CSV files and pages
        const createCols = calls.filter(c => c.url === '/collections:create').map(c => c.body.name);
        expect(createCols).toEqual(expect.arrayContaining(['db', 'db2', 'pages']));

        // check the pages collection definition includes a text field for body
        const pagesDef = calls.find(c => c.url === '/collections:create' && c.body.name === 'pages');
        expect(pagesDef).toBeDefined();
        expect(pagesDef.body.fields.body).toBe('text');

        // find records added
        const recs = calls.filter(c => c.url.startsWith('/records:'));
        // we should have at least 1 page + 3 csv rows (1 in db, 2 in db2)
        expect(recs.length).toBeGreaterThanOrEqual(3);

        // inspect that one of the record creations for page contains the body text and frontmatter
        const pageRec = recs.find(r => r.body.collection === 'pages');
        expect(pageRec).toBeDefined();
        expect(pageRec.body.data.body).toContain('This is the body text.');
        expect(pageRec.body.data.title).toBe('MyPage');
        expect(pageRec.body.data.foo).toBe('bar');

        // inspect CSV row data exists
        const dbRow = recs.find(r => r.body.collection === 'db' && r.body.data.Name === 'X');
        expect(dbRow).toBeDefined();

        const db2Row = recs.find(r => r.body.collection === 'db2' && r.body.data.A === 1);
        expect(db2Row).toBeDefined();
    });
});