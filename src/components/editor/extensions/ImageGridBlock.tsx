import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { ImageGrid } from '@/components/ImageGrid';

function ImageGridBlockComponent(props: any) {
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
            setImageGridBlock: (options) => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        };
    },
});
