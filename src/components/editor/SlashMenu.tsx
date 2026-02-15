
import { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Editor } from '@tiptap/react';
import {
    Heading1,
    Heading2,
    Heading3,
    List,
    ListOrdered,
    CheckSquare,
    Text,
    Quote,
    Code,
    Minus,
    User,
    Layout,
    Image as ImageIcon,
    ArrowLeftRight,
    LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icons mapping for dynamic items
const ICONS: Record<string, any> = {
    'Text': Text,
    'Heading 1': Heading1,
    'Heading 2': Heading2,
    'Heading 3': Heading3,
    'Bullet List': List,
    'Numbered List': ListOrdered,
    'Task List': CheckSquare,
    'Quote': Quote,
    'Code': Code,
    'Divider': Minus,
    'Front': User,
    'To Canvas': Layout,
    'Image': ImageIcon,
    'Echo Block': ArrowLeftRight,
    'Dashboard': LayoutGrid,
    'AI Assistant': User // Reusing User or finding a better one? Let's use Sparkles if available or just User for now to avoid import errors since Sparkles isn't imported. Wait, I can verify imports.
};

interface SlashMenuProps {
    items: any[];
    command: (item: any) => void;
    editor: Editor;
}

export const SlashMenu = forwardRef((props: SlashMenuProps, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
        const item = props.items[index];
        if (item) {
            props.command(item);
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

    if (!props.items.length) {
        return null;
    }

    return (
        <div
            className="z-50 w-72 max-h-[300px] overflow-y-auto rounded-xl border border-[rgba(255,255,255,0.1)] bg-[#050505] p-2 text-white shadow-2xl animate-in fade-in zoom-in-95 scrollbar-hide"
            style={{ fontFamily: '"Varela Round", sans-serif' }}
        >
            <div className="flex flex-col gap-1">
                {/* Optional: Add Category Headers later if needed */}
                <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-[#87CEEB] opacity-50 font-bold">
                    Void Commands
                </div>

                {props.items.map((item, index) => {
                    const Icon = ICONS[item.title] || Text;
                    const isSelected = index === selectedIndex;

                    return (
                        <button
                            key={index}
                            className={cn(
                                "relative flex w-full cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-all duration-200",
                                isSelected
                                    ? "bg-[#87CEEB]/20 text-[#87CEEB]"
                                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                            )}
                            onClick={() => selectItem(index)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            <div className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)]",
                                isSelected && "border-[#87CEEB]/30 bg-[#87CEEB]/10"
                            )}>
                                <Icon className="h-4 w-4" />
                            </div>

                            <div className="flex flex-col items-start gap-0.5">
                                <span className="font-medium text-sm">{item.title}</span>
                                {item.description && (
                                    <span className={cn(
                                        "text-[10px] opacity-70",
                                        isSelected ? "text-[#87CEEB]" : "text-zinc-500"
                                    )}>
                                        {item.description}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

SlashMenu.displayName = 'SlashMenu';
