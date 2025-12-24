
import { ViewProps } from './registry';

export function ChartView({ data, loading }: ViewProps) {
    if (loading) return <div>Loading charts...</div>;
    return (
        <div className="p-10 text-center border rounded-lg border-dashed">
            <h3 className="text-lg font-bold mb-2">Chart View</h3>
            <p className="text-muted-foreground">Framework ready. (To be implemented)</p>
            <p className="text-xs mt-4 text-muted-foreground">Analysis ready for {data.length} data points.</p>
        </div>
    );
}
