import { useState, useMemo } from 'react';
import { useEdgelessStore } from '../../packages/core/src/features/edgeless/store';
import { useCollections } from '../../packages/core/src/hooks/use-collections';
import { 
  Search, X, Database, Calendar, BarChart3, Kanban, Image, 
  List, Grid3X3, Clock, Target, Zap, Brain, FileText, 
  TrendingUp, PieChart, Droplets, Moon, Activity, Wallet,
  Dumbbell, Dog, Pill, CheckSquare, BookOpen, Flame, Sparkles, StickyNote,
  ChevronRight, ChevronLeft, Plus, Timer, ImageIcon, Wind
} from 'lucide-react';
import { cn } from '../../packages/core/src/lib/utils';

interface ComprehensiveWidgetPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VIEW_TYPES = [
  { id: 'table', label: 'Table', icon: Grid3X3, description: 'Tabular data view', width: 500, height: 350 },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon, description: 'Grid of cards', width: 500, height: 350 },
  { id: 'kanban', label: 'Kanban', icon: Kanban, description: 'Board with columns', width: 600, height: 400 },
  { id: 'calendar', label: 'Calendar', icon: Calendar, description: 'Date-based view', width: 600, height: 450 },
  { id: 'gantt', label: 'Gantt', icon: BarChart3, description: 'Timeline view', width: 700, height: 400 },
  { id: 'chart', label: 'Chart', icon: PieChart, description: 'Visual analytics', width: 500, height: 350 },
  { id: 'list', label: 'List', icon: List, description: 'Simple list view', width: 350, height: 400 },
  { id: 'map', label: 'Map', icon: Image, description: 'Geographic view', width: 500, height: 400 },
];

type WidgetCategory = 'personal' | 'health' | 'finance' | 'productivity' | 'media' | 'utility';

interface PresetWidget {
  id: string;
  label: string;
  icon: any;
  description: string;
  category: WidgetCategory;
  defaultWidth: number;
  defaultHeight: number;
  defaultData: Record<string, any>;
  dataSource?: string;
}

const PRESET_WIDGETS: PresetWidget[] = [
  // PERSONAL / PKM
  {
    id: 'journal-quick-entry',
    label: 'Journal Quick Entry',
    icon: FileText,
    description: 'Quick journal entry with mood selector',
    category: 'personal',
    defaultWidth: 350,
    defaultHeight: 280,
    defaultData: { showMood: true, showActivities: true, showWeather: false },
    dataSource: 'journal_entries'
  },
  {
    id: 'mood-trend',
    label: 'Mood Trend',
    icon: TrendingUp,
    description: 'Visualize mood patterns over time',
    category: 'personal',
    defaultWidth: 450,
    defaultHeight: 280,
    defaultData: { timeframe: '30d', showAverage: true, chartType: 'line' },
    dataSource: 'journal_entries'
  },
  {
    id: 'knowledge-graph',
    label: 'Knowledge Graph',
    icon: Brain,
    description: 'Visual connections between journal entries',
    category: 'personal',
    defaultWidth: 550,
    defaultHeight: 450,
    defaultData: { nodeSize: 'medium', showLabels: true, autoCluster: true },
    dataSource: 'journal_entries'
  },
  {
    id: 'activity-heatmap',
    label: 'Activity Heatmap',
    icon: Grid3X3,
    description: 'Calendar view of daily activities',
    category: 'personal',
    defaultWidth: 500,
    defaultHeight: 220,
    defaultData: { months: 6, colorIntensity: 'mood', showStreaks: true },
    dataSource: 'journal_entries'
  },

  // HEALTH & WELLNESS
  {
    id: 'medication-tracker',
    label: 'Medication Tracker',
    icon: Pill,
    description: 'Track daily medication doses',
    category: 'health',
    defaultWidth: 320,
    defaultHeight: 280,
    defaultData: { 
      groups: ['morning', 'afternoon', 'night'], 
      showProgress: true,
      enableReminders: true 
    }
  },
  {
    id: 'exercise-tracker',
    label: 'Exercise Tracker',
    icon: Dumbbell,
    description: 'Track muscle groups and workouts',
    category: 'health',
    defaultWidth: 340,
    defaultHeight: 260,
    defaultData: { 
      muscleGroups: ['upper', 'core', 'legs', 'cardio', 'stretch'],
      showDuration: true,
      showStreak: true 
    },
    dataSource: 'exercise_sessions'
  },
  {
    id: 'sleep-tracker',
    label: 'Sleep Tracker',
    icon: Moon,
    description: 'Monitor sleep duration and quality',
    category: 'health',
    defaultWidth: 400,
    defaultHeight: 250,
    defaultData: { 
      showQuality: true, 
      showDuration: true,
      goalHours: 8,
      timeframe: '7d'
    },
    dataSource: 'sleep_tracker'
  },
  {
    id: 'water-intake',
    label: 'Water Intake',
    icon: Droplets,
    description: 'Track daily hydration goals',
    category: 'health',
    defaultWidth: 250,
    defaultHeight: 200,
    defaultData: { goal: 8, unit: 'glasses', showHistory: true }
  },
  {
    id: 'pet-care-tracker',
    label: 'Pet Care Tracker',
    icon: Dog,
    description: 'Track pet feeding, play, and rest',
    category: 'health',
    defaultWidth: 300,
    defaultHeight: 220,
    defaultData: { 
      needs: ['fed', 'played', 'rested'],
      showHistory: true,
      allowMultiplePets: false 
    },
    dataSource: 'pet_interactions'
  },

  // FINANCE
  {
    id: 'finance-summary',
    label: 'Finance Summary',
    icon: Wallet,
    description: 'Daily finance overview and progress',
    category: 'finance',
    defaultWidth: 380,
    defaultHeight: 300,
    defaultData: { 
      categories: ['income', 'expenses', 'savings', 'investments', 'budget'],
      showTargets: true,
      showTrend: true 
    },
    dataSource: 'finance_daily'
  },
  {
    id: 'expense-breakdown',
    label: 'Expense Breakdown',
    icon: PieChart,
    description: 'Visual breakdown of spending',
    category: 'finance',
    defaultWidth: 350,
    defaultHeight: 300,
    defaultData: { chartType: 'donut', timeframe: '30d', showCategories: true },
    dataSource: 'finance_daily'
  },

  // PRODUCTIVITY
  {
    id: 'habit-tracker',
    label: 'Habit Tracker',
    icon: Target,
    description: 'Track daily habits with streaks',
    category: 'productivity',
    defaultWidth: 320,
    defaultHeight: 280,
    defaultData: { 
      habits: [],
      showStreaks: true,
      showWeeklyProgress: true,
      allowAdd: true 
    },
    dataSource: 'habits'
  },
  {
    id: 'streak-display',
    label: 'Streak Display',
    icon: Flame,
    description: 'Show current activity streaks',
    category: 'productivity',
    defaultWidth: 280,
    defaultHeight: 180,
    defaultData: { type: 'journal', showCalendar: true, highlightWeekends: true }
  },
  {
    id: 'goal-progress',
    label: 'Goal Progress',
    icon: CheckSquare,
    description: 'Track progress towards goals',
    category: 'productivity',
    defaultWidth: 350,
    defaultHeight: 280,
    defaultData: { 
      goals: [],
      showPercentage: true, 
      chartType: 'circular',
      allowAdd: true 
    }
  },
  {
    id: 'task-list',
    label: 'Task List',
    icon: CheckSquare,
    description: 'Simple todo list with priorities',
    category: 'productivity',
    defaultWidth: 320,
    defaultHeight: 380,
    defaultData: { 
      showPriorities: true,
      showDueDates: true,
      allowAdd: true,
      showCompleted: true 
    },
    dataSource: 'tasks'
  },
  {
    id: 'pomodoro-timer',
    label: 'Pomodoro Timer',
    icon: Timer,
    description: 'Focus timer with break reminders',
    category: 'productivity',
    defaultWidth: 280,
    defaultHeight: 200,
    defaultData: { 
      workMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      autoStart: false 
    }
  },
  {
    id: 'quick-capture',
    label: 'Quick Capture',
    icon: Plus,
    description: 'Instant thought and idea capture',
    category: 'productivity',
    defaultWidth: 300,
    defaultHeight: 200,
    defaultData: { showTags: true, autoSave: true, voiceEnabled: true }
  },

  // MEDIA
  {
    id: 'voice-memo',
    label: 'Voice Memo',
    icon: Activity,
    description: 'Record and transcribe voice notes',
    category: 'media',
    defaultWidth: 300,
    defaultHeight: 180,
    defaultData: { autoTranscribe: true, maxDuration: 300, showWaveform: true }
  },
  {
    id: 'reading-list',
    label: 'Reading List',
    icon: BookOpen,
    description: 'Track books and reading progress',
    category: 'media',
    defaultWidth: 360,
    defaultHeight: 320,
    defaultData: { 
      showProgress: true, 
      sortBy: 'status',
      showRatings: true,
      allowAdd: true 
    },
    dataSource: 'reading_list'
  },

  // UTILITIES
  {
    id: 'clock-widget',
    label: 'Clock',
    icon: Clock,
    description: 'Current time with timezone support',
    category: 'utility',
    defaultWidth: 220,
    defaultHeight: 140,
    defaultData: { format: '12h', showSeconds: false, timezone: 'local' }
  },
  {
    id: 'sticky-notes',
    label: 'Sticky Notes',
    icon: StickyNote,
    description: 'Quick notes and reminders',
    category: 'utility',
    defaultWidth: 260,
    defaultHeight: 220,
    defaultData: { color: 'yellow', allowEdit: true, autoSave: true }
  },
  {
    id: 'breathing-guide',
    label: 'Breathing Guide',
    icon: Wind,
    description: 'Guided breathing exercises',
    category: 'utility',
    defaultWidth: 280,
    defaultHeight: 200,
    defaultData: { technique: '4-7-8', duration: 2, visualGuide: true }
  },
];

const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  personal: 'Personal & PKM',
  health: 'Health & Wellness',
  finance: 'Finance',
  productivity: 'Productivity',
  media: 'Media & Audio',
  utility: 'Utilities'
};

const CATEGORY_COLORS: Record<WidgetCategory, string> = {
  personal: 'text-purple-400 bg-purple-500/10',
  health: 'text-green-400 bg-green-500/10',
  finance: 'text-emerald-400 bg-emerald-500/10',
  productivity: 'text-orange-400 bg-orange-500/10',
  media: 'text-pink-400 bg-pink-500/10',
  utility: 'text-gray-400 bg-gray-500/10'
};

export function ComprehensiveWidgetPicker({ isOpen, onClose }: ComprehensiveWidgetPickerProps) {
  const [activeTab, setActiveTab] = useState<'databases' | 'presets'>('databases');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');
  const [selectedCollection, setSelectedCollection] = useState<any>(null);
  const { collections } = useCollections();
  const addElement = useEdgelessStore((s: any) => s.addElement);

  // Filter collections based on search
  const filteredCollections = useMemo(() => {
    if (!collections) return [];
    if (!search) return collections;
    return collections.filter((c: any) => 
      (c.title || c.name).toLowerCase().includes(search.toLowerCase())
    );
  }, [collections, search]);

  // Filter preset widgets based on search and category
  const filteredPresets = useMemo(() => {
    let filtered = PRESET_WIDGETS;
    
    if (search) {
      filtered = filtered.filter(w => 
        w.label.toLowerCase().includes(search.toLowerCase()) ||
        w.description.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(w => w.category === selectedCategory);
    }
    
    return filtered;
  }, [search, selectedCategory]);

  // Group presets by category
  const groupedPresets = useMemo(() => {
    const groups: Partial<Record<WidgetCategory | 'all', PresetWidget[]>> = {};
    
    if (selectedCategory === 'all') {
      (Object.keys(CATEGORY_LABELS) as WidgetCategory[]).forEach(cat => {
        const catWidgets = filteredPresets.filter(w => w.category === cat);
        if (catWidgets.length > 0) {
          groups[cat] = catWidgets;
        }
      });
    } else {
      groups.all = filteredPresets;
    }
    
    return groups;
  }, [filteredPresets, selectedCategory]);

  const handleSelectCollection = (collection: any) => {
    setSelectedCollection(collection);
  };

  const handleAddDatabaseWidget = (viewType: typeof VIEW_TYPES[0]) => {
    if (!selectedCollection) return;

    const store = useEdgelessStore.getState();
    const { x, y, zoom } = store.viewPort;
    const centerX = (-x / zoom) + (window.innerWidth / 2 / zoom) - (viewType.width / 2);
    const centerY = (-y / zoom) + (window.innerHeight / 2 / zoom) - (viewType.height / 2);

    addElement({
      type: 'widget',
      x: centerX,
      y: centerY,
      width: viewType.width,
      height: viewType.height,
      data: {
        widgetId: `db-${selectedCollection.name}-${viewType.id}`,
        widgetType: 'database-view',
        title: `${selectedCollection.title || selectedCollection.name} - ${viewType.label}`,
        collectionName: selectedCollection.name,
        viewType: viewType.id,
        limit: 20,
        interactive: true,
        inline: true
      }
    });

    handleClose();
  };

  const handleAddPresetWidget = (widget: PresetWidget) => {
    const store = useEdgelessStore.getState();
    const { x, y, zoom } = store.viewPort;
    const centerX = (-x / zoom) + (window.innerWidth / 2 / zoom) - (widget.defaultWidth / 2);
    const centerY = (-y / zoom) + (window.innerHeight / 2 / zoom) - (widget.defaultHeight / 2);

    addElement({
      type: 'widget',
      x: centerX,
      y: centerY,
      width: widget.defaultWidth,
      height: widget.defaultHeight,
      data: {
        widgetId: widget.id,
        widgetType: widget.id,
        title: widget.label,
        dataSource: widget.dataSource,
        ...widget.defaultData
      }
    });

    handleClose();
  };

  const handleClose = () => {
    setActiveTab('databases');
    setSelectedCollection(null);
    setSelectedCategory('all');
    setSearch('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[28rem] max-h-[85vh] bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          {activeTab === 'databases' && selectedCollection && (
            <button
              onClick={() => setSelectedCollection(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <h3 className="text-sm font-medium text-white lowercase">
            {activeTab === 'databases' && selectedCollection 
              ? `${selectedCollection.title || selectedCollection.name} - select view`
              : activeTab === 'databases' 
                ? 'add database widget'
                : 'add preset widget'
            }
          </h3>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => {
            setActiveTab('databases');
            setSelectedCollection(null);
            setSearch('');
          }}
          className={cn(
            "flex-1 py-3 text-sm font-medium lowercase transition-all relative",
            activeTab === 'databases' 
              ? "text-yellow-400" 
              : "text-white/40 hover:text-white/60"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Database className="w-4 h-4" />
            databases
          </div>
          {activeTab === 'databases' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />
          )}
        </button>
        <button
          onClick={() => {
            setActiveTab('presets');
            setSelectedCollection(null);
            setSearch('');
          }}
          className={cn(
            "flex-1 py-3 text-sm font-medium lowercase transition-all relative",
            activeTab === 'presets' 
              ? "text-yellow-400" 
              : "text-white/40 hover:text-white/60"
          )}
        >
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" />
            preset widgets
          </div>
          {activeTab === 'presets' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
          <Search className="w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder={activeTab === 'databases' 
              ? "search databases..." 
              : "search preset widgets..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none text-white placeholder:text-white/40 text-sm outline-none"
            autoFocus
          />
        </div>
      </div>

      {/* Category Filter (only for presets tab) */}
      {activeTab === 'presets' && (
        <div className="flex items-center gap-2 p-4 border-b border-white/10 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap",
              selectedCategory === 'all'
                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
            )}
          >
            all
          </button>
          {(Object.keys(CATEGORY_LABELS) as WidgetCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap lowercase",
                selectedCategory === cat
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-white/5 text-white/60 hover:bg-white/10 border border-transparent"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[400px]">
        {activeTab === 'databases' ? (
          selectedCollection ? (
            /* View Types Selection */
            <div className="space-y-2">
              <div className="text-xs text-white/40 lowercase mb-3">
                choose view type for {selectedCollection.title || selectedCollection.name}
              </div>
              {VIEW_TYPES.map((viewType) => {
                const Icon = viewType.icon;
                return (
                  <button
                    key={viewType.id}
                    onClick={() => handleAddDatabaseWidget(viewType)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-400 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white lowercase">
                        {viewType.label}
                      </div>
                      <div className="text-xs text-white/40 lowercase">
                        {viewType.description}
                      </div>
                      <div className="text-[10px] text-white/30 lowercase mt-1">
                        {viewType.width}×{viewType.height}
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>
                );
              })}
            </div>
          ) : (
            /* Databases List */
            <div className="space-y-1">
              {filteredCollections.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-white/40 text-sm lowercase">no databases found</div>
                  <div className="text-white/20 text-xs lowercase mt-1">try adjusting your search</div>
                </div>
              ) : (
                filteredCollections.map((collection: any) => (
                  <button
                    key={collection.name}
                    onClick={() => handleSelectCollection(collection)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-400">
                      <Database className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white lowercase truncate">
                        {collection.title || collection.name}
                      </div>
                      <div className="text-[10px] text-white/40 lowercase">
                        {collection.fields?.length || 0} fields • click to select view
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                  </button>
                ))
              )}
            </div>
          )
        ) : (
          /* Preset Widgets List */
          <div className="space-y-4">
            {Object.entries(groupedPresets).map(([category, widgets]) => {
              if (!widgets || widgets.length === 0) return null;
              const catKey = category as WidgetCategory;
              const colorClass = CATEGORY_COLORS[catKey] || 'text-gray-400 bg-gray-500/10';
              
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={cn("w-2 h-2 rounded-full", colorClass.split(' ')[0])} />
                    <span className="text-xs text-white/40 uppercase tracking-wider">
                      {CATEGORY_LABELS[catKey] || 'widgets'}
                    </span>
                    <span className="text-[10px] text-white/30 ml-auto">{widgets.length}</span>
                  </div>
                  <div className="space-y-1">
                    {widgets.map((widget) => {
                      const Icon = widget.icon;
                      const [textColor] = (CATEGORY_COLORS[widget.category] || 'text-gray-400').split(' ');
                      return (
                        <button
                          key={widget.id}
                          onClick={() => handleAddPresetWidget(widget)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group text-left"
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            colorClass.split(' ')[1] || 'bg-white/5',
                            textColor
                          )}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white lowercase truncate">
                                {widget.label}
                              </span>
                              {widget.dataSource && (
                                <span className="text-[10px] text-white/30 lowercase">
                                  • {widget.dataSource}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-white/40 lowercase">
                              {widget.description}
                            </div>
                            <div className="text-[10px] text-white/30 lowercase mt-1">
                              {widget.defaultWidth}×{widget.defaultHeight}
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            
            {filteredPresets.length === 0 && (
              <div className="text-center py-8">
                <div className="text-white/40 text-sm lowercase">no widgets found</div>
                <div className="text-white/20 text-xs lowercase mt-1">try adjusting your search</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between text-xs text-white/40">
          <div className="lowercase">
            {activeTab === 'databases' 
              ? selectedCollection 
                ? `${VIEW_TYPES.length} view types`
                : `${filteredCollections.length} database${filteredCollections.length !== 1 ? 's' : ''}`
              : `${filteredPresets.length} preset${filteredPresets.length !== 1 ? 's' : ''}`
            }
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="lowercase">live data</span>
          </div>
        </div>
      </div>
    </div>
  );
}
