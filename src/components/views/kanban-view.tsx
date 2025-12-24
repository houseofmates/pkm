
import type { ViewProps } from './registry';

export function KanbanView({ data, loading }: ViewProps) {
    if (loading) return <div>Loading board...</div>;
    return (
        <div className="p-10 text-center border rounded-lg border-dashed">
            <h3 className="text-lg font-bold mb-2">Kanban View</h3>
            <p className="text-muted-foreground">Framework ready. (To be implemented)</p>
            <p className="text-xs mt-4 text-muted-foreground">{data.length} cards available for sorting.</p>
        </div>
    );
}
