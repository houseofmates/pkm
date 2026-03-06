import { Home, Database, Users, Search, Inbox, Settings, BrainCircuit, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures' | 'journal') => void;
  className?: string;
}

import { useNavigate } from 'react-router-dom';
import { useEdgelessStore } from '@/features/edgeless/store';
import { useLLMContext } from '@/contexts/llm-context';
import { useLLMStore } from '@/stores/llm-store';

export function BottomNav({ activeTab, onTabChange, className }: BottomNavProps) {

  const handleOpenSearch = () => {
    window.dispatchEvent(new CustomEvent('pkm:open-search'));
  };

  const navigate = useNavigate();
  const setChatOpen = useEdgelessStore((s) => s.setChatOpen);
  const isChatOpen = useEdgelessStore((s) => s.isChatOpen);

  const llmContext = useLLMContext();
  const askWilson = useLLMStore((s) => s.askWilson);
  const interactionHistory = useLLMStore((s) => s.interactionHistory);

  const handleWilsonClick = () => {
    if (!isChatOpen) {
      setChatOpen(true);
      const recent = llmContext?.activity?.recentActions?.map(a => a.summary).join(', ') || 'no recent data';
      useLLMStore.getState().setContext({ recentInteractions: recent });

      // if this is the first open, trigger a proactive greeting with context
      if (interactionHistory.length === 0) {
        askWilson(`hello wilson! i just opened the chat. here are the last few databases and entries i interacted with: ${recent}. please give me a brief, natural greeting referencing what i've been doing.`, true);
      }
    } else {
      setChatOpen(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none flex justify-center w-full pb-safe">
        <div className={cn(
          "w-full max-w-md flex items-center justify-around bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_32px_rgba(0,0,0,0.5)] px-2 py-1 pointer-events-auto",
          className
        )}>
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'home' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium lowercase">home</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'databases' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('databases')}
          >
            <Database className="h-5 w-5" />
            <span className="text-[10px] font-medium lowercase">data</span>
          </Button>

          {/* Search button - centered and prominent */}
          <Button
            variant="ghost"
            size="icon"
            className="h-[56px] w-[56px] rounded-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
            onClick={handleOpenSearch}
          >
            <Search className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'captures' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('captures')}
          >
            <Inbox className="h-5 w-5" />
            <span className="text-[10px] font-medium lowercase">inbox</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'journal' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('journal')}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-medium lowercase">journal</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] rounded-2xl gap-0.5 hover:bg-white/10", activeTab === 'headmates' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('headmates')}
          >
            <Users className="h-5 w-5" />
            <span className="text-[10px] font-medium lowercase">mates</span>
          </Button>

          {/* wilson chat button at the very end */}
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[56px] w-[56px] rounded-2xl gap-0.5 hover:bg-white/10", isChatOpen && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={handleWilsonClick}
          >
            <BrainCircuit className="h-5 w-5" />
            <span className="text-[10px] font-medium lowercase">chat</span>
          </Button>
        </div>
      </div>
    </>
  );
}
