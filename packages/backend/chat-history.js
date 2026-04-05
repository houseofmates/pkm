import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, 'data');
const CHAT_HISTORY_FILE = join(DATA_DIR, 'chat-history.json');

const MAX_ENTRIES = 50;

export function loadChatHistory() {
    if (!existsSync(CHAT_HISTORY_FILE)) {
        return [];
    }
    try {
        const raw = readFileSync(CHAT_HISTORY_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error('[ChatHistory] Failed to load history, starting fresh:', err.message);
        return [];
    }
}

export function saveChatHistory(history) {
    try {
        if (!existsSync(DATA_DIR)) {
            mkdirSync(DATA_DIR, { recursive: true });
        }
        writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    } catch (err) {
        console.error('[ChatHistory] Failed to save history:', err.message);
    }
}

export function addChatEntry(entry) {
    const history = loadChatHistory();
    history.push(entry);
    if (history.length > MAX_ENTRIES) {
        history.splice(0, history.length - MAX_ENTRIES);
    }
    saveChatHistory(history);
    return history;
}

export function isDuplicateEntry(message, type, history, recentCount = 3, timeWindowMs = 10000) {
    if (history.length === 0) return false;
    const recent = history.slice(-recentCount);
    const now = new Date().getTime();
    return recent.some(past => {
        const timeDiff = Math.abs(now - new Date(past.timestamp).getTime());
        return past.message === message && past.type === type && timeDiff < timeWindowMs;
    });
}
