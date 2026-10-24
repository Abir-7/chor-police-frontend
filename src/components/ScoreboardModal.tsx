import React from 'react';
import { GamePlayer, GameRole, RoundRecord } from '../types';
import { ROLE_INFO } from './RoleCard';
import { Trophy, X } from 'lucide-react';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: GamePlayer[];
  currentUserId: string;
  roundNumber: number;
  history?: RoundRecord[];
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  players,
  currentUserId,
  roundNumber,
  history,
}) => {
  if (!isOpen) return null;

  const rounds = (history ?? [])
    .filter((r) => r.roundNumber > 0)
    .sort((a, b) => a.roundNumber - b.roundNumber);

  // Best score achieved in each finished round (for column highlighting).
  const bestPerRound = rounds.map((round) =>
    round.scores.reduce((max, s) => Math.max(max, s.points), 0),
  );

  const pointsFor = (round: RoundRecord, playerId: string): number | undefined => {
    const entry = round.scores.find((s) => s.playerId === playerId);
    return entry?.points;
  };

  // Sort once: highest total first.
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-md animate-in fade-in sm:items-center sm:p-4">
      <div className="flex max-h-[88dvh] w-full flex-col rounded-t-3xl bg-[#0b0b11] shadow-2xl animate-in slide-in-from-bottom-6 sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl sm:slide-in-from-bottom-2 ring-1 ring-white/10">
        {/* Sheet grabber (mobile) */}
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15 sm:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 pb-3 pt-3 sm:border-b sm:border-white/[0.06] sm:pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/30">
              <Trophy className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">
                Leaderboard
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                Round {roundNumber} · point by point
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1] hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Round-by-round table */}
        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky top-0 z-10 min-w-[6rem] border-b border-white/[0.08] bg-[#0b0b11] px-2 py-2 text-left text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">
                  Player
                </th>
                {rounds.map((round) => (
                  <th
                    key={round.roundNumber}
                    className="sticky top-0 z-10 border-b border-white/[0.08] bg-[#0b0b11] px-2 py-2 text-center font-mono text-[10px] font-black tracking-widest text-zinc-500"
                  >
                    R{round.roundNumber}
                  </th>
                ))}
                <th className="sticky top-0 z-10 border-b border-amber-400/30 bg-[#141009] px-2 py-2 text-center text-[9px] font-black uppercase tracking-[0.18em] text-amber-400">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, idx) => {
                const isMe = p.id === currentUserId;
                const isLeader = idx === 0;
                return (
                  <tr
                    key={p.id}
                    className={isLeader ? 'bg-amber-400/[0.04]' : isMe ? 'bg-white/[0.03]' : undefined}
                  >
                    <td className="border-b border-white/[0.05] px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 text-right font-mono text-xs font-bold ${
                            isLeader ? 'text-amber-400' : 'text-zinc-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="text-left leading-tight">
                          <span
                            className={`block whitespace-nowrap text-xs font-bold ${
                              isLeader ? 'text-amber-200' : isMe ? 'text-white' : 'text-zinc-300'
                            }`}
                          >
                            {p.name} {isMe && '(You)'}
                          </span>
                          {p.role && p.role !== 'CHOR_OR_DAKAT' && (
                            <span className="block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                              {ROLE_INFO[p.role as GameRole]?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {rounds.map((round, i) => {
                      const pts = pointsFor(round, p.id);
                      const isBest = pts !== undefined && pts > 0 && pts === bestPerRound[i];
                      return (
                        <td
                          key={round.roundNumber}
                          className="relative border-b border-white/[0.05] px-2 py-2.5 text-center"
                        >
                          <span
                            className={`font-mono text-xs font-bold ${
                              isBest
                                ? 'text-amber-300'
                                : p.roundScore !== undefined && pts === undefined
                                ? 'text-zinc-700'
                                : 'text-zinc-300'
                            }`}
                          >
                            {isBest ? '★' : ''}
                            {pts === undefined ? '–' : pts}
                          </span>
                        </td>
                      );
                    })}
                    <td className="border-b border-white/[0.05] bg-amber-400/[0.04] px-2 py-2.5 text-center">
                      <span
                        className={`font-mono text-sm font-black ${
                          isLeader ? 'text-amber-400' : isMe ? 'text-white' : 'text-zinc-100'
                        }`}
                      >
                        {p.score}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {rounds.length === 0 && (
            <p className="pt-3 pb-2 text-center text-[11px] text-zinc-600">
              No finished rounds yet — points will appear here round by round.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="h-12 w-full cursor-pointer rounded-2xl bg-white/[0.06] text-sm font-bold text-zinc-200 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
