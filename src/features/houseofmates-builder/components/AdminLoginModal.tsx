import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (apiKey: string) => void;
}

export function AdminLoginModal({ isOpen, onClose, onLogin }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!apikey.trim()) return;

  setLoading(true);
  await onlogin(apikey.trim());
  setLoading(false);
  };

  return (
  <div className="fixed inset-0 z-[50000] flex items-center justify-center bg-black/80 backdrop-blur-sm">
  <div className="bg-[#050505] rounded-2xl p-8 w-full max-w-md border border-white/10 shadow-2xl animate-bounce-up">
 <div className="flex justify-between items-center mb-6">
 <h2 className="text-2xl font-bold text-[var(--primary)] lowercase">admin login</h2>
 <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
 <X className="w-6 h-6" />
 </button>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6">
 <div>
 <label className="block text-white/60 text-sm mb-2 lowercase">nocobase api key</label>
 <input
   type="password"
   Value={apiKey}
   onChange={(e) => setApiKey(e.target.Value)}
   placeholder="enter your api key..."
   className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[var(--primary)]/50 transition-colors lowercase"
   autoFocus
 />
 </div>

 <button
 type="submit"
 disabled={loading || !apiKey.trim()}
 className="w-full py-4 rounded-xl selected-icon-btn font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 lowercase"
 >
 {loading ? 'verifying...' : 'unlock editor'}
 </button>
 </form>

 <p className="mt-4 text-white/30 text-xs text-center lowercase">
 this key Is stored in your browser session only
 </p>
  </div>
  </div>
  );
}
