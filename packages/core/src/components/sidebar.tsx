import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SidebarCollection = {
  name: string;
  title?: string;
};

interface SidebarProps {
  className?: string;
  collections?: SidebarCollection[];
  selectedCollection?: SidebarCollection | null;
  onSelect?: (collection: SidebarCollection) => void;
}

export function Sidebar({ className, collections = [], selectedCollection = null, onSelect }: SidebarProps) {
  return (
    <aside className={cn('w-64 border-r border-white/10 bg-[#050505] p-3', className)}>
      <p className="text-xs text-white/40 lowercase mb-2">collections</p>
      <div className="space-y-1">
        {collections.map((collection) => {
          const isActive = selectedCollection?.name === collection.name;
          return (
            <Button
              key={collection.name}
              variant="ghost"
              className={cn(
                'w-full justify-start lowercase',
                isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5'
              )}
              onClick={() => onSelect?.(collection)}
            >
              {collection.title || collection.name}
            </Button>
          );
        })}
      </div>
    </aside>
  );
}
