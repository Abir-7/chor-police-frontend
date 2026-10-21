# Chor – Police – Dakat

A real-time multiplayer web version of the classic Bengali party game **Chor–Dakat** (literally *thief–bandit*). Players join a room with a 6-digit code, secretly draw paper slips to get a role, and the Police has to catch the thief or bandit that the **Babu** points at.

**▶ Live game: [chor-police-dakat.netlify.app](https://chor-police-dakat.netlify.app)**

> The backend lives in [`../chor-dakat-backend`](../chor-dakat-backend) (NestJS + Socket.IO). This repo is the React client only.

---

## Features

- **Rooms** — create a room or join with a 6-digit code; up to 8 players per room.
- **Live lobby** — player list updates in real time, host transfers automatically if the host leaves.
- **Secret paper slips** — every round the slips are shuffled and each player picks one; each slip carries a permanent icon (🐴 🍬 🎈 🍕 ⚓ 🌵 🌮 🧸) so everyone sees the same slip.
- **Animated reveals** — shuffle overlay, card-opening reveal, and full-screen phase announcements ("Babu has spoken", "Caught!", "Missed!").
- **Role hand-outs** — your private role card, plus a masked "Suspect" card for everyone who isn't Chor/Dakat.
- **Live scoreboard** — round-by-round score table, winner celebration with confetti.
- **Chat & emoji reactions** — in-game chat drawer with unread badge and floating reactions.
- **Match settings** — the host sets the match length: 3, 5, 10 rounds or a custom value up to 50.
- **Disconnect recovery** — your seat is held for 2 minutes after a dropped connection and resumes automatically. A 4-digit **Rejoin PIN** is shown in the lobby so you can reclaim the same seat from another browser.
- **Cold-start friendly** — a "waking up the server" screen with retry handling, because the backend may sleep on a free tier.

## How a match plays out

1. **Lobby** — the host creates a room and shares the 6-digit code; 4–8 players are needed to start.
2. **Picking** — every player takes one shuffled paper slip. Anyone who doesn't pick in time gets a slip auto-assigned.
3. **Role reveal** — cards open. Chor and Dakat stay masked as *Suspect*; everyone else is revealed.
4. **Babu's command** — the Babu picks which thief the Police must hunt: **Chor** or **Dakat**.
5. **Guessing** — the Police picks one suspect. A correct guess catches the target; a wrong guess costs the Police its points for the round.
6. **Scoring** — everyone earns their role's base points; the caught target and a wrong-guessing Police get 0 for the round. The match ends after the configured number of rounds (the backend also supports an optional target score).
7. **Next round** — the host (or an authorized player) shuffles again, and the game returns everyone to the lobby at the end.

## Roles & points

| Role | Title | Points per round |
| --- | --- | --- |
| `RAJA` | Babu | 1000 |
| `POLICE` | Police | 800 (0 on a wrong guess) |
| `CHOR` | Thief | 500 (0 if caught) |
| `DAKAT` | Bandit | 400 (0 if caught) |
| `JHARUDAR` | Sweeper | 200 |
| `CLEANER` | Cleaner | 200 |
| `PAGOL` | Madman | 50 |
| `CHAGOL` | Goat | 100 |

Roles scale with the number of players: 4 → Babu, Police, Chor, Dakat · 5 → + Jharudar · 6 → + Cleaner · 7 → + Pagol · 8 → + Chagol.

## Tech stack

- **React 19** + **TypeScript**
- **Vite 8** for dev server and production build
- **Tailwind CSS 4** (via `@tailwindcss/vite`) for the dark amber/slate theme
- **socket.io-client 4** for all real-time traffic
- **lucide-react** icons and **canvas-confetti** celebrations
- **Oxlint** for linting

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Start the backend separately (`cd ../chor-dakat-backend && npm run start:dev`) so the client can connect.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Oxlint over `src/` |

### Configuration

The backend URL comes from a Vite env var, read in `src/socket.ts`:

```bash
# .env
VITE_BACKEND_URL=https://chor-dakat-backend.onrender.com
```

If unset it falls back to `http://localhost:3000`. Point it at your own backend for local development.

## Project structure

```
src/
├── App.tsx                  # Socket lifecycle + screen routing (lobby / waiting room / game)
├── socket.ts                # Single shared socket.io client, endless reconnection
├── types.ts                 # Shared types: GameRole, GamePhase, room/game state
├── index.css                # Tailwind entry + announcement/overlay animations
└── components/
    ├── ServerStatusGate.tsx     # "Waking up the server" screen for cold starts
    ├── LobbyScreen.tsx          # Create / Join / Rejoin tabs
    ├── WaitingRoom.tsx          # Room code, Rejoin PIN, player list, match settings
    ├── GameBoard.tsx            # Picking, reveal, Babu's command, guessing, results
    ├── RoleCard.tsx             # Role cards and their titles/points
    ├── PhaseAnnouncementOverlay.tsx
    ├── ShuffleOverlay.tsx
    ├── ScoreboardModal.tsx
    └── Chat.tsx                 # Chat drawer + emoji reactions
```

## Deployment

The production build is a static bundle — `npm run build` and publish `dist/`. The live game runs on Netlify at **[chor-police-dakat.netlify.app](https://chor-police-dakat.netlify.app)**; set `VITE_BACKEND_URL` in the deploy environment before building, and redeploy the backend whenever role/socket payloads change.
