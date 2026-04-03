import { useState, useEffect, useCallback } from 'react';
import { Anchor, Plus, Send, History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRecords } from '@/hooks/use-records';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { dataService } from '@/services/data.service';

interface DailyReflectionProps {
  data?: {
    collectionName?: string;
    mode?: 'input' | 'display';
    limit?: number;
  };
  onUpdate?: (patch: Record<string, unknown>) => void;
}

const THEME_COLOR = '#f6b012';
const SECONDARY_COLOR = '#3c9fdd';

interface DailyAnchor {
  id: string;
  content: string;
  date: string;
  timestamp: string;
}

export function DailyReflection({ data, onUpdate }: DailyReflectionProps) {
  const collectionName = data?.collectionName || 'daily_anchors';
  const mode = data?.mode || 'input';
  const displayLimit = data?.limit || 5;
  
  const { records, createRecord, refresh } = useRecords(collectionName);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [anchors, setAnchors] = useState<DailyAnchor[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // process records into anchors
  useEffect(() => {
    if (records) {
      const processed = records
        .map((r: any) => ({
          id: r.id,
          content: r.content || r.sentence || r.text || '',
          date: (r.date || r.timestamp || r.created_at || '').split('T')[0],
          timestamp: r.timestamp || r.created_at || '',
        }))
        .filter((a: DailyAnchor) => a.content)
        .sort((a: DailyAnchor, b: DailyAnchor) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      setAnchors(processed);
    }
  }, [records]);

  // check if already submitted today
  const hasTodayAnchor = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    return anchors.some(a => a.date === today);
  }, [anchors]);

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString();
      const payload = {
        content: inputValue.trim(),
        date: today.split('T')[0],
        timestamp: today,
      };

      await createRecord(payload);

      // emit sync event
      dataService.emitDataUpdate('daily_anchor_created', {
        content: inputValue.trim(),
        date: today.split('T')[0],
      });

      toast.success('anchor saved', {
        icon: <Anchor className="w-4 h-4" style={{ color: THEME_COLOR }} />,
      });

      setInputValue('');
      refresh();
    } catch (e) {
      toast.error('failed to save anchor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
      return 'today';
    }
    if (date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
      return 'yesterday';
    }

    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }).toLowerCase();
  };

  // input mode - simple one-sentence entry
  if (mode === 'input') {
    const todayComplete = hasTodayAnchor();

    return (
      <div 
        className="w-full h-full rounded-xl overflow-hidden flex flex-col p-3"
        style={{ 
          background: '#050505',
          border: `1px solid ${THEME_COLOR}20`,
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Anchor className="w-4 h-4" style={{ color: THEME_COLOR }} />
            <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
              daily anchor
            </span>
          </div>
          {todayComplete && (
            <span className="text-[10px] lowercase px-2 py-0.5 rounded" style={{ 
              background: '#22c55e20',
              color: '#22c55e'
            }}>
              done
            </span>
          )}
        </div>

        {/* input area */}
        {!todayComplete ? (
          <div className="flex-1 flex flex-col">
            <p className="text-[11px] lowercase text-white/50 mb-2">
              one thing that happened today:
            </p>
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="type a single sentence..."
              maxLength={200}
              className="flex-1 w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs lowercase resize-none focus:outline-none focus:border-[#f6b012]50"
              style={{ minHeight: '60px' }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[9px] lowercase text-white/30">
                {inputValue.length}/200
              </span>
              <Button
                size="xs"
                onClick={handleSubmit}
                disabled={isSubmitting || !inputValue.trim()}
                className="h-7 px-2 text-[11px] lowercase"
                style={{
                  background: THEME_COLOR,
                  color: '#000000',
                  opacity: inputValue.trim() ? 1 : 0.5,
                }}
              >
                {isSubmitting ? 'saving...' : (
                  <>
                    <Send className="w-3 h-3 mr-1" />
                    save
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Anchor className="w-8 h-8 mb-2" style={{ color: '#22c55e' }} />
            <p className="text-[11px] lowercase text-white/50">
              anchor recorded for today
            </p>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setShowHistory(!showHistory)}
              className="mt-2 text-[10px] lowercase"
            >
              <History className="w-3 h-3 mr-1" />
              {showHistory ? 'hide history' : 'view history'}
            </Button>
          </div>
        )}

        {/* history view */}
        {showHistory && (
          <div className="mt-3 pt-2 border-t border-white/10 space-y-2 max-h-[150px] overflow-auto">
            {anchors.slice(0, displayLimit).map((anchor) => (
              <div 
                key={anchor.id}
                className="p-2 rounded"
                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
              >
                <p className="text-[11px] lowercase" style={{ color: '#ffffff' }}>
                  "{anchor.content}"
                </p>
                <span className="text-[9px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                  {formatDate(anchor.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // display mode - scrolling list of previous anchors
  return (
    <div 
      className="w-full h-full rounded-xl overflow-hidden flex flex-col p-3"
      style={{ 
        background: '#050505',
        border: `1px solid ${SECONDARY_COLOR}20`,
      }}
    >
      {/* header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4" style={{ color: SECONDARY_COLOR }} />
          <span className="text-xs font-medium lowercase" style={{ color: THEME_COLOR }}>
            recent anchors
          </span>
        </div>
        <span className="text-[10px] lowercase text-white/40">
          last {displayLimit} days
        </span>
      </div>

      {/* scrolling list */}
      <div className="flex-1 overflow-auto space-y-2">
        {anchors.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-[11px] lowercase text-white/30">
              no anchors yet
            </p>
          </div>
        ) : (
          anchors.slice(0, displayLimit).map((anchor) => (
            <div 
              key={anchor.id}
              className="p-2 rounded border-l-2"
              style={{ 
                background: 'rgba(255, 255, 255, 0.03)',
                borderLeftColor: THEME_COLOR,
              }}
            >
              <p className="text-[11px] lowercase" style={{ color: '#ffffff' }}>
                {anchor.content}
              </p>
              <span className="text-[9px] lowercase" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>
                {formatDate(anchor.date)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* add button */}
      <Button
        size="xs"
        variant="ghost"
        onClick={() => onUpdate?.({ mode: 'input' })}
        className="mt-2 text-[11px] lowercase border border-dashed border-white/20"
      >
        <Plus className="w-3 h-3 mr-1" />
        add anchor
      </Button>
    </div>
  );
}
