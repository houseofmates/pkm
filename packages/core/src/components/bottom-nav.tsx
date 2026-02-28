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
          </div>
    </div >
    {/* note: globalcommandpalette is usually rendered at root, but we can control its open state here if we modify it to accept props,
 or we let it handle its own state via context/events.
 looking at existing globalcommandpalette, it handles its own 'open' state via ctrl+k.
 we should refactor it to accept an `isopen` prop or similar, or trigger the keyboard event manually.

 better approach: we'll modify globalcommandpalette to be controlled or expose a trigger.
 for now, let's assume we will pass `open={searchopen}` and `onopenchange={setsearchopen}` to it in the next step.
 i won't render it here yet, to avoid duplication if it's already in app.tsx.
 wait, app.tsx renders globalcommandpalette.
 if i want this button to open it, i need a shared state or event.

 let's update globalcommandpalette to listen for a custom event 'pkm:open-search' or
 use a simple context.

 simplest for this refactor: dispatch a keyboard event or custom event.
  */}
    </>
  );
}
