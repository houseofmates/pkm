import { loadChatHistory, saveChatHistory, addChatEntry, isDuplicateEntry } from './chat-history.js';
import * as Sentry from '@sentry/node';
import { Integrations } from '@sentry/tracing';

// typer: removing ts-node dependency; import js version of importer script instead

import express from 'express';

// Initialize Sentry for backend error tracking
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Integrations.NodeTracing(),
    ],
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV || 'production',
    release: process.env.APP_VERSION || 'unknown',
    attachStacktrace: true,
  });
}

// guard against unzipper (or other event emitters) emitting 'error' with no
// listener. failing to handle these leads to the whole backend crashing with
// err_unhandled_error. the only error we've seen is "invalid signature" from
// corrupted zips; swallow those and let the import task handle the failure.
process.on('uncaughtException', (err) => {
  if (err && err.code === 'ERR_UNHANDLED_ERROR' &&
    typeof err.context === 'string' &&
    err.context.includes('invalid signature')) {
    console.error('[NotionImport] swallowed unhandled event-emitter error', err.context);
    return;
  }
  console.error('uncaughtException', err);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec, execFile } from 'child_process';
import axios from 'axios';
import ical from 'node-ical';

// pieces mcp and bot memory integration
import { getPiecesRecentActivity, getPiecesContextForQuery, isPiecesConnected } from './pieces-mcp.js';
import { getAllMemoryContext, addMemory, recordInteraction, readMemory, writeMemory, appendMemory, clearMemory } from './bot-memory.js';
import { securityHeaders, additionalSecurityHeaders } from './security-headers.js';

// load environment variables if .env exists
if (fs.existsSync('.env')) {
  // basic dotenv loader since we are in es module and might not have dotenv package installed
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

if (process.env.NODE_ENV === 'production' && !process.env.BROADCAST_AUTH_KEY && !process.env.ADMIN_SECRET) {
  console.error('[Backend] FATAL: BROADCAST_AUTH_KEY or ADMIN_SECRET environment variable must be set in production');
  process.exit(1);
}
const ADMIN_SECRET = process.env.BROADCAST_AUTH_KEY || process.env.ADMIN_SECRET;

const app = express();
// trust reverse proxies (cloudflare/nginx) so req.ip and secure cookies are correct
app.set('trust proxy', 1);
// create http server from express app for socket.io
const server = http.createServer(app);

// serve static assets for mobile and web clients
app.use('/assets', express.static(path.join(process.cwd(), 'dist/assets')));
app.use('/assets', express.static(path.join(process.cwd(), 'public/assets')));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  for (const a of allowedOrigins) {
    if (a === origin) return true;
    if (a.includes('*')) {
      const parts = a.split('*').map(p => p.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&'));
      const regex = new RegExp('^' + parts.join('.*') + '$');
      if (regex.test(origin)) return true;
    }
    if (a.endsWith('*') && origin.startsWith(a.slice(0, -1))) return true;
    if (a.startsWith('*.') && origin.endsWith(a.slice(2))) return true;
  }
  return false;
}

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      callback(null, false);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
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

// cors middleware --------------------------------------------------
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(securityHeaders());
app.use(additionalSecurityHeaders);

app.use(express.json({ limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.REQUEST_BODY_LIMIT || '1mb' }));

// rate limiting middleware --------------------------------------------------
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const RATE_LIMIT_AI_MAX = parseInt(process.env.RATE_LIMIT_AI_MAX || '20', 10);

function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}
const rateLimitCleanupTimer = setInterval(cleanupRateLimitStore, RATE_LIMIT_WINDOW_MS);
if (typeof rateLimitCleanupTimer.unref === 'function') {
  rateLimitCleanupTimer.unref();
}

function rateLimit(maxRequests = RATE_LIMIT_MAX_REQUESTS) {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${clientIp}:${req.path}`;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, startTime: now });
      return next();
    }

    const record = rateLimitStore.get(key);
    if (now - record.startTime > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.set(key, { count: 1, startTime: now });
      return next();
    }

    record.count++;
    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.startTime + RATE_LIMIT_WINDOW_MS - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      console.warn(`[RateLimit] 429 ${req.method} ${req.path} ip=${clientIp}`);
      return res.status(429).json({ error: 'Too many requests', retryAfter });
    }

    next();
  };
}

const rateLimitGeneral = rateLimit(RATE_LIMIT_MAX_REQUESTS);
const rateLimitAi = rateLimit(RATE_LIMIT_AI_MAX);

app.use('/api/ai/', rateLimitAi);
app.use(rateLimitGeneral);

// serve static files for the breathing page
app.use('/breathe', express.static(path.join(process.cwd(), 'public/breathe')));

// serve static files from public directory
app.use('/public', express.static(path.join(process.cwd(), 'public')));

// serve apk files from releases directory (cwd/release)
const apkDir = path.join(process.cwd(), 'releases');
console.log('[APK] serving from:', apkDir);

// apk download endpoint - serves latest apk file in releases directory
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
    const safeFilename = latest.file.replace(/["\\]/g, '');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.sendFile(latestApk);
  } catch (err) {
    console.error('[APK] error serving APK:', err);
    res.status(500).json({ error: 'Failed to serve APK' });
  }
});

// static file serving for direct apk file paths (e.g., /apk/pkm-v1.apk)
// placed after the /apk handler to avoid directory redirects overriding the download endpoint
app.use('/apk', express.static(apkDir, { redirect: false }));

// authentication middleware
const requireAuth = (req, res, next) => {
  if (process.env.NODE_ENV !== 'production' && process.env.MOCK_NOTION_IMPORT === 'true') {
    return next();
  }
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized: Missing Authorization header' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  // check against secret
  if (token === ADMIN_SECRET) {
    return next();
  }

  // also accept a configured nocobase api key if present
  if (process.env.NOCOBASE_API_KEY && token === process.env.NOCOBASE_API_KEY) {
    return next();
  }

  // note: we could eventually validate against nocobase_token in storage,
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10mb limit
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
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.zip', '.csv', '.json', '.md', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip, .csv, .json, .md, or .txt files are allowed'));
    }
  }
});

// multi-csv import endpoint for up to 60 files (from server.ts)
const csvUpload = multer({
  storage, // optionally use diskstorage so files aren't kept in memory
  limits: { files: 60, fileSize: 10 * 1024 * 1024 } // allow up to 10mb total to be safe, though user requested 230kb
});

// state
let lastServerStats = {
  online: false,
  players: 0,
  maxPlayers: 20,
  tps: 20,
  uptime: "Unknown",
  lastUpdated: new Date().toISOString()
};

let chatHistory = loadChatHistory();

// placeholder persistence functions – the original snippet referenced
// `savedata()` but didn't include an implementation.  define a no‑op so the
// call below can be uncommented later without throwing.
function saveData() {
  saveChatHistory(chatHistory);
}
const execPromise = promisify(exec);

// api routes

app.get('/api/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'online',
    version: process.env.APP_VERSION || '0.0.0',
    uptime: Math.floor(process.uptime()),
    clients: io.engine.clientsCount,
    memory: {
      used: Math.round(mem.heapUsed / 1024 / 1024),
      total: Math.round(mem.heapTotal / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

app.get('/api/sidebar-colors', requireAuth, (req, res) => {
  res.json({
    primary: '#f6b012',
    secondary: '#252525',
    accent: '#ef4444',
    background: '#0a0a0a',
    sidebar: { default: '#252525', active: '#f6b012', hover: '#f6b01299' }
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

// auth check endpoint
app.get('/api/whoami', requireAuth, (req, res) => {
  res.json({ role: 'admin', authenticated: true });
});

// protected upload endpoints
app.post('/api/upload/banner', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const fileUrl = `/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// notion import support
// path to shared scripts folder (moves mean backend is nested)
import { run as notionRun, getApiClient } from '../../scripts/notion-import.js';
import EventEmitter from 'events';
import Papa from 'papaparse';
import { systemTrackerRouter } from './system-tracker.js';

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

  // helper for guessing field types from values
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
        // papa.parse is async when using callback, so wrap in promise
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

// primary endpoint for notion import (short name to avoid cloudflare filtering)
app.post('/api/notion-import', requireAuth, importUpload.single('file'), handleNotionImport);

// multi-csv import endpoint for notion databases
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
      // use the authorization header directly from the frontend request to authenticate with nocobase
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
      // cleanup uploaded files
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) { }
      });
    }
  })();

  // return immediately
  return res.json({ taskId, summary: `Scheduled import of ${req.files.length} files` });
}

// alias under /api path since vite proxy rewrites to /api
app.post('/api/nb-import-csv', requireAuth, csvUpload.array('files', 60), handleCsvImport);

// streaming endpoint - still available for backwards compatibility but
// may be unreliable through cloudflare; prefer polling.
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
// we provide multiple flavours because cloudflare waf frequently filters
// urls containing `/notion-import` or long ids. the safest is the query
// variant which is unlikely to trigger rules:
//   get /api/nb-import/logs?id=<taskid>
// path-based routes are kept for backwards compatibility.
// explicit options route so preflight will be answered (particularly
// important when the browser hits the route via cross‑origin). the
// global cors middleware already handles things, but some proxies
// (cloudflare) may return 502 on unknown methods so being explicit
// prevents mysterious failures.
app.options('/api/notion-import/:id/logs', cors());
app.options('/api/nb-import/:id/logs', cors());
app.options('/api/nb-import/logs', cors());

// helper for responding with current logs for a task id. used by both get and
// post handlers so we can share the logic and keep tests simple.
function respondWithLogs(req, res) {
  // id may come from params (get forms) or query (get) or body (post)
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

// get routes (query param preferred for cloudflare compatibility)
app.get(['/api/notion-import/:id/logs', '/api/nb-import/logs', '/api/nb-import/:id/logs'], requireAuth, (req, res) => {
  // explicit `/logs` entry must appear before the parameterized route or it
  // would capture as id='logs'.
  respondWithLogs(req, res);
});

// accept post as an alternative shape that keeps the identifier in the json
// body. post requests tend not to be inspected by cloudflare waf rules as
// aggressively as get query strings, so this is our best bet for avoiding
// mysterious 500 responses in production. the handler is intentionally
// identical to the get version.
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
    res.status(500).json({ error: 'Upload failed' });
  }
});

// dangerous endpoint - restricted access and sanitized
// ideally, this should be removed or strictly controlled.
app.get('/api/players', requireAuth, async (req, res) => {
  try {
    // use environment variable for script path
    const scriptPath = process.env.DUPEMATES_DATA_DIR + '/read_player_data.py';

    // ensure the path exists before running
    if (!fs.existsSync(scriptPath)) {
      // fallback for dev/test environment
      return res.json({ players: [] });
    }

    const execFilePromise = promisify(execFile);
    const { stdout, stderr } = await execFilePromise('python3', [scriptPath]);

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
  // mock data for now
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


// webhook handler (from previous implementation, consolidated)
const sendWebhook = async (type, player, message, timestamp, online) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL || process.env.N8N_LOCAL_WEBHOOK_URL || 'http://localhost:5678/webhook/leave-join';
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

// broadcast endpoint
app.post('/api/broadcast', requireAuth, async (req, res) => {
  const { type, message, online, count, source, uuid } = req.body;

  // validation
  if (!type) {
    return res.status(400).json({ error: 'Missing type' });
  }

  // update stats
  const safeOnline = typeof online === 'boolean' ? online : lastServerStats.online;
  const safeCount = typeof count === 'number' ? count : lastServerStats.players;
  const msgTimestamp = new Date().toISOString();

  // determine player name
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

  // emit to clients
  debounceBroadcast('minecraft_update', emitPayload);

  // update server stats
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

  // deduplication
  const currentGeneratedMsg = (normalizedType === 'chat') ? message : `${finalPlayer} ${normalizedType === 'join' ? 'joined' : 'left'} the game`;
  const isDuplicate = isDuplicateEntry(currentGeneratedMsg, normalizedType, chatHistory);

  if (!isDuplicate) {
    if (normalizedType === 'chat') {
      chatHistory.push({ type: 'chat', player: finalPlayer, message, timestamp: msgTimestamp });
    } else if (['join', 'leave', 'quit'].includes(normalizedType)) {
      const msg = `${finalPlayer} ${normalizedType === 'join' ? 'joined' : 'left'} the game`;
      chatHistory.push({ type: 'system', player: 'system', message: msg, timestamp: msgTimestamp });

      // trigger webhook
      sendWebhook(normalizedType, finalPlayer, msg, msgTimestamp, safeOnline);
    }
  }

  // limit history
  if (chatHistory.length > 50) {
    chatHistory = chatHistory.slice(-50);
  }

  saveData();

  console.log(`[Broadcast] ${type} | Online: ${safeOnline} | Players: ${safeCount} | Msg: ${message || 'none'}`);
  res.json({ status: 'broadcasted' });
});

// proxy endpoint for fetching ics calendar (avoids cors issues)
const ICS_URL = process.env.PROTON_ICS_URL;
app.get('/api/ics-proxy', requireAuth, async (req, res) => {
  if (!ICS_URL) {
    return res.status(503).json({ error: 'ics proxy not configured' });
  }
  try {
    const resp = await axios.get(ICS_URL, {
      responseType: 'text',
      timeout: 20000,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        // mimic a browser request so proton's endpoint accepts it
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
                // node-ical returns date objects for between()
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
    res.status(502).json({ error: 'failed to fetch/parse ics calendar' });
  }
});

const headmatesState = {
  frontingOrder: [],
  membersOrder: [],
  lastUpdated: null,
};

// socket.io
io.on('connection', (socket) => {
  console.log('[Socket] Client connected:', socket.id);

  socket.emit('minecraft_update', {
    type: 'ping',
    online: lastServerStats.online,
    count: lastServerStats.players,
    timestamp: new Date().toISOString()
  });

  if (headmatesState.lastUpdated) {
    socket.emit('headmates_sync', headmatesState);
  }

  socket.on('headmates_update', (data) => {
    headmatesState.frontingOrder = data.frontingOrder || [];
    headmatesState.membersOrder = data.membersOrder || [];
    headmatesState.lastUpdated = new Date().toISOString();
    socket.broadcast.emit('headmates_sync', headmatesState);
  });

  socket.on('headmates_request_sync', () => {
    if (headmatesState.lastUpdated) {
      socket.emit('headmates_sync', headmatesState);
    }
  });

  socket.on('disconnect', (reason) => {
    // quiet disconnect
  });
});


app.use('/api/system', systemTrackerRouter);

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Server running on port ${PORT}`);
    console.log(`[Backend] Protected endpoints enabled`);
    console.log(`[Backend] MOCK_NOTION_IMPORT: ${process.env.MOCK_NOTION_IMPORT}`);

    // resolve preferred ollama models for qwen and vision (non-blocking)
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
const OLLAMA_DEFAULT_URL = process.env.OLLAMA_URL || process.env.OLLAMA_HOST || process.env.OLLAMA_LOCAL_URL || 'http://localhost:11434';

const PREFERRED_QWEN_MODELS = [
  process.env.OLLAMA_QWEN_MODEL,
  process.env.PKM_LLM_MODEL,
  process.env.QWEN_MODEL,
  'gemma4:e4b',
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

const AI_PERSONA_PROMPT = 'you are wilson, a pkm intelligence agent powered by gemma4:e4b. stay in character and keep responses short and lowercase.';

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
  return resolvedQwenModel || PREFERRED_QWEN_MODELS[0] || 'gemma4:e4b';
}

function getVisionModel() {
  // gemma4:e4b supports vision, so we can use it as both llm and vision model
  const visionModel = resolvedVisionModel || PREFERRED_VISION_MODELS[0] || resolvedQwenModel || PREFERRED_QWEN_MODELS[0] || 'gemma4:e4b';
  return visionModel;
}

app.post('/api/ai/chat', requireAuth, async (req, res) => {
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
    res.status(502).json({ error: 'ollama unreachable' });
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
    res.status(502).json({ error: 'ai description failed' });
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
    } catch (e) {
      structured.summary = response.data.response.toLowerCase();
    }

    res.json({ response: structured, done: true });
  } catch (err) {
    console.error('[AI] habit analysis failed:', err.message);
    res.status(502).json({ error: 'habit analysis failed' });
  }
});

app.get('/api/ai/models', requireAuth, async (req, res) => {
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
    res.status(502).json({ error: 'could not reach ollama' });
  }
});

// ── bot memory routes ──────────────────────────────────────────
// endpoints for bot to read/write memories (like openclaw)

app.get('/api/ai/memory', requireAuth, async (req, res) => {
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
app.post('/api/ai/remember', requireAuth, async (req, res) => {
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

app.delete('/api/ai/memory', requireAuth, async (req, res) => {
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

app.get('/api/ai/pieces/status', requireAuth, async (req, res) => {
  try {
    const connected = await isPiecesConnected();
    res.json({
      connected,
      mcpUrl: process.env.PIECES_MCP_URL || process.env.PIECES_MCP_LOCAL_URL || `http://${process.env.OLLAMA_LOCAL_IP || '192.168.4.250'}:39301/model_context_protocol/2025-03-26/mcp`
    });
  } catch (err) {
    res.json({ connected: false, error: err.message });
  }
});

app.get('/api/ai/pieces/recent', requireAuth, async (req, res) => {
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

// broadcast helper for data sync across devices
const broadcastDataUpdate = (dataType, payload) => {
  io.emit('data_update', {
    type: dataType,
    timestamp: new Date().toISOString(),
    ...payload
  });
  console.log(`[DataSync] broadcast ${dataType} update to ${io.engine.clientsCount} clients`);
};

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

    // broadcast data update to all connected clients
    broadcastDataUpdate('activity_logged', {
      activity_id,
      activity_name,
      timestamp,
      source: 'server'
    });

    const streakRes = await client.get(`/streaks:list?filter[activity_id]=${encodeURIComponent(activity_id)}`);
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

    let filter = `filter[date][$gte]=${encodeURIComponent(cutoffStr)}`;
    if (activity_id) {
      filter += `&filter[activity_id]=${encodeURIComponent(activity_id)}`;
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
