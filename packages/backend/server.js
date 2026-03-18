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

    const isMockImport = process.env.MOCK_NOTION_IMPORT === 'true';

    // run in background
    (async () => {
        try {
            const ext = path.extname(req.file.originalname || '').toLowerCase();
            if (isMockImport) {
                emitter.emit('progress', `mock ${ext || 'archive'} import started`);
                setTimeout(() => {
                    emitter.emit('progress', 'mock import finished');
                    emitter.emit('done');
                    const current = importTasks.get(taskId);
                    if (current) current.status = 'done';
                }, 5);
                return;
            }
            if (ext === '.csv') {
                function log(msg) {
                    emitter.emit('progress', msg);
                    const current = importTasks.get(taskId);
                    if (current) current.logs.push(msg);
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
    });
}

export { app, importTasks };
