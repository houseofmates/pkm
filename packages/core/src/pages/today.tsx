import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useHibernationStreak } from '@/hooks/use-hibernation-streak';
import { CategorySaturationBars } from '@/components/CategorySaturationBars';
import { HygieneLifeTracker } from '@/components/HygieneLifeTracker';
import { DailyQuestRows } from '@/components/DailyQuestRows';
import { PetStatusDisplay } from '@/components/PetStatusDisplay';
import { cn } from '@/lib/utils';
import { Calendar, BookOpen, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// System Aliveness Indicator
function AlivenessOrb({ className }: { className?: string }) {
  const { sevenDayCoverage } = useGamificationStore();
  const [isHovered, setIsHovered] = useState(false);
  
  const getColor = () => {
    if (sevenDayCoverage >= 70) return { bg: 'bg-emerald-400', glow: 'shadow-emerald-400/50', pulse: 'animate-pulse' };
    if (sevenDayCoverage >= 40) return { bg: 'bg-amber-400', glow: 'shadow-amber-400/50', pulse: 'animate-pulse' };
    return { bg: 'bg-gray-500', glow: 'shadow-gray-500/30', pulse: '' };
  };
  
  const color = getColor();
  
  return (
    <div className={cn("relative", className)} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className={cn("w-3 h-3 rounded-full transition-all duration-500 cursor-pointer", color.bg, color.pulse, sevenDayCoverage > 0 && `shadow-[0_0_12px_rgba(255,255,255,0.3)] ${color.glow}`)} />
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 p-3 rounded-lg bg-black/90 border border-white/10 w-48 z-50">
          <p className="text-xs text-white/60 lowercase mb-1">system aliveness</p>
          <p className="text-lg font-medium text-white/90">{Math.round(sevenDayCoverage)}%</p>
          <p className="text-[10px] text-white/30 lowercase">last 7 days of logging</p>
        </div>
      )}
    </div>
  );
}

// Monthly Coverage Map
function MonthlyCoverageMap({ className }: { className?: string }) {
  const [moodData, setMoodData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const api = (await import('@/api/nocobase-client')).default;
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const res: any = await api.listRecords('journal', {
          filter: { date: { $gte: thirtyDaysAgo.toISOString().split('T')[0], $lte: today.toISOString().split('T')[0] }},
          pageSize: 100
        });
        const moodMap: Record<string, string> = {};
        res?.data?.forEach((entry: any) => { if (entry.date && entry.mood) moodMap[entry.date] = entry.mood; });
        setMoodData(moodMap);
      } catch (e) { console.error('Failed to load mood data', e); }
      finally { setLoading(false); }
    };
    loadData();
  }, []);
  
  const days: Array<{ date: string; mood: string | null }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().split('T')[0], mood: moodData[d.toISOString().split('T')[0]] || null });
  }
  
  const getMoodColor = (mood: string | null) => {
    if (!mood) return 'bg-white/5';
    const colors: Record<string, string> = { terrible: 'bg-red-900/60', bad: 'bg-orange-900/60', fine: 'bg-yellow-900/60', good: 'bg-lime-900/60', great: 'bg-emerald-900/60', amazing: 'bg-cyan-900/60' };
    return colors[mood] || 'bg-white/10';
  };
  
  if (loading) return <div className={cn("p-4 rounded-xl bg-black/40 border border-white/5", className)}><div className="flex gap-1">{Array.from({ length: 30 }).map((_, i) => <div key={i} className="w-3 h-3 rounded-sm bg-white/5 animate-pulse" />)}</div></div>;
  
  return (
    <div className={cn("p-4 rounded-xl bg-black/40 border border-white/5", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <span className="text-xs text-white/40 lowercase">30-day mood map</span>
        </div>
        <span className="text-[10px] text-white/30">{days.filter(d => d.mood).length}/30 days</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {days.map((day) => <div key={day.date} className={cn("w-3 h-3 rounded-sm transition-all hover:scale-125 cursor-pointer", getMoodColor(day.mood))} title={`${day.date}: ${day.mood || 'no entry'}`} />)}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-white/30">
        <span className="lowercase">legend:</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-900/60" /> bad</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-900/60" /> meh</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-900/60" /> good</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white/5" /> empty</span>
      </div>
    </div>
  );
}

// Journal Status Card
function JournalStatusCard({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [todayEntry, setTodayEntry] = useState<any>(null);
  
  useEffect(() => {
    const loadEntry = async () => {
      try {
        const api = (await import('@/api/nocobase-client')).default;
        const today = new Date().toISOString().split('T')[0];
        const res: any = await api.listRecords('journal', { filter: { date: today }, pageSize: 1 });
        if (res?.data?.[0]) setTodayEntry(res.data[0]);
      } catch (e) { console.error('Failed to load journal', e); }
    };
    loadEntry();
  }, []);
  
  const hasEntry = !!todayEntry;
  const hasMood = todayEntry?.mood;
  const wordCount = todayEntry?.body ? todayEntry.body.split(/\s+/).filter((w: string) => w.length > 0).length : 0;
  
  return (
    <div onClick={() => navigate('/journal')} className={cn("p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.02]", hasEntry ? "bg-violet-500/10 border-violet-400/30" : "bg-black/40 border-white/10", className)}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", hasEntry ? "bg-violet-500/20" : "bg-white/5")}>{hasEntry ? '📝' : '✏️'}</div>
        <div className="flex-1">
          <p className={cn("text-sm font-medium lowercase", hasEntry ? "text-white" : "text-white/40")}>{hasEntry ? 'journal done' : 'no entry yet'}</p>
          <p className="text-xs text-white/40 lowercase">{hasEntry ? `${wordCount} words · ${hasMood || 'no mood'}` : 'tap to write'}</p>
        </div>
        <ChevronRight className={cn("w-5 h-5", hasEntry ? "text-violet-400" : "text-white/20")} />
      </div>
      {hasEntry ? (
        <div className="flex gap-2">
          {hasMood && <span className="text-[10px] bg-white/10 px-2 py-1 rounded text-white/60 lowercase">mood logged</span>}
          {wordCount >= 100 && <span className="text-[10px] bg-violet-500/20 px-2 py-1 rounded text-violet-300 lowercase">100+ words</span>}
        </div>
      ) : <p className="text-[10px] text-white/20 lowercase italic">your journal is waiting... even one sentence counts</p>}
    </div>
  );
}

// Hibernation Streak Display
function StreakDisplay({ className }: { className?: string }) {
  const { streakDays, longestStreak } = useGamificationStore();
  const { streakData } = useHibernationStreak();
  const isHibernating = streakData.hibernating;
  
  return (
    <div className={cn("p-4 rounded-xl bg-black/40 border border-white/10", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-xl", isHibernating ? "bg-blue-500/10" : "bg-amber-500/10")}>{isHibernating ? '❄️' : '🔥'}</div>
          <div>
            <p className={cn("text-sm font-medium lowercase", isHibernating ? "text-blue-300" : "text-amber-300")}>{isHibernating ? 'hibernating' : 'streak active'}</p>
            <p className="text-xs text-white/40 lowercase">{isHibernating ? `${3 - (streakData.graceDaysUsed || 0)} days to resume` : `best: ${longestStreak} days`}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums text-white/80">{streakDays}</p>
          <p className="text-[10px] text-white/30 lowercase">day{streakDays === 1 ? '' : 's'}</p>
        </div>
      </div>
    </div>
  );
}

// XP and Level Display
function LevelDisplay({ className }: { className?: string }) {
  const { totalXp, level, levelName } = useGamificationStore();
  const getNextLevelXp = (lvl: number) => [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200, 1400, 1600, 1800, 2000, 2500, 3000, 3500, 4000, 5000][lvl] || 10000;
  const currentLevelBase = getNextLevelXp(level - 1);
  const nextLevelXp = getNextLevelXp(level);
  const xpInLevel = totalXp - currentLevelBase;
  const xpNeeded = nextLevelXp - currentLevelBase;
  const progress = Math.min(100, (xpInLevel / xpNeeded) * 100);
  
  return (
    <div className={cn("p-4 rounded-xl bg-black/40 border border-white/10", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-yellow-400" />
        <span className="text-xs text-white/40 lowercase">level {level}</span>
        <span className="text-xs text-white/30 lowercase ml-auto">{totalXp} xp</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-400" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[10px] text-white/30 lowercase mt-1 text-center">{levelName}</p>
    </div>
  );
}

// Main Today Page Component
export function TodayPage() {
  const navigate = useNavigate();
  const { loadFromServer, saveToServer, setSevenDayCoverage, updateCategory } = useGamificationStore();
  const { recordActivity } = useHibernationStreak();
  
  useEffect(() => {
    loadFromServer();
    recordActivity();
  }, [loadFromServer, recordActivity]);
  
  useEffect(() => {
    const calculateCoverage = async () => {
      try {
        const api = (await import('@/api/nocobase-client')).default;
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        const res: any = await api.listRecords('journal', {
          filter: { date: { $gte: sevenDaysAgo.toISOString().split('T')[0], $lte: today.toISOString().split('T')[0] }},
          pageSize: 100
        });
        const uniqueDays = new Set(res?.data?.map((e: any) => e.date)).size;
        setSevenDayCoverage(Math.round((uniqueDays / 7) * 100));
      } catch (e) { console.error('Failed to calculate coverage', e); }
    };
    calculateCoverage();
  }, [setSevenDayCoverage]);
  
  const handleRowComplete = useCallback((rowId: string) => {
    toast.success(<div className="flex flex-col items-center gap-1"><span className="text-lg">🎉</span><span className="font-medium lowercase">quest row complete!</span><span className="text-xs text-white/60">+25 xp · wilson fed</span></div>, { duration: 3000 });
  }, []);
  
  const handleLifeTrackerChange = useCallback((trackers: any[]) => {
    const hasShower = trackers.find((t: any) => t.id === 'shower')?.checked;
    const hasAte = trackers.find((t: any) => t.id === 'ate')?.checked;
    const waterLevel = trackers.find((t: any) => t.id === 'water')?.scaleValue || 0;
    const hasMeds = trackers.find((t: any) => t.id === 'meds')?.checked;
    let bodyScore = 0;
    if (hasShower) bodyScore += 30;
    if (hasAte) bodyScore += 25;
    if (waterLevel >= 3) bodyScore += 25;
    if (hasMeds) bodyScore += 20;
    updateCategory('body', bodyScore);
    saveToServer();
  }, [updateCategory, saveToServer]);
  
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">☀️</span>
            <h1 className="text-lg font-medium lowercase">today</h1>
          </div>
          <div className="flex items-center gap-3">
            <AlivenessOrb />
            <button onClick={() => navigate('/journal')} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"><BookOpen className="w-4 h-4 text-white/60" /></button>
            <button onClick={() => navigate('/calendar')} className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"><Calendar className="w-4 h-4 text-white/60" /></button>
          </div>
        </div>
      </header>
      
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <StreakDisplay />
          <LevelDisplay />
        </div>
        <JournalStatusCard />
        <section><DailyQuestRows onRowComplete={handleRowComplete} /></section>
        <div className="grid md:grid-cols-2 gap-4">
          <PetStatusDisplay />
          <CategorySaturationBars />
        </div>
        <section className="p-4 rounded-xl bg-black/40 border border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">✨</span>
            <span className="text-xs text-white/40 lowercase">life trackers</span>
          </div>
          <HygieneLifeTracker onChange={handleLifeTrackerChange} />
        </section>
        <MonthlyCoverageMap />
        <section className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/journal')} className="flex-1 min-w-[140px] py-3 px-4 rounded-xl bg-violet-500/20 border border-violet-400/30 text-violet-200 lowercase text-sm hover:bg-violet-500/30 transition-all active:scale-95">📝 write journal</button>
          <button onClick={() => navigate('/breathe')} className="flex-1 min-w-[140px] py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 lowercase text-sm hover:bg-emerald-500/30 transition-all active:scale-95">🧘 breathe</button>
        </section>
      </main>
    </div>
  );
}

export default TodayPage;
