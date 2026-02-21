import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import { WidgetRenderer } from '@/components/widgets/WidgetRenderer';

export const WidgetBlock = Node.create({
  name: 'widgetBlock',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      type: { default: 'clock' },
      data: { default: {} },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="widget-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'widget-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer((props) => {
      const { type, data } = props.node.attrs;

      // Map legacy/simple types to WidgetRenderer expectations
      const widgetConfig = {
        view_type: type,
        title: type,
        data: data,
        ...data // spread data as well for simple widgets
      };

      return (
        <NodeViewWrapper className="my-4">
          <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20 p-1 relative group">
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
               <span className="text-[9px] uppercase tracking-widest bg-black/50 text-white/50 px-2 py-1 rounded">
                 Widget: {type}
               </span>
            </div>
            <WidgetRenderer widget={widgetConfig} data={{}} />
          </div>
        </NodeViewWrapper>
      );
    });
  },
});
