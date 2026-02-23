import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const DragHandleExtension = Extension.create({
  name: 'dragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('dragHandle'),
        props: {
          handleDrop(view, event) {
            const { clientX, clientY } = event;
            const pos = view.posAtCoords({ left: clientX, top: clientY });

            if (!pos) return false;

            // Find the target node at drop position
            const $pos = view.state.doc.resolve(pos.pos);
            const targetNode = $pos.nodeAfter || $pos.nodeBefore; // Rough heuristic

            if (!targetNode) return false;

            // Check if we are dropping ONTO a node's left/right edge
            const nodeDom = view.nodeDOM(pos.pos);
            // nodeDOM isn't reliable for all nodes (text nodes return text)
            // But we can approximate with coords

            // If dragging, we want to see if we should create columns.
            // Heuristic: If dropping in the left/right 20% of the editor width relative to a block?

            // Simplified Logic:
            // If the user drops a block *next* to another block visually, standard PM puts it above/below.
            // To force columns, we need to intercept.

            // For this iteration, let's rely on the "Click to Column" button in the handle for reliability,
            // as implementing robust drag-to-column requires calculating the drop vector relative to the target block's bounding box
            // which is flaky without a dedicated library like 'prosemirror-dropcursor' customized.

            // However, we CAN style the drop cursor.

            return false; // Let default move behavior happen
          },
        },
      }),
    ];
  },
});
