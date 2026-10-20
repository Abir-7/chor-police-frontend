import React, { useState } from "react";
import { Crown, Users, Sparkles, LogIn, Play, RefreshCw, KeyRound } from "lucide-react";

interface LobbyScreenProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onReclaimSeat?: (roomCode: string, playerName: string, seatPin: string) => void;
  onReconnect?: () => void;
  hasActiveSession?: boolean;
  isLoading: boolean;
  error?: string | null;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  onReclaimSeat,
  onReconnect,
  hasActiveSession,
  isLoading,
  error,
}) => {
  const [tab, setTab] = useState<"create" | "join" | "rejoin">("create");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [seatPin, setSeatPin] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    if (tab === "create") {
      onCreateRoom(playerName.trim());
      return;
    }

    if (roomCode.trim().length !== 6) return;

    if (tab === "join") {
      onJoinRoom(roomCode.trim(), playerName.trim());
      return;
    }

    if (seatPin.trim().length !== 4 || !onReclaimSeat) return;
    onReclaimSeat(roomCode.trim(), playerName.trim(), seatPin.trim());
  };

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="text-center mb-6 relative">
          <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 shadow-inner">
            <Crown className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 tracking-wide uppercase">
            Chor Police
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-medium">
            Raja • Police • Chor • Dakat
          </p>
        </div>

        {/* Reconnect Banner (if previous session detected) */}
        {hasActiveSession && onReconnect && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Active Game Found</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You were disconnected from an active match. Reconnect to resume
              playing with your card!
            </p>
            <button
              onClick={onReconnect}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Rejoin Previous Game
            </button>
          </div>
        )}

        {/* Tab switch */}
        <div className="grid grid-cols-3 p-1 bg-slate-950/60 rounded-2xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => setTab("create")}
            className={`py-2.5 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              tab === "create"
                ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Create Room
          </button>
          <button
            type="button"
            onClick={() => setTab("join")}
            className={`py-2.5 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              tab === "join"
                ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LogIn className="w-4 h-4" />
            Join Room
          </button>
          <button
            type="button"
            onClick={() => setTab("rejoin")}
            className={`py-2.5 text-sm font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              tab === "rejoin"
                ? "bg-amber-500 text-slate-950 shadow-md scale-[1.02]"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Rejoin
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold text-center animate-shake">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              required
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="e.g. Birbal, Kabir..."
              maxLength={20}
              minLength={2}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-colors font-medium"
            />
          </div>

          {tab !== "create" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                6-Digit Room Code
              </label>
              <input
                type="text"
                required
                value={roomCode}
                onChange={(e) =>
                  setRoomCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                maxLength={6}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-center tracking-widest text-lg font-mono focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          )}

          {tab === "rejoin" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                4-Digit Seat PIN
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={seatPin}
                onChange={(e) =>
                  setSeatPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                }
                placeholder="0000"
                maxLength={4}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-white placeholder-slate-600 text-center tracking-[0.5em] text-lg font-mono focus:outline-none focus:border-amber-400 transition-colors"
              />
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                The PIN was shown in the waiting room. Use the same name you
                joined with and this PIN to get your seat back in any browser.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={
              isLoading ||
              !playerName.trim() ||
              (tab !== "create" && roomCode.length !== 6) ||
              (tab === "rejoin" && seatPin.length !== 4)
            }
            className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-slate-950 font-black py-3.5 px-4 rounded-xl shadow-lg transition-all duration-150 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"
          >
            {isLoading ? (
              <span className="animate-pulse">Connecting...</span>
            ) : tab === "create" ? (
              <>
                <Crown className="w-5 h-5" /> Create & Host
              </>
            ) : tab === "join" ? (
              <>
                <Play className="w-5 h-5" /> Enter Game
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" /> Reclaim My Seat
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
          <Users className="w-4 h-4 text-slate-400" />
          <span>Supports 5 to 8 players</span>
        </div>
      </div>
    </div>
  );
};
