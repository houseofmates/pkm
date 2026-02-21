import { BlockEditor } from '@/components/editor/BlockEditor';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SmartTextElementProps {
  element: any;
  onChange?: (content: string) => void;
}

export function SmartTextElement({ element }: SmartTextElementProps) {
  const [content, setContent] = useState(element.data?.content || '');
  const styles = element.data || {};

  return (
    <div
      className={cn(
        "w-full h-full overflow-hidden transition-all duration-300",
        styles.className
      )}
      style={{
        fontFamily: '"Varela Round", sans-serif',
        fontSize: '20px',
        pointerEvents: 'auto',
        backgroundColor: styles.backgroundColor || 'transparent',
        borderWidth: styles.borderWidth ? `${styles.borderWidth}px` : '0px',
        borderColor: styles.borderColor || 'transparent',
        borderStyle: 'solid',
        borderRadius: styles.borderRadius ? `${styles.borderRadius}px` : '0px',
        opacity: styles.opacity ?? 1,
        color: styles.color || 'inherit'
      }}
    >
      <BlockEditor
        content={content}
        editable={!element.locked}
        className={cn(
          "min-h-full w-full bg-transparent focus:ring-0 border-none px-4 py-2",
          "prose-p:my-1 prose-headings:my-2 prose-invert"
        )}
        placeholder="type anything..."
        onChange={(html) => {
          setContent(html);
          // In a real app, debounce and call updateElement here
        }}
      />
    </div>
  );
}
