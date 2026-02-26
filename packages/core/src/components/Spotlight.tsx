import { useState, useEffect, useRef } from "react";
import { User, Rocket, Database, Search, Sparkles, BrainCircuit, FileText, Command as CommandIcon, Loader2 } from "lucide-react";
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
import { useCollections } from "@/hooks/use-collections";
import { useEdgelessStore } from '@/features/edgeless/store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from "@/components/ui/button";
import { SemanticSearch } from "@/components/search/SemanticSearch";




interface SearchResult {
    id: string;
    collectionName?: string;
    collectionTitle?: string;
    record?: Record<string, unknown>;
    score?: number;
}

export function Spotlight() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [dbResults, setDbResults] = useState<SearchResult[]>([]);
    const [externalContext, setExternalContext] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [mode, setMode] = useState<'command' | 'semantic'>('command');

    const navigate = useNavigate();
    const { collections } = useCollections();
    const setChatOpen = useEdgelessStore(state => state.setChatOpen);

    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    // keyboard shortcuts & global events
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.matches('input, textarea, [contenteditable]');
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        const handleOpenSearch = (e: CustomEvent) => {
            setOpen(true);
            if (e.detail?.context) {
                setExternalContext(e.detail.context);
                setQuery(e.detail.context.slice(0, 100));
                setMode('semantic');
            } else {
                setMode('command');
            }
        };

        document.addEventListener("keydown", down);
        window.addEventListener('pkm:open-search', handleOpenSearch as EventListener);
        return () => {
            document.removeEventListener("keydown", down);
            window.removeEventListener('pkm:open-search', handleOpenSearch as EventListener);
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
            collections.forEach(c => {
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

    const runAction = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[750px] p-0 gap-0 bg-background/60 backdrop-blur-2xl border-primary/20 shadow-3xl overflow-hidden rounded-2xl h-[600px] flex flex-col">
                {mode === 'semantic' ? (
                    <div className="flex flex-col h-full">
                        <div className="flex justify-between items-center p-3 border-b border-primary/10 bg-primary/5">
                            <span className="text-xs font-bold pl-2 text-primary flex items-center gap-2">
                                <Sparkles className="w-3 h-3" />
                                SEMANTIC SEARCH
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setMode('command')}
                                className="h-6 text-xs"
                            >
                                Switch to Commands
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
                ) : (
                    <Command className="bg-transparent" shouldFilter={false}>
                        <div className="flex items-center px-4 py-4 border-b border-primary/10 relative">
                            <Search className="mr-3 h-5 w-5 text-primary/60" />
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
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => { setMode('semantic'); setQuery(''); }}
                            >
                                <BrainCircuit className="w-3 h-3 mr-1" />
                                Ask AI
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
                                    <CommandItem onSelect={() => runAction(() => setChatOpen(true))} className="px-4 py-3 rounded-lg cursor-pointer">
                                        <BrainCircuit className="mr-3 h-4 w-4 text-primary/60" />
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
                                        {collections.slice(0, 5).map((col: any) => (
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
