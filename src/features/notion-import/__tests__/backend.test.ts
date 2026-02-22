import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

// ensure secrets and mocking are configured before server module is evaluated
process.env.ADMIN_SECRET = 'test-secret';
process.env.MOCK_NOTION_IMPORT = 'true';

let app: any;
let importTasks: Map<any, any>;

// create a small zip file for tests
async function makeZip(): Promise<string> {
    const tmp = await fs.promises.mkdtemp(path.join(process.cwd(), 'test-notion-'));
    await fs.promises.writeFile(path.join(tmp, 'foo.md'), 'hello');
    const zipPath = path.join(process.cwd(), `backend-sample-${Date.now()}.zip`);
    // use system zip
    require('child_process').execSync(`zip -r ${zipPath} .`, { cwd: tmp });
    return zipPath;
}

describe('backend /api/notion-import', () => {
    let zipPath: string;
    beforeAll(async () => {
        const mod = await import('../../../../backend/server.js');
        app = mod.app;
        importTasks = mod.importTasks;
        zipPath = await makeZip();
        // env variables already set at top
    });
    afterAll(() => {
        if (zipPath && fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    });

    it('creates a task and eventually completes', async () => {
        const res = await request(app)
            .post('/api/notion-import')
            .set('Authorization', 'Bearer test-secret')
            .attach('file', zipPath);
        expect(res.status).toBe(200);
        expect(res.body.taskId).toBeTruthy();
        const id = res.body.taskId;
        expect(importTasks.has(id)).toBe(true);
        expect(importTasks.get(id).status).toBe('running');
        // wait until done
        await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                const entry = importTasks.get(id);
                if (entry && entry.status === 'done') {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
        expect(importTasks.get(id).status).toBe('done');
    });
});
