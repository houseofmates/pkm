import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * listens for save/sync/offline events and shows brief toast notifications.
 * other parts of the app can dispatch these custom events to signal state.
 */
export function useAutoSaveToast() {
  useEffect(() => {
    const handleSaved = () => {
      toast('saved', {
        duration: 2000,
        className: 'bg-black/80 border-white/10 text-white/80 lowercase',
      });
    };

    const handleSynced = () => {
      toast('synced', {
        duration: 2000,
        className: 'bg-black/80 border-white/10 text-[#f6b012] lowercase',
      });
    };

    const handleOffline = () => {
      toast('offline — changes queued', {
        duration: 3000,
        className: 'bg-black/80 border-white/10 text-white/60 lowercase',
      });
    };

    window.addEventListener('pkm:saved', handleSaved);
    window.addEventListener('pkm:synced', handleSynced);
    window.addEventListener('pkm:offline', handleOffline);

    return () => {
      window.removeEventListener('pkm:saved', handleSaved);
      window.removeEventListener('pkm:synced', handleSynced);
      window.removeEventListener('pkm:offline', handleOffline);
    };
  }, []);
}

export function AutoSaveToast() {
  useAutoSaveToast();
  return null;
}
