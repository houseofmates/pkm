import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity, Battery, Brain, Zap } from 'lucide-react';

interface BiometricTrackerProps {
  data: {
    energy?: number;
    friction?: number;
    focus?: number;
  };
  onUpdate?: (patch: Partial<{ energy: number; friction: number; focus: number }>) => void;
}

export function BiometricTracker({ data, onUpdate }: BiometricTrackerProps) {
  const [energy, setEnergy] = useState(data.energy ?? 50);
  const [friction, setFriction] = useState(data.friction ?? 50);
  const [focus, setFocus] = useState(data.focus ?? 50);

  useEffect(() => {
    // keep state in sync if widget data is updated externally
    if (typeof data.energy === 'number') setEnergy(data.energy);
    if (typeof data.friction === 'number') setFriction(data.friction);
    if (typeof data.focus === 'number') setFocus(data.focus);
  }, [data.energy, data.friction, data.focus]);

  const update = (patch: Partial<{ energy: number; friction: number; focus: number }>) => {
    onUpdate?.(patch);
  };

  const sliderBackground = (value: number, color: string) => ({
    background: `linear-gradient(90deg, ${color} ${value}%, rgba(255,255,255,0.12) ${value}%)`
  });

  return (
    <div className="p-4 bg-black/40 border border-primary/20 rounded-xl space-y-4 backdrop-blur-md w-full max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="text-primary w-4 h-4" />
        <span className="text-xs font-bold text-primary tracking-widest lowercase">biometric status</span>
      </div>

      <div className="space-y-3">
        {/* Energy */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] lowercase text-muted-foreground">
            <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> energy</span>
            <span>{energy}%</span>
          </div>
          <Slider
            value={[energy]}
            max={100}
            step={1}
            onValueChange={(v) => {
              const next = v[0];
              setEnergy(next);
              update({ energy: next });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={sliderBackground(energy, '#22c55e')}
          />
        </div>

        {/* Sensory Friction */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] lowercase text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> friction</span>
            <span>{friction}%</span>
          </div>
          <Slider
            value={[friction]}
            max={100}
            step={1}
            onValueChange={(v) => {
              const next = v[0];
              setFriction(next);
              update({ friction: next });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={sliderBackground(friction, friction > 70 ? '#ef4444' : '#fbbf24')}
          />
        </div>

        {/* Focus */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] lowercase text-muted-foreground">
            <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> focus</span>
            <span>{focus}%</span>
          </div>
          <Slider
            value={[focus]}
            max={100}
            step={1}
            onValueChange={(v) => {
              const next = v[0];
              setFocus(next);
              update({ focus: next });
            }}
            onPointerDown={(e) => e.stopPropagation()}
            style={sliderBackground(focus, '#3b82f6')}
          />
        </div>
      </div>

      <Button className="w-full h-7 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 mt-2">
        Log Snapshot
      </Button>
    </div>
  );
}
