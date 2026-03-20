import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { useGamificationStore } from '../../stores/gamification-store'
import { PieChart, Pie, ResponsiveContainer, LineChart, Line } from 'recharts'

const FINANCIAL_LEVELS = [
  'penny-pincher', 'saver', 'investor', 'mogul'
]

const CATEGORIES = ['income', 'food', 'rent', 'fun', 'savings']

const FinancialHub: React.FC = () => {
  const [balance, setBalance] = useState(1250.50)
  type Transaction = { category: string; amount: number; date: string }
  const [transactions, setTransactions] = useState<Transaction[]>([])
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

  const balanceTrend = [{ date: 'mon', balance: 1200 }, { date: 'tue', balance: 1250 }, { date: 'wed', balance: balance }]

  return (
    <div className="space-y-6">
      {/* balance overview */}
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

      {/* dashboard switcher */}
      <Select value={view} onValueChange={setView}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="balance">balance</SelectItem>
          <SelectItem value="pie">spending pie</SelectItem>
          <SelectItem value="tree">money tree</SelectItem>
          <SelectItem value="budget">budget bars</SelectItem>
        </SelectContent>
      </Select>

      {/* views */}
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
                    <PieCell key={entry.name} fill={['#ec4899', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* quick log */}
      <Card>
        <CardHeader>
          <CardTitle>quick log</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {CATEGORIES.map(cat => (
            <Button key={cat} variant="outline" onClick={() => logTransaction(cat, Math.random() * 100 * (cat === 'income' ? 1 : -1))}>
              {cat} ±{Math.random()*50}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* recent transactions */}
      <Card>
        <CardHeader>
          <CardTitle>recent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {transactions.slice(-5).map((t, i) => (
            <div key={i} className={`flex justify-between p-2 rounded ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{t.category}</span>
              <span>${t.amount.toFixed(2)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default FinancialHub

