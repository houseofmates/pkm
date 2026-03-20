import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// import { useAppSetting } from '../hooks/use-app-setting' // exists per context, not used here


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

interface GamificationState {
  // xp system
  currentXp: number
  level: number
  xpToNextLevel: number
  // daily quests 4x4 grid
  quests: DailyQuest[]
  questProgress: number // % complete
  rowBonuses: boolean[] // per row full
  // achievements
  achievements: Achievement[]
  // streaks
  currentStreak: number
  longestStreak: number
  // persistence keys
  lastResetDate: string
  // actions
  earnXp: (amount: number, reason: string) => void
  completeQuest: (questId: string) => void
  checkLevelUp: () => void
  resetDaily: () => void
  unlockAchievement: (id: string) => void
  updateStreak: (date: string) => void
}

// level config
// LEVEL_BADGES removed (unused)

const XP_PER_LEVEL = 100

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first-entry', name: 'first entry', description: 'complete your first journal entry', icon: '📝', unlocked: false, progress: 0 },
  { id: 'streak-7', name: 'week warrior', description: '7 day streak', icon: '🔥', unlocked: false, progress: 0 },
  { id: 'level-5', name: 'beginner', description: 'reach level 5', icon: '🌿', unlocked: false, progress: 0 },
  // add 12 more...
  { id: 'consistency-master', name: 'consistency master', description: '30 day streak', icon: '👑', unlocked: false, progress: 0 }
]

const DEFAULT_QUESTS: DailyQuest[] = [
  // row 0: journal
  { id: 'log-mood', name: 'log mood', completed: false, row: 0 },
  { id: '3-emotions', name: 'add 3 emotions', completed: false, row: 0 },
  { id: '50-note', name: '50+ note chars', completed: false, row: 0 },
  { id: '3-activities', name: 'log 3 activities', completed: false, row: 0 },
  // row 1: exercise (5 muscles → tap all)
  { id: 'chest-muscle', name: 'chest clean', completed: false, row: 1 },
  { id: 'back-muscle', name: 'back clean', completed: false, row: 1 },
  { id: 'arms-muscle', name: 'arms clean', completed: false, row: 1 },
  { id: 'legs-muscle', name: 'legs clean', completed: false, row: 1 },
  // row 2: finance (5 categories balanced)
  { id: 'income-cat', name: 'income logged', completed: false, row: 2 },
  { id: 'food-cat', name: 'food budgeted', completed: false, row: 2 },
  { id: 'rent-cat', name: 'rent tracked', completed: false, row: 2 },
  { id: 'fun-cat', name: 'fun spent', completed: false, row: 2 },
  // row 3: pets/sensory (feed 3 pets + breathe)
  { id: 'pet1-feed', name: 'feed pet 1', completed: false, row: 3 },
  { id: 'pet2-feed', name: 'feed pet 2', completed: false, row: 3 },
  { id: 'breathe-cycle', name: 'breathe cycle', completed: false, row: 3 },
  { id: 'voice-note', name: 'voice journal', completed: false, row: 3 }
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
      achievements: DEFAULT_ACHIEVEMENTS,
      currentStreak: 0,
      longestStreak: 0,
      lastResetDate: new Date().toDateString(),

      earnXp: (amount) => set((state) => {
        const newXp = state.currentXp + amount
        const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1
        const newToNext = XP_PER_LEVEL - (newXp % XP_PER_LEVEL)
        if (newLevel > state.level) {
          // level up logic
        }
        return { currentXp: newXp, level: newLevel, xpToNextLevel: newToNext }
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

      checkLevelUp: () => { /* logic */ },

      resetDaily: () => {
        const today = new Date().toDateString()
        if (get().lastResetDate !== today) {
          set({ 
            quests: DEFAULT_QUESTS.map(q => ({ ...q, completed: false })),
            questProgress: 0,
            rowBonuses: [false,false,false,false],
            lastResetDate: today 
          })
        }
      },

      unlockAchievement: (id) => set((state) => ({
        achievements: state.achievements.map(a => a.id === id ? { ...a, unlocked: true } : a)
      })),

      updateStreak: () => { /* compare dates */ }
    }),
    {
      name: 'gamification-storage'
    }
  )
)

// hook for useAppSetting integration if needed
export const useGamification = () => {
  const store = useGamificationStore()
  // auto reset on mount
  store.resetDaily()
  return store
}

