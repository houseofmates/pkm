// hook for ai field generation operations
// provides a clean interface for components to generate ai content

import { useState, useCallback } from 'react';
import {
  generateAndSaveAiField,
  previewAiFieldContent,
  getSuggestedInstructions,
  ensureAiField,
  type AiGenerationOptions,
  type AiGenerationResult,
} from '@/services/ai-field-generator';
import { secureLogger } from '@/lib/secure-logger';

interface UseAiGenerationOptions {
  onSuccess?: (content: string, result: AiGenerationResult) => void;
  onError?: (error: string) => void;
  onProgress?: (stage: 'retrieving' | 'generating' | 'saving') => void;
}

interface UseAiGenerationReturn {
  // state
  isGenerating: boolean;
  isPreviewing: boolean;
  lastResult: AiGenerationResult | null;
  suggestedInstructions: string[];

  // actions
  generate: (instruction: string, options?: Partial<AiGenerationOptions>) => Promise<AiGenerationResult>;
  preview: (instruction: string, options?: Partial<AiGenerationOptions>) => Promise<AiGenerationResult>;
  ensureField: () => Promise<boolean>;
  refreshSuggestions: () => string[];
}

export function useAiGeneration(
  collection: string,
  recordId: string | number,
  fieldName: string = 'ai',
  hookOptions: UseAiGenerationOptions = {}
): UseAiGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [lastResult, setLastResult] = useState<AiGenerationResult | null>(null);
  const [suggestedInstructions, setSuggestedInstructions] = useState<string[]>([]);

  // initialize suggestions
  const refreshSuggestions = useCallback(() => {
    const suggestions = getSuggestedInstructions(collection);
    setSuggestedInstructions(suggestions);
    return suggestions;
  }, [collection]);

  // ensure the ai field exists on the collection
  const ensureField = useCallback(async (): Promise<boolean> => {
    return ensureAiField(collection, fieldName);
  }, [collection, fieldName]);

  // generate and save content
  const generate = useCallback(async (
    instruction: string,
    options: Partial<AiGenerationOptions> = {}
  ): Promise<AiGenerationResult> => {
    setIsGenerating(true);
    hookOptions.onProgress?.('retrieving');

    try {
      const result = await generateAndSaveAiField(collection, recordId, fieldName, {
        instruction,
        includeRelated: true,
        topK: 5,
        ...options,
      });

      setLastResult(result);

      if (result.success) {
        hookOptions.onSuccess?.(result.content, result);
        secureLogger.info(`[useAiGeneration] success for ${collection}:${recordId}`);
      } else {
        hookOptions.onError?.(result.error || 'unknown error');
        secureLogger.error('[useAiGeneration] failed:', result.error);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unexpected error';
      hookOptions.onError?.(errorMsg);
      secureLogger.error('[useAiGeneration] error:', error);

      const failedResult: AiGenerationResult = {
        success: false,
        content: '',
        sources: [],
        error: errorMsg,
        metadata: {
          model: options.model || 'qwen2.5vl:7b-q4_K_M',
          promptTokens: 0,
          completionTokens: 0,
          duration: 0,
        },
      };

      setLastResult(failedResult);
      return failedResult;
    } finally {
      setIsGenerating(false);
    }
  }, [collection, recordId, fieldName, hookOptions]);

  // preview without saving
  const preview = useCallback(async (
    instruction: string,
    options: Partial<AiGenerationOptions> = {}
  ): Promise<AiGenerationResult> => {
    setIsPreviewing(true);
    hookOptions.onProgress?.('retrieving');

    try {
      const result = await previewAiFieldContent(collection, recordId, {
        instruction,
        includeRelated: true,
        topK: 5,
        ...options,
      });

      setLastResult(result);

      if (!result.success) {
        hookOptions.onError?.(result.error || 'preview failed');
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'unexpected error';
      hookOptions.onError?.(errorMsg);

      const failedResult: AiGenerationResult = {
        success: false,
        content: '',
        sources: [],
        error: errorMsg,
        metadata: {
          model: options.model || 'qwen2.5vl:7b-q4_K_M',
          promptTokens: 0,
          completionTokens: 0,
          duration: 0,
        },
      };

      setLastResult(failedResult);
      return failedResult;
    } finally {
      setIsPreviewing(false);
    }
  }, [collection, recordId, hookOptions]);

  // initialize suggestions on first use
  if (suggestedInstructions.length === 0) {
    refreshSuggestions();
  }

  return {
    isGenerating,
    isPreviewing,
    lastResult,
    suggestedInstructions,
    generate,
    preview,
    ensureField,
    refreshSuggestions,
  };
}

// hook for batch operations
interface UseBatchAiGenerationReturn {
  isProcessing: boolean;
  progress: { completed: number; total: number; currentId: string | number | null };
  results: AiGenerationResult[];
  processBatch: (recordIds: (string | number)[], instruction: string) => Promise<AiGenerationResult[]>;
}

export function useBatchAiGeneration(
  collection: string,
  fieldName: string = 'ai'
): UseBatchAiGenerationReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentId: null as string | number | null });
  const [results, setResults] = useState<AiGenerationResult[]>([]);

  const processBatch = useCallback(async (
    recordIds: (string | number)[],
    instruction: string
  ): Promise<AiGenerationResult[]> => {
    setIsProcessing(true);
    setProgress({ completed: 0, total: recordIds.length, currentId: null });
    setResults([]);

    const batchResults: AiGenerationResult[] = [];

    for (let i = 0; i < recordIds.length; i++) {
      const recordId = recordIds[i];
      setProgress({ completed: i, total: recordIds.length, currentId: recordId });

      // dynamic import to avoid circular dependencies
      const { generateAndSaveAiField } = await import('@/services/ai-field-generator');
      const result = await generateAndSaveAiField(collection, recordId, fieldName, {
        instruction,
        includeRelated: true,
        topK: 5,
      });

      batchResults.push(result);

      // small delay between requests
      if (i < recordIds.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    setProgress({ completed: recordIds.length, total: recordIds.length, currentId: null });
    setResults(batchResults);
    setIsProcessing(false);

    secureLogger.info(`[useBatchAiGeneration] completed ${recordIds.length} records`);
    return batchResults;
  }, [collection, fieldName]);

  return {
    isProcessing,
    progress,
    results,
    processBatch,
  };
}
