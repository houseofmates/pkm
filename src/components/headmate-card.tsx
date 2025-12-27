
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFronter } from "@/contexts/fronter-context";
import { forwardRef, useEffect, useState } from 'react';

// Names that should always be displayed in uppercase
const UPPERCASE_NAMES = ['alastor', 'deer', 'mike', 'walt'];

function formatDisplayName(name: string): string {
    const nameLower = name.toLowerCase().trim();
    if (UPPERCASE_NAMES.includes(nameLower)) {
        return name.toUpperCase();
    }
    return name;
}

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
    const isActive = activeFronterId === member.id;
    const override = overrides[member.id] || {};

    const displayImage = override.avatarUrl || member.content.avatarUrl;

    const displayTextColor = override.textColor || override.color || member.content.color || "white";

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
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        let active = true;
        setImageError(false);

        const loadSecure = async () => {
            if (!displayImage) {
                setBlobUrl(null);
                return;
            }

            // Strategy 1: Relative storage URL (use Vite proxy to avoid CORS)
            // This handles URLs like /storage/uploads/filename.jpg
            if (displayImage.startsWith('/storage/')) {
                try {
                    const res = await fetch(displayImage);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (active) setBlobUrl(URL.createObjectURL(blob));
                        return;
                    } else {
                        console.warn(`Failed to fetch from proxy: ${res.status}`);
                    }
                } catch (e) {
                    console.error("Failed to fetch via proxy", e);
                }
            }

            // Strategy 2: Full NocoBase URL - convert to proxy path
            if (displayImage.includes('db.houseofmates.space/storage/')) {
                try {
                    // Extract the path after db.houseofmates.space
                    const match = displayImage.match(/db\.houseofmates\.space(\/storage\/.*)/);                    if (match && match[1]) {
                        const proxyUrl = match[1];
                        const res = await fetch(proxyUrl);
                        if (res.ok) {
                            const blob = await res.blob();
                            if (active) setBlobUrl(URL.createObjectURL(blob));
                            return;
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch via converted proxy URL", e);
                }
            }

            // Strategy 3: External/public URL (no proxy needed)
            if (displayImage.startsWith('http') && !displayImage.includes('db.houseofmates.space')) {
                // Just use the URL directly
                setBlobUrl(null);
                return;
            }

            // If we get here, all strategies failed
            if (active) {
                setImageError(true);
                console.warn('All image loading strategies failed for:', displayImage);
            }
        };

        loadSecure();
        return () => { 
            active = false;
            // Clean up blob URL to prevent memory leaks
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [displayImage]);

    // Clean up blob URL when component unmounts
    useEffect(() => {
        return () => {
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [blobUrl]);

    const finalImageSrc = blobUrl || (!imageError ? displayImage : null);

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
                    className="font-bold text-xl tracking-tight mb-1 drop-shadow-md transition-all group-hover:-translate-y-1"
                    style={{ color: displayTextColor }}
                >
                    {/* Use override name if available, else original - with uppercase for specific names */}
                    {formatDisplayName((override as any).name || member.content.name)}
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
