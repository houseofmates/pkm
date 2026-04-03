import { useState, useEffect, useCallback } from 'react'
import api from '@/api/nocobase-client'

export interface PetNeed {
  id: 'fed' | 'played' | 'rested'
  label: string
  emoji: string
  completed: boolean
}

export interface PetInteraction {
  id: string
  petId: string
  type: 'feed' | 'play' | 'rest'
  timestamp: string
  note?: string
}

export function usePetHealthTracker() {
  const [needs, setNeeds] = useState<PetNeed[]>([
    { id: 'fed', label: 'all fed', emoji: '🍖', completed: false },
    { id: 'played', label: 'play time', emoji: '🎾', completed: false },
    { id: 'rested', label: 'let rest', emoji: '😴', completed: false },
  ])
  const [interactions, setInteractions] = useState<PetInteraction[]>([])
  const [loading, setLoading] = useState(false)
  
  const today = new Date().toISOString().split('T')[0]

  // load today's pet interactions
  useEffect(() => {
    const loadPetData = async () => {
      setLoading(true)
      try {
        const res: any = await api.listRecords('pet_interactions', {
          filter: { date: today },
          pageSize: 100
        })
        
        if (res?.data) {
          const todayInteractions = res.data.map((item: any) => ({
            id: item.id,
            petId: item.pet_id,
            type: item.type,
            timestamp: item.timestamp,
            note: item.note
          }))
          setInteractions(todayInteractions)
          
          // determine which needs are met
          const hasFed = todayInteractions.some((i: PetInteraction) => i.type === 'feed')
          const hasPlayed = todayInteractions.some((i: PetInteraction) => i.type === 'play')
          const hasRested = todayInteractions.some((i: PetInteraction) => i.type === 'rest')
          
          setNeeds(prev => prev.map(need => {
            if (need.id === 'fed') return { ...need, completed: hasFed }
            if (need.id === 'played') return { ...need, completed: hasPlayed }
            if (need.id === 'rested') return { ...need, completed: hasRested }
            return need
          }))
        } else {
          // check localStorage fallback
          const local = localStorage.getItem(`pkm:pets:${today}`)
          if (local) {
            const parsed = JSON.parse(local)
            setNeeds(parsed.needs || needs)
          }
        }
      } catch (e) {
        console.error('failed to load pet data', e)
      } finally {
        setLoading(false)
      }
    }
    
    loadPetData()
  }, [today])

  const logInteraction = useCallback(async (type: 'feed' | 'play' | 'rest', petId: string = 'all', note?: string) => {
    const timestamp = new Date().toISOString()
    
    // update local state
    const newInteraction: PetInteraction = {
      id: `local-${Date.now()}`,
      petId,
      type,
      timestamp,
      note
    }
    setInteractions(prev => [...prev, newInteraction])
    
    // update needs
    setNeeds(prev => prev.map(need => {
      if (type === 'feed' && need.id === 'fed') return { ...need, completed: true }
      if (type === 'play' && need.id === 'played') return { ...need, completed: true }
      if (type === 'rest' && need.id === 'rested') return { ...need, completed: true }
      return need
    }))
    
    // save to localStorage
    const currentNeeds = needs.map(n => {
      if (type === 'feed' && n.id === 'fed') return { ...n, completed: true }
      if (type === 'play' && n.id === 'played') return { ...n, completed: true }
      if (type === 'rest' && n.id === 'rested') return { ...n, completed: true }
      return n
    })
    localStorage.setItem(`pkm:pets:${today}`, JSON.stringify({
      needs: currentNeeds,
      interactions: [...interactions, newInteraction],
      timestamp
    }))
    
    // try to save to server
    try {
      await api.createRecord('pet_interactions', {
        date: today,
        pet_id: petId,
        type,
        timestamp,
        note: note || ''
      })
    } catch (e) {
      console.warn('failed to save pet interaction to server', e)
    }
  }, [needs, interactions, today])

  const toggleNeed = useCallback((needId: string) => {
    setNeeds(prev => prev.map(need => 
      need.id === needId ? { ...need, completed: !need.completed } : need
    ))
    
    // map need to interaction type
    const needToType: Record<string, 'feed' | 'play' | 'rest'> = {
      fed: 'feed',
      played: 'play',
      rested: 'rest'
    }
    
    const need = needs.find(n => n.id === needId)
    if (need && !need.completed) {
      logInteraction(needToType[needId])
    }
  }, [needs, logInteraction])

  const completedCount = needs.filter(n => n.completed).length
  const isComplete = completedCount === needs.length

  return {
    needs,
    interactions,
    toggleNeed,
    logInteraction,
    completedCount,
    isComplete,
    loading
  }
}
