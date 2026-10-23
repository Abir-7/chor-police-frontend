import React, { useState } from 'react';
import {
  PublicGameState,
  GamePhase,
  GameRole,
} from '../types';
import { RoleCard, ROLE_INFO } from './RoleCard';
import { ScoreboardModal } from './ScoreboardModal';
import { Crown, Shield, Award, Clock, ArrowRight, UserCheck, HelpCircle, Trophy, LogOut, Home } from 'lucide-react';
import confetti from 'canvas-confetti';
import { SLIP_PALETTES, PAPER_ICONS, themeForIcon } from './slipThemes';

const SLIP_TILTS = ['-rotate-2', 'rotate-3', 'rotate-1', '-rotate-3', 'rotate-2', '-rotate-1'];

interface GameBoardProps {
  gameState: PublicGameState;
  myRole?: GameRole;
  partnerThief?: { id: string; name: string; role: GameRole };
  currentUserId: string;
  isHost: boolean;
  timeLeft?: number;
  onPickPaper: (paperId: string) => void;
  onSelectTarget: (targetRole: GameRole.CHOR | GameRole.DAKAT) => void;
  onGuessPlayer: (selectedPlayerId: string) => void;
  onPoliceSelectSuspect?: (selectedPlayerId: string) => void;
  onFinishGame?: () => void;
  onNextRound: () => void;
  onBackToLobby?: () => void;
  onLeaveGame?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  myRole,
  partnerThief,
  currentUserId,
  isHost,
  timeLeft,
  onPickPaper,
  onSelectTarget,
  onGuessPlayer,
  onPoliceSelectSuspect,
  onFinishGame,
  onNextRound,
  onBackToLobby,
  onLeaveGame,
}) => {
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);

  // The GameBoard component stays mounted between rounds, so without this
  // reset the police's local suspect selection from a finished round would
  // carry over: after the Babu picks the target, a suspect would already
  // show as selected (and "Confirm Arrest" enabled) even though the police
  // has not chosen anyone in the new round.
  React.useEffect(() => {
    setSelectedSuspectId(null);
  }, [gameState.roundNumber, gameState.phase]);

  const me = gameState.players.find((p) => p.id === currentUserId);
  const isRaja = myRole === GameRole.RAJA;
  const isPolice = myRole === GameRole.POLICE;
  const rajaPlayer = gameState.players.find((p) => p.role === GameRole.RAJA);
  const policePlayer = gameState.players.find((p) => p.role === GameRole.POLICE);

  /** Three bouncing dots that make a 'deciding...' status feel alive. */
  const DecidingDots = () => (
    <span className="inline-flex ml-1 gap-0.5 align-baseline">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1.5 h-1.5 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );

  // Only trust and display the partner-thief identity while the CURRENT role
  // really is a thief. Without this guard, a partner identity left over from
  // a previous round (where this player was Chor/Dakat) would wrongly flag
  // another player as Chor/Dakat in later rounds.
  const trustedPartnerThief =
    partnerThief &&
    ((myRole === GameRole.CHOR && partnerThief.role === GameRole.DAKAT) ||
      (myRole === GameRole.DAKAT && partnerThief.role === GameRole.CHOR))
      ? partnerThief
      : undefined;
  const partnerVisible = trustedPartnerThief && gameState.players.some(
    (p) => p.id === trustedPartnerThief.id,
  );

  // Suspects: exactly the players holding CHOR or DAKAT
  // If player roles are masked as CHOR_OR_DAKAT or if they are CHOR/DAKAT, list them.
  // Fallback: any players who are neither RAJA, POLICE, nor innocent citizen roles.
  const nonSuspectRoles = new Set([
    GameRole.RAJA,
    GameRole.POLICE,
    GameRole.JHARUDAR,
    GameRole.CLEANER,
    GameRole.PAGOL,
    GameRole.CHAGOL,
  ]);
  const suspects = gameState.players.filter(
    (p) =>
      p.role === 'CHOR_OR_DAKAT' ||
      p.role === GameRole.CHOR ||
      p.role === GameRole.DAKAT ||
      (!nonSuspectRoles.has(p.role as GameRole) && p.role !== undefined),
  );

  /**
   * Orders players for the reveal screen in serial:
   * 1) current user (me)
   * 2) Police
   * 3) Babu (Raja)
   * 4) suspects (Chor / Dakat)
   * 5) everyone else
   */
  // orderedRevealPlayers helper is defined above the component return
  const orderedRevealPlayers = (
    players: PublicGameState['players'],
    meId: string,
    myRole: GameRole | undefined,
    partnerVisible: boolean,
    trustedPartnerThief: { id: string; name: string; role: GameRole } | undefined,
  ) => {
    const suspectRoles = new Set<GameRole>([GameRole.CHOR, GameRole.DAKAT]);

    const sorted = [...players].sort((a, b) => {
      const aIsMe = a.id === meId;
      const bIsMe = b.id === meId;
      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;

      const aRole = a.id === meId && myRole ? myRole : a.role;
      const bRole = b.id === meId && myRole ? myRole : b.role;

      const aIsPolice = aRole === GameRole.POLICE;
      const bIsPolice = bRole === GameRole.POLICE;
      if (aIsPolice && !bIsPolice) return -1;
      if (!aIsPolice && bIsPolice) return 1;

      const aIsBabu = aRole === GameRole.RAJA;
      const bIsBabu = bRole === GameRole.RAJA;
      if (aIsBabu && !bIsBabu) return -1;
      if (!aIsBabu && bIsBabu) return 1;

      const aIsSuspect = suspectRoles.has(aRole as GameRole);
      const bIsSuspect = suspectRoles.has(bRole as GameRole);
      if (aIsSuspect && !bIsSuspect) return -1;
      if (!aIsSuspect && bIsSuspect) return 1;

      return a.name.localeCompare(b.name);
    });

    return sorted;
  };

  // Active selection (by Police, synced to all users via gameState or local state)
  const activeSelectionId = isPolice ? selectedSuspectId : (gameState.selectedPlayerId ?? selectedSuspectId);
  const selectedSuspectPlayer = gameState.players.find((p) => p.id === activeSelectionId);

  const handleSuspectClick = (suspectId: string) => {
    if (!isPolice) return;
    setSelectedSuspectId(suspectId);
    if (onPoliceSelectSuspect) {
      onPoliceSelectSuspect(suspectId);
    }
  };

  // Trigger celebration confetti if match is over
  React.useEffect(() => {
    if (gameState.phase === GamePhase.GAME_OVER) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [gameState.phase]);

  // Helper to get role badge label and styles
  const getRoleBadge = (role?: GameRole | 'CHOR_OR_DAKAT') => {
    if (!role) {
      return (
        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Hidden
        </span>
      );
    }

    if (role === 'CHOR_OR_DAKAT') {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1 animate-pulse">
          🕵️ Suspect (Chor / Dakat)
        </span>
      );
    }

    const info = ROLE_INFO[role];
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
          role === GameRole.RAJA
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            : role === GameRole.POLICE
            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        {info ? info.name : role}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col px-4 pb-24 pt-20 sm:p-6 max-w-5xl mx-auto">
      {/* Top Game Bar with Scoreboard Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-3 py-2.5 sm:px-5 sm:py-3 shadow-lg mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-xs uppercase font-extrabold px-2.5 sm:px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
            Round {gameState.roundNumber}{' '}
            {gameState.settings?.maxRounds ? `/ ${gameState.settings.maxRounds}` : ''}
          </span>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Room: #{gameState.roomCode}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {isHost && gameState.phase !== GamePhase.GAME_OVER && onFinishGame && (
            <button
              onClick={onFinishGame}
              className='flex items-center gap-1.5 px-3 py-1 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer'
              title='Finish Match Now'
            >
              <span>End Match</span>
            </button>
          )}
          {/* View Scoreboard Button */}
          <button
            onClick={() => setShowScoreboard(true)}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Scores</span>
          </button>

          {/* Leave Game Button */}
          {onLeaveGame && (
            <button
              onClick={onLeaveGame}
              className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Leave Game"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Leave</span>
            </button>
          )}

          {timeLeft !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-amber-400 rounded-full border border-slate-700 font-mono text-sm font-bold">
              <Clock className="w-4 h-4 animate-pulse" />
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area Based on Phase */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* PHASE 1: PICKING */}
        {gameState.phase === GamePhase.PICKING && (
          <div className="text-center w-full max-w-2xl animate-in fade-in">
            <h2 className="text-2xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-300 to-cyan-300">
              Pick Your Paper Slip
            </h2>
            <p className="text-sm text-slate-400 mb-8">
              {me?.hasPicked
                ? 'Waiting for all players to pick their slips...'
                : 'Click a slip to claim your secret role — each slip keeps its icon for everyone!'}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              {gameState.papers.map((paper, idx) => {
                const theme = themeForIcon(paper.icon);
                const tilt = SLIP_TILTS[idx % SLIP_TILTS.length];
                const takenPlayer = gameState.players.find((p) => p.id === paper.selectedBy);
                const isTaken = Boolean(paper.selectedBy);
                const isMine = paper.selectedBy === currentUserId;
                const canClick = !me?.hasPicked && !isTaken;
                return (
                  <button
                    key={paper.id}
                    onClick={() => canClick && onPickPaper(paper.id)}
                    disabled={!canClick}
                    className={`group relative w-24 h-32 sm:w-28 sm:h-36 rounded-2xl border-2 bg-gradient-to-br ${theme.bg} overflow-hidden transition-all duration-300 shadow-lg flex flex-col items-center justify-center ${tilt} ${
                      isTaken
                        ? 'opacity-70 saturate-50 cursor-not-allowed border-slate-600'
                        : me?.hasPicked
                        ? 'opacity-50 saturate-50 cursor-not-allowed border-slate-700'
                        : `cursor-pointer ${theme.border} hover:rotate-0 hover:scale-110 hover:shadow-2xl active:scale-95 ${theme.glow}`
                    }`}
                  >
                    {/* soft glowing sheens */}
                    <span className="absolute -top-6 -left-6 w-16 h-16 bg-white/40 rounded-full blur-md pointer-events-none" />
                    <span className="absolute -bottom-8 -right-4 w-20 h-20 bg-white/25 rounded-full blur-lg pointer-events-none" />

                    <span
                      className={`text-5xl mb-2 drop-shadow-lg transition-transform ${
                        isTaken ? '' : 'group-hover:scale-125 group-hover:rotate-12'
                      }`}
                    >
                      {paper.icon}
                    </span>

                    {isTaken ? (
                      <span className="absolute bottom-1.5 left-1 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide bg-black/45 text-white flex items-center justify-center gap-1">
                        <span className="shrink-0">👉</span>
                        <span className="truncate">
                          {(takenPlayer?.name ?? 'Taken') + (isMine ? ' (You)' : '')}
                        </span>
                      </span>
                    ) : (
                      !me?.hasPicked && (
                        <span className="absolute bottom-2 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-black/25 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          Pick me ✨
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PHASE 2: ROLE REVEAL & ALL PLAYERS' REVEALED ROLES */}
        {gameState.phase === GamePhase.ROLE_REVEAL && (
          <div className="flex flex-col items-center text-center max-w-4xl w-full animate-in fade-in">
            <h2 className="text-2xl font-black mb-1 text-white">Roles Revealed!</h2>
            <p className="text-xs text-slate-400 mb-6">
              Cards have opened! Everyone's role is revealed on their card except suspects (<span className="text-purple-300 font-bold">Chor or Dakat</span>).
            </p>

            {/* Display All Players Cards — serial order: me → police → babu → suspect → others */}
            <div className="w-full">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-4 text-center">
                Assigned Roles (Chor and Dakat remain secret suspects)
              </span>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {orderedRevealPlayers(gameState.players, currentUserId, myRole, !!partnerVisible, trustedPartnerThief).map((p) => {
                  const isCurrent = p.id === currentUserId;
                  const isPartner = partnerVisible && trustedPartnerThief.id === p.id;
                  const displayRole = isCurrent && myRole ? myRole : isPartner ? trustedPartnerThief.role : p.role;
                  return (
                    <div key={p.id} className="flex flex-col items-center">
                      <RoleCard
                        role={displayRole}
                        playerName={p.name}
                        isCurrentUser={isCurrent}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Babu's Command — moved to bottom */}
            {isRaja ? (
              <div className="w-full max-w-xl bg-slate-900/90 border border-amber-500/40 p-5 rounded-2xl shadow-xl mt-6">
                <div className="flex items-center justify-center gap-2 mb-2 text-amber-400">
                  <Crown className="w-5 h-5" />
                  <span className="font-black text-sm uppercase">Babu's Command</span>
                </div>
                <p className="text-xs text-slate-300 mb-4">
                  Select which thief the Police must track down:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onSelectTarget(GameRole.CHOR)}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Catch CHOR (500 pts)
                  </button>
                  <button
                    onClick={() => onSelectTarget(GameRole.DAKAT)}
                    className="py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    Catch DAKAT (400 pts)
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-xl p-4 bg-slate-900/80 border border-amber-500/30 rounded-2xl shadow-lg mt-6 flex items-center justify-center gap-3">
                <Crown className="w-6 h-6 text-amber-400 animate-bounce shrink-0" />
                <div className="text-left">
                  <span className="block text-sm font-black text-amber-400 uppercase tracking-wide">
                    Babu is deciding
                    <DecidingDots />
                  </span>
                  <span className="block text-xs text-slate-400">
                    {rajaPlayer ? `${rajaPlayer.name} is choosing whom the Police must catch...` : 'Waiting for the target thief to be chosen...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PHASE 3: POLICE GUESSING (Only between the 2 Suspects: Chor or Dakat) */}
        {gameState.phase === GamePhase.GUESSING && (
          <div className="w-full max-w-xl text-center animate-in fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 mb-3 text-xs font-bold uppercase tracking-wider">
              <Shield className="w-4 h-4" />
              Target Selected: Catch The {gameState.targetRole}!
            </div>
            {isPolice ? (
              <>
                <h2 className="text-2xl font-black mb-2 text-white">
                  Police: Which one is the {gameState.targetRole}?
                </h2>
                <p className="text-xs text-slate-400 mb-6">
                  Choose between the 2 suspects below to arrest the {gameState.targetRole}!
                </p>
              </>
            ) : (
              <div className="w-full max-w-xl p-4 mb-6 bg-slate-900/80 border border-blue-500/30 rounded-2xl shadow-lg flex items-center justify-center gap-3">
                <Shield className="w-6 h-6 text-blue-400 animate-pulse shrink-0" />
                <div className="text-left">
                  <span className="block text-sm font-black text-blue-400 uppercase tracking-wide">
                    Police is investigating
                    <DecidingDots />
                  </span>
                  <span className="block text-xs text-slate-400">
                    {policePlayer ? `${policePlayer.name} is trying to catch the ${gameState.targetRole}...` : `Someone is trying to catch the ${gameState.targetRole}...`}
                  </span>
                </div>
              </div>
            )}

            {/* Live Indicator of Police Selection for everyone */}
            {selectedSuspectPlayer && (
              <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-bold animate-pulse">
                <span>🎯</span>
                <span>
                  {isPolice
                    ? `You selected ${selectedSuspectPlayer.name}`
                    : `Police is targeting: ${selectedSuspectPlayer.name}`}
                </span>
              </div>
            )}

            {/* Suspects Cards (Exactly Chor and Dakat) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {suspects.map((p) => {
                const isMe = p.id === currentUserId;
                const isSelected = activeSelectionId === p.id;
                const canSelect = isPolice && !isMe;

                return (
                  <button
                    key={p.id}
                    disabled={!canSelect}
                    onClick={() => handleSuspectClick(p.id)}
                    className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-blue-400 bg-blue-500/20 shadow-xl ring-2 ring-blue-500 scale-102'
                        : canSelect
                        ? 'border-purple-500/40 bg-slate-900/90 hover:border-purple-400 hover:bg-slate-800/90 cursor-pointer shadow-lg'
                        : 'border-slate-800 bg-slate-950/60 opacity-80 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <span className="text-xs uppercase font-extrabold tracking-widest text-purple-400">
                        Suspect
                      </span>
                      {isSelected ? (
                        <UserCheck className="w-5 h-5 text-blue-400" />
                      ) : (
                        <span className="text-xl">🕵️</span>
                      )}
                    </div>

                    <div>
                      <span className="font-black text-lg block text-white">
                        {p.name} {isMe && '(You)'}
                      </span>
                      <span className="text-xs text-purple-300/80 font-medium mt-0.5 block">
                        Either Chor or Dakat
                      </span>
                    </div>

                    {canSelect ? (
                      <span className="mt-4 text-[11px] font-bold text-blue-400 text-center block py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        {isSelected ? '✓ Selected for Arrest' : 'Click to Target'}
                      </span>
                    ) : isSelected ? (
                      <span className="mt-4 text-[11px] font-bold text-amber-400 text-center block py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        🎯 Police has picked this suspect
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {isPolice && (
              <button
                disabled={!selectedSuspectId}
                onClick={() => selectedSuspectId && onGuessPlayer(selectedSuspectId)}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 text-white font-black uppercase tracking-wider shadow-xl transition-all cursor-pointer"
              >
                Confirm Arrest ({gameState.targetRole})
              </button>
            )}
          </div>
        )}

        {/* PHASE 4: ROUND RESULT OR GAME OVER */}
        {(gameState.phase === GamePhase.ROUND_RESULT || gameState.phase === GamePhase.GAME_OVER) && (
          <div className="w-full max-w-xl text-center animate-in zoom-in-95">
            <div className="mb-4">
              {gameState.phase === GamePhase.GAME_OVER ? (
                <div className="inline-flex p-3 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-400 mb-2">
                  <Award className="w-10 h-10 animate-bounce" />
                </div>
              ) : (
                <span className="text-3xl">🏁</span>
              )}
              <h2 className="text-3xl font-black text-white mt-2">
                {gameState.phase === GamePhase.GAME_OVER ? 'Match Finished!' : 'Round Completed!'}
              </h2>
            </div>

            {/* Scoreboard table */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl mb-6">
              <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-3 text-left">
                Scoreboard & Roles Revealed
              </div>
              <div className="space-y-2">
                {gameState.players
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => {
                    const isWinner = gameState.winnerPlayerId === p.id;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isWinner
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                            : 'bg-slate-950/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-slate-500 w-4">
                            #{idx + 1}
                          </span>
                          <div className="text-left">
                            <span className="font-bold text-sm block text-white">
                              {p.name} {p.id === currentUserId && '(You)'}
                            </span>
                            <span className="text-[11px] font-semibold text-amber-400">
                              {p.role ? ROLE_INFO[p.role as GameRole]?.name || p.role : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono text-sm font-black text-white">
                            {p.score} pts
                          </span>
                          <span className="text-[10px] text-emerald-400 block font-semibold">
                            +{p.roundScore} this round
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Advance Button */}
            {isHost && gameState.phase === GamePhase.ROUND_RESULT && onFinishGame && (
              <button
                onClick={onFinishGame}
                className='w-full mb-3 py-3 px-6 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 font-bold uppercase tracking-wider transition-all text-xs cursor-pointer'
              >
                End Match Now & Crown Winner
              </button>
            )}
            {isHost && gameState.phase === GamePhase.GAME_OVER && onBackToLobby && (
              <button
                onClick={onBackToLobby}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-5 h-5" />
                <span>Back to Lobby (Set Rounds & Start New Match)</span>
              </button>
            )}
            {isHost && gameState.phase === GamePhase.ROUND_RESULT && (
              <button
                onClick={onNextRound}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Next Round</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Persistent Live Leaderboard Modal */}
      <ScoreboardModal
        isOpen={showScoreboard}
        onClose={() => setShowScoreboard(false)}
        players={gameState.players}
        currentUserId={currentUserId}
        roundNumber={gameState.roundNumber}
        history={gameState.history}
      />
    </div>
  );
};
