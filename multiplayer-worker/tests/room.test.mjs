import assert from 'node:assert/strict';
import { ArenaRoom } from '../src/index.js';

class Socket {
  constructor() { this.attachment = {}; this.messages = []; }
  serializeAttachment(value) { this.attachment = value; }
  deserializeAttachment() { return this.attachment; }
  send(value) { this.messages.push(JSON.parse(value)); }
  close() {}
}

class State {
  constructor() { this.items = []; }
  getWebSockets() { return this.items; }
  acceptWebSocket(socket) { this.items.push(socket); }
}

const state = new State();
const room = new ArenaRoom(state);
const host = new Socket();
const guest = new Socket();
host.serializeAttachment({ id: 'host-id', ready: false, host: false });
guest.serializeAttachment({ id: 'guest-id', ready: false, host: false });
state.items.push(host, guest);

await room.webSocketMessage(host, JSON.stringify({ type: 'hello', game: 'pearl', name: 'Host' }));
await room.webSocketMessage(guest, JSON.stringify({ type: 'hello', game: 'pearl', name: 'Guest' }));
assert.equal(host.deserializeAttachment().host, true);
assert.equal(guest.deserializeAttachment().host, false);
assert.equal(host.messages.some(message => message.type === 'joined'), true);

await room.webSocketMessage(guest, JSON.stringify({ type: 'input', input: { x: 10, y: 20 } }));
assert.deepEqual(host.messages.at(-1), { type: 'input', id: 'guest-id', input: { x: 10, y: 20 } });

await room.webSocketMessage(host, JSON.stringify({ type: 'snapshot', snapshot: { tick: 7 } }));
assert.deepEqual(guest.messages.at(-1), { type: 'snapshot', snapshot: { tick: 7 } });

await room.webSocketClose(host);
assert.equal(guest.deserializeAttachment().host, true);
assert.equal(guest.messages.some(message => message.type === 'role' && message.host), true);
console.log('room relay, snapshots, input routing and host migration OK');
