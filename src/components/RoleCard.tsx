import React from 'react';
import { GameRole } from '../types';
import { Crown, Shield, Skull, Flame, Sparkles, User, Award } from 'lucide-react';

interface RoleCardProps {
  role?: GameRole | 'CHOR_OR_DAKAT';
  playerName?: string;
  isCurrentUser?: boolean;
  score?: number;
  /** Spans the whole reveal row — rendered as a horizontal row-card. */
  fullWidth?: boolean;
}

export const ROLE_INFO: Record<
  GameRole,
  { name: string; score: number; color: string; icon: React.ReactNode; desc: string }
> = {
  [GameRole.RAJA]: {
    name: 'Babu',
    score: 1000,
    color: 'border-amber-400 bg-gradient-to-b from-amber-950/70 via-slate-900 to-slate-950',
    icon: <Crown className="w-10 h-10 text-amber-400" />,
    desc: 'The Babu! 1000 pts. Commands Police to catch thief.',
  },
  [GameRole.POLICE]: {
    name: 'Police',
    score: 800,
    color: 'border-blue-400 bg-gradient-to-b from-blue-950/70 via-slate-900 to-slate-950',
    icon: <Shield className="w-10 h-10 text-blue-400" />,
    desc: 'The Officer! 800 pts. Must guess the correct thief.',
  },
  [GameRole.CHOR]: {
    name: 'Chor',
    score: 500,
    color: 'border-emerald-500 bg-gradient-to-b from-emerald-950/70 via-slate-900 to-slate-950',
    icon: <Skull className="w-10 h-10 text-emerald-400" />,
    desc: 'The Thief! 500 pts. If caught, loses all points.',
  },
  [GameRole.DAKAT]: {
    name: 'Dakat',
    score: 400,
    color: 'border-rose-500 bg-gradient-to-b from-rose-950/70 via-slate-900 to-slate-950',
    icon: <Flame className="w-10 h-10 text-rose-400" />,
    desc: 'The Robber! 400 pts. Evade the Police.',
  },
  [GameRole.JHARUDAR]: {
    name: 'Jharudar',
    score: 200,
    color: 'border-purple-400 bg-gradient-to-b from-purple-950/70 via-slate-900 to-slate-950',
    icon: <Sparkles className="w-10 h-10 text-purple-400" />,
    desc: 'Sweeper! 200 points safely.',
  },
  [GameRole.CLEANER]: {
    name: 'Cleaner',
    score: 200,
    color: 'border-cyan-400 bg-gradient-to-b from-cyan-950/70 via-slate-900 to-slate-950',
    icon: <Sparkles className="w-10 h-10 text-cyan-400" />,
    desc: 'Cleaner! 200 points safely.',
  },
  [GameRole.PAGOL]: {
    name: 'Pagol',
    score: 50,
    color: 'border-orange-400 bg-gradient-to-b from-orange-950/70 via-slate-900 to-slate-950',
    icon: <User className="w-10 h-10 text-orange-400" />,
    desc: 'Madman! 50 points.',
  },
  [GameRole.CHAGOL]: {
    name: 'Chagol',
    score: 100,
    color: 'border-lime-400 bg-gradient-to-b from-lime-950/70 via-slate-900 to-slate-950',
    icon: <Award className="w-10 h-10 text-lime-400" />,
    desc: 'Goat! 100 points.',
  },
};

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  playerName,
  isCurrentUser,
  fullWidth,
}) => {
  // The glowing "(You)" tag, shared by both layouts.
  const youTag = isCurrentUser && (
    <span className="text-amber-300 you-text-glow text-[10px] font-black uppercase tracking-wider">
      (You)
    </span>
  );

  // ─── FULL-WIDTH ROW-CARD (solo rows on the reveal page) ──────────────────
  if (fullWidth) {
    // Suspect: Chor or Dakat are masked for everyone except themself.
    if (!role || role === 'CHOR_OR_DAKAT') {
      return (
        <div className="w-full max-w-md sm:max-w-lg h-20 sm:h-24 rounded-2xl px-3 sm:px-4 border-2 border-purple-500/70 bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 shadow-2xl flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-2xl shrink-0">
            🕵️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">Suspect</h3>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Hidden
              </span>
            </div>
            <span className="text-[11px] text-purple-300 font-semibold block truncate">
              Chor or Dakat
            </span>
          </div>
          <div className="text-right shrink-0 max-w-[38%]">
            <span className="text-xs font-bold text-white block truncate">
              {playerName}
            </span>
            {youTag}
          </div>
        </div>
      );
    }

    const info = ROLE_INFO[role];

    return (
      <div
        className={`w-full max-w-md sm:max-w-lg h-20 sm:h-24 rounded-2xl px-3 sm:px-4 border-2 ${info.color} shadow-2xl flex items-center gap-3 text-left transition-all`}
      >
        <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 [&>svg]:w-6 [&>svg]:h-6">
          {info.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-black uppercase tracking-wider text-white">
              {info.name}
            </h2>
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              +{info.score} pts
            </span>
            {isCurrentUser && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">
                Your Role
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 leading-tight block truncate">
            {info.desc}
          </span>
        </div>
        <div className="text-right shrink-0 max-w-[38%]">
          <span className="text-xs font-bold text-white block truncate">
            {playerName}
          </span>
          {youTag}
        </div>
      </div>
    );
  }

  // ─── HORIZONTAL CARD (all rows on mobile) ──────────────────────────
  // Full-width solo rows stay single, wide cards; pair rows turn into two
  // side-by-side horizontal cards. Same shape for suspects or revealed roles.
  if (!role || role === 'CHOR_OR_DAKAT') {
    // Suspect: Chor or Dakat are masked as Suspect for everyone except the person themself (or revealed at result)
    return (
      <div className="w-full max-w-xs sm:w-full sm:max-w-md md:max-w-2xl h-14 sm:h-16 rounded-2xl px-3 sm:px-4 border-2 border-purple-500/70 bg-gradient-to-r from-purple-950/70 via-slate-900 to-slate-950 shadow-2xl flex items-center gap-3 text-left transition-all">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-lg shrink-0">
          🕵️
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white truncate">Suspect</h3>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Hidden
            </span>
          </div>
          <span className="text-[11px] text-purple-300 font-semibold block truncate">Chor or Dakat</span>
        </div>
        <div className="text-right shrink-0 max-w-[42%]">
          <span className="text-xs font-bold text-white block truncate">{playerName}</span>
          {youTag}
        </div>
      </div>
    );
  }

  const info = ROLE_INFO[role];

  // Pair-row horizontal card (desktop keeps its original tall vertical card)
  return (
    <div
      className={
        `w-full max-w-[46%] sm:max-w-[22rem] h-16 sm:h-20 md:h-24 rounded-2xl px-3 sm:px-4 border-2 ${info.color} shadow-2xl flex items-center gap-3 text-left transition-all`}
    >
      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 [&>svg]:w-5 [&>svg]:h-5">
        {info.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-sm font-black uppercase tracking-wider text-white truncate">{info.name}</h2>
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">+ {info.score} pts</span>
          {isCurrentUser && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950">Your Role</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 leading-tight block truncate">{info.desc}</span>
      </div>
      <div className="text-right shrink-0 max-w-[42%]">
        <span className="text-xs font-bold text-white block truncate">{playerName}</span>
        {youTag}
      </div>
    </div>
  );
};
