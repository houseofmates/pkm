import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Badge } from '../../../components/ui/badge'
import { Progress } from '../../../components/ui/progress'
import { Flame } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'
// import Link from 'next/link'
const Link: React.FC<{ href: string; className?: string; children: React.ReactNode }> = ({ href, className = '', children }) => {
  return (
    <div className={className} onClick={() => window.location.href = href} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  )
}

const StreakWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { currentStreak, level, currentXp, xpToNextLevel, rowBonuses, questProgress } = useGamificationStore()

  const flameColor = currentStreak >= 7 ? 'text-orange-400 drop-shadow-lg' : currentStreak >= 3 ? 'text-amber-400' : 'text-slate-400'
  const levelBadge = ['🌱', '🌿', '⭐', '🔥'][Math.min(level - 1, 3)]

  return (
    <Card className={`w-full max-w-sm h-32 cursor-pointer transition-all hover:scale-105 hover:shadow-xl border-2 border-slate-800/50 glass-effect backdrop-blur-md ${className}`}>
      <Link href="/journal" className="h-full flex flex-col p-4">
        <CardHeader className="p-0 pb-2">
          <div className="flex items-center gap-2">
            <div className={`text-2xl ${flameColor}`}>
              <Flame className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg leading-tight">streak counter</CardTitle>
              <Badge variant="secondary" className="text-xs">{levelBadge} lvl {level}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 pt-1 space-y-2">
          <div className="text-2xl font-black text-emerald-400">{currentStreak}d</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              quests {Math.floor(questProgress)}%
            </div>
            <Progress value={Math.min((currentXp / xpToNextLevel) * 100, 100)} className="h-1.5" />
          </div>
          {rowBonuses.some(Boolean) && (
            <div className="flex -space-x-1">
              {rowBonuses.map((bonus, i) => (
                <div 
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 transition-all ${bonus ? 'bg-emerald-500 border-emerald-400 scale-125 animate-bounce' : 'bg-slate-800 border-slate-600 hover:bg-emerald-500/30'}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Link>
    </Card>
  )
}

export default StreakWidget
