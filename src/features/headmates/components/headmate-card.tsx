import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import React, { forwardRef, useMemo, useState } from 'react';
import { getStringColor } from '@/utils/color-generator';
import { PLACEHOLDER_IMAGE } from '@/lib/discord-utils';
import { secureLogger } from '@/lib/secure-logger';
import { SmartField } from "@/components/fields/smart-field";
import { ContactProfileView } from './ContactProfileView';

interface HeadmateCardProps {
  member: any;
  collection: any;
  onClick?: () => void;
  className?: string;
}

export const HeadmateCard = React.memo(forwardRef<HTMLDivElement, HeadmateCardProps & React.HTMLAttributes<HTMLDivElement>>(({ member, collection, onClick, className, ...props }, ref) => {
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

  const titleField = collection?.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };
  const pronounsField = collection?.fields?.find((f: any) => f.name === 'pronouns') || { name: 'pronouns' };
  const avatarField = collection?.fields?.find((f: any) => f.name === 'avatar' || f.interface === 'attachment') || { name: 'avatar' };
  const colorField = collection?.fields?.find((f: any) => f.name === 'color') || { name: 'color' };
  const textColorField = collection?.fields?.find((f: any) => f.name === 'textColor') || { name: 'textColor' };

  const rawName = member[titleField.name];
  const displayTextColor = member[textColorField.name] || member[colorField.name] || getStringColor(rawName);
  const borderColor = member[colorField.name] || getStringColor(rawName);

  const finalImageSrc = useMemo(() => {
    const raw = member[avatarField.name];
    if (!raw) return PLACEHOLDER_IMAGE || null;
    if (typeof raw === 'string' && (raw.startsWith('data:') || raw.startsWith('http'))) return raw;
    if (Array.isArray(raw) && raw.length > 0) return raw[0].url;
    if (raw.url) return raw.url;
    return raw;
  }, [member, avatarField]);


  return (
    <div
      ref={ref}
      className={cn("group flex flex-col gap-2 cursor-pointer", className)}
      onClick={(e) => {
        secureLogger.debug('OUTER DIV CLICK:', member[titleField.name]);
        handleCardClick(e);
      }}
      onDoubleClick={handleDoubleClick}
      {...props}
    >
      <Card
        style={{
          transition: "all 0.3s ease",
          border: `3px solid ${borderColor}`,
          borderRadius: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          transform: 'scale(1)',
          filter: 'brightness(1)',
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
              alt={rawName}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-6xl opacity-20 select-none bg-muted">
              {rawName.charAt(0)}
            </div>
          )}
        </div>

        {/* name at absolute bottom */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end text-center pb-1 z-10">
          <div
            className="font-black text-2xl tracking-[0.5px] transition-all group-hover:-translate-y-1 w-full drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]"
            style={{
              color: displayTextColor,
              WebkitTextStroke: '3px black',
              paintOrder: 'stroke fill',
              fontWeight: 900
            }}
          >
            <SmartField
              value={rawName}
              field={titleField}
              record={member}
              collectionName={collection?.name ?? 'headmates'}
              onChange={() => {}}
            />
          </div>
        </div>
      </Card>

      {/* pronouns below card */}
      {member[pronounsField.name] && (
        <div className="text-[10px] text-[#252525] font-bold text-center lowercase tracking-wide">
          <SmartField
            value={member[pronounsField.name]}
            field={pronounsField}
            record={member}
            collectionName={collection?.name ?? 'headmates'}
            onChange={() => {}}
          />
        </div>
      )}

      <ContactProfileView
        member={member}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </div>
  );
}));
HeadmateCard.displayName = "HeadmateCard";
