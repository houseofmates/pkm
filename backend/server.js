// typer: removing ts-node dependency; import JS version of importer script instead

import express from 'express';
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
    const envContent = fs.readFileSync('.env', 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...val] = line.split('=');
        if (key && val) {
            process.env[key.trim()] = val.join('=').trim();
        }
    });
}

const PORT = process.env.PORT || 4100;
const ADMIN_SECRET = process.env.BROADCAST_AUTH_KEY || process.env.ADMIN_SECRET || 'change-me-in-prod';

const app = express();
// create http server from express app for socket.io
const server = http.createServer(app);
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
    const type = payload.type || "generic";
    if (pendingEmits[type]) clearTimeout(pendingEmits[type].timeout);
    pendingEmits[type] = {
        timeout: setTimeout(() => {
            io.emit(event, payload);
            delete pendingEmits[type];
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
            if (a.endsWith('*')) {
                const prefix = a.slice(0, -1);
                if (origin.startsWith(prefix)) {
                    return callback(null, true);
                }
            } else if (origin === a) {
                return callback(null, true);
            }
        }
        callback(null, false);
    },
    methods: ['GET','POST','OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type','Authorization'],
}));

app.use(express.json());
// Serve static files from public directory
app.use('/public', express.static(path.join(process.cwd(), 'public')));

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
        if (!fs.existsSync(uploadDir)){
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
import { run as notionRun } from '../scripts/notion-import.js';
import EventEmitter from 'events';

const importTasks = new Map();

function handleNotionImport(req, res) {
    if (!req.file) {
        return res.status(400).json({ error: 'missing file' });
    }
    const taskId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const emitter = new EventEmitter();
    importTasks.set(taskId, { emitter, status: 'running' });

    // run in background
    (async () => {
        try {
            if (process.env.MOCK_NOTION_IMPORT === 'true') {
                // simulate progress and completion quickly
                emitter.emit('progress', 'mock import started');
                setTimeout(() => {
                    emitter.emit('progress', 'mock import finished');
                    emitter.emit('done');
                    importTasks.set(taskId, { emitter, status: 'done' });
                }, 10);
            } else {
                await notionRun(req.file.path, undefined, (msg) => {
                    emitter.emit('progress', msg);
                });
                emitter.emit('done');
                importTasks.set(taskId, { emitter, status: 'done' });
            }
        } catch (e) {
            emitter.emit('error', String(e));
            importTasks.set(taskId, { emitter, status: 'error' });
        } finally {
            // cleanup uploaded file
            try { fs.unlinkSync(req.file.path); } catch {}
        }
    })();

    res.json({ taskId });
}

// primary endpoint uses shorter name to avoid Cloudflare filtering
app.post('/api/nb-import', requireAuth, importUpload.single('file'), handleNotionImport);
// legacy route still available for local tests
app.post('/api/notion-import', requireAuth, importUpload.single('file'), handleNotionImport);

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
    const webhookUrl = 'http://192.168.4.233:5678/webhook/leave-join';
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
