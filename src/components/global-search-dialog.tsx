import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Search, Bot, Sparkles, Database, FileText } from 'lucide-react';
import { OllamaClient } from '@/api/ollama-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import usePkmStore from '@/store/usePkmStore';
import SearchBar from './search/SearchBar';

const ollama = new OllamaClient();

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const searchResults = usePkmStore((s: { searchResults: Array<{ collectionName?: string; collectionTitle?: string; record?: Record<string, unknown>; id?: string; score?: number }> }) => s.searchResults);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResponse(null);
      setStatus('');
    }
  }, [open]);

  // semantic search is handled by searchbar -> backend lancedb -> results written to zustand store

  const handleSemanticSearch = async (q: string) => {
    if (!q || !q.trim()) return;
    setLoading(true);
    setResponse(null);
    setStatus('thinking...');
    try {
      setQuery(q);
      // build context from store searchresults (already written by searchbar)
      const results = searchResults || [];
      let context = `user query: "${q}"\n\nsearch results from database:\n`;
      if (results.length > 0) {
      results.forEach((res: { collectionName?: string; collectionTitle?: string; record?: Record<string, unknown>; id?: string; score?: number }) => {
        context += `- [${res.collectionTitle || res.collectionName}] ${JSON.stringify(res.record)}\n`;
      });

      } else {
        context += 'no direct matches found in the database.\n';
      }
      const answer = await ollama.ask(q, context.toLowerCase());
      setResponse(String(answer).toLowerCase());
    } catch (err) {
      console.error('ai ask error', err);
      setResponse('error connecting to ai.');
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
          <form onSubmit={(e) => { e.preventDefault(); handleSemanticSearch(query); }} className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <SearchBar onSearched={(q) => handleSemanticSearch(q)} />
            {loading && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
          </form>
        </DialogHeader>

        <div className="flex flex-col max-h-[70vh]">
          <ScrollArea className="flex-1 p-0">
            <div className="p-4 space-y-6">
              {loading && !response && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-3">
                  <Sparkles className="h-8 w-8 animate-spin text-primary/50" />
                  <p className="text-sm font-medium animate-pulse lowercase">{status}</p>
                </div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground lowercase px-1">
                    <Database className="h-3 w-3" />
                    found {searchResults.length} matches
                  </div>
                  <div className="grid gap-2">
                    {searchResults.map((res: { collectionName?: string; collectionTitle?: string; record?: Record<string, unknown>; id?: string; score?: number }, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors group">
                        <div className="mt-1">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] py-0 h-4 lowercase">{(res.collectionTitle || res.collectionName) ?? 'record'}</Badge>
                            <span className="text-sm font-medium truncate lowercase">
                              {res.record ? ((res.record.title as string) || (res.record.name as string) || `record #${res.record.id}`) : `id: ${res.id} (score: ${Number(res.score).toFixed(3)})`}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2 font-mono opacity-80">
                            {res.record ? JSON.stringify(res.record).slice(0, 150) : `id: ${res.id} • score: ${Number(res.score).toFixed(4)}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults && searchResults.length === 0 && !loading && (
                <div className="text-center py-4 text-sm text-muted-foreground lowercase">
                  no database matches found. asking ai...
                </div>
              )}

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

        <div className="p-2 border-t bg-muted/10 flex justify-between items-center text-[10px] text-muted-foreground px-4 lowercase">
          <span><strong>enter</strong> to search</span>
          <span>powered by <strong>qwen2.5:7b</strong> @ {import.meta.env.VITE_OLLAMA_URL || 'localhost:11434'}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={`h-px bg-border ${className}`} />;
}
