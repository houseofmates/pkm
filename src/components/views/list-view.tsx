
import type { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { Trash2, MoreHorizontal, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export function ListView({ data, collection, onEdit, onDelete, onUpdateRecord }: ViewProps) {
    // Identify key fields for display
    const titleField = collection.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };
    const dateField = collection.fields?.find((f: any) => f.type === 'date' || f.interface === 'date');
    const _statusField = collection.fields?.find((f: any) => f.name === 'status' || f.interface === 'select');
    const tagsField = collection.fields?.find((f: any) => f.interface === 'tags' || f.interface === 'multipleSelect');

    const handleStatusClick = (record: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (record.status === 'todo') onUpdateRecord?.(record.id, { status: 'done' });
        else if (record.status === 'done') onUpdateRecord?.(record.id, { status: 'todo' });
        else onEdit?.(record);
    };

    if (!data.length) {
        return <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl text-sm">No items found</div>;
    }

    return (
        <div className="flex flex-col gap-1 max-w-4xl mx-auto pb-10">
            {data.map((record) => (
                <div
                    key={record.id}
                    className="group flex items-center p-2 bg-card/50 hover:bg-card border border-transparent hover:border-border/50 rounded-md transition-all gap-3 cursor-pointer"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('pkm:edit-record', {
                            detail: { record: record, collectionName: collection.name }
                        }));
                    }}
                >
                    {/* Checkbox / Status Indicator - Compact */}
                    <div className="flex-shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-5 w-5 rounded-md border ${record.status === 'done' ? 'bg-primary border-primary text-primary-foreground' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                            onClick={(e) => handleStatusClick(record, e)}
                        >
                            <CheckSquare className="h-3 w-3" />
                        </Button>
                    </div>

                    {/* Main Content - Dense */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                        <div className={`text-sm font-medium truncate ${record.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {record[titleField.name] || 'Untitled'}
                        </div>

                        {/* Meta inline for compact view */}
                        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                            {tagsField && Array.isArray(record[tagsField.name]) && record[tagsField.name].slice(0, 3).map((tag: any) => (
                                <Badge key={String(tag)} variant="outline" className="text-[10px] px-1 py-0 h-4 font-normal text-muted-foreground border-border/50 bg-muted/20">
                                    {String(tag)}
                                </Badge>
                            ))}

                            {dateField && record[dateField.name] && (
                                <span className="flex items-center text-[10px] opacity-70 w-16 justify-end">
                                    {format(new Date(record[dateField.name]), 'MMM d')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions - Slide in */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 pl-2">
                        {onDelete && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(record); }}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={(e) => { e.stopPropagation(); onEdit?.(record); }}>
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
