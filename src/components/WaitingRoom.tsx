import React from 'react';
import { RoomPlayer, GameSettings } from '../types';
import { Crown, Users, Play, Copy, Check, ShieldAlert, LogOut, KeyRound, UserX, Bot, Dices } from 'lucide-react';
import { Identicon } from './Identicon';

interface WaitingRoomProps {
  roomCode: string;
  playerName?: string;
  seatPin?: string;
  players: RoomPlayer[];
  currentUserId: string;
  isHost: boolean;
  onStartGame: (settings?: GameSettings) => void;
  onLeaveRoom: () => void;
  onKickPlayer?: (playerId: string) => void;
  onAddBot?: (name?: string) => void;
}

// Fun default names the host can roll with the dice button.
const BOT_NAME_SUGGESTIONS = [
  'Bot Ninja',
  'Bot Rani',
  'Bot Guru',
  'Bot Chiku',
  'Bot Simba',
  'Bot Cobra',
  'Bot Pilot',
  'Bot Dada',
];

/* ── Shared pieces ─────────────────────────────────────────────────────── */

const Seat: React.FC<{
  name: string;
  isMe: boolean;
  isHostSeat?: boolean;
  isBot?: boolean;
  isConnected?: boolean;
  canKick?: boolean;
  onKick?: () => void;
}> = ({ name, isMe, isHostSeat, isBot, isConnected, canKick, onKick }) => (
  <div
    className={`relative flex items-center gap-2.5 rounded-2xl p-2.5 ring-1 transition-all ${
      isMe
        ? 'bg-amber-400/[0.08] ring-amber-400/40'
        : 'bg-white/[0.04] ring-white/10'
    }`}
  >
    <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
      <Identicon name={name} className="h-9 w-9" />
      {isConnected !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-[#0a0616] ${
            isConnected ? 'bg-emerald-400' : 'bg-rose-500'
          }`}
        />
      )}
    </div>
    <div className="min-w-0 flex-1 leading-tight">
      <span
        className={`block truncate text-sm font-bold ${isMe ? 'text-amber-200' : 'text-zinc-100'}`}
      >
        {name}
        {isMe && <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-amber-400">(You)</span>}
      </span>
      <span className="flex items-center gap-1 pt-0.5 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">
        {isHostSeat && <><Crown className="h-2.5 w-2.5 text-amber-400" /> Host</>}
        {isHostSeat && isBot && '·'}
        {isBot && <><Bot className="h-2.5 w-2.5 text-cyan-400" /> Bot</>}
        {!isHostSeat && !isBot && 'Ready'}
      </span>
    </div>
    {canKick && (
      <button
        type="button"
        onClick={onKick}
        title="Free this seat"
        aria-label="Free this seat"
        className="absolute -right-1.5 -top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-[#1a0f24] text-rose-400 ring-1 ring-rose-500/40 transition-colors hover:bg-rose-500/25"
      >
        <UserX className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

const EmptySeat: React.FC<{ index: number }> = ({ index }) => (
  <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-white/10 p-2.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.03] text-zinc-700 ring-1 ring-white/5">
      <Users className="h-4 w-4" />
    </div>
    <span className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-700">
      Seat {index}
    </span>
  </div>
);

const ActionDock = ({
  canStart,
  neededPlayers,
  maxRounds,
  onStartGame,
  isHost,
}: {
  canStart: boolean;
  neededPlayers: number;
  maxRounds: number;
  onStartGame: () => void;
  isHost: boolean;
}) =>
  isHost ? (
    <button
      onClick={onStartGame}
      disabled={!canStart}
      className="flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-amber-400 to-amber-500 text-[15px] font-black uppercase tracking-[0.12em] text-zinc-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:shadow-none md:h-16 md:text-base"
    >
      <Play className="h-5 w-5 fill-current" />
      {canStart ? `Start · ${maxRounds} rounds` : `Waiting for ${neededPlayers} more`}
    </button>
  ) : (
    <div className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white/[0.04] text-[13px] font-bold text-zinc-400 ring-1 ring-white/10">
      <ShieldAlert className="h-4 w-4 animate-spin text-amber-400" />
      Waiting for the host…
    </div>
  );

/* ── Component ─────────────────────────────────────────────────────────── */

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  roomCode,
  playerName,
  seatPin,
  players,
  currentUserId,
  isHost,
  onStartGame,
  onLeaveRoom,
  onKickPlayer,
  onAddBot,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [maxRounds, setMaxRounds] = React.useState<number>(5);
  const [botName, setBotName] = React.useState('');

  const canStart = players.length >= 4 && players.length <= 8 && isHost;
  const neededPlayers = Math.max(0, 4 - players.length);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const seatsBlock = (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">
          <Users className="h-3.5 w-3.5 text-amber-400" />
          Players
          <span className="font-mono tracking-normal text-zinc-200">{players.length}</span>
          <span className="font-mono tracking-normal text-zinc-600">/8</span>
        </span>
        {neededPlayers > 0 && (
          <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-300 ring-1 ring-amber-400/25">
            Need {neededPlayers} more
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 md:gap-2.5">
        {players.map((p) => (
          <Seat
            key={p.id}
            name={p.name}
            isMe={p.id === currentUserId}
            isHostSeat={p.isHost}
            isBot={p.isBot}
            isConnected={p.isConnected}
            canKick={isHost && p.id !== currentUserId && !!onKickPlayer}
            onKick={() => onKickPlayer?.(p.id)}
          />
        ))}
        {Array.from({ length: Math.min(Math.max(neededPlayers, 0), Math.max(0, 4 - players.length)) }).map((_, i) => (
          <EmptySeat key={`empty-${i}`} index={players.length + i + 1} />
        ))}
      </div>
    </div>
  );

  const pinChip = seatPin && (
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/10 md:p-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
        <KeyRound className="h-3.5 w-3.5" />
      </span>
      <p className="min-w-0 text-[11px] leading-snug text-zinc-400">
        <span className="font-mono text-sm font-black tracking-[0.2em] text-cyan-300">
          {seatPin}
        </span>
        <span className="mx-1.5 font-bold text-zinc-500">·</span>
        Your rejoin PIN. Lobby → <b className="text-zinc-300">Rejoin</b> with
        the same name within 2 minutes.
      </p>
    </div>
  );

  const botAdder = isHost && onAddBot && players.length < 8 && (
    <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10 md:p-4">
      <span className="block text-[9px] font-black uppercase tracking-[0.26em] text-zinc-500">
        Add a bot
      </span>
      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          onAddBot(botName.trim() || undefined);
          setBotName('');
        }}
      >
        <input
          type="text"
          value={botName}
          onChange={(e) => setBotName(e.target.value)}
          placeholder="Bot name (optional)"
          maxLength={20}
          className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-white outline-none transition-all placeholder:font-normal placeholder:text-zinc-600 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
        />
        <button
          type="button"
          onClick={() => {
            const taken = new Set(players.map((p) => p.name.toLowerCase()));
            const options = BOT_NAME_SUGGESTIONS.filter(
              (name) => !taken.has(name.toLowerCase()),
            );
            const pool = options.length > 0 ? options : BOT_NAME_SUGGESTIONS;
            setBotName(pool[Math.floor(Math.random() * pool.length)]);
          }}
          title="Suggest a bot name"
          aria-label="Suggest a bot name"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
        >
          <Dices className="h-4 w-4" />
        </button>
        <button
          type="submit"
          className="flex h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-cyan-400/15 px-3.5 text-sm font-bold text-cyan-300 ring-1 ring-cyan-400/30 transition-colors hover:bg-cyan-400/25 active:scale-95"
        >
          <Bot className="h-4 w-4" />
          Add
        </button>
      </form>
      <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">
        Bots pick slips, play turns and react on their own — start without waiting.
      </p>
    </div>
  );

  const roundsPicker = isHost && (
    <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-white/10 md:p-4">
      <span className="block text-[9px] font-black uppercase tracking-[0.26em] text-zinc-500">
        Match length
      </span>
      <div className="mt-2.5 flex items-center gap-1.5">
        {[3, 5, 10].map((rounds) => (
          <button
            key={rounds}
            type="button"
            onClick={() => setMaxRounds(rounds)}
            className={`h-10 flex-1 cursor-pointer rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
              maxRounds === rounds
                ? 'bg-amber-400 text-zinc-950 shadow-[0_4px_16px_-2px_rgba(245,158,11,0.5)]'
                : 'bg-white/[0.05] text-zinc-400 ring-1 ring-white/10 hover:text-white'
            }`}
          >
            {rounds} rd
          </button>
        ))}
        <div className="flex h-10 w-[4.5rem] shrink-0 items-center gap-1 rounded-xl bg-white/[0.05] px-1.5 ring-1 ring-white/10">
          <input
            type="number"
            min={1}
            max={50}
            value={maxRounds}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val > 0 && val <= 50) setMaxRounds(val);
            }}
            className="w-full bg-transparent text-center font-mono text-xs font-black text-amber-400 outline-none"
            aria-label="Custom rounds"
          />
          <span className="text-[9px] font-black text-zinc-600">rd</span>
        </div>
      </div>
    </div>
  );

  const codeCard = (
    <div className="flex flex-col items-center gap-2 rounded-3xl bg-white/[0.04] p-4 pt-5 text-center ring-1 ring-white/10">
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">
        Room code
      </span>
      <div className="flex items-center gap-2.5">
        <span className="font-mono text-4xl font-black tracking-[0.22em] text-amber-400 [text-shadow:0_0_24px_rgba(245,158,11,0.4)]">
          {roomCode}
        </span>
        <button
          onClick={copyCode}
          title="Copy room code"
          aria-label="Copy room code"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">
        Share it to invite players
      </span>
    </div>
  );

  return (
    <div className="relative w-full overflow-hidden bg-[#0a0616] font-sans text-white">
      {/* Colorful mesh backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/20 blur-[130px]" />
        <div className="absolute -left-40 bottom-0 h-80 w-80 rounded-full bg-cyan-500/15 blur-[120px]" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[120px]" />
      </div>

      {/* ══════════ MOBILE: single-column app shell ══════════ */}
      <div className="relative z-10 flex h-dvh flex-col md:hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-md flex-1 px-4 pb-4 pt-[calc(4.25rem+env(safe-area-inset-top))]">
            {codeCard}
            {pinChip && <div className="mt-2.5">{pinChip}</div>}
            <div className="mt-5">{seatsBlock}</div>
            {(botAdder || roundsPicker) && (
              <div className="mt-5 space-y-2.5">
                {botAdder}
                {roundsPicker}
              </div>
            )}
          </div>
        </div>

        {/* Bottom dock — clears the floating chat bar */}
        <div className="relative z-10 shrink-0 bg-gradient-to-t from-[#0a0616] via-[#0a0616]/95 to-transparent px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto w-full max-w-md">
            <ActionDock
              canStart={canStart}
              neededPlayers={neededPlayers}
              maxRounds={maxRounds}
              onStartGame={() => onStartGame({ maxRounds })}
              isHost={isHost}
            />
          </div>
        </div>

        {/* Leave pill — opposite the floating sound toggle */}
        <button
          onClick={onLeaveRoom}
          className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-rose-500/10 px-3.5 text-xs font-black uppercase tracking-wider text-rose-400 ring-1 ring-rose-500/25 backdrop-blur transition-colors hover:bg-rose-500/20"
        >
          <LogOut className="h-4 w-4" />
          Leave
        </button>
      </div>

      {/* ══════════ DESKTOP: split console ══════════ */}
      <div className="relative z-10 mx-auto hidden h-screen w-full max-w-5xl flex-col justify-center gap-8 px-10 py-8 md:flex">
        {/* Top row: code + PIN + leave */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-6">
            {codeCard}
            {pinChip && <div className="w-80">{pinChip}</div>}
          </div>
          <button
            onClick={onLeaveRoom}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-rose-400 ring-1 ring-rose-500/25 transition-colors hover:bg-rose-500/20"
          >
            <LogOut className="h-4 w-4" />
            Leave room
          </button>
        </div>

        {/* Main row: seats (wide) + host controls (side) */}
        <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] items-start gap-6">
          <div className="h-full overflow-hidden rounded-3xl bg-white/[0.03] p-5 ring-1 ring-white/10">
            {seatsBlock}
          </div>
          <div className="flex h-full flex-col gap-3 overflow-y-auto pr-1">
            {botAdder}
            {roundsPicker}
            {!botAdder && !roundsPicker && players.length > 0 && (
              <div className="rounded-2xl bg-white/[0.03] p-4 text-xs leading-relaxed text-zinc-500 ring-1 ring-white/10">
                Only the host can add bots and set the match length. Players
                fill seats from the 6-digit code.
              </div>
            )}
          </div>
        </div>

        {/* Dock */}
        <div className="mx-auto w-full max-w-md">
          <ActionDock
            canStart={canStart}
            neededPlayers={neededPlayers}
            maxRounds={maxRounds}
            onStartGame={() => onStartGame({ maxRounds })}
            isHost={isHost}
          />
        </div>
      </div>
    </div>
  );
};
