import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { type JournalRecord, parseActivities } from '@/schema/journal-collection';
import { secureLogger } from '@/lib/secure-logger';
import type { Activity } from '@/components/ActivitiesPanel';

// simple helpers identical to journal.tsx; mirrors localStorage access used
function getStoredData<T>(key: string, defaultValue: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setStoredData(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// constants that were previously defined in journal.tsx
export const XP_PER_ENTRY = 10;
export const XP_STREAK_BONUS = 5;
export const XP_WORD_GOAL = 5;
export const AUTO_SAVE_INTERVAL = 30000;
export const DRAFT_RESTORE_HOURS = 24;

export const MOODS = [
  { id: '0', label: 'terrible', emoji: '/images/moods/terrible.png', color: '#ef4444', value: 1 },
  { id: '1', label: 'bad', emoji: '/images/moods/bad.png', color: '#f97316', value: 2 },
  { id: '2', label: 'fine', emoji: '/images/moods/fine.png', color: '#eab308', value: 3 },
  { id: '4', label: 'good', emoji: '/images/moods/good.png', color: '#22c55e', value: 4 },
  { id: '5', label: 'great', emoji: '/images/moods/great.png', color: '#06b6d4', value: 5 },
  { id: '6', label: 'amazing!', emoji: '/images/moods/amazing.png', color: '#8b5cf6', value: 6 },
];

// hook handles all journal page state & business logic; the page component simply renders UI
export function useJournalData() {
  // general page state
  const [entries, setEntries] = useState<JournalRecord[]>([]);
  const [editingEntry, setEditingEntry] = useState<JournalRecord | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalRecord | null>(null);
  const [viewingEntry, setViewingEntry] = useState<JournalRecord | null>(null);

  const [bookmarkedEntries, setBookmarkedEntries] = useState<Array<string | number>>(() =>
    getStoredData('pkm:journal:bookmarks', [])
  );
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);

  // past entries filter (search/mood/tag) and NL search results
  const [pastEntriesFilter, setPastEntriesFilter] = useState({ search: '', mood: '', tag: '' });
  const [nlIds, setNlIds] = useState<string[] | null>(null);
  const [isNlSearching, setIsNlSearching] = useState(false);

  // entry metadata
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [entryTime, setEntryTime] = useState<Date | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [voiceMemos, setVoiceMemos] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recognitionRef = useRef<any>(null);

  // transcript/summarize state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSummarizingVoice, setIsSummarizingVoice] = useState(false);
  const [transcriptionSummary, setTranscriptionSummary] = useState('');

  // toastable helpers
  const addEntry = useCallback((entry: JournalRecord) => {
    setEntries(prev => [entry, ...prev]);
  }, []);

  // activity tracking (habit screens)
  type ActivityId = string;
  type MedLogEntry = {
    id: string;
    name: string;
    dose: string;
    quantity: number;
    timestamp: string;
    group: 'morning' | 'afternoon' | 'night';
  };

  const MEDICATION_GROUPS: Record<
    string,
    { group: 'morning' | 'afternoon' | 'night'; meds: Array<{ id: string; name: string; dose: string; quantity: number }> }
  > = {
    meds_morning: {
      group: 'morning',
      meds: [
        { id: 'paxil_30', name: 'paxil', dose: '30mg', quantity: 2 },
        { id: 'wellbutrin_300', name: 'wellbutrin', dose: '300mg', quantity: 1 },
        { id: 'adderall_10', name: 'adderall', dose: '10mg', quantity: 2 },
        { id: 'vitd_250', name: 'vitamin d', dose: '250mcg', quantity: 1 },
        { id: 'vitk_100', name: 'vitamin k', dose: '100mcg', quantity: 1 },
        { id: 'iron_25_morning', name: 'iron bisglycinate', dose: '25mg', quantity: 2 },
      ],
    },
    meds_afternoon: {
      group: 'afternoon',
      meds: [
        { id: 'adderall_10_pm', name: 'adderall', dose: '10mg', quantity: 1 },
        { id: 'aripiprazole_5', name: 'aripiprazole', dose: '5mg', quantity: 1 },
      ],
    },
    meds_night: {
      group: 'night',
      meds: [
        { id: 'iron_25_night', name: 'iron bisglycinate', dose: '25mg', quantity: 2 },
        { id: 'lithium_300', name: 'lithium', dose: '300mg', quantity: 1 },
      ],
    },
  };

  const DEFAULT_ACTIVITIES: Activity[] = [
    { id: 'meds_morning', label: 'morning meds', emoji: '🌞', category: 'medication', color: '#22c55e' },
    { id: 'meds_afternoon', label: 'afternoon meds', emoji: '🌤️', category: 'medication', color: '#f59e0b' },
    { id: 'meds_night', label: 'night meds', emoji: '🌙', category: 'medication', color: '#6366f1' },
    { id: 'take_pills',      label: 'take pills',      emoji: '💊', category: 'health', color: '#f5af12' },
    { id: 'put_patches_on',  label: 'put patches on',  emoji: '🩹', category: 'health', color: '#f5af12' },
    { id: 'water_floss',     label: 'water floss',     emoji: '🚿', category: 'health', color: '#3c9fdd' },
    { id: 'brush_teeth',     label: 'brush teeth',     emoji: '🦷', category: 'health', color: '#3c9fdd' },
    { id: 'wash_face',       label: 'wash face',       emoji: '🧴', category: 'health', color: '#3c9fdd' },
    { id: 'nail_care',       label: 'nail care',       emoji: '💅', category: 'health', color: '#ff00ff' },
    { id: 'body_wipe',       label: 'body wipe',       emoji: '🧻', category: 'health', color: '#ffffff' },
    { id: 'shower',          label: 'shower',          emoji: '🚿', category: 'health', color: '#3c9fdd' },
    { id: 'journal_plan_write', label: 'journal/plan/write', emoji: '📝', category: 'productivity', color: '#32cd32' },
    { id: 'tidy',            label: 'tidy',            emoji: '🧹', category: 'productivity', color: '#ffffff' },
    { id: 'worship',         label: 'worship',         emoji: '🙏', category: 'wellness', color: '#f5af12' },
    { id: 'laundry',         label: 'laundry',         emoji: '👕', category: 'productivity', color: '#ffffff' },
    { id: 'go_outside',      label: 'go outside',      emoji: '🚪', category: 'wellness', color: '#008000' },
    { id: 'leave_house',     label: 'leave house',     emoji: '🏠', category: 'wellness', color: '#32cd32' },
    { id: 'online_social_int', label: 'online social int', emoji: '💬', category: 'social', color: '#f5af12' },
    { id: 'eat_meal',        label: 'eat meal',        emoji: '🍽️', category: 'health', color: '#ff4500' },
    { id: 'draw',            label: 'draw',            emoji: '✏️', category: 'creative', color: '#f5af12' },
    { id: 'vibecode',        label: 'vibecode',        emoji: '💻', category: 'creative', color: '#800080' },
    { id: 'paint',           label: 'paint',           emoji: '🎨', category: 'creative', color: '#ff00ff' },
    { id: 'play_a_game',     label: 'play a game',     emoji: '🎮', category: 'leisure', color: '#008000' },
    { id: 'llm_rp',          label: 'llm rp',          emoji: '🤖', category: 'creative', color: '#ffffff' },
    { id: 'llm_int',         label: 'llm int',         emoji: '💬', category: 'creative', color: '#ffffff' },
    { id: 'watch_content',   label: 'watch content',   emoji: '📺', category: 'leisure', color: '#3c9fdd' },
    { id: 'masturbate',      label: 'masturbate',      emoji: '🍆', category: 'health', color: '#ff00ff' },
    { id: 'nap',             label: 'nap',             emoji: '😴', category: 'health', color: '#f5af12' },
    { id: 'int_w_family',    label: 'int w family',    emoji: '👨‍👩‍👧‍👦', category: 'social', color: '#32cd32' },
    { id: 'remove_patches',  label: 'remove patches',  emoji: '🩹', category: 'health', color: '#ff0000' },
    { id: 'sleep',           label: 'sleep',           emoji: '🛏️', category: 'health', color: '#800080' },
  ];

  const getMedicationLog = (): MedLogEntry[] => getStoredData('medication_log', []);
  const setMedicationLog = (entries: MedLogEntry[]) => setStoredData('medication_log', entries);

  const logMedicationGroup = useCallback((groupId: string) => {
    const info = MEDICATION_GROUPS[groupId];
    if (!info) return;
    const now = new Date().toISOString();
    const existing = getMedicationLog();
    const additions: MedLogEntry[] = info.meds.map(m => ({
      id: m.id,
      name: m.name,
      dose: m.dose,
      quantity: m.quantity,
      timestamp: now,
      group: info.group,
    }));
    setMedicationLog([...existing, ...additions]);
  }, []);

  const [activityHistory, setActivityHistory] = useState<Record<ActivityId, string[]>>( () =>
    getStoredData('journal_activity_history', {})
  );

  const markActivity = useCallback((id: ActivityId) => {
    // if this is a medication group, log each individual med separately
    if (MEDICATION_GROUPS[id]) {
      logMedicationGroup(id);
    }

    setActivityHistory(prev => {
      const now = new Date().toISOString();
      const list = prev[id] ? [...prev[id], now] : [now];
      const nxt = { ...prev, [id]: list };
      setStoredData('journal_activity_history', nxt);
      return nxt;
    });
  }, [logMedicationGroup]);

  const activities = useMemo(() => DEFAULT_ACTIVITIES, []);

  const updateEntry = useCallback((entry: JournalRecord) => {
    setEntries(prev => prev.map(e => (e.date === entry.date ? entry : e)));
  }, []);

  const deleteEntry = useCallback((entry: Pick<JournalRecord, 'date' | 'id'>) => {
    setEntries(prev => prev.filter(e => e.date !== entry.date && (entry.id == null || e.id !== entry.id)));
    if (entry.id != null) {
      setBookmarkedEntries(prev => prev.filter(i => i !== entry.id));
    }
  }, []);

  const toggleBookmark = useCallback((entryId: string | number) => {
    setBookmarkedEntries(prev => {
      const exists = prev.includes(entryId);
      const next = exists ? prev.filter(i => i !== entryId) : [...prev, entryId];
      setStoredData('pkm:journal:bookmarks', next);
      return next;
    });
  }, []);

  // derived map of entries by date
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalRecord> = {};
    entries.forEach(e => { map[e.date] = e; });
    return map;
  }, [entries]);


  return {
    entries,
    setEntries,
    editingEntry,
    setEditingEntry,
    selectedEntry,
    setSelectedEntry,
    viewingEntry,
    setViewingEntry,
    addEntry,
    updateEntry,
    deleteEntry,
    bookmarks: { bookmarkedEntries, toggleBookmark, showBookmarksOnly, setShowBookmarksOnly },
    pastFilter: { pastEntriesFilter, setPastEntriesFilter, nlIds, setNlIds, isNlSearching, setIsNlSearching },
    metadata: { selectedTemplate, setSelectedTemplate, entryTime, setEntryTime, photos, setPhotos, voiceMemos, setVoiceMemos, isRecording, setIsRecording, recordingTime, setRecordingTime },
    transcription: { isTranscribing, setIsTranscribing, transcript, setTranscript, isSummarizingVoice, setIsSummarizingVoice, transcriptionSummary, setTranscriptionSummary, recognitionRef },
    activities: { list: activities, history: activityHistory, mark: markActivity },
    medication: { logGroup: logMedicationGroup, history: getMedicationLog, groups: MEDICATION_GROUPS },
    derived: { entriesByDate },
  };
}
