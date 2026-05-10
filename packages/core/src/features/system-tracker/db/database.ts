/* eslint-disable */
import Dexie, { type Table } from 'dexie';
import type {
  SystemInfo,
  SystemMember,
  CustomFieldDefinition,
  FrontSession,
  Group,
  JournalEntry,
  ChatMessage,
  MemberNote,
  DatabaseSchema,
  CURRENT_SCHEMA_VERSION
} from '../types/schema';

export class SystemTrackerDatabase extends Dexie {
  // Tables
  system!: Table<SystemInfo>;
  members!: Table<SystemMember>;
  customFields!: Table<CustomFieldDefinition>;
  frontSessions!: Table<FrontSession>;
  groups!: Table<Group>;
  journalEntries!: Table<JournalEntry>;
  chatMessages!: Table<ChatMessage>;
  memberNotes!: Table<MemberNote>;

  constructor() {
    super('SystemTrackerDB');
    
    this.version(1).stores({
      system: '++id, name, tag, createdAt, updatedAt',
      members: '++id, name, displayName, status, tags, createdAt, updatedAt',
      customFields: '++id, name, type, required, sortOrder',
      frontSessions: '++id, startedAt, endedAt, *entries.memberId',
      groups: '++id, name, color, *memberIds, createdAt, updatedAt',
      journalEntries: '++id, memberId, frontSessionId, *tags, createdAt, updatedAt',
      chatMessages: '++id, memberId, threadId, createdAt, editedAt',
      memberNotes: '++id, memberId, createdAt'
    });
  }

  // Initialize database with default system info
  async initialize(): Promise<void> {
    const systemCount = await this.system.count();
    if (systemCount === 0) {
      const defaultSystem: SystemInfo = {
        id: 'default',
        name: 'my system',
        description: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        settings: {
          theme: 'system',
          autoLock: false,
          showAvatars: true,
          showBanners: true,
          dateFormat: 'relative',
          timeFormat: '12h',
          defaultFrontType: 'primary',
          privacyMode: false,
          exportFormat: 'json',
          autoBackup: false,
          backupInterval: 24
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.system.add(defaultSystem);
    }
  }

  // Get system info
  async getSystem(): Promise<SystemInfo | undefined> {
    return await this.system.toCollection().first();
  }

  // Update system info
  async updateSystem(updates: Partial<SystemInfo>): Promise<void> {
    const system = await this.getSystem();
    if (system) {
      await this.system.update(system.id, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // Member operations
  async getMembers(): Promise<SystemMember[]> {
    return await this.members.orderBy('name').toArray();
  }

  async getMember(id: string): Promise<SystemMember | undefined> {
    return await this.members.get(id);
  }

  async addMember(member: Omit<SystemMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newMember: SystemMember = {
      ...member,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.members.add(newMember);
    return newMember.id;
  }

  async updateMember(id: string, updates: Partial<SystemMember>): Promise<void> {
    await this.members.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteMember(id: string): Promise<void> {
    // Delete related data
    await this.memberNotes.where('memberId').equals(id).delete();
    await this.journalEntries.where('memberId').equals(id).delete();
    
    // Remove member from groups
    const groups = await this.groups.toArray();
    for (const group of groups) {
      const updatedMemberIds = group.memberIds.filter(memberId => memberId !== id);
      if (updatedMemberIds.length !== group.memberIds.length) {
        await this.groups.update(group.id, {
          memberIds: updatedMemberIds,
          updatedAt: new Date().toISOString()
        });
      }
    }

    // Remove from front sessions (this is complex, so we'll keep the sessions but remove the member)
    const sessions = await this.frontSessions.toArray();
    for (const session of sessions) {
      const updatedEntries = session.entries.filter(entry => entry.memberId !== id);
      if (updatedEntries.length !== session.entries.length) {
        await this.frontSessions.update(session.id, {
          entries: updatedEntries
        });
      }
    }

    await this.members.delete(id);
  }

  // Custom field operations
  async getCustomFields(): Promise<CustomFieldDefinition[]> {
    return await this.customFields.orderBy('sortOrder').toArray();
  }

  async addCustomField(field: Omit<CustomFieldDefinition, 'id'>): Promise<string> {
    const newField: CustomFieldDefinition = {
      ...field,
      id: crypto.randomUUID()
    };
    await this.customFields.add(newField);
    return newField.id;
  }

  async updateCustomField(id: string, updates: Partial<CustomFieldDefinition>): Promise<void> {
    await this.customFields.update(id, updates);
  }

  async deleteCustomField(id: string): Promise<void> {
    await this.customFields.delete(id);
  }

  // Front session operations
  async getFrontSessions(limit?: number): Promise<FrontSession[]> {
    let query = this.frontSessions.orderBy('startedAt').reverse();
    if (limit) {
      query = query.limit(limit);
    }
    return await query.toArray();
  }

  async getCurrentFrontSession(): Promise<FrontSession | undefined> {
    return await this.frontSessions.where('endedAt').equals(undefined).first();
  }

  async startFrontSession(entries: Array<{memberId: string; frontType: string; customStatus?: string}>, comment?: string): Promise<string> {
    // End any current session first
    const currentSession = await this.getCurrentFrontSession();
    if (currentSession) {
      await this.endFrontSession(currentSession.id);
    }

    const session: FrontSession = {
      id: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      entries,
      comment
    };
    await this.frontSessions.add(session);
    return session.id;
  }

  async endFrontSession(sessionId?: string): Promise<void> {
    const session = sessionId 
      ? await this.frontSessions.get(sessionId)
      : await this.getCurrentFrontSession();
    
    if (session && !session.endedAt) {
      await this.frontSessions.update(session.id, {
        endedAt: new Date().toISOString()
      });
    }
  }

  async updateFrontSession(id: string, updates: Partial<FrontSession>): Promise<void> {
    await this.frontSessions.update(id, updates);
  }

  async deleteFrontSession(id: string): Promise<void> {
    await this.frontSessions.delete(id);
  }

  // Group operations
  async getGroups(): Promise<Group[]> {
    return await this.groups.orderBy('name').toArray();
  }

  async addGroup(group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newGroup: Group = {
      ...group,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.groups.add(newGroup);
    return newGroup.id;
  }

  async updateGroup(id: string, updates: Partial<Group>): Promise<void> {
    await this.groups.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteGroup(id: string): Promise<void> {
    await this.groups.delete(id);
  }

  // Journal operations
  async getJournalEntries(memberId?: string, limit?: number): Promise<JournalEntry[]> {
    let query = this.journalEntries.orderBy('createdAt').reverse();
    
    if (memberId) {
      query = query.where('memberId').equals(memberId);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query.toArray();
  }

  async addJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const newEntry: JournalEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.journalEntries.add(newEntry);
    return newEntry.id;
  }

  async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<void> {
    await this.journalEntries.update(id, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteJournalEntry(id: string): Promise<void> {
    await this.journalEntries.delete(id);
  }

  // Chat operations
  async getChatMessages(threadId?: string, limit?: number): Promise<ChatMessage[]> {
    let query = this.chatMessages.orderBy('createdAt').reverse();
    
    if (threadId) {
      query = query.where('threadId').equals(threadId);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query.toArray();
  }

  async addChatMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): Promise<string> {
    const newMessage: ChatMessage = {
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    await this.chatMessages.add(newMessage);
    return newMessage.id;
  }

  async updateChatMessage(id: string, updates: Partial<ChatMessage>): Promise<void> {
    await this.chatMessages.update(id, {
      ...updates,
      editedAt: new Date().toISOString()
    });
  }

  async deleteChatMessage(id: string): Promise<void> {
    await this.chatMessages.delete(id);
  }

  // Member notes operations
  async getMemberNotes(memberId: string): Promise<MemberNote[]> {
    return await this.memberNotes
      .where('memberId')
      .equals(memberId)
      .orderBy('createdAt')
      .reverse()
      .toArray();
  }

  async addMemberNote(note: Omit<MemberNote, 'id' | 'createdAt'>): Promise<string> {
    const newNote: MemberNote = {
      ...note,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    await this.memberNotes.add(newNote);
    return newNote.id;
  }

  async deleteMemberNote(id: string): Promise<void> {
    await this.memberNotes.delete(id);
  }

  // Export/Import operations
  async exportAll(): Promise<DatabaseSchema> {
    const [system, members, customFields, frontSessions, groups, journalEntries, chatMessages, memberNotes] = await Promise.all([
      this.getSystem(),
      this.getMembers(),
      this.getCustomFields(),
      this.getFrontSessions(),
      this.getGroups(),
      this.getJournalEntries(),
      this.getChatMessages(),
      this.memberNotes.toArray()
    ]);

    return {
      version: CURRENT_SCHEMA_VERSION,
      system: system!,
      members,
      customFields,
      frontSessions,
      groups,
      journalEntries,
      chatMessages,
      memberNotes
    };
  }

  async importAll(data: DatabaseSchema): Promise<void> {
    // Clear existing data
    await this.transaction('rw', this.tables, async () => {
      await Promise.all(this.tables.map(table => table.clear()));
    });

    // Import new data
    await this.transaction('rw', this.tables, async () => {
      if (data.system) await this.system.add(data.system);
      if (data.members) await this.members.bulkAdd(data.members);
      if (data.customFields) await this.customFields.bulkAdd(data.customFields);
      if (data.frontSessions) await this.frontSessions.bulkAdd(data.frontSessions);
      if (data.groups) await this.groups.bulkAdd(data.groups);
      if (data.journalEntries) await this.journalEntries.bulkAdd(data.journalEntries);
      if (data.chatMessages) await this.chatMessages.bulkAdd(data.chatMessages);
      if (data.memberNotes) await this.memberNotes.bulkAdd(data.memberNotes);
    });
  }

  // Search operations
  async searchMembers(query: string): Promise<SystemMember[]> {
    const lowerQuery = query.toLowerCase();
    return await this.members
      .filter(member => 
        member.name.toLowerCase().includes(lowerQuery) ||
        member.displayName?.toLowerCase().includes(lowerQuery) ||
        member.description?.toLowerCase().includes(lowerQuery) ||
        member.pronouns?.toLowerCase().includes(lowerQuery) ||
        member.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async searchJournal(query: string, memberId?: string): Promise<JournalEntry[]> {
    const lowerQuery = query.toLowerCase();
    let collection = this.journalEntries.toCollection();
    
    if (memberId) {
      collection = collection.where('memberId').equals(memberId);
    }
    
    return await collection
      .filter(entry => 
        entry.content.toLowerCase().includes(lowerQuery) ||
        entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
      .toArray();
  }

  async searchChat(query: string): Promise<ChatMessage[]> {
    const lowerQuery = query.toLowerCase();
    return await this.chatMessages
      .filter(message => message.content.toLowerCase().includes(lowerQuery))
      .toArray();
  }

  // Analytics operations
  async getFrontAnalytics(memberId?: string, startDate?: string, endDate?: string): Promise<any[]> {
    const sessions = await this.frontSessions
      .where('startedAt')
      .between(startDate || '0', endDate || new Date().toISOString())
      .toArray();

    const analytics = new Map<string, any>();
    
    sessions.forEach(session => {
      const duration = session.endedAt 
        ? new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
        : new Date().getTime() - new Date(session.startedAt).getTime();

      session.entries.forEach(entry => {
        if (!memberId || entry.memberId === memberId) {
          const current = analytics.get(entry.memberId) || {
            totalTime: 0,
            sessionCount: 0,
            sessions: []
          };
          
          current.totalTime += duration;
          current.sessionCount += 1;
          current.sessions.push(session);
          
          analytics.set(entry.memberId, current);
        }
      });
    });

    return Array.from(analytics.entries()).map(([memberId, data]) => ({
      memberId,
      ...data,
      averageSessionLength: data.sessionCount > 0 ? data.totalTime / data.sessionCount : 0
    }));
  }
}

// Singleton instance
export const db = new SystemTrackerDatabase();