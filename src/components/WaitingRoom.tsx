import React from 'react';
import { RoomPlayer, GameSettings } from '../types';
import { Crown, Users, Play, Copy, Check, ShieldAlert, LogOut, KeyRound, UserX, Bot, Dices } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 pb-4 pt-20 sm:p-6">
      <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        {/* Top bar */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase text-amber-500 tracking-wider">
              Room Code
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-3xl font-black tracking-widest text-white">
                {roomCode}
              </span>
              <button
                onClick={copyCode}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={onLeaveRoom}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold border border-red-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Leave
          </button>
        </div>

        {/* Rejoin credentials: lets the player get this seat back from another
            browser after closing this one. */}
        {seatPin && (
          <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs leading-relaxed text-slate-400">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block mb-1">
                Rejoin PIN: <span className="font-mono text-amber-400 tracking-widest text-sm">{seatPin}</span>
              </span>
              If you close this browser, go to the lobby → <b>Rejoin</b> and enter
              room code <span className="font-mono text-slate-300">{roomCode}</span>
              {playerName ? <> with the name <span className="text-slate-300">{playerName}</span></> : null}
              {' '}and this PIN. You have 2 minutes before the seat is released.
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="my-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
              <Users className="w-4 h-4 text-amber-400" />
              <span>
                Joined Players ({players.length}/8)
              </span>
            </div>
            {neededPlayers > 0 && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Need {neededPlayers} more to start
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map((p) => {
              const isMe = p.id === currentUserId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                    isMe
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        p.isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-rose-500'
                      }`}
                    />
                    <span className="truncate text-sm">
                      {p.name} {isMe && '(You)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {p.isBot && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                        <Bot className="w-3 h-3" /> Bot
                      </span>
                    )}
                    {p.isHost && (
                      <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 uppercase tracking-wider">
                        <Crown className="w-3 h-3" /> Host
                      </span>
                    )}
                    {isHost && !isMe && onKickPlayer && (
                      <button
                        type="button"
                        onClick={() => onKickPlayer(p.id)}
                        title={
                          p.isConnected
                            ? `Remove ${p.name} from the room`
                            : `${p.name} is disconnected — free their seat`
                        }
                        className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add Bot (Host Only) */}
        {isHost && onAddBot && players.length < 8 && (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl mb-6">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-3">
              Add Bot Player
            </span>
            <form
              className="flex gap-2"
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
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => {
                  const taken = new Set(
                    players.map((p) => p.name.toLowerCase()),
                  );
                  const options = BOT_NAME_SUGGESTIONS.filter(
                    (name) => !taken.has(name.toLowerCase()),
                  );
                  const pool = options.length > 0 ? options : BOT_NAME_SUGGESTIONS;
                  setBotName(pool[Math.floor(Math.random() * pool.length)]);
                }}
                title="Suggest a bot name"
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                <Dices className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-sm font-bold transition-colors cursor-pointer shrink-0"
              >
                <Bot className="w-4 h-4" />
                Add Bot
              </button>
            </form>
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              Bots fill empty seats so you can start without waiting — they pick
              slips, play Babu/Police turns and send reactions on their own.
            </p>
          </div>
        )}

        {/* Match Settings (Host Only) */}
        {isHost && (
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl mb-6">
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-3">
              Match Settings
            </span>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Quick Rounds:</span>
                <div className="flex items-center gap-1.5">
                  {[3, 5, 10].map((rounds) => (
                    <button
                      key={rounds}
                      type="button"
                      onClick={() => setMaxRounds(rounds)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        maxRounds === rounds
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {rounds} Rounds
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-slate-800/80">
                <span className="text-xs text-slate-400 font-medium">Custom Rounds:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxRounds}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0 && val <= 50) {
                        setMaxRounds(val);
                      }
                    }}
                    className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-center font-bold text-amber-400 text-xs focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-slate-500 font-semibold">rounds</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        {isHost ? (
          <button
            onClick={() => onStartGame({ maxRounds })}
            disabled={!canStart}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black py-4 px-6 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 uppercase tracking-wider text-base cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            {canStart ? `Start Game (${maxRounds} Rounds)` : `Waiting for ${neededPlayers} more players`}
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-700/40 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 animate-spin" />
            <span>Waiting for the Host to start the game...</span>
          </div>
        )}
      </div>
    </div>
  );
};
