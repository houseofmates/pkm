import { useState, useEffect, useCallback } from 'react'
import { secureLogger } from '@/lib/secure-logger'

export interface HibernationStreakData {
  current: number
  lastDate: string
  longest: number
  previousBest: number
  hibernating: boolean
  hibernationStart: string | null
  graceDaysUsed: number
}

const STORAGE_KEY = 'pkm:streak:hibernation'
const GRACE_WINDOW_DAYS = 3

function getToday(): string {
  const d = new Date()
  // day-shift at 5am for consistent did tracking
  if (d.getHours() >= 0 && d.getHours() < 5) {
    d.setDate(d.getDate() - 1)
  }
  return d.toLocaleDateString('en-CA')
}

function daysBetween(date1: string, date2: string): number {
  try {
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    const diff = Math.abs(d2.getTime() - d1.getTime())
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  } catch {
    return 999; // safe fallback for invalid dates
  }
}

export function useHibernationStreak() {
  const [streakData, setStreakData] = useState<HibernationStreakData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (err) {
      secureLogger.warn('corrupted streak data in storage', err);
    }
    return {
      current: 0,
      lastDate: '',
      longest: 0,
      previousBest: 0,
      hibernating: false,
      hibernationStart: null,
      graceDaysUsed: 0
    }
  })

  // sync to localstorage on every update
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData))
  }, [streakData])

  // validate streak status periodically
  useEffect(() => {
    const checkStreak = () => {
      const today = getToday()
      
      if (!streakData.lastDate) return;
      if (streakData.lastDate === today) return;
      
      const daysSince = daysBetween(streakData.lastDate, today)
      
      if (daysSince === 1) return; // consecutive
      
      if (daysSince <= GRACE_WINDOW_DAYS) {
        // enter hibernation within grace period
        if (!streakData.hibernating) {
          setStreakData(prev => ({
            ...prev,
            hibernating: true,
            hibernationStart: today,
            graceDaysUsed: daysSince - 1
          }))
        }
      } else {
        // hard reset after grace window expires
        if (streakData.current > 0) {
          setStreakData(prev => ({
            ...prev,
            previousBest: Math.max(prev.previousBest, prev.current),
            current: 0,
            hibernating: false,
            hibernationStart: null,
            graceDaysUsed: 0
          }))
        }
      }
    }

    checkStreak()
    
    // hourly check for day rollovers
    const interval = setInterval(checkStreak, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [streakData.lastDate, streakData.hibernating, streakData.current])

  const recordActivity = useCallback(() => {
    const today = getToday()
    
    setStreakData(prev => {
      if (prev.lastDate === today) return prev;
      
      let newCurrent = prev.current
      let newHibernating = false
      let newHibernationStart = null
      let newGraceDaysUsed = 0
      
      if (!prev.lastDate) {
        newCurrent = 1
      } else {
        const daysSince = daysBetween(prev.lastDate, today)
        
        if (daysSince === 1) {
          newCurrent = prev.current + 1
        } else if (daysSince <= GRACE_WINDOW_DAYS && prev.hibernating) {
          // resume from hibernation
          newCurrent = prev.current + 1
          newHibernating = false
          newHibernationStart = null
          newGraceDaysUsed = 0
        } else {
          // reset for missed days
          newCurrent = 1
        }
      }
      
      return {
        ...prev,
        current: newCurrent,
        lastDate: today,
        longest: Math.max(prev.longest, newCurrent),
        hibernating: newHibernating,
        hibernationStart: newHibernationStart,
        graceDaysUsed: newGraceDaysUsed
      }
    })
  }, [])

  const getStreakDisplay = useCallback(() => {
    if (streakData.hibernating) {
      return {
        value: streakData.current,
        label: 'hibernating',
        icon: '❄️',
        color: 'text-blue-400',
        subtext: `resume within ${GRACE_WINDOW_DAYS - streakData.graceDaysUsed} days`
      }
    }
    
    if (streakData.current === 0 && streakData.previousBest > 0) {
      return {
        value: streakData.previousBest,
        label: 'previous best',
        icon: '📋',
        color: 'text-white/40',
        subtext: 'ready to start new streak'
      }
    }
    
    return {
      value: streakData.current,
      label: 'day streak',
      icon: streakData.current >= 7 ? '🔥' : '✨',
      color: streakData.current >= 7 ? 'text-orange-400' : 'text-yellow-400',
      subtext: streakData.current === streakData.longest && streakData.current > 1 ? 'new record!' : ''
    }
  }, [streakData])

  return {
    streakData,
    recordActivity,
    getStreakDisplay,
    isHibernating: streakData.hibernating,
    graceWindowDays: GRACE_WINDOW_DAYS
  }
}
