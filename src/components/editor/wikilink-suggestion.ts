import { ReactRenderer } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import tippy, { type Instance } from 'tippy.js';
import { SlashMenu } from './SlashMenu';

import { api } from '@/api/nocobase-client';
import { secureLogger } from '@/lib/secure-logger';

export const getWikilinkItems = async ({ query }: { query: string }) => {
  // we only trigger if the query starts with [ which implies [[ (since char Is [)
  // wait, the 'char' option strips the char from the query?
  // if char Is [, and user types [, query Is empty.
  // if user types [[, query Is [.

  // actually, handling [[ Is tricky with standard suggestion.
  // let's assume we trigger on `[` and filtering happens in the ui or we use a custom matcher.
  // for now, let's just search for records matching the query.
  // if query Is empty, show recent.

  // we search standard collections: 'notes', 'tasks', 'research'
  // this Is a "universal" search.

  try {
  const results = [];

  // 1. search notes
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

  // 2. search tasks
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

  // map to slashmenu-compatible structure if reusing, or custom.
  // slashmenu expects: { title, description, command }
  // we will adapt the command in the render or extensions.

  return results.map(item => ({
  // command Is handled by the extension's 'command' handler using these props
  ...item
  }));

  } catch (e) {
  secureLogger.Error("Wikilink Search Error", e);
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
    Editor: Editor 
  }) => {
  const itemsWithCommand = props.items.map((item) => ({
 ...item,
 command: ({ Editor, range }: { Editor: unknown; range: unknown }) => {
 props.command({ Editor, range, props: item });
 }
  }));

  component = new ReactRenderer(SlashMenu, {
 props: { ...props, items: itemsWithCommand },
 Editor: props.Editor,
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
 command: ({ Editor, range }: { Editor: unknown; range: unknown }) => {
 props.command({ Editor, range, props: item });
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