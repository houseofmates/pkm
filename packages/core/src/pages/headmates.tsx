{/* eslint-disable */ }
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/use-socket';
import { usePluralSystem } from '@/features/plural-system/stores/use-plural-system';
import * as pluralDB from '@/features/plural-system/db/plural-system-db';
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
import { Edit, Eye, Trash2, Copy, MoreVertical } from 'lucide-react';
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
    description?: string;
    role?: string;
    birthday?: string;
  };
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  memberId: string | null;
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
  onContextMenu?: (e: React.MouseEvent, memberId: string) => void;
  onEdit?: (member: HeadmateMember) => void;
  onView?: (member: HeadmateMember) => void;
  onDelete?: (memberId: string) => void;
}

function SortableHeadmateCard({
  member,
  isSelected,
  frontPosition,
  onClick,
  onKeyDown,
  onContextMenu,
  onEdit,
  onView,
  onDelete,
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
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, member.id);
      }}
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

function ContextMenu({
  visible,
  x,
  y,
  memberId,
  member,
  onClose,
  onEdit,
  onView,
  onDelete,
  onCopy
}: ContextMenuState & {
  member?: HeadmateMember;
  onClose: () => void;
  onEdit?: (member: HeadmateMember) => void;
  onView?: (member: HeadmateMember) => void;
  onDelete?: (memberId: string) => void;
  onCopy?: (member: HeadmateMember) => void;
}) {
  useEffect(() => {
    const handleClick = () => onClose();
    if (visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [visible, onClose]);

  if (!visible || !member) return null;

  return (
    <div
      className="fixed bg-gray-900 border border-gray-700 rounded-lg py-1 z-50 shadow-xl"
      style={{ left: x, top: y }}
    >
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center space-x-2"
        onClick={() => {
          onView?.(member);
          onClose();
        }}
      >
        <Eye className="w-4 h-4" />
        <span>view full card</span>
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center space-x-2"
        onClick={() => {
          onEdit?.(member);
          onClose();
        }}
      >
        <Edit className="w-4 h-4" />
        <span>edit details</span>
      </button>
      <button
        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 flex items-center space-x-2"
        onClick={() => {
          onCopy?.(member);
          onClose();
        }}
      >
        <Copy className="w-4 h-4" />
        <span>copy info</span>
      </button>
      <div className="border-t border-gray-700 my-1" />
      <button
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-800 flex items-center space-x-2"
        onClick={() => {
          if (window.confirm(`are you sure you want to delete ${member.content?.name || 'this headmate'}?`)) {
            onDelete?.(memberId);
          }
          onClose();
        }}
      >
        <Trash2 className="w-4 h-4" />
        <span>delete</span>
      </button>
    </div>
  );
}

function InlineEditModal({
  member,
  isOpen,
  onClose,
  onSave
}: {
  member: HeadmateMember;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedMember: HeadmateMember) => void;
}) {
  const [editedMember, setEditedMember] = useState(member);

  useEffect(() => {
    setEditedMember(member);
  }, [member]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedMember);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-300 mb-4">edit headmate details</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">name</label>
            <input
              type="text"
              value={editedMember.content?.name || ''}
              onChange={(e) => setEditedMember({
                ...editedMember,
                content: { ...editedMember.content, name: e.target.value }
              })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">pronouns</label>
            <input
              type="text"
              value={editedMember.content?.pronouns || ''}
              onChange={(e) => setEditedMember({
                ...editedMember,
                content: { ...editedMember.content, pronouns: e.target.value }
              })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">role</label>
            <input
              type="text"
              value={editedMember.content?.role || ''}
              onChange={(e) => setEditedMember({
                ...editedMember,
                content: { ...editedMember.content, role: e.target.value }
              })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">description</label>
            <textarea
              value={editedMember.content?.description || ''}
              onChange={(e) => setEditedMember({
                ...editedMember,
                content: { ...editedMember.content, description: e.target.value }
              })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-300 h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">color</label>
            <input
              type="color"
              value={editedMember.content?.color || '#ffffff'}
              onChange={(e) => setEditedMember({
                ...editedMember,
                content: { ...editedMember.content, color: e.target.value }
              })}
              className="w-full h-10 bg-gray-800 border border-gray-700 rounded"
            />
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            save
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            cancel
          </button>
        </div>
      </div>
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

  // Context menu and editing state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    memberId: null,
  });
  const [editingMember, setEditingMember] = useState<HeadmateMember | null>(null);
  const [viewingMember, setViewingMember] = useState<HeadmateMember | null>(null);

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

  // auto-sync simplyplural members to local plural-system db and track front
  useEffect(() => {
    if (!hasKey || members.length === 0) return;

    const syncToLocal = async () => {
      try {
        const localMembers = await pluralDB.getAllMembers();
        for (const spMember of members) {
          const name = spMember.content?.name || 'unnamed';
          const existing = localMembers.find(m => m.simplyPluralId === spMember.id);
          if (!existing) {
            await pluralDB.saveMember({
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              name,
              displayName: name,
              pronouns: spMember.content?.pronouns,
              color: spMember.content?.color || '#888888',
              customFields: [],
              status: 'active',
              tags: [],
              privacyLevel: 'private',
              simplyPluralId: spMember.id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        secureLogger.warn('[headmates] failed to sync to local plural db:', e);
      }
    };

    syncToLocal();
  }, [hasKey, members]);

  useEffect(() => {
    if (!hasKey || frontingOrder.length === 0) return;

    const trackFront = async () => {
      try {
        const localMembers = await pluralDB.getAllMembers();
        const entries = frontingOrder
          .map((spId, index) => {
            const local = localMembers.find(m => m.simplyPluralId === spId);
            if (!local) return null;
            return {
              memberId: local.id,
              frontType: index === 0 ? 'primary' as const : 'cofront' as const,
            };
          })
          .filter(Boolean) as { memberId: string; frontType: 'primary' | 'cofront' }[];

        if (entries.length > 0) {
          const store = usePluralSystem.getState();
          // only update if different from current
          const currentIds = store.currentFronters.map(f => f.memberId).sort().join(',');
          const newIds = entries.map(f => f.memberId).sort().join(',');
          if (currentIds !== newIds) {
            await store.setCurrentFronters(entries);
          }
        }
      } catch (e) {
        secureLogger.warn('[headmates] auto front track failed:', e);
      }
    };

    trackFront();
  }, [hasKey, frontingOrder]);

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

  // Context menu and editing handlers
  const handleContextMenu = useCallback((e: React.MouseEvent, memberId: string) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      memberId,
    });
  }, []);

  const handleEdit = useCallback((member: HeadmateMember) => {
    setEditingMember(member);
    setContextMenu({ visible: false, x: 0, y: 0, memberId: null });
  }, []);

  const handleView = useCallback((member: HeadmateMember) => {
    setViewingMember(member);
    setContextMenu({ visible: false, x: 0, y: 0, memberId: null });
  }, []);

  const handleDelete = useCallback((memberId: string) => {
    setMembers(prev => prev.filter(m => m.id !== memberId));
    setFrontingOrder(prev => prev.filter(id => id !== memberId));
    setContextMenu({ visible: false, x: 0, y: 0, memberId: null });
    toast.success('headmate deleted successfully');
  }, []);

  const handleCopy = useCallback((member: HeadmateMember) => {
    const info = `name: ${member.content?.name || 'unknown'}\npronouns: ${member.content?.pronouns || 'not specified'}\nrole: ${member.content?.role || 'not specified'}`;
    navigator.clipboard.writeText(info);
    toast.success('headmate info copied to clipboard');
    setContextMenu({ visible: false, x: 0, y: 0, memberId: null });
  }, []);

  const handleSaveEdit = useCallback((updatedMember: HeadmateMember) => {
    setMembers(prev => prev.map(m => m.id === updatedMember.id ? updatedMember : m));
    toast.success('headmate updated successfully');
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full p-2 overflow-auto">
      <Link
        to="/system-tracker"
        style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 50,
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(246, 176, 18, 0.15)',
          border: '1px solid rgba(246, 176, 18, 0.3)',
          borderRadius: '50%',
          color: '#f6b012',
          fontSize: '18px',
          fontFamily: '"Varela Round", sans-serif',
          fontWeight: 'bold',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          textDecoration: 'none',
          transition: 'all 0.2s ease',
        }}
        className="hover:bg-[#f6b012]/30"
        title="system tracker"
      >
        &amp;
      </Link>
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
                        onContextMenu={handleContextMenu}
                        onEdit={handleEdit}
                        onView={handleView}
                        onDelete={handleDelete}
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
  )
}

{/* Context Menu */ }
<ContextMenu
  visible={contextMenu.visible}
  x={contextMenu.x}
  y={contextMenu.y}
  memberId={contextMenu.memberId}
  member={members.find(m => m.id === contextMenu.memberId)}
  onClose={() => setContextMenu({ visible: false, x: 0, y: 0, memberId: null })}
  onEdit={handleEdit}
  onView={handleView}
  onDelete={handleDelete}
  onCopy={handleCopy}
/>

{/* Inline Edit Modal */ }
{
  editingMember && (
    <InlineEditModal
      member={editingMember}
      isOpen={!!editingMember}
      onClose={() => setEditingMember(null)}
      onSave={handleSaveEdit}
    />
  )
}

{/* Full Card View Modal */ }
{
  viewingMember && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-medium text-gray-300 mb-4">{viewingMember.content?.name || 'unknown'}</h3>

        <div className="space-y-3">
          {viewingMember.content?.avatarUrl && (
            <div className="flex justify-center">
              <img
                src={viewingMember.content.avatarUrl}
                alt={viewingMember.content.name}
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>
          )}

          {viewingMember.content?.pronouns && (
            <div>
              <span className="text-sm text-gray-400">pronouns: </span>
              <span className="text-gray-300">{viewingMember.content.pronouns}</span>
            </div>
          )}

          {viewingMember.content?.role && (
            <div>
              <span className="text-sm text-gray-400">role: </span>
              <span className="text-gray-300">{viewingMember.content.role}</span>
            </div>
          )}

          {viewingMember.content?.description && (
            <div>
              <span className="text-sm text-gray-400">description: </span>
              <p className="text-gray-300 mt-1">{viewingMember.content.description}</p>
            </div>
          )}

          {viewingMember.content?.color && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">color: </span>
              <div
                className="w-6 h-6 rounded border border-gray-600"
                style={{ backgroundColor: viewingMember.content.color }}
              />
            </div>
          )}
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => handleEdit(viewingMember)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            edit
          </button>
          <button
            onClick={() => setViewingMember(null)}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
          >
            close
          </button>
        </div>
      </div>
    </div>
  )
}
    </div >
  );
};

export default HeadmatesPage;
