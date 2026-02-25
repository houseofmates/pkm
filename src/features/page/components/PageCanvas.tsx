import { useCallback, useEffect, useMemo, useState } from 'react';
import GridLayout, { type LayoutItem } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useWindowSize } from 'react-use';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DataEmbed } from '@/components/DataEmbed/DataEmbed';
import type { DataEmbedProps } from '@/components/DataEmbed/DataEmbed';
import { useCollections } from '@/hooks/use-collections';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import { useNavigate, useParams } from 'react-router-dom';
import { useDebounce } from 'react-use';
import { GripVertical, Database as DatabaseIcon, TextCursorInput, Trash2, RefreshCw, ArrowLeft } from 'lucide-react';

type BlockType = 'text' | 'database';
type EmbedView = NonNullable<DataEmbedProps['view']>;

interface TextBlock {
  id: string;
  type: 'text';
  title?: string;
  content: string;
}

interface DatabaseBlock {
  id: string;
  type: 'database';
  title?: string;
  collection?: string;
  view?: EmbedView;
  limit?: number;
}

type DocumentBlock = TextBlock | DatabaseBlock;

interface DocumentState {
  title: string;
  blocks: DocumentBlock[];
  layout: LayoutItem[];
}

interface DocumentConfig {
  title?: string;
  icon?: string;
  iconType?: string;
  color?: string;
}

const EMBED_VIEW_OPTIONS: { value: EmbedView; label: string }[] = [
  { value: 'table', label: 'table' },
  { value: 'gallery', label: 'gallery' },
  { value: 'board', label: 'board' },
  { value: 'calendar', label: 'calendar' },
  { value: 'chart', label: 'chart' },
];

const WIDTH_OPTIONS = [1, 2, 3, 4];

const CONFIG_PREFIX = 'canvas-config-';

const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function PageCanvas() {
  const { width } = useWindowSize();
  const navigate = useNavigate();
  const { id } = useParams();
  const storageKey = useMemo(() => (id ? `canvas-content-${id}` : 'canvas-content'), [id]);
  const { collections, refresh } = useCollections();

  const loadDocumentConfig = (id: string) => {
    const configKey = `${CONFIG_PREFIX}${id}`;
    const config = storageManager.getItem(configKey);
    return config ? JSON.parse(config) : undefined;
  };

  const saveDocumentConfig = (id: string, config: DocumentConfig) => {
    const configKey = `${CONFIG_PREFIX}${id}`;
    storageManager.setItem(configKey, JSON.stringify(config));
  };

  const [documentState, setDocumentState] = useState<DocumentState>(() => {
    const overrideTitle = id ? loadDocumentConfig(id)?.title : undefined;
    return loadDocument(storageKey, overrideTitle);
  });
  const [pendingSave, setPendingSave] = useState(false);

  useEffect(() => {
    const overrideTitle = id ? loadDocumentConfig(id)?.title : undefined;
    setDocumentState(loadDocument(storageKey, overrideTitle));
    setPendingSave(false);
  }, [storageKey, id]);

  useEffect(() => {
    setDocumentState((prev) => ({ ...prev, layout: ensureLayoutForBlocks(prev.blocks, prev.layout) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDebounce(() => {
    if (!pendingSave) return;
    try {
      storageManager.setItem(storageKey, JSON.stringify(documentState));
    } catch (error) {
      secureLogger.error('Failed to persist document', error);
    }
    setPendingSave(false);
  }, 500, [pendingSave, documentState, storageKey]);

  const gridWidth = useMemo(() => {
    if (!width) return 960;
    return Math.min(Math.max(width - 80, 360), 1400);
  }, [width]);

  const updateDoc = useCallback((updater: (prev: DocumentState) => DocumentState) => {
    setDocumentState((prev) => {
      const next = updater(prev);
      return { ...next, layout: ensureLayoutForBlocks(next.blocks, next.layout) };
    });
    setPendingSave(true);
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    updateDoc((prev) => ({ ...prev, title: value }));
    if (id) {
      saveDocumentConfig(id, { title: value });
    }
  }, [id, updateDoc]);

  const handleLayoutChange = useCallback((layout: LayoutItem[]) => {
    updateDoc((prev) => ({ ...prev, layout: [...layout] }));
  }, [updateDoc]);

  const addTextBlock = () => {
    updateDoc((prev) => {
      const { block, layout } = createTextBlock(prev.layout);
      return { ...prev, blocks: [...prev.blocks, block], layout: [...prev.layout, layout] };
    });
  };

  const addDatabaseBlock = () => {
    updateDoc((prev) => {
      const { block, layout } = createDatabaseBlock(prev.layout);
      return { ...prev, blocks: [...prev.blocks, block], layout: [...prev.layout, layout] };
    });
  };

  const updateBlock = (blockId: string, patch: Partial<DocumentBlock>) => {
    updateDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => (block.id === blockId ? { ...block, ...patch } as DocumentBlock : block)),
    }));
  };

  const removeBlock = (blockId: string) => {
    updateDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((block) => block.id !== blockId),
      layout: prev.layout.filter((item) => item.i !== blockId),
    }));
  };

  const convertBlock = (blockId: string, type: BlockType) => {
    updateDoc((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== blockId) return block;
        if (type === 'text') {
          return {
            id: blockId,
            type: 'text',
            title: block.title,
            content: block.type === 'text' ? block.content : '<p></p>',
          } satisfies TextBlock;
        }
        return {
          id: blockId,
          type: 'database',
          title: block.title,
          view: 'table',
          limit: 20,
        } satisfies DatabaseBlock;
      }),
    }));
  };

  const updateBlockWidth = (blockId: string, widthUnits: number) => {
    updateDoc((prev) => ({
      ...prev,
      layout: prev.layout.map((item) => (item.i === blockId ? { ...item, w: Math.min(Math.max(widthUnits, 1), 4) } : item)),
    }));
  };

  const docLayout = documentState.layout;

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col overflow-hidden">
      <header className="shrink-0 bg-[#050505] z-10 flex flex-col gap-3 px-5 pt-4 pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={documentState.title}
            onChange={(event) => handleTitleChange(event.target.value)}
            placeholder="untitled document"
            className="flex-1 min-w-[200px] bg-white/5 border-white/10 text-base font-semibold"
          />
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={addTextBlock} className="gap-2">
              <TextCursorInput className="h-4 w-4" />
              text block
            </Button>
            <Button size="sm" onClick={addDatabaseBlock} className="gap-2">
              <DatabaseIcon className="h-4 w-4" />
              database view
            </Button>
            <Button variant="ghost" size="sm" onClick={() => refresh()} title="refresh database list">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Separator className="bg-white/10" />
      </header>

      <main className="flex-1 overflow-auto px-5 pb-8">
        <div className="mx-auto" style={{ maxWidth: gridWidth }}>
          <GridLayout
            className="layout"
            cols={4}
            rowHeight={120}
            width={gridWidth}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            layout={docLayout}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".block-handle"
            isDraggable
            isResizable
            compactType="vertical"
            preventCollision={false}
          >
            {documentState.blocks.map((block) => {
              const layoutItem = docLayout.find((item) => item.i === block.id);
              const currentWidth = layoutItem?.w ?? 1;
              return (
                <div key={block.id} className="h-full">
                  <article className="h-full flex flex-col rounded-2xl border border-white/10 bg-black/40 backdrop-blur shadow-xl overflow-hidden">
                    <header className="block-handle flex items-center justify-between gap-3 px-3 py-2 border-b border-white/5 bg-white/5">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/70">
                        <GripVertical className="h-4 w-4 text-white/40" />
                        <Badge variant="outline" className="text-[10px]">
                          {block.type === 'text' ? 'text block' : 'database view'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={String(currentWidth)} onValueChange={(value) => updateBlockWidth(block.id, Number(value))}>
                          <SelectTrigger className="h-7 w-[90px] text-xs">
                            <SelectValue placeholder="width" />
                          </SelectTrigger>
                          <SelectContent>
                            {WIDTH_OPTIONS.map((option) => (
                              <SelectItem key={option} value={String(option)}>
                                {option} col{option > 1 ? 's' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={block.type === 'text' ? 'convert to database view' : 'convert to text block'}
                          onClick={() => convertBlock(block.id, block.type === 'text' ? 'database' : 'text')}
                        >
                          {block.type === 'text' ? <DatabaseIcon className="h-4 w-4" /> : <TextCursorInput className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeBlock(block.id)} title="delete block">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </header>

                    <div className="flex-1 p-3 flex flex-col gap-3 overflow-hidden">
                      <Input
                        value={block.title || ''}
                        onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                        placeholder={block.type === 'text' ? 'section title (optional)' : 'view title'}
                        className="bg-white/5 border-white/10 text-sm"
                      />

                      {block.type === 'text' ? (
                        <div className="flex-1 min-h-0">
                          <div className="h-full rounded-xl border border-white/5 bg-black/30 px-3 py-2">
                            <BlockEditor
                              content={block.content}
                              onChange={(value) => updateBlock(block.id, { content: value })}
                              className="min-h-[180px]"
                              placeholder="type '/' for commands"
                            />
                          </div>
                        </div>
                      ) : (
                        <DatabaseEmbedBlock block={block} onUpdate={(patch) => updateBlock(block.id, patch)} collections={collections} />
                      )}
                    </div>
                  </article>
                </div>
              );
            })}
          </GridLayout>
        </div>
      </main>
    </div>
  );
}

interface DatabaseEmbedProps {
  block: DatabaseBlock;
  onUpdate: (patch: Partial<DatabaseBlock>) => void;
  collections: Array<{ name: string; title?: string }>;
}

function DatabaseEmbedBlock({ block, onUpdate, collections }: DatabaseEmbedProps) {
  const sortedCollections = useMemo(
    () => [...collections].sort((a, b) => (a.title || a.name).localeCompare(b.title || b.name)),
    [collections]
  );

  const selectedCollection = sortedCollections.find((col) => col.name === block.collection);

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-[240px]">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={block.collection} onValueChange={(value) => onUpdate({ collection: value })}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="select database" />
          </SelectTrigger>
          <SelectContent>
            {sortedCollections.map((collection) => (
              <SelectItem key={collection.name} value={collection.name}>
                {collection.title || collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={block.view || 'table'} onValueChange={(value: EmbedView) => onUpdate({ view: value })}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="view type" />
          </SelectTrigger>
          <SelectContent>
            {EMBED_VIEW_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs uppercase tracking-wide text-white/60">rows</label>
        <Input
          type="number"
          min={5}
          max={200}
          value={block.limit ?? 20}
          onChange={(event) => onUpdate({ limit: Number(event.target.value) })}
          className="w-24 bg-white/5 border-white/10 text-sm"
        />
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-white/10 bg-black/20 overflow-hidden">
        {selectedCollection ? (
          <DataEmbed
            collection={selectedCollection.name}
            view={block.view || 'table'}
            limit={block.limit || 20}
            height="100%"
            className="h-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-white/40">
            select a database to render
          </div>
        )}
      </div>
    </div>
  );
}

function createTextBlock(existingLayout: LayoutItem[]): { block: TextBlock; layout: LayoutItem } {
  const id = makeId();
  return {
    block: {
      id,
      type: 'text',
      title: 'text block',
      content: '<p></p>',
    },
    layout: defaultLayoutForBlock(id, existingLayout, 'text'),
  };
}

function createDatabaseBlock(existingLayout: LayoutItem[]): { block: DatabaseBlock; layout: LayoutItem } {
  const id = makeId();
  return {
    block: {
      id,
      type: 'database',
      title: 'database view',
      view: 'table',
      limit: 20,
    },
    layout: defaultLayoutForBlock(id, existingLayout, 'database'),
  };
}

function defaultLayoutForBlock(id: string, existingLayout: LayoutItem[], type: BlockType): LayoutItem {
  const nextY = getNextY(existingLayout);
  const defaultWidth = type === 'database' ? 4 : 2;
  const defaultHeight = type === 'database' ? 9 : 6;
  return {
    i: id,
    x: 0,
    y: nextY,
    w: defaultWidth,
    h: defaultHeight,
    minW: 1,
    minH: 4,
    maxW: 4,
  };
}

function getNextY(layout: LayoutItem[]): number {
  if (layout.length === 0) return 0;
  return Math.max(...layout.map((item) => item.y + item.h)) + 1;
}

function createDefaultDocument(title = 'untitled document'): DocumentState {
  const { block, layout } = createTextBlock([]);
  return {
    title,
    blocks: [block],
    layout: [layout],
  };
}

function ensureLayoutForBlocks(blocks: DocumentBlock[], layout: LayoutItem[]): LayoutItem[] {
  const result = layout.filter((item) => blocks.some((block) => block.id === item.i));
  blocks.forEach((block) => {
    if (!result.find((item) => item.i === block.id)) {
      result.push(defaultLayoutForBlock(block.id, result, block.type));
    }
  });
  return result;
}

function loadDocument(key: string, overrideTitle?: string): DocumentState {
  if (typeof window === 'undefined') return createDefaultDocument(overrideTitle);
  try {
    const stored = storageManager.getItem(key);
    if (!stored) return createDefaultDocument(overrideTitle);
    const parsed = JSON.parse(stored);
    const blocks = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
    if (blocks.length === 0) return createDefaultDocument(overrideTitle);
    return {
      title: overrideTitle ?? (typeof parsed?.title === 'string' ? parsed.title : 'untitled document'),
      blocks,
      layout: ensureLayoutForBlocks(blocks, Array.isArray(parsed?.layout) ? parsed.layout : []) as LayoutItem[],
    };
  } catch (error) {
    secureLogger.error('Failed to load document content', error);
    return createDefaultDocument(overrideTitle);
  }
}
