import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { registry, type linkentry } from '@/lib/link-registry';
import { Badge } from '@/components/ui/badge';
import { FileText, Link as LinkIcon } from 'lucide-react';

export function BacklinksFooter({ recordId }: { recordId: string, collectionName: string }) {
  const [backlinks, setBacklinks] = useState<linkentry[]>([]);

  useEffect(() => {
    if (!recordid) return;
    setbacklinks(registry.getbacklinks(recordid));
  }, [recordid]);

  if (backlinks.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-primary/10">
      <div className="flex items-center gap-2 mb-6">
        <LinkIcon className="h-4 w-4 text-primary/60" />
        <h3 className="text-xs font-bold text-primary/60 tracking-wider lowercase">linked mentions</h3>
        <Badge variant="outline" className="ml-2 h-4 px-1.5 text-[10px] border-primary/20 text-primary/50">
          {backlinks.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {backlinks.map(link => (
          <Link
            key={`${link.sourcecollection}-${link.sourceid}`}
            to={`/databases/${link.sourcecollection}/${link.sourceid}`}
            className="group flex flex-col p-4 rounded-xl border border-primary/10 bg-primary/5 hover:bg-primary/10 hover:border-primary/20 transition-all shadow-sm active:scale-[0.98]"
          >
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-sm font-medium text-foreground/90 group-hover:text-primary transition-colors lowercase truncate">
                {link.label || 'untitled'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60 lowercase">
              <span className="px-1.5 py-0.5 rounded-md bg-primary/5 border border-primary/5">
                {link.sourcecollection}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity">→ click to jump</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
