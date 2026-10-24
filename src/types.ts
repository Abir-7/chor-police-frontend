export enum GameRole {
  RAJA = 'RAJA',
  POLICE = 'POLICE',
  CHOR = 'CHOR',
  DAKAT = 'DAKAT',
  JHARUDAR = 'JHARUDAR',
  CLEANER = 'CLEANER',
  PAGOL = 'PAGOL',
  CHAGOL = 'CHAGOL',
}

export enum GamePhase {
  WAITING = 'WAITING',
  PICKING = 'PICKING',
  ROLE_REVEAL = 'ROLE_REVEAL',
  GUESSING = 'GUESSING',
  ROUND_RESULT = 'ROUND_RESULT',
  GAME_OVER = 'GAME_OVER',
}

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  isConnected: boolean;
  /** True when this seat is a server-side bot added by the host. */
  isBot?: boolean;
}

export interface GamePlayer {
  id: string;
  name: string;
  role?: GameRole | 'CHOR_OR_DAKAT';
  hasPicked: boolean;
  score: number;
  roundScore: number;
  isBot?: boolean;
}

export interface GamePaper {
  id: string;
  /** Identity icon permanently pinned to this exact paper. */
  icon: string;
  /** Set once a player has claimed this paper. */
  selectedBy?: string;
}

export interface GameSettings {
  targetScore?: number;
  maxRounds?: number;
}

/** Points each player earned in a single finished round. */
export interface RoundRecord {
  roundNumber: number;
  scores: { playerId: string; points: number }[];
}

export interface PublicGameState {
  roomCode: string;
  phase: GamePhase;
  roundNumber: number;
  history?: RoundRecord[];
  targetRole?: GameRole.CHOR | GameRole.DAKAT;
  selectedPlayerId?: string;
  settings?: GameSettings;
  winnerPlayerId?: string;
  players: GamePlayer[];
  papers: GamePaper[];
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
}

export interface ChatReaction {
  senderId: string;
  senderName: string;
  reaction: string;
  timestamp: string;
}

/** A human whose seat is held open while the round is frozen. */
export interface DisconnectedPlayer {
  id: string;
  name: string;
  /** Milliseconds until the seat is released (server-relative). */
  remainingMs: number | null;
}
