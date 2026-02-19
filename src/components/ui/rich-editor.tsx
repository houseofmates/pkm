import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface RichEditorProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onChange?: (html: string) => void;
  uploadImage?: (file: File) => promise<string> | string;
  showToolbar?: boolean;
}

// very small, dependency-free rich editor using contenteditable and document.execcommand
export function markdownToHtml(md: string) {
  if (!md) return '';
  // very lightweight markdown -> html converter for paste/initial import
  let out = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // code blocks ```
  out = out.replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.replace(/</g, '&lt;')}</code></pre>`);
  // headings
  out = out.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  out = out.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  out = out.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // blockquote
  out = out.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  // images
  out = out.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2" />');
  // links
  out = out.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  // lists
  out = out.replace(/^(?:\*|-) +(.*)$/gim, '<li>$1</li>');
  out = out.replace(/(<li>.*<\/li>\s?)+/gms, match => `<ul>${match}</ul>`);
  // paragraphs
  out = out.replace(/^(?!<h|<ul|<pre|<blockquote|<img|<p)([^\n]+)$/gim, '<p>$1</p>');
  return out;
}

// ... imports
import { useState } from 'react';

// simplified command menu concept
function SlashMenu({ onSelect, onClose, position }: { onSelect: (cmd: string) => void, onClose: () => void, position: { top: number, left: number } }) {
  const commands = [
  { id: 'h1', label: 'heading 1', icon: 'h1' },
  { id: 'h2', label: 'heading 2', icon: 'h2' },
  { id: 'ul', label: 'bullet list', icon: '•' },
  { id: 'ol', label: 'numbered list', icon: '1.' },
  { id: 'blockquote', label: 'quote', icon: '❝' },
  { id: 'pre', label: 'code block', icon: '<>' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  ];

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeeventlistener('keydown', handlekeydown);
  }, [onclose]);

  return (
  <div
  className="fixed z-50 w-48 bg-popover text-popover-foreground border rounded-md shadow-md p-1 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-100"
  style={{ top: position.top + 24, left: position.left }}
  >
  <div className="text-[10px] font-bold text-muted-foreground px-2 py-1">basic blocks</div>
  {commands.map(cmd => (
 <button
 key={cmd.id}
 className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent/50 hover:text-accent-foreground text-sm rounded-sm text-left"
 onClick={() => onSelect(cmd.id)}
 >
 <span className="w-5 text-center font-mono opacity-70 text-xs">{cmd.icon}</span>
 <span>{cmd.label}</span>
 </button>
  ))}
  </div>
  );
}

export function richeditor({ value = '', placeholder, classname, onchange, uploadimage, showtoolbar = true }: richeditorprops) {
  const ref = useref<HTMLDivElement | null>(null);
  const fileref = useref<HTMLInputElement | null>(null);

  // slash menu state
  const [slashmenu, setslashmenu] = useState<{ open: boolean, top: number, left: number } | null>(null);

  useEffect(() => {
  // sync html ...
  const html = value || '';
  if (ref.current && html !== ref.current.innerHTML) {
  // only update if significantly different to avoid cursor jumping
  // actually, with simple contenteditable, updating innerhtml resets cursor.
  // we should only update if not focused or if empty?
  // for now, naive implementation.
  if (document.activeElement !== ref.current) {
 ref.current.innerHTML = html || '';
  }
  }
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
  document.execCommand(cmd, false, arg);
  ref.current?.focus();
  onChange?.(ref.current?.innerHTML || '');
  setSlashMenu(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === '/') {
  // check if we are at start of line or preceded by space?
  // for simplicity, just trigger menu at cursor
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
  // remove the '/' that triggered it?
  // since we didn't preventdefault, the '/' is likely in the text.
  // we might want to remove the last character.
  document.execCommand('delete', false); // Delete the '/'

  switch (cmdId) {
  case 'h1': exec('formatBlock', 'H1'); break;
  case 'h2': exec('formatBlock', 'H2'); break;
  case 'ul': exec('insertUnorderedList'); break;
  case 'ol': exec('insertOrderedList'); break;
  case 'blockquote': exec('formatBlock', 'BLOCKQUOTE'); break;
  case 'pre': exec('formatBlock', 'PRE'); break;
  case 'image': fileRef.current?.click(); break;
  }
  setSlashMenu(null);
  };

  // ... insertimagefromfile, handlepaste ...

  // (copy paste previous helper functions manually if needed or assume they persist if not overwritten widely)
  // actually replace_file_content overwrites the range, so i need to include them if i am replacing the component body.
  // the previous tool call view_file output implies i should preserve them.
  // i will include them simplified.

  const insertImageFromFile = async (file?: File) => {
  if (!file) return;
  if (uploadimage) {
  try {
 const url = await uploadimage(file);
 const frag = document.createrange().createcontextualfragment(`<figure><img src="${url}" alt="" /><figcaption contenteditable>caption...</figcaption></figure><p><br/></p>`);
 ref.current?.appendChild(frag);
 onChange?.(ref.current?.innerHTML || '');
  } catch (e) {
 console.error('Image upload failed', e);
  }
  } else {
  const url = URL.createObjectURL(file);
  const frag = document.createRange().createContextualFragment(`<figure><img src="${url}" alt="" /><figcaption contenteditable>caption...</figcaption></figure><p><br/></p>`);
  ref.current?.appendChild(frag);
  onChange?.(ref.current?.innerHTML || '');
  }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
  const text = e.clipboarddata.getdata('text/plain');
  const html = e.clipboarddata.getdata('text/html');
  if (text && !html) {
  e.preventdefault();
  const converted = markdowntohtml(text);
  document.execcommand('inserthtml', false, converted);
  onchange?.(ref.current?.innerhtml || '');
  }
  };

  return (
  <div className={cn('w-full relative', className)}>
  {/* hidden input for images */}
  <input ref={fileRef} type="file" accept="image/*" classname="hidden" onchange={e => {
 const files = (e.target as htmlinputelement).files;
 if (!files) return;
 array.from(files).foreach(f => insertimagefromfile(f));
 if (e.currenttarget) (e.currenttarget as htmlinputelement).value = '';
  }} multiple />

{slashmenu && (
  <>
  <div classname="fixed inset-0 z-40 bg-transparent" onclick={() => setslashmenu(null)} />
  <slashmenu
  onselect={handleslashselect}
  onclose={() => setslashmenu(null)}
  position={slashmenu}
 />
 </>
  )}

  {showtoolbar && (
 <div classname="flex gap-1 mb-2 opacity-20 hover:opacity-100 transition-opacity duration-300">
 {/* ... toolbar buttons (simplified for brevity, or kept) ... */}
 <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('bold')}>b</button>
 <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('italic')}>i</button>
 <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('formatBlock', 'H1')}>h1</button>
 <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => exec('insertUnorderedList')}>•</button>
 <button type="button" className="btn-ghost btn-sm text-xs" onClick={() => fileRef.current?.click()}>img</button>
 </div>
  )}
  <div
 ref={ref}
 contentEditable
 suppressContentEditableWarning
 onPaste={handlePaste}
 onInput={() => onChange?.(ref.current?.innerHTML || '')}
 // onblur={() => onchange?.(ref.current?.innerhtml || '')} // disabled to allow clicking menu
 onKeyDown={handleKeyDown}
 className={cn('min-h-[120px] p-2 rounded focus:outline-none prose prose-invert max-w-none', placeholder ? 'placeholder' : '')}
 data-placeholder={placeholder}
  />
  </div>
  );
}

export default RichEditor;