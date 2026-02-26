// use-ai-worker.ts — react hook that lazily spins up the ai web worker
// and exposes typed async methods via comlink.
//
// usage:
//   const { worker, isReady } = useAIWorker()
//   const results = await worker.searchKnowledgeBase('my query')
//
// the worker is a singleton — every call to useAIWorker() returns the same
// instance so we don't spawn duplicate threads.

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Comlink from 'comlink';
import type { AIWorkerAPI } from '@/workers/ai-worker-types';
import { storageManager } from '@/lib/storage-manager';
import { normalizeAuthToken } from '@/lib/auth-token';

type WorkerWithInit = AIWorkerAPI & {
    init(apiBaseUrl: string, authToken: string, vectorConfig?: Record<string, unknown>): void;
};

// ---------------------------------------------------------------------------
// singleton — shared across all hook consumers
// ---------------------------------------------------------------------------

let _workerInstance: Worker | null = null;
let _proxy: Comlink.Remote<WorkerWithInit> | null = null;
let _initialized = false;
let _refCount = 0;

function getOrCreateWorker(): { worker: Worker; proxy: Comlink.Remote<WorkerWithInit> } {
    if (!_workerInstance || !_proxy) {
        _workerInstance = new Worker(
            new URL('../workers/ai.worker.ts', import.meta.url),
            { type: 'module' },
        );
        _proxy = Comlink.wrap<WorkerWithInit>(_workerInstance);
    }
    return { worker: _workerInstance, proxy: _proxy };
}

async function ensureInitialized(proxy: Comlink.Remote<WorkerWithInit>) {
    if (_initialized) return;

    // resolve auth token from storage (same priority as api-client.ts)
    const ht = storageManager.getItem('hom_api_key');
    const nt = storageManager.getItem('nocobase_token');
    const gt = storageManager.getItem('hom_guest_key');
    const raw = ht || nt || gt || '';
    const token = normalizeAuthToken(raw);

    // resolve api base url from current origin (vite proxy forwards /api to nocobase)
    const apiBaseUrl = `${window.location.origin}/api`;

    await proxy.init(apiBaseUrl, token);
    _initialized = true;
}

function teardownWorker() {
    if (_workerInstance) {
        _workerInstance.terminate();
        _workerInstance = null;
        _proxy = null;
        _initialized = false;
    }
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useAIWorker() {
    const [isReady, setIsReady] = useState(_initialized);
    const proxyRef = useRef<Comlink.Remote<WorkerWithInit> | null>(_proxy);

    useEffect(() => {
        _refCount++;
        const { proxy } = getOrCreateWorker();
        proxyRef.current = proxy;

        ensureInitialized(proxy).then(() => setIsReady(true));

        return () => {
            _refCount--;
            // only terminate if no consumers remain
            if (_refCount <= 0) {
                teardownWorker();
                _refCount = 0;
            }
        };
    }, []);

    // wrap comlink methods in stable callbacks
    const search = useCallback(
        async (query: string, topK?: number) => {
            if (!proxyRef.current) throw new Error('ai worker not ready');
            return proxyRef.current.searchKnowledgeBase(query, topK);
        },
        [],
    );

    const embed = useCallback(
        async (text: string) => {
            if (!proxyRef.current) throw new Error('ai worker not ready');
            return proxyRef.current.generateEmbedding(text);
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
            if (!proxyRef.current) throw new Error('ai worker not ready');
            return proxyRef.current.chatStream(prompt, model, endpoint, Comlink.proxy(onToken));
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
            if (!proxyRef.current) throw new Error('ai worker not ready');
            return proxyRef.current.askWithRag(
                query,
                fronterName,
                model,
                endpoint,
                Comlink.proxy(onToken),
            );
        },
        [],
    );

    const generateText = useCallback(
        async (prompt: string, model: string, endpoint: string) => {
            if (!proxyRef.current) throw new Error('ai worker not ready');
            return proxyRef.current.generateText(prompt, model, endpoint);
        },
        [],
    );

    const buildRagPrompt = useCallback(
        async (query: string, fronterName?: string) => {
            if (!proxyRef.current) throw new Error('ai worker not ready');
            return proxyRef.current.buildRagPrompt(query, fronterName);
        },
        [],
    );

    return {
        isReady,
        search,
        embed,
        chatStream,
        askWithRag,
        generateText,
        buildRagPrompt,
    };
}

// ---------------------------------------------------------------------------
// standalone (non-hook) accessor for use inside zustand stores
// ---------------------------------------------------------------------------

export function getAIWorkerProxy(): Comlink.Remote<WorkerWithInit> {
    const { proxy } = getOrCreateWorker();
    // fire-and-forget init — if it's already initialized this is a no-op
    ensureInitialized(proxy);
    return proxy;
}
