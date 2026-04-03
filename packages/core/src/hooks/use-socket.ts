import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { secureLogger } from '@/lib/secure-logger';

// global singleton to reuse connection
let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) {
      // connecting to host ip for cross-device support
      socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4100', {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        timeout: 10000,
        forceNew: true,
      });

      socket.on('connect', () => {
        secureLogger.info('Socket connected:', socket?.id);
        setIsConnected(true);
        // Clear any pending reconnect timeout
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
        // Don't let socket errors crash the app - just log them
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
      // Clean up reconnect timeout on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      // We keep the socket open for the app session
    };
  }, []);

  return { socket, isConnected };
};
