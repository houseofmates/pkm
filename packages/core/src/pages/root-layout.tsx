import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation, type NavItem } from '@/components/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { QuickEditSheet } from '@/components/quick-edit-sheet';
import { Spotlight } from '@/components/Spotlight';
import { WilsonChat } from '@/features/chat/wilson-chat';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Folder, Database, Github, CheckCircle, RefreshCcw, AlertTriangle } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';
import { useThemeReactor, hexToHsl } from '@/hooks/use-theme-reactor';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useFronter } from '@/contexts/fronter-context';
import { ProtocolShift } from '@/components/layout/ProtocolShift';
import { walPendingCount } from '@/lib/write-ahead-log';
import { getSidebarColors } from '@/utils/getSidebarColors';
import { useEdgelessStore } from '@/features/edgeless/store';
import { ContextMenu } from '@/components/ui/context-menu-custom';

// declare global window properties to fix TS errors
declare global {
  interface Window {
    accentBg?: string;
  }
}

interface MobileSidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar') => void;
  onSelectCollection: (name: string | null) => void;
  selectedCollection: string | null;
  items: any[];
  setItems?: (items: any[] | ((prev: any[]) => any[])) => void;
  accentBg?: string;
  className?: string;
}

function MobileSidebarDrawer({ isOpen, onClose, ...props }: MobileSidebarDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      {/* make the drawer stretch so the navigation inside can use flex-1 correctly */}
      <SheetContent side="left" className="p-0 w-[280px] h-full bg-background border-r border-border">
        <Navigation className="flex h-full border-none" {...props} />
      </SheetContent>
    </Sheet>
  );
}

export function RootLayout() {
  useThemeReactor(); // activate dynamic theming
  const { activeFronters, overrides, members } = useFronter();
  const navigate = useNavigate();

  // map initial path to tab to ensure sidebar highlights correctly on reload
  const getInitialTab = () => {
    const path = (typeof window !== 'undefined' && window.location && typeof window.location.pathname === 'string') ? window.location.pathname : '';
    if (path.startsWith('/databases')) return 'databases';
    if (path.startsWith('/headmates')) return 'headmates';
    if (path.startsWith('/captures')) return 'captures';
    if (path.startsWith('/journal')) return 'journal';
    if (path.startsWith('/calendar')) return 'calendar';
    return 'home';
  };

  const [activeTab, setActiveTab] = useState<'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar'>(getInitialTab());
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const [sidebarColors, setSidebarColors] = useState<{ sidebar?: { active?: string } }>({});
  const setChatOpen = useEdgelessStore((state) => state.setChatOpen);

  useEffect(() => {
    getSidebarColors().then(setSidebarColors);
  }, []);

  // Listen for chat open event from navigation buttons
  useEffect(() => {
    const handleOpenChat = () => {
      setChatOpen(true);
    };
    window.addEventListener('pkm:open-chat' as any, handleOpenChat);
    return () => window.removeEventListener('pkm:open-chat' as any, handleOpenChat);
  }, [setChatOpen]);

  let accentColor = sidebarColors.sidebar?.active || '#f6b012';
  if (activeFronters.length > 0) {
    const fronterId = activeFronters[0];
    accentColor = overrides[fronterId]?.color || members.find(m => m.id === fronterId)?.color || sidebarColors.sidebar?.active || '#f6b012';
  }
  if (isAphrodite) accentColor = '#e0a6b5';

  // helper to get low opacity background
  function getAccentBg(color: string) {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, 0.15)`;
    }
    if (color.startsWith('rgb')) {
      return color.replace(/rgb\(([^)]+)\)/, 'rgba($1, 0.15)');
    }
    // generic fallback that respects the CSS variable
    return `hsl(var(--primary) / 0.15)`;
  }
  const accentBg = getAccentBg(accentColor);

  useEffect(() => {
    // set favicon based on subdomain; avoid the default pkm bolt when
    // viewing houseofmates.* sites so that those domains keep their own
    // branding.
    const favIcon = document.getElementById('favicon') as HTMLLinkElement;
    if (favIcon) {
      const host = window.location.hostname;
      if (host === 'dupe.houseofmates.space') {
        favIcon.href = '/favicon-dupe.png';
      } else if (host === 'home.houseofmates.space') {
        favIcon.href = '/favicon-home-subdomain.png';
      } else if (host === 'blog.houseofmates.space') {
        favIcon.href = '/favicon-blog.png';
      } else if (host === 'houseofmates.space') {
        favIcon.href = '/favicon-houseofmates.png';
      } else {
        // default pkm logo (transparent database icon)
        favIcon.href = '/favicon.png';
      }
    }

    // also adjust document title for the same hosts
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    if (host) {
      if (host === 'dupe.houseofmates.space') document.title = 'dupemates';
      else if (host === 'home.houseofmates.space') document.title = 'home';
      else if (host === 'blog.houseofmates.space') document.title = 'blog';
      else if (host === 'houseofmates.space') document.title = 'houseofmates';
      else document.title = 'pkm';

      // make absolutely sure that we never end up with an uppercase title
      document.title = document.title.toLowerCase();
    }
  }, []);

  const [sidebarItems, setSidebarItems] = useAppSetting<NavItem[]>('sidebar_items', [], { pollIntervalMs: 5000 });
  const [activeDragItem, setActiveDragItem] = useState<NavItem | null>(null);

  // Force sidebar refresh when collections change - clear cache for new collections
  useEffect(() => {
    // Clear deleted collections cache to ensure new collections appear
    localStorage.removeItem('sidebar_deleted_collections');
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 3,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
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
    else if (tab === 'journal') navigate('/journal');
    else if (tab === 'calendar') navigate('/calendar');
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
    // Use the backend collection name (id) for navigation, which may differ from display name
    // The name parameter here is the item.id which is the actual backend collection name
    navigate('/databases/' + encodeURIComponent(name), { state: { fromSidebar: true } });
    setActiveTab('databases');
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <ProtocolShift />
      <div className="flex flex-col lg:flex-row h-[100dvh] w-full bg-background overflow-hidden transition-colors duration-700">
        <Navigation className="hidden lg:flex" activeTab={activeTab} onTabChange={handleTabChange} onSelectCollection={handleSelectCollection} selectedCollection={selectedCollection} items={sidebarItems} setItems={setSidebarItems} />
        <MobileSidebarDrawer
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSelectCollection={handleSelectCollection}
          selectedCollection={selectedCollection}
          items={sidebarItems}
          setItems={setSidebarItems}
          accentBg={accentBg}
        />

        <main className="flex-1 overflow-auto h-full relative pb-20 lg:pb-0" style={{ touchAction: 'pan-y' }}>
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

        <BottomNav className="lg:hidden" activeTab={activeTab} onTabChange={handleTabChange} />
        <Spotlight />
        <WilsonChat />
        <DragOverlay>
          {activeDragItem ? (
            <div style={{ opacity: 0.5, pointerEvents: 'none', width: '16rem', minWidth: 0 }}>
              {/* live preview of sidebar item, styled as in navigation */}
              <div className="mb-0.5 group relative">
                <div className="flex items-center bg-card border border-white/10 rounded shadow-lg p-2 w-full">
                  {/* icon logic (copied from navigation/SortableItem) */}
                  {(() => {
                    if (activeDragItem.icon && activeDragItem.iconType) {
                      if (activeDragItem.iconType === 'emoji') return <span className="mr-2 text-base leading-none">{activeDragItem.icon}</span>;
                      if (activeDragItem.iconType === 'image') return <img src={activeDragItem.icon} alt="icon" className="h-4 w-4 mr-2 object-contain" />;
                      if (activeDragItem.iconType === 'lucide') {
                        const Icon = (LucideIcons as any)[activeDragItem.icon] || Folder;
                        return <Icon className="h-4 w-4 mr-2" style={{ color: activeDragItem.color || 'var(--primary)' }} />;
                      }
                    }
                    if (activeDragItem.type === 'folder') return <Folder className="h-4 w-4 mr-2" />;
                    return <Database className="h-4 w-4 mr-2" style={{ color: activeDragItem.color || 'var(--primary)' }} />;
                  })()}
                  <span className="truncate text-sm font-medium lowercase">{activeDragItem.name}</span>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
      <QuickEditSheet />
      <ContextMenu />
    </DndContext>
  );
}
