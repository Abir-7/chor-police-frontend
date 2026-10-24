import React from 'react';
import { GameRole } from '../types';
import { Crown, Shield, Skull, Flame, Sparkles, User, Award } from 'lucide-react';

interface RoleCardProps {
  role?: GameRole | 'CHOR_OR_DAKAT';
  playerName?: string;
  isCurrentUser?: boolean;
  score?: number;
  /** Spans the whole reveal row — rendered as the prominent hero card. */
  fullWidth?: boolean;
}

export const ROLE_INFO: Record<
  GameRole,
  { name: string; score: number; color: string; icon: React.ReactNode; desc: string }
> = {
  [GameRole.RAJA]: {
    name: 'Babu',
    score: 1000,
    color: 'from-amber-400/20 text-amber-300',
    icon: <Crown className="w-6 h-6 text-amber-400" />,
    desc: '1000 pts · commands the Police',
  },
  [GameRole.POLICE]: {
    name: 'Police',
    score: 800,
    color: 'from-blue-400/20 text-blue-300',
    icon: <Shield className="w-6 h-6 text-blue-400" />,
    desc: '800 pts · must catch the target',
  },
  [GameRole.CHOR]: {
    name: 'Chor',
    score: 500,
    color: 'from-emerald-400/20 text-emerald-300',
    icon: <Skull className="w-6 h-6 text-emerald-400" />,
    desc: '500 pts · caught = loses everything',
  },
  [GameRole.DAKAT]: {
    name: 'Dakat',
    score: 400,
    color: 'from-rose-400/20 text-rose-300',
    icon: <Flame className="w-6 h-6 text-rose-400" />,
    desc: '400 pts · evades the Police',
  },
  [GameRole.JHARUDAR]: {
    name: 'Jharudar',
    score: 200,
    color: 'from-purple-400/20 text-purple-300',
    icon: <Sparkles className="w-6 h-6 text-purple-400" />,
    desc: '200 pts · safe & simple',
  },
  [GameRole.CLEANER]: {
    name: 'Cleaner',
    score: 200,
    color: 'from-cyan-400/20 text-cyan-300',
    icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
    desc: '200 pts · safe & simple',
  },
  [GameRole.PAGOL]: {
    name: 'Pagol',
    score: 50,
    color: 'from-orange-400/20 text-orange-300',
    icon: <User className="w-6 h-6 text-orange-400" />,
    desc: '50 pts · pure luck',
  },
  [GameRole.CHAGOL]: {
    name: 'Chagol',
    score: 100,
    color: 'from-lime-400/20 text-lime-300',
    icon: <Award className="w-6 h-6 text-lime-400" />,
    desc: '100 pts · harmless bystander',
  },
};

const RoleTile: React.FC<{ role: GameRole }> = ({ role }) => {
  const info = ROLE_INFO[role];
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b ${info.color} to-transparent ring-1 ring-white/10`}
    >
      {info.icon}
    </div>
  );
};

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  playerName,
  isCurrentUser,
  fullWidth,
}) => {
  const youTag = isCurrentUser && (
    <span className="text-amber-300 you-text-glow text-[9px] font-black uppercase tracking-[0.18em]">
      (You)
    </span>
  );

  // ─── HERO CARD (your own role, full width) ──────────────────────────────
  if (fullWidth) {
    if (!role || role === 'CHOR_OR_DAKAT') {
      return (
        <div className="flex w-full items-center gap-3.5 rounded-3xl border border-purple-400/40 bg-gradient-to-r from-purple-500/[0.14] to-transparent p-4 shadow-[0_0_40px_-12px_rgba(168,85,247,0.4)]">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-2xl ring-1 ring-purple-400/30">
            🕵️
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-black uppercase tracking-wide text-white">
                Suspect
              </h2>
              <span className="shrink-0 rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-purple-300 ring-1 ring-purple-500/30">
                Hidden
              </span>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-purple-300/80">
              You are Chor or Dakat — stay low.
            </p>
            <p className="mt-1 truncate text-sm font-bold text-white sm:hidden">
              {playerName} {youTag}
            </p>
          </div>
          <div className="hidden min-w-0 max-w-[40%] text-right sm:block">
            <span className="block truncate text-sm font-bold text-white">
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
        className={`flex w-full items-center gap-3.5 rounded-3xl border border-white/10 bg-gradient-to-r ${info.color} to-transparent p-4 shadow-xl`}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10 [&>svg]:h-7 [&>svg]:w-7">
          {info.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-xl font-black uppercase tracking-wide text-white">
              {info.name}
            </h2>
            <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-black text-amber-300 ring-1 ring-amber-400/30">
              +{info.score}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs font-semibold text-zinc-400">
            {info.desc}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-white sm:hidden">
            {playerName} {youTag}
          </p>
        </div>
        <div className="hidden min-w-0 max-w-[40%] text-right sm:block">
          <span className="block truncate text-sm font-bold text-white">
            {playerName}
          </span>
          {youTag}
        </div>
      </div>
    );
  }

  // ─── COMPACT ROW (everyone else on the reveal page) ─────────────────────
  if (!role || role === 'CHOR_OR_DAKAT') {
    return (
      <div className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 ring-1 ring-purple-400/25">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-lg ring-1 ring-purple-400/30">
          🕵️
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-black uppercase tracking-wide text-white">
              Suspect
            </span>
            <span className="shrink-0 rounded-full bg-purple-500/20 px-1.5 py-px text-[8px] font-black uppercase tracking-widest text-purple-300 ring-1 ring-purple-500/30">
              Hidden
            </span>
          </div>
          <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-purple-300/70">
            Chor or Dakat
          </span>
        </div>
        <div className="min-w-0 max-w-[42%] text-right">
          <span className="block truncate text-xs font-bold text-zinc-200">
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
      className={`flex h-14 w-full items-center gap-3 rounded-2xl bg-white/[0.04] px-3 ring-1 ring-white/10`}
    >
      <RoleTile role={role} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className={`truncate text-sm font-black uppercase tracking-wide ${info.color.split(' ')[1]}`}>
            {info.name}
          </span>
          <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-px font-mono text-[9px] font-black text-amber-300 ring-1 ring-amber-400/25">
            +{info.score}
          </span>
          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-amber-400 px-1.5 py-px text-[8px] font-black uppercase tracking-widest text-zinc-950">
              You
            </span>
          )}
        </div>
        <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
          {info.desc}
        </span>
      </div>
      <div className="min-w-0 max-w-[42%] text-right">
        <span className="block truncate text-xs font-bold text-zinc-200">
          {playerName}
        </span>
        {youTag}
      </div>
    </div>
  );
};
