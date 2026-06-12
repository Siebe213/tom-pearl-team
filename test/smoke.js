'use strict';

const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3917;
const EXTERNAL_URL = process.env.TEST_SERVER_URL || '';
const HTTP_URL = EXTERNAL_URL || `http://127.0.0.1:${PORT}`;
const WS_URL = HTTP_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
const server = EXTERNAL_URL ? null : spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe']
  });

let serverOutput = '';
if (server) {
  server.stdout.on('data', chunk => { serverOutput += chunk; });
  server.stderr.on('data', chunk => { serverOutput += chunk; });
}

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function waitForHealth() {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(`${HTTP_URL}/health`);
      if (response.ok) return response.json();
    } catch (error) {
      // Server is still starting.
    }
    await delay(100);
  }
  throw new Error('Server did not become healthy.\n' + serverOutput);
}

function createPlayer(name, skin) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${WS_URL}/arena`);
    const timeout = setTimeout(() => reject(new Error(`${name} timed out`)), 8000);
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({ type: 'join', name, skin }));
    });
    socket.addEventListener('message', event => {
      const message = JSON.parse(String(event.data));
      if (message.type === 'snapshot' && message.alive) {
        clearTimeout(timeout);
        resolve({ socket, snapshot: message });
      }
    });
    socket.addEventListener('error', reject);
  });
}

async function main() {
  await waitForHealth();
  const [first, second] = await Promise.all([
    createPlayer('SmokeOne', 0),
    createPlayer('SmokeTwo', 4)
  ]);
  await delay(500);
  const health = await (await fetch(`${HTTP_URL}/health`)).json();
  if (health.humans < 2) throw new Error(`Expected at least 2 humans, got ${health.humans}`);
  if (health.bots < 20) throw new Error(`Expected bots in the arena, got ${health.bots}`);
  if (!first.snapshot.entities.cells.length || !second.snapshot.entities.cells.length) {
    throw new Error('Snapshots did not contain arena cells');
  }
  first.socket.send(JSON.stringify({ type: 'action', action: 'split' }));
  first.socket.send(JSON.stringify({ type: 'input', x: 1000, y: 1000 }));
  first.socket.close();
  second.socket.close();
  console.log(`Smoke test passed with ${health.humans} humans and ${health.bots} bots.`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) server.kill();
  });
