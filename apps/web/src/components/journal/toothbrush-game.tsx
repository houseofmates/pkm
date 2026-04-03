import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Sparkles, Trophy, Zap, Flame, Shield, Star } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'

// Quadrant positions for 2-minute brushing
const QUADRANTS = [
  { id: 'q1', name: 'top-left', position: 'top-0 left-0', targetTime: 30, icon: '🦷' },
  { id: 'q2', name: 'top-right', position: 'top-0 right-0', targetTime: 30, icon: '🦷' },
  { id: 'q3', name: 'bottom-left', position: 'bottom-0 left-0', targetTime: 30, icon: '🦷' },
  { id: 'q4', name: 'bottom-right', position: 'bottom-0 right-0', targetTime: 30, icon: '🦷' }
]

// Tooth grid positions
const UPPER_TEETH = [
  { id: 'u1', row: 0, col: 0 }, { id: 'u2', row: 0, col: 1 }, { id: 'u3', row: 0, col: 2 }, { id: 'u4', row: 0, col: 3 }, { id: 'u5', row: 0, col: 4 },
  { id: 'u6', row: 0, col: 5 }, { id: 'u7', row: 0, col: 6 }, { id: 'u8', row: 0, col: 7 }
]
const LOWER_TEETH = [
  { id: 'l1', row: 1, col: 0 }, { id: 'l2', row: 1, col: 1 }, { id: 'l3', row: 1, col: 2 }, { id: 'l4', row: 1, col: 3 }, { id: 'l5', row: 1, col: 4 },
  { id: 'l6', row: 1, col: 5 }, { id: 'l7', row: 1, col: 6 }, { id: 'l8', row: 1, col: 7 }
]

// Sparkle effect component
const Sparkle: React.FC<{ x: number; y: number; active: boolean }> = ({ x, y, active }) => (
  <div
    className={`absolute pointer-events-none transition-all duration-500 ${active ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
    style={{ left: x, top: y }}
  >
    <Sparkles className="w-6 h-6 text-emerald-400 animate-spin" />
  </div>
)

interface BrushingSession {
  date: string
  duration: number
  quadrantsCompleted: string[]
  teethCleaned: string[]
  xpEarned: number
}

const ToothbrushGame: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes
  const [currentQuadrant, setCurrentQuadrant] = useState(0)
  const [cleanedTeeth, setCleanedTeeth] = useState<Set<string>>(new Set())
  const [sparkles, setSparkles] = useState<{ x: number; y: number; id: string }[]>([])
  const [sessions, setSessions] = useState<BrushingSession[]>([])
  const [streak, setStreak] = useState(0)
  const [showVictory, setShowVictory] = useState(false)
  const [level, setLevel] = useState(1)
  const [totalXp, setTotalXp] = useState(0)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { earnXp } = useGamificationStore()

  // Sound effects using Web Audio API
  const playSound = useCallback((type: 'brush' | 'sparkle' | 'complete' | 'quadrant') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      switch (type) {
        case 'brush':
          oscillator.frequency.value = 200
          oscillator.type = 'sine'
          gainNode.gain.value = 0.1
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.05)
          break
        case 'sparkle':
          oscillator.frequency.value = 800 + Math.random() * 400
          oscillator.type = 'sine'
          gainNode.gain.value = 0.15
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.1)
          break
        case 'quadrant':
          oscillator.frequency.value = 440
          oscillator.type = 'sine'
          gainNode.gain.value = 0.2
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.3)
          break
        case 'complete':
          oscillator.frequency.value = 523
          oscillator.type = 'sine'
          gainNode.gain.value = 0.2
          oscillator.start()
          setTimeout(() => {
            oscillator.frequency.value = 659
          }, 150)
          setTimeout(() => {
            oscillator.frequency.value = 784
          }, 300)
          oscillator.stop(audioContext.currentTime + 0.5)
          break
      }
    } catch (e) {
      console.log('Audio not available')
    }
  }, [])

  // Load streak from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pkm:toothbrush:streak')
    if (saved) setStreak(parseInt(saved))
    const savedSessions = localStorage.getItem('pkm:toothbrush:sessions')
    if (savedSessions) setSessions(JSON.parse(savedSessions))
    const savedXp = localStorage.getItem('pkm:toothbrush:xp')
    if (savedXp) {
      const xp = parseInt(savedXp)
      setTotalXp(xp)
      setLevel(Math.floor(xp / 100) + 1)
    }
  }, [])

  // Timer logic
  useEffect(() => {
    if (isPlaying && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
        
        // Auto-advance quadrant every 30 seconds
        const elapsed = 120 - timeRemaining + 1
        const newQuadrant = Math.min(Math.floor(elapsed / 30), 3)
        if (newQuadrant > currentQuadrant) {
          setCurrentQuadrant(newQuadrant)
          playSound('quadrant')
        }
      }, 1000)
    } else if (timeRemaining === 0 && isPlaying) {
      completeSession()
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, timeRemaining, currentQuadrant])

  const startBrushing = () => {
    setIsPlaying(true)
    setTimeRemaining(120)
    setCurrentQuadrant(0)
    setCleanedTeeth(new Set())
    setShowVictory(false)
  }

  const cleanTooth = (toothId: string, event: React.MouseEvent) => {
    if (!isPlaying) return
    
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    
    if (!cleanedTeeth.has(toothId)) {
      setCleanedTeeth(prev => new Set([...prev, toothId]))
      playSound('sparkle')
      
      // Add sparkle effect
      setSparkles(prev => [...prev, { x, y, id: `${toothId}-${Date.now()}` }])
      setTimeout(() => {
        setSparkles(prev => prev.filter(s => s.id !== `${toothId}-${Date.now()}`))
      }, 500)
    }
  }

  const completeSession = useCallback(() => {
    setIsPlaying(false)
    const xpEarned = Math.min(50, 20 + cleanedTeeth.size * 2 + streak * 2)
    
    const session: BrushingSession = {
      date: new Date().toDateString(),
      duration: 120,
      quadrantsCompleted: QUADRANTS.slice(0, currentQuadrant + 1).map(q => q.id),
      teethCleaned: Array.from(cleanedTeeth),
      xpEarned
    }
    
    setSessions(prev => {
      const updated = [...prev, session]
      localStorage.setItem('pkm:toothbrush:sessions', JSON.stringify(updated))
      return updated
    })
    
    // Update streak
    const today = new Date().toDateString()
    const lastSession = sessions[sessions.length - 1]
    let newStreak = streak
    
    if (!lastSession || lastSession.date !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (lastSession?.date === yesterday.toDateString()) {
        newStreak = streak + 1
      } else if (!lastSession || lastSession.date !== today) {
        newStreak = 1
      }
    }
    
    setStreak(newStreak)
    localStorage.setItem('pkm:toothbrush:streak', newStreak.toString())
    
    // Award XP
    setTotalXp(prev => {
      const newXp = prev + xpEarned
      localStorage.setItem('pkm:toothbrush:xp', newXp.toString())
      setLevel(Math.floor(newXp / 100) + 1)
      return newXp
    })
    
    earnXp(xpEarned, 'toothbrushing')
    playSound('complete')
    setShowVictory(true)
  }, [cleanedTeeth, currentQuadrant, streak, sessions, earnXp, playSound])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((120 - timeRemaining) / 120) * 100

  const todaysSessions = sessions.filter(s => s.date === new Date().toDateString())
  const totalCleanedToday = todaysSessions.reduce((sum, s) => sum + s.teethCleaned.length, 0)

  return (
    <div className="space-y-6">
      {/* Status Bar */}
      <Card className="bg-gradient-to-r from-cyan-900/30 to-emerald-900/30 border-cyan-500/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🪥</div>
              <div>
                <div className="font-bold text-cyan-400">toothbrush quest</div>
                <div className="text-xs text-slate-400">level {level} • {totalXp} total xp</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Flame className={`w-5 h-5 ${streak >= 3 ? 'text-orange-400' : 'text-slate-500'}`} />
              <span className="font-bold text-orange-400">{streak}d streak</span>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            {todaysSessions.length >= 1 && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                ✓ morning done
              </Badge>
            )}
            {todaysSessions.length >= 2 && (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400">
                ✓ evening done
              </Badge>
            )}
            {todaysSessions.length === 0 && (
              <Badge variant="secondary">no brush yet today</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Victory Screen */}
      {showVictory && (
        <Card className="bg-gradient-to-r from-emerald-900/50 to-cyan-900/50 border-emerald-500/50 animate-pulse">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <div className="text-2xl font-bold text-emerald-400 mb-2">teeth sparkly clean!</div>
            <div className="text-slate-300 mb-4">
              cleaned {cleanedTeeth.size} surfaces • {streak} day streak
            </div>
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-amber-400">
              <Star className="w-6 h-6" />
              +{Math.min(50, 20 + cleanedTeeth.size * 2 + streak * 2)} xp earned!
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Area */}
      <Card className="bg-gradient-to-b from-slate-900 to-slate-950">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="text-2xl">{isPlaying ? '🪥' : '🦷'}</span>
              {isPlaying ? QUADRANTS[currentQuadrant].name.toUpperCase() : 'ready to brush'}
            </span>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <>
                  <span className="text-2xl font-mono text-cyan-400">{formatTime(timeRemaining)}</span>
                  <Progress value={progress} className="w-24 h-2 [&>div]:bg-cyan-500" />
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {/* Quadrant Indicator */}
          {isPlaying && (
            <div className="absolute -top-8 left-0 right-0 flex justify-center">
              <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                quadrant {currentQuadrant + 1}/4: {QUADRANTS[currentQuadrant].name}
              </Badge>
            </div>
          )}

          {/* Tooth Grid */}
          <div className="relative py-8">
            {/* Upper Teeth */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              {UPPER_TEETH.map(tooth => {
                const quadrant = tooth.col < 4 ? 0 : 1
                const isActive = isPlaying && currentQuadrant === quadrant
                const isClean = cleanedTeeth.has(tooth.id)
                
                return (
                  <button
                    key={tooth.id}
                    onClick={(e) => cleanTooth(tooth.id, e)}
                    disabled={!isPlaying}
                    className={`
                      relative h-16 rounded-t-lg border-2 transition-all duration-300
                      ${isActive ? 'border-cyan-400 bg-gradient-to-b from-slate-200 to-slate-300' : 'border-slate-700 bg-slate-800'}
                      ${isClean ? 'from-emerald-300 to-emerald-400 border-emerald-400 shadow-lg shadow-emerald-500/50' : ''}
                      ${isActive && !isClean ? 'hover:from-slate-300 hover:to-slate-400 cursor-pointer' : ''}
                      ${!isActive ? 'opacity-60 cursor-default' : ''}
                    `}
                  >
                    <div className={`absolute inset-0 flex items-center justify-center text-lg ${isClean ? 'opacity-100' : 'opacity-30'}`}>
                      {isClean ? '✨' : '·'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Gums Line */}
            <div className="h-4 bg-gradient-to-r from-pink-300 via-pink-400 to-pink-300 rounded-full my-1" />

            {/* Lower Teeth */}
            <div className="grid grid-cols-8 gap-1">
              {LOWER_TEETH.map(tooth => {
                const quadrant = tooth.col < 4 ? 2 : 3
                const isActive = isPlaying && currentQuadrant === quadrant
                const isClean = cleanedTeeth.has(tooth.id)
                
                return (
                  <button
                    key={tooth.id}
                    onClick={(e) => cleanTooth(tooth.id, e)}
                    disabled={!isPlaying}
                    className={`
                      relative h-16 rounded-b-lg border-2 transition-all duration-300
                      ${isActive ? 'border-cyan-400 bg-gradient-to-b from-slate-300 to-slate-200' : 'border-slate-700 bg-slate-800'}
                      ${isClean ? 'from-emerald-300 to-emerald-400 border-emerald-400 shadow-lg shadow-emerald-500/50' : ''}
                      ${isActive && !isClean ? 'hover:from-slate-400 hover:to-slate-300 cursor-pointer' : ''}
                      ${!isActive ? 'opacity-60 cursor-default' : ''}
                    `}
                  >
                    <div className={`absolute inset-0 flex items-center justify-center text-lg ${isClean ? 'opacity-100' : 'opacity-30'}`}>
                      {isClean ? '✨' : '·'}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Sparkle Effects */}
            {sparkles.map(sparkle => (
              <Sparkle key={sparkle.id} x={sparkle.x} y={sparkle.y} active={true} />
            ))}
          </div>

          {/* Progress Stats */}
          {isPlaying && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>surfaces cleaned</span>
                <span className="text-emerald-400">{cleanedTeeth.size}/16</span>
              </div>
              <Progress 
                value={(cleanedTeeth.size / 16) * 100} 
                className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500" 
              />
            </div>
          )}

          {/* Start Button */}
          {!isPlaying && !showVictory && (
            <Button 
              onClick={startBrushing} 
              className="w-full h-16 text-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 mt-4"
            >
              <Zap className="w-6 h-6 mr-2" />
              start brushing! (2 min)
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Quadrant Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">brushing guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {QUADRANTS.map((q, i) => (
              <div key={q.id} className={`p-2 rounded-lg ${currentQuadrant === i && isPlaying ? 'bg-cyan-500/20 border border-cyan-500/50' : 'bg-slate-800/50'}`}>
                <div className="text-lg mb-1">{q.icon}</div>
                <div className="font-bold">{q.name}</div>
                <div className="text-slate-500">{q.targetTime}s</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Achievements & Rewards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-900/30 to-orange-900/30">
          <CardContent className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <div className="font-bold text-amber-400">{streak}</div>
            <div className="text-xs text-slate-400">day streak</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30">
          <CardContent className="p-4 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
            <div className="font-bold text-cyan-400">{totalCleanedToday}</div>
            <div className="text-xs text-slate-400">cleaned today</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-900/30 to-green-900/30">
          <CardContent className="p-4 text-center">
            <Zap className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            <div className="font-bold text-emerald-400">{sessions.length}</div>
            <div className="text-xs text-slate-400">total sessions</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 mx-auto mb-2 text-purple-400" />
            <div className="font-bold text-purple-400">{level}</div>
            <div className="text-xs text-slate-400">hygiene level</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-48 overflow-auto">
            {sessions.slice(-5).reverse().map((session, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                <div className="text-sm">
                  <span className="text-slate-400">{session.date}</span>
                  <span className="mx-2">•</span>
                  <span>{session.teethCleaned.length} surfaces</span>
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400">+{session.xpEarned} xp</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default ToothbrushGame
