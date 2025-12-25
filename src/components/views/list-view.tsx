
import { ViewProps } from './registry';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, MoreHorizontal, Calendar, CheckSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function ListView({ data, collection, onEdit, onDelete, onUpdateRecord }: ViewProps) {
    // Identify key fields for display
    const titleField = collection.fields?.find((f: any) => f.primary || f.name === 'title' || f.name === 'name') || { name: 'id' };
    const dateField = collection.fields?.find((f: any) => f.type === 'date' || f.interface === 'date');
    const statusField = collection.fields?.find((f: any) => f.name === 'status' || f.interface === 'select');
    const tagsField = collection.fields?.find((f: any) => f.interface === 'tags' || f.interface === 'multipleSelect');

    const handleStatusClick = (record: any, e: React.MouseEvent) => {
        e.stopPropagation();
        // Cycle status if simple? Or open generic quick edit?
        // For now, let's just cycle if it's "todo" -> "done"
        if (record.status === 'todo') onUpdateRecord?.(record.id, { status: 'done' });
        else if (record.status === 'done') onUpdateRecord?.(record.id, { status: 'todo' });
        else onEdit?.(record);
    };

    if (!data.length) {
        return <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-xl">No items in list</div>;
    }

    return (
        <div className="flex flex-col gap-2 max-w-3xl mx-auto">
            {data.map((record) => (
                <div
                    key={record.id}
                    className="group flex items-start p-3 bg-card border rounded-lg shadow-sm hover:shadow-md transition-all gap-3 items-center cursor-pointer"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('pkm:edit-record', {
                            detail: { record: record, collectionName: collection.name }
                        }));
                    }}
                >
                    {/* Checkbox / Status Indicator */}
                    <div className="pt-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-6 w-6 rounded-full border ${record.status === 'done' ? 'bg-primary border-primary text-primary-foreground' : 'text-muted-foreground'}`}
                            onClick={(e) => handleStatusClick(record, e)}
                        >
                            <CheckSquare className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${record.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                            {record[titleField.name] || 'Untitled'}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 truncate h-5">
                            {dateField && record[dateField.name] && (
                                <span className="flex items-center text-blue-500/80">
                                    <Calendar className="h-3 w-3 mr-1" />
                                    {format(new Date(record[dateField.name]), 'MMM d')}
                                </span>
                            )}

                            {tagsField && Array.isArray(record[tagsField.name]) && record[tagsField.name].map((tag: any) => (
                                <Badge key={String(tag)} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                    {String(tag)}
                                </Badge>
                            ))}

                            {/* Show "Subtitle" fields roughly if not date/tags? */}
                            {/* Generic fallback for other fields */}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {onDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(record); }}>
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onEdit?.(record); }}>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}
