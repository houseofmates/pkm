import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useGamificationStore } from '../../stores/gamification-store'
import { PieChart, Pie, ResponsiveContainer, LineChart, Line, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const FINANCIAL_LEVELS = [
  'penny-pincher', 'saver', 'investor', 'mogul'
]

const CATEGORIES = ['income', 'food', 'rent', 'fun', 'savings']

// budget defense grid (oral-b style: fill bars to target)
const BUDGET_ROWS = [
  { row: 0, categories: ['income', 'savings'], target: 1000, name: 'wealth build', bonus: false },
  { row: 1, categories: ['food', 'rent'], target: 600, name: 'essentials', bonus: false },
  { row: 2, categories: ['fun'], target: 200, name: 'discretionary', bonus: false },
  { row: 3, categories: ['emergency'], target: 100, name: 'buffer', bonus: false },
  { row: 4, categories: ['invest'], target: 100, name: 'future', bonus: false }
]

const FinancialHub: React.FC = () => {
  const [balance, setBalance] = useState(1250.50)
  const [transactions, setTransactions] = useState<{ category: string; amount: number; date: string }[]>([])
  const [view, setView] = useState('balance')
  const [budgetProgress, setBudgetProgress] = useState<Record<string, number>>({})
  const { earnXp, completeQuest } = useGamificationStore()
  const [wealthLevel] = useState(1)

  const logTransaction = useCallback((category: string, amount: number) => {
    setTransactions(prev => [...prev, { category, amount, date: new Date().toDateString() }])
    setBalance(prev => prev + amount)
    if (amount > 0) earnXp(5, `income ${amount}`)
    else earnXp(2, `budget ${category}`)
  }, [earnXp])

  const updateBudget = useCallback((category: string, progress: number) => {
    setBudgetProgress(prev => {
      const newProgress = { ...prev, [category]: progress }
      // check row bonus
      BUDGET_ROWS.forEach(row => {
        const rowAvg = row.categories.reduce((sum, cat) => sum + (newProgress[cat] || 0), 0) / row.categories.length
        if (rowAvg >= row.target) {
          completeQuest(`budget-row-${row.row}`)
          earnXp(50, `budget row ${row.row} bonus`)
        }
      })
      return newProgress
    })
  }, [completeQuest, earnXp])

  const data = CATEGORIES.map(cat => ({
    name: cat,
    value: Math.random() * 500
  }))

  const balanceTrend = [{ date: 'mon', balance: 1200 }, { date: 'tue', balance: 1250 }, { date: 'wed', balance: balance }]

  const budgetData = [{ category: 'food', planned: 400, actual: 380 }, { category: 'rent', planned: 800, actual: 800 }, { category: 'fun', planned: 150, actual: 200 }]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            current balance
            <Badge>{FINANCIAL_LEVELS[Math.min(wealthLevel - 1, 3)]}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold text-emerald-400">${balance.toFixed(2)}</div>
          <div className="text-sm text-slate-400 mt-2">week trend</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={balanceTrend}>
              <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Select value={view} onValueChange={setView}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="balance">balance overview</SelectItem>
          <SelectItem value="pie">spending pie</SelectItem>
          <SelectItem value="tree">money tree</SelectItem>
          <SelectItem value="budget">budget defense grid</SelectItem>
          <SelectItem value="bars">variance bars</SelectItem>
        </SelectContent>
      </Select>

      {view === 'pie' && (
        <Card>
          <CardHeader>
            <CardTitle>monthly spending</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {view === 'budget' && (
        <div className="space-y-4">
          {BUDGET_ROWS.map(row => (
            <Card key={row.row}>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>{row.name}</CardTitle>
                <Badge variant={row.categories.every(cat => budgetProgress[cat] >= row.target) ? 'default' : 'secondary'}>
                  {row.bonus ? '+50xp bonus!' : `${Math.round(row.categories.reduce((sum, cat) => sum + (budgetProgress[cat] || 0), 0) / row.categories.length)}%`}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {row.categories.map(cat => (
                    <div key={cat} className="space-y-1">
                      <div className="text-xs capitalize text-slate-400">{cat}</div>
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={budgetProgress[cat] || 0}
                          onChange={(e) => updateBudget(cat, parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-800 rounded-lg cursor-pointer accent-emerald-500 hover:accent-emerald-400"
                        />
                        <div className="text-xs text-right">{budgetProgress[cat] || 0}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {view === 'bars' && (
        <Card>
          <CardHeader>
            <CardTitle>budget variance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="planned" fill="#10b981" name="planned" />
                <Bar dataKey="actual" fill="#ef4444" name="actual" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>quick log transaction</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {CATEGORIES.map(cat => (
            <Button
              key={cat}
              variant="outline"
              onClick={() => logTransaction(cat, Math.random() * 100 * (cat === 'income' || cat === 'savings' ? 1 : -1))}
              className="h-12 capitalize"
            >
              {cat} ±${(Math.random()*50).toFixed(0)}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-48 overflow-auto">
          {transactions.slice(-8).map((t, i) => (
            <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${t.amount > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
              <span className="font-mono text-sm capitalize">{t.category}</span>
              <Badge className={`font-mono text-xs ${t.amount > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                ${t.amount.toFixed(2)}
              </Badge>
              <span className="text-xs text-slate-500">{t.date}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default FinancialHub

