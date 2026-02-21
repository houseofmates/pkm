import { Suspense, useMemo } from 'react';
import { useEmbedData } from './hooks/useEmbedData';
import { useEmbedTheme } from './hooks/useEmbedTheme';
import { GalleryView } from './views/GalleryView';
import { ErrorBoundary } from 'react-error-boundary';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';

interface DataEmbedProps {
  collection: string;
  view?: 'table' | 'gallery' | 'board' | 'chart' | 'calendar';
  limit?: number;
  height?: string | number;
  filters?: Record<string, any>;
  className?: string;
  onItemClick?: (item: any) => void;
}

export function DataEmbed(props: DataEmbedProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<LoadingSkeleton />}>
        <DataEmbedContent {...props} />
      </Suspense>
    </ErrorBoundary>
  );
}

function DataEmbedContent({
  collection,
  view = 'gallery', // Defaulting to gallery since that's what we implemented
  limit = 20,
  filters,
  className,
  height,
  onItemClick
}: DataEmbedProps) {
  const { records, isLoading, isError, error, fetchNextPage, hasNextPage } = useEmbedData({
    collection,
    view,
    limit,
    filters
  });

  const theme = useEmbedTheme();

  const ViewComponent = useMemo(() => {
    switch (view) {
      case 'gallery': return GalleryView;
      // case 'table': return TableView; // TODO
      default: return GalleryView; // Fallback to Gallery for demo
    }
  }, [view]);

  if (isError) {
    throw error;
  }

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden transition-colors duration-500 rounded-xl",
        className
      )}
      style={{ height: height || 'auto', minHeight: '200px' }}
    >
      <ViewComponent
        records={records}
        isLoading={isLoading}
        theme={theme}
        onSelect={onItemClick}
      />

      {hasNextPage && (
        <div className="p-4 flex justify-center">
           <button
             onClick={() => fetchNextPage()}
             className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors py-2 px-4 rounded-full border border-transparent hover:border-primary/20 hover:bg-primary/5"
           >
             Load More
           </button>
        </div>
      )}
    </div>
  );
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-destructive/5 border border-destructive/20 rounded-xl text-destructive h-full min-h-[150px]">
      <AlertCircle className="h-6 w-6 mb-2" />
      <p className="text-sm font-semibold">Unable to load data</p>
      <p className="text-xs opacity-70 mb-4 max-w-xs text-center truncate">{error.message || 'Unknown error'}</p>
      <button onClick={resetErrorBoundary} className="text-xs underline hover:text-primary">Retry Connection</button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[200px] bg-muted/5 rounded-xl border border-dashed border-muted">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/50" />
    </div>
  );
}
