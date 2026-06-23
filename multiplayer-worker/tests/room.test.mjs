import assert from 'node:assert/strict';
import { ArenaRoom } from '../src/index.js';

class Socket {
  constructor() { this.attachment = {}; this.messages = []; this.closed = null; }
  serializeAttachment(value) { this.attachment = value; }
  deserializeAttachment() { return this.attachment; }
  send(value) { this.messages.push(JSON.parse(value)); }
  close(code, reason) { this.closed = { code, reason }; }
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

const fullSnapshot = {
  g: 'pearl', tick: 7, full: true,
  host: { name: '<Host>', cells: [] },
  bots: [{ name: '<script>Bot</script>', cells: [] }],
  food: [], viruses: [], powers: []
};
await room.webSocketMessage(host, JSON.stringify({ type: 'snapshot', snapshot: fullSnapshot }));
assert.equal(guest.messages.at(-1).snapshot.host.name, 'Host');
assert.equal(guest.messages.at(-1).snapshot.bots[0].name, 'scriptBotscript');
assert.equal(room.latestSnapshot.tick, 7);

await room.webSocketClose(host);
assert.equal(guest.deserializeAttachment().host, true);
assert.equal(guest.messages.some(message => message.type === 'role' && message.host), true);

const expansionState = new State();
const expansionRoom = new ArenaRoom(expansionState);
const battleHost = new Socket();
const battleGuest = new Socket();
battleHost.serializeAttachment({ id: 'battle-host', ready: false, host: false });
battleGuest.serializeAttachment({ id: 'battle-guest', ready: false, host: false });
expansionState.items.push(battleHost, battleGuest);
await expansionRoom.webSocketMessage(battleHost, JSON.stringify({ type: 'hello', game: 'battle', name: 'Host' }));
await expansionRoom.webSocketMessage(battleGuest, JSON.stringify({ type: 'hello', game: 'battle', name: 'Guest' }));
await expansionRoom.webSocketMessage(battleHost, JSON.stringify({ type: 'snapshot', snapshot: { g: 'battle', full: true, actors: [{ name: '<Tom>', x: 1, y: 2 }], bullets: [], pickups: [] } }));
assert.equal(battleGuest.messages.at(-1).snapshot.actors[0].name, 'Tom');
assert.equal(battleHost.closed, null);
console.log('room relay, snapshots, input routing and host migration OK');
