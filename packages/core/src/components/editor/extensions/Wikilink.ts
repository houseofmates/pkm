import { Extension, Editor, type Range } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { registry } from '@/lib/link-registry';

export const Wikilink = Extension.create({
  name: 'wikilink',

  addOptions() {
    return {
      suggestion: {
        char: '[',
        pluginKey: new PluginKey('wikilink'),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: { href: string; label: string } }) => {

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setLink({ href: props.href })
            .insertContent(props.label)
            .run();

          // register this link in the bidirectional link registry
          // href format is /databases/{collection}/{id}
            const hrefParts = props.href.split('/').filter(Boolean)
            if (hrefParts.length >= 3 && hrefParts[0] === 'databases') {
              const targetCollection = hrefParts[1]
              const targetId = hrefParts[2]

            // source context is not available here — will be resolved
            // when the document is saved via registry.rescan() in use-records.ts
            // but we can eagerly register if we have context
            const sourceMeta = (editor.options as { editorProps?: { attributes?: { 'data-record-id'?: string; 'data-collection'?: string } } })?.editorProps?.attributes
            if (sourceMeta?.['data-record-id']) {
              registry.register({
                sourceId: sourceMeta['data-record-id'],
                sourceCollection: sourceMeta['data-collection'] || 'unknown',
                targetId,
                targetCollection,
                label: props.label,
              })
            }
          }
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
