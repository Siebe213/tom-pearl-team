'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { performance } = require('perf_hooks');

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function websocketFrame(opcode, value = '') {
  const payload = Buffer.isBuffer(value) ? value : Buffer.from(String(value));
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x80 | opcode, payload.length]);
  } else if (payload.length <= 0xffff) {
    header = Buffer.alloc(4);
    header[0] = 0x80 | opcode;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x80 | opcode;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, payload]);
}

class WebSocketConnection extends EventEmitter {
  constructor(socket, head) {
    super();
    this.socket = socket;
    this.readyState = 1;
    this.isAlive = true;
    this.buffer = head && head.length ? Buffer.from(head) : Buffer.alloc(0);
    this.fragmentOpcode = 0;
    this.fragments = [];
    socket.on('data', chunk => this.consume(chunk));
    socket.on('close', () => this.finish());
    socket.on('end', () => this.finish());
    socket.on('error', error => this.emit('error', error));
    if (this.buffer.length) this.consume(Buffer.alloc(0));
  }

  send(value) {
    if (this.readyState !== 1) return;
    this.socket.write(websocketFrame(1, value));
  }

  ping() {
    if (this.readyState === 1) this.socket.write(websocketFrame(9));
  }

  close() {
    if (this.readyState !== 1) return;
    this.readyState = 2;
    this.socket.write(websocketFrame(8));
    this.socket.end();
  }

  terminate() {
    this.readyState = 3;
    this.socket.destroy();
  }

  finish() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    this.emit('close');
  }

  consume(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const final = Boolean(first & 0x80);
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) return;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) return;
        const largeLength = this.buffer.readBigUInt64BE(2);
        if (largeLength > 1024n * 1024n) {
          this.terminate();
          return;
        }
        length = Number(largeLength);
        offset = 10;
      }
      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + length) return;
      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      offset += maskLength;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + length));
      this.buffer = this.buffer.subarray(offset + length);
      if (mask) {
        for (let index = 0; index < payload.length; index++) payload[index] ^= mask[index % 4];
      }
      if (opcode === 8) {
        this.close();
        return;
      }
      if (opcode === 9) {
        this.socket.write(websocketFrame(10, payload));
        continue;
      }
      if (opcode === 10) {
        this.emit('pong');
        continue;
      }
      if (opcode === 1 && final) {
        this.emit('message', payload);
        continue;
      }
      if (opcode === 1) {
        this.fragmentOpcode = opcode;
        this.fragments = [payload];
        continue;
      }
      if (opcode === 0 && this.fragmentOpcode) {
        this.fragments.push(payload);
        if (final) {
          this.emit('message', Buffer.concat(this.fragments));
          this.fragmentOpcode = 0;
          this.fragments = [];
        }
      }
    }
  }
}

class WebSocketServer extends EventEmitter {
  constructor(options) {
    super();
    this.clients = new Set();
    this.path = options.path;
    options.server.on('upgrade', (request, socket, head) => this.upgrade(request, socket, head));
  }

  upgrade(request, socket, head) {
    const requestPath = (request.url || '').split('?')[0];
    const key = request.headers['sec-websocket-key'];
    if (requestPath !== this.path || !key || request.headers.upgrade?.toLowerCase() !== 'websocket') {
      socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      socket.destroy();
      return;
    }
    const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
    );
    const connection = new WebSocketConnection(socket, head);
    this.clients.add(connection);
    connection.on('close', () => this.clients.delete(connection));
    this.emit('connection', connection, request);
  }
}

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const WORLD = 5600;
const TICK_RATE = 30;
const SNAPSHOT_RATE = 12;
const FOOD_TARGET = 2200;
const VIRUS_TARGET = 38;
const POWER_TARGET = 22;
const TARGET_POPULATION = 42;
const MIN_BOTS = 22;
const MAX_PLAYER_CELLS = 24;
const MAX_BOT_CELLS = 12;
const MERGE_MS = 30000;
const VIEW_RADIUS = 1900;
const TAU = Math.PI * 2;

const POWER_TYPES = ['speed', 'shield', 'magnet', 'growth', 'coin'];
const BOT_NAMES = 'TomChop LoreSeeker ArchiveBot DeepCrawler PearlEater NeonRat VoidBlob MassBandit CasinoGremlin VirusSurfer SplitLord FoodGoblin PinkMenace ChromePearl ToxicFan'.split(' ');
const SKIN_MODS = [
  { speed: 1.05 }, { coinGain: 1.12 }, { virusResist: 0.88 },
  { mergeBonus: 3000, foodGain: 0.96 }, { accel: 1.08 },
  { playerEatGain: 1.08, foodGain: 0.95 }, { scoreDisplay: 1.05 },
  { iceAura: 0.04 }, { ejectSpeed: 1.18, ejectCost: 1.12 },
  { spawnShield: 1.5 }, { chase: 1.06 }, { powerDuration: 1 },
  { magnetRange: 1.12 }, { foodGain: 1.06, hugeSpeed: 0.97 },
  { ejectEatGain: 1.14 }, { splitLaunch: 1.08, mergePenalty: 2000 },
  { flee: 1.07 }, { progress: 1.1 }, { virusResist: 0.82 },
  { startMass: 6 }, { dupeRefund: 1.2 }, { smallMergeBonus: 4000 },
  { pickupRange: 1.15 }, { vision: 1.18 }, { aloneSpeed: 1.05 }
];

const owners = new Map();
let food = [], viruses = [], powers = [], ejected = [];
let botSerial = 0, entitySerial = 0;
let lastTick = performance.now(), lastSnapshot = performance.now();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const distance = (a, b, c, d) => Math.hypot(a - c, b - d);
const makeId = prefix => prefix + (++entitySerial).toString(36);
const mass = cell => cell.r * cell.r / 100;
const totalMass = cells => cells.reduce((sum, cell) => sum + mass(cell), 0);
const modsForSkin = skin => SKIN_MODS[skin] || SKIN_MODS[0];

function safeName(value) {
  return String(value || 'PearlConsumer').replace(/[<>&"'`]/g, '').trim().slice(0, 18) || 'PearlConsumer';
}
function safeSkin(value) { return clamp(Math.floor(Number(value) || 0), 0, SKIN_MODS.length - 1); }
function makeFood() { return { x: rand(30, WORLD - 30), y: rand(30, WORLD - 30), r: rand(3.2, 5.6), hue: Math.floor(rand(0, 360)), dead: false }; }
function makeVirus() { return { x: rand(140, WORLD - 140), y: rand(140, WORLD - 140), r: 34 + rand(-3, 4) }; }
function makePower() { return { id: makeId('p'), x: rand(100, WORLD - 100), y: rand(100, WORLD - 100), r: 23, type: POWER_TYPES[Math.floor(rand(0, POWER_TYPES.length))], dead: false }; }
function makeCell(owner, x, y, r) { return { id: makeId('c'), owner: owner.id, x, y, r, vx: 0, vy: 0, skin: owner.skin, name: owner.name, mergeAt: Date.now() + MERGE_MS, dead: false }; }
function randomSpawn() { return { x: rand(240, WORLD - 240), y: rand(240, WORLD - 240) }; }

function createOwner(id, options = {}) {
  return { id, conn: options.conn || null, isBot: Boolean(options.isBot), active: false,
    name: safeName(options.name), skin: safeSkin(options.skin), cells: [], powers: {},
    input: { x: WORLD / 2, y: WORLD / 2 }, intent: 'farm', target: null,
    lockUntil: 0, nextThink: 0, splitCooldown: 0,
    actionAt: { split: 0, eject: 0, merge: 0 }, forceMergeUntil: 0,
    agro: rand(0.75, 1.35), foodBias: rand(0.7, 1.3), foodEaten: 0,
    pending: { food: 0, kills: 0, coins: 0 }, joinedAt: Date.now() };
}
function spawnOwner(owner) {
  const point = randomSpawn(), mods = modsForSkin(owner.skin);
  owner.cells = [makeCell(owner, point.x, point.y, 34 + (mods.startMass || 0))];
  owner.powers = { shield: 3 + (mods.spawnShield || 0), speed: 2 };
  owner.input = { x: point.x, y: point.y };
  owner.active = true; owner.target = null; owner.lockUntil = 0; owner.splitCooldown = 0;
}
function createBot() {
  const serial = botSerial++, name = BOT_NAMES[serial % BOT_NAMES.length] + '_' + serial;
  const owner = createOwner('bot-' + serial, { isBot: true, name, skin: Math.floor(rand(0, SKIN_MODS.length)) });
  spawnOwner(owner); owner.cells[0].r = rand(22, 43); owners.set(owner.id, owner); return owner;
}
function allOwners() { return Array.from(owners.values()).filter(owner => owner.active); }
function allCells() { return allOwners().flatMap(owner => owner.cells).filter(cell => !cell.dead); }
function centerOf(cells) {
  let x = 0, y = 0, weight = 0;
  for (const cell of cells) { const amount = cell.r * cell.r; x += cell.x * amount; y += cell.y * amount; weight += amount; }
  return weight ? { x: x / weight, y: y / weight } : { x: WORLD / 2, y: WORLD / 2 };
}
function grow(cell, radius, scale) { cell.r = Math.sqrt(cell.r * cell.r + radius * radius * scale); }
function cellSpeed(cell, owner) {
  const mods = modsForSkin(cell.skin);
  let speed = clamp(9.6 - cell.r * 0.075, 2.25, 9.6) * (mods.speed || 1);
  if (owner.powers.speed > 0) speed *= 1.45;
  if (cell.r > 110) speed *= mods.hugeSpeed || 1;
  return speed;
}
function mergeDelay(cell) {
  const mods = modsForSkin(cell.skin);
  let delay = MERGE_MS + (mods.mergePenalty || 0) - (mods.mergeBonus || 0);
  if (cell.r < 25) delay -= mods.smallMergeBonus || 0;
  return clamp(delay, 18000, 36000);
}
function reward(owner, type, amount = 1) { if (owner && !owner.isBot) owner.pending[type] += amount; }

function splitOwner(owner) {
  if (!owner.active) return;
  const max = owner.isBot ? MAX_BOT_CELLS : MAX_PLAYER_CELLS, created = [];
  if (owner.cells.length >= max) return;
  for (const cell of owner.cells.slice()) {
    if (cell.r < 36 || owner.cells.length + created.length >= max) continue;
    const target = owner.target || owner.input, dx = target.x - cell.x, dy = target.y - cell.y;
    const length = Math.hypot(dx, dy) || 1, radius = cell.r / Math.SQRT2;
    cell.r = radius; cell.mergeAt = Date.now() + mergeDelay(cell);
    const next = makeCell(owner, cell.x + dx / length * (radius + 8), cell.y + dy / length * (radius + 8), radius);
    const launch = 22 * (modsForSkin(cell.skin).splitLaunch || 1);
    next.vx = dx / length * launch; next.vy = dy / length * launch; next.mergeAt = Date.now() + mergeDelay(next); created.push(next);
  }
  owner.cells.push(...created);
}
function ejectOwner(owner) {
  if (!owner.active) return;
  for (const cell of owner.cells) {
    if (cell.r < 30) continue;
    const mods = modsForSkin(cell.skin), dx = owner.input.x - cell.x, dy = owner.input.y - cell.y;
    const length = Math.hypot(dx, dy) || 1, cost = 72 * (mods.ejectCost || 1), speed = 16 * (mods.ejectSpeed || 1);
    cell.r = Math.sqrt(Math.max(100, cell.r * cell.r - cost));
    ejected.push({ id: makeId('e'), owner: owner.id, x: cell.x + dx / length * (cell.r + 12), y: cell.y + dy / length * (cell.r + 12), r: 8, vx: dx / length * speed, vy: dy / length * speed, skin: cell.skin, life: 5, dead: false });
  }
}
function tickPowers(owner, dt) { for (const key of Object.keys(owner.powers)) { owner.powers[key] -= dt; if (owner.powers[key] <= 0) delete owner.powers[key]; } }
function applyPower(owner, type) {
  if (type === 'coin') { reward(owner, 'coins', Math.floor(40 * (modsForSkin(owner.skin).coinGain || 1))); return; }
  if (type === 'growth') { owner.cells.forEach(cell => grow(cell, 18, 2.2)); return; }
  const extra = modsForSkin(owner.skin).powerDuration || 0, duration = type === 'shield' ? 5 : type === 'magnet' ? 6 : 4;
  owner.powers[type] = Math.max(owner.powers[type] || 0, duration + extra);
}
function bound(cell) { cell.x = clamp(cell.x, cell.r, WORLD - cell.r); cell.y = clamp(cell.y, cell.r, WORLD - cell.r); }
function moveOwner(owner, dt) {
  const frameScale = dt * 60, acceleration = 1 - Math.pow(1 - 0.23 * (modsForSkin(owner.skin).accel || 1), frameScale), friction = Math.pow(0.94, frameScale);
  for (const cell of owner.cells) {
    const dx = owner.input.x - cell.x, dy = owner.input.y - cell.y, length = Math.hypot(dx, dy) || 1;
    if (length > 4) { const speed = cellSpeed(cell, owner); cell.vx += (dx / length * speed - cell.vx) * acceleration; cell.vy += (dy / length * speed - cell.vy) * acceleration; }
    cell.vx *= friction; cell.vy *= friction; cell.x += cell.vx * frameScale; cell.y += cell.vy * frameScale; bound(cell);
  }
}

function botThink(owner, time, cells) {
  if (time < owner.nextThink) return;
  owner.nextThink = time + rand(260, 520);
  if (time < owner.lockUntil && owner.target && !owner.target.dead) return;
  const main = owner.cells.slice().sort((a, b) => b.r - a.r)[0]; if (!main) return;
  const visible = 900 + main.r * 7; let threat = null, threatDistance = Infinity, prey = null, preyDistance = Infinity;
  for (const other of cells) {
    if (other.owner === owner.id || other.dead) continue;
    const current = distance(main.x, main.y, other.x, other.y); if (current > visible) continue;
    if (other.r > main.r * 1.18 && current < threatDistance) { threat = other; threatDistance = current; }
    else if (main.r > other.r * 1.22 && current < preyDistance) { prey = other; preyDistance = current; }
  }
  if (threat && threatDistance < main.r * 5.2) { owner.intent = 'flee'; owner.target = { x: main.x - (threat.x - main.x) * 2, y: main.y - (threat.y - main.y) * 2 }; owner.lockUntil = time + rand(700, 1150); return; }
  let bestPower = null, powerDistance = Infinity;
  for (const power of powers) { const current = distance(main.x, main.y, power.x, power.y); if (current < powerDistance && current < 760) { bestPower = power; powerDistance = current; } }
  if (bestPower && Math.random() < 0.55) { owner.intent = 'power'; owner.target = bestPower; owner.lockUntil = time + rand(800, 1400); return; }
  if (prey && preyDistance < visible * owner.agro) { owner.intent = 'hunt'; owner.target = prey; owner.lockUntil = time + rand(950, 1700); return; }
  let bestFood = null, foodDistance = Infinity;
  for (let index = 0; index < 44; index++) { const candidate = food[Math.floor(rand(0, food.length))]; if (!candidate || candidate.dead) continue; const current = distance(main.x, main.y, candidate.x, candidate.y); if (current < foodDistance) { bestFood = candidate; foodDistance = current; } }
  owner.intent = 'farm'; owner.target = bestFood || randomSpawn(); owner.lockUntil = time + rand(900, 1500);
}
function moveBot(owner, dt, time, cells) {
  botThink(owner, time, cells); owner.splitCooldown = Math.max(0, owner.splitCooldown - dt);
  const main = owner.cells.slice().sort((a, b) => b.r - a.r)[0], target = owner.target || randomSpawn();
  owner.input.x = clamp(target.x, 0, WORLD); owner.input.y = clamp(target.y, 0, WORLD); moveOwner(owner, dt);
  if (main && owner.intent === 'hunt' && owner.target && !owner.target.dead && owner.splitCooldown <= 0 && main.r > owner.target.r * 1.75) {
    const current = distance(main.x, main.y, owner.target.x, owner.target.y);
    if (current < main.r * 5 && current > main.r * 0.9) { splitOwner(owner); owner.splitCooldown = 8 + rand(0, 4); }
  }
}

function separateAndMerge(owner, time) {
  const cells = owner.cells; if (cells.length < 2) return; const force = time < owner.forceMergeUntil;
  for (let first = 0; first < cells.length; first++) for (let second = first + 1; second < cells.length; second++) {
    const a = cells[first], b = cells[second]; if (a.dead || b.dead) continue;
    let dx = b.x - a.x, dy = b.y - a.y, current = Math.hypot(dx, dy);
    if (current < 0.001) { const angle = rand(0, TAU); dx = Math.cos(angle); dy = Math.sin(angle); current = 1; }
    const nx = dx / current, ny = dy / current, ready = time >= a.mergeAt && time >= b.mergeAt;
    if (ready) {
      const pull = (force ? 1.35 : 0.72) * clamp(current / 260, 0.32, 1.25), combined = a.r + b.r || 1;
      a.vx += nx * pull * (b.r / combined); a.vy += ny * pull * (b.r / combined); b.vx -= nx * pull * (a.r / combined); b.vy -= ny * pull * (a.r / combined);
      if (current < Math.max(a.r, b.r) * 0.92 || current < (a.r + b.r) * 0.28) { const big = a.r >= b.r ? a : b, small = big === a ? b : a; big.r = Math.sqrt(big.r * big.r + small.r * small.r); small.dead = true; }
      continue;
    }
    const minimum = (a.r + b.r) * 0.92;
    if (current < minimum) { const overlap = minimum - current, combined = a.r + b.r || 1, aw = b.r / combined, bw = a.r / combined; a.x -= nx * overlap * 0.52 * aw; a.y -= ny * overlap * 0.52 * aw; b.x += nx * overlap * 0.52 * bw; b.y += ny * overlap * 0.52 * bw; bound(a); bound(b); }
  }
  owner.cells = cells.filter(cell => !cell.dead);
}

function virusHit(owner, cell, virus) {
  if (cell.r < virus.r * 1.08 || owner.powers.shield > 0) return;
  const max = owner.isBot ? MAX_BOT_CELLS : MAX_PLAYER_CELLS, free = max - owner.cells.length + 1, resistance = modsForSkin(cell.skin).virusResist || 1;
  if (free <= 1) { cell.r *= resistance === 1 ? 0.68 : resistance; Object.assign(virus, makeVirus()); return; }
  const desired = cell.r > 72 ? 10 : cell.r > 55 ? 8 : 6, pieces = Math.max(4, Math.min(desired, free)), oldRadius = cell.r * resistance, radius = Math.max(12, oldRadius / Math.sqrt(pieces)), base = Math.atan2(cell.y - virus.y, cell.x - virus.x);
  cell.r = radius; cell.mergeAt = Date.now() + Math.max(MERGE_MS, mergeDelay(cell));
  for (let index = 1; index < pieces; index++) { const angle = base + index / (pieces - 1) * TAU + rand(-0.18, 0.18), next = makeCell(owner, cell.x + Math.cos(angle) * (radius + 10), cell.y + Math.sin(angle) * (radius + 10), radius), speed = rand(12, 22) * (owner.isBot ? 0.95 : 1.05); next.vx = Math.cos(angle) * speed + cell.vx * 0.25; next.vy = Math.sin(angle) * speed + cell.vy * 0.25; next.mergeAt = Date.now() + Math.max(MERGE_MS, mergeDelay(next)); owner.cells.push(next); }
  Object.assign(virus, makeVirus());
}

function runCollisions(dt) {
  let cells = allCells();
  for (const cell of cells) {
    const owner = owners.get(cell.owner); if (!owner) continue;
    const mods = modsForSkin(cell.skin), magnet = owner.powers.magnet > 0, magnetRange = 170 * (mods.magnetRange || 1);
    for (const pellet of food) { if (pellet.dead) continue; const current = distance(cell.x, cell.y, pellet.x, pellet.y); if (magnet && current < cell.r + magnetRange) { pellet.x += (cell.x - pellet.x) / (current || 1) * 8; pellet.y += (cell.y - pellet.y) / (current || 1) * 8; } if (current < cell.r + pellet.r * 0.35) { grow(cell, pellet.r, (owner.isBot ? 2.5 : 3.2) * (mods.foodGain || 1)); pellet.dead = true; owner.foodEaten++; reward(owner, 'food'); if (!owner.isBot && owner.foodEaten % 80 === 0) reward(owner, 'coins', 10); } }
  }
  for (const pellet of ejected) { if (pellet.dead) continue; const frameScale = dt * 60; pellet.x += pellet.vx * frameScale; pellet.y += pellet.vy * frameScale; pellet.vx *= Math.pow(0.96, frameScale); pellet.vy *= Math.pow(0.96, frameScale); pellet.life -= dt; if (pellet.life <= 0) pellet.dead = true; for (const cell of cells) { if (pellet.dead) break; if (distance(cell.x, cell.y, pellet.x, pellet.y) < cell.r) { grow(cell, pellet.r, 1.7 * (modsForSkin(cell.skin).ejectEatGain || 1)); pellet.dead = true; } } }
  for (const power of powers) { if (power.dead) continue; for (const cell of cells) { if (distance(cell.x, cell.y, power.x, power.y) < cell.r + power.r * (modsForSkin(cell.skin).pickupRange || 1)) { const owner = owners.get(cell.owner); if (owner) applyPower(owner, power.type); power.dead = true; break; } } }
  for (const virus of viruses) for (const cell of cells.slice()) if (!cell.dead && distance(cell.x, cell.y, virus.x, virus.y) < cell.r + virus.r * 0.65) { const owner = owners.get(cell.owner); if (owner) virusHit(owner, cell, virus); }
  cells = allCells().sort((a, b) => b.r - a.r);
  for (let first = 0; first < cells.length; first++) { const big = cells[first]; if (big.dead) continue; for (let second = cells.length - 1; second > first; second--) { const small = cells[second]; if (small.dead || big.owner === small.owner) continue; if (big.r > small.r * 1.13 && distance(big.x, big.y, small.x, small.y) < big.r - small.r * 0.18) { const smallOwner = owners.get(small.owner); if (smallOwner && smallOwner.powers.shield > 0) continue; const bigOwner = owners.get(big.owner); grow(big, small.r, 0.62 * (bigOwner ? modsForSkin(bigOwner.skin).playerEatGain || 1 : 1)); small.dead = true; reward(bigOwner, 'kills'); reward(bigOwner, 'coins', 15); } } }
}

function cleanWorld() {
  food = food.filter(item => !item.dead); powers = powers.filter(item => !item.dead); ejected = ejected.filter(item => !item.dead);
  while (food.length < FOOD_TARGET) food.push(makeFood()); while (viruses.length < VIRUS_TARGET) viruses.push(makeVirus()); while (powers.length < POWER_TARGET) powers.push(makePower());
  for (const owner of owners.values()) { owner.cells = owner.cells.filter(cell => !cell.dead); if (owner.active && !owner.cells.length) { owner.active = false; if (owner.isBot) owners.delete(owner.id); else send(owner.conn, { type: 'dead' }); } }
}
function ensureBots() {
  const humans = Array.from(owners.values()).filter(owner => !owner.isBot && owner.active).length, bots = Array.from(owners.values()).filter(owner => owner.isBot && owner.active).length, target = Math.max(MIN_BOTS, TARGET_POPULATION - humans);
  for (let index = bots; index < target; index++) createBot();
  if (bots > target) Array.from(owners.values()).filter(owner => owner.isBot).slice(0, bots - target).forEach(owner => owners.delete(owner.id));
}
function tick() {
  const time = performance.now(), dt = Math.min(0.05, Math.max(0.001, (time - lastTick) / 1000)); lastTick = time; ensureBots(); const cells = allCells();
  for (const owner of owners.values()) { if (!owner.active) continue; tickPowers(owner, dt); if (owner.isBot) moveBot(owner, dt, time, cells); else moveOwner(owner, dt); separateAndMerge(owner, Date.now()); }
  runCollisions(dt); cleanWorld(); if (time - lastSnapshot >= 1000 / SNAPSHOT_RATE) { lastSnapshot = time; broadcastSnapshots(); }
}
function visible(point, entity, extra = 0) { return Math.abs(entity.x - point.x) <= VIEW_RADIUS + extra && Math.abs(entity.y - point.y) <= VIEW_RADIUS + extra; }
function leaderboard() { return allOwners().map(owner => ({ id: owner.id, name: owner.name, mass: Math.floor(totalMass(owner.cells) * (modsForSkin(owner.skin).scoreDisplay || 1)), bot: owner.isBot, mode: owner.isBot ? owner.intent : '' })).sort((a, b) => b.mass - a.mass).slice(0, 10); }
function buildSnapshot(owner) {
  const point = owner.active ? centerOf(owner.cells) : { x: WORLD / 2, y: WORLD / 2 };
  const nearbyCells = allCells().filter(cell => visible(point, cell, cell.r + 220)).map(cell => [cell.id, cell.owner, Math.round(cell.x * 10) / 10, Math.round(cell.y * 10) / 10, Math.round(cell.r * 10) / 10, cell.skin, cell.name, owners.get(cell.owner)?.isBot ? 1 : 0, Math.max(0, Math.ceil((cell.mergeAt - Date.now()) / 1000))]);
  const snapshot = { type: 'snapshot', time: Date.now(), world: WORLD, self: owner.id, alive: owner.active, players: Array.from(owners.values()).filter(item => !item.isBot && item.active).length,
    entities: { cells: nearbyCells, food: food.filter(item => visible(point, item, 50)).map(item => [Math.round(item.x), Math.round(item.y), Math.round(item.r * 10) / 10, item.hue]), viruses: viruses.filter(item => visible(point, item, 100)).map(item => [Math.round(item.x), Math.round(item.y), Math.round(item.r * 10) / 10]), powers: powers.filter(item => visible(point, item, 100)).map(item => [item.id, Math.round(item.x), Math.round(item.y), item.type]), ejected: ejected.filter(item => visible(point, item, 50)).map(item => [item.id, Math.round(item.x), Math.round(item.y), item.r, item.skin]) },
    powers: owner.powers, leaderboard: leaderboard(), rewards: owner.pending };
  owner.pending = { food: 0, kills: 0, coins: 0 }; return snapshot;
}
function send(conn, message) { if (conn && conn.readyState === 1) conn.send(JSON.stringify(message)); }
function broadcastSnapshots() { for (const owner of owners.values()) if (!owner.isBot && owner.conn) send(owner.conn, buildSnapshot(owner)); }
function handleMessage(owner, raw) {
  let message; try { message = JSON.parse(String(raw)); } catch { return; }
  if (!message || typeof message !== 'object') return;
  if (message.type === 'join') { owner.name = safeName(message.name); owner.skin = safeSkin(message.skin); spawnOwner(owner); send(owner.conn, { type: 'joined', id: owner.id, world: WORLD }); return; }
  if (message.type === 'input' && owner.active) { owner.input.x = clamp(Number(message.x) || WORLD / 2, 0, WORLD); owner.input.y = clamp(Number(message.y) || WORLD / 2, 0, WORLD); return; }
  if (message.type === 'action' && owner.active) { const action = String(message.action || ''), time = Date.now(), delay = action === 'eject' ? 100 : action === 'split' ? 250 : 500; if (!Object.hasOwn(owner.actionAt, action) || time - owner.actionAt[action] < delay) return; owner.actionAt[action] = time; if (action === 'split') splitOwner(owner); if (action === 'eject') ejectOwner(owner); if (action === 'merge') owner.forceMergeUntil = time + 1100; return; }
  if (message.type === 'ping') send(owner.conn, { type: 'pong', time: message.time });
}

const MIME_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((request, response) => {
  if (request.url === '/health') { response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify({ ok: true, humans: Array.from(owners.values()).filter(owner => !owner.isBot && owner.active).length, bots: Array.from(owners.values()).filter(owner => owner.isBot && owner.active).length, uptime: Math.floor(process.uptime()) })); return; }
  const requestPath = decodeURIComponent((request.url || '/').split('?')[0]), normalized = requestPath === '/' ? '/index.html' : requestPath, filePath = path.resolve(PUBLIC_DIR, '.' + normalized);
  if (!filePath.startsWith(PUBLIC_DIR)) { response.writeHead(403); response.end('Forbidden'); return; }
  fs.readFile(filePath, (error, data) => { if (error) { response.writeHead(404); response.end('Not found'); return; } response.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream', 'Cache-Control': ['.html', '.js'].includes(path.extname(filePath)) ? 'no-cache' : 'public, max-age=3600' }); response.end(data); });
});
const wss = new WebSocketServer({ server, path: '/arena' });
wss.on('connection', conn => { const id = makeId('player-'), owner = createOwner(id, { conn, name: 'PearlConsumer', skin: 0 }); owners.set(id, owner); conn.isAlive = true; conn.on('pong', () => { conn.isAlive = true; }); conn.on('message', raw => handleMessage(owner, raw)); conn.on('close', () => owners.delete(id)); conn.on('error', () => owners.delete(id)); send(conn, { type: 'hello', id, world: WORLD }); });
setInterval(() => { for (const conn of wss.clients) { if (!conn.isAlive) { conn.terminate(); continue; } conn.isAlive = false; conn.ping(); } }, 30000).unref();
for (let index = 0; index < FOOD_TARGET; index++) food.push(makeFood());
for (let index = 0; index < VIRUS_TARGET; index++) viruses.push(makeVirus());
for (let index = 0; index < POWER_TARGET; index++) powers.push(makePower());
ensureBots(); setInterval(tick, 1000 / TICK_RATE);
server.listen(PORT, '0.0.0.0', () => console.log(`Pearl.io public arena listening on port ${PORT}`));
