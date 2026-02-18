import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MarkdownCheatSheet({ open, onClose }: MarkdownCheatSheetProps) {
  return (
  <Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-3xl max-h-[80vh] font-varela">
 <DialogHeader>
 <DialogTitle className="text-2xl lowercase">markdown cheat sheet</DialogTitle>
 </DialogHeader>
 <ScrollArea className="h-[600px] pr-4">
 <div className="space-y-6 text-sm">
 {/* headers */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">headers</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div># H1 Header</div>
   <div>## H2 Header</div>
   <div>### H3 Header</div>
   </div>
 </section>

 {/* emphasis */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">emphasis</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>**bold** or __bold__</div>
   <div>*italic* or _italic_</div>
   <div>***bold italic***</div>
   <div>~~strikethrough~~</div>
   <div>==highlight==</div>
   </div>
 </section>

 {/* lists */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">lists</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>- Unordered list</div>
   <div>* Alternative bullet</div>
   <div>+ Another bullet</div>
   <div className="mt-2">1. Ordered list</div>
   <div>2. Second item</div>
   <div>3. Third item</div>
   </div>
 </section>

 {/* links & images */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">links & images</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>[Link text](url)</div>
   <div>![Alt text](image-url)</div>
   <div>[Link with title](url "Title")</div>
   </div>
 </section>

 {/* code */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">code</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>`inline code`</div>
   <div className="mt-2">```language</div>
   <div>code block</div>
   <div>```</div>
   </div>
 </section>

 {/* blockquotes */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">blockquotes</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>&gt; Quote text</div>
   <div>&gt;&gt; Nested quote</div>
   </div>
 </section>

 {/* tables */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">tables</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>| Header 1 | Header 2 |</div>
   <div>|----------|----------|</div>
   <div>| Cell 1  | Cell 2  |</div>
   </div>
 </section>

 {/* task lists */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">task lists</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>- [ ] Unchecked task</div>
   <div>- [x] Completed task</div>
   </div>
 </section>

 {/* horizontal rule */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">horizontal rule</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>---</div>
   <div>***</div>
   <div>___</div>
   </div>
 </section>

 {/* advanced */}
 <section>
   <h3 className="text-lg font-semibold mb-2 lowercase">advanced</h3>
   <div className="bg-muted/20 p-3 rounded font-mono text-xs space-y-1">
   <div>||Spoiler text||</div>
   <div>:emoji:</div>
   <div>^superscript^</div>
   <div>~subscript~</div>
   <div>[^1]: Footnote</div>
   </div>
 </section>

 {/* keyboard shortcut */}
 <section className="pt-4 border-t">
   <p className="text-muted-foreground text-xs lowercase">
   press <kbd className="px-2 py-1 bg-muted rounded text-xs">ctrl+m</kbd> anytime to open this cheat sheet
   </p>
 </section>
 </div>
 </ScrollArea>
  </DialogContent>
  </Dialog>
  );
}
