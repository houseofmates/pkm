import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { secureLogger } from '@/lib/secure-logger'

interface GamificationPetWidgetProps {
  className?: string
}

interface PetData {
  id: string
  name: string
  emoji: string
  hunger: number
  happiness: number
  energy: number
}

const PET_EMOJIS: Record<string, string> = {
  spark: '🔥',
  bloom: '🌸',
  wisp: '👻'
}

export function GamificationPetWidget({ className }: GamificationPetWidgetProps) {
  const [pets, setPets] = useState<PetData[]>([
    { id: 'spark', name: 'spark', emoji: '🔥', hunger: 70, happiness: 60, energy: 80 },
    { id: 'bloom', name: 'bloom', emoji: '🌸', hunger: 65, happiness: 75, energy: 70 },
    { id: 'wisp', name: 'wisp', emoji: '👻', hunger: 80, happiness: 50, energy: 60 },
  ])

  useEffect(() => {
    const loadPets = () => {
      const saved = localStorage.getItem('pkm:gamification:today')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if (data.pets) {
            setPets(data.pets)
          }
        } catch (e) {
          secureLogger.error('failed to load pet data', e)
        }
      }
    }

    loadPets()
    const interval = setInterval(loadPets, 30000)
    return () => clearInterval(interval)
  }, [])

  const getBarColor = (value: number) => {
    if (value >= 70) return 'bg-green-400'
    if (value >= 40) return 'bg-yellow-400'
    return 'bg-red-400'
  }

  const getStatusEmoji = (pet: PetData) => {
    const avg = (pet.hunger + pet.happiness + pet.energy) / 3
    if (avg >= 80) return '✨'
    if (avg >= 60) return '😊'
    if (avg >= 40) return '😴'
    return '💤'
  }

  return (
    <div className={cn(
      "p-3 rounded-xl border border-white/10 bg-white/[0.02]",
      className
    )}>
      <p className="text-xs text-white/40 lowercase mb-2">companions</p>
      
      <div className="space-y-3">
        {pets.map(pet => (
          <div key={pet.id} className="flex items-center gap-2">
            <div className="relative">
              <span className="text-xl">{pet.emoji}</span>
              <span className="absolute -top-1 -right-1 text-[10px]">{getStatusEmoji(pet)}</span>
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getBarColor(pet.hunger))} 
                    style={{ width: `${pet.hunger}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getBarColor(pet.happiness))} 
                    style={{ width: `${pet.happiness}%` }} />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", getBarColor(pet.energy))} 
                    style={{ width: `${pet.energy}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
