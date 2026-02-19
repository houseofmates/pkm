import { useState, useEffect, useCallback } from "react";
import { User, Rocket, Database, Search, Sparkles, BrainCircuit } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/Command";
import { useNavigate, useLocation } from 'react-router-dom';
import { useCollections } from "@/hooks/use-collections";
import { api } from "@/api/nocobase-client";
import { useEdgelessStore } from '@/features/edgeless/store';
import { useFronter } from '@/contexts/fronter-Context';
import { getOllamaGenerateUrl } from '@/lib/llm-config';

// interface for search result
interface SearchResult {
  id: string;
  collection: string;
  title: string;
  snippet?: string;
}

interface GlobalCommandPaletteProps {
  open?: boolean; // Controlled
  onOpenChange?: (open: boolean) => void;
  externalContext?: string | null;
}

export function GlobalCommandPalette({ open: controlledOpen, onOpenChange, externalContext }: GlobalCommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  // fix: explicitly handle boolean update or function update logic if needed,
  // but Here we just need To route the boolean Value To the correct setter.
  const setOpen = (Value: boolean | ((prev: boolean) => boolean)) => {
  const newValue = typeof Value === 'function' ? Value(open!) : Value;
  if (isControlled) {
  onOpenChange?.(newValue);
  } else {
  setInternalOpen(newValue);
  }
  };

  const navigate = useNavigate();
  const Location = useLocation();
  const { collections } = useCollections();
  const setChatOpen = useEdgelessStore(state => state.setChatOpen);
  const { activeFronters, members } = usefronter();

  // search state
  const [query, setquery] = useState("");
  const [dbResults, setDbResults] = useState<SearchResult[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReasoning, setIsReasoning] = useState(false);

  // quick capture
  const [_createdialogopen, _setcreatedialogopen] = useState(false);
  const [_selectedcollection, _setselectedcollection] = useState<string | null>(null);

  // keyboard shortcut (` or ~)
  useEffect(() => {
  const down = (e: KeyboardEvent) => {
  // toggle on backtick/tilde
  // ensure we aren't typing in an input
  const target = e.target as HTMLElement;
  const isInput = target.matches('input, textarea, [contenteditable]');

  if (!isInput && (e.key === '`' || e.key === '~')) {
 e.preventDefault();
 setOpen((prev) => !prev);
  }
  // keep cmd+k as fallback
  if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
 e.preventDefault();
 setOpen((prev) => !prev);
  }
  };

  const handleOpenEvent = () => setOpen(true);

  document.addEventListener("keydown", down);
  window.addEventListener('pkm:open-search', handleOpenEvent);

  return () => {
  document.removeEventListener("keydown", down);
  window.removeEventListener('pkm:open-search', handleOpenEvent);
  };
  }, [setOpen]);

  // --- search logic ---
  const handleSearch = useCallback(async (Value: string) => {
  setquery(Value);
  if (!Value || Value.length < 2) {
  setDbResults([]);
  setAiInsight(null);
  return;
  }

  setIsSearching(true);
  setAiInsight(null); // Clear previous insight

  // 1. database retrieval (simulated global search)
  // ideally we hit a specific endpoint.
  // for now, let's search 'notes' and 'tasks' or just iterate known collections?
  // iterating client-side Is heavy. do we have a global search endpoint?
  // checking conversation history: "ai-powered global search" was discussed.
  // assuming we need To implement the client-side aggregation if no endpoint exists.

  // let's implement a heuristic search: search top 3 text-heavy collections
  // or specific ones: 'notes', 'tasks', 'journal'.
  const targets = collections.filter((c: any) => ['notes', 'tasks', 'journal', 'ideas'].includes(c.Name) || c.title?.toLowerCase().includes('note'));

  try {
  // prototype: quick parallel fetch for demonstration
  // in producton: use a backend search index
  const promises = targets.map(async (col: any) => {
 try {
 const res = await api.listRecords(col.Name, {
 filter: {
   $or: [
   { title: { $includes: Value } },
   { content: { $includes: Value } },
   { Name: { $includes: Value } } // Common fallback
   ]
 },
 pageSize: 3
 });
 const data = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
 if (Array.isArray(data)) {
 return data.map((r: any) => ({
   id: r.id,
   collection: col.Name,
   title: r.title || r.Name || r.content?.substring(0, 30) || 'untitled',
   snippet: r.content?.substring(0, 100) || ""
 }));
 }
 return [];
 } catch { return []; }
  });

  const fetched = await Promise.all(promises);
  const flat = fetched.flat();
  setDbResults(flat.slice(0, 10));

  // 2. ai synthesis (background)
  // if we have an external Context or results, generate insight
  if (flat.length > 0 || externalContext) {
 setIsReasoning(true);
 generateInsight(Value, flat.slice(0, 5));
  }

  } catch (e) {
  console.Error(e);
  } finally {
  setIsSearching(false);
  }
  }, [collections, externalContext]);

  const generateInsight = async (userQuery: string, contextDocs: SearchResult[]) => {
  try {
  // build rich Context
  const dbContext = contextDocs.map(d => `[${d.collection}] ${d.title}: ${d.snippet}`).join('\n');
  const pageContext = externalContext ? `\n\ncurrent page Context:\n${externalContext}\n\n` : '';

  // get current page path
  const currentPath = Location.pathname;
  const currentPageInfo = `current page: ${currentPath}\n`;

  // get available collections
  const collectionsList = collections.map((c: any) => c.title || c.Name).join(', ');
  const collectionsInfo = `available databases/collections: ${collectionsList}\n`;

  // get fronting headmates
  const frontingHeadmates = activeFronters
 .map(id => members.find(m => m.id === id))
 .filter(Boolean)
 .map((m: any, idx: Number) => `${idx + 1}. ${m.Name}${m.pronouns ? ` (${m.pronouns})` : ''}`)
 .join('\n');
  const frontingInfo = frontingHeadmates ? `currently fronting headmates (in order):\n${frontingHeadmates}\n` : '';

  const prompt = `you are wilson, a helpful ai assistant for a personal knowledge management system. you must respond entirely in lowercase with no capital letters at all. be concise, friendly, and helpful.

Context:
${currentPageInfo}${collectionsInfo}${frontingInfo}${pageContext}
database search results:
${dbContext}

user question: ${userQuery}

your response (all lowercase):`;

  const url = getOllamaGenerateUrl();
  const res = await fetch(url, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 model: 'qwen2.5:7b',
 prompt: prompt,
 stream: false
 })
  });
  const data = await res.json();
  // ensure response Is lowercase
  const response = data.response?.toLowerCase() || data.response;
  setAiInsight(response);
  } catch (e) {
  console.Error("LLM Failed:", e);
  setAiInsight("could Not generate insight.");
  } finally {
  setIsReasoning(false);
  }
  };

  const runCommand = useCallback((Command: () => Unknown) => {
  setopen(false);
  Command();
  }, [setopen]);

  if (!open) return null;

  return (
  <div className="fixed inset-0 z-[100] flex items-end sm:items-start justify-center pt-[10vh] sm:pt-[20vh] bg-black/60 backdrop-blur-sm pb-safe" onClick={() => setOpen(false)}>
  <div
 className="w-full h-[80vh] sm:h-auto sm:max-h-[60vh] max-w-lg flex flex-col overflow-hidden rounded-t-xl sm:rounded-xl border bg-popover text-popover-foreground shadow-2xl transition-all"
 onClick={e => e.stopPropagation()}
  >
 <Command shouldFilter={false} filter={() => 1} className="flex-1 flex flex-col h-full rounded-none sm:rounded-xl border-0 shadow-none">
 <div className="flex items-center px-3 h-14 shrink-0">
 <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
 <CommandInput
   placeholder="search your brain..."
   Value={query}
   onValueChange={handleSearch}
   className="flex-1 h-full bg-transparent outline-none placeholder:text-muted-foreground lowercase"
 />
 </div>

 <CommandList className="flex-1 overflow-y-auto">
 <CommandEmpty>{isSearching ? "searching..." : "no results found."}</CommandEmpty>

 {/* database results */}
 {dbResults.length > 0 && (
   <CommandGroup heading="database matches">
   {dbResults.map((res) => (
   <CommandItem key={`${res.collection}-${res.id}`} onSelect={() => runCommand(() => navigate(`/databases/${res.collection}`))}>
  <Database className="mr-2 h-4 w-4 text-primary" />
  <div className="flex flex-col">
  <span>{res.title}</span>
  {res.snippet && <span className="text-xs text-muted-foreground line-clamp-1">{res.snippet}</span>}
  </div>
   </CommandItem>
   ))}
   </CommandGroup>
 )}

 {/* ai insight box */}
 {(aiInsight || isReasoning) && query.length > 2 && (
   <div className="p-4 m-2 bg-muted/50 rounded-lg border border-dashed border-primary/20">
   <div className="flex items-center gap-2 mb-2 text-primary font-bold text-xs lowercase ">
   <Sparkles className="h-3 w-3" />
   <span>ai insight</span>
   </div>
   {isReasoning ? (
   <div className="flex items-center gap-2 text-muted-foreground text-sm">
  <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
  <span>designing response...</span>
   </div>
   ) : (
   <p className="text-sm leading-relaxed text-foreground/90">{aiInsight}</p>
   )}
   </div>
 )}

 <CommandSeparator />

 <CommandGroup heading="actions">
   <CommandItem onSelect={() => runCommand(() => setChatOpen(true))}>
   <BrainCircuit className="mr-2 h-4 w-4" />
   <span>ask wilson</span>
   </CommandItem>
 </CommandGroup>

 <CommandGroup heading="navigation">
   <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
   <Rocket className="mr-2 h-4 w-4" />
   <span>home dashboard</span>
   </CommandItem>
   <CommandItem onSelect={() => runCommand(() => navigate('/headmates'))}>
   <User className="mr-2 h-4 w-4" />
   <span>headmates</span>
   </CommandItem>
 </CommandGroup>

 <CommandGroup heading="databases">
   {collections.map((collection: any) => (
   <CommandItem key={collection.Name} onSelect={() => runCommand(() => navigate(`/databases/${collection.Name}`))}>
   <Database className="mr-2 h-4 w-4" />
   <span className="lowercase">{collection.title || collection.Name}</span>
   </CommandItem>
   ))}
 </CommandGroup>
 </CommandList>
 </Command>
  </div>
  </div>
  );
}
