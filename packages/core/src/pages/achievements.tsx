import { useState, useEffect, useMemo } from 'react';
import { useIdentityBadges } from '@/hooks/use-identity-badges';
import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';
import { Award, Medal, Trophy, Star, Flame, Zap, Target, Heart, Sparkles, TrendingUp, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

// Achievement definitions from journal.tsx
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

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  milestone: <Star size={14} />,
  consistency: <Flame size={14} />,
  wellness: <Heart size={14} />,
  exploration: <Sparkles size={14} />,
  productivity: <Zap size={14} />,
  creativity: <Sparkles size={14} />,
  progression: <TrendingUp size={14} />,
  insights: <Target size={14} />,
  social: <Heart size={14} />,
};

const CATEGORY_COLORS: Record<string, string> = {
  milestone: '#ffb20d',
  consistency: '#ef4444',
  wellness: '#22c55e',
  exploration: '#8b5cf6',
  productivity: '#3c9fdd',
  creativity: '#ec4899',
  progression: '#06b6d4',
  insights: '#a855f7',
  social: '#f97316',
};

export function AchievementsPage() {
  const { badges, earnedCount: identityEarnedCount, totalCount: identityTotalCount } = useIdentityBadges();
  const { totalXp, level, levelName, pets, questRows, saturation, sevenDayCoverage } = useGamificationStore();
  
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showIdentityBadges, setShowIdentityBadges] = useState(true);
  const [showAchievements, setShowAchievements] = useState(true);
  const [showLevels, setShowLevels] = useState(true);
  const [showStats, setShowStats] = useState(true);

  // Load entries and unlocked achievements
  useEffect(() => {
    const loadData = async () => {
      try {
        const res: any = await api.listRecords('journal', { sort: '-date', pageSize: 1000 });
        setEntries(res?.data || []);
      } catch (e) {
        secureLogger.error('failed to load journal entries', e);
      }
      
      const saved = localStorage.getItem('pkm:journal:achievements');
      if (saved) {
        try {
          setUnlockedAchievements(JSON.parse(saved));
        } catch {}
      }
    };
    loadData();
  }, []);

  // Calculate level info
  const levelInfo = useMemo(() => {
    const currentLevelDef = LEVELS.find(l => l.level === level) || LEVELS[0];
    const nextLevelDef = LEVELS.find(l => l.level === level + 1) || currentLevelDef;
    const progress = nextLevelDef.minXp > currentLevelDef.minXp
      ? ((totalXp - currentLevelDef.minXp) / (nextLevelDef.minXp - currentLevelDef.minXp)) * 100
      : 100;
    
    return {
      level,
      name: levelName,
      emoji: LEVELS[level - 1]?.emoji || '🌱',
      progress: Math.min(progress, 100),
      nextLevelXp: nextLevelDef.minXp,
    };
  }, [totalXp, level, levelName]);

  // Filter achievements by category
  const filteredAchievements = useMemo(() => {
    if (!activeCategory) return ACHIEVEMENTS;
    return ACHIEVEMENTS.filter(a => a.category === activeCategory);
  }, [activeCategory]);

  const unlockedCount = unlockedAchievements.length;
  const totalCount = ACHIEVEMENTS.length;
  const completionRate = Math.round((unlockedCount / totalCount) * 100);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(ACHIEVEMENTS.map(a => a.category));
    return Array.from(cats);
  }, []);

  const wilson = pets[0];
  const completedQuests = questRows.filter(r => r.completed).length;
  const totalQuests = questRows.length;

  return (
    <div className="min-h-screen bg-black text-white font-varela py-4 px-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link 
            to="/journal" 
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold lowercase tracking-tight">achievements & awards</h1>
            <p className="text-xs text-white/40 lowercase">
              {unlockedCount}/{totalCount} unlocked • {completionRate}% complete
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Medal size={24} className="text-[#ffb20d]" />
          <Trophy size={24} className="text-[#ffb20d]" />
        </div>
      </div>

      {/* Overall Progress */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-[#ffb20d]" />
            <p className="text-xs text-white/40 lowercase">overall progress</p>
          </div>
          <span className="text-xs text-[#ffb20d]">{completionRate}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-[#ffb20d] to-orange-400 transition-all duration-500"
            style={{ width: `${completionRate}%` }}
          />
        </div>
      </div>

      {/* Current Level */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
        <button 
          onClick={() => setShowLevels(!showLevels)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">{levelInfo.emoji}</span>
            <p className="text-xs text-white/40 lowercase">current level</p>
          </div>
          <span className="text-xs text-white/60">level {levelInfo.level}</span>
        </button>
        
        {showLevels && (
          <div className="mt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium lowercase">{levelInfo.name}</span>
              <span className="text-xs text-white/40">{totalXp} / {levelInfo.nextLevelXp} xp</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-500"
                style={{ width: `${levelInfo.progress}%` }}
              />
            </div>
            <p className="text-[10px] text-white/30 lowercase">
              {levelInfo.nextLevelXp - totalXp} xp to next level
            </p>
          </div>
        )}
      </div>

      {/* Identity Badges */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
        <button 
          onClick={() => setShowIdentityBadges(!showIdentityBadges)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Star size={16} className="text-purple-400" />
            <p className="text-xs text-white/40 lowercase">identity badges</p>
          </div>
          <span className="text-xs text-white/60">{identityEarnedCount}/{identityTotalCount}</span>
        </button>
        
        {showIdentityBadges && (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all duration-300",
                    badge.earned
                      ? "bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-purple-500/30"
                      : "bg-white/5 border-white/10 opacity-50 grayscale"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{badge.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "text-xs font-medium lowercase truncate",
                        badge.earned ? "text-purple-200" : "text-white/40"
                      )}>
                        {badge.name}
                      </p>
                      <p className="text-[10px] text-white/30 lowercase truncate">
                        {badge.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs lowercase transition-all",
            activeCategory === null 
              ? "bg-white/20 text-white" 
              : "bg-white/5 text-white/60 hover:bg-white/10"
          )}
        >
          all
        </button>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs lowercase transition-all flex items-center gap-1.5",
              activeCategory === cat
                ? "text-white"
                : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
            style={{
              backgroundColor: activeCategory === cat ? `${CATEGORY_COLORS[cat]}33` : undefined,
              borderColor: activeCategory === cat ? CATEGORY_COLORS[cat] : undefined,
              border: activeCategory === cat ? `1px solid ${CATEGORY_COLORS[cat]}` : undefined,
            }}
          >
            <span style={{ color: CATEGORY_COLORS[cat] }}>{CATEGORY_ICONS[cat]}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Achievements Grid */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
        <button 
          onClick={() => setShowAchievements(!showAchievements)}
          className="w-full flex items-center justify-between mb-3"
        >
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-[#ffb20d]" />
            <p className="text-xs text-white/40 lowercase">achievements</p>
          </div>
          <span className="text-xs text-white/60">{unlockedCount}/{totalCount}</span>
        </button>
        
        {showAchievements && (
          <div className="grid grid-cols-2 gap-2">
            {filteredAchievements.map(a => {
              const unlocked = unlockedAchievements.includes(a.id);
              return (
                <div 
                  key={a.id} 
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    unlocked 
                      ? "bg-[#ffb20d]/10 border-[#ffb20d]/30" 
                      : "bg-white/[0.02] border-white/5 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{a.icon}</span>
                    <div>
                      <p className={cn("text-xs lowercase", unlocked ? "text-white" : "text-white/40")}>{a.name}</p>
                      <p className="text-[10px] text-white/30 lowercase">{a.description}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <span style={{ color: CATEGORY_COLORS[a.category] }}>{CATEGORY_ICONS[a.category]}</span>
                    <span className="text-[10px] text-white/30 lowercase">{a.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] mb-4">
        <button 
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-400" />
            <p className="text-xs text-white/40 lowercase">stats summary</p>
          </div>
        </button>
        
        {showStats && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-white/[0.03] text-center">
              <span className="text-xl font-bold text-blue-400">{entries.length}</span>
              <p className="text-[10px] text-white/40 lowercase">total entries</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] text-center">
              <span className="text-xl font-bold text-green-400">{unlockedCount}</span>
              <p className="text-[10px] text-white/40 lowercase">achievements</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] text-center">
              <span className="text-xl font-bold text-[#ffb20d]">{totalXp}</span>
              <p className="text-[10px] text-white/40 lowercase">total xp</p>
            </div>
            <div className="p-3 rounded-lg bg-white/[0.03] text-center">
              <span className="text-xl font-bold text-purple-400">{completedQuests}/{totalQuests}</span>
              <p className="text-[10px] text-white/40 lowercase">quests</p>
            </div>
          </div>
        )}
      </div>

      {/* Wilson Status */}
      {wilson && (
        <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{wilson.emoji}</span>
            <div>
              <p className="text-sm font-medium lowercase">{wilson.name}</p>
              <p className="text-[10px] text-white/40 lowercase">your companion</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 w-14 lowercase">happiness</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", wilson.happiness >= 70 ? 'bg-green-400' : wilson.happiness >= 40 ? 'bg-yellow-400' : 'bg-red-400')} 
                  style={{ width: `${wilson.happiness}%` }} 
                />
              </div>
              <span className="text-[10px] text-white/40 w-6 text-right">{wilson.happiness}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/40 w-14 lowercase">energy</span>
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className={cn("h-full rounded-full transition-all", wilson.energy >= 70 ? 'bg-green-400' : wilson.energy >= 40 ? 'bg-yellow-400' : 'bg-red-400')} 
                  style={{ width: `${wilson.energy}%` }} 
                />
              </div>
              <span className="text-[10px] text-white/40 w-6 text-right">{wilson.energy}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
