import { useEffect, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { GripVertical, Columns } from 'lucide-react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface DragHandleProps {
  editor: Editor;
}

export function DragHandle({ editor }: DragHandleProps) {
  const [position, setPosition] = useState<{ top: number; left: number; height: number } | null>(null);
  const [currentNodePos, setCurrentNodePos] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const handleMouseMove = (e: MouseEvent) => {
      const editorDom = editor.view.dom;
      const rect = editorDom.getBoundingClientRect();

      // Expanded hit area for the handle
      if (
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom &&
        e.clientX >= rect.left - 60 && // wider gutter detection
        e.clientX <= rect.right
      ) {
        const pos = editor.view.posAtCoords({ left: rect.left + 10, top: e.clientY });

        if (pos) {
          // Find the block node
          let resolvedPos = editor.state.doc.resolve(pos.pos);
          let depth = resolvedPos.depth;
          // Walk up to find a block level node that is a direct child of doc or column
          // We want the "block" (paragraph, heading, etc)
          while (depth > 0) {
            const node = resolvedPos.node(depth);
            if (node.isBlock && (node.type.name !== 'doc' && node.type.name !== 'columnList')) {
              break;
            }
            depth--;
          }

          // If we went too far up or didn't find a good block, fallback to immediate
          if (depth <= 0) depth = 1;

          const nodePos = resolvedPos.before(depth);
          const nodeDom = editor.view.nodeDOM(nodePos) as HTMLElement;

          if (nodeDom && nodeDom.getBoundingClientRect) {
            const nodeRect = nodeDom.getBoundingClientRect();

            // Only update if significantly different to avoid jitter
            // Check Y position
            const newTop = nodeRect.top + window.scrollY;

            // Debounce/check if close enough
            setPosition({
              top: newTop,
              left: nodeRect.left + window.scrollX - 24,
              height: nodeRect.height
            });
            setCurrentNodePos(nodePos);
            return;
          }
        }
      }
      // Don't hide immediately if hovering the handle itself
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;

      setPosition(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [editor]);

  if (!position) return null;

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[9999] flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
      style={{
        top: position.top,
        left: position.left - 10, // slight offset
        height: 24, // Fixed height handle
        pointerEvents: 'auto',
      }}
    >
      <div
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded flex items-center justify-center"
        draggable="true"
        onDragStart={(e) => {
          if (currentNodePos === null) return;

          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setDragImage(e.target as Element, 0, 0);

          // Select the node
          const node = editor.state.doc.nodeAt(currentNodePos);
          if (node) {
             // We set a custom mime type to identify this as a prose-mirror drag
             // But actually, we just want to leverage native behavior if possible
             // OR trigger our extension's drag handler

             // Trick: Select the node in the editor so Tiptap's drag handler picks it up
             editor.commands.setNodeSelection(currentNodePos);
          }
        }}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Quick Actions (e.g. Add Column) */}
      <button
        className="p-1 hover:bg-white/10 rounded text-muted-foreground hover:text-primary transition-colors"
        title="Wrap in Columns"
        onClick={() => {
            if (currentNodePos !== null) {
                // Replace setColumns with a valid command or show a placeholder
                // Example: wrap node in columns extension if available, otherwise show toast
                // editor.chain().setNodeSelection(currentNodePos).wrapInColumns(2).run();
                toast.info('columns extension not available');
            }
        }}
      >
        <Columns className="w-3 h-3" />
      </button>
    </div>,
    document.body
  );
}
