import { io, Socket } from 'socket.io-client';

/**
 * Which game server to talk to, first match wins:
 *  1. `?server=https://…` in the page URL (the mobile app uses this to pick
 *     "Play online" while the page itself is served from the phone),
 *  2. build-time VITE_BACKEND_URL (`same-origin` = the server that served
 *     this page, used for the offline phone host / single-server setups),
 *  3. localhost for development.
 */
const resolveBackendUrl = (): string => {
  const fromQuery = new URLSearchParams(window.location.search).get('server');

  if (fromQuery) {
    return fromQuery.replace(/\/+$/, '');
  }

  const fromEnv = import.meta.env.VITE_BACKEND_URL;

  if (fromEnv === 'same-origin') {
    return window.location.origin;
  }

  return fromEnv || 'http://localhost:3000';
};

const BACKEND_URL = resolveBackendUrl();

let socket: Socket | null = null;

/**
 * A phone that was locked or lost signal can keep a socket that LOOKS
 * connected but is dead until the next heartbeat fails. Ping with an ack
 * timeout: if the server never answers, tear the socket down and redial now.
 */
export const probeConnection = (): void => {
  if (!socket) return;

  if (!socket.connected) {
    socket.connect();
    return;
  }

  const live = socket;

  live.timeout(4000).emit('app:ping', (err: unknown) => {
    if (err) {
      live.disconnect();
      live.connect();
    }
  });
};

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(BACKEND_URL, {
      autoConnect: true,
      reconnection: true,
      // The backend sleeps on a free tier, so a cold start can take well over
      // a minute. Never give up: keep retrying until the server answers.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      // Prefer a live websocket connection. By default socket.io starts
      // with HTTP long-polling and upgrades later, which adds perceptible
      // message lag (especially on mobile networks) — connect via websocket
      // immediately and fall back to polling only if websocket fails.
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('Connected to socket server:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server:', reason);
    });

    // Mobile quirk: locking or switching away can suspend the page, and when
    // the user comes back socket.io sometimes sleeps on its backoff instead
    // of dialing again. Nudge it the moment the screen is visible again —
    // the server holds the seat for 5 minutes so a fast resume keeps the
    // player in their room (and their live game state) without rejoining.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          probeConnection();
        }
      });

      // Restored from the back/forward cache (iOS Safari): sockets are dead.
      window.addEventListener('pageshow', (event) => {
        if ((event as PageTransitionEvent).persisted) {
          probeConnection();
        }
      });

      // Coming back online after the phone dropped Wi-Fi/data mid-game.
      window.addEventListener('online', () => {
        probeConnection();
      });
    }
  }
  return socket;
};
