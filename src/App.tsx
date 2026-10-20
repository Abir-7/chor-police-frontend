import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './socket';
import {
  GamePhase,
  GameRole,
  PublicGameState,
  RoomPlayer,
  GameSettings,
} from './types';
import { LobbyScreen } from './components/LobbyScreen';
import { WaitingRoom } from './components/WaitingRoom';
import { GameBoard } from './components/GameBoard';
import { Chat } from './components/Chat';
import { ShuffleOverlay } from './components/ShuffleOverlay';
import { PhaseAnnouncementOverlay } from './components/PhaseAnnouncementOverlay';

// Minimum time the shuffle animation stays on screen, even if the server
// responds faster, so every player sees the riffle.
const SHUFFLE_MIN_MS = 2000;
// Safety timeout: if the server never confirms the new round, drop the overlay.
const SHUFFLE_MAX_MS = 5000;

// How long each phase announcement animation stays on screen before the
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

type Announcement = {
  kind: 'reveal' | 'king' | 'caught' | 'missed';
  targetRole?: GameRole.CHOR | GameRole.DAKAT;
  nextState: PublicGameState;
};

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
  const announcementRef = useRef<Announcement | null>(null);

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

    const handleConnect = () => {
      // Auto-reconnect if we have a session saved
      const savedRoomCode = localStorage.getItem('chor_roomCode');
      const savedToken = localStorage.getItem('chor_token');

      if (savedRoomCode && savedToken) {
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

    const handleRoomUpdated = (data: { roomCode: string; players: RoomPlayer[] }) => {
      setPlayers(data.players);
      const me = data.players.find((p) => p.id === currentUserId);
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
      setAnnouncement(null);
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
      if (inRoom && data.message?.toLowerCase().includes('already in a room')) {
        return;
      }
      setErrorMessage(data.message);
      setLoading(false);

      // If reconnect token is invalid/expired, wipe it so the lobby offers a
      // fresh join instead of a reconnect that can never succeed.
      if (
        data.message?.toLowerCase().includes('token') ||
        data.message?.toLowerCase().includes('not found')
      ) {
        setHasSession(false);
        clearSession();
      }
    };

    // Game Events
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
      // Everyone has picked a paper: play the card-opening reveal animation
      // before showing the revealed roles.
      if (
        gameStateRef.current?.phase === GamePhase.PICKING &&
        state.phase === GamePhase.ROLE_REVEAL
      ) {
        setAnnouncement({ kind: 'reveal', nextState: state });
        return;
      }
      setGameState(state);
    };

    const handleMyRole = (data: { role: GameRole; partnerThief?: { id: string; name: string; role: GameRole } }) => {
      // Always overwrite both values: if the server does not include a
      // partner (e.g. this player is Raja/Police now), any partner identity
      // left over from a previous round must be cleared, not kept.
      setMyRole(data.role);
      setPartnerThief(data.partnerThief);
    };

    const handleRolesRevealed = (data: {
      phase: GamePhase;
      players: { id: string; name: string; role?: GameRole | 'CHOR_OR_DAKAT' }[];
    }) => {
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

    const handlePoliceSelecting = (data: { selectedPlayerId?: string }) => {
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
      // Everyone sees "The King has spoken — Catch the X!" before the
      // guessing screen appears.
      setAnnouncement({
        kind: 'king',
        targetRole: data.targetRole,
        nextState: data.gameState,
      });
    };

    const announceRoundOutcome = (result: PublicGameState) => {
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
      setGameState(null);
      setMyRole(undefined);
      setPartnerThief(undefined);
      setTimeLeft(undefined);
      cancelShuffle();
      setAnnouncement(null);
      setErrorMessage(data.message);
    };

    const handleBackToLobbyEvent = () => {
      setGameState(null);
      setMyRole(undefined);
      setPartnerThief(undefined);
      setTimeLeft(undefined);
      cancelShuffle();
      setAnnouncement(null);
    };

    const handleGameError = (data: { message: string }) => {
      setErrorMessage(data.message);
      // No new round is coming anymore: let the player regain control.
      if (!pendingGameStateRef.current) {
        cancelShuffle();
      }
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
  }, [currentUserId]);

  // Turn timer countdown effect
  useEffect(() => {
    if (timeLeft === undefined || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

  // Play the King/Police announcement, then reveal the underlying screen
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

  return (
    <div className="relative min-h-screen bg-black font-sans antialiased text-slate-100 selection:bg-amber-500 selection:text-black">
      {/* Toast Alert */}
      {errorMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="hover:opacity-75 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Views */}
      {!inRoom ? (
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
        />
      )}

      {/* Floating Chat / Emote Component */}
      {inRoom && <Chat currentUserId={currentUserId} />}

      {/* Shuffle transition between rounds / starting a match */}
      <ShuffleOverlay isVisible={isShuffling} label={shuffleLabel} />

      {/* Role reveal / King's pick / Police caught / Police missed announcements */}
      {announcement && (
        <PhaseAnnouncementOverlay kind={announcement.kind} targetRole={announcement.targetRole} />
      )}
    </div>
  );
};

export default App;
