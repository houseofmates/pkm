
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, Save, Database, Trash2, Move, Minimize2, Lock, Unlock, Pencil, Eraser, Scissors, MousePointer2, Settings2, Check } from 'lucide-react';
// ...
import { HexColorPicker } from 'react-colorful';
// ...

// ...
<div className="flex items-center gap-2">
    <LayoutGrid className="h-5 w-5 text-primary" />

    {isOver && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">Drop to Add</span>}
</div>
{ isOver && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full animate-pulse">Drop to Add</span> }
                </div >
    <div className="flex items-center gap-2 relative">
        <Button
            variant={isEditMode ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setIsEditMode(!isEditMode)}
            title={isEditMode ? "Lock Layout" : "Unlock Layout"}
        >
            {isEditMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
        </Button>

        <Button
            onClick={(e) => { e.stopPropagation(); setAddMenuOpen(!addMenuOpen); }}
            variant={addMenuOpen ? "secondary" : "default"}
        >
            <Plus className="h-4 w-4 mr-2" /> add view
        </Button>

        {addMenuOpen && (
            <div
                className="absolute top-full right-0 mt-2 w-64 bg-popover border rounded-md shadow-lg z-50 max-h-[80vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    add collection view
                </div>

                {collections.map(col => (
                    <div key={col.name} className="border-b last:border-0 border-border/50">
                        <div className="px-2 py-1.5 text-sm font-medium flex items-center bg-muted/30">
                            <Database className="mr-2 h-3 w-3 opacity-50" />
                            {col.title || col.name}
                        </div>
                        <div className="grid grid-cols-2 gap-1 p-1">
                            {VIEW_OPTIONS.map(view => (
                                <button
                                    key={view.id}
                                    className="text-xs text-left px-2 py-1.5 hover:bg-muted rounded-sm transition-colors text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                        handleAddWidget(col.name, view.id);
                                        setAddMenuOpen(false);
                                    }}
                                >
                                    + {view.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        <Button size="sm" variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> save
        </Button>
    </div>
            </div >

    {/* Canvas Area */ }
    < div
ref = {(node) => {
    containerRef.current = node;
    setNodeRef(node);
}}
className = {`flex-1 relative bg-neutral-50/50 dark:bg-neutral-900/20 overflow-auto cursor-grab active:cursor-grabbing ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
onClick = {() => setAddMenuOpen(false)}
            >
    {/* Infinite Canvas Content */ }
    < div className = "min-w-[2000px] min-h-[2000px] relative" >
    {
        widgets.map(widget => {
            const ViewComponent = VIEW_REGISTRY[widget.viewType];
            const data = widgetData[widget.id]?.data || [];

            return (
                <div
                    key={widget.id}
                    className="absolute bg-card border rounded-xl shadow-sm flex flex-col overflow-hidden group select-none transition-shadow hover:shadow-md"
                    style={{
                        left: widget.x,
                        top: widget.y,
                        width: widget.w,
                        height: widget.h,
                        zIndex: widget.zIndex,
                    }}
                    onMouseDown={() => bringToFront(widget.id)}
                >
                    {/* Header / Drag Handle */}
                    <div
                        className={`flex items-center justify-between p-2 border-b bg-muted/10 cursor-move ${isEditMode ? 'opacity-100' : 'opacity-0 hover:opacity-100'} transition-opacity`}
                        onMouseDown={(e) => {
                            if (!isEditMode) return;
                            e.preventDefault();
                            setDragState({
                                id: widget.id,
                                startX: e.clientX,
                                startY: e.clientY,
                                initialX: widget.x,
                                initialY: widget.y,
                                initialW: widget.w,
                                initialH: widget.h,
                                mode: 'move'
                            });
                        }}
                    >
                        <div className="font-medium text-xs flex items-center gap-2 text-muted-foreground">
                            <Move className="h-3 w-3" />
                            {widget.title}
                        </div>
                        {isEditMode && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={(e) => { e.stopPropagation(); handleRemoveWidget(widget.id); }}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto p-2">
                        <ViewComponent
                            data={data}
                            collection={collections.find(c => c.name === widget.collectionName)}
                            loading={false}
                        />
                    </div>

                    {/* Resize Handle */}
                    {isEditMode && (
                        <div
                            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-end justify-end p-1 opacity-0 group-hover:opacity-100"
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setDragState({
                                    id: widget.id,
                                    startX: e.clientX,
                                    startY: e.clientY,
                                    initialX: widget.x,
                                    initialY: widget.y,
                                    initialW: widget.w,
                                    initialH: widget.h,
                                    mode: 'resize'
                                });
                            }}
                        >
                            <Minimize2 className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                    )}
                </div>
            )
        })
    }
                </div >
            </div >
        </div >
    );
}

