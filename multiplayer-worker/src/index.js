const MAX_MESSAGE_BYTES = 2_000_000;
const MAX_PLAYERS = 24;
const ROOM_RE = /^[A-Z0-9-]{3,16}$/;
const SITE_ORIGIN = "https://siebe213.github.io/tom-pearl-team";

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
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
    const room = decodeURIComponent(match[1]).toUpperCase();
    if (!ROOM_RE.test(room)) return json({ ok: false, error: "Invalid room code" }, 400);
    const id = env.ARENAS.idFromName(room);
    return env.ARENAS.get(id).fetch(request);
  }
};

export class ArenaRoom {
  constructor(state) {
    this.state = state;
    this.latestSnapshot = null;
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

    if (data.type === "hello") {
      const host = !this.hostSocket();
      const next = {
        ...current,
        name: String(data.name || "Player").replace(/[^a-z0-9 _-]/gi, "").slice(0, 18) || "Player",
        game: data.game === "snake" ? "snake" : "pearl",
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
      if (data.snapshot?.full) this.latestSnapshot = data.snapshot;
      this.broadcast({ type: "snapshot", snapshot: data.snapshot }, ws);
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
