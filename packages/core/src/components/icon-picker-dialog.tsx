import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

import { type LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';

import { useAppSetting } from '@/hooks/use-app-setting';
import { generateVertexIcon } from '@/lib/vertex-image';

const common_icons = [
  "Folder", "File", "Database", "Layout", "Settings", "User", "Users",
  "Home", "Search", "Menu", "MoreVertical", "MoreHorizontal", "Plus", "Minus",
  "X", "Check", "ChevronRight", "ChevronDown", "ArrowRight", "ArrowLeft",
  "Calendar", "Clock", "Bell", "Mail", "MessageSquare", "Phone", "Video",
  "Image", "Music", "Map", "Globe", "Sun", "Moon", "Cloud",
  "Zap", "Activity", "BarChart", "PieChart", "TrendingUp", "DollarSign",
  "CreditCard", "ShoppingBag", "Gift", "Heart", "Star", "Flag",
  "Bookmark", "Tag", "Link", "Lock", "Unlock", "Eye", "EyeOff"
];

const { Upload, Sparkles, Loader2, RotateCcw, Wand2, Save, Check, Undo2 } = Icons;


// helper to safely get lucide icon by name
function getLucideIcon(name: string): LucideIcon | undefined {
  return (Icons as unknown as Record<string, unknown>)[name] as LucideIcon | undefined;
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


export function IconPicker({ onSelect, trigger, open, onOpenChange }: IconPickerProps) {
  const [, setActiveTab] = useState('icons');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLInputElement>(null);
  const [customIcons, setCustomIcons] = useAppSetting<{ id: string; dataUrl: string; prompt?: string; createdAt?: string; }[]>('custom_icons', []);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [lastPrompt, setLastPrompt] = useState('');
  const [generated, setGenerated] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showPrompt && promptInputRef.current) promptInputRef.current.focus();
  }, [showPrompt]);

  const sortedCustomIcons = useMemo(() => {
    return [...(customIcons || [])].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [customIcons]);

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

  const resetAi = () => {
    setShowPrompt(false);
    setGenerated(null);
    setPrompt('');
    setError(null);
  };

  const runGen = async (p?: string) => {
    const effective = (p ?? prompt).trim();
    if (!effective) { setError('prompt required'); return; }
    setError(null);
    setGenerating(true);
    try {
      const img = await generateVertexIcon(effective);
      setGenerated(img);
      setLastPrompt(effective);
    } catch (err: any) {
      setError(err?.message || 'failed to generate');
    } finally {
      setGenerating(false);
    }
  };

  const save = () => {
    if (!generated) return;
    const entry = { id: crypto.randomUUID(), dataUrl: generated, prompt: lastPrompt, createdAt: new Date().toISOString() };
    setCustomIcons((prev = []) => [entry, ...prev].slice(0, 50));
    onSelect(generated, 'image');
    onOpenChange?.(false);
    resetAi();
  };

  const useOnce = () => {
    if (!generated) return;
    onSelect(generated, 'image');
    onOpenChange?.(false);
    resetAi();
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

          <div className="h-[320px] mt-4 rounded-md border p-2 space-y-3">
            <TabsContent value="icons" className="mt-0 h-full">
              <ScrollArea className="h-full space-y-3 pr-1">
                {(showPrompt || generated || generating) && (
                  <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                    {!generated && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Sparkles className="h-4 w-4" /> describe the icon to generate
                        </div>
                        <Input
                          ref={promptInputRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runGen(); } }}
                          placeholder="e.g. minimalist rocket"
                        />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => runGen()} disabled={generating} className="gap-2">
                            {generating && <Loader2 className="h-4 w-4 animate-spin" />} generate
                          </Button>
                          <Button variant="ghost" size="sm" onClick={resetAi} className="text-xs">cancel</Button>
                        </div>
                        {error && <div className="text-xs text-red-400">{error}</div>}
                      </div>
                    )}

                    {generated && (
                      <div className="space-y-2">
                        <div className="aspect-square w-full rounded-lg border border-border/60 bg-[#050505] flex items-center justify-center overflow-hidden">
                          <img src={generated} alt="generated" className="h-full w-full object-contain" />
                        </div>
                        {error && <div className="text-xs text-red-400">{error}</div>}
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" size="sm" onClick={resetAi} className="gap-2"><Undo2 className="h-4 w-4" /> cancel</Button>
                          <Button variant="secondary" size="sm" onClick={() => runGen(lastPrompt)} className="gap-2"><RotateCcw className="h-4 w-4" /> regenerate</Button>
                          <Button variant="ghost" size="sm" onClick={() => { setGenerated(null); setShowPrompt(true); setPrompt(lastPrompt); }} className="gap-2"><Wand2 className="h-4 w-4" /> edit prompt</Button>
                          <Button variant="default" size="sm" onClick={save} className="gap-2"><Save className="h-4 w-4" /> save</Button>
                          <Button variant="outline" size="sm" onClick={useOnce} className="col-span-2 gap-2"><Check className="h-4 w-4" /> use once</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>custom icons</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="xs" className="h-7 text-[11px] gap-1" onClick={() => setShowPrompt(true)}><Sparkles className="h-3 w-3" /> ai</Button>
                      <Button variant="ghost" size="xs" className="h-7" onClick={() => fileInputRef.current?.click()}><Upload className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  {sortedCustomIcons.length ? (
                    <div className="grid grid-cols-6 gap-2">
                      {sortedCustomIcons.map((c) => (
                        <button
                          key={c.id}
                          className="flex items-center justify-center h-12 w-12 rounded-md border border-border/50 bg-background/40 hover:border-primary/60 hover:shadow-sm transition"
                          onClick={() => { onSelect(c.dataUrl, 'image'); onOpenChange?.(false); }}
                          title={c.prompt || 'custom icon'}
                        >
                          <img src={c.dataUrl} alt="icon" className="h-8 w-8 object-contain" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-muted-foreground px-1">no saved custom icons yet</div>
                  )}
                </div>

                <div className="grid grid-cols-6 gap-2 p-1">
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
              </ScrollArea>
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
          </div>

          <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileUpload}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
