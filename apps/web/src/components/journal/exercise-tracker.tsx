import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
