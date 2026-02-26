import { useState, useEffect } from 'react';
import { useSemanticSearch } from '@/hooks/use-semantic-search';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Loader2, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemanticSearchProps {
  onSelect: (id: string) => void;
  initialQuery?: string;
  className?: string;
}

export function SemanticSearch({ onSelect, initialQuery = '', className }: SemanticSearchProps) {
  const { search, results, loading, source } = useSemanticSearch();
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim().length > 2) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, search]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <div className={cn("flex flex-col h-full bg-popover text-popover-foreground", className)}>
      <div className="p-3 border-b flex items-center gap-2 shrink-0">
        <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
        <Input
          value={query}
          onChange={handleInputChange}
          placeholder="ask anything..."
          className="border-none shadow-none focus-visible:ring-0 bg-transparent h-8 flex-1 placeholder:lowercase"
          autoFocus
        />
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <ScrollArea className="flex-1 p-2">
        {results.length > 0 ? (
          <div className="space-y-1">
             <div className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 font-bold">
               semantic results ({source})
             </div>
            {results.map((result: any) => (
              <div
                key={result.id}
                onClick={() => onSelect(result.id)}
                className="flex flex-col items-start gap-1 py-2 px-3 rounded-md hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between w-full">
                    <span className="font-medium text-sm truncate">{result.id}</span>
                    <span className="text-xs text-muted-foreground font-mono">{(result.score * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
           debouncedQuery.length > 2 && !loading && (
             <div className="p-8 text-center text-muted-foreground text-sm lowercase">
               no connections found in the vector space.
             </div>
           )
        )}
        {!debouncedQuery && (
            <div className="p-8 text-center text-muted-foreground text-xs lowercase opacity-50">
                type to search deeply...
            </div>
        )}
      </ScrollArea>
    </div>
  );
}
