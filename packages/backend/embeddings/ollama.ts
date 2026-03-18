import fetch from 'node-fetch';
import { backendConfig } from '../config.js';

type Resolve<T> = (value: T | PromiseLike<T>) => void;
type Reject = (reason?: unknown) => void;

const queue: Array<() => void> = [];
let active = 0;

const runNext = () => {
  if (active >= backendConfig.embedding.concurrency) return;
  const job = queue.shift();
  if (!job) return;
  active += 1;
  job();
};

const enqueue = <T>(fn: () => Promise<T>): Promise<T> =>
  new Promise((resolve: Resolve<T>, reject: Reject) => {
    const task = async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        active -= 1;
        runNext();
      }
    };
    queue.push(task);
    process.nextTick(runNext);
  });

const parseEmbeddingResponse = (json: any): number[] => {
  if (Array.isArray(json?.data) && json.data[0]?.embedding) {
    return json.data[0].embedding as number[];
  }
  if (Array.isArray(json?.embedding)) {
    return json.embedding as number[];
  }
  throw new Error('invalid embedding response');
};

const requestEmbedding = async (text: string): Promise<number[]> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), backendConfig.embedding.timeoutMs);
  try {
    const res = await fetch(backendConfig.embedding.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: backendConfig.embedding.model, prompt: text.toLowerCase() }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`ollama embeddings error: ${res.status}`);
    }
    const json = await res.json();
    return parseEmbeddingResponse(json);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('ollama embeddings request timed out');
    }
    console.error('getEmbedding error', err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
};

export function getEmbedding(text: string): Promise<number[]> {
  return enqueue(() => requestEmbedding(text));
}

export default getEmbedding;
