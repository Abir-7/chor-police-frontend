import React from 'react';
import { GameRole } from '../types';
import { Crown, Shield, Skull, Flame, Sparkles, User, Award } from 'lucide-react';

interface RoleCardProps {
  role?: GameRole | 'CHOR_OR_DAKAT';
  playerName?: string;
  isCurrentUser?: boolean;
  score?: number;
}

export const ROLE_INFO: Record<
  GameRole,
  { name: string; score: number; color: string; icon: React.ReactNode; desc: string }
> = {
  [GameRole.RAJA]: {
    name: 'Raja',
    score: 1000,
    color: 'border-amber-400 bg-gradient-to-b from-amber-950/70 via-slate-900 to-slate-950',
    icon: <Crown className="w-10 h-10 text-amber-400" />,
    desc: 'The King! 1000 pts. Commands Police to catch thief.',
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
}) => {
  // Suspects: Chor or Dakat are masked as Suspect for everyone except the person themself (or revealed at result)
  if (!role || role === 'CHOR_OR_DAKAT') {
    return (
      <div className="w-36 sm:w-44 md:w-48 h-56 sm:h-60 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between shadow-2xl border-2 border-purple-500/70 bg-gradient-to-b from-purple-950/60 via-slate-900 to-slate-950 text-center transition-all">
        <div className="flex items-center justify-between w-full">
          <span className="text-[10px] uppercase font-black tracking-wider text-purple-400">
            Suspect
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Hidden
          </span>
        </div>

        <div className="flex flex-col items-center my-2">
          <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mb-2 text-2xl">
            🕵️
          </div>
          <h3 className="text-base font-black text-white">Suspect</h3>
          <span className="text-xs text-purple-300 font-semibold mt-0.5">Chor or Dakat</span>
        </div>

        <div className="w-full border-t border-purple-500/20 pt-2">
          <span className="text-xs font-bold text-white block truncate">
            {playerName} {isCurrentUser && '(You)'}
          </span>
        </div>
      </div>
    );
  }

  const info = ROLE_INFO[role];

  return (
    <div
      className={`w-36 sm:w-44 md:w-48 h-56 sm:h-60 rounded-2xl p-3 sm:p-4 flex flex-col items-center justify-between shadow-2xl border-2 ${info.color} text-center transition-all`}
    >
      <div className="flex items-center justify-between w-full">
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
          {isCurrentUser ? 'Your Role' : 'Role'}
        </span>
        <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
          +{info.score} pts
        </span>
      </div>

      <div className="flex flex-col items-center my-1">
        <div className="mb-1 scale-95">{info.icon}</div>
        <h2 className="text-lg font-black uppercase tracking-wider text-white">
          {info.name}
        </h2>
        <span className="text-[11px] text-slate-400 leading-tight mt-0.5 px-1">
          {info.desc}
        </span>
      </div>

      <div className="w-full border-t border-slate-700/60 pt-2">
        <span className="text-xs font-bold text-white block truncate">
          {playerName} {isCurrentUser && '(You)'}
        </span>
      </div>
    </div>
  );
};
