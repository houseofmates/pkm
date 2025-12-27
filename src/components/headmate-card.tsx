
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFronter } from "@/contexts/fronter-context";
import { forwardRef, useEffect, useState } from 'react';

interface HeadmateCardProps {
    member: {
        id: string;
        content: {
            name: string;
            avatarUrl?: string;
            desc?: string;
            pronouns?: string;
            color?: string; // from SP
        };
    };
    onClick?: () => void;
    className?: string;
}

export const HeadmateCard = forwardRef<HTMLDivElement, HeadmateCardProps & React.HTMLAttributes<HTMLDivElement>>(({ member, onClick, className, ...props }, ref) => {
    const { activeFronterId, overrides } = useFronter();
    const { client } = useAuth();
    const isActive = activeFronterId === member.id;
    const override = overrides[member.id] || {};

    const displayImage = override.avatarUrl || member.content.avatarUrl;

    const displayTextColor = override.textColor || override.color || member.content.color || "white";
    const customColor = override.color || member.content.color || "#ffffff";

    // Create a faded version of the color for inactive state (30% opacity)
    const getFadedColor = (color: string) => {
        // Handle hex colors
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, 0.3)`;
        }
        // Handle named colors or other formats - add alpha
        if (color.startsWith('rgb(')) {
            return color.replace('rgb(', 'rgba(').replace(')', ', 0.3)');
        }
        if (color.startsWith('rgba(')) {
            return color.replace(/,\s*[\d.]+\)$/, ', 0.3)');
        }
        // For named colors, wrap in rgba-like approach using CSS
        return `color-mix(in srgb, ${color} 30%, transparent)`;
    };

    const fadedColor = getFadedColor(displayTextColor);

    const [blobUrl, setBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const loadSecure = async () => {
            if (displayImage && displayImage.includes('/api/nocobase/attachments/')) {
                try {
                    // Extract ID from URL like /api/nocobase/attachments/219/download
                    const match = displayImage.match(/\/attachments\/(\d+)/);
                    if (match && match[1]) {
                        const blob = await client.downloadAttachmentBlob(match[1]);
                        if (active && blob) {
                            const url = URL.createObjectURL(blob);
                            setBlobUrl(url);
                        }
                    }
                } catch (e) {
                    console.error("Failed to load secure avatar via client", e);
                }
            } else {
                setBlobUrl(null);
            }
        };

        loadSecure();
        return () => {
            active = false;
        };
    }, [displayImage, client]);

    const finalImageSrc = blobUrl || displayImage;

    return (
        <Card
            ref={ref}
            onClick={onClick}
            style={{
                boxShadow: "none"
            }}
            className={cn(
                "aspect-square relative overflow-hidden group cursor-pointer transition-all duration-300 border-0",
                isActive ? "scale-[1.1] z-10" : "",
                className
            )}
            {...props}
        >
            {/* Wrapper div to handle the border since Card's border class interferes */}
            <div
                className="absolute inset-0 pointer-events-none z-50 rounded-lg"
                style={{
                    border: `${isActive ? "6px" : "2px"} solid ${isActive ? displayTextColor : fadedColor}`
                }}
            />
            {/* Background Image */}
            <div className="absolute inset-0 bg-muted/30">
                {finalImageSrc ? (
                    <img
                        src={finalImageSrc}
                        alt={(member.content as any).name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-6xl opacity-20 select-none bg-muted">
                        {member.content.name.charAt(0)}
                    </div>
                )}
            </div>

            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Active Indicator: Custom Color Border */
                /* Removed Dot as requested */
            }

            {/* Content Centered/Bottom */}
            <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center justify-end h-full text-center">
                <h3
                    className={cn(
                        "font-bold text-xl tracking-tight mb-1 drop-shadow-md transition-all group-hover:-translate-y-1",
                        member.content.name.length === 1 ? "uppercase" : "lowercase"
                    )}
                    style={{ color: displayTextColor }}
                >
                    {/* Use override name if available, else original */}
                    {(override as any).name || member.content.name}
                </h3>
                {member.content.pronouns && (
                    <p className="text-xs text-white/70 lowercase opacity-0 group-hover:opacity-100 transition-opacity delay-100 translate-y-2 group-hover:translate-y-0 duration-300">
                        {member.content.pronouns}
                    </p>
                )}
            </div>
        </Card>
    );
});
HeadmateCard.displayName = "HeadmateCard";
