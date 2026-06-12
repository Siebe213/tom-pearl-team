'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const publicPath = path.join(root, 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

function replaceOnce(search, replacement, label) {
  if (!html.includes(search)) {
    throw new Error(`Could not find ${label} in index.html`);
  }
  html = html.replace(search, replacement);
}

if (!html.includes('window.PEARL_PROFILE=')) {
  replaceOnce(
    '</style>',
    '.serverStatus{justify-content:center;margin:0 0 10px;background:rgba(0,0,0,.38)}.serverStatus.online{color:#86efac;border-color:rgba(16,185,129,.45);box-shadow:0 0 20px rgba(16,185,129,.12)}.serverStatus.connecting{color:#fde68a;border-color:rgba(245,158,11,.4)}.serverStatus.offline{color:#fca5a5;border-color:rgba(239,68,68,.42)}.onlineSummary{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px}.onlineSummary .pill{font-size:12px}\n</style>',
    'style closing tag'
  );
  replaceOnce(
    '<div class="card" style="padding:14px 16px">\n    <div class="row">',
    '<div class="card" style="padding:14px 16px">\n    <div id="serverStatus" class="pill serverStatus connecting">Connecting to public arena...</div>\n    <div class="row">',
    'game controls card'
  );
  replaceOnce('>Spawn / Restart</button>', '>Join Public Arena</button>', 'spawn button');
  replaceOnce(
    '<p class="muted small" style="margin:0">Controls: mouse moves, Space split, W eject mass, Q pulls cells together after merge timer. Scroll to zoom.</p>',
    '<div class="onlineSummary"><span class="pill">One public lobby</span><span class="pill">Real players online: <b id="onlineCount">0</b></span><span class="muted small">Mouse moves, Space splits, W ejects mass, Q pulls ready cells together. Bots keep the arena populated.</span></div>',
    'game controls description'
  );
  replaceOnce(
    '<h2>Pearl.io Arena</h2><p class="muted">Eat food, consume smaller cells, dodge viruses, steal power-ups, split to attack, survive the chaos.</p><div class="speedBalanceNote">V8.7: skins now have balanced abilities, and virus-split cells cannot instantly merge back.</div><button class="btn primary" id="overlaySpawn">Spawn now</button>',
    '<h2>Pearl.io Public Arena</h2><p class="muted">Everyone joins the same persistent world with real players and bots.</p><div class="speedBalanceNote">The server owns movement, food, powers, viruses and combat so every player sees the same arena.</div><button class="btn primary" id="overlaySpawn">Join public arena</button>',
    'spawn overlay'
  );
  replaceOnce(
    '// ================= GAME =================',
    '// ================= GAME =================\nif(false){',
    'local game marker'
  );
  replaceOnce(
    '// ================ CASINO ================',
    `}\n\nwindow.PEARL_SKINS=SKINS.map(s=>({name:s.name,color:s.color,icon:s.icon,img:s.img||''}));\nwindow.PEARL_PROFILE={\n  getSkin(){return state.skin},\n  runStarted(){state.stats.runs++;save();renderStats()},\n  award(rewards){\n    state.stats.food+=Math.max(0,Math.floor(rewards.food||0));\n    state.stats.kills+=Math.max(0,Math.floor(rewards.kills||0));\n    const coins=Math.max(0,Math.floor(rewards.coins||0));\n    if(coins)addCoins(coins);else{save();renderStats()}\n  },\n  observeMass(value){\n    if(value>state.stats.best){state.stats.best=value;save();renderStats()}\n  }\n};\n\n// ================ CASINO ================`,
    'casino marker'
  );
  replaceOnce(
    '})();\n</script>\n\n<script>\n(function(){\n\'use strict\';',
    '})();\n</script>\n\n<script src="config.js?v=1"></script>\n<script src="online-client.js?v=1"></script>\n\n<script>\n(function(){\n\'use strict\';',
    'main script ending'
  );
}

fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.writeFileSync(indexPath, html);
fs.writeFileSync(publicPath, html);
console.log('Pearl.io index patched for the shared public arena.');
