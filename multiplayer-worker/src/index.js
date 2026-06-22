const MAX_MESSAGE_BYTES = 2_000_000;
const MAX_PLAYERS = 24;
const ROOM_RE = /^[A-Z0-9-]{3,32}$/;
const GAMES = new Set(["pearl", "snake", "battle", "kart", "defense", "survivors"]);
const SITE_ORIGIN = "https://siebe213.github.io/tom-pearl-team";
const ALLOWED_ORIGINS = new Set([
  "https://tom-pearl-multiplayer.siebevandv.workers.dev",
  "https://siebe213.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173"
]);

function cleanName(value) {
  return String(value || "Player").replace(/[^a-z0-9 _-]/gi, "").slice(0, 18) || "Player";
}

function sanitizeSnapshot(snapshot, game) {
  if (!snapshot || typeof snapshot !== "object" || snapshot.g !== game) return null;
  if (game === "pearl") {
    if (!snapshot.host || !Array.isArray(snapshot.bots) || snapshot.bots.length > 140) return null;
    if (!Array.isArray(snapshot.host.cells) || snapshot.host.cells.length > 16) return null;
    snapshot.host.name = cleanName(snapshot.host.name);
    for (const bot of snapshot.bots) {
      if (!bot || typeof bot !== "object" || !Array.isArray(bot.cells) || bot.cells.length > 16) return null;
      bot.name = cleanName(bot.name);
    }
    if (snapshot.food && (!Array.isArray(snapshot.food) || snapshot.food.length > 9000)) return null;
    if (snapshot.viruses && (!Array.isArray(snapshot.viruses) || snapshot.viruses.length > 100)) return null;
    if (snapshot.powers && (!Array.isArray(snapshot.powers) || snapshot.powers.length > 100)) return null;
  } else if (game === "snake") {
    if (!Array.isArray(snapshot.snakes) || snapshot.snakes.length > 120) return null;
    for (const snake of snapshot.snakes) {
      if (!snake || typeof snake !== "object" || !Array.isArray(snake.segments) || snake.segments.length > 800) return null;
      snake.name = cleanName(snake.name);
    }
    if (snapshot.food && (!Array.isArray(snapshot.food) || snapshot.food.length > 6500)) return null;
    if (snapshot.gates && (!Array.isArray(snapshot.gates) || snapshot.gates.length > 80)) return null;
  } else {
    if (!Array.isArray(snapshot.actors) || snapshot.actors.length > 80) return null;
    for (const actor of snapshot.actors) {
      if (!actor || typeof actor !== "object") return null;
      actor.name = cleanName(actor.name);
    }
    const limits = { bullets: 600, pickups: 500, enemies: 700, towers: 180, projectiles: 700 };
    for (const [key, limit] of Object.entries(limits)) {
      if (snapshot[key] && (!Array.isArray(snapshot[key]) || snapshot[key].length > limit)) return null;
    }
  }
  return snapshot;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, OPTIONS",
          "access-control-allow-headers": "content-type"
        }
      });
    }
    if (url.pathname === "/health") return json({ ok: true, service: "tom-pearl-multiplayer" });
    const match = url.pathname.match(/^\/room\/([^/]+)$/);
    if (!match) {
      const upstream = new URL(SITE_ORIGIN + url.pathname + url.search);
      const response = await fetch(new Request(upstream, request));
      const headers = new Headers(response.headers);
      headers.set("cache-control", /\.(png|jpg|jpeg|webp|gif)$/i.test(url.pathname) ? "public, max-age=86400" : "no-store");
      headers.set("x-content-type-options", "nosniff");
      headers.set("referrer-policy", "strict-origin-when-cross-origin");
      headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
      headers.set("content-security-policy", "frame-ancestors 'self'");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    const room = decodeURIComponent(match[1]).toUpperCase();
    if (!ROOM_RE.test(room)) return json({ ok: false, error: "Invalid room code" }, 400);
    const origin = request.headers.get("origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ ok: false, error: "Origin not allowed" }, 403);
    const id = env.ARENAS.idFromName(room);
    return env.ARENAS.get(id).fetch(request);
  }
};

export class ArenaRoom {
  constructor(state) {
    this.state = state;
    this.latestSnapshot = null;
    this.rates = new Map();
  }

  sockets() {
    return this.state.getWebSockets();
  }

  info(ws) {
    return ws.deserializeAttachment() || {};
  }

  send(ws, payload) {
    try { ws.send(JSON.stringify(payload)); } catch (_) {}
  }

  broadcast(payload, except = null) {
    const message = JSON.stringify(payload);
    for (const ws of this.sockets()) {
      if (ws !== except) {
        try { ws.send(message); } catch (_) {}
      }
    }
  }

  hostSocket() {
    return this.sockets().find(ws => this.info(ws).host) || null;
  }

  roster() {
    return this.sockets().map(ws => {
      const p = this.info(ws);
      return { id: p.id, name: p.name, game: p.game, host: !!p.host };
    });
  }

  publishRoster() {
    this.broadcast({ type: "roster", players: this.roster() });
  }

  allowMessage(ws, type) {
    const id = this.info(ws).id || "unknown", now = Date.now();
    let rate = this.rates.get(id) || { windowAt: now, total: 0, lastInput: 0, lastSnapshot: 0 };
    if (now - rate.windowAt > 10_000) rate = { windowAt: now, total: 0, lastInput: 0, lastSnapshot: 0 };
    rate.total++;
    if (rate.total > 500) return false;
    if (type === "input" && now - rate.lastInput < 28) return false;
    if (type === "snapshot" && now - rate.lastSnapshot < 70) return false;
    if (type === "input") rate.lastInput = now;
    if (type === "snapshot") rate.lastSnapshot = now;
    this.rates.set(id, rate);
    return true;
  }

  async fetch(request) {
    if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
      return json({ ok: true, players: this.sockets().length, capacity: MAX_PLAYERS });
    }
    if (this.sockets().length >= MAX_PLAYERS) return json({ ok: false, error: "Room full" }, 503);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), name: "Player", game: "pearl", host: false, ready: false });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    if (typeof message !== "string" || message.length > MAX_MESSAGE_BYTES) {
      ws.close(1009, "Message too large");
      return;
    }
    let data;
    try { data = JSON.parse(message); } catch (_) { return; }
    const current = this.info(ws);
    if (!this.allowMessage(ws, data.type)) return;

    if (data.type === "hello") {
      const host = !this.hostSocket();
      const next = {
        ...current,
        name: cleanName(data.name),
        game: GAMES.has(data.game) ? data.game : "pearl",
        host,
        ready: true
      };
      ws.serializeAttachment(next);
      this.send(ws, { type: "welcome", id: next.id, host, players: this.roster(), snapshot: this.latestSnapshot });
      this.broadcast({ type: "joined", player: { id: next.id, name: next.name, game: next.game, host } }, ws);
      this.publishRoster();
      return;
    }
    if (!current.ready) return;

    if (data.type === "input") {
      const host = this.hostSocket();
      if (host && host !== ws) this.send(host, { type: "input", id: current.id, input: data.input || {} });
      return;
    }
    if (data.type === "snapshot" && current.host) {
      const snapshot = sanitizeSnapshot(data.snapshot, current.game);
      if (!snapshot) { ws.close(1008, "Invalid snapshot"); return; }
      if (snapshot.full) this.latestSnapshot = snapshot;
      this.broadcast({ type: "snapshot", snapshot }, ws);
      return;
    }
    if (data.type === "signal") {
      const target = this.sockets().find(item => this.info(item).id === data.target);
      if (target) this.send(target, { type: "signal", from: current.id, signal: data.signal });
    }
  }

  async webSocketClose(ws) {
    const leaving = this.info(ws);
    const wasHost = !!leaving.host;
    this.rates.delete(leaving.id);
    this.broadcast({ type: "left", id: leaving.id }, ws);
    if (wasHost) {
      const replacement = this.sockets().find(item => item !== ws);
      if (replacement) {
        const next = { ...this.info(replacement), host: true };
        replacement.serializeAttachment(next);
        this.send(replacement, { type: "role", host: true, snapshot: this.latestSnapshot });
      }
    }
    this.publishRoster();
  }

  async webSocketError(ws) {
    try { ws.close(1011, "Socket error"); } catch (_) {}
  }
}

