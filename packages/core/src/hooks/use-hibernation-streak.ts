import { useState, useEffect, useCallback } from 'react'

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
  if (d.getHours() >= 0 && d.getHours() < 5) {
    d.setDate(d.getDate() - 1)
  }
  return d.toLocaleDateString('en-CA')
}

function getYesterday(): string {
  const d = new Date()
  if (d.getHours() >= 0 && d.getHours() < 5) {
    d.setDate(d.getDate() - 1)
  }
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-CA')
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diff = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function useHibernationStreak() {
  const [streakData, setStreakData] = useState<HibernationStreakData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved)
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

  // save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streakData))
  }, [streakData])

  // check streak status on mount and daily
  useEffect(() => {
    const checkStreak = () => {
      const today = getToday()
      
      if (!streakData.lastDate) {
        // no streak yet
        return
      }
      
      if (streakData.lastDate === today) {
        // already logged today
        return
      }
      
      const daysSince = daysBetween(streakData.lastDate, today)
      
      if (daysSince === 1) {
        // yesterday - streak continues normally
        return
      }
      
      if (daysSince <= GRACE_WINDOW_DAYS) {
        // within grace window - enter hibernation if not already
        if (!streakData.hibernating) {
          setStreakData(prev => ({
            ...prev,
            hibernating: true,
            hibernationStart: today,
            graceDaysUsed: daysSince - 1
          }))
        }
      } else {
        // past grace window - reset streak but save previous best
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
    
    // check every hour
    const interval = setInterval(checkStreak, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [streakData.lastDate, streakData.hibernating])

  const recordActivity = useCallback(() => {
    const today = getToday()
    
    setStreakData(prev => {
      // already recorded today
      if (prev.lastDate === today) {
        return prev
      }
      
      let newCurrent = prev.current
      let newHibernating = false
      let newHibernationStart = null
      let newGraceDaysUsed = 0
      
      if (!prev.lastDate) {
        // first ever activity
        newCurrent = 1
      } else {
        const daysSince = daysBetween(prev.lastDate, today)
        
        if (daysSince === 1) {
          // consecutive day - increment streak
          newCurrent = prev.current + 1
        } else if (daysSince <= GRACE_WINDOW_DAYS && prev.hibernating) {
          // resumed from hibernation within grace window
          newCurrent = prev.current + 1
          newHibernating = false
          newHibernationStart = null
          newGraceDaysUsed = 0
        } else if (daysSince > GRACE_WINDOW_DAYS) {
          // too long, start new streak
          newCurrent = 1
        }
      }
      
      const newLongest = Math.max(prev.longest, newCurrent)
      
      return {
        ...prev,
        current: newCurrent,
        lastDate: today,
        longest: newLongest,
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
