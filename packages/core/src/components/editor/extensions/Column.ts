import { Node, mergeAttributes } from '@tiptap/core';

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  addAttributes() {
    return {
      width: {
        default: 'auto',
        parseHTML: element => element.style.width,
        renderHTML: attributes => ({ style: `width: ${attributes.width}` }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'group relative min-w-0 flex-1 p-2 border border-transparent hover:border-white/5 rounded transition-colors' }), 0];
  },
});

export const ColumnList = Node.create({
  name: 'columnList',
  content: 'column+',
  group: 'block',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="columnList"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columnList', class: 'flex gap-4 w-full my-4' }), 0];
  },
  addCommands() {
    return {
      setColumns: (count: number) => ({ commands }) => {
        const columns = Array(count).fill({ type: 'column', content: [{ type: 'paragraph' }] });
        return commands.insertContent({
          type: 'columnList',
          content: columns
        });
      },
    } as any;
  },
});
