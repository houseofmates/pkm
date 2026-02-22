import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface GalleryViewProps {
  records: any[];
  isLoading: boolean;
  theme: any;
  onSelect?: (record: any) => void;
}

export function GalleryView({ records, isLoading, theme, onSelect }: GalleryViewProps) {
  if (isLoading && records.length === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl animate-pulse bg-white/5 border border-white/10" />
        ))}
      </div>
    );
  }

  if (!records?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
        No items found.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-1">
      <AnimatePresence mode="popLayout">
        {records.map((record: any) => (
          <GalleryCard
            key={record.id}
            record={record}
            theme={theme}
            onClick={() => onSelect && onSelect(record)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function GalleryCard({ record, theme, onClick }: any) {
  const [isHovered, setHovered] = useState(false);

  // Heuristics for image fields
  const image = record.avatar?.[0]?.url || record.image?.[0]?.url || record.cover?.[0]?.url;
  const color = record.color || theme.raw.primary || '#f5af12';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      className={cn(
        "relative group rounded-xl overflow-hidden cursor-pointer",
        "bg-card/40 backdrop-blur-md border border-white/10 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300"
      )}
      style={{
        '--card-accent': color
      } as any}
    >
      {/* Image / Header */}
      <div className="aspect-[4/3] w-full relative overflow-hidden bg-black/40">
        {image ? (
          <img
            src={image}
            alt={record.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl opacity-30 font-bold mix-blend-overlay" style={{ color: 'var(--card-accent)' }}>
            {(record.name || record.title || '?').charAt(0)}
          </div>
        )}

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

        {/* Content */}
        <div className="absolute bottom-0 left-0 p-4 w-full">
          <h3 className="font-bold text-white text-lg truncate drop-shadow-md leading-tight">
            {record.name || record.title || 'Untitled'}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            {record.status && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/90 backdrop-blur-sm border border-white/10">
                {record.status}
              </span>
            )}
            {/* Active Indicator */}
            {(record.fronting || record.active) && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover Details */}
      <motion.div
        initial={false}
        animate={{ height: isHovered ? 'auto' : 0, opacity: isHovered ? 1 : 0 }}
        className="overflow-hidden bg-black/20 backdrop-blur-xl border-t border-white/5"
      >
        <div className="p-3 text-xs text-white/70 line-clamp-3 leading-relaxed">
          {record.bio || record.description || record.notes || "No details provided."}
        </div>
      </motion.div>

      {/* Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--card-accent)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.div>
  );
}
