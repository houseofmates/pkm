import { useState, useEffect, useCallback } from 'react'
import api from '@/api/nocobase-client'
import { secureLogger } from '@/lib/secure-logger'

export interface MuscleGroup {
  id: string
  name: string
  completed: boolean
  lastCompleted?: string
}

export interface ExerciseSession {
  id: string
  muscleGroups: MuscleGroup[]
  duration: number
  timestamp: string
  notes?: string
}

export const MUSCLE_GROUPS = [
  { id: 'upper', name: 'upper body', emoji: '💪' },
  { id: 'core', name: 'core', emoji: '🎯' },
  { id: 'legs', name: 'legs', emoji: '🦵' },
  { id: 'cardio', name: 'cardio', emoji: '❤️' },
  { id: 'stretch', name: 'stretch', emoji: '🧘' },
]

export function useExerciseTracker() {
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>(
    MUSCLE_GROUPS.map(mg => ({ ...mg, completed: false }))
  )
  const [loading, setLoading] = useState(false)
  const [todaySession, setTodaySession] = useState<ExerciseSession | null>(null)

  const today = new Date().toISOString().split('T')[0]

  // load today's exercise data
  useEffect(() => {
    const loadExercise = async () => {
      try {
        const res: any = await api.listRecords('exercise_sessions', {
          filter: { date: today },
          pageSize: 1,
          sort: '-createdAt'
        })
        
        if (res?.data?.[0]) {
          const session = res.data[0]
          setTodaySession(session)
          
          // update muscle groups from session
          const sessionGroups = JSON.parse(session.muscle_groups || '[]') as string[]
          setMuscleGroups(prev => prev.map(mg => ({
            ...mg,
            completed: sessionGroups.includes(mg.id)
          })))
        } else {
          // check localStorage fallback
          const local = localStorage.getItem(`pkm:exercise:${today}`)
          if (local) {
            const parsed = JSON.parse(local)
            setMuscleGroups(prev => prev.map(mg => ({
              ...mg,
              completed: parsed.completed?.includes(mg.id) || false
            })))
          }
        }
      } catch (e) {
        secureLogger.error('failed to load exercise data', e)
      }
    }
    
    loadExercise()
  }, [today])

  const toggleMuscleGroup = useCallback(async (groupId: string) => {
    const newGroups = muscleGroups.map(mg => 
      mg.id === groupId ? { ...mg, completed: !mg.completed } : mg
    )
    setMuscleGroups(newGroups)
    
    // save to localStorage immediately
    const completedIds = newGroups.filter(mg => mg.completed).map(mg => mg.id)
    localStorage.setItem(`pkm:exercise:${today}`, JSON.stringify({
      completed: completedIds,
      timestamp: new Date().toISOString()
    }))
    
    // try to save to server
    try {
      const existing: any = await api.listRecords('exercise_sessions', {
        filter: { date: today },
        pageSize: 1
      })
      
      const payload = {
        date: today,
        muscle_groups: JSON.stringify(completedIds),
        timestamp: new Date().toISOString(),
        completed_count: completedIds.length
      }
      
      if (existing?.data?.[0]) {
        await api.updateRecord('exercise_sessions', existing.data[0].id, payload)
      } else {
        await api.createRecord('exercise_sessions', payload)
      }
    } catch (e) {
      // localStorage fallback already done
      secureLogger.warn('failed to save exercise to server', e)
    }
    
    return newGroups.filter(mg => mg.completed).length
  }, [muscleGroups, today])

  const completedCount = muscleGroups.filter(mg => mg.completed).length
  const isComplete = completedCount === muscleGroups.length

  return {
    muscleGroups,
    toggleMuscleGroup,
    completedCount,
    isComplete,
    loading,
    todaySession
  }
}
