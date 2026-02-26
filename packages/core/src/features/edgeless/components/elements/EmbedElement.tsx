import React from 'react';
import { DataEmbed } from '@/components/DataEmbed/DataEmbed';

interface EmbedElementProps {
  element: any;
}

export const EmbedElement = React.memo(function EmbedElement({ element }: EmbedElementProps) {
  // NocoBase collection embed
  if (element.data.subType === 'nocobase' || element.data.collection) {
    const colName = element.data.collection || element.data.id; // fallback
    const viewType = element.data.view || 'gallery';

    return (
      <div className="w-full h-full bg-card/10 backdrop-blur-md border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header/Handle */}
        <div className="h-8 bg-black/20 border-b border-white/5 flex items-center px-3 justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500/50" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">
              {element.data.title || colName}
            </span>
          </div>
          <span className="text-[9px] opacity-30 font-mono">LIVE</span>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden bg-background/5">
          <DataEmbed
            collection={colName}
            view={viewType}
            limit={element.data.limit || 50}
            height="100%"
            className="rounded-none border-none bg-transparent"
          />
        </div>
      </div>
    );
  }

  // Web Embed (Iframe)
  if (element.data.subType === 'web' || element.data.url) {
    return (
      <div className="w-full h-full bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col backdrop-blur-sm shadow-xl">
        <div className="h-7 bg-black/40 border-b border-white/5 flex items-center px-2 space-x-1.5 shrink-0">
          <div className="w-2 h-2 rounded-full bg-red-400/80"></div>
          <div className="w-2 h-2 rounded-full bg-yellow-400/80"></div>
          <div className="w-2 h-2 rounded-full bg-green-400/80"></div>
          <span className="text-[9px] text-muted-foreground ml-2 truncate max-w-[200px] opacity-50 font-mono">
            {element.data.url}
          </span>
        </div>
        <iframe
          src={element.data.url}
          className="w-full flex-1 border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center border border-dashed border-white/20 rounded-xl bg-white/5 text-xs text-muted-foreground">
      Empty Embed
    </div>
  );
}, (prev, next) => prev.element === next.element)
