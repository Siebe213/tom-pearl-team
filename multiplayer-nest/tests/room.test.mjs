import assert from "node:assert/strict";
import { Room, parseRoomPath, sanitizeSnapshot } from "../room-core.mjs";

class FakeSocket {
  constructor() {
    this.readyState = 1;
    this.messages = [];
    this.closed = false;
  }
  send(value) {
    this.messages.push(JSON.parse(value));
  }
  close(code, reason) {
    this.closed = true;
    this.closeCode = code;
    this.closeReason = reason;
  }
}

assert.deepEqual(parseRoomPath("/room/snake-PUBLIC-1"), { room: "SNAKE-PUBLIC-1", game: "snake" });
assert.equal(parseRoomPath("/room/no"), null);

const room = new Room("PEARL-TEST", "pearl");
const host = new FakeSocket();
const guest = new FakeSocket();
room.message(host, JSON.stringify({ type: "hello", game: "pearl", name: "Host" }));
room.message(guest, JSON.stringify({ type: "hello", game: "pearl", name: "Guest" }));
assert.equal(host.messages[0].host, true);
assert.equal(guest.messages[0].host, false);
room.message(guest, JSON.stringify({ type: "input", input: { x: 10, y: 20 } }));
assert.deepEqual(host.messages.at(-1), { type: "input", id: "p2", input: { x: 10, y: 20 } });

const snap = { g: "pearl", full: true, host: { name: "<Host>", cells: [] }, bots: [{ name: "<Bot>" }], food: [] };
room.message(host, JSON.stringify({ type: "snapshot", snapshot: snap }));
assert.equal(guest.messages.at(-1).snapshot.host.name, "Host");
assert.equal(room.latestSnapshot.host.name, "Host");

room.leave(host);
assert.equal(guest.messages.some(msg => msg.type === "role" && msg.host), true);

assert.equal(sanitizeSnapshot({ g: "snake", snakes: Array.from({ length: 121 }) }, "snake"), null);
assert.equal(sanitizeSnapshot({ g: "battle", actors: [{ name: "<Tom>" }] }, "battle").actors[0].name, "Tom");

console.log("Nest room core OK");
