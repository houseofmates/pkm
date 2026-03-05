import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { JournalRecord, parseActivities } from '@/schema/journal-collection';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { Sparkles, Mic, Image, Calendar, TrendingUp, Heart, Zap, Target, Award, BookOpen, Wind, Clock, Download, Plus, X, ChevronLeft, ChevronRight, Search, Filter, Edit2, Trash2, Lock } from 'lucide-react';

// ─────────────────────────────────────────────
//  constants
// ─────────────────────────────────────────────

const Y = '#f5af12';
const B = '#3c9fdd';
const G = '#22c55e';

const MOODS = [
  { id: '0', label: 'terrible', emoji: '😡', color: '#ef4444', value: 1 },
  { id: '1', label: 'bad',      emoji: '😞', color: '#f97316', value: 2 },
  { id: '2', label: 'fine',     emoji: '😐', color: '#eab308', value: 3 },
  { id: '4', label: 'good',     emoji: '😊', color: '#22c55e', value: 4 },
  { id: '5', label: 'great',    emoji: '😃', color: '#06b6d4', value: 5 },
  { id: '6', label: 'amazing!', emoji: '😁', color: '#8b5cf6', value: 6 },
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
  { id: 'take_pills',      label: 'take pills',      emoji: '💊', category: 'health' },
  { id: 'put_patches_on',  label: 'put patches on',  emoji: '🩹', category: 'health' },
  { id: 'water_floss',     label: 'water floss',     emoji: '🚿', category: 'health' },
  { id: 'brush_teeth',     label: 'brush teeth',      emoji: '🦷', category: 'health' },
  { id: 'wash_face',       label: 'wash face',       emoji: '🧴', category: 'health' },
  { id: 'nail_care',       label: 'nail care',       emoji: '💅', category: 'health' },
  { id: 'body_wipe',       label: 'body wipe',        emoji: '🧻', category: 'health' },
  { id: 'shower',          label: 'shower',          emoji: '🚿', category: 'health' },
  { id: 'journal_plan_write', label: 'journal/plan/write', emoji: '📝', category: 'productivity' },
  { id: 'tidy',            label: 'tidy',            emoji: '🧹', category: 'productivity' },
  { id: 'worship',         label: 'worship',         emoji: '🙏', category: 'wellness' },
  { id: 'laundry',         label: 'laundry',         emoji: '👕', category: 'productivity' },
  { id: 'go_outside',      label: 'go outside',      emoji: '🚪', category: 'wellness' },
  { id: 'leave_house',     label: 'leave house',     emoji: '🏠', category: 'wellness' },
  { id: 'online_social_int', label: 'online social int', emoji: '💬', category: 'social' },
  { id: 'eat_meal',        label: 'eat meal',         emoji: '🍽️', category: 'health' },
  { id: 'draw',            label: 'draw',            emoji: '✏️', category: 'creative' },
  { id: 'vibecode',        label: 'vibecode',         emoji: '💻', category: 'creative' },
  { id: 'paint',           label: 'paint',            emoji: '🎨', category: 'creative' },
  { id: 'play_a_game',     label: 'play a game',      emoji: '🎮', category: 'leisure' },
  { id: 'llm_rp',          label: 'llm rp',          emoji: '🤖', category: 'creative' },
  { id: 'llm_int',         label: 'llm int',          emoji: '💬', category: 'creative' },
  { id: 'watch_content',   label: 'watch content',    emoji: '📺', category: 'leisure' },
  { id: 'masturbate',      label: 'masturbate',       emoji: '🍆', category: 'health' },
  { id: 'nap',             label: 'nap',              emoji: '😴', category: 'health' },
  { id: 'int_w_family',    label: 'int w family',     emoji: '👨‍👩‍👧‍👦', category: 'social' },
  { id: 'remove_patches',  label: 'remove patches',   emoji: '🩹', category: 'health' },
  { id: 'sleep',           label: 'sleep',            emoji: '🛏️', category: 'health' },
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

const JOURNAL_TEMPLATES = [
  {
    id: 'gratitude',
    name: 'gratitude',
    emoji: '🙏',
    description: 'focus on what you\'re thankful for',
    prompts: ['what are 3 things you\'re grateful for today?', 'who made a positive impact on your day?', 'what small joy did you experience?'],
  },
  {
    id: 'reflection',
    name: 'daily reflection',
    emoji: '🪞',
    description: 'reflect on your day',
    prompts: ['what was the highlight of your day?', 'what challenged you today?', 'what did you learn about yourself?'],
  },
  {
    id: 'goals',
    name: 'goal setting',
    emoji: '🎯',
    description: 'plan and track your goals',
    prompts: ['what\'s your main goal for tomorrow?', 'what\'s one step you can take toward a bigger goal?', 'what\'s holding you back?'],
  },
  {
    id: 'emotional',
    name: 'emotional check-in',
    emoji: '💭',
    description: 'explore your feelings',
    prompts: ['what emotion is most present for you?', 'where do you feel this emotion in your body?', 'what triggered this feeling?'],
  },
  {
    id: 'creative',
    name: 'creative flow',
    emoji: '✨',
    description: 'unleash your creativity',
    prompts: ['if you could do anything right now, what would it be?', 'describe a perfect imaginary place', 'what\'s a crazy idea you\'ve had lately?'],
  },
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
  { id: 'first_entry', name: 'first step', description: 'wrote your first journal entry', icon: '🌱', category: 'milestone' },
  { id: 'week_streak', name: 'week warrior', description: '7 day journaling streak', icon: '🔥', category: 'consistency' },
  { id: 'month_streak', name: 'month master', description: '30 day journaling streak', icon: '👑', category: 'consistency' },
  { id: 'ten_entries', name: 'dedicated', description: 'wrote 10 journal entries', icon: '📖', category: 'milestone' },
  { id: 'fifty_entries', name: 'committed', description: 'wrote 50 journal entries', icon: '⭐', category: 'milestone' },
  { id: 'hundred_entries', name: 'veteran', description: 'wrote 100 journal entries', icon: '🏆', category: 'milestone' },
  { id: 'mood_tracker', name: 'mood master', description: 'logged mood for 7 days straight', icon: '🎭', category: 'wellness' },
  { id: 'emotion_explorer', name: 'emotion explorer', description: 'used 10 different emotions', icon: '🎨', category: 'exploration' },
  { id: 'activity_pro', name: 'activity pro', description: 'completed 20 activities in one day', icon: '⚡', category: 'productivity' },
  { id: 'word_warrior', name: 'word warrior', description: 'wrote 500 words in one entry', icon: '✍️', category: 'creativity' },
  { id: 'level_5', name: 'rising star', description: 'reached level 5', icon: '🌟', category: 'progression' },
  { id: 'level_10', name: 'dedicated journaler', description: 'reached level 10', icon: '💫', category: 'progression' },
  { id: 'perfect_week', name: 'perfect week', description: 'journaled every day for a week', icon: '💎', category: 'consistency' },
  { id: 'goal_crusher', name: 'goal crusher', description: 'completed 10 daily goals', icon: '🎯', category: 'productivity' },
  { id: 'tag_master', name: 'tag master', description: 'used 20 different tags', icon: '🏷️', category: 'exploration' },
  { id: 'xp_1000', name: 'xp challenger', description: 'earned 1000 xp', icon: '💎', category: 'progression' },
  { id: 'xp_5000', name: 'xp master', description: 'earned 5000 xp', icon: '🌈', category: 'progression' },
  { id: 'streak_14', name: 'fortnight focus', description: '14 day streak', icon: '💪', category: 'consistency' },
  { id: 'streak_60', name: 'two month champion', description: '60 day streak', icon: '🏅', category: 'consistency' },
  { id: 'streak_100', name: 'century writer', description: '100 day streak', icon: '👑', category: 'consistency' },
  { id: 'gratitude_guru', name: 'gratitude guru', description: 'logged 50 gratitude entries', icon: '🙏', category: 'wellness' },
  { id: 'night_owl', name: 'night owl', description: 'journaled after 10pm 10 times', icon: '🦉', category: 'exploration' },
  { id: 'early_bird', name: 'early bird', description: 'journaled before 7am 10 times', icon: '🐦', category: 'exploration' },
  { id: 'template_master', name: 'template master', description: 'used all journal templates', icon: '📋', category: 'exploration' },
  { id: 'breathing_master', name: 'breathing master', description: 'completed 10 breathing sessions', icon: '🧘', category: 'wellness' },
  { id: 'photo_journalist', name: 'photo journalist', description: 'added 10 photos to entries', icon: '📸', category: 'creativity' },
  { id: 'voice_memoir', name: 'voice memoir', description: 'recorded 10 voice memos', icon: '🎙️', category: 'creativity' },
  { id: 'social_butterfly', name: 'social butterfly', description: 'logged 20 social activities', icon: '🦋', category: 'social' },
  { id: 'health_hero', name: 'health hero', description: 'logged 50 health activities', icon: '❤️', category: 'wellness' },
  { id: 'creative_spark', name: 'creative spark', description: 'logged 30 creative activities', icon: '✨', category: 'creativity' },
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
  GRATITUDE_COUNT: 'pkm:journal:gratitude_count',
  WEEKLY_REVIEW: 'pkm:journal:weekly_review',
  TEMPLATES_USED: 'pkm:journal:templates_used',
  ENTRY_TIMES: 'pkm:journal:entry_times',
  PHOTOS_COUNT: 'pkm:journal:photos_count',
  VOICE_MEMOS_COUNT: 'pkm:journal:voice_memos_count',
  LONGEST_STREAK: 'pkm:journal:longest_streak',
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

function getWeekStart(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff)).toLocaleDateString('en-CA');
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

function getMoodValue(moodId: string): number {
  return MOODS.find(m => m.id === moodId)?.value || 3;
}

function calculateAverageMood(entries: JournalRecord[]): number {
  const moodEntries = entries.filter(e => e.mood);
  if (moodEntries.length === 0) return 0;
  const sum = moodEntries.reduce((acc, e) => acc + getMoodValue(e.mood!), 0);
  return Number((sum / moodEntries.length).toFixed(1));
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
  const [cycles, setCycles] = useState(0);

  const getCounts = () => technique === '4-7-8' 
    ? { inhale: 4, hold: 7, exhale: 8, hold2: 0 } 
    : { inhale: 4, hold: 4, exhale: 4, hold2: 4 };

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
                setCycles(c => c + 1);
                return counts.inhale;
              }
            } else if (phase === 'hold2') {
              setPhase('inhale');
              setCycles(c => c + 1);
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
    const newSessions = sessions + 1;
    setSessions(newSessions);
    const history = getStoredData(STORAGE_KEYS.BREATHING_HISTORY, [] as { date: string; sessions: number }[]);
    const today = getToday();
    const existing = history.find(h => h.date === today);
    if (existing) {
      existing.sessions += 1;
    } else {
      history.push({ date: today, sessions: 1 });
    }
    setStoredData(STORAGE_KEYS.BREATHING_HISTORY, history);
    toast.success(`breathing session complete! ${cycles} cycles`);
  };

  const circleSize = phase === 'inhale' ? 160 : phase === 'hold' || phase === 'hold2' ? 160 : 100;
  const phaseText = phase === 'inhale' ? 'breathe in' : phase === 'hold' ? 'hold' : phase === 'hold2' ? 'hold' : 'breathe out';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-80 text-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white"><X size={18} /></button>
        <p className="text-xs text-white/40 lowercase mb-2">breathing exercise</p>
        
        <div className="flex justify-center gap-2 mb-4">
          <button 
            onClick={() => { setTechnique('4-7-8'); setCount(4); setPhase('inhale'); setCycles(0); }}
            className={cn("px-3 py-1 rounded-full text-xs lowercase", technique === '4-7-8' ? "bg-blue-600" : "bg-white/10")}
          >
            4-7-8
          </button>
          <button 
            onClick={() => { setTechnique('box'); setCount(4); setPhase('inhale'); setCycles(0); }}
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
        
        <div className="flex justify-center gap-4 mt-4 text-xs text-white/30 lowercase">
          <span>cycles: {cycles}</span>
          <span>sessions today: {sessions}</span>
        </div>
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
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white"><X size={18} /></button>
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
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-pulse" />
      <div className="relative bg-[#0a0a0a] border-2 border-yellow-500/50 rounded-2xl p-8 text-center animate-bounce shadow-2xl shadow-yellow-500/20">
        <p className="text-xs text-yellow-400 lowercase mb-2 tracking-wider">achievement unlocked!</p>
        <span className="text-6xl mb-4 block animate-pulse">{achievement.icon}</span>
        <p className="text-xl font-bold text-white lowercase mb-1">{achievement.name}</p>
        <p className="text-sm text-white/60 lowercase">{achievement.description}</p>
        <div className="mt-4 flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <span key={i} className="text-yellow-400 animate-pulse" style={{ animationDelay: `${i * 100}ms` }}>✦</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  weekly review component
// ─────────────────────────────────────────────

function WeeklyReviewModal({ isOpen, onClose, entries }: { isOpen: boolean; onClose: () => void; entries: JournalRecord[] }) {
  const weekStart = getWeekStart();
  const weekEntries = useMemo(() => {
    const start = new Date(weekStart);
    return entries.filter(e => new Date(e.date) >= start);
  }, [entries, weekStart]);

  const stats = useMemo(() => {
    const moods = weekEntries.filter(e => e.mood).map(e => getMoodValue(e.mood!));
    const avgMood = moods.length > 0 ? (moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1) : '0';
    const bestDay = weekEntries.filter(e => e.mood === '6' || e.mood === '5').length;
    const activities = weekEntries.reduce((acc, e) => acc + parseActivities(e.activities).length, 0);
    return { avgMood, entryCount: weekEntries.length, bestDay, activities };
  }, [weekEntries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-96 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white"><X size={18} /></button>
        <p className="text-xs text-white/40 lowercase mb-1">weekly review</p>
        <p className="text-lg font-bold text-white lowercase mb-4">this week in review</p>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <span className="text-2xl font-bold text-blue-400">{stats.entryCount}</span>
            <p className="text-xs text-white/40 lowercase">entries</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <span className="text-2xl font-bold text-green-400">{stats.avgMood}</span>
            <p className="text-xs text-white/40 lowercase">avg mood</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <span className="text-2xl font-bold text-yellow-400">{stats.bestDay}</span>
            <p className="text-xs text-white/40 lowercase">great days</p>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.03] text-center">
            <span className="text-2xl font-bold text-purple-400">{stats.activities}</span>
            <p className="text-xs text-white/40 lowercase">activities</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-white/40 lowercase">reflection prompts</p>
          {[
            "what was your biggest win this week?",
            "what challenged you the most?",
            "what are you looking forward to next week?",
            "how can you improve next week?",
          ].map((prompt, i) => (
            <div key={i} className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-sm text-white/70 lowercase">{prompt}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  template selector component
// ─────────────────────────────────────────────

function TemplateSelector({ isOpen, onClose, onSelect }: { isOpen: boolean; onClose: () => void; onSelect: (template: typeof JOURNAL_TEMPLATES[0]) => void }) {
  const [templatesUsed, setTemplatesUsed] = useState<string[]>(() => 
    getStoredData(STORAGE_KEYS.TEMPLATES_USED, [])
  );

  const handleSelect = (template: typeof JOURNAL_TEMPLATES[0]) => {
    if (!templatesUsed.includes(template.id)) {
      const updated = [...templatesUsed, template.id];
      setTemplatesUsed(updated);
      setStoredData(STORAGE_KEYS.TEMPLATES_USED, updated);
    }
    onSelect(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-96 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-white/40 hover:text-white"><X size={18} /></button>
        <p className="text-xs text-white/40 lowercase mb-1">journal templates</p>
        <p className="text-lg font-bold text-white lowercase mb-4">choose a template</p>
        
        <div className="space-y-3">
          {JOURNAL_TEMPLATES.map(template => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{template.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white lowercase">{template.name}</p>
                  <p className="text-xs text-white/40 lowercase">{template.description}</p>
                </div>
                {templatesUsed.includes(template.id) && <span className="text-green-400 text-xs">✓</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
