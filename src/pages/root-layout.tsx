import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation, type NavItem } from '@/components/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { GlobalCommandPalette } from '@/components/global-command-palette';
import { QuickEditSheet } from '@/components/quick-edit-sheet';

// convert hex color to hsl format for tailwind
function hexToHSL(hex: string): string {
  // remove # if present
  hex = hex.replace(/^#/, '');

  // parse hex values
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
import { Folder } from 'lucide-react';
import { useAppSetting } from '@/hooks/use-app-setting';

import { useThemeReactor } from '@/hooks/use-theme-reactor';
import { useDrag } from '@use-gesture/react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useFronter } from '@/contexts/fronter-context';
import { ProtocolShift } from '@/components/layout/ProtocolShift';
import { IdentityGroundingWidget } from '@/components/identity/IdentityGroundingWidget';
import { useEdgelessStore } from '@/features/edgeless/store';

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
  useThemeReactor(); // Activate Dynamic Theming
  const { activeFronters, overrides, members, registerFrontChange } = useFronter();

  // --- phase 5: the prism (identity & subdomains) ---
  const hostname = window.location.hostname;
  const subdomain = hostname.split('.')[0];
  const isAphrodite = subdomain === 'aphrodite';

  // auto-switch identity based on subdomain
  useEffect(() => {
  if (isAphrodite && !activeFronters.includes('aphrodite')) {
  // force front aphrodite if visiting her temple
  // we might need a method to 'force' set fronter without ui toggle if strictly routing
  // for now, we visually override:
  }
  }, [isAphrodite, activeFronters]);

  const isHouseFronting = activeFronters.length > 0;

  // get the color from the fronting member
  let activeColor = "#f5af12"; // Default color
  if (activeFronters.length > 0) {
  const fronterId = activeFronters[0];
  console.log('Getting color for fronter:', fronterId);
  console.log('Overrides:', overrides[fronterId]);
  console.log('Member from list:', members.find(m => m.id === fronterId));
  // try to get color from overrides first, then from members data
  activeColor = overrides[fronterId]?.color || members.find(m => m.id === fronterId)?.color || "#f5af12";
  console.log('Final active color:', activeColor);
  } else {
  console.log('No fronters, using default color:', activeColor);
  }

  // prism override
  if (isAphrodite) {
  activeColor = "#e0a6b5"; // Seafoam/Rose blend (Rose dominate)
  // adjust for aphrodite specific palette
  }

  // --- the void blueprint: immediate js bridge ---
  useEffect(() => {
  console.log('Theme effect running. Active color:', activeColor);
  const root = document.documentElement;
  if (activeColor) {
  const hslColor = hexToHSL(activeColor);
  console.log('Setting --primary to:', activeColor, '(HSL:', hslColor + ')');
  root.style.setProperty('--primary', hslColor);
  root.style.setProperty('--ring', hslColor);

  // calculate soft color (10% opacity) manually for robustness
  // if hex
  if (activeColor.startsWith('#')) {
 root.style.setProperty('--primary-soft', activeColor + '1A'); // 1A is ~10%
  } else {
 root.style.setProperty('--primary-soft', `color-mix(in srgb, ${activeColor} 10%, transparent)`);
  }
  }

  if (isAphrodite) {
  root.style.setProperty('--background', '#1a0f12'); // Deep rose/void
  root.style.setProperty('--card', '#2a1a1f');
  root.style.setProperty('--border', '#4a2a35');
  } else {
  // reset to default void if not aphrodite (important for spa navigation)
  root.style.setProperty('--background', '#050505');
  root.style.removeProperty('--card'); // Allow default fallback
  root.style.removeProperty('--border');
  }

  }, [activeColor, isAphrodite]);

  // --- phase 6: automated realtor (fronter homes) ---
  const { client } = useAuth();
  useEffect(() => {
  if (!activeFronters || activeFronters.length === 0) return;

  const checkAndBuildHome = async () => {
  const fronterId = activeFronters[0];
  const homeId = `fronter-home-${fronterId}`;

  // check if we already checked this session to avoid spam
  if (sessionStorage.getItem(`checked_home_${fronterId}`)) return;
  sessionStorage.setItem(`checked_home_${fronterId}`, 'true');

  try {
 // try to fetch existing canvas/doc
 // specific collection for canvases? 'pkm_settings' with type 'canvas'?
 // based on canvaspage, let's assume we store in 'canvases' or 'docs'.
 // let's use 'pkm_settings' as it serves as a registry often.

 const res = await client.listRecords('pkm_settings', {
 filter: { name: homeId }
 });

 if (res.data?.length === 0 && res.data?.data?.length === 0) {
 console.log("Creating home base for", fronterId);
 // create new home
 await client.createRecord('pkm_settings', {
 name: homeId,
 title: `Home: ${fronterId}`,
 type: 'canvas', // Identifier for CanvasPage
 value: JSON.stringify({
   version: "2.5.0",
   objects: [
   {
   type: "i-text",
   version: "2.5.0",
   originX: "left",
   originY: "top",
   left: 100,
   top: 100,
   width: 300,
   height: 45,
   fill: activeColor || "#ffffff",
   stroke: null,
   strokeWidth: 1,
   strokeDashArray: null,
   strokeLineCap: "butt",
   strokeDashOffset: 0,
   strokeLineJoin: "miter",
   strokeMiterLimit: 4,
   scaleX: 1,
   scaleY: 1,
   angle: 0,
   flipX: false,
   flipY: false,
   opacity: 1,
   shadow: null,
   visible: true,
   backgroundColor: "",
   fillRule: "nonzero",
   paintFirst: "fill",
   globalCompositeOperation: "source-over",
   skewX: 0,
   skewY: 0,
   text: `Welcome, ${fronterId}.`,
   fontSize: 40,
   fontWeight: "bold",
   fontFamily: "Varela Round",
   fontStyle: "normal",
   lineHeight: 1.16,
   underline: false,
   overline: false,
   linethrough: false,
   textAlign: "left",
   textBackgroundColor: "",
   charSpacing: 0,
   styles: {}
   }
   ]
 })
 });

 // add to sidebar?
 // we rely on sidebar sync or manual add.
 }
  } catch (e) {
 console.error("Auto-realtor failed", e);
  }
  };

  checkAndBuildHome();
  }, [activeFronters, client, activeColor]);





  const [activeTab, setActiveTab] = useState<'databases' | 'home' | 'headmates' | 'board' | 'captures'>('home');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // swipe to open sidebar (right swipe on left edge)
  // swipe to open sidebar (right swipe on left edge)
  // swipe to open sidebar (removed per user request)
  // const { activetool } = useedgelessstore();
  // const isdrawing = activetool === 'pen' || activetool === 'eraser';
  // const bindswipe = ...

  const navigate = useNavigate();

  // --- global drag state (lifted from navigation) ---
  // synced with nocobase 'pkm_settings' collection
  const [sidebarItems, setSidebarItems] = useAppSetting<NavItem[]>('sidebar_items', []);

  const [activeDragItem, setActiveDragItem] = useState<NavItem | null>(null);

  const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // filter out pkm_settings from sidebar persisted state
  // this cleans up legacy state where it might have been added
  useEffect(() => {
  if (sidebarItems.length === 0) return;

  const filtered = sidebarItems.filter(i => {
  const name = (i.name || '').toLowerCase();
  const id = i.id.toLowerCase();
  // check id (collection name) and display name
  if (id.includes('pkm_settings') || name.includes('pkm settings')) return false;
  return true;
  });

  if (filtered.length !== sidebarItems.length) {
  console.log("Removing pkm_settings from sidebar items");
  setSidebarItems(filtered);
  }
  }, [sidebarItems, setSidebarItems]); // This effectively runs on load and cleans it up

  const handleDragStart = (event: DragStartEvent) => {
  const { active } = event;
  const item = sidebarItems.find(i => i.id === active.id);
  if (item) setActiveDragItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  setActiveDragItem(null);

  if (!over) return;

  // 1. handle sidebar reorder
  // we know it's a sidebar reorder if both active and over are in sidebaritems
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

  // 2. handle drop onto dashboard/canvas
  // we use 'canvas-droppable' id now
  if (activeIsSidebar && (overId === 'dashboard-canvas' || overId === 'canvas-droppable')) {
  const item = sidebarItems.find(i => i.id === activeId);
  if (item) {
 // dispatch event for dashboard to pick up
 const event = new CustomEvent('pkm:add-widget', {
 detail: {
 id: item.id,
 type: item.type,
 name: item.name,
 icon: item.icon,
 iconType: item.iconType
 }
 });
 window.dispatchEvent(event);
  }
  }
  };

  // --- search state (lifted for bottomnav fab) ---
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchContext, setSearchContext] = useState<string | null>(null);

  // --- tab handling with search trigger ---
  // --- tab handling with search trigger ---
  const handleTabChange = (tab: 'databases' | 'home' | 'headmates' | 'board' | 'captures') => {
  if (tab === 'home') navigate('/');
  if (tab === 'captures') navigate('/captures');

  // prism routing
  if (tab === 'home' && isAphrodite) {
  navigate('/canvas/aphrodite-altar');
  return;
  }

  if (tab === 'headmates') navigate('/headmates');
  if (tab === 'board') navigate('/board');
  if (tab === 'databases') {
  localStorage.setItem('pkm:allow_databases_direct', '1');
  navigate('/databases', { state: { fromSidebar: true } });
  }
  setActiveTab(tab);
  if (tab !== 'databases') setSelectedCollection(null);
  };

  // initial route check
  useEffect(() => {
  if (isAphrodite && window.location.pathname === '/') {
  navigate('/canvas/aphrodite-altar', { replace: true });
  }
  }, [isAphrodite, navigate]);

  const handleSelectCollection = (name: string | null) => {
  if (!name || name === 'NEW') {
  setSelectedCollection(null);
  return;
  }

  // handle custom workspaces
  if (name.startsWith('workspace_')) {
  navigate(`/workspace/${name}`);
  setActiveTab('databases');
  setSelectedCollection(name);
  return;
  }

  // handle local documents
  if (name.startsWith('doc_')) {
  const id = name.replace('doc_', '');
  console.log('Navigating to document:', id);
  navigate(`/page/${id}`);
  setActiveTab('databases');
  setSelectedCollection(name);
  return;
  }

  // handle local drawings
  if (name.startsWith('drawing_')) {
  const id = name.replace('drawing_', '');
  navigate(`/drawings/${id}`);
  setActiveTab('databases');
  setSelectedCollection(name);
  return;
  }

  // handle database collections
  setSelectedCollection(name);
  if (name) {
  navigate('/databases/' + encodeURIComponent(name), { state: { fromSidebar: true } });
  setActiveTab('databases');
  } else {
  navigate('/databases', { state: { fromSidebar: true } });
  }
  };

  // listen for custom search event if needed (or just use prop)
  useEffect(() => {
  const handleSearchEvent = (e: any) => {
  setSearchContext(e.detail?.context || null);
  setSearchOpen(true);
  };
  window.addEventListener('pkm:open-search', handleSearchEvent);
  return () => window.removeEventListener('pkm:open-search', handleSearchEvent);
  }, []);

  // also wire up global keyboard shortcut to sync state
  useEffect(() => {
  const down = (e: KeyboardEvent) => {
  if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
 e.preventDefault();
 setSearchOpen(prev => !prev);
  }
  };
  document.addEventListener("keydown", down);
  return () => document.removeEventListener("keydown", down);
  }, []);

  return (
  <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  >
  <ProtocolShift />

  <div
 className="flex flex-col lg:flex-row h-screen w-full bg-background overflow-hidden transition-colors duration-700"
  >

 {/* desktop sidebar */}
 <Navigation
 className="hidden lg:flex"
 activeTab={activeTab as any}
 onTabChange={handleTabChange}
 onSelectCollection={handleSelectCollection}
 selectedCollection={selectedCollection}
 items={sidebarItems}
 setItems={setSidebarItems}
 />

 {/* mobile drawer (swipe controlled) */}
 {/* we use a simple overlay logic or reusing sheet if available, but for swipe gesture: */}
 <MobileSidebarDrawer
 isOpen={sidebarOpen}
 onClose={() => setSidebarOpen(false)}
 onTabChange={handleTabChange}
 onSelectCollection={handleSelectCollection}
 selectedCollection={selectedCollection}
 items={sidebarItems}
 />

 {/* main content area */}
 <main
 className="flex-1 overflow-hidden h-full relative pb-20 lg:pb-0"
 // swipe handler removed
 style={{ touchAction: 'pan-y' }} // Allow vertical scroll but capture horizontal
 >
 <Outlet />
 </main>

 {/* mobile bottom navigation (hidden on desktop) */}
 <BottomNav
 className="lg:hidden"
 activeTab={activeTab as any}
 onTabChange={handleTabChange}
 />

 {/* global command palette (controlled) */}
 <GlobalCommandPalette
 open={searchOpen}
 onOpenChange={setSearchOpen}
 externalContext={searchContext}
 />

 {/* drag overlay */}
 <DragOverlay>
 {activeDragItem ? (
 <div className="bg-card border rounded shadow-lg p-2 flex items-center opacity-80 w-48 pointer-events-none">
   <Folder className="h-4 w-4 mr-2" />
   <span className="truncate text-sm font-medium">{activeDragItem.name}</span>
 </div>
 ) : null}
 </DragOverlay>
  </div>
  {/* identity widget removed */}
  <QuickEditSheet /> {/* global edit panel */}
  </DndContext>
  );
}
