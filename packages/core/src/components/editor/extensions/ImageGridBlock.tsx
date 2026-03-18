import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ImageGrid } from '@/components/ImageGrid';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    imageGridBlock: {
      setImageGridBlock: (options: any) => ReturnType;
    };
  }
}

function ImageGridBlockComponent(_props: any) {
  return (
  <NodeViewWrapper className="my-8">
  <ImageGrid />
  </NodeViewWrapper>
  );
}

export const ImageGridBlock = Node.create({
  name: 'imageGridBlock',
  group: 'block',
  atom: true,

  addAttributes() {
  return {
  images: {
 default: [],
  },
  };
  },

  parseHTML() {
  return [
  {
 tag: 'image-grid-block',
  },
  ];
  },

  renderHTML({ HTMLAttributes }) {
  return ['image-grid-block', HTMLAttributes];
  },

  addNodeView() {
  return ReactNodeViewRenderer(ImageGridBlockComponent);
  },

  addCommands() {
  return {
  setImageGridBlock: (options: any) => ({ commands }: { commands: any }) => {
 return commands.insertContent({
 type: this.name,
 attrs: options,
 });
  },
  };
  },
});
