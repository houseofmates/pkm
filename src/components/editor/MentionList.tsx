
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';
import { Database, FileText } from 'lucide-react';

interface MentionListProps {
    items: any[];
    command: (item: any) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command({ id: item.id, label: item.title || item.name || 'Untitled' });
        }
    };

    useEffect(() => {
        setSelectedIndex(0);
    }, [props.items]);

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
                return true;
            }
            if (event.key === 'ArrowDown') {
                setSelectedIndex((selectedIndex + 1) % props.items.length);
                return true;
            }
            if (event.key === 'Enter') {
                selectItem(selectedIndex);
                return true;
            }
            return false;
        },
    }));

    if (props.items.length === 0) {
        return null;
    }

    return (
        <div className="z-50 w-60 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in zoom-in-95">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1 mb-1">records</div>
            {props.items.map((item, index) => (
                <button
                    key={index}
                    className={cn(
                        "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                        index === selectedIndex && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => selectItem(index)}
                >
                    <span className="mr-2 opacity-70 theme-gold">
                        <Database className="w-3 h-3" />
                    </span>
                    <span className="truncate">{item.title || item.name || 'Untitled'}</span>
                </button>
            ))}
        </div>
    );
});

MentionList.displayName = 'MentionList';
