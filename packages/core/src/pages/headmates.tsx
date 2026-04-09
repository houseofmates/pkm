import React, { useState, useEffect } from 'react';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';

export const HeadmatesPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [frontingOrder, setFrontingOrder] = useState<string[]>([]);

  const fetchMembers = async (key: string) => {
    setLoading(true);
    try {
      const meRes = await fetch('https://api.apparyllis.com/v1/me', {
        headers: { 'Authorization': key }
      });
      if (!meRes.ok) throw new Error('Failed to fetch system info');
      const meData = await meRes.json();
      const systemId = meData.id;

      const membersRes = await fetch(`https://api.apparyllis.com/v1/members/${systemId}`, {
        headers: { 'Authorization': key }
      });
      if (!membersRes.ok) throw new Error('Failed to fetch members');
      const membersData = await membersRes.json();
      setMembers(membersData);
    } catch (err) {
      secureLogger.error('Failed to fetch SimplyPlural members:', err);
      toast.error('could not load headmates. check your api key.');
    } finally {
      setLoading(false);
    }
  };

  const updateFronting = async (newOrder: string[]) => {
    if (!apiKey || newOrder.length === 0) return;
    
    try {
      const meRes = await fetch('https://api.apparyllis.com/v1/me', {
        headers: { 'Authorization': apiKey }
      });
      if (!meRes.ok) throw new Error('Failed to fetch system info');
      const meData = await meRes.json();
      const systemId = meData.id;

      const fronters = newOrder.map((memberId, index) => ({
        id: memberId,
        startTime: new Date().toISOString(),
        order: index
      }));

      await fetch(`https://api.apparyllis.com/v1/front/${systemId}`, {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fronters })
      });

      toast.success('fronting updated');
    } catch (err) {
      secureLogger.error('Failed to update fronting:', err);
      toast.error('failed to update fronting');
    }
  };

  useEffect(() => {
    const storedKey = storageManager.getCachedSecret('pk_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      setHasKey(true);
      fetchMembers(storedKey);
    }
  }, []);

  const handleSaveKey = async () => {
    if (!apiKey) return;
    try {
      await storageManager.setEncryptedItem('pk_api_key', apiKey);
      setHasKey(true);
      toast.success("api key saved locally");
      fetchMembers(apiKey);
    } catch (e) {
      secureLogger.error('Failed to save SimplyPlural API key:', e);
      toast.error('failed to save api key.');
    }
  };

  const toggleMember = (memberId: string) => {
    setFrontingOrder(prev => {
      const newOrder = prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId];
      updateFronting(newOrder);
      return newOrder;
    });
  };

  const getFrontingPosition = (memberId: string): number => {
    const index = frontingOrder.indexOf(memberId);
    return index === -1 ? 0 : index + 1;
  };

  return (
    <div className="h-full w-full p-2">
      {!hasKey ? (
        <div className="space-y-4 p-6 bg-white/5 rounded-xl border border-white/10 max-w-md mx-auto mt-20">
          <p className="text-sm text-white/60 lowercase">enter your simplyplural api key to sync your headmates.</p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="pk_api_key..."
            className="w-full px-4 py-2 bg-black border border-white/10 rounded-lg text-white"
          />
          <button
            onClick={handleSaveKey}
            className="px-6 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:opacity-90"
          >
            save & sync
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1 h-full">
          {loading ? (
            <p className="text-white/40 lowercase col-span-full">loading members...</p>
          ) : members.length > 0 ? (
            members.map(m => {
              const position = getFrontingPosition(m.id);
              const isSelected = position > 0;
              const memberColor = m.content?.color || '#ffffff';
              
              return (
                <div
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className="group flex flex-col gap-1 cursor-pointer"
                >
                  <div
                    className={`aspect-square rounded-lg overflow-hidden relative transition-all duration-200 ${
                      isSelected 
                        ? 'scale-105 border-2' 
                        : 'border border-white/10'
                    }`}
                    style={isSelected ? { borderColor: memberColor } : undefined}
                  >
                    {m.content?.avatarUrl ? (
                      <img
                        src={m.content.avatarUrl}
                        alt={m.content.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/10">
                        <span className="text-4xl opacity-30">👤</span>
                      </div>
                    )}
                    {isSelected && (
                      <div 
                        className="absolute top-1 right-1 text-sm font-bold"
                        style={{ 
                          color: 'rgba(255,255,255,0.5)',
                          textShadow: '0 0 2px rgba(0,0,0,0.5), 0 0 4px rgba(0,0,0,0.5)'
                        }}
                      >
                        {position}
                      </div>
                    )}
                  </div>
                  <div className="text-center px-1">
                    <p className="font-medium lowercase text-xs truncate">{m.content?.name || 'unknown'}</p>
                    {m.content?.pronouns && (
                      <p className="text-[10px] text-white/40 lowercase truncate">{m.content.pronouns}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-white/40 lowercase col-span-full">no members found.</p>
          )}
        </div>
      )}
      {hasKey && (
        <button
          onClick={() => {
            storageManager.removeItem('pk_api_key');
            setHasKey(false);
            setApiKey('');
            setMembers([]);
            setFrontingOrder([]);
          }}
          className="fixed bottom-4 right-4 text-xs text-white/20 hover:text-white/60 underline lowercase"
        >
          reset api key
        </button>
      )}
    </div>
  );
};

export default HeadmatesPage;
