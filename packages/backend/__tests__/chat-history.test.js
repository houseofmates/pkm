import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadChatHistory, saveChatHistory, addChatEntry, isDuplicateEntry } from '../chat-history.js';
import { existsSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const CHAT_HISTORY_FILE = join(DATA_DIR, 'chat-history.json');

describe('Chat History Persistence', () => {
    beforeEach(() => {
        if (existsSync(CHAT_HISTORY_FILE)) {
            rmSync(CHAT_HISTORY_FILE, { force: true });
        }
        if (existsSync(DATA_DIR)) {
            rmSync(DATA_DIR, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        if (existsSync(CHAT_HISTORY_FILE)) {
            rmSync(CHAT_HISTORY_FILE, { force: true });
        }
        if (existsSync(DATA_DIR)) {
            rmSync(DATA_DIR, { recursive: true, force: true });
        }
    });

    describe('loadChatHistory', () => {
        it('should return empty array when file does not exist', () => {
            const history = loadChatHistory();
            expect(history).toEqual([]);
        });

        it('should return empty array when file is empty', () => {
            mkdirSync(DATA_DIR, { recursive: true });
            writeFileSync(CHAT_HISTORY_FILE, '', 'utf-8');
            const history = loadChatHistory();
            expect(history).toEqual([]);
        });

        it('should return empty array when file is not valid JSON', () => {
            mkdirSync(DATA_DIR, { recursive: true });
            writeFileSync(CHAT_HISTORY_FILE, 'not json', 'utf-8');
            const history = loadChatHistory();
            expect(history).toEqual([]);
        });

        it('should return empty array when file is not an array', () => {
            mkdirSync(DATA_DIR, { recursive: true });
            writeFileSync(CHAT_HISTORY_FILE, '{"key": "value"}', 'utf-8');
            const history = loadChatHistory();
            expect(history).toEqual([]);
        });

        it('should load valid history from file', () => {
            const testData = [
                { type: 'chat', player: 'test', message: 'hello', timestamp: '2026-01-01T00:00:00.000Z' }
            ];
            mkdirSync(DATA_DIR, { recursive: true });
            writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(testData), 'utf-8');
            const history = loadChatHistory();
            expect(history).toEqual(testData);
        });
    });

    describe('saveChatHistory', () => {
        it('should create data directory if it does not exist', () => {
            expect(existsSync(DATA_DIR)).toBe(false);
            saveChatHistory([]);
            expect(existsSync(DATA_DIR)).toBe(true);
        });

        it('should save history to file', () => {
            const testData = [
                { type: 'chat', player: 'test', message: 'hello', timestamp: '2026-01-01T00:00:00.000Z' }
            ];
            saveChatHistory(testData);
            expect(existsSync(CHAT_HISTORY_FILE)).toBe(true);
            const saved = JSON.parse(readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
            expect(saved).toEqual(testData);
        });

        it('should save empty array', () => {
            saveChatHistory([]);
            const saved = JSON.parse(readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
            expect(saved).toEqual([]);
        });
    });

    describe('addChatEntry', () => {
        it('should add entry and persist to file', () => {
            const entry = { type: 'chat', player: 'test', message: 'hello', timestamp: '2026-01-01T00:00:00.000Z' };
            const result = addChatEntry(entry);
            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(entry);
            const saved = JSON.parse(readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
            expect(saved).toEqual([entry]);
        });

        it('should trim history to 50 entries max', () => {
            for (let i = 0; i < 60; i++) {
                addChatEntry({ type: 'chat', player: 'test', message: `msg-${i}`, timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z` });
            }
            const saved = JSON.parse(readFileSync(CHAT_HISTORY_FILE, 'utf-8'));
            expect(saved).toHaveLength(50);
            expect(saved[0].message).toBe('msg-10');
            expect(saved[49].message).toBe('msg-59');
        });

        it('should append to existing history', () => {
            const existing = [{ type: 'chat', player: 'test', message: 'existing', timestamp: '2026-01-01T00:00:00.000Z' }];
            mkdirSync(DATA_DIR, { recursive: true });
            writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(existing), 'utf-8');
            const result = addChatEntry({ type: 'chat', player: 'test', message: 'new', timestamp: '2026-01-01T00:00:01.000Z' });
            expect(result).toHaveLength(2);
            expect(result[1].message).toBe('new');
        });
    });

    describe('isDuplicateEntry', () => {
        it('should return false for empty history', () => {
            expect(isDuplicateEntry('hello', 'chat', [])).toBe(false);
        });

        it('should return false for different message', () => {
            const history = [{ type: 'chat', message: 'hello', timestamp: new Date().toISOString() }];
            expect(isDuplicateEntry('world', 'chat', history)).toBe(false);
        });

        it('should return false for different type', () => {
            const history = [{ type: 'join', message: 'hello', timestamp: new Date().toISOString() }];
            expect(isDuplicateEntry('hello', 'chat', history)).toBe(false);
        });

        it('should return true for duplicate within time window', () => {
            const now = new Date().toISOString();
            const history = [{ type: 'chat', message: 'hello', timestamp: now }];
            expect(isDuplicateEntry('hello', 'chat', history)).toBe(true);
        });

        it('should return false for duplicate outside time window', () => {
            const past = new Date(Date.now() - 60000).toISOString();
            const history = [{ type: 'chat', message: 'hello', timestamp: past }];
            expect(isDuplicateEntry('hello', 'chat', history, 3, 10000)).toBe(false);
        });

        it('should only check recent entries', () => {
            const now = new Date().toISOString();
            const history = [
                { type: 'chat', message: 'old', timestamp: now },
                { type: 'chat', message: 'recent', timestamp: now },
                { type: 'chat', message: 'recent', timestamp: now }
            ];
            expect(isDuplicateEntry('old', 'chat', history, 2, 10000)).toBe(false);
        });
    });
});
