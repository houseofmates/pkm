import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';

// ─────────────────────────────────────────────
//  constants
// ─────────────────────────────────────────────

const Y = '#f5af12';
const B = '#3c9fdd';

const MOODS = [
  { id: '0', label: 'terrible', emoji: '😡', img: '/images/moods/terrible.png' },
  { id: '1', label: 'bad',      emoji: '😞', img: '/images/moods/bad.png' },
  { id: '2', label: 'fine',     emoji: '😐', img: '/images/moods/fine.png' },
  { id: '4', label: 'good',     emoji: '😊', img: '/images/moods/good.png' },
  { id: '5', label: 'great',    emoji: '😃', img: '/images/moods/great.png' },
  { id: '6', label: 'amazing!', emoji: '😁', img: '/images/moods/amazing.png' },
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
  return d.toLocaleDateString('en-CA');
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
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
  return d.toLocaleDateString('en-CA');
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
    // convert current color to hsl for the picker
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

  // update color from hsl
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
        
        {/* saved color dots */}
        <div className="flex justify-center gap-2 mb-4">
          {savedDots.map((color, i) => (
            <button
              key={i}
              onClick={() => {
                if (dotIndex === i) {
                  // first click - save current color to this dot
                  onSaveDot(i, selectedColor);
                } else {
                  // subsequent clicks - apply the saved color
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

        {/* color spectrum - hue slider */}
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

        {/* saturation slider */}
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

        {/* lightness slider */}
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

        {/* preview and actions */}
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
//  main component
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
  const [colorPickerTarget, setColorPickerTarget] = useState<{type: 'emotion' | 'activity', id: string} | null>(null);
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

  // ── load saved data on mount ──
  useEffect(() => {
    // load streak data
    const streakData = getStoredData(STORAGE_KEYS.STREAK_DATA, { current: 0, lastDate: '' });
    const today = getToday();
    const yesterday = getYesterday();
    
    // check if streak is still valid
    if (streakData.lastDate === today) {
      setStreak(streakData.current);
    } else if (streakData.lastDate === yesterday) {
      setStreak(streakData.current);
    } else {
      // streak broken
      setStreak(0);
      setStoredData(STORAGE_KEYS.STREAK_DATA, { current: 0, lastDate: today });
    }
    
    // load entry count
    setEntryCount(getStoredData(STORAGE_KEYS.ENTRY_COUNT, 0));
    
    // load achievements
    setUnlockedAchievements(getStoredData(STORAGE_KEYS.ACHIEVEMENTS, []));
    
    // load custom emotions
    const customEmojis = getStoredData(STORAGE_KEYS.CUSTOM_EMOTIONS, [] as string[]);
    if (customEmojis.length > 0) {
      setAvailableEmotions(prev => [...new Set([...prev, ...customEmojis])]);
    }
  }, []);

  // ── save functions ──
  const saveEmotionColors = useCallback((colors: Record<string, string>) => {
    setEmotionColors(colors);
    setStoredData(STORAGE_KEYS.EMOTION_COLORS, colors);
  }, []);

  const saveActivityColors = useCallback((colors: Record<string, string>) => {
    setActivityColors(colors);
    setStoredData(STORAGE_KEYS.ACTIVITY_COLORS, colors);
  }, []);

  // ── handlers: toggle emotions/activities ──
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

  // ── handlers: color picker ──
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

  // ── handlers: context menu (right click) ──
  const handleContextMenu = (e: React.MouseEvent, type: 'emotion' | 'activity', id: string) => {
    e.preventDefault();
    openColorPicker(type, id);
  };

  // ── handlers: long press for mobile ──
  const handleLongPress = useCallback((type: 'emotion' | 'activity', id: string) => {
    openColorPicker(type, id);
  }, []);

  // ── handlers: save journal entry ──
  const handleSave = async () => {
    if (!mood && activities.size === 0 && !body.trim()) {
      toast.error('nothing to save yet');
      return;
    }

    setSaving(true);
    const payload = {
      mood: mood ?? undefined,
      emotions: JSON.stringify(Array.from(emotions)),
      activities: JSON.stringify(Array.from(activities)),
      body: body.trim(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-CA'),
    };

    try {
      await api.createRecord('journal', payload);
      toast.success('entry saved ✓');
      
      // update streak
      const today = getToday();
      const streakData = getStoredData(STORAGE_KEYS.STREAK_DATA, { current: 0, lastDate: '' });
      let newStreak = streakData.current;
      
      if (streakData.lastDate !== today) {
        newStreak = streakData.lastDate === getYesterday() ? streakData.current + 1 : 1;
        setStoredData(STORAGE_KEYS.STREAK_DATA, { current: newStreak, lastDate: today });
        setStreak(newStreak);
      }
      
      // update entry count
      const newCount = entryCount + 1;
      setEntryCount(newCount);
      setStoredData(STORAGE_KEYS.ENTRY_COUNT, newCount);
      
      // check achievements
      const newUnlocked = [...unlockedAchievements];
      const newAchievements: string[] = [];
      
      // first entry
      if (newCount === 1 && !newUnlocked.includes('first_entry')) {
        newUnlocked.push('first_entry');
        newAchievements.push('first_entry');
      }
      
      // entry count achievements
      if (newCount >= 10 && !newUnlocked.includes('ten_entries')) {
        newUnlocked.push('ten_entries');
        newAchievements.push('ten_entries');
      }
      if (newCount >= 50 && !newUnlocked.includes('fifty_entries')) {
        newUnlocked.push('fifty_entries');
        newAchievements.push('fifty_entries');
      }
      if (newCount >= 100 && !newUnlocked.includes('hundred_entries')) {
        newUnlocked.push('hundred_entries');
        newAchievements.push('hundred_entries');
      }
      
      // streak achievements
      if (newStreak >= 7 && !newUnlocked.includes('week_streak')) {
        newUnlocked.push('week_streak');
        newAchievements.push('week_streak');
      }
      if (newStreak >= 30 && !newUnlocked.includes('month_streak')) {
        newUnlocked.push('month_streak');
        newAchievements.push('month_streak');
      }
      
      // mood tracker achievement
      if (mood && !newUnlocked.includes('mood_tracker')) {
        newUnlocked.push('mood_tracker');
        newAchievements.push('mood_tracker');
      }
      
      // emotion explorer achievement
      if (emotions.size >= 10 && !newUnlocked.includes('emotion_explorer')) {
        newUnlocked.push('emotion_explorer');
        newAchievements.push('emotion_explorer');
      }
      
      // activity pro achievement
      if (activities.size >= 20 && !newUnlocked.includes('activity_pro')) {
        newUnlocked.push('activity_pro');
        newAchievements.push('activity_pro');
      }
      
      // word warrior achievement
      if (body.trim().split(/\s+/).length >= 500 && !newUnlocked.includes('word_warrior')) {
        newUnlocked.push('word_warrior');
        newAchievements.push('word_warrior');
      }
      
      if (newAchievements.length > 0) {
        setUnlockedAchievements(newUnlocked);
        setStoredData(STORAGE_KEYS.ACHIEVEMENTS, newUnlocked);
        
        // show achievement toasts
        newAchievements.forEach(achId => {
          const ach = ACHIEVEMENTS.find(a => a.id === achId);
          if (ach) {
            toast.success(`${ach.icon} achievement unlocked: ${ach.name}!`);
          }
        });
      }
      
      // reset form
      setMood(null);
      setEmotions(new Set());
      setActivities(new Set());
      setBody('');
      setQuickMood(null);
      
    } catch (err: any) {
      toast.error('failed to save: ' + (err?.message ?? 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ── handlers: quick check-in ──
  const handleQuickMood = (moodId: string) => {
    if (quickMood === moodId) {
      setQuickMood(null);
    } else {
      setQuickMood(moodId);
      setMood(moodId);
    }
  };

  // ── handlers: add custom emotion ──
  const handleAddEmotion = () => {
    if (emotionQuery.trim()) {
      const val = emotionQuery.trim().toLowerCase();
      if (!availableEmotions.includes(val)) {
        setAvailableEmotions(prev => [...prev, val]);
        // save custom emotions
        const customEmojis = getStoredData(STORAGE_KEYS.CUSTOM_EMOTIONS, [] as string[]);
        if (!customEmojis.includes(val)) {
          setStoredData(STORAGE_KEYS.CUSTOM_EMOTIONS, [...customEmojis, val]);
        }
        // assign random color
        const newColors = { ...emotionColors, [val]: COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)] };
        saveEmotionColors(newColors);
      }
      toggleEmotion(val);
      setEmotionQuery('');
    }
  };

  // ── render: mood button ──
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

