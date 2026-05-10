// ai field button component
// reusable button for generating ai field content

import { useState } from 'react';
import { Sparkles, Loader2, Wand2, BrainCircuit } from 'lucide-react';
import { generateAndSaveAiField, previewAiFieldContent, getSuggestedInstructions } from '@/services/ai-field-generator';
import { secureLogger } from '@/lib/secure-logger';
import { cn, sanitizeHTML } from '@/lib/utils';
import { toast } from 'sonner';

interface AiFieldButtonProps {
  collection: string;
  recordId: string | number;
  fieldName?: string;
  onGenerated?: (content: string) => void;
  variant?: 'icon' | 'button' | 'dropdown';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AiFieldButton({
  collection,
  recordId,
  fieldName = 'ai',
  onGenerated,
  variant = 'button',
  className,
  size = 'md',
}: AiFieldButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const sizeClasses = {
    sm: 'h-7 px-2 text-xs',
    md: 'h-9 px-3 text-sm',
    lg: 'h-11 px-4 text-base',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  const handleGenerate = async (instruction: string) => {
    setIsGenerating(true);
    setShowInstructions(false);

    try {
      const result = await generateAndSaveAiField(collection, recordId, fieldName, {
        instruction,
        includeRelated: true,
        topK: 5,
      });

      if (result.success) {
        onGenerated?.(result.content);
        secureLogger.info(`[AI Field] generated content for ${collection}:${recordId}`);
      } else {
        secureLogger.error('[AI Field] generation failed:', result.error);
        toast.error(`generation failed: ${result.error}`);
      }
    } catch (error) {
      secureLogger.error('[AI Field] unexpected error:', error);
      toast.error('unexpected error during generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = async (instruction: string) => {
    setIsGenerating(true);

    try {
      const result = await previewAiFieldContent(collection, recordId, {
        instruction,
        includeRelated: true,
        topK: 5,
      });

      if (result.success) {
        // show preview in modal or alert for now
        const preview = result.content.slice(0, 500) + (result.content.length > 500 ? '...' : '');
        const confirmed = window.confirm(`preview:\n\n${preview}\n\nclick ok to save, cancel to discard.`);
        if (confirmed) {
          await handleGenerate(instruction);
        }
      } else {
        toast.error(`preview failed: ${result.error}`);
      }
    } catch (error) {
      secureLogger.error('[AI Field] preview error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const suggestedInstructions = getSuggestedInstructions(collection);

  if (variant === 'icon') {
    return (
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        disabled={isGenerating}
        className={cn(
          'inline-flex items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors',
          size === 'sm' ? 'w-7 h-7' : size === 'md' ? 'w-9 h-9' : 'w-11 h-11',
          className
        )}
        title="generate ai content"
      >
        {isGenerating ? (
          <Loader2 size={iconSizes[size]} className="animate-spin" />
        ) : (
          <Sparkles size={iconSizes[size]} />
        )}
      </button>
    );
  }

  if (showInstructions) {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-center gap-2 text-xs text-primary/70 mb-2">
          <BrainCircuit size={12} />
          <span>choose an instruction:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {suggestedInstructions.map((instruction, i) => (
            <button
              key={i}
              onClick={() => handlePreview(instruction)}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs rounded-md border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors text-left"
            >
              {instruction}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            placeholder="or type custom instruction..."
            className="flex-1 px-3 py-1.5 text-xs rounded-md border border-primary/30 bg-black text-primary placeholder:text-primary/30"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handlePreview(e.currentTarget.value);
              }
            }}
          />
          <button
            onClick={() => setShowInstructions(false)}
            className="px-3 py-1.5 text-xs rounded-md border border-primary/30 text-primary hover:bg-primary/10"
          >
            cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowInstructions(true)}
      disabled={isGenerating}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-mono lowercase',
        sizeClasses[size],
        className
      )}
    >
      {isGenerating ? (
        <>
          <Loader2 size={iconSizes[size]} className="animate-spin" />
          <span>generating...</span>
        </>
      ) : (
        <>
          <Wand2 size={iconSizes[size]} />
          <span>generate ai content</span>
        </>
      )}
    </button>
  );
}

// inline version for table rows
export function AiFieldInlineButton({
  collection,
  recordId,
  onGenerated,
}: {
  collection: string;
  recordId: string | number;
  onGenerated?: (content: string) => void;
}) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleQuickGenerate = async () => {
    setIsGenerating(true);

    try {
      const result = await generateAndSaveAiField(collection, recordId, 'ai', {
        instruction: 'synthesize key insights and connections from this record',
        includeRelated: true,
        topK: 5,
      });

      if (result.success) {
        onGenerated?.(result.content);
      }
    } catch (error) {
      secureLogger.error('[AI Field] quick generate failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleQuickGenerate}
      disabled={isGenerating}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
      title="quick ai synthesis"
    >
      {isGenerating ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <Sparkles size={12} />
      )}
      <span>ai</span>
    </button>
  );
}

// display ai field content with source citations
export function AiFieldContent({
  content,
  sources,
  className,
}: {
  content: string;
  sources?: string[];
  className?: string;
}) {
  if (!content) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="prose prose-invert prose-sm max-w-none">
        {/* render markdown content */}
        <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(renderMarkdown(content)) }} />
      </div>

      {sources && sources.length > 0 && (
        <div className="pt-2 border-t border-primary/10">
          <div className="text-xs text-primary/50 mb-1">sources:</div>
          <div className="flex flex-wrap gap-1">
            {sources.map((source, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded bg-primary/5 text-primary/70 font-mono"
              >
                {source}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// simple markdown renderer (basic)
function renderMarkdown(markdown: string): string {
  return markdown
    // headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // code
    .replace(/`([^`]+)`/gim, '<code class="bg-primary/10 px-1 rounded">$1</code>')
    // links
    .replace(/\[\[([^:\]]+):([^:\]]+)\]\]/gim, '<a href="#/$1/$2" class="text-primary hover:underline">$1:$2</a>')
    // bullet lists
    .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
    // numbered lists
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    // line breaks
    .replace(/\n/gim, '<br />');
}
