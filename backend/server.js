import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import path from 'path';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Adjust to your frontend URL in production
        methods: ["GET", "POST"]
    },
    // Reliability settings
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
    // Allow reconnection
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

app.use(express.json());

// Configure multer for background image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'public');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `bg-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

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

console.log('[Backend] STARTUP VERIFIED - V6 (Global Reliability & Aggressive Deduplication)');
console.log('[Backend] Socket.io configured with:');
console.log('  - Ping Timeout: 60s');
console.log('  - Ping Interval: 25s');
console.log('  - Auto-reconnection enabled');

// Shared secret to verify requests from n8n
const SHARED_SECRET = process.env.BROADCAST_AUTH_KEY || 'your-secret-key-here';

import fs from 'fs';

const DATA_FILE = path.join(process.cwd(), 'server-data.json');

// Initial State (Default)
let chatHistory = [];
let lastServerStats = {
    online: false,
    players: 0,
    maxPlayers: 20,
    tps: 20,
    uptime: "0h",
    lastUpdated: new Date().toISOString()
};

// Load Data from Disk with validation
try {
    if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        const data = JSON.parse(raw);

        // Validate data structure
        if (data && typeof data === 'object') {
            if (Array.isArray(data.chatHistory)) {
                chatHistory = data.chatHistory;
                console.log(`[Backend] Loaded ${chatHistory.length} chat messages`);
            }
            if (data.lastServerStats && typeof data.lastServerStats === 'object') {
                lastServerStats = data.lastServerStats;
                console.log('[Backend] Loaded server stats:', lastServerStats);
            }
        }
    } else {
        console.log('[Backend] No persisted data file found, starting fresh');
    }
} catch (err) {
    console.error('[Backend] Failed to load data file:', err);
    // Try to load backup if main file is corrupted
    const BACKUP_FILE = DATA_FILE + '.backup';
    try {
        if (fs.existsSync(BACKUP_FILE)) {
            console.log('[Backend] Attempting to restore from backup...');
            const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (data.chatHistory) chatHistory = data.chatHistory;
            if (data.lastServerStats) lastServerStats = data.lastServerStats;
            console.log('[Backend] Successfully restored from backup');
        }
    } catch (backupErr) {
        console.error('[Backend] Backup restore also failed:', backupErr);
    }
}

// Save Data Helper with validation and backup
const saveData = () => {
    try {
        // Validate data before saving
        if (!Array.isArray(chatHistory)) {
            console.error('[Backend] Invalid chatHistory, skipping save');
            return;
        }
        if (!lastServerStats || typeof lastServerStats !== 'object') {
            console.error('[Backend] Invalid lastServerStats, skipping save');
            return;
        }

        const dataToSave = { chatHistory, lastServerStats };
        const jsonData = JSON.stringify(dataToSave, null, 2);

        // Create backup of existing file before overwriting
        if (fs.existsSync(DATA_FILE)) {
            const BACKUP_FILE = DATA_FILE + '.backup';
            fs.copyFileSync(DATA_FILE, BACKUP_FILE);
        }

        // Write new data
        fs.writeFileSync(DATA_FILE, jsonData);
        console.log('[Backend] Data saved successfully');
    } catch (err) {
        console.error('[Backend] Failed to save data:', err);
    }
};

/**
 * Broadcast Endpoint
 * n8n hits this endpoint to push new Minecraft data
 */
app.post('/api/broadcast', async (req, res) => {
    const authKey = req.headers['x-api-key'];

    if (authKey !== SHARED_SECRET) {
        console.warn(`[Broadcast] Unauthorized attempt with key: ${authKey?.slice(0, 10)}...`);
        return res.status(403).json({ error: 'Unauthorized broadcast attempt' });
    }

    // DEBUG: Log incoming payload
    console.log('[DEBUG] Incoming Broadcast Payload:', JSON.stringify(req.body, null, 2));

    // Ultra-resilient data extraction
    let payload = req.body;

    // Case 1: JSON-in-a-key (happens when Content-Type is missing and n8n sends raw JSON)
    if (Object.keys(payload).length === 1 && Object.values(payload)[0] === "") {
        const potentialJson = Object.keys(payload)[0];
        if (potentialJson.startsWith('{')) {
            try {
                payload = JSON.parse(potentialJson);
                console.log('[DEBUG] Successfully auto-parsed JSON-in-key payload');
            } catch (e) { }
        }
    }

    // Case 2: Nested 'body' (common in n8n HTTP node responses)
    if (payload.body) {
        if (typeof payload.body === 'string') {
            try { payload = JSON.parse(payload.body); } catch (e) { }
        } else {
            payload = payload.body;
        }
    }

    // Support both flat and nested (n8n) payloads
    let type = payload.type;
    let player = payload.player;
    let message = payload.message;
    let count = payload.count;
    let online = payload.online;
    let timestamp = payload.timestamp;
    let extra = payload.extra;
    let avatar = payload.avatar;
    let source = payload.source;
    let uuid = payload.uuid;
    let displayName = payload.displayName;

    // If missing, try to extract from nested 'body' (n8n webhook style)
    if ((!type || !player || !message) && payload.body) {
        const b = payload.body;
        type = b.type || type;
        player = b.player || b.username || player;
        message = b.message || b.content || message;
        timestamp = b.timestamp || timestamp;
        if (b.count !== undefined) count = b.count;
        if (b.online !== undefined) online = b.online;
        if (b.extra !== undefined) extra = b.extra;
        if (b.avatar !== undefined) avatar = b.avatar;
        if (b.source !== undefined) source = b.source;
        if (b.uuid !== undefined) uuid = b.uuid;
        if (b.displayName !== undefined) displayName = b.displayName;
    }

    // PROTECTION: Filter out spammy/invalid pings (e.g. from n8n monitoring nodes)
    // Only accept pings that match our Skript signature (player: 'system')
    if (type === 'ping' && player !== 'system') {
        // Silently ignore foreign pings to prevent status flapping
        return res.status(200).json({ status: 'ignored' });
    }

    // Resilient Status Mapping
    let safeOnline = lastServerStats.online;
    if (online !== undefined && online !== null) {
        safeOnline = String(online) === 'true' || online === true;
    }

    // PROTECTION: If this is a 'ping' and it says offline, check if we've had recent activity
    const now = Date.now();
    // We'll use a globally shared variable to track the last "Real" event
    global.lastActivityTime = global.lastActivityTime || 0;
    const lastActivityAge = now - global.lastActivityTime;

    if (type === 'ping' && !safeOnline && lastActivityAge < 60000) {
        // console.log(`[Broadcast] IGNORED 'offline' ping (recent activity ${lastActivityAge}ms ago)`);
        safeOnline = true; // Stay online
    }

    // Update activity time for non-ping events
    if (type !== 'ping') {
        global.lastActivityTime = now;
    }

    let safeCount = lastServerStats.players;
    if (count !== undefined && count !== null) {
        safeCount = Number(count);
    } else {
        // Auto-increment/decrement based on event type if count not provided
        if (type === 'join') {
            safeCount++;
        } else if (type === 'leave' || type === 'quit') {
            safeCount = Math.max(0, safeCount - 1);
        }
    }

    // Force 0 if offline
    if (!safeOnline) {
        safeCount = 0;
    }

    // PROTECTION: Confidence Window for Player Count
    // If we've had a join/leave event in the last 90 seconds, trust our internal logic over pings
    // External APIs (like mcapi.us) often cache stats for 60-90s, causing "phantom players".
    const COUNT_LOCK_WINDOW = 90000;
    if (type === 'ping' && lastActivityAge < COUNT_LOCK_WINDOW) {
        // If it's a "ping" (external poll), don't let it override our internal count while active
        safeCount = lastServerStats.players;
    }

    const msgTimestamp = timestamp || new Date().toISOString();

    // SANITIZER: If player is 'system' but message contains a real join/leave, extract the name
    let finalPlayer = player;
    if (player === 'system' && (type === 'join' || type === 'leave' || type === 'quit')) {
        // "HouseOfMates joined the game"
        // Try to grab first word
        if (message) {
            const firstWord = message.split(' ')[0];
            if (firstWord && firstWord !== 'system') {
                console.log(`[Biohazard] FIXED CORRUPTED PLAYER: 'system' -> '${firstWord}'`);
                finalPlayer = firstWord;
            }
        }
    }

    // Fallback: If we still have 'system' for a join/leave, DO NOT SAVE IT as 'system' if possible
    // (But we want to update the vars for the rest of the function)

    // Update local scope player variable
    // We can't reassign const 'player', so we use 'finalPlayer' downstream






    // Always keep history tidy
    const normalizedType = type;

    // PROTECTION: For UI purposes, joins and leaves should ALWAYS be 'system'
    const displayPlayer = (normalizedType === 'join' || normalizedType === 'leave' || normalizedType === 'quit')
        ? 'system'
        : finalPlayer;

    // NORMALIZE PAYLOAD FOR EMISSION
    const emitPayload = {
        type: normalizedType,
        player: displayPlayer, // UI uses this to style system messages
        displayName: displayName || finalPlayer, // Real name for display text
        message: message,
        count: safeCount,
        online: safeOnline,
        timestamp: msgTimestamp,
        extra: extra || {},
        avatar: avatar || null,
        source: source || 'unknown',
        uuid: uuid || null
    };

    if (normalizedType === 'join' || normalizedType === 'leave' || normalizedType === 'quit') {
        const action = normalizedType === 'join' ? 'joined' : 'left';
        emitPayload.message = `${finalPlayer} ${action} the game`;
        emitPayload.type = normalizedType === 'quit' ? 'leave' : normalizedType;
        emitPayload.player = 'system'; // Final safety
    }

    console.log(`[DEBUG] EMITTING LIVE: ${JSON.stringify(emitPayload)}`);
    io.emit('minecraft_update', emitPayload);

    // PERSISTENCE (Done after emit for speed)
    // Update Stats
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

    // AGGRESSIVE DEDUPLICATION: Check last 3 messages for similarity if it's a join/leave
    const isDuplicate = chatHistory.length > 0 && chatHistory.slice(-3).some(past => {
        const timeDiff = Math.abs(now - new Date(past.timestamp).getTime());
        return past.message === currentGeneratedMsg && past.type === normalizedType && timeDiff < 10000;
    });

    if (!isDuplicate) {
        if (normalizedType === 'chat') {
            chatHistory.push({ type: 'chat', player: finalPlayer, message, timestamp: msgTimestamp });
        } else if (normalizedType === 'join') {
            chatHistory.push({ type: 'join', player: 'system', message: `${finalPlayer} joined the game`, timestamp: msgTimestamp });
        } else if (normalizedType === 'quit' || normalizedType === 'leave') {
            chatHistory.push({ type: 'leave', player: 'system', message: `${finalPlayer} left the game`, timestamp: msgTimestamp });
        }

        // Send join/leave event to n8n webhook with flat structure
        if (normalizedType === 'join' || normalizedType === 'leave' || normalizedType === 'quit') {
            try {
                const axios = (await import('axios')).default;
                await axios.post('http://192.168.4.233:5678/webhook/leave-join', {
                    type: normalizedType === 'quit' ? 'leave' : normalizedType,
                    player: finalPlayer,
                    username: finalPlayer,
                    message: normalizedType === 'join' ? `${finalPlayer} joined the game` : `${finalPlayer} left the game`,
                    timestamp: msgTimestamp,
                    processed: true
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log(`[Backend] Forwarded ${normalizedType} event to n8n webhook.`);
            } catch (err) {
                console.error('[Backend] Failed to forward event to n8n webhook:', err);
            }
        }
        // Send join/leave event to n8n webhook with Discord-style structure
        if (normalizedType === 'join' || normalizedType === 'leave' || normalizedType === 'quit') {
            try {
                const axios = (await import('axios')).default;
                await axios.post('http://192.168.4.233:5678/webhook/leave-join', {
                    body: {
                        type: normalizedType === 'quit' ? 'leave' : normalizedType,
                        author: {
                            username: finalPlayer,
                            id: '001',
                            avatar: `https://mc-heads.net/avatar/${finalPlayer}`,
                            bot: false
                        },
                        content: normalizedType === 'join' ? `${finalPlayer} joined the game` : `${finalPlayer} left the game`,
                        timestamp: msgTimestamp,
                        online: safeOnline,
                        webhookUrl: 'http://localhost:5678/webhook-test/discord-status',
                        executionMode: 'test'
                    }
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log(`[Backend] Forwarded ${normalizedType} event to n8n webhook.`);
            } catch (err) {
                console.error('[Backend] Failed to forward event to n8n webhook:', err);
            }
        }
        // Send join/leave event to n8n webhook with correct keys
        if (normalizedType === 'join' || normalizedType === 'leave' || normalizedType === 'quit') {
            try {
                const axios = (await import('axios')).default;
                await axios.post('http://192.168.4.233:5678/webhook/leave-join', {
                    username: finalPlayer,
                    message: normalizedType === 'join' ? `${finalPlayer} joined the game` : `${finalPlayer} left the game`,
                    timestamp: msgTimestamp,
                    type: normalizedType === 'quit' ? 'leave' : normalizedType
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log(`[Backend] Forwarded ${normalizedType} event to n8n webhook.`);
            } catch (err) {
                console.error('[Backend] Failed to forward event to n8n webhook:', err);
            }
        }
    } else {
        console.log(`[Deduper] Ignored duplicate ${normalizedType}: "${currentGeneratedMsg}"`);
        // If it's a duplicate history entry, we still emit the socket event for real-time jitter fix,
        // but we've already done that above. This block just prevents history bloat.
    }

    // Always keep history tidy
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }

    await saveData(); // Ensure this is awaited or handled

    console.log(`[Broadcast] ${type} | Online: ${safeOnline} | Players: ${safeCount} | Msg: ${message || 'none'}`);
    res.status(200).json({ status: 'broadcasted' });
});

// WebSocket connection handling with comprehensive monitoring
io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);
    console.log('[Socket] Total clients:', io.engine.clientsCount);

    // Send current state immediately on connection
    socket.emit('minecraft_update', {
        type: 'ping',
        online: lastServerStats.online,
        count: lastServerStats.players,
        timestamp: new Date().toISOString()
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Client disconnected:', socket.id, 'Reason:', reason);
        console.log('[Socket] Remaining clients:', io.engine.clientsCount);
    });

    socket.on('error', (error) => {
        console.error('[Socket] Socket error for', socket.id, ':', error);
    });

    socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
    });
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', clients: io.engine.clientsCount });
});

app.get('/api/stats', (req, res) => {
    res.json(lastServerStats);
});

app.get('/api/chat', (req, res) => {
    res.json(chatHistory);
});

app.get('/api/players', async (req, res) => {
    try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execPromise = promisify(exec);

        const scriptPath = '/home/house/Documents/docker/dupemates/data/read_player_data.py';
        const { stdout, stderr } = await execPromise(`python3 ${scriptPath}`);

        if (stderr) {
            console.warn('[Player Data] Warning:', stderr);
        }

        const playerData = JSON.parse(stdout);
        res.json(playerData);
    } catch (error) {
        console.error('[Player Data] Error:', error);
        res.status(500).json({ error: 'Failed to read player data', details: error.message });
    }
});

// Background// Banner upload endpoint for journal documents
app.post('/api/upload/banner', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename });
});

// Public document endpoint for sharing
app.get('/api/public/doc/:slug', (req, res) => {
    const { slug } = req.params;

    // TODO: Replace with actual database query
    // For now, return mock data
    const mockDocument = {
        id: slug,
        title: 'Sample Journal Entry',
        content: '<p>This is a public document.</p>',
        banner_image: null,
        color: '#8b5cf6',
        created_at: new Date().toISOString(),
        public: true
    };

    // Check if document is public
    if (!mockDocument.public) {
        return res.status(404).json({ error: 'Document not found or not public' });
    }

    res.json(mockDocument);
});
// Background Image Upload Endpoint
app.post('/api/upload-background', upload.single('file'), (req, res) => {
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

// Serve static files from public directory
app.use('/public', express.static(path.join(process.cwd(), 'public')));

const PORT = process.env.PORT || 4100;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Live Stats Server running on port ${PORT}`);
});
