// vector store client for rag retrieval
// supports nocobase ai knowledge base or local lancedb

import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface VectorChunk {
  id: string;
  collection: string;
  recordId: string | number;
  field: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  score?: number;
}

export interface SearchResult {
  chunk: VectorChunk;
  score: number;
}

// configuration for vector store
const VECTOR_CONFIG = {
  // nocobase ai knowledge base endpoints
  knowledgeBaseId: 'pkm-global-kb',
  chunkSize: 512,
  chunkOverlap: 128,
  topK: 8,
  // local ollama embedding endpoint (fallback)
  embeddingModel: 'nomic-embed-text',
  embeddingEndpoint: 'http://localhost:11434/api/embeddings',
};

// generate embeddings using ollama
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch(VECTOR_CONFIG.embeddingEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: VECTOR_CONFIG.embeddingModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`embedding request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    secureLogger.error('failed to generate embedding:', error);
    throw error;
  }
}

// search nocobase ai knowledge base
export async function searchKnowledgeBase(
  query: string,
  topK: number = VECTOR_CONFIG.topK
): Promise<SearchResult[]> {
  try {
    // try nocobase native ai knowledge base first
    const response = await api.client.post('/ai-knowledge-base:search', {
      knowledgeBaseId: VECTOR_CONFIG.knowledgeBaseId,
      query,
      topK,
    });

    if (response.data?.data) {
      return response.data.data.map((item: any) => ({
        chunk: {
          id: item.id,
          collection: item.collection,
          recordId: item.recordId,
          field: item.field,
          content: item.content,
          metadata: item.metadata,
        },
        score: item.score || 0,
      }));
    }

    return [];
  } catch (error) {
    secureLogger.warn('nocobase kb search failed, falling back to local:', error);
    return fallbackLocalSearch(query, topK);
  }
}

// fallback: search using local collection data with simple similarity
async function fallbackLocalSearch(query: string, topK: number): Promise<SearchResult[]> {
  try {
    // fetch all collections
    const collectionsRes = await api.listCollections();
    const collections = Array.isArray(collectionsRes.data)
      ? collectionsRes.data
      : (collectionsRes.data as any)?.data || [];

    const systemCollections = ['users', 'roles', 'attachments', 'collection_fields', 'collections'];
    const userCollections = collections.filter((c: any) => {
      const name = (c.name || '').toLowerCase();
      return !systemCollections.includes(name) && !c.hidden && !name.includes('pkm_');
    });

    const allChunks: VectorChunk[] = [];

    // fetch records from each collection
    for (const col of userCollections.slice(0, 5)) {
      try {
        const recordsRes: any = await api.listRecords(col.name, {
          pageSize: 20,
          sort: ['-updatedAt'],
        });

        const records = Array.isArray(recordsRes.data)
          ? recordsRes.data
          : (recordsRes.data as any)?.data || [];

        for (const record of records) {
          // extract text fields as chunks
          const textFields = Object.entries(record).filter(([key, value]) => {
            return typeof value === 'string' &&
                   value.length > 50 &&
                   !key.includes('id') &&
                   !key.includes('created') &&
                   !key.includes('updated');
          });

          for (const [field, value] of textFields) {
            // simple chunking
            const chunks = chunkText(String(value), VECTOR_CONFIG.chunkSize, VECTOR_CONFIG.chunkOverlap);
            for (let i = 0; i < chunks.length; i++) {
              allChunks.push({
                id: `${col.name}:${record.id}:${field}:${i}`,
                collection: col.name,
                recordId: record.id,
                field,
                content: chunks[i],
                metadata: {
                  recordTitle: record.title || record.name || `record ${record.id}`,
                  updatedAt: record.updatedAt,
                },
              });
            }
          }
        }
      } catch (e) {
        secureLogger.warn(`failed to fetch ${col.name}:`, e);
      }
    }

    // simple keyword-based scoring (fallback when no embeddings)
    const queryWords = query.toLowerCase().split(/\s+/);
    const scored = allChunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;
      for (const word of queryWords) {
        if (contentLower.includes(word)) score += 1;
        // bonus for exact phrase match
        if (contentLower.includes(query.toLowerCase())) score += 5;
      }
      // recency boost
      const daysSinceUpdate = chunk.metadata?.updatedAt
        ? (Date.now() - new Date(chunk.metadata.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
        : 365;
      score *= Math.max(0.5, 1 - (daysSinceUpdate / 30)); // decay over 30 days

      return { chunk, score };
    });

    // sort by score and return top k
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  } catch (error) {
    secureLogger.error('fallback search failed:', error);
    return [];
  }
}

// chunk text into overlapping segments
function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    // try to break at sentence or word boundary
    let breakPoint = end;
    if (end < text.length) {
      // look for sentence end
      const sentenceEnd = text.lastIndexOf('.', end);
      if (sentenceEnd > start && sentenceEnd > end - 50) {
        breakPoint = sentenceEnd + 1;
      } else {
        // look for word boundary
        const spaceIndex = text.lastIndexOf(' ', end);
        if (spaceIndex > start) {
          breakPoint = spaceIndex;
        }
      }
    }

    chunks.push(text.slice(start, breakPoint).trim());
    start = breakPoint - overlap;
    if (start >= breakPoint) start = breakPoint; // safety
  }

  return chunks.filter(c => c.length > 20);
}

// format chunks for prompt injection
export function formatChunksForPrompt(chunks: SearchResult[]): string {
  return chunks
    .map((result, i) => {
      const chunk = result.chunk;
      const source = `[source: ${chunk.collection}:${chunk.recordId}]`;
      const score = result.score ? `(relevance: ${(result.score * 100).toFixed(1)}%)` : '';
      return `${i + 1}. ${source} ${score}\n${chunk.content}\n`;
    })
    .join('\n');
}

// index a single record to knowledge base
export async function indexRecord(
  collection: string,
  recordId: string | number,
  fields: Record<string, string>
): Promise<boolean> {
  try {
    const chunks: Omit<VectorChunk, 'id' | 'embedding'>[] = [];

    for (const [fieldName, content] of Object.entries(fields)) {
      if (typeof content !== 'string' || content.length < 50) continue;

      const textChunks = chunkText(content, VECTOR_CONFIG.chunkSize, VECTOR_CONFIG.chunkOverlap);
      for (let i = 0; i < textChunks.length; i++) {
        chunks.push({
          collection,
          recordId,
          field: fieldName,
          content: textChunks[i],
          metadata: {
            chunkIndex: i,
            totalChunks: textChunks.length,
          },
        });
      }
    }

    // send to nocobase for indexing
    await api.client.post('/ai-knowledge-base:index', {
      knowledgeBaseId: VECTOR_CONFIG.knowledgeBaseId,
      chunks: chunks.map(c => ({
        ...c,
        id: `${collection}:${recordId}:${c.field}:${c.metadata?.chunkIndex}`,
      })),
    });

    return true;
  } catch (error) {
    secureLogger.error('failed to index record:', error);
    return false;
  }
}

// delete record from knowledge base
export async function deleteRecordFromIndex(
  collection: string,
  recordId: string | number
): Promise<boolean> {
  try {
    await api.client.post('/ai-knowledge-base:delete', {
      knowledgeBaseId: VECTOR_CONFIG.knowledgeBaseId,
      filter: {
        collection,
        recordId,
      },
    });
    return true;
  } catch (error) {
    secureLogger.error('failed to delete from index:', error);
    return false;
  }
}

// reindex entire collection
export async function reindexCollection(collection: string): Promise<{ indexed: number; failed: number }> {
  const result = { indexed: 0, failed: 0 };

  try {
    const recordsRes: any = await api.listRecords(collection, { paginate: false });
    const records = Array.isArray(recordsRes.data)
      ? recordsRes.data
      : (recordsRes.data as any)?.data || [];

    for (const record of records) {
      // extract all text fields
      const textFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' && value.length > 50) {
          textFields[key] = value;
        }
      }

      if (Object.keys(textFields).length > 0) {
        const success = await indexRecord(collection, record.id, textFields);
        if (success) {
          result.indexed++;
        } else {
          result.failed++;
        }
      }
    }
  } catch (error) {
    secureLogger.error(`failed to reindex ${collection}:`, error);
    result.failed++;
  }

  return result;
}

export { VECTOR_CONFIG };
