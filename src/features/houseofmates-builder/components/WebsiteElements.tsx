import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useBuilder } from '../HouseofmatesBuilder';
import * as LucideIcons from 'lucide-react';
import {
    Copy, Check, Wifi, Shield, Zap, Crown, MessageCircle, ChevronDown, ChevronUp, Gamepad2, Server, Monitor,
    Pencil, Pen, Edit, Edit2, Palette, Paintbrush, PaintBucket, FileText, Clipboard, Paperclip
} from 'lucide-react';
import { toast } from 'sonner';

// --- SERVER IP DISPLAY ---
interface ServerIPProps {
    javaIP: string;
    javaPort?: string;
    bedrockIP?: string;
    bedrockPort?: string;
    showBedrock?: boolean;
}

export function ServerIPDisplay({ javaIP, bedrockIP, bedrockPort = '19132', showBedrock = true }: ServerIPProps) {
    const [copiedJava, setCopiedJava] = useState(false);
    const [copiedBedrock, setCopiedBedrock] = useState(false);

    const copyToClipboard = async (text: string, type: 'java' | 'bedrock') => {
        await navigator.clipboard.writeText(text);
        if (type === 'java') {
            setCopiedJava(true);
            setTimeout(() => setCopiedJava(false), 2000);
        } else {
            setCopiedBedrock(true);
            setTimeout(() => setCopiedBedrock(false), 2000);
        }
        toast.success('copied to clipboard!');
    };

    return (
        <div className="p-6 rounded-2xl flex flex-col items-center">
            <h3 className="text-xl font-bold text-[var(--primary)] mb-4 flex items-center gap-2">
                <Server size={24} />
                join the server
            </h3>

            <div className="space-y-3">
                {/* Java */}
                <div className="flex items-center gap-3 p-3 rounded-xl">
                    <div className="flex flex-col gap-3 w-full">
                        <div
                            onClick={() => javaIP && copyToClipboard(javaIP, 'java')}
                            className="flex-1 flex items-center justify-between px-5 py-3 rounded-2xl bg-[#F6B012]/10 border border-[#F6B012]/30 hover:bg-[#F6B012]/20 cursor-pointer transition-all group interactive-pop"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 rounded-xl bg-[var(--primary)]/20 text-[var(--primary)]">
                                    <Monitor size={22} />
                                </div>
                                <div>
                                    <div className="text-sm text-[var(--primary)]/60 font-bold tracking-wider">java</div>
                                    <div className="text-xl text-[var(--primary)] font-mono font-bold">{javaIP || 'play.server.com'}</div>
                                </div>
                            </div>
                            {copiedJava ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-[#F6B012]/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </div>

                        {showBedrock && (
                            <div
                                onClick={() => {
                                    const bedStr = bedrockPort ? `${bedrockIP}:${bedrockPort}` : bedrockIP;
                                    if (bedStr) copyToClipboard(bedStr, 'bedrock');
                                }}
                                className="flex-1 flex items-center justify-between px-5 py-3 rounded-2xl border border-[var(--primary)]/30 hover:bg-[var(--primary)]/20 cursor-pointer transition-all group interactive-pop"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 rounded-xl text-[var(--primary)]">
                                        <Gamepad2 size={22} />
                                    </div>
                                    <div>
                                        <div className="text-sm text-[var(--primary)]/60 font-bold tracking-wider">bedrock</div>
                                        <div className="text-xl text-[var(--primary)] font-mono font-bold">{bedrockIP || 'play.server.com'}</div>
                                    </div>
                                </div>
                                {copiedBedrock ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-[var(--primary)]/40 opacity-0 group-hover:opacity-100 transition-opacity" />}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- SERVER STATUS ---
interface ServerStatusProps {
    isOnline?: boolean;
    playerCount?: number;
    maxPlayers?: number;
    motd?: string;
}

export function ServerStatus({ isOnline = true, playerCount = 0, maxPlayers = 100, motd }: ServerStatusProps) {
    const { previewMode } = useBuilder();
    const isMobile = previewMode === 'mobile';

    return (
        <div className="w-full h-full p-[1em] rounded-2xl flex flex-col justify-between">
            <div className={`flex items-center justify-between ${isMobile ? 'mb-[0.25em]' : 'mb-[0.5em]'}`}>
                <div className="flex items-center gap-[0.5em]">
                    <div className={`${isMobile ? 'w-[0.4em] h-[0.4em]' : 'w-[0.5em] h-[0.5em]'} rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`} />
                    <span className={`text-[var(--primary)] font-black ${isMobile ? 'text-[0.65em]' : 'text-[0.875em]'} tracking-wide`}>{isOnline ? 'SYSTEMS ONLINE' : 'OFFLINE'}</span>
                </div>
                <div className={`text-[var(--primary)] ${isMobile ? 'text-[0.6em]' : 'text-[0.75em]'} font-black font-mono`}>
                    {playerCount} / {maxPlayers}
                </div>
            </div>
            {motd && (
                <div className="text-white/90 text-[0.875em] font-bold line-clamp-2 leading-relaxed">
                    {motd}
                </div>
            )}

            {/* Discord CTA */}
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    const discordLink = 'https://discord.gg/3BbFMfsqMB';
                    navigator.clipboard.writeText(discordLink);
                    window.open(discordLink, '_blank');
                }}
                className={`${isMobile ? 'mt-[1em] p-[0.75em]' : 'mt-[1.5em] p-[1.5em]'} border border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-xl sm:rounded-2xl cursor-pointer hover:border-[var(--primary)]/50 transition-all flex flex-col items-center gap-1 sm:gap-2 group/discord active:scale-[0.98]`}
            >
                <div className={`text-[var(--primary)] ${isMobile ? 'text-[0.75em]' : 'text-[1.5em]'} font-black tracking-tighter group-hover/discord:scale-105 transition-transform text-center leading-none`}>
                    join the discord to chat!
                </div>
                {!isMobile && (
                    <div className="text-[0.75em] text-white/40 font-medium">
                        click to copy & open
                    </div>
                )}
            </div>
        </div>
    );
}

// --- FEATURE CARDS ---
interface FeatureCardProps {
    icon: string; // icon key (lowercase) - mapped in iconMap
    title: string;
    description: string;
    color?: string;
}

const iconMap: Record<string, any> = {
    shield: Shield,
    zap: Zap,
    crown: Crown,
    chat: MessageCircle,
    gamepad: Gamepad2,
    wifi: Wifi,
    // design/edit icons
    pencil: Pencil,
    pen: Pen,
    edit: Edit,
    edit2: Edit2,
    palette: Palette,
    paintbrush: Paintbrush,
    paintbucket: PaintBucket,
    filetext: FileText,
    clipboard: Clipboard,
    paperclip: Paperclip,
};

export function FeatureCard({ icon, title, description, color = 'var(--primary)' }: FeatureCardProps) {
    const IconComponent = iconMap[icon] || Zap;

    return (
        <div className="p-[1.25em] rounded-2xl transition-all interactive-pop flex flex-col items-center text-center h-full">
            <div
                className="w-[3em] h-[3em] rounded-xl flex items-center justify-center mb-[1em]"
                style={{ backgroundColor: `${color}20` }}
            >
                <IconComponent size={'1.5em'} style={{ color }} />
            </div>
            <h4 className="text-white font-black text-[1.125em] mb-[0.5em] tracking-tight">{title}</h4>
            <p className="text-white/70 font-medium text-[0.875em] leading-relaxed">{description}</p>
        </div>
    );
}

// --- STAFF CARD ---
interface StaffMemberProps {
    username: string;
    role: string;
    avatar?: string;
    color?: string;
}

export interface LinkCardProps {
    title: string;
    url: string;
    icon: string;
    description?: string;
    color?: string;
}

export function LinkCard({ title, url, icon, description, color = 'var(--primary)' }: LinkCardProps) {
    const Icon = (LucideIcons as any)[icon?.charAt(0).toUpperCase() + icon?.slice(1)] || LucideIcons.Link2;

    const handleClick = () => {
        if (!url) return;
        if (url.startsWith('http')) {
            window.open(url, '_blank');
        } else {
            window.location.href = url;
        }
    };

    return (
        <div
            onClick={handleClick}
            className="w-full h-full p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all group flex flex-col items-center justify-center text-center gap-2 cursor-pointer"
            style={{ '--link-color': color } as any}
        >
            <div className="p-3 rounded-xl bg-[var(--link-color)]/10 text-[var(--link-color)] group-hover:scale-110 transition-transform">
                <Icon size={24} />
            </div>
            <div className="font-bold text-white text-sm tracking-tight">{title}</div>
            {description && <div className="text-[10px] text-white/40 leading-tight">{description}</div>}
        </div>
    );
}

export interface StatusIndicatorProps {
    label: string;
    status: 'online' | 'offline' | 'idle' | 'busy' | 'streaming';
    showLabel?: boolean;
}

export function StatusIndicator({ label, status, showLabel = true }: StatusIndicatorProps) {
    const colors = {
        online: '#22c55e',
        offline: '#64748b',
        idle: '#eab308',
        busy: '#ef4444',
        streaming: '#a855f7'
    };

    const color = colors[status] || colors.offline;

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 w-fit overflow-hidden">
            <div className="relative flex-shrink-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                {(status === 'online' || status === 'streaming') && (
                    <div className="absolute inset-0 w-full h-full rounded-full animate-ping opacity-75" style={{ backgroundColor: color }} />
                )}
            </div>
            {showLabel && <span className="text-[10px] font-black text-white/50 uppercase tracking-tighter whitespace-nowrap">{label}</span>}
        </div>
    );
}

export function StaffCard({ username, role, avatar, color = 'var(--primary)' }: StaffMemberProps) {
    const avatarUrl = avatar || `https://mc-heads.net/avatar/${username}/100`;

    return (
        <div className="p-[1em] rounded-xl flex items-center gap-[1em] transition-colors interactive-pop">
            <img
                src={avatarUrl}
                alt={username}
                className="w-[3.5em] h-[3.5em]"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${username}&background=1a1a1a&color=fff`;
                }}
            />
            <div>
                <div className="text-white font-black text-[1em] tracking-tight">{username}</div>
                <div style={{ color }} className="text-[0.875em] font-bold">{role}</div>
            </div>
        </div>
    );
}

// --- RULES LIST ---
interface RulesListProps {
    rules: string[];
    title?: string;
}

export function RulesList({ rules, title = 'server rules' }: RulesListProps) {
    return (
        <div className="p-[1.5em] rounded-2xl flex flex-col items-center text-center">
            <h3 className="text-[1.25em] font-black text-[var(--primary)] mb-[1em] flex items-center justify-center gap-[0.5em]">
                <Shield size={'1.2em'} />
                {title}
            </h3>
            <ol className="space-y-[0.75em] w-full max-w-2xl text-left inline-block">
                {rules.map((rule, idx) => (
                    <li key={idx} className="flex gap-[0.75em] text-white/80">
                        <span className="flex-shrink-0 w-[1.75em] h-[1.75em] rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] flex items-center justify-center text-[0.875em] font-bold">
                            {idx + 1}
                        </span>
                        <span className="pt-[0.1em] text-[1em]">{rule}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

// --- FAQ SECTION ---
interface FAQItem {
    question: string;
    answer: string;
}

interface FAQSectionProps {
    items: FAQItem[];
    title?: string;
}

export function FAQSection({ items, title = 'frequently asked questions' }: FAQSectionProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="p-[1.5em] rounded-2xl">
            <h3 className="text-[1.25em] font-bold text-[var(--primary)] mb-[1em]">{title}</h3>
            <div className="space-y-[0.5em]">
                {items.map((item, idx) => (
                    <div key={idx} className="border border-white/5 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full p-[1em] flex items-center justify-between text-left hover:bg-white/5 transition-colors interactive-pop"
                        >
                            <span className="text-white font-medium text-[1em]">{item.question}</span>
                            {openIndex === idx ? (
                                <ChevronUp size={'1.25em'} className="text-white/50" />
                            ) : (
                                <ChevronDown size={'1.25em'} className="text-white/50" />
                            )}
                        </button>
                        {openIndex === idx && (
                            <div className="px-[1em] pb-[1em] text-white/60 text-[0.9em]">
                                {item.answer}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- VERSION BADGE ---
interface VersionBadgeProps {
    versions: string[];
}

export function VersionBadge({ versions }: VersionBadgeProps) {
    const { previewMode } = useBuilder();
    const displayVersions = versions && versions.length > 0 ? versions : ['1.10', '1.21.11'];
    return (
        <div className="group relative w-full h-full flex items-center justify-center overflow-hidden cursor-pointer select-none">
            {/* Version Text (Default State) - Centered & Transitions Out */}
            <div className="flex items-center gap-[0.5em] transition-all duration-300 ease-in-out group-hover:opacity-0 group-hover:scale-90 group-active:opacity-0 group-active:scale-90 opacity-100 scale-100">
                <Gamepad2 size={previewMode === 'desktop' ? 24 : 16} className="text-[var(--primary)]" />
                <span className={`text-[var(--primary)] font-black tracking-tighter ${previewMode === 'desktop' ? 'text-5xl' : 'text-2xl'} whitespace-nowrap`}>
                    {displayVersions.join(' - ')}
                </span>
            </div>

            {/* "MC Versions Allowed" (Hover/Click State) - Transitions In */}
            <div className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:scale-100 group-active:opacity-100 group-active:scale-100 opacity-0 scale-110 pointer-events-none">
                <span className={`text-[var(--primary)] font-black tracking-widest ${previewMode === 'desktop' ? 'text-4xl' : 'text-2xl'} text-center px-4 leading-tight`}>
                    mc versions allowed:
                </span>
            </div>
        </div>
    );
}

// --- HERO SECTION ---
interface HeroSectionProps {
    title: string;
    subtitle?: string;
    ctaText?: string;
    ctaLink?: string;
    backgroundImage?: string;
    showServerIP?: boolean;
    javaIP?: string;
}

export function HeroSection({ title, subtitle, ctaText, ctaLink, backgroundImage, showServerIP, javaIP }: HeroSectionProps) {
    return (
        <div
            className="relative min-h-[60vh] flex items-center justify-center p-8 rounded-2xl overflow-hidden"
            style={{
                backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

            <div className="relative z-10 text-center max-w-3xl">
                <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xl md:text-2xl text-white/90 mb-8 font-bold tracking-tight">
                        {subtitle}
                    </p>
                )}
                {ctaText && (
                    <a
                        href={ctaLink || '#'}
                        className="inline-block px-8 py-4 rounded-2xl selected-icon-btn font-bold text-lg transition-transform interactive-pop"
                    >
                        {ctaText}
                    </a>
                )}
                {showServerIP && javaIP && (
                    <div className="mt-8 inline-block">
                        <ServerIPDisplay javaIP={javaIP} showBedrock={false} />
                    </div>
                )}
            </div>
        </div>
    );
}

// --- SOCIAL LINKS ---
interface SocialLinksProps {
    discord?: string;
    twitter?: string;
    youtube?: string;
    twitch?: string;
    github?: string;
    instagram?: string;
    tiktok?: string;
}

export function SocialLinks({ discord, twitter, youtube, twitch, github, instagram, tiktok }: SocialLinksProps) {
    const links = [
        { name: 'discord', url: discord, color: '#5865F2', icon: '🎮' },
        { name: 'twitter', url: twitter, color: '#1DA1F2', icon: '🐦' },
        { name: 'youtube', url: youtube, color: '#FF0000', icon: '📺' },
        { name: 'twitch', url: twitch, color: '#9146FF', icon: '📡' },
        { name: 'github', url: github, color: '#FFFFFF', icon: '💻' },
        { name: 'instagram', url: instagram, color: '#E4405F', icon: '📸' },
        { name: 'tiktok', url: tiktok, color: '#000000', icon: '🎵' },
    ].filter(l => l.url);

    return (
        <div className="flex flex-wrap gap-3 justify-center">
            {links.map((link) => (
                <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 rounded-xl bg-black/30 hover:bg-white/5 transition-all flex items-center gap-2 interactive-pop"
                    style={{ borderColor: `${link.color}40` }}
                >
                    <span>{link.icon}</span>
                    <span className="text-white font-medium">{link.name}</span>
                </a>
            ))}
        </div>
    );
}

// --- COUNTDOWN TIMER ---
interface CountdownProps {
    targetDate: string; // ISO date string
    title?: string;
}

export function CountdownTimer({ targetDate, title }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useState(() => {
        const updateTimer = () => {
            const target = new Date(targetDate).getTime();
            const now = Date.now();
            const diff = target - now;

            if (diff > 0) {
                setTimeLeft({
                    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((diff / (1000 * 60)) % 60),
                    seconds: Math.floor((diff / 1000) % 60),
                });
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    });

    return (
        <div className="p-6 rounded-2xl text-center flex flex-col items-center justify-center h-full">
            {title && <h3 className="text-xl font-bold text-[var(--primary)] mb-4">{title}</h3>}
            <div className="flex justify-center gap-4">
                {Object.entries(timeLeft).map(([unit, value]) => (
                    <div key={unit} className="text-center">
                        <div className="text-4xl font-bold text-white">{String(value).padStart(2, '0')}</div>
                        <div className="text-white/50 text-sm">{unit}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- ABOUT SECTION ---
interface AboutSectionProps {
    title: string;
    content: string;
    image?: string;
    imagePosition?: 'left' | 'right';
}

export function AboutSection({ title, content, image, imagePosition = 'left' }: AboutSectionProps) {
    return (
        <div className={`flex flex-col md:flex-row gap-8 items-center ${imagePosition === 'right' ? 'md:flex-row-reverse' : ''}`}>
            {image && (
                <div className="w-full md:w-1/3">
                    <img
                        src={image}
                        alt={title}
                        className="w-full rounded-2xl shadow-2xl"
                    />
                </div>
            )}
            <div className={`flex-1 ${image ? '' : 'max-w-2xl mx-auto text-center'}`}>
                <h2 className="text-3xl font-bold text-[var(--primary)] mb-4">{title}</h2>
                <p className="text-white/70 text-lg leading-relaxed whitespace-pre-line">{content}</p>
            </div>
        </div>
    );
}

// --- GALLERY ---
interface GalleryProps {
    images: { src: string; alt?: string }[];
    columns?: number;
}

export function Gallery({ images, columns = 3 }: GalleryProps) {
    const gridCols = {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6',
    }[columns] || 'grid-cols-3';

    return (
        <div className={`grid ${gridCols} gap-4 p-4`}>
            {images.map((img, idx) => (
                <div key={idx} className="aspect-square w-full rounded-2xl overflow-hidden group cursor-pointer hover:bg-white/5 transition-colors">
                    <img
                        src={img.src}
                        alt={img.alt || `gallery-image-${idx}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                </div>
            ))}
        </div>
    );
}

// --- TESTIMONIAL ---
interface TestimonialProps {
    quote: string;
    author: string;
    role?: string;
    avatar?: string;
}

export function Testimonial({ quote, author, role, avatar }: TestimonialProps) {
    return (
        <div className="p-[1.5em] rounded-2xl bg-[var(--primary)]/10">
            <p className="text-white/80 text-[1.125em] italic mb-[1em]">"{quote}"</p>
            <div className="flex items-center gap-[0.75em]">
                {avatar && (
                    <img src={avatar} alt={author} className="w-[2.5em] h-[2.5em] rounded-full" />
                )}
                <div>
                    <div className="text-white font-medium text-[1em]">{author}</div>
                    {role && <div className="text-white/50 text-[0.875em]">{role}</div>}
                </div>
            </div>
        </div>
    );
}

// --- DIVIDER ---
interface DividerProps {
    style?: 'line' | 'dots' | 'gradient';
    spacing?: 'sm' | 'md' | 'lg';
}

export function Divider({ style = 'line', spacing = 'md' }: DividerProps) {
    const spacingClasses = { sm: 'my-4', md: 'my-8', lg: 'my-16' };

    if (style === 'dots') {
        return (
            <div className={`flex justify-center gap-2 ${spacingClasses[spacing]}`}>
                {[1, 2, 3].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-[var(--primary)]/50" />
                ))}
            </div>
        );
    }

    if (style === 'gradient') {
        return (
            <div className={`h-px bg-gradient-to-r from-transparent via-[var(--primary)]/50 to-transparent ${spacingClasses[spacing]}`} />
        );
    }

    return <hr className={`border-white/10 ${spacingClasses[spacing]}`} />;
}

// --- FILE EMBED ELEMENTS ---

interface CodeElementProps {
    code: string;
    language?: string;
}

export function CodeElement({ code, language = 'javascript' }: CodeElementProps) {
    return (
        <div className="w-full h-full bg-[#1e1e1e] rounded-xl overflow-hidden flex flex-col border border-white/10">
            <div className="bg-white/5 px-4 py-2 flex items-center gap-2 border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs text-white/40 font-mono uppercase">{language}</span>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <pre className="text-sm font-mono leading-relaxed text-blue-300">
                    {code}
                </pre>
            </div>
        </div>
    );
}

interface PDFElementProps {
    url: string;
    title?: string;
}

export function PDFElement({ url, title }: PDFElementProps) {
    return (
        <div className="w-full h-full bg-white rounded-xl overflow-hidden border border-white/10 flex flex-col">
            {title && (
                <div className="bg-neutral-900 text-white/70 px-4 py-2 text-xs flex items-center justify-between border-b border-white/10">
                    <span className="truncate">{title}</span>
                    <a href={url} target="_blank" rel="noreferrer" className="hover:text-white">open ↗</a>
                </div>
            )}
            <iframe src={url} className="w-full h-full" title={title || 'PDF Document'} />
        </div>
    );
}

interface FileElementProps {
    url: string;
    filename: string;
    size?: string;
}

export function FileElement({ url, filename, size }: FileElementProps) {
    return (
        <a
            href={url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[var(--primary)]/50 rounded-xl flex flex-col items-center justify-center gap-4 transition-all group p-6 text-decoration-none interactive-pop"
        >
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
            </div>
            <div className="text-center w-full">
                <h3 className="text-white font-medium truncate w-full">{filename}</h3>
                {size && <p className="text-white/40 text-xs mt-1">{size}</p>}
                <p className="text-[var(--primary)] text-xs mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    click to download
                </p>
            </div>
        </a>
    );
}
// --- MINECRAFT LIVE STATS WIDGET ---

interface ServerStatus {
    online: boolean;
    count: number;
}

interface ChatMessage {
    type: 'chat' | 'join' | 'quit';
    player: string;
    message: string;
    timestamp: string;
}

export function MinecraftStatsWidget() {
    const { previewMode } = useBuilder();
    const isMobile = previewMode === 'mobile';
    const [status, setStatus] = useState<ServerStatus | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const lastStatusRef = useRef<boolean>(false);
    const socketRef = useRef<Socket | null>(null);
    const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Fetch initial data
        const fetchData = async () => {
            try {
                const [statsRes, chatRes] = await Promise.all([
                    fetch('/api/stats'),
                    fetch('/api/chat')
                ]);

                if (statsRes.ok) {
                    const statsData = await statsRes.json();
                    setStatus({
                        online: String(statsData.online) === 'true' || statsData.online === true,
                        count: Number(statsData.players) || 0
                    });
                    lastStatusRef.current = String(statsData.online) === 'true' || statsData.online === true;
                }

                if (chatRes.ok) {
                    const chatData = await chatRes.json();
                    setMessages(chatData.map((msg: any) => ({
                        type: msg.type || 'chat',
                        player: msg.player,
                        message: msg.message,
                        timestamp: msg.timestamp
                    }))); // Keep order (Oldest -> Newest)
                    // actually our backend pushes newest to end of array? no, push adds to end.
                    // Array in memory: [oldest, ..., newest].
                    // map preserves order.
                    // Message list renders map((msg, i)...) -> top to bottom.
                    // So we want oldest at top. 
                    // Let's assume API returns [oldest...newest].
                    // Wait, previous code used `setMessages(prev => [new, ...prev])`.
                    // This creates [newest, ...oldest].
                    // And renders `messages.map`.
                    // If map renders top-to-bottom:
                    //   Row 0: Newest
                    //   Row 1: Older
                    // This is a "Chat Log" style where newest is usually at BOTTOM.
                    // If we want newest at bottom, we should STORE as [oldest, ...newest].
                    // BUT `flex-col` renders 0 first (top).
                    // If we want standard chat (newest at bottom), we need:
                    //   render: [oldest, ..., newest] -> 
                    //      Top: Oldest
                    //      Bottom: Newest
                    // And scroll to bottom.
                    // My previous `socket.on` logic: `setMessages(prev => [newItem, ...prev])`
                    // This puts NEW item at INDEX 0 (TOP).
                    // So chat was flowing DOWN? No, Top is Index 0. 
                    // If Index 0 is newest, then Newest is at TOP.
                    // Standard chat: Newest is at BOTTOM.
                    // User said "scroll automatically to the bottom when a new message occurs".
                    // This implies Newest should be at BOTTOM.
                    // So I need to fix the storage order AND the fetch order.

                    // FIXED LOGIC:
                    // 1. Storage: [oldest, ..., newest]
                    // 2. Fetch: returns [oldest, ..., newest] -> Set as is.
                    // 3. Socket: `setMessages(prev => [...prev, newItem])` (Append to end)
                }
            } catch (err) {
                console.error('[MinecraftStats] Failed to fetch initial data:', err);
                // Set default state to prevent infinite loading
                setStatus({ online: false, count: 0 });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Configure socket with automatic reconnection
        const socket: Socket = io({
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socketRef.current = socket;

        // Connection state handlers
        socket.on('connect', () => {
            console.log('[MinecraftStats] Socket connected');
            setConnectionState('connected');
        });

        socket.on('disconnect', (reason) => {
            console.log('[MinecraftStats] Socket disconnected:', reason);
            setConnectionState('disconnected');
        });

        socket.on('reconnect_attempt', (attemptNumber) => {
            console.log(`[MinecraftStats] Reconnection attempt ${attemptNumber}`);
            setConnectionState('reconnecting');
        });

        socket.on('reconnect', (attemptNumber) => {
            console.log(`[MinecraftStats] Reconnected after ${attemptNumber} attempts`);
            setConnectionState('connected');
        });

        socket.on('reconnect_error', (error) => {
            console.error('[MinecraftStats] Reconnection error:', error);
        });

        socket.on('reconnect_failed', () => {
            console.error('[MinecraftStats] Reconnection failed');
            setConnectionState('disconnected');
        });

        socket.on('minecraft_update', (data: any) => {
            const isOnline = String(data.online) === 'true' || data.online === true;
            const playerCount = Number(data.count) || 0;

            // Update Header Stats (Always update stats from any event)
            setStatus({ online: isOnline, count: playerCount });

            // Handle State Change Messages Only (No Spam)
            if (data.type === 'ping') {
                if (isOnline !== lastStatusRef.current) {
                    const statusMsg = {
                        type: 'chat' as const,
                        player: 'system',
                        message: isOnline ? 'server is online' : 'server is offline',
                        timestamp: new Date().toISOString()
                    };
                    // Append to bottom
                    setMessages(prev => [...prev, statusMsg].slice(-50));
                    lastStatusRef.current = isOnline;
                }
                return; // Stop here for pings
            }

            // Show other events (chat, join, leave, quit)
            if (['chat', 'join', 'leave', 'quit'].includes(data.type) && data.player) {
                const isSystemEvent = ['join', 'leave', 'quit'].includes(data.type) ||
                    data.message.toLowerCase().includes('joined the') ||
                    data.message.toLowerCase().includes('left the');

                const newMsg = {
                    type: data.type as 'chat' | 'join' | 'leave' | 'quit',
                    player: isSystemEvent ? 'system' : data.player,
                    message: isSystemEvent
                        ? (data.message.includes('joined the') || data.message.includes('left the')
                            ? data.message
                            : `${data.player} ${data.type === 'join' ? 'joined' : 'left'} the game`)
                        : (data.message || ''),
                    timestamp: data.timestamp || new Date().toISOString()
                };
                // Append to bottom with client-side deduplication check
                setMessages(prev => {
                    const isDup = prev.length > 0 &&
                        prev[prev.length - 1].player === newMsg.player &&
                        prev[prev.length - 1].message === newMsg.message &&
                        prev[prev.length - 1].type === newMsg.type &&
                        (new Date(newMsg.timestamp).getTime() - new Date(prev[prev.length - 1].timestamp).getTime()) < 5000;

                    if (isDup) return prev;
                    return [...prev, newMsg].slice(-50);
                });
            }
        });

        return () => {
            console.log('[MinecraftStats] Cleaning up socket connection');
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
            socket.off('connect');
            socket.off('disconnect');
            socket.off('reconnect_attempt');
            socket.off('reconnect');
            socket.off('reconnect_error');
            socket.off('reconnect_failed');
            socket.off('minecraft_update');
            socket.disconnect();
            socketRef.current = null;
        };
    }, []);

    // V7 Deployment Marker
    useEffect(() => {
        console.log('🚀 [LiveStats] V7 LIVE - HyperSnap Scroll + Forced System (WebsiteElements)');
    }, []);

    // Hyper-Snap Scroll: Multiple attempts to catch layout shifts
    const scrollToBottom = () => {
        if (scrollContainerRef.current) {
            const el = scrollContainerRef.current;
            el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
        }
    };

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom();
            // Catch trailing animations/images/dynamic text
            const intervals = [50, 150, 300, 600, 1000];
            const timers = intervals.map(ms => setTimeout(scrollToBottom, ms));
            return () => timers.forEach(clearTimeout);
        }
    }, [messages]);

    // Force scroll after initial connect and history load
    useEffect(() => {
        const timer = setTimeout(scrollToBottom, 1500);
        return () => clearTimeout(timer);
    }, [isLoading]);

    if (isLoading || !status) {
        return (
            <div className="w-full h-full rounded-xl flex flex-col items-center justify-center p-6 text-center">
                <Gamepad2 size={32} className="text-white/20 mb-3 animate-pulse" />
                <p className="text-sm font-medium text-white/50 tracking-wide font-mono">connecting...</p>
                <div className="mt-2 text-xs text-white/30 italic max-w-[180px]">
                    fetching server status & history
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full rounded-2xl overflow-hidden flex flex-col group transition-all duration-500 isolate">
            {/* Glossy Header - Centered & Big */}
            <div className={`${isMobile ? 'p-3' : 'p-6'} flex flex-col items-center justify-center ${isMobile ? 'gap-1' : 'gap-2'} text-center rounded-t-2xl`}>
                <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-3'}`}>
                    <div className="relative">
                        <div className={`${isMobile ? 'w-2.5 h-2.5' : 'w-4 h-4'} rounded-full ${status.online ? 'bg-green-500' : 'bg-red-500'} transition-colors duration-500`} />
                        {status.online && (
                            <div className="absolute inset-0 w-full h-full rounded-full bg-green-500 animate-ping opacity-75" />
                        )}
                    </div>
                    <span className={`font-black text-white tracking-tight ${isMobile ? 'text-sm' : 'text-2xl'} drop-shadow-none shadow-none`} style={{ textShadow: 'none' }}>
                        {status.online ? 'server: online' : 'server: offline'}
                    </span>
                </div>

                {/* Player Count Centered */}
                <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-2'} text-white/50`}>
                    <span className={`${isMobile ? 'text-xs' : 'text-lg'} font-black text-[var(--primary)]`}>
                        {status.count}
                    </span>
                    <span className={`${isMobile ? 'text-[10px]' : 'text-sm'} font-bold tracking-wide`}>
                        player{status.count !== 1 ? 's' : ''} online
                    </span>
                </div>
            </div>

            {/* Event Feed */}
            <div
                ref={scrollContainerRef}
                className={`flex-1 overflow-y-auto ${isMobile ? 'px-3 py-2' : 'px-6 py-4'} space-y-3 custom-scrollbar`}
            >
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-30 min-h-[100px]">
                        <Gamepad2 size={32} className="mb-2" />
                        <p className="text-xs italic tracking-widest text-white/30 uppercase">Waiting for activity...</p>
                        {!status.online && <p className="text-[10px] mt-1 text-red-400 font-bold">(server is offline)</p>}
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isJoin = msg.message?.toLowerCase().includes('joined the') || false;
                        const isLeave = msg.message?.toLowerCase().includes('left the') || msg.type === 'quit';
                        const isSystem = msg.player === 'system' || isJoin || isLeave;
                        const displayPlayer = isSystem ? 'system' : msg.player;

                        return (
                            <div key={i} className={`
                                flex flex-col gap-0.5 p-2 rounded-lg transition-colors animate-bounce-up
                                ${isJoin ? 'bg-blue-600/10' :
                                    isLeave ? 'bg-red-600/10' :
                                        'hover:bg-white/5'}
                            `}>
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold 
                                        ${isJoin ? 'text-blue-300' :
                                            isLeave ? 'text-red-300' :
                                                (isSystem ? 'text-blue-300' : 'text-[var(--primary)]')}
                                    `}>
                                        {displayPlayer}
                                    </span>
                                    <span className="text-[10px] text-white/30 font-mono">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <p className={`text-sm ${isSystem ? 'text-white/80 italic' : 'text-white/90'} leading-snug`}>
                                    {msg.message}
                                </p>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Discord CTA */}
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    const discordLink = 'https://discord.gg/3BbFMfsqMB';
                    navigator.clipboard.writeText(discordLink);
                    window.open(discordLink, '_blank');
                }}
                className={`mx-6 mb-6 ${isMobile ? 'p-3' : 'p-6'} border border-[var(--primary)]/20 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-xl sm:rounded-2xl cursor-pointer hover:border-[var(--primary)]/50 transition-all flex flex-col items-center gap-1 sm:gap-3 group/discord shadow-[0_0_20px_rgba(246,176,18,0.05)] hover:shadow-[0_0_30px_rgba(246,176,18,0.1)] active:scale-[0.98]`}
            >
                <div className={`text-[var(--primary)] ${isMobile ? 'text-[x-small]' : 'text-2xl'} font-black tracking-tighter group-hover/discord:scale-105 transition-transform text-center leading-none uppercase`}>
                    join the discord to chat!
                </div>
                {!isMobile && (
                    <div className="text-xs text-white/40 font-medium tracking-wide">
                        click to copy & open
                    </div>
                )}
            </div>
        </div>
    );
}
