// use-ai-worker.ts — react hook that provides typed async ai methods.
//
// strategy:
//   1. try to spin up a web worker + comlink proxy (fast, off main thread)
//   2. if the worker fails (mobile webview, CSP, etc) fall back to
//      importing ai-worker-core.ts directly and running on the main thread
//
// the hook is a singleton — every consumer gets the same instance.
// comlink proxy callbacks are properly released after each streaming call
// to prevent MessageChannel / MessagePort memory leaks.

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Comlink from 'comlink';
import type { AIWorkerAPI, ChatMessage, Attachment } from '@/workers/ai-worker-types';
import { storageManager } from '@/lib/storage-manager';
import { normalizeAuthToken } from '@/lib/auth-token';
import { isCapacitorNative, isMobileContext, resolveOllamaEndpoint, MOBILE_SERVER_ORIGIN } from '@/lib/platform';
import { getOllamaBase } from '@/lib/llm-config';
import { secureLogger } from '@/lib/secure-logger';
import type { WorkerAPIWithInit } from '@/workers/ai-worker-core';

// ---------------------------------------------------------------------------
// singleton state
// ---------------------------------------------------------------------------

let _workerInstance: Worker | null = null;
let _proxy: Comlink.Remote<WorkerAPIWithInit> | null = null;
let _mainThreadAPI: WorkerAPIWithInit | null = null;
let _initialized = false;
let _refCount = 0;
let _isMainThread = false;

// ---------------------------------------------------------------------------
// resolve auth + api base (shared by both paths)
// ---------------------------------------------------------------------------

function resolveAuth() {
    const ht = storageManager.getItem('hom_api_key');
    const nt = storageManager.getItem('nocobase_token');
    const gt = storageManager.getItem('hom_guest_key');
    const raw = ht || nt || gt || '';
    return normalizeAuthToken(raw);
}

function resolveApiBase(): string {
    if (isCapacitorNative()) {
        // on mobile the app loads from the remote server, so origin is already correct
        return `${window.location.origin}/api`;
    }
    return `${window.location.origin}/api`;
}

// ---------------------------------------------------------------------------
// build vector config overrides for mobile
// ---------------------------------------------------------------------------

function buildVectorConfig(): Record<string, unknown> | undefined {
    if (!isMobileWebView()) return undefined;
    // rewrite the hardcoded localhost embedding endpoint to go through the server proxy
    return {
        embeddingEndpoint: `${MOBILE_SERVER_ORIGIN}/api/ollama/api/embeddings`,
    };
}

// use the shared mobile detection from platform.ts
function isMobileWebView(): boolean {
    return isMobileContext();
}

function resolveWorkerOllamaBase(): string {
    if (isMobileWebView()) {
        return `${MOBILE_SERVER_ORIGIN}/api/ollama`;
    }
    return getOllamaBase();
}

// ---------------------------------------------------------------------------
// worker path — comlink proxy
// ---------------------------------------------------------------------------

function tryCreateWorker(ollamaBaseUrl: string): { worker: Worker; proxy: Comlink.Remote<WorkerAPIWithInit> } | null {
    try {
        const workerUrl = new URL('../workers/ai.worker.ts', import.meta.url);
        workerUrl.searchParams.set('ollamaBaseUrl', ollamaBaseUrl);
        const worker = new Worker(workerUrl, { type: 'module' });
        const proxy = Comlink.wrap<WorkerAPIWithInit>(worker);
        return { worker, proxy };
    } catch (err) {
        secureLogger.warn('[ai-worker] web worker creation failed, will use main-thread fallback:', err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// main-thread fallback path
// ---------------------------------------------------------------------------

async function getMainThreadAPI(ollamaBaseUrl: string): Promise<WorkerAPIWithInit> {
    if (_mainThreadAPI) return _mainThreadAPI;
    // dynamic import so the bundle only loads this when the worker path fails
    const { createWorkerAPI } = await import('../workers/ai-worker-core');
    _mainThreadAPI = createWorkerAPI(globalThis.fetch.bind(globalThis), { ollamaBaseUrl });
    secureLogger.info('[ai-worker] falling back to main thread execution');
    return _mainThreadAPI;
}

// ---------------------------------------------------------------------------
// unified init
// ---------------------------------------------------------------------------

type AnyAPI = Comlink.Remote<WorkerAPIWithInit> | WorkerAPIWithInit;

async function initAPI(api: AnyAPI, ollamaBaseUrl: string): Promise<void> {
    if (_initialized) return;
    const token = resolveAuth();
    const apiBase = resolveApiBase();
    const vectorConfig = buildVectorConfig();
    await api.init(apiBase, token, vectorConfig, undefined, ollamaBaseUrl);
    _initialized = true;
}

function getOrCreate(ollamaBaseUrl: string): { api: AnyAPI; isMainThread: boolean } {
    // fast path — already created
    if (_proxy) return { api: _proxy, isMainThread: false };
    if (_mainThreadAPI) return { api: _mainThreadAPI, isMainThread: true };

    // try worker first
    const result = tryCreateWorker(ollamaBaseUrl);
    if (result) {
        _workerInstance = result.worker;
        _proxy = result.proxy;
        return { api: _proxy, isMainThread: false };
    }

    // worker failed — we'll lazily init main-thread in the async path
    // for now return a marker
    _isMainThread = true;
    return { api: null as any, isMainThread: true };
}

// ---------------------------------------------------------------------------
// teardown
// ---------------------------------------------------------------------------

function teardown() {
    if (_workerInstance) {
        _workerInstance.terminate();
        _workerInstance = null;
        _proxy = null;
    }
    _mainThreadAPI = null;
    _initialized = false;
    _isMainThread = false;
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useAIWorker() {
    const [isReady, setIsReady] = useState(_initialized);
    const [isMainThread, setIsMainThread] = useState(_isMainThread);
    const apiRef = useRef<AnyAPI | null>(null);

    useEffect(() => {
        _refCount++;
        let cancelled = false;
        const ollamaBaseUrl = resolveWorkerOllamaBase();

        (async () => {
            const { api, isMainThread: mt } = getOrCreate(ollamaBaseUrl);

            let resolvedAPI: AnyAPI;
            if (mt && !api) {
                // need to async-load the main-thread fallback
                resolvedAPI = await getMainThreadAPI(ollamaBaseUrl);
            } else {
                resolvedAPI = api;
            }

            apiRef.current = resolvedAPI;
            if (!cancelled) setIsMainThread(mt);

            await initAPI(resolvedAPI, ollamaBaseUrl);
            if (!cancelled) setIsReady(true);
        })().catch(err => {
            secureLogger.error('[ai-worker] initialization failed:', err);
        });

        return () => {
            cancelled = true;
            _refCount--;
            if (_refCount <= 0) {
                teardown();
                _refCount = 0;
            }
        };
    }, []);

    // --- stable callback wrappers ---

    const search = useCallback(
        async (query: string, topK?: number) => {
            if (!apiRef.current) throw new Error('ai worker not ready');
            return apiRef.current.searchKnowledgeBase(query, topK);
        },
        [],
    );

    const embed = useCallback(
        async (text: string) => {
            if (!apiRef.current) throw new Error('ai worker not ready');
            return apiRef.current.generateEmbedding(text);
        },
        [],
    );

    const chatStream = useCallback(
        async (
            prompt: string,
            model: string,
            endpoint: string,
            onToken: (content: string) => void,
        ) => {
            if (!apiRef.current) throw new Error('ai worker not ready');

            // on mobile, rewrite localhost endpoints to the server proxy
            const resolvedEndpoint = isCapacitorNative()
                ? resolveOllamaEndpoint(endpoint, MOBILE_SERVER_ORIGIN)
                : endpoint;

            if (_isMainThread) {
                // main-thread path — call directly, no comlink proxy needed
                return apiRef.current.chatStream(prompt, model, resolvedEndpoint, onToken);
            }

            // worker path — wrap callback with comlink proxy and release after
            const proxiedOnToken = Comlink.proxy(onToken);
            try {
                return await apiRef.current.chatStream(prompt, model, resolvedEndpoint, proxiedOnToken);
            } finally {
                (proxiedOnToken as any)[Comlink.releaseProxy]?.();
            }
        },
        [],
    );

    const chatStreamMultimodal = useCallback(
        async (
            messages: ChatMessage[],
            model: string,
            endpoint: string,
            onToken: (content: string) => void,
        ) => {
            if (!apiRef.current) throw new Error('ai worker not ready');

            const resolvedEndpoint = isCapacitorNative()
                ? resolveOllamaEndpoint(endpoint, MOBILE_SERVER_ORIGIN)
                : endpoint;

            if (_isMainThread) {
                return apiRef.current.chatStreamMultimodal(messages, model, resolvedEndpoint, onToken);
            }

            const proxiedOnToken = Comlink.proxy(onToken);
            try {
                return await apiRef.current.chatStreamMultimodal(messages, model, resolvedEndpoint, proxiedOnToken);
            } finally {
                (proxiedOnToken as any)[Comlink.releaseProxy]?.();
            }
        },
        [],
    );

    const askWithRag = useCallback(
        async (
            query: string,
            fronterName: string,
            model: string,
            endpoint: string,
            onToken: (content: string) => void,
        ) => {
            if (!apiRef.current) throw new Error('ai worker not ready');

            const resolvedEndpoint = isCapacitorNative()
                ? resolveOllamaEndpoint(endpoint, MOBILE_SERVER_ORIGIN)
                : endpoint;

            if (_isMainThread) {
                return apiRef.current.askWithRag(query, fronterName, model, resolvedEndpoint, onToken);
            }

            const proxiedOnToken = Comlink.proxy(onToken);
            try {
                return await apiRef.current.askWithRag(
                    query,
                    fronterName,
                    model,
                    resolvedEndpoint,
                    proxiedOnToken,
                );
            } finally {
                (proxiedOnToken as any)[Comlink.releaseProxy]?.();
            }
        },
        [],
    );

    const askWithRagAndAttachments = useCallback(
        async (
            query: string,
            fronterName: string,
            model: string,
            endpoint: string,
            onToken: (content: string) => void,
            attachments?: Attachment[],
        ) => {
            if (!apiRef.current) throw new Error('ai worker not ready');

            const resolvedEndpoint = isCapacitorNative()
                ? resolveOllamaEndpoint(endpoint, MOBILE_SERVER_ORIGIN)
                : endpoint;

            if (_isMainThread) {
                return apiRef.current.askWithRagAndAttachments(
                    query, 
                    fronterName, 
                    model, 
                    resolvedEndpoint, 
                    onToken, 
                    attachments
                );
            }

            const proxiedOnToken = Comlink.proxy(onToken);
            // We need to transfer the attachments without the File object (not clonable)
            // The attachments should already have dataUrl set
            const serializableAttachments = attachments?.map(att => ({
                id: att.id,
                type: att.type,
                dataUrl: att.dataUrl,
                name: att.name,
            })) as Attachment[] | undefined;

            try {
                return await apiRef.current.askWithRagAndAttachments(
                    query,
                    fronterName,
                    model,
                    resolvedEndpoint,
                    proxiedOnToken,
                    serializableAttachments,
                );
            } finally {
                (proxiedOnToken as any)[Comlink.releaseProxy]?.();
            }
        },
        [],
    );

    const generateText = useCallback(
        async (prompt: string, model: string, endpoint: string) => {
            if (!apiRef.current) throw new Error('ai worker not ready');

            const resolvedEndpoint = isCapacitorNative()
                ? resolveOllamaEndpoint(endpoint, MOBILE_SERVER_ORIGIN)
                : endpoint;

            return apiRef.current.generateText(prompt, model, resolvedEndpoint);
        },
        [],
    );

    const buildRagPrompt = useCallback(
        async (query: string, fronterName?: string) => {
            if (!apiRef.current) throw new Error('ai worker not ready');
            return apiRef.current.buildRagPrompt(query, fronterName);
        },
        [],
    );

    return {
        isReady,
        isMainThread,
        search,
        embed,
        chatStream,
        chatStreamMultimodal,
        askWithRag,
        askWithRagAndAttachments,
        generateText,
        buildRagPrompt,
    };
}

// ---------------------------------------------------------------------------
// standalone (non-hook) accessor for zustand stores
// ---------------------------------------------------------------------------

export async function getAIWorkerProxy(): Promise<AnyAPI> {
    const ollamaBaseUrl = resolveWorkerOllamaBase();
    const { api, isMainThread: mt } = getOrCreate(ollamaBaseUrl);
    let resolvedAPI: AnyAPI;
    if (mt && !api) {
        resolvedAPI = await getMainThreadAPI(ollamaBaseUrl);
    } else {
        resolvedAPI = api;
    }
    await initAPI(resolvedAPI, ollamaBaseUrl);
    return resolvedAPI;
}
