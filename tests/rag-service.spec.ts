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

  it('generateWilsonRagPrompt includes query and inserts context', async () => {
    const fakeChunks: vectorStore.SearchResult[] = [
      { chunk: { id: '1', collection: 'notes', recordId: 'a', field: 'body', content: 'some context text' }, score: 1 },
    ];
    vi.spyOn(vectorStore, 'searchKnowledgeBase').mockResolvedValue(fakeChunks);

    const prompt = await (await import('@/services/rag-service')).generateWilsonRagPrompt('hello', 'alice');
    expect(prompt).toContain('hello');
    expect(prompt).toContain('some context text');
    expect(prompt).toContain('alice');
  });

  it('system prompt contains expected personality traits', async () => {
    const { WILSON_RAG_SYSTEM_PROMPT, CROSS_REFERENCE_PROMPT } = await import('@/lib/rag-prompts');
    expect(WILSON_RAG_SYSTEM_PROMPT).toMatch(/warm, thoughtful/);
    expect(WILSON_RAG_SYSTEM_PROMPT).toMatch(/retrieved context format/);
    // cross-reference prompt should reference collection:id pattern
    expect(CROSS_REFERENCE_PROMPT).toContain('[[collection:id]]');
  });

  it('returns fallback message when nothing is found', async () => {
    vi.spyOn(vectorStore, 'searchKnowledgeBase').mockResolvedValue([]);
    const ctx = await buildRagContext('no results', 3);
    expect(ctx.formattedContext).toMatch(/no relevant context/i);
    expect(ctx.sources).toHaveLength(0);
  });
});
