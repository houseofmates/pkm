import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Scroll } from 'lucide-react';

export function NarrativeLog({ data }: { data: any }) {
  const [log, setLog] = useState('');
  const [isCinematic, setIsCinematic] = useState(false);

  return (
    <div className="relative p-4 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden group">
      {/* Cinematic Background Effect */}
      {isCinematic && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50 animate-pulse" />
      )}

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Scroll className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Captain's Log</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 rounded-full hover:bg-primary/20 hover:text-primary"
          onClick={() => setIsCinematic(!isCinematic)}
          title="Toggle Cinematic Mode"
        >
          <Sparkles className="w-3 h-3" />
        </Button>
      </div>

      <Textarea
        value={log}
        onChange={(e) => setLog(e.target.value)}
        placeholder="Log entry stardate..."
        className={`bg-black/30 border-white/10 text-sm focus:border-primary/50 min-h-[120px] resize-none transition-all duration-500 ${isCinematic ? 'font-mono text-primary/90 shadow-[0_0_15px_rgba(246,176,18,0.1)]' : 'text-muted-foreground'}`}
        style={{ fontFamily: isCinematic ? '"Fira Code", monospace' : 'inherit' }}
      />

      <div className="mt-2 flex justify-end">
        <Button size="sm" className="h-7 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
          Record Entry
        </Button>
      </div>
    </div>
  );
}
