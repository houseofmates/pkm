
import { spawn } from 'child_process';
import axios from 'axios';
import fs from 'fs';

// --- configuration ---
const LOG_FILE = '/home/house/Documents/docker/dupemates/data/logs/latest.log';
// direct to backend (bypass n8n to avoid payload corruption)
const N8N_URL = 'http://localhost:4100/api/broadcast';
const AUTH_KEY = process.env.BROADCAST_AUTH_KEY;
// removed blocklist per user request
const BLOCKED_USERS = [];
// de-dup window to prevent double join/leave (ms)
const DEDUPE_WINDOW_MS = 5000;
const lastEventAt = new Map();

console.log(`[LogBridge] Starting Log Tail...`);
console.log(`[LogBridge] Target: ${LOG_FILE}`);
console.log(`[LogBridge] Direct Backend: ${N8N_URL}`);

// helper to send authenticated request to backend
async function sendToBackend(payload) {
    try {
        console.log(`[LogBridge] SENDING: ${JSON.stringify(payload)}`);
        // send flat payload directly to backend
        await axios.post(N8N_URL, payload, {
            headers: {
                'x-api-key': AUTH_KEY,
                'Content-Type': 'application/json'
            }
        });
    } catch (e) {
        console.error(`[LogBridge] Send ERROR: ${e.message}`);
    }
}

// check if file exists
if (!fs.existsSync(LOG_FILE)) {
    console.error(`[LogBridge] ERROR: Log file not found at ${LOG_FILE}`);
    process.exit(1);
}

const tail = spawn('tail', ['-F', '-n', '0', LOG_FILE]);

tail.stdout.on('data', async (data) => {
    const lines = data.toString().split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        // discordsrv chat logic
        if (line.includes('[DiscordSRV] Chat:')) {
            const discordMatch = line.match(/Chat: \[.*?\] (.*?) > (.*)/);
            if (discordMatch) {
                const player = discordMatch[1];
                const message = discordMatch[2];

                if (BLOCKED_USERS.includes(player)) continue;

                await sendToBackend({
                    type: 'chat',
                    player: player,
                    message: message,
                    timestamp: new Date().toISOString(),
                    online: true
                });
            }
        }

        // parsing logic - chat
        if (line.includes('[Async Chat Thread') || (line.includes('<') && line.includes('>'))) {
            const chatMatch = line.match(/<(\w+)>\s+(.*)/);
            if (chatMatch) {
                const player = chatMatch[1];
                const message = chatMatch[2];
                await sendToBackend({
                    type: 'chat',
                    player: player,
                    message: message,
                    timestamp: new Date().toISOString(),
                    online: true
                });
                continue;
            }
        }


        // technical join/leave detection (most reliable, only fires once per session)
        //regex for 1.21: [server thread/info]: playername[/ip] logged in
        //regex for leave: [server thread/info]: playername lost connection: 

        // we use \s* after info]: to capture potential spaces
        const techJoin = line.match(/INFO\]:\s*(\w+)\[.*\] logged in/);
        const chatJoin = line.match(/INFO\]:\s*(\w+) joined the game/); // Faster event
        const techLeave = line.match(/INFO\]:\s*(\w+) lost connection:/);
        const chatLeave = line.match(/INFO\]:\s*(\w+) left the game/); // Faster event

        if (techJoin || chatJoin) {
            const player = techJoin ? techJoin[1] : chatJoin[1];
            console.log(`[LogBridge] MATCHED JOIN (${techJoin ? 'Tech' : 'Chat'}): ${player}`);
            const dedupeKey = `join:${player}`;
            const now = Date.now();
            const last = lastEventAt.get(dedupeKey) || 0;
            if (now - last >= DEDUPE_WINDOW_MS) {
                lastEventAt.set(dedupeKey, now);
                await sendToBackend({
                    type: 'join',
                    player: player,
                    message: `${player} joined the server`,
                    online: true
                });
            } else {
                console.log(`[LogBridge] DEDUPED JOIN: ${player}`);
            }
            continue; // Skip rest of processing for this line
        }

        if (techLeave || chatLeave) {
            const player = techLeave ? techLeave[1] : chatLeave[1];
            console.log(`[LogBridge] MATCHED LEAVE (${techLeave ? 'Tech' : 'Chat'}): ${player}`);
            const dedupeKey = `leave:${player}`;
            const now = Date.now();
            const last = lastEventAt.get(dedupeKey) || 0;
            if (now - last >= DEDUPE_WINDOW_MS) {
                lastEventAt.set(dedupeKey, now);
                await sendToBackend({
                    type: 'leave',
                    player: player,
                    message: `${player} left the server`,
                    online: true
                });
            } else {
                console.log(`[LogBridge] DEDUPED LEAVE: ${player}`);
            }
            continue; // Skip rest of processing for this line
        }
    }
});
