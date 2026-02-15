
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Bot, Sparkles, Database, FileText } from 'lucide-react';
import { OllamaClient } from '@/api/ollama-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';

const ollama = new OllamaClient();

interface GlobalSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface SearchResult {
    collectionName: string;
    collectionTitle: string;
    record: any;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
    const { client } = useAuth();
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    // Auto-focus input
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
            // Reset state on open
            setQuery('');
            setResponse(null);
            setSearchResults([]);
            setHasSearched(false);
            setStatus('');
        }
    }, [open]);

    const performSearch = async (term: string) => {
        if (!term.trim()) return []; // Fix implicit undefined
        setStatus('Searching databases...');
        setSearchResults([]);
        setHasSearched(false);

        try {
            // 1. Get Collections
            const collectionsRes = await client.listCollections({ params: { paginate: false } });
            const allCollections = collectionsRes.data || [];

            // Filter relevant collections
            const collections = allCollections.filter((c: any) => {
                const name = (c.name || '').toLowerCase();
                const system = ['users', 'roles', 'attachments', 'collection_fields', 'collections', 'ui_schemas', 'application_installations', 'cas_providers'];
                if (system.includes(name)) return false;
                if (name.includes('pkm_settings')) return false;
                if (c.hidden) return false;
                return true;
            });

            // 2. Search each collection
            // We need to know which fields are searchable (string/text)
            // If fields are not loaded in listCollections, we might have to fetch them or assume common names.
            // listCollections usually returns fields? Or we check common ones plus any string field.

            const results: SearchResult[] = [];

            await Promise.all(collections.map(async (col: any) => {
                // Determine text fields to search
                const textFields = (col.fields || [])
                    .filter((f: any) => ['string', 'text', 'markdown', 'richText', 'email', 'phone'].includes(f.type) && !f.hidden)
                    .map((f: any) => f.name);

                // If no fields metadata, fallback to common names
                if (textFields.length === 0) {
                    textFields.push('title', 'name', 'description', 'content', 'notes', 'text');
                }

                // Build Filter
                const searchFilter = {
                    $or: textFields.map((field: string) => ({ [field]: { $includes: term } }))
                };

                try {
                    const res = await client.listRecords(col.name, {
                        filter: searchFilter,
                        pageSize: 3, // Limit hits per collection
                    });

                    const hits = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
                    hits.forEach((rec: any) => {
                        results.push({
                            collectionName: col.name,
                            collectionTitle: col.title || col.displayName || col.name,
                            record: rec
                        });
                    });
                } catch (e) {
                    // Ignore errors for specific collections (e.g. no permission)
                }
            }));

            setSearchResults(results);
            setHasSearched(true);
            return results;

        } catch (error) {
            console.error("Search failed:", error);
            setStatus('Search failed.');
            return [];
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResponse(null);

        // 1. Perform Search
        const results = await performSearch(query);

        // 2. Ask AI
        setStatus('thinking...');
        try {
            let context = `user query: "${query}"\n\nsearch results from database:\n`;
            if (results && results.length > 0) { // Check existence
                results.forEach(res => {
                    const recStr = JSON.stringify(res.record);
                    context += `- [${res.collectionTitle}] ${recStr}\n`;
                });
            } else {
                context += "no direct matches found in the database.\n";
            }

            const answer = await ollama.ask(query, context);
            setResponse(answer);
        } catch (error) {
            console.error(error);
            setResponse("error connecting to ai.");
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl">
                <DialogHeader className="px-4 py-4 border-b bg-muted/20">
                    <DialogTitle className="hidden">search</DialogTitle>
                    <form onSubmit={handleSearch} className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search databases or ask AI..."
                            className="border-none shadow-none focus-visible:ring-0 bg-transparent text-lg h-auto p-0 placeholder:text-muted-foreground/60"
                        />
                        {loading && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
                    </form>
                </DialogHeader>

                <div className="flex flex-col max-h-[70vh]">
                    <ScrollArea className="flex-1 p-0">
                        <div className="p-4 space-y-6">

                            {/* Loading State */}
                            {loading && !response && (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                                    <Sparkles className="h-8 w-8 animate-spin text-primary/50" />
                    <p className="text-sm font-medium animate-pulse lowercase">{status}</p>
                            {hasSearched && searchResults.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground lowercase tracking-wider px-1">
                                        <Database className="h-3 w-3" />
                                        found {searchResults.length} matches
                                    </div>
                                    <div className="grid gap-2">
                                        {searchResults.map((res, i) => (
                                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors group">
                                                <div className="mt-1">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline" className="text-[10px] py-0 h-4 lowercase">{res.collectionTitle}</Badge>
                                                        <span className="text-sm font-medium truncate lowercase">
                                                            {res.record.title || res.record.name || `record #${res.record.id}`}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground line-clamp-2 font-mono opacity-80">
                                                        {JSON.stringify(res.record).slice(0, 150)}...
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* No Results State */}
                            {hasSearched && searchResults.length === 0 && !loading && (
                                <div className="text-center py-4 text-sm text-muted-foreground lowercase">
                                    no database matches found. asking ai...
                                </div>
                            )}

                            {/* AI Response Section */}
                            {response && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <Separator className="my-2" />
                                    <div className="flex items-start gap-4">
                                        <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                                            <Bot className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="font-semibold text-sm text-primary lowercase">assistance</div>
                                            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed text-muted-foreground lowercase">
                                                <div className="whitespace-pre-wrap">{response}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </ScrollArea>
                </div>

                {/* Footer */}
                <div className="p-2 border-t bg-muted/10 flex justify-between items-center text-[10px] text-muted-foreground px-4 lowercase">
                    <span><strong>enter</strong> to search</span>
                    <span>powered by <strong>qwen2.5:7b</strong> @ 192.168.4.232:11434</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Helper component for separator if needed, or import from ui
function Separator({ className }: { className?: string }) {
    return <div className={`h-px bg-border ${className}`} />;
}
