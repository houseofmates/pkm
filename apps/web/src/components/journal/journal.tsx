import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Flame, ChevronDown, ChevronRight } from 'lucide-react'
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import ExerciseTracker from './exercise-tracker'
import FinancialHub from './financial-hub'
import GamifiedPets from './gamified-pets'
import ToothbrushGame from './toothbrush-game'
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

const MOODS = [
  { id: 'happy', emoji: '😊', color: '#10b981' },
  { id: 'sad', emoji: '😢', color: '#ef4444' },
  { id: 'angry', emoji: '😠', color: '#f59e0b' },
  { id: 'calm', emoji: '😌', color: '#3b82f6' },
  { id: 'anxious', emoji: '😰', color: '#8b5cf6' },
  { id: 'excited', emoji: '🤩', color: '#ec4899' }
]

const EMOTIONS = [ 'joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust' ]
const ACTIVITIES = [ 'walk', 'read', 'meditate', 'work' ]
const COLORS = ['#0088FE', '#00C49F', '#f59e0b', '#FF8042']

function CollapsibleSection({ title, children, defaultOpen = false, isOpen, onToggle }: { title: string; children: React.ReactNode; defaultOpen?: boolean; isOpen?: boolean; onToggle?: () => void }) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const open = isOpen !== undefined ? isOpen : internalOpen
  const toggle = onToggle || (() => setInternalOpen(!internalOpen))
  
  return (
    <Card className="overflow-hidden border-slate-800/50">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-slate-800/50 transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && <div className="p-3 pt-0">{children}</div>}
    </Card>
  )
}

const Journal: React.FC = () => {
  const [entry, setEntry] = useState<JournalEntry>({ id: '', date: '', mood: '', emotions: [], activities: [], note: '', xpEarned: 0 })
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [tab, setTab] = useState('today')
  const [filterMood, setFilterMood] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSaved, setIsSaved] = useState(false)
  const [focusMode, setFocusMode] = useState(true)
  const [openSection, setOpenSection] = useState<string | null>('mood')
  const [trackSection, setTrackSection] = useState<string | null>(null)
  const [focusTabSection, setFocusTabSection] = useState<string | null>('quests')

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

  const filteredPastEntries = entries.filter(e => 
    (!filterMood || e.mood === filterMood) &&
    (!searchTerm || e.note.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const emotionData = [{ name: 'joy', value: 40 }, { name: 'sadness', value: 30 }]

  const handleSave = useCallback(() => {
    if (!entry.mood) return
    const newEntry = { ...entry, id: Date.now().toString(), date: new Date().toDateString(), xpEarned: 10 }
    setEntries(prev => [...prev, newEntry])
    earnXp(10, 'journal entry')
    if (entry.note.length > 50) earnXp(5, 'long note')
    toast('entry saved! +10xp')
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
    setEntry({ id: '', date: '', mood: '', emotions: [], activities: [], note: '', xpEarned: 0 })
  }, [entry, earnXp])

  useEffect(() => {
    resetDaily()
  }, [resetDaily])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && entry.mood) {
        handleSave()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [entry.mood, handleSave])

  const levelBadge = '🌱'

  const toggleSection = (section: string) => {
    if (focusMode) {
      setOpenSection(openSection === section ? null : section)
    } else {
      setOpenSection(openSection === section ? null : section)
    }
  }

  // filter past by month
  const groupedPast = filteredPastEntries.reduce((acc, e) => {
    const month = new Date(e.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    if (!acc[month]) acc[month] = []
    acc[month].push(e)
    return acc
  }, {} as Record<string, JournalEntry[]>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-black p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <div className="flex items-center gap-2">
          <span className="text-lg">{levelBadge}</span>
          <span>level {level}</span>
          <span className="text-slate-600">·</span>
          <Flame className="w-3 h-3" />
          <span>{currentStreak}d</span>
        </div>
        <div className="text-xs">
          {currentXp}/{xpToNextLevel} xp
        </div>
      </div>

      <Progress value={(currentXp / xpToNextLevel) * 100} className="h-1 mb-4" />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="today">today</TabsTrigger>
          <TabsTrigger value="track">track</TabsTrigger>
          <TabsTrigger value="focus">focus</TabsTrigger>
          <TabsTrigger value="history">history</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3">
          <CollapsibleSection title="how are you feeling?" isOpen={openSection === 'mood'} onToggle={() => toggleSection('mood')}>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map(m => (
                <Button 
                  key={m.id} 
                  variant={entry.mood === m.id ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setEntry({...entry, mood: m.id})} 
                  className="text-lg h-14"
                  style={entry.mood === m.id ? { backgroundColor: m.color, borderColor: m.color } : {}}
                >
                  {m.emoji}
                </Button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="emotions" isOpen={openSection === 'emotions'} onToggle={() => toggleSection('emotions')}>
            <div className="flex flex-wrap gap-2">
              {EMOTIONS.map(e => (
                <Button key={e} variant={entry.emotions.includes(e) ? 'default' : 'outline'} size="sm" onClick={() => toggleEmotion(e)}>
                  {e}
                </Button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="activities" isOpen={openSection === 'activities'} onToggle={() => toggleSection('activities')}>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map(a => (
                <Button key={a} variant={entry.activities.includes(a) ? 'default' : 'outline'} size="sm" onClick={() => toggleActivity(a)}>
                  {a}
                </Button>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="reflection timer" isOpen={openSection === 'timer'} onToggle={() => toggleSection('timer')}>
            <ReflectionTimer onComplete={(duration, prompt) => {
              setEntry(prev => ({ ...prev, note: `${prompt}\n(reflection ${duration/60}min)` }))
              earnXp(15, 'timer reflection')
            }} />
          </CollapsibleSection>

          <Card>
            <CardContent className="p-3">
              <textarea
                value={entry.note}
                onChange={(e) => setEntry({...entry, note: e.target.value})}
                className="w-full h-24 p-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 resize-none focus:ring-2 focus:ring-slate-600 text-sm"
                placeholder="your thoughts... (ctrl+enter to save)"
              />
            </CardContent>
          </Card>
          <Button 
            onClick={handleSave} 
            disabled={!entry.mood || isSaved}
            className={`w-full transition-colors ${isSaved ? 'bg-emerald-600 hover:bg-emerald-600' : ''}`}
          >
            {isSaved ? 'saved!' : (entry.mood ? 'save entry' : 'pick a mood first')}
          </Button>
        </TabsContent>

        <TabsContent value="track" className="space-y-3">
          <CollapsibleSection title="hygiene" isOpen={trackSection === 'hygiene'} onToggle={() => setTrackSection(trackSection === 'hygiene' ? null : 'hygiene')}>
            <ToothbrushGame />
          </CollapsibleSection>
          <CollapsibleSection title="exercise" isOpen={trackSection === 'exercise'} onToggle={() => setTrackSection(trackSection === 'exercise' ? null : 'exercise')}>
            <ExerciseTracker />
          </CollapsibleSection>
          <CollapsibleSection title="finance" isOpen={trackSection === 'finance'} onToggle={() => setTrackSection(trackSection === 'finance' ? null : 'finance')}>
            <FinancialHub />
          </CollapsibleSection>
          <CollapsibleSection title="sensory" isOpen={trackSection === 'sensory'} onToggle={() => setTrackSection(trackSection === 'sensory' ? null : 'sensory')}>
            <SensoryHub />
          </CollapsibleSection>
          <CollapsibleSection title="logs" isOpen={trackSection === 'logs'} onToggle={() => setTrackSection(trackSection === 'logs' ? null : 'logs')}>
            <div className="space-y-3">
              <LogBlock onSave={(log) => console.log('log saved', log)} />
              <LogsTable />
              <LogsCalendar />
            </div>
          </CollapsibleSection>
        </TabsContent>

        <TabsContent value="focus" className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">focus mode</span>
            <button 
              onClick={() => setFocusMode(!focusMode)}
              className={`text-xs px-2 py-1 rounded ${focusMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
            >
              {focusMode ? 'on' : 'off'}
            </button>
          </div>
          <CollapsibleSection title="daily quests" isOpen={focusTabSection === 'quests'} onToggle={() => setFocusTabSection(focusTabSection === 'quests' ? null : 'quests')}>
            <div className="grid grid-cols-2 gap-2">
              {quests.map(q => (
                <Button
                  key={q.id}
                  variant={q.completed ? 'default' : 'outline'}
                  onClick={() => completeQuest(q.id)}
                  className={`h-16 p-2 text-xs ${rowBonuses[q.row] ? 'ring-2 ring-emerald-500' : ''}`}
                >
                  <span className="line-clamp-2">{q.name}</span>
                </Button>
              ))}
            </div>
            {questProgress > 0 && (
              <div className="mt-2 text-xs text-slate-400">{questProgress.toFixed(0)}% complete</div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="achievements" isOpen={focusTabSection === 'achievements'} onToggle={() => setFocusTabSection(focusTabSection === 'achievements' ? null : 'achievements')}>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map(a => (
                <div key={a.id} className={`p-2 rounded text-xs text-center ${a.unlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 text-slate-500'}`}>
                  <div className="text-lg">{a.icon}</div>
                  <div className="truncate">{a.name}</div>
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="stats" isOpen={focusTabSection === 'stats'} onToggle={() => setFocusTabSection(focusTabSection === 'stats' ? null : 'stats')}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">emotion breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={emotionData} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {emotionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-3">
                  <CardTitle className="text-sm">row bonuses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {rowBonuses.map((bonus, i) => (
                    <div key={i} className={`text-xs p-2 rounded ${bonus ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/50 text-slate-500'}`}>
                      row {i+1} {bonus ? '+50xp' : ''}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="tools" isOpen={focusTabSection === 'tools'} onToggle={() => setFocusTabSection(focusTabSection === 'tools' ? null : 'tools')}>
            <div className="space-y-3">
              <FixationTrap />
              <VoiceInput onTranscribe={(text) => setEntry(prev => ({ ...prev, note: text }))} />
              <GamifiedPets />
            </div>
          </CollapsibleSection>
        </TabsContent>

        <TabsContent value="history" className="space-y-3">
          <Card>
            <CardHeader className="p-3">
              <div className="flex gap-2">
                <input
                  placeholder="search notes"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded text-sm"
                />
                <select value={filterMood} onChange={(e) => setFilterMood(e.target.value)} className="p-2 bg-slate-900 border border-slate-700 rounded text-sm">
                  <option value="">all</option>
                  {MOODS.map(m => <option key={m.id} value={m.id}>{m.emoji}</option>)}
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-auto">
              {filteredPastEntries.length === 0 ? (
                <div className="text-sm text-slate-500 text-center py-8">no entries yet</div>
              ) : (
                Object.entries(groupedPast).map(([month, monthEntries]) => (
                  <div key={month}>
                    <div className="text-xs text-slate-500 mb-2">{month}</div>
                    <div className="space-y-2">
                      {monthEntries.slice(-5).map(e => (
                        <div key={e.id} className="flex items-start gap-2 p-2 bg-slate-900/30 rounded hover:bg-slate-800/50">
                          <span className="text-lg">{e.mood}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm truncate">{e.note || 'no note'}</div>
                            <div className="text-xs text-slate-500">{e.emotions.slice(0,3).join(', ')}</div>
                          </div>
                          <Badge variant="secondary" className="text-xs">+{e.xpEarned}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Journal

