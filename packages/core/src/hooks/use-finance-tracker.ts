import { useState, useEffect, useCallback } from 'react'
import api from '@/api/nocobase-client'
import { secureLogger } from '@/lib/secure-logger'

export interface FinanceCategory {
  id: string
  name: string
  target: number
  current: number
  currency: string
}

export interface FinanceSummary {
  income: number
  expenses: number
  savings: number
  investments: number
  budgetRemaining: number
}

export const FINANCE_CATEGORIES = [
  { id: 'income', name: 'income', emoji: '💰', targetKey: 'daily_income' },
  { id: 'expenses', name: 'expenses', emoji: '💳', targetKey: 'daily_expenses' },
  { id: 'savings', name: 'savings', emoji: '🏦', targetKey: 'daily_savings' },
  { id: 'investments', name: 'investments', emoji: '📈', targetKey: 'daily_investments' },
  { id: 'budget', name: 'budget', emoji: '📊', targetKey: 'budget_remaining' },
]

export function useFinanceTracker() {
  const [categories, setCategories] = useState<FinanceCategory[]>(
    FINANCE_CATEGORIES.map(fc => ({
      id: fc.id,
      name: fc.name,
      target: 0,
      current: 0,
      currency: 'USD'
    }))
  )
  const [loading, setLoading] = useState(false)
  
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = today.slice(0, 7) // YYYY-MM

  // load finance data
  useEffect(() => {
    const loadFinance = async () => {
      setLoading(true)
      try {
        // try to load from finance_daily collection
        const res: any = await api.listRecords('finance_daily', {
          filter: { date: today },
          pageSize: 1
        })
        
        if (res?.data?.[0]) {
          const data = res.data[0]
          setCategories([
            { id: 'income', name: 'income', target: data.income_target || 0, current: data.income || 0, currency: 'USD' },
            { id: 'expenses', name: 'expenses', target: data.expenses_target || 0, current: data.expenses || 0, currency: 'USD' },
            { id: 'savings', name: 'savings', target: data.savings_target || 0, current: data.savings || 0, currency: 'USD' },
            { id: 'investments', name: 'investments', target: data.investments_target || 0, current: data.investments || 0, currency: 'USD' },
            { id: 'budget', name: 'budget', target: data.budget_target || 0, current: data.budget_remaining || 0, currency: 'USD' },
          ])
        } else {
          // check localStorage fallback
          const local = localStorage.getItem(`pkm:finance:${today}`)
          if (local) {
            const parsed = JSON.parse(local)
            setCategories(parsed.categories || categories)
          }
        }
      } catch (e) {
        secureLogger.error('failed to load finance data', e)
      } finally {
        setLoading(false)
      }
    }
    
    loadFinance()
  }, [today])

  const updateCategory = useCallback(async (categoryId: string, value: number) => {
    const newCategories = categories.map(cat =>
      cat.id === categoryId ? { ...cat, current: value } : cat
    )
    setCategories(newCategories)
    
    // save to localStorage
    localStorage.setItem(`pkm:finance:${today}`, JSON.stringify({
      categories: newCategories,
      timestamp: new Date().toISOString()
    }))
    
    // try to save to server
    try {
      const existing: any = await api.listRecords('finance_daily', {
        filter: { date: today },
        pageSize: 1
      })
      
      const payload: Record<string, any> = {
        date: today,
        month: currentMonth,
        timestamp: new Date().toISOString()
      }
      
      // add the specific category value
      const categoryMap: Record<string, string> = {
        income: 'income',
        expenses: 'expenses',
        savings: 'savings',
        investments: 'investments',
        budget: 'budget_remaining'
      }
      payload[categoryMap[categoryId]] = value
      
      if (existing?.data?.[0]) {
        await api.updateRecord('finance_daily', existing.data[0].id, payload)
      } else {
        await api.createRecord('finance_daily', payload)
      }
    } catch (e) {
      secureLogger.warn('failed to save finance to server', e)
    }
  }, [categories, today, currentMonth])

  // calculate completion based on targets
  const completedCount = categories.filter(cat => {
    if (cat.target === 0) return cat.current > 0 // any activity counts if no target
    return cat.current >= cat.target * 0.8 // 80% of target counts
  }).length
  
  const isComplete = completedCount === categories.length

  return {
    categories,
    updateCategory,
    completedCount,
    isComplete,
    loading
  }
}
