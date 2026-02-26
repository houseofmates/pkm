// shared types between the ai worker and the main thread
// both sides import this file — no runtime dependencies

export interface AIWorkerAPI {
    /** search knowledge base (vector or fallback keyword) */
    searchKnowledgeBase(query: string, topK?: number): Promise<SearchResultDTO[]>;

    /** generate an embedding vector for a string */
    generateEmbedding(text: string): Promise<number[]>;

    /** build rag context and return a formatted prompt */
    buildRagPrompt(query: string, fronterName?: string): Promise<RagPromptResult>;

    /**
     * stream a chat completion from ollama.
     * `onToken` is called with the cumulative content on each chunk.
     * the comlink caller wraps its callback with `Comlink.proxy(cb)`.
     */
    chatStream(
        prompt: string,
        model: string,
        endpoint: string,
        onToken: (cumulativeContent: string) => void,
    ): Promise<string>;

    /**
     * full ask-with-rag pipeline:
     * 1. build rag context
     * 2. stream response from ollama
     * returns the final complete response.
     * `onToken` receives cumulative streamed text.
     */
    askWithRag(
        query: string,
        fronterName: string,
        model: string,
        endpoint: string,
        onToken: (cumulativeContent: string) => void,
    ): Promise<AskWithRagResult>;

    /** non-streaming generate (legacy fallback) */
    generateText(
        prompt: string,
        model: string,
        endpoint: string,
    ): Promise<string | null>;
}

export interface SearchResultDTO {
    chunk: {
        id: string;
        collection: string;
        recordId: string | number;
        field: string;
        content: string;
        metadata?: Record<string, string | number | boolean | null | undefined>;
    };
    score: number;
}

export interface RagPromptResult {
    prompt: string;
    sources: string[];
}

export interface AskWithRagResult {
    response: string;
    sources: string[];
}
