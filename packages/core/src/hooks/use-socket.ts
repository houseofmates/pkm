/* eslint-disable */
<<<<<<< HEAD
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureLogger } from '@/lib/secure-logger';
=======
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureLogger } from '@/lib/secure-logger';
import { offlineQueueService } from '@/services/offline-queue.service';

// connection state machine types
type SocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
>>>>>>> main

// global singleton to reuse connection across components
let socket: Socket | null = null;
let socketRefCount = 0;
<<<<<<< HEAD

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
=======
let connectionState: SocketStatus = 'disconnected';
let retryCount = 0;
let lastPingMs = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let heartbeatTimeout: ReturnType<typeof setTimeout> | null = null;
let isProcessingQueue = false;

const STATUS_LISTENERS = new Set<() => void>();

function notifyStatusListeners() {
  STATUS_LISTENERS.forEach(cb => {
    try { cb(); } catch { /* ignore */ }
  });
}

function getBackoffDelay(attempt: number): number {
  const baseDelay = 1000;
  const maxDelay = 60000; // increased max delay for better resilience
  const jitter = Math.random() * 2000; // increased jitter for better distribution
  return Math.min(maxDelay, baseDelay * Math.pow(2, Math.min(attempt, 10))) + jitter;
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

async function flushPendingEmits() {
  if (!socket || !socket.connected || isProcessingQueue) return;

  isProcessingQueue = true;
  try {
    // process queued operations from persistent storage
    const operations = await offlineQueueService.dequeue();

    for (const op of operations) {
      if (!socket.connected) break;

      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Emit timeout')), 10000); // increased timeout

          socket.emit(op.event, ...op.args, async (ack: any) => {
            clearTimeout(timeout);

            // check for conflicts in server response
            const hasConflict = await offlineQueueService.detectConflict(op, ack);
            if (hasConflict) {
              const conflictInfo = await offlineQueueService.handleConflict(op, ack);
              if (conflictInfo.resolution === 'failed') {
                reject(new Error('Conflict resolution failed'));
                return;
              }
            }

            if (ack?.error) {
              reject(new Error(ack.error));
            } else {
              resolve();
            }
          });
        });

        secureLogger.debug(`[Socket] Successfully sent queued operation ${op.id}`);
      } catch (error) {
        secureLogger.warn(`[Socket] Failed to send queued operation ${op.id}:`, error);
        // requeue failed operations with conflict detection
        await offlineQueueService.requeueFailed([op]);
      }
    }

    // after processing, check for any conflicts that need resolution
    const pendingConflicts = await offlineQueueService.getPendingConflicts();
    if (pendingConflicts.length > 0) {
      secureLogger.warn(`[Socket] ${pendingConflicts.length} conflicts pending resolution`);
      // todo: show conflict resolution ui
    }
  } catch (error) {
    secureLogger.error('[Socket] Error processing offline queue:', error);
  } finally {
    isProcessingQueue = false;
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
    flushPendingEmits(); // process offline queue when reconnected
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
>>>>>>> main
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRefCount++;
<<<<<<< HEAD

    // lazy initialization of the socket connection
    if (!socket) {
      socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        timeout: 10000,
        path: '/socket.io',
      });
    }

    const s = socket;
    socketRef.current = s;
    setIsConnected(s.connected);

    const onConnect = () => {
      secureLogger.info('socket connected:', s.id);
      setIsConnected(true);
    };

    const onDisconnect = () => {
      secureLogger.info('socket disconnected');
      setIsConnected(false);
    };

    const onError = (err: any) => {
      secureLogger.warn('socket connect error:', err?.message || err);
      setIsConnected(false);
    };

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
    s.on('connect_error', onError);
    s.on('reconnect_failed', onDisconnect);
=======
    const s = getOrCreateSocket();
    socketRef.current = s;
    setIsConnected(s.connected);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);
>>>>>>> main

    // trigger connection if idle
    if (!s.connected) {
      try {
        s.connect();
      } catch (err) {
        secureLogger.warn('socket connect attempt failed:', err);
      }
    }

    return () => {
<<<<<<< HEAD
      // cleanup listeners to prevent memory leaks and duplicate triggers
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('connect_error', onError);
      s.off('reconnect_failed', onDisconnect);

      socketRefCount--;
      // only disconnect when no active components are using the socket
      if (socketRefCount <= 0 && socket) {
        secureLogger.info('disconnecting socket (no active consumers)');
        socket.disconnect();
        socket = null;
        socketRefCount = 0;
=======
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
>>>>>>> main
      }
    };
  }, []);

<<<<<<< HEAD
  return { socket: socketRef.current, isConnected };
};
=======
  // wrap emit to queue when offline
  const emit = useCallback(async (event: string, ...args: any[]) => {
    const s = socketRef.current;
    if (s && s.connected) {
      try {
        s.emit(event, ...args);
      } catch (error) {
        secureLogger.warn(`[Socket] Emit failed, queuing operation:`, error);
        await offlineQueueService.enqueue(event, args, 'normal');
      }
    } else {
      await offlineQueueService.enqueue(event, args, 'normal');
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
>>>>>>> main
