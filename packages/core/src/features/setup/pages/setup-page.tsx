import React from 'react';
import { motion } from 'framer-motion';
import { OnboardingWizard } from '../components/OnboardingWizard';

function SetupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* ambient floating particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => {
          const size = 2 + Math.random() * 3;
          const left = Math.random() * 100;
          const top = Math.random() * 100;
          const duration = 12 + Math.random() * 16;
          const delay = Math.random() * 5;
          return (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/[0.06]"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                top: `${top}%`,
              }}
              animate={{
                y: [0, -40, 0],
                opacity: [0.2, 0.6, 0.2],
              }}
              transition={{
                duration,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* subtle gradient orb */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.03, 0.06, 0.03],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute w-[600px] h-[600px] rounded-full bg-[#f6b012] blur-[120px] pointer-events-none"
        style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }}
      />

      <div className="relative z-10">
        <OnboardingWizard />
      </div>
    </div>
  );
}

export default SetupPage;
