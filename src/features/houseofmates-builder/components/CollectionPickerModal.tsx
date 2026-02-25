import { useState, useEffect } from 'react';
import { api } from '@/api/nocobase-client';
import { Database, Table, LayoutGrid, Calendar, BarChart3, Layers, X, Loader2, AlertCircle, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAppSetting } from '@/hooks/use-app-setting';

interface Props {
  onSelect: (collectionName: string, viewType: string) => void;
  onClose: () => void;
}

interface Collection {
  name: string;
  title: string;
}

const VIEW_TYPES = [
  { id: 'table', label: 'table', icon: Table },
  { id: 'kanban', label: 'kanban', icon: Layers },
  { id: 'gallery', label: 'gallery', icon: LayoutGrid },
  { id: 'calendar', label: 'calendar', icon: Calendar },
  { id: 'gantt', label: 'gantt', icon: BarChart3 },
  { id: 'chart', label: 'chart', icon: BarChart3 },
];

export function CollectionPickerModal({ onSelect, onClose }: Props) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedViewType, setSelectedViewType] = useState<string | null>(null);

  const [metadata] = useAppSetting<Record<string, any>>('collection_metadata', {});

  useEffect(() => {
    const fetchCollections = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.listCollections();
        const data = Array.isArray(res) ? res : (res as { data?: any[] }).data || [];
        // filter out system collections
        const userCollections = data.filter((c: any) =>
          !c.name.startsWith('_') &&
          !['users', 'roles', 'authenticators', 'jobs', 'attachments'].includes(c.name)
        );
        setCollections(userCollections.map((c: any) => ({ name: c.name, title: c.title || c.name })));
      } catch (e: any) {
        secureLogger.error('Failed to fetch collections:', e);
        if (e.response?.status === 401) {
          setError('Authentication failed. Please re-enter your API key.');
        } else if (e.message.includes('Network')) {
          setError('Database unavailable. Please check your connection.');
        } else {
          setError(`Failed to load collections: ${e.message}`);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, []);
  useEffect(() => {
    if (selectedCollection) {
      const defView = metadata[selectedCollection]?.default_view;
      if (defView && VIEW_TYPES.find(v => v.id === defView)) {
        setSelectedViewType(defView);
      }
    }
  }, [selectedCollection, metadata]);

  const handleConfirm = () => {
    if (selectedCollection && selectedViewType) {
      onSelect(selectedCollection, selectedViewType);
      toast.success(`Database view added: ${selectedCollection}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 builder-modal" onClick={onClose}>
      <div
        className="bg-[#050505] border border-white/10 rounded-2xl p-6 w-[480px] max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-[var(--primary)] lowercase flex items-center gap-2">
            <Database className="w-5 h-5" />
            add database view
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 text-white/60">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="lowercase">loading collections...</p>
          </div>
        )}

        {/* error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 text-red-400">
            <AlertCircle className="w-8 h-8 mb-4" />
            <p className="text-sm text-center lowercase">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm lowercase"
            >
              retry
            </button>
          </div>
        )}

        {/* collection selection */}
        {!loading && !error && (
          <>
            <div className="mb-4">
              <label className="block text-white/60 text-sm lowercase mb-2">select collection</label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                {collections.length === 0 ? (
                  <p className="col-span-2 text-white/40 text-sm py-4 text-center lowercase">
                    no collections found
                  </p>
                ) : (
                  collections.map(col => (
                    <button
                      key={col.name}
                      onClick={() => setSelectedCollection(col.name)}
                      className={`p-3 rounded-lg text-left text-sm lowercase transition-colors ${selectedCollection === col.name
                        ? 'selected-icon-btn font-bold'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                    >
                      <p className="font-medium">{col.title}</p>
                      <p className="text-xs opacity-60">{col.name}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* view type selection */}
            {selectedCollection && (
              <div className="mb-6">
                <label className="block text-white/60 text-sm lowercase mb-2">visualization type</label>
                <div className="grid grid-cols-3 gap-2">
                  {VIEW_TYPES.map(vt => (
                    <button
                      key={vt.id}
                      onClick={() => setSelectedViewType(vt.id)}
                      className={`p-3 rounded-lg flex flex-col items-center gap-2 text-sm lowercase transition-colors ${selectedViewType === vt.id
                        ? 'selected-icon-btn font-bold'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                    >
                      <vt.icon className="w-5 h-5" />
                      <div className="flex items-center gap-1">
                        {vt.label}
                        {metadata[selectedCollection!]?.default_view === vt.id && (
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* confirm button */}
            <button
              onClick={handleConfirm}
              disabled={!selectedCollection || !selectedViewType}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-black font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100 lowercase"
            >
              add view
            </button>
          </>
        )}
      </div>
    </div>
  );
}