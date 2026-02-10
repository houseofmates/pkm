
import { useState, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload } from 'lucide-react';

interface IconPickerProps {
    onSelect: (icon: string, type: 'lucide' | 'emoji' | 'image') => void;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const COMMON_EMOJIS = [
    "📁", "📂", "📄", "📝", "📊", "📈", "📉", "🧠", "💡", "🎨",
    "🎯", "✅", "📅", "🏠", "🏢", "👤", "👥", "🤖", "🚀", "⭐",
    "🔥", "💧", "⚡", "🌈", "❤️", "👍", "👎", "👋", "🎉", "✨",
    "📚", "🎓", "🎮", "🎵", "🎤", "🎬", "📷", "🍔", "🍕", "☕",
    "🍎", "🥦", "🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯"
];

const COMMON_ICONS = [
    "Folder", "File", "Database", "Layout", "Settings", "User", "Users",
    "Home", "Search", "Menu", "MoreVertical", "MoreHorizontal", "Plus", "Minus",
    "X", "Check", "ChevronRight", "ChevronDown", "ArrowRight", "ArrowLeft",
    "Calendar", "Clock", "Bell", "Mail", "MessageSquare", "Phone", "Video",
    "Image", "Music", "Map", "Globe", "Sun", "Moon", "Cloud",
    "Zap", "Activity", "BarChart", "PieChart", "TrendingUp", "DollarSign",
    "CreditCard", "ShoppingBag", "Gift", "Heart", "Star", "Flag",
    "Bookmark", "Tag", "Link", "Lock", "Unlock", "Eye", "EyeOff"
];

export function IconPicker({ onSelect, trigger, open, onOpenChange }: IconPickerProps) {
    const [, setActiveTab] = useState('icons');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                onSelect(reader.result as string, 'image');
                onOpenChange?.(false);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-md bg-[#050505]">
                <DialogHeader>
                    <DialogTitle>select icon</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="icons" className="w-full" onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="icons">icons</TabsTrigger>
                        <TabsTrigger value="emojis">emojis</TabsTrigger>
                    </TabsList>

                    <div className="h-[300px] mt-4 rounded-md border p-1">
                        <ScrollArea className="h-full">
                            <TabsContent value="icons" className="mt-0">
                                <div className="grid grid-cols-6 gap-2 p-2">
                                    {COMMON_ICONS.map(name => {
                                        const Icon = (LucideIcons as any)[name];
                                        if (!Icon) return null;
                                        return (
                                            <Button
                                                key={name}
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10"
                                                onClick={() => {
                                                    onSelect(name, 'lucide');
                                                    onOpenChange?.(false);
                                                }}
                                                title={name}
                                            >
                                                <Icon className="h-5 w-5" />
                                            </Button>
                                        );
                                    })}
                                </div>
                            </TabsContent>
                            <TabsContent value="emojis" className="mt-0">
                                <div className="grid grid-cols-6 gap-2 p-2">
                                    {COMMON_EMOJIS.map(emoji => (
                                        <Button
                                            key={emoji}
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-2xl"
                                            onClick={() => {
                                                onSelect(emoji, 'emoji');
                                                onOpenChange?.(false);
                                            }}
                                        >
                                            {emoji}
                                        </Button>
                                    ))}
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </div>

                    <div className="mt-4 flex justify-center border-t pt-4">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-12 w-12 rounded-full"
                            onClick={() => fileInputRef.current?.click()}
                            title="Upload Icon"
                        >
                            <Upload className="h-6 w-6" />
                        </Button>
                        <Input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
