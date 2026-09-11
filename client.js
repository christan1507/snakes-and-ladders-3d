import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---------------------------------------------------------------- constants
const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const PLAYER_HEX = ['#22d3ee', '#f472b6'];
const PLAYER_NUM = [0x22d3ee, 0xf472b6];
const TOKEN_Y = 0.06;
const DIE_Y = 0.65;
const TILE = 1;

// ---------------------------------------------------------------- scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07070f);
scene.fog = new THREE.Fog(0x07070f, 24, 46);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 12.5, 13.5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('scene').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 9;
controls.maxDistance = 30;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = Math.PI * 0.46;
controls.update();

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x14142a, 0.75));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(7, 16, 9);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -10;
keyLight.shadow.camera.right = 10;
keyLight.shadow.camera.top = 10;
keyLight.shadow.camera.bottom = -10;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 45;
keyLight.shadow.bias = -0.0004;
scene.add(keyLight);

const rimA = new THREE.PointLight(0x6366f1, 90, 45);
rimA.position.set(-9, 9, -9);
scene.add(rimA);

const rimB = new THREE.PointLight(0xec4899, 70, 45);
rimB.position.set(9, 7, -7);
scene.add(rimB);

// ---------------------------------------------------------------- helpers
function tileToWorld(n) {
  const idx = n - 1;
  const row = Math.floor(idx / 10);
  const c = idx % 10;
  const col = row % 2 === 0 ? c : 9 - c;
  return new THREE.Vector3((col - 4.5) * TILE, 0, (4.5 - row) * TILE);
}

function wp(n, slot) {
  const base = n <= 0 ? new THREE.Vector3(-5.35, 0, 5.35) : tileToWorld(n);
  const off = slot === 0 ? -0.16 : 0.16;
  return new THREE.Vector3(base.x + off, TOKEN_Y, base.z + off);
}

// ---------------------------------------------------------------- board
const board = new THREE.Group();
scene.add(board);

const base = new THREE.Mesh(
  new THREE.BoxGeometry(10.6, 0.4, 10.6),
  new THREE.MeshStandardMaterial({ color: 0x12122a, roughness: 0.55, metalness: 0.55 })
);
base.position.y = -0.22;
base.receiveShadow = true;
base.castShadow = true;
board.add(base);

const edge = new THREE.Mesh(
  new THREE.BoxGeometry(10.7, 0.09, 10.7),
  new THREE.MeshStandardMaterial({ color: 0x818cf8, emissive: 0x6366f1, emissiveIntensity: 1.1, roughness: 0.3 })
);
edge.position.y = -0.02;
board.add(edge);

function makeTileTexture(n, dark) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');

  let bg = dark ? '#232347' : '#2e2e5c';
  if (n === 1) bg = '#14532d';
  if (n === 100) bg = '#78350f';
  g.fillStyle = bg;
  g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.07)';
  g.lineWidth = 5;
  g.strokeRect(2.5, 2.5, s - 5, s - 5);

  g.fillStyle = n === 100 ? '#fde68a' : 'rgba(255,255,255,0.62)';
  g.font = `700 ${s * 0.34}px 'Segoe UI', system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), s / 2, s * 0.55);

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

const tileGeo = new THREE.PlaneGeometry(TILE * 0.94, TILE * 0.94);
for (let n = 1; n <= 100; n++) {
  const row = Math.floor((n - 1) / 10);
  const mat = new THREE.MeshStandardMaterial({
    map: makeTileTexture(n, (n + row) % 2 === 0),
    roughness: 0.75,
    metalness: 0.05
  });
  const tile = new THREE.Mesh(tileGeo, mat);
  tile.rotation.x = -Math.PI / 2;
  const p = tileToWorld(n);
  tile.position.set(p.x, 0.02, p.z);
  tile.receiveShadow = true;
  board.add(tile);
}

// ladders
const ladderMat = new THREE.MeshStandardMaterial({
  color: 0xfbbf24,
  emissive: 0xb45309,
  emissiveIntensity: 0.55,
  roughness: 0.35,
  metalness: 0.4
});
for (const [from, to] of Object.entries(LADDERS)) {
  const start = tileToWorld(Number(from));
  const end = tileToWorld(Number(to));
  const d = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const L = d.length();
  const group = new THREE.Group();
  group.position.set(start.x, 0.1, start.z);
  group.rotation.y = Math.atan2(-d.z, d.x);

  const railGeo = new THREE.BoxGeometry(L, 0.07, 0.07);
  const rail1 = new THREE.Mesh(railGeo, ladderMat);
  rail1.position.set(L / 2, 0.14, -0.22);
  rail1.castShadow = true;
  const rail2 = rail1.clone();
  rail2.position.z = 0.22;
  group.add(rail1, rail2);

  const rungCount = Math.max(2, Math.round(L / 0.42));
  const rungGeo = new THREE.BoxGeometry(0.07, 0.06, 0.5);
  for (let i = 0; i <= rungCount; i++) {
    const rung = new THREE.Mesh(rungGeo, ladderMat);
    rung.position.set((i / rungCount) * L, 0.14, 0);
    rung.castShadow = true;
    group.add(rung);
  }
  board.add(group);
}

// snakes
const snakeCurves = {};
const snakeBodyMat = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  emissive: 0x065f46,
  emissiveIntensity: 0.7,
  roughness: 0.4,
  metalness: 0.25
});
const snakeHeadMat = new THREE.MeshStandardMaterial({
  color: 0x4ade80,
  emissive: 0x15803d,
  emissiveIntensity: 0.9,
  roughness: 0.35,
  metalness: 0.3
});
for (const [from, to] of Object.entries(SNAKES)) {
  const start = tileToWorld(Number(from));
  const end = tileToWorld(Number(to));
  const dir = new THREE.Vector3(end.x - start.x, 0, end.z - start.z);
  const len = dir.length();
  const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
  const amp = Math.min(1.3, len * 0.2);

  const pts = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = start.clone().lerp(end, t);
    p.addScaledVector(perp, Math.sin(t * Math.PI * 2) * amp);
    p.y = 0.16 + Math.sin(t * Math.PI) * 0.22;
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  snakeCurves[Number(from)] = curve;

  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.13, 12, false), snakeBodyMat);
  tube.castShadow = true;
  board.add(tube);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), snakeHeadMat);
  head.position.copy(curve.getPoint(0));
  head.castShadow = true;
  board.add(head);

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 12), snakeHeadMat);
  const tailP = curve.getPoint(1);
  const before = curve.getPoint(0.97);
  tail.position.copy(tailP);
  tail.lookAt(before);
  tail.rotateX(Math.PI / 2);
  board.add(tail);

  for (const side of [1, -1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x111827, emissive: 0x000000 })
    );
    eye.position.copy(head.position).add(new THREE.Vector3(0.12 * side, 0.1, 0.12));
    board.add(eye);
  }
}

// ground + stars
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(40, 64),
  new THREE.MeshStandardMaterial({ color: 0x0b0b18, roughness: 1, metalness: 0 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.44;
ground.receiveShadow = true;
scene.add(ground);

{
  const count = 700;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 40 + Math.random() * 60;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    positions[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
    positions[i * 3 + 1] = Math.sin(phi) * r * 0.7 + 4;
    positions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(
    new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x9fb4ff, size: 0.42, transparent: true, opacity: 0.65, depthWrite: false })
    )
  );
}

// ---------------------------------------------------------------- tokens
function makeToken(color) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.4,
    roughness: 0.22,
    metalness: 0.5
  });
  const baseM = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.12, 28), mat);
  baseM.position.y = 0.06;
  baseM.castShadow = true;
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.52, 28), mat);
  body.position.y = 0.38;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 22, 22), mat);
  head.position.y = 0.7;
  head.castShadow = true;
  g.add(baseM, body, head);

  const glow = new THREE.PointLight(color, 6, 3.2);
  glow.position.y = 0.9;
  g.add(glow);
  return g;
}

const tokens = [makeToken(PLAYER_NUM[0]), makeToken(PLAYER_NUM[1])];
tokens[0].position.copy(wp(0, 0));
tokens[1].position.copy(wp(0, 1));
board.add(tokens[0], tokens[1]);

// ---------------------------------------------------------------- dice
function pipTexture(n) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  g.fillStyle = '#f4f4f8';
  g.fillRect(0, 0, s, s);
  g.fillStyle = '#12122a';
  const r = s * 0.095;
  const layout = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
    6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]]
  }[n];
  for (const [x, y] of layout) {
    g.beginPath();
    g.arc(x * s, y * s, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  return tex;
}

const dieMats = [1, 6, 2, 5, 3, 4].map(
  (v) => new THREE.MeshStandardMaterial({ map: pipTexture(v), roughness: 0.35, metalness: 0.05 })
);
const die = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), dieMats);
die.position.set(6.1, DIE_Y, 5.3);
die.castShadow = true;
scene.add(die);

const DIE_ROT = {
  1: new THREE.Euler(0, 0, Math.PI / 2),
  6: new THREE.Euler(0, 0, -Math.PI / 2),
  2: new THREE.Euler(0, 0, 0),
  5: new THREE.Euler(0, 0, Math.PI),
  3: new THREE.Euler(-Math.PI / 2, 0, 0),
  4: new THREE.Euler(Math.PI / 2, 0, 0)
};

let dieAnim = null;
function rollDie(value) {
  const target = new THREE.Quaternion().setFromEuler(DIE_ROT[value]);
  const start = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)
  );
  die.quaternion.copy(start);
  dieAnim = { t: 0, dur: 0.9, q0: start, q1: target };
}
function resetDie() {
  die.quaternion.setFromEuler(DIE_ROT[2]);
  die.position.y = DIE_Y;
  dieAnim = null;
}
function updateDie(dt) {
  if (!dieAnim) return;
  dieAnim.t += dt;
  const t = Math.min(1, dieAnim.t / dieAnim.dur);
  const e = t * t * (3 - 2 * t);
  die.quaternion.slerpQuaternions(dieAnim.q0, dieAnim.q1, e);
  die.position.y = DIE_Y + Math.sin(t * Math.PI) * 1.3;
  if (t >= 1) {
    die.quaternion.copy(dieAnim.q1);
    die.position.y = DIE_Y;
    dieAnim = null;
  }
}
resetDie();

// ---------------------------------------------------------------- journeys
const journeys = {};

function buildJourney(move) {
  const { slot, from, landing, to, via } = move;
  const segs = [];

  if (landing === from) {
    const spot = wp(from, slot);
    segs.push({ from: spot, to: spot, kind: 'step', duration: 0.4 });
    return segs;
  }

  for (let n = from + 1; n <= landing; n++) {
    segs.push({ from: wp(n - 1, slot), to: wp(n, slot), kind: 'step', duration: 0.16 });
  }

  if (via === 'ladder') {
    segs.push({ from: wp(landing, slot), to: wp(to, slot), kind: 'ladder', duration: 0.55 });
  } else if (via === 'snake') {
    const curve = snakeCurves[landing];
    if (curve) {
      segs.push({ from: wp(landing, slot), to: wp(to, slot), kind: 'snake', duration: 0.85, curve, slot });
    } else {
      segs.push({ from: wp(landing, slot), to: wp(to, slot), kind: 'ladder', duration: 0.7 });
    }
  }
  return segs;
}

function startJourney(slot, segs) {
  journeys[slot] = { segs, index: 0, t: 0 };
}

function updateJourney(slot, dt) {
  const j = journeys[slot];
  if (!j) return;
  const seg = j.segs[j.index];
  j.t += dt / seg.duration;

  if (j.t >= 1) {
    tokens[slot].position.copy(seg.to);
    j.index += 1;
    j.t = 0;
    if (j.index >= j.segs.length) delete journeys[slot];
    return;
  }

  let p;
  if (seg.kind === 'snake' && seg.curve) {
    p = seg.curve.getPoint(j.t);
    const off = seg.slot === 0 ? -0.16 : 0.16;
    p = new THREE.Vector3(p.x + off, Math.max(0.2, p.y), p.z + off);
  } else {
    p = seg.from.clone().lerp(seg.to, j.t);
    if (seg.kind === 'step') p.y = TOKEN_Y + Math.sin(j.t * Math.PI) * 0.42;
    else if (seg.kind === 'ladder') p.y = TOKEN_Y + Math.sin(j.t * Math.PI) * 0.6;
  }
  tokens[slot].position.copy(p);
}

function busy() {
  return Object.keys(journeys).length > 0 || dieAnim !== null;
}

// ---------------------------------------------------------------- networking
const els = {
  lobby: document.getElementById('lobby'),
  lobbyError: document.getElementById('lobbyError'),
  hud: document.getElementById('hud'),
  players: document.getElementById('players'),
  turnBanner: document.getElementById('turnBanner'),
  rollBtn: document.getElementById('rollBtn'),
  roomCode: document.getElementById('roomCode'),
  copyBtn: document.getElementById('copyBtn'),
  status: document.getElementById('status'),
  winner: document.getElementById('winner'),
  winnerName: document.getElementById('winnerName'),
  rematchBtn: document.getElementById('rematchBtn'),
  toast: document.getElementById('toast'),
  nameInput: document.getElementById('nameInput'),
  codeInput: document.getElementById('codeInput'),
  createBtn: document.getElementById('createBtn'),
  joinBtn: document.getElementById('joinBtn')
};

let ws = null;
let mySlot = null;
let lastSeq = -1;
let gameState = null;

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

function setStatus(text, live) {
  els.status.innerHTML = live ? `<span class="live">●</span> ${text}` : text;
}

function connect() {
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://';
  ws = new WebSocket(proto + location.host);

  ws.addEventListener('open', () => setStatus('Connected', true));
  ws.addEventListener('close', () => {
    setStatus('Disconnected — refresh to reconnect', false);
    if (!els.hud.classList.contains('hidden')) toast('Connection lost');
  });
  ws.addEventListener('error', () => setStatus('Connection error', false));
  ws.addEventListener('message', (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleMessage(msg);
  });
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function handleMessage(msg) {
  if (msg.type === 'joined') {
    mySlot = msg.slot;
    lastSeq = -1;
    els.lobby.classList.add('hidden');
    els.hud.classList.remove('hidden');
    setStatus('Connected', true);
    return;
  }
  if (msg.type === 'error') {
    if (!els.lobby.classList.contains('hidden')) els.lobbyError.textContent = msg.message;
    else toast(msg.message);
    return;
  }
  if (msg.type === 'state') {
    applyState(msg.state);
  }
}

function applyState(s) {
  gameState = s;
  els.roomCode.textContent = s.code;

  const newSeq = s.seq !== lastSeq;
  lastSeq = s.seq;

  if (newSeq) {
    if (s.lastMove) {
      startJourney(s.lastMove.slot, buildJourney(s.lastMove));
      rollDie(s.lastMove.value);
    } else {
      resetTokens(s);
      resetDie();
    }
  } else if (!busy()) {
    for (const p of s.players) tokens[p.slot].position.copy(wp(p.pos, p.slot));
  }

  renderPlayers(s);
  updateHud(s);
}

function resetTokens(s) {
  for (const k of Object.keys(journeys)) delete journeys[k];
  for (const p of s.players) tokens[p.slot].position.copy(wp(p.pos, p.slot));
  tokens[0].position.copy(wp(0, 0));
  tokens[1].position.copy(wp(0, 1));
}

function renderPlayers(s) {
  els.players.innerHTML = '';
  for (let slot = 0; slot < 2; slot++) {
    const p = s.players[slot];
    const row = document.createElement('div');
    row.className = 'player-row' + (s.turn === slot && s.winner === null && s.started ? ' active' : '');

    const dot = document.createElement('span');
    dot.className = 'dot p' + slot;

    const name = document.createElement('span');
    name.className = 'pname';
    name.textContent = p ? p.name + (slot === mySlot ? ' (you)' : '') : 'Waiting…';

    const pos = document.createElement('span');
    pos.className = 'ppos';
    pos.textContent = p ? '#' + p.pos : '';

    row.append(dot, name, pos);
    els.players.appendChild(row);
  }
}

function updateHud(s) {
  if (s.winner !== null) {
    els.turnBanner.textContent = (s.players[s.winner]?.name || 'Player') + ' wins!';
    els.winnerName.textContent = 'Score: ' + s.players[s.winner].pos + ' tiles climbed';
    els.winner.classList.remove('hidden');
    els.rollBtn.disabled = true;
    return;
  }

  if (s.winner === null) els.winner.classList.add('hidden');

  if (!s.started) {
    els.turnBanner.textContent = 'Waiting for opponent…';
    els.rollBtn.disabled = true;
    return;
  }

  const myTurn = s.turn === mySlot;
  els.turnBanner.textContent = myTurn ? 'Your turn' : (s.players[s.turn]?.name || 'Opponent') + "'s turn";
  els.turnBanner.style.color = myTurn ? PLAYER_HEX[mySlot] : 'rgba(255,255,255,0.7)';
  els.rollBtn.disabled = !myTurn;
}

// ---------------------------------------------------------------- input
els.createBtn.addEventListener('click', () => {
  els.lobbyError.textContent = '';
  send({ type: 'create', name: els.nameInput.value });
});

els.joinBtn.addEventListener('click', () => {
  els.lobbyError.textContent = '';
  const code = els.codeInput.value.trim();
  if (!/^\d{4}$/.test(code)) {
    els.lobbyError.textContent = 'Enter the 4-digit room code.';
    return;
  }
  send({ type: 'join', code, name: els.nameInput.value });
});

els.codeInput.addEventListener('input', () => {
  els.codeInput.value = els.codeInput.value.replace(/\D/g, '').slice(0, 4);
});

els.nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.createBtn.click();
});
els.codeInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') els.joinBtn.click();
});

els.rollBtn.addEventListener('click', () => {
  if (els.rollBtn.disabled) return;
  send({ type: 'roll' });
});

els.rematchBtn.addEventListener('click', () => send({ type: 'rematch' }));

els.copyBtn.addEventListener('click', async () => {
  const url = location.origin + location.pathname + '?room=' + els.roomCode.textContent;
  try {
    await navigator.clipboard.writeText(url);
    els.copyBtn.textContent = 'Copied!';
  } catch {
    els.copyBtn.textContent = url;
  }
  setTimeout(() => (els.copyBtn.textContent = 'Copy link'), 1600);
});

// Prefill room code from share link
{
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  if (room && /^\d{4}$/.test(room)) els.codeInput.value = room;
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  for (const slot of Object.keys(journeys)) updateJourney(Number(slot), dt);
  updateDie(dt);

  if (dieAnim === null && !busy() && gameState) {
    for (const p of gameState.players) {
      if (!journeys[p.slot]) tokens[p.slot].position.copy(wp(p.pos, p.slot));
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

connect();
animate();
