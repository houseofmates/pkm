import { describe, it, expect, vi } from 'vitest';

import * as vectorStore from '@/lib/vector-store';
import { buildRagContext } from '@/services/rag-service';

describe('RAG service', () => {
  it('buildRagContext formats retrieved chunks correctly', async () => {
    // mock searchKnowledgeBase to return two chunks
    const fakeChunks: vectorStore.SearchResult[] = [
      {
        chunk: {
          id: '1',
          collection: 'notes',
          recordId: 'a',
          field: 'body',
          content: 'this is some relevant content',
        },
        score: 0.9,
      },
      {
        chunk: {
          id: '2',
          collection: 'tasks',
          recordId: 'b',
          field: 'description',
          content: 'other useful text',
        },
        score: 0.75,
      },
    ];

    const searchSpy = vi.spyOn(vectorStore, 'searchKnowledgeBase').mockResolvedValue(fakeChunks);

    const ctx = await buildRagContext('test query', 5);

    expect(searchSpy).toHaveBeenCalledWith('test query', 5);
    expect(ctx.query).toBe('test query');
    expect(ctx.retrievedChunks).toHaveLength(2);
    expect(ctx.formattedContext).toContain('this is some relevant content');
    expect(ctx.sources).toEqual(expect.arrayContaining(['notes:a', 'tasks:b']));
  });

  it('returns fallback message when nothing is found', async () => {
    vi.spyOn(vectorStore, 'searchKnowledgeBase').mockResolvedValue([]);
    const ctx = await buildRagContext('no results', 3);
    expect(ctx.formattedContext).toMatch(/no relevant context/i);
    expect(ctx.sources).toHaveLength(0);
  });
});
