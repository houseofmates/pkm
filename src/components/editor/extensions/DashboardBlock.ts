import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DashboardBlockComponent } from './DashboardBlockComponent';

export const DashboardBlock = Node.create({
    name: 'dashboardBlock',

    group: 'block',

    atom: true,

    addAttributes() {
        return {
            collectionName: {
                default: null,
            },
            filter: {
                default: '{}',
            },
            title: {
                default: '',
            }
        };
    },

    parseHTML() {
        return [
            {
                tag: 'dashboard-block',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['dashboard-block', mergeAttributes(HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(DashboardBlockComponent);
    },

    addCommands() {
        return {
            setDashboardBlock:
                (options: { collectionName: string; filter?: string; title?: string }) =>
                    ({ commands }: any) => {
                        return commands.insertContent({
                            type: 'dashboardBlock',
                            attrs: options,
                        });
                    },
        };
    },
});

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        dashboardBlock: {
            setDashboardBlock: (options: { collectionName: string; filter?: string; title?: string }) => ReturnType;
        };
    }
}
