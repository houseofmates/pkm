import { useState, useEffect, useMemo } from 'react'

export interface IdentityBadge {
  id: string
  name: string
  description: string
  emoji: string
  earned: boolean
  earnedAt?: string
}

export interface BadgeCriteria {
  id: string
  name: string
  description: string
  emoji: string
  check: (entries: any[]) => boolean
}

const BADGE_CRITERIA: BadgeCriteria[] = [
  {
    id: 'night_owl',
    name: 'night owl',
    description: '10+ entries logged after 10pm',
    emoji: '🦉',
    check: (entries) => {
      const lateEntries = entries.filter(e => {
        const hour = new Date(e.timestamp).getHours()
        return hour >= 22 || hour < 2
      })
      return lateEntries.length >= 10
    }
  },
  {
    id: 'word_weaver',
    name: 'word weaver',
    description: 'rolling average 200+ words per entry',
    emoji: '🕸️',
    check: (entries) => {
      if (entries.length < 5) return false
      const recent = entries.slice(0, 10)
      const wordCounts = recent.map(e => {
        const body = e.body || ''
        return body.split(/\s+/).filter((w: string) => w.length > 0).length
      })
      const avg = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
      return avg >= 200
    }
  },
  {
    id: 'emotion_cartographer',
    name: 'emotion cartographer',
    description: '20+ distinct emotions logged total',
    emoji: '🗺️',
    check: (entries) => {
      const allEmotions = new Set<string>()
      entries.forEach(e => {
        try {
          const emotions = JSON.parse((e as any).emotions || '[]') as string[]
          emotions.forEach(em => allEmotions.add(em))
        } catch {}
      })
      return allEmotions.size >= 20
    }
  },
  {
    id: 'consistent',
    name: 'consistent',
    description: '7 entries in any 10-day window',
    emoji: '📅',
    check: (entries) => {
      if (entries.length < 7) return false
      
      // sliding window check
      const dates = entries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b)
      for (let i = 0; i <= dates.length - 7; i++) {
        const windowStart = dates[i]
        const windowEnd = windowStart + (10 * 24 * 60 * 60 * 1000) // 10 days
        const countInWindow = dates.filter(d => d >= windowStart && d <= windowEnd).length
        if (countInWindow >= 7) return true
      }
      return false
    }
  },
  {
    id: 'voice',
    name: 'voice',
    description: '5+ voice memo entries',
    emoji: '🎙️',
    check: (entries) => {
      const voiceEntries = entries.filter(e => {
        const transcript = (e as any).transcript
        return transcript && transcript.length > 10
      })
      return voiceEntries.length >= 5
    }
  },
  {
    id: 'dedicated',
    name: 'dedicated',
    description: 'app opened 20+ days total',
    emoji: '🌱',
    check: (entries) => {
      const uniqueDays = new Set(entries.map(e => e.date))
      return uniqueDays.size >= 20
    }
  }
]

export function useIdentityBadges() {
  const [entries, setEntries] = useState<any[]>([])
  const [earnedBadges, setEarnedBadges] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('pkm:identity:earned')
    if (saved) {
      return new Set(JSON.parse(saved))
    }
    return new Set<string>()
  })

  // load entries
  useEffect(() => {
    // try to get from localStorage first (sync with journal)
    const savedEntries = localStorage.getItem('pkm:journal:entries_cache')
    if (savedEntries) {
      try {
        setEntries(JSON.parse(savedEntries))
      } catch {}
    }
  }, [])

  // check for new badges
  useEffect(() => {
    const newlyEarned: string[] = []
    
    BADGE_CRITERIA.forEach(criteria => {
      if (!earnedBadges.has(criteria.id) && criteria.check(entries)) {
        newlyEarned.push(criteria.id)
      }
    })
    
    if (newlyEarned.length > 0) {
      const updated = new Set([...earnedBadges, ...newlyEarned])
      setEarnedBadges(updated)
      localStorage.setItem('pkm:identity:earned', JSON.stringify([...updated]))
    }
  }, [entries, earnedBadges])

  const badges: IdentityBadge[] = useMemo(() => {
    return BADGE_CRITERIA.map(criteria => ({
      id: criteria.id,
      name: criteria.name,
      description: criteria.description,
      emoji: criteria.emoji,
      earned: earnedBadges.has(criteria.id)
    }))
  }, [earnedBadges])

  const earnedCount = useMemo(() => 
    badges.filter(b => b.earned).length
  , [badges])

  return {
    badges,
    earnedCount,
    totalCount: badges.length
  }
}
