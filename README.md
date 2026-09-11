# Snakes & Ladders 3D — Online

A 3D two-player Snakes and Ladders game you can play online with a friend. Built with [Three.js](https://threejs.org/) on the client and a small Node.js WebSocket server that owns all game state.

![stack](https://img.shields.io/badge/Three.js-0.160-000?logo=threedotjs) ![stack](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Online multiplayer** — share a 4-digit room code (or link) and play from two devices.
- **Server-authoritative** — the server rolls the dice and validates every move, so the two clients can't drift out of sync.
- **Full 3D board** — raised tiles, `TubeGeometry` snakes with heads and eyes, 3D ladders, glowing player tokens, and a tumbling pip die.
- **Animated moves** — tokens hop tile-by-tile, climb ladders, and slide down snakes; the die physically rolls to the result.
- **Rematch & disconnect handling** — replay instantly; the opponent is notified if someone leaves.

## Requirements

- Node.js 18 or newer (tested on 24)
- A browser with WebGL. The client loads Three.js from a CDN, so it needs internet access.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000> in **two** browser windows (or two devices on the same network via `http://<your-ip>:3000`).

1. Both players enter a name.
2. Player 1 clicks **Create Game** and shares the 4-digit code (or **Copy link**).
3. Player 2 enters the code and clicks **Join**.
4. On your turn, click **Roll Dice**. First to land exactly on tile 100 wins.

The port can be overridden with the `PORT` environment variable:

```bash
PORT=8080 npm start
```

## Deploy

The server is a plain Node HTTP + WebSocket process, so it runs on any Node host. Set the `PORT` env var if the platform provides one (most do automatically).

| Platform | Notes |
|---|---|
| [Render](https://render.com) | New **Web Service** → build `npm install`, start `npm start`. |
| [Railway](https://railway.app) | Deploy the repo; start command `npm start`. |
| [Fly.io](https://fly.io) | `fly launch` with an internal port of `3000`. |

Because the client connects to the same origin over `ws://`/`wss://`, no extra configuration is needed — TLS (`wss`) is used automatically when the page is served over HTTPS.

## How to play

- Roll a 1–6 and move forward that many tiles.
- Landing at the foot of a **ladder** climbs you up; landing on a **snake's head** slides you down.
- You must land **exactly** on 100 to win — a roll that would overshoot is wasted.
- Turns alternate; a rematch resets both players to the start.

## Project structure

```
snakes-and-ladders/
├── server.js     # HTTP static server + WebSocket room/relay, authoritative game logic
├── index.html    # Lobby + HUD markup, styles, and the Three.js import map
├── client.js     # Three.js scene (board, snakes, ladders, tokens, die) + networking
└── package.json
```

## WebSocket protocol

Messages are JSON, exchanged over a single socket per player.

**Client → server**

| Message | Description |
|---|---|
| `{ type: "create", name }` | Create a room; server replies with `joined` (slot 0). |
| `{ type: "join", code, name }` | Join a room by code (slot 1). |
| `{ type: "roll" }` | Roll the die (only allowed on your turn). |
| `{ type: "rematch" }` | Reset a finished game. |

**Server → client**

| Message | Description |
|---|---|
| `{ type: "joined", slot, code, name }` | You were placed in a room. |
| `{ type: "state", state }` | Full game snapshot after any change. |
| `{ type: "error", message }` | Action rejected (not your turn, room full, etc.). |

A `state` snapshot contains `players[{ slot, name, pos, connected }]`, `turn`, `dice`, `winner`, `seq`, and the `lastMove` (`{ slot, from, value, landing, to, via }`) used to drive animations.

## License

MIT
