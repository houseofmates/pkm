import React, { useState, useCallback } from 'react'
import { Card, CardHeader, CardContent, CardTitle } from '../ui/card'
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

// muscle rows for oral-b style grid (5 rows x 5 exercises)
const MUSCLE_ROWS = [
  { row: 0, muscles: ['chest-upper', 'chest-mid', 'chest-lower', 'shoulders', 'traps'], name: 'upper body', bonus: false },
  { row: 1, muscles: ['back-wide', 'back-mid', 'back-lower', 'lats', 'rear-delts'], name: 'back day', bonus: false },
  { row: 2, muscles: ['biceps', 'triceps', 'forearms', 'grip', 'wrists'], name: 'arms', bonus: false },
  { row: 3, muscles: ['quads', 'hamstrings', 'calves', 'glutes', 'hips'], name: 'legs', bonus: false },
  { row: 4, muscles: ['abs-upper', 'abs-mid', 'abs-lower', 'obliques', 'core-stability'], name: 'core', bonus: false }
]

const ExerciseTracker: React.FC = () => {
  const [workedMuscles, setWorkedMuscles] = useState<Record<string, boolean>>({})
  const [weeklyData] = useState([{ day: 'mon', minutes: 45 }, { day: 'tue', minutes: 60 }, { day: 'wed', minutes: 30 }])
  const { earnXp, completeQuest } = useGamificationStore()

  const toggleMuscle = useCallback((muscleId: string) => {
    setWorkedMuscles(prev => {
      const isWorked = !prev[muscleId]
      const newWorked = { ...prev, [muscleId]: isWorked }
      if (isWorked) {
        earnXp(15, `worked ${muscleId}`)
        // check row bonus
        MUSCLE_ROWS.forEach(row => {
          const rowComplete = row.muscles.every(m => newWorked[m])
          if (rowComplete) {
            completeQuest(`muscle-row-${row.row}`)
            earnXp(50, `row ${row.row} bonus`)
          }
        })
      }
      return newWorked
    })
  }, [earnXp, completeQuest])

  const rowProgress = MUSCLE_ROWS.map(row => ({
    row: row.name,
    complete: row.muscles.every(m => workedMuscles[m]),
    count: row.muscles.filter(m => workedMuscles[m]).length,
    total: row.muscles.length
  }))

  return (
    <div className="space-y-6">
      {/* oral-b style muscle grids */}
      <div className="space-y-4">
        {MUSCLE_ROWS.map(row => (
          <Card key={row.row}>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>{row.name}</CardTitle>
              <Badge variant={row.bonus ? 'default' : 'secondary'}>
                {rowProgress[row.row]?.count}/{row.total} {row.bonus ? '+50xp bonus!' : ''}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {row.muscles.map(muscle => (
                  <Button
                    key={muscle}
                    variant={workedMuscles[muscle] ? 'default' : 'outline'}
                    onClick={() => toggleMuscle(muscle)}
                    className={`h-20 p-2 transition-all ${workedMuscles[muscle] ? 'animate-pulse shadow-lg shadow-emerald-500/25' : 'hover:shadow-md hover:shadow-orange-500/25'}`}
                  >
                    <div className="text-xs font-bold line-clamp-2">{muscle.replace('-', ' ').toLowerCase()}</div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* muscle mastery levels */}
      <Card>
        <CardHeader>
          <CardTitle>muscle mastery levels</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {['chest', 'back', 'arms', 'legs', 'core'].map(group => (
            <div key={group} className="text-center">
              <div className="text-2xl mb-2">{group.toUpperCase()}</div>
              <Badge className="mb-2">level 3</Badge>
              <Progress value={75} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* quick exercises */}
      <Card>
        <CardHeader>
          <CardTitle>quick exercises</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {['bench', 'squat', 'deadlift', 'pullup', 'plank', 'lunges'].map(ex => (
            <Button key={ex} variant="outline" onClick={() => earnXp(10, `${ex} session`)} className="h-12 capitalize">
              {ex}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* weekly progress */}
      <Card>
        <CardHeader>
          <CardTitle>weekly volume</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExerciseTracker

