import { useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface XPExplosionProps {
  trigger: boolean;
  onComplete?: () => void;
  className?: string;
  rowId?: string;
}

const ROW_COLORS: Record<string, string[]> = {
  journal: ['#8b5cf6', '#a78bfa', '#c4b5fd'], // violet
  body: ['#22c55e', '#34d399', '#6ee7b7'], // emerald
  mind: ['#3b82f6', '#60a5fa', '#93c5fd'], // blue
  self: ['#f59e0b', '#fbbf24', '#fcd34d'], // amber
};

export function XPExplosion({ trigger, onComplete, className, rowId = 'journal' }: XPExplosionProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isExploding, setIsExploding] = useState(false);
  
  const colors = ROW_COLORS[rowId] || ROW_COLORS.journal;
  
  const createExplosion = useCallback(() => {
    const newParticles: Particle[] = [];
    const particleCount = 30;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const velocity = 2 + Math.random() * 4;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      newParticles.push({
        id: Date.now() + i,
        x: 50,
        y: 50,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        size: 4 + Math.random() * 6,
        life: 1,
        maxLife: 60 + Math.random() * 30,
      });
    }
    
    setParticles(newParticles);
    setIsExploding(true);
    
    // Auto-cleanup after animation
    setTimeout(() => {
      setIsExploding(false);
      setParticles([]);
      onComplete?.();
    }, 1500);
  }, [colors, onComplete]);
  
  useEffect(() => {
    if (trigger && !isExploding) {
      createExplosion();
    }
  }, [trigger, createExplosion, isExploding]);
  
  // Animation loop
  useEffect(() => {
    if (!isExploding || particles.length === 0) return;
    
    let animationId: number;
    
    const animate = () => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // gravity
          vx: p.vx * 0.98, // air resistance
          life: p.life - 1,
        })).filter(p => p.life > 0)
      );
      
      if (particles.some(p => p.life > 0)) {
        animationId = requestAnimationFrame(animate);
      }
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationId);
  }, [isExploding, particles.length]);
  
  if (!isExploding || particles.length === 0) return null;
  
  return (
    <div className={cn("absolute inset-0 pointer-events-none overflow-hidden z-50", className)}>
      {/* Center flash */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full animate-ping opacity-30"
        style={{ background: `radial-gradient(circle, ${colors[0]} 0%, transparent 70%)` }}
      />
      
      {/* Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            opacity: p.life / p.maxLife,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      
      {/* XP text */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-white animate-bounce"
        style={{ textShadow: `0 0 20px ${colors[0]}` }}
      >
        +25 XP
      </div>
    </div>
  );
}

// Hook to trigger explosions
export function useXPExplosion() {
  const [explosions, setExplosions] = useState<Record<string, boolean>>({});
  
  const triggerExplosion = useCallback((rowId: string) => {
    setExplosions(prev => ({ ...prev, [rowId]: true }));
    
    // Auto-reset after animation
    setTimeout(() => {
      setExplosions(prev => ({ ...prev, [rowId]: false }));
    }, 2000);
  }, []);
  
  const isExploding = useCallback((rowId: string) => {
    return explosions[rowId] || false;
  }, [explosions]);
  
  return { triggerExplosion, isExploding };
}
