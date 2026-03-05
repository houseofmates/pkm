import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/api/nocobase-client';

// ─────────────────────────────────────────────
//  constants
// ─────────────────────────────────────────────

// options mirror the select choices defined in the journal collection on nocobase
// value strings are the raw option values; labels match the multi-select option
// labels exactly.  `img` is the path to a custom asset we will display for the
// button (replace the placeholder files with your own images later).
// note: order determines layout left→right; "amazing" moved last to
// appear on the rightmost side and get a larger hit area.
const MOODS = [
  { id: '5', label: 'great',    emoji: '😃', img: '/images/moods/5.png' },
  { id: '4', label: 'good',     emoji: '😊', img: '/images/moods/4.png' },
  { id: '2', label: 'fine',     emoji: '😐', img: '/images/moods/2.png' },
  { id: '1', label: 'bad',      emoji: '😞', img: '/images/moods/1.png' },
  { id: '0', label: 'terrible', emoji: '😡', img: '/images/moods/0.png' },
  { id: '6', label: 'amazing!', emoji: '😁', img: '/images/moods/amazing.png' },
];

const ACTIVITIES = [
  { id: 'sleep',      label: 'slept well',   emoji: '😴' },
  { id: 'exercise',   label: 'exercised',    emoji: '🏃' },
  { id: 'outside',    label: 'went outside', emoji: '☀️' },
  { id: 'ate_well',   label: 'ate well',     emoji: '🥗' },
  { id: 'social',     label: 'socialised',   emoji: '💬' },
  { id: 'creative',   label: 'created',      emoji: '🎨' },
  { id: 'reading',    label: 'reading',      emoji: '📚' },
  { id: 'gaming',     label: 'gaming',       emoji: '🎮' },
  { id: 'music',      label: 'music',        emoji: '🎵' },
  { id: 'anxious',    label: 'anxious',      emoji: '😰' },
  { id: 'dissociate', label: 'dissociating', emoji: '🌫️' },
  { id: 'switching',  label: 'switching',    emoji: '🔄' },
  { id: 'meds',       label: 'took meds',    emoji: '💊' },
  { id: 'therapy',    label: 'therapy',      emoji: '🛋️' },
  { id: 'productive', label: 'productive',   emoji: '⚡' },
  { id: 'tired',      label: 'tired',        emoji: '🫠' },
  { id: 'hydrated',   label: 'hydrated',     emoji: '💧' },
  { id: 'pain',       label: 'in pain',      emoji: '🩹' },
];

// ─────────────────────────────────────────────
//  styles
// ─────────────────────────────────────────────

// warm yellow
const Y = '#f5af12';
// powder blue
const B = '#3c9fdd';
export function JournalPage() {
  const [mood, setMood] = useState<string | null>(null);
  const [activities, setActivities] = useState<Set<string>>(new Set());

  // hover/active scale applied via class on mood buttons
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleActivity = (id: string) => {
    setActivities(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!mood && activities.size === 0 && !body.trim()) {
      toast.error('nothing to save yet');
      return;
    }

    setSaving(true);
    const payload = {
      mood: mood ?? undefined,
      activities: JSON.stringify(Array.from(activities)),
      body: body.trim(),
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD
    };

    try {
      await api.createRecord('journal', payload);
      toast.success('entry saved ✓');
      // reset
      setMood(null);
      setActivities(new Set());
      setBody('');
    } catch (err: any) {
      toast.error('failed to save: ' + (err?.message ?? 'unknown error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: '#050505', fontFamily: "'Varela Round', sans-serif" }}
    >
      {/* ── header ── */}
      <header className="flex items-center justify-between px-5 pt-6 pb-2 shrink-0">
        <h1
          className="text-xl font-bold lowercase tracking-tight"
          style={{ color: Y }}
        >
          journal
        </h1>
        <span className="text-xs lowercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toLowerCase()}
        </span>
      </header>

      {/* ── scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-32 space-y-6 pt-2">

        {/* ── mood row ── */}
        <section>
          <p className="text-[11px] uppercase tracking-widest mb-3 lowercase" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
            how are you feeling?
          </p>
          <div className="flex gap-10 justify-center">
            {MOODS.map(m => {
              const active = mood === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMood(active ? null : m.id)}
                  className="relative p-1 rounded-full transition-transform duration-150 select-none focus:outline-none hover:scale-110 active:scale-90"
                  style={{
                    transform: 'translateZ(0)',
                    // active outline
                    boxShadow: active ? `0 0 0 2px ${Y}` : 'none',
                  }}
                >
                  <img
                    src={m.img}
                    alt={m.emoji}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className={m.id === '6' ? "w-24 h-24 object-contain" : "w-20 h-20 object-contain"}
                    style={{
                      opacity: active ? 1 : 0.7,
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-3xl pointer-events-none">
                    {m.emoji}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── activities grid ── */}
        <section>
          <p className="text-[11px] uppercase tracking-widest mb-3 lowercase" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
            today i...
          </p>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map(a => {
              const active = activities.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleActivity(a.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm lowercase transition-all duration-150 select-none"
                  style={{
                    background: active ? `${B}22` : '#000000',
                    borderColor: active ? B : 'rgba(255,255,255,0.08)',
                    color: active ? B : 'rgba(255,255,255,0.55)',
                    boxShadow: active ? `0 0 0 1.5px ${B}` : 'none',
                  }}
                >
                  <span className="text-base leading-none">{a.emoji}</span>
                  {a.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── long-form textarea ── */}
        <section>
          <p className="text-[11px] uppercase tracking-widest mb-3 lowercase" style={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em' }}>
            notes
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: '#000000', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <textarea
              ref={textareaRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="write anything... no pressure."
              rows={10}
              className="w-full resize-none bg-transparent px-4 py-4 text-sm leading-relaxed lowercase outline-none focus:outline-none"
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontFamily: "'Varela Round', sans-serif",
                caretColor: Y,
              }}
            />
            <div
              className="px-4 pb-2 text-right text-[10px]"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              {body.length} chars
            </div>
          </div>
        </section>
      </div>

      {/* ── sticky save button ── */}
      <div
        className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 px-4 pb-6 pt-3"
        style={{ background: 'linear-gradient(to top, #050505 60%, transparent)' }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl text-base font-semibold lowercase transition-all duration-200 active:scale-[0.98]"
          style={{
            background: saving ? 'rgba(245,175,18,0.3)' : Y,
            color: '#050505',
            fontFamily: "'Varela Round', sans-serif",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'saving...' : 'log entry'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
//  types (exported for backend use)
// ─────────────────────────────────────────────

export interface JournalEntry {
  mood: string | null;
  activities: string[];
  body: string;
  timestamp: string; // ISO 8601
  date: string;       // YYYY-MM-DD
}
