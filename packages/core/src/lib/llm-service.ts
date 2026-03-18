import { secureLogger } from './secure-logger'
import { DEFAULT_GEMINI_MODEL } from './llm-config'

export interface LLMRequest {
  model: string
  prompt: string
  stream?: boolean
  options?: Record<string, any>
}

export interface LLMResponse {
  response: string
  done: boolean
}

export async function generateText(prompt: string, model: string = DEFAULT_GEMINI_MODEL, endpoint: string): Promise<string | null> {
  try {
    // If this looks like the Gemini API, send the request in the Gemini format.
    const isGemini = /generativeai\.googleapis\.com\//i.test(endpoint);

    const body = isGemini
      ? {
          prompt: { text: prompt },
          // optional: control generation length / temperature here
        }
      : ({ model, prompt, stream: false } as LLMRequest);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.statusText}`);
    }

    const data = await response.json();

    if (isGemini) {
      // Gemini returns candidates array
      const candidate = data?.candidates?.[0]?.content;
      return typeof candidate === 'string' ? candidate : null;
    }

    const parsed = data as LLMResponse;
    return parsed.response;
  } catch (e) {
    secureLogger.warn('Wilson Silent Fail:', e);
    return null;
  }
}
