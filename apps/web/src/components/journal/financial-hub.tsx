import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { useGamificationStore } from '../../stores/gamification-store'
import { PieChart, Pie, ResponsiveContainer, Cell, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Wallet, PiggyBank, Target, Trophy, Zap, Flame, Shield, Crown, Star, CreditCard, Building2, Landmark, ArrowUpRight, ArrowDownRight, Gift, Sparkles, Plus, TrendingUp } from 'lucide-react'

const WEALTH_LEVELS = [
  { level: 1, name: 'penny-pincher', emoji: '🐜', minNetWorth: 0 },
  { level: 2, name: 'saver', emoji: '🐷', minNetWorth: 500 },
  { level: 3, name: 'investor', emoji: '🐰', minNetWorth: 2000 },
  { level: 4, name: 'trader', emoji: '🦊', minNetWorth: 5000 },
  { level: 5, name: 'entrepreneur', emoji: '🦁', minNetWorth: 10000 },
  { level: 6, name: 'magnate', emoji: '🐻', minNetWorth: 25000 },
  { level: 7, name: 'tycoon', emoji: '🦅', minNetWorth: 50000 },
  { level: 8, name: 'millionaire', emoji: '🐉', minNetWorth: 100000 },
  { level: 9, name: 'billionaire', emoji: '🌟', minNetWorth: 1000000 },
  { level: 10, name: 'goated', emoji: '💎', minNetWorth: 10000000 }
]

interface Account {
  id: string
  name: string
  type: 'checking' | 'savings' | 'investment' | 'cash' | 'credit' | 'debt'
  balance: number
  institution?: string
  color: string
}

interface SavingsGoal {
  id: string
  name: string
  target: number
  current: number
  icon: string
  deadline?: string
  completed: boolean
}

interface Transaction {
  id: string
  date: string
  category: string
  amount: number
  description: string
  type: 'income' | 'expense' | 'transfer'
}

type DashboardView = 'overview' | 'accounts' | 'goals' | 'spending' | 'trends' | 'defense'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const FinancialHub: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([
    { id: '1', name: 'checking', type: 'checking', balance: 1250.50, institution: 'chase', color: '#3b82f6' },
    { id: '2', name: 'savings', type: 'savings', balance: 3500.00, institution: 'ally', color: '#10b981' },
    { id: '3', name: 'investments', type: 'investment', balance: 8500.00, institution: 'fidelity', color: '#8b5cf6' },
    { id: '4', name: 'cash', type: 'cash', balance: 150.00, color: '#f59e0b' }
  ])
  
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', date: new Date().toDateString(), category: 'income', amount: 2500, description: 'paycheck', type: 'income' },
    { id: '2', date: new Date().toDateString(), category: 'rent', amount: -800, description: 'rent payment', type: 'expense' },
    { id: '3', date: new Date().toDateString(), category: 'food', amount: -85, description: 'groceries', type: 'expense' },
    { id: '4', date: new Date().toDateString(), category: 'fun', amount: -45, description: 'streaming', type: 'expense' }
  ])
  
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([
    { id: '1', name: 'emergency fund', target: 5000, current: 3500, icon: '🛡️', completed: false },
    { id: '2', name: 'new laptop', target: 1500, current: 800, icon: '💻', completed: false },
    { id: '3', name: 'vacation', target: 3000, current: 200, icon: '✈️', completed: false },
    { id: '4', name: 'car repair', target: 1000, current: 0, icon: '🚗', completed: false }
  ])
  
  const [view, setView] = useState<DashboardView>('overview')
  const [wealthLevel, setWealthLevel] = useState(1)
  const [xpMultiplier, setXpMultiplier] = useState(1)
  const [streakShields, setStreakShields] = useState(0)
  const [showLootBox, setShowLootBox] = useState(false)
  
  const { earnXp, completeQuest } = useGamificationStore()

  const netWorth = accounts.reduce((sum, acc) => {
    if (acc.type === 'credit' || acc.type === 'debt') {
      return sum - acc.balance
    }
    return sum + acc.balance
  }, 0)

  useEffect(() => {
    let newLevel = 1
    for (let i = WEALTH_LEVELS.length - 1; i >= 0; i--) {
      if (netWorth >= WEALTH_LEVELS[i].minNetWorth) {
        newLevel = WEALTH_LEVELS[i].level
        break
      }
    }
    setWealthLevel(newLevel)
    setXpMultiplier(1 + (newLevel - 1) * 0.1)
  }, [netWorth])

  useEffect(() => {
    const saved = localStorage.getItem('pkm:finance:accounts')
    if (saved) setAccounts(JSON.parse(saved))
    const savedGoals = localStorage.getItem('pkm:finance:goals')
    if (savedGoals) setSavingsGoals(JSON.parse(savedGoals))
    const savedTx = localStorage.getItem('pkm:finance:transactions')
    if (savedTx) setTransactions(JSON.parse(savedTx))
    const savedShields = localStorage.getItem('pkm:finance:streakShields')
    if (savedShields) setStreakShields(parseInt(savedShields))
  }, [])

  useEffect(() => {
    localStorage.setItem('pkm:finance:accounts', JSON.stringify(accounts))
    localStorage.setItem('pkm:finance:goals', JSON.stringify(savingsGoals))
    localStorage.setItem('pkm:finance:transactions', JSON.stringify(transactions))
    localStorage.setItem('pkm:finance:streakShields', streakShields.toString())
  }, [accounts, savingsGoals, transactions, streakShields])

  const logTransaction = useCallback((category: string, amount: number, description: string) => {
    const newTx: Transaction = {
      id: Date.now().toString(),
      date: new Date().toDateString(),
      category,
      amount,
      description,
      type: amount > 0 ? 'income' : 'expense'
    }
    setTransactions(prev => [...prev, newTx])
    
    setAccounts(prev => prev.map(acc => {
      if (acc.type === 'checking' || acc.type === 'cash') {
        return { ...acc, balance: acc.balance + amount }
      }
      return acc
    }))
    
    const xpAmount = Math.round((amount > 0 ? 10 : 3) * xpMultiplier)
    earnXp(xpAmount, `finance: ${description}`)
    
    if (amount > 0) completeQuest('income-cat')
    else completeQuest(`${category}-cat`)
  }, [earnXp, completeQuest, xpMultiplier])

  const addToSavingsGoal = useCallback((goalId: string, amount: number) => {
    setSavingsGoals(prev => prev.map(goal => {
      if (goal.id !== goalId) return goal
      const newCurrent = goal.current + amount
      const completed = newCurrent >= goal.target
      if (completed && !goal.completed) {
        earnXp(50 * xpMultiplier, `goal: ${goal.name}`)
        if (Math.random() < 0.3) {
          setShowLootBox(true)
        }
      }
      return { ...goal, current: newCurrent, completed }
    }))
  }, [earnXp, xpMultiplier])

  const updateAccountBalance = useCallback((accountId: string, newBalance: number) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId ? { ...acc, balance: newBalance } : acc
    ))
  }, [])

  const spendingData = [
    { name: 'food', value: 450, color: '#10b981' },
    { name: 'rent', value: 800, color: '#3b82f6' },
    { name: 'fun', value: 200, color: '#f59e0b' },
    { name: 'utilities', value: 150, color: '#8b5cf6' },
    { name: 'transport', value: 100, color: '#ef4444' }
  ]

  const trendData = [
    { month: 'jan', income: 3500, expenses: 2800 },
    { month: 'feb', income: 3500, expenses: 3200 },
    { month: 'mar', income: 4000, expenses: 2900 },
    { month: 'apr', income: 3500, expenses: 2600 },
    { month: 'may', income: 3500, expenses: 3000 },
    { month: 'jun', income: 4000, expenses: 2800 }
  ]

  const currentLevel = WEALTH_LEVELS[wealthLevel - 1]
  const nextLevel = WEALTH_LEVELS[wealthLevel] || WEALTH_LEVELS[WEALTH_LEVELS.length - 1]
  const levelProgress = nextLevel.minNetWorth > currentLevel.minNetWorth
    ? ((netWorth - currentLevel.minNetWorth) / (nextLevel.minNetWorth - currentLevel.minNetWorth)) * 100
    : 100

  const healthData = [
    { category: 'savings rate', value: 35 },
    { category: 'debt ratio', value: 20 },
    { category: 'emergency fund', value: 70 },
    { category: 'budget adherence', value: 80 },
    { category: 'investment', value: 45 }
  ]

  const renderLootBox = () => {
    const rewards = [
      { type: 'xp', amount: Math.floor(Math.random() * 50) + 20, label: 'bonus xp' },
      { type: 'shield', amount: 1, label: 'streak shield' },
      { type: 'multiplier', amount: 0.1, label: 'xp boost' }
    ]
    const reward = rewards[Math.floor(Math.random() * rewards.length)]
    
    const handleClaim = () => {
      if (reward.type === 'shield') {
        setStreakShields(prev => prev + reward.amount)
      } else if (reward.type === 'xp') {
        earnXp(reward.amount, 'goal reward')
      }
      setShowLootBox(false)
    }
    
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <Card className="bg-gradient-to-br from-purple-900 to-pink-900 border-purple-500 animate-bounce">
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <div className="text-2xl font-bold text-yellow-400 mb-2">goal completed!</div>
            <div className="text-slate-300 mb-4">you earned a reward!</div>
            <div className="bg-black/30 rounded-lg p-4 mb-4">
              <div className="text-4xl font-bold text-emerald-400">
                {reward.type === 'xp' && `+${reward.amount} xp`}
                {reward.type === 'shield' && `${reward.amount} streak shield`}
                {reward.type === 'multiplier' && `+${(reward.amount * 100).toFixed(0)}% xp boost`}
              </div>
              <div className="text-sm text-slate-400">{reward.label}</div>
            </div>
            <Button onClick={handleClaim} className="w-full">
              claim reward
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showLootBox && renderLootBox()}

      <Card className="bg-gradient-to-r from-emerald-900/50 via-teal-900/50 to-cyan-900/50 border-emerald-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{currentLevel.emoji}</div>
              <div>
                <div className="text-sm text-slate-400">net worth</div>
                <div className="text-4xl font-bold text-emerald-400">${netWorth.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                    <Crown className="w-3 h-3 mr-1" />
                    {currentLevel.name} (lvl {wealthLevel})
                  </Badge>
                  {xpMultiplier > 1 && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {(xpMultiplier * 100).toFixed(0)}% xp
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="flex items-center gap-1 text-orange-400">
                  <Flame className="w-5 h-5" />
                  <span className="font-bold">${((netWorth * 0.05) / 365).toFixed(2)}</span>
                </div>
                <div className="text-xs text-slate-400">daily growth</div>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-purple-400">
                  <Shield className="w-5 h-5" />
                  <span className="font-bold">{streakShields}</span>
                </div>
                <div className="text-xs text-slate-400">streak shields</div>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>{currentLevel.name}</span>
              <span>{nextLevel.name} (${nextLevel.minNetWorth.toLocaleString()})</span>
            </div>
            <Progress value={levelProgress} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-cyan-500" />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {(['overview', 'accounts', 'goals', 'spending', 'trends', 'defense'] as DashboardView[]).map(v => (
          <Button
            key={v}
            variant={view === v ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView(v)}
            className="capitalize"
          >
            {v === 'overview' && <Wallet className="w-4 h-4 mr-1" />}
            {v === 'accounts' && <Building2 className="w-4 h-4 mr-1" />}
            {v === 'goals' && <Target className="w-4 h-4 mr-1" />}
            {v === 'spending' && <PieChart className="w-4 h-4 mr-1" />}
            {v === 'trends' && <TrendingUp className="w-4 h-4 mr-1" />}
            {v === 'defense' && <Shield className="w-4 h-4 mr-1" />}
            {v}
          </Button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">total assets</CardTitle>
              <Landmark className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                ${accounts.filter(a => a.type !== 'credit' && a.type !== 'debt').reduce((sum, a) => sum + a.balance, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">monthly income</CardTitle>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                ${transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">monthly expenses</CardTitle>
              <ArrowDownRight className="w-4 h-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                ${Math.abs(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm">financial health score</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={healthData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="category" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 8 }} />
                  <Radar name="health" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">top goal</CardTitle>
              <Target className="w-4 h-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              {savingsGoals.filter(g => !g.completed)[0] && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{savingsGoals[0].icon}</span>
                    <span className="font-bold">{savingsGoals[0].name}</span>
                  </div>
                  <div className="text-sm text-slate-400 mb-1">
                    ${savingsGoals[0].current.toLocaleString()} / ${savingsGoals[0].target.toLocaleString()}
                  </div>
                  <Progress value={(savingsGoals[0].current / savingsGoals[0].target) * 100} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'accounts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <Card key={account.id} className="bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: account.color }} />
                    <span className="text-sm">{account.name}</span>
                  </CardTitle>
                  <Badge variant="secondary" className="capitalize text-xs">
                    {account.type}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2" style={{ color: account.color }}>
                    ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  {account.institution && (
                    <div className="text-xs text-slate-400">{account.institution}</div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => {
                      const amount = window.prompt('enter amount:')
                      if (amount) {
                        updateAccountBalance(account.id, account.balance + parseFloat(amount))
                      }
                    }}>
                      add
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => {
                      const amount = window.prompt('enter amount:')
                      if (amount) {
                        updateAccountBalance(account.id, account.balance - parseFloat(amount))
                      }
                    }}>
                      sub
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">asset distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={accounts.filter(a => a.type !== 'credit' && a.type !== 'debt').map(a => ({ name: a.name, value: a.balance }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {accounts.filter((_, index) => {
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    })}
                  </Pie>
                  <Tooltip formatter={(value) => `$${(value as number).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {view === 'goals' && (
        <div className="space-y-4">
          {savingsGoals.map(goal => (
            <Card key={goal.id} className={`bg-gradient-to-r ${goal.completed ? 'from-emerald-900/30 to-teal-900/30 border-emerald-500/30' : 'from-slate-900 to-slate-800'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{goal.icon}</span>
                    <div>
                      <div className="font-bold">{goal.name}</div>
                      <div className="text-sm text-slate-400">
                        ${goal.current.toLocaleString()} / ${goal.target.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {goal.completed ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400">
                      <Trophy className="w-4 h-4 mr-1" />
                      complete!
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {((goal.current / goal.target) * 100).toFixed(0)}%
                    </Badge>
                  )}
                </div>
                
                <div className="relative">
                  <Progress value={(goal.current / goal.target) * 100} className="h-4" />
                  <div className="absolute inset-0 flex justify-between px-1">
                    {[25, 50, 75].map(milestone => (
                      <div
                        key={milestone}
                        className={`h-full w-0.5 ${goal.current >= (goal.target * milestone / 100) ? 'bg-emerald-400' : 'bg-slate-600'}`}
                      />
                    ))}
                  </div>
                </div>
                
                {!goal.completed && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => {
                      const amount = window.prompt('add to savings:')
                      if (amount) addToSavingsGoal(goal.id, parseFloat(amount))
                    }}>
                      <PiggyBank className="w-4 h-4 mr-1" />
                      add savings
                    </Button>
                    {goal.current >= goal.target && (
                      <Button size="sm" className="flex-1 bg-emerald-600" onClick={() => {
                        setSavingsGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: true } : g))
                        earnXp(50 * xpMultiplier, `goal: ${goal.name}`)
                      }}>
                        <Gift className="w-4 h-4 mr-1" />
                        claim reward
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full h-12" onClick={() => {
            const name = window.prompt('goal name:')
            const target = window.prompt('target amount:')
            if (name && target) {
              setSavingsGoals(prev => [...prev, {
                id: Date.now().toString(),
                name,
                target: parseFloat(target),
                current: 0,
                icon: '🎯',
                completed: false
              }])
            }
          }}>
            <Plus className="w-4 h-4 mr-1" />
            create new goal
          </Button>
        </div>
      )}

      {view === 'spending' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">monthly spending by category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={spendingData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value, percent }) => `${name}: $${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                  >
                    {spendingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {spendingData.map((item) => (
              <Card key={item.name} className="bg-slate-900/50">
                <CardContent className="p-3 text-center">
                  <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
                  <div className="font-bold">${item.value}</div>
                  <div className="text-xs text-slate-400 capitalize">{item.name}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {view === 'trends' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">income vs expenses trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip />
                  <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-emerald-900/20 border-emerald-500/30">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                <div className="text-2xl font-bold text-emerald-400">
                  ${(3500 * 6 - 2950 * 6).toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">6mo savings</div>
              </CardContent>
            </Card>
            <Card className="bg-cyan-900/20 border-cyan-500/30">
              <CardContent className="p-4 text-center">
                <Star className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                <div className="text-2xl font-bold text-cyan-400">
                  {((savingsGoals.reduce((sum, g) => sum + g.current, 0) / savingsGoals.reduce((sum, g) => sum + g.target, 0)) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-slate-400">goals progress</div>
              </CardContent>
            </Card>
            <Card className="bg-purple-900/20 border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                <div className="text-2xl font-bold text-purple-400">
                  ${(3500 * 6 * 0.2).toLocaleString()}
                </div>
                <div className="text-sm text-slate-400">potential savings (20%)</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {view === 'defense' && (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border-red-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                budget defense grid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-400 mb-4">
                defend your budget! click categories to mark them "protected"
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {spendingData.map((item) => (
                  <Card key={item.name} className="bg-slate-900 border-slate-700">
                    <CardContent className="p-4 text-center">
                      <div className="w-8 h-8 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
                      <div className="font-bold capitalize mb-1">{item.name}</div>
                      <div className="text-lg font-bold">${item.value}</div>
                      <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => {
                        logTransaction(item.name, -item.value, `defense: ${item.name}`)
                      }}>
                        track expense
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">budget defense progress</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {spendingData.map((item) => {
                const tracked = transactions.filter(t => t.category === item.name && t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0)
                const progress = Math.min((tracked / item.value) * 100, 100)
                return (
                  <div key={item.name} className="text-center">
                    <div className="text-xs text-slate-400 capitalize mb-1">{item.name}</div>
                    <Progress value={progress} className={`h-2 ${progress >= 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`} />
                    <div className="text-xs mt-1">${tracked}/${item.value}</div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            quick log transaction
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button variant="outline" onClick={() => logTransaction('income', 1000, 'income')}>
            <ArrowUpRight className="w-4 h-4 mr-1 text-emerald-400" />
            income
          </Button>
          <Button variant="outline" onClick={() => logTransaction('food', -50, 'food expense')}>
            <ArrowDownRight className="w-4 h-4 mr-1 text-red-400" />
            food
          </Button>
          <Button variant="outline" onClick={() => logTransaction('rent', -800, 'rent')}>
            <ArrowDownRight className="w-4 h-4 mr-1 text-red-400" />
            rent
          </Button>
          <Button variant="outline" onClick={() => logTransaction('fun', -30, 'fun spending')}>
            <ArrowDownRight className="w-4 h-4 mr-1 text-red-400" />
            fun
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">recent transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-auto">
          {transactions.slice(-10).reverse().map(t => (
            <div key={t.id} className={`flex items-center justify-between p-3 rounded-lg ${t.amount > 0 ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-3">
                {t.amount > 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
                <div>
                  <div className="font-medium capitalize">{t.description || t.category}</div>
                  <div className="text-xs text-slate-400">{t.date}</div>
                </div>
              </div>
              <div className={`font-mono font-bold ${t.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default FinancialHub
