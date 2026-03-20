import React from 'react'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Badge } from '../ui/badge'
import { Heart, Zap } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'
// import Link from 'next/link'
const Link: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => {
  return (
    <div className={className} onClick={() => window.location.href = '/journal'} style={{ cursor: 'pointer' }}>
      {children}
    </div>
  )
}

const PetStatusWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { level } = useGamificationStore()
  const pets = [
    { name: 'gym rat', emoji: '🐭', hunger: 75, happy: 60 },
    { name: 'coin hamster', emoji: '🐹', hunger: 85, happy: 80 },
    { name: 'ink bunny', emoji: '🐰', hunger: 40, happy: 30 }
  ]

  return (
    <Card className={`w-full max-w-sm h-32 cursor-pointer hover:scale-105 hover:shadow-2xl border-emerald-800/50 glass-effect backdrop-blur-md ${className}`}>
      <Link href="/journal" className="h-full p-4">
        <CardHeader className="p-0 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-lg font-bold">pet garden</div>
            <Badge variant="secondary">lvl {level}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0 space-y-1">
          {pets.map((pet, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-lg">{pet.emoji}</span>
              <span className="font-mono min-w-0 truncate">{pet.name}</span>
              <div className="ml-auto flex -space-x-1">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-orange-400 border border-slate-700 ${pet.hunger < 50 ? 'animate-pulse ring-2 ring-red-400/30' : ''}`} />
                <div className={`w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-blue-400 border border-slate-700 ${pet.happy < 50 ? 'animate-pulse ring-amber-400/30' : ''}`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Link>
    </Card>
  )
}

export default PetStatusWidget
