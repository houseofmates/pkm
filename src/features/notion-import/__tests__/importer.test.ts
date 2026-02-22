import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { run } from '../../../scripts/notion-import';
import childProcess from 'child_process';

// helper to create zipped sample workspace
async function makeZippedSample(): Promise<string> {
    const tmp = await fs.promises.mkdtemp(path.join(process.cwd(), 'test-notion-'));
    const md = `---\ntitle: Page\n---\nhello`;
    await fs.promises.writeFile(path.join(tmp, 'page.md'), md);
    const csv = 'Name,Value\nX,1';
    await fs.promises.writeFile(path.join(tmp, 'db.csv'), csv);
    const zipPath = path.join(process.cwd(), `sample-${Date.now()}.zip`);
    // use system zip command
    childProcess.execSync(`cd ${tmp.replace(/\/g,'\\')} && zip -r ${zipPath.replace(/\/g,'\\')} .`);
    return zipPath;
}

describe('notion importer integration', () => {
    it('runs through import steps with a fake client', async () => {
        const zipfile = await makeZippedSample();
        const calls: any[] = [];
        const fake = {
            post: async (url: string, body: any) => {
                calls.push({ url, body });
                return { data: {} };
            }
        };
        await run(zipfile, fake);
        // expect collection create for db and pages
        const urls = calls.map(c=>c.url);
        expect(urls).toContain('/collections:create');
        // expect records create called at least twice (one db row + one page)
        const recs = calls.filter(c=>c.url.startsWith('/records:'));
        expect(recs.length).toBeGreaterThanOrEqual(2);
    });
});