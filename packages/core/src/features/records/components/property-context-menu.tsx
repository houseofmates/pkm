import * as React from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit2, Settings2, Trash2, EyeOff, Type, Palette } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ValueColorRulesDialog } from "./value-color-rules-dialog";import { useAppSetting } from '@/hooks/use-app-setting';
import * as Icons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

function getLucideIcon(name: string): LucideIcon | undefined {
    return (Icons as unknown as Record<string, unknown>)[name] as LucideIcon | undefined;
}
interface PropertyContextMenuProps {
    collectionName?: string;
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
    collectionName,
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
    const [rulesDialogOpen, setRulesDialogOpen] = React.useState(false);

    if (!field) return <>{children}</>;

    // try load icon info for display
    const [metadata] = useAppSetting<Record<string, any>>('collection_metadata', {}, { pollIntervalMs: 3000 });
    const iconInfo = collectionName && metadata[collectionName]?.fieldIcons?.[field.name] || {};

    const ruleCount = Object.keys(valueColorRules || {}).length;

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64 lowercase p-0 overflow-hidden">
                    <ContextMenuLabel className="flex items-center gap-2 pb-1">
                        <Settings2 className="w-3.5 h-3.5 opacity-50" />
                        {iconInfo.icon && iconInfo.iconType === 'emoji' && (
                            <span className="text-sm" style={{ color: iconInfo.iconColor || fieldColor }}>{iconInfo.icon}</span>
                        )}
                        {iconInfo.icon && iconInfo.iconType === 'lucide' && (() => {
                            const IconComp = getLucideIcon(iconInfo.icon);
                            return IconComp ? <IconComp className="h-4 w-4" style={{ color: iconInfo.iconColor || fieldColor }} /> : null;
                        })()}
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

                    {/* header color inline picker */}
                    <div className="px-3 py-2 space-y-2 text-xs text-muted-foreground">
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

                    <ContextMenuSeparator />

                    {/* value color rules — button that opens a dialog */}
                    <ContextMenuItem onClick={() => setRulesDialogOpen(true)}>
                        <Palette className="mr-2 h-4 w-4" />
                        <span>value color rules</span>
                        {ruleCount > 0 && (
                            <span className="ml-auto text-[10px] text-muted-foreground bg-white/10 px-1.5 py-0.5 rounded-full">
                                {ruleCount}
                            </span>
                        )}
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

            {/* value color rules dialog — rendered outside context menu so it persists */}
            <ValueColorRulesDialog
                open={rulesDialogOpen}
                onOpenChange={setRulesDialogOpen}
                field={field}
                rules={valueColorRules || {}}
                onSetRule={(val, color) => onSetValueColor?.(val, color)}
            />
        </>
    );
}
