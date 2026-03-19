import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { useGamificationStore } from '../../stores/gamification-store'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

// muscle groups with svg positions
const MUSCLES = [
  { id: 'chest', name: 'chest', emoji: '💪', level: 1, workedToday: false, color: '#ec4899' },
  { id: 'back', name: 'back', emoji: '🦍', level: 1, workedToday: false, color: '#10b981' },
  { id: 'arms', name: 'arms', emoji: '🤌', level: 1, workedToday: false, color: '#3b82f6' },
  { id: 'legs', name: 'legs', emoji: '🏃', level: 1, workedToday: false, color: '#f59e0b' },
  { id: 'core', name: 'core', emoji: '🌀', level: 1, workedToday: false, color: '#8b5cf6' }
]

const EXERCISES = [
  'bench press', 'deadlift', 'squat', 'pullup', 'plank', 'lunges'
  // etc
]

interface ExerciseTrackerProps {}

const ExerciseTracker: React.FC<ExerciseTrackerProps> = () => {
  const [workedMuscles, setWorkedMuscles] = useState<Set<string>>(new Set())
  const { earnXp } = useGamificationStore()
  const [weeklyData, setWeeklyData] = useState([])

  const toggleMuscle = (muscleId: string) => {
    const newSet = new Set(workedMuscles)
    if (newSet.has(muscleId)) {
      newSet.delete(muscleId)
    } else {
      newSet.add(muscleId)
      earnXp(15, `worked ${muscleId}`)
    }
    setWorkedMuscles(newSet)
  }

  const logExercise = (exercise: string) => {
    // logic to map to muscles
    earnXp(10, `exercise ${exercise}`)
  }

  return (
    <div className="space-y-6">
      {/* body heatmap svg */}
      <Card>
        <CardHeader>
          <CardTitle>body heatmap</CardTitle>
        </CardHeader>
        <CardContent className="p-8 relative">
          <svg viewBox="0 0 200 400" className="w-full h-96 mx-auto" fill="none">
            {/* simplified body */}
            <path d="m100 20 q20 50 30 80" stroke="#374151" strokeWidth="20" fill="none" onClick={() => toggleMuscle('chest')} className={workedMuscles.has('chest') ? 'fill-red-500 cursor-pointer opacity-75' : 'fill-transparent cursor-pointer hover:fill-orange-500/50'} />
            <path d="m100 120 q-20 60 -30 90" stroke="#374151" strokeWidth="18" fill="none" onClick={() => toggleMuscle('back')} className={workedMuscles.has('back') ? 'fill-emerald-500 cursor-pointer opacity-75' : 'fill-transparent cursor-pointer hover:fill-emerald-500/50'} />
            <path d="m70 220 l0 100 m60 0 l0 -100" stroke="#374151" strokeWidth="25" fill="none" onClick={() => toggleMuscle('legs')} className={workedMuscles.has('legs') ? 'fill-amber-500 cursor-pointer opacity-75' : 'fill-transparent cursor-pointer hover:fill-amber-500/50'} />
            {/* arms, core etc */}
          </svg>
        </CardContent>
      </Card>

      {/* muscle levels */}
      <Card>
        <CardHeader>
          <CardTitle>muscle mastery</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-5 gap-4">
          {MUSCLES.map(m => (
            <div key={m.id} className="text-center">
              <div className="text-2xl mb-1">{m.emoji}</div>
              <div className="font-bold">{m.name}</div>
              <Badge variant="secondary">level {m.level}</Badge>
              <div className="text-xs text-slate-400">worked {workedMuscles.has(m.id) ? 'today' : 'yesterday'}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* exercise log */}
      <Card>
        <CardHeader>
          <CardTitle>log exercise</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {EXERCISES.slice(0,6).map(ex => (
            <Button key={ex} variant="outline" onClick={() => logExercise(ex)} className="h-12">
              {ex}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* weekly chart */}
      <Card>
        <CardHeader>
          <CardTitle>weekly volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExerciseTracker

