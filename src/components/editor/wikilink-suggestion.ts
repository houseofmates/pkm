import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance } from 'tippy.js';
import { SlashMenu } from './SlashMenu'; // Re-use SlashMenu UI for consistency or create a new one?
// Let's reuse SlashMenu but mapped to simple items for now, or create a specific list component.
// Reusing SlashMenu is risky if it expects specific prop shapes. 
// Let's create a minimal render function similar to slash-command.ts but tailored.

import { api } from '@/api/nocobase-client';

export const getWikilinkItems = async ({ query }: { query: string }) => {
    // We only trigger if the query starts with [ which implies [[ (since char is [)
    // Wait, the 'char' option strips the char from the query?
    // If char is [, and user types [, query is empty.
    // If user types [[, query is [.

    // Actually, handling [[ is tricky with standard Suggestion.
    // Let's assume we trigger on `[` and filtering happens in the UI or we use a custom matcher.
    // For now, let's just search for records matching the query.
    // If query is empty, show recent.

    // We search standard collections: 'notes', 'tasks', 'research'
    // This is a "Universal" search.

    try {
        const results = [];

        // 1. Search Notes
        const notes = await api.listRecords('notes', {
            filter: { title: { $includes: query } },
            pageSize: 5
        });
        if (notes?.data?.data) {
            results.push(...notes.data.data.map((r: any) => ({
                title: r.title || 'Untitled',
                description: 'Note',
                href: `/databases/notes/${r.id}`,
                label: r.title || 'Untitled'
            })));
        }

        // 2. Search Tasks
        const tasks = await api.listRecords('tasks', {
            filter: { title: { $includes: query } },
            pageSize: 3
        });
        if (tasks?.data?.data) {
            results.push(...tasks.data.data.map((r: any) => ({
                title: r.title || 'Untitled',
                description: 'Task',
                href: `/databases/tasks/${r.id}`,
                label: r.title || 'Untitled'
            })));
        }

        // Map to SlashMenu-compatible structure if reusing, or custom.
        // SlashMenu expects: { title, description, command }
        // We will adapt the command in the render or extensions.

        return results.map(item => ({
            title: item.title,
            description: item.description,
            // Command is handled by the extension's 'command' handler using these props
            ...item
        }));

    } catch (e) {
        console.error("Wikilink Search Error", e);
        return [];
    }
};

export const renderWikilinkItems = () => {
    let component: ReactRenderer | null = null;
    let popup: Instance[] | null = null;

    return {
        onStart: (props: any) => {
            // Re-use SlashMenu (it renders a list of items)
            // SlashMenu expects items with `title`, `description`, `command`?
            // Our extension calls `props.command` with the item.
            // So we need to ensure the item has the data we need.
            // But SlashMenu's internal `onClick` calls `item.command`.
            // The `Wikilink` extension defines a global command, but here we might need per-item command?
            // Yes, standard Tiptap Suggestion calls `item.command` if defined, OR we pass a handler.
            // Let's inject a command into each item that calls the suggestion's range command.

            const itemsWithCommand = props.items.map((item: any) => ({
                ...item,
                command: ({ editor, range }: any) => {
                    // Call the extension's defined command with the item props
                    props.command({ editor, range, props: item });
                }
            }));

            component = new ReactRenderer(SlashMenu, {
                props: { ...props, items: itemsWithCommand },
                editor: props.editor,
            });

            if (!props.clientRect) {
                return;
            }

            // @ts-ignore
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

        onUpdate(props: any) {
            const itemsWithCommand = props.items.map((item: any) => ({
                ...item,
                command: ({ editor, range }: any) => {
                    props.command({ editor, range, props: item });
                }
            }));

            component?.updateProps({ ...props, items: itemsWithCommand });

            if (!props.clientRect) {
                return;
            }

            popup?.[0].setProps({
                getReferenceClientRect: props.clientRect,
            });
        },

        onKeyDown(props: any) {
            if (props.event.key === 'Escape') {
                popup?.[0].hide();
                return true;
            }
            return (component?.ref as any)?.onKeyDown(props);
        },

        onExit() {
            popup?.[0].destroy();
            component?.destroy();
        },
    };
};
