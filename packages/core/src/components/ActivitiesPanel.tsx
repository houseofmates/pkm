import React, { useState, useMemo } from 'react';
import { Check, Plus, X } from 'lucide-react';

export type Activity = {
  id: string;
  label: string;
  emoji: string;
  category: string;
  color: string;
};

const CATEGORY_OPTIONS = [
  'health', 'medication', 'productivity', 'wellness', 'social', 'creative', 'leisure',
];

const EMOJI_OPTIONS = [
  '💊', '🩹', '🚿', '🦷', '🧴', '💅', '🧻', '📝', '🧹', '🙏',
  '👕', '🚪', '🏠', '💬', '🍽️', '✏️', '💻', '🎨', '🎮', '🤖',
  '📺', '😴', '🛏️', '🏃', '🎵', '📚', '🧘', '🎯', '⭐', '❤️',
];

const COLOR_OPTIONS = [
  '#f5af12', '#3c9fdd', '#22c55e', '#ef4444', '#8b5cf6',
  '#ff00ff', '#800080', '#32cd32', '#ff4500', '#ffffff',
];

export function ActivitiesPanel({
  activities,
  history,
  markActivity,
  onCreateActivity,
}: {
  activities: Activity[];
  history: Record<string, string[]>;
  markActivity: (id: string) => void;
  onCreateActivity?: (activity: Activity) => void;
}) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [newCategory, setNewCategory] = useState('health');
  const [newColor, setNewColor] = useState('#f5af12');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(a => a.label.toLowerCase().includes(q));
  }, [activities, search]);

  const doneSet = useMemo(() => new Set(Object.keys(history)), [history]);
  const hasNoMatch = search.trim().length > 0 && filtered.length === 0;

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    const id = newLabel.trim().toLowerCase().replace(/\s+/g, '_');
    if (activities.some(a => a.id === id)) return;
    const activity: Activity = {
      id,
      label: newLabel.trim().toLowerCase(),
      emoji: newEmoji,
      category: newCategory,
      color: newColor,
    };
    onCreateActivity?.(activity);
    setNewLabel('');
    setNewEmoji('⭐');
    setNewCategory('health');
    setNewColor('#f5af12');
    setShowCreate(false);
    setSearch('');
  };

  const openCreateWithSearch = () => {
    setNewLabel(search.trim());
    setShowCreate(true);
  };

  if (showCreate) {
    return (
      <div className="p-4 text-left" data-testid="activities-panel">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-white/70 lowercase font-medium">create activity</p>
          <button onClick={() => setShowCreate(false)} className="p-1 rounded hover:bg-white/10 text-white/40"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-white/40 lowercase block mb-1">name</label>
            <input
              type="text"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="activity name"
              className="w-full px-3 py-2 rounded-lg bg-[#050505] border border-white/10 text-sm text-yellow-400 placeholder:text-white/20 focus:outline-none focus:border-yellow-500/40 lowercase"
            />
          </div>

          <div>
            <label className="text-[10px] text-white/40 lowercase block mb-1">icon</label>
            <div className="flex flex-wrap gap-1">
              {EMOJI_OPTIONS.map(em => (
                <button
                  key={em}
                  onClick={() => setNewEmoji(em)}
                  className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                    newEmoji === em ? 'bg-yellow-500/20 ring-1 ring-yellow-500/50' : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 lowercase block mb-1">category</label>
            <div className="flex flex-wrap gap-1">
              {CATEGORY_OPTIONS.map(cat => (
                <button
                  key={cat}
                  onClick={() => setNewCategory(cat)}
                  className={`px-2 py-1 rounded-full text-[10px] lowercase transition-all ${
                    newCategory === cat ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/40' : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 lowercase block mb-1">color</label>
            <div className="flex flex-wrap gap-1">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    newColor === c ? 'ring-2 ring-white/60 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
            <span style={{ color: newColor }}>{newEmoji}</span>
            <span className="text-sm text-white/70 lowercase">{newLabel || 'preview'}</span>
          </div>

          <button
            onClick={handleCreate}
            disabled={!newLabel.trim() || activities.some(a => a.id === newLabel.trim().toLowerCase().replace(/\s+/g, '_'))}
            className="w-full py-2 rounded-xl bg-yellow-500/20 text-yellow-400 font-medium lowercase text-sm hover:bg-yellow-500/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {activities.some(a => a.id === newLabel.trim().toLowerCase().replace(/\s+/g, '_')) ? 'activity already exists' : 'create activity'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 text-left">
      <div className="flex mb-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="search activities"
          className="flex-1 px-3 py-2 rounded-lg bg-[#050505] border border-white/10 text-sm text-yellow-400 placeholder:text-yellow-400/40 focus:outline-none focus:border-yellow-500/40 lowercase"
        />
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-auto">
        {filtered.map(act => {
          const isDone = doneSet.has(act.id);
          return (
            <div
              key={act.id}
              className="flex items-center justify-between p-2 rounded-lg border border-white/10 bg-white/[0.02]"
              data-testid={`activity-row-${act.id}`}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: act.color }}>{act.emoji}</span>
                <span className="text-sm text-white/80 lowercase">{act.label}</span>
              </div>
              <button
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium lowercase transition-all ${
                  isDone
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/30'
                }`}
                aria-label={`${isDone ? 'done' : 'mark'} ${act.label}`}
                data-testid={`activity-mark-${act.id}`}
                onClick={() => markActivity(act.id)}
              >
                <Check size={14} />
                {isDone ? 'done' : 'mark'}
              </button>
            </div>
          );
        })}
        {hasNoMatch && (
          <div className="text-center py-4">
            <p className="text-xs text-white/30 lowercase mb-2">no matching activities</p>
            <button
              onClick={openCreateWithSearch}
              className="flex items-center gap-1 mx-auto px-3 py-2 rounded-lg bg-yellow-500/20 text-yellow-400 text-xs lowercase hover:bg-yellow-500/30 transition-colors"
            >
              <Plus size={14} />
              create "{search.trim()}"
            </button>
          </div>
        )}
        {!hasNoMatch && filtered.length === 0 && (
          <div className="text-sm text-white/30 lowercase text-center py-4">no activities</div>
        )}
      </div>
    </div>
  );
}
