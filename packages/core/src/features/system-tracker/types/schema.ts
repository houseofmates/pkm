/* eslint-disable */
export interface SystemMember {
  id: string;
  name: string;
  displayName?: string;
  pronouns?: string;
  avatar?: string; // data URL or blob
  banner?: string; // data URL or blob
  color?: string; // hex color
  description?: string; // rich text/markdown
  birthdate?: string; // ISO date, year can be omitted
  role?: string;
  source?: string; // for introjects/fictives
  sourceLink?: string;
  species?: string;
  age?: string; // free text perceived age
  likes?: string[];
  dislikes?: string[];
  customFields: CustomFieldValue[];
  status: MemberStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldValue {
  fieldId: string;
  value: any; // string, number, boolean, date, URL
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  sortOrder: number;
  options?: string[]; // for select/multi-select types
  defaultValue?: any;
  description?: string;
}

export type CustomFieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'date' 
  | 'boolean' 
  | 'url' 
  | 'select' 
  | 'multiselect' 
  | 'color';

export type MemberStatus = 'active' | 'dormant' | 'archived' | 'fused';

export interface FrontSession {
  id: string;
  startedAt: string; // ISO timestamp
  endedAt?: string; // ISO timestamp, null = still active
  entries: FrontEntry[];
  comment?: string;
  customStatus?: string;
}

export interface FrontEntry {
  memberId: string;
  frontType: FrontType;
  customStatus?: string;
}

export type FrontType = 
  | 'primary' 
  | 'cofront' 
  | 'coconscious' 
  | 'influence' 
  | 'watching';

export interface Group {
  id: string;
  name: string;
  color?: string;
  description?: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  memberId?: string; // null = system-wide entry
  content: string; // markdown
  frontSessionId?: string; // auto-associate with current front
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  memberId: string;
  content: string; // markdown
  threadId?: string;
  createdAt: string;
  editedAt?: string;
  reactions?: ChatReaction[];
}

export interface ChatReaction {
  emoji: string;
  memberIds: string[];
}

export interface SystemInfo {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  tag?: string; // short identifier
  timezone: string;
  settings: SystemSettings;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  theme: 'light' | 'dark' | 'system';
  autoLock: boolean;
  lockPinHash?: string; // hashed PIN for app lock
  showAvatars: boolean;
  showBanners: boolean;
  dateFormat: 'relative' | 'absolute';
  timeFormat: '12h' | '24h';
  defaultFrontType: FrontType;
  privacyMode: boolean;
  exportFormat: 'json' | 'csv';
  autoBackup: boolean;
  backupInterval: number; // hours
}

export interface MemberNote {
  id: string;
  memberId: string;
  content: string;
  createdAt: string;
}

export interface FrontAnalytics {
  memberId: string;
  totalTime: number; // milliseconds
  sessionCount: number;
  averageSessionLength: number; // milliseconds
  lastFronted?: string;
  frontPercentage: number; // percentage of total tracked time
}

export interface CalendarHeatmapData {
  date: string; // YYYY-MM-DD
  intensity: number; // 0-5, number of front sessions that day
  memberIds: string[];
}

// Database schema version for migrations
export interface DatabaseSchema {
  version: number;
  system: SystemInfo;
  members: SystemMember[];
  customFields: CustomFieldDefinition[];
  frontSessions: FrontSession[];
  groups: Group[];
  journalEntries: JournalEntry[];
  chatMessages: ChatMessage[];
  memberNotes: MemberNote[];
}

// Current schema version
export const CURRENT_SCHEMA_VERSION = 1;

// Export/import formats
export interface SystemExport {
  version: number;
  exportedAt: string;
  system: SystemInfo;
  members: SystemMember[];
  customFields: CustomFieldDefinition[];
  frontSessions: FrontSession[];
  groups: Group[];
  journalEntries: JournalEntry[];
  chatMessages: ChatMessage[];
  memberNotes: MemberNote[];
}

// Import validation result
export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    members: number;
    frontSessions: number;
    groups: number;
    journalEntries: number;
    chatMessages: number;
  };
}

// Front history filters
export interface FrontHistoryFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  memberIds?: string[];
  groupIds?: string[];
  frontTypes?: FrontType[];
  minDuration?: number; // minutes
}

// Search filters
export interface SearchFilter {
  query?: string;
  memberIds?: string[];
  groupIds?: string[];
  tags?: string[];
  status?: MemberStatus[];
  dateRange?: {
    start: string;
    end: string;
  };
  contentType?: 'members' | 'journal' | 'chat' | 'notes' | 'all';
}

// Privacy levels (for future sharing features)
export type PrivacyLevel = 'public' | 'private' | 'system-only';

export interface PrivacyBucket {
  id: string;
  name: string;
  level: PrivacyLevel;
  color?: string;
  description?: string;
}