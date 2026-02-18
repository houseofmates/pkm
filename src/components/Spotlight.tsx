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
import { OllamaClient } from '@/api/ollama-client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const ollama = new OllamaClient();
const API_BASE = (import.meta.env.VITE_PKM_API_URL as string) || 'http://localhost:4110';

interface SearchResult {
    id: string;
    collectionName?: string;
    collectionTitle?: string;
    record?: Record<string, unknown>;
    score?: number;
}

export function Spotlight() {
    const [open, setopen] = usestate(false);
    const [query, setquery] = usestate("");
    const [dbresults, setdbresults] = usestate<SearchResult[]>([]);
    const [aiinsight, setaiinsight] = usestate<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    const navigate = useNavigate();
    const { collections } = useCollections();
    const setChatOpen = useEdgelessStore(state => state.setchatopen);

    const searchtimeout = useref<NodeJS.Timeout | null>(null);

    // keyboard shortcuts
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.matches('input, textarea, [contenteditable]');

            if (!isInput && (e.key === '`' || e.key === '~')) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((prev) => !prev);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery("");
            setDbResults([]);
            setAiInsight(null);
            setIsSearching(false);
            setIsAiLoading(false);
        }
    }, [open]);

    const performSearch = async (val: string) => {
        if (!val || val.length < 2) {
            setDbResults([]);
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`${API_BASE}/search`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ q: val, topK: 8 }),
            });
            if (res.ok) {
                const data = await res.json();
                setDbResults(data.results || []);

                // trigger ai reflection if we have results
                if (data.results?.length > 0) {
                    generateAiInsight(val, data.results);
                }
            }
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    const generateAiInsight = async (userQuery: string, results: SearchResult[]) => {
        setIsAiLoading(true);
        setAiInsight("");

        try {
            let context = `user query: "${userQuery}"\n\nsearch results from database:\n`;
            results.forEach((res) => {
                context += `- [${res.collectionTitle || res.collectionName}] ${JSON.stringify(res.record).slice(0, 300)}\n`;
            });

            await ollama.ask(userQuery, context, (content) => {
                setAiInsight(content);
            });
        } catch (e) {
            console.error("AI Insight failed", e);
            setAiInsight("could not generate insight at this time.");
        } finally {
            setIsAiLoading(false);
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
        setopen(false);
        action();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[750px] p-0 gap-0 bg-background/60 backdrop-blur-2xl border-primary/20 shadow-3xl overflow-hidden rounded-2xl">
                <Command className="bg-transparent" shouldFilter={false}>
                    <div className="flex items-center px-4 py-4 border-b border-primary/10">
                        <Search className="mr-3 h-5 w-5 text-primary/60" />
                        <CommandInput
                            placeholder="search your second brain..."
                            value={query}
                            onValueChange={onQueryChange}
                            className="flex-1 h-8 bg-transparent border-none focus:ring-0 text-lg lowercase placeholder:text-muted-foreground/50"
                        />
                        {issearching && <Loader2 className="h-4 w-4 animate-spin text-primary/40 ml-2" />}
                    </div>

                    <ScrollArea className="max-h-[70vh]">
                        <CommandList className="pb-4">
                            <CommandEmpty className="p-8 text-center text-muted-foreground lowercase">
                                {issearching ? "tuning into your thoughts..." : "no matches found across your database."}
                            </CommandEmpty>

                            {/* ai insight section (premium) */}
                            {(aiInsight || isAiLoading) && query.length > 2 && (
                                <div className="px-4 py-4 mb-2">
                                    <div className="bg-primary/5 rounded-xl border border-primary/10 p-5 space-y-3 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Sparkles className="h-12 w-12 text-primary" />
                                        </div>
                                        <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider lowercase">
                                            <Sparkles className="h-4 w-4 animate-pulse" />
                                            <span>wilson's reflection</span>
                                        </div>
                                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap min-h-[1.5em] lowercase">
                                            {aiinsight}
                                            {isailoading && <span className="inline-block w-1.5 h-4 ml-1 bg-primary/50 animate-pulse align-middle" />}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* search results */}
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
                                                        {res.collectiontitle || res.collectionname}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground/70 line-clamp-1 italic font-light lowercase">
                                                    {res.record?.content ? string(res.record.content).substring(0, 120) : "no preview available"}
                                                </p>
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
                                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                                        <span className="text-xs">⌘</span>c
                                    </kbd>
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

                    <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-primary/5 text-[10px] text-muted-foreground lowercase">
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
            </DialogContent>
        </Dialog>
    );
}
