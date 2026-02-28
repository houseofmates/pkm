import { Home, Database, Users, Search, Inbox, Settings, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: 'databases' | 'home' | 'headmates' | 'captures';
  onTabChange: (tab: 'databases' | 'home' | 'headmates' | 'captures') => void;
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full">
        <div className={cn(
          "w-max flex items-center bg-black/90 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-2 pointer-events-auto",
          className
        )}>
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[60px] w-[60px] rounded-2xl gap-1 hover:bg-white/10", activeTab === 'home' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('home')}
          >
            <Home className="h-5 w-5" />
            <span className="text-[11px] font-medium lowercase">home</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[60px] w-[60px] rounded-2xl gap-1 hover:bg-white/10", activeTab === 'databases' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('databases')}
          >
            <Database className="h-5 w-5" />
            <span className="text-[11px] font-medium lowercase">data</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-[60px] w-[60px] rounded-full hover:bg-white/10 scale-110 mx-2"
            onClick={handleOpenSearch}
          >
            <Search className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[60px] w-[60px] rounded-2xl gap-1 hover:bg-white/10", activeTab === 'captures' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('captures')}
          >
            <Inbox className="h-5 w-5" />
            <span className="text-[11px] font-medium lowercase">inbox</span>
          </Button>

          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[60px] w-[60px] rounded-2xl gap-1 hover:bg-white/10", activeTab === 'headmates' && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={() => onTabChange('headmates')}
          >
            <Users className="h-5 w-5" />
            <span className="text-[11px] font-medium lowercase">mates</span>
          </Button>

          {/* wilson chat button at the very end */}
          <Button
            variant="ghost"
            className={cn("flex flex-col items-center justify-center h-[60px] w-[60px] rounded-2xl gap-1 hover:bg-white/10", isChatOpen && "bg-primary/20 text-primary hover:bg-primary/30")}
            onClick={handleWilsonClick}
          >
            <BrainCircuit className="h-5 w-5" />
            <span className="text-[11px] font-medium lowercase">chat</span>
          </Button>
        </div>
      </div>
    </>
  );
}
