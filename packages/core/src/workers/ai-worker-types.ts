// shared types between the ai worker and the main thread
// both sides import this file — no runtime dependencies

/** Content part for multimodal messages (text, images, etc.) */
export interface TextContentPart {
    type: 'text';
    text: string;
}

export interface ImageContentPart {
    type: 'image_url';
    image_url: {
        url: string;
    };
}

export type ContentPart = TextContentPart | ImageContentPart;

/** Chat message that can be text-only or multimodal */
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string | ContentPart[];
}

/** Attachment file for multimodal input */
export interface Attachment {
    id: string;
    file: File;
    type: 'image' | 'video' | 'gif' | 'other';
    dataUrl?: string; // base64 data URL for preview and sending
    name: string;
}

export interface ChatResponse {
    model: string;
    created_at: string;
    message: ChatMessage;
    done: boolean;
    total_duration?: number;
}

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
     * stream a multimodal chat completion from ollama (for vision models).
     * supports images/gifs/videos as base64 data URLs.
     */
    chatStreamMultimodal(
        messages: ChatMessage[],
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

    /**
     * ask with rag and optional attachments (multimodal)
     */
    askWithRagAndAttachments(
        query: string,
        fronterName: string,
        model: string,
        endpoint: string,
        onToken: (cumulativeContent: string) => void,
        attachments?: Attachment[],
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
