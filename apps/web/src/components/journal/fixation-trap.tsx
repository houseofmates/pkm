import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { Button } from '../../ui/button'
import { Badge } from '../../ui/badge'
import { Plus, Check, Clock, Zap } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'

interface FixationQuest {
  id: string
  name: string
  description: string
  duration: number // minutes
  completedSessions: number
  totalSessions: number
  xpPerSession: number
}

const DEFAULT_FIXATIONS: FixationQuest[] = [
  { 
    id: 'minecraft-build', 
    name: 'minecraft 1h build', 
    description: 'world-building session', 
    duration: 60, 
    completedSessions: 0, 
    totalSessions: 30, 
    xpPerSession: 100 
  },
  { 
    id: 'code-fixation', 
    name: 'deep code dive', 
    description: 'fix one complex bug', 
    duration: 90, 
    completedSessions: 0, 
    totalSessions: 20, 
    xpPerSession: 150 
  },
  { 
    id: 'research-rabbit', 
    name: 'wiki rabbit hole', 
    description: 'one topic deep dive', 
    duration: 45, 
    completedSessions: 0, 
    totalSessions: 50, 
    xpPerSession: 75 
  }
]

const FixationTrap: React.FC = () => {
  const [fixations, setFixations] = useState<FixationQuest[]>([])
  const [customName, setCustomName] = useState('')
  const [showTimer, setShowTimer] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(0)
  const { earnXp } = useGamificationStore()

  useEffect(() => {
    // load from localstorage
    const saved = localStorage.getItem('fixation-quests')
    if (saved) {
      setFixations(JSON.parse(saved))
    } else {
      setFixations(DEFAULT_FIXATIONS)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('fixation-quests', JSON.stringify(fixations))
  }, [fixations])

  const completeSession = (id: string) => {
    setFixations(prev => prev.map(f => 
      f.id === id 
        ? { ...f, completedSessions: f.completedSessions + 1 }
        : f
    ))
    earnXp(100, `fixation ${id}`)
    
    // chain reward
    if (Math.random() > 0.7) {
      earnXp(50, 'bonus chain')
    }
  }

  const addCustom = () => {
    if (customName) {
      const newQuest: FixationQuest = {
        id: `custom-${Date.now()}`,
        name: customName,
        description: 'custom fixation',
        duration: 60,
        completedSessions: 0,
        totalSessions: 30,
        xpPerSession: 100
      }
      setFixations(prev => [...prev, newQuest])
      setCustomName('')
    }
  }

  const startTimer = (duration: number) => {
    setTimerMinutes(duration)
    setShowTimer(true)
  }

  return (
    <div className="space-y-6">
      {/* custom fixation input */}
      <Card>
        <CardHeader>
          <CardTitle>add your fixation</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 p-4">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. minecraft redstone..."
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded focus:ring-2 focus:ring-blue-500"
          />
          <Button onClick={addCustom}>
            <Plus className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* fixation quests grid */}
      <Card>
        <CardHeader>
          <CardTitle>fixation quests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixations.map(fixation => (
              <div key={fixation.id} className="border rounded-lg p-4 hover:shadow-lg transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="font-bold text-lg line-clamp-1">{fixation.name}</div>
                  <Badge variant="secondary">
                    {fixation.completedSessions}/{fixation.totalSessions}
                  </Badge>
                </div>
                <div className="text-sm text-slate-400 mb-4 line-clamp-2">{fixation.description}</div>
                <div className="space-y-2">
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(fixation.completedSessions / fixation.totalSessions) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => completeSession(fixation.id)}
                      disabled={fixation.completedSessions >= fixation.totalSessions}
                      className="flex-1"
                      variant="default"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      complete
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => startTimer(fixation.duration)}
                      variant="outline"
                      className="w-12"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-xs text-emerald-400">
                    +{fixation.xpPerSession} xp/session
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* timer modal */}
      {showTimer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>fixation timer</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="text-4xl font-mono mb-8 text-center">
                {Math.floor(timerMinutes / 60)}:{(timerMinutes % 60).toString().padStart(2, '0')}
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setShowTimer(false)} className="flex-1">cancel</Button>
                <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500">
                  <Zap className="w-4 h-4 mr-2" />
                  start session
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default FixationTrap
