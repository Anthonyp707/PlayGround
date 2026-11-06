/* ============================================================
   HEARTH & HOLLOW — a paper-town life sim
   Three.js diorama + Sims-like conversation + Paper Mario combat
   ============================================================ */
'use strict';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const S = 28; // map units per world unit
const MAPW = 1100, MAPH = 700;
const toWorld = (x, y) => ({ x: (x - 550) / S, z: (y - 350) / S });
const toMap = (x, z) => ({ x: x * S + 550, y: z * S + 350 });

/* ---------------- STATE ---------------- */
const state = {
  started: false,
  x: 612, y: 332, h: 0, vy: 0, onRoof: null,
  appearance: { name: 'Alder Rowan', sex: 'woman', build: 'average', skin: '#e5b58e', hair: 'short', hairColor: '#5b3a24', beard: 'none', outfit: '#b98d4f', scars: 0 },
  coins: 30, day: 1, hour: 8, minute: 0,
  health: 100, maxHealth: 100, fp: 10, maxFp: 10,
  hunger: 82, energy: 88,
  honor: 0, rep: 0, wanted: 0, level: 1, xp: 0,
  items: { Bread: 3, Herbs: 0, Wood: 0, Stone: 0, Turnip: 0 },
  quests: { meet: false, forage: false, work: false },
  relationships: {},
  homeLevel: 0, job: 'Newcomer · Meadow plot', pet: false, petLevel: 1, petHappiness: 70,
  spouse: null, children: 0, business: false, stall: false, clerk: false, farmhand: false,
  attire: 'Traveler’s clothes', weapon: 0, scars: 0,
  plot: 'meadow',
  camYaw: -Math.PI / 2 + 0.22, camPitch: 0.2, camDist: 6.8, facing: Math.PI / 2,
  nearby: null, dialogOpen: false, parkour: null, currentNpc: null, fallStart: 0,
  log: [], lastSave: 0, noticed: {},
};
const WEAPONS = [
  { name: 'Wooden Sword', bonus: 1, cost: 0 },
  { name: 'Iron Sword', bonus: 4, cost: 70 },
  { name: 'Moonsteel Blade', bonus: 9, cost: 180 },
];
const OUTFITS = [
  { name: 'Traveler’s clothes', color: '#b98d4f', rep: 0, def: 0 },
  { name: 'Fine town coat', color: '#8e6d3c', rep: 2, def: 1 },
  { name: 'Thug’s leathers', color: '#4c4038', rep: -1, def: 1 },
  { name: 'Herbalist green', color: '#6f8a54', rep: 1, def: 0 },
  { name: 'Innkeeper crimson', color: '#8e4f4a', rep: 1, def: 0 },
];

const PEOPLE = [
  { id: 'mara', name: 'Mara Vell', role: 'Baker', x: 400, y: 332, home: [400, 342], route: [[400, 332], [430, 320], [444, 352], [412, 366]], palette: { skin: '#e8b98f', hair: 'braids', hairColor: '#6b3f2a', outfit: '#a95e52', accent: '#e8c77a' }, personality: 'warm', greeting: 'A kind face makes the morning lighter. I’m Mara — if you have a turnip, I’ll trade fresh bread for it.', personal: 'Mara wipes flour from her hands and tells you about her grandmother’s honey loaf — the one she still can’t get quite right.' },
  { id: 'orin', name: 'Orin Pike', role: 'Town watch', x: 665, y: 412, home: [668, 420], route: [[665, 412], [690, 400], [682, 442], [646, 428]], palette: { skin: '#c9926c', hair: 'short', hairColor: '#2f2a25', outfit: '#4d6878', accent: '#aebfcc' }, personality: 'stern', greeting: 'Keep the peace and we’ll get along. I’ve got an eye on these streets, newcomer.', personal: 'Orin admits the watch is short-handed and the barrow road has gone quiet in a way he doesn’t like.' },
  { id: 'tamsin', name: 'Tamsin Reed', role: 'Herbalist', x: 742, y: 268, home: [758, 278], route: [[742, 268], [770, 278], [800, 290], [762, 306]], palette: { skin: '#efc9a8', hair: 'long', hairColor: '#9b5c35', outfit: '#63804f', accent: '#c7dd94' }, personality: 'curious', greeting: 'The nettles by the old well are good for more than stings. You look like someone who notices things.', personal: 'Tamsin shows you a pressed foxglove and confides that the old stones bloom out of season.' },
  { id: 'bryn', name: 'Bryn Ashford', role: 'Stablehand', x: 330, y: 420, home: [336, 436], route: [[330, 420], [352, 410], [358, 442], [322, 456]], palette: { skin: '#d6a077', hair: 'short', hairColor: '#6d4a2c', outfit: '#8a6a3f', accent: '#d4b87e', beard: 'full' }, personality: 'easygoing', greeting: 'A long day’s work is easier with a good dog at your heel. I can introduce you to one when you’re ready.', personal: 'Bryn scratches a horse’s ear and says animals know honest people before people do.' },
  { id: 'lute', name: 'Lute Fen', role: 'Cardsharp', x: 735, y: 420, home: [738, 434], route: [[735, 420], [760, 406], [758, 446], [728, 452]], palette: { skin: '#e1b58f', hair: 'long', hairColor: '#3b2930', outfit: '#7b4a66', accent: '#e0a7c5' }, personality: 'playful', greeting: 'Fancy a friendly game? Friendly meaning the stakes are small and the lessons are expensive.', personal: 'Lute shuffles the deck without looking and tells you luck is just nerve wearing a nice coat.' },
  { id: 'elsa', name: 'Elsa Vale', role: 'Innkeeper', x: 560, y: 548, home: [566, 552], route: [[560, 548], [592, 556], [536, 560], [570, 532]], palette: { skin: '#f0c4a2', hair: 'braids', hairColor: '#a5533b', outfit: '#a37544', accent: '#e9c880' }, personality: 'kind', greeting: 'The Lantern’s warm, even on a cold night. Gossip costs a smile — or a copper, if you’re in a hurry.', personal: 'Elsa leans on the bar and whispers that half the town’s secrets are told to her by people who swear they never talk.' },
];

const BUILDINGS = [
  { id: 'home', name: 'Your Old Cottage', x: 70, y: 110, w: 190, h: 150, icon: '⌂', color: '#8a6848', roof: '#5a4636', wallH: 2.9, detail: 'A crooked cottage with a stubborn door and a roof that remembers better days.' },
  { id: 'bakery', name: 'Mara’s Oven', x: 330, y: 92, w: 155, h: 130, icon: '♨', color: '#a97154', roof: '#6d493a', wallH: 3.2, detail: 'Warm bread and warmer gossip. Mara is looking for an extra pair of hands.' },
  { id: 'inn', name: 'The Lantern Inn', x: 480, y: 390, w: 160, h: 130, icon: '✦', color: '#876548', roof: '#59442f', wallH: 3.3, detail: 'A lively inn with card tables, cider, and rumors in every corner.' },
  { id: 'shop', name: 'Market & Guildhall', x: 685, y: 100, w: 190, h: 155, icon: '⚒', color: '#8c8564', roof: '#5c5a44', wallH: 3.3, detail: 'Buy supplies, browse clothing, and ask about honest work.' },
  { id: 'herbalist', name: 'Foxglove Remedies', x: 820, y: 315, w: 155, h: 135, icon: '❀', color: '#73835a', roof: '#4d5c3d', wallH: 3.1, detail: 'Tamsin’s shop smells of mint, smoke, and secrets.' },
  { id: 'stable', name: 'Ashford Stables', x: 155, y: 365, w: 150, h: 120, icon: '♞', color: '#796647', roof: '#514334', wallH: 3.0, detail: 'A quiet stable on the edge of town. Work and a companion may be found here.' },
];
const FEATURES = [
  { id: 'well', name: 'Wishing Well', x: 612, y: 258, range: 60 },
  { id: 'stones', name: 'Old Standing Stones', x: 1002, y: 596, range: 72 },
];

const MOB_DEFS = [
  { id: 'hound1', type: 'hound', name: 'Bog Hound', x: 1000, y: 594, group: 2, baseHp: 22, baseAtk: 4, coins: 16, xp: 3, scale: 1 },
  { id: 'bandit1', type: 'bandit', name: 'Roadside Bandit', x: 300, y: 612, group: 1, baseHp: 30, baseAtk: 5, coins: 24, xp: 4, scale: 1 },
  { id: 'goblin1', type: 'goblin', name: 'Goblin Scavenger', x: 1010, y: 168, group: 3, baseHp: 16, baseAtk: 3, coins: 11, xp: 2, scale: 1 },
];
let mobs = [];

const PARKOUR = [
  { id: 'fence', label: 'Vault the fence', icon: '⤴', x: 246, y: 562, radius: 48, type: 'vault', to: { x: 306, y: 562 }, h: 0, arc: 1.1 },
  { id: 'crates', label: 'Climb the crates', icon: '↥', x: 700, y: 292, radius: 54, type: 'climb', to: { x: 735, y: 236 }, h: 3.56, arc: 2.2, roof: { x1: 692, y1: 108, x2: 868, y2: 248, h: 3.56 } },
  { id: 'window', label: 'Climb the inn window', icon: '↥', x: 472, y: 452, radius: 52, type: 'window', to: { x: 510, y: 452 }, h: 3.46, arc: 2.1, roof: { x1: 486, y1: 396, x2: 632, y2: 514, h: 3.46 } },
  { id: 'ditch', label: 'Leap the ditch', icon: '⤳', x: 872, y: 352, radius: 52, type: 'leap', to: { x: 940, y: 352 }, h: 0, arc: 1.4 },
];

const PICKUPS = [
  { id: 'herb1', kind: 'herb', name: 'Wild herbs', x: 318, y: 600 },
  { id: 'herb2', kind: 'herb', name: 'Wild herbs', x: 918, y: 504 },
  { id: 'herb3', kind: 'herb', name: 'Wild herbs', x: 620, y: 640 },
  { id: 'coin1', kind: 'coin', name: 'Loose coins', x: 430, y: 600 },
];

/* ---------------- UTIL ---------------- */
let toastTimer;
function toast(text) {
  const el = $('toast');
  el.hidden = false;
  el.textContent = text;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = 'toastIn .25s ease both';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3000);
}
function logMsg(text) {
  state.log.unshift(text);
  state.log = state.log.slice(0, 40);
}
function addItem(name, n) { state.items[name] = (state.items[name] || 0) + n; }
function itemCount(name) { return state.items[name] || 0; }
function gainXP(n) {
  state.xp += n;
  let leveled = false;
  while (state.xp >= state.level * 9) {
    state.xp -= state.level * 9;
    state.level++;
    state.maxHealth += 10;
    state.health = Math.min(state.maxHealth, state.health + 14);
    state.maxFp += 2;
    state.fp = state.maxFp;
    leveled = true;
  }
  if (leveled) { toast(`A little wiser — level ${state.level}.`); refreshSigns(); }
}
function healthPct() { return clamp(state.health / state.maxHealth, 0, 1); }
function dateText() {
  return `Day ${state.day} · ${String(Math.floor(state.hour)).padStart(2, '0')}:${String(Math.floor(state.minute)).padStart(2, '0')}`;
}
function saveGame() {
  try {
    const data = { ...state, dialogOpen: false, nearby: null, currentNpc: null, parkour: null, started: true };
    localStorage.setItem('hearthHollow3d', JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}
function loadGame() {
  try {
    const raw = localStorage.getItem('hearthHollow3d');
    if (!raw) return false;
    const d = JSON.parse(raw);
    Object.assign(state, d, { dialogOpen: false, nearby: null, currentNpc: null, parkour: null, started: true });
    state.appearance = { ...state.appearance, ...(d.appearance || {}) };
    state.items = { ...state.items, ...(d.items || {}) };
    state.relationships = { ...(d.relationships || {}) };
    state.quests = { ...state.quests, ...(d.quests || {}) };
    rebuildPlayer();
    placePlayer();
    $('startScreen').hidden = true;
    toast('Welcome back to Brackenridge.');
    logMsg('You return to your life in Brackenridge.');
    updateHUD(true);
    return true;
  } catch (e) { return false; }
}
function setupContinue() {
  try {
    const raw = localStorage.getItem('hearthHollow3d');
    if (!raw) return;
    const d = JSON.parse(raw);
    const b = $('continueBtn');
    b.hidden = false;
    b.textContent = `Continue Day ${d.day || 1} · ${d.coins || 0}◈`;
    b.onclick = loadGame;
  } catch (e) {}
}

/* ---------------- RENDERER / SCENE ---------------- */
let renderer, scene, camera, worldGroup, combatStage, sunLight, hemiLight, fillLight;
let waterTex = null, windowMats = [], colliders = [], cameraColliders = [], buildingMeshes = {};
const stallLabels = [];
const tmpVec = new THREE.Vector3();
let playerModel = null, playerParts = null;
const npcModels = {}, mobModels = {}, pickupMeshes = {}, featureMeshes = {};
let showcase = true;
let clockTime = 0;

try {
  renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
} catch (err) {
  document.body.innerHTML = '<div style="padding:40px;color:#eee;font-family:sans-serif">WebGL could not start on this device. Please try a browser with hardware acceleration enabled.</div>';
  throw err;
}

scene = new THREE.Scene();
scene.background = new THREE.Color('#a6c7b7');
scene.fog = new THREE.Fog('#a6c7b7', 22, 48);
camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 130);
camera.position.set(0, 6, 10);

worldGroup = new THREE.Group();
scene.add(worldGroup);
combatStage = new THREE.Group();
combatStage.visible = false;
scene.add(combatStage);

hemiLight = new THREE.HemisphereLight('#f3f2da', '#516245', 1.0);
scene.add(hemiLight);
sunLight = new THREE.DirectionalLight('#ffe6b3', 2.1);
sunLight.position.set(8, 16, 9);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(window.innerWidth < 760 ? 1024 : 2048, window.innerWidth < 760 ? 1024 : 2048);
sunLight.shadow.camera.left = -22;
sunLight.shadow.camera.right = 22;
sunLight.shadow.camera.top = 18;
sunLight.shadow.camera.bottom = -16;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 55;
sunLight.shadow.bias = -0.0006;
scene.add(sunLight);
fillLight = new THREE.DirectionalLight('#9ebfda', 0.45);
fillLight.position.set(-10, 7, -8);
scene.add(fillLight);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.82 ? 56 : 42;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------------- TEXTURES ---------------- */
function makeTex(size, draw, rx = 1, ry = 1) {
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  t.anisotropy = 4;
  t.encoding = THREE.sRGBEncoding;
  return t;
}
function noise(g, s, amount, colors, alpha = 0.25) {
  for (let i = 0; i < amount; i++) {
    g.fillStyle = colors[(Math.random() * colors.length) | 0];
    g.globalAlpha = alpha * (0.4 + Math.random());
    const r = 0.5 + Math.random() * 2.4;
    g.beginPath(); g.arc(Math.random() * s, Math.random() * s, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}
const grassTex = makeTex(256, (g, s) => {
  g.fillStyle = '#617e4d'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = ['#6f8b55', '#577345', '#7b965f', '#4f6b3f'][i % 4];
    g.globalAlpha = .5;
    g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 6 + Math.random() * 20, 3 + Math.random() * 10, Math.random() * 3, 0, 7); g.fill();
  }
  g.globalAlpha = .8;
  for (let i = 0; i < 280; i++) {
    g.strokeStyle = ['#87a268', '#4d6a3f', '#9aae72'][i % 3];
    g.lineWidth = 1;
    const x = Math.random() * s, y = Math.random() * s;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - .5) * 3, y - 3 - Math.random() * 4); g.stroke();
  }
  g.globalAlpha = 1;
}, 15, 11);
const cobbleTex = makeTex(256, (g, s) => {
  g.fillStyle = '#5e5a4e'; g.fillRect(0, 0, s, s);
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const x = col * 38 + (row % 2 ? 19 : 0) + (Math.random() * 4 - 2);
      const y = row * 37 + (Math.random() * 4 - 2);
      g.fillStyle = ['#8b8168', '#958a70', '#7c7461', '#a09578', '#857c66'][(row + col) % 5];
      g.beginPath(); g.roundRect(x, y, 32 + Math.random() * 4, 28 + Math.random() * 4, 8); g.fill();
      g.strokeStyle = 'rgba(55,52,44,.35)'; g.lineWidth = 1.4; g.stroke();
    }
  }
  noise(g, s, 90, ['#b1a482', '#4b473d'], .18);
}, 8, 2);
const dirtTex = makeTex(256, (g, s) => {
  g.fillStyle = '#7c684b'; g.fillRect(0, 0, s, s);
  noise(g, s, 240, ['#8f7a59', '#67563f', '#a08a65', '#5d4d38'], .3);
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = 'rgba(74,60,44,.35)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(Math.random() * s, Math.random() * s); g.lineTo(Math.random() * s, Math.random() * s); g.stroke();
  }
}, 5, 5);
const waterTexture = makeTex(256, (g, s) => {
  g.fillStyle = '#37746d'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 38; i++) {
    g.strokeStyle = ['rgba(150,214,197,.35)', 'rgba(52,104,102,.4)', 'rgba(194,232,210,.25)'][i % 3];
    g.lineWidth = 1 + Math.random() * 2;
    g.beginPath(); g.ellipse(Math.random() * s, Math.random() * s, 8 + Math.random() * 28, 3 + Math.random() * 8, Math.random() * 3, 0, 7); g.stroke();
  }
}, 2, 2);
waterTex = waterTexture;
function roofTexture(color) {
  const base = new THREE.Color(color);
  return makeTex(256, (g, s) => {
    g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * 33 + (row % 2 ? 16 : 0), y = row * 33;
        g.fillStyle = '#' + base.clone().offsetHSL(0, 0, (Math.random() - .5) * .09).getHexString();
        g.beginPath(); g.roundRect(x, y, 30, 26, 4); g.fill();
        g.strokeStyle = 'rgba(25,20,16,.28)'; g.lineWidth = 1.2; g.stroke();
      }
    }
    noise(g, s, 70, ['#2e2823', '#c7bda1'], .12);
  }, 3, 2);
}
function wallTexture(color) {
  const base = new THREE.Color(color);
  return makeTex(256, (g, s) => {
    g.fillStyle = '#' + base.getHexString(); g.fillRect(0, 0, s, s);
    noise(g, s, 160, ['#e6ddc7', '#4b4134', '#a89a7e'], .16);
    g.strokeStyle = 'rgba(48,38,28,.28)'; g.lineWidth = 3;
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(0, 40 + i * 58); g.lineTo(s, 40 + i * 58); g.stroke(); }
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(30 + i * 52, 0); g.lineTo(30 + i * 52, s); g.stroke(); }
    g.fillStyle = 'rgba(255,245,215,.09)'; g.fillRect(0, 0, s, 14);
  }, 2, 2);
}
const woodTex = makeTex(256, (g, s) => {
  g.fillStyle = '#6e533a'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#7b5f43' : '#644b34'; g.fillRect(0, i * 32, s, 30);
    g.strokeStyle = 'rgba(35,25,18,.4)'; g.beginPath(); g.moveTo(0, i * 32); g.lineTo(s, i * 32); g.stroke();
  }
  noise(g, s, 100, ['#8f7251', '#4a3625'], .18);
}, 2, 2);
const stripeTex = makeTex(128, (g, s) => {
  g.fillStyle = '#c7a96b'; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7d4c42' : '#d9be82'; g.fillRect(i * 16, 0, 16, s); }
}, 2, 1);
function signTexture(text, accent = '#e7c477') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(24,31,25,.95)'; g.beginPath(); g.roundRect(4, 4, 504, 120, 16); g.fill();
  g.strokeStyle = accent + '99'; g.lineWidth = 4; g.stroke();
  g.fillStyle = accent; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 66, 460);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function labelTexture(text, color = '#f0e6c6', bg = 'rgba(14,23,20,.82)') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.beginPath(); g.roundRect(6, 20, 500, 88, 30); g.fill();
  g.strokeStyle = 'rgba(224,205,155,.35)'; g.lineWidth = 3; g.stroke();
  g.fillStyle = color; g.font = 'bold 46px "DM Sans", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 256, 65, 460);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}
function radialTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
}

/* ---------------- ENVIRONMENT ---------------- */
function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function addGround() {
  const grassMat = new THREE.MeshStandardMaterial({ map: grassTex, color: '#d3ddc2', roughness: 1, metalness: 0 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(42, 1.4, 27), new THREE.MeshStandardMaterial({ color: '#55452f', roughness: 1 }));
  ground.position.y = -0.7; ground.receiveShadow = true; worldGroup.add(ground);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(42, 27), grassMat);
  top.rotation.x = -Math.PI / 2; top.position.y = 0.02; top.receiveShadow = true; worldGroup.add(top);
  // a paper-diorama rim
  const rimMat = new THREE.MeshStandardMaterial({ color: '#6b5639', roughness: 1, flatShading: true });
  for (let i = 0; i < 28; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(.5, 1.2), 0), rimMat);
    const a = i / 28 * Math.PI * 2;
    rock.position.set(Math.cos(a) * rnd(19, 21), rnd(-1.5, -0.3), Math.sin(a) * rnd(12, 14));
    rock.scale.y = rnd(.6, 1.4); rock.castShadow = true; worldGroup.add(rock);
  }
  // main road
  const roadMat = new THREE.MeshStandardMaterial({ map: cobbleTex, color: '#ded6bd', roughness: 1 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(41, 5.6), roadMat);
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.045, 1.35); road.receiveShadow = true; worldGroup.add(road);
  const roadEdge = new THREE.Mesh(new THREE.PlaneGeometry(41, 6.2), new THREE.MeshStandardMaterial({ color: '#a39776', roughness: 1 }));
  roadEdge.rotation.x = -Math.PI / 2; roadEdge.position.set(0, 0.035, 1.35); worldGroup.add(roadEdge);
  // paths to bakery and market
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 11), roadMat);
  p1.rotation.x = -Math.PI / 2; p1.position.set(-5.7, 0.05, -2.6); p1.receiveShadow = true; worldGroup.add(p1);
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 10), roadMat);
  p2.rotation.x = -Math.PI / 2; p2.position.set(6.6, 0.05, -2.4); p2.receiveShadow = true; worldGroup.add(p2);
  // dirt lane to the homestead
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(7, 2.4), new THREE.MeshStandardMaterial({ map: dirtTex, color: '#cbb895', roughness: 1 }));
  lane.rotation.x = -Math.PI / 2; lane.position.set(-12.5, 0.048, 4.5); lane.rotation.z = 0.14; lane.receiveShadow = true; worldGroup.add(lane);
  // ditch (parkour)
  const ditch = new THREE.Mesh(new THREE.BoxGeometry(2.2, .55, 1.6), new THREE.MeshStandardMaterial({ color: '#23201a', roughness: 1 }));
  ditch.position.set((900 - 550) / S, -0.22, (355 - 350) / S); worldGroup.add(ditch);
  const plankMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#c1a471', roughness: 1 });
  for (let i = 0; i < 3; i++) {
    const plank = box(0.35, .12, 1.8, plankMat);
    plank.position.set((872 + i * 1.2 - 550) / S, .08, (355 - 350) / S);
    plank.rotation.y = rnd(-.2, .2); worldGroup.add(plank);
  }
}
function addSkyAndHills() {
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,244,196,1)', 'rgba(255,218,130,0)'), transparent: true, depthWrite: false }));
  sun.scale.set(9, 9, 1); sun.position.set(18, 17, -16); worldGroup.add(sun);
  const hillMat1 = new THREE.MeshStandardMaterial({ color: '#6d8f7e', roughness: 1, flatShading: true });
  const hillMat2 = new THREE.MeshStandardMaterial({ color: '#547365', roughness: 1, flatShading: true });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    const h = rnd(2.5, 6.5);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rnd(2.5, 5.5), h, 5), i % 2 ? hillMat1 : hillMat2);
    hill.position.set(Math.cos(a) * rnd(24, 31), -1.2 + h * .4, Math.sin(a) * rnd(20, 25));
    hill.rotation.y = rnd(0, 3); hill.receiveShadow = true; worldGroup.add(hill);
  }
  const cloudMat = new THREE.SpriteMaterial({ map: radialTexture('rgba(255,255,255,.85)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false, opacity: .45 });
  for (let i = 0; i < 6; i++) {
    const cl = new THREE.Sprite(cloudMat);
    cl.scale.set(rnd(6, 10), rnd(2, 3.5), 1);
    cl.position.set(rnd(-22, 22), rnd(9, 13), rnd(-18, -8));
    worldGroup.add(cl);
  }
}
function addFeatureModels() {
  // well
  const w = toWorld(612, 258);
  const well = new THREE.Group(); well.position.set(w.x, 0, w.z);
  const stoneMat = new THREE.MeshStandardMaterial({ color: '#898778', roughness: 1 });
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, .55, 12, 1, true), stoneMat);
  ring.position.y = .28; ring.castShadow = true; ring.receiveShadow = true; well.add(ring);
  const water = new THREE.Mesh(new THREE.CircleGeometry(.82, 20), new THREE.MeshStandardMaterial({ color: '#2b5b5a', roughness: .2, metalness: .1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = .4; well.add(water);
  const postMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#b0966d', roughness: 1 });
  for (const x of [-.78, .78]) {
    const post = box(.14, 1.95, .14, postMat); post.position.set(x, .98, 0); well.add(post);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.12, .62, 4), new THREE.MeshStandardMaterial({ color: '#5f4a35', roughness: 1, flatShading: true }));
  roof.position.y = 2.16; roof.rotation.y = Math.PI / 4; roof.castShadow = true; well.add(roof);
  const bar = box(1.82, .1, .1, postMat); bar.position.y = 1.62; well.add(bar);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(.17, .13, .24, 10), new THREE.MeshStandardMaterial({ color: '#6d5338' }));
  bucket.position.set(.24, 1.28, 0); well.add(bucket);
  worldGroup.add(well); featureMeshes.well = well;

  // pond
  const p = toWorld(872, 612);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(2.5, 28), new THREE.MeshStandardMaterial({ map: waterTexture, color: '#b8d9c8', roughness: .18, metalness: .05 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(p.x, .055, p.z); worldGroup.add(pond);
  const reedMat = new THREE.MeshStandardMaterial({ color: '#6b8a4f', roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(2.2, 2.8);
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(.015, .025, rnd(.4, .9), 4), reedMat);
    reed.position.set(p.x + Math.cos(a) * r, .3, p.z + Math.sin(a) * r);
    reed.rotation.z = rnd(-.2, .2); worldGroup.add(reed);
  }
  // standing stones
  const st = toWorld(1002, 596);
  const stoneCircle = new THREE.Group(); stoneCircle.position.set(st.x, 0, st.z);
  for (let i = 0; i < 3; i++) {
    const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(.45, .62), 0), new THREE.MeshStandardMaterial({ color: ['#7d8271', '#929682', '#6d7464'][i], roughness: 1, flatShading: true }));
    stone.scale.y = rnd(1.8, 2.6); stone.position.set((i - 1) * 1.1, 1.0, 0); stone.rotation.z = rnd(-.1, .1); stone.castShadow = true; stoneCircle.add(stone);
  }
  const rune = new THREE.Mesh(new THREE.RingGeometry(.8, .95, 24), new THREE.MeshBasicMaterial({ color: '#e4cd82', transparent: true, opacity: .28, side: THREE.DoubleSide }));
  rune.rotation.x = -Math.PI / 2; rune.position.y = .06; stoneCircle.add(rune); featureMeshes.stones = stoneCircle;
  worldGroup.add(stoneCircle);

  // market stalls
  const stallMat = new THREE.MeshStandardMaterial({ map: stripeTex, color: '#e0c28a', roughness: 1, side: THREE.DoubleSide });
  const counterMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#c0a279', roughness: 1 });
  [['Bread', 694], ['Cloth', 734], ['Goods', 774]].forEach(([name, mx], i) => {
    const p = toWorld(mx, 300);
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    const counter = box(1.35, .8, .65, counterMat); counter.position.y = .4; g.add(counter);
    const canopy = box(1.65, .08, 1.05, stallMat); canopy.position.set(0, 1.78, .05); canopy.rotation.x = .13; canopy.castShadow = true; g.add(canopy);
    for (const x of [-.72, .72]) for (const z of [-.38, .44]) { const post = box(.07, 1.78, .07, counterMat); post.position.set(x, .89, z); g.add(post); }
    const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(name, '#f3e5bd'), transparent: true, depthWrite: false }));
    lbl.scale.set(1.05, .26, 1); lbl.position.set(0, 2.08, 0); g.add(lbl);
    stallLabels.push(lbl);
    worldGroup.add(g);
  });

  // plot, fences, crops, scarecrow
  const plot = new THREE.Group();
  const plotX = (-17).toFixed(0), plotZ = (7.5).toFixed(0);
  plot.position.set((144 - 550) / S, 0, (575 - 350) / S);
  const soil = box(7.4, .12, 4.2, new THREE.MeshStandardMaterial({ map: dirtTex, color: '#c5b18a', roughness: 1 }));
  soil.position.y = .05; plot.add(soil);
  const cropGroup = new THREE.Group(); plot.add(cropGroup); featureMeshes.crops = cropGroup;
  const cropMat = new THREE.MeshStandardMaterial({ color: '#6f9b50', roughness: 1 });
  for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
    const plant = new THREE.Mesh(new THREE.ConeGeometry(.9, .14, 5), cropMat);
    plant.scale.set(1, 1, 1); plant.position.set(-2.9 + i * 1.45, .2, -1.35 + j * 1.3); cropGroup.add(plant);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.12, 5, 4), cropMat); leaf.position.set(-2.9 + i * 1.45, .28, -1.35 + j * 1.3); cropGroup.add(leaf);
  }
  cropGroup.visible = !!state.homeLevel;
  // fence
  const fenceMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#c6aa7a', roughness: 1 });
  for (let i = 0; i <= 8; i++) { const p = box(.1, .7, .1, fenceMat); p.position.set(-3.7 + i * .93, .35, -2.1); plot.add(p); }
  for (let i = 0; i <= 5; i++) { const p = box(.1, .7, .1, fenceMat); p.position.set(-3.7, .35, -2.1 + i * .84); plot.add(p); }
  const rail = box(7.5, .08, .08, fenceMat); rail.position.set(0, .5, -2.1); plot.add(rail);
  const rail2 = box(.08, .08, 4.2, fenceMat); rail2.position.set(-3.7, .5, 0); plot.add(rail2);
  // scarecrow
  const sc = new THREE.Group(); sc.position.set(-2.2, 0, .7);
  const pole = box(.09, 1.9, .09, fenceMat); pole.position.y = .95; sc.add(pole);
  const arms = box(1.3, .08, .08, fenceMat); arms.position.y = 1.45; sc.add(arms);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.24, 8, 6), new THREE.MeshStandardMaterial({ color: '#c1a36a' })); head.position.y = 1.65; sc.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(.38, .28, 4), new THREE.MeshStandardMaterial({ color: '#574632', flatShading: true })); hat.position.y = 1.9; hat.rotation.y = Math.PI / 4; sc.add(hat);
  const shirt = box(.75, .6, .16, new THREE.MeshStandardMaterial({ color: '#8d5c45' })); shirt.position.y = 1.25; sc.add(shirt);
  plot.add(sc);
  worldGroup.add(plot); featureMeshes.plot = plot;
  // crates by shop
  const crateMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#c2a374', roughness: 1 });
  const crates = new THREE.Group(); const cp = toWorld(700, 292); crates.position.set(cp.x, 0, cp.z);
  [[0, .35, 0], [.7, .3, .1], [.34, .95, .05]].forEach(([x, y, z]) => { const c = box(.7, .7, .7, crateMat); c.position.set(x, y, z); c.rotation.y = rnd(-.2, .2); crates.add(c); });
  worldGroup.add(crates);
  // inn window ledge visual
  const ip = toWorld(478, 452);
  const ledge = box(.6, .15, 1.1, crateMat); ledge.position.set(ip.x, 1.55, ip.z); worldGroup.add(ledge);
  featureMeshes.ledge = ledge;
}

/* ---------------- CHARACTERS ---------------- */
function createCharacter(opts = {}) {
  const a = Object.assign({
    sex: 'woman', build: 'average', skin: '#e5b58e', hair: 'short', hairColor: '#5b3a24',
    beard: 'none', outfit: '#b98d4f', accent: '#e7c477', scars: 0
  }, opts);

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skinMat = new THREE.MeshStandardMaterial({ color: a.skin, roughness: .82, flatShading: true });
  const outfitMat = new THREE.MeshStandardMaterial({ color: a.outfit, roughness: .92, flatShading: true });
  const outfitDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(a.outfit).offsetHSL(0, -.04, -.13), roughness: .95, flatShading: true });
  const hairMat = new THREE.MeshStandardMaterial({ color: a.hairColor, roughness: .9, flatShading: true });
  const bootMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1, flatShading: true });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#2c2420', roughness: 1 });

  const broad = a.build === 'broad' ? 1.08 : a.build === 'slim' ? .93 : 1;
  const shoulder = (a.sex === 'man' ? .46 : a.sex === 'woman' ? .4 : .43) * broad;
  const hipW = (a.sex === 'woman' ? .4 : a.sex === 'man' ? .36 : .38) * broad;

  // legs — pivot at the hip so they swing naturally
  const legGeo = new THREE.BoxGeometry(.17, .7, .2);
  const bootGeo = new THREE.BoxGeometry(.19, .15, .3);
  function makeLeg(x) {
    const pivot = new THREE.Group();
    pivot.position.set(x, .76, 0);
    const thigh = new THREE.Mesh(legGeo, outfitDark);
    thigh.position.y = -.35; thigh.castShadow = true; pivot.add(thigh);
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -.72, .05); boot.castShadow = true; pivot.add(boot);
    body.add(pivot);
    return pivot;
  }
  const legL = makeLeg(-hipW * .42);
  const legR = makeLeg(hipW * .42);

  // torso / tunic
  const torso = new THREE.Group();
  torso.position.y = 1.12;
  body.add(torso);
  const tunic = new THREE.Mesh(new THREE.BoxGeometry(shoulder, .68, .27), outfitMat);
  tunic.castShadow = true; tunic.receiveShadow = true; torso.add(tunic);
  const hem = new THREE.Mesh(new THREE.ConeGeometry(shoulder * .62, .3, 4), outfitDark);
  hem.rotation.y = Math.PI / 4; hem.rotation.x = Math.PI; hem.position.y = -.38; hem.scale.z = .78; torso.add(hem);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(shoulder * .98, .08, .29), new THREE.MeshStandardMaterial({ color: '#4a3624', roughness: 1 }));
  belt.position.y = -.28; torso.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(.09, .09, .04), new THREE.MeshStandardMaterial({ color: a.accent, roughness: .4, metalness: .5 }));
  buckle.position.set(0, -.28, .16); torso.add(buckle);
  const collar = new THREE.Mesh(new THREE.BoxGeometry(shoulder * .66, .07, .3), new THREE.MeshStandardMaterial({ color: a.accent, roughness: .8 }));
  collar.position.y = .32; torso.add(collar);
  if (a.pack) {
    const leather = new THREE.MeshStandardMaterial({ color: '#5d432c', roughness: 1 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(.3, .36, .16), leather);
    pack.position.set(0, -.04, -.2); pack.castShadow = true; torso.add(pack);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(.32, .1, .02), new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 }));
    flap.position.set(0, .09, -.29); torso.add(flap);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(.34, .05, .02), leather);
    strap.position.set(0, .16, .15); strap.rotation.z = -.12; torso.add(strap);
  }

  // arms
  const armGeo = new THREE.BoxGeometry(.14, .48, .17);
  function makeArm(x) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.36, 0);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.085, 6, 5), outfitMat);
    cap.position.y = -.02; pivot.add(cap);
    const sleeve = new THREE.Mesh(armGeo, outfitDark);
    sleeve.position.y = -.25; sleeve.castShadow = true; pivot.add(sleeve);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.075, 6, 5), skinMat);
    hand.position.y = -.52; hand.castShadow = true; pivot.add(hand);
    body.add(pivot);
    return pivot;
  }
  const armL = makeArm(-shoulder * .6);
  const armR = makeArm(shoulder * .6);

  // neck + head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.075, .085, .14, 6), skinMat);
  neck.position.y = 1.48; body.add(neck);
  const head = new THREE.Group();
  head.position.y = 1.63; body.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.195, 8, 7), skinMat);
  skull.scale.set(1, 1.08, .95); skull.castShadow = true; head.add(skull);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.19, .1, .17), skinMat);
  jaw.position.set(0, -.14, .04); head.add(jaw);

  // eyes / brows / nose / mouth
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#2e2620', roughness: .6 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: '#f6f1e2', roughness: .5 });
  for (const s of [-1, 1]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(.034, 6, 5), eyeWhiteMat);
    white.position.set(s * .072, .022, .168); white.scale.set(1, 1.15, .5); head.add(white);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.019, 6, 5), eyeMat);
    eye.position.set(s * .072, .022, .188); head.add(eye);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(.07, .018, .02), hairMat);
    brow.position.set(s * .075, .085, .18); brow.rotation.z = s * .1; head.add(brow);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.032, .07, 4), skinMat);
  nose.rotation.x = Math.PI / 2; nose.position.set(0, -.02, .205); head.add(nose);
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(.05, .009, 4, 8, Math.PI), new THREE.MeshStandardMaterial({ color: '#8d5a4c', roughness: .8 }));
  mouth.rotation.z = Math.PI; mouth.position.set(0, -.095, .185); head.add(mouth);

  // hair styles
  const hair = new THREE.Group();
  head.add(hair);
  function cap(rx = .21, ry = .11, rz = .21, y = .09, z = -.01) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6, 0, Math.PI * 2, 0, Math.PI * .5), hairMat);
    m.scale.set(rx, ry, rz); m.position.set(0, y, z); m.castShadow = true; hair.add(m); return m;
  }
  if (a.hair === 'short') {
    cap();
    const nape = new THREE.Mesh(new THREE.BoxGeometry(.27, .16, .1), hairMat);
    nape.position.set(0, -.04, -.15); hair.add(nape);
  } else if (a.hair === 'long') {
    cap(.22, .12, .22, .1);
    const back = new THREE.Mesh(new THREE.BoxGeometry(.32, .42, .13), hairMat);
    back.position.set(0, -.12, -.13); back.castShadow = true; hair.add(back);
    for (const s of [-1, 1]) {
      const strand = new THREE.Mesh(new THREE.BoxGeometry(.08, .34, .1), hairMat);
      strand.position.set(s * .18, -.09, .05); hair.add(strand);
    }
  } else if (a.hair === 'braids') {
    cap(.21, .12, .21, .1);
    for (const s of [-1, 1]) {
      const braid = new THREE.Mesh(new THREE.CylinderGeometry(.045, .03, .36, 5), hairMat);
      braid.position.set(s * .19, -.18, .02); braid.rotation.z = s * .18; braid.castShadow = true; hair.add(braid);
      const tie = new THREE.Mesh(new THREE.BoxGeometry(.07, .03, .07), new THREE.MeshStandardMaterial({ color: a.accent }));
      tie.position.set(s * .22, -.35, .02); hair.add(tie);
    }
  } else if (a.hair === 'bun') {
    cap(.21, .1, .21, .1);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(.115, 7, 6), hairMat);
    bun.position.set(0, .17, -.1); bun.castShadow = true; hair.add(bun);
  } else if (a.hair === 'wild') {
    cap(.225, .13, .225, .1);
    for (let i = 0; i < 6; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(.06, .16, 4), hairMat);
      const ang = i / 6 * Math.PI * 2;
      spike.position.set(Math.cos(ang) * .16, .16 + Math.sin(i) * .02, Math.sin(ang) * .14);
      spike.rotation.z = Math.cos(ang) * .5; spike.rotation.x = -Math.sin(ang) * .5; hair.add(spike);
    }
  }

  // beards
  if (a.beard === 'full') {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(.185, 8, 6, 0, Math.PI * 2, Math.PI * .5, Math.PI * .34), hairMat);
    beard.position.set(0, -.03, .02); beard.scale.set(.9, 1.15, .92); head.add(beard);
    const stache = new THREE.Mesh(new THREE.BoxGeometry(.14, .035, .045), hairMat);
    stache.position.set(0, -.065, .19); head.add(stache);
  } else if (a.beard === 'stubble') {
    const stub = new THREE.Mesh(new THREE.SphereGeometry(.188, 8, 6, 0, Math.PI * 2, Math.PI * .52, Math.PI * .3), new THREE.MeshStandardMaterial({ color: a.hairColor, roughness: 1, transparent: true, opacity: .5 }));
    stub.position.set(0, -.03, .02); stub.scale.set(.9, 1.1, .92); head.add(stub);
  } else if (a.beard === 'moustache') {
    const stache = new THREE.Mesh(new THREE.BoxGeometry(.16, .03, .045), hairMat);
    stache.position.set(0, -.058, .19); head.add(stache);
  }

  // scars earned by dying
  if (a.scars > 0) {
    const scarMat = new THREE.MeshStandardMaterial({ color: '#a4665c', roughness: 1 });
    for (let i = 0; i < Math.min(a.scars, 3); i++) {
      const scar = new THREE.Mesh(new THREE.BoxGeometry(.012, .1, .012), scarMat);
      scar.position.set(-.11 + i * .05, .01 - i * .02, .188); scar.rotation.z = -.5 + i * .2; head.add(scar);
    }
  }

  root.userData.parts = { body, torso, head, hair, legL, legR, armL, armR };
  root.userData.phase = 0;
  root.userData.seed = Math.random() * 10;
  root.userData.speed = 0;
  return root;
}

function animateCharacter(model, dt, moveAmt, speed, time) {
  if (!model || !model.userData.parts) return;
  const u = model.userData, p = u.parts;
  const m = clamp(moveAmt, 0, 1);
  u.phase += dt * (1.2 + speed * 2.3) * (0.25 + m * 0.85);
  const sw = Math.sin(u.phase) * .62 * m;
  p.legL.rotation.x = sw;
  p.legR.rotation.x = -sw;
  p.armL.rotation.x = -sw * .78;
  p.armR.rotation.x = sw * .78;
  const breathe = Math.sin(time * 1.8 + u.seed) * .008;
  p.body.position.y = Math.abs(Math.sin(u.phase)) * .05 * m + breathe;
  p.body.rotation.z = Math.sin(u.phase) * .035 * m;
  p.head.rotation.y = Math.sin(time * .55 + u.seed) * .08 * (1 - m);
  p.head.rotation.z = Math.sin(time * 1.3 + u.seed) * .015;
  if (u.motion === 'wave') {
    p.armR.rotation.z = -2.1 + Math.sin(time * 9) * .25;
    p.armR.rotation.x = 0;
  } else {
    p.armR.rotation.z = lerp(p.armR.rotation.z, 0, .2);
  }
}

function makeNameLabel(text, color) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(text, color || '#f4e9c8'), transparent: true, depthWrite: false, depthTest: true }));
  sp.scale.set(.95, .24, 1);
  sp.renderOrder = 5;
  return sp;
}

function rebuildPlayer() {
  if (playerModel) worldGroup.remove(playerModel);
  playerModel = createCharacter({ ...state.appearance, pack: true });
  playerModel.userData.isPlayer = true;
  worldGroup.add(playerModel);
  playerParts = playerModel.userData.parts;
  placePlayer();
}
function placePlayer() {
  if (!playerModel) return;
  const p = toWorld(state.x, state.y);
  playerModel.position.set(p.x, state.h, p.z);
  playerModel.rotation.y = state.facing || 0;
}

/* ---------------- MOBS ---------------- */
function buildMobModel(def) {
  const root = new THREE.Group();
  let height = 1.7;
  if (def.type === 'hound') {
    const fur = new THREE.MeshStandardMaterial({ color: '#4c4033', roughness: 1, flatShading: true });
    const darkFur = new THREE.MeshStandardMaterial({ color: '#332c24', roughness: 1, flatShading: true });
    const bodyM = new THREE.Mesh(new THREE.SphereGeometry(.42, 8, 6), fur);
    bodyM.scale.set(.78, .72, 1.5); bodyM.position.y = .68; bodyM.castShadow = true; root.add(bodyM);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.26, 7, 6), darkFur);
    head.position.set(0, .84, .52); head.castShadow = true; root.add(head);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(.16, .14, .26), darkFur);
    snout.position.set(0, .76, .72); root.add(snout);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.09, .22, 4), darkFur);
      ear.position.set(s * .14, 1.04, .46); ear.rotation.z = s * .18; root.add(ear);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.035, 5, 4), new THREE.MeshBasicMaterial({ color: '#e9b94e' }));
      eye.position.set(s * .11, .89, .73); root.add(eye);
    }
    ['-0.26,0.36', '0.26,0.36', '-0.26,-0.34', '0.26,-0.34'].forEach(str => {
      const [x, z] = str.split(',').map(Number);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(.11, .5, .13), darkFur);
      leg.position.set(x, .26, z); leg.castShadow = true; root.add(leg);
    });
    const tail = new THREE.Mesh(new THREE.ConeGeometry(.07, .45, 4), darkFur);
    tail.position.set(0, .82, -.66); tail.rotation.x = -1.2; root.add(tail);
    height = 1.35;
  } else if (def.type === 'goblin') {
    const c = createCharacter({ sex: 'androgynous', build: 'slim', skin: '#7f9a58', hair: 'bald', hairColor: '#3b3a27', beard: 'none', outfit: '#56653c', accent: '#c9b268' });
    c.scale.setScalar(.82);
    const parts = c.userData.parts;
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(.07, .3, 4), new THREE.MeshStandardMaterial({ color: '#7f9a58', roughness: 1, flatShading: true }));
      ear.position.set(s * .2, .03, -.01); ear.rotation.z = s * -1.1; parts.head.add(ear);
    }
    root.add(c);
    height = 1.5;
  } else {
    const c = createCharacter({ sex: 'man', build: 'broad', skin: '#b9875f', hair: 'wild', hairColor: '#33291f', beard: 'stubble', outfit: '#5d4635', accent: '#9e4f43', scars: 1 });
    const parts = c.userData.parts;
    const bandana = new THREE.Mesh(new THREE.BoxGeometry(.3, .1, .22), new THREE.MeshStandardMaterial({ color: '#8f4239', roughness: 1 }));
    bandana.position.set(0, -.03, .1); parts.head.add(bandana);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(.5, .07, .06), new THREE.MeshStandardMaterial({ color: '#4b3325', roughness: 1 }));
    strap.position.set(0, .1, .08); strap.rotation.z = .22; parts.torso.add(strap);
    root.add(c);
    height = 1.72;
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .66, 26), new THREE.MeshBasicMaterial({ color: '#d65a4a', transparent: true, opacity: .4, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .035; root.add(ring);
  root.userData.ring = ring;
  root.userData.height = height;
  return root;
}

function spawnMobs() {
  mobs.forEach(m => worldGroup.remove(m.model));
  mobs = MOB_DEFS.map(def => {
    const p = toWorld(def.x, def.y);
    const model = buildMobModel(def);
    model.position.set(p.x, 0, p.z);
    model.rotation.y = Math.PI;
    const label = makeNameLabel(`${def.name}${def.group > 1 ? ' ×' + def.group : ''}`, '#f0cfb2');
    label.position.set(0, model.userData.height + .55, 0);
    model.add(label);
    worldGroup.add(model);
    return { def, model, label, alive: true, home: p, phase: Math.random() * 9, wander: 0, target: { x: p.x, z: p.z } };
  });
}

/* ---------------- BUILDINGS ---------------- */
const doorSides = { home: 'east', bakery: 'south', inn: 'north', shop: 'south', herbalist: 'west', stable: 'east' };
function facadePlacement(side, w, d, off) {
  if (side === 'east') return { x: w / 2 + off, z: 0, rot: Math.PI / 2, nx: 1, nz: 0 };
  if (side === 'west') return { x: -w / 2 - off, z: 0, rot: -Math.PI / 2, nx: -1, nz: 0 };
  if (side === 'north') return { x: 0, z: -d / 2 - off, rot: Math.PI, nx: 0, nz: -1 };
  return { x: 0, z: d / 2 + off, rot: 0, nx: 0, nz: 1 };
}
function buildBuilding(def) {
  const cx = def.x + def.w / 2, cy = def.y + def.h / 2;
  const p = toWorld(cx, cy);
  const w = def.w / S, d = def.h / S;
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);

  const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(def.color), color: '#efe5cf', roughness: .96 });
  const walls = box(w, def.wallH, d, wallMat);
  walls.position.y = def.wallH / 2;
  g.add(walls);

  // stone footing
  const footing = box(w + .16, .34, d + .16, new THREE.MeshStandardMaterial({ color: '#777364', roughness: 1, flatShading: true }));
  footing.position.y = .17; g.add(footing);

  // timber frame accents
  const beamMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#9a7b52', roughness: 1 });
  for (const sx of [-1, 1]) {
    const beam = box(.12, def.wallH, .12, beamMat);
    beam.position.set(sx * (w / 2 + .01), def.wallH / 2, d / 2 + .01); g.add(beam);
  }
  const topBeam = box(w + .06, .12, .12, beamMat);
  topBeam.position.set(0, def.wallH - .1, d / 2 + .01); g.add(topBeam);

  // roof — walkable flat decks for the two parkour buildings
  const roofH = def.wallH * .62;
  const roofMat = new THREE.MeshStandardMaterial({ map: roofTexture(def.roof), color: '#efe6d2', roughness: .95, flatShading: true });
  const flatRoof = def.id === 'shop' || def.id === 'inn';
  let roof;
  if (flatRoof) {
    roof = new THREE.Mesh(new THREE.BoxGeometry(w * .99, .2, d * .99), roofMat);
    roof.position.y = def.wallH + .1;
    roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
    const parMat = new THREE.MeshStandardMaterial({ color: '#6f6350', roughness: 1, flatShading: true });
    const parY = def.wallH + .32;
    const p1 = box(w, .44, .13, parMat); p1.position.set(0, parY, -d / 2 + .065); g.add(p1);
    const p2 = box(w, .44, .13, parMat); p2.position.set(0, parY, d / 2 - .065); g.add(p2);
    const p3 = box(.13, .44, d, parMat); p3.position.set(-w / 2 + .065, parY, 0); g.add(p3);
    const p4 = box(.13, .44, d, parMat); p4.position.set(w / 2 - .065, parY, 0); g.add(p4);
    const crateMat2 = new THREE.MeshStandardMaterial({ map: woodTex, color: '#c2a374', roughness: 1 });
    const roofCrate = box(.55, .55, .55, crateMat2); roofCrate.position.set(w * .28, def.wallH + .48, -d * .22); g.add(roofCrate);
  } else {
    roof = new THREE.Mesh(new THREE.ConeGeometry(1, roofH, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(w * .82, 1, d * .82);
    roof.position.y = def.wallH + roofH / 2 - .04;
    roof.castShadow = true; roof.receiveShadow = true; g.add(roof);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(w * .82, .1, .1), beamMat);
    ridge.position.y = def.wallH + roofH - .06; g.add(ridge);
  }

  // facade
  const side = doorSides[def.id] || 'south';
  const f = facadePlacement(side, w, d, .02);
  const doorMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#7e5b3b', roughness: 1 });
  const door = box(.92, 1.62, .1, doorMat);
  door.position.set(f.x, .81, f.z); door.rotation.y = f.rot; g.add(door);
  const frame = box(1.06, .12, .14, beamMat);
  frame.position.set(f.x, 1.68, f.z); frame.rotation.y = f.rot; g.add(frame);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.04, 6, 5), new THREE.MeshStandardMaterial({ color: '#d8b66f', metalness: .6, roughness: .35 }));
  const kx = f.x + (f.nx !== 0 ? 0 : .26), kz = f.z + (f.nz !== 0 ? .26 : 0);
  knob.position.set(kx, .88, kz + f.nz * .03 + (f.nx ? .06 : 0)); g.add(knob);

  // windows (front + one on each visible side)
  const winPanes = [];
  function addWindow(px, pz, rot, width = .52, hgt = .56) {
    const frameM = box(width + .1, hgt + .1, .08, beamMat);
    frameM.position.set(px, 1.6, pz); frameM.rotation.y = rot; g.add(frameM);
    const mat = new THREE.MeshStandardMaterial({ color: '#7a94a0', roughness: .3, metalness: .2, emissive: new THREE.Color('#f5c96b'), emissiveIntensity: 0 });
    const pane = new THREE.Mesh(new THREE.BoxGeometry(width, hgt, .06), mat);
    pane.position.set(px, 1.6, pz); pane.rotation.y = rot; g.add(pane);
    windowMats.push(mat);
    winPanes.push(pane);
    const mullion = box(.04, hgt, .03, beamMat);
    mullion.position.set(px, 1.6, pz); mullion.rotation.y = rot;
    mullion.translateZ(.05); g.add(mullion);
    const mullion2 = box(width, .04, .03, beamMat);
    mullion2.position.set(px, 1.6, pz); mullion2.rotation.y = rot; mullion2.translateZ(.05); g.add(mullion2);
  }
  if (side === 'east' || side === 'west') {
    for (const oz of [-w * .22, w * .24]) addWindow(f.x, oz, f.rot);
    const fs = facadePlacement('south', w, d, .02);
    addWindow(fs.x - w * .2, fs.z, 0);
    addWindow(fs.x + w * .2, fs.z, 0);
  } else {
    for (const ox of [-w * .28, w * .28]) addWindow(ox, f.z, f.rot);
    addWindow(w / 2 + .02, 0, Math.PI / 2);
    addWindow(-w / 2 - .02, 0, -Math.PI / 2);
  }

  // awning for shops
  if (['bakery', 'shop', 'inn', 'herbalist'].includes(def.id)) {
    const awn = new THREE.Mesh(new THREE.BoxGeometry(1.9, .06, .8), new THREE.MeshStandardMaterial({ map: stripeTex, color: '#e2c792', roughness: 1 }));
    awn.position.set(f.x + f.nx * .42, 1.96, f.z + f.nz * .42);
    awn.rotation.y = f.rot; awn.rotation.x = f.nx !== 0 ? 0 : -.16; awn.castShadow = true; g.add(awn);
  }

  // chimney
  if (def.id !== 'stable' && !flatRoof) {
    const chim = box(.38, 1.1, .38, new THREE.MeshStandardMaterial({ color: '#6a5a48', roughness: 1 }));
    chim.position.set(w * .28, def.wallH + roofH * .62, -d * .22); g.add(chim);
  }

  // hanging sign
  const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: signTexture(def.name.replace('Your Old Cottage', 'Old Cottage')), transparent: true, depthWrite: false }));
  sign.scale.set(1.85, .46, 1);
  sign.position.set(f.x + f.nx * .25, def.wallH + .22, f.z + f.nz * .25);
  g.add(sign);

  // lintel lamp
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.09, 6, 5), new THREE.MeshStandardMaterial({ color: '#ffe4a0', emissive: '#f2c15a', emissiveIntensity: 1.1 }));
  lamp.position.set(f.x + f.nx * .12, 2.25, f.z + f.nz * .12); g.add(lamp);

  worldGroup.add(g);
  colliders.push({ x1: def.x + 5, y1: def.y + 5, x2: def.x + def.w - 5, y2: def.y + def.h - 5, id: def.id });
  cameraColliders.push(walls, roof);

  const doorMap = {
    east: { x: def.x + def.w + 20, y: cy },
    west: { x: def.x - 20, y: cy },
    north: { x: cx, y: def.y - 20 },
    south: { x: cx, y: def.y + def.h + 20 },
  }[side];

  buildingMeshes[def.id] = { def, group: g, door: doorMap, sign, roof, windows: winPanes, side };
  return g;
}

function refreshSigns() {
  const b = buildingMeshes.home;
  if (!b) return;
  const label = state.homeLevel ? `Cottage · Lv ${state.homeLevel}` : 'Old Cottage';
  b.sign.material.map = signTexture(label);
  b.sign.material.needsUpdate = true;
}

/* ---------------- PROPS / PICKUPS ---------------- */
function addProps() {
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#5e4630', roughness: 1, flatShading: true });
  const leafMats = ['#4f7445', '#5f854e', '#42653c'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 1, flatShading: true }));
  const spots = [
    [95, 640], [150, 670], [330, 660], [470, 640], [610, 672], [790, 655], [960, 660], [1050, 600],
    [1045, 470], [1060, 340], [1050, 120], [940, 70], [820, 60], [610, 62], [470, 60], [320, 48],
    [180, 60], [62, 300], [52, 450], [60, 560], [900, 280], [340, 500]
  ];
  spots.forEach(([mx, my], i) => {
    const p = toWorld(mx, my);
    // keep trees out of buildings
    const blocked = BUILDINGS.some(b => mx > b.x - 30 && mx < b.x + b.w + 30 && my > b.y - 30 && my < b.y + b.h + 30);
    if (blocked) return;
    const tree = new THREE.Group();
    tree.position.set(p.x, 0, p.z);
    const h = rnd(2.3, 3.7);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, h, 5), trunkMat);
    trunk.position.y = h / 2; trunk.castShadow = true; tree.add(trunk);
    for (let j = 0; j < 3; j++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(rnd(.8, 1.15) * (1 - j * .18), rnd(1.0, 1.4), 6), leafMats[(i + j) % 3]);
      cone.position.y = h * .62 + j * .55; cone.castShadow = true; tree.add(cone);
    }
    tree.rotation.y = rnd(0, 6);
    worldGroup.add(tree);
  });

  // lamps along the main lane
  const lampMat = new THREE.MeshStandardMaterial({ color: '#4e4436', roughness: 1 });
  const glowMat = new THREE.MeshStandardMaterial({ color: '#ffe5a7', emissive: '#f6c15e', emissiveIntensity: 1.3 });
  [280, 430, 560, 690, 820].forEach((mx, i) => {
    const p = toWorld(mx, 332 + (i % 2 ? -130 : 130));
    const post = new THREE.Group(); post.position.set(p.x, 0, p.z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.055, .075, 2.5, 6), lampMat);
    pole.position.y = 1.25; pole.castShadow = true; post.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.28, .3, .28), lampMat);
    head.position.y = 2.55; post.add(head);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 5), glowMat);
    glow.position.y = 2.52; post.add(glow);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,220,140,.55)', 'rgba(255,210,120,0)'), transparent: true, depthWrite: false, opacity: .8 }));
    halo.scale.set(1.2, 1.2, 1); halo.position.y = 2.52; post.add(halo);
    worldGroup.add(post);
  });

  // benches by the well
  const benchMat = new THREE.MeshStandardMaterial({ map: woodTex, color: '#b79c6c', roughness: 1 });
  [[580, 300, .4], [646, 300, -.4]].forEach(([mx, my, rot]) => {
    const p = toWorld(mx, my);
    const b = new THREE.Group(); b.position.set(p.x, 0, p.z); b.rotation.y = rot;
    const seat = box(1.25, .09, .38, benchMat); seat.position.y = .45; b.add(seat);
    const back = box(1.25, .32, .08, benchMat); back.position.set(0, .68, -.16); b.add(back);
    for (const s of [-.5, .5]) { const leg = box(.08, .45, .32, benchMat); leg.position.set(s, .22, 0); b.add(leg); }
    worldGroup.add(b);
  });
}

function spawnPickups() {
  PICKUPS.forEach(pk => {
    const p = toWorld(pk.x, pk.y);
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z);
    if (pk.kind === 'herb') {
      const stemMat = new THREE.MeshStandardMaterial({ color: '#5d8148', roughness: 1, flatShading: true });
      for (let i = 0; i < 4; i++) {
        const stem = new THREE.Mesh(new THREE.ConeGeometry(.05, .42, 4), stemMat);
        stem.position.set(rnd(-.15, .15), .21, rnd(-.15, .15)); stem.rotation.z = rnd(-.3, .3); g.add(stem);
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(.09, 5, 4), stemMat);
        leaf.scale.set(1, .5, 1.4); leaf.position.set(stem.position.x, .36, stem.position.z); g.add(leaf);
      }
    } else {
      const coinMat = new THREE.MeshStandardMaterial({ color: '#e3bf63', metalness: .7, roughness: .3, emissive: '#5a4518', emissiveIntensity: .4 });
      for (let i = 0; i < 4; i++) {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .025, 10), coinMat);
        coin.position.set(rnd(-.12, .12), .08 + i * .025, rnd(-.12, .12)); coin.rotation.x = rnd(-.2, .2); g.add(coin);
      }
    }
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(240,220,150,.5)', 'rgba(240,210,130,0)'), transparent: true, depthWrite: false, opacity: .7 }));
    glow.scale.set(1.2, 1.2, 1); glow.position.y = .45; g.add(glow);
    worldGroup.add(g);
    pickupMeshes[pk.id] = { def: pk, group: g, taken: false, baseY: 0, phase: Math.random() * 8 };
  });
}

function spawnNpcs() {
  PEOPLE.forEach(person => {
    const p = toWorld(person.x, person.y);
    const pal = person.palette;
    const model = createCharacter({
      sex: person.id === 'mara' || person.id === 'tamsin' || person.id === 'elsa' ? 'woman' : 'man',
      build: person.id === 'bryn' ? 'broad' : 'average',
      skin: pal.skin, hair: pal.hair, hairColor: pal.hairColor, beard: pal.beard || 'none',
      outfit: pal.outfit, accent: pal.accent, scars: 0
    });
    model.position.set(p.x, 0, p.z);
    model.rotation.y = rnd(0, 6);
    const label = makeNameLabel(person.name, '#f6eccd');
    label.position.set(0, 2.15, 0);
    model.add(label);
    worldGroup.add(model);
    npcModels[person.id] = { person, model, label, target: new THREE.Vector2(p.x, p.z), wait: rnd(1, 4), moving: 0 };
  });
}

/* ---------------- WORLD INIT ---------------- */
function initWorld() {
  addGround();
  addSkyAndHills();
  addFeatureModels();
  BUILDINGS.forEach(buildBuilding);
  addProps();
  spawnNpcs();
  spawnMobs();
  spawnPickups();
  rebuildPlayer();
  refreshSigns();
  placePlayer();
}

/* ---------------- INPUT / CAMERA ---------------- */
const keys = Object.create(null);
const joy = { active: false, id: null, x: 0, y: 0 };
const pointers = new Map();
let dragCam = null, pinchDist = 0;
const raycaster = new THREE.Raycaster();
const camTarget = new THREE.Vector3();
const camLook = new THREE.Vector3(0, 1, 0);
let camInit = false;

function lerpAngle(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function updateCamera(dt, instant = false) {
  if (!playerModel) return;
  const pw = playerModel.position;
  const mobile = window.innerWidth < 760;
  let yaw, pitch, dist, lookY;
  if (showcase && !state.started) {
    yaw = -Math.PI / 2 + (state.camYaw + Math.PI / 2);
    pitch = .075;
    dist = mobile ? 5.2 : 5.8;
    lookY = 1.0;
  } else if (combat.active) {
    return;
  } else {
    yaw = state.camYaw; pitch = state.camPitch; dist = state.camDist;
    lookY = 1.12;
  }
  camTarget.set(pw.x, pw.y + lookY, pw.z);
  if (showcase && !state.started && !mobile) {
    // frame the character in the open right-hand pane of the start screen
    camTarget.x -= Math.cos(yaw) * 1.2;
    camTarget.z += Math.sin(yaw) * 1.2;
  }
  const dirX = Math.sin(yaw) * Math.cos(pitch);
  const dirY = Math.sin(pitch);
  const dirZ = Math.cos(yaw) * Math.cos(pitch);

  if (!combat.active && !showcase && !state.onRoof && cameraColliders.length) {
    const dir = new THREE.Vector3(dirX, dirY + .06, dirZ).normalize();
    raycaster.set(camTarget, dir);
    raycaster.far = dist + .5;
    const hits = raycaster.intersectObjects(cameraColliders, false);
    if (hits.length && hits[0].distance < dist + .4) {
      dist = Math.max(2.3, hits[0].distance - .35);
    }
  }

  const px = camTarget.x + dirX * dist;
  const py = camTarget.y + dirY * dist + .22;
  const pz = camTarget.z + dirZ * dist;
  if (instant || !camInit) {
    camera.position.set(px, py, pz);
    camLook.copy(camTarget);
    camInit = true;
  } else {
    const k = 1 - Math.exp(-dt * (showcase ? 2.2 : 7.5));
    camera.position.x = lerp(camera.position.x, px, k);
    camera.position.y = lerp(camera.position.y, py, k);
    camera.position.z = lerp(camera.position.z, pz, k);
    const kl = 1 - Math.exp(-dt * 10);
    camLook.lerp(camTarget, kl);
  }
  camera.lookAt(camLook);
  state.camDist = state.camDist; // preserve
}

function initInput() {
  document.addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (k === 'e') { e.preventDefault(); doAction(); }
    if (k === ' ') { e.preventDefault(); jump(); }
    if (k === 'q') state.camYaw += .12;
    if (k === 'r') state.camYaw -= .12;
    if (k === 'escape') {
      if (combat.active && !combat.busy) fleeCombat(true);
      else if (!$('npcUI').hidden) closeNpc();
      else if (!$('modalBackdrop').hidden) closeModal();
    }
  });
  document.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  const canvas = $('world');
  canvas.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) dragCam = { x: e.clientX, y: e.clientY };
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      dragCam = null;
    }
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist) state.camDist = clamp(state.camDist - (d - pinchDist) * .018, 3.4, 10.5);
      pinchDist = d;
      return;
    }
    if (!dragCam) return;
    const dx = e.clientX - dragCam.x, dy = e.clientY - dragCam.y;
    dragCam = { x: e.clientX, y: e.clientY };
    state.camYaw -= dx * .0065;
    state.camPitch = clamp(state.camPitch + dy * .0045, .02, .92);
  });
  const endPointer = e => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchDist = 0;
    if (pointers.size === 0) dragCam = null;
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    state.camDist = clamp(state.camDist + Math.sign(e.deltaY) * .55, 3.4, 10.5);
  }, { passive: false });

  // virtual joystick
  const joyEl = $('joystick'), stickEl = $('stick');
  function joySet(e) {
    const r = joyEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const max = r.width / 2 - 18;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    joy.x = dx / max; joy.y = dy / max;
    stickEl.style.transform = `translate(${dx}px,${dy}px)`;
  }
  function joyEnd() {
    joy.active = false; joy.id = null; joy.x = 0; joy.y = 0;
    stickEl.style.transform = 'translate(0,0)';
  }
  joyEl.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    joy.active = true; joy.id = e.pointerId;
    try { joyEl.setPointerCapture(e.pointerId); } catch (_) {}
    joySet(e);
  });
  joyEl.addEventListener('pointermove', e => {
    if (!joy.active || e.pointerId !== joy.id) return;
    e.preventDefault(); joySet(e);
  });
  joyEl.addEventListener('pointerup', joyEnd);
  joyEl.addEventListener('pointercancel', joyEnd);
  joyEl.addEventListener('lostpointercapture', joyEnd);

  $('actionBtn').addEventListener('click', doAction);
  $('journalBtn').addEventListener('click', openJournal);
  $('statusBtn').addEventListener('click', openStatus);
}

/* ---------------- MOVEMENT / PARKOUR ---------------- */
function blockedAt(x, y) {
  if (x < 24 || x > MAPW - 24 || y < 24 || y > MAPH - 24) return true;
  if (state.onRoof) return false;
  return colliders.some(c => x > c.x1 - 9 && x < c.x2 + 9 && y > c.y1 - 9 && y < c.y2 + 9);
}
function resolveCollider() {
  for (const c of colliders) {
    if (state.x > c.x1 - 9 && state.x < c.x2 + 9 && state.y > c.y1 - 9 && state.y < c.y2 + 9) {
      const left = Math.abs(state.x - (c.x1 - 10)), right = Math.abs(c.x2 + 10 - state.x);
      const top = Math.abs(state.y - (c.y1 - 10)), bot = Math.abs(c.y2 + 10 - state.y);
      const m = Math.min(left, right, top, bot);
      if (m === left) state.x = c.x1 - 10;
      else if (m === right) state.x = c.x2 + 10;
      else if (m === top) state.y = c.y1 - 10;
      else state.y = c.y2 + 10;
    }
  }
}
function jump() {
  if (!state.started || state.dialogOpen || state.parkour || combat.active) return;
  if (state.onRoof) {
    state.fallStart = state.onRoof.h;
    state.h = state.onRoof.h;
    state.onRoof = null;
    state.vy = 5.3;
    toast('You leap from the rooftop.');
  } else if (state.h <= 0.02) {
    state.vy = 5.4;
    state.h = .01;
    state.fallStart = 0;
  }
}
function startParkour(pk) {
  if (state.parkour) return;
  state.dialogOpen = true;
  hideInteractions();
  const to = toWorld(pk.to.x, pk.to.y);
  state.parkour = {
    pk, t: 0, dur: pk.type === 'vault' ? .62 : pk.type === 'leap' ? .8 : 1.05,
    from: { x: state.x, y: state.y, h: state.h },
    to: { x: pk.to.x, y: pk.to.y, h: pk.h },
    toWorld: to, arc: pk.arc || 1.2
  };
  logMsg(pk.label + '.');
  $('prompt').classList.remove('show');
}
function updateParkour(dt) {
  const p = state.parkour;
  if (!p) return;
  p.t += dt / p.dur;
  const t = smooth(clamp(p.t, 0, 1));
  state.x = lerp(p.from.x, p.to.x, t);
  state.y = lerp(p.from.y, p.to.y, t);
  state.h = lerp(p.from.h, p.to.h, t) + Math.sin(clamp(p.t, 0, 1) * Math.PI) * p.arc;
  if (playerModel) {
    playerModel.rotation.x = -Math.sin(t * Math.PI) * (p.pk.type === 'vault' ? .9 : .55);
    playerModel.rotation.z = Math.sin(t * Math.PI) * .18;
  }
  if (p.t >= .55 && !p.called) {
    p.called = true;
    if (p.pk.type === 'climb' || p.pk.type === 'window') toast(p.pk.type === 'window' ? 'You haul yourself through the window.' : 'Up onto the crates!');
    else if (p.pk.type === 'leap') toast('You clear the ditch.');
    else toast('Vaulted clean over the fence.');
  }
  if (p.t >= 1) {
    state.parkour = null;
    state.h = p.to.h;
    state.vy = 0;
    state.onRoof = p.pk.roof ? { ...p.pk.roof } : null;
    state.dialogOpen = false;
    if (playerModel) { playerModel.rotation.x = 0; playerModel.rotation.z = 0; }
    if (p.pk.roof) toast('The rooftops are yours — mind the drop.');
    state.nearby = null;
    updateHUD(true);
    saveGame();
  }
}
function updateVertical(dt) {
  if (state.parkour) { updateParkour(dt); return; }
  if (state.onRoof) {
    state.h = state.onRoof.h;
    state.vy = 0;
    const r = state.onRoof;
    if (state.x < r.x1 || state.x > r.x2 || state.y < r.y1 || state.y > r.y2) {
      state.onRoof = null;
      state.fallStart = state.h;
      state.vy = 0;
      toast('The roof edge crumbles — you fall!');
    }
    return;
  }
  if (state.h > 0 || state.vy > 0) {
    state.vy -= 18 * dt;
    state.h += state.vy * dt;
    if (state.h <= 0) {
      const drop = Math.max(0, state.fallStart || 0);
      state.h = 0; state.vy = 0;
      if (drop > 2.1) {
        const dmg = Math.round((drop - 2.1) * 7);
        state.health = Math.max(0, state.health - dmg);
        toast(`Hard landing — ${dmg} damage.`);
        logMsg(`You took ${dmg} fall damage.`);
        if (state.health <= 0) playerDefeated('a long fall');
      }
      state.fallStart = 0;
      resolveCollider();
    }
  }
}
function updateMovement(dt) {
  if (!state.started || state.dialogOpen || state.parkour || combat.active || !playerModel) {
    animateCharacter(playerModel, dt, 0, 0, clockTime);
    return;
  }
  let ix = (keys.d ? 1 : 0) - (keys.a ? 1 : 0) + joy.x;
  let iy = (keys.w ? 1 : 0) - (keys.s ? 1 : 0) - joy.y;
  const mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; }
  if (mag < .08) {
    animateCharacter(playerModel, dt, 0, 0, clockTime);
    return;
  }
  const yaw = state.camYaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx = -fz, rz = fx;
  const mx = fx * iy + rx * ix;
  const mz = fz * iy + rz * ix;
  let speed = 3.75;
  if (state.energy < 12) speed *= .72;
  if (state.onRoof) speed *= .88;
  const dx = mx * S * speed * dt;
  const dy = mz * S * speed * dt;
  if (!blockedAt(state.x + dx, state.y)) state.x += dx;
  if (!blockedAt(state.x, state.y + dy)) state.y += dy;
  state.facing = lerpAngle(state.facing || 0, Math.atan2(mx, mz), Math.min(1, dt * 13));
  playerModel.rotation.y = state.facing;
  animateCharacter(playerModel, dt, 1, speed, clockTime);
  if (Math.random() < dt * .3) state.energy = clamp(state.energy - .35, 0, 100);
  if (state.onRoof) {
    const r = state.onRoof;
    if (state.x < r.x1 || state.x > r.x2 || state.y < r.y1 || state.y > r.y2) {
      state.onRoof = null;
      state.fallStart = r.h;
      state.vy = 0;
      toast('You slip off the rooftop!');
    }
  }
}

/* ---------------- NPC / WORLD IDLE ---------------- */
function updateNpcs(dt) {
  for (const id in npcModels) {
    const n = npcModels[id];
    const talking = state.dialogOpen && state.currentNpc && state.currentNpc.id === id;
    const px = playerModel ? playerModel.position.x : 0;
    const pz = playerModel ? playerModel.position.z : 0;
    const dist = Math.hypot(n.model.position.x - px, n.model.position.z - pz);
    if (talking) {
      const ang = Math.atan2(px - n.model.position.x, pz - n.model.position.z);
      n.model.rotation.y = lerpAngle(n.model.rotation.y, ang, Math.min(1, dt * 6));
      animateCharacter(n.model, dt, 0, 0, clockTime);
      continue;
    }
    n.wait -= dt;
    const tx = n.target.x, tz = n.target.y;
    const d = Math.hypot(tx - n.model.position.x, tz - n.model.position.z);
    if (n.wait <= 0 && d < .35) {
      const route = n.person.route;
      const rp = route[Math.floor(Math.random() * route.length)];
      const wp = toWorld(rp[0], rp[1]);
      n.target.set(wp.x + rnd(-.3, .3), wp.z + rnd(-.3, .3));
      n.wait = rnd(3, 8);
    }
    if (d > .15) {
      const step = Math.min(d, dt * .55);
      const dirx = (tx - n.model.position.x) / d, dirz = (tz - n.model.position.z) / d;
      n.model.position.x += dirx * step;
      n.model.position.z += dirz * step;
      n.model.rotation.y = lerpAngle(n.model.rotation.y, Math.atan2(dirx, dirz), Math.min(1, dt * 6));
      animateCharacter(n.model, dt, 1, 1.1, clockTime);
    } else {
      animateCharacter(n.model, dt, 0, 0, clockTime);
      if (dist < 4.2) {
        const ang = Math.atan2(px - n.model.position.x, pz - n.model.position.z);
        n.model.rotation.y = lerpAngle(n.model.rotation.y, ang, Math.min(1, dt * 3));
      }
    }
  }
}
function updateWorldIdle(dt) {
  mobs.forEach(m => {
    if (!m.alive) return;
    m.phase += dt;
    m.model.position.y = Math.sin(m.phase * 1.6) * .035;
    if (m.model.userData.ring) m.model.userData.ring.material.opacity = .26 + Math.sin(m.phase * 2.4) * .14;
    // small menacing shuffle
    const px = playerModel ? playerModel.position.x : 0, pz = playerModel ? playerModel.position.z : 0;
    const dx = m.model.position.x - px, dz = m.model.position.z - pz;
    const d = Math.hypot(dx, dz);
    if (d < 5.5) {
      m.model.rotation.y = lerpAngle(m.model.rotation.y, Math.atan2(px - m.model.position.x, pz - m.model.position.z), Math.min(1, dt * 3));
    }
  });
  for (const id in pickupMeshes) {
    const pk = pickupMeshes[id];
    if (pk.taken) continue;
    pk.phase += dt;
    pk.group.position.y = .06 + Math.sin(pk.phase * 2) * .035;
    pk.group.rotation.y += dt * .8;
  }
  if (featureMeshes.stones) {
    featureMeshes.stones.rotation.y = Math.sin(clockTime * .12) * .04;
  }
  if (waterTex) {
    waterTex.offset.x += dt * .012;
    waterTex.offset.y += dt * .006;
  }
  // keep name labels readable without letting them swallow the screen up close
  const cp = camera.position;
  for (const id in npcModels) {
    const n = npcModels[id];
    const d = n.model.position.distanceTo(cp);
    const w = clamp((d - 7) / 3.5, 0, 1) * clamp((28 - d) / 10, 0, 1);
    n.label.material.opacity = w;
    n.label.visible = w > .03;
  }
  mobs.forEach(m => {
    if (!m.alive) return;
    const d = m.model.position.distanceTo(cp);
    const w = clamp((d - 7.5) / 3.5, 0, 1) * clamp((30 - d) / 10, 0, 1);
    if (m.label) { m.label.material.opacity = w; m.label.visible = w > .03; }
  });
  stallLabels.forEach(l => {
    l.getWorldPosition(tmpVec);
    const d = tmpVec.distanceTo(cp);
    const w = clamp((d - 9.5) / 3.5, 0, 1) * clamp((30 - d) / 9, 0, 1);
    l.material.opacity = w;
    l.visible = w > .04;
  });
}

/* ---------------- NEARBY / STATIC UI ---------------- */
let interactRing = null;
function makeInteractRing() {
  interactRing = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(.3, .38, 28), new THREE.MeshBasicMaterial({ color: '#f1d38b', transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .04;
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.09, 0), new THREE.MeshBasicMaterial({ color: '#f7e0a2' }));
  gem.position.y = .75; gem.scale.y = 1.5;
  interactRing.add(ring, gem);
  interactRing.userData.gem = gem;
  interactRing.visible = false;
  worldGroup.add(interactRing);
}
function hideInteractions() {
  $('actionBtn').hidden = true;
  $('prompt').classList.remove('show');
  if (interactRing) interactRing.visible = false;
}
function updateNearby() {
  if (!state.started || state.dialogOpen || state.parkour || combat.active) {
    hideInteractions();
    state.nearby = null;
    return;
  }
  let best = null, bestD = Infinity;
  const consider = (d, data) => { if (d < bestD) { bestD = d; best = data; } };

  if (state.onRoof) {
    consider(.5, { type: 'roofdrop', label: 'Drop down from the roof', icon: '↓', action: 'Drop', x: state.x, y: state.y, h: state.h });
  }

  for (const id in npcModels) {
    const n = npcModels[id];
    const p = toMap(n.model.position.x, n.model.position.z);
    const d = Math.hypot(p.x - state.x, p.y - state.y);
    if (d < 56) consider(d, { type: 'npc', ref: n.person, label: `Talk to ${n.person.name}`, icon: '💬', action: 'Talk', x: p.x, y: p.y, h: 0 });
  }

  mobs.forEach(m => {
    if (!m.alive) return;
    const p = toMap(m.model.position.x, m.model.position.z);
    const d = Math.hypot(p.x - state.x, p.y - state.y);
    if (d < 66 && state.h < 1.2) consider(d + 4, { type: 'mob', ref: m, label: `Challenge ${m.def.name}${m.def.group > 1 ? ' ×' + m.def.group : ''}`, icon: '⚔', action: 'Fight', x: p.x, y: p.y, h: 0 });
  });

  for (const id in pickupMeshes) {
    const pk = pickupMeshes[id];
    if (pk.taken) continue;
    const p = toMap(pk.group.position.x, pk.group.position.z);
    const d = Math.hypot(p.x - state.x, p.y - state.y);
    if (d < 48 && state.h < 1) consider(d, { type: 'pickup', ref: pk, label: `Gather ${pk.def.name}`, icon: pk.def.kind === 'coin' ? '◈' : '✦', action: pk.def.kind === 'coin' ? 'Take' : 'Gather', x: p.x, y: p.y, h: 0 });
  }

  BUILDINGS.forEach(def => {
    const b = buildingMeshes[def.id];
    if (!b) return;
    const d = Math.hypot(b.door.x - state.x, b.door.y - state.y);
    if (d < 74 && state.h < 1) consider(d + 10, { type: 'building', ref: b, label: `Enter ${def.name}`, icon: def.icon, action: 'Enter', x: b.door.x, y: b.door.y, h: 0 });
  });

  if (!state.onRoof) {
    PARKOUR.forEach(pk => {
      if (pk.roof && state.onRoof) return;
      const d = Math.hypot(pk.x - state.x, pk.y - state.y);
      if (d < pk.radius) consider(d + 2, { type: 'parkour', ref: pk, label: pk.label, icon: pk.icon, action: pk.type === 'vault' ? 'Vault' : pk.type === 'leap' ? 'Leap' : 'Climb', x: pk.x, y: pk.y, h: 0 });
    });
    FEATURES.forEach(ft => {
      const d = Math.hypot(ft.x - state.x, ft.y - state.y);
      if (d < ft.range) consider(d + 14, { type: 'feature', ref: ft, label: `Visit the ${ft.name}`, icon: '✧', action: 'Look', x: ft.x, y: ft.y, h: 0 });
    });
  }

  state.nearby = best;
  if (best) {
    const prompt = $('prompt');
    prompt.innerHTML = `<b>${best.icon}</b> ${best.label} <kbd>E</kbd>`;
    prompt.classList.add('show');
    const btn = $('actionBtn');
    btn.hidden = false;
    $('actionIcon').textContent = best.icon;
    $('actionLabel').textContent = best.action;
    if (interactRing) {
      const w = toWorld(best.x, best.y);
      interactRing.position.set(w.x, best.h + .02, w.z);
      interactRing.visible = true;
      interactRing.userData.gem.rotation.y += .04;
      interactRing.userData.gem.position.y = .72 + Math.sin(clockTime * 3) * .08;
    }
  } else {
    hideInteractions();
  }
}

/* ---------------- HUD ---------------- */
let hudTick = 0;
function updateHUD(force) {
  if (!state.started) return;
  $('clock').textContent = dateText();
  $('coins').textContent = `◈ ${state.coins}`;
  $('hudName').textContent = state.appearance.name || 'Alder Rowan';
  $('hudJob').textContent = state.job;
  $('hudLevel').textContent = state.level;
  $('hpBar').style.width = `${clamp(state.health / state.maxHealth, 0, 1) * 100}%`;
  $('hpText').textContent = Math.round(state.health);
  $('hungerBar').style.width = `${clamp(state.hunger, 0, 100)}%`;
  $('hungerText').textContent = Math.round(state.hunger);
  $('energyBar').style.width = `${clamp(state.energy, 0, 100)}%`;
  $('energyText').textContent = Math.round(state.energy);
  $('honorVal').textContent = state.honor;
  $('repVal').textContent = state.rep;
  $('wantedVal').textContent = state.wanted > 0 ? `${state.wanted}★` : 'Clean';
  $('hudAvatar').textContent = state.spouse ? '♥' : '✦';

  const quests = [
    { done: state.quests.meet, title: 'Meet the townsfolk', hint: 'Speak with two people in Brackenridge.' },
    { done: state.quests.forage, title: 'Gather wild herbs', hint: 'Find three herb patches around town.' },
    { done: state.quests.work, title: 'Earn an honest coin', hint: 'Take a shift or sell goods worth 20◈.' },
  ];
  const done = quests.filter(q => q.done).length;
  $('questCount').textContent = `${done} / 3`;
  if (force) {
    $('questList').innerHTML = quests.map(q => `<div class="q-row"><span class="q-ico">${q.done ? '✓' : '◇'}</span><div><b style="${q.done ? 'text-decoration:line-through;opacity:.6' : ''}">${q.title}</b><p>${q.hint}</p></div></div>`).join('');
  }
}
function addHonor(n) { state.honor = clamp(state.honor + n, -100, 100); }
function addRep(n) { state.rep = clamp(state.rep + n, -100, 100); }
function changeCoins(n, reason) {
  state.coins = Math.max(0, state.coins + n);
  if (reason) logMsg(reason);
  updateHUD(true);
}
function giveCoins(n, reason) {
  changeCoins(n, reason);
  if (state.coins >= 20 && !state.quests.work) {
    state.quests.work = true;
    toast('Quest complete — an honest coin earned.');
    gainXP(2);
  }
}

function doAction() {
  if (state.dialogOpen || state.parkour || combat.active || !state.started) return;
  const n = state.nearby;
  if (!n) return;
  if (n.type === 'npc') openNpc(n.ref);
  else if (n.type === 'building') openBuilding(n.ref);
  else if (n.type === 'mob') startCombat(n.ref);
  else if (n.type === 'pickup') collectPickup(n.ref);
  else if (n.type === 'parkour') startParkour(n.ref);
  else if (n.type === 'feature') openFeature(n.ref);
  else if (n.type === 'roofdrop') {
    state.fallStart = state.h; state.onRoof = null; state.vy = 0; state.h = Math.max(.05, state.h);
    state.nearby = null;
  }
}
function collectPickup(pk) {
  if (pk.taken) return;
  pk.taken = true;
  pk.group.visible = false;
  if (pk.def.kind === 'coin') {
    const n = 6 + Math.floor(Math.random() * 7);
    giveCoins(n, `You pocket ${n} loose coins.`);
    toast(`+${n} coins`);
  } else {
    addItem('Herbs', 1);
    if (itemCount('Herbs') >= 3 && !state.quests.forage) {
      state.quests.forage = true;
      gainXP(2);
      toast('Quest complete — the herb satchel is full.');
    } else toast('Herbs gathered.');
    logMsg('You gather wild herbs.');
  }
  updateHUD(true);
  saveGame();
}
function openFeature(ft) {
  if (ft.id === 'well') {
    openModal(`
      <div class="eyebrow">A quiet place</div><h2>The Wishing Well</h2>
      <p class="sub">Cold stone, deep water, and a hundred copper wishes at the bottom. The rope is frayed but the bucket still comes up full.</p>
      <div class="menu-list">
        <button class="menu-btn" data-menu="well-toss"><span class="mi">◈</span><div class="mt"><b>Toss in a coin (1◈)</b><small>Tradition says the town remembers.</small></div></button>
        <button class="menu-btn" data-menu="well-drink"><span class="mi">💧</span><div class="mt"><b>Drink deep</b><small>Refresh your energy and fullness.</small></div></button>
        <button class="menu-btn" data-menu="well-listen"><span class="mi">✦</span><div class="mt"><b>Listen to the town</b><small>A rumor, if the water is in a giving mood.</small></div></button>
      </div>`, {
      'well-toss': () => {
        if (state.coins < 1) return toast('You have no coins to spare.');
        changeCoins(-1);
        addHonor(1);
        toast(pick(['The water rings once. A good omen.', 'The coin sinks. Somewhere, a frog approves.', 'You wish for a fuller life. The well keeps its counsel.']));
        closeModal();
      },
      'well-drink': () => {
        state.energy = clamp(state.energy + 18, 0, 100);
        state.hunger = clamp(state.hunger + 4, 0, 100);
        toast('Cold, clean water. You feel restored.');
        closeModal(); updateHUD(true); saveGame();
      },
      'well-listen': () => {
        toast(pick(['Two merchants are feuding over a goat.', 'The standing stones bloomed out of season, says a washerwoman.', 'Someone saw lights on the old barrow road.']));
        addRep(1); closeModal();
      }
    });
  } else {
    openModal(`
      <div class="eyebrow">Old magic</div><h2>The Old Standing Stones</h2>
      <p class="sub">Three stones lean together like tired friends. The ground here is warm, and the air tastes faintly of iron and rain.</p>
      <div class="menu-list">
        <button class="menu-btn" data-menu="stones-pray"><span class="mi">✧</span><div class="mt"><b>Leave an offering</b><small>2◈ · honor and a moment of peace.</small></div></button>
        <button class="menu-btn" data-menu="stones-touch"><span class="mi">✋</span><div class="mt"><b>Touch the rune</b><small>Something old turns over in its sleep.</small></div></button>
        <button class="menu-btn" data-menu="stones-hunt"><span class="mi">⚔</span><div class="mt"><b>Look for trouble</b><small>The barrow road is quiet. Too quiet.</small></div></button>
      </div>`, {
      'stones-pray': () => {
        if (state.coins < 2) return toast('You need two coins for an offering.');
        changeCoins(-2); addHonor(3); gainXP(2);
        toast('The stones hum. You feel watched over.');
        closeModal(); saveGame();
      },
      'stones-touch': () => {
        if (Math.random() < .55) { state.maxFp += 1; state.fp = state.maxFp; toast('A spark of focus — max Focus +1.'); gainXP(3); }
        else { state.health = Math.max(1, state.health - 6); toast('A jolt of cold power. It stings.'); }
        closeModal(); updateHUD(true); saveGame();
      },
      'stones-hunt': () => {
        closeModal();
        const m = mobs.find(mb => mb.alive && mb.def.id === 'hound1');
        if (m) { toast('You follow the smell of bog water...'); setTimeout(() => startCombat(m, true), 500); }
        else toast('Nothing stirs. Whatever lived here has moved on.');
      }
    });
  }
}

/* ---------------- CONVERSATION OVERLAY ---------------- */
const NPC_ACTIONS = [
  { id: 'chat', icon: '💬', label: 'Chat', sub: 'easy, friendly' },
  { id: 'compliment', icon: '🌻', label: 'Compliment', sub: 'a kind word' },
  { id: 'joke', icon: '🎭', label: 'Tell a joke', sub: 'read the room' },
  { id: 'personal', icon: '📖', label: 'Ask about them', sub: 'their own story' },
  { id: 'gift', icon: '🎁', label: 'Give a gift', sub: 'bread or herbs' },
  { id: 'work', icon: '🛠', label: 'Ask for work', sub: 'earn coin' },
  { id: 'cards', icon: '🃏', label: 'Play cards', sub: '5◈ bet' },
  { id: 'flirt', icon: '💗', label: 'Flirt', sub: 'needs warmth' },
  { id: 'insult', icon: '🗯', label: 'Insult', sub: 'burn a bridge' },
  { id: 'court', icon: '🌹', label: 'Ask to court', sub: 'bond 45+' },
  { id: 'propose', icon: '💍', label: 'Propose', sub: 'courting, bond 70+' },
  { id: 'family', icon: '🕯', label: 'Talk of family', sub: '30◈' },
];
const MOODS = { happy: '😊', warm: '🙂', neutral: '😐', annoyed: '😒', angry: '😠', love: '😍', sad: '😔' };
const PERSONALITY_BARKS = {
  warm: { pos: ['That warms an old baker’s heart.', 'You’ve a gentle way about you.', 'Come by the oven anytime.'], neg: ['Oh. Well. That stings.', 'I’ll pretend I misheard that.', 'Some words are better left in the oven.'] },
  stern: { pos: ['Hm. Noted. That’s a good sign.', 'Steady words. I can respect that.', 'You’ll do fine here if you keep that up.'], neg: ['Watch your tongue in my town.', 'I’ll remember you said that.', 'That’s a quick way to make enemies.'] },
  curious: { pos: ['Fascinating. Say more.', 'Now that’s worth writing down.', 'You notice things. I like that.'], neg: ['How disappointing.', 'I expected better observation.', 'Curiosity closed for the day.'] },
  playful: { pos: ['Ha! You’re trouble. I like trouble.', 'Careful, I might start liking you.', 'That’s a winning hand, friend.'], neg: ['Ouch. Cold table.', 'I’ve had better bluffs.', 'Fold. And don’t come back on that note.'] },
  kind: { pos: ['There’s a good heart in you.', 'The Lantern’s always got a seat for you.', 'That means more than you know.'], neg: ['That wasn’t kind.', 'I’ll pour someone else the next one.', 'Words like that leave stains.'] },
  easygoing: { pos: ['Aye, that’s the spirit.', 'Good company makes the day shorter.', 'You’re all right, you are.'], neg: ['Easy now. No need for that.', 'I’ve mucked stalls for less.', 'Best cool your heels.'] },
};
function getRel(person) {
  if (!state.relationships[person.id]) state.relationships[person.id] = { bond: 0, met: false, courting: false, dates: 0 };
  return state.relationships[person.id];
}
function moodForBond(bond, delta) {
  if (delta <= -8) return 'angry';
  if (delta < 0) return 'annoyed';
  if (bond > 78) return 'love';
  if (delta > 6 || bond > 45) return 'happy';
  if (delta > 0) return 'warm';
  return 'neutral';
}
function deltaTone(d) { return d > 3 ? 'pos' : d < 0 ? 'neg' : ''; }

function npcActionAvailable(id, person) {
  const rel = getRel(person);
  if (id === 'gift') return itemCount('Bread') > 0 || itemCount('Herbs') > 0;
  if (id === 'work') return state.energy > 14;
  if (id === 'cards') return state.coins >= 5 && ['lute', 'elsa', 'orin'].includes(person.id);
  if (id === 'flirt') return rel.bond >= 15 && !state.spouse;
  if (id === 'court') return rel.bond >= 45 && !rel.courting && !state.spouse;
  if (id === 'propose') return rel.courting && rel.bond >= 70 && !state.spouse;
  if (id === 'family') return state.spouse === person.name && state.children < 2;
  if (id === 'personal') return true;
  return true;
}
function previewNpcAction(id, person) {
  const rel = getRel(person);
  const pers = person.personality;
  let d = 4;
  switch (id) {
    case 'chat': d = pers === 'warm' || pers === 'kind' ? 5 : pers === 'stern' ? 3 : 4; break;
    case 'compliment': d = pers === 'stern' ? 3 : 7; break;
    case 'joke': d = ['warm', 'playful', 'kind', 'easygoing'].includes(pers) ? 6 : -2; break;
    case 'personal': d = rel.met ? 3 : 6; break;
    case 'gift': d = 9; break;
    case 'work': d = 3; break;
    case 'cards': d = 3; break;
    case 'flirt': d = rel.bond > 40 ? 9 : 5; break;
    case 'insult': d = -13; break;
    case 'court': d = 8; break;
    case 'propose': d = rel.bond >= 70 ? 15 : -6; break;
    case 'family': d = 7; break;
  }
  const texts = {
    chat: `${person.name} settles in, ready to trade small talk. ${d > 3 ? 'A safe, warm choice.' : 'They’ll answer, briefly.'}`,
    compliment: d > 5 ? `Their expression softens — compliments land well. <b class="pos">+${d} bond</b>` : `A polite nod. Compliments aren’t their language. <b class="pos">+${d} bond</b>`,
    joke: d < 0 ? `Their brow furrows. This joke may not land. <b class="neg">${d} bond</b>` : `A smile tugs at the corner of their mouth. <b class="pos">+${d} bond</b>`,
    personal: rel.met ? `They’ll share a little more of themselves. <b class="pos">+${d} bond</b>` : `Their guard lowers. A story is waiting. <b class="pos">+${d} bond</b>`,
    gift: `They eye the gift, pleased. <b class="pos">+${d} bond</b> · gives one item`,
    work: `A fair day’s work, a few coins, and some respect. <b class="pos">+${d} bond</b> · −9 energy`,
    cards: `A friendly wager. Your luck is anyone’s guess. <b class="pos">+${d} bond</b> · −5◈`,
    flirt: rel.bond > 40 ? `Their cheeks colour. This is welcome. <b class="pos">+${d} bond</b>` : `Risky. They might laugh it off. <b class="pos">+${d} bond</b>`,
    insult: `Cruel words. They will remember this. <b class="neg">${d} bond</b> · −1 renown`,
    court: `You ask to court them properly. Their answer will matter. <b class="pos">+${d} bond</b>`,
    propose: `A ring, a question, a held breath. <b class="pos">+${d} bond</b>`,
    family: `A quiet conversation about a future with children. <b class="pos">+${d} bond</b> · −30◈`,
  };
  return { text: texts[id], tone: deltaTone(d), delta: d, mood: moodForBond(rel.bond, d) };
}
function resolveNpcAction(id, person) {
  const rel = getRel(person);
  const pers = person.personality;
  let d = previewNpcAction(id, person).delta;
  let bark = '';
  let extra = null;

  if (id === 'chat') {
    bark = `“${pick(person.personality === 'stern' ? ['Quiet day. Good day.', 'The road’s been kind enough.', 'Keep your boots dry and your nose clean.'] : ['The morning’s better for the company.', 'I was just thinking about supper.', 'The town’s been lively lately — mostly good-lively.'])}”`;
  } else if (id === 'compliment') {
    bark = `“${pick(['That’s kind of you to say.', 'Flattery will get you everywhere — almost.', 'Hm. I’ll take it.'])}”`;
  } else if (id === 'joke') {
    if (d < 0) bark = `“…Was that meant to be funny?”`;
    else bark = `“Ha! All right, that one’s going in my pocket.”`;
  } else if (id === 'personal') {
    bark = rel.met ? `“You asked before, but I’ll say it again — ${person.personal.replace(/^[A-Z][a-z]+ /, '').slice(0, 110)}”` : `“${person.personal}”`;
    rel.met = true;
  } else if (id === 'gift') {
    if (itemCount('Bread') > 0) { addItem('Bread', -1); bark = `“Fresh bread! You’ve made my whole week.”`; }
    else { addItem('Herbs', -1); bark = `“Herbs from the verge? Thoughtful. Thank you.”`; }
    d = 9;
  } else if (id === 'work') {
    const pay = 8 + Math.floor(Math.random() * 7);
    state.energy = clamp(state.energy - 9, 0, 100);
    giveCoins(pay, `You worked a shift for ${person.name}.`);
    addItem('Wood', 1);
    bark = `“Good hands. ${pay}◈, and take a bundle of kindling with it.”`;
    d = 3;
    extra = `+${pay}◈ · +1 Wood`;
  } else if (id === 'cards') {
    const win = Math.random() < .52;
    changeCoins(-5);
    if (win) { giveCoins(12, 'You win a hand of cards.'); bark = `“Beginner’s luck. Or a very good bluff. Again?”`; extra = '+12◈'; }
    else { bark = `“Read you like a book. Better luck next hand.”`; extra = '−5◈'; }
    d = 3;
  } else if (id === 'flirt') {
    if (rel.bond >= 40 || Math.random() < .5) { bark = `“Careful. I might start looking forward to your visits.”`; d = rel.bond >= 40 ? 9 : 7; }
    else { bark = `“You’re bold, I’ll give you that.”`; d = -2; }
  } else if (id === 'insult') {
    bark = `“${pick(PERSONALITY_BARKS[pers] ? PERSONALITY_BARKS[pers].neg : ['That was uncalled for.'])}”`;
    addRep(-1); addHonor(-1);
  } else if (id === 'court') {
    rel.courting = true;
    bark = `“I… yes. I’d like that. Walk with me after dusk sometime.”`;
    d = 8;
  } else if (id === 'propose') {
    if (rel.bond >= 70) {
      state.spouse = person.name;
      state.rep += 6;
      bark = `“Yes. A thousand times, yes.” The whole street will hear of it by supper.`;
      d = 15;
      extra = '♥ Betrothed';
    } else { bark = `“Not yet. Ask me again when we know each other better.”`; d = -4; }
  } else if (id === 'family') {
    if (state.coins >= 30) {
      changeCoins(-30);
      state.children = Math.min(2, state.children + 1);
      bark = `“A little one, under this roof? …I think I’d like that very much.”`;
      d = 7;
      extra = 'Family grows';
    } else { bark = `“When there’s coin enough for another mouth.”`; d = 0; }
  }
  rel.bond = clamp(rel.bond + d, -100, 100);
  if (!rel.met) { rel.met = true; }
  if (itemCount('Bread') < 0) state.items.Bread = 0;

  // meeting quest
  const met = Object.values(state.relationships).filter(r => r.met).length;
  if (met >= 2 && !state.quests.meet) {
    state.quests.meet = true;
    gainXP(2);
    setTimeout(() => toast('Quest complete — the town knows your face.'), 900);
  }
  return { bark, mood: moodForBond(rel.bond, d), delta: d, extra };
}

function portraitSVG(pers, isPlayer = false) {
  const pal = isPlayer ? {
    skin: state.appearance.skin, hair: state.appearance.hair, hairColor: state.appearance.hairColor,
    outfit: state.appearance.outfit, accent: '#e7c477', beard: state.appearance.beard
  } : pers.palette;
  const hair = pal.hair;
  let hairBack = '', hairFront = '';
  if (hair === 'long' || hair === 'braids') {
    hairBack = `<path d="M50 96 Q44 150 54 188 L82 180 Q70 146 74 100 Z" fill="${pal.hairColor}"/><path d="M150 96 Q156 150 146 188 L118 180 Q130 146 126 100 Z" fill="${pal.hairColor}"/>`;
  }
  if (hair === 'long') {
    hairFront = `<path d="M54 106 Q52 58 100 48 Q148 58 146 106 Q140 78 120 68 Q104 82 80 70 Q60 82 54 106 Z" fill="${pal.hairColor}"/>`;
  } else if (hair === 'braids') {
    hairFront = `<path d="M54 108 Q52 58 100 48 Q148 58 146 108 Q138 76 100 66 Q62 76 54 108 Z" fill="${pal.hairColor}"/>
      <rect x="45" y="116" width="15" height="58" rx="7" fill="${pal.hairColor}"/><rect x="140" y="116" width="15" height="58" rx="7" fill="${pal.hairColor}"/>
      <rect x="44" y="166" width="17" height="8" rx="3" fill="${pal.accent}"/><rect x="139" y="166" width="17" height="8" rx="3" fill="${pal.accent}"/>`;
  } else if (hair === 'short') {
    hairFront = `<path d="M54 106 Q50 56 100 48 Q150 56 146 106 Q140 80 118 72 Q104 88 78 74 Q60 84 54 106 Z" fill="${pal.hairColor}"/>`;
  } else if (hair === 'bun') {
    hairFront = `<path d="M54 106 Q50 56 100 48 Q150 56 146 106 Q138 78 100 70 Q62 80 54 106 Z" fill="${pal.hairColor}"/><circle cx="100" cy="38" r="18" fill="${pal.hairColor}"/>`;
  } else if (hair === 'wild') {
    hairFront = `<path d="M52 110 L44 78 L64 84 L58 52 L82 64 L88 40 L106 58 L120 38 L126 62 L150 52 L144 84 L158 82 L148 112 Q136 74 100 68 Q64 76 52 110 Z" fill="${pal.hairColor}"/>`;
  }
  let beard = '';
  if (pal.beard === 'full') beard = `<path d="M62 126 Q64 168 100 172 Q136 168 138 126 Q132 152 100 156 Q68 152 62 126 Z" fill="${pal.hairColor}"/>`;
  else if (pal.beard === 'stubble') beard = `<path d="M64 128 Q68 160 100 162 Q132 160 136 128 Q130 150 100 152 Q70 150 64 128 Z" fill="${pal.hairColor}" opacity=".45"/>`;
  else if (pal.beard === 'moustache') beard = `<path d="M86 132 Q100 128 114 132 Q108 138 100 136 Q92 138 86 132 Z" fill="${pal.hairColor}"/>`;

  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <radialGradient id="pg" cx="50%" cy="38%" r="62%"><stop offset="0%" stop-color="${pal.accent}" stop-opacity=".34"/><stop offset="100%" stop-color="#0b1411" stop-opacity="0"/></radialGradient>
      <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${pal.outfit}"/><stop offset="100%" stop-color="#1d2a22"/></linearGradient>
    </defs>
    <circle cx="100" cy="112" r="104" fill="url(#pg)"/>
    ${hairBack}
    <path d="M22 240 Q24 188 64 170 L136 170 Q176 188 178 240 Z" fill="url(#cloth)"/>
    <path d="M76 172 L100 202 L124 172" fill="none" stroke="${pal.accent}" stroke-width="5" opacity=".75"/>
    <rect x="89" y="142" width="22" height="34" rx="8" fill="${pal.skin}"/>
    <ellipse cx="57" cy="112" rx="10" ry="14" fill="${pal.skin}"/>
    <ellipse cx="143" cy="112" rx="10" ry="14" fill="${pal.skin}"/>
    <ellipse cx="100" cy="106" rx="47" ry="55" fill="${pal.skin}"/>
    <ellipse cx="100" cy="114" rx="43" ry="47" fill="${pal.skin}" opacity=".35"/>
    <ellipse cx="67" cy="128" rx="11" ry="6" fill="#d98f7e" opacity=".22"/>
    <ellipse cx="133" cy="128" rx="11" ry="6" fill="#d98f7e" opacity=".22"/>
    <!-- eyes -->
    <g class="eye">
      <ellipse cx="80" cy="108" rx="10" ry="6.4" fill="#f7f2e4"/>
      <circle cx="80" cy="108" r="4.4" fill="#3b4a36"/><circle cx="81.4" cy="106.6" r="1.5" fill="#fffaf0"/>
    </g>
    <g class="eye">
      <ellipse cx="120" cy="108" rx="10" ry="6.4" fill="#f7f2e4"/>
      <circle cx="120" cy="108" r="4.4" fill="#3b4a36"/><circle cx="121.4" cy="106.6" r="1.5" fill="#fffaf0"/>
    </g>
    <path d="M68 92 Q80 86 92 91" fill="none" stroke="${pal.hairColor}" stroke-width="4" stroke-linecap="round"/>
    <path d="M108 91 Q120 86 132 92" fill="none" stroke="${pal.hairColor}" stroke-width="4" stroke-linecap="round"/>
    <path d="M100 110 Q96 126 102 128" fill="none" stroke="#a97a63" stroke-width="2.6" stroke-linecap="round" opacity=".8"/>
    <path class="mouth" d="M88 137 Q100 145 112 137" fill="none" stroke="#8e5146" stroke-width="3.4" stroke-linecap="round"/>
    ${beard}
    ${hairFront}
    <circle cx="148" cy="130" r="3.4" fill="${pal.accent}"/>
  </svg>`;
}

let npcQueue = [], npcPlaying = false, npcSession = 0, barkTimer = null;
function openNpc(person) {
  if (!person) return;
  state.dialogOpen = true;
  state.currentNpc = person;
  npcSession++;
  npcQueue = [];
  npcPlaying = false;
  hideInteractions();
  const rel = getRel(person);
  const ui = $('npcUI');
  ui.hidden = false;
  $('npcName').textContent = person.name;
  $('npcRole').textContent = person.role + ' · ' + (rel.bond > 60 ? 'close friend' : rel.bond > 25 ? 'friendly' : rel.bond < -20 ? 'hostile' : 'acquaintance');
  $('npcPortrait').innerHTML = portraitSVG(person);
  $('npcPortrait').className = 'portrait';
  $('npcMood').textContent = MOODS[moodForBond(rel.bond, rel.met ? 1 : 3)] || '🙂';
  $('playerMini').innerHTML = portraitSVG(null, true);
  updateBondBar();
  $('npcBark').hidden = false;
  $('npcBark').textContent = rel.met ? pick(PERSONALITY_BARKS[person.personality].pos) : person.greeting;
  $('npcPreview').textContent = 'Choose an action. Their face will tell you how it lands.';
  buildNpcBubbles(person);
  renderNpcQueue();
  if (!rel.met) { rel.met = true; rel.bond = clamp(rel.bond + 1, -100, 100); }
  playBarkAnimation(3600);
  updateHUD(true);
  saveGame();
}
function buildNpcBubbles(person) {
  const wrap = $('npcBubbles');
  wrap.innerHTML = '';
  NPC_ACTIONS.filter(a => {
    if (['court', 'propose', 'family'].includes(a.id)) return npcActionAvailable(a.id, person);
    return true;
  }).forEach(a => {
    const b = document.createElement('button');
    b.className = 'bubble-btn' + (npcActionAvailable(a.id, person) ? '' : ' disabled');
    b.innerHTML = `<span class="bi">${a.icon}</span><span class="bl">${a.label}<small>${a.sub}</small></span>`;
    const showPreview = () => {
      const pv = previewNpcAction(a.id, person);
      $('npcPreview').innerHTML = pv.text;
      $('npcMood').textContent = MOODS[pv.mood] || '🙂';
      $('npcPortrait').className = 'portrait ' + (pv.mood === 'happy' || pv.mood === 'love' ? 'happy' : pv.mood === 'angry' || pv.mood === 'annoyed' ? 'angry' : '');
    };
    b.addEventListener('pointerenter', showPreview);
    b.addEventListener('focus', showPreview);
    b.addEventListener('click', () => {
      if (!npcActionAvailable(a.id, person)) {
        toast(a.id === 'work' ? 'Too tired for a shift.' : a.id === 'cards' ? 'You need 5◈ to sit at the table.' : 'Not yet — build more trust first.');
        return;
      }
      npcQueue.push(a.id);
      if (npcQueue.length > 5) { npcQueue.shift(); toast('The queue keeps its five most recent actions.'); }
      showPreview();
      $('npcBark').hidden = true;
      renderNpcQueue();
      if (!npcPlaying) playNpcQueue(person);
    });
    wrap.appendChild(b);
  });
}
function updateBondBar() {
  const person = state.currentNpc;
  if (!person) return;
  const rel = getRel(person);
  $('bondFill').style.width = `${clamp((rel.bond + 100) / 2, 0, 100)}%`;
  $('npcRole').textContent = person.role + ' · ' + (rel.bond > 60 ? 'close friend' : rel.bond > 25 ? 'friendly' : rel.bond < -20 ? 'hostile' : 'acquaintance');
}
function renderNpcQueue() {
  const q = $('npcQueue');
  q.innerHTML = npcQueue.length
    ? npcQueue.map(id => {
      const a = NPC_ACTIONS.find(x => x.id === id);
      return `<span class="q-chip">${a ? a.icon + ' ' + a.label : id}</span>`;
    }).join('')
    : '<span class="q-empty">Nothing queued. Pick a few actions — they’ll play out one by one.</span>';
}
function playNpcQueue(person) {
  if (npcPlaying) return;
  npcPlaying = true;
  const session = npcSession;
  const step = () => {
    if (session !== npcSession || state.currentNpc !== person) { npcPlaying = false; return; }
    const id = npcQueue.shift();
    renderNpcQueue();
    if (!id) { npcPlaying = false; return; }
    const res = resolveNpcAction(id, person);
    const portrait = $('npcPortrait');
    portrait.className = 'portrait talking ' + (res.mood === 'happy' || res.mood === 'love' ? 'happy' : res.mood === 'angry' || res.mood === 'annoyed' ? 'angry' : '');
    $('npcMood').textContent = MOODS[res.mood] || '🙂';
    const bark = $('npcBark');
    bark.hidden = false;
    bark.textContent = res.bark + (res.extra ? `  ·  ${res.extra}` : '');
    $('npcPreview').innerHTML = `<b class="${deltaTone(res.delta)}">${res.delta >= 0 ? '+' : ''}${res.delta} bond</b> · ${person.name} will remember that.`;
    updateBondBar();
    updateHUD(true);
    playBarkAnimation(2600);
    setTimeout(() => {
      if (session !== npcSession) return;
      portrait.classList.remove('talking');
      if (npcQueue.length) step();
      else npcPlaying = false;
    }, 1700);
  };
  step();
}
function playBarkAnimation(ms) {
  clearTimeout(barkTimer);
  barkTimer = setTimeout(() => {
    const bark = $('npcBark');
    if (bark) bark.hidden = true;
  }, ms);
}
function closeNpc() {
  $('npcUI').hidden = true;
  state.dialogOpen = false;
  state.currentNpc = null;
  npcQueue = [];
  npcPlaying = false;
  npcSession++;
  updateHUD(true);
  saveGame();
}

/* ---------------- MODALS / BUILDING MENUS ---------------- */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function openModal(html, handlers) {
  state.dialogOpen = true;
  hideInteractions();
  const modal = $('modal');
  modal.innerHTML = html;
  $('modalBackdrop').hidden = false;
  modal.querySelectorAll('[data-menu]').forEach(btn => {
    btn.onclick = () => {
      const fn = handlers && handlers[btn.dataset.menu];
      if (fn) fn();
      else toast('That path is closed for now.');
    };
  });
  modal.querySelectorAll('[data-close]').forEach(btn => { btn.onclick = closeModal; });
}
function closeModal() {
  $('modalBackdrop').hidden = true;
  $('modal').innerHTML = '';
  state.dialogOpen = false;
  updateHUD(true);
}
function menuClose() { return '<div class="menu-close"><button data-close>Close</button></div>'; }
function coinLine(n) { return `${n}◈`; }

function openBuilding(b) {
  const id = b.def.id;
  const def = b.def;
  const refresh = () => openBuilding(b);
  const restAtHome = () => {
    state.day++;
    state.hour = 7; state.minute = 0;
    state.health = state.maxHealth;
    state.energy = 100;
    state.hunger = Math.max(24, state.hunger - 12);
    state.fp = state.maxFp;
    toast('You sleep until morning. The cottage settles around you.');
    logMsg('Slept at the cottage.');
    closeModal();
    if (state.spouse) setTimeout(() => toast(`${state.spouse} is already up, tending the hearth.`), 1600);
    saveGame();
  };

  if (id === 'home') {
    const upgradeCost = 55 + state.homeLevel * 70;
    const farmLine = state.homeLevel === 0
      ? 'The old plot is choked with weeds. Clear it before you can plant.'
      : state.homeLevel === 1 ? 'Three tidy beds of turnips and beans.' : 'A proper little farm, fenced and watered.';
    openModal(`
      <div class="eyebrow">Home · ${state.homeLevel ? 'Cottage Lv ' + state.homeLevel : 'a fixer-upper'}</div>
      <h2>${state.homeLevel ? 'Your Cottage' : 'The Old Cottage'}</h2>
      <p class="sub">${escapeHtml(def.detail)} ${farmLine}</p>
      <div class="stat-grid">
        <div class="stat-line"><span>Cottage</span><b>${state.homeLevel} / 3</b></div>
        <div class="stat-line"><span>Household</span><b>${state.spouse ? escapeHtml(state.spouse) : 'just you'}${state.children ? ' +' + state.children : ''}</b></div>
      </div>
      <div class="menu-list">
        <button class="menu-btn" data-menu="rest"><span class="mi">🌙</span><div class="mt"><b>Sleep until morning</b><small>Restore vitality, energy and focus.</small></div></button>
        <button class="menu-btn" data-menu="mirror"><span class="mi">🪞</span><div class="mt"><b>Stand at the mirror</b><small>Change hair, face, body and clothes. Scars stay.</small></div></button>
        ${state.homeLevel === 0
          ? `<button class="menu-btn" data-menu="clear"><span class="mi">🌱</span><div class="mt"><b>Clear the overgrown plot</b><small>12◈ · begin your farm.</small></div></button>`
          : `<button class="menu-btn" data-menu="tend"><span class="mi">🥬</span><div class="mt"><b>Tend the crops</b><small>−6 energy · harvest turnips and herbs.</small></div></button>`}
        <button class="menu-btn" data-menu="upgrade" ${state.homeLevel >= 3 ? 'disabled' : ''}><span class="mi">🔨</span><div class="mt"><b>${state.homeLevel >= 3 ? 'Cottage fully restored' : 'Restore the cottage'}</b><small>${state.homeLevel >= 3 ? 'A warm, sturdy home.' : `${upgradeCost}◈ · +8 max vitality, a finer home`}</small></div></button>
        ${state.pet ? `<button class="menu-btn" data-menu="pet"><span class="mi">🐕</span><div class="mt"><b>Call your companion</b><small>Happiness ${Math.round(state.petHappiness)}% · play and feed.</small></div></button>` : ''}
        ${state.spouse ? `<button class="menu-btn" data-menu="family"><span class="mi">🕯</span><div class="mt"><b>Evening with ${escapeHtml(state.spouse)}</b><small>${state.children ? state.children + ' child' + (state.children > 1 ? 'ren' : '') + ' under this roof.' : 'Talk about starting a family.'}</small></div></button>` : ''}
      </div>
      <p class="note-line">${state.stall ? 'Your market stall brings in a few coins each morning.' : state.business ? 'Your business pays out each morning.' : 'A stall or business would bring in coin while you sleep.'}</p>
      ${menuClose()}
    `, {
      rest: restAtHome,
      mirror: () => { closeModal(); openMirror(); },
      clear: () => {
        if (state.coins < 12) return toast('You need 12◈ for seed and a borrowed scythe.');
        changeCoins(-12); state.homeLevel = 1; refreshSigns();
        featureMeshes.crops.visible = true;
        addItem('Turnip', 1);
        toast('You clear the weeds and plant the first row.');
        logMsg('Cleared the homestead plot.');
        refresh(); updateHUD(true); saveGame();
      },
      tend: () => {
        if (state.energy < 6) return toast('Too tired to bend over the beds.');
        state.energy -= 6;
        state.crops = (state.crops || 0) + 1;
        if (state.crops >= 2) {
          state.crops = 0;
          const turnips = 1 + state.homeLevel;
          addItem('Turnip', turnips);
          addItem('Herbs', 1);
          giveCoins(3, 'You sell a few spare turnips at the gate.');
          toast(`Harvest! +${turnips} Turnip, +1 Herbs, +3◈`);
          gainXP(1);
        } else {
          toast('You water and weed. The rows look happier already.');
        }
        refresh(); updateHUD(true); saveGame();
      },
      upgrade: () => {
        if (state.homeLevel >= 3) return;
        if (state.coins < upgradeCost) return toast(`That will take ${upgradeCost}◈.`);
        changeCoins(-upgradeCost);
        state.homeLevel++;
        state.maxHealth += 8; state.health = state.maxHealth;
        addRep(2);
        refreshSigns();
        toast(`The cottage is sturdier — level ${state.homeLevel}. Max vitality +8.`);
        logMsg(`Restored the cottage to level ${state.homeLevel}.`);
        refresh(); updateHUD(true); saveGame();
      },
      pet: () => {
        state.petHappiness = clamp(state.petHappiness + 12, 0, 100);
        state.energy = clamp(state.energy - 2, 0, 100);
        toast('Your companion thumps the floor and licks your hand.');
        refresh(); saveGame();
      },
      family: () => {
        if (state.children < 2 && state.coins >= 30) {
          changeCoins(-30); state.children++;
          toast(state.children === 1 ? 'A child joins the household. The cottage feels smaller — and warmer.' : 'Another little one. The roof will need raising one day.');
        } else if (state.children < 2) toast('Thirty coins would see another mouth fed.');
        else toast('Two children is plenty for one crooked cottage.');
        refresh(); updateHUD(true); saveGame();
      }
    });
    return;
  }

  if (id === 'bakery') {
    openModal(`
      <div class="eyebrow">Bakery · flour on every surface</div><h2>Mara’s Oven</h2>
      <p class="sub">${escapeHtml(def.detail)} The air is thick with yeast and woodsmoke.</p>
      <div class="menu-list">
        <button class="menu-btn" data-menu="shift"><span class="mi">🥖</span><div class="mt"><b>Work the morning ovens</b><small>−10 energy · 9–15◈ · Mara warms to you.</small></div></button>
        <button class="menu-btn" data-menu="bread"><span class="mi">🍞</span><div class="mt"><b>Buy a loaf — 3◈</b><small>Bread is welcome as a gift.</small></div></button>
        <button class="menu-btn" data-menu="loaf"><span class="mi">🍯</span><div class="mt"><b>Honey loaf — 6◈</b><small>Restores fullness and a little vitality.</small></div></button>
        <button class="menu-btn" data-menu="gossip"><span class="mi">🗣</span><div class="mt"><b>Trade gossip</b><small>A free rumor and a little renown.</small></div></button>
      </div>
      ${menuClose()}
    `, {
      shift: () => {
        if (state.energy < 10) return toast('You’re too tired to lift a peel.');
        state.energy -= 10;
        const pay = 9 + Math.floor(Math.random() * 7);
        giveCoins(pay, `You worked the bakery ovens (+${pay}◈).`);
        const rel = getRel(PEOPLE.find(p => p.id === 'mara'));
        rel.bond = clamp(rel.bond + 3, -100, 100);
        addItem('Bread', 1);
        toast(`Shift done — ${pay}◈ and a warm loaf.`);
        refresh(); updateHUD(true); saveGame();
      },
      bread: () => {
        if (state.coins < 3) return toast('Three coins, friend.');
        changeCoins(-3); addItem('Bread', 1); toast('One loaf, still warm.'); refresh(); saveGame();
      },
      loaf: () => {
        if (state.coins < 6) return toast('The honey loaf is six coins.');
        changeCoins(-6);
        state.hunger = clamp(state.hunger + 34, 0, 100);
        state.health = clamp(state.health + 8, 0, state.maxHealth);
        toast('Sticky, sweet, worth every coin.');
        refresh(); updateHUD(true); saveGame();
      },
      gossip: () => {
        addRep(1);
        toast(pick(['Mara says the miller’s son has been sleeping in the bakery loft.', 'Mara heard Orin turned away a stranger with a barrow-road accent.', 'Mara whispers that Tamsin pays for foxglove with old silver.']));
        refresh(); saveGame();
      }
    });
    return;
  }

  if (id === 'inn') {
    openModal(`
      <div class="eyebrow">The Lantern · warm beds, sharp cards</div><h2>The Lantern Inn</h2>
      <p class="sub">${escapeHtml(def.detail)} Elsa keeps the fire high and the questions low.</p>
      <div class="menu-list">
        <button class="menu-btn" data-menu="meal"><span class="mi">🍲</span><div class="mt"><b>Hot meal — 5◈</b><small>+45 fullness, +12 vitality, +10 energy.</small></div></button>
        <button class="menu-btn" data-menu="rest"><span class="mi">🛏</span><div class="mt"><b>Take a room — 4◈</b><small>Sleep warm, restore focus and vitality.</small></div></button>
        <button class="menu-btn" data-menu="cards"><span class="mi">🃏</span><div class="mt"><b>Sit at the card table</b><small>5◈ bet · double or nothing.</small></div></button>
        <button class="menu-btn" data-menu="drink"><span class="mi">🍺</span><div class="mt"><b>Cider — 2◈</b><small>Lifts the spirits. Slightly blurs the road.</small></div></button>
        <button class="menu-btn" data-menu="rumor"><span class="mi">👂</span><div class="mt"><b>Buy a rumor — 1◈</b><small>Renown and a thread worth pulling.</small></div></button>
        <button class="menu-btn" data-menu="work"><span class="mi">🧹</span><div class="mt"><b>Work the taproom</b><small>−12 energy · 10–16◈ · Elsa notes your effort.</small></div></button>
      </div>
      ${menuClose()}
    `, {
      meal: () => {
        if (state.coins < 5) return toast('Five coins for a hot meal.');
        changeCoins(-5);
        state.hunger = clamp(state.hunger + 45, 0, 100);
        state.health = clamp(state.health + 12, 0, state.maxHealth);
        state.energy = clamp(state.energy + 10, 0, 100);
        toast('Stew, bread, and a warm seat. Much better.');
        refresh(); updateHUD(true); saveGame();
      },
      rest: () => {
        if (state.coins < 4) return toast('Four coins for a bed.');
        changeCoins(-4);
        state.health = state.maxHealth; state.energy = 100; state.fp = state.maxFp;
        state.hour = 7; state.day++; state.minute = 0;
        toast('You sleep beneath a patchwork quilt and wake to bells.');
        closeModal(); saveGame();
      },
      cards: () => { closeModal(); openCards(); },
      drink: () => {
        if (state.coins < 2) return toast('Two coins for a cider.');
        changeCoins(-2);
        state.hunger = clamp(state.hunger + 6, 0, 100);
        addRep(1); addHonor(-1);
        toast(pick(['The cider is sharp and the songs are louder than they need to be.', 'You trade a toast with a carter. The world tilts pleasantly.', 'The fire is warm. You learn two names and forget one.']));
        refresh(); updateHUD(true); saveGame();
      },
      rumor: () => {
        if (state.coins < 1) return toast('A rumor is one coin.');
        changeCoins(-1); addRep(2);
        toast(pick(['A hooded buyer has been asking after the standing stones.', 'The barrow road is watched — but not by the town watch.', 'Someone is buying up old deeds near the creek.']));
        refresh(); updateHUD(true); saveGame();
      },
      work: () => {
        if (state.energy < 12) return toast('You can barely lift a tankard.');
        state.energy -= 12;
        const pay = 10 + Math.floor(Math.random() * 7);
        giveCoins(pay, `You worked the Lantern taproom (+${pay}◈).`);
        const rel = getRel(PEOPLE.find(p => p.id === 'elsa'));
        rel.bond = clamp(rel.bond + 3, -100, 100);
        toast(`A long shift, ${pay}◈ and a bowl of stew.`);
        refresh(); updateHUD(true); saveGame();
      }
    });
    return;
  }

  if (id === 'shop') {
    const w = WEAPONS[state.weapon];
    openModal(`
      <div class="eyebrow">Market & Guildhall · coin changes hands</div><h2>Market &amp; Guildhall</h2>
      <p class="sub">${escapeHtml(def.detail)} A guild noticeboard leans by the door, thick with bounties.</p>
      <div class="stat-grid">
        <div class="stat-line"><span>Weapon</span><b>${w.name} (+${w.bonus})</b></div>
        <div class="stat-line"><span>Renown</span><b>${state.rep}</b></div>
      </div>
      <div class="menu-list">
        ${state.weapon < WEAPONS.length - 1 ? `<button class="menu-btn" data-menu="weapon"><span class="mi">⚔</span><div class="mt"><b>${WEAPONS[state.weapon + 1].name} — ${WEAPONS[state.weapon + 1].cost}◈</b><small>Attack +${WEAPONS[state.weapon + 1].bonus}. Better steel, better odds.</small></div></button>` : ''}
        <button class="menu-btn" data-menu="supplies"><span class="mi">📦</span><div class="mt"><b>Builder’s bundle — 12◈</b><small>+2 Wood, +2 Stone for the homestead.</small></div></button>
        <button class="menu-btn" data-menu="wardrobe"><span class="mi">🧥</span><div class="mt"><b>Browse the wardrobe</b><small>Clothes change how the town sees you.</small></div></button>
        <button class="menu-btn" data-menu="stall" ${state.stall ? 'disabled' : ''}><span class="mi">🏪</span><div class="mt"><b>${state.stall ? 'Your stall is running' : 'Buy a market stall — 150◈'}</b><small>${state.stall ? 'A few coins arrive each morning.' : 'Income while you sleep. Renown +5.'}</small></div></button>
        <button class="menu-btn" data-menu="sell"><span class="mi">🌿</span><div class="mt"><b>Sell herbs &amp; turnips</b><small>Herbs 4◈ · Turnips 6◈.</small></div></button>
        <button class="menu-btn" data-menu="watch"><span class="mi">🛡</span><div class="mt"><b>Take a guild watch shift</b><small>−12 energy · 12◈ · renown +2.</small></div></button>
        <button class="menu-btn" data-menu="bounty"><span class="mi">☠</span><div class="mt"><b>Take a bounty</b><small>Hunt something on the barrow road.</small></div></button>
      </div>
      ${menuClose()}
    `, {
      weapon: () => {
        const next = WEAPONS[state.weapon + 1];
        if (state.coins < next.cost) return toast(`That blade costs ${next.cost}◈.`);
        changeCoins(-next.cost);
        state.weapon++;
        toast(`${next.name} acquired. Attack +${next.bonus}.`);
        logMsg(`Bought ${next.name}.`);
        refresh(); updateHUD(true); saveGame();
      },
      supplies: () => {
        if (state.coins < 12) return toast('Twelve coins for the bundle.');
        changeCoins(-12); addItem('Wood', 2); addItem('Stone', 2);
        toast('Two bundles of wood, two sacks of stone.');
        refresh(); saveGame();
      },
      wardrobe: () => { closeModal(); openWardrobe(); },
      stall: () => {
        if (state.stall) return;
        if (state.coins < 150) return toast('The guild wants 150◈ for a stall licence.');
        changeCoins(-150); state.stall = true; state.job = 'Stallholder · Brackenridge market';
        addRep(5); addHonor(2);
        toast('The stall is yours. Coins will find you each morning.');
        logMsg('Bought a market stall.');
        refresh(); updateHUD(true); saveGame();
      },
      sell: () => {
        const herbs = itemCount('Herbs'), turnips = itemCount('Turnip');
        if (!herbs && !turnips) return toast('Nothing in the satchel to sell.');
        const gain = herbs * 4 + turnips * 6;
        state.items.Herbs = 0; state.items.Turnip = 0;
        giveCoins(gain, `Sold herbs and turnips (+${gain}◈).`);
        toast(`Sold ${herbs} herbs and ${turnips} turnips for ${gain}◈.`);
        refresh(); updateHUD(true); saveGame();
      },
      watch: () => {
        if (state.energy < 12) return toast('You haven’t the legs for a watch shift.');
        state.energy -= 12;
        giveCoins(12, 'You walked a guild watch shift (+12◈).');
        addRep(2);
        toast('A quiet patrol. Orin nods at you on the corner.');
        refresh(); updateHUD(true); saveGame();
      },
      bounty: () => {
        closeModal();
        const m = mobs.find(mb => mb.alive);
        if (!m) return toast('The board is empty. The roads are quiet.');
        toast(`Bounty taken: ${m.def.name}.`);
        setTimeout(() => startCombat(m, true), 450);
      }
    });
    return;
  }

  if (id === 'herbalist') {
    openModal(`
      <div class="eyebrow">Foxglove Remedies · mint and smoke</div><h2>Foxglove Remedies</h2>
      <p class="sub">${escapeHtml(def.detail)} Bunches of drying herbs hang from every beam.</p>
      <div class="menu-list">
        <button class="menu-btn" data-menu="potion"><span class="mi">🧪</span><div class="mt"><b>Healing tonic — 8◈</b><small>Restore 30 vitality.</small></div></button>
        <button class="menu-btn" data-menu="herbs"><span class="mi">🌿</span><div class="mt"><b>Buy dried herbs — 3◈</b><small>+2 herbs for gifts and trade.</small></div></button>
        <button class="menu-btn" data-menu="work"><span class="mi">⚗</span><div class="mt"><b>Help at the counter</b><small>−8 energy · 8–14◈ · Tamsin shares a secret.</small></div></button>
        <button class="menu-btn" data-menu="sell"><span class="mi">💚</span><div class="mt"><b>Sell wild herbs (5◈ each)</b><small>Tamsin pays better than the guild.</small></div></button>
      </div>
      ${menuClose()}
    `, {
      potion: () => {
        if (state.coins < 8) return toast('Eight coins for the tonic.');
        changeCoins(-8);
        state.health = clamp(state.health + 30, 0, state.maxHealth);
        toast('Bitter, then warm. Your wounds close a little.');
        refresh(); updateHUD(true); saveGame();
      },
      herbs: () => {
        if (state.coins < 3) return toast('Three coins for a bundle.');
        changeCoins(-3); addItem('Herbs', 2);
        toast('Two bundles of dried herbs.');
        refresh(); saveGame();
      },
      work: () => {
        if (state.energy < 8) return toast('You’re too tired to sort leaves.');
        state.energy -= 8;
        const pay = 8 + Math.floor(Math.random() * 7);
        giveCoins(pay, `You helped at Foxglove Remedies (+${pay}◈).`);
        const rel = getRel(PEOPLE.find(p => p.id === 'tamsin'));
        rel.bond = clamp(rel.bond + 2, -100, 100);
        toast(pick([`${pay}◈, and Tamsin tells you foxglove blooms out of season.`, `${pay}◈ for your trouble. The old stones are older than the town, she says.`]));
        refresh(); updateHUD(true); saveGame();
      },
      sell: () => {
        const n = itemCount('Herbs');
        if (!n) return toast('No herbs in the satchel.');
        state.items.Herbs = 0;
        giveCoins(n * 5, `Sold herbs to Tamsin (+${n * 5}◈).`);
        toast(`Sold ${n} herbs for ${n * 5}◈.`);
        refresh(); updateHUD(true); saveGame();
      }
    });
    return;
  }

  if (id === 'stable') {
    openModal(`
      <div class="eyebrow">Ashford Stables · hay and warm breath</div><h2>Ashford Stables</h2>
      <p class="sub">${escapeHtml(def.detail)} Bryn is mucking out a stall and talking softly to a nervous mare.</p>
      <div class="menu-list">
        ${state.pet ? `<button class="menu-btn" data-menu="play"><span class="mi">🐕</span><div class="mt"><b>Play with your companion</b><small>Happiness ${Math.round(state.petHappiness)}%.</small></div></button>
        <button class="menu-btn" data-menu="feed"><span class="mi">🍖</span><div class="mt"><b>Buy a good meal — 2◈</b><small>+18 pet happiness.</small></div></button>`
        : `<button class="menu-btn" data-menu="adopt"><span class="mi">🐕</span><div class="mt"><b>Adopt a stray — 45◈</b><small>A dog with one ear and a good heart.</small></div></button>`}
        <button class="menu-btn" data-menu="work"><span class="mi">🐴</span><div class="mt"><b>Muck out the stalls</b><small>−10 energy · 9–15◈ · Bryn’s respect.</small></div></button>
        <button class="menu-btn" data-menu="ride"><span class="mi">🌄</span><div class="mt"><b>Ask about the barrow road</b><small>Bryn knows the quiet paths.</small></div></button>
      </div>
      ${menuClose()}
    `, {
      adopt: () => {
        if (state.pet) return;
        if (state.coins < 45) return toast('Forty-five coins, and the dog is yours.');
        changeCoins(-45); state.pet = true; state.petHappiness = 75; state.petLevel = 1;
        addRep(2);
        toast('A dog with one ear follows you home. You have a companion.');
        logMsg('Adopted a dog from Ashford Stables.');
        refresh(); updateHUD(true); saveGame();
      },
      play: () => {
        state.petHappiness = clamp(state.petHappiness + 12, 0, 100);
        state.energy = clamp(state.energy - 2, 0, 100);
        toast('You play fetch in the yard until you are both out of breath.');
        refresh(); saveGame();
      },
      feed: () => {
        if (state.coins < 2) return toast('Two coins for a good meal.');
        changeCoins(-2); state.petHappiness = clamp(state.petHappiness + 18, 0, 100);
        toast('Your companion eats like a small wolf.');
        refresh(); saveGame();
      },
      work: () => {
        if (state.energy < 10) return toast('Too tired for a pitchfork.');
        state.energy -= 10;
        const pay = 9 + Math.floor(Math.random() * 7);
        giveCoins(pay, `You worked the stables (+${pay}◈).`);
        const rel = getRel(PEOPLE.find(p => p.id === 'bryn'));
        rel.bond = clamp(rel.bond + 3, -100, 100);
        toast(`A good day’s work — ${pay}◈ and the smell of hay.`);
        refresh(); updateHUD(true); saveGame();
      },
      ride: () => {
        addRep(1);
        toast('Bryn says the barrow road is watched. “Keep your blade loose, friend.”');
        refresh();
      }
    });
    return;
  }
}

function openCards() {
  const suits = [['♠', 'Spades', '#cfd6cb'], ['♥', 'Hearts', '#e28d7e'], ['♦', 'Diamonds', '#e7c477'], ['♣', 'Clubs', '#a9c79a']];
  const html = `
    <div class="eyebrow">The Lantern · card table</div><h2>Five-card bluff</h2>
    <p class="sub">Stake 5◈. Pick a suit — the dealer draws one card. Match it and the pot is yours. Lute is watching from the corner.</p>
    <div class="menu-list">${suits.map(s => `<button class="menu-btn" data-menu="card-${s[1]}"><span class="mi" style="color:${s[2]}">${s[0]}</span><div class="mt"><b>${s[1]}</b><small>Match the dealer’s card · win 12◈</small></div></button>`).join('')}</div>
    <p class="note-line" id="cardResult"></p>
    ${menuClose()}
  `;
  const handlers = {};
  suits.forEach(s => {
    handlers[`card-${s[1]}`] = () => {
      if (state.coins < 5) { toast('You need 5◈ to ante up.'); return; }
      changeCoins(-5);
      const draw = suits[Math.floor(Math.random() * 4)];
      const win = draw[0] === s[0];
      if (win) giveCoins(12, 'You win at the card table.');
      $('cardResult').innerHTML = win
        ? `Dealer turns <b style="color:${draw[2]}">${draw[0]} ${draw[1]}</b> — a match! <span class="pos">+12◈</span>`
        : `Dealer turns <b style="color:${draw[2]}">${draw[0]} ${draw[1]}</b>. Your ${s[0]} ${s[1]} loses the pot. <span class="neg">−5◈</span>`;
      updateHUD(true);
      saveGame();
    };
  });
  openModal(html, handlers);
}

function openWardrobe() {
  state.outfitsOwned = state.outfitsOwned || [OUTFITS[0].name];
  const prices = [0, 35, 30, 40, 45];
  const rows = OUTFITS.map((o, i) => {
    const owned = state.outfitsOwned.includes(o.name);
    const worn = state.attire === o.name;
    return `<button class="menu-btn" data-menu="outfit-${i}" ${worn ? 'disabled' : ''}><span class="mi" style="color:${o.color}">${worn ? '✓' : '🧵'}</span><div class="mt"><b>${o.name}</b><small>${worn ? 'Currently wearing' : owned ? 'Owned · put it on' : `${prices[i]}◈ · rep ${o.rep >= 0 ? '+' : ''}${o.rep}`}</small></div></button>`;
  }).join('');
  openModal(`
    <div class="eyebrow">The wardrobe · cloth makes the person</div><h2>What will the town see?</h2>
    <p class="sub">A fine coat opens doors. Leathers close them — sometimes usefully. Scars, once earned, remain.</p>
    <div class="stat-grid">
      <div class="stat-line"><span>Attire</span><b>${escapeHtml(state.attire)}</b></div>
      <div class="stat-line"><span>Scars</span><b>${state.scars || 0}</b></div>
    </div>
    <div class="menu-list">${rows}
      <button class="menu-btn" data-menu="mirror"><span class="mi">🪞</span><div class="mt"><b>Face &amp; body mirror</b><small>Change everything else about your appearance.</small></div></button>
    </div>
    ${menuClose()}
  `, Object.fromEntries(OUTFITS.map((o, i) => [`outfit-${i}`, () => {
    const owned = state.outfitsOwned.includes(o.name);
    if (!owned) {
      if (state.coins < prices[i]) return toast(`That costs ${prices[i]}◈.`);
      changeCoins(-prices[i]);
      state.outfitsOwned.push(o.name);
    }
    state.attire = o.name;
    state.appearance.outfit = o.color;
    addRep(o.rep);
    rebuildPlayer(); refreshSigns();
    toast(`${o.name} — the town will notice.`);
    logMsg(`Changed into ${o.name}.`);
    updateHUD(true); saveGame();
    openWardrobe();
  }]).concat([['mirror', () => { closeModal(); openMirror(); }]])));
}

function openMirror() {
  openModal(`
    <div class="eyebrow">The mirror · a face is a story</div><h2>Change what you see</h2>
    <p class="sub">Hair grows back, clothes can be changed, and a scar is a chapter you keep. Changes apply immediately.</p>
    <div class="custom-fields" id="mirrorFields"></div>
    <p class="note-line">Scars earned in death: <b>${state.scars || 0}</b></p>
    ${menuClose()}
  `, {});
  renderCreator($('mirrorFields'));
}

function openJournal() {
  const entries = state.log.length ? state.log.slice(0, 9).map(t => `<div class="stat-line"><span>${escapeHtml(t)}</span></div>`).join('') : '<p class="note-line">The pages are blank. Go make something happen.</p>';
  const quests = [
    ['Meet the townsfolk', state.quests.meet, 'Speak with two people.'],
    ['Gather wild herbs', state.quests.forage, 'Bring back three herb patches.'],
    ['Earn an honest coin', state.quests.work, 'Take a shift or sell 20◈ of goods.'],
  ].map(([t, done, hint]) => `<div class="stat-line"><span>${done ? '✓' : '◇'} ${t}</span><b>${done ? 'done' : hint}</b></div>`).join('');
  openModal(`
    <div class="eyebrow">Journal · ${dateText()}</div><h2>A life in Brackenridge</h2>
    <p class="sub">Level ${state.level} · ${state.xp} / ${state.level * 9} xp · ${state.coins}◈ · ${state.honor} honor · ${state.rep} renown</p>
    <div class="stat-grid">${quests}</div>
    <div class="eyebrow" style="margin-top:12px">Recent pages</div>
    <div class="rel-list">${entries}</div>
    ${menuClose()}
  `, {});
}

function openStatus() {
  const rels = Object.keys(state.relationships).length
    ? Object.values(state.relationships).map(r => {
      const p = PEOPLE.find(x => x.id === Object.keys(state.relationships).find(k => state.relationships[k] === r));
      return '';
    }).join('')
    : '';
  const rows = Object.entries(state.relationships).map(([id, r]) => {
    const p = PEOPLE.find(x => x.id === id);
    if (!p) return '';
    const pct = clamp((r.bond + 100) / 2, 0, 100);
    return `<div class="rel-row"><span>${escapeHtml(p.name)}</span><div class="rbar"><i style="width:${pct}%"></i></div><span>${r.bond > 0 ? '+' : ''}${Math.round(r.bond)}</span></div>`;
  }).join('') || '<p class="note-line">You haven’t met anyone properly yet.</p>';
  openModal(`
    <div class="eyebrow">Status · ${escapeHtml(state.appearance.name)}</div><h2>Who you are so far</h2>
    <p class="sub">${state.job}${state.spouse ? ' · married to ' + escapeHtml(state.spouse) : ''}${state.children ? ' · ' + state.children + ' child' + (state.children > 1 ? 'ren' : '') : ''}${state.pet ? ' · a dog at home' : ''}</p>
    <div class="stat-grid">
      <div class="stat-line"><span>Level</span><b>${state.level}</b></div>
      <div class="stat-line"><span>Vitality</span><b>${Math.round(state.health)} / ${state.maxHealth}</b></div>
      <div class="stat-line"><span>Honor</span><b>${state.honor}</b></div>
      <div class="stat-line"><span>Renown</span><b>${state.rep}</b></div>
      <div class="stat-line"><span>Wanted</span><b>${state.wanted > 0 ? state.wanted + ' stars' : 'clean'}</b></div>
      <div class="stat-line"><span>Cottage</span><b>Lv ${state.homeLevel}</b></div>
      <div class="stat-line"><span>Weapon</span><b>${WEAPONS[state.weapon].name}</b></div>
      <div class="stat-line"><span>Attire</span><b>${escapeHtml(state.attire)}</b></div>
    </div>
    <div class="eyebrow">Bonds</div>
    <div class="rel-list">${rows}</div>
    <p class="note-line">Love and hate both count. A bond below zero makes conversations brittle — and bounties more likely to find you.</p>
    ${menuClose()}
  `, {});
}

/* ---------------- CHARACTER CREATOR ---------------- */
const SKIN_COLORS = ['#f3d0b0', '#e5b58e', '#d2a077', '#b57f56', '#8e5f3e', '#63412c'];
const HAIR_COLORS = ['#241b16', '#4a2f1f', '#5b3a24', '#8a5a34', '#b07b43', '#d9b16f', '#8a3636', '#c9c1b4'];
const OUTFIT_COLORS = ['#b98d4f', '#8e6d3c', '#4c4038', '#6f8a54', '#8e4f4a', '#4d6878', '#7b4a66'];
function renderCreator(container) {
  if (!container) return;
  const a = state.appearance;
  const seg = (attr, values, labels) => `<div class="seg" data-attr="${attr}">${values.map((v, i) => `<button data-val="${v}" class="${a[attr] === v ? 'on' : ''}">${labels ? labels[i] : v}</button>`).join('')}</div>`;
  const swatches = (attr, colors) => `<div class="swatches" data-attr="${attr}">${colors.map(c => `<button class="sw" data-val="${c}" style="background:${c}" aria-label="${c}" class="${a[attr] === c ? 'on' : ''}"></button>`).join('')}</div>`;
  container.innerHTML = `
    <div class="field wide"><label>Name</label><input id="cName" maxlength="22" value="${escapeHtml(a.name)}" autocomplete="off"></div>
    <div class="field"><label>Sex</label>${seg('sex', ['woman', 'man', 'androgynous'], ['Woman', 'Man', 'Androgynous'])}</div>
    <div class="field"><label>Build</label>${seg('build', ['slim', 'average', 'broad'], ['Slim', 'Average', 'Broad'])}</div>
    <div class="field wide"><label>Skin</label>${swatches('skin', SKIN_COLORS)}</div>
    <div class="field"><label>Hair</label>${seg('hair', ['short', 'long', 'braids', 'bun', 'wild', 'bald'], ['Short', 'Long', 'Braids', 'Bun', 'Wild', 'Bald'])}</div>
    <div class="field"><label>Beard</label>${seg('beard', ['none', 'stubble', 'moustache', 'full'], ['None', 'Stubble', 'Moustache', 'Full'])}</div>
    <div class="field wide"><label>Hair colour</label>${swatches('hairColor', HAIR_COLORS)}</div>
    <div class="field wide"><label>Clothes</label>${swatches('outfit', OUTFIT_COLORS)}</div>
  `;
  const nameInput = container.querySelector('#cName');
  nameInput.addEventListener('input', () => {
    state.appearance.name = nameInput.value.slice(0, 22) || 'Alder Rowan';
    updateHUD(true);
  });
  container.onclick = e => {
    const btn = e.target.closest('button[data-val]');
    if (!btn) return;
    const group = btn.parentElement;
    const attr = group.dataset.attr;
    const val = btn.dataset.val;
    state.appearance[attr] = val;
    group.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
    if (attr === 'outfit') {
      const match = OUTFITS.find(o => o.color === val);
      if (match) state.attire = match.name;
    }
    rebuildPlayer();
    updateHUD(true);
    if (state.started) saveGame();
  };
}

/* ---------------- TURN-BASED COMBAT ---------------- */
const combat = {
  active: false, busy: false, token: 0, turn: 'player', round: 1,
  enemies: [], selected: 0, mob: null, bounty: false,
  playerModel: null, playerBase: { x: -2.25, z: 0 }, playerLungeT: 0,
  camInit: false, mg: { active: false, pos: 0, dir: 1, speed: .9, power: false },
  block: { active: false, start: 0, tapped: false, at: 0, dmg: 0, enemy: null, done: null },
  light: null, defeat: false
};

function clearCombatStage() {
  while (combatStage.children.length) {
    const c = combatStage.children[combatStage.children.length - 1];
    combatStage.remove(c);
  }
}
function buildCombatStage() {
  clearCombatStage();
  worldGroup.visible = false;
  combatStage.visible = true;
  scene.background = new THREE.Color('#1d3038');
  scene.fog.color.set('#1d3038');
  scene.fog.near = 16; scene.fog.far = 46;
  combat.camInit = false;

  const floorMat = new THREE.MeshStandardMaterial({ map: grassTex, color: '#b9cba5', roughness: 1 });
  const top = new THREE.Mesh(new THREE.CircleGeometry(6.4, 32), floorMat);
  top.rotation.x = -Math.PI / 2; top.position.y = .02; top.receiveShadow = true; combatStage.add(top);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 6.7, .8, 28), new THREE.MeshStandardMaterial({ color: '#4c3e2d', roughness: 1, flatShading: true }));
  rim.position.y = -.42; rim.receiveShadow = true; rim.castShadow = true; combatStage.add(rim);

  // paper backdrop hills and trees
  const backMat = new THREE.MeshBasicMaterial({ color: '#2e4b4b' });
  const midMat = new THREE.MeshStandardMaterial({ color: '#3c5d4b', roughness: 1, flatShading: true });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(34, 16), backMat);
  back.position.set(0, 6, -9); combatStage.add(back);
  for (let i = 0; i < 9; i++) {
    const h = rnd(3, 8);
    const hill = new THREE.Mesh(new THREE.ConeGeometry(rnd(1.6, 3.2), h, 5), midMat);
    hill.position.set(-12 + i * 3 + rnd(-1, 1), h / 2 - .4, -7.2 + rnd(-.6, .6));
    hill.rotation.y = rnd(0, 3); hill.receiveShadow = true; combatStage.add(hill);
  }
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture('rgba(255,246,205,.95)', 'rgba(255,235,170,0)'), transparent: true, depthWrite: false }));
  moon.scale.set(7, 7, 1); moon.position.set(6.5, 9, -8); combatStage.add(moon);

  // lantern posts flanking the stage
  const postMat = new THREE.MeshStandardMaterial({ color: '#4a3f31', roughness: 1 });
  for (const x of [-5.2, 5.2]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 3.2, 6), postMat);
    pole.position.set(x, 1.6, -1.4); pole.castShadow = true; combatStage.add(pole);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffe2a0', emissive: '#f5bd51', emissiveIntensity: 2 }));
    glow.position.set(x, 3.3, -1.4); combatStage.add(glow);
  }

  if (!combat.light) {
    combat.light = new THREE.PointLight('#ffdda0', 7, 20, 2);
    scene.add(combat.light);
  }
  combat.light.visible = true;
  combat.light.position.set(0, 5.5, 4.5);

  // player
  combat.playerModel = createCharacter({ ...state.appearance, pack: true });
  combat.playerModel.position.set(combat.playerBase.x, 0, combat.playerBase.z);
  combat.playerModel.rotation.y = Math.PI / 2;
  combat.playerModel.scale.setScalar(.98);
  combatStage.add(combat.playerModel);

  // enemies
  combat.enemies.forEach((e, i) => {
    const n = combat.enemies.length;
    e.model = buildMobModel({ type: e.type, scale: 1 });
    e.baseX = 2.4 + (i % 2) * .45;
    e.baseZ = (i - (n - 1) / 2) * 1.25;
    e.model.position.set(e.baseX, 0, e.baseZ);
    e.model.rotation.y = -Math.PI / 2;
    e.model.scale.setScalar(.92 * (combat.mob.def.scale || 1));
    e.lungeT = 0; e.hitT = 0;
    combatStage.add(e.model);
  });
}

function makeCombatEnemies(mob) {
  const n = Math.max(1, mob.def.group);
  const list = [];
  for (let i = 0; i < n; i++) {
    const suffix = n > 1 ? ' ' + String.fromCharCode(65 + i) : '';
    list.push({
      name: mob.def.name + suffix,
      type: mob.def.type,
      hp: Math.round(mob.def.baseHp * (.85 + state.level * .16) * (i === 0 ? 1 : .86)),
      maxHp: 0,
      atk: Math.max(2, Math.round(mob.def.baseAtk + state.level * .55 - i)),
      alive: true,
      coins: Math.round(mob.def.coins / n),
      xp: Math.max(1, Math.ceil(mob.def.xp / n)),
    });
  }
  list.forEach(e => e.maxHp = e.hp);
  return list;
}

function startCombat(mob, bounty = false) {
  if (combat.active || !mob || !mob.alive) return;
  combat.active = true;
  combat.busy = false;
  combat.token++;
  combat.mob = mob;
  combat.bounty = bounty;
  combat.turn = 'player';
  combat.round = 1;
  combat.selected = 0;
  combat.defeat = false;
  combat.mg.active = false;
  combat.block.active = false;
  combat.enemies = makeCombatEnemies(mob);
  state.dialogOpen = true;
  hideInteractions();
  document.body.classList.add('combat-mode');
  $('combatUI').hidden = false;
  $('combatResult').hidden = true;
  $('timingUI').hidden = true;
  $('blockUI').hidden = true;
  buildCombatStage();
  renderEnemyCards();
  updateCombatHUD();
  setCombatLog(`A ${mob.def.name.toLowerCase()}${combat.enemies.length > 1 ? ' pack' : ''} bars the way.`);
  $('turnBanner').textContent = 'YOUR TURN';
  resetCombatActions();
  $('fade').classList.add('on');
  setTimeout(() => $('fade').classList.remove('on'), 360);
  logMsg(`Combat: ${mob.def.name}${combat.enemies.length > 1 ? ' ×' + combat.enemies.length : ''}.`);
  playerTurn();
}
function playerTurn() {
  if (!combat.active) return;
  combat.turn = 'player';
  combat.busy = false;
  state.fp = clamp(state.fp + 1, 0, state.maxFp);
  $('turnBanner').textContent = 'YOUR TURN';
  setCombatLog(`Round ${combat.round} — choose your move.`);
  resetCombatActions();
  updateCombatHUD();
}
function resetCombatActions() {
  const btns = document.querySelectorAll('#combatActions button');
  btns.forEach(b => {
    const act = b.dataset.act;
    b.disabled = act === 'power' ? state.fp < 3 : act === 'mend' ? state.fp < 4 : false;
  });
}
function renderEnemyCards() {
  const wrap = $('enemyCards');
  wrap.innerHTML = '';
  combat.enemies.forEach((e, i) => {
    const btn = document.createElement('button');
    btn.className = 'enemy-card' + (i === combat.selected && e.alive ? ' sel' : '') + (e.alive ? '' : ' dead');
    btn.innerHTML = `<b>${escapeHtml(e.name)}<span>${Math.max(0, e.hp)}/${e.maxHp}</span></b><div class="ebar"><i style="width:${clamp(e.hp / e.maxHp, 0, 1) * 100}%"></i></div><small>${e.alive ? 'atk ' + e.atk : 'down'}</small>`;
    btn.onclick = () => {
      if (!e.alive) return;
      combat.selected = i;
      renderEnemyCards();
    };
    wrap.appendChild(btn);
  });
}
function firstAliveEnemy() {
  const sel = combat.enemies[combat.selected];
  if (sel && sel.alive) return combat.enemies[combat.selected];
  const idx = combat.enemies.findIndex(e => e.alive);
  if (idx >= 0) combat.selected = idx;
  return idx >= 0 ? combat.enemies[idx] : null;
}
function updateCombatHUD() {
  $('combatName').textContent = (state.appearance.name || 'Alder').split(' ')[0];
  $('combatHpText').textContent = `${Math.max(0, Math.round(state.health))} / ${state.maxHealth}`;
  $('combatHp').style.width = `${clamp(state.health / state.maxHealth, 0, 1) * 100}%`;
  $('combatFpText').textContent = `${state.fp} / ${state.maxFp}`;
  $('combatFp').style.width = `${clamp(state.fp / state.maxFp, 0, 1) * 100}%`;
  resetCombatActions();
}
function setCombatLog(text) { $('combatLog').textContent = text; }

function combatAction(act) {
  if (!combat.active || combat.busy || combat.defeat || combat.turn !== 'player') return;
  if (act === 'attack') {
    combat.busy = true;
    startTiming(false);
  } else if (act === 'power') {
    if (state.fp < 3) return toast('Not enough focus.');
    state.fp -= 3;
    combat.busy = true;
    updateCombatHUD();
    startTiming(true);
  } else if (act === 'mend') {
    if (state.fp < 4) return toast('Not enough focus.');
    state.fp -= 4;
    combat.busy = true;
    const heal = 16 + state.level * 3;
    state.health = clamp(state.health + heal, 0, state.maxHealth);
    setCombatLog(`You steady your breath and mend ${heal} vitality.`);
    updateCombatHUD();
    queueEnemyTurn(700);
  } else if (act === 'flee') {
    combat.busy = true;
    const chance = .52 + state.level * .02;
    if (Math.random() < chance) {
      setCombatLog('You slip away into the lane.');
      toast('You escaped the fight.');
      setTimeout(() => endCombat(false, true), 700);
    } else {
      setCombatLog('You turn to run — and they close the gap!');
      queueEnemyTurn(700);
    }
  }
}
function startTiming(power) {
  combat.mg.active = true;
  combat.mg.pos = 0;
  combat.mg.dir = 1;
  combat.mg.speed = (power ? 1.05 : .92) + state.level * .025;
  combat.mg.power = power;
  $('mgTitle').textContent = power ? 'POWER STRIKE' : 'STRIKE';
  $('timingUI').hidden = false;
  $('strikeBtn').textContent = power ? 'RELEASE' : 'STRIKE';
  setCombatLog(power ? 'Time the blow — a perfect release doubles the damage.' : 'Time the blow — hit the golden band.');
}
function strikeTiming() {
  if (!combat.active || !combat.mg.active) return;
  combat.mg.active = false;
  $('timingUI').hidden = true;
  const dist = Math.abs(combat.mg.pos - .5);
  const perfect = dist < .028;
  const good = dist < .095;
  const grade = perfect ? 'PERFECT' : good ? 'GOOD' : 'MISS';
  const target = firstAliveEnemy();
  if (!target) { winCombat(); return; }
  const base = 5 + state.level * 1.2 + WEAPONS[state.weapon].bonus * 2 + (combat.mg.power ? 7 : 0);
  let dmg = Math.max(1, Math.round(base * (perfect ? 2 : good ? 1.25 : .5)));
  target.hp -= dmg;
  target.hitT = performance.now();
  combat.playerLungeT = performance.now();
  state.fp = clamp(state.fp + (perfect ? 2 : 1), 0, state.maxFp);
  setCombatLog(perfect ? `PERFECT STRIKE — ${dmg} damage to ${target.name}!` : good ? `Good hit — ${dmg} damage to ${target.name}.` : `A clumsy swing — only ${dmg} damage.`);
  if (target.hp <= 0) {
    target.hp = 0; target.alive = false;
    if (target.model) target.model.rotation.z = Math.PI / 2.2;
    setCombatLog(`${target.name} crumples like wet paper.`);
    if (!combat.enemies.some(e => e.alive)) {
      renderEnemyCards(); updateCombatHUD();
      setTimeout(winCombat, 800);
      return;
    }
  }
  renderEnemyCards();
  updateCombatHUD();
  queueEnemyTurn(950);
}
function queueEnemyTurn(delay) {
  const token = combat.token;
  setTimeout(() => { if (combat.active && token === combat.token) enemyTurn(); }, delay);
}
function enemyTurn() {
  if (!combat.active || combat.defeat) return;
  combat.turn = 'enemy';
  combat.busy = true;
  combat.round++;
  $('turnBanner').textContent = 'ENEMY TURN';
  const alive = combat.enemies.filter(e => e.alive);
  const token = combat.token;
  let i = 0;
  const next = () => {
    if (!combat.active || combat.defeat || token !== combat.token) return;
    if (i >= alive.length) {
      setTimeout(() => { if (combat.active && !combat.defeat) playerTurn(); }, 500);
      return;
    }
    const e = alive[i++];
    if (!e.alive) { next(); return; }
    enemyAttack(e, () => setTimeout(next, 420));
  };
  setTimeout(next, 520);
}
function enemyAttack(enemy, done) {
  if (!combat.active || combat.defeat) return;
  const token = combat.token;
  enemy.lungeT = performance.now();
  setCombatLog(`${enemy.name} lunges — block!`);
  $('blockUI').hidden = false;
  $('blockBtn').textContent = 'BLOCK!';
  const ring = $('blockUI').querySelector('.block-ring');
  ring.style.animation = 'none';
  void ring.offsetWidth;
  ring.style.animation = 'blockRing .95s linear forwards';
  combat.block = { active: true, start: performance.now(), tapped: false, at: 0, dmg: enemy.atk + Math.round(rnd(-1, 2)), enemy, done };
  setTimeout(() => {
    if (!combat.active || token !== combat.token) return;
    resolveBlock();
  }, 980);
}
function blockTap() {
  if (!combat.active || !combat.block.active || combat.block.tapped) return;
  const elapsed = (performance.now() - combat.block.start) / 1000;
  combat.block.tapped = true;
  combat.block.at = elapsed;
  $('blockBtn').textContent = 'GUARD';
}
function resolveBlock() {
  const b = combat.block;
  if (!b.active) return;
  b.active = false;
  $('blockUI').hidden = true;
  $('blockBtn').textContent = 'BLOCK!';
  let dmg = b.dmg;
  let msg = '';
  if (b.tapped) {
    const t = b.at;
    if (t >= .58 && t <= .76) {
      dmg = 0;
      msg = `Perfect block! You turn the blow and strike back for 4.`;
      const target = firstAliveEnemy();
      if (target) {
        target.hp -= 4; target.hitT = performance.now();
        if (target.hp <= 0) { target.hp = 0; target.alive = false; if (target.model) target.model.rotation.z = Math.PI / 2.2; }
      }
    } else if (t >= .38 && t <= .9) {
      dmg = Math.max(1, Math.round(dmg * .35));
      msg = `Blocked — ${dmg} damage.`;
    } else {
      dmg = Math.max(1, Math.round(dmg * .8));
      msg = `Too early — ${dmg} damage.`;
    }
  } else {
    msg = `The blow lands — ${dmg} damage.`;
  }
  state.health = Math.max(0, state.health - dmg);
  setCombatLog(msg);
  renderEnemyCards();
  updateCombatHUD();
  if (state.health <= 0) {
    playerDefeated(combat.mob ? combat.mob.def.name.toLowerCase() : 'a bad end');
    return;
  }
  if (!combat.enemies.some(e => e.alive)) {
    setTimeout(winCombat, 650);
    return;
  }
  if (b.done) b.done();
}
function winCombat() {
  if (!combat.active || combat.defeat) return;
  combat.busy = true;
  combat.token++;
  const totalCoins = combat.enemies.reduce((n, e) => n + e.coins, 0) + (combat.bounty ? 8 : 0);
  const totalXp = combat.enemies.reduce((n, e) => n + e.xp, 0) + 1;
  giveCoins(totalCoins, `Victory — ${totalCoins}◈ recovered.`);
  gainXP(totalXp);
  addRep(2);
  if (Math.random() < .45) addItem('Herbs', 1);
  if (combat.mob) {
    combat.mob.alive = false;
    combat.mob.model.visible = false;
    state.defeated = state.defeated || {};
    state.defeated[combat.mob.def.id] = true;
  }
  $('turnBanner').textContent = 'VICTORY';
  setCombatLog('The paper stage falls quiet.');
  $('combatResult').hidden = false;
  $('combatResult').innerHTML = `
    <div class="eyebrow">The dust settles</div>
    <h2>Victory</h2>
    <p>${combat.enemies.length > 1 ? 'The pack breaks and scatters.' : 'Your opponent folds and flees.'} The road is yours again.</p>
    <div class="rewards"><span>◈ +${totalCoins}</span><span>✦ +${totalXp} xp</span>${Math.random() < .45 ? '<span>🌿 +1 herb</span>' : ''}</div>
    <button data-result="win">Continue</button>
  `;
  $('combatResult').querySelector('button').onclick = () => endCombat(true);
  updateHUD(true);
  saveGame();
}
function playerDefeated(cause) {
  if (!combat.active) {
    // out-of-combat death (e.g. fall damage)
    state.scars = (state.scars || 0) + 1;
    state.appearance.scars = Math.min(3, (state.appearance.scars || 0) + 1);
    const lost = Math.floor(state.coins * .25);
    state.coins -= lost;
    state.health = Math.max(12, Math.round(state.maxHealth * .45));
    state.hour = (state.hour + 5) % 24;
    if (state.hour < 6) state.day++;
    applyRespawn();
    openModal(`
      <div class="eyebrow">A hard lesson</div><h2>You wake at the cottage</h2>
      <p class="sub">${escapeHtml(cause)} left you in the dirt. Someone carried you home — the town is kind, even when it isn't gentle. You lost ${lost}◈ and gained a scar you'll keep.</p>
      <div class="stat-grid"><div class="stat-line"><span>Scars</span><b>${state.scars}</b></div><div class="stat-line"><span>Coins lost</span><b>−${lost}◈</b></div></div>
      ${menuClose()}
    `, {});
    updateHUD(true); saveGame();
    return;
  }
  if (combat.defeat) return;
  combat.defeat = true;
  combat.token++;
  combat.mg.active = false;
  combat.block.active = false;
  $('timingUI').hidden = true;
  $('blockUI').hidden = true;
  $('turnBanner').textContent = 'YOU FALL';
  setCombatLog('The world tilts. The paper stage goes dark.');
  $('combatResult').hidden = false;
  $('combatResult').innerHTML = `
    <div class="eyebrow">Defeated</div>
    <h2>You fall.</h2>
    <p>${escapeHtml(cause)} got the better of you. You'll wake at the cottage with a new scar, lighter pockets, and a story the town will repeat.</p>
    <div class="rewards"><span>Scars +1</span><span>−25% coin</span></div>
    <button data-result="wake">Wake at the cottage</button>
  `;
  $('combatResult').querySelector('button').onclick = () => {
    state.scars = (state.scars || 0) + 1;
    state.appearance.scars = Math.min(3, (state.appearance.scars || 0) + 1);
    const lost = Math.floor(state.coins * .25);
    state.coins -= lost;
    state.health = Math.max(12, Math.round(state.maxHealth * .45));
    state.hour = (state.hour + 5) % 24;
    if (state.hour < 6) state.day++;
    endCombat(false);
    applyRespawn();
    toast(`You wake at the cottage. Scar +1 · −${lost}◈`);
    logMsg('You were defeated and woke at the cottage.');
    updateHUD(true);
    saveGame();
  };
}
function applyRespawn() {
  const d = buildingMeshes.home ? buildingMeshes.home.door : { x: 612, y: 332 };
  state.x = d.x; state.y = d.y;
  state.h = 0; state.vy = 0; state.onRoof = null; state.fallStart = 0;
  state.parkour = null; state.nearby = null;
  state.facing = Math.PI;
  if (playerModel) {
    worldGroup.add(playerModel);
    placePlayer();
  }
  updateHUD(true);
}
function endCombat(win, fled = false) {
  combat.active = false;
  combat.defeat = false;
  combat.busy = false;
  combat.token++;
  combat.mg.active = false;
  combat.block.active = false;
  state.dialogOpen = false;
  document.body.classList.remove('combat-mode');
  $('combatUI').hidden = true;
  $('combatResult').hidden = true;
  $('timingUI').hidden = true;
  $('blockUI').hidden = true;
  combatStage.visible = false;
  clearCombatStage();
  combat.playerModel = null;
  combat.enemies = [];
  if (combat.light) combat.light.visible = false;
  worldGroup.visible = true;
  scene.background = new THREE.Color('#a6c7b7');
  scene.fog.color.set('#a6c7b7');
  scene.fog.near = 22; scene.fog.far = 48;
  camInit = false;
  combat.camInit = false;
  updateHUD(true);
  if (win) toast('The road is clear.');
  saveGame();
  setTimeout(updateNearby, 60);
}

function animateCombat(dt) {
  if (!combat.playerModel) return;
  const desired = new THREE.Vector3(Math.sin(clockTime * .35) * .18, 2.85, 8.1);
  if (!combat.camInit) { camera.position.copy(desired); combat.camInit = true; }
  else camera.position.lerp(desired, 1 - Math.exp(-dt * 4.5));
  camera.lookAt(0, 1.25, 0);

  animateCharacter(combat.playerModel, dt, 0, 0, clockTime);
  const now = performance.now();
  if (now - combat.playerLungeT < 480) {
    const p = (now - combat.playerLungeT) / 480;
    combat.playerModel.position.x = combat.playerBase.x + Math.sin(p * Math.PI) * .95;
  } else {
    combat.playerModel.position.x = combat.playerBase.x;
  }
  combat.enemies.forEach(e => {
    if (!e.model) return;
    if (!e.alive) {
      e.model.position.y = lerp(e.model.position.y, .1, 1 - Math.exp(-dt * 5));
      return;
    }
    let x = e.baseX;
    if (now - e.lungeT < 520) {
      const p = (now - e.lungeT) / 520;
      x = e.baseX - Math.sin(p * Math.PI) * 1.05;
    }
    if (now - e.hitT < 260) x += Math.sin((now - e.hitT) * .09) * .08;
    e.model.position.x = lerp(e.model.position.x, x, 1 - Math.exp(-dt * 18));
    e.model.position.y = Math.abs(Math.sin(clockTime * 1.7 + e.baseZ)) * .03;
  });
  if (combat.mg.active) {
    const mg = combat.mg;
    mg.pos += mg.dir * dt * mg.speed;
    if (mg.pos > 1) { mg.pos = 1; mg.dir = -1; }
    if (mg.pos < 0) { mg.pos = 0; mg.dir = 1; }
    $('mgNeedle').style.left = (mg.pos * 100).toFixed(2) + '%';
  }
}

function initCombatUI() {
  document.querySelectorAll('#combatActions button').forEach(btn => {
    btn.onclick = () => combatAction(btn.dataset.act);
  });
  $('strikeBtn').onclick = strikeTiming;
  $('blockBtn').onclick = blockTap;
  document.addEventListener('keydown', e => {
    if (!combat.active) return;
    if (e.key === ' ' || e.key === 'Enter' || e.key.toLowerCase() === 'e') {
      if (combat.mg.active) { e.preventDefault(); strikeTiming(); }
      else if (combat.block.active) { e.preventDefault(); blockTap(); }
    }
    if (e.key >= '1' && e.key <= '4' && !combat.busy) {
      const acts = ['attack', 'power', 'mend', 'flee'];
      combatAction(acts[Number(e.key) - 1]);
    }
  });
}

/* ---------------- TIME / DAYLIGHT ---------------- */
const dayColor = new THREE.Color('#a6c7b7');
const nightColor = new THREE.Color('#1e3340');
const duskColor = new THREE.Color('#c29a72');
const tmpColor = new THREE.Color();
let dailyIncomeMsg = '';
function dailyTick() {
  let income = 0;
  if (state.stall) income += 5;
  if (state.business) income += 14;
  if (income) {
    state.coins += income;
    dailyIncomeMsg = `Morning takings: +${income}◈.`;
  }
  if (state.pet) state.petHappiness = clamp(state.petHappiness - 7, 0, 100);
  state.wanted = Math.max(0, state.wanted - 1);
  logMsg(`Day ${state.day} begins.`);
  saveGame();
}
function advanceClock(dt) {
  if (!state.started || combat.active) return;
  state.minute += dt * 2.2;
  if (state.minute >= 60) {
    const add = Math.floor(state.minute / 60);
    state.minute %= 60;
    state.hour += add;
    while (state.hour >= 24) {
      state.hour -= 24;
      state.day++;
      dailyTick();
      if (dailyIncomeMsg) { setTimeout(() => toast(dailyIncomeMsg), 1200); dailyIncomeMsg = ''; }
    }
  }
  if (!state.dialogOpen) {
    state.hunger = clamp(state.hunger - dt * .045, 0, 100);
    if (state.hunger > 55 && state.health < state.maxHealth) state.health = clamp(state.health + dt * .18, 0, state.maxHealth);
    if (state.hunger <= 0) state.health = clamp(state.health - dt * .55, 0, state.maxHealth);
    if (state.health <= 0 && !state.dialogOpen) playerDefeated('hunger');
  }
}
function updateDaylight() {
  if (combat.active) return;
  const h = state.hour;
  const day = clamp(Math.sin(((h - 5.4) / 14) * Math.PI), 0, 1);
  const dusk = clamp(1 - Math.abs(h - 19) / 3.4, 0, 1) * .75;
  sunLight.intensity = .28 + day * 1.9;
  hemiLight.intensity = .3 + day * .78;
  fillLight.intensity = .14 + day * .32;
  tmpColor.copy(nightColor).lerp(dayColor, day);
  if (dusk > 0) tmpColor.lerp(duskColor, dusk * .55);
  scene.background.copy(tmpColor);
  scene.fog.color.copy(tmpColor);
  const glow = 1 - day;
  windowMats.forEach(m => { m.emissiveIntensity = glow * 1.35; });
  if (featureMeshes.stones) featureMeshes.stones.visible = true;
}

/* ---------------- SAVE / LOAD FIXUPS ---------------- */
function afterLoadOrStart() {
  showcase = false;
  setShowcaseWorld(false);
  state.started = true;
  state.dialogOpen = false;
  $('startScreen').hidden = true;
  document.body.classList.add('playing');
  camInit = false;
  if (playerModel) { rebuildPlayer(); placePlayer(); }
  mobs.forEach(m => {
    if (state.defeated && state.defeated[m.def.id]) { m.alive = false; m.model.visible = false; }
  });
  if (interactRing) interactRing.visible = false;
  if (featureMeshes.crops) featureMeshes.crops.visible = state.homeLevel > 0;
  updateHUD(true);
  refreshSigns();
  updateDaylight();
  updateNearby();
}

/* ---------------- START / LOOP ---------------- */
function setShowcaseWorld(on) {
  for (const id in npcModels) npcModels[id].model.visible = !on;
  mobs.forEach(m => { m.model.visible = on ? false : m.alive; });
  if (featureMeshes.crops) featureMeshes.crops.visible = on ? false : state.homeLevel > 0;
}
function startGame() {
  if (state.appearance.name.trim() === '') state.appearance.name = 'Alder Rowan';
  const plotNames = { meadow: 'Bramblewick', creek: 'Foxglove Creek', ridge: 'Thistle Ridge' };
  state.job = `Newcomer · ${plotNames[state.plot] || 'Bramblewick'}`;
  state.started = true;
  state.x = 612; state.y = 332; state.h = 0; state.vy = 0;
  state.facing = Math.PI / 2;
  state.camYaw = -Math.PI / 2 + .22; state.camPitch = .2; state.camDist = 6.8;
  afterLoadOrStart();
  saveGame();
  toast('You wake to bells, bread smoke, and the smell of rain on stone.');
  setTimeout(() => toast('Mara is at the bakery. The well is just down the lane.'), 2100);
  setTimeout(() => toast('WASD or the joystick to move · E to act · Space to jump.'), 4400);
  logMsg('You arrive in Brackenridge with thirty coins and a crooked cottage.');
}
function setupStart() {
  renderCreator($('customFields'));
  document.querySelectorAll('#plotRow .plot').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('#plotRow .plot').forEach(b => b.classList.toggle('selected', b === btn));
      state.plot = btn.dataset.plot;
    };
  });
  $('startBtn').onclick = startGame;
  setupContinue();
  function wireContinue() {
    const b = $('continueBtn');
    try {
      const raw = localStorage.getItem('hearthHollow3d');
      if (!raw) return;
      const d = JSON.parse(raw);
      b.hidden = false;
      b.textContent = `Continue Day ${d.day || 1} · ${d.coins || 0}◈`;
      b.onclick = () => {
        if (loadGame()) {
          afterLoadOrStart();
          setTimeout(() => toast('Welcome back to Brackenridge.'), 500);
        }
      };
    } catch (e) {}
  }
  wireContinue();
}

let lastTime = performance.now();
let nearbyTimer = 0, hudTimer = 0, autosaveTimer = 24, savePulse = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(.05, Math.max(.0001, (now - lastTime) / 1000));
  lastTime = now;
  clockTime += dt;

  if (!state.started) {
    if (playerModel) playerModel.rotation.y = -Math.PI / 2;
    animateCharacter(playerModel, dt, 0, 0, clockTime);
    updateNpcs(dt);
    updateWorldIdle(dt);
    updateCamera(dt);
  } else if (combat.active) {
    animateCombat(dt);
  } else {
    updateMovement(dt);
    updateVertical(dt);
    placePlayer();
    updateNpcs(dt);
    updateWorldIdle(dt);
    updateCamera(dt);
    advanceClock(dt);
    updateDaylight();
  }

  nearbyTimer -= dt;
  if (nearbyTimer <= 0) {
    nearbyTimer = .15;
    if (state.started && !combat.active) updateNearby();
  }
  hudTimer -= dt;
  if (hudTimer <= 0) {
    hudTimer = .4;
    if (state.started) updateHUD();
    if (interactRing && interactRing.visible) {
      interactRing.rotation.y += .02;
      interactRing.userData.gem.position.y = .72 + Math.sin(clockTime * 3) * .08;
    }
  }
  autosaveTimer -= dt;
  if (autosaveTimer <= 0) {
    autosaveTimer = 26;
    if (state.started && !combat.active) saveGame();
  }
  renderer.render(scene, camera);
}

/* ---------------- BOOT ---------------- */
initWorld();
makeInteractRing();
setShowcaseWorld(true);
initInput();
initCombatUI();
setupStart();
$('npcClose').addEventListener('click', closeNpc);
$('npcUI').addEventListener('pointerdown', e => { if (e.target.id === 'npcUI') closeNpc(); });
$('modalBackdrop').addEventListener('pointerdown', e => { if (e.target.id === 'modalBackdrop') closeModal(); });
window.addEventListener('beforeunload', () => { if (state.started) saveGame(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && state.started) saveGame(); });
updateHUD(true);
animate(performance.now());
