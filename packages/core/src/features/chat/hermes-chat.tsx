import { useRef, useEffect, useState, memo, useCallback } from "react";
import { useHermesStore } from "@/stores/hermes-store";
import { useLLMStore } from "@/stores/llm-store";
import { fetchApiKeysFromServer } from "@/lib/llm-config";
import {
 Send,
 X,
 BrainCircuit,
 History,
 Plus,
 Trash2,
 Edit2,
 MessageSquare,
 Key,
} from "lucide-react";
import { useEdgelessStore } from "@/features/edgeless/store";
import { secureLogger } from "@/lib/secure-logger";
import { ApiKeySetup } from "@/features/settings/api-key-setup";

function compactTimestamp(ts: number | undefined): string {
  if (!ts) return "";
  const now = new Date();
  const diffMs = now.getTime() - ts;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;

  const date = new Date(ts);
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return `today ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString())
    return `yesterday ${timeStr}`;

  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    `, ${timeStr}`
  );
}

interface ChatBubbleProps {
  message: { id: number; role: string; content: string; timestamp?: number };
}

const ChatBubble = memo(function ChatBubble({ message }: ChatBubbleProps) {
  return (
    <div
      className={`flex flex-col gap-1 ${message.role === "assistant" ? "items-start" : "items-end"}`}
    >
      <span className="text-[10px] text-primary opacity-50 lowercase">
        {message.role === "assistant" ? "hermes" : "user"}
      </span>
      <div
        className={`p-3 rounded-lg max-w-[90%] ${message.role === "assistant" ? "bg-primary/10 border border-primary/20 text-primary" : "bg-black border border-gray-700 text-gray-300"}`}
      >
        {message.content}
      </div>
      {message.timestamp && (
        <span className="text-[9px] text-primary/30">
          {compactTimestamp(message.timestamp)}
        </span>
      )}
    </div>
  );
});

const StreamingBubble = memo(function StreamingBubble() {
  const streamingContent = useHermesStore((s) => s.streamingContent);
  if (!streamingContent) return null;
  return (
    <div className="flex flex-col gap-1 items-start">
      <span className="text-[10px] text-primary opacity-50 lowercase">
        hermes
      </span>
      <div className="p-3 rounded-lg max-w-[90%] bg-primary/10 border border-primary/20 text-primary">
        {streamingContent}
        <span className="inline-block w-1.5 h-3.5 bg-primary/60 ml-0.5 animate-pulse" />
      </div>
    </div>
  );
});

interface SessionItemProps {
  session: { id: string; title: string; createdAt: number };
  isActive: boolean;
  onClick: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

const SessionItem = memo(function SessionItem({
  session,
  isActive,
  onClick,
  onRename,
  onDelete,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);

  const handleSave = () => {
    onRename(session.id, editTitle);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditTitle(session.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isActive ? "bg-primary/20 border border-primary/30" : "hover:bg-primary/10 border border-transparent"}`}
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
          className="flex-1 bg-black/50 border border-primary/30 rounded px-1 py-0.5 text-xs text-primary"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-xs text-primary truncate">
          {session.title}
        </span>
      )}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
          className="p-1 hover:bg-primary/20 rounded text-primary/60 hover:text-primary"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
});

export function HermesChat() {
 const isChatOpen = useEdgelessStore((s) => s.isChatOpen);
 const setChatOpen = useEdgelessStore((s) => s.setChatOpen);
 
 const connected = useHermesStore((s) => s.connected);
 const interactionHistory = useHermesStore((s) => s.interactionHistory);
 const isThinking = useHermesStore((s) => s.isThinking);
 const askHermes = useHermesStore((s) => s.askHermes);
 const streamingContent = useHermesStore((s) => s.streamingContent);
 const sessions = useHermesStore((s) => s.sessions);
 const currentSessionId = useHermesStore((s) => s.currentSessionId);
 const createNewChat = useHermesStore((s) => s.createNewChat);
 const loadSession = useHermesStore((s) => s.loadSession);
 const setEnabled = useHermesStore((s) => s.setEnabled);

 const [userInput, setUserInput] = useState("");
 const [showHistory, setShowHistory] = useState(false);
 const [showApiKeySetup, setShowApiKeySetup] = useState(false);
 const [apiKeysLoaded, setApiKeysLoaded] = useState(false);
 const chatContainerRef = useRef<HTMLDivElement>(null);

 // fetch api keys from server on mount
 useEffect(() => {
 fetchApiKeysFromServer().then(() => {
 setApiKeysLoaded(true);
 });
 }, []);

 // ensure enabled on mount
 useEffect(() => {
 setEnabled(true);
 }, [setEnabled]);

 useEffect(() => {
 if (isChatOpen && !currentSessionId) {
 createNewChat();
 }
 }, [isChatOpen, currentSessionId, createNewChat]);

 useEffect(() => {
 if (chatContainerRef.current) {
 chatContainerRef.current.scrollTop =
 chatContainerRef.current.scrollHeight;
 }
 }, [interactionHistory.length, streamingContent]);

 const checkAndSend = useCallback(async () => {
 if (!userInput.trim() || isThinking) return;
 const text = userInput;
 setUserInput("");
 await askHermes(text);
  }, [userInput, isThinking, askHermes]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") checkAndSend();
    },
    [checkAndSend],
  );

  const handleNewChat = () => {
    createNewChat();
    setShowHistory(false);
  };

  const handleLoadSession = (sessionId: string) => {
    loadSession(sessionId);
    setShowHistory(false);
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    // todo: add renameSession to hermes-store if needed
    secureLogger.info("[hermes-chat] rename session:", sessionId, newTitle);
  };

  const handleDeleteSession = (sessionId: string) => {
    // todo: add deleteSession to hermes-store if needed
    secureLogger.info("[hermes-chat] delete session:", sessionId);
  };

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div
      className={`fixed inset-y-0 right-0 bg-background border-l-2 border-primary shadow-[-4px_0_0_var(--primary)] z-[110] flex transition-transform duration-300 transform ${isChatOpen ? "translate-x-0" : "translate-x-full"} ${showHistory ? "w-[90vw] md:w-[600px]" : "w-[90vw] md:w-[400px]"}`}
    >
      {showHistory && (
        <div className="w-[200px] border-r border-primary/30 flex flex-col bg-black/30">
          <div className="p-3 border-b border-primary/30 flex justify-between items-center">
            <span className="text-xs font-bold text-primary flex items-center gap-2">
              <History size={14} /> chat history
            </span>
            <button
              onClick={handleNewChat}
              className="p-1 hover:bg-primary/20 rounded text-primary/60 hover:text-primary"
              title="new chat"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <div className="text-center text-primary/40 text-xs p-4">
                no saved chats yet
              </div>
            )}
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === currentSessionId}
                onClick={() => handleLoadSession(session.id)}
                onRename={handleRenameSession}
                onDelete={handleDeleteSession}
              />
            ))}
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-primary flex justify-between items-center bg-black/50">
          <div className="flex items-center gap-2 text-primary font-bold">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-1 rounded hover:bg-primary/20 transition-colors ${showHistory ? "text-primary" : "text-primary/60"}`}
              title={showHistory ? "hide history" : "show history"}
            >
              <History size={18} />
            </button>
            <span className="lowercase">hermes</span>
            {currentSession && (
              <span
                className="text-xs font-normal text-primary/50 truncate max-w-[120px]"
                title={currentSession.title}
              >
                - {compactTimestamp(currentSession.createdAt)}
              </span>
            )}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
            >
              {connected ? "connected" : "disconnected"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleNewChat}
              className="p-2 hover:bg-primary/20 rounded text-primary/60 hover:text-primary"
              title="new chat"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setChatOpen(false)}
              className="p-2 hover:bg-primary/20 rounded text-primary/60 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 font-mono text-sm"
        >
          {interactionHistory.length === 0 && !streamingContent && (
            <div className="text-primary opacity-50 text-center mt-10">
              <p>hermes online.</p>
              <p>waiting for input...</p>
              <p className="mt-4 text-xs lowercase">
                connected via websocket bridge
              </p>
              <p className="mt-2 text-xs text-primary/30 lowercase">
                has full mcp tool access
              </p>
            </div>
          )}
          {interactionHistory.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          <StreamingBubble />
          {isThinking && !streamingContent && (
            <div className="flex items-center gap-2 text-primary text-xs animate-pulse">
              <BrainCircuit size={14} />
              <span className="lowercase">thinking...</span>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-primary bg-background">
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                type="text"
                placeholder="chat with hermes..."
                disabled={isThinking || !connected}
                className="w-full bg-black border-2 border-primary rounded-lg py-3 pl-4 pr-10 text-primary focus:outline-none focus:border-primary placeholder:text-primary/30 disabled:opacity-50 lowercase"
              />
              <button
                onClick={checkAndSend}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-white disabled:opacity-50"
                disabled={!userInput.trim() || isThinking || !connected}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
 <div className="text-[10px] text-primary/30 mt-2 flex items-center gap-2">
 <span className="lowercase">
 {connected ? "websocket connected" : "connecting..."}
 </span>
 <button
 onClick={() => setShowApiKeySetup(true)}
 className="ml-auto flex items-center gap-1 hover:text-primary/60 transition-colors"
 title="configure api keys"
 >
 <Key size={10} />
 <span className="lowercase">api keys</span>
 </button>
 </div>
 </div>
 </div>
 </div>
 {showApiKeySetup && (
 <ApiKeySetup onComplete={() => setShowApiKeySetup(false)} />
 )}
 );
}

export default HermesChat;
