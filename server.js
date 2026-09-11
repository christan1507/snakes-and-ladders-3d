const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const resolved = path.resolve(ROOT, '.' + path.posix.normalize(urlPath));
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(resolved).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
});

const rooms = new Map();

function send(ws, obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

function sanitizeName(name) {
  const n = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 16);
  return n || 'Player';
}

function makeCode() {
  let code;
  do {
    code = String(1000 + Math.floor(Math.random() * 9000));
  } while (rooms.has(code));
  return code;
}

function createPlayer(ws, slot, name) {
  return { ws, slot, name: sanitizeName(name), pos: 0, connected: true };
}

function publicState(room) {
  return {
    code: room.code,
    seq: room.seq,
    players: room.players.map((p) => ({ slot: p.slot, name: p.name, pos: p.pos, connected: p.connected })),
    turn: room.turn,
    dice: room.dice,
    winner: room.winner,
    lastMove: room.lastMove,
    started: room.players.filter((p) => p.connected).length === 2 && room.players.length === 2
  };
}

function broadcastState(room) {
  const msg = JSON.stringify({ type: 'state', state: publicState(room) });
  for (const p of room.players) {
    if (p.ws && p.ws.readyState === 1) p.ws.send(msg);
  }
}

function onCreate(ws, msg) {
  const code = makeCode();
  const room = { code, players: [], turn: 0, dice: null, winner: null, lastMove: null, seq: 0 };
  const p = createPlayer(ws, 0, msg.name);
  room.players.push(p);
  rooms.set(code, room);
  ws._room = room;
  ws._slot = 0;
  send(ws, { type: 'joined', slot: 0, code, name: p.name });
  broadcastState(room);
}

function onJoin(ws, msg) {
  const code = String(msg.code || '').trim();
  const room = rooms.get(code);
  if (!room) return send(ws, { type: 'error', message: 'Room not found. Check the code.' });

  let slot = room.players.findIndex((p) => !p.connected);
  if (slot === -1) {
    if (room.players.length >= 2) return send(ws, { type: 'error', message: 'Room is full.' });
    slot = room.players.length;
  }

  const p = createPlayer(ws, slot, msg.name);
  room.players[slot] = p;
  ws._room = room;
  ws._slot = slot;
  send(ws, { type: 'joined', slot, code: room.code, name: p.name });
  broadcastState(room);
}

function onRoll(ws) {
  const room = ws._room;
  if (!room) return;
  const slot = ws._slot;

  if (room.winner !== null) return send(ws, { type: 'error', message: 'Game is over. Start a rematch.' });
  if (room.players.length < 2 || room.players.some((p) => !p.connected)) {
    return send(ws, { type: 'error', message: 'Waiting for the other player to join.' });
  }
  if (room.turn !== slot) return send(ws, { type: 'error', message: 'Not your turn.' });

  const value = 1 + Math.floor(Math.random() * 6);
  const player = room.players[slot];
  const from = player.pos;

  let landing = from;
  if (from + value <= 100) landing = from + value;

  let to = landing;
  let via = null;
  if (LADDERS[landing]) {
    to = LADDERS[landing];
    via = 'ladder';
  } else if (SNAKES[landing]) {
    to = SNAKES[landing];
    via = 'snake';
  }

  player.pos = to;
  room.dice = value;
  room.seq += 1;
  room.lastMove = { slot, from, value, landing, to, via };

  if (to === 100) {
    room.winner = slot;
  } else {
    room.turn = 1 - room.turn;
  }

  broadcastState(room);
}

function onRematch(ws) {
  const room = ws._room;
  if (!room) return;
  for (const p of room.players) p.pos = 0;
  room.turn = 0;
  room.dice = null;
  room.winner = null;
  room.lastMove = null;
  room.seq += 1;
  broadcastState(room);
}

function onClose(ws) {
  const room = ws._room;
  if (!room) return;
  const player = room.players.find((p) => p.ws === ws);
  if (player) {
    player.connected = false;
    player.ws = null;
  }
  broadcastState(room);

  if (room.players.every((p) => !p.connected)) {
    setTimeout(() => {
      const r = rooms.get(room.code);
      if (r && r.players.every((p) => !p.connected)) rooms.delete(room.code);
    }, 60_000);
  }
}

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    switch (msg.type) {
      case 'create':
        return onCreate(ws, msg);
      case 'join':
        return onJoin(ws, msg);
      case 'roll':
        return onRoll(ws);
      case 'rematch':
        return onRematch(ws);
      default:
        return;
    }
  });

  ws.on('close', () => onClose(ws));
  ws.on('error', () => {});
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30_000);

wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => {
  console.log(`Snakes & Ladders 3D running at http://localhost:${PORT}`);
});
