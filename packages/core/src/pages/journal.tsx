import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useJournalData } from '@/hooks/use-journal-data';
import { ActivitiesPanel, type Activity } from '@/components/ActivitiesPanel';
import { MedicationTracker } from '@/components/MedicationTracker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { OllamaClient } from '@/api/ollama-client';
import { type JournalRecord, parseActivities } from '@/schema/journal-collection';
import { Sparkles, Mic, Image, BarChart2, Heart, Zap, Target, Award, BookOpen, History, Wind, Clock, Download, Bell, Plus, X, ChevronLeft, ChevronRight, Search, Filter, Edit2, Trash2, FileText, ShowerHead, CalendarDays, CheckSquare, TrendingUp, Snowflake, Loader2, Medal, LayoutDashboard, GitGraph, Database } from 'lucide-react';
import { PushToTalkWidget } from '@/components/push-to-talk-widget';
import { ShowerLoggerModal } from '@/components/shower-logger-modal';

// Lazy-load heavy dependencies to reduce initial bundle size
const ReactQuill = lazy(async () => {
  const m = await import('react-quill-new');
  return { default: m.default };
});
const RechartsModule = lazy(() => import('@/components/journal/recharts-wrapper'));

// override focus/accent for journal buttons so color comes from the element itself
const journalStyles = `
  .journal-mood-btn:focus, .journal-emotion-btn:focus {
    outline: none !important;
    box-shadow: 0 0 0 2px currentColor !important;
  }

  .journal-editor .ql-editor {
    padding-bottom: 0 !important;
  }

  .journal-editor .ql-picker-options {
    background-color: #050505 !important;
    border-color: rgba(255,255,255,0.1) !important;
  }

  .journal-editor .ql-picker-label,
  .journal-editor .ql-picker-item {
    color: white !important;
  }

  .journal-editor .ql-picker-item::before,
  .journal-editor .ql-picker-label::before {
    text-transform: lowercase !important;
  }

  .journal-editor .ql-snow .ql-picker.ql-header .ql-picker-label::before,
  .journal-editor .ql-snow .ql-picker.ql-header .ql-picker-item::before,
  .journal-editor .ql-picker.ql-header .ql-picker-label::before,
  .journal-editor .ql-picker.ql-header .ql-picker-item::before {
    text-transform: lowercase !important;
  }

  .journal-editor .ql-picker.ql-expanded .ql-picker-label {
    color: white !important;
  }
`;

const JOURNAL_QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    ['link'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean'],
  ],
};

const JOURNAL_QUILL_FORMATS = [
  'header', 'bold', 'italic', 'underline', 'link', 'list', 'clean',
];

const styleEl = document.createElement('style');
styleEl.textContent = journalStyles;
document.head.appendChild(styleEl);

function normalizeJournalBody(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '<p><br></p>' || trimmed === '<p></p>') {
    return '';
  }

  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = trimmed;

    container.querySelectorAll('.ql-ui').forEach(node => node.remove());
    container.querySelectorAll('li').forEach(item => {
      const text = (item.textContent || '').replace(/\u00a0/g, ' ').trim();
      const hasRichContent = item.querySelector('img, video, iframe, embed, object, table, pre, blockquote');
      if (!text && !hasRichContent) {
        item.remove();
      }
    });
    container.querySelectorAll('ol, ul').forEach(list => {
      if (!list.querySelector('li')) {
        list.remove();
      }
    });

    const plainText = (container.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const hasRichContent = Boolean(container.querySelector('img, video, iframe, embed, object, table, pre, blockquote'));

    if (!plainText && !hasRichContent) {
      return '';
    }

    return container.innerHTML.trim();
  }

  const normalized = trimmed
    .replace(/<span class="ql-ui"[^>]*><\/span>/gi, '')
    .replace(/<(ol|ul)>\s*<li[^>]*>\s*(<br\s*\/?>|&nbsp;|\s)*<\/li>\s*<\/\1>/gi, '')
    .trim();

  return normalized === '<p><br></p>' || normalized === '<p></p>' ? '' : normalized;
}

function getJournalPlainText(value: string): string {
  const normalized = normalizeJournalBody(value);
  if (!normalized) return '';

  if (typeof document !== 'undefined') {
    const container = document.createElement('div');
    container.innerHTML = normalized;
    return (container.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return normalized
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
//  constants
// ─────────────────────────────────────────────

// colors
const Y = '#f5af12';
const B = '#3c9fdd';
const G = '#22c55e';

// xp system
const XP_PER_ENTRY = 10;
const XP_STREAK_BONUS = 5;
const XP_WORD_GOAL = 5;
const AUTO_SAVE_INTERVAL = 30000;
const DRAFT_RESTORE_HOURS = 24;

// intervals
const BREATHING_INTERVAL_MS = 1000;
const TIMER_INTERVAL_MS = 1000;

// thresholds
const MIN_WORDS_FOR_PREDICTION = 20;
const MIN_DRAFT_HOURS = 24;
const VOICE_MEMO_THRESHOLD = 10;
const MIN_EMOTIONS_FOR_GOAL = 3;
const MIN_ACTIVITIES_FOR_GOAL = 3;
const MIN_CHARS_FOR_GOAL = 50;
const WORD_GOAL = 100;
const WORD_WARRIOR_THRESHOLD = 500;

const MOODS = [
  { id: '0', label: 'terrible', emoji: '/images/moods/terrible.png', color: '#ef4444', value: 1 },
  { id: '1', label: 'bad',      emoji: '/images/moods/bad.png', color: '#f97316', value: 2 },
  { id: '2', label: 'fine',     emoji: '/images/moods/fine.png', color: '#eab308', value: 3 },
  { id: '4', label: 'good',     emoji: '/images/moods/good.png', color: '#22c55e', value: 4 },
  { id: '5', label: 'great',    emoji: '/images/moods/great.png', color: '#06b6d4', value: 5 },
  { id: '6', label: 'amazing!', emoji: '/images/moods/amazing.png', color: '#8b5cf6', value: 6 },
];

const INITIAL_EMOTIONS = [
  'elated','ecstatic','exhilarated','euphoric','horny','inspired','empowered',
  'determined','focused','motivated','playful','ambitious','adventurous',
  'confident','content','peaceful','grateful','connected','relaxed','grounded',
  'nostalgic','sentimental','sleepy','bored','uninterested','dull','distracted',
  'exhausted','unmotivated','sad','depressed','miserable','insecure','lonely',
  'embarrassed','jealous','guilty','frustrated','angry','anxious','overwhelmed',
  'infuriated' // new emotion added from nocobase list
];

const DEFAULT_ACTIVITIES = [
  { id: 'take_pills',      label: 'take pills',      emoji: '💊', category: 'health', color: '#f5af12' },
  { id: 'put_patches_on',  label: 'put patches on',  emoji: '🩹', category: 'health', color: '#f5af12' },
  { id: 'water_floss',     label: 'water floss',     emoji: '🚿', category: 'health', color: '#3c9fdd' },
  { id: 'brush_teeth',     label: 'brush teeth',      emoji: '🦷', category: 'health', color: '#3c9fdd' },
  { id: 'wash_face',       label: 'wash face',       emoji: '🧴', category: 'health', color: '#3c9fdd' },
  { id: 'nail_care',       label: 'nail care',       emoji: '💅', category: 'health', color: '#ff00ff' },
  { id: 'body_wipe',       label: 'body wipe',        emoji: '🧻', category: 'health', color: '#ffffff' },
  { id: 'shower',          label: 'shower',          emoji: '🚿', category: 'health', color: '#3c9fdd' },
  { id: 'journal_plan_write', label: 'journal/plan/write', emoji: '📝', category: 'productivity', color: '#32cd32' },
  { id: 'tidy',            label: 'tidy',            emoji: '🧹', category: 'productivity', color: '#ffffff' },
  { id: 'worship',         label: 'worship',         emoji: '🙏', category: 'wellness', color: '#f5af12' },
  { id: 'laundry',         label: 'laundry',         emoji: '👕', category: 'productivity', color: '#ffffff' },
  { id: 'go_outside',      label: 'go outside',      emoji: '🚪', category: 'wellness', color: '#008000' },
  { id: 'leave_house',     label: 'leave house',     emoji: '🏠', category: 'wellness', color: '#32cd32' },
  { id: 'online_social_int', label: 'online social int', emoji: '💬', category: 'social', color: '#f5af12' },
  { id: 'eat_meal',        label: 'eat meal',         emoji: '🍽️', category: 'health', color: '#ff4500' },
  { id: 'draw',            label: 'draw',            emoji: '✏️', category: 'creative', color: '#f5af12' },
  { id: 'vibecode',        label: 'vibecode',         emoji: '💻', category: 'creative', color: '#800080' },
  { id: 'paint',           label: 'paint',            emoji: '🎨', category: 'creative', color: '#ff00ff' },
  { id: 'play_a_game',     label: 'play a game',      emoji: '🎮', category: 'leisure', color: '#008000' },
  { id: 'llm_rp',          label: 'llm rp',          emoji: '🤖', category: 'creative', color: '#ffffff' },
  { id: 'llm_int',         label: 'llm int',          emoji: '💬', category: 'creative', color: '#ffffff' },
  { id: 'watch_content',   label: 'watch content',    emoji: '📺', category: 'leisure', color: '#3c9fdd' },
  { id: 'masturbate',      label: 'masturbate',       emoji: '🍆', category: 'health', color: '#ff00ff' },
  { id: 'nap',             label: 'nap',              emoji: '😴', category: 'health', color: '#f5af12' },
  { id: 'int_w_family',    label: 'int w family',     emoji: '👨‍👩‍👧‍👦', category: 'social', color: '#32cd32' },
  { id: 'remove_patches',  label: 'remove patches',   emoji: '🩹', category: 'health', color: '#ff0000' },
  { id: 'sleep',           label: 'sleep',            emoji: '🛏️', category: 'health', color: '#800080' },
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
  // comfort & self-compassion
  { text: "you are enough, exactly as you are.", author: "unknown" },
  { text: "be gentle with yourself. you're doing the best you can.", author: "unknown" },
  { text: "it's okay to not be okay. this feeling is temporary.", author: "unknown" },
  { text: "you don't have to be perfect to be worthy of love.", author: "unknown" },
  { text: "rest is not a reward. it's a necessary part of being human.", author: "unknown" },
  { text: "your best is enough. even on hard days.", author: "unknown" },
  { text: "healing takes time. be patient with your journey.", author: "unknown" },
  { text: "you are allowed to take up space. you are allowed to exist.", author: "unknown" },
  { text: "softness is not weakness. it's strength in its most honest form.", author: "unknown" },
  { text: "you matter. your feelings matter. your story matters.", author: "unknown" },
  // motivation & growth
  { text: "progress, not perfection.", author: "unknown" },
  { text: "small steps lead to big changes.", author: "unknown" },
  { text: "every day is a fresh start.", author: "unknown" },
  { text: "you are growing, even when it doesn't feel like it.", author: "unknown" },
  { text: "courage doesn't mean not being afraid. it means showing up anyway.", author: "brene brown" },
  { text: "the only way out is through. you've survived 100% of your bad days.", author: "unknown" },
  { text: "your future self is thanking you for not giving up today.", author: "unknown" },
  { text: "discipline is choosing between what you want now and what you want most.", author: "abraham lincoln" },
  { text: "fall seven times, stand up eight.", author: "japanese proverb" },
  { text: "you don't have to see the whole staircase, just take the first step.", author: "martin luther king jr" },
  // inspiration & purpose
  { text: "your presence is a gift to this world.", author: "unknown" },
  { text: "the world needs your unique light. don't hide it.", author: "unknown" },
  { text: "you are capable of amazing things.", author: "unknown" },
  { text: "what lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "ralph waldo emerson" },
  { text: "believe you can and you're halfway there.", author: "theodore roosevelt" },
  { text: "the only person you are destined to become is the person you decide to be.", author: "ralph waldo emerson" },
  { text: "act as if what you do makes a difference. it does.", author: "william james" },
  { text: "success is not final, failure is not fatal: it is the courage to continue that counts.", author: "winston churchill" },
  { text: "happiness is not something ready-made. it comes from your own actions.", author: "dalai lama" },
  { text: "the best time to plant a tree was 20 years ago. the second best time is now.", author: "chinese proverb" },
  // mindfulness & presence
  { text: "this moment is enough. you are enough. right here, right now.", author: "unknown" },
  { text: "breathe. it's just a bad day, not a bad life.", author: "unknown" },
  { text: "you cannot pour from an empty cup. take care of yourself first.", author: "unknown" },
  { text: "worrying does not take away tomorrow's troubles. it takes away today's peace.", author: "unknown" },
  { text: "the present moment is the only moment available to us.", author: "thich nhat hanh" },
  { text: "peace comes from within. do not seek it without.", author: "buddha" },
  { text: "almost everything will work again if you unplug it for a few minutes, including you.", author: "anne lamott" },
  { text: "taking care of yourself is productive.", author: "unknown" },
  // resilience & strength
  { text: "you are stronger than you know. you've survived every hard day so far.", author: "unknown" },
  { text: "scars are just tattoos with better stories.", author: "unknown" },
  { text: "the oak fought the wind and was broken, the willow bent when it must and survived.", author: "robert jordan" },
  { text: "rock bottom became the solid foundation on which i rebuilt my life.", author: "j.k. rowling" },
  { text: "life is 10% what happens to you and 90% how you react to it.", author: "charles swindoll" },
  { text: "tough times never last, but tough people do.", author: "robert schuller" },
  // hope & optimism
  { text: "after every storm, the sun will smile.", author: "unknown" },
  { text: "hope is being able to see that there is light despite all of the darkness.", author: "desmond tutu" },
  { text: "no matter how long the winter, spring is sure to follow.", author: "proverb" },
  { text: "the darkest hour has only sixty minutes.", author: "morris mandel" },
  { text: "keep your face always toward the sunshine—and shadows will fall behind you.", author: "walt whitman" },
  { text: "every moment is a fresh beginning.", author: "t.s. eliot" },
  // self-worth & validation
  { text: "your value doesn't decrease based on someone's inability to see your worth.", author: "unknown" },
  { text: "you are not a drop in the ocean. you are the entire ocean in a drop.", author: "rumi" },
  { text: "comparison is the thief of joy. your journey is uniquely yours.", author: "theodore roosevelt" },
  { text: "don't let yesterday take up too much of today.", author: "will rogers" },
  { text: "you yourself, as much as anybody in the entire universe, deserve your love and affection.", author: "buddha" },
  { text: "to love oneself is the beginning of a lifelong romance.", author: "oscar wilde" },
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
  { id: 'audio_transcriber', name: 'audio transcriber', description: 'used voice transcription to generate a summary', icon: '🎧', category: 'creativity' },
  { id: 'weekly_summary', name: 'weekly philosopher', description: 'generated an ai summary of the week', icon: '📜', category: 'insights' },
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
  DAILY_GOAL_LOG: 'pkm:journal:daily_goal_log',
  TAGS: 'pkm:journal:tags',
  TAG_COLORS: 'pkm:journal:tag_colors',
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
  const d = new Date();
  if (d.getHours() >= 0 && d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  return d.toLocaleDateString('en-CA');
}

function getYesterday(): string {
  const d = new Date();
  if (d.getHours() >= 0 && d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
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
    { label: '5 min', value: 300 },
    { label: '10 min', value: 600 },
    { label: '15 min', value: 900 },
    { label: '30 min', value: 1800 },
    { label: '1 hr', value: 3600 },
    { label: '2 hrs', value: 7200 },
    { label: '6 hrs', value: 21600 },
    { label: '12 hrs', value: 43200 },
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && !isPaused && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      // defer state update to avoid calling setState synchronously in effect
      setTimeout(() => setIsActive(false), 0);
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

function WeeklyReviewModal({ isOpen, onClose, entries, onSummaryGenerated }: { isOpen: boolean; onClose: () => void; entries: JournalRecord[]; onSummaryGenerated?: () => void }) {
  const weekStart = getWeekStart();
  const [summary, setSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
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


  const generateWeeklySummary = async () => {
    if (weekEntries.length === 0) return;
    const key = `weekly_summary_${weekStart}`;
    setIsSummarizing(true);
    try {
      const ollama = new OllamaClient();
      const text = weekEntries.map(e => e.body || '').join('\\n---\\n');
      const prompt = `summarize these journal entries in a few sentences, highlighting mood trends and key events:
${text}`;
      const result = await ollama.ask(prompt);
      setSummary(result);
      localStorage.setItem(key, result);
      if (onSummaryGenerated) {
        onSummaryGenerated();
      }
    } catch (err) {
      console.error('weekly summary failed', err);
    } finally {
      setIsSummarizing(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const key = `weekly_summary_${weekStart}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      setSummary(cached);
    } else {
      generateWeeklySummary();
    }
  }, [isOpen, weekEntries, weekStart]);


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


// ─────────────────────────────────────────────
//  stats charts component
// ─────────────────────────────────────────────

interface StatsChartsProps {
  entries: JournalRecord[];
  activityCatalog?: Activity[];
}

function StatsCharts({ entries, activityCatalog = DEFAULT_ACTIVITIES }: StatsChartsProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [chartType, setChartType] = useState<'trend' | 'mood' | 'activities' | 'emotions' | 'correlations' | 'timing'>('trend');

  const filteredEntries = useMemo(() => {
    if (timeRange === 'all') return entries;
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === 'week') cutoff.setDate(now.getDate() - 7);
    else if (timeRange === 'month') cutoff.setDate(now.getDate() - 30);
    else cutoff.setDate(now.getDate() - 365);
    return entries.filter(e => new Date(e.date) >= cutoff);
  }, [entries, timeRange]);

  return (
    <Suspense fallback={<div className="text-center text-white/30 lowercase text-sm py-8">loading charts...</div>}>
      <StatsChartsContent
        entries={entries}
        activityCatalog={activityCatalog}
        timeRange={timeRange}
        setTimeRange={setTimeRange}
        chartType={chartType}
        setChartType={setChartType}
        filteredEntries={filteredEntries}
      />
    </Suspense>
  );
}

function StatsChartsContent({
  entries,
  activityCatalog = DEFAULT_ACTIVITIES,
  timeRange,
  setTimeRange,
  chartType,
  setChartType,
  filteredEntries,
}: StatsChartsProps & {
  timeRange: 'week' | 'month' | 'year' | 'all';
  setTimeRange: (r: 'week' | 'month' | 'year' | 'all') => void;
  chartType: 'trend' | 'mood' | 'activities' | 'emotions' | 'correlations' | 'timing';
  setChartType: (t: 'trend' | 'mood' | 'activities' | 'emotions' | 'correlations' | 'timing') => void;
  filteredEntries: JournalRecord[];
}) {
  const {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
  } = RechartsModule as any;

  const moodTrendData = useMemo(() => {
    const sorted = [...filteredEntries].filter(e => e.mood).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return sorted.map(e => ({
      date: formatDate(e.date),
      mood: getMoodValue(e.mood!),
      fullDate: e.date,
    }));
  }, [filteredEntries]);

  const emotionFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    filteredEntries.forEach(e => {
      try {
        const emos = JSON.parse((e as any).emotions || '[]');
        emos.forEach((em: string) => { freq[em] = (freq[em] || 0) + 1; });
      } catch (e) { console.warn('Failed to parse emotions JSON:', e); }
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [filteredEntries]);

  const activityBreakdown = useMemo(() => {
    const activityLookup = new Map(activityCatalog.map(a => [a.id, a]));
    const freq: Record<string, number> = {};
    filteredEntries.forEach(e => {
      const acts = parseActivities(e.activities);
      acts.forEach((a: string) => { freq[a] = (freq[a] || 0) + 1; });
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => {
      const act = activityLookup.get(name) ?? DEFAULT_ACTIVITIES.find(a => a.id === name);
      return { name: act?.label || name, value };
    });
  }, [filteredEntries, activityCatalog]);

  const moodDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    filteredEntries.filter(e => e.mood).forEach(e => {
      const label = MOODS.find(m => m.id === e.mood)?.label || 'unknown';
      dist[label] = (dist[label] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [filteredEntries]);

  const moodByDayOfWeek = useMemo(() => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const dayMoods: Record<string, number[]> = {};
    days.forEach(d => dayMoods[d] = []);
    
    filteredEntries.filter(e => e.mood).forEach(e => {
      const day = days[new Date(e.date).getDay()];
      dayMoods[day].push(getMoodValue(e.mood!));
    });
    
    return days.map(day => ({
      day,
      avg: dayMoods[day].length > 0 
        ? Number((dayMoods[day].reduce((a, b) => a + b, 0) / dayMoods[day].length).toFixed(1))
        : 0
    }));
  }, [filteredEntries]);

  const MOOD_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];

  const averageMood = useMemo(() => calculateAverageMood(filteredEntries), [filteredEntries]);
  const totalEntries = filteredEntries.length;
  const longestStreak = getStoredData(STORAGE_KEYS.LONGEST_STREAK, 0);

  return (
    <div className="space-y-4">
      {/* summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-white/[0.03] text-center">
          <span className="text-lg font-bold text-blue-400">{totalEntries}</span>
          <p className="text-[10px] text-white/40 lowercase">entries</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] text-center">
          <span className="text-lg font-bold text-green-400">{averageMood}</span>
          <p className="text-[10px] text-white/40 lowercase">avg mood</p>
        </div>
        <div className="p-2 rounded-lg bg-white/[0.03] text-center">
          <span className="text-lg font-bold text-yellow-400">{longestStreak}</span>
          <p className="text-[10px] text-white/40 lowercase">best streak</p>
        </div>
      </div>

      {/* time range selector */}
      <div className="flex justify-center gap-1 flex-wrap">
        {(['week', 'month', 'year', 'all'] as const).map(r => (
          <button
            key={r}
            onClick={() => setTimeRange(r)}
            className={cn("px-2 py-1 rounded-full text-[10px] lowercase", timeRange === r ? "bg-blue-600" : "bg-white/10")}
          >
            {r}
          </button>
        ))}
      </div>

      {/* chart type selector */}
      <div className="flex justify-center gap-1 flex-wrap">
        {[
          { id: 'trend', label: 'trend', icon: TrendingUp },
          { id: 'mood', label: 'moods', icon: Heart },
          { id: 'activities', label: 'activities', icon: Zap },
          { id: 'emotions', label: 'emotions', icon: Sparkles },
          { id: 'correlations', label: 'correlations', icon: Zap },
          { id: 'timing', label: 'timing', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setChartType(id as any)}
            className={cn(
              "px-2 py-1 rounded-full text-[10px] lowercase flex items-center gap-1",
              chartType === id ? "bg-purple-600" : "bg-white/10"
            )}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      {/* trend chart */}
      {chartType === 'trend' && moodTrendData.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">mood trend</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={moodTrendData}>
                <defs>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={B} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={B} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis domain={[0, 6]} ticks={[1, 2, 3, 4, 5, 6]} stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Area type="monotone" dataKey="mood" stroke={B} strokeWidth={2} fill="url(#moodGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* mood by day of week */}
      {chartType === 'trend' && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">mood by day</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={moodByDayOfWeek}>
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis domain={[0, 6]} stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="avg" fill={Y} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* emotions chart */}
      {chartType === 'emotions' && emotionFrequency.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">top emotions</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionFrequency} layout="vertical">
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <YAxis type="category" dataKey="name" width={70} stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill={Y} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* activities pie chart */}
      {chartType === 'activities' && activityBreakdown.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">activities</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  dataKey="value"
                  nameKey="name"
                  label={({ name }) => (name ?? '').length > 8 ? (name ?? '').slice(0, 8) + '...' : name ?? ''}
                  labelLine={false}
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

      {/* mood distribution */}
      {chartType === 'mood' && moodDistribution.length > 0 && (
        <div>
          <p className="text-xs text-white/40 lowercase mb-2">mood distribution</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={moodDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                >
                  {moodDistribution.map((entry, i) => {
                    const moodColor = MOODS.find(m => m.label === entry.name)?.color || MOOD_COLORS[i % MOOD_COLORS.length];
                    return <Cell key={i} fill={moodColor} />;
                  })}
                </Pie>
                <Tooltip 
                  contentStyle={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend fontSize={9} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {filteredEntries.length === 0 && (
        <p className="text-center text-white/30 lowercase text-sm py-8">no data for this period</p>
      )}

      {/* mood-activity correlations */}
      {chartType === 'correlations' && (
        <MoodActivityCorrelation entries={filteredEntries} activityCatalog={activityCatalog} />
      )}

      {/* time insights */}
      {chartType === 'timing' && (
        <TimeInsights entries={filteredEntries} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
//  gratitude tracker component
// ─────────────────────────────────────────────

function GratitudeTracker() {
  const [gratitudes, setGratitudes] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [count, setCount] = useState(() => getStoredData(STORAGE_KEYS.GRATITUDE_COUNT, 0));

  const addGratitude = () => {
    if (!input.trim()) return;
    const newGratitudes = [...gratitudes, input.trim()];
    setGratitudes(newGratitudes);
    const newCount = count + 1;
    setCount(newCount);
    setStoredData(STORAGE_KEYS.GRATITUDE_COUNT, newCount);
    setInput('');
    toast.success('gratitude added! ✨');
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-pink-400" />
          <p className="text-xs text-white/40 lowercase">gratitude tracker</p>
        </div>
        <span className="text-xs text-pink-400">{count} total</span>
      </div>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addGratitude()}
          placeholder="i'm grateful for..."
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
        <button
          onClick={addGratitude}
          className="px-3 py-2 rounded-lg bg-pink-500/20 text-pink-400 hover:bg-pink-500/30"
        >
          <Plus size={16} />
        </button>
      </div>

      {gratitudes.length > 0 && (
        <div className="space-y-2">
          {gratitudes.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-white/70 lowercase">
              <span className="text-pink-400">✦</span>
              {g}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────
//  mood-activity correlation component
// ─────────────────────────────────────────────

interface MoodActivityCorrelationProps {
  entries: JournalRecord[];
  activityCatalog?: Activity[];
}

function MoodActivityCorrelation({ entries, activityCatalog = DEFAULT_ACTIVITIES }: MoodActivityCorrelationProps) {
  const activityLookup = useMemo(() => new Map(activityCatalog.map(a => [a.id, a])), [activityCatalog]);

  const correlations = useMemo(() => {
    const activityMoods: Record<string, number[]> = {};
    
    entries.forEach(entry => {
      if (!entry.mood) return;
      const moodValue = getMoodValue(entry.mood);
      const acts = parseActivities(entry.activities);
      
      acts.forEach(act => {
        if (!activityMoods[act]) activityMoods[act] = [];
        activityMoods[act].push(moodValue);
      });
    });
    
    return Object.entries(activityMoods)
      .map(([activity, moods]) => ({
        activity,
        avgMood: Number((moods.reduce((a, b) => a + b, 0) / moods.length).toFixed(1)),
        count: moods.length,
        activityLabel: activityLookup.get(activity)?.label || activity,
        emoji: activityLookup.get(activity)?.emoji || '✓',
      }))
      .filter(c => c.count >= 3) // only show activities with 3+ occurrences
      .sort((a, b) => b.avgMood - a.avgMood);
  }, [entries, activityLookup]);

  if (correlations.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-white/30 lowercase">log more entries to see correlations</p>
      </div>
    );
  }

  const topPositive = correlations.slice(0, 3);
  const topNegative = correlations.slice(-3).reverse();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-green-400 lowercase mb-2">activities that boost your mood ✨</p>
        <div className="space-y-2">
          {topPositive.map(c => (
            <div key={c.activity} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span>{c.emoji}</span>
                <span className="text-sm text-white/70 lowercase">{c.activityLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">{c.count}×</span>
                <span className="text-sm font-medium text-green-400">{c.avgMood.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-orange-400 lowercase mb-2">activities to be mindful of</p>
        <div className="space-y-2">
          {topNegative.map(c => (
            <div key={c.activity} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span>{c.emoji}</span>
                <span className="text-sm text-white/70 lowercase">{c.activityLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/40">{c.count}×</span>
                <span className="text-sm font-medium text-orange-400">{c.avgMood.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-white/20 lowercase text-center">
        based on average mood when activity is logged
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────
//  mood heatmap component
// ─────────────────────────────────────────────

function MoodHeatmap({ entries, onDayClick }: { entries: JournalRecord[]; onDayClick?: (date: string) => void }) {
  const [year, setYear] = useState(new Date().getFullYear());

  const heatmapData = useMemo(() => {
    const data: Record<string, { mood: string; value: number }> = {};
    entries.forEach(e => {
      if (e.mood) {
        data[e.date] = { mood: e.mood, value: getMoodValue(e.mood) };
      }
    });
    return data;
  }, [entries]);

  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const getColor = (value: number) => {
    if (value === 0) return 'rgba(255,255,255,0.03)';
    if (value <= 2) return `rgba(239, 68, 68, ${0.2 + value * 0.15})`; // red
    if (value === 3) return `rgba(234, 179, 8, ${0.3 + value * 0.1})`; // yellow
    return `rgba(34, 197, 94, ${0.2 + value * 0.12})`; // green
  };

  return (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-white/40 lowercase">mood heatmap</p>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setYear(y => y - 1)}
            className="p-1 rounded hover:bg-white/10 text-white/40"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-white/60">{year}</span>
          <button 
            onClick={() => setYear(y => y + 1)}
            className="p-1 rounded hover:bg-white/10 text-white/40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 pb-2 w-full">
        {months.map((month, monthIdx) => {
          const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
          const firstDay = new Date(year, monthIdx, 1).getDay();
          
          return (
            <div key={month} className="flex flex-col items-center gap-1 w-full">
              <span className="text-[10px] text-white/30 lowercase mb-1">{month}</span>
              <div className="grid grid-cols-7 gap-[2px] w-full">
                {[...Array(firstDay)].map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {[...Array(daysInMonth)].map((_, day) => {
                  const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`;
                  const dayData = heatmapData[dateStr];
                  return (
                    <div
                      key={day}
                      onClick={() => onDayClick?.(dateStr)}
                      className="aspect-square rounded-sm cursor-pointer hover:ring-1 hover:ring-white/30 transition-all"
                      style={{ backgroundColor: getColor(dayData?.value || 0) }}
                      title={dayData ? `${dateStr}: ${MOODS.find(m => m.id === dayData.mood)?.label}` : dateStr}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-3 text-[10px] text-white/30 lowercase">
        <span>less</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(v => (
            <div key={v} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(v) }} />
          ))}
        </div>
        <span>more</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  time insights component
// ─────────────────────────────────────────────

function TimeInsights({ entries }: { entries: JournalRecord[] }) {
  const insights = useMemo(() => {
    const hourMoods: Record<number, number[]> = {};
    const dayMoods: Record<string, number[]> = {};
    
    entries.forEach(e => {
      if (!e.mood) return;
      const moodValue = getMoodValue(e.mood);
      const date = new Date(e.timestamp);
      const hour = date.getHours();
      const day = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      
      if (!hourMoods[hour]) hourMoods[hour] = [];
      hourMoods[hour].push(moodValue);
      
      if (!dayMoods[day]) dayMoods[day] = [];
      dayMoods[day].push(moodValue);
    });
    
    const bestHour = Object.entries(hourMoods)
      .map(([h, m]) => ({ hour: parseInt(h), avg: m.reduce((a, b) => a + b, 0) / m.length }))
      .sort((a, b) => b.avg - a.avg)[0];
      
    const bestDay = Object.entries(dayMoods)
      .map(([d, m]) => ({ day: d, avg: m.reduce((a, b) => a + b, 0) / m.length }))
      .sort((a, b) => b.avg - a.avg)[0];
    
    return { bestHour, bestDay };
  }, [entries]);

  if (!insights.bestHour && !insights.bestDay) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-white/30 lowercase">log more entries for insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {insights.bestHour && (
        <div className="p-3 rounded-lg bg-white/[0.02] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 lowercase">best time to journal</p>
            <p className="text-sm text-white lowercase">
              {insights.bestHour.hour === 0 ? '12am' : insights.bestHour.hour > 12 ? `${insights.bestHour.hour - 12}pm` : `${insights.bestHour.hour}am`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-lg">🌅</span>
            <p className="text-[10px] text-green-400">avg mood {insights.bestHour.avg.toFixed(1)}</p>
          </div>
        </div>
      )}
      
      {insights.bestDay && (
        <div className="p-3 rounded-lg bg-white/[0.02] flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/40 lowercase">best day of week</p>
            <p className="text-sm text-white lowercase">{insights.bestDay.day}</p>
          </div>
          <div className="text-right">
            <span className="text-lg">📅</span>
            <p className="text-[10px] text-green-400">avg mood {insights.bestDay.avg.toFixed(1)}</p>
          </div>
        </div>
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
  const [availableEmotions, setAvailableEmotions] = useState<string[]>(() => {
    const stored = getStoredData(STORAGE_KEYS.CUSTOM_EMOTIONS, [] as string[]);
    return Array.from(new Set([...INITIAL_EMOTIONS, ...stored]));
  });

  // ── state: activities used by the entry form ──
  const [activities, setActivities] = useState<Set<string>>(new Set());
  const [activityQuery, setActivityQuery] = useState('');
  const [availableActivities] = useState(DEFAULT_ACTIVITIES);
  const [activityFilter, setActivityFilter] = useState<string | null>(null);

  // toggle for the habits/activity panel (global tracking)
  const [showActivitiesPanel, setShowActivitiesPanel] = useState(false);

  // journal data hooks - must be called before any derived state that uses habitActivities
  const {
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
    bookmarks,
    pastFilter,
    metadata: entryMeta,
    transcription,
    activities: habitActivities,
    derived,
  } = useJournalData();

  // custom user-created activities (persisted in localStorage)
  const [customActivities, setCustomActivities] = useState<typeof DEFAULT_ACTIVITIES>(() =>
    getStoredData('pkm:journal:custom_activities', [])
  );
  const allHabitActivities = useMemo(
    () => [...habitActivities.list, ...customActivities],
    [habitActivities.list, customActivities]
  );
  const activityCatalog = useMemo(() => {
    const map = new Map<string, (typeof DEFAULT_ACTIVITIES)[number]>();
    [...DEFAULT_ACTIVITIES, ...allHabitActivities].forEach(a => {
      map.set(a.id, a);
    });
    return Array.from(map.values());
  }, [allHabitActivities]);
  const handleCreateActivity = useCallback((activity: { id: string; label: string; emoji: string; category: string; color: string }) => {
    setCustomActivities(prev => {
      const next = [...prev, activity];
      setStoredData('pkm:journal:custom_activities', next);
      return next;
    });
    toast.success(`activity "${activity.label}" created`);
  }, []);
  
  // ── state: notes ──
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // predictions
  const [predictedMood, setPredictedMood] = useState<string | null>(null);
  const [predictedSentiment, setPredictedSentiment] = useState<string | null>(null);
  const [predictedActivities, setPredictedActivities] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [entryCount, setEntryCount] = useState(0);
  const [xp, setXp] = useState(0);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [celebratingAchievement, setCelebratingAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [todayPrompt, setTodayPrompt] = useState(() => DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
  const [todayQuote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [quickMood, setQuickMood] = useState<string | null>(null);
  const [longestStreak, setLongestStreak] = useState(0);
  
  // ── state: daily goals ──
  const [dailyGoals, setDailyGoals] = useState<{id: string; label: string; completed: boolean; icon: string}[]>([
    { id: 'log_mood', label: 'log your mood', completed: false, icon: '😊' },
    { id: 'add_emotions', label: 'add 3+ emotions', completed: false, icon: '💭' },
    { id: 'write_note', label: 'write 50+ characters', completed: false, icon: '✍️' },
    { id: 'complete_activities', label: 'complete 3+ activities', completed: false, icon: '✓' },
    { id: 'voice_summary_goal', label: 'summarize a voice note', completed: false, icon: '📝' },
  ]);
  const [dailyGoalLog, setDailyGoalLog] = useState<Array<{ goalId: string; label: string; completedAt: string }>>(() => {
    const saved = getStoredData(
      STORAGE_KEYS.DAILY_GOAL_LOG,
      { date: getToday(), items: [] as Array<{ goalId: string; label: string; completedAt: string }> }
    );
    return saved.date === getToday() ? saved.items : [];
  });
  
  // ── state: tags ──
  const [tags, setTags] = useState<Set<string>>(new Set());
  const [tagQuery, setTagQuery] = useState('');
  const [availableTags, setAvailableTags] = useState<string[]>(() => 
    getStoredData(STORAGE_KEYS.TAGS, SUGGESTED_TAGS)
  );
  const [tagColors, setTagColors] = useState<Record<string,string>>(() =>
    getStoredData(STORAGE_KEYS.TAG_COLORS, {})
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
  const [showShowerLogger, setShowShowerLogger] = useState(false);
  const [showPastEntries, setShowPastEntries] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // ── state: collapsible section groups ──
  const [showActivityDb, setShowActivityDb] = useState(true);
  const [showProgressSection, setShowProgressSection] = useState(true);
  const [showInsightsSection, setShowInsightsSection] = useState(false);


  // ── state: journal date ──
  const [entryDate, setEntryDate] = useState<string>(getToday());

  // ── state: daily reminder ──
  const [reminderTime, setReminderTime] = useState<string>(() =>
    localStorage.getItem('journal_reminder') || ''
  );
  const [reminderEnabled, setReminderEnabled] = useState<boolean>(!!reminderTime);
  const reminderTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!reminderEnabled || !reminderTime) {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }
      return;
    }
    
    localStorage.setItem("journal_reminder", reminderTime);
    
    const scheduleReminder = () => {
      const now = new Date();
      const [h, m] = reminderTime.split(":").map(Number);
      const next = new Date();
      next.setHours(h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const timeout = next.getTime() - now.getTime();
      
      reminderTimeoutRef.current = setTimeout(() => {
        if (Notification.permission === "granted") {
          new Notification("journal reminder", { body: "time to write your journal!" });
        } else {
          Notification.requestPermission().then(p => {
            if (p === "granted") {
              new Notification("journal reminder", { body: "time to write your journal!" });
            }
          });
        }
        scheduleReminder();
      }, timeout);
    };
    
    scheduleReminder();
    
    return () => {
      if (reminderTimeoutRef.current) {
        clearTimeout(reminderTimeoutRef.current);
        reminderTimeoutRef.current = null;
      }
    };
  }, [reminderEnabled, reminderTime]);
  
  useEffect(() => {
    if (!reminderEnabled) {
      localStorage.removeItem("journal_reminder");
    }
  }, [reminderEnabled]);


  // pull some helpers from bookmarks object
  const { bookmarkedEntries, showBookmarksOnly, setShowBookmarksOnly } = bookmarks;

  const { pastEntriesFilter, setPastEntriesFilter, nlIds, setNlIds, isNlSearching, setIsNlSearching } = pastFilter;

  // metadata helpers pulled from hook
  const {
    selectedTemplate,
    setSelectedTemplate,
    entryTime,
    setEntryTime,
    photos,
    setPhotos,
    voiceMemos,
    setVoiceMemos,
    isRecording,
    setIsRecording,
    recordingTime,
    setRecordingTime,
  } = entryMeta;

  // transcription state from hook
  const {
    isTranscribing,
    setIsTranscribing,
    transcript,
    setTranscript,
    isSummarizingVoice,
    setIsSummarizingVoice,
    transcriptionSummary,
    setTranscriptionSummary,
    recognitionRef,
  } = transcription;

  // local refs still owned by component
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // cleanup speech recognition on unmount (if still used elsewhere)
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore errors during cleanup
        }
      }
    };
  }, []);

  // ── derived state ──
  const entriesByDate = useMemo(() => {
    const map: Record<string, JournalRecord> = {};
    entries.forEach(e => { map[e.date] = e; });
    return map;
  }, [entries]);

  // ── load data ──
  const loadEntries = useCallback(async () => {
    try {
      const res: any = await api.listRecords('journal', { sort: '-date', pageSize: 1000 });
      setEntries(res?.data || []);
    } catch (e) {
      console.error('failed to load journal entries', e);
    }
  }, []);

  useEffect(() => {
    const savedStreak = getStoredData(STORAGE_KEYS.STREAK_DATA, { current: 0, lastDate: '' });
    setStreak(savedStreak.current);
    setLongestStreak(getStoredData(STORAGE_KEYS.LONGEST_STREAK, savedStreak.current));
    const savedCount = getStoredData(STORAGE_KEYS.ENTRY_COUNT, 0);
    setEntryCount(savedCount);
    const savedXp = getStoredData(STORAGE_KEYS.XP_DATA, 0);
    setXp(savedXp);
    const savedAchievements = getStoredData(STORAGE_KEYS.ACHIEVEMENTS, [] as string[]);
    setUnlockedAchievements(savedAchievements);
    const savedGoals = getStoredData(STORAGE_KEYS.DAILY_GOALS, { date: '', goals: dailyGoals });
    if (savedGoals.date !== getToday()) {
      setDailyGoals(dailyGoals.map(g => ({ ...g, completed: false })));
      setDailyGoalLog([]);
      setStoredData(STORAGE_KEYS.DAILY_GOAL_LOG, { date: getToday(), items: [] as Array<{ goalId: string; label: string; completedAt: string }> });
    } else {
      setDailyGoals(savedGoals.goals);
      const savedGoalLog = getStoredData(
        STORAGE_KEYS.DAILY_GOAL_LOG,
        { date: getToday(), items: [] as Array<{ goalId: string; label: string; completedAt: string }> }
      );
      setDailyGoalLog(savedGoalLog.date === getToday() ? savedGoalLog.items : []);
    }
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // ── update word count ──
  useEffect(() => {
    const plainText = getJournalPlainText(body);
    const words = plainText.split(/\s+/).filter(w => w.length > 0).length;
    setWordCount(words);
    setCharCount(plainText.length);
  }, [body]);

  // normalize loaded/pasted content so empty quill list artifacts never render
  useEffect(() => {
    const normalized = normalizeJournalBody(body);
    if (normalized !== body) {
      setBody(normalized);
    }
  }, [body]);


  // clear stale draft body on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pkm:journal:draft');
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft.body) {
          const cleaned = normalizeJournalBody(draft.body);
          if (cleaned !== draft.body) {
            draft.body = cleaned;
            localStorage.setItem('pkm:journal:draft', JSON.stringify(draft));
          }
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  // ── predictions based on body ──
  useEffect(() => {
    if (body.trim().length < 20) {
      setPredictedMood(null);
      setPredictedSentiment(null);
      setPredictedActivities([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const ollama = new OllamaClient();
        const prompt = `analyze the following journal text and respond as json with keys mood, sentiment, activities. mood should be one of 0,1,2,4,5,6. sentiment should be positive neutral or negative. activities should be an array with up to three ids chosen from ${availableActivities.map(a=>a.id).join(',')}. text: """${body}"""`;
        const resp = await ollama.ask(prompt);
        try {
          const parsed = JSON.parse(resp);
          if (parsed.mood) setPredictedMood(String(parsed.mood));
          if (parsed.sentiment) setPredictedSentiment(parsed.sentiment);
          if (Array.isArray(parsed.activities)) setPredictedActivities(parsed.activities.map(String));
        } catch (e) {
          console.error('prediction parse error', resp, e);
        }
      } catch (err) {
        console.error('prediction failed', err);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [body, availableActivities]);

  // ── auto-save draft ──
  useEffect(() => {
    const saveDraft = () => {
      const draft = {
        mood,
        emotions: Array.from(emotions),
        activities: Array.from(activities),
        body: normalizeJournalBody(body),
        tags: Array.from(tags),
        timestamp: Date.now(),
      };
      localStorage.setItem('pkm:journal:draft', JSON.stringify(draft));
    };
    
    const interval = setInterval(saveDraft, 30000); // auto-save every 30 seconds
    return () => clearInterval(interval);
  }, [mood, emotions, activities, body, tags]);

  // ── load draft on mount ──
  useEffect(() => {
    const savedDraft = localStorage.getItem('pkm:journal:draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        const hoursSince = (Date.now() - draft.timestamp) / (1000 * 60 * 60);
        if (hoursSince < 24) { // only restore drafts less than 24 hours old
          if (draft.mood) setMood(draft.mood);
          if (draft.emotions?.length) setEmotions(new Set(draft.emotions));
          if (draft.activities?.length) setActivities(new Set(draft.activities));
          if (draft.body) setBody(normalizeJournalBody(draft.body));
          if (draft.tags?.length) setTags(new Set(draft.tags));
          if (draft.body || draft.mood) {
            toast.success('restored draft from earlier');
          }
        }
      } catch (e) { console.warn('Failed to restore draft:', e); }
    }
  }, []);

  // ── clear draft on save ──
  useEffect(() => {
    if (!saving && !editingEntry) {
      localStorage.removeItem('pkm:journal:draft');
    }
  }, [saving, editingEntry]);

  // ── helpers ──
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
    setBody(normalizeJournalBody(entry.body || ''));
    setQuickMood(entry.mood || null);
    setEditingEntry(entry);
    setViewingEntry(null);
    try {
      setTags(new Set(JSON.parse((entry as any).tags || '[]')));
    } catch {
      setTags(new Set());
    }
    setTranscript((entry as any).transcript || '');
  };

  const handleDeleteEntry = async (entry: JournalRecord) => {
    if (!entry.id) return;
    try {
      await api.request('journal', 'destroy', { filterByTk: entry.id });
      toast.success('entry deleted');
      setSelectedEntry(null);
      setViewingEntry(null);
      loadEntries();
    } catch (err: any) {
      toast.error('delete failed');
    }
  };

  const toggleBookmark = (entryId: string | number) => {
    bookmarks.toggleBookmark(entryId);
    toast.success(
      bookmarks.bookmarkedEntries.includes(entryId) ? 'bookmark removed' : 'entry bookmarked'
    );
  };

  const handleExport = async () => {
    try {
      const res: any = await api.listRecords('journal', { sort: '-date', pageSize: 1000 });
      let recs: JournalRecord[] = res?.data || [];
      const lines = ['date,mood,emotions,activities,body,timestamp,tags'];
      recs.forEach(r => {
        const emos = JSON.parse((r as any).emotions || '[]') as string[];
        const acts = parseActivities(r.activities);
        const tags = JSON.parse((r as any).tags || '[]') as string[];
        const row = [
          r.date,
          r.mood || '',
          emos.join(';'),
          acts.join(';'),
          (r.body || '').replace(/"/g, '""'),
          r.timestamp,
          tags.join(';')
        ].map(v => `"${v}"`).join(',');
        lines.push(row);
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-export-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('csv exported successfully');
    } catch (e) {
      toast.error('export failed');
    }
  };

  const handleExportJSON = async () => {
    try {
      const res: any = await api.listRecords('journal', { sort: '-date', pageSize: 1000 });
      let recs: JournalRecord[] = res?.data || [];
      const exportData = {
        exportedAt: new Date().toISOString(),
        entries: recs,
        stats: {
          totalEntries: recs.length,
          averageMood: calculateAverageMood(recs),
          dateRange: {
            from: recs[recs.length - 1]?.date,
            to: recs[0]?.date,
          }
        }
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('json backup exported');
    } catch (e) {
      toast.error('export failed');
    }
  };

  const handlePrint = async () => {
    // gather past 14 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const recent = entries.filter(e => new Date(e.date) >= cutoff);
    let summary = '';
    try {
      const ollama = new OllamaClient();
      const text = recent.map(e => `${e.date}: ${e.body || ''}`).join('\n');
      summary = await ollama.ask(`provide a long detailed lowercase summary of these journal entries for the past two weeks:\n${text}`);
    } catch (e) { console.warn('Failed to generate AI summary:', e); }
    const htmlEntries = recent.map(e => {
      const mood = MOODS.find(m => m.id === e.mood)?.label || '';
      return `<div style="margin-bottom:1em;"><strong>${e.date} (${mood})</strong><p>${e.body?.replace(/\n/g,'<br>') || ''}</p></div>`;
    }).join('');
    // compute simple stats
    const moods = recent.map(e => getMoodValue(e.mood || ''));
    const avgMood = moods.length ? (moods.reduce((a,b)=>a+b,0)/moods.length).toFixed(2) : 'n/a';
    const activityCounts: Record<string, number> = {};
    recent.forEach(e => {
      parseActivities(e.activities).forEach(a => {
        activityCounts[a] = (activityCounts[a] || 0) + 1;
      });
    });
    const labels = Object.keys(activityCounts);
    const data = labels.map(l => activityCounts[l]);
    const moodData = moods;
    const statsHtml = `<p>entries: ${recent.length} &nbsp; average mood: ${avgMood}</p>`;
    const moodChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({type:'line',data:{labels:recent.map(r=>r.date),datasets:[{label:'mood',data:moodData,fill:false,borderColor:'blue'}]}}))}`;
    const activityChartUrl = labels.length ? `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({type:'bar',data:{labels, datasets:[{label:'activities',data}]}}))}` : '';
    const printHtml = `<!doctype html><html><head><meta charset="utf-8"><title>journal report</title><style>body{font-family:sans-serif;padding:1em;color:#000}h1{text-transform:lowercase}p,div{page-break-inside:avoid}a{color:#000}</style></head><body><h1>journal report (last 14 days)</h1>${statsHtml}${moodChartUrl?`<img src="${moodChartUrl}" style="width:100%;max-width:600px;"/>`:''}${activityChartUrl?`<img src="${activityChartUrl}" style="width:100%;max-width:600px;"/>`:''}<div>${summary}</div>${htmlEntries}</body></html>`;
    const win = window.open('','_blank');
    if (win) {
      win.document.write(printHtml);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 500);
    }
  };


  const handleNLSearch = async () => {
    const q = pastEntriesFilter.search.trim();
    if (!q) return;
    setIsNlSearching(true);
    try {
      const ollama = new OllamaClient();
      const entriesText = entries.map(e => `${e.id}: ${e.body || ''}`).join('\n');
      const prompt = `given the following journal entries in the format id: text, return a json array of ids that best match this query: "${q}". entries:
${entriesText}`;
      const resp = await ollama.ask(prompt);
      try {
        const ids = JSON.parse(resp);
        setNlIds(Array.isArray(ids) ? ids.map(String) : []);
      } catch (err) {
        console.error('nl parse error', resp, err);
        setNlIds(null);
      }
    } catch (err) {
      console.error('nl search failed', err);
    } finally {
      setIsNlSearching(false);
    }
  };

  const checkAchievements = (newXp: number, newStreak: number, newCount: number, wordCount: number, emotionCount: number) => {
    const newUnlocks: string[] = [];
    
    // voice memo count tracked separately
    const memoCount = getStoredData(STORAGE_KEYS.VOICE_MEMOS_COUNT, 0);
    if (memoCount >= 10 && !unlockedAchievements.includes('voice_memoir')) newUnlocks.push('voice_memoir');

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
    if (wordCount >= 500 && !unlockedAchievements.includes('word_warrior')) newUnlocks.push('word_warrior');
    if (emotionCount >= 10 && !unlockedAchievements.includes('emotion_explorer')) newUnlocks.push('emotion_explorer');
    
    // check templates
    const templatesUsed = getStoredData(STORAGE_KEYS.TEMPLATES_USED, []);
    if (templatesUsed.length >= JOURNAL_TEMPLATES.length && !unlockedAchievements.includes('template_master')) {
      newUnlocks.push('template_master');
    }
    
    // check breathing
    const breathingHistory = getStoredData(STORAGE_KEYS.BREATHING_HISTORY, []);
    const totalBreathingSessions = breathingHistory.reduce((acc: number, h: any) => acc + h.sessions, 0);
    if (totalBreathingSessions >= 10 && !unlockedAchievements.includes('breathing_master')) {
      newUnlocks.push('breathing_master');
    }
    
    if (newUnlocks.length > 0) {
      const updated = [...unlockedAchievements, ...newUnlocks];
      setUnlockedAchievements(updated);
      setStoredData(STORAGE_KEYS.ACHIEVEMENTS, updated);
      const achievement = ACHIEVEMENTS.find(a => a.id === newUnlocks[0]);
      if (achievement) setCelebratingAchievement(achievement);
    }
  };

  const persistDailyGoals = (
    nextGoals: Array<{id: string; label: string; completed: boolean; icon: string}>,
    nextLog: Array<{ goalId: string; label: string; completedAt: string }>
  ) => {
    const today = getToday();
    setDailyGoals(nextGoals);
    setDailyGoalLog(nextLog);
    setStoredData(STORAGE_KEYS.DAILY_GOALS, { date: today, goals: nextGoals });
    setStoredData(STORAGE_KEYS.DAILY_GOAL_LOG, { date: today, items: nextLog });
  };

  const markGoalCompleted = (goalId: string) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal || goal.completed) return;

    const completedAt = new Date().toISOString();
    const nextGoals = dailyGoals.map(g => g.id === goalId ? { ...g, completed: true } : g);
    const nextLog = dailyGoalLog.some(l => l.goalId === goalId)
      ? dailyGoalLog.map(l => l.goalId === goalId ? { ...l, completedAt } : l)
      : [...dailyGoalLog, { goalId, label: goal.label, completedAt }];

    persistDailyGoals(nextGoals, nextLog);
  };

  const toggleDailyGoal = (goalId: string) => {
    const goal = dailyGoals.find(g => g.id === goalId);
    if (!goal) return;

    if (!goal.completed) {
      markGoalCompleted(goalId);
      return;
    }

    const nextGoals = dailyGoals.map(g => g.id === goalId ? { ...g, completed: false } : g);
    const nextLog = dailyGoalLog.filter(l => l.goalId !== goalId);
    persistDailyGoals(nextGoals, nextLog);
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
      date: editingEntry?.date || entryDate,
      tags: JSON.stringify(Array.from(tags)),
      ...(transcript && { transcript }),
    };

    // optional geolocation/weather stamping
    try {
      if (navigator.geolocation) {
        const pos: GeolocationPosition = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        payload.location = `${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`;
        try {
          const wresp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current_weather=true&timezone=auto`);
          const wjson = await wresp.json();
          if (wjson.current_weather) {
            payload.weather = `${wjson.current_weather.temperature}°C`;
            payload.body += `\n\nweather: ${payload.weather}`;
          }
        } catch (e) { console.warn('Failed to fetch weather:', e); }
      }
    } catch (e) { console.warn('Failed to save journal entry:', e); }

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
        
        // update longest streak
        if (newStreak > longestStreak) {
          setLongestStreak(newStreak);
          setStoredData(STORAGE_KEYS.LONGEST_STREAK, newStreak);
        }
      }
      
      // update entry count
      const newCount = entryCount + (editingEntry ? 0 : 1);
      if (!editingEntry) {
        setEntryCount(newCount);
        setStoredData(STORAGE_KEYS.ENTRY_COUNT, newCount);
      }
      
      // award xp
      const earnedXp = 10 + (streakData.lastDate === getYesterday() ? 5 : 0) + (wordCount >= 100 ? 5 : 0);
      const newXp = xp + earnedXp;
      setXp(newXp);
      setStoredData(STORAGE_KEYS.XP_DATA, newXp);
      
      // auto-complete goal conditions while preserving manual checks
      if (mood) markGoalCompleted('log_mood');
      if (emotions.size >= 3) markGoalCompleted('add_emotions');
      if (body.trim().length >= 50) markGoalCompleted('write_note');
      if (activities.size >= 3) markGoalCompleted('complete_activities');
      if (transcriptionSummary) markGoalCompleted('voice_summary_goal');
      
      // check achievements
      checkAchievements(newXp, newStreak, newCount, wordCount, availableEmotions.length);
      
      // reset form
      setMood(null);
      setEmotions(new Set());
      setActivities(new Set());
      setBody('');
      setQuickMood(null);
      setTags(new Set());
      setEditingEntry(null);
      setSelectedTemplate(null);
      setPhotos([]);
      setVoiceMemos([]);
      
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
      setMood(null);
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
      if (!tagColors[val]) {
        // assign a random palette color
        const color = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)];
        const updated = { ...tagColors, [val]: color };
        setTagColors(updated);
        setStoredData(STORAGE_KEYS.TAG_COLORS, updated);
      }
      toggleTag(val);
      setTagQuery('');
    }
  };

  const handleSelectTemplate = (template: typeof JOURNAL_TEMPLATES[0]) => {
    setSelectedTemplate(template);
    setTodayPrompt(template.prompts[Math.floor(Math.random() * template.prompts.length)]);
    toast.success(`template: ${template.name}`);
  };

  const handleShufflePrompt = () => {
    if (selectedTemplate) {
      setTodayPrompt(selectedTemplate.prompts[Math.floor(Math.random() * selectedTemplate.prompts.length)]);
    } else {
      setTodayPrompt(DAILY_PROMPTS[Math.floor(Math.random() * DAILY_PROMPTS.length)]);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotos(prev => [...prev, event.target!.result as string]);
          const currentCount = getStoredData(STORAGE_KEYS.PHOTOS_COUNT, 0);
          setStoredData(STORAGE_KEYS.PHOTOS_COUNT, currentCount + 1);
        }
      };
      reader.readAsDataURL(file);
    });
    toast.success(`${files.length} photo${files.length > 1 ? 's' : ''} added`);
  };

  const handleVoiceRecord = () => {
    if (isRecording) {
      // stop recording
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      setVoiceMemos(prev => [...prev, `voice-memo-${Date.now()}`]);
      const currentCount = getStoredData(STORAGE_KEYS.VOICE_MEMOS_COUNT, 0);
      setStoredData(STORAGE_KEYS.VOICE_MEMOS_COUNT, currentCount + 1);
      setRecordingTime(0);
      toast.success('voice memo saved');
    } else {
      // start recording
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const generateTranscriptionSummary = async (text: string) => {
    setIsSummarizingVoice(true);
    setTranscriptionSummary('');
    try {
      const ollama = new OllamaClient();
      const prompt = `you are wilson, a helpful personal assistant. given the following speech-to-text transcript of a voice journal entry, write a long, detailed, humanized, casual summary. elaborate on each topic mentioned, note any emotions or reflections, and respond entirely in lowercase.

transcript: "${text}"

summary:`;
      const resp = await ollama.ask(prompt, undefined, (chunk) => {
        setTranscriptionSummary(chunk);
      });
      setBody(normalizeJournalBody(resp));
      // unlock achievement
      if (!unlockedAchievements.includes('audio_transcriber')) {
        const updated = [...unlockedAchievements, 'audio_transcriber'];
        setUnlockedAchievements(updated);
        setStoredData(STORAGE_KEYS.ACHIEVEMENTS, updated);
        setCelebratingAchievement(ACHIEVEMENTS.find(a => a.id === 'audio_transcriber') || null);
      }
      // mark daily goal
      markGoalCompleted('voice_summary_goal');
      toast.success('voice summary generated');
    } catch (e) {
      console.error('summary failed', e);
      toast.error('voice summary failed');
    } finally {
      setIsSummarizingVoice(false);
    }
  };

  const handleVoiceTranscription = () => {
    if (isTranscribing && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('speech recognition not supported in this browser');
      return;
    }
    const recog = new SpeechRecognition();
    recog.lang = 'en-US';
    recog.interimResults = true;
    recog.continuous = true;
    recog.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recog.onend = () => {
      setIsTranscribing(false);
      if (transcript.trim()) {
        generateTranscriptionSummary(transcript);
      }
    };
    recog.onerror = (e: any) => {
      console.error('speech recognition error', e);
      toast.error('speech recognition error');
      setIsTranscribing(false);
    };
    recognitionRef.current = recog;
    recog.start();
    setIsTranscribing(true);
    setTranscript('');
  };

  // ── derived state for UI ──
  const levelInfo = useMemo(() => getLevelFromXp(xp), [xp]);
  
  const completedGoals = dailyGoals.filter(g => g.completed).length;
  const goalsProgress = (completedGoals / dailyGoals.length) * 100;

  const filteredPastEntries = useMemo(() => {
    let filtered = [...entries];

    // if semantic search has produced a result set, use that as the primary filter
    if (nlIds !== null) {
      filtered = filtered.filter(e => nlIds.includes(String(e.id)));
      // preserve the order returned by the model
      filtered.sort((a, b) => nlIds.indexOf(String(a.id)) - nlIds.indexOf(String(b.id)));
      return filtered;
    }

    if (showBookmarksOnly) {
      filtered = filtered.filter(e => bookmarks.bookmarkedEntries.includes(e.id!));
    }
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
  }, [entries, pastEntriesFilter, showBookmarksOnly, bookmarks.bookmarkedEntries, nlIds]);

  const entriesGroupedByMonth = useMemo(() => {
    const groups: Record<string, typeof filteredPastEntries> = {};
    filteredPastEntries.forEach(e => {
      const month = new Date(e.date).toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[month]) groups[month] = [];
      groups[month].push(e);
    });
    return groups;
  }, [filteredPastEntries]);

  const pastEntriesPanel = showPastEntries ? (
    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
      <p className="text-xs text-white/40 lowercase mb-3">
        {nlIds !== null ? 'semantic search results' : 'past entries'} ({filteredPastEntries.length})
        {nlIds !== null && (
          <button
            onClick={() => setNlIds(null)}
            className="ml-2 text-xs text-white/40 hover:text-white lowercase"
          >
            clear
          </button>
        )}
      </p>
      {/* filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <div className="flex-1 min-w-[120px] relative">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={pastEntriesFilter.search}
            onChange={e => { setPastEntriesFilter(f => ({ ...f, search: e.target.value })); setNlIds(null); }}
            placeholder="search entries..."
            className="w-full pl-8 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
          <button
            onClick={handleNLSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
            title={isNlSearching ? 'searching...' : 'semantic search'}
            disabled={isNlSearching || !pastEntriesFilter.search.trim()}
          >
            <Filter size={12} />
          </button>
        </div>
        <select
          value={pastEntriesFilter.mood}
          onChange={e => setPastEntriesFilter(f => ({ ...f, mood: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase text-white/70 focus:outline-none"
        >
          <option value="">all moods</option>
          {MOODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>
        <select
          value={pastEntriesFilter.tag}
          onChange={e => setPastEntriesFilter(f => ({ ...f, tag: e.target.value }))}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase text-white/70 focus:outline-none"
        >
          <option value="">all tags</option>
          {availableTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {filteredPastEntries.length === 0 && (
        <p className="text-center text-white/30 lowercase text-sm py-8">
          {nlIds !== null ? 'no semantic search results' : 'no entries found'}
        </p>
      )}

      {/* list of entries grouped by month */}
      {filteredPastEntries.length > 0 && Object.keys(entriesGroupedByMonth).map(month => (
        <div key={month} className="mb-4">
          <p className="text-xs text-white/50 lowercase mb-2">{month}</p>
          {entriesGroupedByMonth[month].map(e => {
            const highlight = nlIds !== null;
            return (
              <div
                key={e.id}
                onClick={() => setViewingEntry(e)}
                className={cn(
                  "p-2 rounded-lg mb-1 cursor-pointer",
                  highlight ? "bg-yellow-500/10 border border-yellow-400" : "bg-white/5"
                )}
              >
                <p className="text-xs text-white/40 lowercase">{new Date(e.date).toLocaleDateString()}</p>
                <p className="text-sm line-clamp-2">{e.body || ''}</p>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  ) : null;

  const filteredActivities = activityFilter 
    ? availableActivities.filter(a => a.category === activityFilter)
    : availableActivities;

  function moodImageFor(id?: string) {
    const m = MOODS.find(x => x.id === id);
    if (!m) return null;
    return <img src={m.emoji} alt={m.label} className="w-8 h-8 object-contain" />;
  }

const renderMoodButton = (m: typeof MOODS[0], isQuick = false) => {
    const active = (isQuick ? quickMood : mood) === m.id;
    const size = isQuick ? 'w-12 h-12' : 'w-16 h-16';
    return (
      <button
        key={m.id}
        onClick={() => isQuick ? handleQuickMood(m.id) : setMood(active ? null : m.id)}
        className={`${size} journal-mood-btn rounded-full transition-all duration-150 flex items-center justify-center hover:scale-110 hover:-translate-y-1 active:scale-105 active:translate-y-0 focus:outline-none ring-0 focus:ring-0 focus:ring-offset-0`}
        style={{
          color: m.color,
          background: active ? `${m.color}33` : '#000000',
          border: `2px solid ${m.color}`,
        }}
      >
        {moodImageFor(m.id)}
      </button>
    );
  };

  // ── cleanup ──
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-varela py-4 px-0 pb-24 flex flex-col gap-6 w-full mx-auto">
      {/* achievement celebration */}
      {celebratingAchievement && (
        <AchievementCelebration achievement={celebratingAchievement} onClose={() => setCelebratingAchievement(null)} />
      )}
      
      {/* modals */}
      <BreathingExerciseModal isOpen={showBreathing} onClose={() => setShowBreathing(false)} />
      <ReflectionTimer isOpen={showTimer} onClose={() => setShowTimer(false)} prompt={todayPrompt} />
      <WeeklyReviewModal
        isOpen={showWeeklyReview}
        onClose={() => setShowWeeklyReview(false)}
        entries={entries}
        onSummaryGenerated={() => {
          if (!unlockedAchievements.includes('weekly_summary')) {
            const updated = [...unlockedAchievements, 'weekly_summary'];
            setUnlockedAchievements(updated);
            setStoredData(STORAGE_KEYS.ACHIEVEMENTS, updated);
          }
        }}
      />
      <TemplateSelector isOpen={showTemplates} onClose={() => setShowTemplates(false)} onSelect={handleSelectTemplate} />
      <ShowerLoggerModal isOpen={showShowerLogger} onClose={() => setShowShowerLogger(false)} />
      <ColorPicker 
        isOpen={colorPickerOpen} 
        onClose={() => setColorPickerOpen(false)} 
        onSelectColor={handleColorSelect}
        currentColor={currentPickerColor}
        savedDots={colorDots}
        onSaveDot={handleSaveDot}
        dotIndex={activeDotIndex}
      />

      {/* hidden file input */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        onChange={handlePhotoUpload}
      />

      {/* header */}
      <div className="flex items-center justify-between pl-2">
        <div>
          <p className="text-xs text-white/40 lowercase">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="text-2xl font-bold lowercase tracking-tight">journal</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="hidden md:block text-xs italic text-white/30 lowercase truncate max-w-[200px] lg:max-w-[300px]">"{todayQuote.text}"</p>
          <div className="flex items-center gap-1 flex-wrap justify-end">
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
              <span className="text-sm">🔥</span>
              <span className="text-xs text-yellow-400">{streak}</span>
            </div>
          )}
          <button onClick={() => setShowAchievements(v => !v)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="achievements"><Award size={18} /></button>
          <button onClick={() => setShowShowerLogger(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="shower log"><ShowerHead size={18} /></button>
          <button onClick={() => setShowPastEntries(v => !v)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="past entries"><History size={18} /></button>
          <button onClick={() => setShowStats(v => !v)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="stats"><BarChart2 size={18} /></button>
          <button onClick={() => setShowHeatmap(v => !v)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="mood heatmap"><div className="grid grid-cols-2 gap-[2px] w-4 h-4"><div className="bg-white/60 rounded-sm"/><div className="bg-white/30 rounded-sm"/><div className="bg-white/40 rounded-sm"/><div className="bg-white/20 rounded-sm"/></div></button>
          <button onClick={() => setShowWeeklyReview(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="weekly review"><CalendarDays size={18} /></button>
          <button onClick={() => setShowBreathing(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="breathing"><Wind size={18} /></button>
          <button onClick={() => setShowTimer(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="timer"><Clock size={18} /></button>
          <button onClick={() => setShowActivitiesPanel(true)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="habits"><CheckSquare size={18} /></button>
          <button onClick={() => setReminderEnabled(v => !v)} className={cn("p-2 rounded-lg hover:bg-white/5 transition-colors", reminderEnabled && "text-yellow-400")} title="reminder"><Bell size={18} /></button>
          {reminderEnabled && <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="h-7 text-xs bg-transparent border border-white/20 rounded px-1" />}
          <input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} className="h-7 text-xs bg-transparent border border-white/20 rounded px-1" />
          <div className="relative group">
            <button className="p-2 rounded-lg hover:bg-white/5 transition-colors" title="export"><Download size={18} /></button>
            <div className="absolute right-0 top-full hidden group-hover:block pt-1 z-50">
              <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-1 min-w-[120px]">
                <button onClick={handleExport} className="w-full px-3 py-2 text-left text-xs lowercase hover:bg-white/5 rounded">export csv</button>
                <button onClick={handleExportJSON} className="w-full px-3 py-2 text-left text-xs lowercase hover:bg-white/5 rounded">export json</button>
                <button onClick={handlePrint} className="w-full px-3 py-2 text-left text-xs lowercase hover:bg-white/5 rounded">print report</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* popup panels — rendered above scrollable content so user doesn't have to scroll */}
      {showStats && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 lowercase">statistics</p>
            <button onClick={() => setShowStats(false)} className="p-1 rounded hover:bg-white/10 text-white/40"><X size={14} /></button>
          </div>
          <StatsCharts entries={entries} activityCatalog={activityCatalog} />
        </div>
      )}

      {showAchievements && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-white/40 lowercase">achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})</p>
            <button onClick={() => setShowAchievements(false)} className="p-1 rounded hover:bg-white/10 text-white/40"><X size={14} /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ACHIEVEMENTS.map(a => {
              const unlocked = unlockedAchievements.includes(a.id);
              return (
                <div 
                  key={a.id} 
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    unlocked 
                      ? "bg-yellow-500/10 border-yellow-500/30" 
                      : "bg-white/[0.02] border-white/5 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{a.icon}</span>
                    <div>
                      <p className={cn("text-xs lowercase", unlocked ? "text-white" : "text-white/40")}>{a.name}</p>
                      <p className="text-[10px] text-white/30 lowercase">{a.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showHeatmap && <MoodHeatmap entries={entries} onDayClick={(date) => {
        const entry = entriesByDate[date];
        if (entry) {
          setViewingEntry(entry);
          setShowPastEntries(false);
        } else {
          setEntryDate(date);
          setEditingEntry(null);
          setViewingEntry(null);
          setShowPastEntries(false);
          toast('no entry for that day yet – start writing!');
        }
      }} />}

      {pastEntriesPanel}

      {/* Progress & Gamification Section */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
        <button 
          onClick={() => setShowProgressSection(!showProgressSection)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[#ffb20d]" />
            <p className="text-xs text-white/40 lowercase">progress & gamification</p>
          </div>
          <span className="text-xs text-white/60 lowercase">level {levelInfo.level} • {streak} day streak</span>
        </button>

        {showProgressSection && (
          <div className="space-y-4 pt-2">
            <MedicationTracker />

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

            {/* daily goals */}
            <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Target size={16} className="text-blue-400" />
                  <p className="text-xs text-white/40 lowercase">daily goals</p>
                </div>
                <span className="text-xs text-white/60 lowercase">{completedGoals}/{dailyGoals.length}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
                <div 
                  className="h-full transition-all duration-300"
                  style={{ width: `${goalsProgress}%`, backgroundColor: goalsProgress === 100 ? G : Y }}
                />
              </div>
              <div className="space-y-2">
                {dailyGoals.map(g => (
                  <label key={g.id} className="flex items-center gap-2 text-sm lowercase cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={g.completed}
                      onChange={() => toggleDailyGoal(g.id)}
                      className="h-4 w-4 rounded border-white/30 bg-transparent accent-green-500"
                    />
                    <span className="text-sm">{g.icon}</span>
                    <span className={cn(g.completed ? 'text-white' : 'text-white/50')}>{g.label}</span>
                  </label>
                ))}
              </div>
              {dailyGoalLog.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] text-white/40 lowercase">completed today</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[...dailyGoalLog]
                      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                      .map(log => (
                        <span
                          key={log.goalId}
                          className="px-2 py-1 rounded-full text-[10px] lowercase bg-white/5 border border-white/10 text-white/70"
                        >
                          {log.label} • {new Date(log.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {goalsProgress === 100 && (
                <p className="text-center text-xs text-green-400 mt-3 lowercase">🎉 all goals completed!</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* daily goals */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-400" />
            <p className="text-xs text-white/40 lowercase">daily goals</p>
          </div>
          <span className="text-xs text-white/60 lowercase">{completedGoals}/{dailyGoals.length}</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full mb-3 overflow-hidden">
          <div 
            className="h-full transition-all duration-300"
            style={{ width: `${goalsProgress}%`, backgroundColor: goalsProgress === 100 ? G : Y }}
          />
        </div>
        <div className="space-y-2">
          {dailyGoals.map(g => (
            <label key={g.id} className="flex items-center gap-2 text-sm lowercase cursor-pointer select-none">
              <input
                type="checkbox"
                checked={g.completed}
                onChange={() => toggleDailyGoal(g.id)}
                className="h-4 w-4 rounded border-white/30 bg-transparent accent-green-500"
              />
              <span className="text-sm">{g.icon}</span>
              <span className={cn(g.completed ? 'text-white' : 'text-white/50')}>{g.label}</span>
            </label>
          ))}
        </div>
        {dailyGoalLog.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-[10px] text-white/40 lowercase">completed today</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...dailyGoalLog]
                .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
                .map(log => (
                  <span
                    key={log.goalId}
                    className="px-2 py-1 rounded-full text-[10px] lowercase bg-white/5 border border-white/10 text-white/70"
                  >
                    {log.label} • {new Date(log.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                  </span>
                ))}
            </div>
          </div>
        )}
        {goalsProgress === 100 && (
          <p className="text-center text-xs text-green-400 mt-3 lowercase">🎉 all goals completed!</p>
        )}
      </div>

      {/* gratitude tracker — always visible */}
      <GratitudeTracker />

      {/* quick check-in */}
      {showQuickCheckin && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <p className="text-xs text-white/40 lowercase mb-3">quick mood check-in</p>
          <div className="flex gap-3 justify-center">
            {MOODS.map(m => renderMoodButton(m, true))}
          </div>
          {quickMood && (
            <p className="text-center text-xs text-white/40 mt-2 lowercase">
              feeling {MOODS.find(m => m.id === quickMood)?.label}
            </p>
          )}
        </div>
      )}

      {/* daily prompt */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/30 lowercase">today's prompt</p>
          <div className="flex gap-1">
            <button onClick={handleShufflePrompt} className="p-1 rounded hover:bg-white/10" title="new prompt"><Sparkles size={12} /></button>
            <button onClick={() => setShowTemplates(true)} className="p-1 rounded hover:bg-white/10" title="templates"><BookOpen size={12} /></button>
          </div>
        </div>
        {selectedTemplate && (
          <div className="flex items-center gap-1 mb-2 text-xs text-purple-400">
            <span>{selectedTemplate.emoji}</span>
            <span className="lowercase">{selectedTemplate.name}</span>
          </div>
        )}
        <p className="text-sm text-white/70 lowercase italic">{todayPrompt}</p>
      </div>

      {/* entry detail view */}
      {viewingEntry && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl w-8 h-8 inline-block">
            {moodImageFor(viewingEntry.mood ?? undefined) || '📝'}
          </span>
              <div>
                <p className="text-sm font-medium lowercase">{formatDate(viewingEntry.date)}</p>
                <p className="text-xs text-white/40 lowercase">
                  {new Date(viewingEntry.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>
            <button onClick={() => setViewingEntry(null)} className="p-1 rounded hover:bg-white/10"><X size={16} /></button>
          </div>
          
          {viewingEntry.body && (
            <div className="p-3 rounded-lg bg-white/[0.02] mb-3">
              <p className="text-sm text-white/80 lowercase whitespace-pre-wrap">{viewingEntry.body}</p>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2">
            {(() => {
              try {
                const emos = JSON.parse((viewingEntry as any).emotions || '[]');
                return emos.map((e: string) => (
                  <span key={e} className="px-2 py-1 rounded-full text-xs bg-white/5 text-white/60 lowercase">{e}</span>
                ));
              } catch { return null; }
            })()}
            {parseActivities(viewingEntry.activities).map(a => {
              const act = activityCatalog.find(x => x.id === a);
              return act ? (
                <span
                  key={a}
                  className="px-2 py-1 rounded-full text-xs lowercase flex items-center gap-1"
                  style={{
                    color: act.color,
                    backgroundColor: `${act.color}33`,
                    border: `1px solid ${act.color}`
                  }}
                >
                  <span>{act.emoji}</span>
                  {act.label}
                </span>
              ) : null;
            })}
            {(() => {
              try {
                const tgs = JSON.parse((viewingEntry as any).tags || '[]');
                return tgs.map((tg: string) => (
                  <span
                    key={tg}
                    className="px-2 py-1 rounded-full text-xs lowercase"
                    style={{
                      color: tagColors[tg] || '#fff',
                      backgroundColor: `${tagColors[tg] || '#fff'}33`,
                      border: `1px solid ${tagColors[tg] || '#fff'}`
                    }}
                  >#{tg}</span>
                ));
              } catch { return null; }
            })()}
          </div>
          
          <div className="flex gap-2 mt-3">
            <button 
              onClick={() => toggleBookmark(viewingEntry.id!)}
              className={cn(
                "flex-1 px-3 py-2 rounded-lg text-sm lowercase flex items-center justify-center gap-1",
                bookmarks.bookmarkedEntries.includes(viewingEntry.id!)
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-white/5 hover:bg-white/10"
              )}
            >
              <span>★</span> {bookmarks.bookmarkedEntries.includes(viewingEntry.id!) ? 'bookmarked' : 'bookmark'}
            </button>
            <button 
              onClick={() => populateForm(viewingEntry)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm lowercase flex items-center justify-center gap-1"
            >
              <Edit2 size={14} /> edit
            </button>
            <button 
              onClick={() => handleDeleteEntry(viewingEntry)}
              className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-sm lowercase text-red-400 flex items-center justify-center gap-1"
            >
              <Trash2 size={14} /> delete
            </button>
          </div>
        </div>
      )}


      {/* main journal entry form */}
      {!viewingEntry && (
        <>
          {/* mood selector */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <p className="text-xs text-white/40 lowercase mb-3">how are you feeling?</p>
            <div className="flex gap-3 justify-center">
              {MOODS.map(m => renderMoodButton(m))}
            </div>
            {mood && (
              <p className="text-center text-xs text-white/40 mt-3 lowercase">
                feeling {MOODS.find(m => m.id === mood)?.label}
              </p>
            )}
          </div>

          {/* emotions */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <p className="text-xs text-white/40 lowercase mb-3">what emotions are you experiencing?</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {availableEmotions.filter(e => e.toLowerCase().includes(emotionQuery.toLowerCase())).map(emotion => (
                <button
                  key={emotion}
                  onClick={() => toggleEmotion(emotion)}
                  onContextMenu={e => handleContextMenu(e, 'emotion', emotion)}
                  className="px-3 py-1.5 rounded-full text-xs lowercase transition-all journal-emotion-btn focus:outline-none ring-0 focus:ring-0 focus:ring-offset-0"
                  style={{
                    // always show border with emotion color
                    border: `1px solid ${emotionColors[emotion]}`,
                    color: emotions.has(emotion) ? '#ffffff' : emotionColors[emotion],
                    backgroundColor: emotions.has(emotion) ? `${emotionColors[emotion]}33` : 'transparent',
                  }}
                  title="right-click to change color"
                >
                  {emotion}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={emotionQuery}
                onChange={e => setEmotionQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddEmotion()}
                placeholder="add custom emotion..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
              <button
                onClick={handleAddEmotion}
                disabled={!emotionQuery.trim()}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
            {emotions.size > 0 && (
              <p className="text-xs text-white/30 mt-2 lowercase">{emotions.size} emotion{emotions.size !== 1 ? 's' : ''} selected</p>
            )}
          </div>

          {/* activities */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/40 lowercase">what have you done today?</p>
              <div className="flex gap-1">
                {['health', 'productivity', 'creative', 'social', 'leisure', 'wellness'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActivityFilter(activityFilter === cat ? null : cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] lowercase",
                      activityFilter === cat ? "bg-blue-600" : "bg-white/5 text-white/40"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {filteredActivities.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => toggleActivity(activity.id)}
                  onContextMenu={e => handleContextMenu(e, 'activity', activity.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs lowercase transition-all flex items-center gap-1.5",
                    activities.has(activity.id) 
                      ? "" 
                      : "bg-white/5 hover:bg-white/10"
                  )}
                  style={{
                    color: activity.color,
                    ...(activities.has(activity.id) ? {
                      backgroundColor: `${activity.color}33`,
                      border: `1px solid ${activity.color}`,
                    } : {})
                  }}
                  title="right-click to change color"
                >
                  <span>{activity.emoji}</span>
                  {activity.label}
                </button>
              ))}
            </div>
            {activities.size > 0 && (
              <p className="text-xs text-white/30 lowercase">{activities.size} activit{activities.size !== 1 ? 'ies' : 'y'} selected</p>
            )}
          </div>

          {/* tags */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <p className="text-xs text-white/40 lowercase mb-3">add tags</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {availableTags.filter(t => t.toLowerCase().includes(tagQuery.toLowerCase())).slice(0, 10).map(tag => {
                const color = tagColors[tag] || '#ffffff';
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs lowercase transition-all",
                      tags.has(tag) 
                        ? "" 
                        : "bg-white/5 hover:bg-white/10"
                    )}
                    style={{
                      color,
                      ...(tags.has(tag) ? { backgroundColor: `${color}33`, border: `1px solid ${color}` } : {})
                    }}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                list="tag-options"
                type="text"
                value={tagQuery}
                onChange={e => setTagQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                placeholder="add custom tag..."
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30"
              />
              <datalist id="tag-options">
                {availableTags.map(t => <option key={t} value={t} />)}
              </datalist>
              <button
                onClick={handleAddTag}
                disabled={!tagQuery.trim()}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* notes */}
          <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-white/40 lowercase">journal notes</p>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title="add photo"
                >
                  <Image size={16} />
                </button>
                <button 
                  onClick={handleVoiceRecord}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isRecording ? "bg-red-500/20 text-red-400 animate-pulse" : "hover:bg-white/10 text-white/40 hover:text-white"
                  )}
                  title={isRecording ? `recording ${formatTime(recordingTime)}` : "voice memo"}
                >
                  <Mic size={16} />
                </button>
                <button
                  onClick={handleVoiceTranscription}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isTranscribing ? "bg-red-500/20 text-red-400 animate-pulse" : "hover:bg-white/10 text-white/40 hover:text-white"
                  )}
                  title={isTranscribing ? `transcribing` : "voice summary"}
                >
                  <FileText size={16} />
                </button>
              </div>
            </div>

            {/* photos preview */}
            {photos.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {photos.map((photo, i) => (
                  <div key={i} className="relative">
                    <img src={photo} alt={`upload ${i}`} className="w-16 h-16 object-cover rounded-lg" />
                    <button 
                      onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* voice memos */}
            {voiceMemos.length > 0 && (
              <div className="flex gap-2 mb-3 flex-wrap">
                {voiceMemos.map((memo, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-xs">
                    <Mic size={12} />
                    <span>memo {i + 1}</span>
                    <button 
                      onClick={() => setVoiceMemos(voiceMemos.filter((_, idx) => idx !== i))}
                      className="ml-1 text-red-400"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* transcription info */}
            {isTranscribing && (
              <p className="text-xs text-yellow-400 lowercase mb-2">listening{recordingTime ? ` (${formatTime(recordingTime)})` : ''}</p>
            )}
            {isSummarizingVoice && (
              <div className="p-2 bg-white/10 rounded-lg text-xs lowercase mb-2">
                {transcriptionSummary || 'generating summary...'}
              </div>
            )}
            {transcriptionSummary && !isSummarizingVoice && (
              <div className="p-2 bg-white/10 rounded-lg text-xs lowercase mb-2">
                {transcriptionSummary}
              </div>
            )}
            {transcript && !isTranscribing && (
              <p className="text-xs text-white/40 lowercase mb-2 line-clamp-3">transcript: {transcript}</p>
            )}

            {/* editor */}
            <Suspense fallback={<div className="w-full lg:flex-1 h-32 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-xs lowercase">loading editor...</div>}>
              <ReactQuill
                theme="snow"
                modules={JOURNAL_QUILL_MODULES}
                formats={JOURNAL_QUILL_FORMATS}
                value={body}
                onChange={(value: string) => setBody(normalizeJournalBody(value))}
                className="journal-editor w-full lg:flex-1 h-32"
              />
            </Suspense>

            {/* prediction suggestions */}
            {(predictedMood || predictedSentiment || predictedActivities.length > 0) && (
              <div className="p-2 bg-white/5 rounded-lg mb-2 text-xs lowercase">
                {predictedMood && (
                  <p>predicted mood: <span className="font-medium">{MOODS.find(m=>m.id===predictedMood)?.label}</span> <button onClick={() => setMood(predictedMood)} className="ml-1 underline">apply</button></p>
                )}
                {predictedSentiment && <p>sentiment: {predictedSentiment}</p>}
                {predictedActivities.length>0 && (
                  <p>suggested activities: <span className="flex gap-1 flex-wrap">{predictedActivities.map(a=>{
                    const act = activityCatalog.find(x => x.id === a);
                    return act ? (
                      <button
                        key={a}
                        onClick={() => toggleActivity(a)}
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{ color: act.color, border: `1px solid ${act.color}` }}
                      >{act.label}</button>
                    ) : null;
                  })}</span></p>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-4 min-h-6 px-3 py-2">
              <p className="text-xs text-white/30 lowercase">{wordCount} words • {charCount} chars</p>
              {wordCount >= 500 && <p className="text-xs text-yellow-400 lowercase">✦ word warrior!</p>}
            </div>
          </div>

          {/* save button */}
          <button
            onClick={handleSave}
            disabled={saving || (!mood && activities.size === 0 && !body.trim())}
            className={cn(
              "w-full py-3 rounded-xl font-medium lowercase transition-all",
              saving || (!mood && activities.size === 0 && !body.trim())
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-500 to-blue-500 text-black hover:opacity-90"
            )}
          >
            {saving ? 'saving...' : editingEntry ? 'update entry' : 'save entry'}
          </button>

          {editingEntry && (
            <button
              onClick={() => {
                setEditingEntry(null);
                setMood(null);
                setEmotions(new Set());
                setActivities(new Set());
                setBody('');
                setTags(new Set());
                setPhotos([]);
                setVoiceMemos([]);
              }}
              className="w-full py-2 rounded-xl text-sm lowercase text-white/40 hover:text-white transition-colors"
            >
              cancel editing
            </button>
          )}
        </>
      )}


      {/* footer spacer */}

      {/* global activities / habits modal */}
      {showActivitiesPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowActivitiesPanel(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowActivitiesPanel(false)} />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-80 text-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowActivitiesPanel(false)} className="absolute top-3 right-3 text-white/40 hover:text-white"><X size={18} /></button>
            <ActivitiesPanel
              activities={allHabitActivities}
              history={habitActivities.history}
              markActivity={habitActivities.mark}
              onCreateActivity={handleCreateActivity}
            />
          </div>
        </div>
      )}

      <div className="h-8" />
    </div>
  );
}

export { JournalPage };
