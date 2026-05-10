import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, Download, Trash2, Lock, Save, FileUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { usePluralSystem } from '../../stores/use-plural-system';
import { compressImage, blobToDataUrl } from '../../utils/image-utils';

export function SettingsPanel() {
  const {
    systemSettings,
    updateSystemSettings,
    exportData,
    importData,
    resetAllData,
  } = usePluralSystem();

  const [systemName, setSystemName] = useState(systemSettings.name);
  const [systemDesc, setSystemDesc] = useState(systemSettings.description || '');
  const [systemTag, setSystemTag] = useState(systemSettings.tag || '');
  const [timezone, setTimezone] = useState(systemSettings.timezone);
  const [theme, setTheme] = useState(systemSettings.theme);
  const [dyslexiaFont, setDyslexiaFont] = useState(systemSettings.dyslexiaFont);
  const [highContrast, setHighContrast] = useState(systemSettings.highContrast);
  const [fontScale, setFontScale] = useState(systemSettings.fontScale);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSystem = async () => {
    const avatarBlob = avatarUrl ? await fetch(avatarUrl).then(r => r.blob()) : systemSettings.avatarBlob;
    await updateSystemSettings({
      name: systemName,
      description: systemDesc,
      tag: systemTag,
      timezone,
      theme,
      dyslexiaFont,
      highContrast,
      fontScale,
      avatarBlob,
    });
    toast.success('system settings saved');
  };

  const handleSetPin = async () => {
    if (pin.length < 4) {
      toast.error('pin must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      toast.error('pins do not match');
      return;
    }
    // simple hash: not cryptographically secure but sufficient for local deterrent
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
    const hashStr = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    await updateSystemSettings({ appLockPinHash: hashStr });
    setPin('');
    setConfirmPin('');
    toast.success('app lock pin set');
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plural-system-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('data exported');
  };

  const handleImport = async () => {
    try {
      const data = JSON.parse(importText);
      await importData(data);
      setImportOpen(false);
      setImportText('');
      toast.success('data imported');
    } catch (e) {
      toast.error('invalid import data: ' + (e as Error).message);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleReset = async () => {
    await resetAllData();
    setResetOpen(false);
    toast.success('all data cleared');
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6">
      {/* system profile */}
      <section>
        <h2 className="text-sm font-medium text-white/60 lowercase mb-3">system profile</h2>
        <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="system" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl text-white/20">&amp;</span>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Upload className="h-4 w-4 text-white" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const compressed = await compressImage(file, 256, 256);
                const url = await blobToDataUrl(compressed);
                setAvatarUrl(url);
              }} />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-white/40 text-xs lowercase">system name</Label>
                <Input value={systemName} onChange={e => setSystemName(e.target.value)} className="bg-white/5 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/40 text-xs lowercase">system tag</Label>
                <Input value={systemTag} onChange={e => setSystemTag(e.target.value)} className="bg-white/5 border-white/10 text-white" placeholder="e.g. |sys" />
              </div>
            </div>
          </div>
          <div>
            <Label className="text-white/40 text-xs lowercase">description / bio</Label>
            <Textarea value={systemDesc} onChange={e => setSystemDesc(e.target.value)} rows={3} className="bg-white/5 border-white/10 text-white resize-none" />
          </div>
          <div>
            <Label className="text-white/40 text-xs lowercase">timezone</Label>
            <Input value={timezone} onChange={e => setTimezone(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <Button onClick={handleSaveSystem} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 gap-1">
            <Save className="h-4 w-4" />
            <span className="lowercase">save profile</span>
          </Button>
        </div>
      </section>

      {/* appearance */}
      <section>
        <h2 className="text-sm font-medium text-white/60 lowercase mb-3">appearance & accessibility</h2>
        <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70 lowercase">theme</span>
            <div className="flex gap-1">
              {(['dark', 'light', 'system'] as const).map(t => (
                <Button
                  key={t}
                  variant={theme === t ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTheme(t)}
                  className={`text-xs lowercase ${theme === t ? 'bg-[#f6b012] text-black' : 'text-white/40 hover:text-white'}`}
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70 lowercase">dyslexia-friendly font</span>
            <Switch checked={dyslexiaFont} onCheckedChange={setDyslexiaFont} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/70 lowercase">high contrast mode</span>
            <Switch checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/70 lowercase">font scale</span>
              <span className="text-xs text-white/40">{Math.round(fontScale * 100)}%</span>
            </div>
            <Slider value={[fontScale]} onValueChange={([v]) => setFontScale(v)} min={0.8} max={1.5} step={0.05} className="w-full" />
          </div>
          <Button onClick={handleSaveSystem} variant="outline" className="border-white/10 text-white hover:bg-white/10 lowercase">
            save appearance
          </Button>
        </div>
      </section>

      {/* app lock */}
      <section>
        <h2 className="text-sm font-medium text-white/60 lowercase mb-3">app lock</h2>
        <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/30 lowercase">
            <Lock className="h-3.5 w-3.5" />
            {systemSettings.appLockPinHash ? 'pin is set' : 'no pin set'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="new pin" className="bg-white/5 border-white/10 text-white" />
            <Input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="confirm pin" className="bg-white/5 border-white/10 text-white" />
          </div>
          <Button onClick={handleSetPin} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1">
            <Lock className="h-3.5 w-3.5" />
            <span className="lowercase">set pin</span>
          </Button>
        </div>
      </section>

      {/* data management */}
      <section>
        <h2 className="text-sm font-medium text-white/60 lowercase mb-3">data management</h2>
        <div className="bg-white/5 rounded-lg p-4 border border-white/5 space-y-3">
          <div className="flex gap-2">
            <Button onClick={handleExport} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1 flex-1">
              <Download className="h-3.5 w-3.5" />
              <span className="lowercase">export json</span>
            </Button>
            <Button onClick={() => setImportOpen(true)} variant="outline" className="border-white/10 text-white hover:bg-white/10 gap-1 flex-1">
              <FileUp className="h-3.5 w-3.5" />
              <span className="lowercase">import json</span>
            </Button>
          </div>
          <Button onClick={() => setResetOpen(true)} variant="outline" className="border-red-500/20 text-red-400 hover:bg-red-500/10 gap-1 w-full">
            <Trash2 className="h-3.5 w-3.5" />
            <span className="lowercase">delete all data</span>
          </Button>
        </div>
      </section>

      {/* import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg">
          <DialogHeader><DialogTitle className="lowercase">import data</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            <input type="file" accept=".json" onChange={handleFileImport} className="text-sm text-white/60" />
            <Textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder="paste json export here..."
              rows={8}
              className="bg-white/5 border-white/10 text-white text-xs resize-none font-mono"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)} className="text-white/40 hover:text-white lowercase">cancel</Button>
            <Button onClick={handleImport} className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase">import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* reset dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="bg-[#111] border-red-500/20 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="lowercase text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              delete all data?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-white/60 lowercase">
            this will permanently erase all members, front history, groups, journals, and chat messages. this cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResetOpen(false)} className="text-white/40 hover:text-white lowercase">cancel</Button>
            <Button onClick={handleReset} className="bg-red-500 text-white hover:bg-red-600 lowercase">delete everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
