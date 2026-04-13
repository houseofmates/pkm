import React, { useState, useEffect, useCallback, useDeferredValue, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'

import { Button } from '../ui/button'

import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'

import { Progress } from '../ui/progress'

import { Badge } from '../ui/badge'

import { Flame, ChevronDown, ChevronRight, Search } from 'lucide-react'

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'

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
import { useHaptics } from '../../../../packages/core/src/hooks/useHaptics'

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



interface MoodOption {

  id: string

  emoji: string

  color: string

}



const STORAGE_KEY = 'pkm.journal.entries.v1'

const MAX_ENTRIES = 365

const THEME_COLORS = ['#facc15', '#f59e0b', '#fde68a', '#ca8a04']



const MOODS: MoodOption[] = [

  { id: 'happy', emoji: '😊', color: '#eab308' },
  { id: 'sad', emoji: '😢', color: '#f97316' },
  { id: 'angry', emoji: '😠', color: '#ea580c' },
  { id: 'calm', emoji: '😌', color: '#facc15' },
  { id: 'anxious', emoji: '😰', color: '#d97706' },
  { id: 'excited', emoji: '🤩', color: '#f59e0b' }
]



const EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust']

const ACTIVITIES = ['walk', 'read', 'meditate', 'work']

const EMPTY_ENTRY: JournalEntry = { id: '', date: '', mood: '', emotions: [], activities: [], note: '', xpEarned: 0 }

const tabVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}



const logJournalWarning = (message: string, error: unknown) => {

  console.warn(`[journal] ${message}`, error)

}



const isJournalEntry = (value: unknown): value is JournalEntry => {

  if (typeof value !== 'object' || value === null) {

    return false

  }



  const candidate = value as Partial<JournalEntry>

  return (

    typeof candidate.id === 'string' &&

    typeof candidate.date === 'string' &&

    typeof candidate.mood === 'string' &&

    Array.isArray(candidate.emotions) &&

    Array.isArray(candidate.activities) &&

    typeof candidate.note === 'string' &&

    typeof candidate.xpEarned === 'number'

  )

}



const loadStoredEntries = (): JournalEntry[] => {

  if (typeof window === 'undefined') {

    return []

  }



  try {

    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {

      return []

    }



    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {

      return []

    }



    return parsed.filter(isJournalEntry).slice(-MAX_ENTRIES)

  } catch (error) {

    logJournalWarning('failed to load stored entries', error)

    return []

  }

}



function CollapsibleSection({

  title,

  children,

  defaultOpen = false,

  isOpen,

  onToggle,

  panelId

}: {

  title: string

  children: React.ReactNode

  defaultOpen?: boolean

  isOpen?: boolean

  onToggle?: () => void

  panelId: string

}) {

  const [internalOpen, setInternalOpen] = useState(defaultOpen)

  const open = isOpen !== undefined ? isOpen : internalOpen

  const toggle = onToggle || (() => setInternalOpen(!internalOpen))



  return (

    <Card className="overflow-hidden border-amber-950/60 bg-black/60">

      <button

        type="button"

        onClick={toggle}

        className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-amber-500/10 transition-colors text-amber-100"

        aria-expanded={open}

        aria-controls={panelId}

      >

        <span>{title}</span>

        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}

      </button>

      {open && (

        <div className="p-3 pt-0" id={panelId} role="region" aria-label={title}>

          {children}

        </div>

      )}

    </Card>

  )

}



const Journal: React.FC = () => {

  const [entry, setEntry] = useState<JournalEntry>(EMPTY_ENTRY)

  const { impact, selectionStart, selectionChanged, complete, light, medium, heavy, success, error } = useHaptics();

  const [entries, setEntries] = useState<JournalEntry[]>(() => loadStoredEntries())

  const [tab, setTab] = useState('today')

  const [filterMood, setFilterMood] = useState('')

  const [emotionSearch, setEmotionSearch] = useState('')

  const [activitySearch, setActivitySearch] = useState('')

  const [searchTerm, setSearchTerm] = useState('')

  const [isSaved, setIsSaved] = useState(false)

  const [focusMode, setFocusMode] = useState(true)

  const [openSection, setOpenSection] = useState<string | null>('mood')

  const [trackSection, setTrackSection] = useState<string | null>(null)

  const [focusTabSection, setFocusTabSection] = useState<string | null>('quests')

  const deferredSearchTerm = useDeferredValue(searchTerm)



  const { currentXp, level, xpToNextLevel, quests, questProgress, rowBonuses, achievements, currentStreak, earnXp, completeQuest, resetDaily } = useGamificationStore()



  useEffect(() => {

    try {

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))

    } catch (error) {

      logJournalWarning('failed to persist entries', error)

    }

  }, [entries])



  const toggleEmotion = useCallback((emotion: string) => {

    setEntry((prev: JournalEntry) => ({

      ...prev,

      emotions: prev.emotions.includes(emotion)

        ? prev.emotions.filter((existingEmotion: string) => existingEmotion !== emotion)

        : [...prev.emotions, emotion]

    }))

  }, [])



  const toggleActivity = useCallback((activity: string) => {

    setEntry((prev: JournalEntry) => ({

      ...prev,

      activities: prev.activities.includes(activity)

        ? prev.activities.filter((existingActivity: string) => existingActivity !== activity)

        : [...prev.activities, activity]

    }))

  }, [])



  const filteredPastEntries = useMemo(() => {
    if (!deferredSearchTerm && !filterMood) return entries;

    return entries.filter((savedEntry) => {
      const matchesMood = !filterMood || savedEntry.mood === filterMood;
      const matchesSearch = !deferredSearchTerm ||
        savedEntry.note.toLowerCase().includes(deferredSearchTerm.toLowerCase());
      return matchesMood && matchesSearch;
    });
  }, [deferredSearchTerm, entries, filterMood])



  const emotionData = useMemo(() => {

    const emotionCounts = new Map<string, number>()



    entries.forEach((savedEntry) => {

      savedEntry.emotions.forEach((emotion) => {

        emotionCounts.set(emotion, (emotionCounts.get(emotion) ?? 0) + 1)

      })

    })



    if (emotionCounts.size === 0) {

      return EMOTIONS.map((emotion) => ({ name: emotion, value: 1 }))

    }



    return EMOTIONS.map((emotion) => ({

      name: emotion,

      value: emotionCounts.get(emotion) ?? 0

    }))

  }, [entries])



  const handleSave = useCallback(() => {

    if (!entry.mood) {

      return

    }



    const moodEmoji = MOODS.find((moodOption) => moodOption.id === entry.mood)?.emoji ?? entry.mood

    const newEntry = {

      ...entry,

      id: Date.now().toString(),

      mood: moodEmoji,

      date: new Date().toISOString(),

      xpEarned: 10

    }



    setEntries((prev) => [...prev.slice(-MAX_ENTRIES + 1), newEntry])

    earnXp(10, 'journal entry')



    if (entry.note.length > 50) {

      earnXp(5, 'long note')

    }



    toast('entry saved! +10xp')

    setIsSaved(true)

    setTimeout(() => setIsSaved(false), 2000)

    setEntry(EMPTY_ENTRY)

  }, [entry, earnXp])



  useEffect(() => {

    resetDaily()

  }, [resetDaily])



  useEffect(() => {

    const handleKeyDown = (event: KeyboardEvent) => {

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && entry.mood) {

        handleSave()

      }

    }



    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)

  }, [entry.mood, handleSave])



  const groupedPast = useMemo(() => {
    if (filteredPastEntries.length === 0) return {};

    return filteredPastEntries.reduce((acc, savedEntry) => {
      const month = new Date(savedEntry.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      if (!acc[month]) {
        acc[month] = []
      }

      acc[month].push(savedEntry)
      return acc
    }, {} as Record<string, JournalEntry[]>)
  }, [filteredPastEntries])



  return (

    <div className="min-h-screen bg-black p-4 md:p-8 space-y-6 text-amber-50">

      <div className="flex items-center justify-between text-sm text-amber-200/80">

        <div className="flex items-center gap-2">

          <span className="text-lg" aria-label="level icon">

            🌱

          </span>

          <span>level {level}</span>

          <span className="text-amber-700">·</span>

          <Flame className="w-3 h-3 text-amber-400" />

          <span>{currentStreak}d</span>

        </div>

        <div className="text-xs">

          {currentXp}/{xpToNextLevel} xp

        </div>

      </div>



      <Progress value={(currentXp / xpToNextLevel) * 100} className="h-1 mb-4 bg-amber-950 [&>*]:bg-amber-400" />



      <Tabs value={tab} onValueChange={setTab} className="w-full">

        <TabsList className="grid w-full grid-cols-4 bg-zinc-950 border border-amber-900/50">

          <TabsTrigger value="today" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200">

            today

          </TabsTrigger>

          <TabsTrigger value="track" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200">

            track

          </TabsTrigger>

          <TabsTrigger value="focus" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200">

            focus

          </TabsTrigger>

          <TabsTrigger value="history" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-200">

            history

          </TabsTrigger>

        </TabsList>



        <TabsContent value="today" className="space-y-3">

          <CollapsibleSection title="how are you feeling?" isOpen={openSection === 'mood'} onToggle={() => setOpenSection(openSection === 'mood' ? null : 'mood')} panelId="mood-panel">

            <div className="grid grid-cols-3 gap-2" role="group" aria-label="mood picker">

              {MOODS.map((moodOption) => (

                <Button

                  key={moodOption.id}

                  variant={entry.mood === moodOption.id ? 'default' : 'outline'}

                  size="sm"

                  onClick={() => setEntry({ ...entry, mood: moodOption.id })}

                  className="text-lg h-14 border-amber-800"

                  style={entry.mood === moodOption.id ? { backgroundColor: moodOption.color, borderColor: moodOption.color, color: '#111111' } : { color: '#fef3c7' }}

                  aria-pressed={entry.mood === moodOption.id}

                  aria-label={`set mood to ${moodOption.id}`}

                >

                  {moodOption.emoji}

                </Button>

              ))}

            </div>

          </CollapsibleSection>



          <CollapsibleSection title="emotions" isOpen={openSection === 'emotions'} onToggle={() => setOpenSection(openSection === 'emotions' ? null : 'emotions')} panelId="emotions-panel">

            <div className="flex flex-wrap gap-2">

              <input

                type="text"

                placeholder="search emotions..."

                value={emotionSearch}

                onChange={(e) => setEmotionSearch(e.target.value)}

                className="w-full mb-2 p-2 bg-zinc-950 border border-amber-900/60 rounded text-sm placeholder-amber-500"

              />

              <div className="h-48 overflow-y-auto flex flex-wrap gap-2">
                {EMOTIONS.filter(emotion => emotion.toLowerCase().includes(emotionSearch.toLowerCase())).map((emotion) => (
                  <Button
                    key={emotion}
                    variant={entry.emotions.includes(emotion) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleEmotion(emotion)}
                    className="border-amber-800"
                    aria-pressed={entry.emotions.includes(emotion)}
                  >
                    {emotion}
                  </Button>
                ))}
              </div>
            </div>
          </CollapsibleSection>



          <CollapsibleSection title="activities" isOpen={openSection === 'activities'} onToggle={() => setOpenSection(openSection === 'activities' ? null : 'activities')} panelId="activities-panel">

            <div className="flex flex-wrap gap-2">

              <input

                type="text"

                placeholder="search activities..."

                value={activitySearch}

                onChange={(e) => setActivitySearch(e.target.value)}

                className="w-full mb-2 p-2 bg-zinc-950 border border-amber-900/60 rounded text-sm placeholder-amber-500"

              />

              <div className="h-48 overflow-y-auto flex flex-wrap gap-2">

                {ACTIVITIES.filter(activity => activity.toLowerCase().includes(activitySearch.toLowerCase())).map((activity) => (
                  <Button
                    key={activity}
                    variant={entry.activities.includes(activity) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { selectionStart(); toggleActivity(activity); }}
                    className="border-amber-800"
                    aria-pressed={entry.activities.includes(activity)}
                  >
                    {activity}
                  </Button>
                ))}
              </div>
            </div>
          </CollapsibleSection>



          <CollapsibleSection title="reflection timer" isOpen={openSection === 'timer'} onToggle={() => setOpenSection(openSection === 'timer' ? null : 'timer')} panelId="timer-panel">

            <ReflectionTimer

              onComplete={(duration, prompt) => {

                setEntry((prev) => ({ ...prev, note: `${prompt}\n(reflection ${duration / 60}min)` }))

                earnXp(15, 'timer reflection')

              }}

            />

          </CollapsibleSection>



          <Card className="border-amber-950/60 bg-black/60">

            <CardContent className="p-3">

              <label htmlFor="journal-note" className="sr-only">

                journal note

              </label>

              <textarea

                id="journal-note"

                value={entry.note}

                onChange={(event) => setEntry({ ...entry, note: event.target.value })}

                className="w-full h-24 p-3 bg-zinc-950 border border-amber-900/60 rounded-lg text-amber-100 placeholder-amber-700 resize-none focus:ring-2 focus:ring-amber-500 text-sm"

                placeholder="your thoughts... (ctrl+enter to save)"

              />

            </CardContent>

          </Card>

          <Button

            onClick={handleSave}

            disabled={!entry.mood || isSaved}

            className={`w-full transition-colors bg-amber-500 text-black hover:bg-amber-400 disabled:bg-amber-950 disabled:text-amber-700 ${isSaved ? 'bg-amber-400 hover:bg-amber-400' : ''}`}

          >

            {isSaved ? 'saved!' : entry.mood ? 'save entry' : 'pick a mood first'}

          </Button>

          <p className="text-xs text-amber-500/80" aria-live="polite">

            {filteredPastEntries.length} total entries stored locally (max {MAX_ENTRIES}).

          </p>

        </TabsContent>



        <TabsContent value="track" className="space-y-3">

          <CollapsibleSection title="hygiene" isOpen={trackSection === 'hygiene'} onToggle={() => setTrackSection(trackSection === 'hygiene' ? null : 'hygiene')} panelId="hygiene-panel">

            <ToothbrushGame />

          </CollapsibleSection>

          <CollapsibleSection title="exercise" isOpen={trackSection === 'exercise'} onToggle={() => setTrackSection(trackSection === 'exercise' ? null : 'exercise')} panelId="exercise-panel">

            <ExerciseTracker />

          </CollapsibleSection>

          <CollapsibleSection title="finance" isOpen={trackSection === 'finance'} onToggle={() => setTrackSection(trackSection === 'finance' ? null : 'finance')} panelId="finance-panel">

            <FinancialHub />

          </CollapsibleSection>

          <CollapsibleSection title="sensory" isOpen={trackSection === 'sensory'} onToggle={() => setTrackSection(trackSection === 'sensory' ? null : 'sensory')} panelId="sensory-panel">

            <SensoryHub />

          </CollapsibleSection>

          <CollapsibleSection title="logs" isOpen={trackSection === 'logs'} onToggle={() => setTrackSection(trackSection === 'logs' ? null : 'logs')} panelId="logs-panel">

            <div className="space-y-3">

              <LogBlock onSave={(log) => console.info('log saved', log)} />

              <LogsTable />

              <LogsCalendar />

            </div>

          </CollapsibleSection>

        </TabsContent>



        <TabsContent value="focus" className="space-y-3">

          <div className="flex items-center justify-between mb-2">

            <span className="text-xs text-amber-500">focus mode</span>

            <button

              type="button"

              onClick={() => setFocusMode(!focusMode)}

              className={`text-xs px-2 py-1 rounded ${focusMode ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-900 text-amber-600'}`}

              aria-pressed={focusMode}

            >

              {focusMode ? 'on' : 'off'}

            </button>

          </div>

          <CollapsibleSection title="daily quests" isOpen={focusTabSection === 'quests'} onToggle={() => setFocusTabSection(focusTabSection === 'quests' ? null : 'quests')} panelId="quests-panel">

            <div className="grid grid-cols-2 gap-2">

              {quests.map((quest) => (

                <Button

                  key={quest.id}

                  variant={quest.completed ? 'default' : 'outline'}

                  onClick={() => completeQuest(quest.id)}

                  className={`h-16 p-2 text-xs border-amber-800 ${rowBonuses[quest.row] ? 'ring-2 ring-amber-500' : ''}`}

                >

                  <span className="line-clamp-2">{quest.name}</span>

                </Button>

              ))}

            </div>

            {questProgress > 0 && <div className="mt-2 text-xs text-amber-300">{questProgress.toFixed(0)}% complete</div>}

          </CollapsibleSection>



          <CollapsibleSection title="achievements" isOpen={focusTabSection === 'achievements'} onToggle={() => setFocusTabSection(focusTabSection === 'achievements' ? null : 'achievements')} panelId="achievements-panel">

            <div className="grid grid-cols-2 gap-2">

              {achievements.map((achievement) => (

                <div key={achievement.id} className={`p-2 rounded text-xs text-center ${achievement.unlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-900/70 text-amber-700'}`}>

                  <div className="text-lg">{achievement.icon}</div>

                  <div className="truncate">{achievement.name}</div>

                </div>

              ))}

            </div>

          </CollapsibleSection>



          <CollapsibleSection title="stats" isOpen={focusTabSection === 'stats'} onToggle={() => setFocusTabSection(focusTabSection === 'stats' ? null : 'stats')} panelId="stats-panel">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              <Card className="border-amber-950/60 bg-black/70">

                <CardHeader className="p-3">

                  <CardTitle className="text-sm">emotion breakdown</CardTitle>

                </CardHeader>

                <CardContent>

                  <ResponsiveContainer width="100%" height={150}>

                    <PieChart>

                      <Pie data={emotionData} cx="50%" cy="50%" outerRadius={60} dataKey="value">

                        {emotionData.map((_, index) => (

                          <Cell key={`cell-${index}`} fill={THEME_COLORS[index % THEME_COLORS.length]} />

                        ))}

                      </Pie>

                      <Tooltip contentStyle={{ backgroundColor: '#111111', borderColor: '#78350f', color: '#fef3c7' }} />

                    </PieChart>

                  </ResponsiveContainer>

                </CardContent>

              </Card>

              <Card className="border-amber-950/60 bg-black/70">

                <CardHeader className="p-3">

                  <CardTitle className="text-sm">row bonuses</CardTitle>

                </CardHeader>

                <CardContent className="space-y-1">

                  {rowBonuses.map((bonus, index) => (

                    <div key={index} className={`text-xs p-2 rounded ${bonus ? 'bg-amber-500/20 text-amber-300' : 'bg-zinc-900/70 text-amber-700'}`}>

                      row {index + 1} {bonus ? '+50xp' : ''}

                    </div>

                  ))}

                </CardContent>

              </Card>

            </div>

          </CollapsibleSection>



          <CollapsibleSection title="tools" isOpen={focusTabSection === 'tools'} onToggle={() => setFocusTabSection(focusTabSection === 'tools' ? null : 'tools')} panelId="tools-panel">
            <div className="space-y-3">
              <FixationTrap />
              <VoiceInput onTranscribe={(text) => setEntry((prev) => ({ ...prev, note: text }))} />
              <GamifiedPets />
            </div>
          </CollapsibleSection>

        </TabsContent>



        <TabsContent value="history" className="space-y-3">

          <Card className="border-amber-950/60 bg-black/70">

            <CardHeader className="p-3">

              <div className="flex gap-2">

                <label htmlFor="search-notes" className="sr-only">

                  search notes

                </label>

                <div className="relative flex-1">

                  <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-amber-600" aria-hidden />

                  <input

                    id="search-notes"

                    placeholder="search notes"

                    value={searchTerm}

                    onChange={(event) => setSearchTerm(event.target.value)}

                    className="w-full p-2 pl-8 bg-zinc-950 border border-amber-900/60 rounded text-sm"

                  />

                </div>

                <label htmlFor="mood-filter" className="sr-only">

                  mood filter

                </label>

                <select id="mood-filter" value={filterMood} onChange={(event) => setFilterMood(event.target.value)} className="p-2 bg-zinc-950 border border-amber-900/60 rounded text-sm">

                  <option value="">all</option>

                  {MOODS.map((moodOption) => (

                    <option key={moodOption.id} value={moodOption.emoji}>

                      {moodOption.emoji}

                    </option>

                  ))}

                </select>

              </div>

            </CardHeader>

            <CardContent className="space-y-3 max-h-96 overflow-auto">
              {filteredPastEntries.length === 0 ? (
                <div className="text-center text-amber-700 py-8">no entries yet</div>
              ) : (
                <div className="space-y-2">
                  {filteredPastEntries.map((entry) => (
                    <div key={entry.id} className="p-3 bg-zinc-950/50 border border-amber-900/30 rounded flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-amber-500 mb-1">
                          <span>{new Date(entry.date).toLocaleDateString()}</span>
                          <span>{entry.mood}</span>
                          <span className="text-amber-700">+{entry.xpEarned}xp</span>
                        </div>
                        <p className="text-sm text-amber-100 truncate">{entry.note || 'no note'}</p>
                        {entry.emotions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.emotions.map(e => (
                              <span key={e} className="text-xs px-1.5 py-0.5 bg-amber-900/30 rounded text-amber-400">{e}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEntries(prev => {
                            const newEntries = prev.filter(e => e.id !== entry.id)
                            try {
                              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newEntries.slice(-MAX_ENTRIES)))
                            } catch (e) { console.error(e) }
                            return newEntries
                          })
                        }}
                        className="h-6 w-6 p-0 text-amber-700 hover:text-rose-400"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

          </Card>

        </TabsContent>

      </Tabs >

    </div >

  )

}



export default Journal
