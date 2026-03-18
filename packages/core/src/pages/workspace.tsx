import { useParams } from 'react-router-dom';
import { DataEmbed } from '@/components/DataEmbed';

export function WorkspacePage() {
  useParams<{ id: string }>();

  return (
    <div className="p-6 space-y-8 bg-background min-h-screen animate-in fade-in duration-500">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight lowercase">workspace dashboard</h1>
        <p className="text-muted-foreground lowercase">real-time system overview</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Headmates Gallery */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold lowercase tracking-tight">system members</h2>
            <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
              live
            </span>
          </div>
          <DataEmbed
            collection="headmates"
            view="gallery"
            limit={12}
            height="auto"
            className="min-h-[400px]"
          />
        </section>

        {/* Recent Captures */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold lowercase tracking-tight">recent captures</h2>
          </div>
          <DataEmbed
            collection="captures"
            view="gallery"
            limit={6}
            filters={{ sort: '-createdAt' }}
          />
        </section>
      </div>
    </div>
  );
}
