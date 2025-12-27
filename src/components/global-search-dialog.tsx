
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { buildKnowledgeContext } from '@/lib/context-builder';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Bot, Sparkles } from 'lucide-react';
import { OllamaClient } from '@/api/ollama-client';
import { ScrollArea } from '@/components/ui/scroll-area';

const ollama = new OllamaClient();

interface GlobalSearchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
    const { client } = useAuth();
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [status, setStatus] = useState<string>(''); // For granular loading state
    const [loading, setLoading] = useState(false);

    // Auto-focus input
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [open]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setStatus('Reading database...');
        setResponse(null);

        try {
            // 1. Build Context
            const context = await buildKnowledgeContext(client);

            setStatus('Thinking...');
            // 2. Ask AI with Context
            const answer = await ollama.ask(query, context);
            setResponse(answer);
        } catch (error) {
            console.error(error);
            setResponse("Error connecting to Ollama. Please ensure the endpoint is reachable.");
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-primary/20">
                <DialogHeader className="px-4 py-4 border-b">
                    <DialogTitle className="hidden">search</DialogTitle>
                    <form onSubmit={handleSearch} className="flex items-center gap-2">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        <Input
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask AI or search..."
                            className="border-none shadow-none focus-visible:ring-0 bg-transparent text-lg h-auto p-0 placeholder:text-muted-foreground/50"
                        />
                        {loading && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
                    </form>
                </DialogHeader>

                {(response || loading) && (
                    <ScrollArea className="max-h-[60vh] p-4">
                        {loading && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
                                <Bot className="h-4 w-4" />
                                <span>{status || 'Thinking...'}</span>
                            </div>
                        )}
                        {response && (
                            <div className="space-y-4">
                                <div className="flex gap-3 items-start">
                                    <div className="bg-primary/10 p-2 rounded-lg mt-1">
                                        <Bot className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="prose prose-invert prose-sm w-full">
                                        {/* Simple formatting for now */}
                                        <div className="whitespace-pre-wrap">{response}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                )}

                {!response && !loading && (
                    <div className="p-4 text-xs text-muted-foreground text-center opacity-50">
                        Powered by <strong>qwen2.5:7b</strong> @ ollama.houseofmates.space
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
