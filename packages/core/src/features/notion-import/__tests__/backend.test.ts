/// <reference path="../../../../types/supertest.d.ts" />
import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import request from 'supertest';

// helper to create a tiny zip file for testing
function createEmptyZip(filePath: string) {
  const hex = '504b0506000000000000000000';
  fs.writeFileSync(filePath, Buffer.from(hex, 'hex'));
}

// simple polling helper used by several tests
async function waitForDone(taskId: string) {
  for (let i = 0; i < 20; i++) {
    const r = await request(server)
      .get(`/api/nb-import/logs?id=${taskId}`)
      .set('Authorization', 'Bearer test-secret');
    if (r.body?.status === 'done') return r.body;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('timeout waiting for task completion');
}

// configure a dummy admin secret for tests (backend expects ADMIN_SECRET)
process.env.ADMIN_SECRET = 'test-secret';
// also override broadcast key in case it's set in environment
process.env.BROADCAST_AUTH_KEY = 'test-secret';

// server instance loaded lazily after env vars are configured
let server!: Express;

// ensure the public upload directory exists and start backend once
beforeAll(async () => {
  const dir = path.join(__dirname, '../../../../public');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!server) {
    const backend = await import('@pkm/backend/server.js') as { app: Express };
    server = backend.app;
  }
});

describe('backend /api/nb-import', () => {
  it('creates a task and eventually completes', async () => {
    const tmp = path.join(__dirname, 'temp.zip');
    createEmptyZip(tmp);
    const res = await request(server)
      .post('/api/nb-import')
      .set('Authorization', 'Bearer test-secret')
      .attach('file', tmp);
    expect(res.status).toBe(200);
    const { taskId } = res.body;
    expect(typeof taskId).toBe('string');
    const body = await waitForDone(taskId);
    expect(body.status).toBe('done');
  });

  it('accepts nocobase api key when configured', async () => {
    process.env.NOCOBASE_API_KEY = 'nb-key';
    const tmp = path.join(__dirname, 'temp2.zip');
    createEmptyZip(tmp);
    const res = await request(server)
      .post('/api/nb-import')
      .set('Authorization', 'Bearer nb-key')
      .attach('file', tmp);
    expect(res.status).toBe(200);
    expect(res.body.taskId).toBeDefined();
    delete process.env.NOCOBASE_API_KEY;
  });

  it('allows polling logs via either route and keeps logs after completion', async () => {
    const tmp = path.join(__dirname, 'temp3.zip');
    createEmptyZip(tmp);
    const { body: upload } = await request(server)
      .post('/api/nb-import')
      .set('Authorization', 'Bearer test-secret')
      .attach('file', tmp);
    const taskId = upload.taskId;
    // poll GET
    let r1 = await request(server)
      .get(`/api/nb-import/logs?id=${taskId}`)
      .set('Authorization', 'Bearer test-secret');
    expect(r1.status).toBe(200);
    // poll POST
    let r2 = await request(server)
      .post('/api/nb-import/logs')
      .set('Authorization', 'Bearer test-secret')
      .send({ id: taskId });
    expect(r2.status).toBe(200);
    // wait for completion and poll again
    await waitForDone(taskId);
    r1 = await request(server)
      .get(`/api/nb-import/logs?id=${taskId}`)
      .set('Authorization', 'Bearer test-secret');
    expect(r1.body.status).toBe('done');
  });

  describe('CORS', () => {
    it('returns allow-origin header for configured origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://foo.example';
      const r = await request(server)
        .get('/api/nb-import/logs?id=none')
        .set('Origin', 'https://foo.example')
        .set('Authorization', 'Bearer test-secret');
      expect(r.headers['access-control-allow-origin']).toBe('https://foo.example');
      delete process.env.ALLOWED_ORIGINS;
    });

    it('does not expose header for disallowed origin', async () => {
      process.env.ALLOWED_ORIGINS = 'https://bar.example';
      const r = await request(server)
        .get('/api/nb-import/logs?id=none')
        .set('Origin', 'https://not.allowed')
        .set('Authorization', 'Bearer test-secret');
      expect(r.headers['access-control-allow-origin']).toBeUndefined();
      delete process.env.ALLOWED_ORIGINS;
    });

    it('handles CORS and auth on get for logs endpoint', async () => {
      const r = await request(server)
        .get('/api/nb-import/logs?id=test123')
        .set('Origin', 'https://foo.example')
        .set('Authorization', 'Bearer test-secret');
      expect(r.status).toBe(404);
    });
  });

  it('imports simple CSV file and logs progress', async () => {
    const tmpCsv = path.join(__dirname, 'test.csv');
    fs.writeFileSync(tmpCsv, 'name,notes\nAlice,"hello **bold**"\n');
    const r = await request(server)
      .post('/api/nb-import')
      .set('Authorization', 'Bearer test-secret')
      .attach('file', tmpCsv);
    expect(r.status).toBe(200);
    const { taskId } = r.body;
    const body = await waitForDone(taskId);
    // the logs should mention creating a collection from the csv name
    expect(body.logs.some((l: string) => /creating collection/i.test(l))).toBe(true);
  });
});

