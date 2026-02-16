
import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import { SlashMenu } from './SlashMenu';
import { CommandActions } from './command-actions';
import { api } from '@/api/nocobase-client';

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
  return {
  suggestion: {
 char: '/',
 command: ({ editor, range, props }: any) => {
 props.command({ editor, range });
 },
  },
  }
  },

  addProseMirrorPlugins() {
  return [
  Suggestion({
 editor: this.editor,
 ...this.options.suggestion,
  }),
  ]
  },
});

export const getSuggestionItems = async ({ query }: { query: string }) => {
  // 1. Static Commands
  const commands = [
  // --- Core Text Blocks ---
  {
  title: 'Text',
  description: 'Just start writing.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setParagraph().run();
  },
  },
  {
  title: 'Heading 1',
  description: 'Big section heading.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
  },
  },
  {
  title: 'Heading 2',
  description: 'Medium section heading.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
  },
  },
  {
  title: 'Heading 3',
  description: 'Small section heading.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
  },
  },

  // --- Lists & Tasks ---
  {
  title: 'Bullet List',
  description: 'Simple bulleted list.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).toggleBulletList().run();
  },
  },
  {
  title: 'Task List',
  description: 'Checkboxes for tasks.',
  command: ({ editor, range }: any) => {
 CommandActions.insertTodo(editor, range);
  },
  },

  // --- Special Actions (Void Extensions) ---
  {
  title: 'Front',
  description: 'Stamp current fronter.',
  command: ({ editor, range }: any) => {
 CommandActions.insertFront(editor, range);
  },
  },
  {
  title: 'To Canvas',
  description: 'Send to Edgeless Canvas.',
  command: ({ editor, range }: any) => {
 CommandActions.sendToCanvas(editor, range);
  },
  },
  {
  title: 'Image',
  description: 'Upload an image.',
  command: ({ editor, range }: any) => {
 CommandActions.triggerImageUpload(editor, range);
  },
  },

  // --- Formatting ---
  {
  title: 'Quote',
  description: 'Capture a quote.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).toggleBlockquote().run();
  },
  },
  {
  title: 'Code',
  description: 'Capture a code snippet.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
  },
  },
  {
  title: 'Divider',
  description: 'Visual separator.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setHorizontalRule().run();
  },
  },
  {
  title: 'Echo Block',
  description: 'Sync with NocoBase record.',
  command: ({ editor, range }: any) => {
 const collectionName = window.prompt('Enter Collection Name (e.g., notes):');
 if (!collectionName) return;
 const recordId = window.prompt('Enter Record ID:');
 if (!recordId) return;

 editor.chain().focus().deleteRange(range).setEchoBlock({ collectionName, recordId }).run();
  },
  },
  {
  title: 'Dashboard',
  description: 'Embed collection view.',
  command: ({ editor, range }: any) => {
 const collectionName = window.prompt('Enter Collection Name (e.g., tasks):');
 if (!collectionName) return;
 editor.chain().focus().deleteRange(range).setDashboardBlock({ collectionName, title: collectionName }).run();
  },
  },
  {
  title: 'AI Assistant',
  description: 'Ask Qwen (Casual)',
  command: async ({ editor, range }: any) => {
 // simple prompt for now
 const query = window.prompt('Ask AI (Context will be included):');
 if (!query) return;

 // Insert placeholder
 const startPos = range.from;
 editor.chain().focus().deleteRange(range).insertContent('Thinking...').run();

 try {
 const { generateResponse } = await import('@/lib/ai-service');
 const context = editor.getText();
 const response = await generateResponse(context, query);

 // Replace placeholder with response
 editor.chain().focus()
 .deleteRange({ from: startPos, to: startPos + 11 }) // 'Thinking...' length
 .insertContent(response)
 .run();
 } catch (e) {
 console.error(e);
 editor.chain().focus()
 .deleteRange({ from: startPos, to: startPos + 11 })
 .insertContent(`[AI Error]`)
 .run();
 }
  },
  },
  ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));

  // 2. Dynamic Search (if query exists)
  if (query.length > 2) {
  try {
  // Quick search on 'notes' collection as a primary target
  // In a real app we might search multiple or use a search index
  const res = await api.listRecords('notes', {
 filter: {
 title: { $includes: query }
 },
 pageSize: 3
  });

  const data = Array.isArray(res?.data) ? res.data : (res?.data as any)?.data;
  if (Array.isArray(data)) {
 const searchResults = data.map((note: any) => ({
 title: note.title || "Untitled Note",
 description: `Link to note`,
 command: ({ editor, range }: any) => {
 // Insert a link to the note
 editor.chain().focus().deleteRange(range)
   .setLink({ href: `/databases/notes/${note.id}` })
   .insertContent(note.title || "Untitled Note")
   .run();
 }
 }));
 return [...commands, ...searchResults];
  }
  } catch (e) {
  console.warn("Slash Search Failed", e);
  }
  }

  return commands;
};

export const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: Instance[] | null = null;

  return {
  onStart: (props: any) => {
  component = new ReactRenderer(SlashMenu, {
 props,
 editor: props.editor,
  });

  if (!props.clientRect) {
 return;
  }

  // @ts-ignore
  popup = tippy('body', {
 getReferenceClientRect: props.clientRect,
 appendTo: () => document.body,
 content: component.element,
 showOnCreate: true,
 interactive: true,
 trigger: 'manual',
 placement: 'bottom-start',
  });
  },

  onUpdate(props: any) {
  component?.updateProps(props);

  if (!props.clientRect) {
 return;
  }

  popup?.[0].setProps({
 getReferenceClientRect: props.clientRect,
  });
  },

  onKeyDown(props: any) {
  if (props.event.key === 'Escape') {
 popup?.[0].hide();
 return true;
  }
  return (component?.ref as any)?.onKeyDown(props);
  },

  onExit() {
  popup?.[0].destroy();
  component?.destroy();
  },
  };
};
