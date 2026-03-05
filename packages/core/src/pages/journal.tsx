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
  { id: '0', label: 'terrible', emoji: '😡', color: '#ef4444' },
  { id: '1', label: 'bad',      emoji: '😞', color: '#f97316' },
  { id: '2', label: 'fine',     emoji: '😐', color: '#eab308' },
  { id: '4', label: 'good',     emoji: '😊', color: '#22c55e' },
  { id: '5', label: 'great',    emoji: '😃', color: '#06b6d4' },
  { id: '6', label: 'amazing!', emoji: '😁', color: '#8b5cf6' },
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
  { id: 'xp_1000', name: 'xp challenger', description: 'earned 1000 xp', icon: '💎' },
  { id: 'xp_5000', name: 'xp master', description: 'earned 5000 xp', icon: '🌈' },
  { id: 'streak_14', name: 'fortnight focus', description: '14 day streak', icon: '💪' },
  { id: 'streak_60', name: 'two month champion', description: '60 day streak', icon: '🏅' },
  { id: 'streak_100', name: 'century writer', description: '100 day streak', icon: '👑' },
];

const LEVELS = [
  { level: 1, name: 'beginner', emoji: '🌱', minXp: 0 },
  { level: 2, name: 'explorer', emoji: '🌿', minXp: 100 },
  { level: 3, name: 'journaler', emoji: '🌳', minXp: 200 },
  { level: 4, name: 'observer', emoji: '🌸', minXp: 300 },
  { level: 5, name: 'reflector', emoji: '🍎', minXp: 400 },
  { level: 6, name: 'star', emoji: '⭐', minXp: 500 },
  { level: 7, name: 'glow', emoji: '🌟', minXp: 600 },
  { level: 8, name: 'spark', emoji: '💫', minXp: 700 },
  { level: 9, name: 'shine', emoji: '✨', minXp: 800 },
  { level: 10, name: 'beacon', emoji: '🔆', minXp: 900 },
  { level: 11, name: 'fire', emoji: '🔥', minXp: 1000 },
  { level: 12, name: 'sparkle', emoji: '💥', minXp: 1200 },
  { level: 13, name: 'rainbow', emoji: '🌈', minXp: 1400 },
  { level: 14, name: 'butterfly', emoji: '🦋', minXp: 1600 },
  { level: 15, name: 'eagle', emoji: '🦅', minXp: 1800 },
  { level: 16, name: 'crown', emoji: '👑', minXp: 2000 },
  { level: 17, name: 'trophy', emoji: '🏆', minXp: 2500 },
  { level: 18, name: 'diamond', emoji: '💎', minXp: 3000 },
  { level: 19, name: 'medal', emoji: '🎖️', minXp: 3500 },
  { level: 20, name: 'target', emoji: '🎯', minXp: 4000 },
  { level: 21, name: 'rocket', emoji: '🚀', minXp: 5000 },
  { level: 22, name: 'galaxy', emoji: '🌌', minXp: 6000 },
  { level: 23, name: 'universe', emoji: '✨', minXp: 7000 },
  { level: 24, name: 'vision', emoji: '👁️‍🗨️', minXp: 8000 },
  { level: 25, name: 'legend', emoji: '💫', minXp: 10000 },
];

const SUGGESTED_TAGS = [
  'gratitude', 'work', 'personal', 'health', 'family', 'friends', 
  'goals', 'reflection', 'therapy', 'sleep', 'exercise', 'creativity',
  'learning', 'travel', 'milestone', 'challenge', 'win', 'struggle',
  'self-care', 'mindfulness', 'productivity', 'relationships', 'growth'
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
  return d.toLocaleDateString('en-CA');
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getLevelFromXp(xp: number): { level: number; name: string; emoji: string; progress: number; nextLevelXp: number } {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }
  const progress = nextLevel.minXp > currentLevel.minXp 
    ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100 
    : 100;
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    emoji: currentLevel.emoji,
    progress: Math.min(progress, 100),
    nextLevelXp: nextLevel.minXp
  };
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
              background: `linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))`
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

function BreathingExerciseModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [technique, setTechnique] = useState<'4-7-8' | 'box'>('4-7-8');
  const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale');
  const [count, setCount] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [sessions, setSessions] = useState(0);

  const getCounts = () => technique === '4-7-8' ? { inhale: 4, hold: 7, exhale: 8, hold2: 0 } : { inhale: 4, hold: 4, exhale: 4, hold2: 4 };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive) {
      interval = setInterval(() => {
        setCount(prev => {
          if (prev <= 1) {
            const counts = getCounts();
            if (phase === 'inhale') {
              setPhase('hold');
              return counts.hold;
            } else if (phase === 'hold') {
              setPhase('exhale');
              return counts.exhale;
            } else if (phase === 'exhale') {
              if (counts.hold2 > 0) {
                setPhase('hold2');
                return counts.hold2;
              } else {
                setPhase('inhale');
                return counts.inhale;
              }
            } else if (phase === 'hold2') {
              setPhase('inhale');
              return counts.inhale;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, phase, technique]);

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

  const circleSize = phase === 'inhale' ? 160 : phase === 'hold' || phase === 'hold2' ? 160 : 100;
  const phaseText = phase === 'inhale' ? 'breathe in' : phase === 'hold' ? 'hold' : phase === 'hold2' ? 'hold' : 'breathe out';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-80 text-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white">✕</button>
        <p className="text-xs text-white/40 lowercase mb-2">breathing exercise</p>
        
        <div className="flex justify-center gap-2 mb-4">
          <button 
            onClick={() => { setTechnique('4-7-8'); setCount(4); setPhase('inhale'); }}
            className={cn("px-3 py-1 rounded-full text-xs lowercase", technique === '4-7-8' ? "bg-blue-600" : "bg-white/10")}
          >
            4-7-8
          </button>
          <button 
            onClick={() => { setTechnique('box'); setCount(4); setPhase('inhale'); }}
            className={cn("px-3 py-1 rounded-full text-xs lowercase", technique === 'box' ? "bg-blue-600" : "bg-white/10")}
          >
            box breathing
          </button>
        </div>
        
        <div className="flex justify-center items-center mb-6">
          <div 
            className="rounded-full flex items-center justify-center transition-all duration-1000"
            style={{
              width: circleSize,
              height: circleSize,
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)'
            }}
          >
            <span className="text-3xl font-bold text-white">{count}</span>
          </div>
        </div>
        
        <p className="text-lg text-white/80 lowercase mb-4">{phaseText}</p>
        
        <div className="flex justify-center gap-3">
          {!isActive ? (
            <button 
              onClick={() => setIsActive(true)}
              className="px-6 py-2 rounded-full bg-blue-600 text-white lowercase"
            >
              start
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsActive(false)}
                className="px-4 py-2 rounded-full bg-white/10 text-white lowercase"
              >
                pause
              </button>
              <button 
                onClick={handleComplete}
                className="px-4 py-2 rounded-full bg-green-600 text-white lowercase"
              >
                done
              </button>
            </>
          )}
        </div>
        
        <p className="text-xs text-white/30 mt-4 lowercase">sessions today: {sessions}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  reflection timer component
// ─────────────────────────────────────────────

function ReflectionTimer({ isOpen, onClose, prompt }: { isOpen: boolean; onClose: () => void; prompt: string }) {
  const [duration, setDuration] = useState(300);
  const [timeLeft, setTimeLeft] = useState(duration);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const durations = [
    { label: '3 min', value: 180 },
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      toast.success('time is up! great reflection session.');
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, timeLeft]);

  const handleDurationChange = (value: number) => {
    setDuration(value);
    setTimeLeft(value);
  };

  const progress = ((duration - timeLeft) / duration) * 100;
  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-80 text-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white">✕</button>
        <p className="text-xs text-white/40 lowercase mb-2">reflection timer</p>
        
        {!isActive ? (
          <div className="mb-4">
            <p className="text-xs text-white/30 lowercase mb-2">select duration</p>
            <div className="flex flex-wrap justify-center gap-2">
              {durations.map(d => (
                <button
                  key={d.label}
                  onClick={() => handleDurationChange(d.value)}
                  className={cn("px-3 py-1 rounded-full text-xs lowercase", duration === d.value ? "bg-blue-600" : "bg-white/10")}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        
        <div className="flex justify-center items-center mb-4">
          <svg width="200" height="200" className="transform -rotate-90">
            <circle cx="100" cy="100" r="90" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
            <circle 
              cx="100" cy="100" r="90" 
              stroke={Y} 
              strokeWidth="8" 
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute">
            <span className="text-3xl font-bold text-white">{formatTime(timeLeft)}</span>
          </div>
        </div>
        
        <p className="text-xs text-white/50 lowercase mb-4 italic">"{prompt}"</p>
        
        <div className="flex justify-center gap-3">
          {!isActive ? (
            <button 
              onClick={() => { setIsActive(true); setIsPaused(false); }}
              className="px-6 py-2 rounded-full bg-blue-600 text-white lowercase"
            >
              start
            </button>
          ) : (
            <>
              <button 
                onClick={() => setIsPaused(!isPaused)}
                className="px-4 py-2 rounded-full bg-white/10 text-white lowercase"
              >
                {isPaused ? 'resume' : 'pause'}
              </button>
              <button 
                onClick={() => { setIsActive(false); setTimeLeft(duration); }}
                className="px-4 py-2 rounded-full bg-red-600 text-white lowercase"
              >
                stop
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  achievement celebration component
// ─────────────────────────────────────────────

function AchievementCelebration({ achievement, onClose }: { achievement: typeof ACHIEVEMENTS[0]; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-pulse" />
      <div className="relative bg-[#0a0a0a] border border-yellow-500/30 rounded-2xl p-8 text-center animate-bounce">
        <p className="text-xs text-yellow-400 lowercase mb-2">achievement unlocked!</p>
        <span className="text-6xl mb-4 block">{achievement.icon}</span>
        <p className="text-xl font-bold text-white lowercase">{achievement.name}</p>
        <p className="text-sm text-white/60 lowercase">{achievement.description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  stats charts component
// ─────────────────────────────────────────────

interface StatsChartsProps {
  entries: any[];
}

function StatsCharts({ entries }: StatsChartsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const filteredEntries = useMemo(() => {
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === 'week') cutoff.setDate(now.getDate() - 7);
    else if (timeRange === 'month') cutoff.setDate(now.getDate() - 30);
    else cutoff.setDate(now.getDate() - 365);
    return entries.filter(e => new Date(e.date) >= cutoff);
  }, [entries, timeRange]);

  const moodTrendData = useMemo(() => {
    const sorted = [...filteredEntries].filter(e => e.mood).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map(e => ({
      date: formatDate(e.date),
      mood: parseInt(e.mood) || 0,
    }));
  }, [filteredEntries]);

  const emotionFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredEntries.forEach(e => {
      try {
        const emos = JSON.parse((e as any).emotions || '[]');
        emos.forEach((em: string) => { freq[em] = (freq[em] || 0) + 1; });
      } catch {}
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [filteredEntries]);

  const activityBreakdown = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const acts = parseActivities(e.activities);
      acts.forEach((a: string) => { freq[a] = (freq[a] || 0) + 1; });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => {
      const act = DEFAULT_ACTIVITIES.find(a => a.id === name);
      return { name: act?.label || name, value };
    });
  }, [filteredEntries]);

  const moodDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredEntries.filter(e => e.mood).forEach(e => {
      const label = MOODS.find(m => m.id === e.mood)?.label || 'unknown';
      dist[label] = (dist[label] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-2">
        {(['week', 'month', 'year'] as const).map(r => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={cn("px-3 py-1 rounded-full text-xs lowercase", timeRange === r ? "bg-blue-600" : "bg-white/10")}
          >
            {r}
          </button>
        ))}
      </div>

      {moodTrendData.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">mood trend</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={moodTrendData}>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis domain={[0, 6]} ticks={[0, 2, 4, 6]} stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Line type="monotone" dataKey="mood" stroke={B} strokeWidth={2} dot={{ fill: B, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {emotionFrequency.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">top emotions</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionFrequency} layout="vertical">
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis type="category" dataKey="name" width={80} stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill={Y} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activityBreakdown.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">activities</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                >
                  {activityBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLOR_PALETTE[i % COLOR_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {moodDistribution.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">mood distribution</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moodDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                >
                  {moodDistribution.map((_, i) => (
                    <Cell key={i} fill={MOOD_COLORS[i % MOOD_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {filteredEntries.length === 0 && (
        <p className="text-center text-white/30 lowercase text-sm">no data for this period</p>
      )}
    </div>
  );
}

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
  const [xp, setXp] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [celebratingAchievement, setCelebratingAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [todayPrompt] = useState(() => DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
  const [todayQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [quickMood, setQuickMood] = useState<string | null>(null);
  
  // ── state: daily goals ──
  const [dailyGoals, setDailyGoals] = useState<{id: string; label: string; completed: boolean}[]>([
    { id: 'log_mood', label: 'log your mood', completed: false },
    { id: 'add_emotions', label: 'add 3+ emotions', completed: false },
    { id: 'write_note', label: 'write 50+ characters', completed: false },
    { id: 'complete_activities', label: 'complete 3+ activities', completed: false },
  ]);
  const [showGoals, setShowGoals] = useState(false);
  
  // ── state: tags ──
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [tagQuery, setTagQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>(() => 
    getStoredData(STORAGE_KEYS.TAGS, SUGGESTED_TAGS)
  );
  
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
  const [showPastEntries, setShowPastEntries] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // ── state: past entries filter ──
  const [pastEntriesFilter, setPastEntriesFilter] = useState({ search: '', mood: '', tag: '' });
  
  // ── refs ──
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      const res: any = await api.listRecords('journal', { sort: '-date', pageSize: 1000 });
      setEntries(res?.data || []);
    } catch (e) {
      console.error('failed to load journal entries', e);
    }
  }, []);

  // load saved data on mount
  useEffect(() => {
    const savedStreak = getStoredData(STORAGE_KEYS.STREAK_DATA, { current: 0, lastDate: '' });
    setStreak(savedStreak.current);
    const savedCount = getStoredData(STORAGE_KEYS.ENTRY_COUNT, 0);
    setEntryCount(savedCount);
    const savedXp = getStoredData(STORAGE_KEYS.XP_DATA, 0);
    setXp(savedXp);
    const savedAchievements = getStoredData(STORAGE_KEYS.ACHIEVEMENTS, [] as string[]);
    setUnlockedAchievements(savedAchievements);
    const savedGoals = getStoredData(STORAGE_KEYS.DAILY_GOALS, { date: '', goals: dailyGoals });
    if (savedGoals.date !== getToday()) {
      setDailyGoals(dailyGoals.map(g => ({ ...g, completed: false })));
    } else {
      setDailyGoals(savedGoals.goals);
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
  const toggleTag = (id: string) => {
    setTags(prev => {
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

  const populateForm = (entry: JournalRecord) => {
    setMood(entry.mood);
    setEmotions(new Set(JSON.parse((entry as any).emotions || '[]')));
    setActivities(new Set(parseActivities(entry.activities)));
    setBody(entry.body || '');
    setQuickMood(entry.mood || null);
    setEditingEntry(entry);
    try {
      setTags(new Set(JSON.parse((entry as any).tags || '[]')));
    } catch {
      setTags(new Set());
    }
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
      const res: any = await api.listRecords('journal', { sort: '-date', pageSize: 1000 });
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

  const checkAchievements = (newXp: number, newStreak: number, newCount: number) => {
    const newUnlocks: string[] = [];
    
    if (newCount >= 1 && !unlockedAchievements.includes('first_entry')) newUnlocks.push('first_entry');
    if (newStreak >= 7 && !unlockedAchievements.includes('week_streak')) newUnlocks.push('week_streak');
    if (newStreak >= 14 && !unlockedAchievements.includes('streak_14')) newUnlocks.push('streak_14');
    if (newStreak >= 30 && !unlockedAchievements.includes('month_streak')) newUnlocks.push('month_streak');
    if (newStreak >= 60 && !unlockedAchievements.includes('streak_60')) newUnlocks.push('streak_60');
    if (newStreak >= 100 && !unlockedAchievements.includes('streak_100')) newUnlocks.push('streak_100');
    if (newCount >= 10 && !unlockedAchievements.includes('ten_entries')) newUnlocks.push('ten_entries');
    if (newCount >= 50 && !unlockedAchievements.includes('fifty_entries')) newUnlocks.push('fifty_entries');
    if (newCount >= 100 && !unlockedAchievements.includes('hundred_entries')) newUnlocks.push('hundred_entries');
    if (newXp >= 500 && !unlockedAchievements.includes('level_5')) newUnlocks.push('level_5');
    if (newXp >= 1000 && !unlockedAchievements.includes('level_10')) newUnlocks.push('level_10');
    if (newXp >= 1000 && !unlockedAchievements.includes('xp_1000')) newUnlocks.push('xp_1000');
    if (newXp >= 5000 && !unlockedAchievements.includes('xp_5000')) newUnlocks.push('xp_5000');
    
    if (newUnlocks.length > 0) {
      const updated = [...unlockedAchievements, ...newUnlocks];
      setUnlockedAchievements(updated);
      setStoredData(STORAGE_KEYS.ACHIEVEMENTS, updated);
      const achievement = ACHIEVEMENTS.find(a => a.id === newUnlocks[0]);
      if (achievement) setCelebratingAchievement(achievement);
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
      tags: JSON.stringify(Array.from(tags)),
    };
    try {
      if (editingEntry?.id) {
        await api.request('journal', 'update', { filterByTk: editingEntry.id, ...payload });
        toast.success('entry updated ✓');
      } else {
        await api.createRecord('journal', payload);
        toast.success('entry saved ✓');
      }
      
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
      
      // award xp (10 for entry, 5 for streak bonus)
      const earnedXp = 10 + (streakData.lastDate === getYesterday() ? 5 : 0);
      const newXp = xp + earnedXp;
      setXp(newXp);
      setStoredData(STORAGE_KEYS.XP_DATA, newXp);
      
      // update daily goals
      const updatedGoals = dailyGoals.map(g => {
        if (g.id === 'log_mood') return { ...g, completed: !!mood };
        if (g.id === 'add_emotions') return { ...g, completed: emotions.size >= 3 };
        if (g.id === 'write_note') return { ...g, completed: body.trim().length >= 50 };
        if (g.id === 'complete_activities') return { ...g, completed: activities.size >= 3 };
        return g;
      });
      setDailyGoals(updatedGoals);
      setStoredData(STORAGE_KEYS.DAILY_GOALS, { date: today, goals: updatedGoals });
      
      // check achievements
      checkAchievements(newXp, newStreak, newCount);
      
      // reset form
      setMood(null);
      setEmotions(new Set());
      setActivities(new Set());
      setBody('');
      setQuickMood(null);
      setTags(new Set());
      setEditingEntry(null);
      
      loadEntries();
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

  const handleAddTag = () => {
    if (tagQuery.trim()) {
      const val = tagQuery.trim().toLowerCase();
      if (!availableTags.includes(val)) {
        setAvailableTags(prev => [...prev, val]);
        setStoredData(STORAGE_KEYS.TAGS, [...availableTags, val]);
      }
      toggleTag(val);
      setTagQuery('');
    }
  };

  const levelInfo = useMemo(() => getLevelFromXp(xp), [xp]);

  const filteredPastEntries = useMemo(() => {
    let filtered = [...entries];
    if (pastEntriesFilter.search) {
      const q = pastEntriesFilter.search.toLowerCase();
      filtered = filtered.filter(e => 
        e.body?.toLowerCase().includes(q) || 
        (e as any).emotions?.toLowerCase().includes(q) ||
        parseActivities(e.activities).some(a => a.toLowerCase().includes(q))
      );
    }
    if (pastEntriesFilter.mood) {
      filtered = filtered.filter(e => e.mood === pastEntriesFilter.mood);
    }
    if (pastEntriesFilter.tag) {
      filtered = filtered.filter(e => {
        try {
          const entryTags = JSON.parse((e as any).tags || '[]');
          return entryTags.includes(pastEntriesFilter.tag);
        } catch { return false; }
      });
    }
    return filtered;
  }, [entries, pastEntriesFilter]);

  const entriesGroupedByMonth = useMemo(() => {
    const groups: Record<string, typeof filteredPastEntries> = {};
    filteredPastEntries.forEach(e => {
      const month = new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(e);
    });
    return groups;
  }, [filteredPastEntries]);

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

  const completedGoals = dailyGoals.filter(g => g.completed).length;
  const goalsProgress = (completedGoals / dailyGoals.length) * 100;

  return (
    <div className="min-h-screen bg-black text-white font-varela p-4 pb-24 flex flex-col gap-6 max-w-2xl mx-auto">
      {/* achievement celebration */}
      {celebratingAchievement && (
        <AchievementCelebration achievement={celebratingAchievement} onClose={() => setCelebratingAchievement(null)} />
      )}
      
      {/* breathing modal */}
      <BreathingExerciseModal isOpen={showBreathing} onClose={() => setShowBreathing(false)} />
      
      {/* timer modal */}
      <ReflectionTimer isOpen={showTimer} onClose={() => setShowTimer(false)} prompt={todayPrompt} />

      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 lowercase">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-2xl font-bold lowercase tracking-tight">journal</h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-sm">🔥</span>
              <span className="text-xs text-yellow-400">{streak}</span>
            </div>
          )}
          <button onClick={() => setShowGoals(v => !v)} className="text-lg hover:scale-110 transition-transform" title="daily goals">🎯</button>
          <button onClick={() => setShowAchievements(v => !v)} className="text-lg hover:scale-110 transition-transform" title="achievements">🏆</button>
          <button onClick={() => setShowCalendar(v => !v)} className="text-lg hover:scale-110 transition-transform" title="calendar">📅</button>
          <button onClick={() => setShowPastEntries(v => !v)} className="text-lg hover:scale-110 transition-transform" title="past entries">📖</button>
          <button onClick={() => setShowStats(v => !v)} className="text-lg hover:scale-110 transition-transform" title="stats">📊</button>
          <button onClick={() => setShowBreathing(true)} className="text-lg hover:scale-110 transition-transform" title="breathing">🌬️</button>
          <button onClick={() => setShowTimer(true)} className="text-lg hover:scale-110 transition-transform" title="timer">⏱️</button>
          <button onClick={handleExport} className="text-lg hover:scale-110 transition-transform" title="export">📁</button>
          <button onClick={() => setShowQuickCheckin(v => !v)} className="text-sm px-3 py-1 rounded-full border border-white/10 text-white/60 hover:border-white/30 lowercase">check-in</button>
        </div>
      </div>

      {/* xp & level bar */}
      <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{levelInfo.emoji}</span>
            <span className="text-sm font-medium lowercase">level {levelInfo.level}</span>
            <span className="text-xs text-white/40 lowercase">{levelInfo.name}</span>
          </div>
          <span className="text-xs text-white/40 lowercase">{xp} xp</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-500"
            style={{ width: `${levelInfo.progress}%`, background: `linear-gradient(90deg, ${Y}, ${B})` }}
          />
        </div>
        <p className="text-[10px] text-white/30 mt-1 lowercase">
          {levelInfo.nextLevelXp - xp} xp to next level
        </p>
      </div>

      {/* quote */}
      <div className="text-center py-2 border-y border-white/5">
        <p className="text-sm italic text-white/40 lowercase">"{todayQuote.text}"</p>
        {todayQuote.author !== 'unknown' && (
          <p className="text-xs text-white/20 mt-0.5 lowercase">— {todayQuote.author}</p>
        )}
      </div>

      {/* daily goals */}
      {showGoals && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-white/40 lowercase">daily goals</p>
            <span className="text-xs text-white/60 lowercase">{completedGoals}/{dailyGoals.length}</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
            <div 
              className="h-full transition-all duration-300"
              style={{ width: `${goalsProgress}%`, backgroundColor: goalsProgress === 100 ? '#22c55e' : Y }}
            />
          </div>
          <div className="space-y-2">
            {dailyGoals.map(g => (
              <div key={g.id} className="flex items-center gap-2">
                <span className={cn("text-lg", g.completed ? 'opacity-100' : 'opacity-30')}>{g.completed ? '✓' : '○'}</span>
                <span className={cn("text-sm lowercase", g.completed ? 'text-white' : 'text-white/40')}>{g.label}</span>
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

      {/* calendar view */}
      {showCalendar && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex justify-between items-center mb-2">
            <button onClick={()=>setCurrentMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))} className="text-white/60 hover:text-white">‹</button>
            <span className="text-sm font-medium lowercase">{currentMonth.toLocaleString('default',{month:'long',year:'numeric'})}</span>
            <button onClick={()=>setCurrentMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))} className="text-white/60 hover:text-white">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] text-white/40 uppercase lowercase">
            {['sun','mon','tue','wed','thu','fri','sat'].map(d=> <div key={d} className="text-center">{d}</div>)}
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

      {/* stats panel */}
      {showStats && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-xs text-white/40 lowercase mb-3">statistics</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.03]">
              <span className="text-2xl font-bold text-yellow-400">{streak}</span>
              <span className="text-xs text-white/40 lowercase">day streak</span>
            </div>
            <div className="flex flex-col items-center p-3 rounded-lg bg-white/[0.03]">
              <span className="text-2xl font-bold text-blue-400">{entryCount}</span>
              <span className="text-xs text-white/40
