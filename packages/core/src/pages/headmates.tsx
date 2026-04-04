import React, { useState, useEffect } from 'react';
import { storageManager } from '@/lib/storage-manager';
import { secureLogger } from '@/lib/secure-logger';
import { toast } from 'sonner';

export const HeadmatesPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
      toast.error('Could not load headmates. Check your API key.');
    } finally {
      setLoading(false);
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
      toast.error('Failed to save API key.');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold lowercase">headmates</h1>

      {!hasKey ? (
        <div className="space-y-4 p-6 bg-white/5 rounded-xl border border-white/10">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p className="text-white/40 lowercase">loading members...</p>
          ) : members.length > 0 ? (
            members.map(m => (
              <div key={m.id} className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center gap-4">
                {m.content?.avatarUrl && (
                  <img src={m.content.avatarUrl} alt={m.content.name} className="w-12 h-12 rounded-full object-cover" />
                )}
                <div>
                  <p className="font-medium lowercase">{m.content?.name || 'unknown'}</p>
                  <p className="text-xs text-white/40 lowercase">{m.content?.pronouns || 'no pronouns'}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-white/40 lowercase">no members found.</p>
          )}
          <button
            onClick={() => {
              storageManager.removeItem('pk_api_key');
              setHasKey(false);
              setApiKey('');
              setMembers([]);
            }}
            className="col-span-full mt-4 text-xs text-white/20 hover:text-white/60 underline lowercase"
          >
            reset api key
          </button>
        </div>
      )}
    </div>
  );
};

export default HeadmatesPage;
