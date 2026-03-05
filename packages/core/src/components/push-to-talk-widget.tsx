import { useState } from 'react';
import { Mic } from 'lucide-react';

// this component is deliberately simple so it can be
// reused outside of the journal page (e.g. exported as
// a standalone widget for mobile home screen packaging).
// it toggles voice transcription on/off and indicates
// its state with a yellow or gray background. the
// parent must supply the "handleVoiceTranscription" function
// from journal.tsx or wherever transcription logic lives.

export function PushToTalkWidget({ handleVoiceTranscription }: { handleVoiceTranscription: () => void }) {
  const [active, setActive] = useState(false);
  const toggle = () => {
    handleVoiceTranscription();
    setActive(!active);
  };
  return (
    <div
      onClick={toggle}
      className="fixed bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
      style={{ background: active ? '#f5af12' : '#888' }}
      title="push to talk"
    >
      <Mic size={24} className={active ? 'text-black' : 'text-white/50'} />
    </div>
  );
}
