import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './socket';
import {
  GamePhase,
  GameRole,
  PublicGameState,
  RoomPlayer,
  GameSettings,
  DisconnectedPlayer,
} from './types';
import { LobbyScreen } from './components/LobbyScreen';
import { WaitingRoom } from './components/WaitingRoom';
import { GameBoard } from './components/GameBoard';
import { Chat } from './components/Chat';
import { ShuffleOverlay } from './components/ShuffleOverlay';
import { PhaseAnnouncementOverlay } from './components/PhaseAnnouncementOverlay';
import { SoundToggle } from './components/SoundToggle';
import { ConnectionOverlay, WaitingPlayer } from './components/ConnectionOverlay';
import { playSound } from './sound';


// Minimum time the shuffle animation stays on screen, even if the server
// responds faster, so every player sees the riffle.
const SHUFFLE_MIN_MS = 2000;
// Safety timeout: if the server never confirms the new round, drop the overlay.
const SHUFFLE_MAX_MS = 5000;

// Ticking stops after this many seconds even if the Police never decides —
// a stalled game must not tick forever.
const MAX_TICK_SOUND_TICKS = 20;  // How long each phase announcement animation stays on screen before the
  // underlying screen is revealed (all durations in ms).
  const ANNOUNCE_MS: Record<
    'reveal' | 'king' | 'caught' | 'missed',
    number
  > = {
    reveal: 3000,
    king: 4000,
    caught: 5000,
    missed: 5000,
  };

  // Delay before the reveal animation starts after all players have picked.
  const REVEAL_DELAY_MS = 1000;

type Announcement = {
  kind: 'reveal' | 'king' | 'caught' | 'missed';
  targetRole?: GameRole.CHOR | GameRole.DAKAT;
  nextState: PublicGameState;
};

// Sound effect played for each phase announcement.
const ANNOUNCE_SOUNDS = {
  reveal: 'reveal',
  king: 'king',
  caught: 'catch',
  missed: 'miss',
} as const;

export const App: React.FC = () => {
  const [inRoom, setInRoom] = useState(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [myRole, setMyRole] = useState<GameRole | undefined>();
  const [partnerThief, setPartnerThief] = useState<{ id: string; name: string; role: GameRole } | undefined>();
  const [timeLeft, setTimeLeft] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [seatPin, setSeatPin] = useState<string>('');
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleLabel, setShuffleLabel] = useState('Shuffling Papers...');
  const [pendingGameState, setPendingGameState] = useState<PublicGameState | null>(null);
  const shuffleStartRef = useRef<number | null>(null);
  const gameStateRef = useRef<PublicGameState | null>(gameState);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  // True while a bot Police's pick is on screen: non-Police players then see
  // the Confirm-arrest dock render and visually "press" before the arrest
  // resolves, exactly like watching a real player hit the button.
  const [policeAutoConfirm, setPoliceAutoConfirm] = useState(false);
  const announcementRef = useRef<Announcement | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Connection resilience state -------------------------------------
  // A saved seat means a refresh should rejoin instead of flashing the lobby.
  const [restoring, setRestoring] = useState(() => {
    try {
      return Boolean(
        localStorage.getItem('chor_roomCode') &&
          localStorage.getItem('chor_token'),
      );
    } catch {
      return false;
    }
  });
  const [socketOnline, setSocketOnline] = useState(() => getSocket().connected);
  // Humans the round is frozen for (null = nobody is missing).
  const [paused, setPaused] = useState<WaitingPlayer[] | null>(null);
  // This seat was taken over by another tab/device.
  const [replaced, setReplaced] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // Socket handlers are registered once, so they read live values from refs.
  const inRoomRef = useRef(false);
  const currentUserIdRef = useRef('');
  const replacedRef = useRef(false);
  const reconnectPendingRef = useRef(false);
  const pausedNamesRef = useRef<Map<string, string>>(new Map());
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    inRoomRef.current = inRoom;
    currentUserIdRef.current = currentUserId;
    replacedRef.current = replaced;
  }, [inRoom, currentUserId, replaced]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  // Keep refs of the current game state so socket handlers always read fresh data.
  useEffect(() => {
    gameStateRef.current = gameState;
    announcementRef.current = announcement;
  }, [gameState, announcement]);

  const pendingGameStateRef = useRef<PublicGameState | null>(null);
  useEffect(() => {
    pendingGameStateRef.current = pendingGameState;
  }, [pendingGameState]);

  const cancelShuffle = useCallback(() => {
    shuffleStartRef.current = null;
    setPendingGameState(null);
    setIsShuffling(false);
  }, []);

  const cancelRevealDelay = useCallback(() => {
    if (revealTimerRef.current) {
      clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const triggerShuffle = useCallback((label: string) => {
    if (shuffleStartRef.current !== null) return;
    shuffleStartRef.current = Date.now();
    setShuffleLabel(label);
    setIsShuffling(true);
  }, []);

  useEffect(() => {
    if (!errorMessage) return;
    const timer = setTimeout(() => {
      setErrorMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [errorMessage]);

  // Check saved session on mount. localStorage (not sessionStorage) so a
  // closed tab or browser restart can still resume the seat.
  useEffect(() => {
    const savedRoomCode = localStorage.getItem('chor_roomCode');
    const savedToken = localStorage.getItem('chor_token');
    const savedPlayerId = localStorage.getItem('chor_playerId');
    const savedSeatPin = localStorage.getItem('chor_seatPin');

    if (savedRoomCode && savedToken && savedPlayerId) {
      setHasSession(true);
    }

    if (savedSeatPin) {
      setSeatPin(savedSeatPin);
    }
  }, []);

  const triggerReconnect = useCallback(() => {
    const savedRoomCode = localStorage.getItem('chor_roomCode');
    const savedToken = localStorage.getItem('chor_token');

    if (savedRoomCode && savedToken) {
      setLoading(true);
      setErrorMessage(null);
      reconnectPendingRef.current = true;
      const socket = getSocket();
      socket.emit('room:reconnect', {
        roomCode: savedRoomCode,
        reconnectToken: savedToken,
      });
    }
  }, []);

  // Restore a seat from a fresh browser where no session was saved: the
  // player supplies the room code, the name they joined with, and their PIN.
  const handleReclaimSeat = (
    roomCodeValue: string,
    playerName: string,
    pin: string,
  ) => {
    setLoading(true);
    setErrorMessage(null);
    reconnectPendingRef.current = true;
    getSocket().emit('room:reclaim', {
      roomCode: roomCodeValue,
      playerName,
      seatPin: pin,
    });
  };

  useEffect(() => {
    const socket = getSocket();

    // Persist the seat credentials so a closed tab, a browser restart, or a
    // crash can resume the same seat on this device without asking for a PIN.
    const saveSession = (data: {
      roomCode: string;
      player: RoomPlayer;
      reconnectToken: string;
      seatPin?: string;
    }) => {
      localStorage.setItem('chor_roomCode', data.roomCode);
      localStorage.setItem('chor_token', data.reconnectToken);
      localStorage.setItem('chor_playerId', data.player.id);

      if (data.seatPin) {
        localStorage.setItem('chor_seatPin', data.seatPin);
        setSeatPin(data.seatPin);
      }
    };

    const clearSession = () => {
      localStorage.removeItem('chor_roomCode');
      localStorage.removeItem('chor_token');
      localStorage.removeItem('chor_playerId');
      localStorage.removeItem('chor_seatPin');
    };

    // Applies the server's list of absent humans. Shows who the round waits
    // for, and plays the drop / return cues for everyone else at the table.
    const applyPaused = (list: DisconnectedPlayer[], quiet = false) => {
      const others = list.filter((p) => p.id !== currentUserIdRef.current);
      const previous = pausedNamesRef.current;
      const next = new Map(others.map((p) => [p.id, p.name] as const));

      const droppedNow = others.filter((p) => !previous.has(p.id));
      const returned = [...previous.entries()].filter(([id]) => !next.has(id));

      pausedNamesRef.current = next;

      if (others.length === 0) {
        setPaused(null);
      } else {
        const t = Date.now();
        setPaused(
          others.map((p) => ({
            id: p.id,
            name: p.name,
            deadlineAt: p.remainingMs == null ? null : t + p.remainingMs,
          })),
        );
      }

      if (quiet) return;

      if (droppedNow.length > 0) {
        playSound('disconnect');
      } else if (returned.length > 0) {
        playSound('reconnect');
        setNotice(
          others.length === 0
            ? 'Everyone is back — game on!'
            : `${returned.map(([, name]) => name).join(', ')} is back`,
        );
      }
    };

    const handleDisconnect = () => {
      setSocketOnline(false);
      // The server only holds the seat while we are away: remember that the
      // next successful reconnect is a return, not a fresh join.
      if (inRoomRef.current) {
        playSound('disconnect');
      }
    };

    const handleConnect = () => {
      setSocketOnline(true);

      // Another tab owns this seat: do not fight it for the seat.
      if (replacedRef.current) return;

      // Auto-reconnect if we have a session saved
      const savedRoomCode = localStorage.getItem('chor_roomCode');
      const savedToken = localStorage.getItem('chor_token');

      if (savedRoomCode && savedToken) {
        reconnectPendingRef.current = true;
        socket.emit('room:reconnect', {
          roomCode: savedRoomCode,
          reconnectToken: savedToken,
        });
      }
    };

    // If socket is already connected on mount, trigger reconnect
    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Room Events
    const handleRoomCreated = (data: {
      roomCode: string;
      player: RoomPlayer;
      reconnectToken: string;
      seatPin?: string;
      players: RoomPlayer[];
    }) => {
      setInRoom(true);
      setRoomCode(data.roomCode);
      setCurrentUserId(data.player.id);
      setIsHost(data.player.isHost);
      setPlayers(data.players);
      setLoading(false);
      setErrorMessage(null);
      setHasSession(true);

      saveSession(data);
    };

    const handleRoomJoined = (data: {
      roomCode: string;
      player: RoomPlayer;
      reconnectToken: string;
      seatPin?: string;
      players: RoomPlayer[];
    }) => {
      setInRoom(true);
      setRoomCode(data.roomCode);
      setCurrentUserId(data.player.id);
      setIsHost(data.player.isHost);
      setPlayers(data.players);
      setLoading(false);
      setErrorMessage(null);
      setHasSession(true);

      saveSession(data);
    };

    const handleRoomReconnected = (data: {
      roomCode: string;
      player: RoomPlayer;
      reconnectToken: string;
      seatPin?: string;
      players: RoomPlayer[];
    }) => {
      reconnectPendingRef.current = false;
      setRestoring(false);
      setReplaced(false);
      replacedRef.current = false;
      setNotice('Reconnected — welcome back!');
      playSound('reconnect');
      setInRoom(true);
      setRoomCode(data.roomCode);
      setCurrentUserId(data.player.id);
      setIsHost(data.player.isHost);
      setPlayers(data.players);
      setLoading(false);
      setErrorMessage(null);
      setHasSession(true);

      saveSession(data);

      // Pull-based game resync: the server also pushes the live game state
      // on reconnect, but that push can lose a race with this page still
      // registering its handlers after a refresh. Asking again guarantees a
      // fresh copy (a no-op when no game is running).
      socket.emit('game:sync');
    };

    const handleRoomUpdated = (data: { roomCode: string; players: RoomPlayer[] }) => {
      setPlayers(data.players);
      const me = data.players.find((p) => p.id === currentUserIdRef.current);
      if (me) {
        setIsHost(me.isHost);
      }
    };

    const resetToLobby = () => {
      setInRoom(false);
      setGameState(null);
      setMyRole(undefined);
      setPartnerThief(undefined);
      setTimeLeft(undefined);
      setHasSession(false);
      cancelShuffle();
      cancelRevealDelay();
      setAnnouncement(null);
      setPoliceAutoConfirm(false);
      setRestoring(false);
      setReplaced(false);
      replacedRef.current = false;
      pausedNamesRef.current = new Map();
      setPaused(null);
      clearSession();
    };

    const handleRoomLeft = () => {
      resetToLobby();
    };

    // The host removed this player: there is no seat to come back to.
    const handleKicked = (data: { message?: string }) => {
      resetToLobby();
      setLoading(false);
      setSeatPin('');
      setErrorMessage(data?.message ?? 'You were removed from the room.');
    };

    // Another player's seat was released (kicked or timed out).
    const handlePlayerRemoved = (data: { message?: string }) => {
      setErrorMessage(data?.message ?? 'A player was removed from the room.');
    };

    const handleRoomError = (data: { message: string }) => {
      const message = data.message ?? '';
      const lower = message.toLowerCase();

      if (inRoomRef.current && lower.includes('already in a room')) {
        return;
      }

      setLoading(false);

      // A failed reconnect/reclaim means this seat can never be restored
      // (room closed, server restarted, token revoked, seat released): drop
      // the dead session and, if a board is on screen, leave it.
      if (reconnectPendingRef.current) {
        reconnectPendingRef.current = false;
        setRestoring(false);

        if (
          /token|not found|expired|does not belong|no longer/.test(lower)
        ) {
          const wasInRoom = inRoomRef.current;

          if (wasInRoom) {
            resetToLobby();
          } else {
            setHasSession(false);
            clearSession();
          }

          setErrorMessage(
            wasInRoom ? 'That room is no longer available.' : message,
          );
          return;
        }
      }

      setErrorMessage(message);
    };

    // Same seat opened elsewhere: this tab becomes read-only until reclaimed.
    const handleRoomReplaced = () => {
      replacedRef.current = true;
      setReplaced(true);
      setLoading(false);
    };

    // Game Events

    // One atomic snapshot after a refresh / reconnect: replaces the whole
    // game view and skips every animation so the player lands on the live
    // screen instead of replaying stale reveals.
    const handleGameResync = (data: {
      gameState: PublicGameState | null;
      myRole?: GameRole;
      partnerThief?: { id: string; name: string; role: GameRole };
      disconnected?: DisconnectedPlayer[];
    }) => {
      cancelShuffle();
      cancelRevealDelay();
      setAnnouncement(null);
      setPoliceAutoConfirm(false);
      setTimeLeft(undefined);

      if (!data.gameState) {
        if (gameStateRef.current) {
          setNotice('The game ended while you were away.');
        }
        setGameState(null);
        setMyRole(undefined);
        setPartnerThief(undefined);
        applyPaused([], true);
        return;
      }

      setGameState(data.gameState);
      setMyRole(data.myRole);
      setPartnerThief(data.partnerThief);
      applyPaused(data.disconnected ?? [], true);
    };

    const handleGamePaused = (data: { disconnected: DisconnectedPlayer[] }) => {
      applyPaused(data.disconnected ?? []);
    };

    const handleGameResumed = () => {
      applyPaused([]);
    };

    const handleGameStarted = (state: PublicGameState) => {
      const prev = gameStateRef.current;

      // A new round always starts in PICKING with no roles: wipe any role
      // identity carried over from the previous round so a player who was
      // Chor/Dakat last round cannot see their old (stale) thief card now.
      if (state.phase === GamePhase.PICKING) {
        setMyRole(undefined);
        setPartnerThief(undefined);
      }

      // If this is a reconnect sync (page refreshed mid-game), skip the
      // shuffle animation and apply the state immediately so the player
      // sees the GameBoard instead of the WaitingRoom + "Start Game" button.
      const isReconnectSync =
        !prev &&
        state.phase !== GamePhase.PICKING; // a brand-new round always starts in PICKING

      if (isReconnectSync) {
        setGameState(state);
        return;
      }

      const isNewRound =
        !prev ||
        prev.phase === GamePhase.WAITING ||
        prev.phase === GamePhase.ROUND_RESULT ||
        prev.phase === GamePhase.GAME_OVER;

      if (isNewRound) {
        // Every player sees the shuffle while the new round is prepared.
        triggerShuffle('Shuffling Papers...');
        setPendingGameState(state);
      } else {
        setGameState(state);
      }
    };

    const handleGameStateUpdated = (state: PublicGameState) => {
      // Everyone has picked a paper: wait 1s, then play the card-opening
      // reveal animation before showing the revealed roles.
      if (
        gameStateRef.current?.phase === GamePhase.PICKING &&
        state.phase === GamePhase.ROLE_REVEAL
      ) {
        // Show the final pick right away (who claimed which slip — e.g. the
        // last bot's name on its paper) while keeping the board in PICKING
        // until the reveal animation is done. Papers carry no roles, so this
        // leaks nothing; hasPicked alone is copied for the same reason.
        setGameState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            players: prev.players.map((p) => {
              const updated = state.players.find((np) => np.id === p.id);
              return updated ? { ...p, hasPicked: updated.hasPicked } : p;
            }),
            papers: state.papers,
          };
        });

        // The final slip claim never went through the PICKING→PICKING sound
        // branch above, so play it here for the last picker.
        playSound('pick');

        if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
        revealTimerRef.current = setTimeout(() => {
          revealTimerRef.current = null;
          setAnnouncement({ kind: 'reveal', nextState: state });
        }, REVEAL_DELAY_MS);
        return;
      }

      // During paper picking, play the slip sound whenever ANY player
      // claims a paper (own pick or another player's pick).
      const prev = gameStateRef.current;
      if (
        state.phase === GamePhase.PICKING &&
        (!prev || prev.phase === GamePhase.PICKING)
      ) {
        const alreadyPicked = new Set(
          (prev?.players ?? []).filter((p) => p.hasPicked).map((p) => p.id),
        );
        const someoneJustPicked = state.players.some(
          (p) => p.hasPicked && !alreadyPicked.has(p.id),
        );

        if (someoneJustPicked) {
          playSound('pick');
        }
      }

      setGameState(state);
    };

    const handleMyRole = (data: { role: GameRole; partnerThief?: { id: string; name: string; role: GameRole } }) => {
      // Always overwrite both values: if the server does not include a
      // partner (e.g. this player is Babu/Police now), any partner identity
      // left over from a previous round must be cleared, not kept.
      setMyRole(data.role);
      setPartnerThief(data.partnerThief);
    };

    const handleRolesRevealed = (data: {
      phase: GamePhase;
      players: { id: string; name: string; role?: GameRole | 'CHOR_OR_DAKAT' }[];
    }) => {
      // While the 1s reveal delay or the 3s reveal animation is still running,
      // this reveal must NOT touch the board: applying it now would make the
      // next state visible before the animation finishes. When the animation
      // ends, the announcement applies its own next state, which already
      // carries the masked roles, so nothing is lost by skipping this.
      // (A reconnected player with no animation still gets the merge below.)
      const isRevealPending =
        revealTimerRef.current !== null ||
        announcementRef.current?.kind === 'reveal';

      if (isRevealPending) {
        return;
      }

      // Only merge the reveal into a state that belongs to the current round.
      // Applying it on top of an older state (e.g. the last round's result,
      // which contains real Chor/Dakat roles) would flash stale thief roles
      // meant for the previous round onto this round's reveal screen.
      setGameState((prev) => {
        if (
          !prev ||
          (prev.phase !== GamePhase.PICKING &&
            prev.phase !== GamePhase.ROLE_REVEAL)
        )
          return prev;
        return {
          ...prev,
          phase: data.phase,
          players: prev.players.map((p) => {
            const revealed = data.players.find((rp) => rp.id === p.id);
            return {
              ...p,
              role: revealed?.role ?? p.role,
            };
          }),
        };
      });
    };

    const handlePoliceSelecting = (data: { selectedPlayerId?: string; autoConfirm?: boolean }) => {
      setPoliceAutoConfirm(Boolean(data.autoConfirm));
      setGameState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          selectedPlayerId: data.selectedPlayerId,
        };
      });
    };

    const handleTargetSelected = (data: {
      targetRole: GameRole.CHOR | GameRole.DAKAT;
      gameState: PublicGameState;
    }) => {
      // Everyone sees "Babu has spoken — Catch the X!" before the
      // guessing screen appears.
      setPoliceAutoConfirm(false);
      setAnnouncement({
        kind: 'king',
        targetRole: data.targetRole,
        nextState: data.gameState,
      });
    };

    const announceRoundOutcome = (result: PublicGameState) => {
      // The arrest resolved: remove the simulated Confirm-press.
      setPoliceAutoConfirm(false);
      setTimeLeft(undefined);

      // Caught or missed: the arrested player's role must match the target.
      const arrested = result.players.find((p) => p.id === result.selectedPlayerId);
      const caught =
        !!arrested?.role &&
        !!result.targetRole &&
        arrested.role === result.targetRole;

      setAnnouncement({
        kind: caught ? 'caught' : 'missed',
        targetRole: result.targetRole,
        nextState: result,
      });
    };

    const handleRoundResult = (data: { gameState: PublicGameState }) => {
      announceRoundOutcome(data.gameState);
    };

    const handleMatchEnded = (data: { gameState: PublicGameState }) => {
      announceRoundOutcome(data.gameState);
    };

    const handleTimerStarted = (data: { seconds: number }) => {
      setTimeLeft(data.seconds);
    };

    const handleGameAborted = (data: { message: string }) => {
      applyPaused([], true);
      setPoliceAutoConfirm(false);
      setGameState(null);
      setMyRole(undefined);
      setPartnerThief(undefined);
      setTimeLeft(undefined);
      cancelShuffle();
      cancelRevealDelay();
      setAnnouncement(null);
      setErrorMessage(data.message);
    };

    const handleBackToLobbyEvent = () => {
      applyPaused([], true);
      setGameState(null);
      setMyRole(undefined);
      setPartnerThief(undefined);
      setTimeLeft(undefined);
      cancelShuffle();
      cancelRevealDelay();
      setAnnouncement(null);
    };

    const handleGameError = (data: { message: string }) => {
      // Paper-claim races are handled on the board itself — the taken slip
      // shakes instead of alerting, so no toast for these.
      const msg = data.message?.toLowerCase() ?? '';
      if (
        msg.includes('already been selected') ||
        msg.includes('already picked')
      ) {
        return;
      }

      setErrorMessage(data.message);
      // No new round is coming anymore: let the player regain control.
      if (!pendingGameStateRef.current) {
        cancelShuffle();
      }
      cancelRevealDelay();
      setAnnouncement(null);
    };

    socket.on('room:created', handleRoomCreated);
    socket.on('room:joined', handleRoomJoined);
    socket.on('room:reconnected', handleRoomReconnected);
    socket.on('room:updated', handleRoomUpdated);
    socket.on('room:left', handleRoomLeft);
    socket.on('room:kicked', handleKicked);
    socket.on('room:player-removed', handlePlayerRemoved);
    socket.on('room:error', handleRoomError);
    socket.on('room:replaced', handleRoomReplaced);

    socket.on('game:resync', handleGameResync);
    socket.on('game:paused', handleGamePaused);
    socket.on('game:resumed', handleGameResumed);
    socket.on('game:started', handleGameStarted);
    socket.on('game:state-updated', handleGameStateUpdated);
    socket.on('game:my-role', handleMyRole);
    socket.on('game:roles-revealed', handleRolesRevealed);
    socket.on('game:police-selecting', handlePoliceSelecting);
    socket.on('game:target-selected', handleTargetSelected);
    socket.on('game:round-result', handleRoundResult);
    socket.on('game:match-ended', handleMatchEnded);
    socket.on('game:timer-started', handleTimerStarted);
    socket.on('game:error', handleGameError);
    socket.on('game:aborted', handleGameAborted);
    socket.on('game:back-to-lobby', handleBackToLobbyEvent);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('room:replaced', handleRoomReplaced);
      socket.off('game:resync', handleGameResync);
      socket.off('game:paused', handleGamePaused);
      socket.off('game:resumed', handleGameResumed);
      socket.off('room:created', handleRoomCreated);
      socket.off('room:joined', handleRoomJoined);
      socket.off('room:reconnected', handleRoomReconnected);
      socket.off('room:updated', handleRoomUpdated);
      socket.off('room:left', handleRoomLeft);
      socket.off('room:kicked', handleKicked);
      socket.off('room:player-removed', handlePlayerRemoved);
      socket.off('room:error', handleRoomError);
      socket.off('game:started', handleGameStarted);
      socket.off('game:state-updated', handleGameStateUpdated);
      socket.off('game:my-role', handleMyRole);
      socket.off('game:roles-revealed', handleRolesRevealed);
      socket.off('game:police-selecting', handlePoliceSelecting);
      socket.off('game:target-selected', handleTargetSelected);
      socket.off('game:round-result', handleRoundResult);
      socket.off('game:match-ended', handleMatchEnded);
      socket.off('game:timer-started', handleTimerStarted);
      socket.off('game:error', handleGameError);
      socket.off('game:aborted', handleGameAborted);
      socket.off('game:back-to-lobby', handleBackToLobbyEvent);
    };
    // Handlers read live values through refs, so they register exactly once.
    // (Re-registering on every currentUserId change used to re-send
    // room:reconnect from inside a live room.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from a locked screen / other tab: timers were throttled and events
  // may have been missed, so pull a fresh snapshot of the live game.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenFor = hiddenAtRef.current
        ? Date.now() - hiddenAtRef.current
        : 0;
      hiddenAtRef.current = null;

      const socket = getSocket();

      if (
        hiddenFor > 5000 &&
        socket.connected &&
        inRoomRef.current &&
        !replacedRef.current
      ) {
        socket.emit('game:sync');
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const isFrozen = !socketOnline || paused !== null || replaced;
  const gamePhase = gameState?.phase;

  // Soft ticking while the Police is deciding whom to arrest. The interval
  // restarts only when the phase itself changes (not on suspect-selection
  // state updates), and stops as soon as the arrest or a new phase lands.
  useEffect(() => {
    if (gamePhase !== GamePhase.GUESSING || isFrozen) return;

    let ticks = 0;

    const interval = setInterval(() => {
      ticks += 1;

      if (ticks > MAX_TICK_SOUND_TICKS) {
        return;
      }

      playSound('tick');
    }, 1000);

    return () => clearInterval(interval);
  }, [gamePhase, isFrozen]);

  // Turn timer countdown effect
  useEffect(() => {
    if (timeLeft === undefined || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Sound for each phase announcement: reveal jingle, king's command,
  // caught/missed round end. Plays on every player's own device.
  useEffect(() => {
    if (!announcement) return;
    playSound(ANNOUNCE_SOUNDS[announcement.kind]);
  }, [announcement]);

  // Play the Babu/Police announcement, then reveal the underlying screen
  // (round result or guessing phase) that arrived while it was playing.
  useEffect(() => {
    if (!announcement) return;
    const timer = setTimeout(() => {
      setGameState(announcement.nextState);
      setTimeLeft(undefined);
      setAnnouncement(null);
    }, ANNOUNCE_MS[announcement.kind]);
    return () => clearTimeout(timer);
  }, [announcement]);

  // Keep the shuffle animation on screen for SHUFFLE_MIN_MS, then apply the
  // new round state (PICKING) that arrived while it was playing.
  useEffect(() => {
    if (!pendingGameState) return;
    const start = shuffleStartRef.current ?? Date.now();
    const remaining = Math.max(0, SHUFFLE_MIN_MS - (Date.now() - start));
    const timer = setTimeout(() => {
      setGameState(pendingGameState);
      setMyRole(undefined);
      setPartnerThief(undefined);
      setTimeLeft(undefined);
      shuffleStartRef.current = null;
      setPendingGameState(null);
      setIsShuffling(false);
    }, remaining);
    return () => clearTimeout(timer);
  }, [pendingGameState]);

  // Safety net: if the server never confirms the new round (e.g. validation
  // error), drop the overlay so the UI does not stay blocked.
  useEffect(() => {
    if (!isShuffling || pendingGameState) return;
    const timer = setTimeout(() => cancelShuffle(), SHUFFLE_MAX_MS);
    return () => clearTimeout(timer);
  }, [isShuffling, pendingGameState, cancelShuffle]);

  const handleCreateRoom = (playerName: string) => {
    setLoading(true);
    setErrorMessage(null);
    getSocket().emit('room:create', { playerName });
  };

  const handleJoinRoom = (code: string, playerName: string) => {
    setLoading(true);
    setErrorMessage(null);
    getSocket().emit('room:join', { roomCode: code, playerName });
  };

  const handleLeaveRoom = () => {
    getSocket().emit('room:leave');
    setInRoom(false);
    setGameState(null);
    setMyRole(undefined);
    setPartnerThief(undefined);
    setTimeLeft(undefined);
    setHasSession(false);
    setSeatPin('');
    cancelShuffle();
    cancelRevealDelay();
    setAnnouncement(null);
    localStorage.removeItem('chor_roomCode');
    localStorage.removeItem('chor_token');
    localStorage.removeItem('chor_playerId');
    localStorage.removeItem('chor_seatPin');
  };

  // Host-only: release a seat that went dark so the room can continue.
  const handleKickPlayer = (playerId: string) => {
    getSocket().emit('room:kick', { playerId });
  };

  // Host-only: add a server-side bot that plays like a real player.
  const handleAddBot = (name?: string) => {
    setErrorMessage(null);
    getSocket().emit('room:add-bot', { name });
  };

  const handleStartGame = (settings?: GameSettings) => {
    triggerShuffle('Shuffling New Match...');
    getSocket().emit('game:start', { settings });
  };

  const handlePickPaper = (paperId: string) => {
    getSocket().emit('game:pick-paper', { paperId });
  };

  const handleSelectTarget = (targetRole: GameRole.CHOR | GameRole.DAKAT) => {
    getSocket().emit('game:select-target', { targetRole });
  };

  const handleGuessPlayer = (selectedPlayerId: string) => {
    getSocket().emit('game:guess-player', { selectedPlayerId });
  };

  const handlePoliceSelectSuspect = (selectedPlayerId: string) => {
    getSocket().emit('game:select-suspect', { selectedPlayerId });
  };

  const handleNextRound = () => {
    triggerShuffle('Shuffling Papers...');
    getSocket().emit('game:next-round');
  };

  const handleBackToLobby = () => {
    getSocket().emit('game:back-to-lobby');
  };

  // The replaced tab claims its seat back (the other tab then gets replaced).
  const handleTakeOver = () => {
    replacedRef.current = false;
    setReplaced(false);
    triggerReconnect();
  };

  const handleCancelRestore = () => {
    setRestoring(false);
    setLoading(false);
    reconnectPendingRef.current = false;
  };

  return (
    <div className="relative h-dvh overflow-hidden sm:min-h-screen sm:h-auto sm:overflow-auto bg-black font-sans antialiased text-slate-100 selection:bg-amber-500 selection:text-black">
      {/* Toast Alert */}
      {errorMessage && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div className="fixed top-[calc(1rem+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl">
          {notice}
        </div>
      )}

      {/* Main Views */}
      {!inRoom && restoring ? (
        <div className="h-dvh bg-black" />
      ) : !inRoom ? (
        <LobbyScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onReclaimSeat={handleReclaimSeat}
          onReconnect={triggerReconnect}
          hasActiveSession={hasSession}
          isLoading={loading}
          error={errorMessage}
        />
      ) : !gameState || gameState.phase === GamePhase.WAITING ? (
        <WaitingRoom
          roomCode={roomCode}
          playerName={
            players.find((p) => p.id === currentUserId)?.name ?? ''
          }
          seatPin={seatPin}
          players={players}
          currentUserId={currentUserId}
          isHost={isHost}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onKickPlayer={handleKickPlayer}
          onAddBot={handleAddBot}
        />
      ) : (
        <GameBoard
          key={gameState.roundNumber}
          gameState={gameState}
          myRole={myRole}
          partnerThief={partnerThief}
          currentUserId={currentUserId}
          isHost={isHost}
          timeLeft={timeLeft}
          onPickPaper={handlePickPaper}
          onSelectTarget={handleSelectTarget}
          onGuessPlayer={handleGuessPlayer}
          onPoliceSelectSuspect={handlePoliceSelectSuspect}
          onNextRound={handleNextRound}
          onBackToLobby={handleBackToLobby}
          onLeaveGame={handleLeaveRoom}
          policePressing={policeAutoConfirm}
        />
      )}

      {/* Floating Chat / Emote Component — shown only OUTSIDE a running
          match (i.e. in the waiting room). While the game board is up, chat
          lives in the desktop sidebar or the mobile drawer instead, so it is
          never rendered twice on one screen. */}
      {inRoom && !gameState && <Chat currentUserId={currentUserId} />}

      {/* Global sound effects mute/unmute toggle */}
      <SoundToggle />

      {/* Blocks the board whenever play cannot safely continue. Priority:
          seat taken over > this device offline > rejoining > waiting for
          another player to come back. */}
      {replaced ? (
        <ConnectionOverlay mode="replaced" onTakeOver={handleTakeOver} />
      ) : !socketOnline ? (
        <ConnectionOverlay mode="offline" wasInGame={Boolean(gameState)} />
      ) : !inRoom && restoring ? (
        <ConnectionOverlay mode="restoring" onCancel={handleCancelRestore} />
      ) : paused ? (
        <ConnectionOverlay
          mode="paused"
          waitingFor={paused}
          isHost={isHost}
          onRemovePlayer={handleKickPlayer}
        />
      ) : null}

      {/* Shuffle transition between rounds / starting a match */}
      <ShuffleOverlay isVisible={isShuffling} label={shuffleLabel} />

      {/* Role reveal / Babu's pick / Police caught / Police missed announcements */}
      {announcement && (
        <PhaseAnnouncementOverlay kind={announcement.kind} targetRole={announcement.targetRole} />
      )}
    </div>
  );
};

export default App;
