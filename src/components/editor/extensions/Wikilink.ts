import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';

export const Wikilink = Extension.create({
    name: 'wikilink',

    addOptions() {
        return {
            suggestion: {
                char: '[',
                pluginKey: new PluginKey('wikilink'),
                command: ({ editor, range, props }) => {
                    editor
                        .chain()
                        .focus()
                        .deleteRange(range)
                        .setLink({ href: props.href })
                        .insertContent(props.label)
                        .run();
                },
            },
        };
    },

    addProseMirrorPlugins() {
        return [
            Suggestion({
                editor: this.editor,
                ...this.options.suggestion,
            }),
        ];
    },
});
