import React, { useEffect } from 'react';
import { GameRole } from '../types';
import confetti from 'canvas-confetti';

interface PhaseAnnouncementOverlayProps {
  kind: 'reveal' | 'king' | 'caught' | 'missed';
  targetRole?: GameRole.CHOR | GameRole.DAKAT;
}

export const PhaseAnnouncementOverlay: React.FC<PhaseAnnouncementOverlayProps> = ({
  kind,
  targetRole,
}) => {
  // Celebration confetti on a successful catch.
  useEffect(() => {
    if (kind !== 'caught') return;
    confetti({ particleCount: 130, spread: 80, origin: { y: 0.55 } });
    const t = setTimeout(
      () => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }),
      1200,
    );
    return () => clearTimeout(t);
  }, [kind]);

  if (kind === 'reveal') {
    return (
      <div className="fixed inset-0 z-40 px-4 flex flex-col items-center justify-center bg-slate-950/92 backdrop-blur-sm select-none announce-overlay-in">
        {/* flipping role card */}
        <div className="w-20 h-28 sm:w-24 sm:h-32 mb-6 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-100 via-amber-200 to-amber-400 shadow-2xl flex items-center justify-center overflow-hidden relative announce-role-flip">
          <span className="absolute -top-6 -left-6 w-16 h-16 bg-white/40 rounded-full blur-md" />
          <span className="text-4xl sm:text-5xl text-amber-950">🎭</span>
        </div>
        <div className="absolute top-1/3 left-1/4 -translate-x-1/2 text-lg announce-sparkle">✨</div>
        <div className="absolute top-1/3 right-1/4 translate-x-1/2 text-lg announce-sparkle announce-delay">✨</div>
        <p className="text-xl sm:text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-amber-400 announce-pop">
          Opening the cards
        </p>
        <p className="mt-3 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-300 announce-delay animate-pulse">
          Your secret role is about to be revealed ✨
        </p>
      </div>
    );
  }

  if (kind === 'king') {
    return (
      <div className="fixed inset-0 z-40 px-4 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm select-none announce-overlay-in">
        {/* siren glow */}
        <div className="absolute inset-0 pointer-events-none announce-siren" />
        <span className="text-5xl sm:text-8xl mb-4 sm:mb-6 announce-pop">👑</span>
        <p className="text-base sm:text-xl font-black uppercase tracking-[0.25em] sm:tracking-[0.35em] text-amber-300 announce-pop">
          Babu has spoken
        </p>
        <p className="mt-4 sm:mt-6 text-2xl sm:text-4xl font-black uppercase tracking-wider announce-pop announce-delay">
          <span className="text-slate-300">Catch the </span>
          <span
            className={
              targetRole === GameRole.DAKAT
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-500'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500'
            }
          >
            {targetRole}
          </span>
          <span className="text-slate-300"> !</span>
        </p>
        <span className="mt-8 text-3xl animate-bounce">🎯</span>
      </div>
    );
  }

  if (kind === 'caught') {
    return (
      <div className="fixed inset-0 z-40 px-4 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm select-none announce-overlay-in">
        <div className="absolute inset-0 pointer-events-none announce-siren" />
        <span className="text-5xl sm:text-8xl mb-4 sm:mb-6 announce-pop announce-siren-flash">🚔</span>
        <p className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-400 announce-pop">
          Caught!
        </p>
        <p className="mt-4 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-emerald-200/80 announce-delay">
          Police caught the {targetRole} 👮✨
        </p>
      </div>
    );
  }

  // missed
  return (
    <div className="fixed inset-0 z-40 px-4 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm select-none announce-overlay-in announce-shake">
      <div className="absolute inset-0 pointer-events-none announce-miss-overlay" />
      <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <span className="text-5xl sm:text-7xl announce-pop">❌</span>
        <span className="text-4xl sm:text-6xl announce-escape">🏃‍♂️</span>
        <span className="text-2xl sm:text-4xl announce-escape-late">💨</span>
      </div>
      <p className="text-3xl sm:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-500 announce-pop">
        Missed!
      </p>
      <p className="mt-4 text-[10px] sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] text-rose-200/80 announce-delay">
        The {targetRole} escaped! Police got the wrong one 💨
      </p>
    </div>
  );
};
