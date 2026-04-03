import { useState } from 'react'
import { useEdgelessStore } from '@/features/edgeless/store'
import { cn } from '@/lib/utils'
import { Flame, Heart, Target, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { useGamificationStore } from '@/store/useGamificationStore'

interface GamificationWidgetSidebarProps {
  className?: string
}

export function GamificationWidgetSidebar({ className }: GamificationWidgetSidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const { questRows, pets, sevenDayCoverage } = useGamificationStore()

  const completedQuests = questRows.filter(r => 
    r.cells.filter(c => c.completed).length === r.cells.length
  ).length

  return (
    <div className={cn(
      "fixed left-4 top-24 z-40 transition-all duration-300",
      isOpen ? "translate-x-0" : "-translate-x-[calc(100%-40px)]",
      className
    )}>
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-3 w-48 shadow-xl">
        {/* header with toggle */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#ffb20d]" />
            <span className="text-xs text-white/60 lowercase">stats</span>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors"
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <div className="space-y-3">
            {/* Quests progress */}
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Target className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-white/50 lowercase">quests</span>
              </div>
              <div className="text-lg font-medium text-white/80 lowercase">
                {completedQuests}/{questRows.length}
              </div>
            </div>

            {/* Pets count */}
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-3 h-3 text-pink-400" />
                <span className="text-[10px] text-white/50 lowercase">companions</span>
              </div>
              <div className="text-lg font-medium text-white/80 lowercase">
                {pets.length}
              </div>
            </div>

            {/* 7-day coverage */}
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-[10px] text-white/50 lowercase">7d coverage</span>
              </div>
              <div className="text-lg font-medium text-white/80 lowercase">
                {Math.round(sevenDayCoverage)}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* collapsed indicator */}
      {!isOpen && (
        <div className="absolute left-full top-0 ml-2 p-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg">
          <Sparkles className="w-4 h-4 text-[#ffb20d]" />
        </div>
      )}
    </div>
  )
}
