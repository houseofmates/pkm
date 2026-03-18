import type { WeaveConfig } from './config.js';

// ── embeddings ───────────────────────────────────────────────

export async function getEmbedding(text: string, config: WeaveConfig): Promise<number[]> {
  const url = `${config.ollamaUrl}/api/embeddings`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.embeddingModel, prompt: text.toLowerCase() }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ollama embedding request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as Record<string, unknown>;

  // ollama returns { embedding: number[] }
  if (Array.isArray(json.embedding)) return json.embedding as number[];
  // openai-compatible format
  const data = json.data as Array<{ embedding: number[] }> | undefined;
  if (Array.isArray(data) && data[0]?.embedding) return data[0].embedding;

  throw new Error('unexpected embedding response shape');
}

// ── text generation ──────────────────────────────────────────

export async function generateText(prompt: string, config: WeaveConfig): Promise<string> {
  const url = `${config.ollamaUrl}/api/generate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.llmModel,
      prompt,
      stream: false,
      options: { temperature: 0.3 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ollama generate request failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  return (json.response as string) || '';
}

// ── json extraction helper ───────────────────────────────────
// llm output can contain markdown fences or stray text around json

export function extractJson<T = unknown>(text: string): T | null {
  // try direct parse first
  try { return JSON.parse(text) as T; } catch { /* continue */ }

  // try stripping markdown code fence
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1].trim()) as T; } catch { /* continue */ }
  }

  // try finding first { ... } or [ ... ]
  const braceStart = text.indexOf('{');
  const bracketStart = text.indexOf('[');
  const start = braceStart >= 0 && (bracketStart < 0 || braceStart < bracketStart)
    ? braceStart
    : bracketStart;

  if (start >= 0) {
    const open = text[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === open) depth++;
      else if (text[i] === close) depth--;
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) as T; } catch { break; }
      }
    }
  }

  return null;
}
