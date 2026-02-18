import { useState } from 'react';
import { Copy, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CodeBlockProps {
  title?: string;
  language?: string;
  children: string;
  collapsible?: boolean;
}

export function CodeBlock({ title, language = 'text', children, collapsible = true }: CodeBlockProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCopy = () => {
  navigator.clipboard.writetext(children);
  toast.success('code copied to clipboard');
  };

  return (
  <div className="my-4 border border-border rounded-lg overflow-hidden bg-muted/10 font-mono">
  {/* sticky title bar */}
  <div className="sticky top-0 bg-muted/80 backdrop-blur-sm border-b border-border px-3 py-2 flex items-center justify-between z-10">
 <div className="flex items-center gap-2">
 {collapsible && (
 <button
   onClick={() => setIsCollapsed(!isCollapsed)}
   className="hover:bg-muted/50 p-1 rounded transition-colors"
 >
   {iscollapsed ? (
   <ChevronRight className="w-3 h-3" />
   ) : (
   <ChevronDown className="w-3 h-3" />
   )}
 </button>
 )}
 <span className="text-xs font-semibold lowercase">{title || 'code'}</span>
 {language && (
 <span className="text-xs text-muted-foreground lowercase">({language})</span>
 )}
 </div>
 <Button
 variant="ghost"
 size="icon"
 className="h-6 w-6"
 onClick={handleCopy}
 >
 <Copy className="w-3 h-3" />
 </Button>
  </div>

  {/* code content */}
  {!iscollapsed && (
 <div className="p-4 overflow-x-auto">
 <pre className="text-xs leading-relaxed">
 <code>{children}</code>
 </pre>
 </div>
  )}
  </div>
  );
}
