import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BlockEditor } from '@/components/editor/BlockEditor';
import { Separator } from '@/components/ui/separator';
import { secureLogger } from '@/lib/secure-logger';

export function PageCanvas() {
  const { id } = useParams();
  const [content, setContent] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('untitled document');

  // Load content
  useEffect(() => {
    if (!id) return;
    try {
        // Load metadata
        const configStr = localStorage.getItem(`canvas-config-${id}`);
        if (configStr) {
            const config = JSON.parse(configStr);
            if (config.title) setTitle(config.title);
        }

        // Load content
        const savedContent = localStorage.getItem(`doc-content-${id}`);
        if (savedContent) {
            setContent(savedContent);
        } else {
            // Default content
            setContent('<p>start typing...</p>');
        }
    } catch (e) {
        secureLogger.error('Failed to load document:', e);
    } finally {
        setLoading(false);
    }
  }, [id]);

  const handleTitleChange = (newTitle: string) => {
      setTitle(newTitle);
      if (id) {
          try {
              const config = JSON.parse(localStorage.getItem(`canvas-config-${id}`) || '{}');
              config.title = newTitle;
              localStorage.setItem(`canvas-config-${id}`, JSON.stringify(config));
              // Dispatch event to update sidebar?
              // For now, we rely on manual refresh or app logic
          } catch (e) {
              console.error(e);
          }
      }
  }

  if (loading) {
      return <div className="flex items-center justify-center h-screen text-muted-foreground">loading page...</div>;
  }

  return (
    <div className="h-screen bg-[#050505] text-white flex flex-col font-['Varela_Round'] overflow-hidden">
      {/* fixed header section matching sidebar alignment */}
      <div className="pt-4 shrink-0 bg-[#050505] z-10 flex flex-col">
        <div className="max-w-[900px] w-full mx-auto px-5 lg:px-0">
          <div className="flex justify-between items-center mb-2 h-10">
            <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="text-3xl font-bold text-[var(--primary)] bg-transparent border-none outline-none placeholder:text-primary/50 w-full"
                placeholder="untitled page"
            />
          </div>
        </div>
        <Separator className="mb-2 bg-primary opacity-20" />
      </div>

      {/* scrollable content area */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto px-5 lg:px-0 py-8 no-scrollbar">
        <div className="max-w-[900px] mx-auto relative pb-40">
           <BlockEditor
             content={content}
             onChange={(html) => {
                 if (id) localStorage.setItem(`doc-content-${id}`, html);
             }}
             className="min-h-[50vh] font-['Varela_Round']"
             placeholder="type '/' for commands or drag blocks to columns..."
           />
        </div>
      </div>
    </div>
  );
}
