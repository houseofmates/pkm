import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Mic, Flame } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ExerciseTracker from './exercise-tracker'
import FinancialHub from './financial-hub'
import GamifiedPets from './gamified-pets'
import VoiceInput from './voice-input'
import SensoryHub from './sensory-hub'
import FixationTrap from './fixation-trap'
import LogBlock from './log-block'
import LogsTable from './logs-table'
import LogsCalendar from './logs-calendar'
import ReflectionTimer from './reflection-timer'
import { useGamificationStore } from '../../stores/gamification-store'
import { toast } from 'sonner'

interface JournalEntry {
  id: string
  date: string
  mood: string
  emotions: string[]
  activities: string[]
  note: string
  xpEarned: number
}

// moods, emotions, activities
const MOODS = [
  { id: 'happy', emoji: '😊', color: '#10b981' },
  { id: 'sad', emoji: '😢', color: '#ef4444' },
  { id: 'angry', emoji: '😠', color: '#f59e0b' },
  { id: 'calm', emoji: '😌', color: '#3b82f6' },
  { id: 'anxious', emoji: '😰', color: '#8b5cf6' },
  { id: 'excited', emoji: '🤩', color: '#ec4899' }
]

const EMOTIONS = [ 'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust' /* 40+ */ ]
const ACTIVITIES = [ 'walk', 'read', 'meditate', 'work' /* 28+ */ ]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

const Journal: React.FC = () => {
  const [entry, setEntry] = useState<JournalEntry>({ id: '', date: '', mood: '', emotions: [], activities: [], note: '', xpEarned: 0 })
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [tab, setTab] = useState('today')
  const [goals, setGoals] = useState([
    { id: 'mood', name: 'log mood', completed: false },
    { id: '3-emotions', name: '3+ emotions', completed: false },
    { id: '50-note', name: '50+ chars note', completed: false },
    { id: '3-activities', name: '3+ activities', completed: false },
    { id: 'timer', name: '5min reflection', completed: false }
  ])
  const [filterMood, setFilterMood] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const { currentXp, level, xpToNextLevel, quests, questProgress, rowBonuses, achievements, currentStreak, earnXp, completeQuest, resetDaily } = useGamificationStore()

  const toggleEmotion = useCallback((emotion: string) => {
    setEntry((prev: JournalEntry) => ({
      ...prev,
      emotions: prev.emotions.includes(emotion)
        ? prev.emotions.filter((e: string) => e !== emotion)
        : [...prev.emotions, emotion]
    }))
  }, [])

  const toggleActivity = useCallback((activity: string) => {
    setEntry((prev: JournalEntry) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a: string) => a !== activity)
        : [...prev.activities, activity]
    }))
  }, [])

  const toggleGoal = useCallback((goalId: string) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g))
  }, [])

  const goalsProgress = goals.filter(g => g.completed).length / goals.length * 100

  const filteredPastEntries = entries.filter(e => 
    (!filterMood || e.mood === filterMood) &&
    (!searchTerm || e.note.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const emotionData = [{ name: 'joy', value: 40 }, { name: 'sadness', value: 30 }]

  const handleSave = useCallback(() => {
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toDateString(), xpEarned: 10 }
    setEntries(prev => [...prev, newEntry])
    setPastEntries(prev => [...prev, newEntry])
    earnXp(10, 'journal entry')
    if (entry.note.length > 50) earnXp(5, 'long note')
    toast('entry saved! +10xp')
  }, [entry, earnXp])

  useEffect(() => {
    resetDaily()
  }, [resetDaily])

  const levelBadge = '🌱'

  // filter past by month
  const groupedPast = filteredPastEntries.reduce((acc, e) => {
    const month = new Date(e.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(e)
    return acc
  }, {} as Record<string, JournalEntry[]>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-black p-4 md:p-8 space-y-6">
      <Card className="glass-effect backdrop-blur-md border border-slate-800/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-2xl">{levelBadge}</Badge>
            <div>
              <CardTitle className="text-xl">level {level}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Flame className="w-4 h-4" />
                <span>streak: {currentStreak}d</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-slate-400">xp progress</div>
            <Progress value={(currentXp / xpToNextLevel) * 100} className="h-2" />
            <div className="text-xs text-slate-500">{currentXp}/{xpToNextLevel} to next</div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="today">today hub</TabsTrigger>
          <TabsTrigger value="quests">master quests</TabsTrigger>
          <TabsTrigger value="dashboards">dashboards</TabsTrigger>
          <TabsTrigger value="sensory">sensory</TabsTrigger>
          <TabsTrigger value="fixations">fixations</TabsTrigger>
          <TabsTrigger value="stats">stats</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {/* daily goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                daily goals <Progress value={goalsProgress} className="w-24 h-2 mx-2 [>div]:bg-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {goals.map(g => (
                <Button key={g.id} variant={g.completed ? 'default' : 'outline'} onClick={() => toggleGoal(g.id)} className="h-12">
                  {g.completed ? '✅' : '○'} {g.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">mood</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 p-3">
                {MOODS.map(m => (
                  <Button key={m.id} variant={entry.mood === m.id ? 'default' : 'outline'} size="sm" onClick={() => setEntry({...entry, mood: m.id})} className="text-lg">
                    {m.emoji}
                  </Button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">emotions</CardTitle>
              </CardHeader>
              <CardContent className="max-h-32 overflow-auto p-2 space-y-1">
                {EMOTIONS.slice(0,8).map(e => (
                  <Button key={e} variant="ghost" size="sm" onClick={() => toggleEmotion(e)}>
                    {e}
                  </Button>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">activities</CardTitle>
              </CardHeader>
              <CardContent className="max-h-32 overflow-auto p-2 space-y-1">
                {ACTIVITIES.slice(0,8).map(a => (
                  <Button key={a} variant="ghost" size="sm" onClick={() => toggleActivity(a)}>
                    {a}
                  </Button>
                ))}
              </CardContent>
            </Card>
            <ReflectionTimer onComplete={(duration, prompt) => {
              setEntry(prev => ({ ...prev, note: `${prompt}\n(reflection ${duration/60}min)` }))
              earnXp(15, 'timer reflection')
            }} />
          </div>

          <Card>
            <CardContent className="p-4 pt-0">
              <textarea
                value={entry.note}
                onChange={(e) => setEntry({...entry, note: e.target.value})}
                className="w-full h-32 p-4 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-slate-600"
                placeholder="your thoughts today..."
              />
            </CardContent>
          </Card>
          <Button onClick={handleSave} className="w-full">save entry + earn xp</Button>
        </TabsContent>

        <TabsContent value="quests">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                daily quests <span className="text-sm text-slate-400">({questProgress.toFixed(0)}%)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {quests.map(q => (
                  <Button
                    key={q.id}
                    variant={q.completed ? 'default' : 'outline'}
                    onClick={() => completeQuest(q.id)}
                    className={`h-20 p-2 ${rowBonuses[q.row] ? 'ring-2 ring-emerald-500 animate-pulse' : ''}`}
                  >
                    <div className="text-xs line-clamp-3">{q.name}</div>
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-emerald-400">
                {rowBonuses.map((bonus, i) => (
                  <div key={i} className={bonus ? 'bg-emerald-500/20 rounded p-1 font-bold' : 'text-slate-600'}>
                    row {i+1} bonus {bonus ? '✅ +50xp' : ''}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past">
          <Card>
            <CardHeader className="flex flex-col md:flex-row gap-2">
              <CardTitle>past entries ({entries.length})</CardTitle>
              <div className="flex gap-2">
                <input
                  placeholder="search notes"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded text-sm"
                />
                <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded text-sm">
                  <option value="">all moods</option>
                  {MOODS.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.id}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 max-h-96 overflow-auto">
              {Object.entries(groupedPast).map(([month, monthEntries]) => (
                <div key={month}>
                  <div className="font-bold text-slate-400 mb-2">{month} ({monthEntries.length})</div>
                  <div className="space-y-2">
                    {monthEntries.slice(-5).map(e => (
                      <div key={e.id} className="flex items-start gap-3 p-3 bg-slate-900/30 rounded-lg hover:bg-slate-800/50">
                        <div className="text-lg min-w-0 flex-shrink-0">{e.mood}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{e.note}</div>
                          <div className="text-xs text-slate-500 mt-1 flex gap-2">
                            <span>{e.emotions.slice(0,3).join(', ')}</span>
                            <span>{e.date}</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">+{e.xpEarned} xp</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>quest progress</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={emotionData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                      {emotionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>row bonuses active</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rowBonuses.map((bonus, i) => (
                  <div key={i} className={`p-3 rounded-lg text-center text-sm ${bonus ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400 font-bold animate-pulse' : 'bg-slate-800/50 text-slate-500'}`}>
                    row {i+1} {bonus ? 'complete! +50xp bonus' : 'in progress'}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>achievements</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {achievements.map(a => (
                  <Badge key={a.id} variant={a.unlocked ? 'default' : 'secondary'} className="p-3 h-auto min-w-0">
                    <div className="text-xs space-y-1 text-center">
                      <div className="text-lg">{a.icon}</div>
                      <div className="font-bold line-clamp-1">{a.name}</div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{width: `${a.progress * 100}%`}} />
                      </div>
                    </div>
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dashboards" className="space-y-4">
          <FinancialHub />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <LogBlock onSave={(log) => console.log('log saved', log)} />
            </div>
            <div>
              <LogsTable />
              <div className="mt-4">
                <LogsCalendar />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sensory">
          <SensoryHub />
        </TabsContent>

        <TabsContent value="fixations">
          <FixationTrap />
        </TabsContent>

        <TabsContent value="exercise">
          <ExerciseTracker />
        </TabsContent>
        <TabsContent value="finances">
          <FinancialHub />
        </TabsContent>
        <TabsContent value="buddies">
          <GamifiedPets />
        </TabsContent>
        <TabsContent value="voice">
          <VoiceInput onTranscribe={(text) => setEntry(prev => ({ ...prev, note: text }))} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Journal

