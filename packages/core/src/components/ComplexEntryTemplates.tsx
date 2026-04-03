import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Plus, X, ChevronDown, ChevronUp, 
  Clock, Sun, Moon, Target, Heart,
  Zap, BookOpen, Activity, TrendingUp,
  CheckCircle2, Circle, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface TemplateWidget {
  id: string;
  type: 'mood-tracker' | 'energy-slider' | 'checklist' | 'gratitude-input' | 'goal-tracker' | 'time-tracker' | 'note-block' | 'habit-grid' | 'reflection-prompt' | 'data-embed';
  label: string;
  data?: any;
}

export interface TemplateSection {
  id: string;
  title: string;
  icon?: React.ReactNode;
  widgets: TemplateWidget[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface EntryTemplate {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sections: TemplateSection[];
  defaultMood?: string;
  autoTags?: string[];
}

export interface TemplateData {
  templateId: string;
  timestamp: string;
  sectionData: Record<string, any>;
  widgetData: Record<string, any>;
}

// ============================================================================
// Pre-built Complex Templates
// ============================================================================

export const COMPLEX_TEMPLATES: EntryTemplate[] = [
  {
    id: 'morning-pages',
    name: 'morning pages',
    emoji: '🌅',
    description: 'comprehensive morning routine tracker with energy, goals, and mindset',
    autoTags: ['morning', 'routine'],
    sections: [
      {
        id: 'wake-up',
        title: 'wake up & energy',
        icon: <Sun className="w-4 h-4" />,
        collapsible: true,
        defaultExpanded: true,
        widgets: [
          { id: 'wake-time', type: 'time-tracker', label: 'what time did you wake up?' },
          { id: 'sleep-quality', type: 'energy-slider', label: 'sleep quality (1-10)' },
          { id: 'morning-mood', type: 'mood-tracker', label: 'morning mood check' },
          { id: 'energy-level', type: 'energy-slider', label: 'current energy level' },
        ]
      },
      {
        id: 'gratitude',
        title: 'gratitude & intentions',
        icon: <Heart className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'gratitude-1', type: 'gratitude-input', label: '3 things you\'re grateful for' },
          { id: 'intention', type: 'note-block', label: 'today\'s main intention' },
        ]
      },
      {
        id: 'goals',
        title: 'top 3 goals',
        icon: <Target className="w-4 h-4" />,
        collapsible: true,
        defaultExpanded: true,
        widgets: [
          { id: 'goal-1', type: 'goal-tracker', label: 'goal #1 (most important)' },
          { id: 'goal-2', type: 'goal-tracker', label: 'goal #2' },
          { id: 'goal-3', type: 'goal-tracker', label: 'goal #3' },
        ]
      },
      {
        id: 'habits',
        title: 'morning habits',
        icon: <CheckCircle2 className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'habit-check', type: 'habit-grid', label: 'morning rituals', data: {
            habits: ['hydrate', 'meditate', 'exercise', 'shower', 'healthy breakfast', 'read', 'plan']
          }},
        ]
      },
    ]
  },
  {
    id: 'evening-review',
    name: 'evening review',
    emoji: '🌙',
    description: 'reflect on your day with comprehensive tracking and insights',
    autoTags: ['evening', 'review', 'reflection'],
    sections: [
      {
        id: 'day-summary',
        title: 'day summary',
        icon: <Clock className="w-4 h-4" />,
        collapsible: true,
        defaultExpanded: true,
        widgets: [
          { id: 'end-time', type: 'time-tracker', label: 'what time are you winding down?' },
          { id: 'day-rating', type: 'energy-slider', label: 'rate your day (1-10)' },
          { id: 'evening-mood', type: 'mood-tracker', label: 'evening mood' },
        ]
      },
      {
        id: 'accomplishments',
        title: 'wins & accomplishments',
        icon: <Sparkles className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'win-1', type: 'note-block', label: 'biggest win today' },
          { id: 'win-2', type: 'note-block', label: 'something you\'re proud of' },
          { id: 'completed-goals', type: 'checklist', label: 'goals completed', data: {
            items: ['goal #1', 'goal #2', 'goal #3']
          }},
        ]
      },
      {
        id: 'reflection',
        title: 'reflection',
        icon: <BookOpen className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'what-worked', type: 'reflection-prompt', label: 'what worked well today?', data: { prompt: 'Think about moments of flow and ease...' } },
          { id: 'challenges', type: 'reflection-prompt', label: 'what was challenging?', data: { prompt: 'What obstacles did you face? What did you learn?' } },
          { id: 'tomorrow-focus', type: 'note-block', label: 'focus for tomorrow' },
        ]
      },
      {
        id: 'wellness',
        title: 'wellness check',
        icon: <Activity className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'stress-level', type: 'energy-slider', label: 'stress level (1-10)' },
          { id: 'social-battery', type: 'energy-slider', label: 'social battery' },
          { id: 'creative-battery', type: 'energy-slider', label: 'creative energy' },
        ]
      },
    ]
  },
  {
    id: 'productivity-log',
    name: 'productivity log',
    emoji: '⚡',
    description: 'detailed work session tracking with focus metrics and interruptions',
    autoTags: ['productivity', 'work', 'focus'],
    sections: [
      {
        id: 'focus-sessions',
        title: 'focus sessions',
        icon: <Zap className="w-4 h-4" />,
        collapsible: true,
        defaultExpanded: true,
        widgets: [
          { id: 'session-1', type: 'time-tracker', label: 'deep work session #1' },
          { id: 'task-1', type: 'note-block', label: 'main task accomplished' },
          { id: 'flow-rating', type: 'energy-slider', label: 'flow state rating' },
        ]
      },
      {
        id: 'distractions',
        title: 'distractions & interruptions',
        icon: <TrendingUp className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'interruption-count', type: 'energy-slider', label: 'interruptions (0-10)' },
          { id: 'distraction-types', type: 'checklist', label: 'main distractors', data: {
            items: ['phone/social media', 'emails', 'colleagues', 'low energy', 'notifications', 'other tasks']
          }},
          { id: 'mitigation', type: 'note-block', label: 'how to reduce tomorrow' },
        ]
      },
      {
        id: 'energy-map',
        title: 'energy throughout day',
        icon: <Activity className="w-4 h-4" />,
        collapsible: true,
        widgets: [
          { id: 'morning-energy', type: 'energy-slider', label: 'morning (8am-12pm)' },
          { id: 'afternoon-energy', type: 'energy-slider', label: 'afternoon (12pm-5pm)' },
          { id: 'evening-energy', type: 'energy-slider', label: 'evening (5pm+)' },
          { id: 'peak-hours', type: 'note-block', label: 'peak performance hours' },
        ]
      },
    ]
  },
];

// ============================================================================
// Widget Components
// ============================================================================

function MoodTrackerWidget({ value, onChange }: { value?: string; onChange: (val: string) => void }) {
  const moods = [
    { id: 'terrible', emoji: '😢', color: '#ef4444' },
    { id: 'bad', emoji: '😟', color: '#f97316' },
    { id: 'okay', emoji: '😐', color: '#eab308' },
    { id: 'good', emoji: '🙂', color: '#84cc16' },
    { id: 'great', emoji: '😊', color: '#22c55e' },
    { id: 'amazing', emoji: '🤩', color: '#10b981' },
  ];

  return (
    <div className="flex gap-2">
      {moods.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all",
            value === m.id 
              ? "ring-2 ring-white scale-110" 
              : "opacity-50 hover:opacity-80"
          )}
          style={{ backgroundColor: value === m.id ? `${m.color}33` : 'transparent' }}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  );
}

function EnergySliderWidget({ value, onChange, label }: { value?: number; onChange: (val: number) => void; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-white/40">
        <span>low</span>
        <span className="text-white/60">{value || 5}</span>
        <span>high</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        value={value || 5}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-yellow-400"
      />
    </div>
  );
}

function ChecklistWidget({ items, checked, onChange }: { items: string[]; checked: string[]; onChange: (items: string[]) => void }) {
  const toggle = (item: string) => {
    if (checked.includes(item)) {
      onChange(checked.filter(i => i !== item));
    } else {
      onChange([...checked, item]);
    }
  };

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <label key={item} className="flex items-center gap-2 cursor-pointer group">
          <button
            onClick={() => toggle(item)}
            className={cn(
              "w-5 h-5 rounded border transition-all flex items-center justify-center",
              checked.includes(item)
                ? "bg-green-500/20 border-green-500 text-green-400"
                : "border-white/20 hover:border-white/40"
            )}
          >
            {checked.includes(item) && <CheckCircle2 className="w-3 h-3" />}
          </button>
          <span className={cn(
            "text-sm lowercase transition-colors",
            checked.includes(item) ? "text-white/60 line-through" : "text-white/80"
          )}>{item}</span>
        </label>
      ))}
    </div>
  );
}

function GratitudeInputWidget({ values, onChange }: { values: string[]; onChange: (vals: string[]) => void }) {
  const updateValue = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    onChange(newValues);
  };

  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="text-xs text-white/40 w-4">{i + 1}.</span>
          <input
            type="text"
            value={values[i] || ''}
            onChange={(e) => updateValue(i, e.target.value)}
            placeholder={`gratitude ${i + 1}...`}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30"
          />
        </div>
      ))}
    </div>
  );
}

function GoalTrackerWidget({ goal, completed, onGoalChange, onToggle }: { goal: string; completed: boolean; onGoalChange: (val: string) => void; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onToggle}
        className={cn(
          "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
          completed
            ? "bg-green-500/20 border-green-500 text-green-400"
            : "border-white/20 hover:border-white/40"
        )}
      >
        {completed && <CheckCircle2 className="w-4 h-4" />}
      </button>
      <input
        type="text"
        value={goal}
        onChange={(e) => onGoalChange(e.target.value)}
        placeholder="enter your goal..."
        className={cn(
          "flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30",
          completed && "line-through text-white/40"
        )}
      />
    </div>
  );
}

function TimeTrackerWidget({ time, onChange, label }: { time?: string; onChange: (val: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Clock className="w-4 h-4 text-white/40" />
      <input
        type="time"
        value={time || ''}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase focus:outline-none focus:border-white/30"
      />
      <span className="text-xs text-white/40 lowercase">{label}</span>
    </div>
  );
}

function NoteBlockWidget({ value, onChange, placeholder }: { value?: string; onChange: (val: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || "write your thoughts..."}
      rows={3}
      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
    />
  );
}

function HabitGridWidget({ habits, checked, onChange }: { habits: string[]; checked: string[]; onChange: (items: string[]) => void }) {
  const toggle = (habit: string) => {
    if (checked.includes(habit)) {
      onChange(checked.filter(h => h !== habit));
    } else {
      onChange([...checked, habit]);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      {habits.map((habit) => (
        <button
          key={habit}
          onClick={() => toggle(habit)}
          className={cn(
            "px-3 py-2 rounded-lg text-xs lowercase transition-all border",
            checked.includes(habit)
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
          )}
        >
          {checked.includes(habit) && '✓ '}{habit}
        </button>
      ))}
    </div>
  );
}

function ReflectionPromptWidget({ value, onChange, prompt }: { value?: string; onChange: (val: string) => void; prompt?: string }) {
  return (
    <div className="space-y-2">
      {prompt && <p className="text-xs text-white/40 italic">{prompt}</p>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="reflect here..."
        rows={4}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm lowercase placeholder:text-white/30 focus:outline-none focus:border-white/30 resize-none"
      />
    </div>
  );
}

// ============================================================================
// Template Renderer
// ============================================================================

interface TemplateRendererProps {
  template: EntryTemplate;
  data: Record<string, any>;
  onDataChange: (sectionId: string, widgetId: string, value: any) => void;
  onSave: () => void;
}

export function TemplateRenderer({ template, data, onDataChange, onSave }: TemplateRendererProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(
    Object.fromEntries(template.sections.map(s => [s.id, s.defaultExpanded ?? false]))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const renderWidget = (widget: TemplateWidget, sectionId: string) => {
    const widgetData = data[widget.id];
    const onChange = (value: any) => onDataChange(sectionId, widget.id, value);

    switch (widget.type) {
      case 'mood-tracker':
        return <MoodTrackerWidget value={widgetData} onChange={onChange} />;
      case 'energy-slider':
        return <EnergySliderWidget value={widgetData} onChange={onChange} label={widget.label} />;
      case 'checklist':
        return <ChecklistWidget items={widget.data?.items || []} checked={widgetData || []} onChange={onChange} />;
      case 'gratitude-input':
        return <GratitudeInputWidget values={widgetData || []} onChange={onChange} />;
      case 'goal-tracker':
        return (
          <GoalTrackerWidget
            goal={widgetData?.goal || ''}
            completed={widgetData?.completed || false}
            onGoalChange={(val) => onChange({ ...widgetData, goal: val })}
            onToggle={() => onChange({ ...widgetData, completed: !widgetData?.completed })}
          />
        );
      case 'time-tracker':
        return <TimeTrackerWidget time={widgetData} onChange={onChange} label={widget.label} />;
      case 'note-block':
        return <NoteBlockWidget value={widgetData} onChange={onChange} placeholder={widget.label} />;
      case 'habit-grid':
        return <HabitGridWidget habits={widget.data?.habits || []} checked={widgetData || []} onChange={onChange} />;
      case 'reflection-prompt':
        return <ReflectionPromptWidget value={widgetData} onChange={onChange} prompt={widget.data?.prompt} />;
      default:
        return <div className="text-xs text-white/40">unknown widget type</div>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Template Header */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{template.emoji}</span>
          <div>
            <h3 className="text-sm font-medium lowercase">{template.name}</h3>
            <p className="text-xs text-white/40 lowercase">{template.description}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {template.autoTags?.map(tag => (
            <span key={tag} className="px-2 py-1 rounded-full text-[10px] bg-white/5 text-white/40 lowercase">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Sections */}
      {template.sections.map((section) => (
        <div key={section.id} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {/* Section Header */}
          <button
            onClick={() => section.collapsible && toggleSection(section.id)}
            className={cn(
              "w-full flex items-center justify-between p-3",
              section.collapsible && "cursor-pointer hover:bg-white/5"
            )}
          >
            <div className="flex items-center gap-2">
              {section.icon && <span className="text-white/40">{section.icon}</span>}
              <span className="text-xs text-white/60 lowercase">{section.title}</span>
            </div>
            {section.collapsible && (
              expandedSections[section.id] ? 
                <ChevronUp className="w-4 h-4 text-white/40" /> : 
                <ChevronDown className="w-4 h-4 text-white/40" />
            )}
          </button>

          {/* Section Content */}
          {(!section.collapsible || expandedSections[section.id]) && (
            <div className="p-3 pt-0 space-y-4">
              {section.widgets.map((widget) => (
                <div key={widget.id} className="space-y-2">
                  <label className="text-xs text-white/40 lowercase">{widget.label}</label>
                  {renderWidget(widget, section.id)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm lowercase transition-colors flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        save template entry
      </button>
    </div>
  );
}

// ============================================================================
// Template Selector Modal
// ============================================================================

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: EntryTemplate) => void;
}

export function TemplateSelectorModal({ isOpen, onClose, onSelect }: TemplateSelectorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<EntryTemplate | null>(null);
  const [templateData, setTemplateData] = useState<Record<string, any>>({});

  const handleSelect = (template: EntryTemplate) => {
    setSelectedTemplate(template);
    setTemplateData({});
  };

  const handleDataChange = (sectionId: string, widgetId: string, value: any) => {
    setTemplateData(prev => ({
      ...prev,
      [widgetId]: value
    }));
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    
    // Convert template data to entry format
    const entryBody = generateEntryBody(selectedTemplate, templateData);
    
    onSelect({
      ...selectedTemplate,
      sections: selectedTemplate.sections.map(s => ({
        ...s,
        widgets: s.widgets.map(w => ({
          ...w,
          data: templateData[w.id]
        }))
      }))
    });
    
    toast.success('template data saved');
    onClose();
  };

  const generateEntryBody = (template: EntryTemplate, data: Record<string, any>): string => {
    const lines: string[] = [];
    lines.push(`# ${template.name} ${template.emoji}`);
    lines.push('');

    template.sections.forEach(section => {
      const hasData = section.widgets.some(w => data[w.id] !== undefined && data[w.id] !== '');
      if (!hasData) return;

      lines.push(`## ${section.title}`);
      lines.push('');

      section.widgets.forEach(widget => {
        const value = data[widget.id];
        if (value === undefined || value === '') return;

        lines.push(`**${widget.label}:**`);
        
        switch (widget.type) {
          case 'mood-tracker':
            lines.push(`${value}`);
            break;
          case 'energy-slider':
            lines.push(`${value}/10`);
            break;
          case 'checklist':
          case 'habit-grid':
            if (Array.isArray(value) && value.length > 0) {
              value.forEach(item => lines.push(`- ${item}`));
            } else {
              lines.push('none');
            }
            break;
          case 'gratitude-input':
            if (Array.isArray(value)) {
              value.filter(Boolean).forEach(item => lines.push(`- ${item}`));
            }
            break;
          case 'goal-tracker':
            lines.push(`${value.completed ? '[x]' : '[ ]'} ${value.goal || ''}`);
            break;
          case 'time-tracker':
            lines.push(`${value}`);
            break;
          case 'note-block':
          case 'reflection-prompt':
            lines.push(value);
            break;
        }
        lines.push('');
      });
    });

    return lines.join('\n');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a] p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium lowercase">
            {selectedTemplate ? selectedTemplate.name : 'choose a template'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template Grid or Renderer */}
        {!selectedTemplate ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {COMPLEX_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 transition-all text-left group"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-3xl">{template.emoji}</span>
                  <Plus className="w-4 h-4 text-white/20 group-hover:text-white/60" />
                </div>
                <h3 className="text-sm font-medium lowercase mb-1">{template.name}</h3>
                <p className="text-xs text-white/40 lowercase">{template.description}</p>
                <div className="flex gap-1 mt-3">
                  {template.autoTags?.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/40">
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <TemplateRenderer
            template={selectedTemplate}
            data={templateData}
            onDataChange={handleDataChange}
            onSave={handleSave}
          />
        )}

        {/* Back Button */}
        {selectedTemplate && (
          <button
            onClick={() => setSelectedTemplate(null)}
            className="mt-4 w-full py-2 text-sm text-white/40 lowercase hover:text-white/60 transition-colors"
          >
            ← back to templates
          </button>
        )}
      </div>
    </div>
  );
}
