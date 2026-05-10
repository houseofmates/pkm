import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BlogLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (key: string) => void;
}

export const BlogLoginModal: React.FC<BlogLoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [key, setKey] = useState('');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="lowercase">admin login</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Input
            type="password"
            placeholder="enter api key..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="bg-black border-zinc-800"
          />
          <Button
            onClick={() => onLogin(key)}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold lowercase"
          >
            login
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
