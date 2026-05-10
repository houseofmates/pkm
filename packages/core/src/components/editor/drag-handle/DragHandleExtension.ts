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

            // find the target node at drop position
            const $pos = view.state.doc.resolve(pos.pos);
            const targetNode = $pos.nodeAfter || $pos.nodeBefore; // rough heuristic

            if (!targetNode) return false;

            // check if we are dropping onto a node's left/right edge
            // nodedom isn't reliable for all nodes (text nodes return text)
            // but we can approximate with coords

            // if dragging, we want to see if we should create columns.
            // heuristic: if dropping in the left/right 20% of the editor width relative to a block?

            // simplified logic:
            // if the user drops a block *next* to another block visually, standard pm puts it above/below.
            // to force columns, we need to intercept.

            // for this iteration, let's rely on the "click to column" button in the handle for reliability,
            // as implementing robust drag-to-column requires calculating the drop vector relative to the target block's bounding box
            // which is flaky without a dedicated library like 'prosemirror-dropcursor' customized.

            // however, we can style the drop cursor.

            return false; // let default move behavior happen
          },
        },
      }),
    ];
  },
});
