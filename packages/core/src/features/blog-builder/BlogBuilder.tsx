import React, { useState, useEffect } from 'react';
import { storageManager } from '@/lib/storage-manager';
import { toast } from 'sonner';
import { secureLogger } from '@/lib/secure-logger';
import { BlogCanvas } from './components/BlogCanvas';

const BlogBuilder: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  // check auth on mount
  useEffect(() => {
    const key = storageManager.getCachedSecret('hom_api_key');
    if (key) setIsAdmin(true);
  }, []);

  // global keyboard listener for ctrl+e
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        const key = storageManager.getCachedSecret('hom_api_key');
        if (key) {
          setIsAdmin(true);
          toast.info('admin mode active');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogin = async (key: string) => {
    try {
      await storageManager.setEncryptedItem('hom_api_key', key);
      setIsAdmin(true);
      toast.success('admin mode enabled');
    } catch (e) {
      secureLogger.error('Login failed:', e);
      toast.error('Failed to enable admin mode');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <BlogCanvas />
      {!isAdmin && (
        <button
          onClick={() => {
            const key = prompt('enter admin key:');
            if (key) handleLogin(key);
          }}
          className="fixed bottom-4 right-4 text-white/20 hover:text-white/40 text-xs"
        >
          admin
        </button>
      )}
    </div>
  );
};

export { BlogBuilder };
export default BlogBuilder;
