
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFronter } from "@/contexts/fronter-context";

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

import { forwardRef } from 'react';

export const HeadmateCard = forwardRef<HTMLDivElement, HeadmateCardProps>(({ member, onClick, className }, ref) => {
    const { activeFronterId, overrides } = useFronter();
    const isActive = activeFronterId === member.id;
    const override = overrides[member.id] || {};

    const displayImage = override.avatarUrl || member.content.avatarUrl;
    const displayColor = override.color || member.content.color || "#cccccc"; // Default gray if nothing
    const displayTextColor = override.textColor || "white"; // Default white text on overlay

    return (
        <Card
            ref={ref}
            onClick={onClick}
            className={cn(
                "aspect-square relative overflow-hidden group cursor-pointer border-2 transition-all duration-300",
                isActive ? "border-[4px] shadow-xl scale-105" : "border-transparent hover:border-white/20",
                className
            )}
            style={{
                borderColor: isActive ? displayColor : undefined,
                boxShadow: isActive ? `0 0 20px -5px ${displayColor}` : undefined
            }}
        >
            {/* Background Image */}
            <div className="absolute inset-0 bg-muted/30">
                {displayImage ? (
                    <img
                        src={displayImage}
                        alt={member.content.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="h-full w-full flex items-center justify-center text-6xl opacity-20 select-none" style={{ color: displayColor }}>
                        {member.content.name.charAt(0)}
                    </div>
                )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Active Indicator (Badge) */}
            {isActive && (
                <div
                    className="absolute top-2 right-2 w-3 h-3 rounded-full animate-pulse shadow-[0_0_10px_currentColor]"
                    style={{ backgroundColor: displayColor, color: displayColor }}
                />
            )}

            {/* Content Centered/Bottom */}
            <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col items-center justify-end h-full text-center">
                <h3
                    className={cn(
                        "font-bold text-xl tracking-tight mb-1 drop-shadow-md transition-all group-hover:-translate-y-1",
                        member.content.name.length === 1 ? "uppercase" : "lowercase"
                    )}
                    style={{ color: displayTextColor }}
                >
                    {member.content.name}
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
