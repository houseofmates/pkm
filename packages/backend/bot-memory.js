// bot memory system - file-based memory similar to openclaw
// stores memories in markdown files that the bot can read/write

import fs from 'fs';
import path from 'path';

const MEMORY_DIR = process.env.PKM_BOT_MEMORY_DIR || './data/bot-memory';

// ensure memory directory exists
function ensureMemoryDir() {
  if (!fs.existsSync(MEMORY_DIR)) {
    fs.mkdirSync(MEMORY_DIR, { recursive: true });
  }
}

// memory file paths
const MEMORY_FILES = {
  important: 'important.md',      // important things to remember
  context: 'context.md',          // current context/state
  tasks: 'tasks.md',              // pending tasks
  lessons: 'lessons.md',          // learned lessons
  recent: 'recent.md',           // recent interactions summary
};

// read a memory file
export function readMemory(fileName) {
  ensureMemoryDir();
  const filePath = path.join(MEMORY_DIR, fileName);
  
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error('[BotMemory] read error:', err.message);
  }
  
  return '';
}

// write to a memory file
export function writeMemory(fileName, content) {
  ensureMemoryDir();
  const filePath = path.join(MEMORY_DIR, fileName);
  
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return true;
  } catch (err) {
    console.error('[BotMemory] write error:', err.message);
    return false;
  }
}

// append to a memory file
export function appendMemory(fileName, content) {
  const existing = readMemory(fileName);
  const separator = existing && !existing.endsWith('\n') ? '\n' : '';
  return writeMemory(fileName, existing + separator + content);
}

// get all memories as context string
export function getAllMemoryContext() {
  const memories = {};
  
  for (const [key, fileName] of Object.entries(MEMORY_FILES)) {
    memories[key] = readMemory(fileName);
  }
  
  // format as context string
  let context = '';
  
  if (memories.important) {
    context += `## important\n${memories.important}\n\n`;
  }
  if (memories.context) {
    context += `## current context\n${memories.context}\n\n`;
  }
  if (memories.tasks) {
    context += `## pending tasks\n${memories.tasks}\n\n`;
  }
  if (memories.lessons) {
    context += `## learned lessons\n${memories.lessons}\n\n`;
  }
  if (memories.recent) {
    context += `## recent interactions\n${memories.recent}\n`;
  }
  
  return context;
}

// add a new memory
export function addMemory(type, content, timestamp = new Date().toISOString()) {
  const entry = `[${timestamp}] ${content}`;
  return appendMemory(MEMORY_FILES[type] || 'important', entry);
}

// clear a memory file
export function clearMemory(fileName) {
  return writeMemory(fileName, '');
}

// get recent memories (last N entries)
export function getRecentMemories(limit = 10) {
  const recent = readMemory(MEMORY_FILES.recent);
  if (!recent) return [];
  
  const lines = recent.split('\n').filter(Boolean);
  return lines.slice(-limit);
}

// update context with current state
export function updateContext(newContext) {
  return writeMemory(MEMORY_FILES.context, newContext);
}

// record an interaction
export function recordInteraction(userMessage, botResponse) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] user: ${userMessage.substring(0, 100)}\nbot: ${botResponse.substring(0, 100)}`;
  
  // keep only last 50 interactions
  const existing = readMemory(MEMORY_FILES.recent);
  const lines = existing ? existing.split('\n').filter(Boolean) : [];
  lines.push(entry);
  
  const trimmed = lines.slice(-50).join('\n');
  return writeMemory(MEMORY_FILES.recent, trimmed);
}

export default {
  readMemory,
  writeMemory,
  appendMemory,
  getAllMemoryContext,
  addMemory,
  clearMemory,
  getRecentMemories,
  updateContext,
  recordInteraction,
  MEMORY_FILES,
};
