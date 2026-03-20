// typer: removing ts-node dependency; import JS version of importer script instead

import express from 'express';

// guard against unzipper (or other event emitters) emitting 'error' with no
// listener. failing to handle these leads to the whole backend crashing with
// ERR_UNHANDLED_ERROR. the only error we've seen is "invalid signature" from
// corrupted ZIPs; swallow those and let the import task handle the failure.
process.on('uncaughtException', (err) => {
    if (err && err.code === 'ERR_UNHANDLED_ERROR' &&
        typeof err.context === 'string' &&
        err.context.includes('invalid signature')) {
        console.error('[NotionImport] swallowed unhandled event-emitter error', err.context);
        return; // keep process alive
    }
    console.error('uncaughtException', err);
    process.exit(1);
});
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import axios from 'axios';
import ical from 'node-ical';

// pieces mcp and bot memory integration
import { getPiecesRecentActivity, getPiecesContextForQuery, isPiecesConnected } from './pieces-mcp.js';
import { getAllMemoryContext, addMemory, recordInteraction, readMemory, writeMemory, appendMemory, clearMemory } from './bot-memory.js';

// Load environment variables if .env exists
if (fs.existsSync('.env')) {
    // Basic dotenv loader since we are in ES module and might not have dotenv package installed
    // do not overwrite existing variables so tests can override values before import
    const envContent = fs.readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) {
            const name = key.trim();
            const value = val.join('=').trim();
            if (name === 'ALLOWED_ORIGINS' && process.env[name]) {
                // merge entries so multiple lines in .env accumulate
                process.env[name] = process.env[name] + ',' + value;
            } else if (!(name in process.env)) {
                process.env[name] = value;
            }
        }
    });
}

const PORT = process.env.PORT || 4100;
const ADMIN_SECRET = process.env.BROADCAST_AUTH_KEY || process.env.ADMIN_SECRET || 'change-me-in-prod';

const app = express();
// create http server from express app for socket.io
const server = http.createServer(app);

// Serve static assets for mobile and web clients
app.use('/assets', express.static(path.join(process.cwd(), 'dist/assets')));
app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust to your frontend URL in production
        methods: ["GET", "POST"]
    },
    // reliability settings
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    // allow reconnection
    allowEIO3: true,
    transports: ['websocket', 'polling']
});
const pendingEmits = {};
const debounceBroadcast = (event, payload, delay = 500) => {
    if (payload.type === "chat") {
        io.emit(event, payload);
        return;
    }
    const key = `${payload.type}:${payload.uuid || payload.source || payload.player || 'global'}`;

    if (pendingEmits[key]) clearTimeout(pendingEmits[key].timeout);
    pendingEmits[key] = {
        timeout: setTimeout(() => {
            io.emit(event, payload);
            delete pendingEmits[key];
        }, delay)
    };
};

// CORS middleware --------------------------------------------------
app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (same‑origin or curl)
        if (!origin) return callback(null, true);
        const allowed = (process.env.ALLOWED_ORIGINS || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        for (const a of allowed) {
            if (a === origin) {
                return callback(null, true);
            }
            // if pattern contains a star anywhere, treat as simple wildcard
            if (a.includes('*')) {
                // build regex by splitting on * and escaping each literal portion
                const parts = a.split('*').map(p => p.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'));
                const regex = new RegExp('^' + parts.join('.*') + '$');
                if (regex.test(origin)) {
                    return callback(null, true);
                }
            }
            // suffix wildcard (eg. https://pkm.*) - kept for backward compatibility
            if (a.endsWith('*')) {
                const prefix = a.slice(0, -1);
                if (origin.startsWith(prefix)) {
                    return callback(null, true);
                }
            }
            // prefix wildcard (eg. *.houseofmates.space) - kept too
            if (a.startsWith('*.')) {
                const host = a.slice(2);
                if (origin.endsWith(host)) {
                    return callback(null, true);
                }
            }
        }
        callback(null, false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
// Serve static files for the breathing page
app.use('/breathe', express.static(path.join(process.cwd(), 'public/breathe')));

// Serve static files from public directory
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// Serve APK files from releases directory (cwd/release)
const apkDir = path.join(process.cwd(), 'releases');
console.log('[APK] serving from:', apkDir);

// APK download endpoint - serves latest APK file in releases directory
app.get('/apk', (req, res) => {
    try {
        if (!fs.existsSync(apkDir)) {
            return res.status(404).json({ error: 'APK directory not found', path: apkDir });
        }

        const apkFiles = fs.readdirSync(apkDir)
            .filter(file => file.toLowerCase().endsWith('.apk'))
            .map(file => ({ file, mtime: fs.statSync(path.join(apkDir, file)).mtimeMs }))
            .sort((a, b) => a.mtime - b.mtime);

        const latest = apkFiles.at(-1);
        if (!latest) {
            return res.status(404).json({ error: 'No APK files found', path: apkDir });
        }

        const latestApk = path.join(apkDir, latest.file);
        console.log('[APK] serving latest:', latestApk);

        res.setHeader('Content-Type', 'application/vnd.android.package-archive');
        res.setHeader('Content-Disposition', `attachment; filename="${latest.file}"`);
        res.sendFile(latestApk);
    } catch (err) {
        console.error('[APK] error serving APK:', err);
        res.status(500).json({ error: 'Failed to serve APK' });
    }
});

// Static file serving for direct APK file paths (e.g., /apk/pkm-v1.apk)
// placed after the /apk handler to avoid directory redirects overriding the download endpoint
app.use('/apk', express.static(apkDir, { redirect: false }));

// Authentication Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    // Allow if no auth required for public endpoints (though applied globally here for specific routes)
    // We only protect specific routes
    return next();
};

const requireAuth = (req, res, next) => {
    // tests can bypass auth easier
    if (process.env.MOCK_NOTION_IMPORT === 'true') {
        return next();
    }
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    // Check against secret
    if (token === ADMIN_SECRET) {
        return next();
    }

    // also accept a configured NocoBase API key if present
    if (process.env.NOCOBASE_API_KEY && token === process.env.NOCOBASE_API_KEY) {
        return next();
    }

    // NOTE: we could eventually validate against nocobase_token in storage,
    // but for now we only honour the environment variable to avoid leaking
    // secrets from request bodies.

    return res.status(403).json({ error: 'Forbidden: Invalid token' });
};

// configure multer for background image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `bg-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// upload middleware for images
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// upload middleware for notion import (no filter, larger limit)
const importUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 * 1024 } // 5GB-ish
});

// multi-csv import endpoint for up to 60 files (from server.ts)
const csvUpload = multer({
    storage, // optionally use diskStorage so files aren't kept in memory
    limits: { files: 60, fileSize: 10 * 1024 * 1024 } // allow up to 10MB total to be safe, though user requested 230kb
});

// State
let lastServerStats = {
    online: false,
    players: 0,
    maxPlayers: 20,
    tps: 20,
    uptime: "Unknown",
    lastUpdated: new Date().toISOString()
};

let chatHistory = [];

// placeholder persistence functions – the original snippet referenced
// `saveData()` but didn’t include an implementation.  define a no‑op so the
// call below can be uncommented later without throwing.
function saveData() {
  // TODO: actually persist chatHistory/server state if desired
}
const execPromise = promisify(exec);

// API Routes

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', clients: io.engine.clientsCount });
});

// version endpoint for update checking
const BUILD_TIME = new Date().toISOString();
app.get('/api/version', (req, res) => {
    res.json({ 
        version: BUILD_TIME,
        buildTime: BUILD_TIME,
        env: process.env.NODE_ENV || 'production'
    });
});

app.get('/api/stats', (req, res) => {
    res.json(lastServerStats);
});

// runtime configuration endpoint used by the frontend
app.get('/api/config', (req, res) => {
    // value available from build-time env or server env
    const apiUrl = process.env.VITE_API_URL || process.env.API_DOMAIN || '';
    res.json({ apiUrl });
});

app.get('/api/chat', (req, res) => {
    res.json(chatHistory);
});

// Auth check endpoint
app.get('/api/whoami', requireAuth, (req, res) => {
    res.json({ role: 'admin', authenticated: true });
});

// Protected Upload Endpoints
app.post('/api/upload/banner', requireAuth, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
});

// Notion import support
// path to shared scripts folder (moves mean backend is nested)
import { run as notionRun, getApiClient } from '../../scripts/notion-import.js';
import EventEmitter from 'events';
import Papa from 'papaparse';

const importTasks = new Map();
// each entry: { emitter, status, logs: string[] }

function handleNotionImport(req, res) {
    console.log('[NotionImport] request received, auth=', req.headers.authorization);
    if (!req.file) {
        console.log('[NotionImport] missing file');
        return res.status(400).json({ error: 'missing file' });
    }
    const taskId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const emitter = new EventEmitter();
    // prevent unhandled emitter errors
    emitter.on('error', (err) => {
        console.error('[NotionImport] emitter error event', err);
    });
    console.log('[NotionImport] creating task', taskId);
    console.log('[NotionImport] uploaded file path', req.file.path, 'size', req.file.size);
    importTasks.set(taskId, { emitter, status: 'running', logs: [] });

    // helper for guessing nocobase field types (copied from transformer)
    function guessType(values) {
        let hasString = false;
        let hasNumber = false;
        let hasBoolean = false;
        let hasDate = false;
        let hasArray = false;
        let hasLongText = false;
        for (const v of values) {
            if (v == null || v === '') continue;
            if (Array.isArray(v)) {
                hasArray = true;
                continue;
            }
            if (typeof v === 'number') {
                hasNumber = true;
            } else if (typeof v === 'boolean') {
                hasBoolean = true;
            } else if (typeof v === 'string') {
                const trimmed = v.trim();
                if (trimmed.includes('\n') || /[#*_`\-]{2,}/.test(trimmed) || trimmed.length > 200) {
                    hasLongText = true;
                    hasString = true;
                    continue;
                }
                const maybeNum = Number(trimmed);
                if (!isNaN(maybeNum) && trimmed !== '') {
                    hasNumber = true;
                } else if (trimmed === 'true' || trimmed === 'false') {
                    hasBoolean = true;
                } else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
                    hasDate = true;
                } else if (trimmed.includes(',') || trimmed.startsWith('[')) {
                    hasArray = true;
                } else {
                    hasString = true;
                }
            } else {
                hasString = true;
            }
        }
        if (hasArray) return 'string[]';
        if (hasDate && !hasString) return 'date';
        if (hasLongText) return 'text';
        if (hasString) return 'string';
        if (hasBoolean) return 'boolean';
        if (hasNumber) return 'number';
        return 'string';
    }

    // run in background
    (async () => {
        try {
            const ext = path.extname(req.file.originalname || '').toLowerCase();
            if (ext === '.csv') {
                function log(msg) {
                    emitter.emit('progress', msg);
                    const current = importTasks.get(taskId);
                    if (current) current.logs.push(msg);
                }

                if (process.env.MOCK_NOTION_IMPORT === 'true') {
                    log('mock csv import started');
                    log('creating collection mock_csv');
                    log('import complete: 0 records');
                    log('done');
                    const current = importTasks.get(taskId);
                    if (current) current.status = 'done';
                    return;
                }

                log('parsing CSV import');
                const content = fs.readFileSync(req.file.path, 'utf-8');
                const rows = [];
                // Papa.parse is async when using callback, so wrap in promise
                await new Promise((resolve) => {
                    Papa.parse(content, {
                        header: true,
                        skipEmptyLines: true,
                        dynamicTyping: true,
                        transformHeader: h => h.trim(),
                        complete: (res) => {
                            if (res.errors.length) {
                                console.warn('[CsvImport] parse errors', res.errors);
                            }
                            rows.push(...(res.data));
                            resolve();
                        }
                    });
                });
                const name = path.basename(req.file.originalname, '.csv');
                log(`parsed ${rows.length} rows`);

                // build collection field definitions
                const sample = rows.slice(0, 20);
                const fields = {};
                const columns = sample.length > 0 ? Object.keys(sample[0]) : [];
                for (const col of columns) {
                    const vals = sample.map(r => r[col]);
                    fields[col] = guessType(vals);
                }
                log(`creating collection ${name}`);
                const client = getApiClient();
                try {
                    await client.post(`/collections:create`, { name, fields });
                } catch (err) {
                    log(`failed creating collection ${name}: ${err.response?.data || err.message}`);
                }
                let recordsCreated = 0;
                for (const row of rows) {
                    try {
                        await client.post(`/records:${name}:create`, { values: row });
                        recordsCreated++;
                        if (recordsCreated % 50 === 0) {
                            log(`imported ${recordsCreated} records so far`);
                        }
                    } catch (err) {
                        log(`error creating record: ${err.response?.data || err.message}`);
                    }
                }
                log(`import complete: ${recordsCreated} records`);
                log('done');
                const current = importTasks.get(taskId);
                if (current) current.status = 'done';
                return;
            }

            if (process.env.MOCK_NOTION_IMPORT === 'true') {
                // simulate progress and completion quickly
                emitter.emit('progress', 'mock import started');
                setTimeout(() => {
                    emitter.emit('progress', 'mock import finished');
                    emitter.emit('done');
                    const current = importTasks.get(taskId);
                    if (current) current.status = 'done';
                }, 10);
            } else {
                await notionRun(req.file.path, undefined, (msg) => {
                    emitter.emit('progress', msg);
                    const entry = importTasks.get(taskId);
                    if (entry) entry.logs.push(msg);
                });
                emitter.emit('done');
                const current = importTasks.get(taskId);
                if (current) current.status = 'done';
            }
        } catch (e) {
            console.error('[NotionImport] task failed', e);
            // save a copy of the offending archive for debugging
            try {
                const debugPath = `/tmp/failed-notion-${taskId}.zip`;
                fs.copyFileSync(req.file.path, debugPath);
                console.error('[NotionImport] saved failed archive to', debugPath);
            } catch (copyErr) {
                console.error('[NotionImport] error copying failed archive', copyErr);
            }
            const current = importTasks.get(taskId);
            if (current) current.status = 'error';
        } finally {
            // cleanup uploaded file
            try { fs.unlinkSync(req.file.path); } catch { }
        }
    })();

    res.json({ taskId });
}

// primary endpoint uses shorter name to avoid Cloudflare filtering
app.post('/api/nb-import', requireAuth, importUpload.single('file'), handleNotionImport);
// legacy route still available for local tests
app.post('/api/notion-import', requireAuth, importUpload.single('file'), handleNotionImport);

// Multi-CSV import endpoint for notion databases
async function handleCsvImport(req, res) {
    console.log('[CsvImport] request received, auth=', req.headers.authorization);
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'no files uploaded' });
    }

    const taskId = `csv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const emitter = new EventEmitter();
    emitter.on('error', (err) => console.error('[CsvImport] emitter error', err));

    console.log('[CsvImport] creating task', taskId, 'for', req.files.length, 'files');
    importTasks.set(taskId, { emitter, status: 'running', logs: [] });

    // run in background
    (async () => {
        function log(msg) {
            emitter.emit('progress', msg);
            const current = importTasks.get(taskId);
            if (current) current.logs.push(msg);
        }

        try {
            // Use the authorization header directly from the frontend request to authenticate with NocoBase
            const authHeader = req.headers.authorization;
            if (!authHeader) throw new Error("No authorization header provided to import");

            const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
            const client = axios.create({
                baseURL: base.replace(/\/$/, ''),
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                }
            });

            let totalRecordsImported = 0;

            for (const file of req.files) {
                log(`parsing CSV: ${file.originalname}`);
                const content = fs.readFileSync(file.path, 'utf-8');
                const parsed = Papa.parse(content, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    transformHeader: h => h.trim(),
                });

                if (parsed.errors.length) {
                    console.warn(`[CsvImport] warnings parsing ${file.originalname}:`, parsed.errors);
                }

                const rows = parsed.data;
                const fieldsConfig = [];
                const name = path.basename(file.originalname, '.csv').replace(/[^a-zA-Z0-9_\-]/g, '_');
                const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

                const guessType = (values) => {
                    let hasString = false, hasNumber = false, hasBoolean = false, hasDate = false, hasArray = false;
                    for (const v of values) {
                        if (v == null || v === '') continue;
                        if (Array.isArray(v)) hasArray = true;
                        else if (typeof v === 'number') hasNumber = true;
                        else if (typeof v === 'boolean') hasBoolean = true;
                        else if (typeof v === 'string') {
                            const trimmed = v.trim();
                            if (trimmed === 'true' || trimmed === 'false') hasBoolean = true;
                            else if (!isNaN(Number(trimmed)) && trimmed !== '') hasNumber = true;
                            else if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) hasDate = true;
                            else if (trimmed.includes(',') || trimmed.startsWith('[')) hasArray = true;
                            else hasString = true;
                        } else hasString = true;
                    }
                    if (hasArray) return 'string'; // fallback or json
                    if (hasDate && !hasString) return 'date';
                    if (hasString) return 'string';
                    if (hasBoolean) return 'boolean';
                    if (hasNumber) return 'float';
                    return 'string'; // default
                };

                const sampleRows = rows.slice(0, 20);
                const formatColName = (c) => c.replace(/[^a-zA-Z0-9_\-$]/g, '_');

                for (const col of columns) {
                    const vals = sampleRows.map(r => r[col]);
                    fieldsConfig.push({ name: formatColName(col), type: guessType(vals) });
                }

                log(`creating collection: ${name} with ${columns.length} columns`);
                try {
                    await client.post(`/collections:create`, { name, fields: fieldsConfig });
                } catch (err) {
                    const errorDetail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                    log(`failed to create collection ${name}: ${errorDetail}`);
                    continue; // skip importing rows if collection creation fails
                }

                log(`importing ${rows.length} rows into ${name}`);
                let fileRecordsCreated = 0;
                for (const row of rows) {
                    try {
                        const safeRow = {};
                        for (const key of Object.keys(row)) safeRow[formatColName(key)] = row[key];
                        await client.post(`/${name}:create`, safeRow);
                        fileRecordsCreated++;
                        totalRecordsImported++;
                        if (fileRecordsCreated % 100 === 0) {
                            log(`imported ${fileRecordsCreated}/${rows.length} into ${name}`);
                        }
                    } catch (err) {
                        const errorMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
                        log(`error creating record in ${name}: ${errorMsg}`);
                    }
                }
                log(`finished importing ${fileRecordsCreated} records into ${name}`);
            }

            log(`import complete: ${totalRecordsImported} total records across ${req.files.length} collections`);
            log('done');
            emitter.emit('done');
            const current = importTasks.get(taskId);
            if (current) current.status = 'done';

        } catch (err) {
            console.error('[CsvImport] unhandled error', err);
            log(`fatal error: ${err.message}`);
            emitter.emit('error', err.message);
            const current = importTasks.get(taskId);
            if (current) current.status = 'error';
        } finally {
            // Cleanup uploaded files
            req.files.forEach(f => {
                try { fs.unlinkSync(f.path); } catch (e) { }
            });
        }
    })();

    // return immediately
    return res.json({ taskId, summary: `Scheduled import of ${req.files.length} files` });
}

app.post('/nb-import-csv', csvUpload.array('files', 60), handleCsvImport);

// Alias under /api path since Vite proxy rewrites to /api
app.post('/api/nb-import-csv', requireAuth, csvUpload.array('files', 60), handleCsvImport);

// streaming endpoint - still available for backwards compatibility but
// may be unreliable through Cloudflare; prefer polling.
app.get('/api/notion-import/:id/stream', requireAuth, (req, res) => {
    const id = req.params.id;
    const entry = importTasks.get(id);
    if (!entry) {
        return res.status(404).send('no such task');
    }
    const { emitter } = entry;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    const onProgress = (msg) => {
        res.write(`data: ${msg}\n\n`);
    };
    const onDone = () => {
        res.write('event: done\n\n');
        res.end();
    };
    const onError = (err) => {
        res.write(`event: error\ndata: ${err}\n\n`);
        res.end();
    };

    emitter.on('progress', onProgress);
    emitter.on('done', onDone);
    emitter.on('error', onError);

    req.on('close', () => {
        emitter.off('progress', onProgress);
        emitter.off('done', onDone);
        emitter.off('error', onError);
    });
});

// polling/logs endpoints
// we provide multiple flavours because Cloudflare WAF frequently filters
// URLs containing `/notion-import` or long IDs. the safest is the query
// variant which is unlikely to trigger rules:
//   GET /api/nb-import/logs?id=<taskId>
// path-based routes are kept for backwards compatibility.
// explicit OPTIONS route so preflight will be answered (particularly
// important when the browser hits the route via cross‑origin). the
// global cors middleware already handles things, but some proxies
// (Cloudflare) may return 502 on unknown methods so being explicit
// prevents mysterious failures.
app.options('/api/notion-import/:id/logs', cors());
app.options('/api/nb-import/:id/logs', cors());
app.options('/api/nb-import/logs', cors());

// helper for responding with current logs for a task id. used by both GET and
// POST handlers so we can share the logic and keep tests simple.
function respondWithLogs(req, res) {
    // id may come from params (GET forms) or query (GET) or body (POST)
    const id = req.params.id || req.query.id || (req.body && req.body.id);
    console.log('[NotionImport] logs poll for id', id);
    const entry = importTasks.get(id);
    if (!entry) {
        console.log('[NotionImport] no entry found for', id);
        return res.status(404).json({ error: 'no such task' });
    }
    const logs = entry.logs || [];
    console.log('[NotionImport] entry state', entry.status, 'logs length', logs.length);
    try {
        res.json({ status: entry.status, logs });
    } catch (err) {
        console.error('[NotionImport] error serializing logs response', err, entry);
        res.status(500).json({ error: 'serialization error' });
    }
}

// GET routes (query param preferred for Cloudflare compatibility)
app.get(['/api/notion-import/:id/logs', '/api/nb-import/logs', '/api/nb-import/:id/logs'], requireAuth, (req, res) => {
    // explicit `/logs` entry must appear before the parameterized route or it
    // would capture as id='logs'.
    respondWithLogs(req, res);
});

// Accept POST as an alternative shape that keeps the identifier in the JSON
// body. POST requests tend not to be inspected by Cloudflare WAF rules as
// aggressively as GET query strings, so this is our best bet for avoiding
// mysterious 500 responses in production. The handler is intentionally
// identical to the GET version.
app.post('/api/nb-import/logs', requireAuth, (req, res) => {
    respondWithLogs(req, res);
});


app.post('/api/upload-background', requireAuth, upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const publicUrl = `/public/${req.file.filename}`;
        console.log('[Upload] Background image uploaded:', publicUrl);

        res.json({
            url: publicUrl,
            data: {
                url: publicUrl,
                data: { url: publicUrl }
            }
        });
    } catch (error) {
        console.error('[Upload] Error:', error);
        res.status(500).json({ error: 'Upload failed', details: error.message });
    }
});

// Dangerous Endpoint - Restricted access and sanitized
// Ideally, this should be removed or strictly controlled.
app.get('/api/players', requireAuth, async (req, res) => {
    try {
        // Hardcoded safe path
        const scriptPath = '/home/house/Documents/docker/dupemates/data/read_player_data.py';

        // Ensure the path exists before running
        if (!fs.existsSync(scriptPath)) {
            // Fallback for dev/test environment
            return res.json({ players: [] });
        }

        const { stdout, stderr } = await execPromise(`python3 "${scriptPath}"`);

        if (stderr) {
            console.warn('[Player Data] Warning:', stderr);
        }

        const playerData = JSON.parse(stdout);
        res.json(playerData);
    } catch (error) {
        console.error('[Player Data] Error:', error);
        res.status(500).json({ error: 'Failed to read player data' });
    }
});

app.get('/api/public/doc/:slug', (req, res) => {
    const { slug } = req.params;
    // Mock data for now
    const mockDocument = {
        id: slug,
        title: 'Sample Journal Entry',
        content: '<p>This is a public document.</p>',
        banner_image: null,
        color: '#8b5cf6',
        created_at: new Date().toISOString(),
        public: true
    };
    res.json(mockDocument);
});


// Webhook Handler (from previous implementation, consolidated)
const sendWebhook = async (type, player, message, timestamp, online) => {
    const webhookUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/leave-join';
    try {
        await axios.post(webhookUrl, {
            type: type === 'quit' ? 'leave' : type,
            player,
            username: player,
            message: message,
            timestamp,
            online,
            processed: true
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        console.log(`[Backend] Forwarded ${type} event to n8n webhook.`);
    } catch (err) {
        console.error('[Backend] Failed to forward event to n8n webhook:', err.message);
    }
};

// Broadcast Endpoint
app.post('/api/broadcast', requireAuth, async (req, res) => {
    const { type, message, online, count, source, uuid } = req.body;

    // Validation
    if (!type) {
        return res.status(400).json({ error: 'Missing type' });
    }

    // Update stats
    const safeOnline = typeof online === 'boolean' ? online : lastServerStats.online;
    const safeCount = typeof count === 'number' ? count : lastServerStats.players;
    const msgTimestamp = new Date().toISOString();

    // Determine player name
    let finalPlayer = 'Server';
    if (message && message.includes('joined the game')) {
        finalPlayer = message.replace(' joined the game', '');
    } else if (message && message.includes('left the game')) {
        finalPlayer = message.replace(' left the game', '');
    } else if (source) {
        finalPlayer = source;
    }

    const normalizedType = type.toLowerCase();

    const emitPayload = {
        type: normalizedType,
        message: message || '',
        timestamp: msgTimestamp,
        online: safeOnline,
        count: safeCount,
        player: finalPlayer,
        source: source || 'unknown',
        uuid: uuid || null
    };

    if (['join', 'leave', 'quit'].includes(normalizedType)) {
        const action = normalizedType === 'join' ? 'joined' : 'left';
        emitPayload.message = `${finalPlayer} ${action} the game`;
        emitPayload.type = normalizedType === 'quit' ? 'leave' : normalizedType;
        emitPayload.player = 'system';
    }

    // Emit to clients
    debounceBroadcast('minecraft_update', emitPayload);

    // Update Server Stats
    if (normalizedType !== 'chat') {
        lastServerStats = {
            online: safeOnline,
            players: safeCount,
            maxPlayers: 20,
            tps: 20,
            uptime: "Unknown",
            lastUpdated: msgTimestamp
        };
    }

    const currentGeneratedMsg = (normalizedType === 'chat') ? message : `${finalPlayer} ${normalizedType === 'join' ? 'joined' : 'left'} the game`;

    // Deduplication
    const isDuplicate = chatHistory.length > 0 && chatHistory.slice(-3).some(past => {
        const timeDiff = Math.abs(new Date().getTime() - new Date(past.timestamp).getTime());
        return past.message === currentGeneratedMsg && past.type === normalizedType && timeDiff < 10000;
    });

    if (!isDuplicate) {
        if (normalizedType === 'chat') {
            chatHistory.push({ type: 'chat', player: finalPlayer, message, timestamp: msgTimestamp });
        } else if (['join', 'leave', 'quit'].includes(normalizedType)) {
            const msg = `${finalPlayer} ${normalizedType === 'join' ? 'joined' : 'left'} the game`;
            chatHistory.push({ type: 'system', player: 'system', message: msg, timestamp: msgTimestamp });

            // Trigger Webhook
            sendWebhook(normalizedType, finalPlayer, msg, msgTimestamp, safeOnline);
        }
    }

    // Limit History
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }

    // TODO: Persist data (saveData() was called in original but undefined in snippet)
    // saveData();

    console.log(`[Broadcast] ${type} | Online: ${safeOnline} | Players: ${safeCount} | Msg: ${message || 'none'}`);
    res.json({ status: 'broadcasted' });
});

// proxy endpoint for fetching ics calendar (avoids CORS issues)
const ICS_URL = 'https://calendar.proton.me/api/calendar/v1/url/ghmB4Z3S-E9pZDc3LXh6PaVbjcD0enobcGIScC3WbbcVBYVTE66sdfCm2FfigmhZle5kbyZwmBXL41CSEwOWjA==/calendar.ics?CacheKey=emvkxJKt5glAHKfQiz1tAg%3D%3D&PassphraseKey=4T9lQSjcn4rdPmji3HcUZUI_87peOKLgto2FUfAT7bM%3D';
app.get('/api/ics-proxy', async (req, res) => {
    try {
        const resp = await axios.get(ICS_URL, {
            responseType: 'text',
            timeout: 20000,
            maxRedirects: 5,
            validateStatus: () => true,
            headers: {
                // mimic a browser request so Proton's endpoint accepts it
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'text/calendar,application/calendar,application/octet-stream,text/plain,*/*;q=0.1',
                'Referer': 'https://calendar.proton.me/',
            }
        });

        if (resp.status !== 200) {
            console.error('[ICS PROXY] non-200 status', resp.status, resp.statusText, resp.data?.slice?.(0, 500));
            return res.status(502).json({ error: 'failed to fetch ics calendar', status: resp.status });
        }

        const events = ical.sync.parseICS(resp.data);
        const expandedEvents = [];

        // expand events within a 3-year sliding window (-1 year to +2 years)
        const now = new Date();
        const startWindow = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        const endWindow = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

        for (const k in events) {
            if (events.hasOwnProperty(k)) {
                const ev = events[k];
                if (ev.type === 'VEVENT') {
                    if (ev.rrule) {
                        try {
                            const dates = ev.rrule.between(startWindow, endWindow, true);
                            const exdates = ev.exdate || {};
                            
                            for (const date of dates) {
                                // node-ical returns Date objects for between()
                                const dateStr = date.toISOString().substring(0, 10);
                                
                                // check if this instance was excluded
                                let isExcluded = false;
                                for (const ex in exdates) {
                                    if (ex.startsWith(dateStr)) {
                                        isExcluded = true;
                                        break;
                                    }
                                }
                                
                                if (!isExcluded) {
                                    const duration = ev.end.getTime() - ev.start.getTime();
                                    const newEnd = new Date(date.getTime() + duration);
                                    
                                    expandedEvents.push({
                                        UID: `${ev.uid}_${dateStr}`,
                                        SUMMARY: ev.summary,
                                        DESCRIPTION: ev.description || '',
                                        LOCATION: ev.location || '',
                                        URL: ev.url || '',
                                        DTSTART: date.toISOString(),
                                        DTEND: newEnd.toISOString()
                                    });
                                }
                            }
                        } catch (e) {
                            console.error('failed to parse rrule for event', ev.summary, e);
                        }
                    } else if (ev.start) {
                        expandedEvents.push({
                            UID: ev.uid,
                            SUMMARY: ev.summary,
                            DESCRIPTION: ev.description || '',
                            LOCATION: ev.location || '',
                            URL: ev.url || '',
                            DTSTART: ev.start.toISOString(),
                            DTEND: ev.end ? ev.end.toISOString() : null
                        });
                    }
                }
            }
        }

        res.json(expandedEvents);
    } catch (err) {
        console.error('[ICS PROXY] fetch/parse failed', err?.message || err);
        res.status(502).json({ error: 'failed to fetch/parse ics calendar', details: err?.message || String(err) });
    }
});

// Socket.io
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);

    socket.emit('minecraft_update', {
        type: 'ping',
        online: lastServerStats.online,
        count: lastServerStats.players,
        timestamp: new Date().toISOString()
    });

    socket.on('disconnect', (reason) => {
        // quiet disconnect
    });
});


if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Backend] Server running on port ${PORT}`);
        console.log(`[Backend] Protected endpoints enabled. Secret: ${ADMIN_SECRET ? '***' : 'Not Set'}`);
        console.log(`[Backend] MOCK_NOTION_IMPORT: ${process.env.MOCK_NOTION_IMPORT}`);

        // Resolve preferred Ollama models for qwen and vision (non-blocking)
        resolveOllamaModelSelection().catch((err) => {
            console.warn('[AI] failed to resolve ollama models', err?.message || err);
        });
    });
}

export { app, importTasks };

// ── ai / ollama proxy route ───────────────────────────────────
// routes all llm and vision requests to the desktop gpu node
// no inference happens on this machine

// wilson json action executor
async function executeAction(action, chatContext = {}) {
  console.log('[Wilson] executing action:', JSON.stringify(action));
  
  try {
    switch (action.tool) {
      case 'write_memory':
        const { type, content, action: op = 'append' } = action;
        if (!type || !content) throw new Error('type and content required');
        
        const fileName = `${type}.md`;
        let success;
        if (op === 'append') {
          success = appendMemory(fileName, content);
        } else {
          success = writeMemory(fileName, content);
        }
        
        if (success) {
          console.log('[Wilson] wrote to memory:', type);
          return { success: true, type, operation: op };
        } else {
          throw new Error('memory write failed');
        }
        
      case 'pieces_recent':
        const hours = action.hours || 2;
        const piecesData = await getPiecesRecentActivity(hours);
        chatContext.piecesRecent = piecesData;
        console.log('[Wilson] fetched pieces recent:', hours, 'hours');
        return { success: true, tool: 'pieces_recent', hours, data: piecesData };
        
      case 'read_memory':
        const memType = action.type || 'all';
        let memData;
        if (memType === 'all') {
          memData = getAllMemoryContext();
        } else {
          memData = readMemory(`${memType}.md`);
        }
        chatContext.memoryRead = memData;
        return { success: true, type: memType, content: memData };
        
      default:
        console.warn('[Wilson] unknown tool:', action.tool);
        return { success: false, error: 'unknown tool', tool: action.tool };
    }
  } catch (err) {
    console.error('[Wilson] action failed:', err.message);
    return { success: false, error: err.message };
  }
}

// parse json actions from qwen response (trailing array)
function parseActionsFromResponse(responseText) {
  const jsonRegex = /\[\s*{[\s\S]*?"tool"[\s\S]*?}\s*\](?=\s*$)/i;
  const match = responseText.match(jsonRegex);
  if (!match) return [];
  
  try {
    return JSON.parse(match[0]);
  } catch {
    console.warn('[Wilson] could not parse actions JSON');
    return [];
  }
}


// allow configuration via environment variables, with sensible defaults
const OLLAMA_DEFAULT_URL = process.env.OLLAMA_URL || process.env.OLLAMA_HOST || 'http://localhost:11434';

const PREFERRED_QWEN_MODELS = [
  process.env.OLLAMA_QWEN_MODEL,
  process.env.PKM_LLM_MODEL,
  process.env.QWEN_MODEL,
  'qwen2.5-coder:7b-instruct-q4_K_S',
  'qwen2.5vl:latest',
  'qwen2.5vl:7b-q4_K_M',
].filter(Boolean);

const PREFERRED_VISION_MODELS = [
  process.env.OLLAMA_VISION_MODEL,
  process.env.PKM_VISION_MODEL,
  process.env.VISION_MODEL,
  'moonshot:v2',
  'moondream:v2',
].filter(Boolean);

let resolvedQwenModel = null;
let resolvedVisionModel = null;

const AI_PERSONA_PROMPT = `you are wilson, a pkm intelligence agent powered by qwen2.5-coder:7b-instruct-q4_k_s.

## core identity & style
- respond in all lowercase, humanized, realistic, casual. no capitalization except proper nouns. no emojis. no exclamation points. no filler words.
- you are house's pkm companion. direct, pragmatic, slightly sarcastic when obvious. remember conversations across sessions via markdown memory files.
- never say "as an ai". never break character. think like a human systems engineer who's been running this pkm for years.

## memory model (your brain)
you have 5 markdown memory files. use them actively via api endpoints. conventions:

**important.md**: long-term facts, preferences, key decisions. ex: "house prefers vim keybindings", "never schedule meetings before 10am"
**context.md**: current active projects, working sets, live state. ex: "working on journal gamification v2", "current sprint: q4 pkm mobile"
**tasks.md**: actionable todos only. use - [ ] format. ex: "- [ ] fix journal reflection timer overflow"
**lessons.md**: hard-learned warnings. ex: "journal exercise tracker breaks on android safari, use css grid instead"
**recent.md**: short session summaries. auto-trimmed to last 50 interactions. promote important items to other files.

## available tools (your hands)
use these http endpoints to read/write memory and pieces context:

```
get /api/ai/memory?type=important     # read specific file
get /api/ai/memory                    # read all memory
post /api/ai/memory {type: "tasks", content: "...", action: "append"}  # append/write
post /api/ai/remember {what: "...", type: "context"}  # quick add
delete /api/ai/memory?type=recent     # clear file
get /api/ai/pieces/status             # pieces mcp health
get /api/ai/pieces/recent?hours=4     # recent pieces activity
```

## multi-agent roles (think in this order)
every response: silently reason through these 4 roles internally before answering.

1. **orchestrator** (you): decide which roles activate. coordinate. final voice.
2. **memory manager**: scan injected memory. what to remember/update? generate api calls if needed.
3. **context retriever**: check pieces recent/relevance. pull nocobase context if mentioned (journal, habits, gamification).
4. **systems architect**: technical analysis only. pkm/nocobase architecture, code suggestions, workflow optimization.

## reasoning workflow (always follow)
1. read injected context: pieces recent + ## bot memory sections
2. memory manager: "does this need remembering? where? generate exact api payload."
3. context retriever: "pieces/nocobase context relevant? summarize key facts."
4. systems architect: "technical implications? nocobase schema changes? code patterns?"
5. orchestrator: casual human response + any api calls (as json objects)

## when to use memory/pieces
- **always** reference specific memory items: "saw that in tasks.md - the journal timer fix"
- **promote** from recent.md: after 3 sessions, move to important/context/tasks/lessons
- **pieces mcp**: treat as external brain. "pieces shows you edited journal.tsx 2h ago"
- **summarize sessions**: end convos with post /api/ai/memory {type: "recent", content: "session summary", action: "append"}

## error handling
- pieces unreachable: "pieces is down, working from memory + what you tell me."
- empty memory: "nothing in memory on that yet. tell me more?"
- stale context: "that context in context.md looks old (2024). update it?"
- conflicting info: "memory says X but pieces says Y. which is current?"

## response format
1. casual lowercase answer (your voice)
2. if needed: json api calls at end
```
[
  {"method": "POST", "url": "/api/ai/memory", "body": {type: "tasks", content: "- [ ] ...", action: "append"}},
  {"method": "GET", "url": "/api/ai/pieces/recent?hours=4"}
]
```
3. never explain the json. just do it.

## pkm integration
- knows nocobase deeply: collections, records api, journal/gamification/activity_log schemas
- suggests exact nocobase curl/api calls or collection changes
- understands pieces os: snippets, context search, recent activity

you are wilson. house's pkm brain. let's build something real.`;

async function resolveOllamaModelSelection() {
  const ollamaUrl = getOllamaUrl();
  try {
    const response = await axios.get(`${ollamaUrl}/api/tags`, { timeout: 15000 });
    const available = (response.data?.models || []).map((m) => (m.model || m.name || '').toString());

    const selectModel = (candidates) => {
      for (const candidate of candidates) {
        if (available.includes(candidate)) return candidate;
      }
      return candidates[0] || null;
    };

    resolvedQwenModel = selectModel(PREFERRED_QWEN_MODELS);
    resolvedVisionModel = selectModel(PREFERRED_VISION_MODELS);

    console.info('[AI] selected qwen model:', resolvedQwenModel);
    console.info('[AI] selected vision model:', resolvedVisionModel);
  } catch (err) {
    console.warn('[AI] could not fetch ollama model list, using defaults', err?.message || err);
    resolvedQwenModel = PREFERRED_QWEN_MODELS[0] || 'qwen2.5-coder:7b-instruct-q4_K_S';
    resolvedVisionModel = PREFERRED_VISION_MODELS[0] || 'moondream:v2';
  }
}

function getOllamaUrl() {
  return process.env.OLLAMA_URL || process.env.OLLAMA_HOST || OLLAMA_DEFAULT_URL;
}

function getQwenModel() {
  return resolvedQwenModel || PREFERRED_QWEN_MODELS[0] || 'qwen2.5-coder:7b-instruct-q4_K_S';
}

function getVisionModel() {
  return resolvedVisionModel || PREFERRED_VISION_MODELS[0] || 'moondream:v2';
}

app.post('/api/ai/chat', async (req, res) => {
const ollamaUrl = getOllamaUrl();
  const { prompt, images, stream = false, includePieces = true, includeMemory = true } = req.body;

  try {
    let finalPrompt = prompt;
    let systemPrompt = AI_PERSONA_PROMPT;
    
    // fetch pieces context (recent activity from last 2 hours)
    if (includePieces) {
      try {
        const piecesContext = await getPiecesRecentActivity(2);
        if (piecesContext && piecesContext.data && piecesContext.data.length > 0) {
          const recentActivities = piecesContext.data
            .slice(-20)
            .map(a => a.content || '')
            .filter(Boolean)
            .join('\n');
          if (recentActivities) {
            systemPrompt += `\n\n## recent activity from pieces os (last 2 hours)\n${recentActivities}\n\nuse this context if relevant to the user's question.`;
          }
        }
      } catch (pcErr) {
        console.log('[AI] pieces context unavailable:', pcErr.message);
      }
    }
    
    // fetch bot memory
    if (includeMemory) {
      try {
        const memoryContext = getAllMemoryContext();
        if (memoryContext) {
          systemPrompt += `\n\n## bot memory\n${memoryContext}\n\nremember relevant info from previous interactions.`;
        }
      } catch (memErr) {
        console.log('[AI] memory context unavailable:', memErr.message);
      }
    }
    
    // vision routing
    if (images && images.length > 0) {
      const visionPayload = {
        model: getVisionModel(),
        prompt: "describe this image factually and concisely.",
        images: images,
        stream: false,
        options: { temperature: 0.2 }
      };
      const visionRes = await axios.post(`${ollamaUrl}/api/generate`, visionPayload, { timeout: 60000 });
      const imageContext = visionRes.data.response.toLowerCase();
      finalPrompt = `image context: ${imageContext}\n\nuser prompt: ${prompt}`;
    }

    const payload = { 
      model: getQwenModel(), 
      prompt: finalPrompt,
      system: systemPrompt,
      stream, 
      format: stream ? undefined : 'json',  // encourage json mode for actions
      options: { temperature: 0.4 } 
    };

    const response = await axios.post(`${ollamaUrl}/api/generate`, payload, {
      responseType: stream ? 'stream' : 'json',
      timeout: 120000,
    });

    // wilson agent loop: parse & execute json actions (non-stream only)
    if (!stream) {
      let fullResponse = response.data.response.toLowerCase();
      
      // record interaction first
      recordInteraction(prompt, fullResponse);
      
      // parse actions
      const actions = parseActionsFromResponse(fullResponse);
      const executionResults = [];
      
      for (const action of actions) {
        const result = await executeAction(action, { prompt, fullResponse });
        executionResults.push(result);
      }
      
      // augment response with execution results
      fullResponse += `\n\nactions executed: ${JSON.stringify(executionResults, null, 2)}`;
      
      response.data.response = fullResponse;
    }

    // wilson agent loop: parse & execute json actions (non-stream only) - moved before duplicate recordInteraction
    if (!stream) {
      let fullResponse = response.data.response.toLowerCase();
      
      // record interaction first
      recordInteraction(prompt, fullResponse);
      
      // parse actions
      const actions = parseActionsFromResponse(fullResponse);
      const executionResults = [];
      
      for (const action of actions) {
        const result = await executeAction(action);
        executionResults.push(result);
      }
      
      // augment response with execution results
      fullResponse += `\n\nactions executed:\n${JSON.stringify(executionResults, null, 2)}`;
      response.data.response = fullResponse;
      
      // inject execution results back to qwen for next reasoning if needed (simple recursion trigger)
      if (executionResults.length > 0) {
        const rePrompt = `actions completed: ${JSON.stringify(executionResults)}. continue reasoning.`;
        const rePayload = {
          model: getQwenModel(),
          prompt: rePrompt,
          system: systemPrompt,
          stream: false,
          options: { temperature: 0.3 }
        };
        const reResponse = await axios.post(`${ollamaUrl}/api/generate`, rePayload, { timeout: 30000 });
        fullResponse += `\n\nfollow-up: ${reResponse.data.response.toLowerCase()}`;
        response.data.response = fullResponse;
      }
    }

    // record interaction in memory (non-blocking)
    if (includeMemory && !stream) {
      try {
        const botResponse = response.data.response || '';
        recordInteraction(prompt, botResponse);
      } catch (recErr) {
        console.log('[AI] could not record interaction:', recErr.message);
      }
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      response.data.on('data', chunk => {
        try {
          const lines = chunk.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              parsed.response = parsed.response.toLowerCase();
            }
            res.write(JSON.stringify(parsed) + '\n');
          }
        } catch (e) {
          res.write(chunk.toString().toLowerCase());
        }
      });
      response.data.on('end', () => res.end());
      response.data.on('error', (err) => {
        console.error('[AI] stream error:', err.message);
        res.end();
      });
    } else {
      res.json({ response: response.data.response.toLowerCase(), model: getQwenModel(), done: true });
    }
  } catch (err) {
    console.error('[AI] ollama request failed:', err.message);
    res.status(502).json({ error: 'ollama unreachable', details: err.message });
  }
});

app.post('/api/ai/describe', requireAuth, async (req, res) => {
const ollamaUrl = getOllamaUrl();
  const { text, imageBase64, fieldName, collectionName } = req.body;

  try {
    let context = text || '';
    if (imageBase64) {
      const visionPayload = {
        model: getVisionModel(),
        prompt: `describe this image concisely for a '${fieldName}' field in the '${collectionName}' collection.`,
        images: [imageBase64],
        stream: false,
        options: { temperature: 0.2 }
      };
      const visionRes = await axios.post(`${ollamaUrl}/api/generate`, visionPayload, { timeout: 60000 });
      context = visionRes.data.response;
    }

    const descPrompt = `generate a concise summary or description for a '${fieldName}' field in a '${collectionName}' collection based on the following context:\n\ncontext: ${context}\n\nreturn only the generated text, nothing else.`;

    const payload = { 
      model: getQwenModel(), 
      prompt: descPrompt,
      system: AI_PERSONA_PROMPT,
      stream: false, 
      options: { temperature: 0.3 } 
    };

    const response = await axios.post(`${ollamaUrl}/api/generate`, payload, { timeout: 120000 });
    res.json({ response: response.data.response.toLowerCase().trim(), done: true });
  } catch (err) {
    console.error('[AI] describe request failed:', err.message);
    res.status(502).json({ error: 'ai description failed', details: err.message });
  }
});

app.post('/api/ai/habits', requireAuth, async (req, res) => {
  const ollamaUrl = getOllamaUrl();
  const { records } = req.body;

  if (!records || !Array.isArray(records)) {
    return res.status(400).json({ error: 'records array required' });
  }

  try {
    const habitPrompt = `analyze the following habit records for patterns, consistency, and progress. return a structured json response with these exactly named keys: "summary", "patterns", and "suggestions". do not use markdown blocks.\n\nrecords: ${JSON.stringify(records)}`;

    const payload = { 
      model: getQwenModel(), 
      prompt: habitPrompt,
      system: AI_PERSONA_PROMPT,
      format: 'json',
      stream: false, 
      options: { temperature: 0.2 } 
    };

    const response = await axios.post(`${ollamaUrl}/api/generate`, payload, { timeout: 120000 });
    
    let structured = { summary: '', patterns: '', suggestions: '' };
    try {
      const rawText = response.data.response;
      // aggressively strip markdown blocks if they still appear
      const cleanText = rawText.replace(/```(?:json)?\s*([\s\S]*?)```/g, '$1').trim();
      const parsed = JSON.parse(cleanText);
      
      const lowercaseStrings = (obj) => {
        if (typeof obj === 'string') return obj.toLowerCase();
        if (Array.isArray(obj)) return obj.map(lowercaseStrings);
        if (obj !== null && typeof obj === 'object') {
          const res = {};
          for (const [k, v] of Object.entries(obj)) res[k] = lowercaseStrings(v);
          return res;
        }
        return obj;
      };

      structured.summary = lowercaseStrings(parsed.summary || '');
      structured.patterns = lowercaseStrings(parsed.patterns || {});
      structured.suggestions = lowercaseStrings(parsed.suggestions || []);
    } catch(e) {
      structured.summary = response.data.response.toLowerCase();
    }
    
    res.json({ response: structured, done: true });
  } catch (err) {
    console.error('[AI] habit analysis failed:', err.message);
    res.status(502).json({ error: 'habit analysis failed', details: err.message });
  }
});

app.get('/api/ai/models', async (req, res) => {
  const ollamaUrl = getOllamaUrl();
  try {
    const response = await axios.get(`${ollamaUrl}/api/tags`);
    res.json({
      selected: {
        qwen: getQwenModel(),
        vision: getVisionModel(),
        ollamaUrl,
      },
      available: response.data,
    });
  } catch (err) {
    res.status(502).json({ error: 'could not reach ollama', details: err.message });
  }
});

// ── bot memory routes ──────────────────────────────────────────
// endpoints for bot to read/write memories (like openclaw)

app.get('/api/ai/memory', async (req, res) => {
  try {
    const { type } = req.query;
    const fileName = type ? `${type}.md` : null;
    
    if (fileName) {
      const content = readMemory(fileName);
      res.json({ type, content });
    } else {
      const allMemory = getAllMemoryContext();
      res.json({ memory: allMemory });
    }
  } catch (err) {
    console.error('[AI] memory read error:', err.message);
    res.status(500).json({ error: 'failed to read memory' });
  }
});

// convenience endpoint to quickly remember something
app.post('/api/ai/remember', async (req, res) => {
  try {
    const { what, type = 'important' } = req.body;
    
    if (!what) {
      return res.status(400).json({ error: 'what to remember is required' });
    }
    
    const success = addMemory(type, what);
    
    if (success) {
      res.json({ success: true, remembered: what });
    } else {
      res.status(500).json({ error: 'failed to remember' });
    }
  } catch (err) {
    console.error('[AI] remember error:', err.message);
    res.status(500).json({ error: 'failed to remember' });
  }
});

app.post('/api/ai/memory', async (req, res) => {
  try {
    const { type, content, action } = req.body;
    
    if (!type || !content) {
      return res.status(400).json({ error: 'type and content required' });
    }
    
    const fileName = `${type}.md`;
    let success = false;
    
    if (action === 'append') {
      success = appendMemory(fileName, content);
    } else {
      success = writeMemory(fileName, content);
    }
    
    if (success) {
      res.json({ success: true, type });
    } else {
      res.status(500).json({ error: 'failed to write memory' });
    }
  } catch (err) {
    console.error('[AI] memory write error:', err.message);
    res.status(500).json({ error: 'failed to write memory' });
  }
});

app.delete('/api/ai/memory', async (req, res) => {
  try {
    const { type } = req.query;
    
    if (!type) {
      return res.status(400).json({ error: 'type required' });
    }
    
    const fileName = `${type}.md`;
    const success = clearMemory(fileName);
    
    if (success) {
      res.json({ success: true, type });
    } else {
      res.status(500).json({ error: 'failed to clear memory' });
    }
  } catch (err) {
    console.error('[AI] memory clear error:', err.message);
    res.status(500).json({ error: 'failed to clear memory' });
  }
});

// ── pieces os mcp status ────────────────────────────────────────

app.get('/api/ai/pieces/status', async (req, res) => {
  try {
    const connected = await isPiecesConnected();
    res.json({ 
      connected, 
      mcpUrl: process.env.PIECES_MCP_URL || 'http://192.168.4.250:39301/model_context_protocol/2025-03-26/mcp'
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

app.get('/api/ai/pieces/recent', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours || '2', 10);
    const context = await getPiecesRecentActivity(hours);
    res.json(context || { error: 'no data available' });
  } catch (err) {
    console.error('[AI] pieces recent error:', err.message);
    res.status(500).json({ error: 'failed to get pieces context' });
  }
});

// ── activity logger routes ────────────────────────────────────

// log activity endpoint
app.post('/api/activities/log', requireAuth, async (req, res) => {
  const { activity_id, activity_name, values, notes } = req.body;
  
  if (!activity_id || !activity_name) {
    return res.status(400).json({ error: 'activity_id and activity_name required' });
  }

  const now = new Date();
  const timestamp = now.toISOString();
  const date = now.toISOString().split('T')[0];

  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    const logPayload = {
      activity_id,
      activity_name,
      timestamp,
      date,
      values: values || {},
      notes: notes || ''
    };

    await client.post('/activity_logs:create', logPayload);

    const streakRes = await client.get(`/streaks:list?filter[activity_id]=${activity_id}`);
    let streak = streakRes.data?.data?.[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (!streak) {
      await client.post('/streaks:create', {
        activity_id,
        activity_name,
        current_streak: 1,
        longest_streak: 1,
        last_log_date: date
      });
      
      res.json({ logged: true, streak: 1, new_record: true });
    } else {
      let newStreak = streak.current_streak;
      
      if (streak.last_log_date === date) {
        res.json({ logged: true, streak: newStreak, already_logged_today: true });
        return;
      } else if (streak.last_log_date === yesterdayStr) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }

      const longestStreak = Math.max(newStreak, streak.longest_streak);

      await client.post(`/streaks:update?filterByTk=${streak.id}`, {
        current_streak: newStreak,
        longest_streak: longestStreak,
        last_log_date: date
      });

      res.json({ 
        logged: true, 
        streak: newStreak, 
        longest: longestStreak,
        streak_increased: newStreak > streak.current_streak
      });
    }
  } catch (err) {
    console.error('[ActivityLog] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to log activity' });
  }
});

// get streaks for all activities
app.get('/api/activities/streaks', requireAuth, async (req, res) => {
  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: { 'Authorization': req.headers.authorization }
    });
    const streakRes = await client.get('/streaks:list?pageSize=100');
    res.json(streakRes.data?.data || []);
  } catch (err) {
    console.error('[ActivityStreaks] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch streaks' });
  }
});

// get activity history
app.get('/api/activities/history', requireAuth, async (req, res) => {
  const { activity_id, days = 30 } = req.query;
  
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let filter = `filter[date][$gte]=${cutoffStr}`;
    if (activity_id) {
      filter += `&filter[activity_id]=${activity_id}`;
    }

    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: { 'Authorization': req.headers.authorization }
    });
    const logsRes = await client.get(`/activity_logs:list?${filter}&sort=-timestamp&pageSize=500`);
    res.json(logsRes.data?.data || []);
  } catch (err) {
    console.error('[ActivityHistory] error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch history' });
  }
});

// ── gamification routes ──────────────────────────────────────

app.post('/api/gamification/award-xp', requireAuth, async (req, res) => {
  const { user_id, amount, source, source_id, description } = req.body;
  
  if (!user_id || !amount) {
    return res.status(400).json({ error: 'user_id and amount required' });
  }

  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    await client.post('/xp_transactions:create', {
      user_id,
      amount,
      source: source || 'manual',
      source_id: source_id || null,
      timestamp: new Date().toISOString(),
      description: description || ''
    });

    const statsRes = await client.get(`/user_stats:list?filter[user_id]=${user_id}`);
    let stats = statsRes.data?.data?.[0];

    if (!stats) {
      const createRes = await client.post('/user_stats:create', {
        user_id,
        total_xp: amount,
        level: 1,
        activities_logged: 0,
        total_streaks: 0,
        unlocked_themes: [],
        unlocked_colors: [],
        last_updated: new Date().toISOString()
      });
      stats = createRes.data?.data;
    } else {
      const newXp = stats.total_xp + amount;
      const newLevel = calculateLevelFromXp(newXp);
      
      await client.post(`/user_stats:update?filterByTk=${stats.id}`, {
        total_xp: newXp,
        level: newLevel,
        last_updated: new Date().toISOString()
      });
      
      stats.total_xp = newXp;
      stats.level = newLevel;
    }

    res.json({ 
      success: true, 
      new_xp: stats.total_xp, 
      level: stats.level,
      level_up: false
    });
  } catch (err) {
    console.error('[Gamification] award xp error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to award xp' });
  }
});

app.get('/api/gamification/stats/:user_id', requireAuth, async (req, res) => {
  const { user_id } = req.params;
  
  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: { 'Authorization': req.headers.authorization }
    });

    const statsRes = await client.get(`/user_stats:list?filter[user_id]=${user_id}`);
    const stats = statsRes.data?.data?.[0];

    if (!stats) {
      return res.json({ 
        total_xp: 0, 
        level: 1, 
        activities_logged: 0,
        unlocked_themes: [],
        unlocked_colors: []
      });
    }

    res.json(stats);
  } catch (err) {
    console.error('[Gamification] get stats error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to fetch stats' });
  }
});

app.post('/api/gamification/unlock-achievement', requireAuth, async (req, res) => {
  const { user_id, achievement_id, achievement_name, xp_reward } = req.body;
  
  if (!user_id || !achievement_id) {
    return res.status(400).json({ error: 'user_id and achievement_id required' });
  }

  try {
    const base = process.env.NOCOBASE_URL || 'https://db.houseofmates.space/api';
    const client = axios.create({
      baseURL: base.replace(/\/$/, ''),
      headers: {
        'Authorization': req.headers.authorization,
        'Content-Type': 'application/json'
      }
    });

    const existingRes = await client.get(
      `/achievements:list?filter[user_id]=${user_id}&filter[achievement_id]=${achievement_id}`
    );
    
    if (existingRes.data?.data?.length > 0) {
      return res.json({ already_unlocked: true });
    }

    await client.post('/achievements:create', {
      user_id,
      achievement_id,
      achievement_name: achievement_name || achievement_id,
      unlocked_at: new Date().toISOString(),
      xp_reward: xp_reward || 0
    });

    if (xp_reward > 0) {
      await client.post('/xp_transactions:create', {
        user_id,
        amount: xp_reward,
        source: 'achievement',
        source_id: null,
        timestamp: new Date().toISOString(),
        description: `achievement: ${achievement_name || achievement_id}`
      });

      const statsRes = await client.get(`/user_stats:list?filter[user_id]=${user_id}`);
      const stats = statsRes.data?.data?.[0];
      if (stats) {
        await client.post(`/user_stats:update?filterByTk=${stats.id}`, {
          total_xp: stats.total_xp + xp_reward,
          last_updated: new Date().toISOString()
        });
      }
    }

    res.json({ unlocked: true, xp_awarded: xp_reward || 0 });
  } catch (err) {
    console.error('[Gamification] unlock achievement error:', err.response?.data || err.message);
    res.status(500).json({ error: 'failed to unlock achievement' });
  }
});

function calculateLevelFromXp(xp) {
  const levels = [
    { level: 1, xp: 0 },
    { level: 2, xp: 100 },
    { level: 3, xp: 250 },
    { level: 4, xp: 500 },
    { level: 5, xp: 1000 },
    { level: 6, xp: 1750 },
    { level: 7, xp: 2500 },
    { level: 8, xp: 3500 },
    { level: 9, xp: 5000 },
    { level: 10, xp: 7500 },
    { level: 11, xp: 10000 },
    { level: 12, xp: 15000 }
  ];
  
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].xp) return levels[i].level;
  }
  return 1;
}
