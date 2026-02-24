import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useBuilder } from '../HouseofmatesBuilder';
import { useInView } from 'react-intersection-observer';
import { FormRenderer, FormBuilder, type FormElementData } from './FormRenderer';
import { Settings2 } from 'lucide-react';
import { DatabaseViewElement } from './DatabaseViewElement';
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
  Testimonial, SlickButton,
  Divider,
  MinecraftStatsWidget,
  LinkCard,
  StatusIndicator,
  FinancialChartElement,
  TierListElement,
  ShoppingCardElement,
  FloatingReminderElement,
  StatsBarElement,
  EternalFlameElement,
  GoldPileElement,
  SleepRingElement
} from './WebsiteElements';
import { RichTextEditor } from './RichTextEditor';
import { WidgetPropertyEditor } from './WidgetPropertyEditor';

export function PageRenderer() {
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
    setSelectionBox,
    addElement
  } = useBuilder();

  // global key listener for delete and hotkeys
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.ProseMirror');

      if (isTyping) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementIds.length > 0 && isAdmin) {
          deleteElements(selectedElementIds);
        }
        return;
      }

      // canvas hotkeys
      if (isAdmin) {
        const key = e.key.toLowerCase();
        if (key === 's') {
          setSelectedElementIds([]);
          toast.success('selection tool active', { duration: 1000, icon: '🔍' });
        } else if (key === 't') {
          // calculate center of current viewport
          const canvasContent = document.getElementById('canvas-content');
          const scrollContainer = document.getElementById('builder-canvas');

          if (canvasContent && scrollContainer) {
            const rect = canvasContent.getBoundingClientRect();
            const viewHeight = window.innerHeight;
            const viewWidth = window.innerWidth;

            // center in viewport relative to canvas-content
            const centerX = (viewWidth / 2) - rect.left;
            const centerY = scrollContainer.scrollTop + (viewHeight / 2) - 60; // 60 for header adjustment

            addElement({
              type: 'text',
              content: { html: '<p>new text box</p>' },
              x: Math.round(centerX),
              y: Math.round(centerY),
              width: 300,
              height: 60,
              zIndex: 1,
              styles: {
                fontSize: 32,
                fontFamily: "'Varela Round', sans-serif"
              }
            });
            toast.success('added text element', { duration: 1000, icon: '✏️' });
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedElementIds, isAdmin, deleteElements, setSelectedElementIds, addElement]);

  // global 'click outside' for robust deselection
  useEffect(() => {
    if (selectedElementIds.length === 0) return;

    const handleGlobalMousedown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // checks
      const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;
      const isClickingElement = target.closest('[data-element-id]');
      const isClickingHandle = target.classList.contains('resize-handle') || !!target.dataset.handle;
      const isClickingBubbleMenu = target.closest('.BubbleMenu');
      const isClickingModal = target.closest('.widget-property-editor') || target.closest('.builder-context-menu') || target.closest('.builder-toolbox');

      if (!isModifier && !isClickingElement && !isClickingHandle && !isClickingBubbleMenu && !isClickingModal) {
        setSelectedElementIds([]);
        // clear any leftover manual styles just in case
        document.querySelectorAll('[data-element-id]').forEach(el => {
          (el as HTMLElement).style.outline = 'none';
        });
      }
    };

    document.addEventListener('mousedown', handleGlobalMousedown, true); // Capture phase
    return () => document.removeEventListener('mousedown', handleGlobalMousedown, true);
  }, [selectedElementIds, setSelectedElementIds]);

  // marquee selection logic: move / end
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
      // calculate final intersection
      const x1 = Math.min(selectionBox.startX, selectionBox.currentX);
      const y1 = Math.min(selectionBox.startY, selectionBox.currentY);
      const x2 = Math.max(selectionBox.startX, selectionBox.currentX);
      const y2 = Math.max(selectionBox.startY, selectionBox.currentY);

      // important: threshold for "accidental" marquee vs click
      const dist = Math.hypot(selectionBox.currentX - selectionBox.startX, selectionBox.currentY - selectionBox.startY);

      if (dist > 5) {
        const intersectIds: string[] = [];
        page?.elements.forEach(el => {
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

          // standard intersection check
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

  // responsive canvas styling
  const isDesktop = previewMode === 'desktop';
  const canvasStyle: React.CSSProperties = {
    background: page.background || '#050505',
    height: isDesktop ? (page.height ? `${page.height}px` : 'auto') : '100%',
    minHeight: isDesktop ? '100vh' : '100%',
  };

  // ensure mobile/tablet matches the wrapper if no overflow
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

        // 1. ignore clicks on known ui components
        if (target.closest('.builder-toolbox') ||
          target.closest('.builder-context-menu') ||
          target.closest('.widget-property-editor') ||
          target.closest('.global-context-menu')) {
          return;
        }

        // 2. ignore clicks on actual elements (they handle their own selection)
        if (target.closest('[data-element-id]')) {
          return;
        }

        const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;

        // 3. background click -> handle marquee selection
        if (isAdmin) {
          const canvas = document.getElementById('canvas-content');
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();

          const sX = e.clientX - rect.left;
          const sY = e.clientY - rect.top;

          // clear previous selection if no modifier
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
          width: isDesktop ? '1440px' : '100%',
          minWidth: isDesktop ? '1440px' : '100%',
        }}
      >
        {/* the selection box visual */}
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
        {page?.elements
          .map((element) => (
            <ElementRenderer
              key={element.id}
              element={element}
              isSelected={isAdmin && selectedElementIds.includes(element.id)}
              isAdmin={isAdmin}
              onSelect={(multi) => {
                if (multi) {
                  if (selectedElementIds.includes(element.id)) {
                    setSelectedElementIds(selectedElementIds.filter(id => id !== element.id));
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
  const { page, previewMode, viewWidth } = useBuilder();

  // calculate scale factor for mobile/tablet responsive layout
  // designWidth for mobile is 430px (iphone 14/15 pro max)
  // designWidth for tablet is 834px (ipad air)
  const designWidth = previewMode === 'mobile' ? 430 : previewMode === 'tablet' ? 834 : viewWidth;

  // in admin mode (builder), we keep 1:1 scale for precise editing inside the frame.
  // in public mode (preview), we scale to fit the actual device width.
  const scaleFactor = isAdmin ? 1 : (viewWidth / designWidth);

  // determine active layout with robust fallbacks per field
  const deviceLayout = previewMode === 'mobile' ? element.mobile : previewMode === 'tablet' ? element.tablet : null;

  const posX = deviceLayout?.x ?? element.x ?? 0;
  const posY = deviceLayout?.y ?? element.y ?? 0;
  const posW = deviceLayout?.width ?? element.width ?? 200;
  const posH = deviceLayout?.height ?? element.height ?? 100;
  const fontSize = deviceLayout?.fontSize ?? element.styles?.fontSize;


  // scroll-triggered animation
  const { ref: inviewRef } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const elementRef = useRef<HTMLDivElement | null>(null);

  // merge refs
  const setRefs = (node: HTMLDivElement | null) => {
    elementRef.current = node;
    inviewRef(node);
  };

  // drag state
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

  // handle drag
  useEffect(() => {
    if (!isDragging || !dragStart.current) return;

    const { x: startX, y: startY, targets } = dragStart.current;

    // tracks for commit
    let finalDelta = { x: 0, y: 0 };
    let snapMode: 'none' | 'grid' | 'cluster' = 'none';
    let lastMouseEvent: MouseEvent | null = null;

    const updatePosition = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let moveX = dx;
      let moveY = dy;

      if (snapMode !== 'none') {
        const GRID_SIZE = 20;
        const primary = targets[0];

        if (snapMode === 'grid') {
          const snappedX = Math.round((primary.initialX + dx) / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round((primary.initialY + dy) / GRID_SIZE) * GRID_SIZE;
          moveX = snappedX - primary.initialX;
          moveY = snappedY - primary.initialY;
        } else if (snapMode === 'cluster') {
          // snap primary element center to nearest element center (or canvas center) for alignment
          try {
            const all = page?.elements || [];
            const primaryData = all.find(a => a.id === primary.id) || { width: primary.dom?.offsetWidth || 0, height: primary.dom?.offsetHeight || 0 };
            const primaryW = primaryData.width || (primary.dom ? (primary.dom as HTMLElement).offsetWidth : 0) || 50;
            const primaryH = primaryData.height || (primary.dom ? (primary.dom as HTMLElement).offsetHeight : 0) || 20;

            const movingCenterX = primary.initialX + dx + primaryW / 2;
            const movingCenterY = primary.initialY + dy + primaryH / 2;

            // find nearest center among other elements
            let nearest: { cx: number; cy: number; dist: number } | null = null;
            for (const other of all) {
              if (targets.some(t => t.id === other.id)) continue;
              const cx = other.x + (other.width || 0) / 2;
              const cy = other.y + (other.height || 0) / 2;
              const dist = Math.hypot(cx - movingCenterX, cy - movingCenterY);
              if (!nearest || dist < nearest.dist) nearest = { cx, cy, dist };
            }

            // also consider canvas center
            const canvasRect = document.querySelector('.canvas-background')?.getBoundingClientRect();
            if (!nearest && canvasRect) {
              const canvasCx = (canvasRect.width) / 2;
              const canvasCy = (canvasRect.height) / 2;
              nearest = { cx: canvasCx, cy: canvasCy, dist: Math.hypot(canvasCx - movingCenterX, canvasCy - movingCenterY) };
            }

            if (nearest && nearest.dist < 400) {
              const snapCenterX = nearest.cx;
              const snapCenterY = nearest.cy;
              const newPrimaryX = Math.round(snapCenterX - primaryW / 2);
              const newPrimaryY = Math.round(snapCenterY - primaryH / 2);

              moveX = newPrimaryX - primary.initialX;
              moveY = newPrimaryY - primary.initialY;
            }
          } catch (e) {
            // fallback to no cluster snapping on error
          }
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
      } else if (k === 'c') {
        snapMode = 'cluster';
        setIsSnapping(true);
        if (lastMouseEvent) updatePosition(lastMouseEvent);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'g' || k === 'c') {
        snapMode = 'none';
        setIsSnapping(false);
        if (lastMouseEvent) updatePosition(lastMouseEvent);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStart.current = null;

      // commit all to react
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

  // handle resize
  useEffect(() => {
    if (!isResizing || !resizeHandle) return;

    const startX = resizeStart.current?.x || 0;
    const startY = resizeStart.current?.y || 0;
    const elW = resizeStart.current?.elW || 0;
    const elH = resizeStart.current?.elH || 0;
    const elX = resizeStart.current?.elX || 0;
    const elY = resizeStart.current?.elY || 0;
    const baseFontSize = resizeStart.current?.baseFontSize || 24;

    // track final state for commit
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

      // calculate new dimensions based on direction
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

      // scaling logic (text, buttons, version badges)
      const scalableTypes = ['text', 'button', 'version', 'versionbadge', 'serverip', 'serverstatus'];
      if (scalableTypes.includes(element.type)) {
        const isCorner = ['ne', 'nw', 'se', 'sw'].includes(resizeHandle);
        if (isCorner) {
          // corner = scale (uniform)
          const ratio = newHeight / elH;
          newFontSize = Math.max(8, Math.round(baseFontSize * ratio));
          newWidth = Math.max(50, Math.round(elW * ratio));

          if (resizeHandle.includes('w')) newX = elX + (elW - newWidth);
          if (resizeHandle.includes('n')) newY = elY + (elH - newHeight);

          // update font size visually
          elementRef.current.style.fontSize = `${newFontSize}px`;
          pendingUpdate.styles = { ...element.styles, fontSize: newFontSize };
        }
      }

      // dom updates
      elementRef.current.style.width = `${newWidth}px`;
      elementRef.current.style.height = `${newHeight}px`;
      elementRef.current.style.left = `${newX}px`;
      elementRef.current.style.top = `${newY}px`;

      // store for commit
      pendingUpdate.width = newWidth;
      pendingUpdate.height = newHeight;
      if (newX !== elX) pendingUpdate.x = newX;
      if (newY !== elY) pendingUpdate.y = newY;
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
      resizeStart.current = null;

      // commit final state
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

  const { selectedElementIds: globalSelectedIds } = useBuilder();

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
      // only drag if not editing text
      setIsDragging(true);

      let currentSelection = globalSelectedIds;

      if (isShift) {
        // toggle selection
        if (isSelected) {
          currentSelection = globalSelectedIds.filter(id => id !== element.id);
        } else {
          currentSelection = [...globalSelectedIds, element.id];
        }
        onSelect(true); // multi mode
      } else {
        // single select mode
        if (!isSelected) {
          currentSelection = [element.id];
          onSelect(false); // single mode
        }
        // if already selected, we keep currentselection to allow dragging group
      }

      const targets = (page?.elements || [])
        .filter((el: any) => currentSelection.includes(el.id))
        .map((el: any) => {
          const elLayout = (previewMode === 'mobile' ? el.mobile : previewMode === 'tablet' ? el.tablet : null) || {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height
          };
          const dom = document.querySelector(`[data-element-id="${el.id}"]`) as HTMLElement;

          // auto-fit height for text elements on drag start
          // this fixes the bug where text selection boxes are taller than the text itself
          if (el.type === 'text' && dom) {
            const richText = dom.querySelector('.rich-text-wrapper') as HTMLElement;
            if (richText) {
              const actualHeight = richText.scrollHeight;
              if (actualHeight > 0 && Math.abs(actualHeight - elLayout.height) > 5) {
                onUpdateBatch([{ id: el.id, updates: { height: actualHeight } }]);
                elLayout.height = actualHeight;
              }
            }
          }

          return {
            id: el.id,
            initialX: elLayout.x,
            initialY: elLayout.y,
            dom
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

    // public mode interactions
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
    // handle hex shorthand
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

  const baseStyles = {
    position: 'absolute' as const,
    left: getPx(posX, 0),
    top: getPx(posY, 0),
    width: getPx(posW, 200),
    height: getPx(posH, 100),
    zIndex: element.zIndex ?? 1,
    fontSize: fontSize ? `${fontSize}px` : undefined,
    display: 'block'
  };

  // apply element-defined background and opacity (use hex->rgba when opacity provided)
  try {
    const bg = element.styles?.backgroundColor ?? element.styles?.background;
    const op = element.styles?.opacity;

    // styling fixes: apply border radius and overflow to container to prevent background bleed
    (baseStyles as any).borderRadius = element.styles?.borderRadius ? `${element.styles.borderRadius}px` : '16px'; // Default 16px radius
    (baseStyles as any).overflow = 'hidden';

    // default black outline
    (baseStyles as any).border = element.styles?.borderWidth
      ? `${element.styles.borderWidth}px solid ${element.styles.borderColor || '#000000'}`
      : '2px solid #000000';


    if (bg) {
      // apply border radius and overflow to container to prevent background bleed
      (baseStyles as any).borderRadius = element.styles?.borderRadius ? `${element.styles.borderRadius}px` : '16px';
      (baseStyles as any).overflow = 'hidden';
      // default black outline
      (baseStyles as any).border = element.styles?.borderWidth
        ? `${element.styles.borderWidth}px solid ${element.styles.borderColor || '#000000'}`
        : '2px solid #000000';

      if (typeof bg === 'string' && typeof op === 'number') {
        // prefer explicit opacity on the element
        (baseStyles as any).backgroundColor = hexToRgba(bg, op);
        (baseStyles as any).opacity = 1; // background already encoded
      } else {
        (baseStyles as any).backgroundColor = bg;
        if (typeof op === 'number') (baseStyles as any).opacity = op;
      }
    } else {
      // default black outline even if no background
      (baseStyles as any).borderRadius = element.styles?.borderRadius ? `${element.styles.borderRadius}px` : '16px';
      (baseStyles as any).overflow = 'hidden';
      (baseStyles as any).border = element.styles?.borderWidth
        ? `${element.styles.borderWidth}px solid ${element.styles.borderColor || '#000000'}`
        : '2px solid #000000';

      if (typeof op === 'number') {
        (baseStyles as any).opacity = op;
      }
    }
  } catch (e) {
    // noop
  }

  const renderContent = () => {
    switch (element.type) {
      case 'button':
        return (
          <SlickButton
            text={element.content?.text}
            url={element.content?.url}
            icon={element.content?.icon}
            bgColor={element.content?.bgColor}
            textColor={element.content?.textColor}
            iconColor={element.content?.iconColor}
            borderRadius={element.styles?.borderRadius}
          />
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
            isAdmin={isAdmin}
          />
        );
      case 'linkcard':
        return <LinkCard title={element.content?.title} url={element.content?.url} icon={element.content?.icon || 'link-2'} description={element.content?.description} color={element.content?.color} />;
      case 'statusindicator':
        return <StatusIndicator label={element.content?.label} status={element.content?.status || 'online'} showLabel={element.content?.showLabel !== false} />;
      case 'financial_chart':
        return <FinancialChartElement title={element.content?.title} data={element.content?.data} />;
      case 'tier_list':
        return <TierListElement rows={element.content?.rows} />;
      case 'shopping_card':
        return <ShoppingCardElement {...element.content} />;
      case 'floating_reminder':
        return <FloatingReminderElement content={element.content?.content} color={element.content?.color} />;
      case 'stats_bar':
        return <StatsBarElement {...element.content} />;
      case 'eternal_flame':
        return <EternalFlameElement />;
      case 'gold_pile':
        return <GoldPileElement />;
      case 'sleep_ring':
        return <SleepRingElement />;
      case 'text':
        return (
          <div className="w-full h-full flex items-center justify-center text-center">
            <RichTextEditor
              content={element.content?.html || ''}
              onChange={(html) => onUpdate({ content: { ...element.content, html }, width: element.width, height: element.height })}
              editable={isEditing && isAdmin}
              className="text-center"
            />
          </div>
        );
      default:
        return <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50">unknown: {element.type}</div>;
    }
  };

  // ... (skipping to return)

  return (
    <>
      {isEditing && element.type !== 'text' && isAdmin && (
        element.type === 'form' ? (
          <FormBuilder
            initialData={element}
            onSave={(data) => {
              onUpdate(data);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        ) : (
          <WidgetPropertyEditor
            element={element}
            onUpdate={onUpdate}
            onClose={() => setIsEditing(false)}
          />
        )
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
            <div className="absolute -top-7 left-0 bg-[var(--primary)] text-black text-[10px] font-bold px-2 py-1 rounded-t-lg lowercase flex items-center gap-3 shadow-lg transition-all group-hover:pr-3">
              <div className="flex items-center gap-1.5">
                <span className="opacity-60">{element.type}</span>
                <div className="flex gap-1 border-l border-black/10 pl-2">
                  <span className="opacity-40">x:{Math.round(posX)}</span>
                  <span className="opacity-40">y:{Math.round(posY)}</span>
                </div>
              </div>

              {element.type !== 'text' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                  }}
                  className="bg-black/10 hover:bg-black/20 p-1 rounded transition-colors flex items-center gap-1"
                  title="edit widget properties"
                >
                  <Settings2 size={12} />
                  <span className="text-[9px]">edit</span>
                </button>
              )}
            </div>

            {/* resize handles */}
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

        {/* content wrapper - pointer shield to allow dragging from anywhere */}
        <div className={`w-full h-full ${isAdmin && !isEditing ? 'pointer-events-none' : 'pointer-events-auto'}`}>
          {rendercontent()}
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
