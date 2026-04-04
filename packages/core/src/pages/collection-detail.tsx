import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useCollectionData } from '@/hooks/use-collection-data';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { storageManager } from '@/lib/storage-manager';
import { CreateFieldDialog } from '@/features/collections/components/create-field-dialog';
import { toast } from 'sonner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFronter } from '@/contexts/fronter-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// bring in shared schema types so we can stop using `any`
import type { Record as SchemaRecord, TableDefinition, FieldDefinition } from '@/schema/types';

interface CollectionDetailPageProps {
  collectionName?: string;
  onBack?: () => void;
}


import { type ViewType, VIEW_REGISTRY, VIEW_OPTIONS } from '@/components/views/registry';
import { type CollectionMetadata } from '@/features/collections/components/collection-dialog';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAppSetting } from '@/hooks/use-app-setting';
import { Star } from 'lucide-react';
import { secureLogger } from '@/lib/secure-logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatabaseSettingsForm } from '@/features/databases/components/database-settings-form';

export function CollectionDetailPage({ collectionName: propCollectionName, onBack: propOnBack }: CollectionDetailPageProps) {
    const { client, isAuthenticated, login } = useAuth();
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const collectionName = propCollectionName ?? (params.name as string);
    const onBack = propOnBack ?? (() => navigate(-1));
    const [apiKey, setApiKey] = useState('');
    const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
    const { activeFronters } = useFronter();

    // metadata for cosmetics and defaults
    const [metadata, setMetadata] = useAppSetting<Record<string, CollectionMetadata>>('collection_metadata', {}, { pollIntervalMs: 3000 });

    // data-layer hook replaces the old manual state and handlers
    const {
      collection,
      records,
      loading,
      fetchError,
      handleDirectCreate,
      handleUpdateRecord,
      handleDeleteRecord,
      handleUndoDelete,
      restoreRecord,
      fetchData,
      setCollection,
      setRecords
    } = useCollectionData(client, collectionName, activeFronters);
    // get collection color for header using metadata (source of truth)
    const collectionColor = metadata[collectionName]?.color;
    const defaultView = metadata[collectionName]?.default_view;
    const [defaultPickerOpen, setDefaultPickerOpen] = useState(false);

    const [currentView, setCurrentView] = useState<ViewType>('table');
    const [viewConfig, setViewConfig] = useState<Record<string, unknown>>({});

    // available collections for debug display
    const [availableCollections, setAvailableCollections] = useState<TableDefinition[]>([]);

    // fetch available collections for debug info
    useEffect(() => {
        if (!client || !isAuthenticated) return;
        client.listCollections({ pageSize: 100 }).then((res: any) => {
            const list = Array.isArray(res?.data) ? res.data : res?.data;
            if (Array.isArray(list)) {
                setAvailableCollections(list as TableDefinition[]);
            }
        }).catch((e: any) => {
            console.warn('Failed to fetch available collections:', e);
        });
    }, [client, isAuthenticated]);

    // sync currentview with url, state, or defaultview
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const viewFromUrl = queryParams.get('view');
        const viewFromState = (location.state as unknown as { view?: string })?.view;

        // priority: url param > location state > user default > 'table'
        const targetView = viewFromUrl || viewFromState || defaultView || 'table';

        if (targetView && targetView in VIEW_REGISTRY) {
            setCurrentView(targetView as ViewType);
        }
    }, [location.search, location.state, defaultView, collectionName]);

    // keyboard shortcut 'v' and right-click for default view picker
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // lowercase 'v' only, no modifiers
            if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable ||
                    target.closest('[contenteditable="true"]');

                if (!isInput) {
                    e.preventDefault();
                    setDefaultPickerOpen(true);
                }
            }
        }

        const handleContextMenu = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            // detect if right-clicked on our view switcher component
            if (target.closest('[data-view-switcher="true"]')) {
                e.preventDefault();
                e.stopPropagation();
                setDefaultPickerOpen(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('contextmenu', handleContextMenu, true); // Use capture to beat other listeners
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', handleContextMenu, true);
        };
    }, []);

    const handleSetDefaultView = (viewId: ViewType) => {
        setMetadata({
            ...metadata,
            [collectionName]: {
                ...(metadata[collectionName] || {}),
                default_view: viewId
            }
        });
        toast.success(`default view set to ${viewId}`);
        setDefaultPickerOpen(false);
    };

    const handleLogin = () => {
        if (!apiKey) return;
        login(apiKey);
        toast.success("nocobase api key saved");
    };

    // load view config on view change or collection load
    useEffect(() => {
        const key = `view_config_${collectionName}_${currentView}`;
        try {
            const saved = storageManager.getItem(key);
            if (saved) setViewConfig(JSON.parse(saved));
            else setViewConfig({});
        } catch (e) {
            secureLogger.error("Failed to load view config", e);
        }
    }, [collectionName, currentView]);


    const handleConfigChange = (key: string, value: unknown) => {
        const newConfig = { ...viewConfig, [key]: value };
        setViewConfig(newConfig);
        storageManager.setItem(`view_config_${collectionName}_${currentView}`, JSON.stringify(newConfig));
    };


    // if the user isn't authenticated we short-circuit before rendering the main collection UI
    if (!isAuthenticated) {
        return (
            <div className="p-4 md:p-8 h-full flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle>connect nocobase</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>api token</Label>
                            <Input
                                type="password"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder="enter nocobase api token"
                            />
                            <p className="text-xs text-muted-foreground">
                                your token is stored locally.
                            </p>
                            <p className="text-xs text-muted-foreground">
                                <strong>note:</strong> accessing via ip address requires re-authentication as localstorage is origin-specific.
                            </p>
                        </div>
                        <Button className="w-full" onClick={handleLogin}>connect</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!collection) {
        if (loading) return <div className="p-10 text-center animate-pulse">loading {collectionName}...</div>;
        return (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
                <div className="text-destructive font-bold text-lg">collection not found</div>
                <div className="text-muted-foreground text-sm max-w-md">
                    the requested collection could not be loaded. please check the name or return to the databases page.
                </div>
                <Button variant="outline" onClick={() => navigate('/databases')}>
                    return to databases
                </Button>
            </div>
        );
    }

    // fix "no fields" flash: if we rescued a collection object but it has no fields (and we are loading),
    // we should wait. the rescued object from sidebar list often lacks 'fields'.
    if (!collection.fields && loading) {
        return <div className="p-10 text-center animate-pulse">loading schema for {collectionName}...</div>;
    }

    const CurrentViewComponent = VIEW_REGISTRY[currentView] || VIEW_REGISTRY['table'];



    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in duration-500">
            {/* header — row 1 (title) + separator aligned to sidebar */}
            <div className="pt-4 shrink-0 bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col">
                <div className="flex items-center justify-between px-4 mb-2 h-10">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="h-10 w-10" onClick={onBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <h2
                            className="text-xl font-bold lowercase tracking-tight"
                            style={{ color: collectionColor }}
                        >
                            {collection.label || collection.name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-10 w-10">
                                    <Settings2 className="h-5 w-5 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <DatabaseSettingsForm
                                    collectionName={collectionName}
                                    title={collection.label || collectionName}
                                    viewConfig={viewConfig}
                                    fields={collection.fields}
                                    currentView={currentView}
                                    onUpdateConfig={handleConfigChange}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <Separator className="mb-2 bg-primary" />
            </div>

            {/* row 2: view selector (below separator) */}
            <div className="px-4 pb-2 shrink-0">
                <Select value={currentView} onValueChange={(v) => setCurrentView(v as ViewType)}>
                    <SelectTrigger
                        className="w-full md:w-[240px] h-9 bg-background/50 backdrop-blur border-input/50"
                        data-view-switcher="true"
                    >
                        <SelectValue placeholder="select view" />
                    </SelectTrigger>
                    <SelectContent align="start">
                        {VIEW_OPTIONS.map((view) => (
                            <SelectItem key={view.id} value={view.id}>
                                <div className="flex items-center gap-2 w-full">
                                    {view.icon && <view.icon className="h-4 w-4 opacity-50 text-primary" />}
                                    <span>{view.label}</span>
                                    {defaultView === view.id && <Star className="h-3 w-3 ml-auto fill-current opacity-50 text-primary" />}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* default view picker dialog (triggered by right-click or 'v') */}
            <Dialog open={defaultPickerOpen} onOpenChange={setDefaultPickerOpen}>
                <DialogContent className="sm:max-w-[300px] p-0 overflow-hidden border-none bg-popover/90 backdrop-blur-xl shadow-2xl">
                    <DialogHeader className="p-4 pb-2">
                        <DialogTitle className="text-sm font-medium lowercase opacity-50">set default view</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col p-1">
                        {VIEW_OPTIONS.map((view) => (
                            <Button
                                key={view.id}
                                variant="ghost"
                                className="justify-start gap-3 h-10 px-3 lowercase font-normal"
                                onClick={() => handleSetDefaultView(view.id as ViewType)}
                            >
                                {view.icon && <view.icon className="h-4 w-4 opacity-50 text-primary" />}
                                <span className="flex-1 text-left">{view.label}</span>
                                {defaultView === view.id && <Star className="h-3 w-3 fill-current text-primary" />}
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* content */}
            <div className="flex-1 overflow-auto p-4 md:p-8">
                <CurrentViewComponent
                    data={records}
                    collection={collection}
                    loading={loading}
                    config={viewConfig}
                    onConfigChange={handleConfigChange}
                    onUpdateRecord={handleUpdateRecord}
                    onDelete={handleDeleteRecord}
                    onCreateRecord={() => handleDirectCreate()}
                    onCreate={(data: Partial<SchemaRecord>) => handleDirectCreate(data)}
                    onCreateField={() => setFieldDialogOpen(true)}
                    onFieldUpdated={fetchData}
                />
            </div>

            {/* field creation dialog - controlled by oncreatefield callback */}
            <CreateFieldDialog
                collectionName={collectionName}
                onFieldCreated={fetchData}
                open={fieldDialogOpen}
                onOpenChange={setFieldDialogOpen}
            />
        </div >
    );
}
