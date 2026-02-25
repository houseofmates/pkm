import * as React from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit2, Settings2, Trash2, EyeOff, Type, Palette, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PropertyContextMenuProps {
    children: React.ReactNode;
    field: any;
    onRename: () => void;
    onEditSettings: () => void;
    onHide: () => void;
    onDelete: () => void;
    fieldColor?: string;
    onSetFieldColor?: (color: string) => void;
    valueColorRules?: Record<string, string>;
    onSetValueColor?: (value: string, color: string) => void;
}

export function PropertyContextMenu({
    children,
    field,
    onRename,
    onEditSettings,
    onHide,
    onDelete,
    fieldColor,
    onSetFieldColor,
    valueColorRules,
    onSetValueColor
}: PropertyContextMenuProps) {
    if (!field) return <>{children}</>;

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-72 lowercase p-0 overflow-hidden">
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
                <ContextMenuSeparator />

                <div className="p-3 space-y-3 text-xs text-muted-foreground">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground">
                            <Palette className="w-4 h-4" />
                            <span>header color</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="color"
                                value={fieldColor || '#3b82f6'}
                                onChange={(e) => onSetFieldColor?.(e.target.value)}
                                className="h-8 w-12 rounded border border-border bg-transparent"
                            />
                            <Input
                                value={fieldColor || ''}
                                onChange={(e) => onSetFieldColor?.(e.target.value)}
                                placeholder="#3b82f6"
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-foreground">
                            <Palette className="w-4 h-4" />
                            <span>value color rules (if → color)</span>
                        </div>
                        <ScrollArea className="max-h-40">
                            <div className="space-y-2 pr-1">
                                {Object.entries(valueColorRules || {}).map(([val, color]) => (
                                    <div key={val} className="flex items-center gap-2">
                                        <Input
                                            value={val}
                                            readOnly
                                            className="h-8 text-xs bg-muted/40"
                                        />
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => onSetValueColor?.(val, e.target.value)}
                                            className="h-8 w-12 rounded border border-border bg-transparent"
                                        />
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8"
                                            onClick={() => onSetValueColor?.(val, '')}
                                            title="clear"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                                {Object.keys(valueColorRules || {}).length === 0 && (
                                    <div className="text-[11px] text-muted-foreground">no rules yet</div>
                                )}
                            </div>
                        </ScrollArea>

                        <div className="flex items-center gap-2">
                            <Input
                                placeholder="match value (exact)"
                                className="h-8 text-xs flex-1"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const target = e.target as HTMLInputElement;
                                        if (!target.value) return;
                                        onSetValueColor?.(target.value, '#3b82f6');
                                        target.value = '';
                                    }
                                }}
                            />
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="add rule"
                                onClick={(e) => {
                                    const parent = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    if (parent && parent.value) {
                                        onSetValueColor?.(parent.value, '#3b82f6');
                                        parent.value = '';
                                    }
                                }}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </ContextMenuContent>
        </ContextMenu>
    );
}
