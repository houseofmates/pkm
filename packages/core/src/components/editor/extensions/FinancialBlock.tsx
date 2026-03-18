import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FinancialChart } from '@/components/charts/FinancialChart';
import { NodeViewWrapper } from '@tiptap/react';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    financialBlock: {
      setFinancialBlock: (options: any) => ReturnType;
    };
  }
}

function FinancialBlockComponent(props: any) {
  return (
  <NodeViewWrapper className= "my-4" >
  <FinancialChart title={ props.node.attrs.title } />
  </NodeViewWrapper>
  );
}

export const FinancialBlock = Node.create({
  name: 'financialBlock',
  group: 'block',
  atom: true,

  addAttributes() {
  return {
  title: {
 default: 'Financial Overview',
  },
  };
  },

  parseHTML() {
  return [
  {
 tag: 'financial-block',
  },
  ];
  },

  renderHTML({ HTMLAttributes }) {
  return ['financial-block', HTMLAttributes];
  },

  addNodeView() {
  return ReactNodeViewRenderer(FinancialBlockComponent);
  },

  addCommands() {
  return {
  setFinancialBlock: (options: any) => ({ commands }: { commands: any }) => {
 return commands.insertContent({
 type: this.name,
 attrs: options,
 });
  },
  };
  },
});
