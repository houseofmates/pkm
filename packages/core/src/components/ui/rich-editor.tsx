import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { secureLogger } from '@/lib/secure-logger';
import { WIDGET_REGISTRY } from '@/features/widgets/registry';
import { UniversalWidgetPicker } from '@/features/widgets/UniversalWidgetPicker';

export interface RichEditorProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onChange?: (html: string) => void;
  uploadImage?: (file: File) => Promise<string> | string;
  showToolbar?: boolean;
}

export function markdownToHtml(md: string) {
  if (!md) return '';
  let out = md.replace(/&/g, '&amp;').replace(/</g, '<').replace(/>/g, '>');
  out = out.replace(/\`\`\`([\s\S]*?)\`\`\`/g, (_, code) => `<pre><code>${code.replace(/</g, '<')}</code></pre>`);
  out = out.replace(/^### (.*$)/gim, '<h3></h3>');
  out = out.replace(/^## (.*$)/gim, '<h2></h2>');
  out = out.replace(/^# (.*$)/gim, '<h1></h1>');
  out = out.replace(/^> (.*$)/gim, '<blockquote></blockquote>');
  out = out.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="" src="" />');
  out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href=""></a>');
  out = out.replace(/^(?:\*|-) +(.*)$/gim, '<li></li>');
  out = out.replace(/(<li>.*<\/li>\s?)+/gms, match => `<ul>${match}</ul>`);
  out = out.replace(/^(?!<h|<ul|<pre|<blockquote|<img|<p)([^\n]+)$/gim, '<p></p>');
  // widget placeholder regex could be added here for rendering view mode
  return out;
}

function SlashMenu({ onSelect, onClose, position }: { onSelect: (cmd: string) => void, onClose: () => void, position: { top: number, left: number } }) {
  const commands = [
    { id: 'h1', label: 'Heading 1', icon: 'H1' },
    { id: 'h2', label: 'Heading 2', icon: 'H2' },
    { id: 'ul', label: 'Bullet List', icon: '•' },
    { id: 'image', label: 'Image', icon: '🖼️' },
    { id: 'divider', label: 'Divider', icon: '—' },
    { id: 'widget', label: 'Insert Widget...', icon: '⚡' },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed z-[9999] w-48 bg-popover text-popover-foreground border rounded-lg shadow-xl p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
      style={{ top: position.top + 24, left: position.left }}
    >
      <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 uppercase tracking-wider">blocks</div>
      {commands.map(cmd => (
        <button
          key={cmd.id}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent hover:text-accent-foreground text-sm rounded-md text-left transition-colors"
          onClick={() => onSelect(cmd.id)}
        >
          <span className="w-5 text-center font-mono opacity-70 text-xs">{cmd.icon}</span>
          <span>{cmd.label}</span>
        </button>
      ))}
    </div>
  );
}

export function RichEditor({ value = '', placeholder, className, onChange, uploadImage, showToolbar = true }: RichEditorProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [slashMenu, setSlashMenu] = useState<{ open: boolean, top: number, left: number } | null>(null);
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);

  useEffect(() => {
    const html = value || '';
    if (ref.current && html !== ref.current.innerHTML) {
      if (document.activeElement !== ref.current) {
        ref.current.innerHTML = html || '';
      }
    }
  }, [value]);

  useEffect(() => {
    // ensure editor is focusable when opened from a click in another component
    if (ref.current) {
      ref.current.focus();
    }
  }, []);

  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
    onChange?.(ref.current?.innerHTML || '');
    setSlashMenu(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setSlashMenu({
          open: true,
          top: rect.top,
          left: rect.left
        });
      }
    }
  };

  const handleSlashSelect = (cmdId: string) => {
    // Delete the slash
    document.execCommand('delete', false);

    switch (cmdId) {
      case 'h1': exec('formatBlock', 'H1'); break;
      case 'h2': exec('formatBlock', 'H2'); break;
      case 'ul': exec('insertUnorderedList'); break;
      case 'divider': exec('insertHorizontalRule'); break;
      case 'image': fileRef.current?.click(); break;
      case 'widget': setWidgetPickerOpen(true); break;
    }
    setSlashMenu(null);
  };

  const handleWidgetSelect = (type: string, data: any) => {
    // Insert a widget placeholder block
    // In a real WYSIWYG, this would be a React Node View (like Tiptap)
    // For contentEditable, we insert an HTML element with data attributes
    // that the parent renderer (PageRenderer) can hydrate.

    const id = Math.random().toString(36).substr(2, 9);
    const widgetHtml = `<div class="widget-embed" data-widget-type="${type}" data-widget-id="${id}" data-widget-props='${JSON.stringify(data)}' contenteditable="false" style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.2); margin: 10px 0;">[Widget: ${type}]</div><p><br/></p>`;

    // We need to insert this HTML at the cursor position
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = document.createRange().createContextualFragment(widgetHtml);
        range.insertNode(frag);
        // Move cursor after
        range.collapse(false);
    } else {
        // Fallback append
        ref.current!.innerHTML += widgetHtml;
    }

    onChange?.(ref.current?.innerHTML || '');
  };

  const insertImageFromFile = async (file?: File) => {
    if (!file) return;
    if (uploadImage) {
      try {
        const url = await uploadImage(file);
        exec('insertImage', url);
      } catch (e) {
        secureLogger.error('Image upload failed', e);
      }
    } else {
      const url = URL.createObjectURL(file);
      exec('insertImage', url);
    }
  };

  return (
    <div className={cn('w-full relative group', className)}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
        const files = (e.target as HTMLInputElement).files;
        if (files?.[0]) insertImageFromFile(files[0]);
      }} />

      {slashMenu && (
        <>
          <div className="fixed inset-0 z-[9990] bg-transparent" onClick={() => setSlashMenu(null)} />
          <SlashMenu
            onSelect={handleSlashSelect}
            onClose={() => setSlashMenu(null)}
            position={slashMenu}
          />
        </>
      )}

      {showToolbar && (
        <div className="flex gap-1 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute -top-8 left-0 bg-background/80 backdrop-blur rounded-md p-1 border shadow-sm z-10">
          <button type="button" className="p-1 hover:bg-muted rounded text-xs font-bold w-6" onClick={() => exec('bold')}>B</button>
          <button type="button" className="p-1 hover:bg-muted rounded text-xs italic w-6" onClick={() => exec('italic')}>I</button>
          <button type="button" className="p-1 hover:bg-muted rounded text-xs w-6" onClick={() => exec('formatBlock', 'H1')}>H1</button>
          <button type="button" className="p-1 hover:bg-muted rounded text-xs w-6" onClick={() => exec('insertUnorderedList')}>•</button>
          <button type="button" className="p-1 hover:bg-muted rounded text-xs" onClick={() => fileRef.current?.click()}>IMG</button>
        </div>
      )}

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange?.(ref.current?.innerHTML || '')}
        onKeyDown={handleKeyDown}
        className={cn(
            'min-h-[120px] p-4 rounded-lg focus:outline-none prose prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground',
            'focus:bg-white/5 transition-colors duration-200'
        )}
        data-placeholder={placeholder}
      />

      <UniversalWidgetPicker
        open={widgetPickerOpen}
        onOpenChange={setWidgetPickerOpen}
        onSelect={handleWidgetSelect}
      />
    </div>
  );
}

export default RichEditor;
