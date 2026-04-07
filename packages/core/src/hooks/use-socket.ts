import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureLogger } from '@/lib/secure-logger';

// global singleton to reuse connection across components
let socket: Socket | null = null;
let socketRefCount = 0;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRefCount++;

    // lazy initialization of the socket connection
    if (!socket) {
      socket = io(import.meta.env.VITE_SOCKET_URL || 'wss:// db.houseofmates.space', {
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

    // trigger connection if idle
    if (!s.connected) {
      try {
        s.connect();
      } catch (err) {
        secureLogger.warn('socket connect attempt failed:', err);
      }
    }

    return () => {
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
      }
    };
  }, []);

  return { socket: socketRef.current, isConnected };
};
