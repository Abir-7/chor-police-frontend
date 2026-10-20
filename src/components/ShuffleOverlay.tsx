import React from 'react';
import { PAPER_ICONS, themeForIcon } from './slipThemes';

interface ShuffleOverlayProps {
  isVisible: boolean;
  label: string;
}

export const ShuffleOverlay: React.FC<ShuffleOverlayProps> = ({
  isVisible,
  label,
}) => {
  if (!isVisible) return null;

  const SHUFFLE_SLIPS = PAPER_ICONS.slice(0, 5);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-sm select-none shuffle-overlay-in">
      {/* Shuffle cards — same design as the paper slips on the picking screen */}
      <div className="relative w-24 h-32 sm:w-32 sm:h-44 mb-8 sm:mb-10">
        {SHUFFLE_SLIPS.map((icon, i) => {
          const theme = themeForIcon(icon);
          return (
            <div
              key={icon}
              className={`absolute inset-0 rounded-2xl border-2 bg-gradient-to-br ${theme.bg} ${theme.border} shadow-2xl flex flex-col items-center justify-center overflow-hidden ${
                i % 2 === 0 ? 'shuffle-anchor' : i % 3 === 1 ? 'shuffle-left' : 'shuffle-right'
              }`}
              style={{ animationDelay: `${(i % 3) * 0.12}s` }}
            >
              {/* soft glowing sheens, same as the picking screen */}
              <span className="absolute -top-6 -left-6 w-16 h-16 bg-white/40 rounded-full blur-md pointer-events-none" />
              <span className="absolute -bottom-8 -right-4 w-20 h-20 bg-white/25 rounded-full blur-lg pointer-events-none" />

              <span className="text-4xl sm:text-5xl drop-shadow-lg">{icon}</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-amber-400 drop-shadow">
        {label}
      </p>

      <div className="mt-3 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
};
