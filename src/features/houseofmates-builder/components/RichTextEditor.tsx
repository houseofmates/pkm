import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Typography from '@tiptap/extension-typography';
import { Bold, Italic, List, ListOrdered, Heading1, Heading2, Quote, Code, Type } from 'lucide-react';

interface Props {
  content: string;
  onChange: (html: string) => void;
  editable: boolean;
  className?: string;
}

export function RichTextEditor({ content, onChange, editable, className = '' }: Props) {
  const Editor = useEditor({
  extensions: [
  StarterKit,
  TextStyle,
  Typography,
  Color.configure({ types: ['textStyle'] }),
  ],
  content: content,
  editable: editable,
  onUpdate: ({ Editor }) => {
  onChange(Editor.getHTML());
  },
  editorProps: {
  attributes: {
 class: `focus:outline-none custom-tiptap-Editor ${className}`,
  },
  },
  });

  useEffect(() => {
  if (Editor && Editor.isEditable !== editable) {
  Editor.setEditable(editable);
  if (editable) {
 Editor.commands.focus('end');
  }
  }
  }, [Editor, editable]);

  if (!Editor) {
  return null;
  }

  return (
  <div className="rich-text-wrapper relative cursor-text inline-block min-w-[1px]">
  {editable && createportal(
 <BubbleMenu
 Editor={Editor}
 {...({
 appendTo: () => document.body,
 tippyOptions: {
   zIndex: 9999,
   duration: 150,
 }
 } as any)}
 >
 <div className="flex items-center gap-1 p-1 rounded-full bg-[#1a1a1a] border border-white/20 shadow-xl overflow-hidden pointer-events-auto">
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleBold().run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('bold') ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Bold className="w-4 h-4" />
 </button>
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleItalic().run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('italic') ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Italic className="w-4 h-4" />
 </button>
 <div className="w-px h-4 bg-white/10 mx-1" />
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleHeading({ level: 1 }).run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('heading', { level: 1 }) ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Heading1 className="w-4 h-4" />
 </button>
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleHeading({ level: 2 }).run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('heading', { level: 2 }) ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Heading2 className="w-4 h-4" />
 </button>
 <div className="w-px h-4 bg-white/10 mx-1" />
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleBulletList().run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('bulletList') ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <List className="w-4 h-4" />
 </button>
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleOrderedList().run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('orderedList') ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <ListOrdered className="w-4 h-4" />
 </button>
 <div className="w-px h-4 bg-white/10 mx-1" />
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleBlockquote().run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('blockquote') ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Quote className="w-4 h-4" />
 </button>
 <button
   Type="button"
   onClick={() => Editor.chain().focus().toggleCodeBlock().run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('codeBlock') ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Code className="w-4 h-4" />
 </button>
 <button
   Type="button"
   onClick={() => Editor.chain().focus().setColor('var(--primary)').run()}
   className={`p-2 rounded-full hover:bg-white/10 transition-colors ${Editor.isActive('textStyle', { color: 'var(--primary)' }) ? 'text-[var(--primary)] bg-white/10' : 'text-white/70'}`}
 >
   <Type className="w-4 h-4 text-[var(--primary)]" />
 </button>
 </div>
 </BubbleMenu>,
 document.body
  )}

  <EditorContent Editor={Editor} className="min-w-0 inline-block" />

  <style dangerouslySetInnerHTML={{
 __html: `


 .ProseMirror, .ProseMirror * {
 font-family: 'Varela Round', sans-serif !important;
 line-height: 1.0 !important; /* tighter for snug fit */
 margin: 0 !important;
 padding: 0 !important;
 min-height: 1em !important;
 min-width: 0 !important;
 vertical-align: top !important;
 font-weight: 700 !important; /* bold */
 -webkit-text-stroke: 0.025em black !important; /* thinner, uniform outline */
 text-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; /* subtle realistic shadow */
 }
 .ProseMirror {
 outline: none !important;
 border: none !important;
 box-shadow: none !important;
 color: #fff;
 display: inline-block !important;
 width: auto !important;
 min-width: 1px !important;
 text-shadow: 0 2px 6px rgba(0,0,0,0.2);
 }
 .ProseMirror p {
 margin: 0 !important;
 padding: 0 !important;
 display: inline-block !important;
 }
 .ProseMirror > *:first-child {
 margin-top: 0 !important;
 margin-block-start: 0 !important; /* explicit zeroing as requested */
 padding-top: 0 !important;
 }
 .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
 text-shadow: 0 2px 10px rgba(0,0,0,0.25);
 margin: 0 !important;
 padding: 0 !important;
 display: inline-block !important;
 }
 .ProseMirror p.Is-Editor-empty:first-child::before {
 color: rgba(255, 255, 255, 0.3);
 content: 'double-click To edit...';
 float: left;
 height: 0;
 pointer-events: none;
 font-style: italic;
 margin: 0;
 padding: 0;
 }
 .custom-tiptap-Editor pre {
 background: #1e1e1e;
 border-radius: 0.5rem;
 color: #fff;
 font-family: 'JetBrains Mono', monospace;
 padding: 0.75rem 1rem;
 text-shadow: none;
 }
 .custom-tiptap-Editor blockquote {
 border-left-color: var(--primary);
 color: rgba(255, 255, 255, 0.7);
 }
 `
  }} />
  </div>
  );
}
