// ai field generator service
// handles generation of ai field content with rag context

import { generateAiFieldContent } from './rag-service';
import { generateText } from '@/lib/llm-service';
import { getOllamaGenerateUrl } from '@/lib/llm-config';
import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export interface AiGenerationOptions {
  instruction: string;
  model?: string;
  temperature?: number;
  includeRelated?: boolean;
  topK?: number;
  maxTokens?: number;
}

export interface AiGenerationResult {
  success: boolean;
  content: string;
  sources: string[];
  error?: string;
  metadata: {
    model: string;
    promptTokens: number;
    completionTokens: number;
    duration: number;
  };
}

// default generation options
const DEFAULT_OPTIONS: Partial<AiGenerationOptions> = {
  model: 'qwen2.5:7b',
  temperature: 0.7,
  includeRelated: true,
  topK: 5,
  maxTokens: 2048,
};

// generate ai field content and save to record
export async function generateAndSaveAiField(
  collection: string,
  recordId: string | number,
  fieldName: string = 'ai',
  options: AiGenerationOptions
): Promise<AiGenerationResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // 1. build the prompt with rag context
    const prompt = await generateAiFieldContent(
      collection,
      recordId,
      opts.instruction,
      {
        includeRelated: opts.includeRelated,
        topK: opts.topK,
      }
    );

    // 2. generate content via ollama
    const apiUrl = getOllamaGenerateUrl();
    const response = await generateText(prompt, opts.model!, apiUrl);

    if (!response) {
      throw new Error('no response from llm');
    }

    // 3. clean the response (remove markdown code blocks if present)
    const cleanedContent = cleanAiResponse(response);

    // 4. save to the record
    await api.updateRecord(collection, recordId, {
      [fieldName]: cleanedContent,
    });

    const duration = Date.now() - startTime;

    // 5. extract sources from the prompt (they're in the context)
    const sources = extractSourcesFromPrompt(prompt);

    return {
      success: true,
      content: cleanedContent,
      sources,
      metadata: {
        model: opts.model!,
        promptTokens: estimateTokens(prompt),
        completionTokens: estimateTokens(cleanedContent),
        duration,
      },
    };
  } catch (error) {
    secureLogger.error('ai field generation failed:', error);
    return {
      success: false,
      content: '',
      sources: [],
      error: error instanceof Error ? error.message : 'unknown error',
      metadata: {
        model: opts.model!,
        promptTokens: 0,
        completionTokens: 0,
        duration: Date.now() - startTime,
      },
    };
  }
}

// generate without saving (for preview)
export async function previewAiFieldContent(
  collection: string,
  recordId: string | number,
  options: AiGenerationOptions
): Promise<AiGenerationResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const prompt = await generateAiFieldContent(
      collection,
      recordId,
      opts.instruction,
      {
        includeRelated: opts.includeRelated,
        topK: opts.topK,
      }
    );

    const apiUrl = getOllamaGenerateUrl();
    const response = await generateText(prompt, opts.model!, apiUrl);

    if (!response) {
      throw new Error('no response from llm');
    }

    const cleanedContent = cleanAiResponse(response);
    const duration = Date.now() - startTime;

    return {
      success: true,
      content: cleanedContent,
      sources: extractSourcesFromPrompt(prompt),
      metadata: {
        model: opts.model!,
        promptTokens: estimateTokens(prompt),
        completionTokens: estimateTokens(cleanedContent),
        duration,
      },
    };
  } catch (error) {
    secureLogger.error('ai field preview failed:', error);
    return {
      success: false,
      content: '',
      sources: [],
      error: error instanceof Error ? error.message : 'unknown error',
      metadata: {
        model: opts.model!,
        promptTokens: 0,
        completionTokens: 0,
        duration: Date.now() - startTime,
      },
    };
  }
}

// clean ai response (remove markdown code blocks, normalize)
function cleanAiResponse(response: string): string {
  let cleaned = response.trim();

  // remove markdown code block wrappers if present
  const codeBlockMatch = cleaned.match(/^```(?:markdown)?\s*([\s\S]*?)\s*```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // ensure lowercase (per user preference)
  cleaned = cleaned.toLowerCase();

  // normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // remove excessive blank lines
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');

  return cleaned;
}

// extract source references from prompt
function extractSourcesFromPrompt(prompt: string): string[] {
  const sources: string[] = [];
  const regex = /\[source:\s*([^:\]]+):([^:\]]+)\]/g;
  let match;

  while ((match = regex.exec(prompt)) !== null) {
    sources.push(`${match[1]}:${match[2]}`);
  }

  return [...new Set(sources)];
}

// estimate token count (rough approximation)
function estimateTokens(text: string): number {
  // rough estimate: 1 token ≈ 4 characters for english text
  return Math.ceil(text.length / 4);
}

// batch generate ai fields for multiple records
export async function batchGenerateAiFields(
  collection: string,
  recordIds: (string | number)[],
  fieldName: string,
  options: AiGenerationOptions,
  onProgress?: (completed: number, total: number, currentId: string | number) => void
): Promise<AiGenerationResult[]> {
  const results: AiGenerationResult[] = [];

  for (let i = 0; i < recordIds.length; i++) {
    const recordId = recordIds[i];

    if (onProgress) {
      onProgress(i, recordIds.length, recordId);
    }

    const result = await generateAndSaveAiField(collection, recordId, fieldName, options);
    results.push(result);

    // small delay to avoid overwhelming the api
    if (i < recordIds.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return results;
}

// get suggested instructions based on collection type
export function getSuggestedInstructions(collectionName: string): string[] {
  const lower = collectionName.toLowerCase();

  if (lower.includes('note') || lower.includes('journal')) {
    return [
      'synthesize key insights and themes from this note',
      'identify connections to other notes and projects',
      'generate 3 thought-provoking questions based on this content',
      'summarize action items and next steps',
      'extract key concepts and define them',
    ];
  }

  if (lower.includes('task') || lower.includes('todo') || lower.includes('action')) {
    return [
      'break this down into subtasks with clear next actions',
      'identify blockers and suggest solutions',
      'prioritize based on urgency and impact',
      'synthesize related tasks from across the pkm',
      'generate a completion checklist',
    ];
  }

  if (lower.includes('project')) {
    return [
      'synthesize current status and blockers',
      'identify hidden risks and mitigation strategies',
      'suggest next milestones and deliverables',
      'find related research and resources',
      'generate a project summary for stakeholders',
    ];
  }

  if (lower.includes('research') || lower.includes('paper') || lower.includes('article')) {
    return [
      'extract key findings and methodology',
      'identify gaps in the research and suggest follow-ups',
      'connect to related concepts in the knowledge base',
      'generate critical questions about the conclusions',
      'synthesize implications for current projects',
    ];
  }

  // default suggestions
  return [
    'synthesize key insights and hidden connections',
    'generate 3 powerful questions to deepen understanding',
    'identify related items across the knowledge base',
    'suggest next steps and action items',
    'create a structured summary with cross-references',
  ];
}

// validate that a collection has an 'ai' field
export async function validateAiField(collection: string, fieldName: string = 'ai'): Promise<boolean> {
  try {
    const colRes: any = await api.getCollection(collection);
    const fields = colRes.data?.fields || colRes.fields || [];

    return fields.some((f: any) => f.name === fieldName);
  } catch (error) {
    secureLogger.error(`failed to validate ai field for ${collection}:`, error);
    return false;
  }
}

// ensure 'ai' field exists on collection (create if missing)
export async function ensureAiField(collection: string, fieldName: string = 'ai'): Promise<boolean> {
  try {
    const exists = await validateAiField(collection, fieldName);
    if (exists) return true;

    // create the field
    await api.createField(collection, {
      name: fieldName,
      type: 'text',
      interface: 'markdown',
      uiSchema: {
        'x-component': 'Markdown',
        'x-component-props': {
          placeholder: 'ai-generated content will appear here...',
        },
      },
    });

    secureLogger.info(`created '${fieldName}' field on ${collection}`);
    return true;
  } catch (error) {
    secureLogger.error(`failed to create ai field on ${collection}:`, error);
    return false;
  }
}
