
import { ViewProps } from './registry';

export function CalendarView({ data, loading }: ViewProps) {
    if (loading) return <div>Loading calendar...</div>;
    return (
        <div className="p-10 text-center border rounded-lg border-dashed">
            <h3 className="text-lg font-bold mb-2">Calendar View</h3>
            <p className="text-muted-foreground">Framework ready. (To be implemented)</p>
            <p className="text-xs mt-4 text-muted-foreground">{data.length} records loaded available for scheduling.</p>
        </div>
    );
}
