import { useEffect, useState } from 'react'
import { Flame, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GamificationStreakWidgetProps {
  className?: string
}

export function GamificationStreakWidget({ className }: GamificationStreakWidgetProps) {
  const [streak, setStreak] = useState(0)
  const [longestStreak, setLongestStreak] = useState(0)
  const [xp, setXp] = useState(0)
  const [rowProgress, setRowProgress] = useState(0)

  useEffect(() => {
    const loadData = () => {
      const savedStreak = localStorage.getItem('pkm:journal:streak_data')
      if (savedStreak) {
        const data = JSON.parse(savedStreak)
        setStreak(data.current || 0)
      }
      
      const savedLongest = localStorage.getItem('pkm:journal:longest_streak')
      if (savedLongest) {
        setLongestStreak(parseInt(savedLongest) || 0)
      }
      
      const savedXp = localStorage.getItem('pkm:journal:xp_data')
      if (savedXp) {
        setXp(parseInt(savedXp) || 0)
      }
      
      // load quest row progress from gamification store
      const savedGamification = localStorage.getItem('pkm:gamification:today')
      if (savedGamification) {
        const data = JSON.parse(savedGamification)
        if (data.questRows) {
          const totalCells = data.questRows.reduce((acc: number, row: any) => acc + row.cells.length, 0)
          const completedCells = data.questRows.reduce((acc: number, row: any) => 
            acc + row.cells.filter((c: any) => c.completed).length, 0
          )
          setRowProgress(totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0)
        }
      }
    }

    loadData()
    const interval = setInterval(loadData, 30000) // refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const getFlameColor = () => {
    if (streak >= 30) return '#ef4444'
    if (streak >= 14) return '#f97316'
    if (streak >= 7) return '#eab308'
    return '#facc15'
  }

  const getStreakLabel = () => {
    if (streak >= 100) return 'legendary'
    if (streak >= 60) return 'epic'
    if (streak >= 30) return 'fire'
    if (streak >= 14) return 'solid'
    if (streak >= 7) return 'warming up'
    return 'just started'
  }

  return (
    <div className={cn(
      "p-3 rounded-xl border border-white/10 bg-gradient-to-br from-yellow-500/5 to-orange-500/5",
      className
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Flame 
          size={20} 
          className="animate-pulse"
          style={{ color: getFlameColor() }}
        />
        <span className="text-xs text-white/40 lowercase">streak</span>
      </div>
      
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold" style={{ color: getFlameColor() }}>
          {streak}
        </span>
        <span className="text-sm text-white/60 lowercase">days</span>
      </div>
      
      <p className="text-[10px] text-white/50 lowercase mt-1">{getStreakLabel()}</p>
      
      {longestStreak > 0 && (
        <p className="text-[10px] text-white/30 lowercase mt-1">best: {longestStreak}</p>
      )}
      
      {/* xp display */}
      <div className="mt-3 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <span className="text-xs text-white/60">{xp} xp</span>
        </div>
      </div>
      
      {/* row progress */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
          <span className="lowercase">rows</span>
          <span>{rowProgress}%</span>
        </div>
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-yellow-400 rounded-full transition-all duration-500"
            style={{ width: `${rowProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
