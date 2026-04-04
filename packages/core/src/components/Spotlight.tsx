import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { User, Rocket, Database, Sparkles, MessageCircle, FileText, Command as CommandIcon, Loader2, Activity, PlusCircle } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useNavigate } from 'react-router-dom';
import { useCollections, type Collection } from "@/hooks/use-collections";
import { useEdgelessStore } from '@/features/edgeless/store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { SemanticSearch } from "@/components/search/SemanticSearch";
import { toast } from 'sonner';
import { useGamificationStore, HABIT_TO_QUEST_MAPPING, XP_PER_ENTRY } from '@/store/useGamificationStore';
import { dataService } from '@/services/data.service';
import { secureLogger } from '@/lib/secure-logger';

// activity logging types and constants from use-journal-data.ts
type ActivityId = string;

type Activity = {
  id: ActivityId;
  label: string;
  emoji: string;
  category: string;
  color: string;
};

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: 'meds_morning', label: 'morning meds', emoji: '🌞', category: 'medication', color: '#22c55e' },
  { id: 'meds_afternoon', label: 'afternoon meds', emoji: '🌤️', category: 'medication', color: '#f59e0b' },
  { id: 'meds_night', label: 'night meds', emoji: '🌙', category: 'medication', color: '#6366f1' },
  { id: 'take_pills', label: 'take pills', emoji: '💊', category: 'health', color: '#f5af12' },
  { id: 'put_patches_on', label: 'put patches on', emoji: '🩹', category: 'health', color: '#f5af12' },
  { id: 'water_floss', label: 'water floss', emoji: '🚿', category: 'health', color: '#3c9fdd' },
  { id: 'brush_teeth', label: 'brush teeth', emoji: '🦷', category: 'health', color: '#3c9fdd' },
  { id: 'wash_face', label: 'wash face', emoji: '🧴', category: 'health', color: '#3c9fdd' },
  { id: 'nail_care', label: 'nail care', emoji: '💅', category: 'health', color: '#ff00ff' },
  { id: 'body_wipe', label: 'body wipe', emoji: '🧻', category: 'health', color: '#ffffff' },
  { id: 'shower', label: 'shower', emoji: '🚿', category: 'health', color: '#3c9fdd' },
  { id: 'journal_plan_write', label: 'journal/plan/write', emoji: '📝', category: 'productivity', color: '#32cd32' },
  { id: 'tidy', label: 'tidy', emoji: '🧹', category: 'productivity', color: '#ffffff' },
  { id: 'worship', label: 'worship', emoji: '🙏', category: 'wellness', color: '#f5af12' },
  { id: 'laundry', label: 'laundry', emoji: '👕', category: 'productivity', color: '#ffffff' },
  { id: 'go_outside', label: 'go outside', emoji: '🚪', category: 'wellness', color: '#008000' },
  { id: 'leave_house', label: 'leave house', emoji: '🏠', category: 'wellness', color: '#32cd32' },
  { id: 'online_social_int', label: 'online social int', emoji: '💬', category: 'social', color: '#f5af12' },
  { id: 'eat_meal', label: 'eat meal', emoji: '🍽️', category: 'health', color: '#ff4500' },
  { id: 'draw', label: 'draw', emoji: '✏️', category: 'creative', color: '#f5af12' },
  { id: 'vibecode', label: 'vibecode', emoji: '💻', category: 'creative', color: '#800080' },
  { id: 'paint', label: 'paint', emoji: '🎨', category: 'creative', color: '#ff00ff' },
  { id: 'play_a_game', label: 'play a game', emoji: '🎮', category: 'leisure', color: '#008000' },
  { id: 'llm_rp', label: 'llm rp', emoji: '🤖', category: 'creative', color: '#ffffff' },
  { id: 'llm_int', label: 'llm int', emoji: '💬', category: 'creative', color: '#ffffff' },
  { id: 'watch_content', label: 'watch content', emoji: '📺', category: 'leisure', color: '#3c9fdd' },
  { id: 'masturbate', label: 'masturbate', emoji: '🍆', category: 'health', color: '#ff00ff' },
  { id: 'nap', label: 'nap', emoji: '😴', category: 'health', color: '#f5af12' },
  { id: 'int_w_family', label: 'int w family', emoji: '👨‍👩‍👧‍👦', category: 'social', color: '#32cd32' },
  { id: 'remove_patches', label: 'remove patches', emoji: '🩹', category: 'health', color: '#ff0000' },
  { id: 'sleep', label: 'sleep', emoji: '🛏️', category: 'health', color: '#800080' },
];




interface SearchResult {
    id: string;
    collectionName?: string;
    collectionTitle?: string;
    record?: Record<string, unknown>;
    score?: number;
}

// localStorage helpers for activity tracking
function getStoredData<T>(key: string, defaultValue: T): T {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setStoredData(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

// medication groups for logging individual meds
const MEDICATION_GROUPS: Record<string, { group: 'morning' | 'afternoon' | 'night'; meds: Array<{ id: string; name: string; dose: string; quantity: number }> }> = {
  meds_morning: {
    group: 'morning',
    meds: [
      { id: 'paxil_30', name: 'paxil', dose: '30mg', quantity: 2 },
      { id: 'wellbutrin_300', name: 'wellbutrin', dose: '300mg', quantity: 1 },
      { id: 'adderall_10', name: 'adderall', dose: '10mg', quantity: 2 },
      { id: 'vitd_250', name: 'vitamin d', dose: '250mcg', quantity: 1 },
      { id: 'vitk_100', name: 'vitamin k', dose: '100mcg', quantity: 1 },
      { id: 'iron_25_morning', name: 'iron bisglycinate', dose: '25mg', quantity: 2 },
    ],
  },
  meds_afternoon: {
    group: 'afternoon',
    meds: [
      { id: 'adderall_10_pm', name: 'adderall', dose: '10mg', quantity: 1 },
      { id: 'aripiprazole_5', name: 'aripiprazole', dose: '5mg', quantity: 1 },
    ],
  },
  meds_night: {
    group: 'night',
    meds: [
      { id: 'iron_25_night', name: 'iron bisglycinate', dose: '25mg', quantity: 2 },
      { id: 'lithium_300', name: 'lithium', dose: '300mg', quantity: 1 },
    ],
  },
};

export function Spotlight() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [dbResults, setDbResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mode, setMode] = useState<'command' | 'semantic' | 'activity'>('command');

    const navigate = useNavigate();
    const { collections } = useCollections();
    const setChatOpen = useEdgelessStore(state => state.setChatOpen);
    const gamificationStore = useGamificationStore();

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // keyboard shortcuts & global events
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            // ctrl+k opens spotlight (existing)
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
            // ctrl+shift+a opens activity logging directly
            if (e.key === "a" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
                e.preventDefault();
                setMode('activity');
                setOpen(true);
            }
        };

        const handleOpenSearch = (e: CustomEvent) => {
            setOpen(true);
            if (e.detail?.context) {
                setQuery(e.detail.context.slice(0, 100));
                setMode('semantic');
            } else {
                setMode('command');
            }
        };

        const handleOpenActivity = () => {
            setMode('activity');
            setOpen(true);
        };

        document.addEventListener("keydown", down);
        window.addEventListener('pkm:open-search', handleOpenSearch as EventListener);
        window.addEventListener('pkm:open-activity', handleOpenActivity as EventListener);
        return () => {
            document.removeEventListener("keydown", down);
            window.removeEventListener('pkm:open-search', handleOpenSearch as EventListener);
            window.removeEventListener('pkm:open-activity', handleOpenActivity as EventListener);
        };
    }, []);

    const performSearch = async (val: string) => {
        // legacy search logic kept for command mode
        if (!val || val.length < 2) {
            setDbResults([]);
            return;
        }

        setIsSearching(true);
        try {
            // simple collection title match for now
            const results: SearchResult[] = [];
            collections.forEach((c: Collection) => {
                if (c.title?.toLowerCase().includes(val.toLowerCase()) || c.name.toLowerCase().includes(val.toLowerCase())) {
                    results.push({ id: c.name, collectionName: c.name, collectionTitle: c.title, record: { title: c.title } });
                }
            });
            setDbResults(results);
        } finally {
            setIsSearching(false);
        }
    };

    const onQueryChange = (val: string) => {
        setQuery(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        searchTimeout.current = setTimeout(() => {
            performSearch(val);
        }, 400);
    };

    // activity logging function
    const logActivity = useCallback((activity: Activity) => {
        const now = new Date().toISOString();
        
        // update activity history in localStorage
        const historyKey = 'journal_activity_history';
        const existingHistory = getStoredData<Record<string, string[]>>(historyKey, {});
        const activityTimestamps = existingHistory[activity.id] || [];
        activityTimestamps.push(now);
        existingHistory[activity.id] = activityTimestamps;
        setStoredData(historyKey, existingHistory);
        
        // handle medication groups
        if (MEDICATION_GROUPS[activity.id]) {
            const medGroup = MEDICATION_GROUPS[activity.id];
            const medLogKey = 'medication_log';
            type MedLogEntry = { id: string; name: string; dose: string; quantity: number; timestamp: string; group: 'morning' | 'afternoon' | 'night' };
            const existingMeds = getStoredData<MedLogEntry[]>(medLogKey, []);
            const newMeds: MedLogEntry[] = medGroup.meds.map(m => ({
                id: m.id,
                name: m.name,
                dose: m.dose,
                quantity: m.quantity,
                timestamp: now,
                group: medGroup.group
            }));
            setStoredData(medLogKey, [...existingMeds, ...newMeds]);
        }
        
        // gamification updates
        const { addXp, updateQuestCell, updateCategory, saveToServer } = gamificationStore;
        
        // add base XP for logging activity
        const xpGained = XP_PER_ENTRY;
        addXp(xpGained);
        
        // check for quest mappings and update quest cells
        const activityIdLower = activity.id.toLowerCase();
        const activityLabelLower = activity.label.toLowerCase();
        const mappings = HABIT_TO_QUEST_MAPPING[activityIdLower] || 
                        HABIT_TO_QUEST_MAPPING[activityLabelLower] ||
                        Object.entries(HABIT_TO_QUEST_MAPPING).find(([key]) => 
                            activityIdLower.includes(key) || activityLabelLower.includes(key)
                        )?.[1];
        
        let questsCompleted = 0;
        if (mappings) {
            mappings.forEach(({ rowId, cellId }) => {
                updateQuestCell(rowId, cellId, true);
                questsCompleted++;
            });
        }
        
        // update category saturation based on activity category
        const categoryMap: Record<string, keyof typeof gamificationStore.saturation> = {
            'health': 'body',
            'medication': 'body',
            'exercise': 'body',
            'wellness': 'mind',
            'mind': 'mind',
            'productivity': 'mind',
            'creative': 'mind',
            'social': 'social',
            'finance': 'finance',
            'mood': 'mood'
        };
        
        const saturationCategory = categoryMap[activity.category];
        if (saturationCategory) {
            const currentValue = gamificationStore.saturation[saturationCategory];
            updateCategory(saturationCategory, Math.min(100, currentValue + 10));
        }
        
        // persist to server
        saveToServer();
        
        // show toast with activity and XP info
        const themeColor = '#f6b012';
        toast.success(
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span style={{ color: themeColor }}>{activity.emoji}</span>
                    <span style={{ color: themeColor }} className="font-medium">{activity.label}</span>
                </div>
                <div className="text-xs text-white/60 lowercase">
                    activity logged • +{xpGained} xp
                    {questsCompleted > 0 ? ` • ${questsCompleted} quest${questsCompleted > 1 ? 's' : ''} updated` : ''}
                </div>
            </div>,
            { 
                style: { 
                    background: '#1a1a1a', 
                    border: `1px solid ${themeColor}40`,
                    color: '#fff'
                }
            }
        );
        
        // emit data update to server for other devices
        dataService.emitDataUpdate('activity_logged', {
            activity_id: activity.id,
            activity_name: activity.label,
            category: activity.category,
            xp_gained: xpGained,
            quests_completed: questsCompleted
        });

        setOpen(false);
    }, [gamificationStore]);

    // filtered activities for activity mode
    const filteredActivities = useMemo(() => {
        if (mode !== 'activity') return [];
        const q = query.trim().toLowerCase();
        if (!q) return DEFAULT_ACTIVITIES;
        return DEFAULT_ACTIVITIES.filter(a => 
            a.label.toLowerCase().includes(q) || 
            a.category.toLowerCase().includes(q)
        );
    }, [mode, query]);

    const runAction = useCallback((action: () => void) => {
        setOpen(false);
        // delay action to allow dialog close animation to complete
        setTimeout(() => {
            action();
        }, 150);
    }, []);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[750px] p-0 gap-0 bg-background/60 backdrop-blur-2xl border-primary/20 shadow-3xl overflow-hidden rounded-2xl h-[600px] flex flex-col">
                {mode === 'semantic' ? (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center p-3 border-b border-primary/10 bg-primary/5">
                            <span className="text-xs font-bold pl-2 text-primary flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                semantic search
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMode('command')}
                                className="h-6 text-xs"
                            >
                                switch to commands
                            </Button>
                        </div>
                        <SemanticSearch
                            onSelect={(id) => {
                                navigate(`/databases/${id}`);
                                setOpen(false);
                            }}
                            initialQuery={query}
                            className="bg-transparent"
                        />
                    </div>
                ) : mode === 'activity' ? (
                    <Command className="bg-transparent" shouldFilter={false}>
                        <div className="flex items-center px-4 py-4 border-b border-primary/10 relative">
                            <CommandInput
                                placeholder="type to search activities..."
                                value={query}
                                onValueChange={setQuery}
                                className="flex-1 h-8 bg-transparent border-none focus:ring-0 text-lg lowercase placeholder:text-muted-foreground/50"
                                autoFocus
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-4 top-1/2 -translate-y-1/2 h-7 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => { setMode('command'); setQuery(''); }}
                            >
                                back
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <CommandList className="pb-4">
                                <CommandEmpty className="p-8 text-center text-muted-foreground lowercase">
                                    no activities found. try a different search.
                                </CommandEmpty>

                                {filteredActivities.length > 0 && (
                                    <CommandGroup heading="quick log activity" className="px-2">
                                        {filteredActivities.map((activity) => (
                                            <CommandItem
                                                key={activity.id}
                                                onSelect={() => logActivity(activity)}
                                                className="px-4 py-3 rounded-lg flex items-start gap-3 hover:bg-primary/5 transition-all group cursor-pointer"
                                            >
                                                <span className="text-lg" style={{ color: activity.color }}>
                                                    {activity.emoji}
                                                </span>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium lowercase truncate" style={{ color: '#f6b012' }}>
                                                            {activity.label}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/20 text-primary/60 lowercase">
                                                            {activity.category}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </ScrollArea>

                        <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-primary/5 text-[10px] text-muted-foreground lowercase shrink-0">
                            <div className="flex items-center gap-4">
                                <span><strong>↑↓</strong> to navigate</span>
                                <span><strong>enter</strong> to log</span>
                                <span><strong>esc</strong> to close</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Activity className="h-3 w-3" />
                                <span>activity logging</span>
                            </div>
                        </div>
                    </Command>
                ) : (
                    <Command className="bg-transparent" shouldFilter={false}>
                        <div className="flex items-center px-4 py-4 border-b border-primary/10 relative">
                            <CommandInput
                                placeholder="search your second brain..."
                                value={query}
                                onValueChange={onQueryChange}
                                className="flex-1 h-8 bg-transparent border-none focus:ring-0 text-lg lowercase placeholder:text-muted-foreground/50"
                            />
                            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-primary/40 ml-2" />}

                            <Button
                                variant="ghost"
                                size="sm"
                                className="absolute right-10 top-1/2 -translate-y-1/2 h-7 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => { setMode('semantic'); setQuery(''); }}
                            >
                                <MessageCircle className="w-3 h-3 mr-1" />
                                ask ai
                            </Button>
                        </div>

                        <ScrollArea className="flex-1">
                            <CommandList className="pb-4">
                                <CommandEmpty className="p-8 text-center text-muted-foreground lowercase">
                                    {isSearching ? "tuning into your thoughts..." : "no matches found."}
                                </CommandEmpty>

                                {dbResults.length > 0 && (
                                    <CommandGroup heading="database matches" className="px-2">
                                        {dbResults.map((res, i) => (
                                            <CommandItem
                                                key={`${res.collectionName}-${res.id}-${i}`}
                                                onSelect={() => runAction(() => navigate(`/databases/${res.collectionName}/${res.id}`))}
                                                className="px-4 py-3 rounded-lg flex items-start gap-3 hover:bg-primary/5 transition-all group cursor-pointer"
                                            >
                                                <FileText className="h-4 w-4 text-primary/70 mt-1" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium lowercase truncate">
                                                            {(res.record?.title as string) || (res.record?.name as string) || `record #${res.id}`}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-primary/20 text-primary/60 lowercase">
                                                            {res.collectionTitle || res.collectionName}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                <CommandSeparator className="bg-primary/5 mx-4" />

                                <CommandGroup heading="navigation & actions" className="px-2">
                                    <CommandItem
                                        onSelect={() => setMode('activity')}
                                        className="px-4 py-3 rounded-lg cursor-pointer"
                                    >
                                        <PlusCircle className="mr-3 h-4 w-4 text-[#f6b012]" />
                                        <span className="lowercase" style={{ color: '#f6b012' }}>log activity</span>
                                        <Badge variant="outline" className="ml-2 text-[10px] py-0 h-4 border-[#f6b012]/30 text-[#f6b012]/60 lowercase">
                                            ctrl+shift+a
                                        </Badge>
                                    </CommandItem>
                                    <CommandItem
                                        onSelect={() => {
                                            secureLogger.debug('[Spotlight] Opening Wilson chat...');
                                            setOpen(false);
                                            setChatOpen(true);
                                            secureLogger.debug('[Spotlight] setChatOpen(true) called');
                                        }}
                                        className="px-4 py-3 rounded-lg cursor-pointer"
                                    >
                                        <MessageCircle className="mr-3 h-4 w-4 text-primary/60" />
                                        <span className="lowercase">open wilson chat</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => runAction(() => navigate('/'))} className="px-4 py-3 rounded-lg cursor-pointer">
                                        <Rocket className="mr-3 h-4 w-4 text-primary/60" />
                                        <span className="lowercase">go to dashboard</span>
                                    </CommandItem>
                                    <CommandItem onSelect={() => runAction(() => navigate('/headmates'))} className="px-4 py-3 rounded-lg cursor-pointer">
                                        <User className="mr-3 h-4 w-4 text-primary/60" />
                                        <span className="lowercase">switch headmate context</span>
                                    </CommandItem>
                                </CommandGroup>

                                {collections.length > 0 && query.length === 0 && (
                                    <CommandGroup heading="active databases" className="px-2">
                                        {collections.slice(0, 5).map((col: Collection) => (
                                            <CommandItem
                                                key={col.name}
                                                onSelect={() => runAction(() => navigate(`/databases/${col.name}`))}
                                                className="px-4 py-3 rounded-lg cursor-pointer"
                                            >
                                                <Database className="mr-3 h-4 w-4 text-primary/60" />
                                                <span className="lowercase">{col.title || col.name}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </ScrollArea>

                        <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-primary/5 text-[10px] text-muted-foreground lowercase shrink-0">
                            <div className="flex items-center gap-4">
                                <span><strong>↑↓</strong> to navigate</span>
                                <span><strong>enter</strong> to select</span>
                                <span><strong>esc</strong> to close</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CommandIcon className="h-3 w-3" />
                                <span>spotlight v2.0</span>
                            </div>
                        </div>
                    </Command>
                )}
            </DialogContent>
        </Dialog>
    );
}
