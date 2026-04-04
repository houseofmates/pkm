import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureLogger } from '@/lib/secure-logger';

// global singleton to reuse connection
let socket: Socket | null = null;
let socketRefCount = 0;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRefCount++;
    socketRef.current = socket;

    if (!socket) {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://db.houseofmates.space';
      socket = io(`${backendUrl}/socket`, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        timeout: 10000,
      });

      socket.on('connect', () => {
        secureLogger.info('Socket connected:', socket?.id);
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });

      socket.on('disconnect', () => {
        secureLogger.info('Socket disconnected');
        setIsConnected(false);
      });

      socket.on('connect_error', (err) => {
        secureLogger.warn("Socket connect error:", err?.message || err);
        setIsConnected(false);
      });

      socket.on('reconnect_failed', () => {
        secureLogger.warn("Socket reconnection failed after all attempts");
        setIsConnected(false);
      });

    } else {
      const raf = requestAnimationFrame(() => setIsConnected(!!socket?.connected));
      if (!socket.connected) {
        try {
          socket.connect();
        } catch (err) {
          secureLogger.warn("Socket connect failed:", err);
        }
      }
      return () => cancelAnimationFrame(raf);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socketRefCount--;
      if (socketRefCount <= 0 && socket) {
        secureLogger.info('Disconnecting socket (no active consumers)');
        socket.disconnect();
        socket = null;
        socketRefCount = 0;
      }
    };
  }, []);

  return { socket, isConnected };
};
