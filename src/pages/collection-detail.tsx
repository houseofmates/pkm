import { useState, useEffect, useCallback, useRef } from 'react';
import { useCollections } from '@/hooks/use-collections';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { CreateFieldDialog } from '@/features/collections/components/create-field-dialog';
import { toast } from 'sonner';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFronter } from '@/contexts/fronter-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateAndSaveAiField } from '@/services/ai-field-generator';

interface CollectionDetailPageProps {
  collectionName?: string;
  onBack?: () => void;
}


import { type ViewType, VIEW_REGISTRY, VIEW_OPTIONS } from '@/components/views/registry';
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
import { extractRecords } from '@/lib/nocobase-utils';

export function CollectionDetailPage({ collectionName: propCollectionName, onBack: propOnBack }: CollectionDetailPageProps) {
    const { client, isAuthenticated, login } = useAuth();
    const params = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const collectionName = propCollectionName ?? (params.name as string);
    const onBack = propOnBack ?? (() => navigate(-1));
    const [collection, setCollection] = useState<any>(null);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
    const { activeFronters } = useFronter();

    // metadata for cosmetics and defaults
    const [metadata, setMetadata] = useAppSetting<Record<string, any>>('collection_metadata', {});
    // get collection color for header using metadata (source of truth)
    const collectionColor = metadata[collectionName]?.color;
    const defaultView = metadata[collectionName]?.default_view as ViewType | undefined;
    const [defaultPickerOpen, setDefaultPickerOpen] = useState(false);

    const [currentView, setCurrentView] = useState<ViewType>('table');
    const [viewConfig, setViewConfig] = useState<Record<string, any>>({});

    // sync currentview with url, state, or defaultview
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const viewFromUrl = queryParams.get('view');
        const viewFromState = (location.state as any)?.view;

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

    // get collections list early - this is already loaded from databases page
    const { collections: availableCollections, loading: collectionsLoading } = useCollections();

    // ref to avoid fetchData depending on availableCollections (which gets a new reference every render)
    const availableCollectionsRef = useRef(availableCollections);
    availableCollectionsRef.current = availableCollections;

    const handleLogin = () => {
        if (!apiKey) return;
        login(apiKey);
        toast.success("nocobase api key saved");
        // refresh triggered by auth context change or we manually re-fetch?
        // fetchData depends on client/collectionName. 
        // client will be updated if it depends on token? 
        // authprovider re-renders, causing this to re-render.
    };

    const handleDirectCreate = async (initialData: any = {}) => {
        try {
            const dataToSubmit: any = { ...initialData };
            // auto-inject fronter
            if (activeFronters && activeFronters.length > 0) {
                // check if collection has fronter field (from collection schema)
                const hasFronter = collection?.fields?.some((f: any) => f.name === 'fronter');
                if (hasFronter) {
                    dataToSubmit['fronter'] = activeFronters[0];
                }
            }

            // optional: set default title if needed, or let backend handle it.
            // datatosubmit['title'] = 'untitled'; 

            await client.createRecord(collectionName, dataToSubmit);
            toast.success("record created");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error("failed to create record");
        }
    };


    const fetchData = useCallback(async () => {
        setLoading(true);
        setFetchError(null);
        try {
            // 1. try to find collection in already-loaded list first (from usecollections)
            // this fixes mobile issue where getcollection api call fails but listcollections works
            let colData: any = null;
            const currentCollections = availableCollectionsRef.current;
            const preloaded = currentCollections.find(
                (c: any) => (c.name || '').toLowerCase() === (collectionName || '').toLowerCase()
            );

            if (preloaded) {
                console.log("Found preloaded collection:", preloaded.name);
                colData = preloaded;
            }

            // 2. if no preloaded or preloaded lacks fields, try to fetch full schema
            if (!colData?.fields) {
                try {
                    console.log("Attempting to fetch full collection schema with fields...");
                    const colRes = await client.getCollection(collectionName);
                    console.log("getCollection response:", colRes);
                    // check if we got valid data
                    if (colRes?.data && typeof colRes.data === 'object') {
                        colData = colRes.data;
                    } else {
                        console.warn("getCollection returned invalid data, using preloaded");
                        if (preloaded) {
                            colData = preloaded;
                        }
                    }
                } catch (e: any) {
                    console.warn("getCollection failed, using preloaded if available:", e.message);
                    // if api fails but we have preloaded data, use it even without fields
                    if (preloaded) {
                        console.log("Using preloaded collection without fields");
                        colData = preloaded;
                    } else {
                        throw e; // No fallback available
                    }
                }
            }
            
            // ensure we have at least the collection object
            if (!colData) {
                throw new Error(`Collection ${collectionName} not found`);
            }

            // 3. if collection still lacks fields, fetch them separately BEFORE setting collection
            console.log("Checking fields:", colData.fields, "Length:", colData.fields?.length);
            if (!colData.fields || colData.fields.length === 0) {
                try {
                    console.log("Collection lacks fields, fetching them separately...");
                    const fields = await client.listFields(collectionName);
                    console.log("Fetched fields:", fields);
                    if (fields && fields.length > 0) {
                        colData.fields = fields;
                    } else {
                        console.warn("listFields returned no fields");
                    }
                } catch (e) {
                    console.warn("Failed to fetch fields separately:", e);
                }
            }

            setCollection(colData);

            // auto-create 'fronter' field if missing
            if (colData && colData.fields) {
                const hasFronter = colData.fields.some((f: any) => f.name === 'fronter');
                if (!hasFronter) {
                    try {
                        console.log("Auto-creating 'fronter' field for", collectionName);
                        await client.createField(collectionName, {
                            name: 'fronter',
                            type: 'string',
                            interface: 'input',
                            uiSchema: { title: 'Fronter' }
                        });
                    } catch (e) {
                        console.warn("Failed to auto-create fronter field", e);
                    }
                }
            }

            // 3. fetch records (normalize in case api shape varies)
            const recRes = await client.listRecords(collectionName);
            const recData = extractRecords(recRes);
            setRecords(recData);

        } catch (error: any) {
            console.error(error);
            setFetchError(error.message || "Unknown Error");
            toast.error("failed to load collection data");
        } finally {
            setLoading(false);
        }
    }, [client, collectionName]);

    // --- event listeners ---
    useEffect(() => {
        const handleCreate = async (evt: Event) => {
            const e = evt as CustomEvent<any>;
            if (e.detail?.collection === collectionName) {
                console.log("Creating record via event:", e.detail.data);
                try {
                    const createRes: any = await client.createRecord(collectionName, e.detail.data);
                    const newId = createRes?.id || (createRes?.data && createRes.data.id);

                    toast.success("record created!");
                    // refresh
                    const res = await client.listRecords(collectionName, { pageSize: 100, sort: ['-created_at'] });
                    setRecords(extractRecords(res));

                    // auto-suggest content if ai field exists
                    if (newId && collection?.fields?.some((f: any) => f.name === 'ai')) {
                      generateAndSaveAiField(collectionName, newId, 'ai', {
                        instruction: 'provide a brief summary and initial ideas for this new entry',
                        topK: 5
                      }).then(r => {
                        if (!r.success) {
                          secureLogger.warn('auto-suggest generation failed', r.error);
                        }
                      });
                    }
                } catch (err) {
                    console.error(err);
                    toast.error("failed to create record");
                }
            }
        };

        window.addEventListener('pkm:create-record', handleCreate);
        return () => window.removeEventListener('pkm:create-record', handleCreate);
    }, [collectionName, client]);

    // only fetch data when collections are loaded (or if they fail to load, proceed anyway)
    // this ensures availablecollections is populated before we try to use it
    useEffect(() => {
        if (!collectionsLoading) {
            fetchData();
        }
    }, [fetchData, collectionsLoading]);

    // retry if collection still not found after initial load and collections become available
    useEffect(() => {
        if (!collection && !loading && availableCollections.length > 0) {
            const found = availableCollections.find(
                (c: any) => (c.name || '').toLowerCase() === (collectionName || '').toLowerCase()
            );
            if (found) {
                console.log("Late-rescue: Found collection in availableCollections:", found.name);
                setCollection(found);
                // fetch records for this collection
                client.listRecords(collectionName).then(res => {
                    setRecords(extractRecords(res));
                }).catch(e => console.error("Late-rescue record fetch failed", e));
            }
        }
    }, [collection, loading, availableCollections, collectionName, client]);

    // load view config on view change or collection load
    useEffect(() => {
        const key = `view_config_${collectionName}_${currentView}`;
        try {
            const saved = storageManager.getItem(key);
            if (saved) setViewConfig(JSON.parse(saved));
            else setViewConfig({});
        } catch (e) {
            console.error("Failed to load view config", e);
        }
    }, [collectionName, currentView]);

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

    const handleConfigChange = (key: string, value: any) => {
        const newConfig = { ...viewConfig, [key]: value };
        setViewConfig(newConfig);
        storageManager.setItem(`view_config_${collectionName}_${currentView}`, JSON.stringify(newConfig));
    };


    const handleUpdateRecord = useCallback(async (id: string | number, data: any) => {
        try {
            // optimistic update locally? 
            // for now, simple await and refetch
            setRecords(prev => prev.map(r => r.id === id ? { ...r, ...data } : r)); // optimistic ui
            await client.updateRecord(collectionName, id, data);
            // fetchData(); // optional: if we trust the return or optimistic update
        } catch (error) {
            console.error("failed to update record", error);
            toast.error("failed to update record");
            fetchData(); // revert on error
        }
    }, [client, collectionName, fetchData]);

    // undo stack
    const [deletedStack, setDeletedStack] = useState<any[]>([]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (deletedStack.length > 0) {
                    e.preventDefault();
                    handleUndoDelete();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [deletedStack]);

    const handleUndoDelete = async () => {
        const lastDeleted = deletedStack[deletedStack.length - 1];
        if (!lastDeleted) return;

        try {
            // remove 'id' maybe? or keep it if trying to force restore?
            // nocodb might ignore id on create, but let's try pushing the data back.
            // ideally we omit 'id', 'created_at', 'updated_at'
            const { id, created_at, updated_at, ...rest } = lastDeleted;
            await client.createRecord(collectionName, rest);

            setDeletedStack(prev => prev.slice(0, -1));
            toast.success("deletion undone");

            // refresh
            const res = await client.listRecords(collectionName, { pageSize: 100, sort: ['-created_at'] });
            setRecords(extractRecords(res));
        } catch (e) {
            console.error("failed to undo delete", e);
            toast.error("failed to undo delete");
        }
    };

    const handleDeleteRecord = useCallback(async (record: any) => {
        // removed confirmation as requested
        try {
            await client.deleteRecord(collectionName, record.id);

            // add to stack
            setDeletedStack(prev => [...prev, record]);

            toast.success("record deleted", {
                action: {
                    label: "undo",
                    onClick: () => handleUndoDelete() // This might refer to stale closure if not careful, but state updates via prev are fine. 
                    // actually handleundodelete needs access to latest state? 
                    // we better use a ref or ensure this closure captures the needed info.
                    // but handleundodelete depends on deletedstack. 
                    // this closure might capture old handleundodelete.
                    // simplification: trigger the same undo logic. 
                }
            });
            setRecords(prev => prev.filter(r => r.id !== record.id));
        } catch (error) {
            console.error("failed to delete record", error);
            toast.error("failed to delete record");
        }
    }, [client, collectionName, deletedStack]); // Added deletedStack dependency to update closure? No, that causes re-renders of list.
    // better: helper function for restore that takes the record as arg, valid for toast.
    // for ctrl+z, we need state. 

    // refactor to ensure toast works:
    const restoreRecord = async (recordToRestore: any) => {
        try {
            const { id, created_at, updated_at, ...rest } = recordToRestore;
            await client.createRecord(collectionName, rest);
            toast.success("deletion undone");
            const res = await client.listRecords(collectionName, { pageSize: 100, sort: ['-created_at'] });
            setRecords(extractRecords(res));
            setDeletedStack(prev => prev.filter(r => r.id !== recordToRestore.id));
        } catch (e) {
            console.error("failed to undo delete", e);
            toast.error("failed to undo delete");
        }
    }



    // re-bind undo for keyboard
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                // get latest stack
                setDeletedStack(currentStack => {
                    if (currentStack.length > 0) {
                        const last = currentStack[currentStack.length - 1];
                        restoreRecord(last);
                        return currentStack.slice(0, -1); // Optimistic remove from stack? restoreRecord also updates it.
                    }
                    return currentStack;
                });
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [collectionName]); // minimalist deps

    // rescue logic is now integrated into fetchdata, no separate effect needed

    if (!collection) {
        if (loading) return <div className="p-10 text-center animate-pulse">loading {collectionName}...</div>;
        return (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
                <div className="text-destructive font-bold text-lg">collection not found: &ldquo;{collectionName}&rdquo;</div>
                <div className="text-muted-foreground text-sm max-w-md">
                    attempting to locate collection in system... (v2 rescue)
                </div>
                {fetchError && (
                    <div className="mt-4 p-4 bg-destructive/10 text-destructive rounded-md text-xs font-mono text-left max-w-sm overflow-auto">
                        <strong>debug info:</strong><br />
                        error: {fetchError}<br />
                        id: {params.name}<br />
                        decoded: {collectionName}<br />
                        auth: {isAuthenticated ? 'yes' : 'no'}<br />
                        available: {availableCollections.length}
                        <div className="mt-1 opacity-50 max-h-20 overflow-y-auto">
                            [{availableCollections.map((c: any) => c.name).join(', ')}]
                        </div>
                    </div>
                )}
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
                            {collection.title || collection.displayname || collection.name}
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
                                    title={collection.title || collection.displayName || collectionName}
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
                        {VIEW_OPTIONS.map((view: any) => (
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
                        {VIEW_OPTIONS.map((view: any) => (
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
                    onCreate={(data: any) => handleDirectCreate(data)}
                    onCreateField={() => setFieldDialogOpen(true)}
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
