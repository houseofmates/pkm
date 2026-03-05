import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { JournalRecord, parseActivities } from '@/schema/journal-collection';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ─────────────────────────────────────────────
//  constants
// ─────────────────────────────────────────────

const Y = '#f5af12';
const B = '#3c9fdd';

const MOODS = [
  { id: '0', label: 'terrible', emoji: '😡', img: '/images/moods/terrible.png', color: '#ef4444' },
  { id: '1', label: 'bad',      emoji: '😞', img: '/images/moods/bad.png', color: '#f97316' },
  { id: '2', label: 'fine',     emoji: '😐', img: '/images/moods/fine.png', color: '#eab308' },
  { id: '4', label: 'good',     emoji: '😊', img: '/images/moods/good.png', color: '#22c55e' },
  { id: '5', label: 'great',    emoji: '😃', img: '/images/moods/great.png', color: '#06b6d4' },
  { id: '6', label: 'amazing!', emoji: '😁', img: '/images/moods/amazing.png', color: '#8b5cf6' },
];

const INITIAL_EMOTIONS = [
  'elated','ecstatic','exhilarated','euphoric','horny','inspired','empowered',
  'determined','focused','motivated','playful','ambitious','adventurous',
  'confident','content','peaceful','grateful','connected','relaxed','grounded',
  'nostalgic','sentimental','sleepy','bored','uninterested','dull','distracted',
  'exhausted','unmotivated','sad','depressed','miserable','insecure','lonely',
  'embarrassed','jealous','guilty','frustrated','angry','anxious','overwhelmed'
];

const DEFAULT_ACTIVITIES = [
  { id: 'take_pills',      label: 'take pills',      emoji: '💊' },
  { id: 'put_patches_on',  label: 'put patches on',  emoji: '🩹' },
  { id: 'water_floss',     label: 'water floss',     emoji: '🚿' },
  { id: 'brush_teeth',     label: 'brush teeth',      emoji: '🦷' },
  { id: 'wash_face',       label: 'wash face',       emoji: '🧴' },
  { id: 'nail_care',       label: 'nail care',       emoji: '💅' },
  { id: 'body_wipe',       label: 'body wipe',        emoji: '🧻' },
  { id: 'shower',          label: 'shower',          emoji: '🚿' },
  { id: 'journal_plan_write', label: 'journal/plan/write', emoji: '📝' },
  { id: 'tidy',            label: 'tidy',            emoji: '🧹' },
  { id: 'worship',         label: 'worship',         emoji: '🙏' },
  { id: 'laundry',         label: 'laundry',         emoji: '👕' },
  { id: 'go_outside',      label: 'go outside',      emoji: '🚪' },
  { id: 'leave_house',     label: 'leave house',     emoji: '🏠' },
  { id: 'online_social_int', label: 'online social int', emoji: '💬' },
  { id: 'eat_meal',        label: 'eat meal',         emoji: '🍽️' },
  { id: 'draw',            label: 'draw',            emoji: '✏️' },
  { id: 'vibecode',        label: 'vibecode',         emoji: '💻' },
  { id: 'paint',           label: 'paint',            emoji: '🎨' },
  { id: 'play_a_game',     label: 'play a game',      emoji: '🎮' },
  { id: 'llm_rp',          label: 'llm rp',          emoji: '🤖' },
  { id: 'llm_int',         label: 'llm int',          emoji: '💬' },
  { id: 'watch_content',   label: 'watch content',    emoji: '📺' },
  { id: 'masturbate',      label: 'masturbate',       emoji: '🍆' },
  { id: 'nap',             label: 'nap',              emoji: '😴' },
  { id: 'int_w_family',    label: 'int w family',     emoji: '👨‍👩‍👧‍👦' },
  { id: 'remove_patches',  label: 'remove patches',   emoji: '🩹' },
  { id: 'sleep',           label: 'sleep',            emoji: '🛏️' },
];

const DAILY_PROMPTS = [
  "what's one thing that made you smile today?",
  "what are you grateful for right now?",
  "what's something you learned today?",
  "how would you describe your mood in one word?",
  "what's something you're looking forward to?",
  "what was the hardest part of your day?",
  "what's a small win you had today?",
  "who did you connect with today?",
  "what's something you want to do differently tomorrow?",
  "how did you take care of yourself today?",
  "what's on your mind right now?",
  "what's a challenge you're currently facing?",
  "describe your day in three words.",
  "what's something you're proud of?",
  "what would make tomorrow great?",
  "how are you feeling emotionally right now?",
  "what's a boundary you need to set?",
  "what brought you joy this week?",
  "what's something you need to forgive yourself for?",
  "how did you grow today?",
  "what's a fear you'd like to overcome?",
  "what does your ideal day look like?",
  "what's a habit you want to build?",
  "how can you be kinder to yourself?",
  "what's something you've been putting off?",
  "what does self-care mean to you today?",
  "what's a memory that makes you happy?",
  "how do you want to feel by the end of this week?",
  "what's something beautiful you noticed today?",
  "what's a goal you're working towards?",
];

const QUOTES = [
  { text: "every day is a fresh start.", author: "unknown" },
  { text: "progress, not perfection.", author: "unknown" },
  { text: "you are enough.", author: "unknown" },
  { text: "small steps lead to big changes.", author: "unknown" },
  { text: "your feelings are valid.", author: "unknown" },
  { text: "this too shall pass.", author: "unknown" },
  { text: "you are worthy of good things.", author: "unknown" },
  { text: "be gentle with yourself.", author: "unknown" },
  { text: "you've got this.", author: "unknown" },
  { text: "today is a new opportunity.", author: "unknown" },
  { text: "your journey is unique.", author: "unknown" },
  { text: "rest is productive.", author: "unknown" },
  { text: "you are growing every day.", author: "unknown" },
  { text: "celebrate small wins.", author: "unknown" },
  { text: "you deserve peace.", author: "unknown" },
];

const ACHIEVEMENTS = [
  { id: 'first_entry', name: 'first step', description: 'wrote your first journal entry', icon: '🌱' },
  { id: 'week_streak', name: 'week warrior', description: '7 day journaling streak', icon: '🔥' },
  { id: 'month_streak', name: 'month master', description: '30 day journaling streak', icon: '👑' },
  { id: 'ten_entries', name: 'dedicated', description: 'wrote 10 journal entries', icon: '📖' },
  { id: 'fifty_entries', name: 'committed', description: 'wrote 50 journal entries', icon: '⭐' },
  { id: 'hundred_entries', name: 'veteran', description: 'wrote 100 journal entries', icon: '🏆' },
  { id: 'mood_tracker', name: 'mood master', description: 'logged mood for 7 days straight', icon: '🎭' },
  { id: 'emotion_explorer', name: 'emotion explorer', description: 'used 10 different emotions', icon: '🎨' },
  { id: 'activity_pro', name: 'activity pro', description: 'completed 20 activities in one day', icon: '⚡' },
  { id: 'word_warrior', name: 'word warrior', description: 'wrote 500 words in one entry', icon: '✍️' },
  { id: 'level_5', name: 'rising star', description: 'reached level 5', icon: '🌟' },
  { id: 'level_10', name: 'dedicated journaler', description: 'reached level 10', icon: '💫' },
  { id: 'perfect_week', name: 'perfect week', description: 'journaled every day for a week', icon: '💎' },
  { id: 'goal_crusher', name: 'goal crusher', description: 'completed 10 daily goals', icon: '🎯' },
  { id: 'tag_master', name: 'tag master', description: 'used 20 different tags', icon: '🏷️' },
];

const COLOR_PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
];

const DEFAULT_EMOTION_COLORS: Record<string, string> = {};
const DEFAULT_ACTIVITY_COLORS: Record<string, string> = {};

INITIAL_EMOTIONS.forEach((e, i) => {
  DEFAULT_EMOTION_COLORS[e] = COLOR_PALETTE[i % COLOR_PALETTE.length];
});
DEFAULT_ACTIVITIES.forEach((a, i) => {
  DEFAULT_ACTIVITY_COLORS[a.id] = COLOR_PALETTE[i % COLOR_PALETTE.length];
});

const STORAGE_KEYS = {
  EMOTION_COLORS: 'pkm:journal:emotion_colors',
  ACTIVITY_COLORS: 'pkm:journal:activity_colors',
  STREAK_DATA: 'pkm:journal:streak_data',
  ENTRY_COUNT: 'pkm:journal:entry_count',
  ACHIEVEMENTS: 'pkm:journal:achievements',
  CUSTOM_EMOTIONS: 'pkm:journal:custom_emotions',
  COLOR_DOTS: 'pkm:journal:color_dots',
  XP_DATA: 'pkm:journal:xp_data',
  DAILY_GOALS: 'pkm:journal:daily_goals',
  TAGS: 'pkm:journal:tags',
  PAST_ENTRIES: 'pkm:journal:past_entries',
  BREATHING_HISTORY: 'pkm:journal:breathing_history',
};

// ─────────────────────────────────────────────
//  helpers
// ─────────────────────────────────────────────

function getStoredData<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStoredData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('failed to save to localStorage:', e);
  }
}

function getToday(): string {
  return new Date().toLocaleDateString('en-CA');
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ─────────────────────────────────────────────
//  main journal page component
// ─────────────────────────────────────────────

export function JournalPage() {
  // ── state: mood & emotions ──
  const [mood, setMood] = useState<string | null>(null);
  const [emotions, setEmotions] = useState<Set<string>>(new Set());
  const [emotionQuery, setEmotionQuery] = useState('');
  const [availableEmotions, setAvailableEmotions] = useState<string[]>(INITIAL_EMOTIONS.slice());

  // ── state: activities ──
  const [activities, setActivities] = useState<Set<string>>(new Set());
  const [activityQuery, setActivityQuery] = useState('');
  const [availableActivities] = useState(DEFAULT_ACTIVITIES);
  
  // ── state: notes ──
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  
  // ── state: gamification ──
  const [streak, setStreak] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [todayPrompt] = useState(() => DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
  const [todayQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [quickMood, setQuickMood] = useState<string | null>(null);
  
  // ── state: color customization ──
  const [emotionColors, setEmotionColors] = useState<Record<string, string>>(() =>
    getStoredData(STORAGE_KEYS.EMOTION_COLORS, DEFAULT_EMOTION_COLORS)
  );
  const [activityColors, setActivityColors] = useState<Record<string, string>>(() =>
    getStoredData(STORAGE_KEYS.ACTIVITY_COLORS, DEFAULT_ACTIVITY_COLORS)
  );
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerTarget, setColorPickerTarget] = useState<{type: 'emotion' | 'activity'; id: string} | null>(null);
  const [currentPickerColor, setCurrentPickerColor] = useState('#ffffff');
  const [colorDots, setColorDots] = useState<string[]>(() =>
    getStoredData(STORAGE_KEYS.COLOR_DOTS, COLOR_PALETTE.slice(0, 10))
  );
  const [activeDotIndex, setActiveDotIndex] = useState<number | null>(null);
  
  // ── state: view toggles ──
  const [showQuickCheckin, setShowQuickCheckin] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // ── refs ──
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // ── entries & editing ──
  const [entries, setEntries] = useState<JournalRecord[]>([]);
  const [editingEntry, setEditingEntry] = useState<JournalRecord | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalRecord | null>(null);

  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalRecord> = {};
    entries.forEach(e => { map[e.date] = e; });
    return map;
  }, [entries]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const numDays = new Date(year, month + 1, 0).getDate();
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
    for (let i = 0; i < startWeekday; i++) days.push({ date: '', day: 0, isCurrentMonth: false });
    for (let d = 1; d <= numDays; d++) {
      const dd = new Date(year, month, d);
      days.push({ date: dd.toISOString().slice(0, 10), day: d, isCurrentMonth: true });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d.toISOString().slice(0, 10), day: i, isCurrentMonth: false });
    }
    return days;
  }, [currentMonth]);

  const loadEntries = useCallback(async () => {
    try {
      const res: any = await api.listRecords('journal', { params: { sort: '-date', pageSize: 1000 } });
      setEntries(res?.data || []);
    } catch (e) {
      console.error('failed to load journal entries', e);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const saveEmotionColors = useCallback((colors: Record<string, string>) => {
    setEmotionColors(colors);
    setStoredData(STORAGE_KEYS.EMOTION_COLORS, colors);
  }, []);
  const saveActivityColors = useCallback((colors: Record<string, string>) => {
    setActivityColors(colors);
    setStoredData(STORAGE_KEYS.ACTIVITY_COLORS, colors);
  }, []);

  const toggleEmotion = (id: string) => {
    setEmotions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleActivity = (id: string) => {
    setActivities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openColorPicker = (type: 'emotion' | 'activity', id: string) => {
    setColorPickerTarget({ type, id });
    const colors = type === 'emotion' ? emotionColors : activityColors;
    setCurrentPickerColor(colors[id] || '#3b82f6');
    setColorPickerOpen(true);
    setActiveDotIndex(null);
  };
  const handleColorSelect = (color: string) => {
    if (!colorPickerTarget) return;
    if (colorPickerTarget.type === 'emotion') {
      const newColors = { ...emotionColors, [colorPickerTarget.id]: color };
      saveEmotionColors(newColors);
    } else {
      const newColors = { ...activityColors, [colorPickerTarget.id]: color };
      saveActivityColors(newColors);
    }
  };
  const handleSaveDot = (index: number, color: string) => {
    setActiveDotIndex(index);
    const newDots = [...colorDots];
    newDots[index] = currentPickerColor;
    setColorDots(newDots);
    setStoredData(STORAGE_KEYS.COLOR_DOTS, newDots);
  };
  const handleContextMenu = (e: React.MouseEvent, type: 'emotion' | 'activity', id: string) => {
    e.preventDefault();
    openColorPicker(type, id);
  };
  const handleLongPress = useCallback((type: 'emotion' | 'activity', id: string) => {
    openColorPicker(type, id);
  }, []);

  const populateForm = (entry: JournalRecord) => {
    setMood(entry.mood);
    setEmotions(new Set(JSON.parse(entry.emotions || '[]')));
    setActivities(new Set(parseActivities(entry.activities)));
    setBody(entry.body || '');
    setQuickMood(entry.mood || null);
    setEditingEntry(entry);
  };

  const handleDeleteEntry = async (entry: JournalRecord) => {
    if (!entry.id) return;
    try {
      await api.request('journal', 'destroy', { filterByTk: entry.id });
      toast.success('entry deleted');
      setSelectedEntry(null);
      loadEntries();
    } catch (err: any) {
      toast.error('delete failed');
    }
  };

  const handleExport = async () => {
    try {
      const res: any = await api.listRecords('journal', { params: { sort: '-date', pageSize: 1000 } });
      const recs: JournalRecord[] = res?.data || [];
      const lines = ['date,mood,emotions,activities,body,timestamp'];
      recs.forEach(r => {
        const emos = JSON.parse((r as any).emotions || '[]') as string[];
        const acts = parseActivities(r.activities);
        const row = [r.date, r.mood || '', emos.join(';'), acts.join(';'), (r.body || '').replace(/"/g,'""'), r.timestamp].map(v => `"${v}"`).join(',');
        lines.push(row);
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-export-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('export failed');
    }
  };

  const handleSave = async () => {
    if (!mood && activities.size === 0 && !body.trim()) {
      toast.error('nothing to save yet');
      return;
    }
    setSaving(true);
    const payload: any = {
      mood: mood ?? undefined,
      emotions: JSON.stringify(Array.from(emotions)),
      activities: JSON.stringify(Array.from(activities)),
      body: body.trim(),
      timestamp: new Date().toISOString(),
      date: editingEntry?.date || new Date().toLocaleDateString('en-CA'),
    };
    try {
      if (editingEntry?.id) {
        await api.request('journal', 'update', { filterByTk: editingEntry.id, ...payload });
        toast.success('entry updated ✓');
      } else {
        await api.createRecord('journal', payload);
        toast.success('entry saved ✓');
      }
      loadEntries();
      const today = getToday();
      const streakData = getStoredData(STORAGE_KEYS.STREAK_DATA, { current: 0, lastDate: '' });
      let newStreak = streakData.current;
      if (streakData.lastDate !== today) {
        newStreak = streakData.lastDate === getYesterday() ? streakData.current + 1 : 1;
        setStoredData(STORAGE_KEYS.STREAK_DATA, { current: newStreak, lastDate: today });
        setStreak(newStreak);
      }
      const newCount = entryCount + 1;
      setEntryCount(newCount);
      setStoredData(STORAGE_KEYS.ENTRY_COUNT, newCount);
      setMood(null);
      setEmotions(new Set());
      setActivities(new Set());
      setBody('');
      setQuickMood(null);
      setEditingEntry(null);
    } catch (err: any) {
      toast.error('failed to save: ' + (err?.message ?? 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleQuickMood = (moodId: string) => {
    if (quickMood === moodId) {
      setQuickMood(null);
    } else {
      setQuickMood(moodId);
      setMood(moodId);
    }
  };

  const handleAddEmotion = () => {
    if (emotionQuery.trim()) {
      const val = emotionQuery.trim().toLowerCase();
      if (!availableEmotions.includes(val)) {
        setAvailableEmotions(prev => [...prev, val]);
        const customEmojis = getStoredData(STORAGE_KEYS.CUSTOM_EMOTIONS, [] as string[]);
        if (!customEmojis.includes(val)) {
          setStoredData(STORAGE_KEYS.CUSTOM_EMOTIONS, [...customEmojis, val]);
        }
        const newColors = { ...emotionColors, [val]: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] };
        saveEmotionColors(newColors);
      }
      toggleEmotion(val);
      setEmotionQuery('');
    }
  };

  const renderMoodButton = (m: typeof MOODS[0], isQuick = false) => {
    const active = (isQuick ? quickMood : mood) === m.id;
    const size = isQuick ? 'w-10 h-10' : 'w-14 h-14';
    return (
      <button
        key={m.id}
        onClick={() => isQuick ? handleQuickMood(m.id) : setMood(active ? null : m.id)}
        className={`${size} rounded-full transition-all duration-150 flex items-center justify-center text-2xl`}
        style={{
          background: active ? `${emotionColors[m.label] || B}33` : '#000000',
          border: `2px solid ${active ? (emotionColors[m.label] || B) : 'rgba(255,255,255,0.08)'}`,
          boxShadow: active ? `0 0 12px ${emotionColors[m.label] || B}66` : 'none',
        }}
      >
        {m.emoji}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white font-varela p-4 pb-24 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 lowercase">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-2xl font-bold lowercase tracking-tight">journal</h1>
        </div>
        <div className="flex items-center gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-sm">🔥</span>
              <span className="text-xs text-yellow-400">{streak}</span>
            </div>
          )}
          <button onClick={() => setShowAchievements(v => !v)} className="text-lg hover:scale-110 transition-transform" title="achievements">🏆</button>
          <button onClick={() => setShowCalendar(v => !v)} className="text-lg hover:scale-110 transition-transform" title="calendar">📅</button>
          <button onClick={handleExport} className="text-lg hover:scale-110 transition-transform" title="export">📁</button>
          <button onClick={() => setShowStats(v => !v)} className="text-lg hover:scale-110 transition-transform" title="stats">📊</button>
          <button onClick={() => setShowQuickCheckin(v => !v)} className="text-sm px-3 py-1 rounded-full border border-white/10 text-white/60 hover:border-white/30 lowercase">quick check-in</button>
        </div>
      </div>

      {/* quote */}
      <div className="text-center py-2 border-y border-white/5">
        <p className="text-sm italic text-white/40 lowercase">"{todayQuote.text}"</p>
        {todayQuote.author !== 'unknown' && (
          <p className="text-xs text-white/20 mt-0.5 lowercase">— {todayQuote.author}</p>
        )}
      </div>

      {/* calendar view */}
      {showCalendar && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex justify-between items-center mb-2">
            <button onClick={()=>setCurrentMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>‹</button>
            <span className="text-sm font-medium lowercase">{currentMonth.toLocaleString('default',{month:'long',year:'numeric'})}</span>
            <button onClick={()=>setCurrentMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-white/40 uppercase lowercase">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=> <div key={d} className="text-center">{d}</div>)}
            {calendarDays.map((day,i)=>(
              <div key={i} className="h-10 w-10 flex items-center justify-center cursor-pointer rounded hover:bg-white/10" onClick={()=>{ if(day.date) setSelectedEntry(entriesByDate[day.date]||null); }}>
                {day.day>0 && (
                  entriesByDate[day.date]
                    ? MOODS.find(m=>m.id===entriesByDate[day.date].mood)?.emoji
                    : day.day
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* quick check-in */}
      {showQuickCheckin && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-xs text-white/40 lowercase mb-3">quick mood check-in</p>
          <div className="flex gap-3 justify-center">
            {MOODS.map(m=>renderMoodButton(m,true))}
          </div>
          {quickMood && (
            <p className="text-center text-xs text-white/40 mt-2 lowercase">
              feeling {MOODS.find(m=>m.id===quickMood)?.label}
            </p>
          )}
        </div>
      )}

      {/* daily prompt */}
      <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-center">
        <p className="text-xs text-white/30 lowercase mb-1">today's prompt</p>
        <p className="text-sm text-white/70 lowercase italic">{todayPrompt}</p>
      </div>

      {/* mood section */}
      <section className="flex flex-col gap-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">mood</p>
        <div className="flex gap-4 flex-wrap justify-center">
          {MOODS.map(m=>renderMoodButton(m))}
        </div>
        {mood && (
          <p className="text-center text-xs text-white/40 lowercase">
            feeling {MOODS.find(m=>m.id===mood)?.label}
          </p>
        )}
      </section>

      {/* emotions section */}
      <section className="flex flex-col gap-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">emotions</p>
        <div className="flex items-center gap-2">
          <input type="text" value={emotionQuery} onChange={e=>setEmotionQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleAddEmotion();}} placeholder="search or add emotion…" className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/30 lowercase" />
          {emotionQuery && (<button onClick={handleAddEmotion} className="text-xs px-2 py-1 rounded-lg border border-white/20 text-white/60 hover:border-white/40 lowercase">add</button>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {availableEmotions.filter(e=>!emotionQuery||e.includes(emotionQuery.toLowerCase())).map(e=>{
            const active=emotions.has(e);
            const color=emotionColors[e]||B;
            return (<button key={e} onClick={()=>toggleEmotion(e)} onContextMenu={ev=>handleContextMenu(ev,'emotion',e)} className={cn('px-3 py-2 rounded-full text-base font-medium lowercase transition-all duration-150 text-white',active?'opacity-100':'opacity-50 hover:opacity-80')} style={{background:active?`${color}33`:'#000',border:`2px solid ${active?color:'rgba(255,255,255,0.08)'}`,boxShadow:active?`0 0 10px ${color}55`:'none'}}>{e}</button>);
          })}
        </div>
        {emotions.size>0&&(<p className="text-xs text-white/30 lowercase">{emotions.size} selected</p>)}
      </section>

      {/* activities section */}
      <section className="flex flex-col gap-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">activities</p>
        <div className="flex items-center gap-2">
          <input type="text" value={activityQuery} onChange={e=>setActivityQuery(e.target.value)} placeholder="search activities…" className="flex-1 bg-transparent border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-white/30 lowercase" />
        </div>
        <div className="flex flex-wrap gap-2">
          {availableActivities.filter(a=>!activityQuery||a.label.includes(activityQuery.toLowerCase())||a.id.includes(activityQuery.toLowerCase())).map(a=>{
            const active=activities.has(a.id);
            const color=activityColors[a.id]||B;
            return (<button key={a.id} onClick={()=>toggleActivity(a.id)} onContextMenu={ev=>handleContextMenu(ev,'activity',a.id)} className={cn('px-3 py-2 rounded-full text-sm font-medium lowercase transition-all duration-150 text-white flex items-center gap-1.5',active?'opacity-100':'opacity-50 hover:opacity-80')} style={{background:active?`${color}33`:'#000',border:`2px solid ${active?color:'rgba(255,255,255,0.08)'}`,boxShadow:active?`0 0 10px ${color}55`:'none'}}><span>{a.emoji}</span><span>{a.label}</span></button>);
          })}
        </div>
        {activities.size>0&&(<p className="text-xs text-white/30 lowercase">{activities.size} selected</p>)}
      </section>

      {/* editing banner */}
      {editingEntry&&(<div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded flex justify-between items-center lowercase">editing entry from {editingEntry.date}<button onClick={()=>{setEditingEntry(null);setMood(null);setEmotions(new Set());setActivities(new Set());setBody('');setQuickMood(null);}} className="text-xs underline">cancel</button></div>)}

      {/* notes */}
      <section className="flex flex-col gap-3">
        <p className="text-xs text-white/40 uppercase tracking-widest">notes</p>
        <textarea ref={textareaRef} value={body} onChange={e=>setBody(e.target.value)} placeholder={todayPrompt} rows={5} className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 resize-none focus:outline-none focus:border-white/30 lowercase font-varela" />
      </section>

      {/* save button */}
      <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-xl font-medium lowercase text-base transition-all duration-200" style={{background:saving?'#222':`linear-gradient(135deg, ${Y}22, ${B}22)`,border:`1px solid ${saving?'rgba(255,255,255,0.1)':B}`,color:saving?'rgba(255,255,255,0.4)':'white',}}>{saving?'saving…':'save entry'}</button>

      {/* stats panel */}
      {showStats&&(<div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]"><p className="text-xs text-white/40 lowercase mb-3">stats</p><div className="grid grid-cols-2 gap-3"><div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.03]"><span className="text-2xl font-bold text-yellow-400">{streak}</span><span className="text-xs text-white/40 lowercase">day streak</span></div><div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.03]"><span className="text-2xl font-bold text-blue-400">{entryCount}</span><span className="text-xs text-white/40 lowercase">total entries</span></div></div></div>)}

      {/* achievements panel */}
      {showAchievements&&(<div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]"><p className="text-xs text-white/40 lowercase mb-3">achievements ({unlockedAchievements.length})</p><div className="grid grid-cols-1 gap-2">{ACHIEVEMENTS.map(ach=>{const unlocked=unlockedAchievements.includes(ach.id);return(<div key={ach.id} className={cn('flex items-center gap-3 p-2 rounded-lg transition-colors',unlocked?'bg-yellow-500/10 border border-yellow-500/20':'opacity-30')}><span className="text-xl">{ach.icon}</span><div><p className="text-xs font-medium lowercase">{ach.name}</p><p className="text-xs text-white/40 lowercase">{ach.description}</p></div></div>);})}</div></div>)}

      {/* selected entry modal */}
      {selectedEntry&&(<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"><div className="bg-[#111] p-6 rounded-lg max-w-lg w-full relative"><button className="absolute top-2 right-2 text-white" onClick={()=>setSelectedEntry(null)}>✕</button><p className="text-lg font-bold lowercase">{selectedEntry.date}</p><p className="text-3xl">{MOODS.find(m=>m.id===selectedEntry.mood)?.emoji}</p><p className="text-xs lowercase text-white/40">mood: {MOODS.find(m=>m.id===selectedEntry.mood)?.label}</p><p className="mt-2 text-sm lowercase">emotions: {(JSON.parse((selectedEntry as any).emotions||'[]') as string[]).join(', ')}</p><p className="mt-1 text-sm lowercase">activities: {parseActivities(selectedEntry.activities).join(', ')}</p><p className="mt-3 text-sm whitespace-pre-wrap">{selectedEntry.body}</p><div className="mt-4 flex gap-3"><button className="px-3 py-1 rounded bg-blue-600 lowercase text-sm" onClick={()=>{populateForm(selectedEntry);setSelectedEntry(null);}}>edit</button><button className="px-3 py-1 rounded bg-red-600 lowercase text-sm" onClick={()=>handleDeleteEntry(selectedEntry)}>delete</button></div></div></div>)}

      {/* color picker overlay */}
      <ColorPicker isOpen={colorPickerOpen} onClose={()=>setColorPickerOpen(false)} onSelectColor={handleColorSelect} currentColor={currentPickerColor} savedDots={colorDots} onSaveDot={handleSaveDot} dotIndex={activeDotIndex} />
    </div>
  );
}
);
}

function getDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getMonthData(year: number, month: number): { date: string, day: number, isCurrentMonth: boolean }[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const days: { date: string, day: number, isCurrentMonth: boolean }[] = [];
  
  // previous month padding
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({
      date: d.toLocaleDateString('en-CA'),
      day: d.getDate(),
      isCurrentMonth: false
    });
  }
  
  // current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({
      date: d.toLocaleDateString('en-CA'),
      day: i,
      isCurrentMonth: true
    });
  }
  
  // next month padding
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({
      date: d.toLocaleDateString('en-CA'),
      day: i,
      isCurrentMonth: false
    });
  }
  
  return days;
}

// ─────────────────────────────────────────────
//  color picker component
// ─────────────────────────────────────────────

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  currentColor: string;
  savedDots: string[];
  onSaveDot: (index: number, color: string) => void;
  dotIndex: number | null;
}

function ColorPicker({ 
  isOpen, 
  onClose, 
  onSelectColor, 
  currentColor,
  savedDots,
  onSaveDot,
  dotIndex
}: ColorPickerProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);

  useEffect(() => {
    const hex = currentColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    setHue(Math.round(h * 360));
    setSaturation(Math.round(s * 100));
    setLightness(Math.round(l * 100));
    setSelectedColor(currentColor);
  }, [currentColor, isOpen]);

  useEffect(() => {
    const hslColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    setSelectedColor(hslColorToHex(hue, saturation, lightness));
  }, [hue, saturation, lightness]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-4 w-72"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-xs lowercase text-white/50 mb-3 text-center">tap a dot to save color, tap again to apply</p>
        
        <div className="flex justify-center gap-2 mb-4">
          {savedDots.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                if (dotIndex === i) {
                  onSaveDot(i, selectedColor);
                } else {
                  onSelectColor(color);
                  onClose();
                }
              }}
              className={cn(
                "w-8 h-8 rounded-full transition-all",
                dotIndex === i ? "ring-2 ring-white scale-110" : "hover:scale-110"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        <div className="mb-3">
          <label className="text-[10px] lowercase text-white/40 block mb-1">hue</label>
          <input
            type="range"
            min="0"
            max="360"
            value={hue}
            onChange={e => setHue(parseInt(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, 
                hsl(0, 100%, 50%), 
                hsl(60, 100%, 50%), 
                hsl(120, 100%, 50%), 
                hsl(180, 100%, 50%), 
                hsl(240, 100%, 50%), 
                hsl(300, 100%, 50%), 
                hsl(360, 100%, 50%))`
            }}
          />
        </div>

        <div className="mb-3">
          <label className="text-[10px] lowercase text-white/40 block mb-1">saturation</label>
          <input
            type="range"
            min="0"
            max="100"
            value={saturation}
            onChange={e => setSaturation(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(${hue}, 0%, ${lightness}%), hsl(${hue}, 100%, ${lightness}%))`
            }}
          />
        </div>

        <div className="mb-4">
          <label className="text-[10px] lowercase text-white/40 block mb-1">lightness</label>
          <input
            type="range"
            min="10"
            max="90"
            value={lightness}
            onChange={e => setLightness(parseInt(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(${hue}, ${saturation}%, 10%), hsl(${hue}, ${saturation}%, 90%))`
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div 
            className="w-12 h-12 rounded-full border-2 border-white/20"
            style={{ backgroundColor: selectedColor }}
          />
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-full text-sm lowercase bg-white/10 text-white/60"
            >
              cancel
            </button>
            <button
              onClick={() => {
                onSelectColor(selectedColor);
                onClose();
              }}
              className="px-4 py-2 rounded-full text-sm lowercase"
              style={{ backgroundColor: Y, color: '#000' }}
            >
              apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function hslColorToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// ─────────────────────────────────────────────
//  breathing exercise component
// ─────────────────────────────────────────────

function BreathingExercise({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [count, setCount] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setCount(prev => {
          if (prev <= 1) {
            if (phase === 'inhale') {
              setPhase('hold');
              return 7;
            } else if (phase === 'hold') {
              setPhase('exhale');
              return 8;
            } else {
              setPhase('inhale');
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, phase]);

  const handleComplete = () => {
    setIsActive(false);
    setSessions(s => s + 1);
    const history = getStoredData(STORAGE_KEYS.BREATHING_HISTORY, [] as { date: string; sessions: number }[]);
    const today = getToday();
    const existing = history.find(h => h.date === today);
    if (existing) {
      existing.sessions += 1;
    } else {
      history.push({ date: today, sessions: 1 });
    }
    setStoredData(STORAGE_KEYS.BREATHING_HISTORY, history);
    toast.success('breathing session complete!');
  };

  const circleSize = phase === 'inhale' ? 160 : phase === 'hold' ? 160 : 100;
  const opacity = phase === 'inhale' ? 1 : phase === 'hold' ? 1 : 0.6;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-80 text-center" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-white/40 lowercase mb-2">breathing exercise</p>
        <p className="text-lg text-white/80 lowercase mb-6">4-7-8 technique</p>
        
        <div className="flex justify-center items-center mb-6">
          <div 
            className="rounded-full flex items-center justify-center transition-all duration-1000"
            style={{
              width: circleSize,
              height: circleSize,
              backgroundColor: `rgba