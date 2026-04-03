import { create } from 'zustand'
import { useCallback } from 'react'
import { toast } from 'sonner'
import api from '@/api/nocobase-client'

export interface QuestRow {
  id: string
  label: string
  cells: QuestCell[]
  completed: boolean
}

export interface QuestCell {
  id: string
  label: string
  completed: boolean
  icon?: string
}

export interface PetStatus {
  id: string
  name: string
  hunger: number // 0-100
  happiness: number // 0-100
  energy: number // 0-100
  cleanliness: number // 0-100, new stat for bathing
  // visual state determines which asset to show
  visualState: 'idle-happy' | 'idle-sad' | 'idle-dirty' | 'reading' | 'eating' | 'being-pet' | 'bathing' | 'sleeping'
  lastInteraction: string | null // ISO date
  emoji: string // fallback if no asset
}

export interface CategorySaturation {
  mood: number
  body: number
  mind: number
  finance: number
  social: number
}

export interface GamificationState {
  // quest rows
  questRows: QuestRow[]
  setQuestRows: (rows: QuestRow[]) => void
  updateQuestCell: (rowId: string, cellId: string, completed: boolean) => void
  checkRowCompletion: () => void
  
  // pet status
  pets: PetStatus[]
  setPets: (pets: PetStatus[]) => void
  updatePet: (petId: string, updates: Partial<PetStatus>) => void
  
  // category saturation
  saturation: CategorySaturation
  setSaturation: (saturation: CategorySaturation) => void
  updateCategory: (category: keyof CategorySaturation, value: number) => void
  
  // xp and progression
  totalXp: number
  level: number
  levelName: string
  streakDays: number
  longestStreak: number
  totalEntries: number
  lastEntryDate: string | null
  addXp: (amount: number) => void
  setXpState: (xp: number, lvl: number, name: string) => void
  recordEntry: () => void
  
  // system aliveness
  sevenDayCoverage: number // 0-100
  setSevenDayCoverage: (coverage: number) => void
  
  // loading states
  loading: boolean
  setLoading: (loading: boolean) => void
  
  // persistence
  saveToServer: () => Promise<void>
  loadFromServer: () => Promise<void>
}

const DEFAULT_QUEST_ROWS: QuestRow[] = [
  {
    id: 'journal',
    label: 'journal',
    completed: false,
    cells: [
      { id: 'entry', label: 'daily entry', completed: false, icon: '📝' },
      { id: 'mood', label: 'log mood', completed: false, icon: '😊' },
      { id: 'emotions', label: '3+ emotions', completed: false, icon: '💭' },
      { id: 'body', label: 'body check-in', completed: false, icon: '🫀' },
      { id: 'reflect', label: 'reflect', completed: false, icon: '🪞' },
    ]
  },
  {
    id: 'exercise',
    label: 'movement',
    completed: false,
    cells: [
      { id: 'upper', label: 'upper body', completed: false, icon: '💪' },
      { id: 'core', label: 'core', completed: false, icon: '🎯' },
      { id: 'legs', label: 'legs', completed: false, icon: '🦵' },
      { id: 'cardio', label: 'cardio', completed: false, icon: '❤️' },
      { id: 'stretch', label: 'stretch', completed: false, icon: '🧘' },
    ]
  },
  {
    id: 'finance',
    label: 'finance',
    completed: false,
    cells: [
      { id: 'income', label: 'income tracked', completed: false, icon: '💰' },
      { id: 'expenses', label: 'expenses logged', completed: false, icon: '💳' },
      { id: 'savings', label: 'savings check', completed: false, icon: '🏦' },
      { id: 'invest', label: 'investments', completed: false, icon: '📈' },
      { id: 'budget', label: 'budget review', completed: false, icon: '📊' },
    ]
  },
  {
    id: 'wilson',
    label: 'wilson',
    completed: false,
    cells: [
      { id: 'feed', label: 'feed wilson', completed: false, icon: '🍖' },
      { id: 'play', label: 'play with wilson', completed: false, icon: '🎾' },
      { id: 'pet', label: 'pet wilson', completed: false, icon: '🫳' },
      { id: 'bathe', label: 'bathe wilson', completed: false, icon: '�' },
    ]
  }
]

const DEFAULT_PETS: PetStatus[] = [
  { 
    id: 'wilson', 
    name: 'wilson', 
    hunger: 70, 
    happiness: 60, 
    energy: 80, 
    cleanliness: 80,
    visualState: 'idle-happy',
    lastInteraction: null,
    emoji: '�' 
  }
]

// habit-to-quest bridge mapping
// when a habit is logged, it can complete corresponding journal quest cells
export const HABIT_TO_QUEST_MAPPING: Record<string, { rowId: string; cellId: string }[]> = {
  // movement habits
  'exercise': [{ rowId: 'exercise', cellId: 'cardio' }],
  'upper body': [{ rowId: 'exercise', cellId: 'upper' }],
  'core': [{ rowId: 'exercise', cellId: 'core' }],
  'legs': [{ rowId: 'exercise', cellId: 'legs' }],
  'cardio': [{ rowId: 'exercise', cellId: 'cardio' }],
  'stretch': [{ rowId: 'exercise', cellId: 'stretch' }],
  'yoga': [{ rowId: 'exercise', cellId: 'stretch' }],
  
  // finance habits
  'track income': [{ rowId: 'finance', cellId: 'income' }],
  'track expenses': [{ rowId: 'finance', cellId: 'expenses' }],
  'check savings': [{ rowId: 'finance', cellId: 'savings' }],
  'review investments': [{ rowId: 'finance', cellId: 'invest' }],
  'budget review': [{ rowId: 'finance', cellId: 'budget' }],
  
  // wilson (pet) habits
  'feed wilson': [{ rowId: 'wilson', cellId: 'feed' }],
  'play with wilson': [{ rowId: 'wilson', cellId: 'play' }],
  'pet wilson': [{ rowId: 'wilson', cellId: 'pet' }],
  'bathe wilson': [{ rowId: 'wilson', cellId: 'bathe' }],
  
  // journal habits (these trigger journal quest cells)
  'journal': [{ rowId: 'journal', cellId: 'entry' }],
  'write': [{ rowId: 'journal', cellId: 'entry' }],
  'meditate': [{ rowId: 'journal', cellId: 'reflect' }],
  'mood check': [{ rowId: 'journal', cellId: 'mood' }],
}

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
]

function getLevelFromXp(xp: number): { level: number; name: string; emoji: string; progress: number; nextLevelXp: number } {
  let currentLevel = LEVELS[0]
  let nextLevel = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) {
      currentLevel = LEVELS[i]
      nextLevel = LEVELS[i + 1] || LEVELS[i]
      break
    }
  }
  const progress = nextLevel.minXp > currentLevel.minXp
    ? ((xp - currentLevel.minXp) / (nextLevel.minXp - currentLevel.minXp)) * 100
    : 100
  return {
    level: currentLevel.level,
    name: currentLevel.name,
    emoji: currentLevel.emoji,
    progress: Math.min(progress, 100),
    nextLevelXp: nextLevel.minXp
  }
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

// xp calculation constants
export const XP_PER_ENTRY = 10
export const XP_STREAK_BONUS = 5
export const XP_WORD_BONUS = 5

export const useGamificationStore = create<GamificationState>((set, get) => ({
  // xp and progression state
  totalXp: 0,
  level: 1,
  levelName: 'beginner',
  streakDays: 0,
  longestStreak: 0,
  totalEntries: 0,
  lastEntryDate: null,
  
  addXp: (amount: number) => {
    const { totalXp, level, levelName } = get()
    const newXp = totalXp + amount
    const newLevelInfo = getLevelFromXp(newXp)
    
    // check for level up
    if (newLevelInfo.level > level) {
      window.dispatchEvent(new CustomEvent('level-up', { 
        detail: { oldLevel: level, newLevel: newLevelInfo.level, name: newLevelInfo.name } 
      }))
    }
    
    set({ 
      totalXp: newXp, 
      level: newLevelInfo.level, 
      levelName: newLevelInfo.name 
    })
    
    // persist to localStorage immediately
    localStorage.setItem('pkm:gamification:xp', JSON.stringify({
      totalXp: newXp,
      level: newLevelInfo.level,
      levelName: newLevelInfo.name
    }))
  },
  
  setXpState: (xp: number, lvl: number, name: string) => {
    set({ totalXp: xp, level: lvl, levelName: name })
  },
  
  recordEntry: () => {
    const { totalEntries, lastEntryDate, streakDays, longestStreak, addXp } = get()
    const today = getToday()
    
    let newStreak = streakDays
    let newLongest = longestStreak
    
    if (lastEntryDate) {
      const last = new Date(lastEntryDate)
      const now = new Date(today)
      const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) {
        newStreak = streakDays + 1
        if (newStreak > longestStreak) {
          newLongest = newStreak
        }
      } else if (diffDays > 1) {
        newStreak = 1
      }
    } else {
      newStreak = 1
    }
    
    const xpGain = XP_PER_ENTRY + (newStreak > 1 ? XP_STREAK_BONUS : 0)
    addXp(xpGain)
    
    set({
      totalEntries: totalEntries + 1,
      lastEntryDate: today,
      streakDays: newStreak,
      longestStreak: newLongest
    })
  },
  
  questRows: DEFAULT_QUEST_ROWS,
  setQuestRows: (rows) => set({ questRows: rows }),
  
  updateQuestCell: (rowId, cellId, completed) => {
    const { questRows } = get()
    const newRows = questRows.map(row => {
      if (row.id !== rowId) return row
      const newCells = row.cells.map(cell => 
        cell.id === cellId ? { ...cell, completed } : cell
      )
      const allCompleted = newCells.every(c => c.completed)
      return { ...row, cells: newCells, completed: allCompleted }
    })
    set({ questRows: newRows })
    
    // check for row completion bonus
    const completedRow = newRows.find(r => r.id === rowId && r.completed && !questRows.find(qr => qr.id === rowId)?.completed)
    if (completedRow) {
      // trigger celebration - will be handled by component
      window.dispatchEvent(new CustomEvent('quest-row-complete', { detail: { rowId } }))
      
      // add XP bonus for completing a quest row
      const { addXp } = get()
      const XP_PER_QUEST_ROW = 25
      addXp(XP_PER_QUEST_ROW)
      
      // show toast
      toast.success(`🎉 quest row "${completedRow.label}" complete! +${XP_PER_QUEST_ROW} xp`)
    }
  },
  
  checkRowCompletion: () => {
    const { questRows } = get()
    const newRows = questRows.map(row => ({
      ...row,
      completed: row.cells.every(c => c.completed)
    }))
    set({ questRows: newRows })
  },
  
  pets: DEFAULT_PETS,
  setPets: (pets) => set({ pets }),
  updatePet: (petId, updates) => {
    const { pets } = get()
    set({
      pets: pets.map(p => p.id === petId ? { ...p, ...updates } : p)
    })
  },
  
  saturation: { mood: 0, body: 0, mind: 0, finance: 0, social: 0 },
  setSaturation: (saturation) => set({ saturation }),
  updateCategory: (category, value) => {
    const { saturation } = get()
    set({
      saturation: { ...saturation, [category]: Math.max(0, Math.min(100, value)) }
    })
  },
  
  sevenDayCoverage: 0,
  setSevenDayCoverage: (coverage) => set({ sevenDayCoverage: Math.max(0, Math.min(100, coverage)) }),
  
  loading: false,
  setLoading: (loading) => set({ loading }),
  
  // persistence - save to both gamification_state (profile) and gamification_daily (daily snapshot)
  saveToServer: async () => {
    const { questRows, pets, saturation, sevenDayCoverage, totalXp, level, levelName, streakDays, longestStreak, totalEntries, lastEntryDate } = get()
    const today = getToday()
    
    try {
      // save daily snapshot
      await api.createRecord('gamification_daily', {
        date: today,
        quest_rows: JSON.stringify(questRows),
        pets: JSON.stringify(pets),
        saturation: JSON.stringify(saturation),
        coverage: sevenDayCoverage,
        timestamp: new Date().toISOString()
      })
      
      // save persistent profile state
      const stateRes: any = await api.listRecords('gamification_state', {
        filter: { user_key: 'default' },
        pageSize: 1
      })
      
      const stateData: Record<string, string | number | boolean | undefined> = {
        user_key: 'default',
        total_xp: totalXp,
        level: level,
        level_name: levelName,
        streak_days: streakDays,
        longest_streak: longestStreak,
        total_entries: totalEntries,
        last_entry_date: lastEntryDate || undefined,
        timestamp: new Date().toISOString()
      }
      
      if (stateRes?.data?.[0]) {
        await api.updateRecord('gamification_state', stateRes.data[0].id, stateData)
      } else {
        await api.createRecord('gamification_state', stateData)
      }
    } catch (e) {
      console.error('failed to save gamification state', e)
      // save to localStorage as fallback
      localStorage.setItem('pkm:gamification:today', JSON.stringify({
        date: today,
        questRows,
        pets,
        saturation,
        sevenDayCoverage
      }))
      localStorage.setItem('pkm:gamification:profile', JSON.stringify({
        totalXp,
        level,
        levelName,
        streakDays,
        longestStreak,
        totalEntries,
        lastEntryDate
      }))
    }
  },
  
  loadFromServer: async () => {
    const today = getToday()
    
    try {
      // load daily snapshot
      const dailyRes: any = await api.listRecords('gamification_daily', {
        filter: { date: today },
        pageSize: 1
      })
      
      // load persistent profile
      const stateRes: any = await api.listRecords('gamification_state', {
        filter: { user_key: 'default' },
        pageSize: 1
      })
      
      const updates: Partial<GamificationState> = {}
      
      if (dailyRes?.data?.[0]) {
        const data = dailyRes.data[0]
        updates.questRows = JSON.parse(data.quest_rows || JSON.stringify(DEFAULT_QUEST_ROWS))
        updates.pets = JSON.parse(data.pets || JSON.stringify(DEFAULT_PETS))
        updates.saturation = JSON.parse(data.saturation || '{}')
        updates.sevenDayCoverage = data.coverage || 0
      } else {
        // check localStorage fallback for daily
        const local = localStorage.getItem('pkm:gamification:today')
        if (local) {
          const parsed = JSON.parse(local)
          if (parsed.date === today) {
            updates.questRows = parsed.questRows || DEFAULT_QUEST_ROWS
            updates.pets = parsed.pets || DEFAULT_PETS
            updates.saturation = parsed.saturation || { mood: 0, body: 0, mind: 0, finance: 0, social: 0 }
            updates.sevenDayCoverage = parsed.sevenDayCoverage || 0
          }
        }
      }
      
      if (stateRes?.data?.[0]) {
        const data = stateRes.data[0]
        updates.totalXp = data.total_xp || 0
        updates.level = data.level || 1
        updates.levelName = data.level_name || 'beginner'
        updates.streakDays = data.streak_days || 0
        updates.longestStreak = data.longest_streak || 0
        updates.totalEntries = data.total_entries || 0
        updates.lastEntryDate = data.last_entry_date || null
      } else {
        // check localStorage fallback for profile
        const localProfile = localStorage.getItem('pkm:gamification:profile')
        if (localProfile) {
          const parsed = JSON.parse(localProfile)
          updates.totalXp = parsed.totalXp || 0
          updates.level = parsed.level || 1
          updates.levelName = parsed.levelName || 'beginner'
          updates.streakDays = parsed.streakDays || 0
          updates.longestStreak = parsed.longestStreak || 0
          updates.totalEntries = parsed.totalEntries || 0
          updates.lastEntryDate = parsed.lastEntryDate || null
        }
        
        // also check old xp storage for migration
        const oldXp = localStorage.getItem('pkm:journal:xp_data')
        if (oldXp && !updates.totalXp) {
          updates.totalXp = parseInt(oldXp) || 0
          const levelInfo = getLevelFromXp(updates.totalXp)
          updates.level = levelInfo.level
          updates.levelName = levelInfo.name
        }
      }
      
      set(updates)
    } catch (e) {
      console.error('failed to load gamification state', e)
      // try localStorage fallback
      const localProfile = localStorage.getItem('pkm:gamification:profile')
      if (localProfile) {
        const parsed = JSON.parse(localProfile)
        set({
          totalXp: parsed.totalXp || 0,
          level: parsed.level || 1,
          levelName: parsed.levelName || 'beginner',
          streakDays: parsed.streakDays || 0,
          longestStreak: parsed.longestStreak || 0,
          totalEntries: parsed.totalEntries || 0,
          lastEntryDate: parsed.lastEntryDate || null
        })
      }
    }
  }
}))

// habit-to-journal bridge hook
// use this in components to connect habit logging to quest completion
export function useHabitJournalBridge() {
  const { updateQuestCell, saveToServer, updateCategory, updatePet } = useGamificationStore()
  
  const handleHabitLogged = useCallback((log: { habit_name: string; habit_id: string; duration_seconds?: number; volume?: number }) => {
    const habitNameLower = log.habit_name.toLowerCase()
    const habitIdLower = log.habit_id.toLowerCase()
    
    // find matching quest mappings
    const mappings = HABIT_TO_QUEST_MAPPING[habitIdLower] || 
                    HABIT_TO_QUEST_MAPPING[habitNameLower] ||
                    Object.entries(HABIT_TO_QUEST_MAPPING).find(([key]) => 
                      habitNameLower.includes(key) || habitIdLower.includes(key)
                    )?.[1]
    
    if (mappings) {
      mappings.forEach(({ rowId, cellId }) => {
        updateQuestCell(rowId, cellId, true)
      })
    }
    
    // update category saturation based on habit type
    if (habitNameLower.includes('exercise') || habitNameLower.includes('workout') || habitNameLower.includes('cardio')) {
      updateCategory('body', Math.min(100, 20 + (log.duration_seconds || 0) / 60))
    }
    if (habitNameLower.includes('meditate') || habitNameLower.includes('journal') || habitNameLower.includes('read')) {
      updateCategory('mind', Math.min(100, 20 + (log.duration_seconds || 0) / 60))
    }
    if (habitNameLower.includes('mood') || habitNameLower.includes('emotion')) {
      updateCategory('mood', Math.min(100, 30))
    }
    if (habitNameLower.includes('income') || habitNameLower.includes('expense') || habitNameLower.includes('budget')) {
      updateCategory('finance', Math.min(100, 25))
    }
    if (habitNameLower.includes('social') || habitNameLower.includes('friend') || habitNameLower.includes('call')) {
      updateCategory('social', Math.min(100, 30))
    }
    
    // wilson interactions from habits
    if (habitNameLower.includes('wilson') || habitIdLower.includes('wilson')) {
      if (habitNameLower.includes('feed')) {
        updatePet('wilson', { hunger: Math.min(100, 70 + 20), visualState: 'eating', lastInteraction: new Date().toISOString() })
      } else if (habitNameLower.includes('play')) {
        updatePet('wilson', { happiness: Math.min(100, 60 + 15), energy: Math.max(0, 80 - 10), visualState: 'idle-happy', lastInteraction: new Date().toISOString() })
      } else if (habitNameLower.includes('pet')) {
        updatePet('wilson', { happiness: Math.min(100, 60 + 10), visualState: 'being-pet', lastInteraction: new Date().toISOString() })
      } else if (habitNameLower.includes('bathe') || habitNameLower.includes('bath')) {
        updatePet('wilson', { cleanliness: 100, visualState: 'bathing', lastInteraction: new Date().toISOString() })
      }
      
      // return to idle after 3 seconds
      setTimeout(() => {
        updatePet('wilson', { visualState: 'idle-happy' })
      }, 3000)
    }
    
    // save changes
    saveToServer()
    
    // show toast
    const questCount = mappings?.length || 0
    if (questCount > 0) {
      toast.success(`completed ${questCount} quest${questCount > 1 ? 's' : ''} from habit!`)
    }
  }, [updateQuestCell, saveToServer, updateCategory, updatePet])
  
  return { handleHabitLogged }
}
