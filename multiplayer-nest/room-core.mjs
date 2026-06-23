const ROOM_RE = /^[A-Z0-9-]{3,32}$/;
const games = new Set(["pearl", "snake", "battle", "kart", "defense", "survivors"]);
const clampText = (value, max = 24) => String(value || "Player").replace(/[<>]/g, "").trim().slice(0, max) || "Player";
const nowMs = () => Date.now();

export function parseRoomPath(pathname) {
  const match = String(pathname || "").match(/^\/room\/([^/]+)$/);
  if (!match) return null;
  const room = decodeURIComponent(match[1]).toUpperCase();
  if (!ROOM_RE.test(room)) return null;
  const dash = room.indexOf("-");
  const game = dash > 0 ? room.slice(0, dash).toLowerCase() : "";
  if (!games.has(game)) return null;
  return { room, game };
}

export function sanitizeSnapshot(snapshot, game) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.g !== game) return null;
  if (game === "pearl") {
    if (!snapshot.host || !Array.isArray(snapshot.bots) || snapshot.bots.length > 140) return null;
    if (!Array.isArray(snapshot.host.cells) || snapshot.host.cells.length > 16) return null;
    snapshot.host.name = clampText(snapshot.host.name);
    for (const bot of snapshot.bots) bot.name = clampText(bot.name);
    if (snapshot.food && (!Array.isArray(snapshot.food) || snapshot.food.length > 9000)) return null;
    if (snapshot.viruses && (!Array.isArray(snapshot.viruses) || snapshot.viruses.length > 100)) return null;
    if (snapshot.powers && (!Array.isArray(snapshot.powers) || snapshot.powers.length > 100)) return null;
  } else if (game === "snake") {
    if (!Array.isArray(snapshot.snakes) || snapshot.snakes.length > 120) return null;
    for (const snake of snapshot.snakes) snake.name = clampText(snake.name);
    if (snapshot.food && (!Array.isArray(snapshot.food) || snapshot.food.length > 6500)) return null;
    if (snapshot.gates && (!Array.isArray(snapshot.gates) || snapshot.gates.length > 80)) return null;
  } else {
    if (!Array.isArray(snapshot.actors) || snapshot.actors.length > 80) return null;
    for (const actor of snapshot.actors) actor.name = clampText(actor.name);
    const limits = { bullets: 500, pickups: 600, enemies: 260, gems: 900, projectiles: 600, towers: 80 };
    for (const [key, limit] of Object.entries(limits)) {
      if (snapshot[key] && (!Array.isArray(snapshot[key]) || snapshot[key].length > limit)) return null;
    }
  }
  return snapshot;
}

export class Room {
  constructor(code, game) {
    this.code = code;
    this.game = game;
    this.clients = new Map();
    this.latestSnapshot = null;
    this.nextId = 1;
  }

  roster() {
    return [...this.clients.values()].map(player => ({
      id: player.id,
      name: player.name,
      game: player.game,
      host: player.host
    }));
  }

  host() {
    return [...this.clients.values()].find(player => player.host);
  }

  send(socket, payload) {
    if (!socket || socket.readyState !== 1) return;
    try { socket.send(JSON.stringify(payload)); } catch (_) {}
  }

  broadcast(payload, except = null) {
    const message = JSON.stringify(payload);
    for (const socket of this.clients.keys()) {
      if (socket === except || socket.readyState !== 1) continue;
      try { socket.send(message); } catch (_) {}
    }
  }

  join(socket, hello = {}) {
    const hasHost = !!this.host();
    const player = {
      id: "p" + this.nextId++,
      name: clampText(hello.name),
      game: games.has(hello.game) ? hello.game : this.game,
      host: !hasHost,
      rates: { input: 0, snapshot: 0 }
    };
    this.clients.set(socket, player);
    this.send(socket, { type: "welcome", id: player.id, host: player.host, players: this.roster(), snapshot: this.latestSnapshot });
    this.broadcast({ type: "joined", player: { id: player.id, name: player.name, game: player.game, host: player.host } }, socket);
    this.broadcast({ type: "roster", players: this.roster() });
    return player;
  }

  allow(player, type) {
    const now = nowMs();
    if (type === "input" && now - player.rates.input < 22) return false;
    if (type === "snapshot" && now - player.rates.snapshot < 55) return false;
    if (type === "input") player.rates.input = now;
    if (type === "snapshot") player.rates.snapshot = now;
    return true;
  }

  message(socket, raw) {
    let data;
    try { data = JSON.parse(raw); } catch (_) { return; }
    const current = this.clients.get(socket);
    if (!current) {
      if (data.type === "hello") this.join(socket, data);
      return;
    }
    if (data.type === "input") {
      if (!this.allow(current, "input")) return;
      const host = [...this.clients.entries()].find(([, player]) => player.host)?.[0];
      if (host && host !== socket) this.send(host, { type: "input", id: current.id, input: data.input || {} });
      return;
    }
    if (data.type === "snapshot" && current.host) {
      if (!this.allow(current, "snapshot")) return;
      const snapshot = sanitizeSnapshot(data.snapshot, current.game);
      if (!snapshot) {
        try { socket.close(1008, "Invalid snapshot"); } catch (_) {}
        return;
      }
      if (snapshot.full) this.latestSnapshot = snapshot;
      this.broadcast({ type: "snapshot", snapshot }, socket);
      return;
    }
    if (data.type === "signal" && data.to) {
      const target = [...this.clients.entries()].find(([, player]) => player.id === data.to)?.[0];
      if (target) this.send(target, { type: "signal", from: current.id, signal: data.signal });
    }
  }

  leave(socket) {
    const leaving = this.clients.get(socket);
    if (!leaving) return;
    this.clients.delete(socket);
    this.broadcast({ type: "left", id: leaving.id }, socket);
    if (leaving.host) {
      const replacement = this.clients.values().next().value;
      if (replacement) {
        replacement.host = true;
        const replacementSocket = [...this.clients.entries()].find(([, player]) => player === replacement)?.[0];
        this.send(replacementSocket, { type: "role", host: true, snapshot: this.latestSnapshot });
      }
    }
    this.broadcast({ type: "roster", players: this.roster() });
  }
}

export class RoomHub {
  constructor() {
    this.rooms = new Map();
  }

  get(code, game) {
    const key = code.toUpperCase();
    let room = this.rooms.get(key);
    if (!room) {
      room = new Room(key, game);
      this.rooms.set(key, room);
    }
    return room;
  }

  prune() {
    for (const [code, room] of this.rooms) {
      if (room.clients.size === 0) this.rooms.delete(code);
    }
  }
}
