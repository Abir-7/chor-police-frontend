/** Icon pool pinned to specific papers by the backend (each paper keeps its icon all round) */
export const PAPER_ICONS = ['🐴', '🍬', '🎈', '🍕', '⚓', '🌵', '🌮', '🧸'];

/** Each icon identity keeps its own colors for every player */
export const SLIP_PALETTES = [
  { bg: 'from-rose-200 via-pink-300 to-pink-400', border: 'border-pink-400', glow: 'hover:shadow-pink-500/40' },
  { bg: 'from-violet-200 via-purple-300 to-purple-400', border: 'border-purple-400', glow: 'hover:shadow-purple-500/40' },
  { bg: 'from-sky-200 via-cyan-300 to-cyan-400', border: 'border-cyan-400', glow: 'hover:shadow-cyan-500/40' },
  { bg: 'from-emerald-200 via-green-300 to-emerald-400', border: 'border-emerald-400', glow: 'hover:shadow-emerald-500/40' },
  { bg: 'from-amber-200 via-amber-300 to-orange-400', border: 'border-amber-400', glow: 'hover:shadow-amber-500/40' },
  { bg: 'from-red-200 via-red-300 to-rose-400', border: 'border-rose-400', glow: 'hover:shadow-rose-500/40' },
  { bg: 'from-indigo-200 via-indigo-300 to-indigo-400', border: 'border-indigo-400', glow: 'hover:shadow-indigo-500/40' },
  { bg: 'from-teal-200 via-teal-300 to-teal-400', border: 'border-teal-400', glow: 'hover:shadow-teal-500/40' },
];

export const themeForIcon = (icon: string) => {
  const idx = PAPER_ICONS.indexOf(icon);
  return SLIP_PALETTES[idx >= 0 ? idx % SLIP_PALETTES.length : 0];
};
