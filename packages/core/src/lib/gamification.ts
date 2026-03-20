// gamification engine - xp, levels, achievements, unlocks

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

const ACHIEVEMENTS = [
  { id: 'first_log', name: 'first step', xp: 25, condition: (stats) => stats.activities_logged >= 1 },
  { id: 'week_streak', name: 'week warrior', xp: 100, condition: (stats) => stats.total_streaks >= 7 },
  { id: 'month_streak', name: 'month master', xp: 500, condition: (stats) => stats.total_streaks >= 30 },
  { id: 'hundred_logs', name: 'century', xp: 250, condition: (stats) => stats.activities_logged >= 100 },
  { id: 'level_5', name: 'rising star', xp: 200, condition: (stats) => stats.level >= 5 },
  { id: 'level_10', name: 'legendary', xp: 1000, condition: (stats) => stats.level >= 10 },
  { id: 'perfect_week', name: 'perfect week', xp: 300, condition: (stats) => stats.perfect_weeks >= 1 },
  { id: 'multi_streak', name: 'multi-tasker', xp: 150, condition: (stats) => stats.active_streaks >= 3 }
];

function calculateLevel(xp) {
  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp_required) {
      currentLevel = LEVELS[i];
      break;
    }
  }
  const nextLevel = LEVELS.find(l => l.level === currentLevel.level + 1) || currentLevel;
  const progress = nextLevel.xp_required > currentLevel.xp_required
    ? ((xp - currentLevel.xp_required) / (nextLevel.xp_required - currentLevel.xp_required)) * 100
    : 100;
  
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    xp_current: xp,
    xp_next: nextLevel.xp_required,
    progress: Math.min(progress, 100),
    theme: currentLevel.theme,
    color: currentLevel.color
  };
}

function calculateXpReward(baseXp, streakCount, isMilestone = false) {
  let xp = baseXp;
  if (streakCount >= 7) {
    xp = Math.floor(xp * XP_STREAK_MULTIPLIER);
  }
  if (isMilestone) {
    xp += XP_MILESTONE_BONUS;
  }
  return xp;
}

function checkAchievements(stats, unlockedIds) {
  const newAchievements = [];
  for (const achievement of ACHIEVEMENTS) {
    if (!unlockedIds.includes(achievement.id) && achievement.condition(stats)) {
      newAchievements.push(achievement);
    }
  }
  return newAchievements;
}

function getUnlockedThemes(level) {
  return LEVELS.filter(l => l.level <= level && l.theme).map(l => l.theme);
}

function getUnlockedColors(level) {
  return LEVELS.filter(l => l.level <= level && l.color).map(l => l.color);
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
