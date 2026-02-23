import * as React from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit2, Settings2, Trash2, EyeOff, Type } from "lucide-react";

interface PropertyContextMenuProps {
    children: React.ReactNode;
    field: any;
    onRename: () => void;
    onEditSettings: () => void;
    onHide: () => void;
    onDelete: () => void;
}

export function PropertyContextMenu({
    children,
    field,
    onRename,
    onEditSettings,
    onHide,
    onDelete
}: PropertyContextMenuProps) {
    if (!field) return <>{children}</>;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-56 lowercase">
                <ContextMenuLabel className="flex items-center gap-2 pb-1">
                    <Settings2 className="w-3.5 h-3.5 opacity-50" />
                    <span>property: {field.name}</span>
                </ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onRename}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    <span>rename</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={onEditSettings}>
                    <Type className="mr-2 h-4 w-4" />
                    <span>edit settings</span>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onHide}>
                    <EyeOff className="mr-2 h-4 w-4" />
                    <span>hide property</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>delete property</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
