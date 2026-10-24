import React, { useState } from "react";
import {
  AlertCircle,
  Crown,
  KeyRound,
  Loader2,
  LogIn,
  Play,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { GameRole } from "../types";
import { ROLE_INFO } from "./RoleCard";

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
  { id: "create", short: "Create", label: "Create", icon: Sparkles },
  { id: "join", short: "Join", label: "Join", icon: LogIn },
  { id: "rejoin", short: "Rejoin", label: "Rejoin", icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

const TAB_COPY: Record<TabId, { kicker: string; title: string; subtitle: string }> = {
  create: {
    kicker: "New room",
    title: "Host a fresh table",
    subtitle: "Set a name — we'll open a room and hand you a 6-digit code.",
  },
  join: {
    kicker: "Friend's room",
    title: "Join a game",
    subtitle: "Type the 6-digit code your host shared with you.",
  },
  rejoin: {
    kicker: "Reclaim seat",
    title: "Back to your seat",
    subtitle: "Same name + the 4-digit PIN from the waiting room.",
  },
};

/** Colorful mesh backdrop shared by both layouts. */
const Mesh = () => (
  <div aria-hidden="true" className="pointer-events-none absolute inset-0">
    <div className="absolute inset-0 bg-[#0a0616]" />
    <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-amber-500/25 blur-[120px]" />
    <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-[130px]" />
    <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-[130px]" />
    <div className="absolute bottom-1/3 left-1/3 h-72 w-72 rounded-full bg-emerald-500/15 blur-[120px]" />
  </div>
);

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
  accent: "amber" | "cyan";
}> = ({ id, value, length, onChange, label, describedBy, accent }) => {
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, length - 1);

  const activeRing =
    accent === "amber"
      ? "border-amber-400/90 ring-2 ring-amber-400/25"
      : "border-cyan-400/90 ring-2 ring-cyan-400/25";

  return (
    <div className="relative">
      <div className="flex items-stretch gap-1.5" aria-hidden="true">
        {Array.from({ length }).map((_, index) => {
          const char = value[index];
          const isActive = focused && index === activeIndex;
          return (
            <div
              key={index}
              className={`flex h-14 min-w-0 flex-1 items-center justify-center rounded-xl border font-mono text-xl font-bold transition-all duration-150 ${
                char
                  ? "border-white/25 bg-white/[0.09] text-white"
                  : "border-white/10 bg-white/[0.04] text-zinc-600"
              } ${isActive ? activeRing : ""}`}
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
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

  const accent = tab === "rejoin" ? "cyan" : "amber";

  /* ── Shared blocks (composed differently by each layout) ─────────────── */

  const tabsBlock = (
    <div
      role="tablist"
      aria-label="Room options"
      className="relative grid grid-cols-3 rounded-2xl bg-white/[0.05] p-1 ring-1 ring-white/10"
    >
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-1 left-1 rounded-xl transition-all duration-300 ease-out ${
          accent === "amber"
            ? "bg-gradient-to-b from-amber-300 to-amber-500 shadow-[0_4px_20px_-2px_rgba(245,158,11,0.6)]"
            : "bg-gradient-to-b from-cyan-300 to-cyan-500 shadow-[0_4px_20px_-2px_rgba(34,211,238,0.6)]"
        }`}
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
            className={`relative z-10 flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
              selected ? "text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{label}</span>
            <span className="sr-only">{short}</span>
          </button>
        );
      })}
    </div>
  );

  const errorAlert = error && (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2.5 text-xs font-semibold text-red-300"
    >
      <AlertCircle className="mt-px h-4 w-4 shrink-0" />
      <span className="min-w-0">{error}</span>
    </div>
  );

  const panelHeading = (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-400/90">
        {TAB_COPY[tab].kicker}
      </p>
      <h2 className="mt-1 text-xl font-black tracking-tight text-white">
        {TAB_COPY[tab].title}
      </h2>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">
        {TAB_COPY[tab].subtitle}
      </p>
    </div>
  );

  const fields = (
    <div className="mt-5 space-y-5">
      {/* Name */}
      <div>
        <label
          htmlFor="player-name"
          className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
        >
          Your name
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            id="player-name"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="e.g. Birbal, Kabir…"
            maxLength={20}
            autoComplete="nickname"
            autoCapitalize="words"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            className="h-14 w-full rounded-2xl border border-white/10 bg-white/[0.05] pl-11 pr-4 text-base font-semibold text-white outline-none transition-all placeholder:font-normal placeholder:text-zinc-600 focus:border-amber-400/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-amber-400/20"
          />
        </div>
      </div>

      {/* Room code */}
      {tab !== "create" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="room-code"
              className="block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
            >
              Room code
            </label>
            <span className="font-mono text-[10px] tabular-nums text-zinc-600">
              {roomCode.length}/6
            </span>
          </div>
          <CodeInput
            id="room-code"
            value={roomCode}
            length={6}
            onChange={setRoomCode}
            label="6-digit room code"
            accent="amber"
          />
        </div>
      )}

      {/* Seat PIN */}
      {tab === "rejoin" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="seat-pin"
              className="block text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500"
            >
              Seat PIN
            </label>
            <span className="font-mono text-[10px] tabular-nums text-zinc-600">
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
            accent="cyan"
          />
          <p
            id="seat-pin-help"
            className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-zinc-500"
          >
            <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" />
            <span>Same name + PIN, any browser. Valid 2 minutes.</span>
          </p>
        </div>
      )}
    </div>
  );

  const submitButton = (
    <button
      type="submit"
      onClick={() => handleSubmit()}
      disabled={!canSubmit}
      className={`flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-[15px] font-black uppercase tracking-[0.12em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${
        accent === "cyan"
          ? "bg-gradient-to-b from-cyan-400 to-cyan-600 text-cyan-950 shadow-[0_10px_30px_-8px_rgba(34,211,238,0.55)]"
          : "bg-gradient-to-b from-amber-400 to-amber-600 text-zinc-950 shadow-[0_10px_30px_-8px_rgba(245,158,11,0.55)]"
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting…
        </>
      ) : tab === "create" ? (
        <>
          <Crown className="h-4 w-4" />
          Host the room
        </>
      ) : tab === "join" ? (
        <>
          <Play className="h-4 w-4 fill-current" />
          Enter the game
        </>
      ) : (
        <>
          <KeyRound className="h-4 w-4" />
          Reclaim my seat
        </>
      )}
    </button>
  );

  const reconnectCard = hasActiveSession && onReconnect && (
    <button
      type="button"
      onClick={onReconnect}
      disabled={isLoading}
      className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-3.5 text-left transition-colors hover:bg-amber-400/[0.12] active:scale-[0.99] disabled:opacity-50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
        <RefreshCw className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
          Match in progress
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-zinc-400">
          You dropped from a live game — tap to return to your seat.
        </span>
      </span>
    </button>
  );

  return (
    <div className="relative w-full overflow-hidden font-sans text-white">
      <Mesh />

      {/* ══════════ MOBILE: single-column app shell ══════════ */}
      <div className="relative z-10 flex h-dvh flex-col md:hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-md flex-1 px-5 pb-6 pt-[calc(2.25rem+env(safe-area-inset-top))]">
            {/* Wordmark */}
            <header className="flex items-center justify-center gap-3 pb-1 pt-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-b from-amber-400/25 to-fuchsia-500/10 shadow-[0_0_30px_-6px_rgba(245,158,11,0.5)]">
                <Crown className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h1 className="bg-gradient-to-r from-amber-300 via-orange-300 to-fuchsia-400 bg-clip-text text-2xl font-black uppercase leading-none tracking-[0.08em] text-transparent">
                  Chor Police
                </h1>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                  Babu · Police · Chor · Dakat
                </p>
              </div>
            </header>

            {reconnectCard && <div className="mt-5">{reconnectCard}</div>}
            {tabsBlock && <div className="mt-6">{tabsBlock}</div>}
            {errorAlert && <div className="mt-4">{errorAlert}</div>}

            <div
              role="tabpanel"
              id="panel-mobile"
              className="mt-6"
            >
              {panelHeading}
              {fields}
            </div>
          </div>
        </div>

        {/* Bottom dock */}
        <div className="relative z-10 shrink-0 border-t border-white/[0.06] bg-[#0a0616]/90 px-5 pt-3 pb-[calc(0.9rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto w-full max-w-md">
            {submitButton}
            <p className="flex items-center justify-center gap-1.5 pt-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
              <Users className="h-3 w-3 shrink-0" />
              4–8 players
            </p>
          </div>
        </div>
      </div>

      {/* ══════════ DESKTOP: hero + card split ══════════ */}
      <div className="relative z-10 mx-auto hidden h-screen w-full max-w-7xl grid-cols-[1.05fr_0.95fr] items-center gap-16 px-10 lg:px-16 md:grid">
        {/* Hero */}
        <div>
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/30 via-fuchsia-500/20 to-cyan-500/20 shadow-[0_0_50px_-10px_rgba(245,158,11,0.6)]">
            <Crown className="h-8 w-8 text-amber-300" />
          </div>
          <h1 className="text-6xl font-black uppercase leading-[0.95] tracking-tight">
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-fuchsia-500 bg-clip-text text-transparent">
              Chor Police
            </span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-zinc-400">
            The bluff-and-chase party classic, live in your browser. Grab a
            slip, hide your role, and let the Babu hunt the thieves.
          </p>

          {/* Colorful role strip */}
          <div className="mt-7 flex flex-wrap gap-2">
            {[
              GameRole.RAJA,
              GameRole.POLICE,
              GameRole.CHOR,
              GameRole.DAKAT,
            ].map((role) => {
              const info = ROLE_INFO[role];
              return (
                <span
                  key={role}
                  className="flex items-center gap-2 rounded-full bg-white/[0.05] py-1.5 pl-1.5 pr-3 ring-1 ring-white/10"
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${info.color} to-transparent`}>
                    <span className="scale-[0.5]">{info.icon}</span>
                  </span>
                  <span className="text-xs font-black uppercase tracking-wider text-zinc-200">
                    {info.name}
                  </span>
                  <span className="font-mono text-[10px] font-bold text-zinc-500">
                    {info.score}
                  </span>
                </span>
              );
            })}
          </div>

          <div className="mt-7 flex items-center gap-6 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-400/70" /> 4–8 players
            </span>
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-cyan-400/70" /> Bots fill seats
            </span>
          </div>
        </div>

        {/* Auth card */}
        <div className="w-full max-w-md justify-self-end">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            {reconnectCard && <div className="mb-5">{reconnectCard}</div>}
            {tabsBlock}
            {errorAlert && <div className="mt-4">{errorAlert}</div>}
            <div
              role="tabpanel"
              id="panel-desktop"
              aria-labelledby={`tab-${tab}`}
              className="mt-6"
            >
              {panelHeading}
              <form
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              >
                {fields}
                <div className="mt-6 space-y-3">
                  {submitButton}
                  <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                    <Users className="h-3 w-3 shrink-0" />
                    4–8 players · share your code to invite
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
