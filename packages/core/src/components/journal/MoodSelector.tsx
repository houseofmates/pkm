import { cn } from '@/lib/utils';



const MOODS = [

  { id: '0', label: 'terrible', emoji: '😡', color: '#ef4444', value: 1 },

  { id: '1', label: 'bad',      emoji: '😞', color: '#f97316', value: 2 },

  { id: '2', label: 'fine',     emoji: '😐', color: '#eab308', value: 3 },

  { id: '4', label: 'good',     emoji: '😊', color: '#22c55e', value: 4 },

  { id: '5', label: 'great',    emoji: '😃', color: '#06b6d4', value: 5 },

  { id: '6', label: 'amazing!', emoji: '😁', color: '#8b5cf6', value: 6 },

];



interface MoodSelectorProps {

  mood: string | null;

  onMoodChange: (moodId: string | null) => void;

  className?: string;

}



export function MoodSelector({ mood, onMoodChange, className }: MoodSelectorProps) {

  const renderMoodButton = (m: typeof MOODS[0]) => {

    const active = mood === m.id;

    const size = 'w-16 h-16';

    return (

      <button

        key={m.id}

        onClick={() => onMoodChange(active ? null : m.id)}

        className={cn(

          size,

          'journal-mood-btn rounded-full transition-all duration-150 flex items-center justify-center',

          'hover:scale-110 hover:-translate-y-1 active:scale-105 active:translate-y-0',

          'focus:outline-none ring-0 focus:ring-0 focus:ring-offset-0'

        )}

        style={{

          color: m.color,

          background: active ? `${m.color}33` : '#000000',

          border: `2px solid ${m.color}`,

        }}

        aria-label={`select mood: ${m.label}`}

        aria-pressed={active}

      >

        <img src={`/images/moods/${m.label.toLowerCase()}.svg`} alt={m.label} className="h-8 w-8" />

      </button>

    );

  };



  return (

    <div className={cn('p-4 rounded-xl border border-white/10 bg-white/[0.02]', className)}>

      <p className="text-xs text-white/40 mb-3 lowercase">how are you feeling?</p>

      <div className="flex gap-3 justify-center">

        {MOODS.map(m => renderMoodButton(m))}

      </div>

      {mood && (

        <p className="text-center text-xs text-white/40 mt-3 lowercase">

          feeling {MOODS.find(m => m.id === mood)?.label}

        </p>

      )}

    </div>

  );

}



export { MOODS };

export type { MoodSelectorProps };
