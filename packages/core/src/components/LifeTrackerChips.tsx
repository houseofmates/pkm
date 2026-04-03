import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

export interface LifeTrackerChip {
  id: string
  label: string
  emoji: string
  checked: boolean
  category: 'hygiene' | 'health' | 'wellness'
}

interface LifeTrackerChipsProps {
  onChange?: (chips: LifeTrackerChip[]) => void
  initialChecked?: string[]
  className?: string
}

const DEFAULT_CHIPS: LifeTrackerChip[] = [
  { id: 'shower', label: 'shower', emoji: '🚿', checked: false, category: 'hygiene' },
  { id: 'face_wash', label: 'face wash', emoji: '🧴', checked: false, category: 'hygiene' },
  { id: 'brush_teeth', label: 'brushed teeth', emoji: '🦷', checked: false, category: 'hygiene' },
  { id: 'skincare', label: 'skincare', emoji: '✨', checked: false, category: 'hygiene' },
  { id: 'meds', label: 'took meds', emoji: '💊', checked: false, category: 'health' },
  { id: 'ate', label: 'ate today', emoji: '🍽️', checked: false, category: 'health' },
  { id: 'water', label: 'drank water', emoji: '💧', checked: false, category: 'health' },
  { id: 'outside', label: 'went outside', emoji: '🌳', checked: false, category: 'wellness' },
]

export function LifeTrackerChips({ onChange, initialChecked = [], className }: LifeTrackerChipsProps) {
  const [chips, setChips] = useState<LifeTrackerChip[]>(() => 
    DEFAULT_CHIPS.map(chip => ({
      ...chip,
      checked: initialChecked.includes(chip.id)
    }))
  )
  
  const [animatingChip, setAnimatingChip] = useState<string | null>(null)

  // update parent when chips change
  useEffect(() => {
    onChange?.(chips)
  }, [chips, onChange])

  const toggleChip = (chipId: string) => {
    setAnimatingChip(chipId)
    
    setChips(prev => prev.map(chip => 
      chip.id === chipId ? { ...chip, checked: !chip.checked } : chip
    ))
    
    // clear animation after it completes
    setTimeout(() => setAnimatingChip(null), 300)
  }

  const hygieneChips = chips.filter(c => c.category === 'hygiene')
  const healthChips = chips.filter(c => c.category === 'health')
  const wellnessChips = chips.filter(c => c.category === 'wellness')

  const renderChip = (chip: LifeTrackerChip) => {
    const isAnimating = animatingChip === chip.id
    
    return (
      <button
        key={chip.id}
        onClick={() => toggleChip(chip.id)}
        className={cn(
          "group relative px-3 py-2 rounded-full text-xs lowercase transition-all duration-200",
          "border select-none",
          chip.checked
            ? "border-transparent bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white"
            : "border-white/20 bg-transparent text-white/50 hover:border-white/40 hover:text-white/70",
          isAnimating && "scale-110"
        )}
      >
        {/* satisfying fill animation */}
        <span 
          className={cn(
            "absolute inset-0 rounded-full transition-all duration-300",
            chip.checked ? "opacity-100" : "opacity-0 scale-90"
          )}
          style={{
            background: chip.checked 
              ? 'radial-gradient(circle at center, rgba(59, 130, 246, 0.3) 0%, rgba(147, 51, 234, 0.2) 100%)'
              : 'none',
            boxShadow: chip.checked ? '0 0 20px rgba(59, 130, 246, 0.3)' : 'none'
          }}
        />
        
        <span className="relative z-10 flex items-center gap-1.5">
          {/* checkmark that appears when checked */}
          <span className={cn(
            "absolute -left-1 -top-1 w-4 h-4 rounded-full bg-green-400 text-black flex items-center justify-center text-[10px] transition-all duration-200",
            chip.checked ? "opacity-100 scale-100" : "opacity-0 scale-0"
          )}>
            <Check className="w-3 h-3" />
          </span>
          
          {/* emoji with bounce animation on check */}
          <span className={cn(
            "transition-transform duration-200",
            isAnimating && chip.checked && "animate-bounce"
          )}>
            {chip.emoji}
          </span>
          
          {/* label */}
          <span className={cn(
            "transition-all duration-200",
            chip.checked && "font-medium"
          )}>
            {chip.label}
          </span>
        </span>
        
        {/* subtle glow pulse when checked */}
        {chip.checked && (
          <span className="absolute inset-0 rounded-full animate-pulse opacity-30 bg-blue-400/20" />
        )}
      </button>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* hygiene row */}
      <div>
        <p className="text-[10px] text-white/30 lowercase mb-2">hygiene</p>
        <div className="flex flex-wrap gap-2">
          {hygieneChips.map(renderChip)}
        </div>
      </div>
      
      {/* health row */}
      <div>
        <p className="text-[10px] text-white/30 lowercase mb-2">health</p>
        <div className="flex flex-wrap gap-2">
          {healthChips.map(renderChip)}
        </div>
      </div>
      
      {/* wellness row */}
      <div>
        <p className="text-[10px] text-white/30 lowercase mb-2">wellness</p>
        <div className="flex flex-wrap gap-2">
          {wellnessChips.map(renderChip)}
        </div>
      </div>
    </div>
  )
}

// hook for persisting life tracker data
export function useLifeTracker(date?: string) {
  const key = `pkm:life-tracker:${date || new Date().toISOString().split('T')[0]}`
  
  const [checkedIds, setCheckedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return []
  })

  const updateChecked = (chips: LifeTrackerChip[]) => {
    const checked = chips.filter(c => c.checked).map(c => c.id)
    setCheckedIds(checked)
    localStorage.setItem(key, JSON.stringify(checked))
  }

  return { checkedIds, updateChecked }
}
