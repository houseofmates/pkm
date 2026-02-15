import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { ExternalLink, MoreHorizontal, Image as ImageIcon, Type, Eye } from 'lucide-react';
import { useEdgelessStore } from '../../store';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
    ContextMenuSeparator,
    ContextMenuLabel
} from "@/components/ui/context-menu";

interface LinkElementProps {
    element: any;
}

export function LinkElement({ element }: LinkElementProps) {
    const navigate = useNavigate();
    const { updateElement } = useEdgelessStore();
    const data = element.data || {};
    const { title, url, icon, iconType, variant = 'card' } = data; // variant: 'card' | 'simple'

    // Icon Rendering
    const renderIcon = (className = "h-6 w-6") => {
        if (iconType === 'emoji') return <span className="text-2xl leading-none">{icon}</span>;
        if (iconType === 'image') return <img src={icon} alt="" className={className + " object-contain"} />;
        if (iconType === 'lucide') {
            const Icon = (LucideIcons as any)[icon] || LucideIcons.File;
            return <Icon className={className} />;
        }
        return <LucideIcons.File className={className} />;
    };

    const handleOpen = () => {
        if (url) {
            // Handle internal navigation vs external
            if (url.startsWith('http') && !url.includes(window.location.host)) {
                window.open(url, '_blank');
            } else {
                navigate(url.replace(window.location.origin, '')); // Naive relative
            }
        }
    };

    // Card Variant (Preview Screenshot style - using big icon/color)
    if (variant === 'card') {
        return (
            <ContextMenu>
                <ContextMenuTrigger>
                    <div
                        className="w-full h-full bg-card/80 backdrop-blur border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col cursor-pointer"
                        onClick={handleOpen}
                    >
                        {/* Preview / Cover Generic Area (Since we don't have real screenshots yet) */}
                        <div className="flex-1 bg-muted/30 flex items-center justify-center relative min-h-0">
                            {/* "Screenshot" placeholder: Big Icon */}
                            <div className="transform scale-150 opacity-80 group-hover:scale-175 transition-transform duration-500">
                                {renderIcon("h-12 w-12 text-muted-foreground/50")}
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
                        </div>

                        {/* Footer Info */}
                        <div className="p-3 border-t bg-card flex items-center gap-3 shrink-0">
                            <div className="shrink-0 opacity-80">
                                {renderIcon("h-4 w-4")}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate leading-tight">{title}</div>
                                <div className="text-[10px] text-muted-foreground truncate opacity-70 mt-0.5">{url}</div>
                            </div>
                        </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuLabel>Link Options</ContextMenuLabel>
                    <ContextMenuItem onClick={() => updateElement(element.id, { data: { ...data, variant: 'simple' }, height: 40 })}>
                        <Type className="h-4 w-4 mr-2" /> Show as Simple Link
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => updateElement(element.id, { data: { ...data, variant: 'card' }, height: 200 })}>
                        <Eye className="h-4 w-4 mr-2" /> Show as Card Preview
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={handleOpen}>
                        <ExternalLink className="h-4 w-4 mr-2" /> Open Link
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    // Simple Variant
    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <div
                    className="w-full h-full bg-card/50 backdrop-blur border rounded-md px-3 flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer shadow-sm"
                    onClick={handleOpen}
                >
                    <div className="shrink-0">{renderIcon("h-4 w-4")}</div>
                    <span className="font-medium text-sm truncate flex-1">{title}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50" />
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem onClick={() => updateElement(element.id, { data: { ...data, variant: 'card' }, height: 200 })}>
                    <Eye className="h-4 w-4 mr-2" /> Show as Card Preview
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
