(() => {
'use strict';

const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const timeText = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

const css = document.createElement('style');
css.textContent = `
.expansionTab{--exp:#4ca3ff}.expIntro{display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;padding:22px;margin-bottom:14px;background:linear-gradient(145deg,#0a1118,#111a24)}.expIntro h2{margin:4px 0;font-size:clamp(1.8rem,4vw,3rem)}.expIntro p{max-width:720px}.expLoadout{display:grid;grid-template-columns:auto minmax(150px,220px);gap:8px;align-items:center}.expLoadout .btn{grid-column:1/-1}.expShell{height:clamp(610px,77vh,850px);position:relative;overflow:hidden;border:1px solid #2b3947;border-radius:12px;background:#071018;box-shadow:0 24px 70px #0007}.expShell canvas{display:block;width:100%;height:100%;touch-action:none}.expHud{position:absolute;left:14px;top:14px;display:flex;flex-wrap:wrap;gap:5px;max-width:76%;pointer-events:none}.expHud span{padding:7px 9px;border:1px solid #ffffff20;border-radius:6px;background:#081018e8;font:700 11px ui-monospace,monospace}.expHud b{color:#7dd3fc}.expObjective{position:absolute;right:14px;top:14px;padding:8px 11px;border:1px solid #ffffff20;border-radius:6px;background:#081018e8;font:900 11px ui-monospace,monospace;letter-spacing:.08em}.expOverlay{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:12px;padding:20px;background:linear-gradient(90deg,#03070be8,#03070b88);pointer-events:none;z-index:4}.expOverlay b{font:1000 clamp(2.2rem,7vw,5.8rem)/.85 system-ui}.expOverlay span{color:#c8d2dd;max-width:620px}.expOverlay.hidden{display:none}.expOverlay.spectate{inset:75px 0 auto;background:none;text-shadow:0 3px 18px #000}.expOverlay.spectate b{font-size:clamp(1.2rem,3vw,2.2rem)}.expOverlay.spectate span{color:#fff}.expNotice{display:none}.defenseTools{position:absolute;left:14px;bottom:14px;display:flex;gap:6px;flex-wrap:wrap;z-index:2}.defenseTools .active{border-color:#67e8f9;color:#67e8f9}.survivorXp{position:absolute;left:14px;right:14px;bottom:12px;height:7px;border-radius:9px;background:#ffffff18;overflow:hidden}.survivorXp i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#a78bfa)}.upgradePanel{position:absolute;inset:0;display:none;place-content:center;grid-template-columns:repeat(3,minmax(160px,230px));gap:10px;background:#02060be8;padding:20px;z-index:8}.upgradePanel.show{display:grid}.upgradePanel button{min-height:155px;padding:18px;border:1px solid #ffffff28;border-radius:10px;background:#101b28;color:#fff;text-align:left;cursor:pointer}.upgradePanel button:hover{border-color:#67e8f9;transform:translateY(-2px)}.upgradePanel b{display:block;font-size:18px;margin-bottom:8px}.upgradePanel span{color:#a8b7c7}.upgradePanel em{display:block;margin-bottom:14px;color:#fbbf24;font:800 10px ui-monospace;letter-spacing:.12em}.expBar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(420px,60%);height:8px;background:#0008;border:1px solid #ffffff1f;border-radius:20px;overflow:hidden;pointer-events:none}.expBar i{display:block;height:100%;background:#22d3ee}.kartPower{position:absolute;right:14px;bottom:14px;padding:8px 12px;border-radius:7px;background:#081018e8;border:1px solid #ffffff20;font:900 12px ui-monospace;color:#fbbf24}.defenseTip{position:absolute;right:14px;bottom:14px;max-width:270px;padding:8px 10px;border-radius:7px;background:#081018e8;border:1px solid #ffffff20;color:#b8c5d2;font:700 11px ui-monospace;pointer-events:none}
@media(max-width:760px){.expIntro{grid-template-columns:1fr}.expLoadout{grid-template-columns:auto 1fr}.expShell{height:600px}.expHud{max-width:94%}.expObjective{top:auto;bottom:12px}.defenseTools{bottom:48px}.defenseTip{display:none}.upgradePanel{grid-template-columns:1fr}.upgradePanel button{min-height:90px}}
body:has(.expansionTab.active) .musicDock,body:has(.expansionTab.active) .coinbar{opacity:.12}
`;
document.head.appendChild(css);

const skins = window.pearlSkinBridge?.list?.() || [{id:0,name:'Core',color:'#22d3ee',img:'',unlocked:true}];
const images = new Map();
for (const s of skins) if (s.img) { const im = new Image(); im.src = s.img; images.set(s.id, im); }
document.querySelectorAll('.expSkin').forEach(sel => {
  const unlocked = skins.filter(s => s.unlocked);
  sel.innerHTML = skins.map(s => `<option value="${s.id}" ${s.unlocked ? '' : 'disabled'}>${s.name}${s.unlocked ? '' : ' (locked)'}</option>`).join('');
  const current = window.pearlSkinBridge?.selected?.();
  sel.value = String(unlocked.some(s => s.id === current) ? current : unlocked[0]?.id || 0);
});
const skin = id => skins.find(s => s.id === id) || skins[0];
const names = ['Tom Prime','Pearl Ace','Crown Thomas','Archive King','Polo Form','Mirror Tom','Legend Echo','Grand Pearl','Turbo Tom','Neon Thomas','Closeup','Pearl Disciple','Thomas P','No Filter','The Original'];

function avatar(ctx, a, r = 18) {
  const s = skin(a.skin), im = images.get(s.id);
  ctx.save(); ctx.translate(a.x, a.y); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  if (im && im.complete) ctx.drawImage(im, -r, -r, r * 2, r * 2);
  else { ctx.fillStyle = s.color || a.color || '#22d3ee'; ctx.fillRect(-r, -r, r * 2, r * 2); }
  ctx.restore(); ctx.strokeStyle = a.dead ? '#64748b' : (a.remote ? '#fff' : s.color || '#67e8f9'); ctx.lineWidth = a.remote ? 3 : 2;
  ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.stroke();
}

function drawFighter(ctx, a, style = 'battle') {
  const color = skin(a.skin).color || '#22d3ee';
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle || 0);
  ctx.fillStyle = '#071018'; ctx.fillRect(-13, 13, 10, 15); ctx.fillRect(3, 13, 10, 15);
  ctx.fillStyle = style === 'survivor' ? '#27364a' : '#1c2936'; ctx.beginPath(); ctx.roundRect(-19,-17,38,37,8); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(-19,-4,38,8); ctx.fillStyle = '#dbeafe'; ctx.fillRect(11,-7,27,7);
  ctx.fillStyle = '#334155'; ctx.fillRect(30,-10,11,13); ctx.restore(); avatar(ctx,a,15);
}

function drawKartSprite(ctx, a) {
  const color = skin(a.skin).color || '#22d3ee'; ctx.save(); ctx.translate(a.x,a.y); ctx.rotate(a.angle);
  ctx.fillStyle='#070b10';ctx.fillRect(-21,-21,12,8);ctx.fillRect(10,-21,12,8);ctx.fillRect(-21,13,12,8);ctx.fillRect(10,13,12,8);
  ctx.fillStyle='#111827';ctx.fillRect(-27,-16,10,32);ctx.fillRect(19,-18,8,36);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-23,-14);ctx.lineTo(20,-11);ctx.lineTo(27,0);ctx.lineTo(20,11);ctx.lineTo(-23,14);ctx.closePath();ctx.fill();
  ctx.fillStyle='#dbeafe';ctx.beginPath();ctx.moveTo(-3,-10);ctx.lineTo(14,-7);ctx.lineTo(14,7);ctx.lineTo(-3,10);ctx.closePath();ctx.fill();ctx.fillStyle='#0f172a';ctx.fillRect(-4,-7,12,14);
  ctx.fillStyle='#f8fafc';ctx.fillRect(20,-8,8,5);ctx.fillRect(20,3,8,5);if(a.shield){ctx.strokeStyle='#67e8f9';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,35,27,0,0,TAU);ctx.stroke();}
  if(a.drifting){ctx.strokeStyle='#dbeafe88';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-20,-12);ctx.lineTo(-48,-18);ctx.moveTo(-20,12);ctx.lineTo(-48,18);ctx.stroke();}ctx.restore();avatar(ctx,a,10);
}

function drawTowerSprite(ctx, t, selected = false) {
  const colors={pulse:'#fb7185',frost:'#67e8f9',crown:'#fbbf24'},color=colors[t.type]||'#fb7185';ctx.save();ctx.translate(t.x,t.y);
  if(selected){ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,t.range,0,TAU);ctx.stroke();}
  ctx.fillStyle='#111827';ctx.beginPath();ctx.moveTo(-30,23);ctx.lineTo(-22,-20);ctx.lineTo(22,-20);ctx.lineTo(30,23);ctx.closePath();ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#263545';ctx.fillRect(-17,-26,34,31);if(t.type==='pulse'){ctx.fillStyle=color;ctx.fillRect(4,-8,34,9);ctx.fillRect(27,-12,13,17);}else if(t.type==='frost'){ctx.fillStyle=color;for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.fillRect(0,-4,31,8);}}else{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-18,-23);ctx.lineTo(-10,-40);ctx.lineTo(0,-27);ctx.lineTo(10,-42);ctx.lineTo(19,-23);ctx.closePath();ctx.fill();ctx.fillStyle='#fff7';ctx.fillRect(2,-13,38,7);}ctx.restore();avatar(ctx,t,13);
}

function drawEnemySprite(ctx, e) {
  ctx.save();ctx.translate(e.x,e.y);const hit=e.slow>0?'#67e8f9':null;
  if(e.type==='runner'||e.type==='charger'){ctx.rotate(Math.atan2(e.vy||0,e.vx||1));ctx.fillStyle=hit||'#fb7185';ctx.beginPath();ctx.moveTo(25,0);ctx.lineTo(-15,-15);ctx.lineTo(-7,0);ctx.lineTo(-15,15);ctx.closePath();ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(-8,-5,13,10);}
  else if(e.type==='tank'){ctx.fillStyle=hit||'#7c3aed';ctx.fillRect(-e.r,-e.r*.72,e.r*2,e.r*1.44);ctx.fillStyle='#111827';ctx.fillRect(-e.r-5,-e.r*.9,8,e.r*1.8);ctx.fillRect(e.r-3,-e.r*.9,8,e.r*1.8);ctx.fillStyle='#c4b5fd';ctx.fillRect(-5,-e.r-8,10,e.r+8);}
  else if(e.type==='shooter'){ctx.fillStyle=hit||'#38bdf8';ctx.beginPath();ctx.moveTo(0,-e.r);ctx.lineTo(e.r,0);ctx.lineTo(0,e.r);ctx.lineTo(-e.r,0);ctx.closePath();ctx.fill();ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(0,0,e.r*.45,0,TAU);ctx.fill();ctx.fillStyle='#e0f2fe';ctx.fillRect(e.r*.5,-3,e.r,6);}
  else if(e.type==='boss'){ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.moveTo(-e.r,e.r*.55);ctx.lineTo(-e.r*.82,-e.r*.65);ctx.lineTo(-e.r*.35,-e.r*.18);ctx.lineTo(0,-e.r);ctx.lineTo(e.r*.35,-e.r*.18);ctx.lineTo(e.r*.82,-e.r*.65);ctx.lineTo(e.r,e.r*.55);ctx.closePath();ctx.fill();ctx.fillStyle='#713f12';ctx.beginPath();ctx.arc(0,5,e.r*.38,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-19,-2,12,6);ctx.fillRect(7,-2,12,6);}
  else {ctx.fillStyle=hit||'#ef4444';ctx.beginPath();for(let i=0;i<8;i++){const a=i*TAU/8,r=i%2?e.r*.72:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(-e.r*.42,-4,e.r*.84,9);ctx.fillStyle='#fff';ctx.fillRect(-e.r*.3,-2,5,4);ctx.fillRect(e.r*.08,-2,5,4);}ctx.restore();
}

function battleArena(ctx) {
  ctx.fillStyle='#101e29';ctx.fillRect(0,870,2700,260);ctx.fillRect(1230,0,250,2000);ctx.strokeStyle='#ffffff12';ctx.lineWidth=4;ctx.setLineDash([42,35]);ctx.beginPath();ctx.moveTo(0,1000);ctx.lineTo(2700,1000);ctx.moveTo(1355,0);ctx.lineTo(1355,2000);ctx.stroke();ctx.setLineDash([]);
  const cover=[[120,760,100,28],[540,1210,135,28],[1080,610,28,120],[1510,1240,120,28],[2070,820,28,130],[2380,1340,120,28]];for(const b of cover){ctx.fillStyle='#304657';ctx.fillRect(...b);ctx.fillStyle='#7dd3fc22';ctx.fillRect(b[0]+5,b[1]+5,Math.max(0,b[2]-10),Math.max(0,b[3]-10));}
  ctx.fillStyle='#fbbf2418';ctx.beginPath();ctx.moveTo(1350,760);ctx.lineTo(1460,930);ctx.lineTo(1350,1100);ctx.lineTo(1240,930);ctx.closePath();ctx.fill();
}

function kartArena(ctx) {
  const stands=[[570,470,560,90],[1570,470,560,90],[570,1435,560,90],[1570,1435,560,90]];for(const s of stands){ctx.fillStyle='#18232d';ctx.fillRect(...s);for(let x=s[0]+18;x<s[0]+s[2]-10;x+=34){ctx.fillStyle=(x/34)%2<1?'#38bdf8':'#fbbf24';ctx.fillRect(x,s[1]+14,18,s[3]-28);}}
  ctx.fillStyle='#263442';ctx.fillRect(1185,570,330,120);ctx.strokeStyle='#94a3b8';ctx.strokeRect(1185,570,330,120);ctx.fillStyle='#f8fafc18';for(let x=1205;x<1490;x+=42)ctx.fillRect(x,585,24,90);
  ctx.strokeStyle='#ef4444';ctx.lineWidth=15;ctx.beginPath();ctx.ellipse(1350,1000,1135,805,0,0,TAU);ctx.stroke();ctx.strokeStyle='#f8fafc';ctx.setLineDash([28,28]);ctx.stroke();ctx.setLineDash([]);
}

function defenseArena(ctx) {
  ctx.fillStyle='#172d26';for(let x=65;x<1850;x+=180)for(let y=65;y<1050;y+=180){ctx.fillRect(x,y,92,92);ctx.strokeStyle='#2c493e';ctx.strokeRect(x,y,92,92);}
  ctx.fillStyle='#243941';ctx.fillRect(1635,845,240,170);ctx.strokeStyle='#fbbf24';ctx.lineWidth=5;ctx.strokeRect(1635,845,240,170);ctx.fillStyle='#fbbf2420';ctx.beginPath();ctx.moveTo(1755,865);ctx.lineTo(1825,970);ctx.lineTo(1685,970);ctx.closePath();ctx.fill();
  ctx.fillStyle='#0b1519';for(const x of [45,470,900,1325,1750]){ctx.fillRect(x,20,110,38);ctx.fillRect(x,1040,110,38);}
}

function survivorArena(ctx) {
  const ruins=[[210,180,240,90],[750,230,100,280],[1660,180,310,80],[2090,480,120,310],[300,1280,330,95],[1040,1430,120,260],[1800,1390,330,95]];for(const r of ruins){ctx.fillStyle='#142634';ctx.fillRect(...r);ctx.strokeStyle='#2d4759';ctx.lineWidth=5;ctx.strokeRect(...r);ctx.fillStyle='#071018';for(let x=r[0]+25;x<r[0]+r[2]-20;x+=58)ctx.fillRect(x,r[1]+18,25,Math.min(34,r[3]-25));}
  ctx.strokeStyle='#4c1d9566';ctx.lineWidth=7;for(let i=0;i<11;i++){const x=(i*397)%2400+40,y=(i*683)%1700+50;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+35,y+18);ctx.lineTo(x+12,y+55);ctx.stroke();}
  ctx.fillStyle='#a78bfa22';ctx.beginPath();ctx.moveTo(1250,760);ctx.lineTo(1415,925);ctx.lineTo(1250,1090);ctx.lineTo(1085,925);ctx.closePath();ctx.fill();ctx.strokeStyle='#a78bfa66';ctx.stroke();
}

function fit(canvas, ctx) {
  const r = canvas.getBoundingClientRect();
  const d = Math.min(devicePixelRatio || 1, window.pearlPerformance?.profile?.().dpr || 1.5);
  if (canvas.width !== Math.round(r.width * d) || canvas.height !== Math.round(r.height * d)) {
    canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d); ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  return {w:r.width,h:r.height,d};
}

function addNotice(shell) {
  let el = shell.querySelector('.expNotice');
  if (!el) { el = document.createElement('div'); el.className = 'expNotice'; shell.appendChild(el); }
  return el;
}

class BaseGame {
  constructor(id, title) {
    this.id = id; this.title = title; this.canvas = $(id + 'Canvas'); this.ctx = this.canvas.getContext('2d', {alpha:false,desynchronized:true});
    this.shell = this.canvas.closest('.expShell'); this.overlay = $(id + 'Overlay'); this.startButton = document.querySelector(`.expStart[data-game="${id}"]`);
    this.noticeEl = addNotice(this.shell); this.running = false; this.connected = false; this.guest = false; this.phase = 'idle'; this.countdown = 0;
    this.actors = []; this.remoteInputs = new Map(); this.remoteId = ''; this.keys = {}; this.mouse = {x:0,y:0,down:false}; this.last = 0; this.raf = 0;
    this.pendingStart = false; this.readyUntil = 0; this.noticeTimer = 0; this.result = null; this.bind();
    window.pearlMultiplayerBridge = window.pearlMultiplayerBridge || {}; window.pearlMultiplayerBridge[id] = this.bridge();
  }
  bind() {
    this.canvas.addEventListener('pointermove', e => { const r = this.canvas.getBoundingClientRect(); this.mouse.x = e.clientX - r.left; this.mouse.y = e.clientY - r.top; });
    this.canvas.addEventListener('pointerdown', () => this.mouse.down = true); window.addEventListener('pointerup', () => this.mouse.down = false);
    window.addEventListener('keydown', e => { if ($(this.id)?.classList.contains('active')) { this.keys[e.code] = true; if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault(); } });
    window.addEventListener('keyup', e => this.keys[e.code] = false);
    this.startButton?.addEventListener('click', () => { this.pendingStart = true; if (window.pearlMultiplayerActive?.(this.id)) this.requestStart(); else window.pearlQuickPlay?.(this.id); });
    new ResizeObserver(() => fit(this.canvas, this.ctx)).observe(this.canvas);
  }
  selectedSkin() { return Number(document.querySelector(`.expSkin[data-game="${this.id}"]`)?.value) || 0; }
  showOverlay(title, text, mode = '') { this.overlay.className = 'expOverlay' + (mode ? ' ' + mode : ''); this.overlay.innerHTML = `<b>${title}</b><span>${text}</span>`; }
  hideOverlay() { this.overlay.className = 'expOverlay hidden'; }
  notice(text, duration = 1300) { clearTimeout(this.noticeTimer); this.noticeEl.textContent = text; this.noticeEl.classList.add('show'); this.noticeTimer = setTimeout(() => this.noticeEl.classList.remove('show'), duration); }
  syncOverlay() {
    if (this.phase === 'lobby') this.showOverlay(this.title, this.guest ? 'Press the start button when you are ready. The host controls the countdown.' : 'Connected. Press the start button when you are ready.');
    else if (this.phase === 'countdown') this.showOverlay(this.countdown > .7 ? String(Math.ceil(this.countdown - .7)) : 'GO', 'Get ready');
    else if (this.phase === 'playing' && !this.spectating) this.hideOverlay();
    else if (this.phase === 'ended' && this.result) this.showOverlay(this.result.title, this.result.text);
    if (this.startButton) this.startButton.textContent = this.phase === 'ended' ? 'Play again' : this.phase === 'lobby' ? (this.guest ? 'Ready' : 'Start') : this.phase === 'countdown' ? 'Starting...' : 'In game';
  }
  connect(guest = false, snapshot = null) {
    this.guest = guest; this.connected = true; this.running = true; this.result = null; this.spectating = false;
    if (!snapshot) { this.init(); this.phase = 'lobby'; } else { this.init(); this.apply(snapshot); }
    this.last = performance.now(); this.syncOverlay(); cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.loop);
    if (this.pendingStart) setTimeout(() => this.requestStart(), 80);
  }
  requestStart(fromRemote = false) {
    this.pendingStart = false;
    if (!this.connected) { window.pearlQuickPlay?.(this.id); return; }
    if (this.guest && !fromRemote) { this.readyUntil = performance.now() + 1800; this.notice('READY SENT TO HOST'); this.syncOverlay(); return; }
    if (!['lobby','ended'].includes(this.phase)) return;
    const remotes = (this.actors || []).filter(a => a.remote && a.netId).map(a => ({id:a.netId,name:a.name}));
    this.init(); for (const p of remotes) this.spawnRemote(p); this.phase = 'countdown'; this.countdown = 3.7; this.result = null; this.spectating = false; this.last = performance.now(); this.syncOverlay();
  }
  loop = t => {
    if (!this.running) return;
    const profile = window.pearlPerformance?.profile?.() || {fps:60}; const min = 1000 / (profile.fps || 60);
    if (t - this.last < min * .72) { this.raf = requestAnimationFrame(this.loop); return; }
    const dt = Math.min(.04, (t - this.last) / 1000 || .016); this.last = t;
    if (!this.guest && this.phase === 'countdown') { this.countdown -= dt; if (this.countdown <= 0) { this.countdown = 0; this.phase = 'playing'; this.onGo?.(); this.notice('GO!', 900); } this.syncOverlay(); }
    if (!this.guest && this.phase === 'playing') this.update(dt, t);
    this.render(t); this.raf = requestAnimationFrame(this.loop);
  };
  finish(title, text) { this.phase = 'ended'; this.result = {title,text}; this.syncOverlay(); }
  stop() { this.running = false; this.connected = false; this.phase = 'idle'; cancelAnimationFrame(this.raf); if(this.startButton)this.startButton.textContent='Play'; this.showOverlay(this.title, 'Join the arena to play.'); }
  bridge() {
    return {
      setIdentity:id => this.remoteId = id,
      startHost:() => this.connect(false), startGuest:s => this.connect(true, s),
      addRemote:p => this.addRemote(p), removeRemote:id => this.removeRemote(id),
      remoteInput:(id, input) => { const i = input || {}; if (i.__ready) this.requestStart(true); this.remoteInputs.set(id, i); },
      input:() => ({...this.getInput(), __ready:performance.now() < this.readyUntil}),
      snapshot:() => this.pack(),
      applySnapshot:s => { this.apply(s); this.syncOverlay(); },
      promote:s => { if (s) this.apply(s); this.guest = false; this.connected = true; this.running = true; },
      disconnect:() => this.stop()
    };
  }
  basePack() { return {phase:this.phase,countdown:this.countdown,result:this.result}; }
  applyBase(s) { if (s.phase) this.phase = s.phase; this.countdown = Number(s.countdown) || 0; this.result = s.result || null; }
  inputFor(a) { return a.remote ? this.remoteInputs.get(a.netId) || {} : a.player ? this.getInput() : null; }
  addRemote(info) { if (!info?.id || this.actors.some(a => a.netId === info.id)) return; this.spawnRemote(info); }
  removeRemote(id) { this.actors = this.actors.filter(a => a.netId !== id); }
  reward(coins, xp = 0) { window.pearlAddCoins?.(coins); if (xp && window.pearlV22?.xp) window.pearlV22.xp(xp); }
}

class BattleGame extends BaseGame {
  constructor() { super('battle', 'PEARL BATTLE ROYALE'); }
  init() {
    this.W = 2700; this.H = 2000; this.zone = {x:1350,y:1000,r:1250,target:1250,next:18}; this.bullets = []; this.pickups = []; this.effects = [];
    this.kos = 0; this.elapsed = 0; this.supplyAt = 16; this.actors = []; this.lastKiller = null;
    this.obstacles = [
      {x:350,y:300,w:300,h:170},{x:930,y:180,w:180,h:350},{x:1600,y:250,w:420,h:150},{x:2180,y:420,w:230,h:300},
      {x:260,y:1050,w:240,h:420},{x:760,y:830,w:430,h:180},{x:1450,y:760,w:230,h:400},{x:1900,y:1050,w:450,h:170},
      {x:650,y:1560,w:400,h:150},{x:1320,y:1530,w:190,h:300},{x:1950,y:1510,w:310,h:180}
    ];
    for (let i = 0; i < 23; i++) this.actors.push(this.makeActor(names[i % names.length] + ' ' + (i + 1)));
    this.player = this.makeActor('You', true, this.remoteId); this.player.x = 1350; this.player.y = 1000; this.actors.push(this.player);
    for (let i = 0; i < 105; i++) this.dropLoot(rnd(60,this.W-60),rnd(60,this.H-60),i % 13 === 0 ? 'weapon' : i % 7 === 0 ? 'shield' : i % 3 === 0 ? 'ammo' : 'heal');
    this.camera = {x:this.player.x,y:this.player.y}; this.hud();
  }
  makeActor(name, player = false, netId = '') {
    return {name,player,remote:!!netId && !player,netId,skin:player?this.selectedSkin():Math.floor(rnd(0,skins.length)),x:rnd(120,2580),y:rnd(120,1880),vx:0,vy:0,hp:100,shield:0,
      weapon:'pulse',ammo:24,reserve:72,kos:0,dead:false,angle:0,shootCd:0,reload:0,dashCd:0,stamina:100,invuln:player?3:1.5,think:0,target:null,goal:null,skill:rnd(.48,.96),bravery:rnd(.45,1.2),error:rnd(-.16,.16),strafe:Math.random()<.5?-1:1};
  }
  spawnRemote(p) { const a = this.makeActor(p.name, false, p.id); a.remote = true; a.x = 1350 + rnd(-100,100); a.y = 1000 + rnd(-100,100); this.actors.push(a); }
  getInput() { const r=this.canvas.getBoundingClientRect(),sx=this.mouse.x-r.width/2,sy=this.mouse.y-r.height/2; return {x:(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0),y:(this.keys.KeyS||this.keys.ArrowDown?1:0)-(this.keys.KeyW||this.keys.ArrowUp?1:0),angle:Math.atan2(sy,sx),shoot:this.mouse.down,dash:!!(this.keys.ShiftLeft||this.keys.ShiftRight),reload:!!this.keys.KeyR}; }
  dropLoot(x,y,type) { this.pickups.push({x,y,type,weapon:type==='weapon'?['scatter','rapid','pulse'][Math.floor(rnd(0,3))]:''}); }
  collides(x,y,r=19) { return this.obstacles.find(o => x+r>o.x && x-r<o.x+o.w && y+r>o.y && y-r<o.y+o.h); }
  moveActor(a,nx,ny) { if (!this.collides(nx,a.y)) a.x=clamp(nx,20,this.W-20); else a.vx*=-.15; if (!this.collides(a.x,ny)) a.y=clamp(ny,20,this.H-20); else a.vy*=-.15; }
  ai(a,t) {
    if (t < a.think && a.goal) return;
    const visible = this.actors.filter(x => x!==a && !x.dead && dist(a,x)<520 + a.skill*180 && !this.lineBlocked(a,x));
    const dangerous = visible.filter(x => x.hp+x.shield > a.hp+a.shield+25).sort((x,y)=>dist(a,x)-dist(a,y))[0];
    const prey = visible.filter(x => x.hp+x.shield < 85 || a.bravery>.9).sort((x,y)=>dist(a,x)-dist(a,y))[0];
    const useful = this.pickups.filter(p => dist(a,p)<480 && ((a.hp<62&&p.type==='heal')||(a.shield<25&&p.type==='shield')||(a.reserve<35&&p.type==='ammo')||p.type==='weapon')).sort((x,y)=>dist(a,x)-dist(a,y))[0];
    if (dist(a,this.zone)>this.zone.r-100) a.goal={x:this.zone.x+rnd(-180,180),y:this.zone.y+rnd(-180,180),kind:'zone'};
    else if (dangerous && a.hp<45*a.bravery) a.goal={x:a.x+(a.x-dangerous.x),y:a.y+(a.y-dangerous.y),kind:'flee',enemy:dangerous};
    else if (prey) a.goal={x:prey.x,y:prey.y,kind:'fight',enemy:prey};
    else if (useful) a.goal={...useful,kind:'loot'};
    else a.goal={x:clamp(a.x+rnd(-450,450),80,this.W-80),y:clamp(a.y+rnd(-450,450),80,this.H-80),kind:'roam'};
    a.think=t+rnd(260,700)+(1-a.skill)*450; if(Math.random()<.16)a.error=rnd(-.35,.35);
  }
  lineBlocked(a,b){return this.obstacles.some(o=>{const steps=5;for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;if(x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h)return true}return false});}
  fire(a) {
    const cfg={pulse:{rate:.22,damage:18,speed:780,spread:.035,count:1,mag:24},rapid:{rate:.095,damage:9,speed:850,spread:.09,count:1,mag:34},scatter:{rate:.64,damage:9,speed:650,spread:.36,count:6,mag:8}}[a.weapon];
    if(a.shootCd>0||a.reload>0)return;if(a.ammo<=0){this.startReload(a,cfg);return}a.ammo--;a.shootCd=cfg.rate;
    for(let n=0;n<cfg.count;n++){const ang=a.angle+rnd(-cfg.spread,cfg.spread);this.bullets.push({x:a.x+Math.cos(ang)*25,y:a.y+Math.sin(ang)*25,vx:Math.cos(ang)*cfg.speed,vy:Math.sin(ang)*cfg.speed,owner:a,life:1.15,damage:cfg.damage});}
  }
  startReload(a,cfg){if(a.reload>0||a.reserve<=0)return;a.reload=a.weapon==='scatter'?1.15:1.45;a.reloadCfg=cfg;}
  finishReload(a){const mag=a.reloadCfg?.mag||24,need=mag-a.ammo,take=Math.min(need,a.reserve);a.ammo+=take;a.reserve-=take;a.reloadCfg=null;}
  hurt(a,d,owner){if(a.dead||a.invuln>0)return;const absorb=Math.min(a.shield,d);a.shield-=absorb;a.hp-=d-absorb;this.effects.push({x:a.x,y:a.y,life:.28,color:absorb?'#60a5fa':'#fb7185'});if(a.hp<=0){a.dead=true;this.lastKiller=owner||this.lastKiller;if(owner){owner.kos++;if(owner===this.player){this.kos++;this.reward(30,15);this.notice('KO '+a.name)}}for(let i=0;i<4;i++)this.dropLoot(a.x+rnd(-22,22),a.y+rnd(-22,22),i===0?'weapon':i===1?'ammo':'heal');if(a===this.player){this.spectating=true;this.showOverlay('ELIMINATED',owner?'Spectating '+owner.name+' while the arena finishes.':'The zone took you. Spectating the survivors.','spectate');}}}
  update(dt,t){
    this.elapsed+=dt;this.zone.next-=dt;if(this.zone.next<=0){this.zone.target=Math.max(170,this.zone.target*.78);this.zone.next=15;this.notice('ZONE SHRINKING');}this.zone.r+=(this.zone.target-this.zone.r)*dt*.5;
    if(this.elapsed>this.supplyAt){this.supplyAt+=18;for(let i=0;i<5;i++)this.dropLoot(this.zone.x+rnd(-this.zone.r*.55,this.zone.r*.55),this.zone.y+rnd(-this.zone.r*.55,this.zone.r*.55),i<2?'weapon':i===2?'shield':'ammo');this.notice('SUPPLY CACHE DROPPED');}
    for(const a of this.actors){if(a.dead)continue;a.shootCd-=dt;a.dashCd-=dt;a.invuln=Math.max(0,(a.invuln||0)-dt);a.stamina=clamp(a.stamina+22*dt,0,100);if(a.reload>0&&(a.reload-=dt)<=0)this.finishReload(a);let i=this.inputFor(a);
      if(!i){this.ai(a,t);const g=a.goal||{x:this.zone.x,y:this.zone.y},enemy=g.enemy;let ang=Math.atan2(g.y-a.y,g.x-a.x),mx=Math.cos(ang),my=Math.sin(ang);if(g.kind==='fight'&&enemy){const d=dist(a,enemy);ang=Math.atan2(enemy.y-a.y,enemy.x-a.x)+a.error;mx=(d>280?Math.cos(ang):d<150?-Math.cos(ang):0)+Math.cos(ang+Math.PI/2)*a.strafe*.55;my=(d>280?Math.sin(ang):d<150?-Math.sin(ang):0)+Math.sin(ang+Math.PI/2)*a.strafe*.55;}i={x:mx,y:my,angle:ang,shoot:!!enemy&&dist(a,enemy)<600&&!this.lineBlocked(a,enemy)&&Math.random()<a.skill,dash:(g.kind==='flee'||dist(a,this.zone)>this.zone.r)&&Math.random()<.06,reload:a.ammo===0};}
      a.angle=Number.isFinite(i.angle)?i.angle:a.angle;const l=Math.hypot(i.x||0,i.y||0)||1;let speed=205;if(i.dash&&a.dashCd<=0&&a.stamina>=30){speed=480;a.dashCd=1.5;a.stamina-=30;}a.vx+=((i.x||0)/l*speed-a.vx)*dt*9;a.vy+=((i.y||0)/l*speed-a.vy)*dt*9;this.moveActor(a,a.x+a.vx*dt,a.y+a.vy*dt);if(i.reload)this.startReload(a,{mag:{pulse:24,rapid:34,scatter:8}[a.weapon]});if(i.shoot)this.fire(a);if(dist(a,this.zone)>this.zone.r)this.hurt(a,dt*12,null);
      for(const p of this.pickups)if(!p.dead&&dist(a,p)<27){p.dead=true;if(p.type==='heal')a.hp=Math.min(100,a.hp+32);if(p.type==='shield')a.shield=Math.min(80,a.shield+35);if(p.type==='ammo')a.reserve+=28;if(p.type==='weapon'){a.weapon=p.weapon;a.ammo={pulse:24,rapid:34,scatter:8}[a.weapon];a.reserve+=20;if(a===this.player)this.notice(a.weapon.toUpperCase()+' EQUIPPED');}}}
    this.pickups=this.pickups.filter(p=>!p.dead);
    for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(this.collides(b.x,b.y,3))b.life=0;for(const a of this.actors)if(b.life>0&&a!==b.owner&&!a.dead&&dist(a,b)<20){b.life=0;this.hurt(a,b.damage,b.owner);}}
    this.bullets=this.bullets.filter(b=>b.life>0);for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    const alive=this.actors.filter(a=>!a.dead);if(alive.length<=1){const winner=alive[0];if(winner===this.player)this.reward(650,220);this.finish(winner===this.player?'CROWN CLAIMED':'MATCH OVER',winner?winner.name+' is the final legend.':'Nobody survived the zone.');}
    const focus=!this.player.dead?this.player:(this.lastKiller&&!this.lastKiller.dead?this.lastKiller:alive[0]||this.player);this.camera.x+=(focus.x-this.camera.x)*.1;this.camera.y+=(focus.y-this.camera.y)*.1;this.hud();
  }
  hud(){if(!this.player)return;$('battleHp').textContent=Math.max(0,Math.ceil(this.player.hp));$('battleShield').textContent=Math.ceil(this.player.shield);$('battleAmmo').textContent=this.player.reload>0?'RELOAD':this.player.ammo+'/'+this.player.reserve;$('battleAlive').textContent=this.actors.filter(a=>!a.dead).length;$('battleKos').textContent=this.kos;$('battleObjective').textContent=(this.player.weapon||'pulse').toUpperCase()+' | ZONE '+Math.round(this.zone.r)+' | '+Math.ceil(this.zone.next)+'s';}
  render(){const {w,h}=fit(this.canvas,this.ctx),c=this.ctx;c.fillStyle='#071018';c.fillRect(0,0,w,h);c.save();c.translate(w/2-this.camera.x,h/2-this.camera.y);c.fillStyle='#0c1923';c.fillRect(0,0,this.W,this.H);battleArena(c);c.strokeStyle='#173044';for(let x=0;x<this.W;x+=100){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.H);c.stroke()}for(let y=0;y<this.H;y+=100){c.beginPath();c.moveTo(0,y);c.lineTo(this.W,y);c.stroke()}c.fillStyle='#ef444422';c.fillRect(0,0,this.W,this.H);c.globalCompositeOperation='destination-out';c.beginPath();c.arc(this.zone.x,this.zone.y,this.zone.r,0,TAU);c.fill();c.globalCompositeOperation='source-over';c.strokeStyle='#fb7185';c.lineWidth=7;c.beginPath();c.arc(this.zone.x,this.zone.y,this.zone.r,0,TAU);c.stroke();
    for(const o of this.obstacles){c.fillStyle='#172531';c.fillRect(o.x,o.y,o.w,o.h);c.strokeStyle='#334c5f';c.lineWidth=5;c.strokeRect(o.x,o.y,o.w,o.h);c.fillStyle='#ffffff08';for(let x=o.x+20;x<o.x+o.w;x+=45)c.fillRect(x,o.y+12,18,o.h-24);}
    for(const p of this.pickups){c.fillStyle=p.type==='heal'?'#34d399':p.type==='shield'?'#60a5fa':p.type==='weapon'?'#f472b6':'#fbbf24';c.beginPath();c.arc(p.x,p.y,p.type==='weapon'?10:7,0,TAU);c.fill();}
    for(const b of this.bullets){c.strokeStyle='#fff3a6';c.lineWidth=3;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.016,b.y-b.vy*.016);c.stroke();}
    for(const e of this.effects){c.globalAlpha=e.life/.28;c.strokeStyle=e.color;c.lineWidth=5;c.beginPath();c.arc(e.x,e.y,28*(1-e.life/.28),0,TAU);c.stroke();}c.globalAlpha=1;
    for(const a of this.actors){if(a.dead)continue;drawFighter(c,a,'battle');if(a.invuln>0){c.strokeStyle='#67e8f9';c.lineWidth=3;c.beginPath();c.arc(a.x,a.y,28,0,TAU);c.stroke();}c.fillStyle='#05080d';c.fillRect(a.x-22,a.y-35,44,5);c.fillStyle=a.hp>45?'#34d399':'#fb7185';c.fillRect(a.x-22,a.y-35,44*clamp(a.hp/100,0,1),5);c.fillStyle='#fff';c.font='10px system-ui';c.textAlign='center';c.fillText(a.name,a.x,a.y+36);}
    c.restore();this.renderMinimap(c,w,h);
  }
  renderMinimap(c,w,h){const mw=150,mh=110,x=w-mw-14,y=h-mh-14;c.fillStyle='#02060bd8';c.fillRect(x,y,mw,mh);c.strokeStyle='#ffffff28';c.strokeRect(x,y,mw,mh);c.strokeStyle='#fb7185';c.beginPath();c.arc(x+this.zone.x/this.W*mw,y+this.zone.y/this.H*mh,this.zone.r/this.W*mw,0,TAU);c.stroke();for(const a of this.actors)if(!a.dead){c.fillStyle=a===this.player?'#fff':'#f87171';c.fillRect(x+a.x/this.W*mw-2,y+a.y/this.H*mh-2,4,4);}}
  pack(){return{v:2,g:'battle',full:true,...this.basePack(),actors:this.actors.map(a=>({name:a.name,id:a.netId||'',netId:a.netId||'',skin:a.skin,x:a.x,y:a.y,hp:a.hp,shield:a.shield,ammo:a.ammo,reserve:a.reserve,weapon:a.weapon,kos:a.kos,dead:a.dead,remote:a.remote,player:a.player})),bullets:this.bullets.map(b=>[b.x,b.y]),pickups:this.pickups.map(p=>[p.x,p.y,p.type,p.weapon]),zone:this.zone,elapsed:this.elapsed};}
  apply(s){if(!s||s.g!=='battle')return;this.applyBase(s);this.actors=s.actors||[];this.player=this.actors.find(a=>a.id===this.remoteId||a.netId===this.remoteId)||this.actors.find(a=>a.player)||this.actors[0];this.bullets=(s.bullets||[]).map(b=>({x:b[0],y:b[1],vx:0,vy:0}));this.pickups=(s.pickups||[]).map(p=>({x:p[0],y:p[1],type:p[2],weapon:p[3]}));this.zone=s.zone||this.zone;this.elapsed=s.elapsed||0;this.camera=this.camera||{x:this.player?.x||1350,y:this.player?.y||1000};if(this.player){this.camera.x+=(this.player.x-this.camera.x)*.25;this.camera.y+=(this.player.y-this.camera.y)*.25;this.hud();}}
}

class KartGame extends BaseGame {
  constructor(){super('kart','PEARL KART');this.powerEl=document.createElement('div');this.powerEl.className='kartPower';this.shell.appendChild(this.powerEl);}
  init(){this.cx=1350;this.cy=1000;this.rx=970;this.ry=640;this.CP=28;this.elapsed=0;this.actors=[];this.effects=[];this.finishers=[];this.pads=[2,6,10,14,18,22,26].map(i=>({i,used:new Map()}));this.crates=[4,8,12,16,20,24].map(i=>({i,respawn:0}));for(let i=0;i<11;i++)this.actors.push(this.makeCar(names[i%names.length],false,i));this.player=this.makeCar('You',true,11,this.remoteId);this.actors.push(this.player);this.camera={x:this.player.x,y:this.player.y};this.hud();}
  point(i,lane=0){const a=-Math.PI/2+(i/this.CP)*TAU;return{x:this.cx+Math.cos(a)*(this.rx+lane),y:this.cy+Math.sin(a)*(this.ry+lane),a};}
  makeCar(name,player=false,grid=0,netId=''){const row=Math.floor(grid/2),lane=grid%2?42:-42,p=this.point(0,lane);p.y+=row*34;return{name,player,remote:!!netId&&!player,netId,skin:player?this.selectedSkin():Math.floor(rnd(0,skins.length)),x:p.x,y:p.y,angle:0,lap:0,cp:1,speed:0,boost:45,place:grid+1,skill:rnd(.58,.97),risk:rnd(.55,1.15),lane:rnd(-55,55),finished:false,finishTime:0,power:'',powerCd:0,shield:0,mistake:0,drifting:false};}
  spawnRemote(p){const c=this.makeCar(p.name,false,this.actors.length,p.id);c.remote=true;this.actors.push(c);}
  getInput(){return{throttle:(this.keys.KeyW||this.keys.ArrowUp?1:0)-(this.keys.KeyS||this.keys.ArrowDown?1:0),steer:(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0),drift:!!this.keys.Space,boost:!!(this.keys.ShiftLeft||this.keys.ShiftRight),power:!!this.keys.KeyE};}
  onGo(){this.notice('THREE LAPS - GO!');}
  trackFactor(c){return Math.sqrt(((c.x-this.cx)/this.rx)**2+((c.y-this.cy)/this.ry)**2);}
  aiInput(c,dt){c.mistake-=dt;const target=this.point(c.cp,c.lane),want=Math.atan2(target.y-c.y,target.x-c.x),err=angleDiff(want,c.angle);if(c.mistake<=0&&Math.random()<.0035*(1-c.skill)){c.mistake=rnd(.35,.9);c.lane=clamp(c.lane+rnd(-80,80),-75,75);}const leader=Math.min(...this.actors.filter(x=>!x.finished).map(x=>x.place));return{throttle:c.mistake>0?.45:1,steer:clamp(err*(c.mistake>0?1.1:2.6),-1,1),drift:Math.abs(err)>.42&&c.speed>210,boost:c.boost>20&&Math.abs(err)<.22&&(c.place>leader||Math.random()<.018),power:!!c.power&&Math.random()<.012};}
  usePower(c){if(!c.power||c.powerCd>0)return;const p=c.power;c.power='';c.powerCd=1;if(p==='turbo'){c.boost=Math.min(100,c.boost+55);c.speed+=120;}if(p==='shield')c.shield=4;if(p==='pulse'){for(const other of this.actors)if(other!==c&&dist(c,other)<180&&!other.shield)other.speed*=.48;this.effects.push({x:c.x,y:c.y,life:.5,type:'pulse'});}if(c===this.player)this.notice(p.toUpperCase()+' USED');}
  update(dt){this.elapsed+=dt;for(const crate of this.crates)crate.respawn=Math.max(0,crate.respawn-dt);
    for(const c of this.actors){if(c.finished)continue;let i=this.inputFor(c);if(!i)i=this.aiInput(c,dt);c.powerCd-=dt;c.shield=Math.max(0,c.shield-dt);if(i.power)this.usePower(c);const tf=this.trackFactor(c),onTrack=tf>.78&&tf<1.22;const drifting=i.drift&&Math.abs(c.speed)>120&&Math.abs(i.steer)>.15;c.drifting=drifting;const boost=i.boost&&c.boost>0&&onTrack;c.boost=clamp(c.boost+(boost?-34:(drifting?19:8))*dt,0,100);let max=(onTrack?355:135)*(boost?1.32:1);max*=1+(c.place-1)*.012;c.speed+=(i.throttle*max-c.speed)*dt*(i.throttle<0?4.8:2.6);if(!onTrack)c.speed*=1-dt*1.7;const steerRate=(1.25+Math.min(Math.abs(c.speed),300)/250)*(drifting?1.42:1);c.angle+=(i.steer||0)*dt*steerRate*(c.speed>=0?1:-1);if(drifting)c.speed*=1-dt*.12;c.x+=Math.cos(c.angle)*c.speed*dt;c.y+=Math.sin(c.angle)*c.speed*dt;
      const target=this.point(c.cp,c.lane);if(dist(c,target)<125){c.cp++;if(c.cp>=this.CP){c.cp=0;c.lap++;if(c.lap>=3){c.finished=true;c.finishTime=this.elapsed;this.finishers.push(c);c.place=this.finishers.length;if(c===this.player){this.reward(c.place===1?600:Math.max(80,360-c.place*22),120);this.finish('FINISH #'+c.place,timeText(this.elapsed)+' on Pearl Circuit');}}}}
      for(const pad of this.pads){const p=this.point(pad.i,0);if(dist(c,p)<70&&(pad.used.get(c)||0)<this.elapsed){c.speed+=75;c.boost=Math.min(100,c.boost+20);pad.used.set(c,this.elapsed+1.5);if(c===this.player)this.notice('BOOST PAD');}}
      for(const crate of this.crates){if(crate.respawn>0)continue;const p=this.point(crate.i,0);if(dist(c,p)<65){c.power=['turbo','shield','pulse'][Math.floor(rnd(0,3))];crate.respawn=5;if(c===this.player)this.notice(c.power.toUpperCase()+' PICKUP - E TO USE');}}
    }
    for(let a=0;a<this.actors.length;a++)for(let b=a+1;b<this.actors.length;b++){const x=this.actors[a],y=this.actors[b];if(!x.finished&&!y.finished&&dist(x,y)<32){if(!x.shield)x.speed*=.96;if(!y.shield)y.speed*=.96;const d=Math.atan2(y.y-x.y,y.x-x.x);x.x-=Math.cos(d)*2;y.x+=Math.cos(d)*2;x.y-=Math.sin(d)*2;y.y+=Math.sin(d)*2;}}
    const rank=[...this.actors].filter(c=>!c.finished).sort((a,b)=>(b.lap*this.CP+b.cp)-(a.lap*this.CP+a.cp));rank.forEach((c,i)=>c.place=this.finishers.length+i+1);for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);this.camera.x+=(this.player.x-this.camera.x)*.1;this.camera.y+=(this.player.y-this.camera.y)*.1;this.hud();
  }
  hud(){if(!this.player)return;$('kartLap').textContent=Math.min(3,this.player.lap+1)+'/3';$('kartPlace').textContent=this.player.place+'/'+this.actors.length;$('kartSpeed').textContent=Math.round(Math.abs(this.player.speed));$('kartBoost').textContent=Math.round(this.player.boost);$('kartTime').textContent=timeText(this.elapsed);$('kartObjective').textContent=this.player.drifting?'DRIFTING + BOOST':'SPACE DRIFT | SHIFT BOOST | E POWER';this.powerEl.textContent=this.player.power?this.player.power.toUpperCase()+' READY':'NO POWER';}
  render(){const {w,h}=fit(this.canvas,this.ctx),c=this.ctx;c.fillStyle='#07130f';c.fillRect(0,0,w,h);c.save();c.translate(w/2-this.camera.x,h/2-this.camera.y);c.fillStyle='#0c281c';c.fillRect(-200,-200,3100,2400);kartArena(c);for(let i=0;i<95;i++){const x=(i*293)%2700,y=(i*617)%2000;c.fillStyle=i%3?'#123824':'#17452d';c.beginPath();c.arc(x,y,12+(i%4)*4,0,TAU);c.fill();}c.strokeStyle='#1c242b';c.lineWidth=310;c.beginPath();c.ellipse(this.cx,this.cy,this.rx,this.ry,0,0,TAU);c.stroke();c.strokeStyle='#56616b';c.lineWidth=260;c.stroke();c.setLineDash([28,22]);c.strokeStyle='#dce4e8aa';c.lineWidth=3;c.stroke();c.setLineDash([]);
    const start=this.point(0);c.save();c.translate(start.x,start.y);for(let y=-125;y<125;y+=25)for(let x=-12;x<13;x+=12){c.fillStyle=((x/12+y/25)&1)?'#fff':'#111';c.fillRect(x,y,12,25);}c.restore();
    for(const pad of this.pads){const p=this.point(pad.i);c.save();c.translate(p.x,p.y);c.rotate(p.a+Math.PI/2);c.fillStyle='#22d3eeaa';for(let x=-42;x<=42;x+=28)c.fillRect(x,-15,18,30);c.restore();}
    for(const crate of this.crates)if(crate.respawn<=0){const p=this.point(crate.i);c.fillStyle='#fbbf24';c.fillRect(p.x-13,p.y-13,26,26);c.strokeStyle='#fff4';c.strokeRect(p.x-13,p.y-13,26,26);}
    for(const e of this.effects){c.globalAlpha=e.life/.5;c.strokeStyle='#a78bfa';c.lineWidth=8;c.beginPath();c.arc(e.x,e.y,180*(1-e.life/.5),0,TAU);c.stroke();}c.globalAlpha=1;
    for(const a of this.actors){drawKartSprite(c,a);c.fillStyle='#fff';c.font='10px system-ui';c.textAlign='center';c.fillText(a.name,a.x,a.y-27);}c.restore();}
  pack(){return{v:2,g:'kart',full:true,...this.basePack(),actors:this.actors.map(a=>({...a,id:a.netId||''})),elapsed:this.elapsed};}
  apply(s){if(!s||s.g!=='kart')return;this.applyBase(s);this.actors=s.actors||[];this.player=this.actors.find(a=>a.id===this.remoteId||a.netId===this.remoteId)||this.actors.find(a=>a.player)||this.actors[0];this.elapsed=s.elapsed||0;this.camera=this.camera||{x:this.player?.x||1350,y:this.player?.y||1000};if(this.player){this.camera.x+=(this.player.x-this.camera.x)*.25;this.camera.y+=(this.player.y-this.camera.y)*.25;this.hud();}}
}

class DefenseGame extends BaseGame {
  constructor(){super('defense','PEARL DEFENSE');this.tip=document.createElement('div');this.tip.className='defenseTip';this.shell.appendChild(this.tip);}
  init(){this.W=1900;this.H=1100;this.path=[{x:-20,y:180},{x:350,y:180},{x:350,y:520},{x:780,y:520},{x:780,y:270},{x:1220,y:270},{x:1220,y:760},{x:1570,y:760},{x:1920,y:920}];this.actors=[];this.towers=[];this.enemies=[];this.projectiles=[];this.effects=[];this.wave=0;this.core=25;this.credits=500;this.selected='pulse';this.selectedTower=null;this.spawning=0;this.aiBuild=6;this.pending=null;this.combo=0;this.waveClear=true;this.abilityCd=0;this.player={name:'Commander',skin:this.selectedSkin(),x:1750,y:930,player:true,netId:this.remoteId};this.actors=[this.player,{name:'Builder Alpha',skin:1,x:1680,y:930},{name:'Builder Crown',skin:2,x:1610,y:930}];this.bindDefense();this.hud();}
  bindDefense(){if(this.boundDefense)return;this.boundDefense=true;const tools=this.shell.querySelector('.defenseTools');const upgrade=document.createElement('button');upgrade.className='btn';upgrade.id='defenseUpgrade';upgrade.textContent='Upgrade selected';tools?.appendChild(upgrade);const sell=document.createElement('button');sell.className='btn';sell.id='defenseSell';sell.textContent='Sell';tools?.appendChild(sell);const ability=document.createElement('button');ability.className='btn';ability.id='defenseAbility';ability.textContent='Pearl blast';tools?.appendChild(ability);
    document.querySelectorAll('[data-tower]').forEach(b=>b.addEventListener('click',()=>{this.selected=b.dataset.tower;this.selectedTower=null;document.querySelectorAll('[data-tower]').forEach(x=>x.classList.toggle('active',x===b));}));
    this.canvas.addEventListener('pointermove',e=>{const p=this.worldPointer(e);this.hover=p;});this.canvas.addEventListener('click',e=>{if(this.phase!=='playing')return;const p=this.worldPointer(e),existing=this.towers.find(t=>dist(t,p)<36);if(existing){this.selectedTower=existing;this.notice(existing.type.toUpperCase()+' LEVEL '+existing.level);return;}this.pending={build:true,x:p.x,y:p.y,type:this.selected};if(!this.guest)this.build(this.pending);});
    $('defenseNext')?.addEventListener('click',()=>{if(this.phase!=='playing')return;this.pending={wave:true};if(!this.guest)this.launch();});upgrade.onclick=()=>{if(!this.selectedTower)return;if(this.guest)this.pending={upgrade:true,x:this.selectedTower.x,y:this.selectedTower.y};else this.upgrade(this.selectedTower)};sell.onclick=()=>{if(!this.selectedTower)return;if(this.guest)this.pending={sell:true,x:this.selectedTower.x,y:this.selectedTower.y};else this.sell(this.selectedTower)};ability.onclick=()=>{if(this.guest)this.pending={blast:true};else this.blast()};
  }
  worldPointer(e){const r=this.canvas.getBoundingClientRect(),s=Math.min(r.width/this.W,r.height/this.H),ox=(r.width-this.W*s)/2,oy=(r.height-this.H*s)/2;return{x:clamp((e.clientX-r.left-ox)/s,0,this.W),y:clamp((e.clientY-r.top-oy)/s,0,this.H)};}
  getInput(){const p=this.pending;this.pending=null;return p||{};}
  spawnRemote(p){this.actors.push({name:p.name,skin:Math.floor(rnd(0,skins.length)),x:1700-rnd(0,260),y:1000,netId:p.id,remote:true});}
  nearPath(x,y){for(let i=0;i<this.path.length-1;i++){const a=this.path[i],b=this.path[i+1],t=clamp(((x-a.x)*(b.x-a.x)+(y-a.y)*(b.y-a.y))/((b.x-a.x)**2+(b.y-a.y)**2),0,1);if(Math.hypot(x-(a.x+(b.x-a.x)*t),y-(a.y+(b.y-a.y)*t))<78)return true}return false;}
  config(type){return{pulse:{cost:100,range:195,rate:1.55,damage:25,color:'#fb7185'},frost:{cost:145,range:175,rate:1.05,damage:15,color:'#67e8f9'},crown:{cost:225,range:255,rate:.62,damage:62,color:'#fbbf24'}}[type]||{cost:100,range:195,rate:1.55,damage:25,color:'#fb7185'};}
  build(o,free=false){const cfg=this.config(o.type);if((!free&&this.credits<cfg.cost)||this.nearPath(o.x,o.y)||o.x<40||o.y<40||o.x>this.W-40||o.y>this.H-40||this.towers.some(t=>dist(t,o)<65)){if(!free)this.notice('INVALID BUILD SPOT');return false;}if(!free)this.credits-=cfg.cost;this.towers.push({x:o.x,y:o.y,type:o.type,range:cfg.range,cd:0,rate:cfg.rate,damage:cfg.damage,skin:Math.floor(rnd(0,skins.length)),level:1,spent:cfg.cost});this.notice(o.type.toUpperCase()+' BUILT');return true;}
  upgrade(t){if(this.guest||this.phase!=='playing')return;const cost=Math.round(this.config(t.type).cost*(.65+t.level*.45));if(t.level>=4)return this.notice('MAX LEVEL');if(this.credits<cost)return this.notice('NEED '+cost+' CREDITS');this.credits-=cost;t.spent+=cost;t.level++;t.damage*=1.38;t.range+=18;t.rate*=1.12;this.notice('TOWER LEVEL '+t.level);}
  sell(t){if(this.guest||!t)return;this.credits+=Math.round(t.spent*.65);this.towers=this.towers.filter(x=>x!==t);this.selectedTower=null;this.notice('TOWER SOLD');}
  blast(){if(this.guest||this.phase!=='playing')return;if(this.abilityCd>0)return this.notice('BLAST READY IN '+Math.ceil(this.abilityCd)+'s');this.abilityCd=24;for(const e of this.enemies)e.hp-=90+this.wave*8;this.effects.push({x:950,y:550,life:.7,type:'blast'});this.notice('PEARL BLAST');}
  launch(){if(this.spawning>0||this.enemies.length)return this.notice('FINISH THE CURRENT WAVE');this.wave++;this.spawning=8+this.wave*3;this.spawnCd=0;this.waveClear=false;this.credits+=35+this.wave*5;$('defenseObjective').textContent='WAVE '+this.wave+' INBOUND';if(this.wave%5===0)this.notice('BOSS WAVE');}
  spawnEnemy(){let type='grunt';const roll=Math.random();if(this.wave%5===0&&this.spawning===1)type='boss';else if(roll<.2)type='runner';else if(roll>.82)type='tank';else if(this.wave>3&&roll>.65)type='splitter';const base=55+this.wave*24,cfg={grunt:[base,70,16,1],runner:[base*.58,122,12,.8],tank:[base*2.6,45,24,2],splitter:[base*.9,66,17,1.2],boss:[base*8,35,48,6]}[type];this.enemies.push({x:this.path[0].x,y:this.path[0].y,step:0,hp:cfg[0],max:cfg[0],speed:cfg[1],r:cfg[2],reward:Math.round(14*cfg[3]),type,slow:0});}
  update(dt){this.abilityCd=Math.max(0,this.abilityCd-dt);for(const i of this.remoteInputs.values()){if(i.build)this.build(i);if(i.wave)this.launch();if(i.blast)this.blast();if(i.upgrade){const t=this.towers.find(t=>dist(t,i)<12);if(t)this.upgrade(t);}if(i.sell){const t=this.towers.find(t=>dist(t,i)<12);if(t)this.sell(t);}}this.remoteInputs.clear();if(this.spawning>0){this.spawnCd-=dt;if(this.spawnCd<=0){this.spawnEnemy();this.spawning--;this.spawnCd=Math.max(.32,.68-this.wave*.012);}}
    this.aiBuild-=dt;if(this.aiBuild<=0&&this.wave>0&&this.credits>240&&this.towers.length<18){for(let tries=0;tries<24;tries++){const x=rnd(90,this.W-90),y=rnd(90,this.H-90);if(this.build({x,y,type:this.wave>4&&Math.random()<.4?'crown':Math.random()<.35?'frost':'pulse'})){break;}}this.aiBuild=rnd(8,13);}
    for(const e of this.enemies){e.slow=Math.max(0,e.slow-dt);const p=this.path[e.step+1];if(!p){e.dead=true;this.core-=e.type==='boss'?5:e.type==='tank'?2:1;this.combo=0;continue;}const d=Math.atan2(p.y-e.y,p.x-e.x),sp=e.speed*(e.slow>0?.52:1);e.x+=Math.cos(d)*sp*dt;e.y+=Math.sin(d)*sp*dt;if(dist(e,p)<14)e.step++;}
    for(const t of this.towers){t.cd-=dt;if(t.cd>0)continue;const target=this.enemies.filter(e=>!e.dead&&dist(t,e)<t.range).sort((a,b)=>(b.step*10000-dist(b,this.path[b.step+1]||b))-(a.step*10000-dist(a,this.path[a.step+1]||a)))[0];if(target){t.cd=1/t.rate;target.hp-=t.damage;if(t.type==='frost')target.slow=1.45;if(t.type==='pulse')for(const e of this.enemies)if(e!==target&&dist(e,target)<48)e.hp-=t.damage*.22;this.projectiles.push({x:t.x,y:t.y,tx:target.x,ty:target.y,life:.13,color:this.config(t.type).color});if(target.hp<=0&&!target.dead){target.dead=true;this.combo++;this.credits+=target.reward+Math.min(12,Math.floor(this.combo/5));if(target.type==='splitter')for(let i=0;i<2;i++)this.enemies.push({x:target.x+rnd(-12,12),y:target.y+rnd(-12,12),step:target.step,hp:target.max*.35,max:target.max*.35,speed:105,r:10,reward:6,type:'runner',slow:0});}}}
    this.enemies=this.enemies.filter(e=>!e.dead);for(const p of this.projectiles)p.life-=dt;this.projectiles=this.projectiles.filter(p=>p.life>0);for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    if(this.core<=0){this.reward(this.wave*15,this.wave*8);this.finish('CORE LOST','Wave '+this.wave+' reached the Pearl Core. Upgrade, reposition, and try again.');}
    if(this.wave>0&&!this.enemies.length&&!this.spawning&&!this.waveClear){this.waveClear=true;const bonus=60+this.wave*12;this.credits+=bonus;$('defenseObjective').textContent='WAVE CLEAR | +'+bonus+' CREDITS';this.notice('WAVE CLEAR');if(this.wave%3===0)this.reward(70,30);}this.hud();
  }
  hud(){$('defenseCore').textContent=this.core;$('defenseWave').textContent=this.wave;$('defenseCredits').textContent=this.credits;$('defenseEnemies').textContent=this.enemies.length+this.spawning;this.tip.textContent=this.selectedTower?this.selectedTower.type.toUpperCase()+' L'+this.selectedTower.level+' | Upgrade and sell below':this.abilityCd>0?'Pearl blast: '+Math.ceil(this.abilityCd)+'s':'Pearl blast ready';}
  render(){const {w,h}=fit(this.canvas,this.ctx),c=this.ctx,s=Math.min(w/this.W,h/this.H),ox=(w-this.W*s)/2,oy=(h-this.H*s)/2;c.fillStyle='#071018';c.fillRect(0,0,w,h);c.save();c.translate(ox,oy);c.scale(s,s);c.fillStyle='#10231c';c.fillRect(0,0,this.W,this.H);defenseArena(c);c.strokeStyle='#142f28';c.lineWidth=2;for(let x=0;x<this.W;x+=80){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.H);c.stroke()}for(let y=0;y<this.H;y+=80){c.beginPath();c.moveTo(0,y);c.lineTo(this.W,y);c.stroke()}c.strokeStyle='#58626b';c.lineWidth=112;c.lineJoin='round';c.beginPath();c.moveTo(this.path[0].x,this.path[0].y);for(const p of this.path.slice(1))c.lineTo(p.x,p.y);c.stroke();c.strokeStyle='#a2aab2';c.lineWidth=4;c.setLineDash([20,18]);c.stroke();c.setLineDash([]);
    if(this.hover&&this.phase==='playing'){const cfg=this.config(this.selected);c.fillStyle=this.nearPath(this.hover.x,this.hover.y)?'#ef444420':'#67e8f915';c.strokeStyle=this.nearPath(this.hover.x,this.hover.y)?'#ef4444':'#67e8f9';c.beginPath();c.arc(this.hover.x,this.hover.y,cfg.range,0,TAU);c.fill();c.stroke();}
    for(const t of this.towers){drawTowerSprite(c,t,t===this.selectedTower);c.fillStyle='#fff';c.font='10px system-ui';c.textAlign='center';c.fillText('L'+t.level,t.x,t.y+38);}
    for(const e of this.enemies){drawEnemySprite(c,e);c.fillStyle='#111';c.fillRect(e.x-22,e.y-e.r-12,44,5);c.fillStyle='#4ade80';c.fillRect(e.x-22,e.y-e.r-12,44*clamp(e.hp/e.max,0,1),5);}
    for(const p of this.projectiles){c.strokeStyle=p.color;c.lineWidth=5;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.tx,p.ty);c.stroke();}for(const e of this.effects){c.globalAlpha=e.life/.7;c.strokeStyle='#f8fafc';c.lineWidth=18;c.beginPath();c.arc(e.x,e.y,700*(1-e.life/.7),0,TAU);c.stroke();}c.globalAlpha=1;c.fillStyle='#fbbf24';c.beginPath();c.arc(1780,930,55,0,TAU);c.fill();for(const a of this.actors)avatar(c,a,22);c.restore();}
  pack(){return{v:2,g:'defense',full:true,...this.basePack(),actors:this.actors,towers:this.towers,enemies:this.enemies,projectiles:this.projectiles,wave:this.wave,core:this.core,credits:this.credits,spawning:this.spawning,abilityCd:this.abilityCd};}
  apply(s){if(!s||s.g!=='defense')return;this.applyBase(s);Object.assign(this,{actors:s.actors||[],towers:s.towers||[],enemies:s.enemies||[],projectiles:s.projectiles||[],wave:s.wave||0,core:s.core??25,credits:s.credits??500,spawning:s.spawning||0,abilityCd:s.abilityCd||0});this.player=this.actors.find(a=>a.netId===this.remoteId)||this.actors[0];this.hud();}
}

class SurvivorsGame extends BaseGame {
  constructor(){super('survivors','PEARL SURVIVORS');}
  init(){this.W=2500;this.H=1850;this.elapsed=0;this.enemies=[];this.projectiles=[];this.gems=[];this.effects=[];this.actors=[];this.spawnCd=0;this.bossAt=45;this.eventAt=25;this.player=this.hero('You',true,this.remoteId);this.player.x=1250;this.player.y=925;this.actors.push(this.player);for(let i=0;i<4;i++)this.actors.push(this.hero(names[i]));this.camera={x:this.player.x,y:this.player.y};this.pendingUpgrade=false;this.spectating=false;this.hud();}
  hero(name,player=false,netId=''){return{name,player,remote:!!netId&&!player,netId,skin:player?this.selectedSkin():Math.floor(rnd(0,skins.length)),x:rnd(980,1520),y:rnd(700,1150),hp:100,maxHp:100,level:1,xp:0,nextXp:24,kos:0,speed:215,damage:19,rate:.62,range:440,shotCd:0,dead:false,dashCd:0,multishot:1,pierce:0,orbitals:0,crit:.08,magnet:90,regen:0};}
  spawnRemote(p){const h=this.hero(p.name,false,p.id);h.remote=true;this.actors.push(h);}
  getInput(){return{x:(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0),y:(this.keys.KeyS||this.keys.ArrowDown?1:0)-(this.keys.KeyW||this.keys.ArrowUp?1:0),dash:!!(this.keys.ShiftLeft||this.keys.ShiftRight)};}
  spawnEnemy(force=''){const focus=this.actors.find(x=>x.player&&!x.dead)||this.actors.find(x=>!x.dead);if(!focus)return;const a=rnd(0,TAU),d=rnd(650,850);let type=force||'grunt',roll=Math.random();if(!force&&this.elapsed>35&&roll<.12)type='charger';else if(!force&&this.elapsed>55&&roll>.9)type='tank';else if(!force&&this.elapsed>75&&roll>.76)type='shooter';const base=24+this.elapsed*.48,cfg={grunt:[base,rnd(76,112),rnd(11,18),10],charger:[base*.8,145,14,15],tank:[base*3.2,54,27,22],shooter:[base*1.5,68,17,13],boss:[950+this.elapsed*5,48,52,30]}[type];this.enemies.push({x:clamp(focus.x+Math.cos(a)*d,25,this.W-25),y:clamp(focus.y+Math.sin(a)*d,25,this.H-25),hp:cfg[0],max:cfg[0],speed:cfg[1],r:cfg[2],damage:cfg[3],type,shootCd:rnd(1,2),charge:0});}
  chooseUpgrade(h,kind){const actions={damage:()=>h.damage*=1.27,rate:()=>h.rate*=.81,speed:()=>h.speed*=1.14,health:()=>{h.maxHp+=30;h.hp=Math.min(h.maxHp,h.hp+45)},range:()=>h.range+=90,multi:()=>h.multishot=Math.min(5,h.multishot+1),pierce:()=>h.pierce++,orbital:()=>h.orbitals=Math.min(4,h.orbitals+1),magnet:()=>h.magnet+=100,regen:()=>h.regen+=.9,crit:()=>h.crit=Math.min(.55,h.crit+.12)};actions[kind]?.();this.pendingUpgrade=false;$('survivorsUpgrades').classList.remove('show');this.notice('BUILD UPGRADED');}
  showUpgrades(){if(this.guest||this.pendingUpgrade)return;this.pendingUpgrade=true;const all=['damage','rate','speed','health','range','multi','pierce','orbital','magnet','regen','crit'].sort(()=>Math.random()-.5).slice(0,3),labels={damage:['Pearl Power','+27% attack damage'],rate:['Rapid Legend','Attacks fire 19% faster'],speed:['Tom Velocity','+14% movement speed'],health:['Crown Vitality','+30 max HP and heal'],range:['Wide Lens','+90 attack range'],multi:['Triple Take','Adds another projectile'],pierce:['No Filter','Projectiles pierce one more enemy'],orbital:['Pearl Orbit','Adds a damaging orbiting pearl'],magnet:['Archive Pull','Greatly increases pickup range'],regen:['Second Wind','Regenerate health every second'],crit:['Closeup Crit','+12% critical chance']};const panel=$('survivorsUpgrades');panel.innerHTML=all.map((o,i)=>`<button data-up="${o}"><em>${i===0?'RARE':'UPGRADE'}</em><b>${labels[o][0]}</b><span>${labels[o][1]}</span></button>`).join('');panel.classList.add('show');panel.querySelectorAll('button').forEach(b=>b.onclick=()=>this.chooseUpgrade(this.player,b.dataset.up));}
  fireHero(h,target){const base=Math.atan2(target.y-h.y,target.x-h.x),count=h.multishot;for(let i=0;i<count;i++){const spread=(i-(count-1)/2)*.15,crit=Math.random()<h.crit;this.projectiles.push({x:h.x,y:h.y,vx:Math.cos(base+spread)*570,vy:Math.sin(base+spread)*570,damage:h.damage*(crit?2:1),owner:h,life:1.35,pierce:h.pierce,crit});}}
  update(dt){if(this.pendingUpgrade)return;this.elapsed+=dt;this.spawnCd-=dt;if(this.spawnCd<=0){const count=1+Math.floor(this.elapsed/55);for(let i=0;i<count;i++)this.spawnEnemy();this.spawnCd=Math.max(.16,.7-this.elapsed*.0025);}if(this.elapsed>=this.bossAt){this.spawnEnemy('boss');this.bossAt+=45;this.notice('CROWN BOSS ENTERED');$('survivorsObjective').textContent='BOSS HUNT';}if(this.elapsed>=this.eventAt){this.eventAt+=28;const event=Math.random()<.5?'rush':'cache';if(event==='rush'){for(let i=0;i<12;i++)this.spawnEnemy('charger');this.notice('RUSH EVENT');}else{for(let i=0;i<12;i++)this.gems.push({x:1250+rnd(-220,220),y:925+rnd(-180,180),v:4,type:i<2?'heal':'xp'});this.notice('PEARL CACHE SPAWNED');}}
    for(const h of this.actors){if(h.dead)continue;h.dashCd=Math.max(0,h.dashCd-dt);h.hp=Math.min(h.maxHp,h.hp+h.regen*dt);let i=this.inputFor(h);if(!i){const threat=[...this.enemies].sort((a,b)=>dist(h,a)-dist(h,b))[0],leader=this.player&&!this.player.dead?this.player:this.actors.find(a=>!a.dead);let tx=leader?.x||1250,ty=leader?.y||925;if(threat&&dist(h,threat)<210){tx=h.x+(h.x-threat.x);ty=h.y+(h.y-threat.y);}else if(leader){const slot=this.actors.indexOf(h);tx=leader.x+Math.cos(slot*1.6)*100;ty=leader.y+Math.sin(slot*1.6)*100;}const d=Math.atan2(ty-h.y,tx-h.x);i={x:Math.cos(d),y:Math.sin(d),dash:!!threat&&dist(h,threat)<90&&Math.random()<.06};}const l=Math.hypot(i.x||0,i.y||0)||1;let sp=h.speed;if(i.dash&&h.dashCd<=0){sp*=2.6;h.dashCd=2.2;this.effects.push({x:h.x,y:h.y,life:.35,type:'dash'});}h.x=clamp(h.x+(i.x||0)/l*sp*dt,20,this.W-20);h.y=clamp(h.y+(i.y||0)/l*sp*dt,20,this.H-20);h.shotCd-=dt;const target=this.enemies.filter(e=>dist(h,e)<h.range).sort((a,b)=>dist(h,a)-dist(h,b))[0];if(target&&h.shotCd<=0){h.shotCd=h.rate;this.fireHero(h,target);}if(h.orbitals)for(let n=0;n<h.orbitals;n++){const a=this.elapsed*2.5+n*TAU/h.orbitals,orb={x:h.x+Math.cos(a)*75,y:h.y+Math.sin(a)*75};for(const e of this.enemies)if(!e.dead&&dist(orb,e)<e.r+11){e.hp-=h.damage*.65*dt;e.lastOwner=h;}}}
    for(const e of this.enemies){const target=[...this.actors].filter(h=>!h.dead).sort((a,b)=>dist(e,a)-dist(e,b))[0];if(!target)continue;const d=Math.atan2(target.y-e.y,target.x-e.x);if(e.type==='shooter'&&dist(e,target)<430){e.shootCd-=dt;if(e.shootCd<=0){e.shootCd=1.8;this.projectiles.push({x:e.x,y:e.y,vx:Math.cos(d)*310,vy:Math.sin(d)*310,damage:14,enemy:true,life:2});}}else{let sp=e.speed;if(e.type==='charger'){e.charge-=dt;if(e.charge<=0&&dist(e,target)<350){e.charge=2.6;sp*=2.5;}}e.x+=Math.cos(d)*sp*dt;e.y+=Math.sin(d)*sp*dt;}if(dist(e,target)<e.r+17){target.hp-=e.damage*dt;if(target.hp<=0&&!target.dead){target.dead=true;if(target===this.player){this.spectating=true;this.showOverlay('YOU FELL','Your squad keeps fighting. Spectating the strongest survivor.','spectate');}}}}
    for(const p of this.projectiles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.enemy){for(const h of this.actors)if(!h.dead&&dist(p,h)<22){h.hp-=p.damage;p.life=0;break;}}else for(const e of this.enemies)if(!e.dead&&!p.hit?.has?.(e)&&dist(p,e)<e.r+6){p.hit=p.hit||new Set();p.hit.add(e);e.hp-=p.damage;e.lastOwner=p.owner;if(p.pierce>0)p.pierce--;else p.life=0;if(e.hp<=0){e.dead=true;p.owner.kos++;this.gems.push({x:e.x,y:e.y,v:e.type==='boss'?30:e.type==='tank'?7:3,type:'xp'});if(p.owner===this.player&&e.type==='boss')this.reward(180,80);}if(p.life<=0)break;}}
    for(const e of this.enemies)if(e.hp<=0&&!e.dead){e.dead=true;const owner=e.lastOwner||this.actors[0];owner.kos++;this.gems.push({x:e.x,y:e.y,v:e.type==='boss'?30:3,type:'xp'});}this.projectiles=this.projectiles.filter(p=>p.life>0);this.enemies=this.enemies.filter(e=>!e.dead);
    if(this.player&&!this.player.dead)for(const g of this.gems){const d=dist(g,this.player);if(d<this.player.magnet){g.x+=(this.player.x-g.x)*dt*7;g.y+=(this.player.y-g.y)*dt*7;}if(d<28){g.dead=true;if(g.type==='heal')this.player.hp=Math.min(this.player.maxHp,this.player.hp+28);else{this.player.xp+=g.v;if(this.player.xp>=this.player.nextXp){this.player.xp-=this.player.nextXp;this.player.nextXp=Math.floor(this.player.nextXp*1.28);this.player.level++;this.showUpgrades();}}}}this.gems=this.gems.filter(g=>!g.dead);for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);
    const alive=this.actors.filter(h=>!h.dead);if(!alive.length){this.reward(Math.floor(this.elapsed)*2,Math.floor(this.elapsed));this.finish('SQUAD WIPED',timeText(this.elapsed)+' survived | '+this.actors.reduce((n,h)=>n+h.kos,0)+' squad KOs');}const focus=!this.player.dead?this.player:alive.sort((a,b)=>b.kos-a.kos)[0]||this.player;this.camera.x+=(focus.x-this.camera.x)*.1;this.camera.y+=(focus.y-this.camera.y)*.1;this.hud();
  }
  hud(){if(!this.player)return;$('survivorsHp').textContent=Math.max(0,Math.ceil(this.player.hp));$('survivorsLevel').textContent=this.player.level;$('survivorsKos').textContent=this.player.kos;$('survivorsTime').textContent=timeText(this.elapsed);$('survivorsXp').style.width=clamp(this.player.xp/this.player.nextXp*100,0,100)+'%';if(!this.spectating)$('survivorsObjective').textContent='SHIFT DASH | NEXT BOSS '+Math.max(0,Math.ceil(this.bossAt-this.elapsed))+'s';}
  render(){const {w,h}=fit(this.canvas,this.ctx),c=this.ctx;c.fillStyle='#071018';c.fillRect(0,0,w,h);c.save();c.translate(w/2-this.camera.x,h/2-this.camera.y);c.fillStyle='#0a1720';c.fillRect(0,0,this.W,this.H);survivorArena(c);c.strokeStyle='#173047';for(let x=0;x<this.W;x+=90){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.H);c.stroke()}for(let y=0;y<this.H;y+=90){c.beginPath();c.moveTo(0,y);c.lineTo(this.W,y);c.stroke()}for(const g of this.gems){c.fillStyle=g.type==='heal'?'#34d399':'#a78bfa';c.beginPath();c.arc(g.x,g.y,g.type==='heal'?9:6,0,TAU);c.fill();}for(const e of this.effects){c.globalAlpha=e.life/.35;c.strokeStyle='#67e8f9';c.lineWidth=5;c.beginPath();c.arc(e.x,e.y,80*(1-e.life/.35),0,TAU);c.stroke();}c.globalAlpha=1;
    for(const e of this.enemies){drawEnemySprite(c,e);if(e.type==='boss'||e.type==='tank'){c.fillStyle='#111';c.fillRect(e.x-42,e.y-e.r-14,84,7);c.fillStyle='#fde047';c.fillRect(e.x-42,e.y-e.r-14,84*clamp(e.hp/e.max,0,1),7);}}
    for(const p of this.projectiles){c.fillStyle=p.enemy?'#fb7185':p.crit?'#fde047':'#67e8f9';c.beginPath();c.arc(p.x,p.y,p.crit?7:5,0,TAU);c.fill();}
    for(const h of this.actors)if(!h.dead){for(let n=0;n<h.orbitals;n++){const a=this.elapsed*2.5+n*TAU/h.orbitals;c.fillStyle='#fbbf24';c.beginPath();c.arc(h.x+Math.cos(a)*75,h.y+Math.sin(a)*75,10,0,TAU);c.fill();}drawFighter(c,h,'survivor');c.fillStyle='#05080d';c.fillRect(h.x-20,h.y-34,40,4);c.fillStyle='#34d399';c.fillRect(h.x-20,h.y-34,40*clamp(h.hp/h.maxHp,0,1),4);}c.restore();}
  pack(){return{v:2,g:'survivors',full:true,...this.basePack(),actors:this.actors,enemies:this.enemies,projectiles:this.projectiles.map(p=>({x:p.x,y:p.y,enemy:p.enemy,crit:p.crit})),pickups:this.gems,elapsed:this.elapsed,bossAt:this.bossAt,eventAt:this.eventAt};}
  apply(s){if(!s||s.g!=='survivors')return;this.applyBase(s);this.actors=s.actors||[];this.player=this.actors.find(a=>a.netId===this.remoteId||a.id===this.remoteId)||this.actors.find(a=>a.player)||this.actors[0];this.enemies=s.enemies||[];this.projectiles=s.projectiles||[];this.gems=s.pickups||[];this.elapsed=s.elapsed||0;this.bossAt=s.bossAt||45;this.eventAt=s.eventAt||25;this.camera=this.camera||{x:this.player?.x||1250,y:this.player?.y||925};if(this.player){this.camera.x+=(this.player.x-this.camera.x)*.25;this.camera.y+=(this.player.y-this.camera.y)*.25;this.hud();}}
}

window.pearlV22 = window.pearlV22 || {xp(n){try{const p=JSON.parse(localStorage.getItem('v20profile')||'{}');p.xp=(p.xp||0)+n;localStorage.setItem('v20profile',JSON.stringify(p));}catch(_){}}};
new BattleGame(); new KartGame(); new DefenseGame(); new SurvivorsGame();
})();
