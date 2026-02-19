
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFronter } from "@/contexts/fronter-context";
import React, { forwardRef, useMemo, useState } from 'react';
import { formatHeadmateName, getCapitalizationClass } from '@/utils/text-formatting';
import { getStringColor } from '@/utils/color-generator';
import { PLACEHOLDER_IMAGE } from '@/lib/discord-utils';
import { secureLogger } from '@/lib/secure-logger';

import { ContactProfileView } from './contact-profile-view';

// unified headmate interface
export interface Headmate {
  id: string;
  name: string;
  avatar?: string;
  pronouns?: string;
  color?: string;
  textColor?: string;
  description?: string;
}

interface HeadmateCardProps {
  member: Headmate;
  onClick?: () => void;
  classname?: string;
}

export const HeadmateCard = React.memo(forwardRef<HTMLDivElement, HeadmateCardProps & React.HTMLAttributes<HTMLDivElement>>(({ member, onClick, className, ...props }, ref) => {
  const { activeFronters } = useFronter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleCardClick = (_e: React.MouseEvent) => {
    secureLogger.debug('CLICK REGISTERED:', member.name, member.id);
    if (onClick) {
      secureLogger.debug('Calling onClick handler');
      onClick();
    } else {
      secureLogger.debug('No onClick handler provided!');
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProfileOpen(true);
  };

  // ensure both ids are strings for comparison
  const memberId = String(member.id);
  const isActive = activeFronters.map(String).includes(memberId);

  secureLogger.debug(`RENDER ${member.name}: isActive=${isActive}, memberId=${memberId}, activeFronters=`, activeFronters);

  // render logic
  const rawName = member.name;
  const displayName = formatHeadmateName(rawName);
  const capsClass = getCapitalizationClass(rawName);

  const displayTextColor = member.textColor || member.color || getStringColor(member.name);

  // no faded color - use solid colors for borders
  const borderColor = member.color || getStringColor(member.name);

  // image resolution
  const finalImageSrc = useMemo(() => {
    const raw = member.avatar;
    if (!raw) return PLACEHOLDER_IMAGE || null;

    if (raw.startsWith('data:') || raw.startsWith('http')) return raw;

    // handle nocobase attachments
    // if it's a url path, append api_url (maybe?)
    // nocobase usually returns full url or relative.
    // if relative...
    // for now assume absolute or working relative.
    return raw;
  }, [member.avatar]);


  return (
    <div
      ref={ref}
      className={cn("group flex flex-col gap-2 cursor-pointer", className)}
      onClick={(e) => {
        secureLogger.debug('OUTER DIV CLICK:', member.name);
        handleCardClick(e);
      }}
      onDoubleClick={handleDoubleClick}
      {...props}
    >
      <Card
        style={{
          transition: "all 0.3s ease",
          border: `${isActive ? "6px" : "3px"} solid ${borderColor}`,
          borderRadius: 0,
          boxShadow: isActive ? `0 4px 12px rgba(0,0,0,0.4)` : '0 2px 8px rgba(0,0,0,0.3)',
          transform: isActive ? 'scale(1.08)' : 'scale(1)',
          filter: isActive ? 'brightness(1.1)' : 'brightness(1)',
          zIndex: isActive ? 50 : 1
        }}
        className={cn(
          "aspect-square relative overflow-hidden w-full rounded-none shadow-none"
        )}
      >
        {/* background image */}
        <div className="absolute inset-0 bg-muted/30">
          {finalImageSrc ? (
            <img
              src={finalImageSrc}
              alt={member.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-6xl opacity-20 select-none bg-muted">
              {member.name.charAt(0)}
            </div>
          )}
        </div>

        {/* name at absolute bottom */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end text-center pb-1 z-10">
          <h3
            className={cn(
              "font-black text-2xl tracking-[0.5px] transition-all group-hover:-translate-y-1 w-full drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]",
              capsClass
            )}
            style={{
              color: displayTextColor,
              WebkitTextStroke: displayName === 'S' ? '0px' : '3px black',
              paintOrder: 'stroke fill',
              fontWeight: 900
            }}
          >
            {displayName}
          </h3>
        </div>
      </Card>

      {/* pronouns below card */}
      {member.pronouns && (
        <p className="text-[10px] text-[#252525] font-bold text-center lowercase tracking-wide">
          {member.pronouns}
        </p>
      )}

      <ContactProfileView
        member={member as any} // Temporary cast until View is updated
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}));
HeadmateCard.displayName = "HeadmateCard";
