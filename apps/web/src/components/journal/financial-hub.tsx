import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useGamificationStore } from '../../stores/gamification-store'
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const FINANCIAL_LEVELS = [
  'penny-pincher', 'saver', 'investor', 'mogul'
]

const CATEGORIES = ['income', 'food', 'rent', 'fun', 'savings']

const FinancialHub: React.FC = () => {
  const [balance, setBalance] = useState(1250.50)
  const [transactions, setTransactions] = useState([]) // { amount, category, date }
  const [view, setView] = useState('balance')
  const { earnXp } = useGamificationStore()
  const [wealthLevel, setWealthLevel] = useState(1)

  const logTransaction = (category: string, amount: number) => {
    setTransactions(prev => [...prev, { category, amount, date: new Date().toDateString() }])
    setBalance(prev => prev + amount)
    if (amount > 0) earnXp(5, `income ${amount}`)
    else earnXp(2, `budget ${category}`)
  }

  const data = CATEGORIES.map(cat => ({
    name: cat,
    value: Math.random() * 500
  }))

