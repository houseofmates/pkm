import { useState, useEffect } from 'react';
import { Activity, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { io } from 'socket.io-client';

interface ServerStats {
  online: boolean;
  players: number;
  maxPlayers: number;
  tps: number;
  uptime: string;
  lastUpdated: string;
}

interface PlayerData {
  username: string;
  nickname?: string;
  color?: string;
  colorName?: string;
  style?: string;
}

interface PlayerDataMap {
  [username: string]: PlayerData;
}

export function LiveServerWidget() {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setloading] = useState(true);
  const [chatmessages, setchatmessages] = useState<any[]>([]);
  const [playerdata, setplayerdata] = useState<PlayerDataMap>({});

  useEffect(() => {
  // initial stats fetch from local backend (fast)
  const fetchInitialStats = async () => {
  try {
 const res = await fetch('/api/stats');
 if (res.ok) {
 const data = await res.json();
 setStats({
 online: data.online,
 players: data.players,
 maxPlayers: data.maxPlayers,
 tps: data.tps,
 uptime: data.uptime,
 lastUpdated: data.lastUpdated
 });
 }
  } catch (e) {
 console.warn("Failed to fetch initial server stats", e);
  } finally {
 setLoading(false);
  }
  };

  // initial chat fetch from local backend (in-memory)
  const fetchChatHistory = async () => {
  try {
 const res = await fetch('/api/chat');
 if (res.ok) {
 const history = await res.json();
 // history comes as oldest -> newest. widget displays list.
 // we want latest at the bottom.
 setChatMessages(history);
 }
  } catch (e) {
 console.warn("Failed to fetch chat history", e);
  }
  };

  // fetch player data (nicknames and colors)
  const fetchPlayerData = async () => {
  try {
 const res = await fetch('/api/players');
 if (res.ok) {
 const data = await res.json();
 setPlayerData(data);
 }
  } catch (e) {
 console.warn("Failed to fetch player data", e);
  }
  };

  fetchInitialStats();
  fetchChatHistory();
  fetchPlayerData();

  // socket connection for live updates
  // allow overriding via vite env: vite_socket_url (e.g. https://example.com:4100)
  const SOCKET_URL = (import.meta as any).env?.VITE_SOCKET_URL || `${location.protocol}//${location.hostname}:4100`;
  const socket = io(SOCKET_URL, { path: '/socket.io' });

  socket.on('connect', () => {
  console.log("Connected to Live Feed");
  });

  socket.on('minecraft_update', (data: any) => {
  // handle chat separately
  if (data.type === 'chat') {
 setChatMessages(prev => {
 const newMsg = { player: data.player, message: data.message, timestamp: data.timestamp };
 const updated = [...prev, newMsg];
 if (updated.length > 50) return updated.slice(updated.length - 50);
 return updated;
 });
  } else {
 // update stats (ping/join/quit)
 setStats(prev => ({
 ...(prev || { maxPlayers: 20, tps: 20, uptime: '0h' }),
 online: data.online,
 players: data.count,
 lastUpdated: data.timestamp
 }));
  }
  });

  return () => {
  socket.disconnect();
  };
  }, []);

  // helper function to get player display name and color
  const getPlayerDisplay = (username: string) => {
  const data = playerData[username];
  if (!data) {
  return {
 name: username,
 color: '#ffaa00', // Default yellow
 style: {}
  };
  }

  const displayName = data.nickname || username;
  const color = data.color || '#ffaa00';

  // apply text shadow for black outline
  const style: React.CSSProperties = {
  color: color,
  textShadow: `
 -1px -1px 0 #000,
 1px -1px 0 #000,
 -1px 1px 0 #000,
 1px 1px 0 #000,
 0 0 3px rgba(0,0,0,0.8)
  `.trim()
  };

  return { name: displayName, color, style };
  };

  const isLowTps = (stats?.tps || 20) < 18;

  if (loading && !stats) return <div className="p-4 text-xs text-muted-foreground">connecting to dupemates...</div>;

  return (
  <div className={cn(
  "rounded-xl border bg-black/80 backdrop-blur-md p-2 flex flex-col gap-3 transition-all duration-300 w-full min-w-[300px]",
  isLowTps ? "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]" : "border-primary/20 hover:border-primary/50"
  )}>
  {/* header */}
  <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Activity className={cn("h-4 w-4", stats?.online ? "text-green-400" : "text-red-400")} />
 <span className="font-bold text-primary  text-xs">dupemates smp</span>
 </div>
 <div className="flex items-center gap-1">
 <div className={cn("w-2 h-2 rounded-full animate-pulse", stats?.online ? "bg-green-500" : "bg-red-500")} />
 <span className="text-[10px] text-muted-foreground">{stats?.online ? 'ONLINE' : 'OFFLINE'}</span>
 </div>
  </div>

  {/* grid */}
  <div className="grid grid-cols-3 gap-2">
 {/* tps */}
 <div className={cn(
 "flex flex-col items-center justify-center p-2 rounded bg-white/5",
 isLowTps ? "text-red-400" : "text-green-400"
 )}>
 <span className="text-xl font-mono font-bold">{stats?.tps.toFixed(1)}</span>
 <span className="text-[10px] opacity-50">tps</span>
 </div>

 {/* players */}
 <div className="flex flex-col items-center justify-center p-2 rounded bg-white/5 text-blue-400">
 <span className="text-xl font-mono font-bold">{stats?.players}/{stats?.maxPlayers}</span>
 <span className="text-[10px] opacity-50">players</span>
 </div>

 {/* ping/uptime */}
 <div className="flex flex-col items-center justify-center p-2 rounded bg-white/5 text-purple-400">
 <span className="text-xl font-mono font-bold text-xs">{stats?.uptime}</span>
 <span className="text-[10px] opacity-50">uptime</span>
 </div>
  </div>

  {/* warning message */}
  {islowtps && (
 <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-2 rounded text-xs">
 <AlertTriangle size={14} />
 <span>server performance degraded</span>
 </div>
  )}

  {/* chat list */}
  <div className="mt-2 space-y-1 relative">
 <div className="text-[10px] opacity-50 mb-1 flex items-center gap-1">
 <Users size={10} /> live chat
 </div>
 <div className="h-[120px] overflow-y-auto space-y-2 pr-1 font-mono text-[10px] custom-scrollbar flex flex-col-reverse">
 {chatmessages.length === 0 ? (
 <div className="text-muted-foreground italic opacity-50">no recent messages</div>
 ) : (
 [...chatMessages].reverse().map((msg, i) => {
   const issystemmessage = msg.player === 'server' || msg.player === 'system';
   const playerdisplay = issystemmessage
   ? { name: msg.player, color: '#a855f7', style: { color: '#a855f7' } }
   : getplayerdisplay(msg.player);

   // format timestamp in user's local timezone (date + time)
   const timestamp = msg.timestamp
   ? new date(msg.timestamp).toLocaleString()
   : '';

   return (
   <div key={i} className="break-words leading-tight">
   {timestamp && (
  <span className="text-muted-foreground opacity-50 text-[9px] mr-1">
  {timestamp}
  </span>
   )}
   <span
  className="font-bold mr-1"
  style={playerDisplay.style}
   >
  {playerdisplay.name}:
   </span>
   <span className="text-gray-300">{msg.message}</span>
   </div>
   );
 })
 )}
 </div>
  </div>

  <div className="text-[9px] text-right text-muted-foreground opacity-50">
 last heartbeat: {stats?.lastupdated ? new date(stats.lastupdated).toLocaleString() : '--:--:--'}
  </div>
  </div>
  );
}
