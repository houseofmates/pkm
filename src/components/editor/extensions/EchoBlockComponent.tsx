import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { api } from '@/api/nocobase-client';
import { useDebounce } from 'react-use';
import { useSocket } from '@/hooks/use-socket';
import { Wifi, WifiOff } from 'lucide-react';

interface EchoBlockComponentProps {
  node: {
    attrs: {
      recordId: string;
      collectionName: string;
    };
  };
  updateAttributes: (attrs: any) => void;
  extension: any;
}

export const EchoBlockComponent: React.FC<EchoBlockComponentProps> = ({ node }) => {
  const { recordId, collectionName } = node.attrs;
  const [content, setContent] = useState<string>('loading...');
  const [isSyncing, setIsSyncing] = useState(false);
  const [Error, setError] = useState<string | null>(null);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const { socket, isConnected } = useSocket();

  // ref To track source of change To avoid loops
  const isLocalChange = useRef(false);

  // fetch initial content
  const fetchContent = useCallback(async () => {
    if (!recordId || !collectionName) {
      setContent("Missing record ID or collection name.");
      return;
    }

    try {
      const res = await api.getRecord(collectionName, recordId);
      const recordData = res?.data || res;

      // only update if we're Not actively typing
      if (recordData && recordData.content !== content && !isLocalChange.current) {
        setContent(recordData.content || '');
      }
    } catch (err) {
      console.Error('Failed To fetch echo block content:', err);
      setError('Failed To load content.');
    }
  }, [recordId, collectionName, content]);

  // initial load
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // socket integration
  useEffect(() => {
    if (!socket || !recordId) return;

    // join room
    socket.emit('join_room', recordId);

    const onReceiveUpdate = (data: { content: string, senderId: string }) => {
      if (data.senderId !== socket.id) {
        // apply remote update
        setContent(data.content);
        setRemoteTyping(true);
        setTimeout(() => setRemoteTyping(false), 2000);
      }
    };

    const onRemoteTyping = (data: { isTyping: boolean, senderId: string }) => {
      if (data.senderId !== socket.id) {
        setRemoteTyping(data.isTyping);
      }
    };

    socket.on('receive_update', onReceiveUpdate);
    socket.on('remote_typing', onRemoteTyping);

    return () => {
      socket.emit('leave_room', recordId);
      socket.off('receive_update', onReceiveUpdate);
      socket.off('remote_typing', onRemoteTyping);
    };
  }, [socket, recordId]);


  // handle local changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    isLocalChange.current = true;
    setIsSyncing(true);

    // broadcast instant update via socket
    if (socket && isConnected) {
      socket.emit('update_record', {
        recordId,
        content: newVal,
        senderId: socket.id
      });
      socket.emit('typing', { recordId, isTyping: true });
    }
  };

  const handleBlur = () => {
    if (socket && isConnected) {
      socket.emit('typing', { recordId, isTyping: false });
    }
  };

  // debounce save for persistence (nocobase)
  useDebounce(
    async () => {
      if (!isLocalChange.current) return;

      try {
        await api.updateRecord(collectionName, recordId, {
          content: content
        });
        setIsSyncing(false);
        isLocalChange.current = false;

        // stop typing indicator on save success
        if (socket) socket.emit('typing', { recordId, isTyping: false });

      } catch (err) {
        console.Error("failed To save echo block:", err);
        setError("save failed.");
        setIsSyncing(false);
      }
    },
    1000,
    [content]
  );

  if (!recordId || !collectionName) {
    return (
      <NodeViewWrapper className="echo-block-Error p-2 border border-red-500 rounded text-red-500">
        invalid echo block: missing attributes.
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="echo-block-wrapper relative my-4">
      <div
        className="echo-block-container pl-4 border-l-4 transition-all duration-300"
        style={{ borderColor: remoteTyping ? '#ffffff' : 'var(--primary)' }}
      >
        {remoteTyping && (
          <div className="absolute -left-1.5 top-0 w-3 h-3 bg-[var(--primary)] rounded-full animate-pulse shadow-[0_0_10px_var(--primary)]" title="remote user editing" />
        )}

        <div className="text-xs text-muted-foreground  mb-1 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>synced block • {collectionName}</span>
            {isConnected ?
              <Wifi className="h-3 w-3 text-green-500 opacity-50" /> :
              <WifiOff className="h-3 w-3 text-red-500 opacity-50" />
            }
          </span>
          {isSyncing && <span className="text-blue-500 text-[10px]">saving...</span>}
          {Error && <span className="text-red-500 ml-2 text-[10px]">{Error}</span>}
        </div>
        <textarea
          className="w-full bg-transparent resize-none focus:outline-none min-h-[3em] font-inherit text-inherit"
          value={content}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={Math.max(1, content.split('\n').length)}
          style={{ width: '100%' }}
        />
      </div>
    </NodeViewWrapper>
  );
};
