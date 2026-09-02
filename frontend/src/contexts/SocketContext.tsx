'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { useToast } from '@/components/ui/use-toast';
import { useProctorStore } from '@/stores/proctorStore';
import { WebSocketEventType } from '@/types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

const PROCTOR_EVENTS: WebSocketEventType[] = [
  'PROCTORING_ALERT',
  'RISK_SCORE_UPDATED',
  'FACE_MISMATCH',
  'FACE_ABSENT',
  'MULTIPLE_PERSONS_DETECTED',
  'PHONE_DETECTED',
  'OBJECT_DETECTED',
];

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const isFirstConnect = useRef(true);
  const { toast } = useToast();

  const connect = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};

    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    const newSocket = io(socketUrl, {
      auth: {
        token: token || '',
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      useProctorStore.getState().setIsReconnecting(false);

      if (user && user._id) {
        newSocket.emit('authenticate', {
          userId: user._id,
          role: user.role,
        });
      }

      // If reconnecting (not initial mount connection), trigger store REST re-sync before ingesting new socket events
      if (!isFirstConnect.current) {
        console.log('[SocketContext] Socket reconnected. Triggering store state re-sync.');
        useProctorStore.getState().resyncState();
      } else {
        isFirstConnect.current = false;
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        useProctorStore.getState().setIsReconnecting(true);
      }
    });

    newSocket.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnect attempt #${attempt}`);
      useProctorStore.getState().setIsReconnecting(true);
    });

    newSocket.on('cheating_warning', (data) => {
      toast({
        title: 'Warning: Cheating Detected',
        description: data.details,
        variant: 'destructive',
      });
    });

    // Subscribe to all 7 proctoring WebSocket events
    PROCTOR_EVENTS.forEach((eventName) => {
      newSocket.on(eventName, (payload: any) => {
        console.log(`[Socket] Received ${eventName}:`, payload);
        useProctorStore.getState().ingestSocketEvent(eventName, payload);
      });
    });

    setSocket(newSocket);
  };

  const disconnect = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected, connect, disconnect }}>
      {children}
    </SocketContext.Provider>
  );
};