import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation, type NavItem } from '@/components/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { QuickEditSheet } from '@/components/quick-edit-sheet';
import { SettingsDialog } from '@/components/settings-dialog';
import { Spotlight } from '@/components/Spotlight';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Folder, Database, Github, CheckCircle, RefreshCcw, AlertTriangle } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { useThemeReactor } from '@/hooks/use-theme-reactor';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useFronter } from '@/contexts/fronter-context';
import { ProtocolShift } from '@/components/layout/ProtocolShift';
import { walPendingCount } from '@/lib/write-ahead-log';

// convert hex color to hsl format for tailwind
function hexToHSL(hex: string): string {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return `${h} ${s}% ${l}%`;
}

function MobileSidebarDrawer({ isOpen, onClose, ...props }: any) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="p-0 w-[280px] bg-background border-r border-border">
        <Navigation className="flex h-full border-none" {...props} />
      </SheetContent>
    </Sheet>
  );
}

export function RootLayout() {
  useThemeReactor(); // activate dynamic theming
  const { activeFronters, overrides, members } = useFronter();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'databases' | 'home' | 'headmates' | 'board' | 'captures'>('home');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // sync / health state
  const [walCount, setWalCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'ok' | 'syncing' | 'error'>('ok');
  // allow disabling the little corner status via env (default off)
  const showHealthBar = import.meta.env.VITE_SHOW_HEALTH_BAR === 'true';
  useEffect(() => {
    const interval = setInterval(async () => {
      const count = await walPendingCount();
      setWalCount(count);
      setSyncStatus(count > 0 ? 'syncing' : 'ok');
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const subdomain = window.location.hostname.split('.')[0];
  const isAphrodite = subdomain === 'aphrodite';

  let activeColor = "#f5af12";
  if (activeFronters.length > 0) {
    const fronterId = activeFronters[0];
    activeColor = overrides[fronterId]?.color || members.find(m => m.id === fronterId)?.color || "#f5af12";
  }

  if (isAphrodite) activeColor = "#e0a6b5";

  useEffect(() => {
    const root = document.documentElement;
    if (activeColor) {
      const hslColor = hexToHSL(activeColor);
      root.style.setProperty('--primary', hslColor);
      root.style.setProperty('--ring', hslColor);
      if (activeColor.startsWith('#')) {
        root.style.setProperty('--primary-soft', activeColor + '1A');
      } else {
        root.style.setProperty('--primary-soft', `color-mix(in srgb, ${activeColor} 10%, transparent)`);
      }
    }
  }, [activeColor]);

  const [sidebarItems, setSidebarItems] = useAppSetting<NavItem[]>('sidebar_items', []);
  const [activeDragItem, setActiveDragItem] = useState<NavItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const item = sidebarItems.find(i => i.id === active.id);
    if (item) setActiveDragItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeIsSidebar = sidebarItems.some(i => i.id === activeId);
    const overIsSidebar = sidebarItems.some(i => i.id === overId);

    if (activeIsSidebar && overIsSidebar && activeId !== overId) {
      setSidebarItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === activeId);
        const newIndex = items.findIndex((i) => i.id === overId);
        return arrayMove(items, oldIndex, newIndex);
      });
      return;
    }
    if (activeIsSidebar && (overId === 'dashboard-canvas' || overId === 'canvas-droppable')) {
      const item = sidebarItems.find(i => i.id === activeId);
      if (item) {
        window.dispatchEvent(new CustomEvent('pkm:add-widget', {
          detail: { id: item.id, type: item.type, name: item.name, icon: item.icon, iconType: item.iconType }
        }));
      }
    }
  };

  const handleTabChange = (tab: any) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'captures') navigate('/captures');
    else if (tab === 'headmates') navigate('/headmates');
    else if (tab === 'board') navigate('/board');
    else if (tab === 'databases') navigate('/databases', { state: { fromSidebar: true } });
    setActiveTab(tab);
    if (tab !== 'databases') setSelectedCollection(null);
  };

  const handleSelectCollection = (name: string | null) => {
    if (!name || name === 'NEW') { setSelectedCollection(null); return; }
    if (name.startsWith('workspace_')) { navigate(`/workspace/${name}`); setActiveTab('databases'); setSelectedCollection(name); return; }
    if (name.startsWith('doc_')) { navigate(`/page/${name.replace('doc_', '')}`); setActiveTab('databases'); setSelectedCollection(name); return; }
    if (name.startsWith('drawing_')) { navigate(`/drawings/${name.replace('drawing_', '')}`); setActiveTab('databases'); setSelectedCollection(name); return; }
    setSelectedCollection(name);
    navigate('/databases/' + encodeURIComponent(name), { state: { fromSidebar: true } });
    setActiveTab('databases');
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ProtocolShift />
      <div className="flex flex-col lg:flex-row h-screen w-full bg-background overflow-hidden transition-colors duration-700">
        <Navigation className="hidden lg:flex" activeTab={activeTab} onTabChange={handleTabChange} onSelectCollection={handleSelectCollection} selectedCollection={selectedCollection} items={sidebarItems} setItems={setSidebarItems} onOpenSettings={() => setSettingsOpen(true)} />
        <MobileSidebarDrawer isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} onTabChange={handleTabChange} onSelectCollection={handleSelectCollection} selectedCollection={selectedCollection} items={sidebarItems} onOpenSettings={() => setSettingsOpen(true)} />

        <main className="flex-1 overflow-hidden h-full relative pb-20 lg:pb-0" style={{ touchAction: 'pan-y' }}>
          {/* sync / health header bar (premium) */}
          {showHealthBar && (
            <div className="absolute top-4 right-4 z-50 flex items-center gap-3 px-3 py-1.5 rounded-full bg-background/40 backdrop-blur-xl border border-primary/10 text-[10px] font-medium transition-all hover:bg-background/60">
              <div className="flex items-center gap-1.5 px-2 border-r border-primary/5">
                <Database className="h-3 w-3 text-primary/60" />
                <span className="text-primary/80 lowercase">{syncStatus === 'ok' ? 'connected' : 'syncing'}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 border-r border-primary/5">
                <Github className="h-3 w-3 text-primary/60" />
                <span className="text-primary/80 lowercase">auto-git active</span>
              </div>
              <div className="flex items-center gap-1.5 px-1">
                {walCount > 0 ? (
                  <>
                    <RefreshCcw className="h-3 w-3 text-amber-500 animate-spin" />
                    <span className="text-amber-500 lowercase">{walCount} pending</span>
                  </>
                ) : syncStatus === 'error' ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                    <span className="text-red-500 lowercase">error</span>
                  </>
                ) : (
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                )}
              </div>
            </div>
          )}
          <Outlet />
        </main>

        <BottomNav className="lg:hidden" activeTab={activeTab} onTabChange={handleTabChange} onOpenSettings={() => setSettingsOpen(true)} />
        <Spotlight />
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
        <DragOverlay>
          {activeDragItem ? (
            <div className="bg-card border rounded shadow-lg p-2 flex items-center opacity-80 w-48 pointer-events-none">
              <Folder className="h-4 w-4 mr-2" />
              <span className="truncate text-sm font-medium lowercase">{activeDragItem.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
      <QuickEditSheet />
    </DndContext>
  );
}
