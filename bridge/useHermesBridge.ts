// useHermesBridge - hook for connecting pkm chat to hermes agent
// this hooks into the llm-store and routes messages to the hermes bridge

import { useState, useEffect, useCallback, useRef } from 'react';

export interface HermesBridgeConfig {
  wsUrl?: string; // default: ws://localhost:3101
  enabled?: boolean; // default: false (use wilson by default)
}

export interface HermesMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface UseHermesBridgeReturn {
  connected: boolean;
  messages: HermesMessage[];
  sendMessage: (text: string) => void;
  streamingContent: string | null;
  error: string | null;
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

// singleton websocket connection
let wsInstance: WebSocket | null = null;
let messageCallbacks: Set<(msg: any) => void> = new Set();

function getWebSocket(url: string): WebSocket {
  if (!wsInstance || wsInstance.readyState === WebSocket.CLOSED) {
    wsInstance = new WebSocket(url);
    
    wsInstance.onopen = () => {
      console.log('[hermes-bridge] connected');
      wsInstance?.send(JSON.stringify({ type: 'start' }));
    };

    wsInstance.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      messageCallbacks.forEach(cb => cb(msg));
    };

    wsInstance.onerror = (err) => {
      console.error('[hermes-bridge] error:', err);
    };

    wsInstance.onclose = () => {
      console.log('[hermes-bridge] disconnected');
      wsInstance = null;
    };
  }
  return wsInstance;
}

export function useHermesBridge(config: HermesBridgeConfig = {}): UseHermesBridgeReturn {
  const wsUrl = config.wsUrl || 'ws://localhost:3101';
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<HermesMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(config.enabled || false);
  const messageQueueRef = useRef<string[]>([]);

  // handle incoming messages
  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (msg: any) => {
      switch (msg.type) {
        case 'ready':
          setConnected(true);
          setError(null);
          // flush queued messages
          while (messageQueueRef.current.length > 0) {
            const text = messageQueueRef.current.shift();
            if (text && wsInstance) {
              wsInstance.send(JSON.stringify({ type: 'message', content: text }));
            }
          }
          break;

        case 'stream':
          setStreamingContent(prev => (prev || '') + msg.content);
          break;

        case 'end':
          setStreamingContent(null);
          setConnected(false);
          break;

        case 'error':
          setError(msg.message);
          break;

        case 'ack':
          // message acknowledged
          break;
      }
    };

    messageCallbacks.add(handleMessage);

    // connect
    const ws = getWebSocket(wsUrl);
    
    const checkConnected = setInterval(() => {
      setConnected(ws.readyState === WebSocket.OPEN);
    }, 1000);

    return () => {
      messageCallbacks.delete(handleMessage);
      clearInterval(checkConnected);
    };
  }, [enabled, wsUrl]);

  // send message
  const sendMessage = useCallback((text: string) => {
    if (!enabled) {
      console.log('[hermes-bridge] not enabled, skipping send');
      return;
    }

    // add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }]);

    // send to hermes
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({ type: 'message', content: text }));
    } else {
      // queue for when connection is ready
      messageQueueRef.current.push(text);
    }

    // streaming response will be handled by the effect
    // when stream ends, finalize the assistant message
    setStreamingContent('');
    
    // watch for stream completion
    const finalizeMessage = () => {
      setStreamingContent(prev => {
        if (prev === null) {
          // stream ended, add to messages
          return null;
        }
        return prev;
      });
    };

    // use a timeout to check if streaming is done
    // (this is a bit hacky but works for now)
    let lastContent = '';
    const checkInterval = setInterval(() => {
      setStreamingContent(prev => {
        if (prev === null) {
          clearInterval(checkInterval);
          return null;
        }
        if (prev === lastContent && prev.length > 0) {
          // content stable, finalize
          setMessages(messages => [...messages, {
            role: 'assistant',
            content: prev,
            timestamp: Date.now(),
          }]);
          clearInterval(checkInterval);
          return null;
        }
        lastContent = prev;
        return prev;
      });
    }, 500);

    // cleanup after 60s max
    setTimeout(() => clearInterval(checkInterval), 60000);
  }, [enabled]);

  return {
    connected,
    messages,
    sendMessage,
    streamingContent,
    error,
    enabled,
    setEnabled,
  };
}

// alternative: a function that can be dropped into askWilson
// this intercepts the call and routes to hermes if enabled
export function createHermesBridgeInterceptor(
  wsUrl: string = 'ws://localhost:3101'
) {
  let ws: WebSocket | null = null;
  let pendingResolve: ((result: string | null) => void) | null = null;
  let responseBuffer = '';

  const connect = () => {
    if (ws && ws.readyState === WebSocket.OPEN) return;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      ws?.send(JSON.stringify({ type: 'start' }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'stream') {
        responseBuffer += msg.content;
      } else if (msg.type === 'end' && pendingResolve) {
        pendingResolve(responseBuffer || null);
        pendingResolve = null;
        responseBuffer = '';
      } else if (msg.type === 'error' && pendingResolve) {
        pendingResolve(null);
        pendingResolve = null;
      }
    };
  };

  const askHermes = async (text: string): Promise<string | null> => {
    return new Promise((resolve) => {
      connect();
      
      pendingResolve = resolve;
      responseBuffer = '';
      
      // wait for connection if needed
      const sendWhenReady = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'message', content: text }));
        } else if (ws && ws.readyState === WebSocket.CONNECTING) {
          setTimeout(sendWhenReady, 100);
        } else {
          connect();
          setTimeout(sendWhenReady, 100);
        }
      };
      
      sendWhenReady();
      
      // timeout after 2 minutes
      setTimeout(() => {
        if (pendingResolve) {
          pendingResolve(null);
          pendingResolve = null;
        }
      }, 120000);
    });
  };

  return {
    askHermes,
    disconnect: () => {
      if (ws) {
        ws.close();
        ws = null;
      }
    },
  };
}

export default useHermesBridge;
