// ai.worker.ts — thin web worker shell
//
// all logic lives in ai-worker-core.ts so it can also be imported
// directly on the main thread as a fallback on mobile webviews.

import * as Comlink from 'comlink';
import { createWorkerAPI } from './ai-worker-core';

const params = new URL(self.location.href).searchParams;
const ollamaBaseUrl = params.get('ollamaBaseUrl') || undefined;

const api = createWorkerAPI(self.fetch.bind(self), { ollamaBaseUrl });

Comlink.expose(api);

export type { AIWorkerAPI } from './ai-worker-types';
