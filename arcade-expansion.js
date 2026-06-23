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
.expansionTab{--exp:#4ca3ff}.expIntro{display:grid;grid-template-columns:1fr auto;align-items:center;gap:24px;padding:22px;margin-bottom:14px;background:linear-gradient(145deg,#0a1118,#111a24)}.expIntro h2{margin:4px 0;font-size:clamp(1.8rem,4vw,3rem)}.expIntro p{max-width:720px}.expLoadout{display:grid;grid-template-columns:auto minmax(150px,220px);gap:8px;align-items:center}.expLoadout .btn{grid-column:1/-1}.expShell{height:clamp(610px,77vh,850px);position:relative;overflow:hidden;border:1px solid #2b3947;border-radius:12px;background:#071018;box-shadow:0 24px 70px #0007}.expShell canvas{display:block;width:100%;height:100%;touch-action:none}.expHud{position:absolute;left:14px;top:14px;display:flex;flex-wrap:wrap;gap:5px;max-width:76%;pointer-events:none}.expHud span{padding:7px 9px;border:1px solid #ffffff20;border-radius:6px;background:#081018e8;font:700 11px ui-monospace,monospace}.expHud b{color:#7dd3fc}.expObjective{position:absolute;right:14px;top:14px;padding:8px 11px;border:1px solid #ffffff20;border-radius:6px;background:#081018e8;font:900 11px ui-monospace,monospace;letter-spacing:.08em}.expOverlay{position:absolute;inset:0;display:grid;place-content:center;text-align:center;gap:12px;padding:20px;background:linear-gradient(90deg,#03070be8,#03070b88);pointer-events:none;z-index:4}.expOverlay b{font:1000 clamp(2.2rem,7vw,5.8rem)/.85 system-ui}.expOverlay span{color:#c8d2dd;max-width:620px}.expOverlay.hidden{display:none}.expOverlay.spectate{inset:75px 0 auto;background:none;text-shadow:0 3px 18px #000}.expOverlay.spectate b{font-size:clamp(1.2rem,3vw,2.2rem)}.expOverlay.spectate span{color:#fff}.expNotice{position:absolute;left:50%;top:18%;transform:translate(-50%,-10px);z-index:9;display:none;max-width:min(640px,90%);padding:10px 16px;border:1px solid #ffffff2c;border-radius:999px;background:#02060bdd;box-shadow:0 12px 40px #0009,0 0 25px #67e8f928;color:#fff;font:1000 clamp(18px,3.6vw,38px)/1 system-ui;text-align:center;letter-spacing:.03em;text-shadow:0 3px 18px #000;pointer-events:none}.expNotice.show{display:block;animation:expNoticeIn .28s ease-out}.defenseTools{position:absolute;left:14px;bottom:14px;display:flex;gap:6px;flex-wrap:wrap;z-index:2}.defenseTools .active{border-color:#67e8f9;color:#67e8f9}.survivorXp{position:absolute;left:14px;right:14px;bottom:12px;height:7px;border-radius:9px;background:#ffffff18;overflow:hidden}.survivorXp i{display:block;height:100%;width:0;background:linear-gradient(90deg,#22d3ee,#a78bfa)}.upgradePanel{position:absolute;inset:0;display:none;place-content:center;grid-template-columns:repeat(3,minmax(160px,230px));gap:10px;background:#02060be8;padding:20px;z-index:8}.upgradePanel.show{display:grid}.upgradePanel button{min-height:155px;padding:18px;border:1px solid #ffffff28;border-radius:10px;background:#101b28;color:#fff;text-align:left;cursor:pointer}.upgradePanel button:hover{border-color:#67e8f9;transform:translateY(-2px)}.upgradePanel b{display:block;font-size:18px;margin-bottom:8px}.upgradePanel span{color:#a8b7c7}.upgradePanel em{display:block;margin-bottom:14px;color:#fbbf24;font:800 10px ui-monospace;letter-spacing:.12em}.expBar{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:min(420px,60%);height:8px;background:#0008;border:1px solid #ffffff1f;border-radius:20px;overflow:hidden;pointer-events:none}.expBar i{display:block;height:100%;background:#22d3ee}.kartPower{position:absolute;right:14px;bottom:14px;padding:8px 12px;border-radius:7px;background:#081018e8;border:1px solid #ffffff20;font:900 12px ui-monospace;color:#fbbf24}.defenseTip{position:absolute;right:14px;bottom:14px;max-width:270px;padding:8px 10px;border-radius:7px;background:#081018e8;border:1px solid #ffffff20;color:#b8c5d2;font:700 11px ui-monospace;pointer-events:none}@keyframes expNoticeIn{from{opacity:0;transform:translate(-50%,-22px) scale(.94)}to{opacity:1;transform:translate(-50%,-10px) scale(1)}}
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

function drawTomHead(ctx, a, x, y, r, facing = 0) {
  const s = skin(a.skin), color = s.color || '#22d3ee', im = images.get(s.id);
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
  if (im && im.complete) ctx.drawImage(im, -r, -r, r * 2, r * 2);
  else {
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, color); g.addColorStop(1, '#111827');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#ffffffcc'; ctx.fillRect(-r * .48, -r * .16, r * .35, r * .18); ctx.fillRect(r * .13, -r * .16, r * .35, r * .18);
    ctx.fillStyle = '#020617'; ctx.fillRect(-r * .5, -r * .03, r, r * .1);
    ctx.strokeStyle = '#f8fafc99'; ctx.lineWidth = Math.max(1.5, r * .13); ctx.beginPath(); ctx.arc(-r * .1 + facing * r * .15, r * .28, r * .33, 0, Math.PI); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
}

function drawFighter(ctx, a, style = 'battle') {
  const color = skin(a.skin).color || '#22d3ee', survivor = style === 'survivor';
  ctx.save(); ctx.translate(a.x, a.y);
  ctx.globalAlpha = .28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(0, 22, 25, 9, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.rotate(a.angle || 0);
  ctx.fillStyle = '#05070a'; ctx.fillRect(-16, 14, 9, 18); ctx.fillRect(7, 14, 9, 18);
  ctx.fillStyle = survivor ? '#26364b' : '#172333'; ctx.beginPath(); ctx.roundRect(-20, -18, 40, 38, 9); ctx.fill();
  ctx.fillStyle = color; ctx.fillRect(-20, -3, 40, 8); ctx.fillStyle = '#ffffff22'; ctx.fillRect(-15, -15, 30, 8);
  ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-18, -5); ctx.lineTo(-34, 14); ctx.moveTo(18, -5); ctx.lineTo(32, 10); ctx.stroke();
  if (survivor) {
    ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(19, -2); ctx.lineTo(42, -10); ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(44, -11, 5, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#dbeafe'; ctx.beginPath(); ctx.roundRect(12, -8, 34, 9, 3); ctx.fill(); ctx.fillStyle = '#334155'; ctx.fillRect(38, -11, 12, 15);
    ctx.fillStyle = '#fb7185'; ctx.fillRect(-28, -20, 12, 20);
  }
  ctx.restore();
  drawTomHead(ctx, a, a.x, a.y - 20, 15, Math.cos(a.angle || 0));
  if (a.armor > 0 || a.shield > 0) { ctx.strokeStyle = a.armor > 0 ? '#fbbf24aa' : '#60a5faaa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y - 5, 31, 0, TAU); ctx.stroke(); }
}

function drawKartSprite(ctx, a) {
  const color = skin(a.skin).color || '#22d3ee';
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle || 0);
  ctx.globalAlpha = .32; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(-4, 0, 37, 24, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#05070a'; for (const p of [[-26,-23,13,10],[12,-23,14,10],[-26,13,13,10],[12,13,14,10]]) ctx.fillRect(...p);
  ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.moveTo(-33,-17); ctx.lineTo(-10,-24); ctx.lineTo(28,-14); ctx.lineTo(37,0); ctx.lineTo(28,14); ctx.lineTo(-10,24); ctx.lineTo(-33,17); ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(-30, -18, 34, 18); g.addColorStop(0, color); g.addColorStop(.55, '#0f172a'); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-29,-14); ctx.lineTo(16,-13); ctx.lineTo(31,-5); ctx.lineTo(34,0); ctx.lineTo(31,5); ctx.lineTo(16,13); ctx.lineTo(-29,14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#dbeafe'; ctx.beginPath(); ctx.moveTo(-4,-10); ctx.lineTo(16,-7); ctx.lineTo(18,7); ctx.lineTo(-4,10); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0f172a'; ctx.fillRect(-5,-7,13,14); ctx.fillStyle = '#f8fafc'; ctx.fillRect(26,-7,9,4); ctx.fillRect(26,3,9,4);
  ctx.fillStyle = '#020617'; ctx.fillRect(-36,-18,7,36); ctx.fillStyle = color; ctx.fillRect(-39,-10,8,20);
  if (a.jump > 0) { ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 43, 0, TAU); ctx.stroke(); }
  if (a.shield) { ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0,0,39,29,0,0,TAU); ctx.stroke(); }
  if (a.drifting) { ctx.strokeStyle = '#dbeafeaa'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-24,-13); ctx.lineTo(-58,-22); ctx.moveTo(-24,13); ctx.lineTo(-58,22); ctx.stroke(); }
  ctx.restore();
  drawTomHead(ctx, a, a.x, a.y - 14, 10, Math.cos(a.angle || 0));
}

function drawTowerSprite(ctx, t, selected = false) {
  const colors={pulse:'#fb7185',frost:'#67e8f9',crown:'#fbbf24',zap:'#a78bfa',mortar:'#fb923c',bank:'#34d399',barricade:'#94a3b8'},color=colors[t.type]||'#fb7185';
  ctx.save();ctx.translate(t.x,t.y);
  if(selected){ctx.fillStyle=color+'12';ctx.beginPath();ctx.arc(0,0,t.range,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();}
  ctx.globalAlpha=.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,24,34,12,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
  ctx.fillStyle='#0f172a';ctx.beginPath();ctx.moveTo(-34,25);ctx.lineTo(-24,-20);ctx.lineTo(24,-20);ctx.lineTo(34,25);ctx.closePath();ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.stroke();
  ctx.fillStyle='#263545';ctx.beginPath();ctx.roundRect(-18,-30,36,36,7);ctx.fill();
  if(t.type==='pulse'){ctx.fillStyle=color;ctx.fillRect(3,-10,42,10);ctx.fillRect(35,-14,13,18);ctx.strokeStyle='#fff8';ctx.beginPath();ctx.arc(0,-12,17,0,TAU);ctx.stroke();}
  else if(t.type==='frost'){ctx.strokeStyle=color;ctx.lineWidth=5;for(let i=0;i<6;i++){ctx.rotate(TAU/6);ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(0,-43);ctx.stroke();}ctx.fillStyle='#e0f2fe';ctx.beginPath();ctx.arc(0,-10,12,0,TAU);ctx.fill();}
  else if(t.type==='crown'){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(-21,-24);ctx.lineTo(-12,-45);ctx.lineTo(-2,-29);ctx.lineTo(9,-47);ctx.lineTo(22,-24);ctx.closePath();ctx.fill();ctx.fillStyle='#fff7';ctx.fillRect(3,-13,43,7);}
  else if(t.type==='zap'){ctx.strokeStyle=color;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-6,-20);ctx.lineTo(11,-38);ctx.lineTo(2,-17);ctx.lineTo(17,-30);ctx.stroke();}
  else if(t.type==='mortar'){ctx.fillStyle=color;ctx.save();ctx.rotate(-.45);ctx.fillRect(-8,-52,18,48);ctx.restore();ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(0,-20,18,0,TAU);ctx.fill();}
  else if(t.type==='bank'){ctx.fillStyle=color;ctx.fillRect(-17,-37,34,15);ctx.fillStyle='#052e1b';ctx.fillRect(-10,-18,20,22);ctx.fillStyle='#fbbf24';ctx.font='bold 16px system-ui';ctx.textAlign='center';ctx.fillText('$',0,-2);}
  else if(t.type==='barricade'){ctx.fillStyle=color;for(let x=-25;x<=15;x+=13)ctx.fillRect(x,-31,9,50);ctx.strokeStyle='#020617';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-30,-3);ctx.lineTo(30,-17);ctx.stroke();}
  ctx.restore();drawTomHead(ctx,t,t.x,t.y-43,12,0);
}

function drawEnemySprite(ctx, e) {
  ctx.save();ctx.translate(e.x,e.y);const hit=e.slow>0?'#67e8f9':null,main=hit||(e.elite?'#fbbf24':e.type==='boss'?'#fbbf24':e.type==='tank'?'#7c3aed':e.type==='shooter'?'#38bdf8':'#ef4444');
  ctx.globalAlpha=.3;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(0,e.r*.75,e.r*1.15,e.r*.38,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
  if(e.type==='runner'||e.type==='charger'){ctx.rotate(Math.atan2(e.vy||0,e.vx||1));ctx.fillStyle=main;ctx.beginPath();ctx.moveTo(e.r*1.45,0);ctx.lineTo(-e.r*.6,-e.r*.9);ctx.lineTo(-e.r*.25,0);ctx.lineTo(-e.r*.6,e.r*.9);ctx.closePath();ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(-e.r*.35,-e.r*.25,e.r*.9,e.r*.5);ctx.strokeStyle='#fff8';ctx.beginPath();ctx.moveTo(-e.r*.9,-e.r*.8);ctx.lineTo(-e.r*.2,-e.r*1.25);ctx.moveTo(-e.r*.9,e.r*.8);ctx.lineTo(-e.r*.2,e.r*1.25);ctx.stroke();}
  else if(e.type==='tank'){ctx.fillStyle=main;ctx.beginPath();ctx.roundRect(-e.r*1.15,-e.r*.72,e.r*2.3,e.r*1.45,8);ctx.fill();ctx.fillStyle='#111827';ctx.fillRect(-e.r*1.35,-e.r*.95,e.r*.34,e.r*1.9);ctx.fillRect(e.r,e.r*-.95,e.r*.34,e.r*1.9);ctx.fillStyle='#c4b5fd';ctx.fillRect(-6,-e.r-12,12,e.r+11);ctx.fillStyle='#fff';ctx.fillRect(-e.r*.38,-4,8,6);ctx.fillRect(e.r*.16,-4,8,6);}
  else if(e.type==='shooter'){ctx.fillStyle=main;ctx.beginPath();ctx.moveTo(0,-e.r*1.15);ctx.lineTo(e.r*1.05,0);ctx.lineTo(0,e.r*1.15);ctx.lineTo(-e.r*1.05,0);ctx.closePath();ctx.fill();ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(0,0,e.r*.5,0,TAU);ctx.fill();ctx.fillStyle='#e0f2fe';ctx.fillRect(e.r*.45,-4,e.r*1.25,8);ctx.strokeStyle='#e0f2fe88';ctx.beginPath();ctx.arc(0,0,e.r*.85,0,TAU);ctx.stroke();}
  else if(e.type==='boss'){ctx.fillStyle=main;ctx.beginPath();ctx.moveTo(-e.r,e.r*.55);ctx.lineTo(-e.r*.82,-e.r*.72);ctx.lineTo(-e.r*.35,-e.r*.24);ctx.lineTo(0,-e.r*1.18);ctx.lineTo(e.r*.35,-e.r*.24);ctx.lineTo(e.r*.82,-e.r*.72);ctx.lineTo(e.r,e.r*.55);ctx.closePath();ctx.fill();ctx.fillStyle='#713f12';ctx.beginPath();ctx.arc(0,5,e.r*.42,0,TAU);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-e.r*.45,-e.r*.05);ctx.lineTo(-e.r*.1,-e.r*.15);ctx.moveTo(e.r*.1,-e.r*.15);ctx.lineTo(e.r*.45,-e.r*.05);ctx.stroke();}
  else {ctx.fillStyle=main;ctx.beginPath();for(let i=0;i<10;i++){const a=i*TAU/10,r=i%2?e.r*.68:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.fillStyle='#111827';ctx.beginPath();ctx.roundRect(-e.r*.48,-5,e.r*.96,11,4);ctx.fill();ctx.fillStyle='#fff';ctx.fillRect(-e.r*.3,-2,5,4);ctx.fillRect(e.r*.1,-2,5,4);}
  if(e.mod||e.elite){ctx.strokeStyle=e.mod==='regen'?'#34d399':e.mod==='haste'?'#fbbf24':'#60a5fa';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,e.r+10,0,TAU);ctx.stroke();}
  ctx.restore();
}

function battleArena(ctx) {
  ctx.fillStyle='#101e29';ctx.fillRect(0,870,2700,260);ctx.fillRect(1230,0,250,2000);ctx.strokeStyle='#ffffff12';ctx.lineWidth=4;ctx.setLineDash([42,35]);ctx.beginPath();ctx.moveTo(0,1000);ctx.lineTo(2700,1000);ctx.moveTo(1355,0);ctx.lineTo(1355,2000);ctx.stroke();ctx.setLineDash([]);
  for(let x=60;x<2660;x+=260)for(let y=70;y<1940;y+=220){ctx.fillStyle=(x+y)%3?'#0c1822':'#132230';ctx.fillRect(x,y,90,42);ctx.strokeStyle='#294154';ctx.strokeRect(x,y,90,42);}
  const cover=[[120,760,100,28],[540,1210,135,28],[1080,610,28,120],[1510,1240,120,28],[2070,820,28,130],[2380,1340,120,28],[420,360,150,70],[2210,620,180,85],[920,1500,190,80]];
  for(const b of cover){ctx.fillStyle='#304657';ctx.fillRect(...b);ctx.fillStyle='#7dd3fc22';ctx.fillRect(b[0]+5,b[1]+5,Math.max(0,b[2]-10),Math.max(0,b[3]-10));ctx.strokeStyle='#0f172a';ctx.lineWidth=4;ctx.strokeRect(...b);}
  ctx.fillStyle='#fbbf2418';ctx.beginPath();ctx.moveTo(1350,760);ctx.lineTo(1460,930);ctx.lineTo(1350,1100);ctx.lineTo(1240,930);ctx.closePath();ctx.fill();
  ctx.fillStyle='#f8fafc';ctx.font='900 46px system-ui';ctx.textAlign='center';ctx.globalAlpha=.16;ctx.fillText('TOM PEARL DROPZONE',1350,1018);ctx.globalAlpha=1;
  for(const s of [[280,1680,'TP'],[2460,1600,'V23'],[2150,210,'PEARL']]){ctx.fillStyle='#0f172a';ctx.fillRect(s[0]-60,s[1]-28,120,56);ctx.strokeStyle='#fb7185';ctx.strokeRect(s[0]-60,s[1]-28,120,56);ctx.fillStyle='#fff';ctx.font='900 18px system-ui';ctx.fillText(s[2],s[0],s[1]+7);}
}

function kartArena(ctx) {
  const stands=[[570,470,560,90],[1570,470,560,90],[570,1435,560,90],[1570,1435,560,90]];for(const s of stands){ctx.fillStyle='#18232d';ctx.fillRect(...s);for(let x=s[0]+18;x<s[0]+s[2]-10;x+=34){ctx.fillStyle=(x/34)%2<1?'#38bdf8':'#fbbf24';ctx.fillRect(x,s[1]+14,18,s[3]-28);}}
  ctx.fillStyle='#263442';ctx.fillRect(1185,570,330,120);ctx.strokeStyle='#94a3b8';ctx.strokeRect(1185,570,330,120);ctx.fillStyle='#f8fafc18';for(let x=1205;x<1490;x+=42)ctx.fillRect(x,585,24,90);
  for(let i=0;i<12;i++){const a=i*TAU/12,x=1350+Math.cos(a)*1210,y=1000+Math.sin(a)*850;ctx.fillStyle=i%2?'#ef4444':'#f8fafc';ctx.fillRect(x-28,y-18,56,36);}
  ctx.strokeStyle='#ef4444';ctx.lineWidth=15;ctx.beginPath();ctx.ellipse(1350,1000,1135,805,0,0,TAU);ctx.stroke();ctx.strokeStyle='#f8fafc';ctx.setLineDash([28,28]);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#fbbf24';ctx.font='900 54px system-ui';ctx.textAlign='center';ctx.globalAlpha=.22;ctx.fillText('PEARL GRAND PRIX',1350,1014);ctx.globalAlpha=1;
  for(const p of [[430,1010],[2270,1010],[1350,250],[1350,1750]]){ctx.fillStyle='#111827';ctx.beginPath();ctx.arc(p[0],p[1],54,0,TAU);ctx.fill();ctx.strokeStyle='#67e8f9';ctx.stroke();}
}

function defenseArena(ctx) {
  ctx.fillStyle='#172d26';for(let x=65;x<1850;x+=180)for(let y=65;y<1050;y+=180){ctx.fillRect(x,y,92,92);ctx.strokeStyle='#2c493e';ctx.strokeRect(x,y,92,92);ctx.fillStyle='#ffffff06';ctx.fillRect(x+12,y+12,68,18);}
  ctx.fillStyle='#243941';ctx.fillRect(1635,845,240,170);ctx.strokeStyle='#fbbf24';ctx.lineWidth=5;ctx.strokeRect(1635,845,240,170);ctx.fillStyle='#fbbf2420';ctx.beginPath();ctx.moveTo(1755,865);ctx.lineTo(1825,970);ctx.lineTo(1685,970);ctx.closePath();ctx.fill();
  ctx.fillStyle='#0b1519';for(const x of [45,470,900,1325,1750]){ctx.fillRect(x,20,110,38);ctx.fillRect(x,1040,110,38);}
  for(const p of [[230,840],[610,120],[1000,910],[1430,135]]){ctx.fillStyle='#0f172a';ctx.fillRect(p[0]-42,p[1]-42,84,84);ctx.strokeStyle='#34d39988';ctx.strokeRect(p[0]-42,p[1]-42,84,84);ctx.fillStyle='#34d39922';ctx.beginPath();ctx.arc(p[0],p[1],34,0,TAU);ctx.fill();}
  ctx.fillStyle='#f8fafc';ctx.font='900 34px system-ui';ctx.textAlign='center';ctx.globalAlpha=.14;ctx.fillText('PROTECT THE PEARL CORE',950,565);ctx.globalAlpha=1;
}

function survivorArena(ctx) {
  const ruins=[[210,180,240,90],[750,230,100,280],[1660,180,310,80],[2090,480,120,310],[300,1280,330,95],[1040,1430,120,260],[1800,1390,330,95]];for(const r of ruins){ctx.fillStyle='#142634';ctx.fillRect(...r);ctx.strokeStyle='#2d4759';ctx.lineWidth=5;ctx.strokeRect(...r);ctx.fillStyle='#071018';for(let x=r[0]+25;x<r[0]+r[2]-20;x+=58)ctx.fillRect(x,r[1]+18,25,Math.min(34,r[3]-25));}
  ctx.strokeStyle='#4c1d9566';ctx.lineWidth=7;for(let i=0;i<11;i++){const x=(i*397)%2400+40,y=(i*683)%1700+50;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+35,y+18);ctx.lineTo(x+12,y+55);ctx.stroke();}
  for(let i=0;i<18;i++){const x=(i*521)%2380+60,y=(i*317)%1760+50;ctx.fillStyle=i%3?'#0f1f2c':'#1e1b4b';ctx.beginPath();ctx.arc(x,y,20+(i%4)*5,0,TAU);ctx.fill();ctx.strokeStyle='#a78bfa33';ctx.stroke();}
  ctx.fillStyle='#a78bfa22';ctx.beginPath();ctx.moveTo(1250,760);ctx.lineTo(1415,925);ctx.lineTo(1250,1090);ctx.lineTo(1085,925);ctx.closePath();ctx.fill();ctx.strokeStyle='#a78bfa66';ctx.stroke();
  ctx.fillStyle='#f8fafc';ctx.font='900 42px system-ui';ctx.textAlign='center';ctx.globalAlpha=.13;ctx.fillText('ARCHIVE SURVIVORS',1250,940);ctx.globalAlpha=1;
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
    this.init(); for (const p of remotes) this.spawnRemote(p); this.phase = 'countdown'; this.countdown = 3.7; this.result = null; this.spectating = false; this.last = performance.now(); document.body.classList.add('arcadePlaying'); this.syncOverlay();
    setTimeout(() => this.shell?.scrollIntoView?.({block:'start', behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}), 80);
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
  finish(title, text) { this.phase = 'ended'; this.result = {title,text}; document.body.classList.remove('arcadePlaying'); this.syncOverlay(); }
  stop() { this.running = false; this.connected = false; this.phase = 'idle'; document.body.classList.remove('arcadePlaying'); cancelAnimationFrame(this.raf); if(this.startButton)this.startButton.textContent='Play'; this.showOverlay(this.title, 'Join the arena to play.'); }
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
    for(const e of this.effects){c.globalAlpha=clamp(e.life/.28,0,1);c.strokeStyle=e.color;c.lineWidth=5;c.beginPath();c.arc(e.x,e.y,Math.max(0,28*(1-e.life/.28)),0,TAU);c.stroke();}c.globalAlpha=1;
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
  makeCar(name,player=false,grid=0,netId=''){const row=Math.floor(grid/2),lane=grid%2?86:-86,p=this.point(0,lane);p.y+=row*54;return{name,player,remote:!!netId&&!player,netId,skin:player?this.selectedSkin():Math.floor(rnd(0,skins.length)),x:p.x,y:p.y,angle:0,lap:0,cp:1,speed:0,boost:45,place:grid+1,skill:rnd(.58,.97),risk:rnd(.55,1.15),lane:rnd(-78,78),finished:false,finishTime:0,power:'',powerCd:0,shield:0,mistake:0,drifting:false};}
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
      for(const crate of this.crates){if(crate.respawn>0)continue;const p=this.point(crate.i,0);if(dist(c,p)<65){c.power=['turbo','shield','pulse','oil','magnet','lightning'][Math.floor(rnd(0,6))];crate.respawn=5;if(c===this.player)this.notice(c.power.toUpperCase()+' PICKUP - E TO USE');}}
    }
    for(let a=0;a<this.actors.length;a++)for(let b=a+1;b<this.actors.length;b++){const x=this.actors[a],y=this.actors[b];if(false&&!x.finished&&!y.finished&&dist(x,y)<32){if(!x.shield)x.speed*=.96;if(!y.shield)y.speed*=.96;const d=Math.atan2(y.y-x.y,y.x-x.x);x.x-=Math.cos(d)*2;y.x+=Math.cos(d)*2;x.y-=Math.sin(d)*2;y.y+=Math.sin(d)*2;}}
    const rank=[...this.actors].filter(c=>!c.finished).sort((a,b)=>(b.lap*this.CP+b.cp)-(a.lap*this.CP+a.cp));rank.forEach((c,i)=>c.place=this.finishers.length+i+1);for(const e of this.effects)e.life-=dt;this.effects=this.effects.filter(e=>e.life>0);this.camera.x+=(this.player.x-this.camera.x)*.1;this.camera.y+=(this.player.y-this.camera.y)*.1;this.hud();
  }
  hud(){if(!this.player)return;$('kartLap').textContent=Math.min(3,this.player.lap+1)+'/3';$('kartPlace').textContent=this.player.place+'/'+this.actors.length;$('kartSpeed').textContent=Math.round(Math.abs(this.player.speed));$('kartBoost').textContent=Math.round(this.player.boost);$('kartTime').textContent=timeText(this.elapsed);$('kartObjective').textContent=this.player.drifting?'DRIFTING + BOOST':'SPACE DRIFT | SHIFT BOOST | E POWER';this.powerEl.textContent=this.player.power?this.player.power.toUpperCase()+' READY':'NO POWER';}
  render(){const {w,h}=fit(this.canvas,this.ctx),c=this.ctx;c.fillStyle='#07130f';c.fillRect(0,0,w,h);c.save();c.translate(w/2-this.camera.x,h/2-this.camera.y);c.fillStyle='#0c281c';c.fillRect(-200,-200,3100,2400);kartArena(c);for(let i=0;i<95;i++){const x=(i*293)%2700,y=(i*617)%2000;c.fillStyle=i%3?'#123824':'#17452d';c.beginPath();c.arc(x,y,12+(i%4)*4,0,TAU);c.fill();}c.strokeStyle='#1c242b';c.lineWidth=310;c.beginPath();c.ellipse(this.cx,this.cy,this.rx,this.ry,0,0,TAU);c.stroke();c.strokeStyle='#56616b';c.lineWidth=260;c.stroke();c.setLineDash([28,22]);c.strokeStyle='#dce4e8aa';c.lineWidth=3;c.stroke();c.setLineDash([]);
    const start=this.point(0);c.save();c.translate(start.x,start.y);for(let y=-125;y<125;y+=25)for(let x=-12;x<13;x+=12){c.fillStyle=((x/12+y/25)&1)?'#fff':'#111';c.fillRect(x,y,12,25);}c.restore();
    for(const pad of this.pads){const p=this.point(pad.i);c.save();c.translate(p.x,p.y);c.rotate(p.a+Math.PI/2);c.fillStyle='#22d3eeaa';for(let x=-42;x<=42;x+=28)c.fillRect(x,-15,18,30);c.restore();}
    for(const crate of this.crates)if(crate.respawn<=0){const p=this.point(crate.i);c.fillStyle='#fbbf24';c.fillRect(p.x-13,p.y-13,26,26);c.strokeStyle='#fff4';c.strokeRect(p.x-13,p.y-13,26,26);}
    for(const e of this.effects){c.globalAlpha=clamp(e.life/.5,0,1);c.strokeStyle='#a78bfa';c.lineWidth=8;c.beginPath();c.arc(e.x,e.y,Math.max(0,180*(1-e.life/.5)),0,TAU);c.stroke();}c.globalAlpha=1;
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
    for(const p of this.projectiles){c.strokeStyle=p.color;c.lineWidth=5;c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.tx,p.ty);c.stroke();}for(const e of this.effects){c.globalAlpha=clamp(e.life/.7,0,1);c.strokeStyle='#f8fafc';c.lineWidth=18;c.beginPath();c.arc(e.x,e.y,Math.max(0,700*(1-e.life/.7)),0,TAU);c.stroke();}c.globalAlpha=1;c.fillStyle='#fbbf24';c.beginPath();c.arc(1780,930,55,0,TAU);c.fill();for(const a of this.actors)avatar(c,a,22);c.restore();}
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
  render(){const {w,h}=fit(this.canvas,this.ctx),c=this.ctx;c.fillStyle='#071018';c.fillRect(0,0,w,h);c.save();c.translate(w/2-this.camera.x,h/2-this.camera.y);c.fillStyle='#0a1720';c.fillRect(0,0,this.W,this.H);survivorArena(c);c.strokeStyle='#173047';for(let x=0;x<this.W;x+=90){c.beginPath();c.moveTo(x,0);c.lineTo(x,this.H);c.stroke()}for(let y=0;y<this.H;y+=90){c.beginPath();c.moveTo(0,y);c.lineTo(this.W,y);c.stroke()}for(const g of this.gems){c.fillStyle=g.type==='heal'?'#34d399':'#a78bfa';c.beginPath();c.arc(g.x,g.y,g.type==='heal'?9:6,0,TAU);c.fill();}for(const e of this.effects){c.globalAlpha=clamp(e.life/.35,0,1);c.strokeStyle='#67e8f9';c.lineWidth=5;c.beginPath();c.arc(e.x,e.y,Math.max(0,80*(1-e.life/.35)),0,TAU);c.stroke();}c.globalAlpha=1;
    for(const e of this.enemies){drawEnemySprite(c,e);if(e.type==='boss'||e.type==='tank'){c.fillStyle='#111';c.fillRect(e.x-42,e.y-e.r-14,84,7);c.fillStyle='#fde047';c.fillRect(e.x-42,e.y-e.r-14,84*clamp(e.hp/e.max,0,1),7);}}
    for(const p of this.projectiles){c.fillStyle=p.enemy?'#fb7185':p.crit?'#fde047':'#67e8f9';c.beginPath();c.arc(p.x,p.y,p.crit?7:5,0,TAU);c.fill();}
    for(const h of this.actors)if(!h.dead){for(let n=0;n<h.orbitals;n++){const a=this.elapsed*2.5+n*TAU/h.orbitals;c.fillStyle='#fbbf24';c.beginPath();c.arc(h.x+Math.cos(a)*75,h.y+Math.sin(a)*75,10,0,TAU);c.fill();}drawFighter(c,h,'survivor');c.fillStyle='#05080d';c.fillRect(h.x-20,h.y-34,40,4);c.fillStyle='#34d399';c.fillRect(h.x-20,h.y-34,40*clamp(h.hp/h.maxHp,0,1),4);}c.restore();}
  pack(){return{v:2,g:'survivors',full:true,...this.basePack(),actors:this.actors,enemies:this.enemies,projectiles:this.projectiles.map(p=>({x:p.x,y:p.y,enemy:p.enemy,crit:p.crit})),pickups:this.gems,elapsed:this.elapsed,bossAt:this.bossAt,eventAt:this.eventAt};}
  apply(s){if(!s||s.g!=='survivors')return;this.applyBase(s);this.actors=s.actors||[];this.player=this.actors.find(a=>a.netId===this.remoteId||a.id===this.remoteId)||this.actors.find(a=>a.player)||this.actors[0];this.enemies=s.enemies||[];this.projectiles=s.projectiles||[];this.gems=s.pickups||[];this.elapsed=s.elapsed||0;this.bossAt=s.bossAt||45;this.eventAt=s.eventAt||25;this.camera=this.camera||{x:this.player?.x||1250,y:this.player?.y||925};if(this.player){this.camera.x+=(this.player.x-this.camera.x)*.25;this.camera.y+=(this.player.y-this.camera.y)*.25;this.hud();}}
}

function installArcadeV23() {
  const worldDraw = (game, draw) => {
    const {w,h}=fit(game.canvas,game.ctx),c=game.ctx;
    c.save(); c.translate(w/2-(game.camera?.x||0),h/2-(game.camera?.y||0)); draw(c,w,h); c.restore();
  };
  const screenPulse = (game, color, alpha=.18) => {
    const {w,h}=fit(game.canvas,game.ctx),c=game.ctx,g=c.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.72);
    g.addColorStop(0,'transparent'); g.addColorStop(1,color); c.fillStyle=g; c.globalAlpha=alpha; c.fillRect(0,0,w,h); c.globalAlpha=1;
  };

  const battleInit=BattleGame.prototype.init,battleDrop=BattleGame.prototype.dropLoot,battleUpdate=BattleGame.prototype.update,battleRender=BattleGame.prototype.render,battleHurt=BattleGame.prototype.hurt,battlePack=BattleGame.prototype.pack,battleApply=BattleGame.prototype.apply;
  BattleGame.prototype.dropLoot=function(x,y,type){if(['stim','armor','grenade','mine','coin','radar'].includes(type))this.pickups.push({x,y,type,weapon:''});else battleDrop.call(this,x,y,type)};
  BattleGame.prototype.init=function(){battleInit.call(this);Object.assign(this,{grenades:[],mines:[],airstrikes:[],dangerPings:[],battleCombo:0,comboAt:0,bountyAt:18,flareAt:12,stormSeed:Math.floor(rnd(0,9999))});this.bounty=this.actors.find(a=>!a.player&&!a.dead)||null;for(let i=0;i<42;i++)this.dropLoot(rnd(90,this.W-90),rnd(90,this.H-90),['stim','armor','grenade','mine','coin','radar'][i%6]);this.obstacles.push({x:1120,y:1070,w:170,h:80},{x:2320,y:250,w:150,h:90},{x:290,y:540,w:150,h:90});};
  BattleGame.prototype.hurt=function(a,d,owner){if(a.armor>0){const block=Math.min(a.armor,d*.45);a.armor-=block;d-=block}const before=a.dead;battleHurt.call(this,a,d,owner);if(!before&&a.dead&&owner===this.player){this.battleCombo++;this.comboAt=performance.now()+3500;}};
  BattleGame.prototype.specialPickup=function(a,p){p.dead=true;if(p.type==='stim'){a.stamina=100;a.dashCd=0;if(a===this.player)this.notice('STIM READY - DASH RESET')}if(p.type==='armor'){a.armor=Math.min(70,(a.armor||0)+35);if(a===this.player)this.notice('ARMOR PLATED')}if(p.type==='grenade'){a.grenades=(a.grenades||0)+1;if(a===this.player)this.notice('GRENADE READY - E')}if(p.type==='mine'){a.mines=(a.mines||0)+1;if(a===this.player)this.notice('MINE STORED')}if(p.type==='coin'){if(a===this.player)this.reward(12,2);this.effects.push({x:p.x,y:p.y,life:.3,color:'#fbbf24'})}if(p.type==='radar'){a.scanUntil=performance.now()+4500;if(a===this.player)this.notice('RADAR PULSE')}};
  BattleGame.prototype.throwGrenade=function(a){if((a.grenadeCd||0)>0||(a.grenades||0)<=0||a.dead)return;const ang=a.angle||0;a.grenades--;a.grenadeCd=3.8;this.grenades.push({x:a.x+Math.cos(ang)*26,y:a.y+Math.sin(ang)*26,vx:Math.cos(ang)*500,vy:Math.sin(ang)*500,life:.78,owner:a});if(a===this.player)this.notice('GRENADE OUT')};
  BattleGame.prototype.placeMine=function(a){if((a.mineCd||0)>0||(a.mines||0)<=0||a.dead)return;a.mines--;a.mineCd=2.2;this.mines.push({x:a.x,y:a.y,owner:a,life:18,armed:.35});if(a===this.player)this.notice('MINE ARMED')};
  BattleGame.prototype.explode=function(x,y,r,damage,owner,color='#f97316'){this.effects.push({x,y,life:.46,color});for(const a of this.actors){if(!a.dead&&a!==owner){const d=dist(a,{x,y});if(d<r)this.hurt(a,damage*(1-d/r),owner)}}};
  BattleGame.prototype.update=function(dt,t){for(const a of this.actors){a.grenadeCd=Math.max(0,(a.grenadeCd||0)-dt);a.mineCd=Math.max(0,(a.mineCd||0)-dt);for(const p of this.pickups)if(!p.dead&&['stim','armor','grenade','mine','coin','radar'].includes(p.type)&&dist(a,p)<30)this.specialPickup(a,p);if(a.player&&this.keys.KeyE)this.throwGrenade(a);if(a.player&&this.keys.KeyQ)this.placeMine(a);if(!a.player&&!a.dead&&a.goal?.enemy&&Math.random()<.0035*a.skill)this.throwGrenade(a)}battleUpdate.call(this,dt,t);
    if(this.phase!=='playing')return;this.bountyAt-=dt;if(this.bountyAt<=0||!this.bounty||this.bounty.dead){if(this.bounty?.dead&&this.lastKiller===this.player){this.reward(95,35);this.notice('BOUNTY CLAIMED')}const pool=this.actors.filter(a=>!a.player&&!a.dead);this.bounty=pool[Math.floor(rnd(0,pool.length))]||null;this.bountyAt=18; if(this.bounty)this.notice('BOUNTY: '+this.bounty.name);}
    this.flareAt-=dt;if(this.flareAt<=0){this.flareAt=rnd(10,16);this.airstrikes.push({x:this.zone.x+rnd(-this.zone.r*.7,this.zone.r*.7),y:this.zone.y+rnd(-this.zone.r*.7,this.zone.r*.7),life:2.2,boom:false});this.notice('AIRSTRIKE MARKED');}
    for(const g of this.grenades){g.x+=g.vx*dt;g.y+=g.vy*dt;g.vx*=1-dt*1.6;g.vy*=1-dt*1.6;g.life-=dt;if(this.collides(g.x,g.y,8))g.life=0;if(g.life<=0&&!g.done){g.done=true;this.explode(g.x,g.y,150,54,g.owner)}}
    for(const m of this.mines){m.life-=dt;m.armed-=dt;const hit=this.actors.find(a=>!a.dead&&a!==m.owner&&m.armed<=0&&dist(a,m)<46);if(hit){m.life=0;this.explode(m.x,m.y,130,46,m.owner,'#fb7185')}}
    for(const s of this.airstrikes){s.life-=dt;if(s.life<.8&&!s.boom){s.boom=true;this.explode(s.x,s.y,190,68,null,'#fbbf24')}}this.grenades=this.grenades.filter(g=>!g.done);this.mines=this.mines.filter(m=>m.life>0);this.airstrikes=this.airstrikes.filter(s=>s.life>0);};
  BattleGame.prototype.hud=function(){if(!this.player)return;$('battleHp').textContent=Math.max(0,Math.ceil(this.player.hp));$('battleShield').textContent=Math.ceil(this.player.shield+(this.player.armor||0));$('battleAmmo').textContent=this.player.reload>0?'RELOAD':this.player.ammo+'/'+this.player.reserve;$('battleAlive').textContent=this.actors.filter(a=>!a.dead).length;$('battleKos').textContent=this.kos;$('battleObjective').textContent=(this.player.weapon||'pulse').toUpperCase()+' | G '+(this.player.grenades||0)+' | M '+(this.player.mines||0)+' | BOUNTY '+(this.bounty?.name||'-');};
  BattleGame.prototype.render=function(){battleRender.call(this);worldDraw(this,(c)=>{for(const s of this.airstrikes){c.globalAlpha=.25+.25*Math.sin(performance.now()/80);c.fillStyle='#ef4444';c.beginPath();c.arc(s.x,s.y,190,0,TAU);c.fill();c.globalAlpha=1;c.strokeStyle='#fbbf24';c.lineWidth=4;c.beginPath();c.arc(s.x,s.y,Math.max(0,190*(s.life/2.2)),0,TAU);c.stroke()}for(const m of this.mines){c.fillStyle=m.armed>0?'#64748b':'#fb7185';c.beginPath();c.arc(m.x,m.y,10,0,TAU);c.fill();c.strokeStyle='#fff5';c.beginPath();c.arc(m.x,m.y,34,0,TAU);c.stroke()}for(const g of this.grenades){c.fillStyle='#f97316';c.beginPath();c.arc(g.x,g.y,9,0,TAU);c.fill();}if(this.bounty&&!this.bounty.dead){c.strokeStyle='#fbbf24';c.lineWidth=4;c.beginPath();c.arc(this.bounty.x,this.bounty.y,35+Math.sin(performance.now()/130)*5,0,TAU);c.stroke()}for(let i=0;i<45;i++){const x=(i*233+this.stormSeed*7+performance.now()*.025)%this.W,y=(i*397+this.stormSeed*3)%this.H;c.strokeStyle='#67e8f920';c.beginPath();c.moveTo(x,y);c.lineTo(x-18,y+38);c.stroke();}});if(this.player?.hp<35)screenPulse(this,'#ef4444',.22);};
  BattleGame.prototype.pack=function(){const s=battlePack.call(this);s.v23={grenades:this.grenades,mines:this.mines,airstrikes:this.airstrikes,bounty:this.bounty?.name||'',battleCombo:this.battleCombo};return s};
  BattleGame.prototype.apply=function(s){battleApply.call(this,s);if(s?.v23){this.grenades=s.v23.grenades||[];this.mines=s.v23.mines||[];this.airstrikes=s.v23.airstrikes||[];this.bounty=this.actors.find(a=>a.name===s.v23.bounty)||this.bounty;this.battleCombo=s.v23.battleCombo||0;}};

  const kartInit=KartGame.prototype.init,kartUpdate=KartGame.prototype.update,kartRender=KartGame.prototype.render,kartPower=KartGame.prototype.usePower,kartPack=KartGame.prototype.pack,kartApply=KartGame.prototype.apply;
  KartGame.prototype.getInput=function(){const brake=!!(this.keys.KeyS||this.keys.ArrowDown);return{throttle:brake?-1:1,steer:(this.keys.KeyD||this.keys.ArrowRight?1:0)-(this.keys.KeyA||this.keys.ArrowLeft?1:0),drift:!!this.keys.Space,boost:!!(this.keys.ShiftLeft||this.keys.ShiftRight),power:!!this.keys.KeyE};};
  KartGame.prototype.init=function(){kartInit.call(this);this.coins=Array.from({length:52},(_,i)=>({...this.point((i*3)%this.CP,(i%5-2)*34),dead:false,respawn:0}));this.ramps=[3,9,15,21,25].map(i=>({...this.point(i,0),cool:new Map()}));this.speedGates=[5,13,19,27].map(i=>({...this.point(i,(i%2?72:-72)),cool:new Map()}));this.cones=[1,7,11,17,23].flatMap(i=>[-95,95].map(l=>({...this.point(i,l),dead:false,respawn:0})));this.oil=[];this.sparkles=[];this.lapBurst=0;this.weather=rnd(0,1);};
  KartGame.prototype.usePower=function(c){if(!c.power||c.powerCd>0)return;const p=c.power;if(['oil','magnet','lightning'].includes(p)){c.power='';c.powerCd=1.1;if(p==='oil'){this.oil.push({x:c.x-Math.cos(c.angle)*48,y:c.y-Math.sin(c.angle)*48,life:9,owner:c});}if(p==='magnet'){c.magnetUntil=performance.now()+6000;c.boost=Math.min(100,c.boost+18);}if(p==='lightning'){for(const other of this.actors)if(other!==c&&!other.shield){other.speed*=.55;other.mistake=Math.max(other.mistake||0,.55)}this.effects.push({x:c.x,y:c.y,life:.6,type:'pulse'});}if(c===this.player)this.notice(p.toUpperCase()+' USED');return}kartPower.call(this,c)};
  KartGame.prototype.recoverCar=function(c,reason='RECOVERED'){const back=((c.cp||1)-1+this.CP)%this.CP,p=this.point(back,c.lane||0);c.x=p.x;c.y=p.y;c.angle=p.a+Math.PI/2;c.speed=120;c.offTrackTime=0;c.stuckTime=0;c.recoverCd=2;if(c===this.player)this.notice(reason);};
  KartGame.prototype.advanceCar=function(c){if(c.finished)return;const target=this.point(c.cp,c.lane);if(dist(c,target)<190){c.cp++;if(c.cp>=this.CP){c.cp=0;c.lap++;if(c.lap>=3){c.finished=true;c.finishTime=this.elapsed;if(!this.finishers.includes(c))this.finishers.push(c);c.place=this.finishers.indexOf(c)+1;if(c===this.player){this.reward(c.place===1?600:Math.max(80,360-c.place*22),120);this.finish('FINISH #'+c.place,timeText(this.elapsed)+' on Pearl Circuit');}}}}};
  KartGame.prototype.update=function(dt){kartUpdate.call(this,dt);if(this.phase!=='playing')return;for(const cone of this.cones){if(cone.dead){cone.respawn-=dt;if(cone.respawn<=0)cone.dead=false}}for(const coin of this.coins){if(coin.dead){coin.respawn-=dt;if(coin.respawn<=0)coin.dead=false;continue}for(const c of this.actors){if(!c.finished&&(c.magnetUntil||0)>performance.now()&&dist(c,coin)<170){coin.x+=(c.x-coin.x)*dt*8;coin.y+=(c.y-coin.y)*dt*8;}if(!c.finished&&dist(c,coin)<31){coin.dead=true;coin.respawn=7;c.boost=Math.min(100,c.boost+5);c.coins=(c.coins||0)+1;c.coinStreak=(c.coinStreak||0)+1;if(c.coinStreak%8===0)c.boost=Math.min(100,c.boost+15);if(c===this.player&&c.coins%10===0)this.reward(35,8);break}}}for(const c of this.actors){if(c.finished)continue;c.recoverCd=Math.max(0,(c.recoverCd||0)-dt);this.advanceCar(c);const tf=this.trackFactor(c);c.offTrackTime=(tf<.58||tf>1.58)?(c.offTrackTime||0)+dt:Math.max(0,(c.offTrackTime||0)-dt*2);c.stuckTime=(Math.abs(c.speed)<18)?(c.stuckTime||0)+dt:0;if(c.recoverCd<=0&&(c.offTrackTime>2.4||c.stuckTime>3.2))this.recoverCar(c,c.offTrackTime>2.4?'BACK ON TRACK':'UNSTUCK');if(c.drifting){c.driftScore=(c.driftScore||0)+dt*34;if(c.driftScore>100){c.driftScore=0;c.boost=Math.min(100,c.boost+28);if(c===this.player)this.notice('DRIFT BONUS');}}else c.driftScore=Math.max(0,(c.driftScore||0)-dt*18);for(const r of this.ramps)if((r.cool.get(c)||0)<this.elapsed&&dist(c,r)<64){c.speed+=135;c.jump=1;r.cool.set(c,this.elapsed+2.5);if(c===this.player)this.notice('RAMP JUMP');}for(const g of this.speedGates)if((g.cool.get(c)||0)<this.elapsed&&dist(c,g)<70){c.speed+=92;c.boost=Math.min(100,c.boost+12);g.cool.set(c,this.elapsed+2);if(c===this.player)this.notice('SPEED GATE');}for(const cone of this.cones)if(!cone.dead&&dist(c,cone)<30){cone.dead=true;cone.respawn=8;if(!c.shield)c.speed*=.72;c.mistake=Math.max(c.mistake||0,.45);if(c===this.player)this.notice('CONE HIT');}c.jump=Math.max(0,(c.jump||0)-dt*1.6);for(const o of this.oil)if(o.owner!==c&&dist(c,o)<52&&!c.shield){c.speed*=.9;c.angle+=rnd(-.08,.08);c.mistake=Math.max(c.mistake||0,.35)}const front=this.actors.find(o=>o!==c&&!o.finished&&dist(c,o)<125&&Math.abs(angleDiff(c.angle,o.angle))<.38&&Math.cos(c.angle)*(o.x-c.x)+Math.sin(c.angle)*(o.y-c.y)>0);if(front){c.speed+=35*dt;c.boost=Math.min(100,c.boost+10*dt);if(c===this.player&&Math.random()<.015)this.notice('SLIPSTREAM')}}this.oil.forEach(o=>o.life-=dt);this.oil=this.oil.filter(o=>o.life>0);};
  KartGame.prototype.hud=function(){if(!this.player)return;$('kartLap').textContent=Math.min(3,this.player.lap+1)+'/3';$('kartPlace').textContent=this.player.place+'/'+this.actors.length;$('kartSpeed').textContent=Math.round(Math.abs(this.player.speed));$('kartBoost').textContent=Math.round(this.player.boost);$('kartTime').textContent=timeText(this.elapsed);$('kartObjective').textContent=(this.player.jump>0?'AIRBORNE':'COINS '+(this.player.coins||0))+' | DRIFT '+Math.floor(this.player.driftScore||0)+' | E POWER';this.powerEl.textContent=this.player.power?this.player.power.toUpperCase()+' READY':'NO POWER';};
  KartGame.prototype.render=function(){kartRender.call(this);worldDraw(this,(c)=>{for(const coin of this.coins)if(!coin.dead){c.fillStyle='#fbbf24';c.beginPath();c.arc(coin.x,coin.y,8+Math.sin(performance.now()/130+coin.x)*2,0,TAU);c.fill();c.strokeStyle='#fff5';c.stroke()}for(const r of this.ramps){c.save();c.translate(r.x,r.y);c.rotate(r.a+Math.PI/2);c.fillStyle='#7c3aedcc';c.fillRect(-52,-13,104,26);c.fillStyle='#fff8';c.fillRect(-36,-4,72,8);c.restore()}for(const g of this.speedGates){c.save();c.translate(g.x,g.y);c.rotate(g.a+Math.PI/2);c.strokeStyle='#22d3ee';c.lineWidth=5;c.strokeRect(-42,-22,84,44);c.fillStyle='#22d3ee33';c.fillRect(-38,-18,76,36);c.restore()}for(const cone of this.cones)if(!cone.dead){c.fillStyle='#fb923c';c.beginPath();c.moveTo(cone.x,cone.y-16);c.lineTo(cone.x+13,cone.y+14);c.lineTo(cone.x-13,cone.y+14);c.closePath();c.fill();c.fillStyle='#fff8';c.fillRect(cone.x-8,cone.y+4,16,4)}for(const o of this.oil){c.globalAlpha=clamp(o.life/9,.15,.55);c.fillStyle='#05070a';c.beginPath();c.ellipse(o.x,o.y,44,24,0,0,TAU);c.fill();c.globalAlpha=1}for(const ccar of this.actors)if((ccar.magnetUntil||0)>performance.now()){c.strokeStyle='#fbbf24aa';c.lineWidth=3;c.beginPath();c.arc(ccar.x,ccar.y,70,0,TAU);c.stroke()}for(let i=0;i<28;i++){const p=this.point((i+performance.now()/1000)%this.CP,105);c.fillStyle=i%2?'#67e8f955':'#f472b655';c.fillRect(p.x-6,p.y-6,12,12)}});};
  KartGame.prototype.pack=function(){const s=kartPack.call(this);s.v23={coins:this.coins,ramps:this.ramps.map(r=>({x:r.x,y:r.y,a:r.a})),speedGates:this.speedGates?.map(g=>({x:g.x,y:g.y,a:g.a})),cones:this.cones,oil:this.oil};return s};
  KartGame.prototype.apply=function(s){kartApply.call(this,s);if(s?.v23){this.coins=s.v23.coins||this.coins||[];this.oil=s.v23.oil||[];if(s.v23.cones)this.cones=s.v23.cones;if(s.v23.speedGates)this.speedGates=s.v23.speedGates.map(g=>({...g,cool:new Map()}));}};

  const defBind=DefenseGame.prototype.bindDefense,defInit=DefenseGame.prototype.init,defConfig=DefenseGame.prototype.config,defSpawn=DefenseGame.prototype.spawnEnemy,defUpdate=DefenseGame.prototype.update,defRender=DefenseGame.prototype.render,defPack=DefenseGame.prototype.pack,defApply=DefenseGame.prototype.apply;
  DefenseGame.prototype.bindDefense=function(){const tools=this.shell.querySelector('.defenseTools');if(tools&&!tools.querySelector('[data-tower="zap"]')){for(const [id,label] of [['zap','Zap - 170'],['mortar','Mortar - 260'],['bank','Bank - 180'],['barricade','Blocker - 120']]){const b=document.createElement('button');b.className='btn';b.dataset.tower=id;b.textContent=label;tools.insertBefore(b,$('defenseNext'));}}defBind.call(this)};
  DefenseGame.prototype.config=function(type){const extra={zap:{cost:170,range:210,rate:1.25,damage:20,color:'#a78bfa'},mortar:{cost:260,range:310,rate:.35,damage:88,color:'#fb923c'},bank:{cost:180,range:135,rate:.25,damage:0,color:'#34d399'},barricade:{cost:120,range:82,rate:.8,damage:4,color:'#94a3b8'}};return extra[type]||defConfig.call(this,type)};
  DefenseGame.prototype.init=function(){defInit.call(this);this.coreShield=10;this.interestAt=4;this.droneAt=7;this.weatherSweep=0;this.buffZones=[{x:560,y:690,r:95,type:'haste'},{x:1370,y:500,r:95,type:'focus'}];};
  DefenseGame.prototype.spawnEnemy=function(){defSpawn.call(this);const e=this.enemies[this.enemies.length-1];if(!e)return;const roll=Math.random();if(this.wave>2&&roll<.18){e.mod='shielded';e.hp*=1.25;e.max=e.hp;}else if(this.wave>4&&roll<.34){e.mod='regen';e.regen=6+this.wave;}else if(this.wave>6&&roll<.48){e.mod='haste';e.speed*=1.28;}};
  DefenseGame.prototype.update=function(dt){for(const e of this.enemies)if(e.regen)e.hp=Math.min(e.max,e.hp+e.regen*dt);const before=this.core;defUpdate.call(this,dt);if(this.core<before&&this.coreShield>0){const loss=before-this.core,block=Math.min(loss,this.coreShield);this.core+=block;this.coreShield-=block;this.notice('CORE SHIELD BLOCKED '+block)}this.interestAt-=dt;if(this.interestAt<=0){this.interestAt=5;for(const t of this.towers)if(t.type==='bank'){this.credits+=18+t.level*8;this.effects.push({x:t.x,y:t.y,life:.45,type:'coin'});}}for(const t of this.towers){if(t.type==='zap'){const target=this.enemies.find(e=>dist(t,e)<t.range);if(target&&Math.random()<dt*1.8){for(const e of this.enemies)if(e!==target&&dist(e,target)<90)e.hp-=t.damage*.55;this.projectiles.push({x:t.x,y:t.y,tx:target.x,ty:target.y,life:.12,color:'#a78bfa'});}}if(t.type==='mortar'){const target=this.enemies.find(e=>dist(t,e)<t.range);if(target&&Math.random()<dt*.7){for(const e of this.enemies)if(dist(e,target)<82)e.hp-=t.damage*.35;this.effects.push({x:target.x,y:target.y,life:.42,type:'blast'});}}if(t.type==='barricade')for(const e of this.enemies)if(dist(t,e)<t.range)e.slow=Math.max(e.slow,.45);}if(this.waveClear)this.coreShield=Math.min(18,this.coreShield+dt*.35);};
  DefenseGame.prototype.hud=function(){$('defenseCore').textContent=this.core+'+'+Math.floor(this.coreShield);$('defenseWave').textContent=this.wave;$('defenseCredits').textContent=this.credits;$('defenseEnemies').textContent=this.enemies.length+this.spawning;this.tip.textContent=this.selectedTower?this.selectedTower.type.toUpperCase()+' L'+this.selectedTower.level+' | Shield '+Math.floor(this.coreShield):this.abilityCd>0?'Pearl blast: '+Math.ceil(this.abilityCd)+'s':'Pearl blast ready | extra towers unlocked';};
  DefenseGame.prototype.render=function(){defRender.call(this);const {w,h}=fit(this.canvas,this.ctx),c=this.ctx,s=Math.min(w/this.W,h/this.H),ox=(w-this.W*s)/2,oy=(h-this.H*s)/2;c.save();c.translate(ox,oy);c.scale(s,s);for(const z of this.buffZones){c.globalAlpha=.2;c.fillStyle=z.type==='haste'?'#22d3ee':'#fbbf24';c.beginPath();c.arc(z.x,z.y,z.r,0,TAU);c.fill();c.globalAlpha=1;c.strokeStyle='#fff3';c.stroke();}for(const e of this.enemies)if(e.mod){c.strokeStyle=e.mod==='shielded'?'#60a5fa':e.mod==='regen'?'#34d399':'#fbbf24';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,e.r+8,0,TAU);c.stroke();}c.strokeStyle='#fbbf24';c.lineWidth=5;c.beginPath();c.arc(1780,930,62+this.coreShield*1.2,0,TAU);c.stroke();for(const t of this.towers)if(['zap','mortar','bank','barricade'].includes(t.type)){c.fillStyle=this.config(t.type).color;c.font='10px ui-monospace';c.textAlign='center';c.fillText(t.type.toUpperCase(),t.x,t.y-45);}c.restore();};
  DefenseGame.prototype.pack=function(){const s=defPack.call(this);s.v23={coreShield:this.coreShield,buffZones:this.buffZones};return s};
  DefenseGame.prototype.apply=function(s){defApply.call(this,s);if(s?.v23){this.coreShield=s.v23.coreShield??this.coreShield??10;this.buffZones=s.v23.buffZones||this.buffZones||[];}};

  const survInit=SurvivorsGame.prototype.init,survSpawn=SurvivorsGame.prototype.spawnEnemy,survUpdate=SurvivorsGame.prototype.update,survRender=SurvivorsGame.prototype.render,survPack=SurvivorsGame.prototype.pack,survApply=SurvivorsGame.prototype.apply;
  SurvivorsGame.prototype.init=function(){survInit.call(this);Object.assign(this,{relics:[],shrines:[],hazards:[],petShots:[],relicAt:18,shrineAt:22,hazardAt:16,combo:0,comboUntil:0,ultCharge:0,lastPlayerKos:0});this.player.shield=28;this.player.aura=0;this.player.pet=1;};
  SurvivorsGame.prototype.spawnEnemy=function(force=''){survSpawn.call(this,force);const e=this.enemies[this.enemies.length-1];if(e&&this.elapsed>40&&Math.random()<.16){e.elite=true;e.hp*=1.6;e.max=e.hp;e.damage*=1.25;e.r+=5;}};
  SurvivorsGame.prototype.showUpgrades=function(){if(this.guest||this.pendingUpgrade)return;this.pendingUpgrade=true;const all=['damage','rate','speed','health','range','multi','pierce','orbital','magnet','regen','crit','shield','aura','pet','nova','luck'].sort(()=>Math.random()-.5).slice(0,3),labels={damage:['Pearl Power','+27% attack damage'],rate:['Rapid Legend','Attacks fire 19% faster'],speed:['Tom Velocity','+14% movement speed'],health:['Crown Vitality','+30 max HP and heal'],range:['Wide Lens','+90 attack range'],multi:['Triple Take','Adds another projectile'],pierce:['No Filter','Projectiles pierce one more enemy'],orbital:['Pearl Orbit','Adds a damaging orbiting pearl'],magnet:['Archive Pull','Greatly increases pickup range'],regen:['Second Wind','Regenerate health every second'],crit:['Closeup Crit','+12% critical chance'],shield:['Legend Shield','Adds renewable shield'],aura:['Archive Aura','Damages nearby enemies'],pet:['Mini Tom','Adds another support shot'],nova:['Nova Bank','Ultimate charges faster'],luck:['Rare Finds','More relics and heals']};const panel=$('survivorsUpgrades');panel.innerHTML=all.map((o,i)=>`<button data-up="${o}"><em>${i===0?'V23':'UPGRADE'}</em><b>${labels[o][0]}</b><span>${labels[o][1]}</span></button>`).join('');panel.classList.add('show');panel.querySelectorAll('button').forEach(b=>b.onclick=()=>this.chooseUpgrade(this.player,b.dataset.up));};
  SurvivorsGame.prototype.chooseUpgrade=function(h,kind){const extra={shield:()=>h.shield=(h.shield||0)+40,aura:()=>h.aura=(h.aura||0)+1,pet:()=>h.pet=(h.pet||0)+1,nova:()=>h.nova=(h.nova||0)+.35,luck:()=>h.luck=(h.luck||0)+1};if(extra[kind]){extra[kind]();this.pendingUpgrade=false;$('survivorsUpgrades').classList.remove('show');this.notice('V23 UPGRADE');return}SurvivorsGame.prototype.__oldChoose.call(this,h,kind)};
  SurvivorsGame.prototype.__oldChoose=SurvivorsGame.prototype.__oldChoose||function(h,kind){const actions={damage:()=>h.damage*=1.27,rate:()=>h.rate*=.81,speed:()=>h.speed*=1.14,health:()=>{h.maxHp+=30;h.hp=Math.min(h.maxHp,h.hp+45)},range:()=>h.range+=90,multi:()=>h.multishot=Math.min(5,h.multishot+1),pierce:()=>h.pierce++,orbital:()=>h.orbitals=Math.min(4,h.orbitals+1),magnet:()=>h.magnet+=100,regen:()=>h.regen+=.9,crit:()=>h.crit=Math.min(.55,h.crit+.12)};actions[kind]?.();this.pendingUpgrade=false;$('survivorsUpgrades').classList.remove('show');this.notice('BUILD UPGRADED');};
  SurvivorsGame.prototype.update=function(dt){if(!this.pendingUpgrade&&this.player&&!this.player.dead&&this.keys.KeyE&&this.ultCharge>=100){this.ultCharge=0;for(const e of this.enemies)e.hp-=160+this.player.damage*3;this.effects.push({x:this.player.x,y:this.player.y,life:.7,type:'blast'});this.notice('LEGEND NOVA');}const before=this.player?.kos||0;survUpdate.call(this,dt);if(this.pendingUpgrade||this.phase!=='playing')return;const gained=(this.player?.kos||0)-before;if(gained>0){this.combo+=gained;this.comboUntil=performance.now()+4200;this.ultCharge=clamp(this.ultCharge+gained*(6+(this.player?.nova||0)*5),0,100);}if(performance.now()>this.comboUntil)this.combo=0;this.relicAt-=dt;this.shrineAt-=dt;this.hazardAt-=dt;if(this.relicAt<=0){this.relicAt=18-rnd(0,4)-(this.player?.luck||0);this.relics.push({x:rnd(120,this.W-120),y:rnd(120,this.H-120),life:18});this.notice('RELIC DROPPED')}if(this.shrineAt<=0){this.shrineAt=24;this.shrines.push({x:rnd(180,this.W-180),y:rnd(180,this.H-180),life:16,used:false});}if(this.hazardAt<=0){this.hazardAt=17;this.hazards.push({x:this.camera.x+rnd(-520,520),y:this.camera.y+rnd(-360,360),r:rnd(95,160),life:7});}for(const h of this.hazards){h.life-=dt;for(const e of this.enemies)if(dist(e,h)<h.r)e.hp-=22*dt;if(this.player&&!this.player.dead&&dist(this.player,h)<h.r)this.player.hp-=5*dt;}for(const r of this.relics){r.life-=dt;if(this.player&&!this.player.dead&&dist(this.player,r)<36){r.life=0;this.chooseUpgrade(this.player,['damage','rate','multi','shield','aura','pet','crit','magnet'][Math.floor(rnd(0,8))]);}}for(const s of this.shrines){s.life-=dt;if(!s.used&&this.player&&!this.player.dead&&dist(this.player,s)<70){s.used=true;this.player.hp=Math.min(this.player.maxHp,this.player.hp+38);this.player.xp+=10;this.notice('SHRINE HEAL');}}if(this.player&&!this.player.dead){if(this.player.aura)for(const e of this.enemies)if(dist(this.player,e)<110+this.player.aura*35)e.hp-=this.player.damage*.45*dt;if((this.player.pet||0)>0){this.petCd=(this.petCd||0)-dt;if(this.petCd<=0){this.petCd=.55;const target=this.enemies.sort((a,b)=>dist(this.player,a)-dist(this.player,b))[0];if(target)for(let i=0;i<this.player.pet;i++){const a=Math.atan2(target.y-this.player.y,target.x-this.player.x)+(i-(this.player.pet-1)/2)*.22;this.projectiles.push({x:this.player.x,y:this.player.y,vx:Math.cos(a)*650,vy:Math.sin(a)*650,damage:this.player.damage*.7,owner:this.player,life:.9,pierce:0,crit:false});}}}}this.hazards=this.hazards.filter(h=>h.life>0);this.relics=this.relics.filter(r=>r.life>0);this.shrines=this.shrines.filter(s=>s.life>0);};
  SurvivorsGame.prototype.hud=function(){if(!this.player)return;$('survivorsHp').textContent=Math.max(0,Math.ceil(this.player.hp+(this.player.shield||0)));$('survivorsLevel').textContent=this.player.level;$('survivorsKos').textContent=this.player.kos;$('survivorsTime').textContent=timeText(this.elapsed);$('survivorsXp').style.width=clamp(this.player.xp/this.player.nextXp*100,0,100)+'%';if(!this.spectating)$('survivorsObjective').textContent='E NOVA '+Math.floor(this.ultCharge||0)+'% | COMBO x'+Math.max(1,this.combo||0)+' | BOSS '+Math.max(0,Math.ceil(this.bossAt-this.elapsed))+'s';};
  SurvivorsGame.prototype.render=function(){survRender.call(this);worldDraw(this,(c)=>{for(const h of this.hazards){c.globalAlpha=clamp(h.life/7,.12,.34);c.fillStyle='#ef4444';c.beginPath();c.arc(h.x,h.y,h.r,0,TAU);c.fill();c.globalAlpha=1;c.strokeStyle='#fb7185';c.stroke();}for(const r of this.relics){c.fillStyle='#fbbf24';c.beginPath();c.moveTo(r.x,r.y-18);c.lineTo(r.x+16,r.y);c.lineTo(r.x,r.y+18);c.lineTo(r.x-16,r.y);c.closePath();c.fill();}for(const s of this.shrines){c.strokeStyle=s.used?'#64748b':'#34d399';c.lineWidth=4;c.beginPath();c.arc(s.x,s.y,70,0,TAU);c.stroke();}for(const e of this.enemies)if(e.elite){c.strokeStyle='#fbbf24';c.lineWidth=4;c.beginPath();c.arc(e.x,e.y,e.r+12,0,TAU);c.stroke();}if(this.player&&!this.player.dead){if(this.player.aura){c.strokeStyle='#a78bfa88';c.lineWidth=4;c.beginPath();c.arc(this.player.x,this.player.y,110+this.player.aura*35,0,TAU);c.stroke();}for(let i=0;i<(this.player.pet||0);i++){const a=performance.now()/420+i*TAU/(this.player.pet||1);c.fillStyle='#67e8f9';c.beginPath();c.arc(this.player.x+Math.cos(a)*48,this.player.y+Math.sin(a)*48,8,0,TAU);c.fill();}}});if((this.ultCharge||0)>=100)screenPulse(this,'#fbbf24',.12);};
  SurvivorsGame.prototype.pack=function(){const s=survPack.call(this);s.v23={relics:this.relics,shrines:this.shrines,hazards:this.hazards,combo:this.combo,ultCharge:this.ultCharge};return s};
  SurvivorsGame.prototype.apply=function(s){survApply.call(this,s);if(s?.v23){this.relics=s.v23.relics||[];this.shrines=s.v23.shrines||[];this.hazards=s.v23.hazards||[];this.combo=s.v23.combo||0;this.ultCharge=s.v23.ultCharge||0;}};
}

installArcadeV23();

function installArcadeV24() {
  const v24Style = document.createElement('style');
  v24Style.textContent = `
  .expShell{border-color:#3b4652;background:#090d10;box-shadow:0 18px 46px #0008}
  .expShell:before{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,#ffffff08,#0000 22%,#00000018),radial-gradient(circle at 50% 18%,#ffffff09,#0000 34%);mix-blend-mode:screen}
  .expHud{z-index:3;max-width:min(760px,72%)}.expHud span,.expObjective,.kartPower,.defenseTip{background:#07090cee;border-color:#ffffff26;box-shadow:0 6px 22px #0008}
  .expObjective{max-width:min(430px,44%);white-space:normal;text-align:right}.expNotice{box-shadow:0 12px 34px #000c}
  .defenseTools{max-width:calc(100% - 190px);background:#07090cc8;border:1px solid #ffffff16;border-radius:12px;padding:7px;backdrop-filter:blur(8px)}
  .defenseTools .btn{padding:8px 10px;font-size:11px;border-radius:8px}.kartPower{bottom:18px}
  body.arcadePlaying .tab.expansionTab.active .expIntro,body.arcadePlaying .mp-panel{display:none!important}
  body.arcadePlaying .tab.expansionTab.active{padding-top:8px}
  body.arcadePlaying .tab.expansionTab.active .expShell{height:calc(100vh - 118px);min-height:700px;border-radius:14px}
  @media(max-width:760px){.defenseTools{max-width:calc(100% - 28px);bottom:50px}.expObjective{max-width:82%;text-align:left}.kartPower{bottom:52px}}
  `;
  document.head.appendChild(v24Style);

  const screenGrade = (game, tint = '#d8b46a', alpha = .10) => {
    const {w,h}=fit(game.canvas,game.ctx),c=game.ctx;
    const g=c.createRadialGradient(w*.5,h*.42,Math.min(w,h)*.12,w*.5,h*.45,Math.max(w,h)*.72);
    g.addColorStop(0,'transparent'); g.addColorStop(1,tint);
    c.save(); c.globalAlpha=alpha; c.fillStyle=g; c.fillRect(0,0,w,h);
    c.globalAlpha=.06; c.fillStyle='#fff'; for(let y=0;y<h;y+=4)c.fillRect(0,y,w,1);
    c.restore();
  };
  const world = (game, draw) => {
    const {w,h}=fit(game.canvas,game.ctx),c=game.ctx;
    c.save(); c.translate(w/2-(game.camera?.x||0),h/2-(game.camera?.y||0)); draw(c,w,h); c.restore();
  };
  const worldFixed = (game, draw) => {
    const {w,h}=fit(game.canvas,game.ctx),c=game.ctx,s=Math.min(w/game.W,h/game.H),ox=(w-game.W*s)/2,oy=(h-game.H*s)/2;
    c.save(); c.translate(ox,oy); c.scale(s,s); draw(c,w,h); c.restore();
  };
  const label = (c, text, x, y, color = '#f8fafc') => {
    c.save(); c.translate(x,y); c.fillStyle='#020617cc'; c.strokeStyle=color+'88'; c.lineWidth=2; c.beginPath(); c.roundRect(-86,-18,172,36,8); c.fill(); c.stroke();
    c.fillStyle=color; c.font='900 13px ui-monospace,monospace'; c.textAlign='center'; c.fillText(text,0,5); c.restore();
  };
  const paintPatch = (c,x,y,w,h,color='#ffffff',a=.08) => {
    c.save(); c.translate(x,y); c.rotate(((x*13+y*7)%19-9)/80); c.globalAlpha=a; c.fillStyle=color; c.beginPath();
    c.moveTo(-w*.45,-h*.22); c.quadraticCurveTo(-w*.2,-h*.58,w*.38,-h*.32); c.quadraticCurveTo(w*.58,h*.06,w*.22,h*.43); c.quadraticCurveTo(-w*.22,h*.58,-w*.5,h*.14); c.closePath(); c.fill(); c.restore();
  };
  const crate = (c,x,y,color='#b88a4a') => {
    c.save(); c.translate(x,y); c.fillStyle='#0005'; c.beginPath(); c.ellipse(8,18,36,11,0,0,TAU); c.fill(); c.fillStyle=color; c.beginPath(); c.roundRect(-25,-21,50,42,6); c.fill(); c.strokeStyle='#2a1c13'; c.lineWidth=4; c.stroke(); c.strokeStyle='#f3d29a77'; c.lineWidth=3; c.beginPath(); c.moveTo(-18,-13); c.lineTo(18,13); c.moveTo(18,-13); c.lineTo(-18,13); c.stroke(); c.restore();
  };
  const tree = (c,x,y,scale=1,color='#315b3c') => {
    c.save(); c.translate(x,y); c.scale(scale,scale); c.fillStyle='#0005'; c.beginPath(); c.ellipse(8,28,42,13,0,0,TAU); c.fill(); c.fillStyle='#4a2b18'; c.fillRect(-7,5,14,32); c.fillStyle=color; for(const p of [[0,-28,42],[-22,-4,31],[24,-1,34],[0,10,36]]){c.beginPath(); c.arc(p[0],p[1],p[2],0,TAU); c.fill();} c.fillStyle='#ffffff16'; c.beginPath(); c.arc(-14,-31,14,0,TAU); c.fill(); c.restore();
  };
  const lamp = (c,x,y,color='#fbbf24') => {
    c.save(); c.translate(x,y); const g=c.createRadialGradient(0,-25,4,0,-25,70); g.addColorStop(0,color+'88'); g.addColorStop(1,'transparent'); c.fillStyle=g; c.fillRect(-75,-95,150,140); c.strokeStyle='#1f2937'; c.lineWidth=6; c.beginPath(); c.moveTo(0,22); c.lineTo(0,-35); c.stroke(); c.fillStyle=color; c.beginPath(); c.arc(0,-40,10,0,TAU); c.fill(); c.restore();
  };

  const battleInit=BattleGame.prototype.init,battleAi=BattleGame.prototype.ai,battleRender=BattleGame.prototype.render;
  BattleGame.prototype.init=function(){battleInit.call(this);this.actors=this.actors.filter((a,i)=>a.player||i<17);this.pickups=this.pickups.filter((_,i)=>i%2===0);this.v24Dust=Array.from({length:38},(_,i)=>({x:(i*443)%this.W,y:(i*271)%this.H,r:1+(i%4)}));};
  BattleGame.prototype.ai=function(a,t){battleAi.call(this,a,t);if(a.goal?.enemy&&dist(a,a.goal.enemy)>720){a.goal={x:clamp(a.x+rnd(-320,320),100,this.W-100),y:clamp(a.y+rnd(-320,320),100,this.H-100),kind:'roam'};}if(a.goal?.kind==='fight'&&Math.random()<.08*(1-a.skill)){a.goal={x:clamp(a.x+rnd(-230,230),100,this.W-100),y:clamp(a.y+rnd(-230,230),100,this.H-100),kind:'reposition'};}};
  BattleGame.prototype.render=function(){battleRender.call(this);world(this,(c)=>{for(let i=0;i<28;i++)paintPatch(c,(i*313)%this.W,(i*197)%this.H,120+(i%4)*45,55+(i%3)*24,i%2?'#d6c6a8':'#67e8f9',i%2?.07:.045);for(const p of [[260,520],[530,1510],[820,360],[1110,1320],[1630,610],[2130,890],[2420,1450]])crate(c,p[0],p[1],p[2]||'#9c6840');for(const p of [[360,260],[2330,310],[390,1760],[2290,1710]])lamp(c,p[0],p[1],p[0]<500?'#67e8f9':'#fbbf24');for(const d of this.v24Dust||[]){c.globalAlpha=.18;c.fillStyle='#d6c6a8';c.beginPath();c.arc(d.x,d.y,d.r,0,TAU);c.fill();}c.globalAlpha=1;for(const o of this.obstacles){c.strokeStyle='#d6c6a866';c.lineWidth=2;c.strokeRect(o.x+7,o.y+7,o.w-14,o.h-14);}label(c,'DROPZONE V24',1350,880,'#fbbf24');label(c,'LOOT - COVER - ROTATE',420,520,'#67e8f9');});screenGrade(this,'#d8b46a',.09);};

  const kartInit=KartGame.prototype.init,kartAi=KartGame.prototype.aiInput,kartRender=KartGame.prototype.render,kartHud=KartGame.prototype.hud;
  KartGame.prototype.init=function(){kartInit.call(this);this.noCarCollision=true;this.coins=(this.coins||[]).filter((_,i)=>i%2===0);this.cones=(this.cones||[]).filter((_,i)=>i%3===0);this.speedGates=(this.speedGates||[]).slice(0,3);this.ramps=(this.ramps||[]).slice(0,3);this.actors.forEach((a,i)=>{const p=this.point(0,(i%3-1)*92);a.x=p.x+(Math.floor(i/3)-2)*18;a.y=p.y+Math.floor(i/3)*64;a.angle=p.a+Math.PI/2;a.speed=0;a.lane=clamp(a.lane||0,-82,82);});};
  KartGame.prototype.aiInput=function(c,dt){const input=kartAi.call(this,c,dt);const next=this.point(c.cp,c.lane||0);const tf=this.trackFactor(c);if(tf<.82)c.lane=clamp((c.lane||0)+35*dt,-86,86);if(tf>1.18)c.lane=clamp((c.lane||0)-35*dt,-86,86);const crowd=this.actors.filter(o=>o!==c&&!o.finished&&dist(c,o)<95).length;if(crowd>1){c.lane=clamp((c.lane||0)+rnd(-40,40),-86,86);input.steer*=.75;}if(dist(c,next)>520&&Math.random()<.015)c.mistake=Math.max(c.mistake||0,.25);return input;};
  KartGame.prototype.hud=function(){kartHud.call(this);if(this.player)$('kartObjective').textContent='NO COLLISION | CLEAN LINES | '+$('kartObjective').textContent;};
  KartGame.prototype.render=function(){kartRender.call(this);world(this,(c)=>{const now=performance.now()/1000;for(let i=0;i<24;i++)paintPatch(c,(i*211)%2700,(i*421)%2000,150+(i%5)*30,70+(i%4)*22,i%3?'#8bbf7b':'#fbbf24',i%3?.055:.04);for(const p of [[260,790,.82],[430,1190,.72],[2190,770,.85],[2440,1210,.78],[840,210,.7],[1880,1810,.74]])tree(c,p[0],p[1],p[2]);for(const p of [[650,640],[2050,640],[650,1360],[2050,1360]])lamp(c,p[0],p[1],'#fbbf24');for(let i=0;i<18;i++){const p=this.point((i*1.55+now*.7)%this.CP,(i%2?132:-132));c.fillStyle=i%2?'#f8fafc':'#e43d4f';c.beginPath();c.arc(p.x,p.y,13,0,TAU);c.fill();}for(const a of this.actors){if(a.speed>120){c.save();c.translate(a.x,a.y);c.rotate(a.angle);c.globalAlpha=clamp(Math.abs(a.speed)/620,.12,.34);c.strokeStyle=a.player?'#fbbf24':'#f8fafc';c.lineWidth=4;c.beginPath();c.moveTo(-42,-14);c.lineTo(-108,-28);c.moveTo(-42,14);c.lineTo(-108,28);c.stroke();c.restore();}}label(c,'NO BUMP RACING',1350,700,'#fbbf24');});screenGrade(this,'#e9c46a',.08);};

  const defInit=DefenseGame.prototype.init,defUpdate=DefenseGame.prototype.update,defRender=DefenseGame.prototype.render,defBuild=DefenseGame.prototype.build;
  DefenseGame.prototype.init=function(){defInit.call(this);this.maxTowers=14;this.aiBuild=10;this.decorDrones=Array.from({length:8},(_,i)=>({x:220+i*205,y:90+(i%2)*850,p:i/8}));};
  DefenseGame.prototype.build=function(o,free=false){if(this.towers.length>=this.maxTowers&&!free){this.notice('MAX TOWERS - UPGRADE INSTEAD');return false;}return defBuild.call(this,o,free);};
  DefenseGame.prototype.update=function(dt){defUpdate.call(this,dt);for(const e of this.enemies){if(e.type==='runner'&&this.enemies.filter(x=>dist(x,e)<45).length>3)e.speed*=.985;}};
  DefenseGame.prototype.render=function(){defRender.call(this);worldFixed(this,(c)=>{for(let i=0;i<18;i++)paintPatch(c,120+(i*223)%1680,120+(i*137)%860,110+(i%3)*30,62+(i%4)*18,i%2?'#34d399':'#fbbf24',.045);for(const p of [[160,980],[420,80],[850,980],[1290,80],[1600,990]])crate(c,p[0],p[1],'#5d6a61');for(const p of [[240,285],[1010,410],[1460,650]])lamp(c,p[0],p[1],'#67e8f9');for(const d of this.decorDrones||[]){const x=d.x+Math.sin(performance.now()/900+d.p*TAU)*35,y=d.y+Math.cos(performance.now()/1100+d.p*TAU)*22;c.fillStyle='#0f172a';c.beginPath();c.arc(x,y,18,0,TAU);c.fill();c.strokeStyle='#67e8f9aa';c.stroke();}label(c,'BUILD LESS - UPGRADE MORE',950,104,'#34d399');label(c,'CORE VAULT',1755,820,'#fbbf24');});screenGrade(this,'#67e8f9',.07);};

  const survInit=SurvivorsGame.prototype.init,survSpawn=SurvivorsGame.prototype.spawnEnemy,survUpdate=SurvivorsGame.prototype.update,survRender=SurvivorsGame.prototype.render;
  SurvivorsGame.prototype.init=function(){survInit.call(this);this.enemies=[];this.spawnCd=.6;this.v24Fog=Array.from({length:28},(_,i)=>({x:(i*277)%this.W,y:(i*401)%this.H,r:65+(i%5)*20}));};
  SurvivorsGame.prototype.spawnEnemy=function(force=''){if(this.enemies.length>120&&!force)return;survSpawn.call(this,force);const e=this.enemies[this.enemies.length-1];if(e){const near=this.enemies.filter(x=>x!==e&&dist(x,e)<75).length;if(near>2){e.x=clamp(e.x+rnd(-150,150),40,this.W-40);e.y=clamp(e.y+rnd(-150,150),40,this.H-40);}}};
  SurvivorsGame.prototype.update=function(dt){survUpdate.call(this,dt);for(const e of this.enemies){const crowd=this.enemies.filter(x=>x!==e&&dist(x,e)<34).length;if(crowd>2){e.x+=rnd(-1,1)*18*dt;e.y+=rnd(-1,1)*18*dt;}}};
  SurvivorsGame.prototype.render=function(){survRender.call(this);world(this,(c)=>{for(let i=0;i<26;i++)paintPatch(c,(i*337)%this.W,(i*229)%this.H,130+(i%4)*36,65+(i%3)*21,i%2?'#a78bfa':'#d8b46a',.055);for(const p of [[260,420,.65],[510,1500,.75],[2030,360,.7],[2200,1540,.8],[1260,230,.62]])tree(c,p[0],p[1],p[2],'#2a3e55');for(const p of [[720,760],[1770,1090],[1240,1510]])lamp(c,p[0],p[1],'#a78bfa');for(const f of this.v24Fog||[]){c.globalAlpha=.08;c.fillStyle='#a78bfa';c.beginPath();c.arc(f.x,f.y,f.r+Math.sin(performance.now()/900+f.x)*8,0,TAU);c.fill();}c.globalAlpha=1;label(c,'SURVIVE THE ARCHIVE',1250,730,'#a78bfa');});screenGrade(this,'#a78bfa',.08);};
}

installArcadeV24();

window.pearlV22 = window.pearlV22 || {xp(n){try{const p=JSON.parse(localStorage.getItem('v20profile')||'{}');p.xp=(p.xp||0)+n;localStorage.setItem('v20profile',JSON.stringify(p));}catch(_){}}};
window.arcadeGames = {battle:new BattleGame(), kart:new KartGame(), defense:new DefenseGame(), survivors:new SurvivorsGame()};
})();
