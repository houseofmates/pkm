{/* eslint-disable */ }
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/use-socket';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface HeadmateMember {
  id: string;
  content?: {
    name?: string;
    avatarUrl?: string;
    pronouns?: string;
    color?: string;
  };
}

const FRONTING_KEY = 'headmates_fronting';
const MEMBERS_KEY = 'headmates_members_order';

function persistFronting(order: string[]) {
  try {
    localStorage.setItem(FRONTING_KEY, JSON.stringify(order));
  } catch (e) {
    secureLogger.warn('Failed to persist fronting:', e);
  }
}

function loadPersistedFronting(): string[] {
  try {
    const raw = localStorage.getItem(FRONTING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistMembersOrder(order: string[]) {
  try {
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(order));
  } catch (e) {
    secureLogger.warn('Failed to persist members order:', e);
  }
}

function loadPersistedMembersOrder(): string[] {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface SortableHeadmateCardProps {
  member: HeadmateMember;
  isSelected: boolean;
  frontPosition: number;
  selectionIndex: number;
  onClick: () => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function SortableHeadmateCard({
  member,
  isSelected,
  frontPosition,
  onClick,
  onKeyDown,
}: SortableHeadmateCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: member.id,
    disabled: false,
  });

  const memberColor = member.content?.color || '#ffffff';
  const zIndex = isSelected ? 100 : 10;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 200 : zIndex,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${member.content?.name || 'unknown'}${isSelected ? `, fronting position ${frontPosition}` : ', not fronting'}`}
      aria-pressed={isSelected}
      className="group relative"
    >
      <div
        className={`aspect-square rounded-lg overflow-hidden relative cursor-pointer touch-none transition-all duration-150 ${isSelected ? 'border-[3px]' : 'border border-white/10'
          }`}
        style={isSelected ? { borderColor: memberColor } : undefined}
      >
        {member.content?.avatarUrl ? (
          <img
            src={member.content.avatarUrl}
            alt={member.content.name || 'headmate'}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-white/10">
            <span className="text-4xl opacity-30">👤</span>
          </div>
        )}
        {isSelected && frontPosition > 0 && (
          <div
            className="absolute top-2 right-2 min-w-[24px] h-6 px-1.5 rounded-md flex items-center justify-center text-sm font-bold"
            style={{
              backgroundColor: memberColor,
              color: member.content?.name === 'S' ? '#fff' : '#000',
            }}
          >
            {frontPosition}
          </div>
        )}
      </div>
      <div className="text-center mt-1.5 px-1">
        <p className="font-medium lowercase text-sm truncate">{member.content?.name || 'unknown'}</p>
        {member.content?.pronouns && (
          <p className="text-xs text-white/40 lowercase truncate">{member.content.pronouns}</p>
        )}
      </div>
    </div>
  );
}

function DragOverlayCard({ member }: { member: HeadmateMember }) {
  const memberColor = member.content?.color || '#ffffff';
  return (
    <div
      className="aspect-square rounded-lg overflow-hidden relative border-[3px]"
      style={{ borderColor: memberColor }}
    >
      {member.content?.avatarUrl ? (
        <img
          src={member.content.avatarUrl}
          alt={member.content.name || 'headmate'}
          className="w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/10">
          <span className="text-4xl opacity-30">👤</span>
        </div>
      )}
    </div>
  );
}

export const HeadmatesPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [members, setMembers] = useState<HeadmateMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [frontingOrder, setFrontingOrder] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<UniqueIdentifier | null>(null);
  const { socket, isConnected } = useSocket();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchMembers = useCallback(async (key: string) => {
    setLoading(true);
    try {
      const simplyPluralMeUrl = import.meta.env.VITE_SIMPLYPLURAL_ME_ENDPOINT || 'https://api.apparyllis.com/v1/me';
      const simplyPluralMembersUrl = import.meta.env.VITE_SIMPLYPLURAL_MEMBERS_ENDPOINT || 'https://api.apparyllis.com/v1/members';

      const meRes = await fetch(simplyPluralMeUrl, {
        headers: { 'Authorization': key }
      });
      if (!meRes.ok) throw new Error('Failed to fetch system info');
      const meData = await meRes.json();
      const systemId = meData.id;

      const membersRes = await fetch(`${simplyPluralMembersUrl}/${systemId}`, {
        headers: { 'Authorization': key }
      });
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();

      const persistedMembersOrder = loadPersistedMembersOrder();
      const persistedFronting = loadPersistedFronting();

      if (persistedMembersOrder.length > 0) {
        const orderMap = new Map(persistedMembersOrder.map((id, i) => [id, i]));
        membersData.sort((a: HeadmateMember, b: HeadmateMember) => {
          const aIndex = orderMap.get(a.id) ?? Infinity;
          const bIndex = orderMap.get(b.id) ?? Infinity;
          return aIndex - bIndex;
        });
      }

      setMembers(membersData);
      setFrontingOrder(persistedFronting);
    } catch (err) {
      secureLogger.error('Failed to fetch SimplyPlural members:', err);
      toast.error('could not load headmates. check your api key.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedKey = storageManager.getCachedSecret('pk_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setHasKey(true);
      fetchMembers(storedKey);
    }
  }, [fetchMembers]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('headmates_request_sync');

    const handleSync = (data: { frontingOrder: string[]; membersOrder: string[] }) => {
      if (data.membersOrder && data.membersOrder.length > 0) {
        persistMembersOrder(data.membersOrder);
        setMembers(prev => {
          const orderMap = new Map(data.membersOrder.map((id, i) => [id, i]));
          return [...prev].sort((a, b) => {
            const aIndex = orderMap.get(a.id) ?? Infinity;
            const bIndex = orderMap.get(b.id) ?? Infinity;
            return aIndex - bIndex;
          });
        });
      }
      if (data.frontingOrder) {
        persistFronting(data.frontingOrder);
        setFrontingOrder(data.frontingOrder);
      }
    };

    socket.on('headmates_sync', handleSync);

    return () => {
      socket.off('headmates_sync', handleSync);
    };
  }, [socket, isConnected]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('headmates_request_sync');

    const handleSync = (data: { frontingOrder: string[]; membersOrder: string[] }) => {
      if (data.membersOrder && data.membersOrder.length > 0) {
        persistMembersOrder(data.membersOrder);
        setMembers(prev => {
          const orderMap = new Map(data.membersOrder.map((id, i) => [id, i]));
          return [...prev].sort((a, b) => {
            const aIndex = orderMap.get(a.id) ?? Infinity;
            const bIndex = orderMap.get(b.id) ?? Infinity;
            return aIndex - bIndex;
          });
        });
      }
      if (data.frontingOrder) {
        persistFronting(data.frontingOrder);
        setFrontingOrder(data.frontingOrder);
      }
    };

    socket.on('headmates_sync', handleSync);

    return () => {
      socket.off('headmates_sync', handleSync);
    };
  }, [socket, isConnected]);

  const handleSaveKey = async () => {
    if (!apiKey) return;
    try {
      await storageManager.setEncryptedItem('pk_api_key', apiKey);
      setHasKey(true);
      toast.success('api key saved locally');
      fetchMembers(apiKey);
    } catch (e) {
      secureLogger.error('Failed to save SimplyPlural API key:', e);
      toast.error('failed to save api key.');
    }
  };

  const updateFrontingAPI = async (newOrder: string[]) => {
    if (!apiKey || newOrder.length === 0) return;

    try {
      const simplyPluralMeUrl = import.meta.env.VITE_SIMPLYPLURAL_ME_ENDPOINT || 'https://api.apparyllis.com/v1/me';
      const simplyPluralFrontUrl = import.meta.env.VITE_SIMPLYPLURAL_FRONT_ENDPOINT || 'https://api.apparyllis.com/v1/front';

      const meRes = await fetch(simplyPluralMeUrl, {
        headers: { 'Authorization': apiKey }
      });
      if (!meRes.ok) return;
      const meData = await meRes.json();
      const systemId = meData.id;

      await fetch(`${simplyPluralFrontUrl}/${systemId}`, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fronters: newOrder.map((memberId) => ({
            id: memberId,
            startTime: new Date().toISOString(),
          }))
        })
      });
    } catch (err) {
      secureLogger.error('Failed to update fronting:', err);
    }
  };

  const broadcastSync = useCallback((fronting: string[], membersOrder: string[]) => {
    if (socket && isConnected) {
      socket.emit('headmates_update', {
        frontingOrder: fronting,
        membersOrder: membersOrder,
      });
    }
  }, [socket, isConnected]);

  const toggleMember = useCallback((memberId: string) => {
    setFrontingOrder(prev => {
      const newOrder = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      persistFronting(newOrder);
      updateFrontingAPI(newOrder);
      const membersOrder = members.map(m => m.id);
      persistMembersOrder(membersOrder);
      broadcastSync(newOrder, membersOrder);
      return newOrder;
    });
  }, [apiKey, members, broadcastSync]);

  const getFrontPosition = (memberId: string): number => {
    const index = frontingOrder.indexOf(memberId);
    return index === -1 ? 0 : index + 1;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedId(null);

    if (over && active.id !== over.id) {
      setMembers(prev => {
        const oldIndex = prev.findIndex(m => m.id === active.id);
        const newIndex = prev.findIndex(m => m.id === over.id);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        persistMembersOrder(newOrder.map(m => m.id));
        return newOrder;
      });

      setFrontingOrder(prev => {
        if (!prev.includes(String(active.id)) && !prev.includes(String(over.id))) {
          return prev;
        }
        const oldIndex = prev.indexOf(String(active.id));
        const newIndex = prev.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prev;
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        persistFronting(newOrder);
        return newOrder;
      });
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, memberId: string) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      toggleMember(memberId);
    }
  }, [toggleMember]);

  return (
    <div ref={containerRef} className="h-full w-full p-2 overflow-auto">
      <Link to="/system-tracker" style={{ position: "fixed", top: "12px", right: "12px", zIndex: 50, padding: "8px 16px", background: "rgba(59, 130, 246, 0.2)", border: "1px solid rgba(59, 130, 246, 0.3)", borderRadius: 8, color: "#fff", fontSize: "12px", cursor: "pointer", backdropFilter: "blur(8px)", textDecoration: "none" }}>system tracker</Link>
      {!hasKey ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 p-6 bg-white/5 rounded-xl border border-white/10 max-w-md mx-auto mt-20"
        >
          <p className="text-sm text-white/60 lowercase">enter your simplyplural api key to sync your headmates.</p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pk_api_key..."
            className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
          <button
            onClick={handleSaveKey}
            className="w-full px-6 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            save & sync
          </button>
        </motion.div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full"
              />
            </div>
          ) : (
            <SortableContext items={members.map(m => m.id)} strategy={rectSortingStrategy}>
              <motion.div
                layout
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2"
              >
                <AnimatePresence>
                  {members.map((member) => {
                    const isSelected = frontingOrder.includes(member.id);
                    const frontPosition = getFrontPosition(member.id);
                    const selectionIndex = frontPosition > 0 ? frontPosition - 1 : frontingOrder.length;

                    return (
                      <SortableHeadmateCard
                        key={member.id}
                        member={member}
                        isSelected={isSelected}
                        frontPosition={frontPosition}
                        selectionIndex={selectionIndex}
                        onClick={() => toggleMember(member.id)}
                        onKeyDown={(e) => handleKeyDown(e, member.id)}
                      />
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </SortableContext>
          )}

          <DragOverlay>
            {draggedId ? (
              <DragOverlayCard member={members.find(m => m.id === draggedId)!} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {hasKey && !loading && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            storageManager.removeItem('pk_api_key');
            setHasKey(false);
            setApiKey('');
            setMembers([]);
            setFrontingOrder([]);
            localStorage.removeItem(MEMBERS_KEY);
            localStorage.removeItem(FRONTING_KEY);
          }}
          className="fixed bottom-4 right-4 text-xs text-white/20 hover:text-white/60 underline lowercase focus:outline-none focus:ring-2 focus:ring-white/40 rounded px-2 py-1"
        >
          reset api key
        </motion.button>
      )}
    </div>
  );
};

export default HeadmatesPage;
