import { useGamificationStore } from '@/store/useGamificationStore';
import { cn } from '@/lib/utils';
import { Heart, Zap, Sparkles, Droplets } from 'lucide-react';

interface PetStatusDisplayProps {
  className?: string;
  onInteract?: (type: 'feed' | 'play' | 'pet') => void;
}

interface PetStatBarProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

function PetStatBar({ label, value, color, icon }: PetStatBarProps) {
  const isLow = value < 30;
  const isMedium = value >= 30 && value < 60;
  
  return (
    <div className="flex items-center gap-2">
      <span className="text-white/40 w-4">{icon}</span>
      <span className="text-[10px] text-white/30 lowercase w-12">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isLow ? "bg-red-400" : isMedium ? "bg-yellow-400" : "bg-green-400"
          )}
          style={{ 
            width: `${value}%`,
            boxShadow: `0 0 8px ${color}40`
          }}
        />
      </div>
      <span className={cn(
        "text-[10px] tabular-nums w-6 text-right",
        isLow ? "text-red-400" : isMedium ? "text-yellow-400" : "text-white/50"
      )}>
        {Math.round(value)}
      </span>
    </div>
  );
}

export function PetStatusDisplay({ className, onInteract }: PetStatusDisplayProps) {
  const { pets, updatePet, updateQuestCell, saveToServer, addXp } = useGamificationStore();
  const pet = pets[0];
  
  if (!pet) return null;
  
  // Determine visual state
  const getPetMood = () => {
    const avgStat = (pet.hunger + pet.happiness + pet.energy + pet.cleanliness) / 4;
    if (avgStat >= 70) return { emoji: '😊', color: '#22c55e', state: 'active' };
    if (avgStat >= 40) return { emoji: '😐', color: '#eab308', state: 'neutral' };
    return { emoji: '😴', color: '#6b7280', state: 'sleeping' };
  };
  
  const mood = getPetMood();
  const isSleeping = mood.state === 'sleeping';
  
  const handleInteract = async (type: 'feed' | 'play' | 'pet') => {
    const now = new Date().toISOString();
    
    switch (type) {
      case 'feed':
        updatePet(pet.id, { 
          hunger: Math.min(100, pet.hunger + 25), 
          visualState: 'eating',
          lastInteraction: now
        });
        updateQuestCell('wilson', 'feed', true);
        break;
      case 'play':
        updatePet(pet.id, { 
          happiness: Math.min(100, pet.happiness + 20), 
          energy: Math.max(0, pet.energy - 15),
          visualState: 'idle-happy',
          lastInteraction: now
        });
        updateQuestCell('wilson', 'play', true);
        break;
      case 'pet':
        updatePet(pet.id, { 
          happiness: Math.min(100, pet.happiness + 15),
          visualState: 'being-pet',
          lastInteraction: now
        });
        updateQuestCell('wilson', 'pet', true);
        break;
    }
    
    await saveToServer();
    onInteract?.(type);
    
    // Return to idle after interaction
    setTimeout(() => {
      updatePet(pet.id, { visualState: isSleeping ? 'sleeping' : 'idle-happy' });
    }, 3000);
  };
  
  return (
    <div className={cn("p-4 rounded-xl bg-black/60 backdrop-blur-sm border border-white/10", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{mood.emoji}</span>
        <div>
          <span className="text-sm font-medium text-white/80 lowercase">{pet.name}</span>
          <span className={cn(
            "text-[10px] lowercase ml-2 px-1.5 py-0.5 rounded",
            isSleeping ? "bg-gray-500/20 text-gray-400" : "bg-green-500/20 text-green-400"
          )}>
            {isSleeping ? 'sleeping' : 'active'}
          </span>
        </div>
      </div>
      
      {/* Pet Avatar */}
      <div className="flex gap-4 mb-4">
        <div 
          className={cn(
            "w-20 h-20 rounded-2xl flex items-center justify-center text-4xl border-2 transition-all duration-500",
            isSleeping 
              ? "bg-gray-900/50 border-gray-700 grayscale" 
              : "bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-400/30"
          )}
        >
          {pet.emoji}
        </div>
        
        {/* Stats */}
        <div className="flex-1 space-y-1.5">
          <PetStatBar 
            label="hunger" 
            value={pet.hunger} 
            color="#22c55e" 
            icon={<Heart className="w-3 h-3" />} 
          />
          <PetStatBar 
            label="happy" 
            value={pet.happiness} 
            color="#ec4899" 
            icon={<Sparkles className="w-3 h-3" />} 
          />
          <PetStatBar 
            label="energy" 
            value={pet.energy} 
            color="#f59e0b" 
            icon={<Zap className="w-3 h-3" />} 
          />
          <PetStatBar 
            label="clean" 
            value={pet.cleanliness} 
            color="#3b82f6" 
            icon={<Droplets className="w-3 h-3" />} 
          />
        </div>
      </div>
      
      {/* Interaction buttons */}
      {!isSleeping && (
        <div className="flex gap-2">
          <button
            onClick={() => handleInteract('feed')}
            className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 lowercase hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
          >
            🍖 feed
          </button>
          <button
            onClick={() => handleInteract('play')}
            className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 lowercase hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
          >
            🎾 play
          </button>
          <button
            onClick={() => handleInteract('pet')}
            className="flex-1 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 lowercase hover:bg-white/10 hover:text-white/80 transition-all active:scale-95"
          >
            🫳 pet
          </button>
        </div>
      )}
      
      {isSleeping && (
        <p className="text-center text-[10px] text-white/20 lowercase italic py-2">
          wilson is resting... complete quest rows to wake them up
        </p>
      )}
    </div>
  );
}
