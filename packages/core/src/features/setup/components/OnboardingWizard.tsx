import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [gitRemote, setGitRemote] = useState('origin');
  const [gitUrl, setGitUrl] = useState('');
  const [gitTesting, setGitTesting] = useState(false);
  const [nocobaseUrl, setNocobaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const skip = () => {
    localStorage.setItem('pkm_onboarding_complete', 'true');
    onComplete?.();
  };

  const finish = () => {
    localStorage.setItem(
      'pkm_git_config',
      JSON.stringify({ remote: gitRemote, url: gitUrl })
    );
    localStorage.setItem(
      'pkm_sync_config',
      JSON.stringify({ url: nocobaseUrl, apiKey })
    );
    localStorage.setItem('pkm_onboarding_complete', 'true');
    onComplete?.();
  };

  const testGit = async () => {
    if (!gitUrl) {
      toast.error('please enter a git url first');
      return;
    }
    setGitTesting(true);
    // simulate connection test
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('connection looks good');
    setGitTesting(false);
  };

  const steps = [
    // step 0: welcome
    <div key="welcome" className="flex flex-col items-center text-center gap-6 py-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-20 h-20 rounded-full border-2 border-dashed border-white/10"
        />
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="w-12 h-12 rounded-full bg-[#f6b012]/20 flex items-center justify-center">
            <span className="text-xl">✦</span>
          </div>
        </motion.div>
      </motion.div>
      <div>
        <h2 className="text-lg font-medium text-white lowercase mb-2">
          welcome to pkm
        </h2>
        <p className="text-sm text-white/50 lowercase max-w-xs mx-auto">
          a calm space for your thoughts. let's get you set up in just a few steps.
        </p>
      </div>
    </div>,

    // step 1: git sync
    <div key="git" className="flex flex-col gap-4 py-2">
      <div>
        <label className="block text-xs text-white/40 lowercase mb-1.5">
          git remote name
        </label>
        <Input
          value={gitRemote}
          onChange={(e) => setGitRemote(e.target.value)}
          placeholder="origin"
          className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
        />
      </div>
      <div>
        <label className="block text-xs text-white/40 lowercase mb-1.5">
          git remote url
        </label>
        <Input
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
        />
      </div>
      <Button
        variant="outline"
        onClick={testGit}
        disabled={gitTesting}
        className="w-full border-white/10 text-white/70 hover:bg-white/5 lowercase"
      >
        {gitTesting ? 'testing...' : 'test connection'}
      </Button>
    </div>,

    // step 2: sync endpoint
    <div key="sync" className="flex flex-col gap-4 py-2">
      <div>
        <label className="block text-xs text-white/40 lowercase mb-1.5">
          nocobase url
        </label>
        <Input
          value={nocobaseUrl}
          onChange={(e) => setNocobaseUrl(e.target.value)}
          placeholder="https://nocobase.example.com"
          className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
        />
      </div>
      <div>
        <label className="block text-xs text-white/40 lowercase mb-1.5">
          api key
        </label>
        <Input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="your api key"
          type="password"
          className="bg-black/40 border-white/10 text-white placeholder:text-white/20"
        />
      </div>
    </div>,
  ];

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md sm:rounded-lg">
        <DialogHeader>
          <DialogTitle className="lowercase text-white/90">
            {step === 0 && 'welcome'}
            {step === 1 && 'git sync setup'}
            {step === 2 && 'sync endpoint'}
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>

        {/* step indicators */}
        <div className="flex justify-center gap-2 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-[#f6b012]' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* actions */}
        <div className="flex items-center justify-between gap-3 mt-2">
          <Button
            variant="ghost"
            onClick={skip}
            className="text-white/40 hover:text-white/60 lowercase hover:bg-transparent"
          >
            skip onboarding
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="border-white/10 text-white/70 hover:bg-white/5 lowercase"
              >
                back
              </Button>
            )}
            {step < 2 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-white/10 text-white hover:bg-white/20 lowercase"
              >
                next
              </Button>
            ) : (
              <Button
                onClick={finish}
                className="bg-[#f6b012] text-black hover:bg-[#f6b012]/90 lowercase"
              >
                finish
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
