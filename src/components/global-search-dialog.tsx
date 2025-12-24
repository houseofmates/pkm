
import { useState, useRef, useEffect } from 'react';
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
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Auto-focus input
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setResponse(null); // Clear previous

        try {
            // For now, purely AI search as requested ("powered by it")
            const answer = await ollama.ask(query);
            setResponse(answer);
        } catch (error) {
            console.error(error);
            setResponse("Error connecting to Ollama. Please ensure the endpoint is reachable.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-primary/20">
                <DialogHeader className="px-4 py-4 border-b">
                    <DialogTitle className="hidden">Search</DialogTitle>
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
                        {loading && !response && (
                            <div className="flex items-center gap-2 text-muted-foreground text-sm animate-pulse">
                                <Bot className="h-4 w-4" />
                                <span>Thinking...</span>
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
