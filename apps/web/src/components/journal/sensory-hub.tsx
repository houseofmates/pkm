import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Volume2, Play, Pause, Circle } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'

// breathing animation data
const BREATHING_PATTERN = [
  { duration: 4000, label: 'in 4s', size: 100 },
  { duration: 7000, label: 'hold 7s', size: 120 },
  { duration: 8000, label: 'out 8s', size: 80 }
]

const WHITE_NOISES = [
  { id: 'rain', label: 'rain', url: '/sounds/rain.mp3', color: '#3b82f6' },
  { id: 'ocean', label: 'ocean', url: '/sounds/ocean.mp3', color: '#10b981' },
  { id: 'forest', label: 'forest', url: '/sounds/forest.mp3', color: '#059669' },
  { id: 'fire', label: 'fire', url: '/sounds/fire.mp3', color: '#dc2626' },
  { id: 'cafe', label: 'cafe', url: '/sounds/cafe.mp3', color: '#f59e0b' }
]

const SensoryHub: React.FC = () => {
  const [breathPhase, setBreathPhase] = useState(0)
  const [isBreathing, setIsBreathing] = useState(false)
  const [breathProgress, setBreathProgress] = useState(0)
  const [activeNoise, setActiveNoise] = useState('')
  const [fidgetSpins, setFidgetSpins] = useState(0)
  const [calmStreak, setCalmStreak] = useState(0)
  const { earnXp } = useGamificationStore()

  // breathing cycle
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isBreathing) {
      const phase = BREATHING_PATTERN[breathPhase]
      interval = setInterval(() => {
        setBreathProgress(prev => {
          if (prev >= 100) {
            // next phase
            if (breathPhase === 2) {
              // cycle complete
              setIsBreathing(false)
              setBreathPhase(0)
              setBreathProgress(0)
              setCalmStreak(prev => prev + 1)
              earnXp(10, 'breathing cycle complete')
              return 0
            } else {
              setBreathPhase(prev => prev + 1)
              return 0
            }
          }
          return prev + 1
        })
      }, phase.duration / 100)
    }
    return () => clearInterval(interval)
  }, [isBreathing, breathPhase])

  // calm streak decay (slow)
  useEffect(() => {
    const decay = setInterval(() => {
      setCalmStreak(prev => Math.max(0, prev - 0.1))
    }, 60000)
    return () => clearInterval(decay)
  }, [])

  // white noise toggle
  const toggleNoise = (id: string) => {
    if (activeNoise === id) {
      // stop all
      WHITE_NOISES.forEach(n => {
        const audio = (document.querySelector(`#${n.id}`) as HTMLAudioElement)
        if (audio) audio.pause()
      })
      setActiveNoise('')
    } else {
      // stop others, play this
      WHITE_NOISES.forEach(n => {
        const audio = (document.querySelector(`#${n.id}`) as HTMLAudioElement)
        if (audio) {
          if (n.id === id) {
            audio.loop = true
            audio.play()
          } else {
            audio.pause()
          }
        }
      })
      setActiveNoise(id)
      earnXp(3, `sensory ${id}`)
    }
  }

  // fidget spinner
  const spinFidget = () => {
    setFidgetSpins(prev => prev + 1)
    if (fidgetSpins % 10 === 0) earnXp(1, 'focus fidget')
  }

  return (
    <div className="space-y-6">
      {/* breathing exercise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Circle className="w-5 h-5" />
            4-7-8 breathing
            <Badge variant="secondary" className="ml-auto">
              calm streak: {Math.floor(calmStreak)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4 p-8">
          <div className="relative">
            <div 
              className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl transition-all duration-1000"
              style={{ 
                transform: `scale(${1 + breathProgress / 1000})`,
                opacity: 0.8 + breathProgress / 500 
              }}
            >
              <div className="text-2xl font-mono">{BREATHING_PATTERN[breathPhase].label}</div>
            </div>
            <div className="absolute inset-0 w-32 h-32 md:w-40 md:h-40 border-4 border-slate-700/50 rounded-full animate-ping" />
          </div>
          <div className="text-center space-y-2">
            <div className="w-full bg-slate-800 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${breathProgress}%` }}
              />
            </div>
            <Button 
              onClick={() => setIsBreathing(!isBreathing)}
              variant={isBreathing ? 'destructive' : 'default'}
              className="w-full"
            >
              {isBreathing ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {isBreathing ? 'pause' : 'start breathing'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* white noise grid */}
      <Card>
        <CardHeader>
          <CardTitle>white noise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {WHITE_NOISES.map(noise => (
            <Button
              key={noise.id}
              variant={activeNoise === noise.id ? 'default' : 'outline'}
              onClick={() => toggleNoise(noise.id)}
              className={`h-20 flex flex-col items-center gap-1 text-xs ${activeNoise === noise.id ? 'ring-2 ring-green-500' : ''}`}
            >
              <Volume2 className="w-6 h-6" style={{ color: noise.color }} />
              <span>{noise.label}</span>
              <audio id={noise.id} preload="auto" />
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* fidget spinners */}
      <Card>
        <CardHeader>
          <CardTitle>fidget spinners</CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => (
              <div 
                key={i}
                className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full relative cursor-pointer hover:scale-110 transition-all hover:rotate-180"
                onClick={spinFidget}
              >
                <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                  spin #{fidgetSpins}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4 text-sm text-slate-400">
            spins: {fidgetSpins} (+xp every 10)
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SensoryHub
