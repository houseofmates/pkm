import { secureLogger } from '@/lib/secure-logger';
import { getOllamaBase } from '@/lib/llm-config';

// Hardcoded Ollama endpoint for detail enhancement
const OLLAMA_URL = 'http://192.168.4.250:11434/api/generate';
const DETAIL_ENHANCER_MODEL = 'qwen2.5-coder:7b-instruct-q4_K_S';

export interface DetailEnhancerOptions {
  model?: string;
  context?: string;
  existingNotes?: string[];
  maxTokens?: number;
}

export interface DetailEnhancerResult {
  enhanced: string;
  raw: string;
  addedContext: string[];
  processingTime: number;
}

/**
 * Detail Enhancer - Transforms messy speech into dense professional documentation
 * 
 * Core principles:
 * - NEVER omits data from original transcript
 * - Reorganizes fragmented thoughts into coherent structure
 * - Infers and adds relevant context from PKM knowledge base
 * - Expands on implied details while staying factual
 * - Produces professional, dense documentation
 */
export class DetailEnhancer {
  private model: string;
  private ollamaUrl: string;

  constructor(options: DetailEnhancerOptions = {}) {
    this.model = options.model || DETAIL_ENHANCER_MODEL;
    this.ollamaUrl = getOllamaBase() + '/api/generate';
  }

  /**
   * Build the enhancement prompt that enforces data preservation
   */
  private buildPrompt(
    transcript: string,
    existingNotes?: string[]
  ): { system: string; prompt: string } {
    
    const systemPrompt = `You are a Detail Enhancement Engine for a Personal Knowledge Management system.

MISSION: Transform messy, fragmented speech transcripts into dense, professional documentation while PRESERVING EVERY PIECE OF INFORMATION from the original.

CRITICAL RULES:
1. NEVER omit any information from the original transcript
2. If the speaker mentions something unclearly, preserve it and mark with [unclear: interpretation]
3. Expand on acronyms, shorthand, and implied context using provided knowledge base
4. Reorganize into logical sections: Facts, Observations, Action Items, Questions, References
5. Infer connections to existing knowledge base entries and link them inline
6. Convert fragmented sentences into complete, professional prose
7. Maintain original meaning - do not reinterpret or contradict the source
8. If speech is garbled, preserve all recognizable fragments and note gaps with [...]

OUTPUT FORMAT:
- Use markdown with hierarchical headings
- Bullet points for discrete facts
- Blockquotes for direct quotes from transcript
- Inline citations [ref: existing_note_id] when connecting to knowledge base
- Action items as checkboxes: - [ ] 
- Technical terms in backticks
- Dates/times normalized to ISO format where possible`;

    const knowledgeContext = existingNotes && existingNotes.length > 0
      ? `\n\nEXISTING KNOWLEDGE BASE CONTEXT:\n${existingNotes.map((n, i) => `[KB${i}]: ${n}`).join('\n')}\n\nConnect to relevant KB entries using [ref: KB#] notation.`
      : '';

    const prompt = `RAW TRANSCRIPT (preserve all information from this):\n"""\n${transcript}\n"""${knowledgeContext}\n\nEnhance this transcript into dense professional documentation. Organize scattered thoughts, complete fragmented sentences, expand acronyms, and link to existing knowledge. Output ONLY the enhanced document, no meta-commentary.`;

    return { system: systemPrompt, prompt };
  }

  /**
   * Extract added context references from enhanced text
   */
  private extractAddedContext(enhanced: string): string[] {
    const refs: string[] = [];
    const refMatches = enhanced.matchAll(/\[ref:\s*([^\]]+)\]/g);
    for (const match of refMatches) {
      refs.push(match[1]);
    }
    return [...new Set(refs)];
  }

  /**
   * Process transcript through detail enhancer
   * Returns enhanced documentation with metadata
   */
  async enhance(
    transcript: string,
    options: DetailEnhancerOptions = {}
  ): Promise<DetailEnhancerResult> {
    const startTime = performance.now();
    
    try {
      const { system, prompt } = this.buildPrompt(transcript, options.existingNotes);

      const response = await fetch(options.model ? this.ollamaUrl : OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || this.model,
          system,
          prompt,
          stream: false,
          options: {
            temperature: 0.3, // Lower temperature for factual consistency
            num_predict: options.maxTokens || 4096,
            stop: ['<|endoftext|>'],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Detail enhancer error (${response.status}): ${await response.text()}`);
      }

      const data = await response.json();
      const enhanced = data.response?.trim() || '';

      const processingTime = performance.now() - startTime;
      const addedContext = this.extractAddedContext(enhanced);

      return {
        enhanced,
        raw: transcript,
        addedContext,
        processingTime,
      };
    } catch (error) {
      secureLogger.error('Detail enhancement failed:', error);
      // Fallback: return original transcript with minimal formatting
      return {
        enhanced: this.fallbackEnhance(transcript),
        raw: transcript,
        addedContext: [],
        processingTime: performance.now() - startTime,
      };
    }
  }

  /**
   * Fallback enhancement when Ollama is unavailable
   * Applies basic formatting without LLM
   */
  private fallbackEnhance(transcript: string): string {
    const lines = transcript
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const sections: Record<string, string[]> = {
      'Raw Transcript': [transcript],
      'Key Points': [],
    };

    for (const line of lines) {
      if (line.length > 10) {
        sections['Key Points'].push(`- ${line}`);
      }
    }

    return Object.entries(sections)
      .map(([title, items]) => `## ${title}\n\n${items.join('\n')}`)
      .join('\n\n---\n\n');
  }

  /**
   * Stream enhancement for real-time UI updates
   */
  async enhanceStream(
    transcript: string,
    onChunk: (chunk: string) => void,
    options: DetailEnhancerOptions = {}
  ): Promise<DetailEnhancerResult> {
    const startTime = performance.now();
    let fullResponse = '';

    try {
      const { system, prompt } = this.buildPrompt(transcript, options.existingNotes);

      const response = await fetch(options.model ? this.ollamaUrl : OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.model || this.model,
          system,
          prompt,
          stream: true,
          options: {
            temperature: 0.3,
            num_predict: options.maxTokens || 4096,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Streaming error (${response.status})`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            if (json.response) {
              fullResponse += json.response;
              onChunk(fullResponse);
            }
          } catch {
            // Ignore malformed JSON lines in stream
          }
        }
      }

      const processingTime = performance.now() - startTime;
      const addedContext = this.extractAddedContext(fullResponse);

      return {
        enhanced: fullResponse.trim(),
        raw: transcript,
        addedContext,
        processingTime,
      };
    } catch (error) {
      secureLogger.error('Streaming enhancement failed:', error);
      const fallback = this.fallbackEnhance(transcript);
      onChunk(fallback);
      return {
        enhanced: fallback,
        raw: transcript,
        addedContext: [],
        processingTime: performance.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const detailEnhancer = new DetailEnhancer();
