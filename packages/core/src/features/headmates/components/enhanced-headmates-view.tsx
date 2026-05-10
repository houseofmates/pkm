/**
 * enhanced headmates view component with magical interactions
 * provides smooth animations, drag-and-drop reordering, and delightful visual feedback
 * designed to make visual identity tracking feel magical and intuitive
 */

import React, { useState, useCallback, useMemo, useRef } from 'react'
import { EnhancedHeadmateCard } from './enhanced-headmate-card'
import { useEdgelessStore } from '@/features/edgeless/store'
import { secureLogger } from '@/lib/secure-logger'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Shuffle, Users, Sparkles } from 'lucide-react'

interface HeadmatesViewProps {
  members: any[]
  collection: any
  frontingOrder: string[]
  membersOrder: string[]
  onFrontingChange: (frontingOrder: string[]) => void
  onMembersOrderChange: (membersOrder: string[]) => void
  className?: string
}

export function EnhancedHeadmatesView({
  members,
  collection,
  frontingOrder,
  membersOrder,
  onFrontingChange,
  onMembersOrderChange,
  className
}: HeadmatesViewProps) {
  const [draggedMember, setDraggedMember] = useState<string | null>(null)
  const [dragOverPosition, setDragOverPosition] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showSparkles, setShowSparkles] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Get current fronting members
  const frontingMembers = useMemo(() => {
    return frontingOrder.map(id => members.find(m => m.id === id)).filter(Boolean)
  }, [frontingOrder, members])

  // Get non-fronting members in order
  const nonFrontingMembers = useMemo(() => {
    const orderedMembers = membersOrder
      .map(id => members.find(m => m.id === id))
      .filter(Boolean)
    
    // Add any members not in the order
    const remainingMembers = members.filter(m => 
      !membersOrder.includes(m.id) && !frontingOrder.includes(m.id)
    )
    
    return [...orderedMembers, ...remainingMembers]
  }, [membersOrder, members, frontingOrder])

  // Handle fronting toggle with magical effects
  const handleFrontingToggle = useCallback((memberId: string, isFronting: boolean) => {
    setIsAnimating(true)
    setShowSparkles(true)
    
    setTimeout(() => {
      if (isFronting) {
        // Add to fronting order
        const newFrontingOrder = [...frontingOrder.filter(id => id !== memberId), memberId]
        onFrontingChange(newFrontingOrder)
      } else {
        // Remove from fronting order
        const newFrontingOrder = frontingOrder.filter(id => id !== memberId)
        onFrontingChange(newFrontingOrder)
      }
      
      setIsAnimating(false)
      setTimeout(() => setShowSparkles(false), 1000)
    }, 300)
  }, [frontingOrder, onFrontingChange])

  // Drag and drop handlers
  const handleDragStart = useCallback((memberId: string) => {
    setDraggedMember(memberId)
    secureLogger.debug('Drag started:', memberId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, position: number) => {
    e.preventDefault()
    setDragOverPosition(position)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverPosition(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetMemberId: string, targetPosition: number) => {
    e.preventDefault()
    setDragOverPosition(null)
    
    if (!draggedMember || draggedMember === targetMemberId) return

    const newMembersOrder = [...membersOrder]
    const draggedIndex = newMembersOrder.indexOf(draggedMember)
    const targetIndex = newMembersOrder.indexOf(targetMemberId)

    if (draggedIndex !== -1 && targetIndex !== -1) {
      // Remove from old position
      newMembersOrder.splice(draggedIndex, 1)
      
      // Insert at new position
      const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex
      newMembersOrder.splice(insertIndex, 0, draggedMember)
      
      onMembersOrderChange(newMembersOrder)
      secureLogger.debug('Reordered members:', newMembersOrder)
    }

    setDraggedMember(null)
  }, [draggedMember, membersOrder, onMembersOrderChange])

  // Shuffle fronting order
  const shuffleFronting = useCallback(() => {
    if (frontingOrder.length <= 1) return
    
    setIsAnimating(true)
    setShowSparkles(true)
    
    setTimeout(() => {
      const shuffled = [...frontingOrder].sort(() => Math.random() - 0.5)
      onFrontingChange(shuffled)
      setIsAnimating(false)
      setTimeout(() => setShowSparkles(false), 1000)
    }, 300)
  }, [frontingOrder, onFrontingChange])

  // Auto-arrange members
  const autoArrange = useCallback(() => {
    const sortedMembers = members
      .filter(m => !frontingOrder.includes(m.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(m => m.id)
    
    onMembersOrderChange(sortedMembers)
  }, [members, frontingOrder, onMembersOrderChange])

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">system members</h2>
          </div>
          {frontingMembers.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span>{frontingMembers.length} fronting</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {frontingOrder.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={shuffleFronting}
              disabled={isAnimating}
              className="gap-2"
            >
              <Shuffle className="w-4 h-4" />
              shuffle
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={autoArrange}
            className="gap-2"
          >
            arrange
          </Button>
        </div>
      </div>

      {/* Sparkle effect overlay */}
      {showSparkles && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random()}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Fronting section */}
      {frontingMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            currently fronting
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {frontingMembers.map((member, index) => (
              <div
                key={member.id}
                className={cn(
                  "relative transition-all duration-300",
                  isAnimating && "animate-pulse"
                )}
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                <EnhancedHeadmateCard
                  member={member}
                  collection={collection}
                  isSelected={true}
                  frontPosition={index + 1}
                  isFronting={true}
                  onFrontingChange={(isFronting) => handleFrontingToggle(member.id, isFronting)}
                  className="transform hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-fronting members section */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          all members
        </h3>
        
        <div 
          ref={containerRef}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
        >
          {nonFrontingMembers.map((member, index) => (
            <div
              key={member.id}
              className={cn(
                "relative transition-all duration-300",
                dragOverPosition === index && "scale-105",
                draggedMember === member.id && "opacity-50"
              )}
              draggable
              onDragStart={() => handleDragStart(member.id)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, member.id, index)}
            >
              {/* Drop indicator */}
              {dragOverPosition === index && (
                <div className="absolute inset-0 border-2 border-dashed border-primary rounded-lg z-10 pointer-events-none" />
              )}
              
              <EnhancedHeadmateCard
                member={member}
                collection={collection}
                isSelected={false}
                isFronting={false}
                onFrontingChange={(isFronting) => handleFrontingToggle(member.id, isFronting)}
                className="cursor-move hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {members.length === 0 && (
        <Card className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">no system members yet</h3>
          <p className="text-muted-foreground mb-4">
            add your first system member to get started with visual identity tracking
          </p>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            add member
          </Button>
        </Card>
      )}

      {/* Custom styles */}
      <style jsx>{`
        @keyframes sparkle {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            transform: translate(var(--tx, -50%), var(--ty, -50%)) scale(1);
            opacity: 1;
          }
          100% {
            transform: translate(var(--tx2, -50%), var(--ty2, -50%)) scale(0);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}