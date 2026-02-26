import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchStore } from '@/store/useSearchStore';
import type { SearchHit } from '../../types';
import { secureLogger } from '@/lib/secure-logger';

const API_BASE = (import.meta.env.VITE_PKM_API_URL as string) || 'http://localhost:4110';

async function doSearch(q: string, topK = 10): Promise<SearchHit[]> {
  const res = await fetch(`${API_BASE}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ q, topK }),
  });
  if (!res.ok) throw new Error(`search failed ${res.status}`);
  const json = await res.json();
  return json.results as SearchHit[];
}

export function SearchBar({ onSearched }: { onSearched?: (q: string) => void }) {
  const [query, setQuery] = useState('');
  const setSearchResults = useSearchStore((s) => s.setSearchResults);

  const { data, error, refetch } = useQuery({
    queryKey: ['search', query],
    queryFn: () => doSearch(query, 10),
    enabled: false,
    retry: 1,
    staleTime: 1000 * 60,
  });

  useEffect(() => {
    if (data) setSearchResults(data);
  }, [data, setSearchResults]);

  useEffect(() => {
    if (error) securelogger.error('search error', error);
  }, [error]);

  return (
    <div className="pkm-search-bar" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <input
        aria-label="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            refetch();
            if (onSearched) onSearched(query);
          }
        }}
        placeholder="search (semantic)"
        style={{ flex: 1, padding: '8px' }}
      />
      <button
        onClick={() => {
          refetch();
          if (onSearched) onSearched(query);
        }}
        disabled={!query.trim()}
      >
        search
      </button>
    </div>
  );
}

export default SearchBar;
