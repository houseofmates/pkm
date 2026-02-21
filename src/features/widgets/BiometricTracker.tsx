import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Activity, Battery, Brain, Zap } from 'lucide-react';

interface BiometricTrackerProps {
  data: {
    initialEnergy?: number;
    initialFriction?: number;
    initialFocus?: number;
  };
}

export function BiometricTracker({ data }: BiometricTrackerProps) {
  const [energy, setEnergy] = useState(data.initialEnergy || 50);
  const [friction, setFriction] = useState(data.initialFriction || 50);
  const [focus, setFocus] = useState(data.initialFocus || 50);

  return (
    <div className="p-4 bg-black/40 border border-primary/20 rounded-xl space-y-4 backdrop-blur-md w-full max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="text-primary w-4 h-4" />
        <span className="text-xs font-bold text-primary tracking-widest uppercase">Biometric Status</span>
      </div>

      <div className="space-y-3">
        {/* Energy */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
            <span className="flex items-center gap-1"><Battery className="w-3 h-3" /> Energy</span>
            <span>{energy}%</span>
          </div>
          <Slider
            value={[energy]}
            max={100}
            step={1}
            onValueChange={(v) => setEnergy(v[0])}
            className={cn("[&_.bg-primary]:bg-green-500", energy < 30 && "[&_.bg-primary]:bg-red-500")}
          />
        </div>

        {/* Sensory Friction */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
            <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Sensory Friction</span>
            <span>{friction}%</span>
          </div>
          <Slider
            value={[friction]}
            max={100}
            step={1}
            onValueChange={(v) => setFriction(v[0])}
            className={cn("[&_.bg-primary]:bg-yellow-500", friction > 70 && "[&_.bg-primary]:bg-red-500")}
          />
        </div>

        {/* Focus */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] uppercase text-muted-foreground">
            <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Focus</span>
            <span>{focus}%</span>
          </div>
          <Slider
            value={[focus]}
            max={100}
            step={1}
            onValueChange={(v) => setFocus(v[0])}
            className="[&_.bg-primary]:bg-blue-500"
          />
        </div>
      </div>

      <Button className="w-full h-7 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 mt-2">
        Log Snapshot
      </Button>
    </div>
  );
}
