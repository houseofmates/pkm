import { cn, sanitizeHTML } from '@/lib/utils';

interface ContentElement {
  id: string;
  type: string;
  content?: any;
  styles?: any;
}

interface SimpleContentRendererProps {
  elements: ContentElement[];
}

export function SimpleContentRenderer({ elements }: SimpleContentRendererProps) {
  if (!elements || elements.length === 0) {
  return (
  <div className="text-white/60 lowercase text-center py-12">
 no content available
  </div>
  );
  }

  return (
  <div className="space-y-6">
  {elements.map((element) => {
 switch (element.type) {
 case 'text':
 return (
   <div
   key={element.id}
   className="prose prose-invert prose-lg max-w-none"
   dangerouslySetInnerHTML={{ __html: sanitizeHTML(element.content?.html) }}
   />
 );

 case 'image':
 return (
   <div key={element.id} className="rounded-2xl overflow-hidden">
   <img
   src={element.content?.url}
   alt={element.content?.alt || ''}
   className="w-full h-auto"
   />
   </div>
 );

 case 'button':
 return (
   <button
   key={element.id}
   className={cn(
   "px-6 py-3 rounded-xl font-bold lowercase transition-transform hover:scale-105",
   "interactive-pop"
   )}
   style={{
   backgroundColor: element.content?.bgColor || 'var(--primary)',
   color: element.content?.textColor || '#000',
   }}
   >
   {element.content?.text || 'button'}
   </button>
 );

 case 'video':
 return (
   <div key={element.id} className="rounded-2xl overflow-hidden">
   <video
   src={element.content?.url}
   controls
   className="w-full h-auto"
   />
   </div>
 );

 default:
 return null;
 }
  })}
  </div>
  );
}
