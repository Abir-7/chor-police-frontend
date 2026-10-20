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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-lg font-black text-white">Live Leaderboard</h3>
              <p className="text-xs text-slate-400">
                Round-by-round points (Round {roundNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Round-by-round table */}
        <div className="py-3 sm:py-4 max-h-[60vh] overflow-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="sticky top-0 bg-slate-900 px-2 py-2 text-left text-[10px] uppercase font-black tracking-widest text-slate-400 z-10 min-w-[6rem] sm:min-w-[9rem] border-b border-slate-800">
                  Player
                </th>
                {rounds.map((round, i) => (
                  <th
                    key={round.roundNumber}
                    className="sticky top-0 bg-slate-900 px-2 py-2 text-center text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-800"
                  >
                    R{round.roundNumber}
                  </th>
                ))}

                <th className="sticky top-0 bg-amber-500/10 border-b border-amber-500/40 px-2 py-2 text-center text-[10px] uppercase font-black tracking-widest text-amber-400">
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
                    className={isLeader ? 'bg-amber-500/5' : isMe ? 'bg-slate-800/40' : undefined}
                  >
                    <td className="px-2 py-2.5 border-b border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 text-right font-mono text-xs font-bold ${
                            isLeader ? 'text-amber-400' : 'text-slate-500'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="text-left leading-tight">
                          <span
                            className={`font-bold text-xs block whitespace-nowrap ${
                              isLeader ? 'text-amber-200' : isMe ? 'text-white' : 'text-slate-300'
                            }`}
                          >
                            {p.name} {isMe && '(You)'}
                          </span>
                          {p.role && p.role !== 'CHOR_OR_DAKAT' && (
                            <span className="text-[10px] font-medium block whitespace-nowrap">
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
                          className="relative px-2 py-2.5 text-center border-b border-slate-800/60"
                        >
                          <span
                            className={`font-mono text-xs font-bold ${
                              isBest
                                ? 'text-amber-300'
                                : p.roundScore !== undefined && pts === undefined
                                ? 'text-slate-600'
                                : 'text-slate-300'
                            }`}
                          >
                            {isBest ? '★' : ''}
                            {pts === undefined ? '–' : pts}
                          </span>
                        </td>
                      );
                    })}

                    <td className="px-2 py-2.5 text-center border-b border-slate-800/60 bg-amber-500/5">
                      <span
                        className={`font-mono text-sm font-black ${
                          isLeader ? 'text-amber-400' : isMe ? 'text-white' : 'text-slate-100'
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
            <p className="text-center text-[11px] text-slate-500 pt-2">
              No finished rounds yet — points will appear here round by round.
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};
