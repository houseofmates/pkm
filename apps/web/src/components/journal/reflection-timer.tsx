import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Play, Pause, StopSquare, Clock } from 'lucide-react'
import { Progress } from '../../ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../ui/dialog'
import { useGamificationStore } from '../../../stores/gamification-store'
import { toast } from 'sonner'

type PresetTime = 3 | 5 | 10 | 15 | number

interface ReflectionTimerProps {
  onComplete?: (duration: number, prompt: string) => void
}

const ReflectionTimer: React.FC<ReflectionTimerProps> = ({ onComplete }) => {
  const [isRunning, setIsRunning] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5min default
  const [preset, setPreset] = useState<PresetTime>(5)
  const [prompt, setPrompt] = useState('what stood out today?')
  const { earnXp } = useGamificationStore()

  // prompts rotation
  const PROMPTS = [
    'what felt good today?',
    'what was challenging?',
    'one win, one lesson',
    'gratitude for 3 things',
    'body scan: tense or calm?',
    'what needs tomorrow?'
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            toast('timer complete! +20xp')
            earnXp(20, 'reflection timer')
            onComplete?.(preset * 60, prompt)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, preset, prompt, onComplete, earnXp])

  const startTimer = () => {
    setTimeLeft(preset * 60)
    setIsRunning(true)
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)])
  }

  const pauseTimer = () => setIsRunning(false)

  const resetTimer = () => {
    setIsRunning(false)
    setTimeLeft(preset * 60)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const progress = ((preset * 60 - timeLeft) / (preset * 60)) * 100

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Clock className="w-4 h-4 mr-2" />
            reflection timer
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{preset}min reflection</DialogTitle>
          </DialogHeader>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-mono mb-4">{formatTime(timeLeft)}</CardTitle>
              <div className="w-full bg-slate-800 rounded-full h-3 mb-6">
                <Progress value={progress} className="h-3 [>div]:!bg-gradient-to-r [>div]:from-emerald-500 [>div]:to-teal-500" />
              </div>
              <div className="text-slate-400 mb-6 p-4 bg-slate-900/50 rounded-lg backdrop-blur-sm">
                {prompt}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex gap-2 justify-center flex-wrap">
                {[3, 5, 10, 15].map((t) => (
                  <Button
                    key={t}
                    variant={preset === t ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreset(t)}
                  >
                    {t}min
                  </Button>
                ))}
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-800">
                {isRunning ? (
                  <>
                    <Button variant="outline" onClick={pauseTimer} className="flex-1">
                      <Pause className="w-4 h-4 mr-2" />
                      pause
                    </Button>
                    <Button variant="destructive" onClick={resetTimer} className="flex-1">
                      <StopSquare className="w-4 h-4 mr-2" />
                      stop
                    </Button>
                  </>
                ) : (
                  <Button onClick={startTimer} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500">
                    <Play className="w-4 h-4 mr-2" />
                    start
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ReflectionTimer

