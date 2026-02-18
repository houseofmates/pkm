
import { ReactRenderer } from '@tiptap/react';
import type { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';
import tippy, { type Instance } from 'tippy.js';
import { MentionList } from './MentionList';

export const getMentionSuggestionItems = ({ query }: { query: string }) => {
  // todo: real api search.
  // for now, return a filtered list of dummy/cached items or expose a global function?
  // hack: we can attach a global search handler on window?
  // or just fetch from a known endpoint if we had the client.
  // let's rely on a window global for "quick pkm access" if needed,
  // or just return hardcoded for verification -> phase 3 verification.

  // better: let's try to fetch from a standard endpoint if we can, or just mock it.
  // mocking for speed.
  const mockItems = [
  { id: '1', title: 'Project Alpha' },
  { id: '2', title: 'Meeting Notes' },
  { id: '3', title: 'PKM' },
  { id: '4', title: 'Phase 3 Power' },
  { id: '5', title: 'Task: Buy Milk' },
  ];

  return mockItems
  .filter(item => item.title.toLowerCase().startsWith(query.toLowerCase()))
  .slice(0, 5);
};

export const renderMentionItems = () => {
  let component: ReactRenderer | null = null;
  let popup: Instance | null = null;

  return {
  onStart: (props: SuggestionProps) => {
  component = new ReactRenderer(MentionList, {
 props,
 editor: props.editor,
  });

  if (!props.clientRect) {
 return;
  }

  popup = tippy(document.body, {
 getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
 appendTo: () => document.body,
 content: component.element,
 showOnCreate: true,
 interactive: true,
 trigger: 'manual',
 placement: 'bottom-start',
  });
  },

  onUpdate: (props: SuggestionProps) => {
  if (!component) return;
  component.updateProps(props);

  if (!props.clientRect || !popup) {
 return;
  }

  popup.setProps({
 getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(0, 0, 0, 0),
  });
  },

  onKeyDown: (props: SuggestionKeyDownProps) => {
  if (props.event.key === 'Escape') {
 popup?.hide();
 return true;
  }

  return (component?.ref as { onKeyDown?: (props: SuggestionKeyDownProps) => boolean })?.onKeyDown?.(props) ?? false;
  },

  onExit: () => {
  popup?.destroy();
  component?.destroy();
  },
  };
};
