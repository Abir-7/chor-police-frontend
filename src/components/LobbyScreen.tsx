import React, { useState } from "react";
import {
  AlertCircle,
  Crown,
  KeyRound,
  Loader2,
  LogIn,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";

interface LobbyScreenProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onReclaimSeat?: (roomCode: string, playerName: string, seatPin: string) => void;
  onReconnect?: () => void;
  hasActiveSession?: boolean;
  isLoading: boolean;
  error?: string | null;
}

const TABS = [
  { id: "create", short: "Create", label: "Create Room", icon: Sparkles },
  { id: "join", short: "Join", label: "Join Room", icon: LogIn },
  { id: "rejoin", short: "Rejoin", label: "Rejoin", icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_COPY: Record<TabId, { title: string; subtitle: string }> = {
  create: {
    title: "Host a new game",
    subtitle: "Set your name and we'll open a room for your friends.",
  },
  join: {
    title: "Join a game",
    subtitle: "Enter the 6-digit code the host shared with you.",
  },
  rejoin: {
    title: "Reclaim your seat",
    subtitle: "Return to a room you left using your name and PIN.",
  },
};

/**
 * A code / PIN field rendered as individual digit cells.
 *
 * A transparent, focusable input sits on top of the cells, so mobile keyboards
 * still get a normal numeric field (paste, autofill and backspace all work)
 * while the user sees large, tappable boxes.
 */
const CodeInput: React.FC<{
  id: string;
  value: string;
  length: number;
  onChange: (next: string) => void;
  label: string;
  describedBy?: string;
}> = ({ id, value, length, onChange, label, describedBy }) => {
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative">
      <div className="flex items-stretch gap-1.5 sm:gap-2" aria-hidden="true">
        {Array.from({ length }).map((_, index) => {
          const char = value[index];
          const isActive = focused && index === activeIndex;
          return (
            <div
              key={index}
              className={`flex h-12 min-w-0 flex-1 items-center justify-center rounded-xl border font-mono text-lg font-bold transition-all duration-150 sm:h-14 sm:text-xl ${
                char
                  ? "border-slate-600/80 bg-slate-950/80 text-white"
                  : "border-slate-700/60 bg-slate-950/60 text-slate-600"
              } ${
                isActive
                  ? "border-amber-400/80 ring-2 ring-amber-400/20"
                  : ""
              }`}
            >
              {char ?? ""}
            </div>
          );
        })}
      </div>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").slice(0, length))
        }
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-label={label}
        aria-describedby={describedBy}
        className="absolute inset-0 h-full w-full cursor-text rounded-xl bg-transparent p-0 text-transparent caret-transparent opacity-0"
      />
    </div>
  );
};

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onCreateRoom,
  onJoinRoom,
  onReclaimSeat,
  onReconnect,
  hasActiveSession,
  isLoading,
  error,
}) => {
  const [tab, setTab] = useState<TabId>("create");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [seatPin, setSeatPin] = useState("");

  const activeTabIndex = TABS.findIndex((t) => t.id === tab);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!playerName.trim()) return;

    if (tab === "create") {
      onCreateRoom(playerName.trim());
      return;
    }

    if (roomCode.length !== 6) return;

    if (tab === "join") {
      onJoinRoom(roomCode, playerName.trim());
      return;
    }

    if (seatPin.length !== 4 || !onReclaimSeat) return;
    onReclaimSeat(roomCode, playerName.trim(), seatPin);
  };

  const canSubmit =
    !isLoading &&
    playerName.trim().length >= 2 &&
    (tab === "create" ||
      (roomCode.length === 6 && (tab === "join" || seatPin.length === 4)));

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-y-auto bg-radial from-slate-900 via-slate-950 to-black px-4 py-6 sm:py-10">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/85 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />

        {/* Header */}
        <header className="relative mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-inner">
            <Crown className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 bg-clip-text text-xl font-black uppercase leading-tight tracking-wide text-transparent sm:text-2xl">
              Chor Police
            </h1>
            <p className="text-[11px] font-medium text-slate-400 sm:text-xs">
              Babu • Police • Chor • Dakat
            </p>
          </div>
        </header>

        {/* Reconnect banner (if previous session detected) */}
        {hasActiveSession && onReconnect && (
          <div className="relative mb-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/5 p-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
                <RefreshCw className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Match in progress
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                  You were disconnected from an active game. Reconnect to return
                  to your seat.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onReconnect}
              disabled={isLoading}
              className="mt-3 flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-amber-500 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rejoin Previous Game
            </button>
          </div>
        )}

        {/* Tab switch */}
        <div
          role="tablist"
          aria-label="Room options"
          className="relative grid grid-cols-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-1"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-500 shadow-md shadow-amber-500/20 transition-transform duration-300 ease-out"
            style={{
              width: "calc((100% - 0.5rem) / 3)",
              transform: `translateX(${activeTabIndex * 100}%)`,
            }}
          />
          {TABS.map(({ id, short, label, icon: Icon }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                id={`tab-${id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`relative z-10 flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-1 text-[13px] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 ${
                  selected
                    ? "text-slate-950"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300"
          >
            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
            <span className="min-w-0">{error}</span>
          </div>
        )}

        {/* Panel */}
        <div
          role="tabpanel"
          id={`panel-${tab}`}
          aria-labelledby={`tab-${tab}`}
          className="relative mt-5"
        >
          <div className="mb-4">
            <h2 className="text-base font-bold text-white">
              {TAB_COPY[tab].title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              {TAB_COPY[tab].subtitle}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="player-name"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
              >
                Your name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="player-name"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Birbal, Kabir..."
                  maxLength={20}
                  autoComplete="nickname"
                  autoCapitalize="words"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  className="h-12 w-full rounded-xl border border-slate-700/70 bg-slate-950/70 pl-10 pr-3.5 text-base font-medium text-white outline-none transition-colors placeholder:text-slate-600 focus:border-amber-400/80 focus:ring-2 focus:ring-amber-400/20"
                />
              </div>
            </div>

            {/* Room code */}
            {tab !== "create" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="room-code"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Room code
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500">
                    {roomCode.length}/6
                  </span>
                </div>
                <CodeInput
                  id="room-code"
                  value={roomCode}
                  length={6}
                  onChange={setRoomCode}
                  label="6-digit room code"
                />
              </div>
            )}

            {/* Seat PIN */}
            {tab === "rejoin" && (
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label
                    htmlFor="seat-pin"
                    className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                  >
                    Seat PIN
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-slate-500">
                    {seatPin.length}/4
                  </span>
                </div>
                <CodeInput
                  id="seat-pin"
                  value={seatPin}
                  length={4}
                  onChange={setSeatPin}
                  label="4-digit seat PIN"
                  describedBy="seat-pin-help"
                />
                <p
                  id="seat-pin-help"
                  className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500"
                >
                  <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-slate-600" />
                  <span>
                    Use the same name and the PIN shown in the waiting room. It
                    works from any browser.
                  </span>
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 text-sm font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-900/20 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : tab === "create" ? (
                <>
                  <Crown className="h-4 w-4" />
                  Create &amp; Host
                </>
              ) : tab === "join" ? (
                <>
                  <Play className="h-4 w-4" />
                  Enter Game
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Reclaim My Seat
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="relative mt-5 flex items-center justify-center gap-2 border-t border-slate-800/70 pt-4 text-[11px] font-medium text-slate-500">
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>4–8 players · share your code to invite</span>
        </footer>
      </div>
    </div>
  );
};
