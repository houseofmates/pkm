import { useRef, useEffect, useState, memo, useCallback } from 'react'
import { useLLMStore, type ChatMessage as ChatMessageType, type ChatSession } from '@/stores/llm-store'
import { Send, X, BrainCircuit, Paperclip, Image, Film, FileText, XCircle, History, Plus, Trash2, Edit2, MessageSquare, Camera, Mic } from 'lucide-react'
import { useEdgelessStore } from '@/features/edgeless/store'
import type { Attachment } from '@/workers/ai-worker-types'
import { toast } from 'sonner'
import { secureLogger } from '@/lib/secure-logger'
import { VoiceChat, useWilsonVoice } from '@/components/VoiceChat'

const RAW_MODEL_NAME = 'qwen2.5-coder:7b-instruct-q4_K_S';

function friendlyModelName(raw: string): string {
  const map: Record<string, string> = {
    'qwen2.5-coder:7b-instruct-q4_K_S': 'Qwen 2.5 Coder 7B',
  };
  if (map[raw]) return map[raw];
  return raw
    .split(':')[0]
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Helper function to capture a screenshot of the current page
async function capturePageScreenshot(): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve, reject) => {
    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Get the full page dimensions
      const width = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
      );
      const height = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight
      );

      // Limit dimensions for performance (max 4K resolution)
      const maxDimension = 3840;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      
      canvas.width = width * scale;
      canvas.height = height * scale;

      // Use html2canvas-like approach with foreignObject SVG
      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%" x="0" y="0">
            <div xmlns="http://www.w3.org/1999/xhtml">
              ${new XMLSerializer().serializeToString(document.documentElement)}
            </div>
          </foreignObject>
        </svg>
      `;

      const img = document.createElement('img');
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = () => {
        // Fallback: capture viewport only using simpler approach
        captureViewportScreenshot().then(resolve).catch(reject);
      };
      
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;
    } catch (err) {
      // Fallback to viewport capture
      captureViewportScreenshot().then(resolve).catch(reject);
    }
  });
}

// Fallback: capture only the visible viewport
async function captureViewportScreenshot(): Promise<HTMLCanvasElement | null> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      // Use the mediaDevices API if available (more modern approach)
      if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
        // Note: This would require user permission and shows a picker
        // For now, use the SVG approach for the viewport
        const svgData = `
          <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <foreignObject width="100%" height="100%" x="0" y="0">
              <div xmlns="http://www.w3.org/1999/xhtml">
                ${new XMLSerializer().serializeToString(document.documentElement)}
              </div>
            </foreignObject>
          </svg>
        `;

        const img = document.createElement('img');
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas);
        };
        img.onerror = () => reject(new Error('Failed to load SVG'));
        
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        img.src = URL.createObjectURL(svgBlob);
      } else {
        reject(new Error('Screenshot capture not supported'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

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
          <img src={attachment.dataUrl} alt={attachment.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center text-primary/60">
            {attachment.type === 'video' ? <Film size={20} /> : <FileText size={20} />}
            <span className="text-[8px] mt-1 uppercase truncate max-w-[60px]">{attachment.type}</span>
          </div>
        )}
      </div>
      <button onClick={onRemove} className="absolute -top-1 -right-1 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <XCircle size={14} />
      </button>
    </div>
  );
});

interface ChatBubbleProps {
  message: ChatMessageType;
}

const ChatBubble = memo(function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div className={`flex flex-col gap-1 ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}>
      <span className="text-[10px] text-primary opacity-50">{message.role === 'assistant' ? 'wilson' : 'user'}</span>
      <div className={`p-3 rounded-lg max-w-[90%] lowercase ${message.role === 'assistant' ? 'bg-primary/10 border border-primary/20 text-primary' : 'bg-black border border-gray-700 text-gray-300'}`}>
        {message.content}
      </div>
      {message.createdAt && (
        <span className="text-[9px] text-primary/30">{compactTimestamp(message.createdAt)}</span>
      )}
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
        <div className="text-[9px] text-primary/40 mt-0.5">sources: {message.sources.join(', ')}</div>
      )}
    </div>
  );
});

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

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onClick: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const SessionItem = memo(function SessionItem({ session, isActive, onClick, onRename, onDelete }: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const handleSave = () => {
    onRename(session.id, editTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isActive ? 'bg-primary/20 border border-primary/30' : 'hover:bg-primary/10 border border-transparent'}`}
      onClick={onClick}
    >
      <MessageSquare size={14} className="text-primary/60 flex-shrink-0" />
      {isEditing ? (
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="flex-1 bg-black/50 border border-primary/30 rounded px-1 py-0.5 text-xs text-primary lowercase"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-xs text-primary lowercase truncate">{session.title}</span>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 hover:bg-primary/20 rounded text-primary/60 hover:text-primary">
          <Edit2 size={12} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(session.id); }} className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});

export function WilsonChat() {
  const isChatOpen = useEdgelessStore((s) => s.isChatOpen);
  secureLogger.debug('[WilsonChat] isChatOpen:', isChatOpen);
  const setChatOpen = useEdgelessStore((s) => s.setChatOpen);
  const interactionHistory = useLLMStore((s) => s.interactionHistory);
  const isThinking = useLLMStore((s) => s.isThinking);
  const askWilson = useLLMStore((s) => s.askWilson);
  const streamingContent = useLLMStore((s) => s.streamingContent);
  const pendingAttachments = useLLMStore((s) => s.pendingAttachments);
  const addAttachment = useLLMStore((s) => s.addAttachment);
  const removeAttachment = useLLMStore((s) => s.removeAttachment);
  const sessions = useLLMStore((s) => s.sessions);
  const currentSessionId = useLLMStore((s) => s.currentSessionId);
  const createNewChat = useLLMStore((s) => s.createNewChat);
  const loadSession = useLLMStore((s) => s.loadSession);
  const renameSession = useLLMStore((s) => s.renameSession);
  const deleteSession = useLLMStore((s) => s.deleteSession);

  const [userInput, setUserInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isChatOpen && !currentSessionId) {
      createNewChat();
    }
  }, [isChatOpen, currentSessionId, createNewChat]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [interactionHistory.length, streamingContent]);

  const checkAndSend = useCallback(async () => {
    if ((!userInput.trim() && pendingAttachments.length === 0) || isThinking) return;
    const text = userInput;
    setUserInput('');
    if (text.trim().toLowerCase().startsWith('/ai')) {
      const prompt = text.replace(/^\/ai\s*/i, '');
      const context = { url: window.location.href, pageText: document.body.innerText.substring(0, 5000) };
      useLLMStore.getState().setContext(context);
      await askWilson(prompt || 'Analyze this page content.');
      useLLMStore.getState().setContext(null);
    } else {
      await askWilson(text);
    }
  }, [userInput, isThinking, askWilson, pendingAttachments.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') checkAndSend();
  }, [checkAndSend]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        secureLogger.warn('[wilson] File too large:', file.name);
        continue;
      }
      await addAttachment(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addAttachment]);

  const handleScreenshotClick = useCallback(async () => {
    try {
      // Capture the current page using dom-to-image approach
      const canvas = await capturePageScreenshot();
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png');
        // Create a file from the data URL
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `screenshot-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`, { type: 'image/png' });
        await addAttachment(file);
      }
    } catch (err) {
      secureLogger.error('[wilson] Failed to capture screenshot:', err);
      toast.error('Failed to capture screenshot');
    }
  }, [addAttachment]);

  const handleAttachmentClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleNewChat = () => {
    createNewChat();
    setShowHistory(false);
  };

  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
    setShowHistory(false);
  };

  // Handle voice transcript
  const handleVoiceTranscript = useCallback(async (text: string) => {
    if (!text.trim() || isThinking) return;
    setUserInput('');
    await askWilson(text);
  }, [isThinking, askWilson]);

  // Use Wilson voice for responses
  const { speak } = useWilsonVoice();

  // Speak Wilson's responses
  useEffect(() => {
    if (streamingContent && !isThinking) {
      // Speak the completed response
      speak(streamingContent);
    }
  }, [streamingContent, isThinking, speak]);

  const currentSession = sessions.find(s => s.id === currentSessionId);

  return (
    <div className={`fixed inset-y-0 right-0 bg-background border-l-2 border-primary shadow-[-4px_0_0_var(--primary)] z-[110] flex transition-transform duration-300 transform ${isChatOpen ? 'translate-x-0' : 'translate-x-full'} ${showHistory ? 'w-[90vw] md:w-[600px]' : 'w-[90vw] md:w-[400px]'}`}>
      {showHistory && (
        <div className="w-[200px] border-r border-primary/30 flex flex-col bg-black/30">
          <div className="p-3 border-b border-primary/30 flex justify-between items-center">
            <span className="text-xs font-bold text-primary lowercase flex items-center gap-2">
              <History size={14} /> chat history
            </span>
            <button onClick={handleNewChat} className="p-1 hover:bg-primary/20 rounded text-primary/60 hover:text-primary" title="New chat">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <div className="text-center text-primary/40 text-xs lowercase p-4">no saved chats yet</div>
            )}
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onClick={() => handleLoadSession(session.id)}
                onRename={renameSession}
                onDelete={deleteSession}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-primary flex justify-between items-center bg-black/50">
          <div className="flex items-center gap-2 text-primary font-bold lowercase">
            <button onClick={() => setShowHistory(!showHistory)} className={`p-1 rounded hover:bg-primary/20 transition-colors ${showHistory ? 'text-primary' : 'text-primary/60'}`} title={showHistory ? 'Hide history' : 'Show history'}>
              <History size={18} />
            </button>
            <span>wilson</span>
            {currentSession && (
              <span className="text-xs font-normal text-primary/50 truncate max-w-[120px]">- {currentSession.title}</span>
            )}
            {pendingAttachments.length > 0 && (
              <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">{pendingAttachments.length} attachment{pendingAttachments.length > 1 ? 's' : ''}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleNewChat} className="p-2 hover:bg-primary/20 rounded text-primary/60 hover:text-primary" title="New chat">
              <Plus size={16} />
            </button>
            <button onClick={() => setChatOpen(false)} className="p-2 hover:bg-primary/20 rounded text-primary/60 hover:text-white">
              <X size={18} />
            </button>
          </div>
        </div>
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-sm">
          {interactionHistory.length === 0 && !streamingContent && (
            <div className="text-primary opacity-50 text-center mt-10 lowercase">
              <p>systems online.</p>
              <p>waiting for input...</p>
              <p className="mt-4 text-xs">supports images, gifs, and videos with {friendlyModelName(RAW_MODEL_NAME)}</p>
              <p className="mt-2 text-xs text-primary/30" title={RAW_MODEL_NAME}>routing to: {friendlyModelName(RAW_MODEL_NAME)}</p>
            </div>
          )}
          {interactionHistory.map((msg) => <ChatBubble key={msg.id} message={msg} />)}
          <StreamingBubble />
          {isThinking && !streamingContent && (
            <div className="flex items-center gap-2 text-primary text-xs animate-pulse lowercase">
              <BrainCircuit size={14} /><span>processing with {friendlyModelName(RAW_MODEL_NAME).split(' ')[0]}...</span>
            </div>
          )}
        </div>
        {pendingAttachments.length > 0 && (
          <div className="px-4 py-2 border-t border-primary/30 bg-black/30">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {pendingAttachments.map((att) => <AttachmentPreview key={att.id} attachment={att} onRemove={() => removeAttachment(att.id)} />)}
            </div>
          </div>
        )}
        <div className="p-4 border-t border-primary bg-background">
          <div className="relative flex items-center gap-2">
            <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.gif" onChange={handleFileSelect} className="hidden" />
            <button onClick={handleAttachmentClick} disabled={isThinking} className="text-primary hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-primary/10 transition-colors" title="Attach files">
              <Paperclip size={18} />
            </button>
            <button onClick={handleScreenshotClick} disabled={isThinking} className="text-primary hover:text-white disabled:opacity-30 p-2 rounded-lg hover:bg-primary/10 transition-colors" title="Capture screenshot of current page">
              <Camera size={18} />
            </button>
            <div className="relative flex-1">
              <input value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={handleKeyDown} type="text" placeholder="chat..." disabled={isThinking} className="w-full bg-black border-2 border-primary rounded-lg py-3 pl-4 pr-10 text-primary focus:outline-none focus:border-primary placeholder:text-primary/30 lowercase disabled:opacity-50" />
              <button onClick={checkAndSend} className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white disabled:opacity-50" disabled={(!userInput.trim() && pendingAttachments.length === 0) || isThinking}>
                <Send size={16} />
              </button>
            </div>
            <VoiceChat 
              onTranscript={handleVoiceTranscript}
              disabled={isThinking}
              wilsonPersonality={true}
            />
          </div>
          <div className="text-[10px] text-primary/30 mt-2 lowercase flex items-center gap-2">
            <Image size={10} />
            <span>supports: jpg, png, gif, webp, mp4, mov</span>
            <span className="ml-auto" title={RAW_MODEL_NAME}>model: {friendlyModelName(RAW_MODEL_NAME)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
