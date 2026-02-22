import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import { SlashMenu } from './SlashMenu';
import { CommandActions } from './command-actions';
import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

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
  const commands = [
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
  // --- Columns ---
  {
  title: '2 Columns',
  description: 'Create two equal columns.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setColumns(2).run();
  },
  },
  {
  title: '3 Columns',
  description: 'Create three equal columns.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setColumns(3).run();
  },
  },
  // --- Widgets ---
  {
  title: 'Insert Widget',
  description: 'Pick a widget from the registry.',
  command: ({ editor, range }: any) => {
 // This will trigger the react state in the parent component to open the picker
 // Since we can't easily access React state from here without a context bridge,
 // we'll dispatch a custom event.
 editor.chain().focus().deleteRange(range).run();
 window.dispatchEvent(new CustomEvent('pkm:open-widget-picker', {
 detail: {
 onSelect: (type: string, data: any) => {
 // Insert widget block
 editor.chain().focus().insertContent({
 type: 'widgetBlock',
 attrs: { type, data }
 }).run();
 }
 }
 }));
  },
  },
  // --- Lists ---
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
  {
  title: 'Image',
  description: 'Upload an image.',
  command: ({ editor, range }: any) => {
 CommandActions.triggerImageUpload(editor, range);
  },
  },
  {
  title: 'Divider',
  description: 'Visual separator.',
  command: ({ editor, range }: any) => {
 editor.chain().focus().deleteRange(range).setHorizontalRule().run();
  },
  },
  ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));

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

  // @ts-expect-error -- tippy popper types incompatible with reactrenderer return type
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
