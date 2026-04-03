import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Heart, Zap, Crown, Shield, Sparkles, Star, Droplets, Scissors, Cookie, Play, Moon, AlertTriangle, Package } from 'lucide-react'
import { useGamificationStore } from '../../stores/gamification-store'

interface WilsonAbility {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  unlocked: boolean
  levelRequired: number
  cooldown: number
  lastUsed: number | null
}

interface LootBoxReward {
  id: string
  type: 'xp' | 'shield' | 'multiplier' | 'streak' | 'custom'
  amount: number
  label: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface CareAction {
  id: string
  name: string
  icon: React.ReactNode
  xpReward: number
  cooldown: number
  lastPerformed: number | null
}

interface WilsonState {
  name: string
  level: number
  xp: number
  xpToNext: number
  hunger: number
  happiness: number
  energy: number
  cleanliness: number
  affection: number
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'sleepy'
  visualState: 'idle-happy' | 'idle-sad' | 'idle-neutral' | 'sleeping' | 'eating' | 'playing' | 'grooming'
  streakShields: number
  xpMultiplier: number
  totalLevelUps: number
  abilitiesUnlocked: string[]
  lastAbilityUse: Record<string, number | null>
}

type WilsonMood = WilsonState['mood']
type WilsonVisualState = WilsonState['visualState']

const RARITY_COLORS = {
  common: 'text-slate-400 border-slate-500',
  rare: 'text-blue-400 border-blue-500',
  epic: 'text-purple-400 border-purple-500',
  legendary: 'text-amber-400 border-amber-500'
}

const RARITY_BG = {
  common: 'from-slate-800 to-slate-900',
  rare: 'from-blue-900/50 to-blue-950/50',
  epic: 'from-purple-900/50 to-purple-950/50',
  legendary: 'from-amber-900/50 to-orange-900/50'
}

const GamifiedPets: React.FC = () => {
  const [wilson, setWilson] = useState({
    name: 'wilson',
    level: 1,
    xp: 0,
    xpToNext: 100,
    hunger: 80,
    happiness: 60,
    energy: 80,
    cleanliness: 80,
    affection: 50,
    mood: 'happy' as 'happy' | 'neutral' | 'sad' | 'excited' | 'sleepy',
    visualState: 'idle-happy' as 'idle-happy' | 'idle-sad' | 'idle-neutral' | 'sleeping' | 'eating' | 'playing' | 'grooming',
    streakShields: 0,
    xpMultiplier: 1,
    totalLevelUps: 0,
    abilitiesUnlocked: [] as string[],
    lastAbilityUse: {} as Record<string, number | null>
  })
  
  const [showLootBox, setShowLootBox] = useState(false)
  const [currentLootBox, setCurrentLootBox] = useState<LootBoxReward[]>([])
  const [activityLog, setActivityLog] = useState<{ action: string; time: string; xp: number }[]>([])
  
  const { earnXp, updateStreak } = useGamificationStore()

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pkm:wilson:state')
    if (saved) {
      const parsed = JSON.parse(saved)
      setWilson(prev => ({ ...prev, ...parsed }))
    }
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('pkm:wilson:state', JSON.stringify({
      name: wilson.name,
      level: wilson.level,
      xp: wilson.xp,
      xpToNext: wilson.xpToNext,
      hunger: wilson.hunger,
      happiness: wilson.happiness,
      energy: wilson.energy,
      cleanliness: wilson.cleanliness,
      affection: wilson.affection,
      mood: wilson.mood,
      visualState: wilson.visualState,
      streakShields: wilson.streakShields,
      xpMultiplier: wilson.xpMultiplier,
      totalLevelUps: wilson.totalLevelUps,
      abilitiesUnlocked: wilson.abilitiesUnlocked
    }))
  }, [wilson])

  // Stat decay over time
  useEffect(() => {
    const decayInterval = setInterval(() => {
      setWilson(prev => ({
        ...prev,
        hunger: Math.max(0, prev.hunger - 0.5),
        happiness: Math.max(0, prev.happiness - 0.3),
        energy: Math.min(100, prev.energy + 2), // Recover energy over time
        cleanliness: Math.max(0, prev.cleanliness - 0.2),
        mood: getMood(prev.hunger, prev.happiness, prev.energy)
      }))
    }, 60000) // Every minute
    
    return () => clearInterval(decayInterval)
  }, [])

  const getMood = (hunger: number, happiness: number, energy: number): WilsonMood => {
    const avg = (hunger + happiness + energy) / 3
    if (avg >= 80) return 'excited'
    if (avg >= 60) return 'happy'
    if (avg >= 40) return 'neutral'
    if (avg >= 20) return 'sad'
    return 'sleepy'
  }

  const getVisualState = (mood: WilsonMood): WilsonVisualState => {
    switch (mood) {
      case 'excited': return 'playing'
      case 'happy': return 'idle-happy'
      case 'neutral': return 'idle-neutral'
      case 'sad': return 'idle-sad'
      case 'sleepy': return 'sleeping'
    }
  }

  // Wilson Abilities
  const ABILITIES: WilsonAbility[] = [
    {
      id: 'motivation-boost',
      name: 'motivation boost',
      description: 'wilson cheers you on! +15% XP for 1 hour when active. Requires happiness > 70.',
      icon: <Sparkles className="w-5 h-5" />,
      unlocked: wilson.abilitiesUnlocked.includes('motivation-boost'),
      levelRequired: 3,
      cooldown: 3600000,
      lastUsed: wilson.lastAbilityUse['motivation-boost'] ?? null
    },
    {
      id: 'streak-shield',
      name: 'streak shield',
      description: 'protect one streak from breaking. Can only be used once per week.',
      icon: <Shield className="w-5 h-5" />,
      unlocked: wilson.abilitiesUnlocked.includes('streak-shield'),
      levelRequired: 5,
      cooldown: 604800000,
      lastUsed: wilson.lastAbilityUse['streak-shield'] ?? null
    },
    {
      id: 'xp-surge',
      name: 'xp surge',
      description: 'wilson performs a trick! +50 XP instantly.',
      icon: <Zap className="w-5 h-5" />,
      unlocked: wilson.abilitiesUnlocked.includes('xp-surge'),
      levelRequired: 2,
      cooldown: 300000,
      lastUsed: wilson.lastAbilityUse['xp-surge'] ?? null
    },
    {
      id: 'streak-heal',
      name: 'streak heal',
      description: 'restore one broken streak. Only works within 24 hours of breaking.',
      icon: <Heart className="w-5 h-5" />,
      unlocked: wilson.abilitiesUnlocked.includes('streak-heal'),
      levelRequired: 7,
      cooldown: 86400000,
      lastUsed: wilson.lastAbilityUse['streak-heal'] ?? null
    },
    {
      id: 'double-xp',
      name: 'double xp',
      description: 'wilson doubles down! 2x XP for next completed task.',
      icon: <Star className="w-5 h-5" />,
      unlocked: wilson.abilitiesUnlocked.includes('double-xp'),
      levelRequired: 10,
      cooldown: 7200000,
      lastUsed: wilson.lastAbilityUse['double-xp'] ?? null
    }
  ]

  // Care actions
  const CARE_ACTIONS: CareAction[] = [
    { id: 'feed', name: 'feed', icon: <Cookie className="w-5 h-5" />, xpReward: 15, cooldown: 1800000, lastPerformed: null },
    { id: 'play', name: 'play', icon: <Play className="w-5 h-5" />, xpReward: 20, cooldown: 3600000, lastPerformed: null },
    { id: 'groom', name: 'groom', icon: <Scissors className="w-5 h-5" />, xpReward: 10, cooldown: 7200000, lastPerformed: null },
    { id: 'nap', name: 'nap together', icon: <Moon className="w-5 h-5" />, xpReward: 5, cooldown: 1800000, lastPerformed: null }
  ]

  // Loot box rewards pool
  const LOOT_POOL: LootBoxReward[] = [
    { id: 'xp-small', type: 'xp', amount: 25, label: '25 bonus xp', rarity: 'common' },
    { id: 'xp-medium', type: 'xp', amount: 50, label: '50 bonus xp', rarity: 'rare' },
    { id: 'xp-large', type: 'xp', amount: 100, label: '100 bonus xp', rarity: 'epic' },
    { id: 'xp-huge', type: 'xp', amount: 250, label: '250 bonus xp', rarity: 'legendary' },
    { id: 'shield-1', type: 'shield', amount: 1, label: '1 streak shield', rarity: 'rare' },
    { id: 'shield-3', type: 'shield', amount: 3, label: '3 streak shields', rarity: 'epic' },
    { id: 'multiplier-small', type: 'multiplier', amount: 0.1, label: '+10% xp boost (1hr)', rarity: 'rare' },
    { id: 'multiplier-large', type: 'multiplier', amount: 0.25, label: '+25% xp boost (1hr)', rarity: 'epic' },
    { id: 'streak-heal', type: 'streak', amount: 1, label: 'restore broken streak', rarity: 'epic' },
    { id: 'custom-treat', type: 'custom', amount: 1, label: 'wilson performs a trick!', rarity: 'legendary' }
  ]

  const addActivityLog = useCallback((action: string, xp: number) => {
    setActivityLog(prev => [{
      action,
      time: new Date().toLocaleTimeString(),
      xp
    }, ...prev.slice(0, 9)])
  }, [])

  const awardWilsonXp = useCallback((amount: number) => {
    setWilson(prev => {
      const newXp = prev.xp + amount
      const xpToNext = prev.xpToNext
      
      if (newXp >= xpToNext) {
        // Level up!
        const newLevel = prev.level + 1
        const newXpToNext = Math.floor(xpToNext * 1.5)
        
        // Check for new abilities
        const newAbilities = [...prev.abilitiesUnlocked]
        ABILITIES.forEach(ability => {
          if (newLevel >= ability.levelRequired && !newAbilities.includes(ability.id)) {
            newAbilities.push(ability.id)
          }
        })
        
        // Trigger loot box
        setTimeout(() => {
          openLootBox()
        }, 500)
        
        addActivityLog(`level up! now level ${newLevel}`, 0)
        
        return {
          ...prev,
          level: newLevel,
          xp: newXp - xpToNext,
          xpToNext: newXpToNext,
          totalLevelUps: prev.totalLevelUps + 1,
          abilitiesUnlocked: newAbilities,
          happiness: Math.min(100, prev.happiness + 20)
        }
      }
      
      return { ...prev, xp: newXp }
    })
  }, [addActivityLog])

  const openLootBox = () => {
    // Roll for rewards
    const roll = () => {
      const rand = Math.random()
      if (rand < 0.5) return LOOT_POOL.filter(r => r.rarity === 'common')[0]
      if (rand < 0.8) return LOOT_POOL.filter(r => r.rarity === 'rare')[Math.floor(Math.random() * 2)]
      if (rand < 0.95) return LOOT_POOL.filter(r => r.rarity === 'epic')[Math.floor(Math.random() * 3)]
      return LOOT_POOL.filter(r => r.rarity === 'legendary')[0]
    }
    
    const rewards = [roll(), roll(), roll()]
    setCurrentLootBox(rewards)
    setShowLootBox(true)
  }

  const claimLoot = (reward: LootBoxReward) => {
    switch (reward.type) {
      case 'xp':
        earnXp(reward.amount, 'wilson loot box')
        break
      case 'shield':
        setWilson(prev => ({ ...prev, streakShields: prev.streakShields + reward.amount }))
        break
      case 'multiplier':
        setWilson(prev => ({ ...prev, xpMultiplier: prev.xpMultiplier + reward.amount }))
        setTimeout(() => {
          setWilson(prev => ({ ...prev, xpMultiplier: prev.xpMultiplier - reward.amount }))
        }, 3600000)
        break
      case 'streak':
        updateStreak(new Date().toISOString())
        break
    }
    addActivityLog(`claimed ${reward.label}`, reward.type === 'xp' ? reward.amount : 0)
    setShowLootBox(false)
  }

  const performCareAction = (action: CareAction) => {
    const now = Date.now()
    if (action.lastPerformed && now - action.lastPerformed < action.cooldown) {
      return // On cooldown
    }
    
    setWilson(prev => {
      let updates: Partial<typeof prev> = {}
      
      switch (action.id) {
        case 'feed':
          updates = { hunger: Math.min(100, prev.hunger + 40), happiness: Math.min(100, prev.happiness + 10) }
          break
        case 'play':
          updates = { happiness: Math.min(100, prev.happiness + 30), energy: Math.max(0, prev.energy - 15) }
          break
        case 'groom':
          updates = { cleanliness: Math.min(100, prev.cleanliness + 50), affection: Math.min(100, prev.affection + 20) }
          break
        case 'nap':
          updates = { energy: Math.min(100, prev.energy + 40), happiness: Math.min(100, prev.happiness + 5) }
          break
      }
      
      return { 
        ...prev, 
        ...updates,
        mood: getMood(
          action.id === 'feed' ? Math.min(100, prev.hunger + 40) : prev.hunger,
          action.id === 'play' ? Math.min(100, prev.happiness + 30) : prev.happiness,
          action.id === 'nap' ? Math.min(100, prev.energy + 40) : prev.energy
        ),
        visualState: getVisualState(getMood(
          action.id === 'feed' ? Math.min(100, prev.hunger + 40) : prev.hunger,
          action.id === 'play' ? Math.min(100, prev.happiness + 30) : prev.happiness,
          action.id === 'nap' ? Math.min(100, prev.energy + 40) : prev.energy
        ))
      }
    })
    
    awardWilsonXp(action.xpReward)
    addActivityLog(`${action.name} with wilson`, action.xpReward)
  }

  const useAbility = (ability: WilsonAbility) => {
    if (!ability.unlocked) return
    
    const now = Date.now()
    if (ability.lastUsed && now - ability.lastUsed < ability.cooldown) return
    
    // Track ability use
    setWilson(prev => ({
      ...prev,
      lastAbilityUse: { ...prev.lastAbilityUse, [ability.id]: now }
    }))
    
    switch (ability.id) {
      case 'xp-surge':
        earnXp(50, 'wilson xp surge')
        awardWilsonXp(5)
        addActivityLog('xp surge activated!', 50)
        break
      case 'motivation-boost':
        setWilson(prev => ({ ...prev, xpMultiplier: prev.xpMultiplier + 0.15 }))
        setTimeout(() => {
          setWilson(prev => ({ ...prev, xpMultiplier: prev.xpMultiplier - 0.15 }))
        }, 3600000)
        addActivityLog('motivation boost active!', 0)
        break
      case 'streak-shield':
        setWilson(prev => ({ ...prev, streakShields: prev.streakShields + 1 }))
        addActivityLog('streak shield acquired!', 0)
        break
    }
    
    // Mark ability as used (in real app, track lastUsed per ability)
  }

  const getWilsonEmoji = () => {
    if (wilson.level >= 15) return '🦄'
    if (wilson.level >= 10) return '🐉'
    if (wilson.level >= 7) return '🦊'
    if (wilson.level >= 5) return '🐕'
    if (wilson.level >= 3) return '🐶'
    return '🐕‍🦺'
  }

  const getMoodEmoji = () => {
    switch (wilson.mood) {
      case 'excited': return '🤩'
      case 'happy': return '😊'
      case 'neutral': return '😐'
      case 'sad': return '😢'
      case 'sleepy': return '😴'
    }
  }

  return (
    <div className="space-y-6">
      {/* Loot Box Modal */}
      {showLootBox && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <Card className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 border-purple-500 max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                <Package className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                level up reward!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {currentLootBox.map((reward, i) => (
                  <button
                    key={i}
                    onClick={() => claimLoot(reward)}
                    className={`p-3 rounded-lg border-2 bg-gradient-to-b ${RARITY_BG[reward.rarity]} ${RARITY_COLORS[reward.rarity]} transition-transform hover:scale-105`}
                  >
                    <div className="text-xs mb-1 capitalize">{reward.rarity}</div>
                    <div className="font-bold text-sm">{reward.label}</div>
                  </button>
                ))}
              </div>
              <p className="text-center text-xs text-slate-400 mt-4">click a reward to claim it</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wilson Status Card */}
      <Card className="bg-gradient-to-r from-amber-900/30 via-orange-900/30 to-yellow-900/30 border-amber-500/30">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="text-6xl">{getWilsonEmoji()}</div>
                <div className="absolute -top-2 -right-2 text-2xl">{getMoodEmoji()}</div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{wilson.name}</span>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/50">
                    <Star className="w-3 h-3 mr-1" />
                    level {wilson.level}
                  </Badge>
                </div>
                <div className="text-sm text-slate-400">happiness: {wilson.mood}</div>
                <div className="flex items-center gap-2 mt-1">
                  {wilson.xpMultiplier > 1 && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {(wilson.xpMultiplier * 100).toFixed(0)}% xp
                    </Badge>
                  )}
                  {wilson.streakShields > 0 && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                      <Shield className="w-3 h-3 mr-1" />
                      {wilson.streakShields} shields
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-slate-400">xp to next level</div>
              <div className="text-xl font-bold text-amber-400">{wilson.xp} / {wilson.xpToNext}</div>
              <Progress value={(wilson.xp / wilson.xpToNext) * 100} className="w-32 h-2 mt-1 [&>div]:bg-amber-500" />
            </div>
          </div>

          {/* Wilson Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
            {[
              { label: 'hunger', value: wilson.hunger, icon: <Cookie className="w-4 h-4" />, color: 'orange' },
              { label: 'happiness', value: wilson.happiness, icon: <Heart className="w-4 h-4" />, color: 'pink' },
              { label: 'energy', value: wilson.energy, icon: <Zap className="w-4 h-4" />, color: 'amber' },
              { label: 'cleanliness', value: wilson.cleanliness, icon: <Droplets className="w-4 h-4" />, color: 'blue' },
              { label: 'affection', value: wilson.affection, icon: <Heart className="w-4 h-4" />, color: 'red' }
            ].map(stat => (
              <div key={stat.label} className="bg-slate-800/50 rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 capitalize">{stat.label}</span>
                  <span className={`text-${stat.color}-400`}>{stat.icon}</span>
                </div>
                <Progress 
                  value={stat.value} 
                  className={`h-2 [&>div]:bg-${stat.color}-500`}
                />
                <div className="text-xs text-right mt-1">{Math.round(stat.value)}%</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Care Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            care for wilson
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CARE_ACTIONS.map(action => {
              const onCooldown = action.lastPerformed ? Date.now() - action.lastPerformed < action.cooldown : false
              const cooldownRemaining = onCooldown 
                ? Math.ceil((action.cooldown - (Date.now() - (action.lastPerformed || 0))) / 60000)
                : 0
              
              return (
                <Button
                  key={action.id}
                  variant="outline"
                  disabled={onCooldown}
                  onClick={() => performCareAction(action)}
                  className="h-20 flex-col gap-1"
                >
                  <div className="text-xl">{action.icon}</div>
                  <div className="text-sm">{action.name}</div>
                  <div className="text-xs text-slate-400">
                    {onCooldown ? `${cooldownRemaining}m` : `+${action.xpReward} xp`}
                  </div>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Wilson Abilities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            wilson's abilities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {ABILITIES.map(ability => {
              const canUse = ability.unlocked && (!ability.lastUsed || Date.now() - ability.lastUsed >= ability.cooldown)
              const onCooldown = ability.lastUsed && Date.now() - ability.lastUsed < ability.cooldown
              
              return (
                <div
                  key={ability.id}
                  className={`p-4 rounded-lg border transition-all ${
                    !ability.unlocked 
                      ? 'bg-slate-800/50 border-slate-700 opacity-50' 
                      : ability.unlocked && canUse
                        ? 'bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-purple-500/50 hover:border-purple-400 cursor-pointer'
                        : 'bg-slate-800/50 border-slate-700'
                  }`}
                  onClick={() => canUse && useAbility(ability)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={ability.unlocked ? 'text-purple-400' : 'text-slate-500'}>
                        {ability.icon}
                      </span>
                      <span className="font-bold">{ability.name}</span>
                    </div>
                    {!ability.unlocked && (
                      <Badge variant="secondary" className="text-xs">
                        lvl {ability.levelRequired}
                      </Badge>
                    )}
                    {onCooldown && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.ceil((ability.cooldown - (Date.now() - (ability.lastUsed || 0))) / 60000)}m
                      </Badge>
                    )}
                    {ability.unlocked && !onCooldown && (
                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">ready</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">{ability.description}</p>
                  
                  {ability.unlocked && (
                    <div className="mt-2 text-xs">
                      {ability.id === 'motivation-boost' && wilson.happiness > 70 && (
                        <span className="text-green-400">✓ happiness high enough</span>
                      )}
                      {ability.id === 'motivation-boost' && wilson.happiness <= 70 && (
                        <span className="text-red-400">✗ need happiness {'>'} 70%</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          <div className="mt-4 text-center text-sm text-slate-500">
            abilities unlock as wilson levels up! current abilities: {wilson.abilitiesUnlocked.length}/{ABILITIES.length}
          </div>
        </CardContent>
      </Card>

      {/* Wilson Stats & Evolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            wilson's journey
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-400">{wilson.totalLevelUps}</div>
              <div className="text-xs text-slate-400">total level ups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">{wilson.abilitiesUnlocked.length}</div>
              <div className="text-xs text-slate-400">abilities unlocked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400">{wilson.streakShields}</div>
              <div className="text-xs text-slate-400">streak shields</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-pink-400">{wilson.affection}%</div>
              <div className="text-xs text-slate-400">affection</div>
            </div>
          </div>

          {/* Evolution Tree */}
          <div className="border-t border-slate-700 pt-4">
            <div className="text-sm font-bold mb-3">evolution path</div>
            <div className="flex items-center justify-between">
              {[
                { level: 1, emoji: '🐕‍🦺', name: 'puppy', current: wilson.level >= 1 },
                { level: 3, emoji: '🐶', name: 'dog', current: wilson.level >= 3 },
                { level: 5, emoji: '🐕', name: 'doggo', current: wilson.level >= 5 },
                { level: 7, emoji: '🦊', name: 'fox', current: wilson.level >= 7 },
                { level: 10, emoji: '🐉', name: 'dragon', current: wilson.level >= 10 },
                { level: 15, emoji: '🦄', name: 'unicorn', current: wilson.level >= 15 }
              ].map((stage, i) => (
                <div key={stage.level} className="flex items-center">
                  <div className={`text-center p-2 rounded-lg ${stage.current ? 'bg-amber-500/20 border border-amber-500/50' : 'bg-slate-800/50 border border-slate-700'}`}>
                    <div className={`text-2xl ${stage.current ? '' : 'grayscale opacity-50'}`}>{stage.emoji}</div>
                    <div className="text-xs">{stage.name}</div>
                    <div className="text-xs text-slate-500">lvl {stage.level}</div>
                  </div>
                  {i < 5 && (
                    <div className={`w-8 h-0.5 ${stage.current ? 'bg-amber-500' : 'bg-slate-700'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-48 overflow-auto">
          {activityLog.length === 0 ? (
            <div className="text-center text-slate-500 py-4">no recent activity</div>
          ) : (
            activityLog.map((log, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg">
                <div className="text-sm">{log.action}</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{log.time}</span>
                  {log.xp > 0 && (
                    <Badge className="bg-amber-500/20 text-amber-400">+{log.xp} xp</Badge>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Warning if Wilson needs care */}
      {(wilson.hunger < 30 || wilson.happiness < 30 || wilson.cleanliness < 30) && (
        <Card className="bg-orange-900/20 border-orange-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 text-orange-400" />
            <div>
              <div className="font-bold text-orange-400">wilson needs attention!</div>
              <div className="text-sm text-slate-400">
                {wilson.hunger < 30 && 'hungry • '}
                {wilson.happiness < 30 && 'unhappy • '}
                {wilson.cleanliness < 30 && 'needs grooming'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GamifiedPets
