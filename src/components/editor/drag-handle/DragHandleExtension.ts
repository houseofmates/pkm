import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const DragHandleExtension = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragHandle'),
        props: {
          handleDrop(view, event, slice, moved) {
            // Check if drop is near edge to trigger columns
            // This is where "hover to split" logic lives
            // For now, standard drop behavior is preserved, which allows moving blocks.
            // Column creation logic requires detecting if drop target is valid for column wrap.
            return false;
          },
        },
      }),
    ];
  },
});
