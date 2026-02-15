import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navigation, type NavItem } from '@/components/navigation';
import { BottomNav } from '@/components/bottom-nav';
import { GlobalCommandPalette } from '@/components/global-command-palette';
import { QuickEditSheet } from '@/components/quick-edit-sheet';

// Convert hex color to HSL format for Tailwind
function hexToHSL(hex: string): string {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse hex values
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

    // --- PHASE 5: THE PRISM (Identity & Subdomains) ---
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    const isAphrodite = subdomain === 'aphrodite';

    // Auto-switch Identity based on Subdomain
    useEffect(() => {
        if (isAphrodite && !activeFronters.includes('aphrodite')) {
            // Force front aphrodite if visiting her temple
            // We might need a method to 'force' set fronter without UI toggle if strictly routing
            // For now, we visually override:
        }
    }, [isAphrodite, activeFronters]);

    const isHouseFronting = activeFronters.length > 0;

    // Get the color from the fronting member
    let activeColor = "#f6b012"; // Default color
    if (activeFronters.length > 0) {
        const fronterId = activeFronters[0];
        console.log('Getting color for fronter:', fronterId);
        console.log('Overrides:', overrides[fronterId]);
        console.log('Member from list:', members.find(m => m.id === fronterId));
        // Try to get color from overrides first, then from members data
        activeColor = overrides[fronterId]?.color || members.find(m => m.id === fronterId)?.color || "#f6b012";
        console.log('Final active color:', activeColor);
    } else {
        console.log('No fronters, using default color:', activeColor);
    }

    // PRISM OVERRIDE
    if (isAphrodite) {
        activeColor = "#e0a6b5"; // Seafoam/Rose blend (Rose dominate)
        // Adjust for Aphrodite specific palette
    }

    // --- THE VOID BLUEPRINT: IMMEDIATE JS BRIDGE ---
    useEffect(() => {
        console.log('Theme effect running. Active color:', activeColor);
        const root = document.documentElement;
        if (activeColor) {
            const hslColor = hexToHSL(activeColor);
            console.log('Setting --primary to:', activeColor, '(HSL:', hslColor + ')');
            root.style.setProperty('--primary', hslColor);
            root.style.setProperty('--ring', hslColor);

            // Calculate Soft Color (10% opacity) manually for robustness
            // If hex
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
            // Reset to default Void if not Aphrodite (important for SPA navigation)
            root.style.setProperty('--background', '#060606');
            root.style.removeProperty('--card'); // Allow default fallback
            root.style.removeProperty('--border');
        }

    }, [activeColor, isAphrodite]);

    // --- PHASE 6: AUTOMATED REALTOR (Fronter Homes) ---
    const { client } = useAuth();
    useEffect(() => {
        if (!activeFronters || activeFronters.length === 0) return;

        const checkAndBuildHome = async () => {
            const fronterId = activeFronters[0];
            const homeId = `fronter-home-${fronterId}`;

            // Check if we already checked this session to avoid spam
            if (sessionStorage.getItem(`checked_home_${fronterId}`)) return;
            sessionStorage.setItem(`checked_home_${fronterId}`, 'true');

            try {
                // Try to fetch existing canvas/doc
                // specific collection for canvases? 'pkm_settings' with type 'canvas'?
                // Based on CanvasPage, let's assume we store in 'canvases' or 'docs'.
                // Let's use 'pkm_settings' as it serves as a registry often.

                const res = await client.listRecords('pkm_settings', {
                    filter: { name: homeId }
                });

                if (res.data?.length === 0 && res.data?.data?.length === 0) {
                    console.log("Creating home base for", fronterId);
                    // Create new Home
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

                    // Add to Sidebar? 
                    // We rely on sidebar sync or manual add.
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

    // Swipe to Open Sidebar (Right Swipe on left edge)
    // Swipe to Open Sidebar (Right Swipe on left edge)
    // Swipe to Open Sidebar (Removed per user request)
    // const { activeTool } = useEdgelessStore();
    // const isDrawing = activeTool === 'pen' || activeTool === 'eraser';
    // const bindSwipe = ...

    const navigate = useNavigate();

    // --- Global Drag State (Lifted from Navigation) ---
    // Synced with NocoBase 'pkm_settings' collection
    const [sidebarItems, setSidebarItems] = useAppSetting<NavItem[]>('sidebar_items', []);

    const [activeDragItem, setActiveDragItem] = useState<NavItem | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Filter out pkm_settings from sidebar persisted state
    // This cleans up legacy state where it might have been added
    useEffect(() => {
        if (sidebarItems.length === 0) return;

        const filtered = sidebarItems.filter(i => {
            const name = (i.name || '').toLowerCase();
            const id = i.id.toLowerCase();
            // Check ID (collection name) and display name
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

        // 1. Handle Sidebar Reorder
        // We know it's a sidebar reorder if both active and over are in sidebarItems
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

        // 2. Handle Drop onto Dashboard/Canvas
        // We use 'canvas-droppable' id now
        if (activeIsSidebar && (overId === 'dashboard-canvas' || overId === 'canvas-droppable')) {
            const item = sidebarItems.find(i => i.id === activeId);
            if (item) {
                // Dispatch event for Dashboard to pick up
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

    // --- Search State (Lifted for BottomNav FAB) ---
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchContext, setSearchContext] = useState<string | null>(null);

    // --- Tab Handling with Search Trigger ---
    // --- Tab Handling with Search Trigger ---
    const handleTabChange = (tab: 'databases' | 'home' | 'headmates' | 'board' | 'captures') => {
        if (tab === 'home') navigate('/');
        if (tab === 'captures') navigate('/captures');

        // PRISM ROUTING
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

    // Initial Route check
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

        // Handle custom workspaces
        if (name.startsWith('workspace_')) {
            navigate(`/workspace/${name}`);
            setActiveTab('databases');
            setSelectedCollection(name);
            return;
        }

        // Handle local documents
        if (name.startsWith('doc_')) {
            const id = name.replace('doc_', '');
            console.log('Navigating to document:', id);
            navigate(`/page/${id}`);
            setActiveTab('databases');
            setSelectedCollection(name);
            return;
        }

        // Handle local drawings
        if (name.startsWith('drawing_')) {
            const id = name.replace('drawing_', '');
            navigate(`/drawings/${id}`);
            setActiveTab('databases');
            setSelectedCollection(name);
            return;
        }

        // Handle database collections
        setSelectedCollection(name);
        if (name) {
            navigate('/databases/' + encodeURIComponent(name), { state: { fromSidebar: true } });
            setActiveTab('databases');
        } else {
            navigate('/databases', { state: { fromSidebar: true } });
        }
    };

    // Listen for custom search event if needed (or just use prop)
    useEffect(() => {
        const handleSearchEvent = (e: any) => {
            setSearchContext(e.detail?.context || null);
            setSearchOpen(true);
        };
        window.addEventListener('pkm:open-search', handleSearchEvent);
        return () => window.removeEventListener('pkm:open-search', handleSearchEvent);
    }, []);

    // Also wire up global keyboard shortcut to sync state
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

                {/* Desktop Sidebar */}
                <Navigation
                    className="hidden lg:flex"
                    activeTab={activeTab as any}
                    onTabChange={handleTabChange}
                    onSelectCollection={handleSelectCollection}
                    selectedCollection={selectedCollection}
                    items={sidebarItems}
                    setItems={setSidebarItems}
                />

                {/* Mobile Drawer (Swipe Controlled) */}
                {/* We use a simple overlay logic or reusing Sheet if available, but for swipe gesture: */}
                <MobileSidebarDrawer
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onTabChange={handleTabChange}
                    onSelectCollection={handleSelectCollection}
                    selectedCollection={selectedCollection}
                    items={sidebarItems}
                />

                {/* Main Content Area */}
                <main
                    className="flex-1 overflow-hidden h-full relative pb-20 lg:pb-0"
                    // Swipe handler removed
                    style={{ touchAction: 'pan-y' }} // Allow vertical scroll but capture horizontal
                >
                    <Outlet />
                </main>

                {/* Mobile Bottom Navigation (Hidden on Desktop) */}
                <BottomNav
                    className="lg:hidden"
                    activeTab={activeTab as any}
                    onTabChange={handleTabChange}
                />

                {/* Global Command Palette (Controlled) */}
                <GlobalCommandPalette
                    open={searchOpen}
                    onOpenChange={setSearchOpen}
                    externalContext={searchContext}
                />

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeDragItem ? (
                        <div className="bg-card border rounded shadow-lg p-2 flex items-center opacity-80 w-48 pointer-events-none">
                            <Folder className="h-4 w-4 mr-2" />
                            <span className="truncate text-sm font-medium">{activeDragItem.name}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
            {/* Identity Widget Removed */}
            <QuickEditSheet /> {/* Global Edit Panel */}
        </DndContext>
    );
}
