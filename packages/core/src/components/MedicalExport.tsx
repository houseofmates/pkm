import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ReferenceLine
} from 'recharts';
import { 
  FileText, Download, Calendar, TrendingUp, Activity, Brain, Heart, 
  Moon, Pill, Zap, ChevronDown, ChevronUp, Printer, Share2, X, CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useJournalData } from '@/hooks/use-journal-data';
import { useCollections } from '@/hooks/use-collections';
import { secureLogger } from '@/lib/secure-logger';

interface MedicalExportProps {
  weeks?: 2 | 4;
  onClose?: () => void;
}

interface AggregatedData {
  journalEntries: any[];
  habitLogs: any[];
  medications: any[];
  gamification: {
    questsCompleted: number;
    totalQuests: number;
    categorySaturation: Record<string, number>;
    streak: number;
  };
  moodTrend: { date: string; mood: number; label: string }[];
  activitySummary: { name: string; count: number; duration: number; category: string }[];
  sleepData: { date: string; hours: number; quality: number }[];
  symptomLog: { date: string; symptoms: string[]; severity: number }[];
}

const COLORS = {
  mood: '#f472b6',
  body: '#60a5fa',
  mind: '#a78bfa',
  finance: '#4ade80',
  social: '#fb923c',
  sleep: '#8b5cf6',
  medication: '#ef4444',
  activity: '#f5af12',
};

const MOOD_LABELS = ['terrible', 'bad', 'fine', 'good', 'excellent', 'amazing'];
const MOOD_IMAGES = [
  '/images/moods/terrible.png',
  '/images/moods/bad.png',
  '/images/moods/fine.png',
  '/images/moods/good.png',
  '/images/moods/excellent.png',
  '/images/moods/amazing.png',
];

export function MedicalExport({ weeks = 2, onClose }: MedicalExportProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<AggregatedData | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  
  const { entries } = useJournalData();
  const { collections } = useCollections();

  // Calculate date range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (weeks * 7));
    return { start, end };
  }, [weeks]);

  // Aggregate data from all sources
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Filter journal entries by date
        const filteredEntries = entries.filter(e => {
          const entryDate = new Date(e.date);
          return entryDate >= dateRange.start && entryDate <= dateRange.end;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Fetch habit logs
        const habitLogsRes = await api.listRecords('habit_logs', {
          filter: {
            createdAt: {
              $gte: dateRange.start.toISOString(),
              $lte: dateRange.end.toISOString(),
            },
          },
          pageSize: 1000,
        });
        const habitLogs = (habitLogsRes.data as any[]) || [];

        // Fetch medications
        const medsRes = await api.listRecords('medication_logs', {
          filter: {
            date: {
              $gte: dateRange.start.toLocaleDateString('en-CA'),
              $lte: dateRange.end.toLocaleDateString('en-CA'),
            },
          },
          pageSize: 1000,
        });
        const medications = (medsRes.data as any[]) || [];

        // Process mood trend
        const moodTrend = filteredEntries
          .filter(e => e.mood)
          .map(e => ({
            date: e.date,
            mood: parseInt(e.mood!) - 1, // 0-5
            label: MOOD_LABELS[parseInt(e.mood!) - 1] || 'unknown',
          }));

        // Process activity summary
        const activityMap = new Map();
        habitLogs.forEach((log: any) => {
          const key = log.habit_id || log.habit_name;
          if (!activityMap.has(key)) {
            activityMap.set(key, {
              name: log.habit_name || key,
              count: 0,
              duration: 0,
              category: log.category || 'general',
            });
          }
          const act = activityMap.get(key);
          act.count++;
          act.duration += log.duration_seconds || 0;
        });
        const activitySummary = Array.from(activityMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);

        // Process sleep data from journal entries (use type assertion for extensible fields)
        const sleepData = filteredEntries
          .filter(e => (e as any).sleep_hours || (e as any).sleep_quality)
          .map(e => ({
            date: e.date,
            hours: parseFloat((e as any).sleep_hours || '0'),
            quality: parseInt((e as any).sleep_quality || '0'),
          }));

        // Process symptoms from journal body text
        const symptomKeywords = ['headache', 'pain', 'nausea', 'fatigue', 'anxiety', 'depression', 
          'stress', 'insomnia', 'migraine', 'dizzy', 'tired', 'exhausted'];
        const symptomLog = filteredEntries
          .filter(e => e.body)
          .map(e => {
            const body = e.body.toLowerCase();
            const found = symptomKeywords.filter(s => body.includes(s));
            return {
              date: e.date,
              symptoms: found,
              severity: found.length > 2 ? 3 : found.length > 0 ? 2 : 1,
            };
          })
          .filter(s => s.symptoms.length > 0);

        // Aggregate gamification stats from localStorage (fallback)
        const gamificationData = JSON.parse(localStorage.getItem('gamification-state') || '{}');
        const questsCompleted = gamificationData.questRows?.filter((r: any) => r.completed).length || 0;
        const totalQuests = gamificationData.questRows?.length || 0;

        setData({
          journalEntries: filteredEntries,
          habitLogs,
          medications,
          gamification: {
            questsCompleted,
            totalQuests,
            categorySaturation: gamificationData.saturation || {},
            streak: gamificationData.streak || 0,
          },
          moodTrend,
          activitySummary,
          sleepData,
          symptomLog,
        });
      } catch (error) {
        toast.error('Failed to load medical export data');
        secureLogger.error('Failed to load medical export data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [entries, dateRange, weeks]);

  // Export to PDF
  const handleExportPDF = () => {
    window.print();
  };

  // Export to HTML for sharing
  const handleExportHTML = () => {
    const html = generateMedicalHTML(data!, weeks);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-report-${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Medical report exported');
  };

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-white/60">loading medical data...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const avgMood = data.moodTrend.length > 0 
    ? (data.moodTrend.reduce((a, b) => a + b.mood, 0) / data.moodTrend.length).toFixed(1)
    : 'N/A';

  const totalActivities = data.habitLogs.length;
  const totalDuration = data.activitySummary.reduce((a, b) => a + b.duration, 0);
  const avgSleep = data.sleepData.length > 0
    ? (data.sleepData.reduce((a, b) => a + b.hours, 0) / data.sleepData.length).toFixed(1)
    : 'N/A';

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-auto print:bg-white print:overflow-visible">
      {/* Header */}
      <div className="sticky top-0 bg-black/50 backdrop-blur-md border-b border-white/10 p-4 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-sm font-medium">medical summary report</h2>
              <p className="text-xs text-white/40">
                {dateRange.start.toLocaleDateString()} — {dateRange.end.toLocaleDateString()} · {weeks} weeks
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-xs flex items-center gap-2 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              print
            </button>
            <button
              onClick={handleExportHTML}
              className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 hover:bg-purple-500/30 text-xs flex items-center gap-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              export
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6 space-y-6 print:p-0 print:space-y-4">
        {/* Title Section - Print only */}
        <div className="hidden print:block mb-8">
          <h1 className="text-2xl font-bold mb-2">Medical Summary Report</h1>
          <p className="text-gray-600">
            Period: {dateRange.start.toLocaleDateString()} — {dateRange.end.toLocaleDateString()} ({weeks} weeks)
          </p>
          <p className="text-gray-600">Generated: {new Date().toLocaleString()}</p>
        </div>

        {/* Executive Summary */}
        <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
          <button 
            onClick={() => toggleSection('overview')}
            className="w-full flex items-center justify-between mb-2"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-medium">executive summary</h3>
            </div>
            {expandedSections.has('overview') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>
          
          {expandedSections.has('overview') && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <SummaryCard 
                icon={<TrendingUp className="w-4 h-4" />} 
                label="avg mood" 
                value={avgMood} 
                color="text-pink-400"
              />
              <SummaryCard 
                icon={<Zap className="w-4 h-4" />} 
                label="activities" 
                value={totalActivities.toString()} 
                color="text-yellow-400"
              />
              <SummaryCard 
                icon={<Moon className="w-4 h-4" />} 
                label="avg sleep" 
                value={`${avgSleep}h`} 
                color="text-purple-400"
              />
              <SummaryCard 
                icon={<CheckCircle className="w-4 h-4" />} 
                label="quest completion" 
                value={`${Math.round((data.gamification.questsCompleted / Math.max(data.gamification.totalQuests, 1)) * 100)}%`} 
                color="text-green-400"
              />
            </div>
          )}
        </section>

        {/* Mood Trend Chart */}
        <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
          <button 
            onClick={() => toggleSection('mood')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-pink-400" />
              <h3 className="text-sm font-medium">mood trend</h3>
            </div>
            {expandedSections.has('mood') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>
          
          {expandedSections.has('mood') && data.moodTrend.length > 0 && (
            <>
              <div className="h-48 print:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.moodTrend}>
                    <defs>
                      <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.mood} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={COLORS.mood} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                    />
                    <YAxis 
                      domain={[0, 5]} 
                      ticks={[0, 1, 2, 3, 4, 5]}
                      tickFormatter={(v) => MOOD_LABELS[v] || ''}
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      width={60}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelFormatter={(d) => new Date(d).toLocaleDateString()}
                      formatter={(v, n, p) => [MOOD_LABELS[v as number] || '', 'mood']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mood" 
                      stroke={COLORS.mood} 
                      fill="url(#moodGradient)" 
                      strokeWidth={2}
                    />
                    <ReferenceLine y={2.5} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              
              {/* Mood Distribution */}
              <div className="mt-4 grid grid-cols-6 gap-2">
                {MOOD_LABELS.map((label, i) => {
                  const count = data.moodTrend.filter(m => m.mood === i).length;
                  const pct = data.moodTrend.length > 0 ? Math.round((count / data.moodTrend.length) * 100) : 0;
                  return (
                    <div key={label} className="text-center">
                      <img src={MOOD_IMAGES[i]} alt={label} className="w-6 h-6 mx-auto mb-1 opacity-80" />
                      <div className="text-[10px] text-white/40 capitalize">{label}</div>
                      <div className="text-xs font-medium">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          {expandedSections.has('mood') && data.moodTrend.length === 0 && (
            <p className="text-sm text-white/40 italic">no mood data recorded in this period</p>
          )}
        </section>

        {/* Activity Summary */}
        <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
          <button 
            onClick={() => toggleSection('activities')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-medium">activity summary</h3>
            </div>
            {expandedSections.has('activities') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>
          
          {expandedSections.has('activities') && data.activitySummary.length > 0 && (
            <>
              <div className="h-48 print:h-64 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.activitySummary.slice(0, 8)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      stroke="rgba(255,255,255,0.3)"
                      fontSize={10}
                      tickFormatter={(v) => v.length > 15 ? v.slice(0, 15) + '...' : v}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      formatter={(v, n, p) => {
                        if (n === 'count') return [`${v} times`, 'frequency'];
                        if (n === 'duration') return [`${Math.round((v as number) / 60)} min`, 'duration'];
                        return [v as string, n as string];
                      }}
                    />
                    <Bar dataKey="count" fill={COLORS.activity} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {data.activitySummary.slice(0, 5).map((act, i) => (
                  <div key={act.name} className="flex items-center gap-3 text-sm">
                    <span className="text-white/40 w-4">{i + 1}.</span>
                    <span className="flex-1 capitalize">{act.name}</span>
                    <span className="text-white/40">{act.count}×</span>
                    <span className="text-white/40">{Math.round(act.duration / 60)}min</span>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {expandedSections.has('activities') && data.activitySummary.length === 0 && (
            <p className="text-sm text-white/40 italic">no activity data recorded in this period</p>
          )}
        </section>

        {/* Category Saturation Radar */}
        <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
          <button 
            onClick={() => toggleSection('categories')}
            className="w-full flex items-center justify-between mb-4"
          >
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-medium">life balance (category coverage)</h3>
            </div>
            {expandedSections.has('categories') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>
          
          {expandedSections.has('categories') && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="h-48 print:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject: 'mood', A: data.gamification.categorySaturation.mood || 0, fullMark: 100 },
                    { subject: 'body', A: data.gamification.categorySaturation.body || 0, fullMark: 100 },
                    { subject: 'mind', A: data.gamification.categorySaturation.mind || 0, fullMark: 100 },
                    { subject: 'finance', A: data.gamification.categorySaturation.finance || 0, fullMark: 100 },
                    { subject: 'social', A: data.gamification.categorySaturation.social || 0, fullMark: 100 },
                  ]}>
                    <PolarGrid stroke="rgba(255,255,255,0.1)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="coverage"
                      dataKey="A"
                      stroke={COLORS.mind}
                      fill={COLORS.mind}
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2 flex flex-col justify-center">
                {Object.entries(data.gamification.categorySaturation).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-white/40 capitalize w-16">{key}</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${value}%`,
                          backgroundColor: COLORS[key as keyof typeof COLORS] || '#888'
                        }}
                      />
                    </div>
                    <span className="text-xs text-white/60 w-8 text-right">{Math.round(value as number)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Sleep Analysis */}
        {data.sleepData.length > 0 && (
          <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
            <button 
              onClick={() => toggleSection('sleep')}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-medium">sleep analysis</h3>
              </div>
              {expandedSections.has('sleep') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>
            
            {expandedSections.has('sleep') && (
              <>
                <div className="h-48 print:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.sleepData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={10}
                      />
                      <YAxis 
                        yAxisId="hours"
                        domain={[0, 12]}
                        stroke={COLORS.sleep}
                        fontSize={10}
                      />
                      <YAxis 
                        yAxisId="quality"
                        orientation="right"
                        domain={[0, 10]}
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={10}
                      />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        labelFormatter={(d) => new Date(d).toLocaleDateString()}
                      />
                      <Line 
                        yAxisId="hours"
                        type="monotone" 
                        dataKey="hours" 
                        stroke={COLORS.sleep} 
                        strokeWidth={2}
                        dot={{ fill: COLORS.sleep, strokeWidth: 0, r: 3 }}
                        name="hours"
                      />
                      <Line 
                        yAxisId="quality"
                        type="monotone" 
                        dataKey="quality" 
                        stroke="rgba(255,255,255,0.3)" 
                        strokeDasharray="5 5"
                        strokeWidth={1}
                        dot={false}
                        name="quality"
                      />
                      <ReferenceLine yAxisId="hours" y={8} stroke="rgba(74,222,128,0.3)" strokeDasharray="3 3" label={{ value: 'target', fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-medium text-purple-400">{avgSleep}h</div>
                    <div className="text-[10px] text-white/40">avg sleep</div>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-purple-400">
                      {Math.round(data.sleepData.reduce((a, b) => a + b.quality, 0) / data.sleepData.length)}/10
                    </div>
                    <div className="text-[10px] text-white/40">avg quality</div>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-purple-400">
                      {data.sleepData.filter(s => s.hours >= 7).length}
                    </div>
                    <div className="text-[10px] text-white/40">good nights</div>
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {/* Medication Adherence */}
        {data.medications.length > 0 && (
          <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
            <button 
              onClick={() => toggleSection('medications')}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-medium">medication adherence</h3>
              </div>
              {expandedSections.has('medications') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>
            
            {expandedSections.has('medications') && (
              <div className="space-y-2">
                {data.medications.slice(0, 10).map((med: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-green-400">✓</span>
                    <span className="flex-1">{med.medication_name || med.name || 'unknown'}</span>
                    <span className="text-white/40">{med.date}</span>
                    <span className="text-white/40">{med.taken_at?.slice(0, 5) || ''}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Symptom Log */}
        {data.symptomLog.length > 0 && (
          <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200">
            <button 
              onClick={() => toggleSection('symptoms')}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-medium">noted symptoms</h3>
              </div>
              {expandedSections.has('symptoms') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>
            
            {expandedSections.has('symptoms') && (
              <div className="space-y-2">
                {data.symptomLog.slice(0, 10).map((entry, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <span className="text-white/40 text-xs">{entry.date}</span>
                    <div className="flex flex-wrap gap-1">
                      {entry.symptoms.map((s, j) => (
                        <span 
                          key={j} 
                          className={cn(
                            "px-2 py-0.5 rounded text-xs",
                            entry.severity >= 3 ? "bg-red-500/20 text-red-300" : 
                            entry.severity >= 2 ? "bg-yellow-500/20 text-yellow-300" : 
                            "bg-white/10 text-white/60"
                          )}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Journal Entries Summary */}
        {data.journalEntries.length > 0 && (
          <section className="bg-white/[0.02] border border-white/10 rounded-xl p-4 print:border-gray-200 print:break-inside-avoid">
            <button 
              onClick={() => toggleSection('entries')}
              className="w-full flex items-center justify-between mb-4"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-medium">journal entries summary</h3>
              </div>
              {expandedSections.has('entries') ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
            </button>
            
            {expandedSections.has('entries') && (
              <div className="space-y-3">
                {data.journalEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="border-l-2 border-white/10 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-white/40">{entry.date}</span>
                      {entry.mood && (
                        <img 
                          src={MOOD_IMAGES[parseInt(entry.mood) - 1]} 
                          alt="mood" 
                          className="w-4 h-4" 
                        />
                      )}
                    </div>
                    <p className="text-sm text-white/70 line-clamp-2">
                      {entry.body?.replace(/<[^>]*>/g, '').slice(0, 150)}
                      {entry.body?.length > 150 ? '...' : ''}
                    </p>
                    {entry.activities && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.activities.slice(0, 5).map((a: string, i: number) => (
                          <span key={i} className="text-[10px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                            {a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {data.journalEntries.length > 5 && (
                  <p className="text-xs text-white/40 italic text-center">
                    ...and {data.journalEntries.length - 5} more entries
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="text-center text-xs text-white/30 pt-8 print:pt-4 print:text-gray-400">
          <p>Generated by PKM Medical Report System</p>
          <p className="mt-1">This report is for informational purposes only and should be reviewed by a qualified healthcare professional.</p>
        </footer>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg p-3 text-center">
      <div className={cn("mb-1", color)}>{icon}</div>
      <div className={cn("text-lg font-medium", color)}>{value}</div>
      <div className="text-[10px] text-white/40 lowercase">{label}</div>
    </div>
  );
}

// Generate HTML export for sharing
function generateMedicalHTML(data: AggregatedData, weeks: number): string {
  const avgMood = data.moodTrend.length > 0 
    ? (data.moodTrend.reduce((a, b) => a + b.mood, 0) / data.moodTrend.length).toFixed(1)
    : 'N/A';
  
  const totalActivities = data.habitLogs.length;
  const avgSleep = data.sleepData.length > 0
    ? (data.sleepData.reduce((a, b) => a + b.hours, 0) / data.sleepData.length).toFixed(1)
    : 'N/A';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medical Summary Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #fafafa;
      color: #333;
      line-height: 1.6;
      padding: 40px 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 28px; margin-bottom: 8px; color: #1a1a1a; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
    .section { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #1a1a1a; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { text-align: center; padding: 16px; background: #f8f9fa; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: 600; color: #6b46c1; }
    .stat-label { font-size: 12px; color: #666; text-transform: lowercase; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; }
    .entry { border-left: 3px solid #6b46c1; padding-left: 16px; margin-bottom: 16px; }
    .entry-date { font-size: 12px; color: #666; margin-bottom: 4px; }
    .entry-body { color: #444; font-size: 14px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    @media print { body { padding: 20px; } .section { break-inside: avoid; } }
    @media (max-width: 600px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
  </style>
</head>
<body>
  <h1>Medical Summary Report</h1>
  <p class="subtitle">Last ${weeks} weeks · Generated ${new Date().toLocaleString()}</p>
  
  <div class="section">
    <div class="section-title">Executive Summary</div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${avgMood}</div>
        <div class="stat-label">average mood</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalActivities}</div>
        <div class="stat-label">activities logged</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${avgSleep}h</div>
        <div class="stat-label">average sleep</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Math.round((data.gamification.questsCompleted / Math.max(data.gamification.totalQuests, 1)) * 100)}%</div>
        <div class="stat-label">goal completion</div>
      </div>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Journal Entries (${data.journalEntries.length} entries)</div>
    ${data.journalEntries.slice(0, 10).map(e => `
      <div class="entry">
        <div class="entry-date">${e.date} ${e.mood ? '· Mood: ' + MOOD_LABELS[parseInt(e.mood) - 1] : ''}</div>
        <div class="entry-body">${e.body?.replace(/<[^>]*>/g, '').slice(0, 200)}${e.body?.length > 200 ? '...' : ''}</div>
      </div>
    `).join('')}
    ${data.journalEntries.length > 10 ? `<p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">...and ${data.journalEntries.length - 10} more entries</p>` : ''}
  </div>
  
  <div class="section">
    <div class="section-title">Activity Summary</div>
    <table>
      <thead>
        <tr><th>Activity</th><th>Frequency</th><th>Duration</th></tr>
      </thead>
      <tbody>
        ${data.activitySummary.slice(0, 10).map(a => `
          <tr>
            <td>${a.name}</td>
            <td>${a.count} times</td>
            <td>${Math.round(a.duration / 60)} minutes</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="footer">
    <p>Generated by PKM Medical Report System</p>
    <p>This report is for informational purposes only and should be reviewed by a qualified healthcare professional.</p>
  </div>
</body>
</html>`;
}
