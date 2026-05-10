export type MemberStatus = 'active' | 'dormant' | 'archived' | 'fused';
export type FrontType = 'primary' | 'cofront' | 'coconscious' | 'influence' | 'watching';
export type PrivacyLevel = 'private' | 'trusted' | 'public';
export type CustomFieldType = 'text' | 'number' | 'date' | 'boolean' | 'url';

export interface CustomFieldDefinition {
  id: string;
  name: string;
  type: CustomFieldType;
  required: boolean;
  sortOrder: number;
}

export interface CustomFieldValue {
  definitionId: string;
  value: string | number | boolean;
}

export interface Member {
  id: string;
  name: string;
  displayName?: string;
  pronouns?: string;
  avatarBlob?: Blob;
  bannerBlob?: Blob;
  color: string;
  description?: string;
  birthdate?: string;
  role?: string;
  source?: string;
  species?: string;
  age?: string;
  likes?: string;
  dislikes?: string;
  customFields: CustomFieldValue[];
  status: MemberStatus;
  tags: string[];
  privacyLevel: PrivacyLevel;
  simplyPluralId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FrontSessionEntry {
  memberId: string;
  frontType: FrontType;
  customStatus?: string;
}

export interface FrontSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  entries: FrontSessionEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  description?: string;
  memberIds: string[];
  privacyLevel: PrivacyLevel;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntry {
  id: string;
  memberId?: string;
  content: string;
  frontSessionId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  memberId: string;
  content: string;
  threadId?: string;
  createdAt: string;
  editedAt?: string;
}

export interface MemberNote {
  id: string;
  memberId: string;
  content: string;
  createdAt: string;
}

export interface SystemSettings {
  id: string;
  name: string;
  description?: string;
  avatarBlob?: Blob;
  tag?: string;
  timezone: string;
  defaultPrivacyLevel: PrivacyLevel;
  appLockPinHash?: string;
  theme: 'dark' | 'light' | 'system';
  dyslexiaFont: boolean;
  highContrast: boolean;
  fontScale: number;
  autoBackup: boolean;
  backupIntervalMinutes: number;
}

export interface AppSettings {
  key: string;
  value: string;
}

export interface PluralSystemExport {
  version: string;
  exportedAt: string;
  system: SystemSettings;
  customFieldDefinitions: CustomFieldDefinition[];
  members: Member[];
  frontSessions: FrontSession[];
  groups: Group[];
  journalEntries: JournalEntry[];
  chatMessages: ChatMessage[];
  memberNotes: MemberNote[];
}

export interface FilterState {
  search: string;
  status: MemberStatus | 'all';
  groupId: string | 'all';
  tag: string | 'all';
  sortBy: 'name' | 'lastFronted' | 'frontFrequency' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

export interface DateRange {
  start: string;
  end: string;
}
