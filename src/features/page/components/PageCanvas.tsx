import React, { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWindowSize } from 'react-use';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { useEdgelessStore } from '@/features/edgeless/store';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface PageItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  content?: string;
}

export function PageCanvas() {
  const { width } = useWindowSize();
  // Use state for items for now. Ideally this would sync with a store or backend.
  const [items, setItems] = useState<PageItem[]>([
  { i: '1', x: 0, y: 0, w: 10, h: 4, content: '<p>Welcome to your new Page.</p>' },
  ]);

  // 10 columns logic
  const margin = 10;
  const containerPadding = 20;
  // Calculate row height or keep it standard
  const rowHeight = 30;

  const onLayoutChange = (layout: any) => {
  // Sync layout changes back to state
  // In a real app, save this to DB
  // setItems(prev => ... merge layout changes)
  console.log('Layout changed:', layout);
  };

  const addItem = () => {
  const id = crypto.randomUUID();
  setItems(prev => [
  ...prev,
  { i: id, x: 0, y: Infinity, w: 10, h: 2, content: '' }
  ]);
  };

    return (
        <div className="h-screen bg-[#060606] text-white flex flex-col font-['Varela_Round'] overflow-hidden">
            {/* Fixed Header Section matching Sidebar alignment */}
            <div className="pt-4 shrink-0 bg-[#060606] z-10 flex flex-col">
                <div className="max-w-[1200px] mx-auto px-5">
                    <div className="flex justify-between items-center mb-2 h-10">
                        <h1 className="text-3xl font-bold text-[var(--primary)]">Page Mode</h1>
                        <button
                            onClick={addItem}
                            className="px-4 py-2 bg-[var(--primary)] text-black font-bold rounded hover:bg-[#e5a010] transition-colors"
                        >
                            + Add Block
                        </button>
                    </div>
                </div>
                <Separator className="mb-2 bg-primary" />
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-x-hidden overflow-y-auto p-5 no-scrollbar">
                <div className="max-w-[1200px] mx-auto relative">
                    {/* The Grid */}
                    <GridLayout
                        className="layout"
                        layout={items}
                        cols={10}
                        rowHeight={rowHeight}
                        width={Math.min(width - 40, 1200)} // Responsive max width
                        margin={[margin, margin]}
                        onLayoutChange={onLayoutChange}
                        draggableHandle=".drag-handle"
                        isDraggable={true}
                        isResizable={true}
                    >
                        {items.map(item => (
                            <div key={item.i} className={cn(
                                "bg-[#111] border border-primary/20 rounded-lg overflow-hidden group hover:border-primary/40 transition-colors",
                                "flex flex-col font-['Varela_Round']"
                            )}>
                                {/* Drag Handle (Dedicated Top Bar) */}
                                <div className="drag-handle h-6 w-full bg-primary/10 cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <GripVertical className="w-4 h-4 text-white/30" />
                                </div>

   {/* Content Area */}
   <div className="flex-1 p-4 overflow-y-auto" style={{ fontFamily: '"Varela Round", sans-serif' }}>
   <BlockEditor
  content={item.content}
  className="min-h-full font-['Varela_Round']"
  placeholder="Type here..."
   />
   </div>
   </div>
 ))}
 </GridLayout>
 </div>
  </div>
  </div>
  );
}
