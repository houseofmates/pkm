// gamification engine - xp, levels, achievements, unlocks

export interface GamificationStats {
  activities_logged: number;
  total_streaks: number;
  level: number;
  perfect_weeks: number;
  active_streaks: number;
}

const XP_PER_ACTIVITY = 10;
const XP_STREAK_MULTIPLIER = 1.5;
const XP_MILESTONE_BONUS = 50;

const LEVELS = [
  { level: 1, xp_required: 0, name: 'beginner', theme: null },
  { level: 2, xp_required: 100, name: 'explorer', theme: null },
  { level: 3, xp_required: 250, name: 'tracker', theme: 'midnight' },
  { level: 4, xp_required: 500, name: 'consistent', theme: null },
  { level: 5, xp_required: 1000, name: 'dedicated', theme: 'ocean', color: '#0ea5e9' },
  { level: 6, xp_required: 1750, name: 'focused', theme: null },
  { level: 7, xp_required: 2500, name: 'disciplined', theme: null },
  { level: 8, xp_required: 3500, name: 'master', theme: 'forest', color: '#22c55e' },
  { level: 9, xp_required: 5000, name: 'legend', theme: null },
  { level: 10, xp_required: 7500, name: 'mythic', theme: 'sunset', color: '#f59e0b' },
  { level: 11, xp_required: 10000, name: 'transcendent', theme: 'aurora', color: '#8b5cf6' },
  { level: 12, xp_required: 15000, name: 'eternal', theme: 'cosmos', color: '#ec4899' }
];

const ACHIEVEMENTS: Array<{
  id: string;
  name: string;
  xp: number;
  condition: (stats: GamificationStats) => boolean;
}> = [
  { id: 'first_log', name: 'first step', xp: 25, condition: (stats) => (stats.activities_logged || 0) >= 1 },
  { id: 'week_streak', name: 'week warrior', xp: 100, condition: (stats) => (stats.total_streaks || 0) >= 7 },
  { id: 'month_streak', name: 'month master', xp: 500, condition: (stats) => (stats.total_streaks || 0) >= 30 },
  { id: 'hundred_logs', name: 'century', xp: 250, condition: (stats) => (stats.activities_logged || 0) >= 100 },
  { id: 'level_5', name: 'rising star', xp: 200, condition: (stats) => (stats.level || 0) >= 5 },
  { id: 'level_10', name: 'legendary', xp: 1000, condition: (stats) => (stats.level || 0) >= 10 },
  { id: 'perfect_week', name: 'perfect week', xp: 300, condition: (stats) => (stats.perfect_weeks || 0) >= 1 },
  { id: 'multi_streak', name: 'multi-tasker', xp: 150, condition: (stats) => (stats.active_streaks || 0) >= 3 }
];

function calculateLevel(xp: number) {
  // ensure xp is a positive number
  const safeXp = Math.max(0, xp || 0);

  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (safeXp >= LEVELS[i].xp_required) {
      currentLevel = LEVELS[i];
      break;
    }
  }
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || currentLevel;
  const progress = nextLevel.xp_required > currentLevel.xp_required
    ? ((safeXp - currentLevel.xp_required) / (nextLevel.xp_required - currentLevel.xp_required)) * 100
    : 100;

  return {
    level: currentLevel.level,
    name: currentLevel.name,
    xp_current: safeXp,
    xp_next: nextLevel.xp_required,
    progress: Math.min(progress, 100),
    theme: currentLevel.theme,
    color: currentLevel.color
  };
}

function calculateXpReward(baseXp: number, streakCount: number, isMilestone = false) {
  // ensure inputs are valid numbers
  let xp = Math.max(0, baseXp || 0);
  const safeStreak = Math.max(0, streakCount || 0);

  if (safeStreak >= 7) {
    xp = Math.floor(xp * XP_STREAK_MULTIPLIER);
  }
  if (isMilestone) {
    xp += XP_MILESTONE_BONUS;
  }
  return xp;
}

function checkAchievements(stats: GamificationStats, unlockedIds: string[]) {
  // ensure stats exist
  if (!stats) return [];

  const newAchievements: typeof ACHIEVEMENTS = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.includes(achievement.id) && achievement.condition(stats)) {
      newAchievements.push(achievement);
    }
  }
  return newAchievements;
}

function getUnlockedThemes(level: number) {
  const safeLevel = Math.max(0, level || 0);
  return LEVELS.filter(l => l.level <= safeLevel && l.theme).map(l => l.theme);
}

function getUnlockedColors(level: number) {
  const safeLevel = Math.max(0, level || 0);
  return LEVELS.filter(l => l.level <= safeLevel && l.color).map(l => l.color);
}

export {
  XP_PER_ACTIVITY,
  XP_STREAK_MULTIPLIER,
  XP_MILESTONE_BONUS,
  LEVELS,
  ACHIEVEMENTS,
  calculateLevel,
  calculateXpReward,
  checkAchievements,
  getUnlockedThemes,
  getUnlockedColors
};
