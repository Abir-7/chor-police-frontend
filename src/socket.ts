import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

let socket: Socket | null = null;

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
        if (document.visibilityState === 'visible' && socket && !socket.connected) {
          socket.connect();
        }
      });

      // Coming back online after the phone dropped Wi-Fi/data mid-game.
      window.addEventListener('online', () => {
        if (socket && !socket.connected) {
          socket.connect();
        }
      });
    }
  }
  return socket;
};
