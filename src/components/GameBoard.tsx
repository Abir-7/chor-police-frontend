import React, { useState } from 'react';
import {
  PublicGameState,
  GamePhase,
  GameRole,
} from '../types';
import { RoleCard, ROLE_INFO } from './RoleCard';
import { ScoreboardModal } from './ScoreboardModal';
import { Chat } from './Chat';
import { Crown, Shield, Award, Clock, ArrowRight, UserCheck, Trophy, LogOut, Home, Menu, X, Target } from 'lucide-react';
import confetti from 'canvas-confetti';
import { themeForIcon } from './slipThemes';
import { Identicon } from './Identicon';

const SLIP_TILTS = ['-rotate-1.5', 'rotate-1.5', 'rotate-1', '-rotate-1', 'rotate-1.5', '-rotate-0.5'];

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
  /** True while a bot Police's pick is live: the Confirm-arrest dock renders
   *  for everyone and plays a button-press exactly when the arrest lands. */
  policePressing?: boolean;
  onFinishGame?: () => void;
  onNextRound: () => void;
  onBackToLobby?: () => void;
  onLeaveGame?: () => void;
}

/** Player identity: deterministic identicon (no images needed). */
const Avatar: React.FC<{ name: string; size?: 'sm' | 'lg' }> = ({ name, size = 'sm' }) => {
  const box = size === 'lg' ? 'h-16 w-16' : 'h-7 w-7';
  return <Identicon name={name} className={box} />;
};

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
  policePressing = false,
  onFinishGame,
  onNextRound,
  onBackToLobby,
  onLeaveGame,
}) => {
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  // Android-app-shell side drawer (mobile): live scores + chat + room actions.
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The slip currently doing its "already taken" shake (no alert needed).
  const [shakingPaperId, setShakingPaperId] = useState<string | null>(null);

  // The GameBoard component stays mounted between rounds, so without this
  // reset the police's local suspect selection from a finished round would
  // carry over: after the Babu picks the target, a suspect would already
  // show as selected (and "Confirm Arrest" enabled) even though the police
  // has not chosen anyone in the new round.
  React.useEffect(() => {
    setSelectedSuspectId(null);
    setDrawerOpen(false);
  }, [gameState.roundNumber, gameState.phase]);

  const me = gameState.players.find((p) => p.id === currentUserId);
  const isRaja = myRole === GameRole.RAJA;
  const isPolice = myRole === GameRole.POLICE;
  const rajaPlayer = gameState.players.find((p) => p.role === GameRole.RAJA);
  const policePlayer = gameState.players.find((p) => p.role === GameRole.POLICE);

  /** Three bouncing dots that make a 'deciding...' status feel alive. */
  const DecidingDots = () => (
    <span className="ml-1 inline-flex gap-0.5 align-baseline">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current"
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
   * Strict serial order for the reveal page — every player gets ONE ROW each,
   * regardless of role:
   *  row 1: me (always first)
   *  row 2: Babu -> Police (whichever of the two you hold is already your
   *         row 1, so only the other shows here)
   *  row 3: the two suspects (if you are one, your partner shows alone)
   *  row 4+: everyone else
   */
  const buildRevealRows = (
    players: PublicGameState['players'],
    meId: string,
  ) => {
    const meRow = players.filter((p) => p.id === meId) as PublicGameState['players'];
    const rest = players.filter((p) => p.id !== meId) as PublicGameState['players'];

    const babu = rest.filter((p) => p.role === GameRole.RAJA);
    const police = rest.filter((p) => p.role === GameRole.POLICE);
    const suspects = rest.filter(
      (p) =>
        p.role === 'CHOR_OR_DAKAT' ||
        p.role === GameRole.CHOR ||
        p.role === GameRole.DAKAT,
    );
    const others = rest.filter(
      (p) => !babu.includes(p) && !police.includes(p) && !suspects.includes(p),
    );

    return [...meRow, ...babu, ...police, ...suspects, ...others];
  };

  /** Renders one revealed card with its row-safe polish effects. */
  const renderRevealCard = (
    p: PublicGameState['players'][number],
    fullWidth: boolean,
  ) => {
    const isCurrent = p.id === currentUserId;
    const isPartner = partnerVisible && trustedPartnerThief.id === p.id;
    const displayRole = isCurrent && myRole ? myRole : isPartner ? trustedPartnerThief.role : p.role;
    const revealFx = isCurrent
      ? 'my-card-bob'
      : displayRole === GameRole.POLICE
      ? 'police-siren-glow'
      : displayRole === GameRole.RAJA
      ? 'babu-gold-pulse'
      : '';
    return (
      <div key={p.id} className={`w-full rounded-3xl ${revealFx}`}>
        <RoleCard
          role={displayRole}
          playerName={p.name}
          isCurrentUser={isCurrent}
          fullWidth={fullWidth}
        />
      </div>
    );
  };

  // Desktop-only reveal row for OTHER players: identicon-first, name-first,
  // role chip on the right. The mobile compact RoleCard is too sparse for
  // the wide desktop table, so the table gets its own richer markup.
  const renderRevealRow = (p: PublicGameState['players'][number]) => {
    const isCurrent = p.id === currentUserId;
    const isPartner = partnerVisible && trustedPartnerThief.id === p.id;
    const displayRole = (isCurrent && myRole ? myRole : isPartner ? trustedPartnerThief.role : p.role) as
      | GameRole
      | 'CHOR_OR_DAKAT'
      | undefined;
    const info =
      displayRole && displayRole !== 'CHOR_OR_DAKAT' ? ROLE_INFO[displayRole as GameRole] : null;

    const accentMap: Partial<Record<GameRole, string>> = {
      RAJA: 'bg-amber-400/[0.07] ring-amber-400/30',
      POLICE: 'bg-blue-500/[0.07] ring-blue-400/30',
      CHOR: 'bg-emerald-500/[0.06] ring-emerald-400/25',
      DAKAT: 'bg-rose-500/[0.06] ring-rose-400/25',
    };
    const accent = info
      ? accentMap[displayRole as GameRole] ?? 'bg-white/[0.03] ring-white/10'
      : 'bg-purple-500/[0.07] ring-purple-400/25'; // masked suspect

    const roleText = info ? info.color.split(' ')[1] : 'text-purple-300/80';
    const fx =
      displayRole === GameRole.POLICE
        ? 'police-siren-glow'
        : displayRole === GameRole.RAJA
        ? 'babu-gold-pulse'
        : '';

    return (
      <div
        key={p.id}
        className={`flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 ring-1 ${accent} ${fx}`}
      >
        <Identicon name={p.name} className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-black text-white">
            {p.name}
            {isCurrent && (
              <span className="ml-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">
                You
              </span>
            )}
          </span>
          <span className={`mt-0.5 block truncate text-[10px] font-bold uppercase tracking-[0.14em] ${roleText}`}>
            {info
              ? info.desc
              : 'Suspect · hidden until the arrest'}
          </span>
        </div>
        {/* Role chip */}
        <span
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ring-1 ${
            info
              ? `bg-white/[0.05] ring-white/10 ${roleText}`
              : 'bg-purple-500/15 text-purple-200 ring-purple-400/30'
          }`}
        >
          {info ? (
            <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0">{info.icon}</span>
          ) : (
            <span className="text-sm leading-none">🕵️</span>
          )}
          {info ? info.name : 'Hidden'}
        </span>
      </div>
    );
  };

  // Active selection (by Police, synced to ALL users: live human picks via
  // `game:police-selecting`, bot picks via the same event, plus the final
  // gameState.selectedPlayerId written when the arrest resolves).
  const activeSelectionId = isPolice ? selectedSuspectId : (gameState.selectedPlayerId ?? selectedSuspectId);
  const selectedSuspectPlayer = gameState.players.find((p) => p.id === activeSelectionId);

  const handleSuspectClick = (suspectId: string) => {
    if (!isPolice) return;
    setSelectedSuspectId(suspectId);
    if (onPoliceSelectSuspect) {
      onPoliceSelectSuspect(suspectId);
    }
  };

  // Clicking an unavailable slip just shakes it — no server call and no
  // error toast, the shake itself says "this one is already taken".
  const handlePaperClick = (paperId: string, canPick: boolean) => {
    if (canPick) {
      onPickPaper(paperId);
      return;
    }

    setShakingPaperId(paperId);
    setTimeout(() => {
      setShakingPaperId((current) => (current === paperId ? null : current));
    }, 600);
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

  /** Shared slip renderer — `variant` drives mobile vs desktop size/tilt. */
  const renderSlip = (
    paper: PublicGameState['papers'][number],
    idx: number,
    variant: 'mobile' | 'desktop',
  ) => {
    const theme = themeForIcon(paper.icon);
    const tilt = variant === 'mobile'
      ? SLIP_TILTS[idx % SLIP_TILTS.length]
      : idx % 2 === 0
      ? '-rotate-2'
      : 'rotate-2';
    const desktop = variant === 'desktop';
    const takenPlayer = gameState.players.find((p) => p.id === paper.selectedBy);
    const isTaken = Boolean(paper.selectedBy);
    const isMine = paper.selectedBy === currentUserId;
    const canClick = !me?.hasPicked && !isTaken;

    const box = desktop
      ? 'h-52 w-40 rounded-3xl'
      : 'h-full w-full rounded-2xl';

    return (
      <button
        key={paper.id}
        onClick={() => handlePaperClick(paper.id, canClick)}
        className={`group relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b ${theme.bg} ${tilt} ${
          desktop ? 'transition-all duration-300 hover:-translate-y-2 hover:rotate-0 hover:scale-105' : ''
        } ${box} ${
          shakingPaperId === paper.id ? 'paper-shake' : ''
        } ${
          isMine
            ? 'ring-2 ring-white/90'
            : isTaken
            ? 'saturate-[0.35] brightness-[0.65]'
            : me?.hasPicked
            ? 'saturate-[0.4] brightness-[0.7]'
            : `cursor-pointer border border-white/25 shadow-xl active:scale-95 ${theme.glow} hover:shadow-2xl`
        } ${!canClick && !desktop ? 'cursor-default' : ''}`}
        style={desktop ? undefined : { gridArea: undefined }}
      >
        {/* sheen */}
        <span className="pointer-events-none absolute -top-4 -left-4 h-12 w-12 rounded-full bg-white/50 blur-md" />
        <span
          className={`relative drop-shadow-md ${
            desktop ? 'text-6xl' : 'text-5xl'
          } ${isTaken ? '' : 'group-hover:scale-110 group-hover:-rotate-6 transition-transform'}`}
        >
          {paper.icon}
        </span>

        {isTaken ? (
          <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded-lg bg-black/50 px-1 py-1 backdrop-blur-sm">
            <Identicon
              name={(takenPlayer?.name ?? '?') as string}
              className="h-5 w-5 shrink-0"
            />
            <span className="w-full truncate text-left text-[11px] font-black uppercase tracking-wide text-white">
              {(takenPlayer?.name ?? 'Taken').slice(0, 10)}
              {isMine ? ' (You)' : ''}
            </span>
          </span>
        ) : me?.hasPicked ? (
          <span className="absolute inset-x-2 bottom-1.5 rounded-lg bg-black/25 py-1 text-[10px] font-black uppercase tracking-widest text-white/80">
            Taken
          </span>
        ) : (
          <span className="absolute inset-x-2 bottom-1.5 rounded-lg bg-black/30 py-1 text-[10px] font-black uppercase tracking-widest text-white/80 opacity-0 transition-opacity group-hover:opacity-100">
            Pick me
          </span>
        )}
      </button>
    );
  };

  // "Live Scores" card — shared by the desktop sidebar and the mobile drawer
  // so both stay perfectly in sync with one source of markup.
  const sidebarScores = (
    <div className="shrink-0 rounded-2xl bg-white/[0.04] p-3 ring-1 ring-white/10">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">
            Live Scores
          </span>
        </div>
        <button
          onClick={() => setShowScoreboard(true)}
          className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300"
        >
          Details
        </button>
      </div>
      <ul className="space-y-1">
        {[...gameState.players].sort((a, b) => b.score - a.score).map((p, i) => {
          const isMe = p.id === currentUserId;
          const isLeader = i === 0;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${
                isLeader ? 'bg-amber-400/10' : isMe ? 'bg-white/[0.05]' : ''
              }`}
            >
              <span
                className={`w-4 text-right font-mono text-[10px] font-bold ${
                  isLeader ? 'text-amber-400' : 'text-zinc-600'
                }`}
              >
                {i + 1}
              </span>
              <Avatar name={p.name} />
              <div className="min-w-0 flex-1 leading-tight">
                <span
                  className={`block truncate text-xs font-bold ${
                    isLeader ? 'text-amber-200' : isMe ? 'text-white' : 'text-zinc-300'
                  }`}
                >
                  {p.name}
                  {isMe && ' (You)'}
                </span>
                <span className="block truncate text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                  {p.role
                    ? p.role === 'CHOR_OR_DAKAT'
                      ? 'Suspect'
                      : ROLE_INFO[p.role as GameRole]?.name ?? p.role
                    : '—'}
                </span>
              </div>
              <span
                className={`font-mono text-xs font-black ${
                  isLeader ? 'text-amber-400' : 'text-zinc-100'
                }`}
              >
                {p.score}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );

  /* ── Shared docks (rendered inside each phase, mobile + desktop) ──────── */

  const babuDock = (
    isRaja ? (
      <div className="rounded-3xl bg-white/[0.04] p-3.5 ring-1 ring-amber-400/30 md:p-4">
        <div className="flex items-center justify-center gap-2 pb-2.5">
          <Crown className="h-4 w-4 text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
            Your command
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onSelectTarget(GameRole.CHOR)}
            className="flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-emerald-400 to-emerald-600 text-xs font-black uppercase tracking-wider text-emerald-50 shadow-lg shadow-emerald-950/40 transition-all active:scale-95"
          >
            Catch Chor
            <span className="font-mono text-[10px] opacity-70">·500</span>
          </button>
          <button
            onClick={() => onSelectTarget(GameRole.DAKAT)}
            className="flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-rose-400 to-rose-600 text-xs font-black uppercase tracking-wider text-rose-50 shadow-lg shadow-rose-950/40 transition-all active:scale-95"
          >
            Catch Dakat
            <span className="font-mono text-[10px] opacity-70">·400</span>
          </button>
        </div>
      </div>
    ) : (
      <div className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white/[0.04] px-4 ring-1 ring-amber-400/25">
        <Crown className="h-5 w-5 shrink-0 animate-bounce text-amber-400" />
        <span className="min-w-0 text-left text-xs leading-tight text-zinc-300">
          <span className="block text-[11px] font-black uppercase tracking-wider text-amber-300">
            Babu is deciding
            <DecidingDots />
          </span>
          <span className="block truncate text-[11px] text-zinc-500">
            {rajaPlayer
              ? `${rajaPlayer.name} picks whom the Police must catch…`
              : 'Waiting for the target…'}
          </span>
        </span>
      </div>
    )
  );

  const arrestDock = (
    isPolice ? (
      <button
        disabled={!selectedSuspectId}
        onClick={() => selectedSuspectId && onGuessPlayer(selectedSuspectId)}
        className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-blue-400 to-blue-600 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_-8px_rgba(59,130,246,0.55)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none md:h-16 md:text-base"
      >
        Confirm arrest · {gameState.targetRole}
      </button>
    ) : selectedSuspectPlayer ? (
      // A pick is live (bot Police or a human Police's choice): the whole
      // room now sees the same Confirm-arrest dock the Police sees. With a
      // bot pick it plays a visible press right as the arrest resolves.
      <button
        disabled
        aria-live="polite"
        className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-blue-400 to-blue-600 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_30px_-8px_rgba(59,130,246,0.55)] transition-all md:h-16 md:text-base ${
          policePressing ? 'police-confirm-press' : 'opacity-90'
        }`}
      >
        Confirm arrest · {gameState.targetRole}
      </button>
    ) : (
      <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] text-[11px] font-bold text-zinc-400 ring-1 ring-white/10">
        <Shield className="h-4 w-4 animate-pulse text-blue-400" />
        Police is investigating
        <DecidingDots />
      </div>
    )
  );

  const suspectCard = (p: PublicGameState['players'][number], big: boolean) => {
    const isMe = p.id === currentUserId;
    const isSelected = activeSelectionId === p.id;
    const canSelect = isPolice && !isMe;
    const isTargeted = activeSelectionId === p.id && !isPolice;

    return (
      <button
        key={p.id}
        disabled={!canSelect}
        onClick={() => handleSuspectClick(p.id)}
        className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-3xl p-3 transition-all ${
          big ? 'h-72 w-60' : 'aspect-[3/4] w-full'
        } ${
          isSelected || isTargeted
            ? 'scale-[1.03] bg-blue-500/15 ring-2 ring-blue-400 shadow-[0_0_50px_-10px_rgba(59,130,246,0.6)]'
            : canSelect
            ? 'bg-white/[0.04] ring-1 ring-purple-400/30 cursor-pointer shadow-lg hover:bg-white/[0.07] active:scale-95'
            : 'bg-white/[0.02] opacity-70 ring-1 ring-white/5'
        }`}
      >
        <span
          className={`text-[9px] font-black uppercase tracking-[0.24em] ${
            isSelected || isTargeted ? 'text-blue-300' : 'text-purple-300/80'
          }`}
        >
          Suspect
        </span>
        <Identicon name={p.name} circle={false} className={big ? 'h-24 w-24' : 'h-16 w-16'} />
        <span className="max-w-full truncate px-1 text-sm font-black text-white">
          {p.name}
        </span>
        {isMe && (
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">
            (You)
          </span>
        )}

        {(isSelected || isTargeted) && (
          <span className="absolute inset-x-3 bottom-2.5 flex items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-blue-400 to-blue-500 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-950">
            <UserCheck className="h-3 w-3" />
            {isPolice ? 'Selected' : isTargeted ? 'Police targets' : 'Targeted'}
          </span>
        )}
      </button>
    );
  };

  const pickDockBlock = (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="rounded-full bg-white/[0.04] px-3 py-1.5 text-center ring-1 ring-white/10">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ring-1 ${
          gameState.targetRole === GameRole.DAKAT
            ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
            : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
        }`}>
          <Shield className="h-3.5 w-3.5" />
          Catch the {gameState.targetRole}
        </span>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-[#0a0616] font-sans text-white md:h-screen">
      {/* Colorful mesh backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute -bottom-40 right-1/4 h-96 w-96 rounded-full bg-amber-500/12 blur-[130px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      {/* ─── Top app bar ─────────────────────────────────────────────────── */}
      <header className="relative z-20 flex shrink-0 items-center gap-1.5 border-b border-white/[0.06] bg-[#0a0616]/80 px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))] pl-[calc(2.9rem+env(safe-area-inset-left))] backdrop-blur-md md:pl-4">
        <span className="shrink-0 rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300 ring-1 ring-amber-400/30">
          R{gameState.roundNumber}
          {gameState.settings?.maxRounds ? (
            <span className="text-amber-400/50">/{gameState.settings.maxRounds}</span>
          ) : null}
        </span>
        <span className="hidden font-mono text-[11px] font-bold text-zinc-500 sm:inline">
          #{gameState.roomCode}
        </span>

        <div className="flex-1" />

        {timeLeft !== undefined && (
          <div
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-black ring-1 ${
              timeLeft <= 10
                ? 'bg-rose-500/15 text-rose-300 ring-rose-500/40'
                : 'bg-white/[0.05] text-amber-300 ring-white/10'
            }`}
          >
            <Clock className="h-3.5 w-3.5 animate-pulse" />
            <span className="tabular-nums">{timeLeft}s</span>
          </div>
        )}

        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          title="Scores, chat & room actions"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1] lg:hidden"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        {/* Desktop quick actions — on mobile they live in the drawer */}
        {isHost && gameState.phase !== GamePhase.GAME_OVER && onFinishGame && (
          <button
            onClick={onFinishGame}
            className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 transition-colors hover:bg-rose-500/20 lg:flex"
            title="Finish Match Now"
          >
            End Match
          </button>
        )}
        <button
          onClick={() => setShowScoreboard(true)}
          className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-amber-400/10 px-3 py-1.5 text-xs font-bold text-amber-300 ring-1 ring-amber-400/30 transition-colors hover:bg-amber-400/20 lg:flex"
        >
          <Trophy className="h-3.5 w-3.5" />
          Scores
        </button>
        {onLeaveGame && (
          <button
            onClick={onLeaveGame}
            className="hidden shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 transition-colors hover:bg-rose-500/20 lg:flex"
            title="Leave Game"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave
          </button>
        )}
      </header>

      {/* ─── Phase content ───────────────────────────────────────────────── */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        {/* ══ PHASE 1: PICKING ═══════════════════════════════════════════ */}
        {gameState.phase === GamePhase.PICKING && (
          <>
            {/* MOBILE: compact app-shell grid */}
            <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 animate-in flex-col fade-in md:hidden">
              <div className="shrink-0 px-4 pb-3 pt-3.5 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  Round {gameState.roundNumber}
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
                  {me?.hasPicked ? <>Slip secured 🔒</> : <>Pick a slip</>}
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  {me?.hasPicked
                    ? 'Nice. Waiting for the rest of the table…'
                    : 'Each slip keeps its icon all round — tap to claim your secret role.'}
                </p>

                {/* Live picking progress */}
                {(() => {
                  const pickedCount = gameState.players.filter((p) => p.hasPicked).length;
                  const total = Math.max(1, gameState.players.length);
                  const pct = Math.round((pickedCount / total) * 100);
                  return (
                    <div className="mx-auto mt-3 flex w-full max-w-56 items-center gap-2">
                      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-[10px] font-black tabular-nums text-zinc-400">
                        {pickedCount}/{total}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
                <div className="grid grid-cols-3 auto-rows-[7.25rem] content-start gap-3">
                  {gameState.papers.map((paper, idx) => renderSlip(paper, idx, 'mobile'))}
                </div>
              </div>
            </section>

            {/* DESKTOP: big fanned table-spread */}
            <section className="hidden min-h-0 w-full flex-1 animate-in flex-col items-center fade-in md:flex">
              <div className="shrink-0 pt-6 text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-300/80">
                  Round {gameState.roundNumber}
                </p>
                <h1 className="mt-1 text-4xl font-black tracking-tight text-white">
                  {me?.hasPicked ? 'Slip secured 🔒' : 'Take your slip from the table'}
                </h1>
                <p className="mt-2 text-sm text-zinc-400">
                  Every slip keeps its icon for the whole round — pick one and the room sees it.
                </p>
              </div>
              <div className="flex min-h-0 flex-1 items-center justify-center px-10 pb-2">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {gameState.papers.map((paper, idx) => renderSlip(paper, idx, 'desktop'))}
                </div>
              </div>
              {/* Live strip */}
              <div className="shrink-0 pb-5">
                <div className="flex items-center gap-3 rounded-full bg-white/[0.04] px-5 py-2.5 ring-1 ring-white/10">
                  <Target className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-300">
                    {gameState.players.filter((p) => p.hasPicked).length} of {gameState.players.length} slipped in
                  </span>
                  <span className="flex -space-x-2">
                    {gameState.players.filter((p) => p.hasPicked).map((p) => (
                      <Identicon key={p.id} name={p.name} className="h-5 w-5 ring-2 ring-[#0a0616]" />
                    ))}
                  </span>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ══ PHASE 2: ROLE REVEAL ═══════════════════════════════════════ */}
        {gameState.phase === GamePhase.ROLE_REVEAL && (
          <>
            {/* MOBILE: stacked */}
            <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 animate-in flex-col fade-in md:hidden">
              <div className="shrink-0 px-4 pt-3.5">
                <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.3em] text-amber-400/80">
                  Your secret role
                </p>
                {gameState.players
                  .filter((p) => p.id === currentUserId)
                  .map((p) => renderRevealCard(p, true))}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600">
                  The table
                </span>
                <div className="space-y-2 pb-2">
                  {buildRevealRows(gameState.players, currentUserId)
                    .filter((p) => p.id !== currentUserId)
                    .map((p) => (
                      <div key={p.id}>{renderRevealCard(p, false)}</div>
                    ))}
                </div>
              </div>
              <div className="shrink-0 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {babuDock}
              </div>
            </section>

            {/* DESKTOP: two-column reveal stage */}
            <section className="hidden min-h-0 w-full flex-1 animate-in flex-col items-center gap-4 px-10 pb-5 pt-4 fade-in md:flex">
              {/* Stage header */}
              <div className="flex w-full max-w-5xl shrink-0 items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-fuchsia-300/80">
                    Round {gameState.roundNumber} · Roles are open
                  </p>
                  <h2 className="mt-1 text-2xl font-black tracking-tight text-white">
                    Know your part, play it well
                  </h2>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-purple-300 ring-1 ring-purple-500/30">
                  🕵️ Suspects stay masked until the arrest
                </span>
              </div>

              {/* Two columns */}
              <div className="grid min-h-0 w-full max-w-5xl flex-1 grid-cols-[minmax(300px,0.9fr)_1.1fr] gap-6 overflow-hidden">
                {/* Left: your role + command */}
                <div className="flex min-h-0 flex-col gap-4">
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/80">
                    Your secret role
                  </span>
                  <div className="shrink-0">
                    {gameState.players
                      .filter((p) => p.id === currentUserId)
                      .map((p) => renderRevealCard(p, true))}
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <p className="pt-1 text-xs leading-relaxed text-zinc-500">
                      {isRaja
                        ? 'As the Babu you decide which thief the Police must hunt — your call decides the round.'
                        : isPolice
                        ? 'When the Babu speaks, the stage turns to you: one of the two suspects hides your target.'
                        : 'Your slip is locked in. Innocents watch the hunt unfold from the seats below.'}
                    </p>
                  </div>
                  <div className="shrink-0">{babuDock}</div>
                </div>

                {/* Right: the table */}
                <div className="flex min-h-0 flex-col overflow-hidden rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/[0.07]">
                  <span className="mb-3 flex shrink-0 items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                      The table
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
                      {gameState.players.length} players
                    </span>
                  </span>
                  <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-2">
                    {buildRevealRows(gameState.players, currentUserId)
                      .filter((p) => p.id !== currentUserId)
                      .map((p) => renderRevealRow(p))}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ══ PHASE 3: GUESSING ══════════════════════════════════════════ */}
        {gameState.phase === GamePhase.GUESSING && (
          <>
            {/* MOBILE */}
            <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 animate-in flex-col fade-in md:hidden">
              <div className="shrink-0 px-4 pb-2 pt-3.5 text-center">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ring-1 ${
                    gameState.targetRole === GameRole.DAKAT
                      ? 'bg-rose-500/10 text-rose-300 ring-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30'
                  }`}
                >
                  <Shield className="h-3.5 w-3.5" />
                  Catch the {gameState.targetRole}
                </span>
                <h1 className="mt-2 text-xl font-black tracking-tight text-white">
                  {isPolice ? (
                    <>Which one is the {gameState.targetRole}?</>
                  ) : (
                    <>It's the Police's move</>
                  )}
                </h1>
                {!isPolice && (
                  <p className="mt-1 text-xs text-zinc-400">
                    {policePlayer
                      ? `${policePlayer.name} is trying to catch the ${gameState.targetRole}…`
                      : 'The Police is investigating…'}
                  </p>
                )}
              </div>

              {/* Selected-for-arrest chip */}
              {selectedSuspectPlayer && (
                <div className="shrink-0 px-4 pb-1">
                  <div
                    className={`mx-auto inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ring-1 animate-pulse ${
                      isPolice
                        ? 'bg-blue-500/15 text-blue-200 ring-blue-500/40'
                        : 'bg-blue-500/10 text-blue-300 ring-blue-500/30'
                    }`}
                  >
                    🎯
                    <span className="truncate">
                      {isPolice
                        ? `You selected ${selectedSuspectPlayer.name}`
                        : `Police is targeting ${selectedSuspectPlayer.name}`}
                    </span>
                  </div>
                </div>
              )}

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
                  {suspects.map((p) => suspectCard(p, false))}
                </div>
              </div>

              <div className="shrink-0 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {arrestDock}
              </div>
            </section>

            {/* DESKTOP: spotlight stage */}
            <section className="hidden min-h-0 w-full flex-1 animate-in flex-col items-center fade-in md:flex">
              <div className="shrink-0 pt-6 text-center">
                {pickDockBlock}
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
                  {isPolice
                    ? `Sgt. ${policePlayer?.name ?? 'You'} — point at the ${gameState.targetRole}`
                    : `${policePlayer?.name ?? 'The Police'} is about to make the arrest`}
                </h1>
                <p className="mt-1.5 text-sm text-zinc-400">
                  {isPolice
                    ? 'Click the suspect you believe holds the role. Everyone sees your pick live.'
                    : "Watch closely — the Police's target lights up for the whole room."}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center gap-6 pb-4">
                {suspects.map((p) => suspectCard(p, true))}
              </div>

              {selectedSuspectPlayer && (
                <div className="shrink-0 pb-4">
                  <div
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ring-1 animate-pulse ${
                      isPolice
                        ? 'bg-blue-500/20 text-blue-200 ring-blue-500/40'
                        : 'bg-blue-500/15 text-blue-300 ring-blue-500/30'
                    }`}
                  >
                    🎯
                    {isPolice
                      ? `You selected ${selectedSuspectPlayer.name}`
                      : `Police is targeting ${selectedSuspectPlayer.name}`}
                  </div>
                </div>
              )}

              <div className="w-full max-w-sm shrink-0 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {arrestDock}
              </div>
            </section>
          </>
        )}

        {/* ══ PHASE 4: ROUND RESULT / GAME OVER ══════════════════════════ */}
        {(gameState.phase === GamePhase.ROUND_RESULT || gameState.phase === GamePhase.GAME_OVER) && (
          <>
            {/* MOBILE: rows */}
            <section className="mx-auto flex min-h-0 w-full max-w-md flex-1 animate-in flex-col zoom-in-95 md:hidden">
              <div className="shrink-0 px-4 pb-2 pt-3.5 text-center">
                {gameState.phase === GamePhase.GAME_OVER ? (
                  <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 ring-1 ring-amber-400/40">
                    <Award className="h-6 w-6 animate-bounce text-amber-400" />
                  </div>
                ) : (
                  <div className="mx-auto mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/10">
                    <span className="text-xl">🏁</span>
                  </div>
                )}
                <h1 className="text-2xl font-black tracking-tight text-white">
                  {gameState.phase === GamePhase.GAME_OVER
                    ? 'Match finished!'
                    : 'Round completed!'}
                </h1>
                {gameState.winnerPlayerId && (
                  <p className="mt-1 text-xs font-bold text-amber-300">
                    {gameState.players.find((p) => p.id === gameState.winnerPlayerId)?.name} took the round 👑
                  </p>
                )}

                {/* Whom the Police arrested — stays visible for the whole
                    result screen so nobody is left guessing. */}
                {(() => {
                  const arrested = gameState.players.find((p) => p.id === gameState.selectedPlayerId);
                  if (!arrested) return null;
                  const police = gameState.players.find((p) => p.role === GameRole.POLICE);
                  const caught = !!arrested.role && gameState.targetRole === arrested.role;
                  return (
                    <div className="mx-auto mt-2.5 flex w-[92%] items-center justify-center gap-2 rounded-2xl bg-blue-500/10 px-3 py-2 ring-1 ring-blue-500/30">
                      <span className="shrink-0 text-base">🎯</span>
                      <span className="truncate text-[11px] font-bold text-blue-200">
                        {police?.name ?? 'Police'} arrested{' '}
                        <span className="font-black text-white">{arrested.name}</span>
                        {' · '}
                        {caught ? 'the ' + arrested.role + ' — caught!' : 'wrong suspect — missed!'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-2 pb-2">
                  {[...gameState.players]
                    .sort((a, b) => b.score - a.score)
                    .map((p, idx) => {
                      const isWinner = gameState.winnerPlayerId === p.id;
                      const isMe = p.id === currentUserId;
                      return (
                        <div
                          key={p.id}
                          className={`flex h-14 items-center gap-3 rounded-2xl px-3 ring-1 ${
                            isWinner
                              ? 'bg-amber-400/[0.1] ring-amber-400/40'
                              : isMe
                              ? 'bg-white/[0.05] ring-white/15'
                              : 'bg-white/[0.03] ring-white/5'
                          }`}
                        >
                          <span className="w-6 shrink-0 text-center text-sm font-black">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (
                              <span className="font-mono text-[11px] text-zinc-600">{idx + 1}</span>
                            )}
                          </span>
                          <Avatar name={p.name} />
                          <div className="min-w-0 flex-1 leading-tight">
                            <span className={`block truncate text-sm font-bold ${isWinner ? 'text-amber-200' : 'text-white'}`}>
                              {p.name}
                              {isMe && (
                                <span className="ml-1 text-[9px] font-black uppercase tracking-wider text-amber-400">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                              {p.role
                                ? p.role === 'CHOR_OR_DAKAT'
                                  ? 'Suspect'
                                  : ROLE_INFO[p.role as GameRole]?.name || p.role
                                : '—'}
                            </span>
                          </div>
                          <div className="shrink-0 text-right leading-tight">
                            <span className="block font-mono text-sm font-black text-white">
                              {p.score}
                              <span className="ml-1 text-[9px] font-bold text-zinc-500">pts</span>
                            </span>
                            {p.roundScore > 0 && (
                              <span className="block text-[9px] font-black text-emerald-400">
                                +{p.roundScore} this round
                              </span>
                            )}
                            {p.roundScore < 0 && (
                              <span className="block text-[9px] font-black text-rose-400">
                                {p.roundScore} this round
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 px-4 pt-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                {isHost && gameState.phase === GamePhase.GAME_OVER && onBackToLobby && (
                  <button
                    onClick={onBackToLobby}
                    className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)] transition-all active:scale-[0.98]"
                  >
                    <Home className="h-5 w-5" />
                    Back to lobby
                  </button>
                )}
                {isHost && gameState.phase === GamePhase.ROUND_RESULT && (
                  <button
                    onClick={onNextRound}
                    className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-sm font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)] transition-all active:scale-[0.98]"
                  >
                    Next round
                    <ArrowRight className="h-5 w-5" />
                  </button>
                )}
                {isHost && gameState.phase === GamePhase.ROUND_RESULT && onFinishGame && (
                  <button
                    onClick={onFinishGame}
                    className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-500/10 text-xs font-black uppercase tracking-[0.14em] text-rose-300 ring-1 ring-rose-500/30 transition-colors hover:bg-rose-500/20 active:scale-[0.99]"
                  >
                    End match & crown the winner
                  </button>
                )}
                {!isHost && (
                  <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] text-[11px] font-bold text-zinc-400 ring-1 ring-white/10">
                    <Clock className="h-4 w-4 animate-pulse text-amber-400" />
                    Waiting for the host…
                  </div>
                )}
              </div>
            </section>

            {/* DESKTOP: podium + full standings */}
            <section className="mx-auto hidden min-h-0 w-full max-w-4xl flex-1 flex-col animate-in zoom-in-95 px-8 pb-5 pt-5 md:flex">
              <div className="shrink-0 text-center">
                <h1 className="text-3xl font-black tracking-tight text-white">
                  {gameState.phase === GamePhase.GAME_OVER ? '🏆 Match finished!' : '🏁 Round completed!'}
                </h1>

                {/* Whom the Police arrested — stays visible for the whole
                    result screen so nobody is left guessing. */}
                {(() => {
                  const arrested = gameState.players.find((p) => p.id === gameState.selectedPlayerId);
                  if (!arrested) return null;
                  const police = gameState.players.find((p) => p.role === GameRole.POLICE);
                  const caught = !!arrested.role && gameState.targetRole === arrested.role;
                  return (
                    <div className="mx-auto mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-200 ring-1 ring-blue-500/30">
                      🎯
                      <span className="truncate">
                        {police?.name ?? 'Police'} arrested{' '}
                        <span className="font-black text-white">{arrested.name}</span>
                        {' · '}
                        {caught ? 'the ' + arrested.role + ' — caught!' : 'wrong suspect — missed!'}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Podium */}
              <div className="flex min-h-0 flex-1 items-center justify-center">
                {(() => {
                  const rankedTop = [...gameState.players].sort((a, b) => b.score - a.score).slice(0, 3);
                  const heights = ['h-40', 'h-28', 'h-32'];
                  const order = [1, 0, 2];
                  return (
                    <div className="flex items-end gap-4">
                      {order.map((rankIdx) => {
                        const p = rankedTop[rankIdx];
                        if (!p) return null;
                        const isWinner = gameState.winnerPlayerId === p.id;
                        const isMe = p.id === currentUserId;
                        const medal = rankIdx === 0 ? '🥇' : rankIdx === 1 ? '🥈' : '🥉';
                        return (
                          <div key={p.id} className="flex flex-col items-center gap-2">
                            <div
                              className={`flex flex-col items-center gap-1.5 rounded-2xl px-5 py-3 ring-1 ${
                                isWinner
                                  ? 'bg-amber-400/[0.12] ring-amber-400/50 shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]'
                                  : isMe
                                  ? 'bg-white/[0.06] ring-white/20'
                                  : 'bg-white/[0.03] ring-white/10'
                              }`}
                              style={{ minWidth: 128 }}
                            >
                              {medal}
                              <Identicon name={p.name} circle={false} className="h-12 w-12" />
                              <span className="max-w-[9rem] truncate text-sm font-black text-white">
                                {p.name}{isMe && ' (You)'}
                              </span>
                              <span className="font-mono text-lg font-black text-amber-300">
                                {p.score}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                                {p.role === 'CHOR_OR_DAKAT' ? 'Suspect' : p.role ? ROLE_INFO[p.role as GameRole]?.name : '—'}
                              </span>
                            </div>
                            <div className={`w-24 rounded-b-xl bg-gradient-to-b to-transparent ${heights[rankIdx]} ${
                              rankIdx === 0 ? 'from-amber-400/40' : rankIdx === 1 ? 'from-zinc-400/25' : 'from-rose-400/25'
                            }`} />
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Full standings */}
              <div className="mx-auto w-full max-w-xl shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  {[...gameState.players]
                    .sort((a, b) => b.score - a.score)
                    .slice(3)
                    .map((p, idx) => {
                      const isMe = p.id === currentUserId;
                      return (
                        <div
                          key={p.id}
                          className={`flex h-11 items-center gap-2.5 rounded-xl px-3 ring-1 ${
                            isMe ? 'bg-white/[0.05] ring-white/15' : 'bg-white/[0.02] ring-white/5'
                          }`}
                        >
                          <span className="w-5 text-center font-mono text-[11px] text-zinc-600">{idx + 4}</span>
                          <Avatar name={p.name} />
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-200">
                            {p.name}{isMe && ' (You)'}
                          </span>
                          <span className="font-mono text-xs font-black text-zinc-100">{p.score}</span>
                          <span
                            className={`font-mono text-[10px] font-black ${
                              p.roundScore > 0 ? 'text-emerald-400' : p.roundScore < 0 ? 'text-rose-400' : 'text-zinc-600'
                            }`}
                          >
                            {p.roundScore > 0 ? `+${p.roundScore}` : p.roundScore}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Desktop dock */}
              <div className="mx-auto w-full max-w-sm shrink-0 pt-3">
                {isHost && gameState.phase === GamePhase.ROUND_RESULT ? (
                  <button
                    onClick={onNextRound}
                    className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-base font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)] transition-all active:scale-[0.98]"
                  >
                    Next round
                    <ArrowRight className="h-5 w-5" />
                  </button>
                ) : isHost && gameState.phase === GamePhase.GAME_OVER && onBackToLobby ? (
                  <button
                    onClick={onBackToLobby}
                    className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-base font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)] transition-all active:scale-[0.98]"
                  >
                    <Home className="h-5 w-5" />
                    Back to lobby
                  </button>
                ) : !isHost ? (
                  <div className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] text-xs font-bold text-zinc-400 ring-1 ring-white/10">
                    <Clock className="h-4 w-4 animate-pulse text-amber-400" />
                    Waiting for the host…
                  </div>
                ) : null}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Desktop-only sidebar: live leaderboard + always-visible chat. */}
      <div className="absolute right-6 bottom-6 top-[calc(4.25rem+env(safe-area-inset-top))] z-10 hidden w-80 flex-col gap-3 lg:flex">
        {sidebarScores}
        <Chat inline currentUserId={currentUserId} />
      </div>

      {/* Android-like navigation drawer (mobile only). */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-in fade-in lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-[86vw] animate-in flex-col bg-[#0b0b13] shadow-2xl ring-1 ring-white/10 slide-in-from-right-10 lg:hidden">
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="truncate font-mono text-[11px] font-black uppercase tracking-[0.2em] text-zinc-300">
                Room #{gameState.roomCode}
              </span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
              {sidebarScores}
              <Chat inline currentUserId={currentUserId} />
            </div>

            <div className="shrink-0 space-y-2 border-t border-white/[0.06] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  setShowScoreboard(true);
                }}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white/[0.05] py-2.5 text-xs font-bold text-zinc-200 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1]"
              >
                <Trophy className="h-3.5 w-3.5" />
                Scoreboard details
              </button>
              {isHost && gameState.phase !== GamePhase.GAME_OVER && onFinishGame && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onFinishGame();
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 transition-colors hover:bg-rose-500/20"
                >
                  End match now
                </button>
              )}
              {onLeaveGame && (
                <button
                  onClick={() => {
                    setDrawerOpen(false);
                    onLeaveGame();
                  }}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-rose-500/10 py-2.5 text-xs font-bold text-rose-300 ring-1 ring-rose-500/30 transition-colors hover:bg-rose-500/20"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave room
                </button>
              )}
            </div>
          </div>
        </>
      )}

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
