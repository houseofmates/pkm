// ai-worker-core.ts — pure logic extracted from ai.worker.ts
//
// this module contains ALL the ai/vector/rag/streaming logic with
// zero comlink or web-worker dependencies. it can be imported by:
//   1. ai.worker.ts (runs in a dedicated worker thread)
//   2. use-ai-worker.ts main-thread fallback (runs on the ui thread)
//
// a custom `fetchImpl` can be injected at init time so mobile builds
// can route requests through capacitor's native http bridge.

import type { AIWorkerAPI, SearchResultDTO, RagPromptResult, AskWithRagResult } from './ai-worker-types';

// ---------------------------------------------------------------------------
// configuration
// ---------------------------------------------------------------------------

const VECTOR_CONFIG = {
    knowledgeBaseId: 'pkm-global-kb',
    chunkSize: 512,
    chunkOverlap: 128,
    topK: 8,
    embeddingModel: 'nomic-embed-text',
    embeddingEndpoint: 'http://localhost:11434/api/embeddings',
};

// ---------------------------------------------------------------------------
// internal state
// ---------------------------------------------------------------------------

let _apiBaseUrl = '';
let _authToken = '';
let _fetch: typeof globalThis.fetch = globalThis.fetch?.bind(globalThis);

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------

export function init(
    apiBaseUrl: string,
    authToken: string,
    vectorConfig?: Partial<typeof VECTOR_CONFIG>,
    fetchImpl?: typeof globalThis.fetch,
): void {
    _apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
    _authToken = authToken;
    if (vectorConfig) Object.assign(VECTOR_CONFIG, vectorConfig);
    if (fetchImpl) _fetch = fetchImpl;
}

// ---------------------------------------------------------------------------
// internal helpers — fetch wrappers
// ---------------------------------------------------------------------------

async function apiFetch(path: string, body: Record<string, unknown>): Promise<any> {
    const url = `${_apiBaseUrl}${path}`;
    const res = await _fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`api fetch failed: ${res.status} ${res.statusText}`);
    return res.json();
}

async function apiGet(path: string): Promise<any> {
    const url = `${_apiBaseUrl}${path}`;
    const res = await _fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...(_authToken ? { Authorization: `Bearer ${_authToken}` } : {}),
        },
    });
    if (!res.ok) throw new Error(`api get failed: ${res.status} ${res.statusText}`);
    return res.json();
}

// ---------------------------------------------------------------------------
// embedding generation
// ---------------------------------------------------------------------------

async function generateEmbedding(text: string): Promise<number[]> {
    const res = await _fetch(VECTOR_CONFIG.embeddingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: VECTOR_CONFIG.embeddingModel,
            prompt: text,
        }),
    });
    if (!res.ok) throw new Error(`embedding request failed: ${res.status}`);
    const data = await res.json();
    return data.embedding;
}

// ---------------------------------------------------------------------------
// knowledge-base search
// ---------------------------------------------------------------------------

async function searchKnowledgeBase(query: string, topK: number = VECTOR_CONFIG.topK): Promise<SearchResultDTO[]> {
    try {
        const response = await apiFetch('/ai-knowledge-base:search', {
            knowledgeBaseId: VECTOR_CONFIG.knowledgeBaseId,
            query,
            topK,
        });

        if (response?.data) {
            return response.data.map((item: any) => ({
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
    } catch {
        return fallbackLocalSearch(query, topK);
    }
}

async function fallbackLocalSearch(query: string, topK: number): Promise<SearchResultDTO[]> {
    try {
        const colRes = await apiGet('/collections:list');
        const collections: any[] = Array.isArray(colRes?.data) ? colRes.data : colRes?.data?.data || [];

        const systemCollections = ['users', 'roles', 'attachments', 'collection_fields', 'collections'];
        const userCollections = collections.filter((c: any) => {
            const name = (c.name || '').toLowerCase();
            return !systemCollections.includes(name) && !c.hidden && !name.includes('pkm_');
        });

        const allChunks: any[] = [];

        for (const col of userCollections.slice(0, 5)) {
            try {
                const recRes = await apiGet(`/${col.name}:list?pageSize=20&sort[]=-updatedAt`);
                const records: any[] = Array.isArray(recRes?.data) ? recRes.data : recRes?.data?.data || [];

                for (const record of records) {
                    const textFields = Object.entries(record).filter(([key, value]) =>
                        typeof value === 'string' &&
                        (value as string).length > 50 &&
                        !key.includes('id') &&
                        !key.includes('created') &&
                        !key.includes('updated')
                    );

                    for (const [field, value] of textFields) {
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
            } catch {
                // skip collection on error
            }
        }

        // keyword scoring
        const queryWords = query.toLowerCase().split(/\s+/);
        const scored = allChunks.map(chunk => {
            const contentLower = chunk.content.toLowerCase();
            let score = 0;
            for (const word of queryWords) {
                if (contentLower.includes(word)) score += 1;
                if (contentLower.includes(query.toLowerCase())) score += 5;
            }
            const daysSinceUpdate = chunk.metadata?.updatedAt
                ? (Date.now() - new Date(chunk.metadata.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
                : 365;
            score *= Math.max(0.5, 1 - daysSinceUpdate / 30);
            return { chunk, score };
        });

        return scored
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    } catch {
        return [];
    }
}

// ---------------------------------------------------------------------------
// text chunking
// ---------------------------------------------------------------------------

function chunkText(text: string, size: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        const end = Math.min(start + size, text.length);
        let breakPoint = end;
        if (end < text.length) {
            const sentenceEnd = text.lastIndexOf('.', end);
            if (sentenceEnd > start && sentenceEnd > end - 50) {
                breakPoint = sentenceEnd + 1;
            } else {
                const spaceIndex = text.lastIndexOf(' ', end);
                if (spaceIndex > start) breakPoint = spaceIndex;
            }
        }
        chunks.push(text.slice(start, breakPoint).trim());
        start = breakPoint - overlap;
        if (start >= breakPoint) start = breakPoint;
    }
    return chunks.filter(c => c.length > 20);
}

// ---------------------------------------------------------------------------
// rag context building
// ---------------------------------------------------------------------------

function formatChunksForPrompt(chunks: SearchResultDTO[]): string {
    return chunks
        .map((result, i) => {
            const c = result.chunk;
            const source = `[source: ${c.collection}:${c.recordId}]`;
            const score = result.score ? `(relevance: ${(result.score * 100).toFixed(1)}%)` : '';
            return `${i + 1}. ${source} ${score}\n${c.content}\n`;
        })
        .join('\n');
}

async function buildRagContext(query: string, topK: number = 8) {
    try {
        const chunks = await searchKnowledgeBase(query, topK);
        if (chunks.length === 0) {
            return {
                retrievedChunks: [],
                formattedContext: '(no relevant context found in knowledge base)',
                sources: [] as string[],
            };
        }
        const formattedContext = formatChunksForPrompt(chunks);
        const sources = [...new Set(chunks.map(c => `${c.chunk.collection}:${c.chunk.recordId}`))];
        return { retrievedChunks: chunks, formattedContext, sources };
    } catch {
        return {
            retrievedChunks: [],
            formattedContext: '(error retrieving context)',
            sources: [] as string[],
        };
    }
}

const WILSON_RAG_SYSTEM_PROMPT = `you are wilson, a deeply knowledgeable ai assistant with full access to the user's personal knowledge base. you have real-time awareness of their notes, tasks, projects, research, and entire pkm through retrieved context.

your personality:
- warm, thoughtful, and genuinely helpful
- like a romantic partner and best friend combined
- you care about their goals and remember details about their life
- you speak entirely in lowercase, never using capital letters

when responding:
- reference specific information from the retrieved context naturally
- make connections between ideas when relevant
- ask clarifying questions if the context is ambiguous
- be concise but thorough (2-4 sentences unless they ask for detail)
- if you don't find relevant context, say so honestly

retrieved context format:
each chunk starts with [source: collection:id] so you can reference where information came from. use these citations naturally in your response.`;

async function buildRagPrompt(query: string, fronterName: string = 'friend'): Promise<RagPromptResult> {
    const ragCtx = await buildRagContext(query, 8);
    const system = WILSON_RAG_SYSTEM_PROMPT + `\n\ncurrent user: ${fronterName}`;
    const prompt = `${system}\n\nretrieved context from your pkm:\n${ragCtx.formattedContext}\n\ncurrent query from ${fronterName}: ${query}\n\nwilson:`;
    return { prompt, sources: ragCtx.sources };
}

// ---------------------------------------------------------------------------
// llm streaming
// ---------------------------------------------------------------------------

async function chatStream(
    prompt: string,
    model: string,
    endpoint: string,
    onToken: (cumulativeContent: string) => void,
): Promise<string> {
    const response = await _fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: true }),
    });

    if (!response.ok) throw new Error(`llm api error: ${response.statusText}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('could not get stream reader');

    const decoder = new TextDecoder();
    let fullContent = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const json = JSON.parse(line);
                    if (json.response) {
                        fullContent += json.response;
                        onToken(fullContent);
                    }
                    if (json.done) {
                        return fullContent;
                    }
                } catch {
                    // partial json, skip
                }
            }
        }
    } finally {
        // always release the reader to avoid locking the stream
        reader.releaseLock();
    }

    return fullContent;
}

// ---------------------------------------------------------------------------
// non-streaming generate (legacy fallback)
// ---------------------------------------------------------------------------

async function generateTextLegacy(
    prompt: string,
    model: string,
    endpoint: string,
): Promise<string | null> {
    try {
        const res = await _fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false }),
        });
        if (!res.ok) throw new Error(`llm api error: ${res.statusText}`);
        const data = await res.json();
        return data.response ?? null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// composite: full ask-with-rag pipeline
// ---------------------------------------------------------------------------

async function askWithRag(
    query: string,
    fronterName: string,
    model: string,
    endpoint: string,
    onToken: (cumulativeContent: string) => void,
): Promise<AskWithRagResult> {
    const { prompt, sources } = await buildRagPrompt(query, fronterName);
    const response = await chatStream(prompt, model, endpoint, onToken);
    return { response: response.toLowerCase(), sources };
}

// ---------------------------------------------------------------------------
// factory — returns the full API object
// ---------------------------------------------------------------------------

export type WorkerAPIWithInit = AIWorkerAPI & {
    init(
        apiBaseUrl: string,
        authToken: string,
        vectorConfig?: Partial<typeof VECTOR_CONFIG>,
        fetchImpl?: typeof globalThis.fetch,
    ): void;
};

export function createWorkerAPI(fetchImpl?: typeof globalThis.fetch): WorkerAPIWithInit {
    // set the fetch implementation if provided at creation time
    if (fetchImpl) _fetch = fetchImpl;

    return {
        init,
        searchKnowledgeBase,
        generateEmbedding,
        buildRagPrompt,
        chatStream,
        askWithRag,
        generateText: generateTextLegacy,
    };
}
