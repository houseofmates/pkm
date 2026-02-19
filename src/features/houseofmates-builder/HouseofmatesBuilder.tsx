import { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/api/nocobase-client';
import { toast } from 'sonner';
import { getSubdomain } from '@/utils/subdomain-router';
import { AdminLoginModal } from './components/AdminLoginModal';
import { BuilderToolbox } from './components/BuilderToolbox';
import { PageRenderer } from './components/PageRenderer';
import { GlobalContextMenu } from './components/GlobalContextMenu';
import { ElementContextMenu } from './components/ElementContextMenu';

// --- types ---
export interface PageData {
  id: string;
  title: string;
  slug: string;
  theme_color: string;
  background?: string; // color, gradient, or image URL
  height?: number; // custom height in pixels (optional, default min-h-screen)
  elements: ElementData[];
  enable_sounds?: boolean;
  custom_pop_sound?: string;
  custom_exit_sound?: string;
}

export interface ElementData {
  id: string;
  type: 'text' | 'image' | 'button' | 'slick_button' | 'container' | 'video' | 'embed' | 'shape' |
  'form' | 'hero' | 'about' | 'social' | 'faq' | 'testimonial' | 'gallery' |
  'countdown' | 'divider' | 'serverip' | 'serverstatus' | 'featurecard' |
  'staffcard' | 'rules' | 'versionbadge' | 'database_view' |
  'pdf_viewer' | 'code_block' | 'file_download' | 'minecraft_stats' | 'linkcard' | 'statusindicator' |
  'financial_chart' | 'tier_list' | 'shopping_card' | 'floating_reminder' | 'stats_bar' |
  'eternal_flame' | 'gold_pile' | 'sleep_ring';
  x: number;
  y: number;
  width: number;
  height: number;
  content: any; // type-specific content
  styles: ElementStyles;
  link?: string;
  clickAction?: 'link' | 'copy' | 'none'; // Default is 'link' if link exists, else 'none'
  copyContent?: string; // Content to copy if clickAction is 'copy'. If empty, tries to infer content.
  zIndex: number;
  tablet?: { x: number; y: number; width: number; height: number; fontSize?: number };
  mobile?: { x: number; y: number; width: number; height: number; fontSize?: number };
  visibility?: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean;
  };
}

export interface ElementStyles {
  borderRadius?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  boxShadow?: string;
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fitHeight?: boolean;
}

// --- context ---
interface BuilderContextType {
  isAdmin: boolean;
  page: PageData | null;
  selectedElementIds: string[];
  setSelectedElementIds: (ids: string[]) => void;
  updateElement: (id: string, updates: Partial<ElementData>) => void;
  updateElements: (updates: { id: string; updates: Partial<ElementData> }[]) => void;
  deleteElements: (ids: string[]) => void;
  deleteElement: (id: string) => void;
  addElement: (element: Omit<ElementData, 'id'>) => void;
  updatePage: (updates: Partial<PageData>) => void;
  refresh: () => void;
  site_identifier: string;
  handleElementContextMenu: (e: React.MouseEvent, elementId: string) => void;
  handleGlobalContextMenu: (e: React.MouseEvent) => void;
  collectionNames: { website: string; forms: string };
  previewMode: 'desktop' | 'mobile' | 'tablet';
  setPreviewMode: (mode: 'desktop' | 'mobile' | 'tablet') => void;
  viewWidth: number;
  selectionBox: { startX: number; startY: number; currentX: number; currentY: number } | null;
  setSelectionBox: (box: { startX: number; startY: number; currentX: number; currentY: number } | null) => void;
  clipboard: ElementData[];
  copySelection: () => void;
  paste: (x?: number, y?: number) => void;
}

const BuilderContext = createContext<BuilderContextType | null>(null);
export const useBuilder = () => {
  const ctx = useContext(BuilderContext);
  if (!ctx) throw new Error('UseBuilder must be used within HouseofmatesBuilder');
  return ctx;
};

// --- state types ---
type ContextMenuState =
  | { type: 'global'; x: number; y: number }
  | { type: 'element'; x: number; y: number; elementId: string }
  | null;

// --- main component ---
export function HouseofmatesBuilder() {
  const { slug = 'home' } = useParams();
  const site_identifier = getSubdomain() || 'home';

  const getCollectionNames = (site: string) => {
    if (site === 'dupe') {
      return { website: 'dupemates-pages', forms: 'dupe-forms' };
    }
    return { website: 'site-pages', forms: 'form-submissions' };
  };

  const collectionNames = useMemo(() => getCollectionNames(site_identifier), [site_identifier]);

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [clipboard, setClipboard] = useState<ElementData[]>([]);
  const [pasteCount, setPasteCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewWidth, setViewWidth] = useState(window.innerWidth);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');

  // --- device detection ---
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      setViewWidth(width);
      const ua = navigator.userAgent;
      const isIPad = /iPad|Macintosh/i.test(ua) && 'ontouchend' in document;
      const isTablet = (width >= 640 && width <= 1024) || isIPad;

      if (width < 640 && !isIPad) setPreviewMode('mobile');
      else if (isTablet) setPreviewMode('tablet');
      else setPreviewMode('desktop');
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // --- global deselection ---
  useEffect(() => {
    const handleGlobalMousedown = (e: MouseEvent) => {
      if (selectedElementIds.length === 0) return;

      const target = e.target as HTMLElement;
      const isModifier = e.shiftKey || e.ctrlKey || e.metaKey;

      // 1. check if we clicked "canvas background" directly
      const isBackground = target.id === 'builder-canvas' || target.dataset.canvasBackground === 'true';

      // 2. check if we clicked an element or handle
      const isClickingElement = !!target.closest('[data-element-id]');
      const isClickingHandle = target.classList.contains('resize-handle') || !!target.dataset.handle;

      // 3. check if we clicked any builder ui
      const isClickingUI = !!(
        target.closest('.builder-toolbox') ||
        target.closest('.builder-context-menu') ||
        target.closest('.widget-property-editor') ||
        target.closest('.builder-modal') ||
        target.closest('.BubbleMenu')
      );

      // logic: if (on background or (not element and not handle and not ui)) and no modifier
      if (!isModifier && (isBackground || (!isClickingElement && !isClickingHandle && !isClickingUI))) {
        console.log('[HouseofmatesBuilder] Context/Background Deselection');
        setSelectedElementIds([]);
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleGlobalMousedown, true); // Use capture phase
    return () => window.removeEventListener('mousedown', handleGlobalMousedown, true);
  }, [selectedElementIds]);

  // --- undo history ---
  const [history, setHistory] = useState<PageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = useCallback((newPage: PageData) => {
    // if we are in the middle of history, discard future
    const newHistory = [...history.slice(0, historyIndex + 1), newPage];
    // limit history size (e.g., 50)
    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const previousPage = history[newIndex];
      setPage(previousPage);
      setHistoryIndex(newIndex);
      toast.info('undo', { duration: 1000 });

      // sync with backend (debounced ideally, but here direct)
      api.updateRecord(collectionNames.website, previousPage.id, {
        ...previousPage,
        elements: JSON.stringify(previousPage.elements)
      }).catch(console.error);
    }
  }, [history, historyIndex, collectionNames]);

  // --- fetch page ---
  const fetchPage = useCallback(async () => {
    console.log('[HouseofmatesBuilder] fetchPage called', { slug, site_identifier });
    console.log('[HouseofmatesBuilder] collectionNames:', collectionNames);
    setLoading(true);

    try {
      console.log('[HouseofmatesBuilder] About to make API request to:', collectionNames.website);
      console.log('[HouseofmatesBuilder] api object:', api);
      console.log('[HouseofmatesBuilder] api.request:', typeof api.request);

      let pageRes;
      try {
        console.log('[HouseofmatesBuilder] Calling api.request...');
        pageRes = await api.request(collectionNames.website, 'list', {
          params: {
            filter: {
              slug,
              site: site_identifier
            },
            pageSize: 1
          }
        });
        console.log('[HouseofmatesBuilder] ✅ API request completed successfully!');
      } catch (apiError: any) {
        console.error('[HouseofmatesBuilder] ❌ API request error:', apiError);
        console.error('[HouseofmatesBuilder] Error name:', apiError?.name);
        console.error('[HouseofmatesBuilder] Error message:', apiError?.message);
        console.error('[HouseofmatesBuilder] Error response:', apiError?.response);
        console.error('[HouseofmatesBuilder] Error stack:', apiError?.stack);
        throw apiError;
      }
      console.log('[HouseofmatesBuilder] RAW page response:', JSON.stringify(pageRes, null, 2));
      console.log('[HouseofmatesBuilder] pageRes.data:', pageRes?.data);
      console.log('[HouseofmatesBuilder] pageRes.data type:', typeof pageRes?.data);
      console.log('[HouseofmatesBuilder] pageRes.data is array?', Array.isArray(pageRes?.data));

      let foundPage = pageRes?.data?.[0] || pageRes?.data?.data?.[0];
      console.log('[HouseofmatesBuilder] foundPage:', foundPage);

      // if no page found and we're looking for home, try is_home and site_identifier
      if (!foundPage && (slug === 'home' || !slug)) {
        console.log('[HouseofmatesBuilder] No page found with slug, trying is_home filter');
        pageRes = await api.request(collectionNames.website, 'list', {
          params: {
            filter: {
              is_home: true,
              site: site_identifier
            },
            pageSize: 1
          }
        });
        console.log('[HouseofmatesBuilder] home page RAW response:', JSON.stringify(pageRes, null, 2));
        foundPage = pageRes?.data?.[0] || pageRes?.data?.data?.[0];
        console.log('[HouseofmatesBuilder] foundPage after home filter:', foundPage);
      }

      if (foundPage) {
        console.log('[HouseofmatesBuilder] ✓ FOUND PAGE:', foundPage);
        const elements = typeof foundPage.elements === 'string'
          ? JSON.parse(foundPage.elements)
          : (foundPage.elements || []);
        const loadedPage = { ...foundPage, elements };
        console.log('[HouseofmatesBuilder] loaded page:', loadedPage);
        setPage(loadedPage);

        // init history
        setHistory([loadedPage]);
        setHistoryIndex(0);
      } else {
        console.error('[HouseofmatesBuilder] ✗ NO PAGE FOUND FOR:', { slug, site_identifier, collection: collectionNames.website });
        console.error('[HouseofmatesBuilder] This means either:');
        console.error(' 1. No pages exist in the database');
        console.error(' 2. The API key lacks read permissions');
        console.error(' 3. The page was deleted or data was cleared');
        setPage(null);
      }
    } catch (error: any) {
      console.error('Failed to fetch page:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);

        // handle 401 specifically
        if (error.response.status === 401) {
          console.warn('[HouseofmatesBuilder] 401 Unauthorized - prompting for login');
          toast.error('you need to log in as admin to create/edit pages');
          setShowLoginModal(true);
        }
      }
      setPage(null);
    } finally {
      console.log('[HouseofmatesBuilder] setting loading to false');
      setLoading(false);
    }
  }, [slug, site_identifier, collectionNames]);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // only fetch once on mount
    if (hasFetchedRef.current) {
      console.log('[HouseofmatesBuilder] Skipping duplicate fetch');
      return;
    }

    console.log('[HouseofmatesBuilder] init useEffect running');
    hasFetchedRef.current = true;

    const init = async () => {
      const key = localStorage.getItem('hom_api_key');
      if (key && key !== 'null' && key !== 'undefined') {
        setIsAdmin(true);
        // run collection ensures
        try {
          await ensureWebsiteCollection();
          await ensureFormsCollection();
        } catch (err) {
          console.error('collection setup failed:', err);
        }
      }
      fetchPage();
    };

    init();
  }, []);


  // --- admin login handler ---
  const handleAdminLogin = async (apiKey: string) => {
    try {
      // save token directly - it will be validated on first actual api call
      // this avoids timeout issues during login
      localStorage.setItem('hom_api_key', apiKey);

      setIsAdmin(true);
      setShowLoginModal(false);
      toast.success('admin mode enabled');

      // run these in the background without blocking login
      Promise.all([
        ensureWebsiteCollection(),
        ensureFormsCollection(),
        fetchPage()
      ]).catch(err => {
        console.error('background setup failed:', err);
      });
    } catch (error) {
      console.error('admin login failed:', error);
      toast.error('failed to enable admin mode');
      localStorage.removeItem('hom_api_key');
    }
  };

  // --- ensure website collection exists ---
  const ensureWebsiteCollection = async () => {
    const colName = collectionNames.website;
    const colTitle = site_identifier === 'dupe' ? 'dupe mates pages' : 'website pages';

    try {
      console.log(`[ensureWebsiteCollection] Checking for ${colName}...`);
      const collectionsRes = await api.listCollections();
      const collectionsData = Array.isArray(collectionsRes) ? collectionsRes : (collectionsRes as { data?: any[] }).data;
      const col = collectionsData?.find((c: any) => c.name === colName);

      const fields = [
        { type: 'string', name: 'title', interface: 'input' },
        { type: 'string', name: 'slug', interface: 'input' },
        { type: 'string', name: 'site', interface: 'input' },
        { type: 'string', name: 'theme_color', interface: 'input', defaultValue: 'var(--primary)' },
        { type: 'string', name: 'background', interface: 'input' },
        { type: 'integer', name: 'height', interface: 'integer', defaultValue: 0 },
        { type: 'json', name: 'elements', interface: 'json' },
        { type: 'boolean', name: 'is_home', interface: 'checkbox', defaultValue: false },
        { type: 'boolean', name: 'enable_sounds', interface: 'checkbox', defaultValue: false },
        { type: 'string', name: 'custom_pop_sound', interface: 'input' },
        { type: 'string', name: 'custom_exit_sound', interface: 'input' },
      ];

      if (!col) {
        console.log(`[ensureWebsiteCollection] Creating ${colName} collection...`);
        await api.createCollection({
          name: colName,
          title: colTitle,
          hidden: true,
          fields
        });
      } else {
        // important: check for broken inheritance (often cause of 500 errors)
        if (col.inherits && col.inherits.length > 0) {
          const parentRes = await api.listCollections();
          const parentData = Array.isArray(parentRes) ? parentRes : (parentRes as { data?: any[] }).data;
          const parent = parentData?.find((p: any) => col.inherits.includes(p.name));
          if (!parent) {
            console.warn(`[ensureWebsiteCollection] Broken inheritance detected for ${colName}! Resetting inherits.`);
            try {
              await api.updateCollection(colName, { inherits: [] });
            } catch (e) {
              console.error(`Failed to reset broken inheritance for ${colName}:`, e);
            }
          }
        }

        // ensure metadata (title/hidden) normalized
        try {
          await api.updateCollection(colName, { title: colTitle, hidden: true }).catch((err) => {
            console.warn(`Primary update metadata failed for ${colName}, trying fallback:`, err.message);
            return api.request('collections', 'update', {
              method: 'POST',
              params: { filterByTk: colName },
              data: { title: colTitle, hidden: true }
            });
          });
        } catch (e) {
          console.warn(`Failed to normalize collection metadata for ${colName}:`, e);
        }

        // check fields - try to use list if get fails
        let existingFields = [];
        try {
          const colDetail = await api.getCollection(colName);
          existingFields = colDetail.data?.fields || [];
        } catch (e) {
          console.warn(`Failed to get fields for ${colName} via getCollection, trying listFields fallback`);
          try {
            const fieldListRes = await api.request('fields', 'list', { params: { 'filter[collectionName]': colName } });
            existingFields = fieldListRes.data || [];
          } catch (fe) {
            console.error(`Giving up on field check for ${colName}:`, fe);
          }
        }

        for (const field of fields) {
          const existing = existingFields.find((f: any) => f.name === field.name);
          if (!existing) {
            try {
              console.log(`Adding missing field ${field.name} to ${colName} collection`);
              await api.createField(colName, field);
            } catch (err: any) {
              if (err.response?.status !== 400) console.warn(`Failed to add field ${field.name}:`, err.message);
            }
          } else if (existing.interface !== field.interface) {
            try {
              console.log(`Updating field ${field.name} interface in ${colName} collection`);
              // @ts-expect-error -- api typings do not include updatefield overload used here
              await api.updateField(colName, field.name, { interface: field.interface });
            } catch (err) {
              console.warn(`Failed to update field ${field.name}:`, err);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to ensure website collection:`, error);
    }
  };

  // --- ensure forms collection exists ---
  const ensureFormsCollection = async () => {
    const colName = collectionNames.forms;
    const colTitle = site_identifier === 'dupe' ? 'dupe forms' : 'form submissions';

    try {
      const collectionsRes = await api.listCollections();
      const collectionsData = Array.isArray(collectionsRes) ? collectionsRes : (collectionsRes as { data?: any[] }).data;
      const col = collectionsData?.find((c: any) => c.name === colName);

      const fields = [
        { type: 'string', name: 'site', interface: 'input' },
        { type: 'string', name: 'form_name', interface: 'input' },
        { type: 'json', name: 'data', interface: 'json' },
        { type: 'string', name: 'minecraft_username', interface: 'input' },
        { type: 'integer', name: 'rating', interface: 'integer' },
        { type: 'text', name: 'message', interface: 'textarea' },
        { type: 'datetime', name: 'submitted_at', interface: 'datetime' },
      ];

      if (!col) {
        await api.createCollection({
          name: colName,
          title: colTitle,
          hidden: true,
          fields
        });
      } else {
        // check inheritance
        if (col.inherits && col.inherits.length > 0) {
          const parentRes = await api.listCollections();
          const parentData = Array.isArray(parentRes) ? parentRes : (parentRes as { data?: any[] }).data;
          if (!parentData?.find((p: any) => col.inherits.includes(p.name))) {
            console.warn(`[ensureFormsCollection] Broken inheritance detected for ${colName}! Resetting inherits.`);
            await api.updateCollection(colName, { inherits: [] }).catch(console.error);
          }
        }

        // ensure metadata (title/hidden) normalized
        try {
          await api.updateCollection(colName, { title: colTitle, hidden: true }).catch(err => {
            console.warn(`Metadata update fail for ${colName}:`, err.message);
          });
        } catch (e) {
          console.warn(`Failed to normalize collection metadata for ${colName}:`, e);
        }

        // try to get fields more reliably
        let existingFields = [];
        try {
          const colDetail = await api.getCollection(colName);
          existingFields = colDetail.data?.fields || [];
        } catch (e) {
          const flr = await api.request('fields', 'list', { params: { 'filter[collectionName]': colName } }).catch(() => ({ data: [] }));
          existingFields = flr.data || [];
        }

        for (const field of fields) {
          if (!existingFields.some((ef: any) => ef.name === field.name)) {
            console.log(`Adding missing field ${field.name} to ${colName} collection`);
            await api.createField(colName, field).catch(err => {
              if (err.response?.status !== 400) console.warn(`Field add fail: ${field.name}`, err.message);
            });
          }
        }
      }
    } catch (error) {
      console.error(`Failed to update ${colName} collection:`, error);
    }
  };

  // --- crud operations ---
  const updateElements = useCallback((batchUpdates: { id: string; updates: Partial<ElementData> }[]) => {
    if (!page) return;
    const newElements = page.elements.map(el => {
      const update = batchUpdates.find(u => u.id === el.id);
      if (!update) return el;

      const mode = previewMode; // desktop, tablet, or mobile
      if (mode === 'desktop') {
        // deep merge styles to prevent losing existing style properties
        const mergedUpdates = { ...update.updates };
        if (mergedUpdates.styles) {
          mergedUpdates.styles = { ...el.styles, ...mergedUpdates.styles };
        }
        if (mergedUpdates.content) {
          mergedUpdates.content = { ...el.content, ...mergedUpdates.content };
        }
        return { ...el, ...mergedUpdates };
      } else {
        // device-specific layout update
        const layoutUpdates = {
          x: update.updates.x ?? (el[mode]?.x ?? el.x),
          y: update.updates.y ?? (el[mode]?.y ?? el.y),
          width: update.updates.width ?? (el[mode]?.width ?? el.width),
          height: update.updates.height ?? (el[mode]?.height ?? el.height),
          fontSize: update.updates.styles?.fontSize ?? el[mode]?.fontSize,
        };

        // merge non-layout updates (content, styles, etc.)
        const filteredUpdates = { ...update.updates };

        // redirection logic: if fontsize is in styles, it moves to devicelayout
        if (filteredUpdates.styles && 'fontSize' in filteredUpdates.styles) {
          const { fontSize, ...otherStyles } = filteredUpdates.styles;
          if (Object.keys(otherStyles).length > 0) {
            filteredUpdates.styles = { ...el.styles, ...otherStyles };
          } else {
            delete filteredUpdates.styles;
          }
        } else if (filteredUpdates.styles) {
          // just merge other styles
          filteredUpdates.styles = { ...el.styles, ...filteredUpdates.styles };
        }

        return {
          ...el,
          ...Object.fromEntries(Object.entries(filteredUpdates).filter(([k]) => !['x', 'y', 'width', 'height'].includes(k))),
          [mode]: layoutUpdates
        };
      }
    });
    const newPage = { ...page, elements: newElements };
    addToHistory(newPage);
    setPage(newPage);
    console.log('[updateElements] Saving to database:', { pageId: page.id, elementCount: newElements.length, updates: batchUpdates });
    api.updateRecord(collectionNames.website, page.id, { elements: JSON.stringify(newElements) })
      .then(() => {
        console.log('[updateElements] ✓ Successfully saved to database');
      })
      .catch((error) => {
        console.error('[updateElements] ✗ failed to save to database:', error);
      });
  }, [page, collectionNames, previewMode, addToHistory]);

  const updateElement = useCallback((id: string, updates: Partial<ElementData>) => {
    updateElements([{ id, updates }]);
  }, [updateElements]);

  const deleteElements = useCallback((ids: string[]) => {
    if (!page) return;
    const newElements = page.elements.filter(el => !ids.includes(el.id));
    const newPage = { ...page, elements: newElements };
    addToHistory(newPage);
    setPage(newPage);
    setSelectedElementIds([]);
    api.updateRecord(collectionNames.website, page.id, { elements: JSON.stringify(newElements) })
      .then(() => toast.success(`${ids.length} element(s) deleted`))
      .catch(console.error);
  }, [page, collectionNames]);

  const deleteElement = useCallback((id: string) => {
    deleteElements([id]);
  }, [deleteElements]);

  const addElement = useCallback((element: Omit<ElementData, 'id'>) => {
    if (!page) return;
    const newElement: ElementData = {
      ...element,
      id: crypto.randomUUID(),
      // initialize layouts with desktop values
      tablet: element.tablet || { x: element.x, y: element.y, width: element.width, height: element.height, fontSize: element.styles?.fontSize },
      mobile: element.mobile || { x: element.x, y: element.y, width: element.width, height: element.height, fontSize: element.styles?.fontSize },
      // ensure sensible defaults for styles on new elements
      styles: { ...(element.styles || {}), backgroundColor: (element.styles && element.styles.backgroundColor) || '#03000c', opacity: (element.styles && typeof element.styles.opacity === 'number') ? element.styles.opacity : 0.75 },
      visibility: element.visibility || {
        desktop: previewMode === 'desktop',
        tablet: previewMode === 'tablet' || previewMode === 'desktop',
        mobile: previewMode === 'mobile' || previewMode === 'desktop'
      }
    };
    const newElements = [...page.elements, newElement];
    const newPage = { ...page, elements: newElements };
    addToHistory(newPage);
    setPage(newPage);

    api.updateRecord(collectionNames.website, page.id, { elements: JSON.stringify(newElements) })
      .then(() => toast.success('element added'))
      .catch(console.error);
  }, [page, collectionNames, previewMode, addToHistory]);

  const copySelection = useCallback(() => {
    if (!page || selectedElementIds.length === 0) return;
    const selected = page.elements.filter(el => selectedElementIds.includes(el.id));
    setClipboard(selected);
    setPasteCount(0);
    toast.success(`${selected.length} element(s) copied`, { icon: '📋' });
  }, [page, selectedElementIds]);

  const paste = useCallback((pasteX?: number, pasteY?: number) => {
    if (!page || clipboard.length === 0) return;

    const offset = (pasteCount + 1) * 20;
    const newElements = [...page.elements];
    const newIds: string[] = [];

    // if specific coordinates are provided (e.g. from context menu),
    // we use them as the top-left of the bounding box of the clipboard elements.
    let offsetX = offset;
    let offsetY = offset;

    if (pasteX !== undefined && pasteY !== undefined) {
      const minX = Math.min(...clipboard.map(el => el.x));
      const minY = Math.min(...clipboard.map(el => el.y));
      offsetX = pasteX - minX;
      offsetY = pasteY - minY;
    }

    clipboard.forEach(el => {
      const newId = crypto.randomUUID();
      newIds.push(newId);

      const pastedElement: ElementData = {
        ...el,
        id: newId,
        x: el.x + offsetX,
        y: el.y + offsetY,
        // update device specific layouts too
        tablet: el.tablet ? { ...el.tablet, x: el.tablet.x + offsetX, y: el.tablet.y + offsetY } : undefined,
        mobile: el.mobile ? { ...el.mobile, x: el.mobile.x + offsetX, y: el.mobile.y + offsetY } : undefined,
        zIndex: (page.elements.length || 0) + 10
      };
      newElements.push(pastedElement);
    });

    const newPage = { ...page, elements: newElements };
    addToHistory(newPage);
    setPage(newPage);
    setSelectedElementIds(newIds);
    setPasteCount(prev => prev + 1);

    api.updateRecord(collectionNames.website, page.id, { elements: JSON.stringify(newElements) })
      .then(() => toast.success(`${clipboard.length} element(s) pasted`))
      .catch(console.error);
  }, [page, clipboard, pasteCount, collectionNames, addToHistory]);

  const updatePage = useCallback((updates: Partial<PageData>) => {
    if (!page) {
      console.error('[Builder] Cannot update page - no page loaded');
      return;
    }

    if (!isAdmin) {
      console.error('[Builder] Cannot update page - not logged in as admin');
      toast.error('you must be logged in as admin to edit');
      setShowLoginModal(true);
      return;
    }

    const newPage = { ...page, ...updates };
    addToHistory(newPage);
    setPage(newPage);

    // don't stringify elements if they're already in the page
    const { elements, ...pageUpdates } = updates;
    const payload = elements ? { ...pageUpdates, elements: JSON.stringify(elements) } : pageUpdates;

    console.log('[Builder] Updating page:', page.id, 'with payload:', payload);

    api.updateRecord(collectionNames.website, page.id, payload)
      .then((res) => {
        console.log('[Builder] Update successful:', res);
        toast.success('page updated');
      })
      .catch((e) => {
        console.error('[Builder] Update failed:', e);
        console.error('[Builder] Error response:', e.response);
        if (e.response?.status === 401) {
          toast.error('session expired - please log in again');
          setShowLoginModal(true);
        } else {
          toast.error('failed to save changes: ' + (e.message || 'unknown error'));
        }
      });
  }, [page, collectionNames, isAdmin]);

  // --- global keyboard listener ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // undo: ctrl+z
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // copy: ctrl+c
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        copySelection();
        return;
      }

      // paste: ctrl+v
      if (e.ctrlKey && e.key.toLowerCase() === 'v') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        e.preventDefault();
        paste();
        return;
      }

      // ctrl+e: admin login
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (!isAdmin) {
          setShowLoginModal(true);
        } else {
          toast.info('update api key');
          setShowLoginModal(true);
        }
        return;
      }

      // esc: deselect
      if (e.key === 'Escape') {
        setSelectedElementIds([]);
        setContextMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdmin, undo, copySelection, paste]);

  // --- context menu ---
  const handleContextMenu = (e: React.MouseEvent) => {
    // toast.success('debug: right click detected'); // removed to avoid spam, uncomment if needed
    console.log('Context menu event triggered', { isAdmin, target: e.target });

    // always prevent default to take control
    e.preventDefault();

    if (!isAdmin) {
      toast.info('press ctrl+e to enter admin mode');
      return;
    }

    // don't show if clicking interactive elements inside elements
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
      console.log('Context menu suppressed by interactive element');
      return;
    }

    console.log('Opening global context menu');
    setContextMenu({ type: 'global', x: e.clientX, y: e.clientY });
  };

  // --- loading state ---
  // (rendered in main block)

  // --- no page found ---
  // (rendered in main block)

  // (page not found rendered in main block)

  // --- drag & drop file handler ---
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const { clientX, clientY } = e;
    // simple uuid generator if not imported
    const genId = () => Math.random().toString(36).substring(2, 9);

    for (const file of files) {
      toast.info(`uploading ${file.name}...`);
      try {
        // upload file
        const uploaded = await api.upload(file);
        const fileUrl = uploaded?.url || uploaded?.data?.url;

        if (!fileUrl) {
          throw new Error('No URL returned from upload');
        }

        let type: ElementData['type'] = 'file_download';
        let content: any = {
          url: fileUrl,
          fileName: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`
        };

        // smart type detection
        if (file.type.startsWith('image/')) {
          type = 'image';
          content = { url: fileUrl, alt: file.name };
        } else if (file.type.startsWith('video/')) {
          type = 'video';
          content = { url: fileUrl, controls: true };
        } else if (file.type === 'application/pdf') {
          type = 'pdf_viewer';
          content = { url: fileUrl, title: file.name };
        } else if (
          file.type.startsWith('text/') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.js') ||
          file.name.endsWith('.ts')
        ) {
          type = 'code_block';
          const text = await file.text();
          content = {
            code: text,
            language: file.name.split('.').pop() || 'text'
          };
        }

        // add element
        const newElement: ElementData = {
          id: genId(),
          type,
          x: clientX,
          y: clientY,
          width: type === 'code_block' ? 400 : 300,
          height: type === 'code_block' ? 300 : type === 'file_download' ? 120 : 200,
          content,
          styles: {},
          zIndex: page?.elements.length || 1,
        };

        addElement(newElement);

      } catch (err: any) {
        console.error('Upload failed:', err);
        toast.error(`failed to upload ${file.name}`);
      }
    }
  };

  // --- render ---
  return (
    <BuilderContext.Provider value={{
      isAdmin,
      page,
      selectedElementIds,
      setSelectedElementIds,
      updateElement,
      updateElements,
      deleteElements,
      deleteElement,
      addElement,
      updatePage,
      refresh: fetchPage,
      site_identifier,
      collectionNames,
      previewMode,
      setPreviewMode,
      viewWidth,
      selectionBox,
      setSelectionBox,
      clipboard,
      copySelection,
      paste,
      handleGlobalContextMenu: handleContextMenu,
      handleElementContextMenu: (e, elementId) => {
        if (!isAdmin) {
          const element = page?.elements.find(el => el.id === elementId);
          if (element?.clickAction === 'copy') {
            e.preventDefault();
            e.stopPropagation();

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
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ type: 'element', x: e.clientX, y: e.clientY, elementId });
      },
    }}>
      <div
        className="min-h-screen w-full relative overflow-hidden"
        style={{
          background: '#050505',
          '--primary': page?.theme_color || 'var(--primary)',
        } as any}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onMouseDown={(e) => {
          if (e.button !== 0) return; // Only left click

          const target = e.target as HTMLElement;

          // do not start selection if clicking interactive builder ui
          const clickedUI = !!(
            target.closest('.builder-toolbox') ||
            target.closest('.builder-context-menu') ||
            target.closest('.widget-property-editor') ||
            target.closest('.global-context-menu')
          );

          const clickedHandle = target.classList.contains('resize-handle') || !!(target as HTMLElement).dataset.handle;

          if (clickedUI || clickedHandle) return;
        }}
        onClick={(e) => {
          const isCanvas = e.target === e.currentTarget ||
            (e.target as HTMLElement).classList.contains('canvas-background') ||
            (e.target as HTMLElement).id === 'builder-canvas';
          if (isCanvas) {
            setSelectedElementIds([]);
            setContextMenu(null);
          }
        }}
        ref={containerRef}
      >
        {loading ? (
          <div className="h-screen flex items-center justify-center">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
              <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
              <div className="w-3 h-3 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
            </div>
          </div>
        ) : !page ? (
          <div className="h-screen flex flex-col items-center justify-center text-white lowercase p-6 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-lg">
              <h1 className="text-2xl font-bold mb-2 text-red-500">
                failed to load page
              </h1>
              <p className="text-white/70 mb-6">
                {isAdmin ? `could not find a page for "${site_identifier}"` : 'the server blocked access to this page.'}
              </p>

              {!isAdmin && (
                <div className="text-left bg-black/30 p-4 rounded-lg mb-6 font-mono text-xs text-white/50">
                  <p>diagnosis: public role missing permissions</p>
                  <p>fix: nocobase admin {'>'} roles {'>'} public {'>'} {collectionNames.website} {'>'} view</p>
                </div>
              )}

              {isAdmin ? (
                <div className="space-y-3 w-full">
                  <button
                    onClick={async () => {
                      try {
                        await api.createRecord(collectionNames.website, {
                          title: 'home',
                          slug: 'home',
                          site: site_identifier,
                          is_home: true,
                          theme_color: 'var(--primary)',
                          background: '#050505',
                          elements: JSON.stringify([])
                        });
                        toast.success(`home page created for ${site_identifier}`);
                        fetchPage();
                      } catch (e: any) {
                        toast.error(`failed: ${e.message}`);
                      }
                    }}
                    className="w-full py-3 px-6 rounded-xl selected-icon-btn font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    create home page
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="w-full py-3 px-6 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 active:scale-[0.98] transition-all"
                >
                  login to admin
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {previewMode === 'desktop' ? (
              <div className="w-full min-h-screen relative">
                <PageRenderer />
                {isAdmin && <BuilderToolbox />}
              </div>
            ) : (
              <div className={`w-full min-h-screen relative ${isAdmin ? 'flex justify-center items-start pt-12 pb-24 bg-[#050505] overflow-auto custom-scrollbar' : ''}`}>
                <div
                  className="preview-sandbox-wrapper relative transition-all duration-500 flex-shrink-0"
                  style={(() => {
                    // in public view (non-admin), always fill the screen
                    if (!isAdmin) return { width: '100%', minHeight: '100vh', position: 'relative' as const };

                    // in builder view, constrain width for layout context but keep it clean
                    if (previewMode === 'mobile') return {
                      width: 430,
                      height: 932,
                      position: 'relative' as const,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '40px',
                      overflow: 'hidden',
                      boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                      backgroundColor: '#000'
                    };
                    return {
                      width: 834,
                      height: 1112,
                      position: 'relative' as const,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '24px',
                      overflow: 'hidden',
                      boxShadow: '0 0 50px rgba(0,0,0,0.5)',
                      backgroundColor: '#000'
                    };
                  })()}
                >
                  <PageRenderer />
                </div>
                {isAdmin && <BuilderToolbox />}
              </div>
            )}
          </>
        )}

        {/* always rendered if admin - very high z-index for menus */}
        {isAdmin && contextMenu?.type === 'global' && (
          <GlobalContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
          />
        )}

        {isAdmin && contextMenu?.type === 'element' && page?.elements.find(el => el.id === contextMenu.elementId) && (
          <ElementContextMenu
            element={page.elements.find(el => el.id === contextMenu.elementId)!}
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>

      <AdminLoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={handleAdminLogin}
      />

      {/* global styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
 body { font-family: 'Varela Round', sans-serif; }

 @keyframes bounceUp {
 0% { transform: translateY(30px); opacity: 0; }
 60% { transform: translateY(-5px); opacity: 1; }
 100% { transform: translateY(0); opacity: 1; }
 }

 .animate-bounce-up {
 animation: bounceUp 0.5s ease-out forwards;
 }

 .element-visible {
 animation: bounceUp 0.5s ease-out forwards;
 }

 /* preview sandbox overrides */
 .preview-sandbox { display: block; }
 .preview-sandbox .canvas-background { min-height: unset !important; height: 100% !important; }
  `}} />
    </BuilderContext.Provider>
  );
}