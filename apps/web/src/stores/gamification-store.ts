import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// types
interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  unlocked: boolean
  progress: number // 0-1
}

interface DailyQuest {
  id: string
  name: string
  completed: boolean
  row: number // 0-3 for 4x4 grid
}

interface DailyGoal {
  id: string
  name: string
  completed: boolean
}

interface GamificationState {
  // xp system
  currentXp: number
  level: number
  xpToNextLevel: number
  // daily quests 4x4 grid
  quests: DailyQuest[]
  questProgress: number // % complete
  rowBonuses: boolean[] // per row full
  // daily goals
  goals: DailyGoal[]
  goalsProgress: number
  // achievements
  achievements: Achievement[]
  // streaks
  currentStreak: number
  longestStreak: number
  // timer state
  timerActive: boolean
  timerPreset: number
  timerPrompt: string
  // persistence
  lastResetDate: string
  // actions
  earnXp: (amount: number, reason: string) => void
  completeQuest: (questId: string) => void
  toggleGoal: (goalId: string) => void
  checkLevelUp: () => void
  resetDaily: () => void
  unlockAchievement: (id: string) => void
  updateStreak: (date: string) => void
  startTimer: (preset: number) => void
  stopTimer: () => void
  streakProtector: () => void
}

const XP_PER_LEVEL = 100

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-entry', name: 'first entry', description: 'complete your first journal entry', icon: '📝', unlocked: false, progress: 0 },
  { id: 'streak-7', name: 'week warrior', description: '7 day streak', icon: '🔥', unlocked: false, progress: 0 },
  { id: 'level-5', name: 'beginner', description: 'reach level 5', icon: '🌿', unlocked: false, progress: 0 },
  { id: 'timer-master', name: 'timer master', description: '10x 5min reflections', icon: '⏱️', unlocked: false, progress: 0 },
  { id: 'goals-king', name: 'goals king', description: '100% daily goals 7 days', icon: '👑', unlocked: false, progress: 0 },
  { id: 'consistency-master', name: 'consistency master', description: '30 day streak', icon: '🏆', unlocked: false, progress: 0 }
]

const DEFAULT_QUESTS: DailyQuest[] = [
  // row 0: journal
  { id: 'log-mood', name: 'log mood', completed: false, row: 0 },
  { id: '3-emotions', name: 'add 3 emotions', completed: false, row: 0 },
  { id: '50-note', name: '50+ note chars', completed: false, row: 0 },
  { id: '3-activities', name: 'log 3 activities', completed: false, row: 0 },
  // row 1: exercise
  { id: 'chest-row', name: 'chest row clean', completed: false, row: 1 },
  { id: 'back-row', name: 'back row clean', completed: false, row: 1 },
  { id: 'arms-row', name: 'arms row clean', completed: false, row: 1 },
  { id: 'legs-row', name: 'legs row clean', completed: false, row: 1 },
  // row 2: finance
  { id: 'income-cat', name: 'income logged', completed: false, row: 2 },
  { id: 'essentials-cat', name: 'essentials budgeted', completed: false, row: 2 },
  { id: 'fun-cat', name: 'fun spent tracked', completed: false, row: 2 },
  { id: 'future-cat', name: 'future invested', completed: false, row: 2 },
  // row 3: sensory/pets
  { id: 'pet1-feed', name: 'feed pet 1', completed: false, row: 3 },
  { id: 'pet2-feed', name: 'feed pet 2', completed: false, row: 3 },
  { id: 'breathe-cycle', name: 'breathe cycle', completed: false, row: 3 },
  { id: 'voice-note', name: 'voice journal', completed: false, row: 3 }
]

const DEFAULT_GOALS: DailyGoal[] = [
  { id: 'mood', name: 'log mood', completed: false },
  { id: '3-emotions', name: '3+ emotions', completed: false },
  { id: '50-note', name: '50+ chars note', completed: false },
  { id: '3-activities', name: '3+ activities', completed: false },
  { id: 'timer', name: '5min reflection', completed: false }
]

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      currentXp: 0,
      level: 1,
      xpToNextLevel: XP_PER_LEVEL,
      quests: DEFAULT_QUESTS,
      questProgress: 0,
      rowBonuses: [false, false, false, false],
      goals: DEFAULT_GOALS,
      goalsProgress: 0,
      achievements: DEFAULT_ACHIEVEMENTS,
      currentStreak: 0,
      longestStreak: 0,
      timerActive: false,
      timerPreset: 5,
      timerPrompt: '',
      lastResetDate: new Date().toDateString(),

      earnXp: (amount, reason = '') => set((state) => {
        const newXp = state.currentXp + amount
        const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1
        const newToNext = XP_PER_LEVEL * newLevel - newXp
        if (newLevel > state.level) {
          get().unlockAchievement('level-up')
        }
        return { 
          currentXp: newXp, 
          level: newLevel, 
          xpToNextLevel: newToNext 
        }
      }),

      completeQuest: (questId) => set((state) => {
        const quests = state.quests.map(q => q.id === questId ? { ...q, completed: true } : q)
        const completedCount = quests.filter(q => q.completed).length
        const progress = (completedCount / quests.length) * 100
        // row bonus check
        const rowCounts = [0,0,0,0]
        quests.forEach(q => { if (q.completed) rowCounts[q.row]++ })
        const rowBonuses = rowCounts.map(count => count === 4)
        return { quests, questProgress: progress, rowBonuses }
      }),

      toggleGoal: (goalId) => set((state) => {
        const goals = state.goals.map(g => g.id === goalId ? { ...g, completed: !g.completed } : g)
        const goalsProgress = goals.filter(g => g.completed).length / goals.length * 100
        return { goals, goalsProgress }
      }),

      checkLevelUp: () => { /* impl */ },

      resetDaily: () => {
        const today = new Date().toDateString()
        if (get().lastResetDate !== today) {
          set({ 
            quests: DEFAULT_QUESTS.map(q => ({ ...q, completed: false })),
            goals: DEFAULT_GOALS.map(g => ({ ...g, completed: false })),
            questProgress: 0,
            goalsProgress: 0,
            rowBonuses: [false,false,false,false],
            lastResetDate: today 
          })
        }
      },

      unlockAchievement: (id) => set((state) => ({
        achievements: state.achievements.map(a => a.id === id ? { ...a, unlocked: true, progress: 1 } : a)
      })),

      updateStreak: (date) => { /* impl */ },

      startTimer: (preset) => set({ timerActive: true, timerPreset: preset, timerPrompt: 'reflecting...' }),

      stopTimer: () => set({ timerActive: false }),

      streakProtector: () => {
        const state = get()
        if (state.questProgress >= 80 && state.currentStreak > 0) {
          // carry over 1 quest
          set(state => ({
            quests: state.quests.map((q, i) => i === 0 ? { ...q, completed: true } : q),
            questProgress: 12.5 // 1/8
          }))
        }
      }
    }),
    {
      name: 'gamification-storage'
    }
  )
)

export const useGamification = () => {
  const store = useGamificationStore()
  store.resetDaily()
  return store
}

