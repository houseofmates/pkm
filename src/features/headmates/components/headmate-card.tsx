
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFronter } from "@/contexts/fronter-context";
import { forwardRef, useMemo, useState, useEffect } from 'react';
import { API_URL } from '@/lib/api-client';
import { formatHeadmateName, getCapitalizationClass } from '@/utils/text-formatting';
import { getStringColor } from '@/utils/color-generator';
import { PLACEHOLDER_IMAGE } from '@/lib/discord-utils';

import { ContactProfileView } from './contact-profile-view';

// Unified Headmate Interface
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
  className?: string;
}

export const HeadmateCard = forwardRef<HTMLDivElement, HeadmateCardProps & React.HTMLAttributes<HTMLDivElement>>(({ member, onClick, className, ...props }, ref) => {
  const { activeFronters } = useFronter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
  console.log('CLICK REGISTERED:', member.name, member.id);
  if (onClick) {
  console.log('Calling onClick handler');
  onClick();
  } else {
  console.log('No onClick handler provided!');
  }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  setIsProfileOpen(true);
  };

  // Ensure both IDs are strings for comparison
  const memberId = String(member.id);
  const isActive = activeFronters.map(String).includes(memberId);

  console.log(`RENDER ${member.name}: isActive=${isActive}, memberId=${memberId}, activeFronters=`, activeFronters);

  // Render Logic
  const rawName = member.name;
  const displayName = formatHeadmateName(rawName);
  const capsClass = getCapitalizationClass(rawName);

  const displayTextColor = member.textColor || member.color || getStringColor(member.name);

  // No faded color - use solid colors for borders
  const borderColor = member.color || getStringColor(member.name);

  // Image Resolution
  const finalImageSrc = useMemo(() => {
  let raw = member.avatar;
  if (!raw) return PLACEHOLDER_IMAGE || null;

  if (raw.startsWith('data:') || raw.startsWith('http')) return raw;

  // Handle NocoBase attachments
  // If it's a URL path, append API_URL (maybe?)
  // NocoBase usually returns full URL or relative.
  // If relative...
  // For now assume absolute or working relative.
  return raw;
  }, [member.avatar]);


  return (
  <div
  ref={ref}
  className={cn("group flex flex-col gap-2 cursor-pointer", className)}
  onClick={(e) => {
 console.log('OUTER DIV CLICK:', member.name);
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
 {/* Background Image */}
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

 {/* Name at absolute bottom */}
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

  {/* Pronouns Below Card */}
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
});
HeadmateCard.displayName = "HeadmateCard";
