/**
 * enhanced headmate card component with magical interactions
 * provides smooth animations, particle effects, and delightful visual feedback
 * designed to make the visual identity tracking feature feel magical
 */

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import React, { forwardRef, useMemo, useState, useEffect, useRef } from 'react'
import { getStringColor } from '@/utils/color-generator'
import { PLACEHOLDER_IMAGE } from '@/lib/discord-utils'
import { secureLogger } from '@/lib/secure-logger'
import { SmartField } from "@/components/fields/smart-field"
import { ContactProfileView } from './ContactProfileView'

interface HeadmateCardProps {
  member: any
  collection: any
  onClick?: () => void
  className?: string
  selected?: boolean
  isSelected?: boolean
  frontPosition?: number | null
  isFronting?: boolean
  onFrontingChange?: (isFronting: boolean) => void
}

export type { HeadmateCardProps }

export const EnhancedHeadmateCard = React.memo(forwardRef<HTMLDivElement, HeadmateCardProps & React.HTMLAttributes<HTMLDivElement>>(({
  member,
  collection,
  onClick,
  className,
  isSelected,
  frontPosition,
  isFronting = false,
  onFrontingChange,
  ...props
}, ref) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [pulseIntensity, setPulseIntensity] = useState(0)
  const [sparkles, setSparkles] = useState<Array<{ id: number, x: number, y: number }>>([])
  const cardRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()

  // Auto-generate sparkles for fronting members with enhanced patterns
  useEffect(() => {
    if (isFronting) {
      const interval = setInterval(() => {
        if (cardRef.current && Math.random() > 0.6) {
          const rect = cardRef.current.getBoundingClientRect()
          const angle = Math.random() * Math.PI * 2
          const distance = Math.random() * rect.width * 0.4
          const newSparkle = {
            id: Date.now() + Math.random(),
            x: rect.width / 2 + Math.cos(angle) * distance,
            y: rect.height / 2 + Math.sin(angle) * distance
          }
          setSparkles(prev => [...prev.slice(-12), newSparkle])

          // Remove sparkle after animation with fade out
          setTimeout(() => {
            setSparkles(prev => prev.filter(s => s.id !== newSparkle.id))
          }, 2500)
        }
      }, 600)

      return () => clearInterval(interval)
    }
  }, [isFronting])

  // Pulse animation for fronting members
  useEffect(() => {
    if (isFronting) {
      let intensity = 0
      const animate = () => {
        intensity = (intensity + 0.05) % (Math.PI * 2)
        setPulseIntensity(Math.sin(intensity) * 0.5 + 0.5)
        animationRef.current = requestAnimationFrame(animate)
      }
      animationRef.current = requestAnimationFrame(animate)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    } else {
      setPulseIntensity(0)
    }
  }, [isFronting])

  const handleCardClick = (e: React.MouseEvent) => {
    secureLogger.debug('CLICK REGISTERED:', member.name, member.id)

    // Toggle fronting state with delightful feedback
    if (onFrontingChange) {
      onFrontingChange(!isFronting)

      // Create burst of sparkles on fronting change
      if (!isFronting && cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        const burst = Array.from({ length: 8 }, (_, i) => ({
          id: Date.now() + i,
          x: rect.width / 2,
          y: rect.height / 2
        }))
        setSparkles(prev => [...prev, ...burst])

        // Clear burst after animation
        setTimeout(() => {
          setSparkles(prev => prev.filter(s => !burst.some(b => b.id === s.id)))
        }, 1500)
      }
    }

    if (onClick) {
      onClick()
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProfileOpen(true)
  }

  const handleMouseEnter = () => setIsHovered(true)
  const handleMouseLeave = () => setIsHovered(false)

  const titleField = collection?.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'name' }
  const pronounsField = collection?.fields?.find((f: any) => f.name === 'pronouns') || { name: 'pronouns' }
  const avatarField = collection?.fields?.find((f: any) => f.name === 'avatar' || f.interface === 'attachment') || { name: 'avatar' }
  const colorField = collection?.fields?.find((f: any) => f.name === 'color') || { name: 'color' }
  const textColorField = collection?.fields?.find((f: any) => f.name === 'textColor') || { name: 'textColor' }

  let rawName = member[titleField.name]
  const isId = (val: any) => {
    const s = String(val)
    if (!s) return true
    if (/^\d+$/.test(s)) return true
    if (s.length > 15 && /^[a-zA-Z0-9_\-]+$/.test(s)) return true
    if (s.startsWith('member_') || s.startsWith('pk_')) return true
    return false
  }

  if (!rawName || isId(rawName)) {
    rawName = member.name || member.content?.name || rawName || "Unknown"
  }

  const displayTextColor = member[textColorField.name] || member[colorField.name] || getStringColor(rawName)
  const borderColor = member[colorField.name] || getStringColor(rawName)

  const finalImageSrc = useMemo(() => {
    const raw = member[avatarField.name]
    if (!raw) return PLACEHOLDER_IMAGE || null
    if (typeof raw === 'string' && (raw.startsWith('data:') || raw.startsWith('http'))) return raw
    if (Array.isArray(raw) && raw.length > 0) return raw[0].url
    if (raw.url) return raw.url
    return raw
  }, [member, avatarField])

  const cardStyle = useMemo(() => {
    const baseScale = isSelected ? 1.08 : 1
    const hoverScale = isHovered ? 1.02 : 1
    const frontingScale = isFronting ? 1.05 : 1
    const scale = baseScale * hoverScale * frontingScale

    const glowIntensity = isFronting ? pulseIntensity * 20 : 0
    const glowColor = isFronting ? borderColor : 'transparent'

    return {
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      border: `4px solid ${isSelected ? borderColor : borderColor + '80'}`,
      borderRadius: "12px",
      boxShadow: isSelected
        ? `0 8px 32px ${borderColor}66, 0 4px 16px rgba(0,0,0,0.5), 0 0 ${glowIntensity}px ${glowColor}`
        : `0 2px 8px rgba(0,0,0,0.3), 0 0 ${glowIntensity}px ${glowColor}`,
      transform: `scale(${scale}) ${isFronting ? `translateY(${pulseIntensity * 2}px)` : ''}`,
      filter: `brightness(${isSelected ? 1.12 : 1}) ${isFronting ? `saturate(${1 + pulseIntensity * 0.3})` : ''}`,
      cursor: "pointer",
      position: 'relative' as const
    }
  }, [isSelected, borderColor, isHovered, isFronting, pulseIntensity])

  return (
    <div
      ref={ref}
      className={cn("group flex flex-col gap-2 cursor-pointer", className)}
      onClick={handleCardClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <Card
        ref={cardRef}
        style={cardStyle}
        className={cn(
          "aspect-square relative overflow-hidden w-full shadow-none",
          isSelected && "ring-2 ring-white/50",
          isFronting && "animate-pulse"
        )}
      >
        {/* Sparkle effects */}
        {sparkles.map(sparkle => (
          <div
            key={sparkle.id}
            className="absolute pointer-events-none"
            style={{
              left: sparkle.x,
              top: sparkle.y,
              animation: 'sparkle 2s ease-out forwards'
            }}
          >
            <div className="w-2 h-2 bg-white rounded-full shadow-lg shadow-white/50" />
          </div>
        ))}

        {/* Background image with enhanced effects */}
        <div className="absolute inset-0 bg-muted/30">
          {finalImageSrc ? (
            <>
              <img
                src={finalImageSrc}
                alt={rawName}
                className={cn(
                  "h-full w-full object-cover transition-all duration-700",
                  "group-hover:scale-110",
                  isFronting && "animate-pulse"
                )}
                loading="lazy"
              />
              {/* Overlay gradient for better text readability */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(to bottom, 
                    transparent 0%, 
                    transparent 60%, 
                    rgba(0,0,0,0.3) 80%, 
                    rgba(0,0,0,0.7) 100%)`
                }}
              />
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-6xl opacity-20 select-none bg-muted">
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ backgroundColor: borderColor + '20' }}
              >
                {rawName.charAt(0)}
              </div>
            </div>
          )}
        </div>

        {/* Fronting indicator ring */}
        {isFronting && (
          <div
            className="absolute inset-0 pointer-events-none rounded-xl"
            style={{
              border: `3px solid ${borderColor}`,
              opacity: 0.3 + pulseIntensity * 0.4,
              animation: 'frontingRing 2s ease-in-out infinite'
            }}
          />
        )}

        {/* Front position badge with enhanced styling */}
        {frontPosition && (
          <div
            className="absolute top-2 right-2 z-20 flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-full font-black text-lg backdrop-blur-sm"
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              color: 'rgba(0,0,0,0.8)',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.5)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transform: `scale(${1 + pulseIntensity * 0.1})`
            }}
          >
            {frontPosition}
          </div>
        )}

        {/* Name with enhanced typography and effects */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end text-center pb-2 z-10">
          <div
            className={cn(
              "font-black text-2xl tracking-[0.5px] transition-all duration-300",
              "group-hover:-translate-y-1 w-full drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]",
              isFronting && "animate-pulse"
            )}
            style={{
              color: displayTextColor,
              WebkitTextStroke: '3px black',
              paintOrder: 'stroke fill',
              fontWeight: 900,
              textShadow: isFronting
                ? `0 0 ${10 + pulseIntensity * 5}px ${borderColor}40`
                : '0 3px 3px rgba(0,0,0,0.6)'
            }}
          >
            <SmartField
              value={rawName}
              field={titleField}
              record={member}
              collectionName={collection?.name ?? 'headmates'}
              onChange={() => { }}
            />
          </div>
        </div>

        {/* Status indicator for fronting */}
        {isFronting && (
          <div className="absolute top-2 left-2 z-20">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{
                backgroundColor: borderColor,
                boxShadow: `0 0 ${10 + pulseIntensity * 5}px ${borderColor}`
              }}
            />
          </div>
        )}
      </Card>

      {/* Pronouns with enhanced styling */}
      {member[pronounsField.name] && (
        <div className={cn(
          "text-[10px] text-[#252525] font-bold text-center lowercase tracking-wide transition-all duration-300",
          isFronting && "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
        )}>
          <SmartField
            value={member[pronounsField.name]}
            field={pronounsField}
            record={member}
            collectionName={collection?.name ?? 'headmates'}
            onChange={() => { }}
          />
        </div>
      )}

      <ContactProfileView
        member={member}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

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

        @keyframes frontingRing {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.6;
          }
        }

        ${sparkles.map((sparkle, i) => `
          div:nth-child(${i + 1}) {
            --tx: ${(Math.random() - 0.5) * 40}px;
            --ty: ${(Math.random() - 0.5) * 40}px;
            --tx2: ${(Math.random() - 0.5) * 60}px;
            --ty2: ${(Math.random() - 0.5) * 60}px;
          }
        `).join('')}
      `}</style>
    </div>
  )
}))

EnhancedHeadmateCard.displayName = "EnhancedHeadmateCard"