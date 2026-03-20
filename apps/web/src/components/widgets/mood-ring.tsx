import React from 'react'
import { Card, CardContent } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { ChevronRight } from 'lucide-react'
// import Link from 'next/link'
const Link: React.FC<{ href: string; className?: string; children: React.ReactNode }> = ({ href, className = '', children }) => (
  <div className={className} onClick={() => window.location.href = href} style={{ cursor: 'pointer' }}>
    {children}
  )

interface Mood {
  id: string
  emoji: string
  color: string
}

const MOODS: Mood[] = [
  { id: 'happy', emoji: '😊', color: '#10b981' },
  { id: 'sad', emoji: '😢', color: '#ef4444' },
  { id: 'angry', emoji: '😠', color: '#f59e0b' },
  { id: 'calm', emoji: '😌', color: '#3b82f6' },
  { id: 'anxious', emoji: '😰', color: '#8b5cf6' },
  { id: 'excited', emoji: '🤩', color: '#ec4899' }
]

const MoodRingWidget: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Card className={`w-full max-w-sm h-32 cursor-pointer hover:scale-105 hover:shadow-xl border-2 border-purple-800/50 glass-effect backdrop-blur-md ${className}`}>
      <Link href="/journal" className="h-full p-4 flex flex-col justify-between">
        <div>
          <div className="text-lg font-bold mb-2 flex items-center gap-2">
            mood ring
            <Badge variant="outline" className="text-xs">today</Badge>
          </div>
          <div className="grid grid-cols-6 gap-1 mb-3">
            {MOODS.map(mood => (
              <Button
                key={mood.id}
                variant="ghost"
                size="sm"
                className={`h-10 aspect-square p-0 rounded-full border-2 hover:scale-110 transition-all ${mood.color === '#10b981' ? 'border-emerald-500 scale-110 shadow-emerald-500/25' : 'border-slate-700 hover:border-purple-400'}`}
                style={{ borderColor: mood.color }}
              >
                <span className="text-lg">{mood.emoji}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ChevronRight className="w-3 h-3" />
          tap to log mood
        </div>
      </Link>
    </Card>
  )
}

export default MoodRingWidget
