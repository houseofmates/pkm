import { useRef, useEffect, useState, memo, useCallback } from 'react'
import { useLLMStore, type ChatMessage as ChatMessageType } from '@/stores/llm-store'
import { Send, X, BrainCircuit, Paperclip, Image, Film, FileText, XCircle } from 'lucide-react'
import { useEdgelessStore } from '@/features/edgeless/store'
import type { Attachment } from '@/workers/ai-worker-types'

// ---------------------------------------------------------------------------
// attachment preview component
// ---------------------------------------------------------------------------

interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove: () => void;
}

const AttachmentPreview = memo(function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const isImage = attachment.type === 'image' || attachment.type === 'gif';
  
  return (
    <div className="relative group">
      <div className="w-16 h-16 rounded-lg overflow-hidden border border-primary/30 bg-black/50 flex items-center justify-center">
        {isImage && attachment.dataUrl ? (
          <img 
            src={attachment.dataUrl} 
            alt={attachment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-primary/60">
            {attachment.type === 'video' ? <Film size={20} /> : <FileText size={20} />}
            <span className="text-[8px] mt-1 uppercase truncate max-w-[60px]">{attachment.type}</span>
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <XCircle size={14} />
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// memoized chat bubble — only re-renders when its own content changes
// ---------------------------------------------------------------------------

interface ChatBubbleProps {
  message: ChatMessageType;
}

const ChatBubble = memo(function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div
      className={`flex flex-col gap-1 ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}
    >
      <span className="text-[10px] text-primary opacity-50 ">
        {message.role === 'assistant' ? 'wilson' : 'user'}
      </span>
      <div
        className={`p-3 rounded-lg max-w-[90%] lowercase ${message.role === 'assistant' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-black border border-gray-700 text-gray-300'}`}
      >
        {message.content}
      </div>
      {/* Display attachments in user messages */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {message.attachments.map((att) => (
            <div key={att.id} className="w-12 h-12 rounded overflow-hidden border border-primary/20">
              {(att.type === 'image' || att.type === 'gif') && att.dataUrl ? (
                <img src={att.dataUrl} alt={att.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-black/50 flex items-center justify-center text-primary/40">
                  {att.type === 'video' ? <Film size={14} /> : <FileText size={14} />}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {message.sources && message.sources.length > 0 && (
        <div className="text-[9px] text-primary/40 mt-0.5">
          sources: {message.sources.join(', ')}
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// streaming bubble — subscribes ONLY to streamingContent
// so it doesn't cause the entire chat log to re-render on each token
// ---------------------------------------------------------------------------

const StreamingBubble = memo(function StreamingBubble() {
  const streamingContent = useLLMStore((s) => s.streamingContent);

  if (!streamingContent) return null;

  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] text-primary opacity-50">wilson</span>
      <div className="p-3 rounded-lg max-w-[90%] lowercase bg-primary/10 border border-primary/20 text-primary">
        {streamingContent}
        <span className="inline-block w-1.5 h-3.5 bg-primary/60 ml-0.5 animate-pulse" />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// main chat component
// ---------------------------------------------------------------------------

export function WilsonChat() {
  // proper zustand selectors — each subscribes independently
  const isChatOpen = useEdgelessStore((s) => s.isChatOpen);
  const setChatOpen = useEdgelessStore((s) => s.setChatOpen);

  const interactionHistory = useLLMStore((s) => s.interactionHistory);
  const isThinking = useLLMStore((s) => s.isThinking);
  const askWilson = useLLMStore((s) => s.askWilson);
  const streamingContent = useLLMStore((s) => s.streamingContent);
  const pendingAttachments = useLLMStore((s) => s.pendingAttachments);
  const addAttachment = useLLMStore((s) => s.addAttachment);
  const removeAttachment = useLLMStore((s) => s.removeAttachment);

  const [userInput, setUserInput] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // auto-scroll — triggers on new history entries OR streaming content
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [interactionHistory.length, streamingContent]);

  const checkAndSend = useCallback(async () => {
    if ((!userInput.trim() && pendingAttachments.length === 0) || isThinking) return;

    const text = userInput;
    setUserInput(''); // clear immediately

    if (text.trim().toLowerCase().startsWith('/ai')) {
      const prompt = text.replace(/^\/ai\s*/i, '');

      // capture basic page context
      const context = {
        url: window.location.href,
        pageText: document.body.innerText.substring(0, 5000),
      };

      useLLMStore.getState().setContext(context);

      await askWilson(prompt || 'Analyze this page content.');

      // clear context to avoid polluting future chats
      useLLMStore.getState().setContext(null);
    } else {
      await askWilson(text);
    }
  }, [userInput, isThinking, askWilson, pendingAttachments.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      checkAndSend();
    }
  }, [checkAndSend]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      // Check file size (limit to 10MB for now)
      if (file.size > 10 * 1024 * 1024) {
        console.warn('[wilson] File too large:', file.name);
        continue;
      }
      await addAttachment(file);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [addAttachment]);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`fixed inset-y-0 right-0 w-[90vw] md:w-[400px] bg-background border-l-2 border-primary shadow-[-4px_0_0_var(--primary)] z-[60] flex flex-col transition-transform duration-300 transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {/* header */}
      <div className="p-4 border-b border-primary flex justify-between items-center bg-black/50">
        <div className="flex items-center gap-2 text-primary font-bold lowercase">
          <span>wilson</span>
          {pendingAttachments.length > 0 && (
            <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">
              {pendingAttachments.length} attachment{pendingAttachments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <button onClick={() => setChatOpen(false)} className="text-primary hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* chat area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-sm">
        {interactionHistory.length === 0 && !streamingContent && (
          <div className="text-primary opacity-50 text-center mt-10 lowercase">
            <p>systems online.</p>
            <p>waiting for input...</p>
            <p className="mt-4 text-xs">supports images, gifs, and videos with qwen2.5vl:3b</p>
          </div>
        )}

        {interactionHistory.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {/* streaming bubble — renders in-progress assistant response */}
        <StreamingBubble />

        {/* thinking indicator (shown during rag retrieval before streaming starts) */}
        {isThinking && !streamingContent && (
          <div className="flex items-center gap-2 text-primary text-xs animate-pulse lowercase">
            <BrainCircuit size={14} />
            <span>processing...</span>
          </div>
        )}
      </div>

      {/* attachment preview area */}
      {pendingAttachments.length > 0 && (
        <div className="px-4 py-2 border-t border-primary/30 bg-black/30">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingAttachments.map((att) => (
              <AttachmentPreview
                key={att.id}
                attachment={att}
                onRemove={() => removeAttachment(att.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* input */}
      <div className="p-4 border-t border-primary bg-background">
        <div className="relative flex items-center gap-2">
          {/* hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.gif"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* attachment button */}
          <button
            onClick={handleAttachmentClick}
            disabled={isThinking}
            className="text-primary hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-primary/10 transition-colors"
            title="Attach files (images, gifs, videos)"
          >
            <Paperclip size={18} />
          </button>

          <div className="relative flex-1">
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              type="text"
              placeholder="query..."
              disabled={isThinking}
              className="w-full bg-black border-2 border-primary rounded-lg py-3 pl-4 pr-10 text-primary focus:outline-none focus:border-primary placeholder:text-primary/30 lowercase disabled:opacity-50"
            />
            <button
              onClick={checkAndSend}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white disabled:opacity-50"
              disabled={(!userInput.trim() && pendingAttachments.length === 0) || isThinking}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        <div className="text-[10px] text-primary/30 mt-2 lowercase flex items-center gap-2">
          <Image size={10} />
          <span>supports: jpg, png, gif, webp, mp4, mov</span>
        </div>
      </div>
    </div>
  );
}
