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
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', style: 'flex: 1; min-width: 0; padding: 0.5rem; border: 1px dashed rgba(255,255,255,0.1); border-radius: 0.5rem;' }), 0];
  },
});

export const ColumnList = Node.create({
  name: 'columnList',
  content: 'column+',
  group: 'block',
  parseHTML() {
    return [{ tag: 'div[data-type="columnList"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'columnList', style: 'display: flex; gap: 1rem; width: 100%; margin: 1rem 0;' }), 0];
  },
  addCommands() {
    return {
      setColumns: (count: number) => ({ commands }) => {
        const columns = Array(count).fill({ type: 'column' });
        return commands.insertContent({
          type: 'columnList',
          content: columns
        });
      },
    } as any;
  },
});
