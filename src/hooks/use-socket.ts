import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// global singleton to reuse connection
let socket: Socket | null = null;

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
  if (!socket) {
  // connecting to host ip for cross-device support
  socket = io('http://192.168.4.65:3456', {
 reconnectionAttempts: 5,
 reconnectionDelay: 1000,
 autoConnect: true,
  });

  socket.on('connect', () => {
 console.log('Socket connected:', socket?.id);
 setIsConnected(true);
  });

  socket.on('disconnect', () => {
 console.log('Socket disconnected');
 setIsConnected(false);
  });

  socket.on('connect_error', (err) => {
 console.warn("Socket connect error:", err);
  });
  } else {
  setIsConnected(socket.connected);
  if (!socket.connected) socket.connect();
  }

  return () => {
  // we generally keep the socket open for the app session,
  // but could add ref counting here if needed to close on last component unmount.
  };
  }, []);

  return { socket, isConnected };
};