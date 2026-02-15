import { useState, useEffect } from 'react';
import { api } from '@/api/nocobase-client';
import { Database, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface Props {
    collectionName: string;
    viewType: 'table' | 'kanban' | 'gallery' | 'calendar' | 'gantt' | 'chart';
    width?: number;
    height?: number;
    sort?: any;
    filter?: any;
    visibleFields?: string[];
}

export function DatabaseViewElement({ collectionName, viewType, width = 400, height = 300, sort, filter, visibleFields }: Props) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fields, setFields] = useState<any[]>([]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch collection schema for field info
            const colRes = await api.getCollection(collectionName);
            const colFields = colRes?.data?.fields || [];
            setFields(colFields.filter((f: any) => !f.hidden && !f.name.startsWith('_')));

            // Fetch records with sort and filter
            const res = await api.listRecords(collectionName, {
                pageSize: 50,
                sort,
                filter
            });
            const records = res?.data || res?.data?.data || [];
            setData(Array.isArray(records) ? records : []);
        } catch (e: any) {
            console.error('DatabaseViewElement error:', e);
            if (e.response?.status === 401) {
                setError('Authentication required');
            } else if (e.response?.status === 404) {
                setError('Collection not found');
            } else {
                setError('Database unavailable');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [collectionName, JSON.stringify(sort), JSON.stringify(filter)]);

    // Error State
    if (error) {
        return (
            <div
                className="flex flex-col items-center justify-center bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 p-6"
                style={{ width, height }}
            >
                <AlertCircle className="w-8 h-8 mb-3" />
                <p className="text-sm lowercase mb-3">{error}</p>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm lowercase transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    retry
                </button>
            </div>
        );
    }

    // Loading State
    if (loading) {
        return (
            <div
                className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-xl text-white/60"
                style={{ width, height }}
            >
                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                <p className="text-sm lowercase">loading {collectionName}...</p>
            </div>
        );
    }

    // Render based on view type
    const renderView = () => {
        switch (viewType) {
            case 'table':
                return <TableView data={data} fields={fields} visibleFields={visibleFields} />;
            case 'kanban':
                return <KanbanPlaceholder collection={collectionName} count={data.length} />;
            case 'gallery':
                return <GalleryView data={data} fields={fields} visibleFields={visibleFields} />;
            case 'calendar':
                return <CalendarPlaceholder collection={collectionName} count={data.length} />;
            case 'gantt':
                return <GanttPlaceholder collection={collectionName} count={data.length} />;
            case 'chart':
                return <ChartPlaceholder collection={collectionName} count={data.length} />;
            default:
                return <TableView data={data} fields={fields} visibleFields={visibleFields} />;
        }
    };

    return (
        <div
            className="bg-[#0c0c0c] border border-white/10 rounded-xl overflow-hidden flex flex-col"
            style={{ width, height }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-[var(--primary)]">
                    <Database className="w-4 h-4" />
                    <span className="text-sm font-medium lowercase">{collectionName}</span>
                    <span className="text-xs text-white/40">({data.length})</span>
                </div>
                <button
                    onClick={fetchData}
                    className="text-white/40 hover:text-white transition-colors"
                    title="refresh"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-2">
                {renderView()}
            </div>
        </div>
    );
}

// Simple Table View
function TableView({ data, fields, visibleFields }: { data: any[], fields: any[], visibleFields?: string[] }) {
    // Filter fields based on visibleFields array or default to first 5
    const displayFields = visibleFields && visibleFields.length > 0
        ? fields.filter(f => visibleFields.includes(f.name))
        : fields.slice(0, 5);

    if (displayFields.length > 0 && visibleFields) {
        // Sort displayFields to match the order in visibleFields if possible
        displayFields.sort((a, b) => visibleFields.indexOf(a.name) - visibleFields.indexOf(b.name));
    }

    if (data.length === 0) {
        return <p className="text-white/40 text-sm text-center py-8 lowercase">no records</p>;
    }

    return (
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b border-white/10">
                    {displayFields.map(f => (
                        <th key={f.name} className="text-left px-2 py-2 text-white/60 font-medium lowercase">
                            {f.title || f.name}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.slice(0, 20).map((row, i) => (
                    <tr key={row.id || i} className="border-b border-white/5 hover:bg-white/5">
                        {displayFields.map(f => (
                            <td key={f.name} className="px-2 py-2 text-white/80 truncate max-w-[150px]">
                                {formatValue(row[f.name])}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// Simple Gallery View
function GalleryView({ data, fields }: { data: any[], fields: any[] }) {
    const titleField = fields.find(f => f.name === 'title' || f.name === 'name') || fields[0];

    if (data.length === 0) {
        return <p className="text-white/40 text-sm text-center py-8 lowercase">no records</p>;
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            {data.slice(0, 8).map((row, i) => (
                <div key={row.id || i} className="bg-white/5 rounded-lg p-3">
                    <p className="text-white/80 text-sm truncate">
                        {titleField ? formatValue(row[titleField.name]) : `Record ${i + 1}`}
                    </p>
                </div>
            ))}
        </div>
    );
}

// Placeholder components for complex views
function KanbanPlaceholder({ collection, count: _count }: { collection: string, count: number }) {
    return (
        <div className="flex gap-2 h-full">
            {['todo', 'in progress', 'done'].map(col => (
                <div key={col} className="flex-1 bg-white/5 rounded-lg p-2">
                    <p className="text-xs text-white/40 lowercase mb-2">{col}</p>
                    <div className="space-y-2">
                        {[1, 2].map(n => (
                            <div key={n} className="bg-white/10 rounded p-2 text-xs text-white/60">
                                {collection} item
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function CalendarPlaceholder({ collection, count: _count }: { collection: string, count: number }) {
    return (
        <div className="flex items-center justify-center h-full text-white/40 text-sm lowercase">
            calendar view: {collection}
        </div>
    );
}

function GanttPlaceholder({ collection, count: _count }: { collection: string, count: number }) {
    return (
        <div className="flex items-center justify-center h-full text-white/40 text-sm lowercase">
            gantt view: {collection}
        </div>
    );
}

function ChartPlaceholder({ collection, count: _count }: { collection: string, count: number }) {
    return (
        <div className="flex items-center justify-center h-full text-white/40 text-sm lowercase">
            chart view: {collection}
        </div>
    );
}

// Helper
function formatValue(value: any): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 50);
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    return String(value);
}
