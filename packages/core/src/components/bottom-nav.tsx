import { Home, Database, Users, Search, Inbox, BookOpen, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal' | 'calendar') => void;
  className?: string;
}

export function BottomNav({ activeTab, onTabChange, className }: BottomNavProps) {

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-search'));
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center w-full pb-safe px-1">
        <div className={cn(
          "w-full max-w-md flex items-center justify-between bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_32px_rgba(0,0,0,0.5)] px-1 py-1 pointer-events-auto",
          className
        )}>
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[48px] w-[48px] min-w-[48px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'home' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('home')}
          >
            <Home className="h-6 w-6" />
            <span className="text-[10px] font-medium lowercase">home</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[48px] w-[48px] min-w-[48px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'databases' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('databases')}
          >
            <Database className="h-6 w-6" />
            <span className="text-[10px] font-medium lowercase">data</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[48px] w-[48px] min-w-[48px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'captures' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('captures')}
          >
            <Inbox className="h-6 w-6" />
            <span className="text-[10px] font-medium lowercase">inbox</span>
          </Button>

          {/* Search button - centered in middle of toolbar */}
          <Button
            variant="ghost"
            size="icon"
            className="h-[48px] w-[48px] min-w-[48px] rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            onClick={handleOpenSearch}
          >
            <Search className="h-7 w-7" />
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[48px] w-[48px] min-w-[48px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'calendar' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('calendar')}
          >
            <Calendar className="h-6 w-6" />
            <span className="text-[10px] font-medium lowercase">cal</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[48px] w-[48px] min-w-[48px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'journal' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('journal')}
          >
            <BookOpen className="h-6 w-6" />
            <span className="text-[10px] font-medium lowercase">journal</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[48px] w-[48px] min-w-[48px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'headmates' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('headmates')}
          >
            <Users className="h-6 w-6" />
            <span className="text-[10px] font-medium lowercase">mates</span>
          </Button>

        </div>
      </div>
    </>
  );
}
