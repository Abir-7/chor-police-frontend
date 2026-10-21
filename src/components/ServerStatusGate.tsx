import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { getSocket } from "../socket";
import { GameRole } from "../types";
import { ROLE_INFO } from "./RoleCard";

// A warm server connects in a few hundred ms, so keep the screen quiet for a
// moment instead of flashing a scary message on every single visit.
const MESSAGE_DELAY_MS = 800;
// How often the elapsed-seconds counter refreshes.
const TICK_MS = 250;
// After this long, add a reassuring line: cold starts can be slow but the
// browser keeps retrying on its own.
const SLOW_START_SECONDS = 60;
// How long each role card stays on screen while the server boots.
const ROLE_SWAP_MS = 1100;

// The four headline roles, in the order they are described on the lobby screen.
const WAITING_ROLES = [
  GameRole.RAJA,
  GameRole.POLICE,
  GameRole.CHOR,
  GameRole.DAKAT,
];

interface ServerStatusGateProps {
  children: React.ReactNode;
}

/**
 * Blocks the app until the backend answers.
 *
 * The backend runs on a free tier that shuts down when idle, so the first
 * visit after a while has to wait for it to boot. While waiting we deal the
 * game's role cards (Babu, Police, Chor, Dakat) and count the seconds
 * (1, 2, 3 ...) until the socket connects, then the real app is rendered.
 */
export const ServerStatusGate: React.FC<ServerStatusGateProps> = ({
  children,
}) => {
  const [ready, setReady] = useState(() => getSocket().connected);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    const handleConnect = () => setReady(true);

    // The socket may already be connected before this effect runs.
    if (socket.connected) handleConnect();
    socket.on("connect", handleConnect);

    // Start (or restart) the retry loop: during a cold start the first
    // attempts fail and socket.io backs off until the server is up.
    if (!socket.connected) socket.connect();

    return () => {
      socket.off("connect", handleConnect);
    };
  }, []);

  useEffect(() => {
    if (ready) return;

    const startedAt = Date.now();
    const messageTimer = setTimeout(() => setShowMessage(true), MESSAGE_DELAY_MS);
    const tickTimer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, TICK_MS);

    return () => {
      clearTimeout(messageTimer);
      clearInterval(tickTimer);
    };
  }, [ready]);

  // Deal the role cards one after another so the wait feels like the game.
  useEffect(() => {
    if (ready) return;
    const roleTimer = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % WAITING_ROLES.length);
    }, ROLE_SWAP_MS);
    return () => clearInterval(roleTimer);
  }, [ready]);

  if (ready) return <>{children}</>;

  // The counter starts at 1 rather than 0 so the first visible number reads
  // naturally together with the "waking up" message.
  const seconds = Math.max(1, elapsedSeconds);

  const activeRole = WAITING_ROLES[roleIndex];
  const activeRoleInfo = ROLE_INFO[activeRole];

  return (
    <div className="min-h-screen bg-radial from-slate-900 via-slate-950 to-black flex items-center justify-center p-4 font-sans antialiased text-slate-100 select-none">
      <div className="w-full max-w-sm text-center">
        {/* Role cards dealt one by one while the server boots.
            Re-keyed so the flip animation replays on every new role. */}
        <div className="flex justify-center mb-3">
          <div
            key={activeRole}
            className={`gate-role-flip w-24 h-32 rounded-2xl border-2 ${activeRoleInfo.color} shadow-2xl flex flex-col items-center justify-center gap-1.5 relative overflow-hidden`}
          >
            <span className="absolute -top-6 -left-6 w-16 h-16 bg-white/10 rounded-full blur-md pointer-events-none" />
            {activeRoleInfo.icon}
            <span className="text-[11px] font-black uppercase tracking-widest text-white/90">
              {activeRoleInfo.name}
            </span>
          </div>
        </div>

        {/* Role strip: the dealt role lights up, like a turn indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 text-[10px] font-black uppercase tracking-widest">
          {WAITING_ROLES.map((role) => (
            <span
              key={role}
              className={
                role === activeRole
                  ? "text-amber-300 drop-shadow"
                  : "text-slate-600"
              }
            >
              {ROLE_INFO[role].name}
            </span>
          ))}
        </div>

        {showMessage && (
          <div className="gate-fade-in">
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200 uppercase tracking-wider">
              Waking up the server…
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Our free hosting sleeps when nobody is playing. It only needs a
              moment to come back online.
            </p>

            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-sm font-bold text-slate-200">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              <span className="tabular-nums">{seconds}s</span>
            </div>

            <p className="mt-4 text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
              Retrying automatically — please keep this tab open
            </p>

            {seconds >= SLOW_START_SECONDS && (
              <p className="mt-3 text-xs text-amber-300/80">
                Still starting up. Cold boots can occasionally take a couple of
                minutes — we will take you in as soon as it responds.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerStatusGate;
