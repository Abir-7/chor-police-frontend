import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSoundPreference } from '../sound';

export const SoundToggle: React.FC = () => {
  const [enabled, setEnabled] = useSoundPreference();

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={enabled ? 'Sound effects on — click to mute' : 'Sound effects muted'}
      aria-label={enabled ? 'Mute sound effects' : 'Unmute sound effects'}
      className={`fixed top-3 left-3 z-50 flex items-center justify-center w-10 h-10 rounded-full border backdrop-blur-md transition-all cursor-pointer ${
        enabled
          ? 'bg-slate-900/80 border-slate-700 text-amber-400 hover:bg-slate-800'
          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:text-slate-300'
      }`}
    >
      {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      <span className="sr-only">Toggle sound effects</span>
    </button>
  );
};
