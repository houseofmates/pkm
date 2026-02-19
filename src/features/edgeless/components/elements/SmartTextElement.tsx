import { BlockEditor } from '@/components/editor/BlockEditor';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface SmartTextElementProps {
  element: any;
  onChange?: (content: string) => void;
}

export function SmartTextElement({ element }: smarttextelementprops) {
  const [content, setcontent] = usestate(element.data?.content || '');

  return (
  <div
  className="w-full h-full"
  style={{
 fontFamily: '"Varela Round", sans-serif',
 fontSize: '20px',
 pointerEvents: 'auto' // Ensure interactions work
  }}
  >
  <BlockEditor
 content={content}
 editable={true}
 className={cn(
 "min-h-[50px] bg-transparent focus:ring-0 border-none px-0 py-0",
 // remove default prose max-width and background
 "prose-p:my-1 prose-headings:my-2"
 )}
 placeholder="type anything..."
 onChange={(html) => {
 setContent(html);
 // ideally debounced update to store
 }}
  />
  </div>
  );
}