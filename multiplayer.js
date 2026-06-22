(() => {
  'use strict';
  const KEY = 'pearlMultiplayerServer';
  const DEFAULT_SERVER = 'https://tom-pearl-multiplayer.siebevandv.workers.dev';
  const state = { socket: null, game: null, room: '', id: '', host: false, snapshotTimer: 0, inputTimer: 0, panel: null, players: new Map() };
  const bridge = game => window.pearlMultiplayerBridge && window.pearlMultiplayerBridge[game];
  const cleanServer = value => String(value || '').trim().replace(/\/$/, '').replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  const code = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  const css = document.createElement('style');
  css.textContent = `
    .mp-panel{margin:14px 0;padding:14px;border:1px solid rgba(255,255,255,.13);border-radius:14px;background:#0b1118;color:#eef5ff;box-shadow:0 12px 34px rgba(0,0,0,.22)}
    .mp-top,.mp-actions,.mp-roomline{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.mp-top{justify-content:space-between;margin-bottom:10px}.mp-top b{letter-spacing:.08em}.mp-status{font-size:12px;color:#9fb0c2}.mp-status.online{color:#62dca4}.mp-status.error{color:#ff778b}
    .mp-panel input{width:auto;min-width:120px;flex:1;background:#080c11;border:1px solid rgba(255,255,255,.16);color:#fff;border-radius:9px;padding:10px}.mp-server{display:none;margin-top:10px}.mp-panel.setup .mp-server{display:flex}.mp-room{font:900 17px ui-monospace,monospace;letter-spacing:.16em;color:#ffd166}.mp-note{font-size:12px;color:#91a2b4;margin-top:9px}.mp-panel .btn{padding:9px 13px}.mp-count{font-size:12px;color:#91a2b4}
    .mp-announcement{position:fixed;left:50%;top:22%;z-index:9999;transform:translate(-50%,-18px);opacity:0;pointer-events:none;text-align:center;font:1000 clamp(24px,5vw,62px)/.9 system-ui;color:#fff;text-shadow:0 5px 30px #000;transition:.22s}.mp-announcement.show{transform:translate(-50%,0);opacity:1}.mp-announcement span{display:block;margin-top:10px;font-size:.28em;letter-spacing:.25em;color:#62dca4}.mp-announcement.leave span{color:#ff778b}.mp-live-leave{position:fixed;right:14px;bottom:14px;z-index:9998;display:none;background:#35151b!important;border-color:#8a3342!important}.mp-live-leave.show{display:block}
  `;
  document.head.appendChild(css);
  const announcement=document.createElement('div');announcement.className='mp-announcement';document.body.appendChild(announcement);const liveLeave=document.createElement('button');liveLeave.className='btn mp-live-leave';liveLeave.textContent='LEAVE GAME';document.body.appendChild(liveLeave);
  let announceTimer=0;function announce(name,leaving=false){clearTimeout(announceTimer);announcement.className='mp-announcement'+(leaving?' leave':'');announcement.innerHTML='<b>'+String(name||'PLAYER').replace(/[<>&]/g,'')+'</b><span>'+(leaving?'LEFT THE GAME':'JOINED THE GAME')+'</span>';void announcement.offsetWidth;announcement.classList.add('show');announceTimer=setTimeout(()=>announcement.classList.remove('show'),2400)}

  function disconnect(silent = false) {
    clearInterval(state.snapshotTimer); clearInterval(state.inputTimer);
    state.snapshotTimer = state.inputTimer = 0;
    if (state.socket) { try { state.socket.close(1000, 'Leaving room'); } catch (_) {} }
    bridge(state.game)?.disconnect?.();
    state.socket = null; state.id = ''; state.host = false;state.players.clear();liveLeave.classList.remove('show');
    if (!silent) updateStatus('Offline - choose Quick Play to reconnect');
  }

  function updateStatus(text, kind = '') {
    document.querySelectorAll('.mp-status').forEach(el => { el.textContent = text; el.className = 'mp-status ' + kind; });
  }

  function updateRoster(players = []) {
    state.players=new Map(players.map(player=>[player.id,player]));
    document.querySelectorAll('.mp-count').forEach(el => el.textContent = players.length + '/24 online');
  }

  function send(payload) {
    if (state.socket?.readyState === WebSocket.OPEN) state.socket.send(JSON.stringify(payload));
  }

  function startLoops() {
    clearInterval(state.snapshotTimer); clearInterval(state.inputTimer);
    state.snapshotTimer = setInterval(() => {
      if (!state.host) return;
      const snapshot = bridge(state.game)?.snapshot?.();
      if (snapshot) send({ type: 'snapshot', snapshot });
    }, 100);
    state.inputTimer = setInterval(() => {
      if (state.host) return;
      const input = bridge(state.game)?.input?.();
      if (input) send({ type: 'input', input });
    }, 66);
  }

  function connect(game, room, name, panel) {
    disconnect(true);
    const serverInput = panel.querySelector('.mp-server input');
    const localDev = ['localhost', '127.0.0.1'].includes(location.hostname);
    const server = cleanServer(localDev ? (serverInput.value || localStorage.getItem(KEY) || DEFAULT_SERVER) : DEFAULT_SERVER);
    if (!server || server.includes('<account>')) {
      panel.classList.add('setup');
      updateStatus('Add the free Worker address first', 'error');
      return;
    }
    localStorage.setItem(KEY, server); serverInput.value = server;
    state.game = game; state.room = room.toUpperCase(); state.panel = panel;
    updateStatus('Connecting to room ' + state.room + '...');
    let ws;
    try { ws = new WebSocket(server + '/room/' + encodeURIComponent(game + '-' + state.room)); }
    catch (_) { updateStatus('Invalid server address', 'error'); return; }
    state.socket = ws;
    ws.onopen = () => send({ type: 'hello', game, name });
    ws.onerror = () => updateStatus('Could not reach the multiplayer server - retry in a moment', 'error');
    ws.onclose = event => { if (state.socket === ws) { disconnect(true); updateStatus('Connection closed' + (event.code ? ' (' + event.code + ')' : '') + ' - click Quick Play to retry', 'error'); } };
    ws.onmessage = event => {
      let msg; try { msg = JSON.parse(event.data); } catch (_) { return; }
      const api = bridge(game); if (!api) return;
      if (msg.type === 'welcome') {
        state.id = msg.id; state.host = !!msg.host; api.setIdentity?.(state.id);
        if (state.host) api.startHost?.(); else api.startGuest?.(msg.snapshot);
        updateRoster(msg.players);liveLeave.classList.add('show');updateStatus((state.host ? 'Hosting' : 'Joined') + ' room ' + state.room, 'online'); startLoops();
      } else if (msg.type === 'joined'){state.players.set(msg.player.id,msg.player);announce(msg.player.name,false);if(state.host)api.addRemote?.(msg.player)}
      else if (msg.type === 'left'){const leaving=state.players.get(msg.id);if(leaving)announce(leaving.name,true);state.players.delete(msg.id);api.removeRemote?.(msg.id)}
      else if (msg.type === 'input' && state.host) api.remoteInput?.(msg.id, msg.input);
      else if (msg.type === 'snapshot' && !state.host) api.applySnapshot?.(msg.snapshot);
      else if (msg.type === 'roster') updateRoster(msg.players);
      else if (msg.type === 'role' && msg.host) {
        state.host = true; api.promote?.(msg.snapshot); updateStatus('You are now hosting room ' + state.room, 'online');
      }
    };
  }

  function makePanel(game) {
    const panel = document.createElement('div'); panel.className = 'mp-panel';
    const saved = localStorage.getItem(KEY) || (location.hostname.endsWith('.workers.dev') ? location.origin : DEFAULT_SERVER);
    panel.innerHTML = `<div class="mp-top"><b>MULTIPLAYER</b><span class="mp-status">Ready for Quick Play</span></div>
      <div class="mp-actions"><button class="btn primary mp-quick">Quick Play</button><button class="btn mp-create">Private room</button><input class="mp-code" maxlength="16" placeholder="ROOM CODE"><button class="btn mp-join">Join room</button><button class="btn mp-leave">Leave</button><span class="mp-count">0/24 online</span></div>
      <div class="mp-roomline" style="margin-top:9px"><span class="mp-note">Room:</span><span class="mp-room">------</span><button class="btn mp-setup">Server setup</button></div>
      <div class="mp-server"><input value="${saved}" placeholder="wss://your-worker.workers.dev"><button class="btn mp-save">Save server</button></div>
      <div class="mp-note">Both arenas are multiplayer-only. Graphics, food density and bot intelligence stay at full quality.</div>`;
    const name = () => game === 'pearl' ? (document.getElementById('playerName')?.value || 'PearlConsumer') : (document.getElementById('snakeName')?.value || 'PearlRider');
    panel.querySelector('.mp-quick').onclick = () => { const room = 'PUBLIC-1'; panel.querySelector('.mp-code').value = room; panel.querySelector('.mp-room').textContent = room; connect(game, room, name(), panel); };
    panel.querySelector('.mp-create').onclick = () => { const room = code(); panel.querySelector('.mp-code').value = room; panel.querySelector('.mp-room').textContent = room; connect(game, room, name(), panel); };
    panel.querySelector('.mp-join').onclick = () => { const room = panel.querySelector('.mp-code').value.trim().toUpperCase(); if (room.length < 3) return updateStatus('Enter a room code', 'error'); panel.querySelector('.mp-room').textContent = room; connect(game, room, name(), panel); };
    panel.querySelector('.mp-leave').onclick = () => disconnect();
    panel.querySelector('.mp-setup').onclick = () => panel.classList.toggle('setup');
    panel.querySelector('.mp-save').onclick = () => { const value = cleanServer(panel.querySelector('.mp-server input').value); localStorage.setItem(KEY, value); panel.querySelector('.mp-server input').value = value; updateStatus('Server address saved'); };
    return panel;
  }

  const pearlTarget = document.querySelector('#game > .card');
  const snakeTarget = document.querySelector('#snake .snakeIntro');
  if (pearlTarget) pearlTarget.before(makePanel('pearl'));
  if (snakeTarget) snakeTarget.before(makePanel('snake'));
  liveLeave.onclick=()=>disconnect();
  window.pearlMultiplayerActive = game => state.game === game && state.socket?.readyState === WebSocket.OPEN && !!state.id;
  window.pearlQuickPlay = game => {
    if (window.pearlMultiplayerActive(game)) return true;
    if (state.game === game && state.socket && (state.socket.readyState === WebSocket.CONNECTING || state.socket.readyState === WebSocket.OPEN)) {
      updateStatus('Connecting to the public arena...'); return false;
    }
    const panel = game === 'snake' ? document.querySelector('#snake .mp-panel') : document.querySelector('#game .mp-panel');
    if (!panel) { updateStatus('Multiplayer interface is still loading', 'error'); return false; }
    const room = 'PUBLIC-1'; panel.querySelector('.mp-code').value = room; panel.querySelector('.mp-room').textContent = room;
    const name = game === 'pearl' ? (document.getElementById('playerName')?.value || 'PearlConsumer') : (document.getElementById('snakeName')?.value || 'PearlRider');
    connect(game, room, name, panel); return false;
  };
  window.pearlOpenMultiplayer = game => {
    const target = game === 'snake' ? document.querySelector('#snake .mp-panel') : document.querySelector('#game .mp-panel');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' }); target?.classList.add('setup');
    updateStatus('Create or join an online room before playing', 'error');
  };
  document.querySelectorAll('[data-tab],[data-tab-jump]').forEach(button => button.addEventListener('click', () => {
    const destination = button.dataset.tab || button.dataset.tabJump;
    const requiredTab = state.game === 'snake' ? 'snake' : 'game';
    if (state.socket && destination !== requiredTab) disconnect();
    if (destination === 'game') setTimeout(() => window.pearlQuickPlay('pearl'), 0);
    if (destination === 'snake') setTimeout(() => window.pearlQuickPlay('snake'), 0);
  }));
  window.addEventListener('beforeunload', () => disconnect(true));
})();
