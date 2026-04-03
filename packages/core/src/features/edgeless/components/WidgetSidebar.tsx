import React, { useCallback } from 'react';
import { Flame, Smile, Heart, Target, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WidgetType = 'streak' | 'mood' | 'pet' | 'quest' | 'voice';

export interface WidgetTemplate {
  id: WidgetType;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  color: string;
}

export const WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'streak',
    name: 'streak tracker',
    icon: <Flame className="w-5 h-5" />,
    description: 'flame badge + streak/xp/row%',
    defaultWidth: 200,
    defaultHeight: 120,
    color: '#f59e0b',
  },
  {
    id: 'mood',
    name: 'mood ring',
    icon: <Smile className="w-5 h-5" />,
    description: 'emoji picker → journal quick',
    defaultWidth: 180,
    defaultHeight: 180,
    color: '#8b5cf6',
  },
  {
    id: 'pet',
    name: 'wilson status',
    icon: <Heart className="w-5 h-5" />,
    description: 'pet hunger/happiness/energy bars',
    defaultWidth: 220,
    defaultHeight: 160,
    color: '#ec4899',
  },
  {
    id: 'quest',
    name: 'quest rows',
    icon: <Target className="w-5 h-5" />,
    description: '4 row progress glow',
    defaultWidth: 240,
    defaultHeight: 200,
    color: '#3b82f6',
  },
  {
    id: 'voice',
    name: 'quick voice',
    icon: <Mic className="w-5 h-5" />,
    description: 'mic → journal entry',
    defaultWidth: 80,
    defaultHeight: 80,
    color: '#10b981',
  },
];

interface WidgetSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onDragStart: (widget: WidgetTemplate) => void;
}

export function WidgetSidebar({ isOpen, onClose, onDragStart }: WidgetSidebarProps) {
  const handleDragStart = useCallback((e: React.DragEvent, widget: WidgetTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(widget));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(widget);
  }, [onDragStart]);

  return (
    <div
      className={cn(
        'fixed top-16 right-0 z-[90] w-64 bg-black/90 border-l border-white/10 backdrop-blur-md transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80 lowercase">gamification widgets</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        <p className="text-xs text-white/40 lowercase mb-4">
          drag widgets to canvas
        </p>

        {WIDGET_TEMPLATES.map((widget) => (
          <div
            key={widget.id}
            draggable
            onDragStart={(e) => handleDragStart(e, widget)}
            className="group flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-grab active:cursor-grabbing hover:bg-white/10 hover:border-white/20 transition-all"
            style={{ borderLeftColor: widget.color, borderLeftWidth: '3px' }}
          >
            <div
              className="p-2 rounded-md"
              style={{ backgroundColor: `${widget.color}20`, color: widget.color }}
            >
              {widget.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/80 lowercase truncate">{widget.name}</p>
              <p className="text-xs text-white/40 lowercase truncate">{widget.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 lowercase text-center">
          widgets sync with journal data
        </p>
      </div>
    </div>
  );
}

// Hook for drag-drop handling on canvas
export function useWidgetDrop(onDrop: (widget: WidgetTemplate, x: number, y: number) => void) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const widget = JSON.parse(data) as WidgetTemplate;
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      onDrop(widget, x, y);
    } catch {
      // Not a widget drop, ignore
    }
  }, [onDrop]);

  return { handleDragOver, handleDrop };
}
