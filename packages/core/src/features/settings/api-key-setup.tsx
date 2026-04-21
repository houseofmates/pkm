{/* eslint-disable */}
// api-key-setup.tsx — modal for configuring llm api keys
// prompts user to add keys, saves to nocobase for cross-device persistence

import { useState } from 'react';
import { useApiKeys, ApiKeyConfig } from '@/hooks/use-api-keys';
import { secureLogger } from '@/lib/secure-logger';

interface Props {
  onComplete: () => void;
}

const PROVIDERS = [
 { id: 'nvidia', name: 'nvidia nims', models: ['moonshotai/kimi-k2.5', 'z-ai/glm5', 'minimaxai/minimax-m2.7'] },
 { id: 'openai', name: 'openai', models: ['gpt-4o', 'gpt-4.1', 'o3'] },
 { id: 'anthropic', name: 'anthropic', models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514'] },
 { id: 'google', name: 'google ai studio', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
 { id: 'custom', name: 'custom (openai-compatible)', models: [] },
] as const;

export function ApiKeySetup({ onComplete }: Props) {
  const { addKey, needsSetup } = useApiKeys();
  const [keys, setKeys] = useState<Array<{
    provider: ApiKeyConfig['provider'];
    name: string;
    key: string;
    model: string;
    customModel?: string;
  }>>([]);
  const [currentProvider, setCurrentProvider] = useState<ApiKeyConfig['provider']>('nvidia');
  const [currentKey, setCurrentKey] = useState('');
  const [currentName, setCurrentName] = useState('');
  const [currentModel, setCurrentModel] = useState('moonshotai/kimi-k2.5');
  const [customModel, setCustomModel] = useState('');
  const [saving, setSaving] = useState(false);

  const provider = PROVIDERS.find(p => p.id === currentProvider);
  const models = provider?.models || [];

  const addKeyToList = () => {
    if (!currentKey.trim()) return;
    
    const modelToUse = currentProvider === 'custom' ? customModel : currentModel;
    if (!modelToUse?.trim()) return;
    
    setKeys(prev => [...prev, {
      provider: currentProvider,
      name: currentName || `${currentProvider}-${keys.filter(k => k.provider === currentProvider).length + 1}`,
      key: currentKey.trim(),
      model: modelToUse,
    }]);
    
    // reset form
    setCurrentKey('');
    setCurrentName('');
  };

  const saveAllKeys = async () => {
    if (keys.length === 0) return;
    
    setSaving(true);
    
    try {
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        await addKey({
          provider: k.provider,
          name: k.name,
          key: k.key,
          model: k.model,
          priority: i + 1,
          enabled: true,
        });
      }
      
      secureLogger.info('[api-key-setup] saved', keys.length, 'keys');
      onComplete();
    } catch (e) {
      secureLogger.error('[api-key-setup] failed to save keys:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-[#333] rounded-lg max-w-lg w-full max-h-[90vh] overflow-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-[#ffb10f] mb-2">
            configure ai api keys
          </h2>
          <p className="text-sm text-[#888] mb-6">
            keys are stored securely on the server and sync across all your devices.
            if a key hits rate limits, the next one in the list takes over.
          </p>

          {/* already added keys */}
          {keys.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-xs text-[#666] uppercase tracking-wide">keys to save:</p>
              {keys.map((k, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-[#111] rounded text-sm">
                  <span className="text-[#ffb10f]">{k.name}</span>
                  <span className="text-[#666]">→</span>
                  <span className="text-[#888]">{k.provider}</span>
                  <span className="text-[#666]">·</span>
                  <span className="text-[#888]">{k.model}</span>
                </div>
              ))}
            </div>
          )}

          {/* add new key form */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#666] uppercase tracking-wide mb-1">provider</label>
              <select
                value={currentProvider}
                onChange={e => {
                  const p = e.target.value as ApiKeyConfig['provider'];
                  setCurrentProvider(p);
                  const prov = PROVIDERS.find(pr => pr.id === p);
                  setCurrentModel(prov?.models[0] || '');
                }}
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white"
              >
                {PROVIDERS.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#666] uppercase tracking-wide mb-1">api key</label>
              <input
                type="password"
                value={currentKey}
                onChange={e => setCurrentKey(e.target.value)}
                placeholder="nvapi-xxx..."
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white placeholder-[#444]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#666] uppercase tracking-wide mb-1">name (optional)</label>
              <input
                type="text"
                value={currentName}
                onChange={e => setCurrentName(e.target.value)}
                placeholder="my-nvidia-key"
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white placeholder-[#444]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#666] uppercase tracking-wide mb-1">model</label>
              {currentProvider === 'custom' ? (
                <input
                  type="text"
                  value={customModel}
                  onChange={e => setCustomModel(e.target.value)}
                  placeholder="model-name"
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white placeholder-[#444]"
                />
              ) : (
                <select
                  value={currentModel}
                  onChange={e => setCurrentModel(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-white"
                >
                  {models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={addKeyToList}
              disabled={!currentKey.trim()}
              className="w-full py-2 px-4 bg-[#222] hover:bg-[#333] border border-[#444] rounded text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              + add another key
            </button>
          </div>

          {/* save button */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={onComplete}
              className="flex-1 py-2 px-4 bg-transparent border border-[#444] rounded text-[#888] hover:text-white hover:border-[#666] transition-colors"
            >
              skip for now
            </button>
            <button
              onClick={saveAllKeys}
              disabled={keys.length === 0 || saving}
              className="flex-1 py-2 px-4 bg-[#ffb10f] text-black font-semibold rounded hover:bg-[#ffc847] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'saving...' : `save ${keys.length} key${keys.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiKeySetup;
