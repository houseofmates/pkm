
import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import { MentionList } from './MentionList';

export const getMentionSuggestionItems = ({ query }: { query: string }) => {
    // TODO: Real API Search. 
    // For now, return a filtered list of dummy/cached items or expose a global function?
    // Hack: We can attach a global search handler on window?
    // or just fetch from a known endpoint if we had the client.
    // Let's rely on a window global for "quick pkm access" if needed, 
    // OR just return hardcoded for verification -> Phase 3 Verification.

    // Better: let's try to fetch from a standard endpoint if we can, or just mock it.
    // Mocking for speed.
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
    let component: ReactRenderer;
    let popup: Instance[];

    return {
        onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
                props,
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

        onUpdate: (props: any) => {
            component.updateProps(props);

            if (!props.clientRect) {
                return;
            }

            popup[0].setProps({
                getReferenceClientRect: props.clientRect,
            });
        },

        onKeyDown: (props: any) => {
            if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
            }

            return (component.ref as any)?.onKeyDown(props);
        },

        onExit: () => {
            popup[0].destroy();
            component.destroy();
        },
    };
};
