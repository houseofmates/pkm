import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface GamificationQuestWidgetProps {
  className?: string
}

interface QuestCell {
  id: string
  label: string
  completed: boolean
  icon: string
}

interface QuestRow {
  id: string
  label: string
  cells: QuestCell[]
  completed: boolean
}

const DEFAULT_ROWS: QuestRow[] = [
  {
    id: 'journal',
    label: 'journal',
    completed: false,
    cells: [
      { id: 'entry', label: 'entry', completed: false, icon: '📝' },
      { id: 'mood', label: 'mood', completed: false, icon: '😊' },
      { id: 'emotions', label: '3+ emotions', completed: false, icon: '💭' },
      { id: 'body', label: 'body', completed: false, icon: '🫀' },
      { id: 'reflect', label: 'reflect', completed: false, icon: '🪞' },
    ]
  },
  {
    id: 'exercise',
    label: 'movement',
    completed: false,
    cells: [
      { id: 'upper', label: 'upper', completed: false, icon: '💪' },
      { id: 'core', label: 'core', completed: false, icon: '🎯' },
      { id: 'legs', label: 'legs', completed: false, icon: '🦵' },
      { id: 'cardio', label: 'cardio', completed: false, icon: '❤️' },
      { id: 'stretch', label: 'stretch', completed: false, icon: '🧘' },
    ]
  },
  {
    id: 'finance',
    label: 'finance',
    completed: false,
    cells: [
      { id: 'income', label: 'income', completed: false, icon: '💰' },
      { id: 'expenses', label: 'expenses', completed: false, icon: '💳' },
      { id: 'savings', label: 'savings', completed: false, icon: '🏦' },
      { id: 'invest', label: 'invest', completed: false, icon: '📈' },
      { id: 'budget', label: 'budget', completed: false, icon: '📊' },
    ]
  },
  {
    id: 'pets',
    label: 'companions',
    completed: false,
    cells: [
      { id: 'feed', label: 'fed', completed: false, icon: '🍖' },
      { id: 'play', label: 'play', completed: false, icon: '🎾' },
      { id: 'rest', label: 'rest', completed: false, icon: '😴' },
    ]
  }
]

export function GamificationQuestWidget({ className }: GamificationQuestWidgetProps) {
  const [rows, setRows] = useState<QuestRow[]>(DEFAULT_ROWS)

  useEffect(() => {
    const loadQuests = () => {
      const saved = localStorage.getItem('pkm:gamification:today')
      if (saved) {
        try {
          const data = JSON.parse(saved)
          if (data.questRows) {
            setRows(data.questRows)
          }
        } catch (e) {
          console.error('failed to load quest data', e)
        }
      }
    }

    loadQuests()
    const interval = setInterval(loadQuests, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalCells = rows.reduce((acc, row) => acc + row.cells.length, 0)
  const completedCells = rows.reduce((acc, row) => 
    acc + row.cells.filter(c => c.completed).length, 0
  )
  const overallProgress = totalCells > 0 ? Math.round((completedCells / totalCells) * 100) : 0

  return (
    <div className={cn(
      "p-3 rounded-xl border border-white/10 bg-white/[0.02]",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-white/40 lowercase">daily quests</p>
        <span className="text-xs text-white/60">{overallProgress}%</span>
      </div>
      
      {/* overall progress bar */}
      <div className="h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            overallProgress === 100 ? "bg-green-400" : "bg-yellow-400"
          )}
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      
      {/* quest rows */}
      <div className="space-y-2">
        {rows.map(row => {
          const rowProgress = (row.cells.filter(c => c.completed).length / row.cells.length) * 100
          const isComplete = rowProgress === 100
          
          return (
            <div key={row.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/50 lowercase">{row.label}</span>
              <div className="flex gap-1">
                {row.cells.map(cell => (
                  <div
                    key={cell.id}
                    className={cn(
                      "w-12 h-14 rounded-md flex flex-col items-center justify-center gap-0.5 transition-all",
                      cell.completed 
                        ? isComplete ? "bg-green-400/20 text-green-400" : "bg-yellow-400/20 text-yellow-400"
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    )}
                  >
                    <span className="text-sm">{cell.completed ? '✓' : cell.icon}</span>
                    <span className="text-[8px] lowercase text-center leading-tight px-0.5">{cell.label}</span>
                  </div>
                ))}
              </div>
              </div>
              <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    isComplete ? "bg-green-400" : "bg-white/20"
                  )}
                  style={{ width: `${rowProgress}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
