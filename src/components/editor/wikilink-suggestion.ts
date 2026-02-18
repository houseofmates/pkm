import { ReactRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import tippy, { type Instance } from 'tippy.js';
import { SlashMenu } from './SlashMenu';

import { api } from '@/api/nocobase-client';

export const getWikilinkItems = async ({ query }: { query: string }) => {
  // We only trigger if the query starts with [ which implies [[ (since char is [)
  // Wait, the 'char' option strips the char from the query?
  // If char is [, and user types [, query is empty.
  // If user types [[, query is [.

  // Actually, handling [[ is tricky with standard Suggestion.
  // Let's assume we trigger on `[` and filtering happens in the UI or we use a custom matcher.
  // For now, let's just search for records matching the query.
  // If query is empty, show recent.

  // We search standard collections: 'notes', 'tasks', 'research'
  // This is a "Universal" search.

  try {
  const results = [];

  // 1. Search Notes
  const notes = await api.listRecords('notes', {
  filter: { title: { $includes: query } },
  pageSize: 5
  });
  const notesData = Array.isArray(notes?.data) ? notes?.data : (notes?.data as { data: unknown[] } | undefined)?.data;
  if (notesData) {
  results.push(...notesData.map((r: { title?: string; id: string }) => ({
 title: r.title || 'untitled',
 description: 'note',
 href: `/databases/notes/${r.id}`,
 label: r.title || 'Untitled'
  })));
  }

  // 2. Search Tasks
  const tasks = await api.listRecords('tasks', {
  filter: { title: { $includes: query } },
  pageSize: 3
  });
  const tasksData = Array.isArray(tasks?.data) ? tasks?.data : (tasks?.data as { data: unknown[] } | undefined)?.data;
  if (tasksData) {
  results.push(...tasksData.map((r: { title?: string; id: string }) => ({
 title: r.title || 'untitled',
 description: 'task',
 href: `/databases/tasks/${r.id}`,
 label: r.title || 'Untitled'
  })));
  }

  // Map to SlashMenu-compatible structure if reusing, or custom.
  // SlashMenu expects: { title, description, command }
  // We will adapt the command in the render or extensions.

  return results.map(item => ({
  // Command is handled by the extension's 'command' handler using these props
  ...item
  }));

  } catch (e) {
  console.error("Wikilink Search Error", e);
  return [];
  }
};

export const renderWikilinkItems = () => {
  let component: ReactRenderer | null = null;
  let popup: Instance[] | null = null;

  return {
  onStart: (props: { 
    items: { title: string; description: string; href: string; label: string }[]; 
    command: (args: unknown) => void; 
    clientRect?: () => DOMRect; 
    editor: Editor 
  }) => {
  const itemsWithCommand = props.items.map((item) => ({
 ...item,
 command: ({ editor, range }: { editor: unknown; range: unknown }) => {
 props.command({ editor, range, props: item });
 }
  }));

  component = new ReactRenderer(SlashMenu, {
 props: { ...props, items: itemsWithCommand },
 editor: props.editor,
  });

  if (!props.clientRect) {
 return;
  }

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

  onUpdate(props: { 
    items: { title: string; description: string; href: string; label: string }[]; 
    command: (args: unknown) => void; 
    clientRect?: () => DOMRect 
  }) {
  const itemsWithCommand = props.items.map((item) => ({
 ...item,
 command: ({ editor, range }: { editor: unknown; range: unknown }) => {
 props.command({ editor, range, props: item });
 }
  }));

  component?.updateProps({ ...props, items: itemsWithCommand });

  if (!props.clientRect) {
 return;
  }

  popup?.[0]?.setProps({
 getReferenceClientRect: props.clientRect,
  });
  },

  onKeyDown(props: { event: KeyboardEvent }) {
  if (props.event.key === 'Escape') {
 popup?.[0]?.hide();
 return true;
  }
  return (component?.ref as { onKeyDown?: (props: unknown) => boolean })?.onKeyDown?.(props) ?? false;
  },

  onExit() {
  popup?.[0].destroy();
  component?.destroy();
  },
  };
};
