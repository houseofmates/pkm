import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Heart, Zap, Crown } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'

interface Pet {
  id: string
  name: string
  type: 'exercise' | 'finance' | 'journal'
  level: number
  hunger: number // 0-100
  happiness: number // 0-100
  emoji: string
  animation: string // idle/feed/evolve
}

// PET_TYPES removed (unused)

const GamifiedPets: React.FC = () => {
  const [pets, setPets] = useState<Pet[]>([])
  const { currentStreak } = useGamificationStore()

  useEffect(() => {
    // adopt starter pets
    if (pets.length === 0) {
      setPets([
        { id: '1', name: 'starter rat', type: 'exercise', level: 1, hunger: 80, happiness: 50, emoji: '🐭', animation: 'idle' },
        { id: '2', name: 'starter hamster', type: 'finance', level: 1, hunger: 70, happiness: 60, emoji: '🐹', animation: 'idle' }
      ])
    }
    // hunger decay, streak happiness boost
  }, [])

  const feedPet = (petId: string) => {
    setPets(prev => prev.map(p => p.id === petId 
      ? { ...p, hunger: Math.min(100, p.hunger + 30), happiness: Math.min(100, p.happiness + 20), animation: 'eating' }
      : p
    ))
  }

  const petReaction = (streak: number) => {
    if (streak >= 7) return 'happy dance'
    if (streak === 0) return 'sad pouting'
    return 'wagging tail'
  }

  return (
    <div className="space-y-6">
      {/* pet garden */}
      <Card>
        <CardHeader>
          <CardTitle>pet garden</CardTitle>
          <p className="text-sm text-slate-400">feed with quests, evolve with levels</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pets.map(pet => (
            <div key={pet.id} className="text-center p-4 border rounded-lg hover:shadow-lg transition-all">
              <div className="text-5xl mb-2 animate-bounce">{pet.emoji}</div>
              <div className="font-bold">{pet.name}</div>
              <div className="text-xs text-slate-400">{pet.type}</div>
              <div className="flex items-center gap-1 justify-center mb-2">
                <Heart className="w-3 h-3 fill-current text-red-400" />
                <span>{pet.happiness}/100</span>
              </div>
              <div className="flex items-center gap-1 justify-center">
                <Zap className="w-3 h-3" />
                <span>level {pet.level}</span>
              </div>
              <Button size="sm" onClick={() => feedPet(pet.id)} className="mt-3 w-full">
                feed (+hunger)
              </Button>
            </div>
          ))}
          <Button variant="outline" className="col-span-full h-12">
            adopt new pet
          </Button>
        </CardContent>
      </Card>

      {/* streak reaction */}
      <Card>
        <CardHeader>
          <CardTitle>streak reaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <div className="text-6xl mb-4 animate-pulse">{pets[0]?.emoji || '🐭'}</div>
            <div className="text-lg font-bold">{petReaction(currentStreak)}</div>
            <div className="text-sm text-slate-400">current streak: {currentStreak}d</div>
            {currentStreak >= 7 && (
              <Badge className="mt-2">
                <Crown className="w-4 h-4 mr-1" />
                streak bonus active!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* evolution tree stub */}
      <Card>
        <CardHeader>
          <CardTitle>evolution path</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl mb-1">🐭</div>
              <div className="text-xs">lvl 1-5</div>
            </div>
            <div>
              <div className="text-2xl mb-1">🐹</div>
              <div className="text-xs">lvl 6-10</div>
            </div>
            <div>
              <div className="text-2xl mb-1">🐻</div>
              <div className="text-xs">lvl 11+</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default GamifiedPets

