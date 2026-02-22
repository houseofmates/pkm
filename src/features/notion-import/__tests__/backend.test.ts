import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';

// ensure secrets and mocking are configured before server module is evaluated
process.env.ADMIN_SECRET = 'test-secret';
process.env.MOCK_NOTION_IMPORT = 'true';
// ensure CORS allows the pkm origin during tests
process.env.ALLOWED_ORIGINS = 'https://pkm.houseofmates.space';

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
            .post('/api/nb-import')
            .set('Authorization', 'Bearer test-secret')
            .attach('file', zipPath);
        if (res.status !== 200) {
            console.error('response body', res.body, 'text', res.text);
        }
        expect(res.status).toBe(200);
        expect(res.body.taskId).toBeTruthy();
        const id = res.body.taskId;
        expect(importTasks.has(id)).toBe(true);
        expect(['running', 'done']).toContain(importTasks.get(id).status);
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

    it('accepts nocobase api key when configured', async () => {
        process.env.NOCOBASE_API_KEY = 'nb-key';
        const res = await request(app)
            .post('/api/nb-import')
            .set('Authorization', 'Bearer nb-key')
            .attach('file', zipPath);
        expect(res.status).toBe(200);
        expect(res.body.taskId).toBeTruthy();
    });

    it('allows polling logs via either route and keeps logs after completion', async () => {
        const res = await request(app)
            .post('/api/nb-import')
            .set('Authorization', 'Bearer test-secret')
            .attach('file', zipPath);
        const id = res.body.taskId;
        // wait for done
        await new Promise<void>((resolve) => {
            const interval = setInterval(() => {
                const entry = importTasks.get(id);
                if (entry && entry.status === 'done') {
                    clearInterval(interval);
                    resolve();
                }
            }, 10);
        });
        // poll using query param (GET)
        const poll1 = await request(app)
            .get('/api/nb-import/logs')
            .query({ id })
            .set('Authorization', 'Bearer test-secret');
        expect(poll1.status).toBe(200);
        expect(poll1.body.status).toBe('done');
        expect(Array.isArray(poll1.body.logs)).toBe(true);
        // poll using path-based GET route
        const poll2 = await request(app)
            .get(`/api/notion-import/${id}/logs`)
            .set('Authorization', 'Bearer test-secret');
        expect(poll2.status).toBe(200);
        expect(poll2.body.status).toBe('done');
        expect(Array.isArray(poll2.body.logs)).toBe(true);
        // poll with POST body, which is the new preferred form
        const poll3 = await request(app)
            .post('/api/nb-import/logs')
            .send({ id })
            .set('Authorization', 'Bearer test-secret');
        expect(poll3.status).toBe(200);
        expect(poll3.body.status).toBe('done');
        expect(Array.isArray(poll3.body.logs)).toBe(true);
    });

    describe('CORS', () => {
        it('returns allow-origin header for configured origin', async () => {
            const res = await request(app)
                .get('/api/status')
                .set('Origin', 'https://pkm.houseofmates.space');
            expect(res.headers['access-control-allow-origin']).toBe('https://pkm.houseofmates.space');
        });

        it('does not expose header for disallowed origin', async () => {
            const res = await request(app)
                .options('/api/status')
                .set('Origin', 'https://evil.com');
            expect(res.headers['access-control-allow-origin']).toBeUndefined();
        });

        it('handles CORS preflight and get for logs endpoint', async () => {
            const id = 'test123';
            const pre = await request(app)
                .options(`/api/notion-import/${id}/logs`)
                .set('Origin', 'https://pkm.houseofmates.space');
            expect(pre.headers['access-control-allow-origin']).toBe('https://pkm.houseofmates.space');

            const get = await request(app)
                .get(`/api/notion-import/${id}/logs`)
                .set('Origin', 'https://pkm.houseofmates.space');
            expect(get.headers['access-control-allow-origin']).toBe('https://pkm.houseofmates.space');
        });
    });
});
