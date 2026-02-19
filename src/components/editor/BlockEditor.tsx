
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import { cn } from '@/lib/utils';
import './Editor.css';
import { SlashCommand, getSuggestionItems, renderItems } from './slash-command';
import Mention from '@tiptap/extension-mention';
import Image from '@tiptap/extension-image';
import { getMentionSuggestionItems, renderMentionItems } from './mention-config';
import { EchoBlock } from './extensions/EchoBlock';
import { DashboardBlock } from './extensions/DashboardBlock';
import { Wikilink } from './extensions/Wikilink';
import { getWikilinkItems, renderWikilinkItems } from './wikilink-suggestion';
import { FinancialBlock } from './extensions/FinancialBlock';
import { ImageGridBlock } from './extensions/ImageGridBlock';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';

interface BlockEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  className?: string;
  placeholder?: string;
}

export function BlockEditor({ content, onChange, editable = true, className, placeholder = "Type '/' for commands" }: BlockEditorProps) {
  const Editor = useEditor({
  extensions: [
  StarterKit.configure({
 heading: {
 levels: [1, 2, 3]
 }
  }),
  Placeholder.configure({
 placeholder: placeholder,
  }),
  SlashCommand.configure({
 suggestion: {
 items: getSuggestionItems,
 render: renderItems,
 },
  }),
  Mention.configure({
 HTMLAttributes: {
 class: 'mention',
 },
 suggestion: {
 items: getMentionSuggestionItems,
 render: renderMentionItems,
 },
  }),
  Image.configure({
 inline: true,
 allowBase64: true,
  }),
  EchoBlock,
  DashboardBlock,
  Typography,
  Wikilink.configure({
 suggestion: {
 items: getWikilinkItems,
 render: renderWikilinkItems,
 }
  }),
  FinancialBlock,
  ImageGridBlock,
  TextStyle,
  Color,
  ],
  content: content,
  editable: editable,
  editorProps: {
  attributes: {
 class: cn(
 'prose prose-invert max-w-none focus:outline-none min-h-[100px]',
 className
 ),
  },
  },
  onUpdate: ({ Editor }) => {
  const html = Editor.getHTML();
  if (onchange) onchange(html);
  },
  });

  if (!Editor) {
  return null;
  }

  return (
  <div className="relative w-full border border-input bg-transparent rounded-md px-3 py-2 shadow-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
  <EditorContent Editor={Editor} />
  </div>
  );
}
