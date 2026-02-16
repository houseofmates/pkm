import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { EchoBlockComponent } from './EchoBlockComponent';

export const EchoBlock = Node.create({
  name: 'echoBlock',

  group: 'block',

  atom: true,

  addAttributes() {
  return {
  recordId: {
 default: null,
  },
  collectionName: {
 default: null,
  },
  };
  },

  parseHTML() {
  return [
  {
 tag: 'echo-block',
  },
  ];
  },

  renderHTML({ HTMLAttributes }) {
  return ['echo-block', mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
  return ReactNodeViewRenderer(EchoBlockComponent);
  },

  addCommands() {
  return {
  setEchoBlock:
 (options: { recordId: string; collectionName: string }) =>
 ({ commands }: any) => {
 return commands.insertContent({
   type: 'echoBlock',
   attrs: options,
 });
 },
  };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
  echoBlock: {
  setEchoBlock: (options: { recordId: string; collectionName: string }) => ReturnType;
  };
  }
}
