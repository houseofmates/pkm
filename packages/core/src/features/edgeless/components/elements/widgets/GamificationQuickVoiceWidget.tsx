import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Mic } from 'lucide-react'

interface GamificationQuickVoiceWidgetProps {
  className?: string
}

const MOODS = [
  { id: '0', emoji: '😢', label: 'terrible' },
  { id: '1', emoji: '😟', label: 'bad' },
  { id: '2', emoji: '😐', label: 'fine' },
  { id: '4', emoji: '🙂', label: 'good' },
  { id: '5', emoji: '😊', label: 'great' },
  { id: '6', emoji: '🤩', label: 'amazing' },
]

export function GamificationQuickVoiceWidget({ className }: GamificationQuickVoiceWidgetProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)

  const handleMoodSelect = (moodId: string) => {
    setSelectedMood(moodId)
    // save to draft
    const draft = localStorage.getItem('pkm:journal:draft')
    const parsed = draft ? JSON.parse(draft) : {}
    parsed.mood = moodId
    parsed.timestamp = Date.now()
    localStorage.setItem('pkm:journal:draft', JSON.stringify(parsed))
    
    // navigate to journal after short delay
    setTimeout(() => {
      window.location.href = '/journal'
    }, 300)
  }

  const handleVoice = () => {
    setIsRecording(!isRecording)
    window.location.href = '/journal'
  }

  return (
    <div className={cn(
      "p-3 rounded-xl border border-white/10 bg-white/[0.02]",
      className
    )}>
      <p className="text-xs text-white/40 lowercase mb-2">quick mood</p>
      
      <div className="grid grid-cols-6 gap-1 mb-3">
        {MOODS.map(mood => (
          <button
            key={mood.id}
            onClick={() => handleMoodSelect(mood.id)}
            className={cn(
              "aspect-square rounded-lg flex items-center justify-center text-lg transition-all hover:scale-110",
              selectedMood === mood.id ? "bg-white/20 ring-1 ring-white/40" : "bg-white/5 hover:bg-white/10"
            )}
            title={mood.label}
          >
            {mood.emoji}
          </button>
        ))}
      </div>
      
      <button
        onClick={handleVoice}
        className={cn(
          "w-full py-2 rounded-lg flex items-center justify-center gap-2 text-xs lowercase transition-all",
          isRecording 
            ? "bg-red-500/20 text-red-400 animate-pulse" 
            : "bg-white/10 hover:bg-white/20 text-white/60"
        )}
      >
        <Mic className="w-3 h-3" />
        {isRecording ? 'recording...' : 'voice note'}
      </button>
    </div>
  )
}
