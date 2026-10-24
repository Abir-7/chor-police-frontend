import React, { useEffect, useState } from 'react';
import { Loader2, MonitorSmartphone, UserX, WifiOff } from 'lucide-react';

export interface WaitingPlayer {
  id: string;
  name: string;
  /** Epoch ms (client clock) when the seat is released, if known. */
  deadlineAt: number | null;
}

type Props =
  | { mode: 'restoring'; onCancel: () => void }
  | { mode: 'offline'; wasInGame: boolean }
  | {
      mode: 'paused';
      waitingFor: WaitingPlayer[];
      isHost: boolean;
      onRemovePlayer: (playerId: string) => void;
    }
  | { mode: 'replaced'; onTakeOver: () => void };

const formatRemaining = (ms: number): string => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

/**
 * Full-screen blocker for every "you cannot play right now" state. It sits
 * above the board, so taps cannot reach it while the round is frozen.
 */
export const ConnectionOverlay: React.FC<Props> = (props) => {
  const [now, setNow] = useState(() => Date.now());
  const [canCancel, setCanCancel] = useState(false);

  // One-second heartbeat drives the countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Offer an escape hatch if rejoining drags on (cold server, bad network).
  useEffect(() => {
    if (props.mode !== 'restoring') return;
    const id = setTimeout(() => setCanCancel(true), 8000);
    return () => clearTimeout(id);
  }, [props.mode]);

  let icon: React.ReactNode;
  let title: string;
  let body: React.ReactNode = null;

  if (props.mode === 'restoring') {
    icon = <Loader2 className="h-10 w-10 animate-spin text-amber-400" />;
    title = 'Rejoining your game…';
    body = (
      <p className="text-sm text-slate-400">
        Hang tight, getting you back to your seat.
      </p>
    );
  } else if (props.mode === 'offline') {
    icon = (
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/30" />
        <WifiOff className="relative h-9 w-9 animate-pulse text-rose-400" />
      </div>
    );
    title = 'Connection lost';
    body = (
      <p className="text-sm text-slate-400">
        Reconnecting automatically…
        {props.wasInGame && ' Your seat is saved — the game waits for you.'}
      </p>
    );
  } else if (props.mode === 'paused') {
    icon = (
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400/25" />
        <UserX className="relative h-9 w-9 animate-bounce text-amber-400" />
      </div>
    );
    const names = props.waitingFor.map((p) => p.name).join(', ');
    title = `Waiting for ${names}`;
    body = (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-slate-400">
          The game is paused until they reconnect.
        </p>
        {props.waitingFor.map((p) => (
          <div
            key={p.id}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"
          >
            <span className="truncate font-semibold text-slate-200">
              {p.name}
            </span>
            <span className="flex items-center gap-2">
              {p.deadlineAt !== null && (
                <span className="font-mono text-xs text-amber-300">
                  {formatRemaining(p.deadlineAt - now)}
                </span>
              )}
              {props.isHost && (
                <button
                  onClick={() => props.onRemovePlayer(p.id)}
                  className="cursor-pointer rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-500"
                >
                  Remove
                </button>
              )}
            </span>
          </div>
        ))}
        <p className="text-xs text-slate-500">
          {props.isHost
            ? 'Removing a player ends this round and returns everyone to the waiting room.'
            : 'If they do not return in time, the round ends.'}
        </p>
      </div>
    );
  } else {
    icon = <MonitorSmartphone className="h-10 w-10 text-sky-400" />;
    title = 'Playing in another tab';
    body = (
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm text-slate-400">
          This seat was opened in another tab or device.
        </p>
        <button
          onClick={props.onTakeOver}
          className="cursor-pointer rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-black hover:bg-amber-400"
        >
          Play here instead
        </button>
      </div>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-center shadow-2xl">
        {icon}
        <h2 className="text-lg font-extrabold text-white">{title}</h2>
        {body}
        {props.mode === 'restoring' && canCancel && (
          <button
            onClick={props.onCancel}
            className="cursor-pointer text-xs font-semibold text-slate-400 underline hover:text-slate-200"
          >
            Taking too long? Go to lobby
          </button>
        )}
      </div>
    </div>
  );
};
