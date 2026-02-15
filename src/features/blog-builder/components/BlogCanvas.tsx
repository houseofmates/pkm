import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useBlogBuilder } from './BlogContext';
import { useInView } from 'react-intersection-observer';
import { FormRenderer, type FormElementData } from '@/features/houseofmates-builder/components/FormRenderer';
import { DatabaseViewElement } from '@/features/houseofmates-builder/components/DatabaseViewElement';
import {
    ServerIPDisplay,
    ServerStatus,
    FeatureCard,
    StaffCard,
    RulesList,
    FAQSection,
    VersionBadge,
    HeroSection,
    SocialLinks,
    CountdownTimer,
    AboutSection,
    Gallery,
    Testimonial,
    Divider,
    PDFElement,
    CodeElement,
    FileElement,
    MinecraftStatsWidget,
    LinkCard,
    StatusIndicator,
} from '@/features/houseofmates-builder/components/WebsiteElements';
import { RichTextEditor } from '@/features/houseofmates-builder/components/RichTextEditor';
import { WidgetPropertyEditor } from '@/features/houseofmates-builder/components/WidgetPropertyEditor';

export function BlogCanvas() {
    const {
        page,
        isAdmin,
        selectedElementIds,
        setSelectedElementIds,
        updateElement,
        updateElements,
        deleteElements,
        handleElementContextMenu,
        handleGlobalContextMenu,
        previewMode,
        selectionBox,
        setSelectionBox
    } = useBlogBuilder();

    // Global Key Listener for Delete
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const target = e.target as HTMLElement;
                const isTyping = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable;

                if (!isTyping && selectedElementIds.length > 0 && isAdmin) {
                    deleteElements(selectedElementIds);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedElementIds, isAdmin, deleteElements]);

    // Global 'Click Outside' for robust deselection
    useEffect(() => {
        if (selectedElementIds.length === 0) return;

        const handleGlobalMousedown = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Checks
            const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
            const isClickingElement = target.closest('[data-element-id]');
            const isClickingHandle = target.classList.contains('resize-handle') || !!target.dataset.handle;
            const isClickingBubbleMenu = target.closest('.BubbleMenu');
            const isClickingModal = target.closest('.widget-property-editor') || target.closest('.builder-context-menu') || target.closest('.builder-toolbox');

            if (!isModifier && !isClickingElement && !isClickingHandle && !isClickingBubbleMenu && !isClickingModal) {
                // console.log('[BlogCanvas] Global Deselection Triggered (No Modifier)');
                setSelectedElementIds([]);
            }
        };

        document.addEventListener('mousedown', handleGlobalMousedown, true); // Capture phase
        return () => document.removeEventListener('mousedown', handleGlobalMousedown, true);
    }, [selectedElementIds, setSelectedElementIds]);

    // Marquee Selection Logic: Move / End
    useEffect(() => {
        if (!selectionBox || !isAdmin) return;

        const handleMouseMove = (e: MouseEvent) => {
            const canvas = document.getElementById('canvas-content');
            if (!canvas) return;
            const rect = canvas.getBoundingClientRect();

            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;

            setSelectionBox({
                ...selectionBox,
                currentX,
                currentY
            });
        };

        const handleMouseUp = (e: MouseEvent) => {
            // Calculate final intersection
            const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
            const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
            const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
            const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

            // Important: Threshold for "accidental" marquee vs click
            const dist = Math.hypot(selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY);

            if (dist > 5) {
                const intersectIds: string[] = [];
                (page?.elements || []).forEach((el: any) => {
                    const elLayout = (previewMode === 'mobile' ? el.mobile : previewMode === 'tablet' ? el.tablet : null) || {
                        x: el.x,
                        y: el.y,
                        width: el.width,
                        height: el.height
                    };

                    const ex1 = elLayout.x;
                    const ey1 = elLayout.y;
                    const ex2 = elLayout.x + (elLayout.width || 0);
                    const ey2 = elLayout.y + (elLayout.height || 0);

                    // Standard intersection check
                    const overlap = !(x1 > ex2 || x2 < ex1 || y1 > ey2 || y2 < ey1);
                    if (overlap) intersectIds.push(el.id);
                });

                const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
                if (isModifier) {
                    setSelectedElementIds([...new Set([...selectedElementIds, ...intersectIds])]);
                } else {
                    setSelectedElementIds(intersectIds);
                }
            }

            setSelectionBox(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [selectionBox, isAdmin, page, previewMode, setSelectionBox, setSelectedElementIds, selectedElementIds]);

    if (!page) return null;

    // Responsive Canvas Styling
    const isDesktop = previewMode === 'desktop';
    const canvasStyle: React.CSSProperties = {
        background: page.background || 'transparent', // Blog posts might not cover full bg
        height: isDesktop ? (page.height ? `${page.height}px` : 'auto') : '100%',
        minHeight: isDesktop ? '100vh' : '100%',
    };

    // Ensure mobile/tablet matches the wrapper if no overflow
    if (!isDesktop) {
        const baseHeight = previewMode === 'mobile' ? 932 : 1112;
        canvasStyle.minHeight = `${Math.max(page.height || 0, baseHeight)}px`;
    }

    return (
        <div
            id="builder-canvas"
            data-canvas-background="true"
            className={`w-full ${isDesktop ? 'min-h-screen' : 'h-full'} canvas-background overflow-y-auto overflow-x-hidden relative custom-scrollbar`}
            style={{ ...canvasStyle, userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' }}
            onContextMenu={handleGlobalContextMenu}
            onMouseDown={(e) => {
                const target = e.target as HTMLElement;

                // 1. Ignore clicks on known UI components
                if (target.closest('.builder-toolbox') ||
                    target.closest('.builder-context-menu') ||
                    target.closest('.widget-property-editor') ||
                    target.closest('.global-context-menu')) {
                    return;
                }

                // 2. Ignore clicks on actual elements (they handle their own selection)
                if (target.closest('[data-element-id]')) {
                    return;
                }

                const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;

                // 3. Background click -> Handle Marquee Selection
                if (isAdmin) {
                    const canvas = document.getElementById('canvas-content');
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();

                    const sX = e.clientX - rect.left;
                    const sY = e.clientY - rect.top;

                    // Clear previous selection if no modifier
                    if (!isModifier) setSelectedElementIds([]);

                    setSelectionBox({
                        startX: sX,
                        startY: sY,
                        currentX: sX,
                        currentY: sY
                    });
                }
            }}
        >
            <div
                id="canvas-content"
                className={`${isDesktop ? 'mx-auto' : ''} relative h-full`}
                style={{
                    width: '100%',
                    minWidth: '100%',
                    maxWidth: '100%'
                }}
            >
                {/* The Selection Box Visual */}
                {selectionBox && (
                    <div
                        className="absolute border border-[var(--primary)] bg-[var(--primary)]/10 z-[10000] pointer-events-none"
                        style={{
                            left: Math.min(selectionBox.startX, selectionBox.currentX),
                            top: Math.min(selectionBox.startY, selectionBox.currentY),
                            width: Math.abs(selectionBox.currentX - selectionBox.startX),
                            height: Math.abs(selectionBox.currentY - selectionBox.startY)
                        }}
                    />
                )}


                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '1px',
                        height: page.height ? `${page.height}px` : '100%',
                        pointerEvents: 'none',
                        zIndex: -1
                    }}
                />
                <PageSoundEffect
                    enabled={page?.enable_sounds}
                    customEnterUrl={page?.custom_pop_sound}
                    customExitUrl={page?.custom_exit_sound}
                />
                {(page?.elements || []).map((element: any) => (
                    <ElementRenderer
                        key={element.id}
                        element={element}
                        isSelected={isAdmin && selectedElementIds.includes(element.id)}
                        isAdmin={isAdmin}
                        onSelect={(multi) => {
                            if (multi) {
                                if (selectedElementIds.includes(element.id)) {
                                    setSelectedElementIds(selectedElementIds.filter((id: string) => id !== element.id));
                                } else {
                                    setSelectedElementIds([...selectedElementIds, element.id]);
                                }
                            } else {
                                setSelectedElementIds([element.id]);
                            }
                        }}
                        onUpdate={(updates) => updateElement(element.id, updates)}
                        onUpdateBatch={(batch) => updateElements(batch)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (handleElementContextMenu) handleElementContextMenu(e, element.id);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

interface ElementRendererProps {
    element: any;
    isSelected: boolean;
    isAdmin: boolean;
    onSelect: (multi?: boolean) => void;
    onUpdate: (_updates: any) => void;
    onUpdateBatch: (batch: { id: string; updates: any }[]) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

function ElementRenderer({ element, isSelected, isAdmin, onSelect, onUpdate, onUpdateBatch, onContextMenu }: ElementRendererProps) {
    const { page, previewMode, viewWidth } = useBlogBuilder();

    // Calculate scale factor for mobile/tablet responsive layout
    const designWidth = previewMode === 'mobile' ? 430 : previewMode === 'tablet' ? 834 : viewWidth;

    // In Admin mode (builder), we keep 1:1 scale for precise editing inside the frame.
    // In Public mode (preview), we scale to fit the actual device width.
    const scaleFactor = isAdmin ? 1 : (viewWidth / designWidth);

    // Determine active layout with robust fallbacks per field
    const deviceLayout = previewMode === 'mobile' ? element.mobile : previewMode === 'tablet' ? element.tablet : null;

    const posX = deviceLayout?.x ?? element.x ?? 0;
    const posY = deviceLayout?.y ?? element.y ?? 0;
    const posW = deviceLayout?.width ?? element.width ?? 200;
    const posH = deviceLayout?.height ?? element.height ?? 100;
    const fontSize = deviceLayout?.fontSize ?? element.styles?.fontSize;

    // Scroll-triggered animation
    const { ref: inViewRef } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });
    const elementRef = useRef<HTMLDivElement | null>(null);

    // Merge refs
    const setRefs = (node: HTMLDivElement | null) => {
        elementRef.current = node;
        inViewRef(node);
    };

    // Drag state
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSnapping, setIsSnapping] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<string | null>(null); // n, s, e, w, ne, nw, se, sw
    const dragStart = useRef<{
        x: number;
        y: number;
        targets: { id: string; initialX: number; initialY: number; dom: HTMLElement | null }[]
    } | null>(null);
    const resizeStart = useRef<{ x: number; y: number; elW: number; elH: number; elX: number; elY: number; baseFontSize: number } | null>(null);

    // Handle drag
    useEffect(() => {
        if (!isDragging || !dragStart.current) return;

        const { x: startX, y: startY, targets } = dragStart.current;

        // Tracks for commit
        let finalDelta = { x: 0, y: 0 };
        let snapMode: 'none' | 'grid' | 'cluster' = 'none';
        let lastMouseEvent: MouseEvent | null = null;

        const updatePosition = (e: MouseEvent) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let moveX = dx;
            let moveY = dy;

            if (snapMode !== 'none') {
                // Simplified snapping logic for blog... or keeps full logic?
                // Keeping logic for consistence
                const GRID_SIZE = 20;
                const primary = targets[0];

                if (snapMode === 'grid') {
                    const snappedX = Math.round((primary.initialX + dx) / GRID_SIZE) * GRID_SIZE;
                    const snappedY = Math.round((primary.initialY + dy) / GRID_SIZE) * GRID_SIZE;
                    moveX = snappedX - primary.initialX;
                    moveY = snappedY - primary.initialY;
                }
            }

            finalDelta = { x: Math.round(moveX), y: Math.round(moveY) };

            targets.forEach(target => {
                const el = target.dom || document.querySelector(`[data-element-id="${target.id}"]`) as HTMLElement;
                if (el) {
                    const currentX = target.initialX + finalDelta.x;
                    const currentY = target.initialY + finalDelta.y;
                    el.style.left = `${currentX}px`;
                    el.style.top = `${currentY}px`;
                }
            });
        };

        const handleMouseMove = (e: MouseEvent) => {
            lastMouseEvent = e;
            updatePosition(e);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'g') {
                snapMode = 'grid';
                setIsSnapping(true);
                if (lastMouseEvent) updatePosition(lastMouseEvent);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'g') {
                snapMode = 'none';
                setIsSnapping(false);
                if (lastMouseEvent) updatePosition(lastMouseEvent);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragStart.current = null;

            // Commit all to React
            const batch = targets.map(t => ({
                id: t.id,
                updates: { x: t.initialX + finalDelta.x, y: t.initialY + finalDelta.y }
            }));
            onUpdateBatch(batch);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isDragging, onUpdateBatch, page, isSnapping]);

    // Handle resize
    useEffect(() => {
        if (!isResizing || !resizeHandle) return;

        const startX = resizeStart.current?.x || 0;
        const startY = resizeStart.current?.y || 0;
        const elW = resizeStart.current?.elW || 0;
        const elH = resizeStart.current?.elH || 0;
        const elX = resizeStart.current?.elX || 0;
        const elY = resizeStart.current?.elY || 0;
        const baseFontSize = resizeStart.current?.baseFontSize || 24;

        // Track final state for commit
        const pendingUpdate: any = {};

        const handleMouseMove = (e: MouseEvent) => {
            if (!elementRef.current) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newWidth = elW;
            let newHeight = elH;
            let newX = elX;
            let newY = elY;
            let newFontSize = baseFontSize;

            // Calculate new dimensions based on direction
            if (resizeHandle.includes('e')) newWidth = Math.max(50, elW + dx);
            if (resizeHandle.includes('w')) {
                newWidth = Math.max(50, elW - dx);
                newX = elX + dx;
            }
            if (resizeHandle.includes('s')) newHeight = Math.max(20, elH + dy);
            if (resizeHandle.includes('n')) {
                newHeight = Math.max(20, elH - dy);
                newY = elY + dy;
            }

            // SCALING LOGIC (Text, Buttons, Version Badges)
            const scalableTypes = ['text', 'button', 'version', 'versionbadge', 'serverip', 'serverstatus'];
            if (scalableTypes.includes(element.type)) {
                const isCorner = ['ne', 'nw', 'se', 'sw'].includes(resizeHandle);
                if (isCorner) {
                    // CORNER = SCALE (Uniform)
                    const ratio = newHeight / elH;
                    newFontSize = Math.max(8, Math.round(baseFontSize * ratio));
                    newWidth = Math.max(50, Math.round(elW * ratio));

                    if (resizeHandle.includes('w')) newX = elX + (elW - newWidth);
                    if (resizeHandle.includes('n')) newY = elY + (elH - newHeight);

                    // Update Font Size Visually
                    elementRef.current.style.fontSize = `${newFontSize}px`;
                    pendingUpdate.styles = { ...element.styles, fontSize: newFontSize };
                }
            }

            // DOM Updates
            elementRef.current.style.width = `${newWidth}px`;
            elementRef.current.style.height = `${newHeight}px`;
            elementRef.current.style.left = `${newX}px`;
            elementRef.current.style.top = `${newY}px`;

            // Store for commit
            pendingUpdate.width = newWidth;
            pendingUpdate.height = newHeight;
            if (newX !== elX) pendingUpdate.x = newX;
            if (newY !== elY) pendingUpdate.y = newY;
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeHandle(null);
            resizeStart.current = null;

            // Commit final state
            if (Object.keys(pendingUpdate).length > 0) {
                onUpdate(pendingUpdate);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeHandle, onUpdate, element.type, element.styles]);

    const { selectedElementIds: globalSelectedIds } = useBlogBuilder();

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!isAdmin) return;
        e.stopPropagation();

        const isShift = e.shiftKey || e.ctrlKey || e.metaKey;
        const target = e.target as HTMLElement;
        const handle = target.dataset.handle;

        if (handle) {
            setIsResizing(true);
            setResizeHandle(handle);
            resizeStart.current = {
                x: e.clientX,
                y: e.clientY,
                elW: posW,
                elH: posH,
                elX: posX,
                elY: posY,
                baseFontSize: fontSize || 24
            };
        } else if (!isEditing) {
            // Only Drag if NOT editing text
            setIsDragging(true);

            let currentSelection = globalSelectedIds;

            if (isShift) {
                // Toggle selection
                if (isSelected) {
                    currentSelection = globalSelectedIds.filter((id: string) => id !== element.id);
                } else {
                    currentSelection = [...globalSelectedIds, element.id];
                }
                onSelect(true); // multi mode
            } else {
                // Single select mode
                if (!isSelected) {
                    currentSelection = [element.id];
                    onSelect(false); // single mode
                }
                // If already selected, we keep currentSelection to allow dragging group
            }

            const elements = page?.elements || [];
            const targets = (elements || [])
                .filter((el: any) => currentSelection.includes(el.id))
                .map((el: any) => {
                    const elLayout = (previewMode === 'mobile' ? el.mobile : previewMode === 'tablet' ? el.tablet : null) || {
                        x: el.x,
                        y: el.y,
                        width: el.width,
                        height: el.height
                    };
                    return {
                        id: el.id,
                        initialX: elLayout.x,
                        initialY: elLayout.y,
                        dom: document.querySelector(`[data-element-id="${el.id}"]`) as HTMLElement
                    };
                });

            dragStart.current = {
                x: e.clientX,
                y: e.clientY,
                targets: targets.length > 0 ? targets : [{ id: element.id, initialX: posX, initialY: posY, dom: elementRef.current }]
            };
        }
    };

    const handleDoubleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isAdmin) {
            setIsEditing(true);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (isAdmin) {
            return; // handleMouseDown handles election
        }

        // Public Mode Interactions
        const action = element.clickAction || (element.link ? 'link' : 'none');

        if (action === 'link' && element.link) {
            if (element.link.startsWith('http')) {
                window.open(element.link, '_blank');
            } else {
                window.location.href = element.link;
            }
        } else if (action === 'copy') {
            let textToCopy = element.copyContent;

            if (!textToCopy) {
                if (element.type === 'text') {
                    const temp = document.createElement('div');
                    temp.innerHTML = element.content?.html || '';
                    textToCopy = temp.textContent || temp.innerText || '';
                } else if (element.type === 'button') {
                    textToCopy = element.content?.text;
                } else if (element.link) {
                    textToCopy = element.link;
                } else if (element.content?.url) {
                    textToCopy = element.content.url;
                }
            }

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy);
                toast.success('copied to clipboard!', {
                    icon: '📋',
                    style: { backgroundColor: '#050505', color: 'var(--primary)', border: '1px solid rgba(255,255,255,0.1)' }
                });
            }
        }
    };

    useEffect(() => {
        if (!isEditing) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest(`[data-element-id="${element.id}"]`)) {
                setIsEditing(false);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, [isEditing, element.id]);

    const getPx = (val: any, defaultVal: number = 0, skipScale: boolean = false) => {
        if (val === null || val === undefined) return `${defaultVal * (skipScale ? 1 : scaleFactor)}px`;
        const num = parseFloat(String(val).replace('px', ''));
        const scaledNum = isNaN(num) ? defaultVal : num;
        return `${scaledNum * (skipScale ? 1 : scaleFactor)}px`;
    };

    const hexToRgba = (hex: string, alpha: number) => {
        let r = 0, g = 0, b = 0;
        // Handle hex shorthand
        if (hex.length === 4) {
            r = parseInt("0x" + hex[1] + hex[1]);
            g = parseInt("0x" + hex[2] + hex[2]);
            b = parseInt("0x" + hex[3] + hex[3]);
        } else if (hex.length === 7) {
            r = parseInt("0x" + hex[1] + hex[2]);
            g = parseInt("0x" + hex[3] + hex[4]);
            b = parseInt("0x" + hex[5] + hex[6]);
        }
        return `rgba(${r},${g},${b},${alpha})`;
    };

    // Check if element is hidden in current view mode
    const isHiddenInCurrentView = element.visibility && element.visibility[previewMode] === false;

    const baseStyles = {
        position: 'absolute' as const,
        left: getPx(posX, 0),
        top: getPx(posY, 0),
        width: getPx(posW, 200),
        height: getPx(posH, 100),
        borderRadius: (element.type === 'versionbadge' ? 9999 : (element.styles?.borderRadius || (['minecraft_stats', 'serverstatus', 'featurecard', 'staffcard', 'testimonial', 'serverip'].includes(element.type) ? 16 : 0))) * scaleFactor,
        backgroundColor: element.type === 'text'
            ? (element.styles?.backgroundColor || 'transparent')
            : hexToRgba(element.styles?.backgroundColor || '#0b0015', element.styles?.opacity ?? 0.5),
        border: element.styles?.borderWidth
            ? `${element.styles.borderWidth * scaleFactor}px solid ${element.styles.borderColor || 'var(--primary)'}`
            : 'none',
        boxShadow: element.styles?.boxShadow || 'none',
        backgroundClip: 'padding-box',
        isolation: 'isolate' as const,
        WebkitTransform: 'translateZ(0)', // Force GPU rendering for sharper corners
        overflow: ['text', 'serverstatus', 'minecraft_stats', 'rules', 'faq', 'staffcard', 'featurecard', 'testimonial'].includes(element.type) ? 'visible' : 'hidden',
        fontSize: ['text', 'button', 'version', 'versionbadge', 'serverip', 'serverstatus', 'featurecard', 'staffcard', 'rules', 'faq', 'testimonial', 'countdown'].includes(element.type)
            ? (deviceLayout?.fontSize ? `${deviceLayout.fontSize * scaleFactor}px` : (element.content?.fontSize ? `${parseFloat(element.content.fontSize) * scaleFactor}px` : (element.styles?.fontSize ? getPx(element.styles.fontSize, 16) : `${16 * scaleFactor}px`)))
            : undefined,
        cursor: (element.link || element.clickAction === 'copy') && !isAdmin ? 'pointer' : isAdmin && !isEditing ? 'move' : 'default',
        fontFamily: "'Varela Round', sans-serif",
        zIndex: isSelected ? 9999 : (element.zIndex || 1),
        pointerEvents: (isAdmin || element.link || element.clickAction === 'copy' || ['button', 'form', 'minecraft_stats', 'social', 'gallery', 'linkcard', 'serverip', 'serverstatus'].includes(element.type)) ? 'auto' as const : 'none' as const,
        outline: isSelected ? '1.5px solid var(--primary)' : 'none',
        opacity: (!isAdmin && isHiddenInCurrentView) ? 0 : (isAdmin && isHiddenInCurrentView) ? 0.3 : 1,
        display: (!isAdmin && isHiddenInCurrentView) ? 'none' : undefined,
    };

    const renderContent = () => {
        switch (element.type) {
            case 'text':
                return (
                    <div className="w-full h-full normal-case">
                        <RichTextEditor
                            content={element.content.html || ''}
                            onChange={(html) => onUpdate({ content: { ...element.content, html } })}
                            editable={isAdmin && isEditing}
                            className="w-full h-full cursor-text"
                        />
                    </div>
                );
            case 'pdf_viewer':
                return <PDFElement url={element.content?.url} title={element.content?.title} />;
            case 'code_block':
                return <CodeElement code={element.content?.code} language={element.content?.language} />;
            case 'file_download':
                return <FileElement url={element.content?.url} filename={element.content?.fileName} size={element.content?.fileSize} />;
            case 'image':
                return <img src={element.content?.url} alt={element.content?.alt} className="w-full h-full object-cover rounded-xl pointer-events-none" />;
            case 'button':
                return (
                    <button className="w-full h-full flex items-center justify-center font-bold transition-transform active:scale-95 leading-none" style={{
                        backgroundColor: element.content?.bgColor || 'var(--primary)',
                        color: element.content?.textColor || '#000',
                        borderRadius: element.styles?.borderRadius || 8,
                        fontSize: 'inherit',
                    }}>
                        {element.content?.text || 'button'}
                    </button>
                );
            case 'video':
                return (
                    <video
                        src={element.content?.url}
                        className="w-full h-full object-cover rounded-xl"
                        autoPlay={element.content?.autoplay}
                        loop={element.content?.loop}
                        muted={element.content?.muted}
                        controls={element.content?.controls}
                    />
                );
            case 'embed':
                return <iframe src={element.content?.url} className="w-full h-full border-0 rounded-xl" allowFullScreen />;
            case 'shape':
                return <div className="w-full h-full" style={{ backgroundColor: element.content?.fill || '#ffffff' }} />;
            case 'form':
                return <FormRenderer element={element as FormElementData} isAdmin={isAdmin} />;
            case 'hero':
                return (
                    <HeroSection
                        title={element.content?.title}
                        subtitle={element.content?.subtitle}
                        ctaText={element.content?.ctaText}
                        ctaLink={element.content?.ctaLink}
                        backgroundImage={element.content?.backgroundImage}
                        showServerIP={element.content?.showServerIP}
                        javaIP={element.content?.javaIP}
                    />
                );
            case 'about':
                return (
                    <div className="normal-case w-full h-full">
                        <AboutSection
                            title={element.content?.title}
                            content={element.content?.content}
                            image={element.content?.image}
                            imagePosition={element.content?.imagePosition}
                        />
                    </div>
                );
            case 'social':
                return (
                    <SocialLinks
                        discord={element.content?.discord}
                        twitter={element.content?.twitter}
                        youtube={element.content?.youtube}
                        twitch={element.content?.twitch}
                        github={element.content?.github}
                        instagram={element.content?.instagram}
                        tiktok={element.content?.tiktok}
                    />
                );
            case 'faq':
                return (
                    <div className="normal-case w-full h-full">
                        <FAQSection items={element.content?.items || []} title={element.content?.title} />
                    </div>
                );
            case 'testimonial':
                return (
                    <div className="normal-case w-full h-full">
                        <Testimonial quote={element.content?.quote} author={element.content?.author} role={element.content?.role} avatar={element.content?.avatar} />
                    </div>
                );
            case 'gallery':
                return <Gallery images={element.content?.images || []} columns={element.content?.columns} />;
            case 'countdown':
                return <CountdownTimer targetDate={element.content?.targetDate} title={element.content?.title} />;
            case 'divider':
                return <Divider style={element.content?.style} spacing={element.content?.spacing} />;
            case 'serverip':
                return (
                    <ServerIPDisplay
                        javaIP={element.content?.javaIP}
                        javaPort={element.content?.javaPort}
                        bedrockIP={element.content?.bedrockIP}
                        bedrockPort={element.content?.bedrockPort}
                        showBedrock={element.content?.showBedrock}
                    />
                );
            case 'serverstatus':
                return (
                    <ServerStatus
                        isOnline={element.content?.isOnline}
                        playerCount={element.content?.playerCount}
                        maxPlayers={element.content?.maxPlayers}
                        motd={element.content?.motd}
                    />
                );
            case 'featurecard':
                return <FeatureCard icon={element.content?.icon} title={element.content?.title} description={element.content?.description} color={element.content?.color} />;
            case 'staffcard':
                return <StaffCard username={element.content?.username} role={element.content?.role} avatar={element.content?.avatar} color={element.content?.color} />;
            case 'rules':
                return <RulesList rules={element.content?.rules || []} title={element.content?.title} />;
            case 'versionbadge':
                return <VersionBadge versions={element.content?.versions || []} />;
            case 'minecraft_stats':
                return <MinecraftStatsWidget />;
            case 'database_view':
                return (
                    <DatabaseViewElement
                        collectionName={element.content?.collectionName || ''}
                        viewType={element.content?.viewType || 'table'}
                        width={posW}
                        height={posH}
                        sort={element.content?.sort}
                        filter={element.content?.filter}
                        visibleFields={element.content?.visibleFields}
                    />
                );
            case 'linkcard':
                return <LinkCard title={element.content?.title} url={element.content?.url} icon={element.content?.icon || 'link-2'} description={element.content?.description} color={element.content?.color} />;
            case 'statusindicator':
                return <StatusIndicator label={element.content?.label} status={element.content?.status || 'online'} showLabel={element.content?.showLabel !== false} />;
            default:
                return <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50">unknown: {element.type}</div>;
        }
    };

    return (
        <>
            {isEditing && element.type !== 'text' && element.type !== 'form' && isAdmin && (
                <WidgetPropertyEditor
                    element={element}
                    onUpdate={onUpdate}
                    onClose={() => setIsEditing(false)}
                />
            )}

            <div
                ref={setRefs}
                data-element-id={element.id}
                style={baseStyles}
                className={`
                    group ${isAdmin ? 'hover:outline hover:outline-[1px] hover:outline-dashed hover:outline-[var(--primary)]/50' : ''} 
                    ${isSelected ? `${element.type === 'versionbadge' ? 'rounded-full' : ''} ${element.type !== 'text' && previewMode === 'desktop' ? 'shadow-2xl' : ''} z-[100]` : ''}
                `}
                onMouseDown={handleMouseDown}
                onDoubleClick={handleDoubleClick}
                onClick={handleClick}
                onContextMenu={onContextMenu}
            >
                {isAdmin && isSelected && (
                    <>
                        <div className="absolute -top-6 left-0 bg-[var(--primary)] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-t-lg lowercase flex items-center gap-2">
                            {element.type}
                            <div className="flex gap-1">
                                <span className="opacity-40">x:{Math.round(posX)}</span>
                                <span className="opacity-40">y:{Math.round(posY)}</span>
                            </div>
                        </div>

                        {/* Resize Handles */}
                        <div data-handle="n" className="resize-handle absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-[var(--primary)] rounded cursor-ns-resize z-50" />
                        <div data-handle="s" className="resize-handle absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-2 bg-[var(--primary)] rounded cursor-ns-resize z-50" />
                        <div data-handle="e" className="resize-handle absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-4 bg-[var(--primary)] rounded cursor-ew-resize z-50" />
                        <div data-handle="w" className="resize-handle absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-4 bg-[var(--primary)] rounded cursor-ew-resize z-50" />

                        <div data-handle="nw" className="resize-handle absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-[var(--primary)] rounded-full cursor-nwse-resize z-50" />
                        <div data-handle="ne" className="resize-handle absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-[var(--primary)] rounded-full cursor-nesw-resize z-50" />
                        <div data-handle="sw" className="resize-handle absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-[var(--primary)] rounded-full cursor-nesw-resize z-50" />
                        <div data-handle="se" className="resize-handle absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-[var(--primary)] rounded-full cursor-nwse-resize z-50" />
                    </>
                )}

                {/* Content Wrapper - Pointer Shield to allow dragging from anywhere */}
                <div className={`w-full h-full ${isAdmin && !isEditing ? 'pointer-events-none' : 'pointer-events-auto'}`}>
                    {renderContent()}
                </div>
            </div>
        </>
    );
}

function PageSoundEffect({ enabled, customEnterUrl, customExitUrl }: { enabled?: boolean; customEnterUrl?: string; customExitUrl?: string }) {
    useEffect(() => {
        if (!enabled) return;

        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const playSynth = (freq: number) => {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(freq / 2, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        };

        const playCustom = async (type: 'enter' | 'exit') => {
            const url = type === 'enter' ? customEnterUrl : customExitUrl;
            if (!url) return false;

            try {
                const audio = new Audio(url);
                audio.volume = 0.2;
                await audio.play();
                return true;
            } catch (e) {
                console.error(`Failed to play custom ${type} sound:`, e);
                return false;
            }
        };

        const play = async (type: 'enter' | 'exit') => {
            const playedCustom = await playCustom(type);
            if (!playedCustom) {
                playSynth(type === 'enter' ? 600 : 400);
            }
        };

        play('enter');

        return () => {
            if (customExitUrl) {
                const audio = new Audio(customExitUrl);
                audio.volume = 0.2;
                audio.play().catch(() => playSynth(400));
            } else {
                playSynth(400);
            }
        };
    }, [enabled, customEnterUrl, customExitUrl]);

    return null;
}
