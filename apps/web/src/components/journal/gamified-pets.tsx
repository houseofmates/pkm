import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { useGamificationStore } from '../../stores/gamification-store'
import { useHaptics } from '@pkm/core/src/hooks/useHaptics'
import { Heart, Fish, Moon, Sun, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

interface Pet {
  id: string
  name: string
  emoji: string
  hunger: number
  happiness: number
  energy: number
  lastFed: number
  lastPlayed: number
  isSleeping: boolean
}

const PETS_DATA: Pet[] = [
  { id: 'pet1', name: 'whiskers', emoji: '🐱', hunger: 70, happiness: 80, energy: 90, lastFed: Date.now(), lastPlayed: Date.now(), isSleeping: false },
  { id: 'pet2', name: 'buddy', emoji: '🐶', hunger: 60, happiness: 75, energy: 85, lastFed: Date.now(), lastPlayed: Date.now(), isSleeping: false }
]

const wiggleAnimation = {
  wiggle: {
    rotate: [0, -5, 5, -5, 5, 0],
    transition: { duration: 0.4, ease: 'easeInOut' as const }
  },
  bounce: {
    y: [0, -10, 0],
    scale: [1, 1.1, 1],
    transition: { duration: 0.3, ease: 'easeOut' as const }
  },
  idle: {
    y: [0, -2, 0],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const }
  },
  sleep: {
    scale: [1, 0.98, 1],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' as const }
  }
}

const PetAvatar: React.FC<{
  pet: Pet
  onInteract: (petId: string, action: 'feed' | 'play' | 'pet') => void
}> = ({ pet, onInteract }) => {
  const [animationState, setAnimationState] = useState<'idle' | 'wiggle' | 'bounce' | 'sleep'>('idle')

  const handleClick = useCallback(() => {
    if (pet.isSleeping) return
    setAnimationState('wiggle')
    onInteract(pet.id, 'pet')
    setTimeout(() => setAnimationState('idle'), 400)
  }, [pet.id, pet.isSleeping, onInteract])

  const handleFeed = useCallback(() => {
    if (pet.isSleeping || pet.hunger >= 100) return
    setAnimationState('bounce')
    onInteract(pet.id, 'feed')
    setTimeout(() => setAnimationState('idle'), 300)
  }, [pet.id, pet.isSleeping, pet.hunger, onInteract])

  const handlePlay = useCallback(() => {
    if (pet.isSleeping || pet.energy < 20) return
    setAnimationState('wiggle')
    onInteract(pet.id, 'play')
    setTimeout(() => setAnimationState('idle'), 400)
  }, [pet.id, pet.isSleeping, pet.energy, onInteract])

  const currentAnimation = pet.isSleeping ? 'sleep' : animationState

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        className="relative cursor-pointer select-none"
        animate={currentAnimation}
        variants={wiggleAnimation}
        onClick={handleClick}
        whileHover={!pet.isSleeping ? { scale: 1.05 } : {}}
        whileTap={!pet.isSleeping ? { scale: 0.95 } : {}}
      >
        <div className="text-6xl filter drop-shadow-lg">
          {pet.emoji}
        </div>
        {pet.isSleeping && (
          <motion.div
            className="absolute -top-2 -right-2 text-lg"
            animate={{ opacity: [0.5, 1, 0.5], y: [0, -3, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            💤
          </motion.div>
        )}
        {!pet.isSleeping && pet.hunger < 30 && (
          <motion.div
            className="absolute -top-1 -right-1 text-sm"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🍽️
          </motion.div>
        )}
      </motion.div>

      <div className="text-center">
        <div className="font-medium text-amber-100">{pet.name}</div>
        <Badge variant={pet.hunger > 50 ? 'default' : 'secondary'} className={`text-xs mt-1 ${pet.hunger <= 30 ? 'text-rose-400' : ''}`}>
          {pet.hunger > 70 ? 'full' : pet.hunger > 30 ? 'hungry' : 'starving'}
        </Badge>
      </div>

      <div className="w-full space-y-1 mt-2">
        <div className="flex items-center gap-2">
          <Fish className="w-3 h-3 text-blue-400" />
          <Progress value={pet.hunger} className="h-1.5 flex-1" />
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-3 h-3 text-rose-400" />
          <Progress value={pet.happiness} className="h-1.5 flex-1 bg-rose-950 [&>*]:bg-rose-400" />
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-yellow-400" />
          <Progress value={pet.energy} className="h-1.5 flex-1 bg-yellow-950 [&>*]:bg-yellow-400" />
        </div>
      </div>

      <div className="flex gap-1 mt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleFeed}
          disabled={pet.isSleeping || pet.hunger >= 100}
          className="text-xs border-blue-800 hover:bg-blue-900/50"
        >
          <Fish className="w-3 h-3 mr-1" />
          feed
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePlay}
          disabled={pet.isSleeping || pet.energy < 20}
          className="text-xs border-rose-800 hover:bg-rose-900/50"
        >
          <Heart className="w-3 h-3 mr-1" />
          play
        </Button>
      </div>
    </div>
  )
}

const GamifiedPets: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>(PETS_DATA)
  const { earnXp, completeQuest } = useGamificationStore()
  const { success, light } = useHaptics()

  const handleInteract = useCallback((petId: string, action: 'feed' | 'play' | 'pet') => {
    light()

    setPets(prev => prev.map(pet => {
      if (pet.id !== petId) return pet

      switch (action) {
        case 'feed':
          if (pet.hunger >= 100) return pet
          completeQuest('pet1-feed')
          earnXp(5, `fed ${pet.name}`)
          toast(`${pet.name} is happy and full! +5xp`)
          success()
          return {
            ...pet,
            hunger: Math.min(100, pet.hunger + 30),
            happiness: Math.min(100, pet.happiness + 10),
            lastFed: Date.now()
          }
        case 'play':
          if (pet.energy < 20) return pet
          completeQuest('pet2-feed')
          earnXp(5, `played with ${pet.name}`)
          toast(`you played with ${pet.name}! +5xp`)
          success()
          return {
            ...pet,
            happiness: Math.min(100, pet.happiness + 20),
            energy: Math.max(0, pet.energy - 20),
            lastPlayed: Date.now()
          }
        case 'pet':
          return {
            ...pet,
            happiness: Math.min(100, pet.happiness + 5)
          }
        default:
          return pet
      }
    }))
  }, [earnXp, completeQuest, success, light])

  const toggleSleep = useCallback((petId: string) => {
    setPets(prev => prev.map(pet =>
      pet.id === petId ? { ...pet, isSleeping: !pet.isSleeping } : pet
    ))
    light()
  }, [light])

  return (
    <Card className="border-amber-950/60 bg-black/60">
      <CardHeader className="p-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>your pets</span>
            <motion.span
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              🐾
            </motion.span>
          </CardTitle>
          <div className="flex gap-1">
            {pets.map(pet => (
              <Button
                key={pet.id}
                size="sm"
                variant="ghost"
                onClick={() => toggleSleep(pet.id)}
                className="h-6 w-6 p-0"
              >
                {pet.isSleeping ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-4">
          <AnimatePresence mode="wait">
            {pets.map(pet => (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <PetAvatar pet={pet} onInteract={handleInteract} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  )
}

export default GamifiedPets
