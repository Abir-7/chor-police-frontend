import React from 'react';

/**
 * Deterministic geometric identicon, generated purely from the player's name
 * — no uploads or images needed. Mirrored 5×5 grid (GitHub identicon style)
 * on a dark duotone background, so every player keeps a consistent, distinct
 * "profile picture" across every screen.
 */
function hashString(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h) || 7; // never seed 0
}

interface IdenticonProps {
  name: string;
  /** Tailwind size classes, e.g. "h-9 w-9". */
  className?: string;
  /** Full circle (default) for small avatars; pass false for square tiles. */
  circle?: boolean;
}

interface Cell {
  x: number;
  y: number;
  color: string;
}

export const Identicon: React.FC<IdenticonProps> = ({
  name,
  className = 'h-9 w-9',
  circle = true,
}) => {
  const { cells, bg } = React.useMemo(() => {
    const seed = hashString(name.trim().toLowerCase());
    const hue = seed % 360;
    const hue2 = (hue + 28 + (seed % 12)) % 360;

    let s = seed;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };

    const fgA = `hsl(${hue} 80% 62%)`;
    const fgB = `hsl(${hue2} 72% 58%)`;

    const built: Cell[] = [];
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 3; x++) {
        if (rand() > 0.46) {
          const color = rand() > 0.7 ? fgB : fgA;
          built.push({ x, y, color });
          if (x < 2) built.push({ x: 4 - x, y, color }); // mirror
        }
      }
    }
    return { cells: built, bg: `hsl(${hue} 28% 14%)` };
  }, [name]);

  return (
    <svg
      viewBox="0 0 5 5"
      aria-hidden="true"
      className={`${className} shrink-0 overflow-hidden bg-white/[0.04] ring-1 ring-white/15 ${
        circle ? 'rounded-full' : 'rounded-xl'
      }`}
    >
      <rect width="5" height="5" rx="0.6" fill={bg} />
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width="1" height="1" fill={c.color} />
      ))}
    </svg>
  );
};
