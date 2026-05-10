/* eslint-disable */
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureLogger } from '@/lib/secure-logger';

// connection state machine types
type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

// global singleton to reuse connection across components
let socket: Socket | null = null;
let socketRefCount = 0;
let connectionState: SocketStatus = 'disconnected';
let retryCount = 0;
let lastPingMs = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingEmits: { event: string; args: any[] }[] = [];

const STATUS_LISTENERS = new Set<() => void>();

function notifyStatusListeners() {
  STATUS_LISTENERS.forEach(cb => {
    try { cb(); } catch { /* ignore */ }
  });
}

function getBackoffDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 30000;
  const jitter = Math.random() * 1000;
  return Math.min(maxDelay, baseDelay * Math.pow(2, attempt)) + jitter;
}

function clearTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  if (heartbeatTimeout) {
    clearTimeout(heartbeatTimeout);
    heartbeatTimeout = null;
  }
}

function startHeartbeat(s: Socket) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    if (!s.connected) return;
    s.emit('ping');
    const sentAt = Date.now();
    if (heartbeatTimeout) clearTimeout(heartbeatTimeout);
    heartbeatTimeout = setTimeout(() => {
      secureLogger.warn('[Socket] heartbeat timeout, forcing reconnect');
      s.disconnect();
      attemptReconnect();
    }, 5000);
    const onPong = () => {
      lastPingMs = Date.now() - sentAt;
      notifyStatusListeners();
      s.off('pong', onPong);
      if (heartbeatTimeout) {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      }
    };
    s.once('pong', onPong);
  }, 15000);
}

function attemptReconnect() {
  if (connectionState === 'connecting' || connectionState === 'connected') return;
  connectionState = 'reconnecting';
  notifyStatusListeners();

  const delay = getBackoffDelay(retryCount);
  secureLogger.info(`[Socket] reconnecting in ${Math.round(delay)}ms (attempt ${retryCount})`);

  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    retryCount++;
    initSocket();
  }, delay);
}

function flushPendingEmits() {
  if (!socket || !socket.connected) return;
  while (pendingEmits.length > 0) {
    const item = pendingEmits.shift();
    if (item) socket.emit(item.event, ...item.args);
  }
}

function initSocket() {
  if (socket) {
    // remove old listeners to avoid duplicates
    socket.removeAllListeners();
    socket.disconnect();
  }

  connectionState = 'connecting';
  notifyStatusListeners();

  const url = import.meta.env.VITE_SOCKET_URL || window.location.origin;
  socket = io(url, {
    reconnection: false, // we handle reconnection manually
    autoConnect: true,
    timeout: 10000,
    path: '/socket.io',
  });

  const s = socket;

  s.on('connect', () => {
    secureLogger.info('socket connected:', s.id);
    connectionState = 'connected';
    retryCount = 0;
    lastPingMs = 0;
    notifyStatusListeners();
    startHeartbeat(s);
    flushPendingEmits();
  });

  s.on('disconnect', (reason) => {
    secureLogger.info('socket disconnected:', reason);
    connectionState = 'disconnected';
    notifyStatusListeners();
    clearTimers();
    // if the disconnect was not intentional, reconnect
    if (reason !== 'io client disconnect') {
      attemptReconnect();
    }
  });

  s.on('connect_error', (err: any) => {
    secureLogger.warn('socket connect error:', err?.message || err);
    connectionState = 'disconnected';
    notifyStatusListeners();
    clearTimers();
    attemptReconnect();
  });
}

function getOrCreateSocket(): Socket {
  if (!socket) {
    initSocket();
  }
  return socket!;
}

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(socket?.connected ?? false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRefCount++;
    const s = getOrCreateSocket();
    socketRef.current = s;
    setIsConnected(s.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    // trigger connection if idle
    if (!s.connected) {
      try {
        s.connect();
      } catch (err) {
        secureLogger.warn('socket connect attempt failed:', err);
      }
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      socketRefCount--;
      if (socketRefCount <= 0 && socket) {
        secureLogger.info('disconnecting socket (no active consumers)');
        clearTimers();
        socket.disconnect();
        socket = null;
        socketRefCount = 0;
        connectionState = 'disconnected';
        retryCount = 0;
        lastPingMs = 0;
        pendingEmits = [];
      }
    };
  }, []);

  // wrap emit to queue when offline
  const emit = useCallback((event: string, ...args: any[]) => {
    const s = socketRef.current;
    if (s && s.connected) {
      s.emit(event, ...args);
    } else {
      pendingEmits.push({ event, args });
      secureLogger.debug(`[Socket] queued emit '${event}' (offline)`);
    }
  }, []);

  return { socket: socketRef.current, isConnected, emit };
};

export function useSocketState() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    STATUS_LISTENERS.add(listener);
    return () => {
      STATUS_LISTENERS.delete(listener);
    };
  }, []);

  return {
    status: connectionState,
    retryCount,
    lastPingMs,
  };
}
