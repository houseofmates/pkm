import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Scroll } from 'lucide-react';
import { useRecords } from '@/hooks/use-records';

export function NarrativeLog({ data, onUpdate }: { data: any; onUpdate?: (patch: any) => void }) {
  const [log, setLog] = useState(data?.content ?? '');
  const [isCinematic, setIsCinematic] = useState(false);
  const [saved, setSaved] = useState(false);
  const { createRecord } = useRecords('captures');

  useEffect(() => {
    if (typeof data?.content === 'string') setLog(data.content);
  }, [data?.content]);

  const handleSave = async () => {
    if (!log.trim()) return;
    try {
      await createRecord({
        content: log,
        source: 'canvas-widget',
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
      onUpdate?.({ content: log });
    } catch {
      // ignore
    }
  };

  if (saved) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black/40 backdrop-blur-md border-primary/30 p-4 text-primary">
        <div className="text-center">
          <p className="text-lg font-bold lowercase">quick entry saved</p>
          <p className="text-sm opacity-60 lowercase">stored in captures</p>
          <Button
            variant="ghost"
            className="mt-4 lowercase text-xs"
            onClick={() => {
              setSaved(false);
              setLog('');
            }}
          >
            new entry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-4 bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden group">
      {/* Cinematic Background Effect */}
      {isCinematic && (
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-50 animate-pulse" />
      )}

      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2">
          <Scroll className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-primary tracking-widest lowercase">quick entry</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 rounded-full hover:bg-primary/20 hover:text-primary"
          onClick={() => setIsCinematic(!isCinematic)}
          title="toggle cinematic mode"
        >
          <Sparkles className="w-3 h-3" />
        </Button>
      </div>

      <Textarea
        value={log}
        onChange={(e) => setLog(e.target.value)}
        placeholder="write your quick entry..."
        className={`bg-black/30 border-white/10 text-sm focus:border-primary/50 min-h-[120px] resize-none transition-all duration-500 ${isCinematic ? 'font-mono text-primary/90 shadow-[0_0_15px_rgba(246,176,18,0.1)]' : 'text-muted-foreground'}`}
        style={{ fontFamily: isCinematic ? '"Fira Code", monospace' : 'inherit' }}
      />

      <div className="mt-2 flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!log.trim()}
          className="h-7 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 lowercase"
        >
          record entry
        </Button>
      </div>
    </div>
  );
}
