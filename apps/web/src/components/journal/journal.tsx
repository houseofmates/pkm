import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs'
import { Button } from '../../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Progress } from '../../ui/progress'
import { Badge } from '../../ui/badge'
import { Mic, Flame } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, BarChart, Bar } from 'recharts'
import ExerciseTracker from './exercise-tracker'
import FinancialHub from './financial-hub'
import GamifiedPets from './gamified-pets'
import VoiceInput from './voice-input'
import { useGamificationStore } from '../../stores/gamification-store'
// import { useAppSetting } from '../../hooks/use-app-setting' // will create hook later
const [entries, setEntries] = useState<JournalEntry[]>([])
import { toast } from 'sonner' // assume exists

// types from store + existing
interface JournalEntry {
  id: string
  date: string
  mood: string
  emotions: string[]
  activities: string[]
  note: string
  xpEarned: number
}

// moods, emotions, activities from plan
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

const Journal: React.FC = () => {
  const [entry, setEntry] = useState<JournalEntry>({ id: '', date: '', mood: '', emotions: [], activities: [], note: '', xpEarned: 0 })
  const [tab, setTab] = useState('today')
  const { currentXp, level, xpToNextLevel, quests, questProgress, rowBonuses, achievements, currentStreak, earnXp, completeQuest, resetDaily } = useGamificationStore()

  // persist entries
const [entries, setEntries] = useState<JournalEntry[]>([])

  // charts data
  const moodData: { date: string; mood: number }[] = [{ date: '2024-01-01', mood: 5 }, { date: '2024-01-02', mood: 4 }]
  const emotionData = [{ name: 'joy', value: 40 }, { name: 'sadness', value: 30 }]
  const activityData: { name: string; value: number }[] = [{ name: 'walk', value: 10 }, { name: 'read', value: 5 }]

  // save entry
  const handleSave = useCallback(() => {
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toDateString(), xpEarned: 10 }
    setEntries(prev => [...(prev as JournalEntry[]), newEntry])
    earnXp(10, 'journal entry')
    if (entry.note.length > 50) earnXp(5, 'long note')
    // streak update
    toast('entry saved! +10xp')
  }, [entry, earnXp, setEntries])

  // daily reset
  useEffect(() => {
    resetDaily()
  }, [])

  // level badge
  const badgeIndex = Math.min(level - 1, 24)
  const levelBadge = '🌱' // LEVEL_BADGES[badgeIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-black p-4 md:p-8 space-y-6">
      {/* header */}
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

      {/* tabs */}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="today">today hub</TabsTrigger>
          <TabsTrigger value="quests">master quests</TabsTrigger>
          <TabsTrigger value="dashboards">dashboards</TabsTrigger>
          <TabsTrigger value="sensory">sensory</TabsTrigger>
          <TabsTrigger value="fixations">fixations</TabsTrigger>
          <TabsTrigger value="stats">stats</TabsTrigger>
        </TabsList>

        {/* today tab: mood/emotion/activity/note */}
        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* mood picker */}
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
            {/* emotions picker */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">emotions</CardTitle>
              </CardHeader>
              <CardContent className="max-h-32 overflow-auto p-2 space-y-1">
                {EMOTIONS.map(e => (
                  <Button key={e} variant="ghost" size="sm" onClick={() => toggleEmotion(e)}>
                    {e}
                  </Button>
                ))}
              </CardContent>
            </Card>
            {/* activities */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">activities</CardTitle>
              </CardHeader>
              <CardContent className="max-h-32 overflow-auto p-2 space-y-1">
                {ACTIVITIES.map(a => (
                  <Button key={a} variant="ghost" size="sm" onClick={() => toggleActivity(a)}>
                    {a}
                  </Button>
                ))}
              </CardContent>
            </Card>
            {/* voice input placeholder */}
            <Card>
              <CardHeader className="p-3">
                <CardTitle className="text-sm">voice note</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <Button variant="outline" size="sm" className="w-full">
                  <Mic className="w-4 h-4 mr-2" />
                  speak note
                </Button>
              </CardContent>
            </Card>
          </div>
          {/* note textarea */}
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

        {/* quests tab: 4x4 grid oral-b style */}
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
                    className={`h-20 p-2 ${rowBonuses[q.row] ? 'ring-2 ring-emerald-500' : ''}`}
                  >
                    <div className="text-xs line-clamp-3">{q.name}</div>
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-emerald-400">
                {rowBonuses.map((bonus, i) => (
                  <div key={i} className={bonus ? 'bg-emerald-500/20 rounded p-1' : 'text-slate-600'}>
                    row {i+1} bonus {bonus ? '✅' : ''}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* stats tab: charts */}
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
                      {emotionData.map((entry, index) => (
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
        </TabsContent>

        <TabsContent value="sensory">
          import SensoryHub from './sensory-hub'
          <SensoryHub />
        </TabsContent>

        <TabsContent value="fixations">
          import FixationTrap from './fixation-trap'
          <FixationTrap />
        </TabsContent>

        {/* exercise, finances, etc placeholders for phase 2 */}
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

      {/* past entries list */}
      <Card>
        <CardHeader>
          <CardTitle>past entries ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-auto">
          {entries.slice(-10).map(e => (
            <div key={e.id} className="flex items-center gap-3 p-3 bg-slate-900/30 rounded-lg">
              <div className="text-lg">{(e as JournalEntry).mood}</div>
              <div className="text-sm text-slate-400 truncate flex-1">{(e as JournalEntry).note}</div>
              <div className="text-xs text-emerald-400">+{(e as JournalEntry).xpEarned} xp</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

  const toggleEmotion = React.useCallback((emotion: string) => {
  setEntry(prev => ({
    ...prev,
    emotions: prev.emotions.includes(emotion) 
      ? prev.emotions.filter(e => e !== emotion)
      : [...prev.emotions, emotion]
  }))
}, [])
  const toggleActivity = React.useCallback((activity: string) => {
  setEntry(prev => ({
    ...prev,
    activities: prev.activities.includes(activity)
      ? prev.activities.filter(a => a !== activity)
      : [...prev.activities, activity]
  }))
}, [])

export default Journal

