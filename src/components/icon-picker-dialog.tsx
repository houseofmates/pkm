
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { type LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

const { Upload } = Icons;
// Dynamic icon loader for Lucide icons
const lucideIconMap: Record<string, LucideIcon> = {};
for (const iconName of common_icons) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lucideIconMap[iconName.charAt(0).toUpperCase() + iconName.slice(1)] = require('lucide-react')[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
  } catch {}
}

function getLucideIcon(name: string): LucideIcon | undefined {
  return lucideIconMap[name.charAt(0).toUpperCase() + name.slice(1)];
}

// helper to safely get lucide icon by name
function getLucideIcon(name: string): LucideIcon | undefined {
  return (Icons as Record<string, LucideIcon>)[name];
}

interface IconPickerProps {
  onSelect: (icon: string, type: 'lucide' | 'emoji' | 'image') => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const common_emojis = [
  "📁", "📂", "📄", "📝", "📊", "📈", "📉", "🧠", "💡", "🎨",
  "🎯", "✅", "📅", "🏠", "🏢", "👤", "👥", "🤖", "🚀", "⭐",
  "🔥", "💧", "⚡", "🌈", "❤️", "👍", "👎", "👋", "🎉", "✨",
  "📚", "🎓", "🎮", "🎵", "🎤", "🎬", "📷", "🍔", "🍕", "☕",
  "🍎", "🥦", "🐶", "🐱", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯"
];

const common_icons = [
  "folder", "file", "database", "layout", "settings", "user", "users",
  "home", "search", "menu", "morevertical", "morehorizontal", "plus", "minus",
  "x", "check", "chevronright", "chevrondown", "arrowright", "arrowleft",
  "calendar", "clock", "bell", "mail", "messagesquare", "phone", "video",
  "image", "music", "map", "globe", "sun", "moon", "cloud",
  "zap", "activity", "barchart", "piechart", "trendingup", "dollarsign",
  "creditcard", "shoppingbag", "gift", "heart", "star", "flag",
  "bookmark", "tag", "link", "lock", "unlock", "eye", "eyeoff"
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
                  {common_icons.map(name => {
                    const Icon = getLucideIcon(name);
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
                  {common_emojis.map(emoji => (
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
              title="upload icon"
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
