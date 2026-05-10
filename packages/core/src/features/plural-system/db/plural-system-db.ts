import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { secureLogger } from '@/lib/secure-logger';
import type {
  Member,
  FrontSession,
  Group,
  JournalEntry,
  ChatMessage,
  MemberNote,
  SystemSettings,
  CustomFieldDefinition,
  AppSettings,
} from '../types';

const DB_NAME = 'pkm-plural-system';
const DB_VERSION = 1;

interface PluralSystemSchema extends DBSchema {
  members: {
    key: string;
    value: Member;
    indexes: { 'by-status': string; 'by-name': string };
  };
  frontSessions: {
    key: string;
    value: FrontSession;
    indexes: { 'by-started-at': string; 'by-ended-at': string };
  };
  groups: {
    key: string;
    value: Group;
    indexes: { 'by-name': string };
  };
  journalEntries: {
    key: string;
    value: JournalEntry;
    indexes: { 'by-member': string; 'by-created-at': string };
  };
  chatMessages: {
    key: string;
    value: ChatMessage;
    indexes: { 'by-thread': string; 'by-created-at': string };
  };
  memberNotes: {
    key: string;
    value: MemberNote;
    indexes: { 'by-member': string; 'by-created-at': string };
  };
  systemSettings: {
    key: string;
    value: SystemSettings;
  };
  customFieldDefinitions: {
    key: string;
    value: CustomFieldDefinition;
    indexes: { 'by-sort-order': number };
  };
  appSettings: {
    key: string;
    value: AppSettings;
  };
}

let dbPromise: Promise<IDBPDatabase<PluralSystemSchema>> | null = null;

export function getPluralSystemDB(): Promise<IDBPDatabase<PluralSystemSchema>> {
  if (dbPromise) return dbPromise;

  dbPromise = openDB<PluralSystemSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('members')) {
        const store = db.createObjectStore('members', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-name', 'name');
      }
      if (!db.objectStoreNames.contains('frontSessions')) {
        const store = db.createObjectStore('frontSessions', { keyPath: 'id' });
        store.createIndex('by-started-at', 'startedAt');
        store.createIndex('by-ended-at', 'endedAt');
      }
      if (!db.objectStoreNames.contains('groups')) {
        const store = db.createObjectStore('groups', { keyPath: 'id' });
        store.createIndex('by-name', 'name');
      }
      if (!db.objectStoreNames.contains('journalEntries')) {
        const store = db.createObjectStore('journalEntries', { keyPath: 'id' });
        store.createIndex('by-member', 'memberId');
        store.createIndex('by-created-at', 'createdAt');
      }
      if (!db.objectStoreNames.contains('chatMessages')) {
        const store = db.createObjectStore('chatMessages', { keyPath: 'id' });
        store.createIndex('by-thread', 'threadId');
        store.createIndex('by-created-at', 'createdAt');
      }
      if (!db.objectStoreNames.contains('memberNotes')) {
        const store = db.createObjectStore('memberNotes', { keyPath: 'id' });
        store.createIndex('by-member', 'memberId');
        store.createIndex('by-created-at', 'createdAt');
      }
      if (!db.objectStoreNames.contains('systemSettings')) {
        db.createObjectStore('systemSettings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('customFieldDefinitions')) {
        const store = db.createObjectStore('customFieldDefinitions', { keyPath: 'id' });
        store.createIndex('by-sort-order', 'sortOrder');
      }
      if (!db.objectStoreNames.contains('appSettings')) {
        db.createObjectStore('appSettings', { keyPath: 'key' });
      }
    },
  });

  return dbPromise;
}

// ── members ─────────────────────────────────────────

export async function getAllMembers(): Promise<Member[]> {
  const db = await getPluralSystemDB();
  return db.getAll('members');
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  const db = await getPluralSystemDB();
  return db.get('members', id);
}

export async function saveMember(member: Member): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('members', { ...member, updatedAt: new Date().toISOString() });
}

export async function deleteMember(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('members', id);
  // cascade: remove from groups
  const groups = await getAllGroups();
  for (const g of groups) {
    if (g.memberIds.includes(id)) {
      await saveGroup({ ...g, memberIds: g.memberIds.filter(mid => mid !== id) });
    }
  }
  // cascade: delete notes
  const notes = await getMemberNotes(id);
  for (const n of notes) {
    await deleteMemberNote(n.id);
  }
}

// ── front sessions ──────────────────────────────────

export async function getAllFrontSessions(): Promise<FrontSession[]> {
  const db = await getPluralSystemDB();
  return db.getAll('frontSessions');
}

export async function getActiveFrontSession(): Promise<FrontSession | undefined> {
  const db = await getPluralSystemDB();
  const all = await db.getAll('frontSessions');
  return all.find(s => !s.endedAt);
}

export async function saveFrontSession(session: FrontSession): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('frontSessions', { ...session, updatedAt: new Date().toISOString() });
}

export async function deleteFrontSession(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('frontSessions', id);
}

// ── groups ──────────────────────────────────────────

export async function getAllGroups(): Promise<Group[]> {
  const db = await getPluralSystemDB();
  return db.getAll('groups');
}

export async function saveGroup(group: Group): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('groups', { ...group, updatedAt: new Date().toISOString() });
}

export async function deleteGroup(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('groups', id);
}

// ── journal entries ─────────────────────────────────

export async function getAllJournalEntries(): Promise<JournalEntry[]> {
  const db = await getPluralSystemDB();
  return db.getAll('journalEntries');
}

export async function getJournalEntriesByMember(memberId?: string): Promise<JournalEntry[]> {
  const db = await getPluralSystemDB();
  if (!memberId) {
    const all = await db.getAll('journalEntries');
    return all.filter(e => !e.memberId);
  }
  return db.getAllFromIndex('journalEntries', 'by-member', memberId);
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('journalEntries', { ...entry, updatedAt: new Date().toISOString() });
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('journalEntries', id);
}

// ── chat messages ───────────────────────────────────

export async function getAllChatMessages(): Promise<ChatMessage[]> {
  const db = await getPluralSystemDB();
  return db.getAll('chatMessages');
}

export async function getChatMessagesByThread(threadId?: string): Promise<ChatMessage[]> {
  const db = await getPluralSystemDB();
  if (!threadId) {
    const all = await db.getAll('chatMessages');
    return all.filter(m => !m.threadId);
  }
  return db.getAllFromIndex('chatMessages', 'by-thread', threadId);
}

export async function saveChatMessage(msg: ChatMessage): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('chatMessages', msg);
}

export async function deleteChatMessage(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('chatMessages', id);
}

// ── member notes ────────────────────────────────────

export async function getMemberNotes(memberId: string): Promise<MemberNote[]> {
  const db = await getPluralSystemDB();
  return db.getAllFromIndex('memberNotes', 'by-member', memberId);
}

export async function saveMemberNote(note: MemberNote): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('memberNotes', note);
}

export async function deleteMemberNote(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('memberNotes', id);
}

// ── system settings ─────────────────────────────────

export async function getSystemSettings(): Promise<SystemSettings | undefined> {
  const db = await getPluralSystemDB();
  return db.get('systemSettings', 'default');
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('systemSettings', { ...settings, id: 'default' });
}

// ── custom field definitions ──────────────────────────

export async function getAllCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const db = await getPluralSystemDB();
  return db.getAll('customFieldDefinitions');
}

export async function saveCustomFieldDefinition(def: CustomFieldDefinition): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('customFieldDefinitions', def);
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.delete('customFieldDefinitions', id);
}

// ── app settings ────────────────────────────────────

export async function getAppSetting(key: string): Promise<string | undefined> {
  const db = await getPluralSystemDB();
  const entry = await db.get('appSettings', key);
  return entry?.value;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const db = await getPluralSystemDB();
  await db.put('appSettings', { key, value });
}

// ── import / export / reset ─────────────────────────

export async function exportAllData() {
  const db = await getPluralSystemDB();
  const system = await db.get('systemSettings', 'default');
  const customFieldDefinitions = await db.getAll('customFieldDefinitions');
  const members = await db.getAll('members');
  const frontSessions = await db.getAll('frontSessions');
  const groups = await db.getAll('groups');
  const journalEntries = await db.getAll('journalEntries');
  const chatMessages = await db.getAll('chatMessages');
  const memberNotes = await db.getAll('memberNotes');

  return {
    version: 'pkm-plural-system-v1',
    exportedAt: new Date().toISOString(),
    system,
    customFieldDefinitions,
    members,
    frontSessions,
    groups,
    journalEntries,
    chatMessages,
    memberNotes,
  };
}

export async function importAllData(data: any): Promise<void> {
  const db = await getPluralSystemDB();
  if (!data || typeof data !== 'object') throw new Error('invalid import data');

  // validate version loosely
  const version = data.version || '';
  if (!version.includes('pkm-plural-system')) {
    secureLogger.warn('[import] unknown version:', version);
  }

  const tx = db.transaction([
    'members',
    'frontSessions',
    'groups',
    'journalEntries',
    'chatMessages',
    'memberNotes',
    'systemSettings',
    'customFieldDefinitions',
  ], 'readwrite');

  if (data.system) await tx.objectStore('systemSettings').put(data.system);
  if (Array.isArray(data.customFieldDefinitions)) {
    for (const d of data.customFieldDefinitions) await tx.objectStore('customFieldDefinitions').put(d);
  }
  if (Array.isArray(data.members)) {
    for (const m of data.members) await tx.objectStore('members').put(m);
  }
  if (Array.isArray(data.frontSessions)) {
    for (const s of data.frontSessions) await tx.objectStore('frontSessions').put(s);
  }
  if (Array.isArray(data.groups)) {
    for (const g of data.groups) await tx.objectStore('groups').put(g);
  }
  if (Array.isArray(data.journalEntries)) {
    for (const j of data.journalEntries) await tx.objectStore('journalEntries').put(j);
  }
  if (Array.isArray(data.chatMessages)) {
    for (const c of data.chatMessages) await tx.objectStore('chatMessages').put(c);
  }
  if (Array.isArray(data.memberNotes)) {
    for (const n of data.memberNotes) await tx.objectStore('memberNotes').put(n);
  }

  await tx.done;
}

export async function resetAllData(): Promise<void> {
  const db = await getPluralSystemDB();
  const tx = db.transaction([
    'members',
    'frontSessions',
    'groups',
    'journalEntries',
    'chatMessages',
    'memberNotes',
    'systemSettings',
    'customFieldDefinitions',
  ], 'readwrite');

  await tx.objectStore('members').clear();
  await tx.objectStore('frontSessions').clear();
  await tx.objectStore('groups').clear();
  await tx.objectStore('journalEntries').clear();
  await tx.objectStore('chatMessages').clear();
  await tx.objectStore('memberNotes').clear();
  await tx.objectStore('systemSettings').clear();
  await tx.objectStore('customFieldDefinitions').clear();
  await tx.done;
}
