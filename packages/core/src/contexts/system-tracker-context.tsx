import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { systemTrackerAPI } from '@/lib/system-tracker-api';
import { useFronter } from '@/contexts/fronter-context';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';

export interface Connection {
  id: string;
  from_headmate_id: string;
  to_headmate_id: string;
  relationship_type: string;
  strength: number;
  is_mutual: boolean;
  notes: string;
  style?: Record<string, unknown>;
}

export interface Scene {
  id: string;
  name: string;
  description: string;
  location_type: string;
  atmosphere: string;
  lighting: string;
  soundscape: string;
  sensory_details: string;
  image_url: string;
  image_prompt: string;
}

export interface SystemEvent {
  id: string;
  event_type: string;
  description: string;
  headmates: string[];
  data: Record<string, unknown>;
  timestamp: string;
  source: string;
}

export interface HeadmateNote {
  id: string;
  headmate: string;
  title: string;
  content: string;
  tags: string[];
  visibility: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface SystemTrackerContextType {
  connections: Connection[];
  scenes: Scene[];
  events: SystemEvent[];
  notes: HeadmateNote[];
  loading: boolean;
  refreshConnections: () => Promise<void>;
  refreshScenes: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  refreshNotes: (headmateId?: string) => Promise<void>;
  createConnection: (data: Omit<Connection, 'id'>) => Promise<Connection | null>;
  updateConnection: (id: string, data: Partial<Connection>) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  createScene: (data: Omit<Scene, 'id'>) => Promise<Scene | null>;
  updateScene: (id: string, data: Partial<Scene>) => Promise<void>;
  deleteScene: (id: string) => Promise<void>;
  createNote: (data: Omit<HeadmateNote, 'id' | 'created_at' | 'updated_at'>) => Promise<HeadmateNote | null>;
  updateNote: (id: string, data: Partial<HeadmateNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  generateImage: (prompt: string, type: string, headmateId?: string) => Promise<string | null>;
  logEvent: (data: { event_type: string; description: string; headmates?: string[]; data?: Record<string, unknown> }) => Promise<void>;
}

const SystemTrackerContext = createContext<SystemTrackerContextType | undefined>(undefined);

export function SystemTrackerProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [notes, setNotes] = useState<HeadmateNote[]>([]);
  const [loading, setLoading] = useState(false);
  const { refresh: refreshFronter } = useFronter();

  const refreshConnections = useCallback(async () => {
    try {
      const result = await systemTrackerAPI.getConnections();
      setConnections(result.data || []);
    } catch (err: any) {
      secureLogger.warn('[connections] fetch error:', err.message);
    }
  }, []);

  const refreshScenes = useCallback(async () => {
    try {
      const result = await systemTrackerAPI.getScenes();
      setScenes(result.data || []);
    } catch (err: any) {
      secureLogger.warn('[scenes] fetch error:', err.message);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const result = await systemTrackerAPI.getEvents();
      setEvents(result.data || []);
    } catch (err: any) {
      secureLogger.warn('[events] fetch error:', err.message);
    }
  }, []);

  const refreshNotes = useCallback(async (headmateId?: string) => {
    try {
      const result = await systemTrackerAPI.getNotes(headmateId);
      setNotes(result.data || []);
    } catch (err: any) {
      secureLogger.warn('[notes] fetch error:', err.message);
    }
  }, []);

  const createConnection = useCallback(async (data: Omit<Connection, 'id'>) => {
    try {
      const result = await systemTrackerAPI.createConnection(data);
      if (result.connection) {
        setConnections(prev => [...prev, result.connection]);
        toast.success('connection created');
        return result.connection;
      }
      return null;
    } catch (err: any) {
      secureLogger.error('[connection/create] error:', err.message);
      toast.error('failed to create connection');
      return null;
    }
  }, []);

  const updateConnection = useCallback(async (id: string, data: Partial<Connection>) => {
    try {
      await systemTrackerAPI.updateConnection(id, data);
      setConnections(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
      toast.success('connection updated');
    } catch (err: any) {
      secureLogger.error('[connection/update] error:', err.message);
      toast.error('failed to update connection');
    }
  }, []);

  const deleteConnection = useCallback(async (id: string) => {
    try {
      await systemTrackerAPI.deleteConnection(id);
      setConnections(prev => prev.filter(c => c.id !== id));
      toast.success('connection deleted');
    } catch (err: any) {
      secureLogger.error('[connection/delete] error:', err.message);
      toast.error('failed to delete connection');
    }
  }, []);

  const createScene = useCallback(async (data: Omit<Scene, 'id'>) => {
    try {
      const result = await systemTrackerAPI.createScene(data);
      if (result.scene) {
        setScenes(prev => [...prev, result.scene]);
        toast.success('scene created');
        return result.scene;
      }
      return null;
    } catch (err: any) {
      secureLogger.error('[scene/create] error:', err.message);
      toast.error('failed to create scene');
      return null;
    }
  }, []);

  const updateScene = useCallback(async (id: string, data: Partial<Scene>) => {
    try {
      await systemTrackerAPI.updateScene(id, data);
      setScenes(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
      toast.success('scene updated');
    } catch (err: any) {
      secureLogger.error('[scene/update] error:', err.message);
      toast.error('failed to update scene');
    }
  }, []);

  const deleteScene = useCallback(async (id: string) => {
    try {
      await systemTrackerAPI.deleteScene(id);
      setScenes(prev => prev.filter(s => s.id !== id));
      toast.success('scene deleted');
    } catch (err: any) {
      secureLogger.error('[scene/delete] error:', err.message);
      toast.error('failed to delete scene');
    }
  }, []);

  const createNote = useCallback(async (data: Omit<HeadmateNote, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await systemTrackerAPI.createNote(data);
      if (result.note) {
        setNotes(prev => [...prev, result.note as HeadmateNote]);
        toast.success('note created');
        return result.note as HeadmateNote;
      }
      return null;
    } catch (err: any) {
      secureLogger.error('[note/create] error:', err.message);
      toast.error('failed to create note');
      return null;
    }
  }, []);

  const updateNote = useCallback(async (id: string, data: Partial<HeadmateNote>) => {
    try {
      await systemTrackerAPI.updateNote(id, data);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...data } : n));
      toast.success('note updated');
    } catch (err: any) {
      secureLogger.error('[note/update] error:', err.message);
      toast.error('failed to update note');
    }
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    try {
      await systemTrackerAPI.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success('note deleted');
    } catch (err: any) {
      secureLogger.error('[note/delete] error:', err.message);
      toast.error('failed to delete note');
    }
  }, []);

  const generateImage = useCallback(async (prompt: string, type: string, headmateId?: string) => {
    try {
      const result = await systemTrackerAPI.generateImage(prompt, type, headmateId);
      toast.success('image generated');
      return result.image_base64 || null;
    } catch (err: any) {
      secureLogger.error('[image/generate] error:', err.message);
      toast.error('failed to generate image');
      return null;
    }
  }, []);

  const logEvent = useCallback(async (data: { event_type: string; description: string; headmates?: string[]; data?: Record<string, unknown> }) => {
    try {
      await systemTrackerAPI.createEvent(data);
    } catch (err: any) {
      secureLogger.warn('[event/log] error:', err.message);
    }
  }, []);

  return (
    <SystemTrackerContext.Provider
      value={{
        connections, scenes, events, notes, loading,
        refreshConnections, refreshScenes, refreshEvents, refreshNotes,
        createConnection, updateConnection, deleteConnection,
        createScene, updateScene, deleteScene,
        createNote, updateNote, deleteNote,
        generateImage, logEvent,
      }}
    >
      {children}
    </SystemTrackerContext.Provider>
  );
}

export function useSystemTracker() {
  const context = useContext(SystemTrackerContext);
  if (context === undefined) {
    throw new Error('useSystemTracker must be used within a SystemTrackerProvider');
  }
  return context;
}
