import http from "node:http";
import { WebSocketServer } from "ws";
import { parseRoomPath, RoomHub } from "./room-core.mjs";

const port = Number(process.env.PORT || 3000);
const hub = new RoomHub();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ ok: true, rooms: hub.rooms.size }));
    return;
  }
  res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "access-control-allow-origin": "*" });
  res.end("Tom Pearl multiplayer server is online. Use /room/<game-room> with WebSocket.");
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const parsed = parseRoomPath(url.pathname);
  if (!parsed) {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });
    const room = hub.get(parsed.room, parsed.game);
    ws.on("message", raw => room.message(ws, raw.toString()));
    ws.on("close", () => room.leave(ws));
    ws.on("error", () => room.leave(ws));
    wss.emit("connection", ws, req);
  });
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      try { ws.terminate(); } catch (_) {}
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  }
  hub.prune();
}, 30000).unref();

server.listen(port, "0.0.0.0", () => {
  console.log(`Tom Pearl multiplayer server listening on ${port}`);
});
