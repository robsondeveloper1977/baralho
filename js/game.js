/* Vinte e Um · Blackjack da Fortuna — cena 3D, UI e fluxo da rodada. */
(() => {
'use strict';

const { MIN_BET, value, total, isBlackjack, dealerShouldHit, Shoe, settle, chipBreakdown, maxBet } = Logic;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => Math.round(n).toLocaleString('pt-BR');
const ranksOf = hand => hand.map(c => c.userData.rank);
const START_BALANCE = 1000;

const store = {
  get(k, d) { try { const v = localStorage.getItem('vu21.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('vu21.' + k, JSON.stringify(v)); } catch {} },
};

// ======================================================================
//  Estado
// ======================================================================
const state = {
  balance: store.get('balance', START_BALANCE),
  bet: store.get('bet', MIN_BET),
  lastWin: 0,
  phase: 'bet',               // bet | deal | player | busy | dealer | over
  hands: { p: [], d: [] },
  hidden: null,               // carta virada do dealer
  doubled: false,
  shoe: new Shoe(4),
};
if (!(state.balance >= MIN_BET)) state.balance = START_BALANCE;
state.bet = Math.max(MIN_BET, Math.min(state.bet, maxBet(state.balance)));
if (state.bet % MIN_BET) state.bet = MIN_BET;

// ======================================================================
//  Renderer / cena
// ======================================================================
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (err) {
  $('fallback').style.display = 'grid';
  console.error(err);
  return;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.domElement.id = 'scene';
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x2a0509, 16, 36);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
const camBase = new THREE.Vector3(0, 11.6, 9.4);
const look = new THREE.Vector3(0, 0, 0.3);
camera.position.copy(camBase);
const mouse = { x: 0, y: 0 };
addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

function resize() {
  const w = innerWidth, h = innerHeight, a = w / h;
  renderer.setSize(w, h);
  camera.aspect = a;
  // telas estreitas: abre o campo de visão e sobe a mesa para não ficar atrás do painel
  camera.fov = THREE.MathUtils.clamp(45 + (1.4 - a) * 40, 45, 70);
  look.z = a < 1 ? 2.2 : a < 1.4 ? 1.4 : 1.0;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0xffe6bf, 0x3a0a10, 0.8));
const spot = new THREE.SpotLight(0xfff0d0, 160, 40, 0.7, 0.55, 1.5);
spot.position.set(0, 11, 3); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004;
scene.add(spot);
const warm = new THREE.PointLight(0xff6a3a, 40, 16, 1.6); warm.position.set(0, 4, -4.5); scene.add(warm);

// ---------- mesa ----------
function makeFelt() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const rg = g.createRadialGradient(S / 2, S / 2, 40, S / 2, S / 2, S * 0.52);
  rg.addColorStop(0, '#b81c2f'); rg.addColorStop(0.6, '#8c1323'); rg.addColorStop(1, '#5a0a16');
  g.fillStyle = rg; g.fillRect(0, 0, S, S);
  // ondas (seigaiha) discretas em dourado
  g.strokeStyle = 'rgba(255,215,110,.11)'; g.lineWidth = 2;
  const r = 46;
  for (let row = 0; row * r * 0.55 < S + r; row++) {
    const y = row * r * 0.55, off = (row % 2) * r;
    for (let x = -r + off; x < S + r; x += r * 2)
      for (const rr of [r, r * 0.72, r * 0.44]) { g.beginPath(); g.arc(x, y, rr, Math.PI, 0); g.stroke(); }
  }
  for (let i = 0; i < 18000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  g.strokeStyle = 'rgba(247,201,72,.9)'; g.lineWidth = 7; g.beginPath(); g.arc(S / 2, S / 2, S * 0.455, 0, 7); g.stroke();
  g.lineWidth = 2.5; g.beginPath(); g.arc(S / 2, S / 2, S * 0.437, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const tableMats = [
  new THREE.MeshStandardMaterial({ color: 0x3a0610, roughness: 0.8 }),
  new THREE.MeshStandardMaterial({ map: makeFelt(), roughness: 0.95 }),
  new THREE.MeshStandardMaterial({ color: 0x1a0306 }),
];
const table = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.4, 96), tableMats);
table.scale.set(1.15, 1, 0.8); table.position.y = -0.21; table.receiveShadow = true; scene.add(table);

const goldMat = new THREE.MeshStandardMaterial({ color: 0xe6b020, metalness: 0.45, roughness: 0.32, emissive: 0x4a2c00 });
const rim = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.42, 24, 120), goldMat);
rim.rotation.x = Math.PI / 2; rim.scale.set(1.15, 0.8, 1); rim.position.y = -0.04; rim.castShadow = true; scene.add(rim);
const base = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 6.4, 0.7, 64), new THREE.MeshStandardMaterial({ color: 0x24040a, roughness: 0.7 }));
base.scale.set(1.15, 1, 0.8); base.position.y = -0.7; scene.add(base);

// texto decorativo sobre o feltro
{
  const c = document.createElement('canvas'); c.width = 1024; c.height = 320; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 40, 0, 300); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#f7c948'); gr.addColorStop(1, '#b9780a');
  g.fillStyle = gr; g.strokeStyle = '#f7c948'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = '12px';
  g.font = 'bold 104px Georgia, serif'; g.fillText('VINTE E UM', 512, 96);
  if ('letterSpacing' in g) g.letterSpacing = '4px';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(110, 178); g.lineTo(470, 178); g.moveTo(554, 178); g.lineTo(914, 178); g.stroke();
  g.save(); g.translate(512, 178); g.rotate(Math.PI / 4); g.fillRect(-9, -9, 18, 18); g.restore();
  g.font = '700 40px Georgia, serif'; g.fillText('BLACKJACK PAGA 3 PARA 2', 512, 232);
  g.font = '600 30px Georgia, serif'; g.globalAlpha = 0.85; g.fillText('DEALER PARA NO 17', 512, 282);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(8.4, 2.625), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.62, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 0.008, -0.05); scene.add(m);
}

// ---------- lanternas ----------
const lanterns = [];
function makeLantern(x, y, z, s, phase) {
  const pivot = new THREE.Group(); pivot.position.set(x, y, z); pivot.scale.setScalar(s);
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 18), new THREE.MeshStandardMaterial({ color: 0xd7192a, emissive: 0xff2210, emissiveIntensity: 0.9, roughness: 0.55 }));
  body.scale.y = 0.85; body.position.y = -1.3; pivot.add(body);
  for (const sy of [1, -1]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.16, 16), goldMat); cap.position.y = -1.3 + sy * 0.5; pivot.add(cap);
  }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), goldMat); rope.position.y = -0.38; pivot.add(rope);
  const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xf7c948, emissive: 0x4a2c00 })); tassel.position.y = -2.0; pivot.add(tassel);
  scene.add(pivot); lanterns.push({ pivot, phase });
}
makeLantern(-6.0, 3.7, -4.6, 0.95, 0); makeLantern(6.0, 3.7, -4.6, 0.95, 2);
makeLantern(-4.0, 4.1, -6.0, 0.75, 1); makeLantern(4.0, 4.1, -6.0, 0.75, 3);

// ======================================================================
//  Cartas
// ======================================================================
const CW = 1.3, CH = 1.82, CT = 0.014;
const cardGeo = new THREE.BoxGeometry(CW, CT, CH);
const SYM_FONT = '"Segoe UI Symbol","Noto Sans Symbols","DejaVu Sans",serif';
const PIPS = (() => {
  const L = .0, R = 1, M = .5;
  const six = [[L, 0], [R, 0], [L, .5], [R, .5], [L, 1], [R, 1]];
  return {
    '2': [[M, 0], [M, 1]], '3': [[M, 0], [M, .5], [M, 1]],
    '4': [[L, 0], [R, 0], [L, 1], [R, 1]], '5': [[L, 0], [R, 0], [M, .5], [L, 1], [R, 1]],
    '6': six, '7': [...six, [M, .25]], '8': [...six, [M, .25], [M, .75]],
    '9': [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1], [M, .5]],
    '10': [[L, 0], [R, 0], [L, 1 / 3], [R, 1 / 3], [L, 2 / 3], [R, 2 / 3], [L, 1], [R, 1], [M, 1 / 6], [M, 5 / 6]],
  };
})();

const texCache = {}, frontMatCache = {};
function faceTex(rank, suit) {
  const k = rank + suit; if (texCache[k]) return texCache[k];
  const W = 320, H = 448, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H);
  g.strokeStyle = '#d9cfb4'; g.lineWidth = 5; g.strokeRect(3, 3, W - 6, H - 6);
  const red = suit === '♥' || suit === '♦', col = red ? '#c8102e' : '#14161c';
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle';
  const corner = () => {
    g.font = `bold ${rank === '10' ? 54 : 64}px Georgia, serif`; g.fillText(rank, 44, 56);
    g.font = `48px ${SYM_FONT}`; g.fillText(suit, 44, 112);
  };
  corner();
  g.save(); g.translate(W, H); g.rotate(Math.PI); corner(); g.restore();
  if (rank === 'A') {
    g.font = `190px ${SYM_FONT}`; g.fillText(suit, W / 2, H / 2 + 6);
  } else if ('JQK'.includes(rank)) {
    g.strokeStyle = '#c99a2e'; g.lineWidth = 5; g.fillStyle = red ? '#fff0ec' : '#eef0f6';
    g.beginPath(); g.roundRect(84, 66, W - 168, H - 132, 14); g.fill(); g.stroke();
    g.lineWidth = 2; g.beginPath(); g.roundRect(94, 76, W - 188, H - 152, 8); g.stroke();
    g.fillStyle = col;
    g.font = 'bold 168px Georgia, serif'; g.fillText(rank, W / 2, H / 2 + 4);
    g.font = `46px ${SYM_FONT}`; g.fillText(suit, W / 2, 112); g.fillText(suit, W / 2, H - 112);
  } else {
    g.font = `66px ${SYM_FONT}`;
    for (const [u, v] of PIPS[rank]) {
      const px = 104 + u * 112, py = 92 + v * 264;
      if (v > 0.5) { g.save(); g.translate(px, py); g.rotate(Math.PI); g.fillText(suit, 0, 0); g.restore(); }
      else g.fillText(suit, px, py);
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return texCache[k] = t;
}
const backTex = (() => {
  const W = 320, H = 448, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#a3111f'; g.fillRect(16, 16, W - 32, H - 32);
  g.save(); g.beginPath(); g.rect(16, 16, W - 32, H - 32); g.clip();
  g.strokeStyle = 'rgba(247,201,72,.75)'; g.lineWidth = 2;
  for (let i = -H; i < W + H; i += 26) {
    g.beginPath(); g.moveTo(i, 16); g.lineTo(i + H, H - 16); g.stroke();
    g.beginPath(); g.moveTo(i, H - 16); g.lineTo(i + H, 16); g.stroke();
  }
  g.restore();
  g.strokeStyle = '#f7c948'; g.lineWidth = 4; g.strokeRect(24, 24, W - 48, H - 48);
  const gr = g.createRadialGradient(W / 2 - 14, H / 2 - 20, 6, W / 2, H / 2, 74);
  gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.6, '#f7c948'); gr.addColorStop(1, '#b9780a');
  g.fillStyle = gr; g.beginPath(); g.arc(W / 2, H / 2, 70, 0, 7); g.fill();
  g.strokeStyle = '#6b3f00'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, 58, 0, 7); g.stroke();
  g.fillStyle = '#7a0f1a'; g.font = 'bold 76px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('福', W / 2, H / 2 + 4);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
})();
const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf4efe0 });
const backMat = new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.5 });

function makeCard(rank, suit) {
  const k = rank + suit;
  const front = frontMatCache[k] || (frontMatCache[k] = new THREE.MeshStandardMaterial({ map: faceTex(rank, suit), roughness: 0.45 }));
  const m = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, front, backMat, edgeMat, edgeMat]);
  m.castShadow = m.receiveShadow = true;
  m.userData = { rank, suit };
  m.rotation.z = Math.PI; // virada para baixo
  return m;
}

// ======================================================================
//  Animação (tweens)
// ======================================================================
const tweens = [];
/** to: { pos:Vector3, arc, rx, ry, rz }. Um tween novo "rouba" as propriedades de tweens antigos do mesmo objeto. */
function tween(obj, to, dur = 0.5, delay = 0) {
  return new Promise(res => {
    for (const t of tweens) if (t.obj === obj) {
      for (const k of Object.keys(to)) delete t.to[k];
      if ('pos' in to) delete t.to.arc;
    }
    tweens.push({ obj, to: { ...to }, t: -delay, dur, started: false, res });
  });
}
function stepTweens(dt) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i]; tw.t += dt; if (tw.t < 0) continue;
    if (!tw.started) { tw.started = true; tw.p0 = tw.obj.position.clone(); tw.r0 = tw.obj.rotation.clone(); }
    const k = Math.min(tw.t / tw.dur, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const { obj, to, p0, r0 } = tw;
    if (to.pos) { obj.position.lerpVectors(p0, to.pos, e); if (to.arc) obj.position.y += Math.sin(Math.PI * e) * to.arc; }
    if (to.rx !== undefined) obj.rotation.x = r0.x + (to.rx - r0.x) * e;
    if (to.ry !== undefined) obj.rotation.y = r0.y + (to.ry - r0.y) * e;
    if (to.rz !== undefined) obj.rotation.z = r0.z + (to.rz - r0.z) * e;
    if (k >= 1) { tweens.splice(i, 1); tw.res(); }
  }
}

// ---------- baralho (sapato) ----------
const deckPos = new THREE.Vector3(5.2, 0, -1.2);
const deckMesh = new THREE.Group(); deckMesh.position.copy(deckPos);
const DECK_LAYERS = 16;
for (let i = 0; i < DECK_LAYERS; i++) {
  const c = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, backMat, edgeMat, edgeMat, edgeMat]); // verso para cima
  c.position.y = CT * (i + 0.5); c.rotation.y = (Math.random() - 0.5) * 0.05; c.castShadow = c.receiveShadow = true; deckMesh.add(c);
}
deckMesh.rotation.y = 0.2; scene.add(deckMesh);
function updateDeck() {
  const n = Math.max(1, Math.ceil(DECK_LAYERS * state.shoe.remaining / (state.shoe.decks * 52)));
  deckMesh.children.forEach((c, i) => { c.visible = i < n; });
}

// ======================================================================
//  Fichas
// ======================================================================
const chipGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.1, 36);
const CHIP_COLORS = { 50: '#2b6fe0', 100: '#1fa34a', 250: '#d4351c', 500: '#3a2a5a' };
const chipMats = {};
function chipMat(d) {
  if (chipMats[d]) return chipMats[d];
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const col = CHIP_COLORS[d];
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  g.fillStyle = '#fff';
  for (let i = 0; i < 8; i++) { g.save(); g.translate(S / 2, S / 2); g.rotate(i * Math.PI / 4); g.fillRect(-20, -S / 2, 40, 44); g.restore(); }
  g.strokeStyle = '#fff'; g.lineWidth = 6; g.beginPath(); g.arc(S / 2, S / 2, S * 0.36, 0, 7); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(S / 2, S / 2, S * 0.34, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `bold ${d >= 100 ? 74 : 84}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(d, S / 2, S / 2 + 4);
  const top = new THREE.CanvasTexture(c); top.colorSpace = THREE.SRGBColorSpace; top.anisotropy = 8;
  top.center.set(0.5, 0.5); top.rotation = Math.PI / 2; // alinha o texto com a câmera (UV da tampa do cilindro)
  const side = new THREE.MeshStandardMaterial({ color: col, roughness: 0.45 });
  return chipMats[d] = [side, new THREE.MeshStandardMaterial({ map: top, roughness: 0.4 }), side];
}
const betGroup = new THREE.Group(); betGroup.position.set(-5.6, 0, 3.1); scene.add(betGroup);
let chipBump = 0;
function renderChips(bet) {
  betGroup.clear();
  chipBreakdown(bet).forEach((st, i) => {
    const n = Math.min(st.count, 10);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(chipGeo, chipMat(st.denom));
      m.position.set(i * 1.05 + Math.sin(j * 7 + i) * 0.015, 0.05 + j * 0.102, Math.cos(j * 5 + i) * 0.015);
      m.rotation.y = j * 0.9; m.castShadow = true; betGroup.add(m);
    }
  });
  chipBump = 1;
}

// moedas da vitória
const coinGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.045, 24);
const coinHole = new THREE.BoxGeometry(0.1, 0.05, 0.1);
const coinMat = new THREE.MeshStandardMaterial({ color: 0xf2b928, metalness: 0.55, roughness: 0.28, emissive: 0x5a3600 });
const coinHoleMat = new THREE.MeshStandardMaterial({ color: 0x3a0610 });
const coins = [];
function coinBurst(n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(coinGeo, coinMat); m.add(new THREE.Mesh(coinHole, coinHoleMat));
    m.position.set((Math.random() - 0.5) * 7, 6 + Math.random() * 3, (Math.random() - 0.5) * 4 - 0.2);
    m.rotation.set(Math.random() * 3, 0, Math.random() * 3); m.castShadow = true;
    scene.add(m);
    coins.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2, -Math.random() * 3, (Math.random() - 0.5) * 2), s: new THREE.Vector3(Math.random() * 8 - 4, 0, Math.random() * 8 - 4), life: 2.6 + Math.random(), delay: Math.random() * 0.9 });
  }
}
function stepCoins(dt) {
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    if (c.delay > 0) { c.delay -= dt; c.m.visible = false; continue; }
    c.m.visible = true; c.life -= dt;
    c.v.y -= 18 * dt; c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += c.s.x * dt; c.m.rotation.z += c.s.z * dt;
    if (c.m.position.y < 0.12) { c.m.position.y = 0.12; c.v.y *= -0.42; c.v.x *= 0.7; c.v.z *= 0.7; c.s.multiplyScalar(0.6); }
    if (c.life < 0.4) c.m.scale.setScalar(Math.max(0.001, c.life / 0.4));
    if (c.life <= 0) { scene.remove(c.m); coins.splice(i, 1); }
  }
}

// ======================================================================
//  Mascote (tigre) — desenho e piscadas em js/common.js
// ======================================================================
const tiger = Common.createTiger($('tiger'));
const mascotEl = $('mascot');
mascotEl.addEventListener('animationend', () => mascotEl.classList.remove('bounce', 'shake')); // volta a flutuar
function mascot(m, cls) {
  tiger.setMood(m);
  mascotEl.classList.remove('bounce', 'shake'); void mascotEl.offsetWidth; if (cls) mascotEl.classList.add(cls);
}

// ======================================================================
//  UI
// ======================================================================
const ui = {
  bal: $('bal'), bet: $('bet'), won: $('won'), winStat: $('winStat'),
  banner: $('banner'), toast: $('toast'),
  badge: { p: $('pBadge'), d: $('dBadge') },
};

function animateNumber(el, to, ms = 650) {
  const from = el.dataset.v === undefined ? to : Number(el.dataset.v);
  el.dataset.v = to; cancelAnimationFrame(el._raf);
  if (from === to || !ms) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = now => {
    const k = Math.min((now - t0) / ms, 1), e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(from + (to - from) * e);
    if (k < 1) el._raf = requestAnimationFrame(step);
  };
  el._raf = requestAnimationFrame(step);
}
function flashStat(el) { const s = el.closest('.stat'); s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash'); }

function updateStats(animate = true) {
  animateNumber(ui.bal, state.balance, animate ? 650 : 0);
  animateNumber(ui.bet, state.bet, animate ? 250 : 0);
  animateNumber(ui.won, state.lastWin, animate && state.lastWin ? 900 : 0);
  ui.won.classList.toggle('has', state.lastWin > 0);
  store.set('balance', state.balance); store.set('bet', state.bet);
  const bettingOpen = state.phase === 'bet';
  const mb = maxBet(state.balance);
  $('bm').disabled = !bettingOpen || state.bet <= MIN_BET;
  $('bp').disabled = !bettingOpen || state.bet + MIN_BET > mb;
  $('bclr').disabled = !bettingOpen || state.bet <= MIN_BET;
  $('ball').disabled = !bettingOpen || state.bet >= mb;
  $('deal').disabled = !bettingOpen || state.balance < MIN_BET;
  document.querySelectorAll('.chip').forEach(b => { b.disabled = !bettingOpen || state.bet + Number(b.dataset.v) > mb; });
}

function showPanel(name) {
  $('gBet').classList.toggle('on', name === 'bet');
  $('gPlay').classList.toggle('on', name === 'play');
}
function toast(text, ms = 1800) {
  ui.toast.textContent = text; ui.toast.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => ui.toast.classList.remove('show'), ms);
}
function banner(title, amount, cls) {
  ui.banner.className = cls;
  ui.banner.querySelector('.t').textContent = title;
  ui.banner.querySelector('.a').textContent = amount || '';
  void ui.banner.offsetWidth; ui.banner.classList.add('show');
}
const hideBanner = () => ui.banner.classList.remove('show');

// placares presos às mãos (projeção 3D → tela)
const anchor = { p: new THREE.Vector3(0, 0, 3.3), d: new THREE.Vector3(0, 0, -3.55) };
function placeBadges() {
  const v = new THREE.Vector3();
  for (const w of ['p', 'd']) {
    const el = ui.badge[w]; if (el.hidden) continue;
    v.copy(anchor[w]).project(camera);
    el.style.left = ((v.x * 0.5 + 0.5) * innerWidth).toFixed(1) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight).toFixed(1) + 'px';
  }
}
function updateBadges() {
  for (const w of ['p', 'd']) {
    const el = ui.badge[w], hand = state.hands[w];
    el.hidden = hand.length === 0; if (!hand.length) continue;
    const ranks = ranksOf(hand), hiddenNow = w === 'd' && state.hidden;
    const t = hiddenNow ? null : total(ranks);
    const txt = hiddenNow ? `${value(hand[0].userData.rank)} + ?` : String(t);
    const pts = el.querySelector('.pts'), tag = el.querySelector('.tag');
    const changed = pts.textContent !== txt; pts.textContent = txt;
    const bust = !hiddenNow && t > 21, bj = !hiddenNow && isBlackjack(ranks);
    el.classList.toggle('bust', bust); el.classList.toggle('bj', bj);
    el.classList.toggle('t21', !hiddenNow && t === 21 && !bj);
    tag.textContent = bust ? 'ESTOUROU' : bj ? 'BLACKJACK' : ''; tag.classList.toggle('on', bust || bj);
    if (changed) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }
}

// ======================================================================
//  Fluxo da rodada
// ======================================================================
const slot = (who, i, n) => {
  const spread = Math.min(0.98, 6.4 / Math.max(n, 1));
  return new THREE.Vector3((i - (n - 1) / 2) * spread, 0.02 + i * 0.018, who === 'p' ? 2.0 : -2.2);
};

async function draw(who, faceUp = true) {
  const { rank, suit } = state.shoe.draw();
  const c = makeCard(rank, suit);
  c.position.copy(deckPos).add(new THREE.Vector3(0, 0.2, 0)); scene.add(c);
  const hand = state.hands[who]; hand.push(c);
  const n = hand.length;
  if (!faceUp) state.hidden = c;
  hand.forEach((cc, i) => { if (cc !== c) tween(cc, { pos: slot(who, i, n) }, 0.3); });
  updateDeck(); Sfx.card();
  await tween(c, { pos: slot(who, n - 1, n), arc: 1.2, rz: faceUp ? 0 : Math.PI, ry: (Math.random() - 0.5) * 0.08 }, 0.55);
  updateBadges();
  return c;
}
async function revealHidden() {
  const c = state.hidden; state.hidden = null; if (!c) return;
  Sfx.flip();
  await tween(c, { pos: c.position.clone(), arc: 0.9, rz: 0 }, 0.5);
  updateBadges();
}
function clearTable() {
  for (const w of ['p', 'd']) for (const c of state.hands[w])
    tween(c, { pos: deckPos.clone().add(new THREE.Vector3(-1, 0.5, -4)), arc: 0.5 }, 0.45).then(() => scene.remove(c));
  state.hands = { p: [], d: [] }; state.hidden = null;
  ui.badge.p.hidden = ui.badge.d.hidden = true;
}

async function startRound() {
  if (state.phase !== 'bet') return;
  if (state.balance < MIN_BET) { showBroke(); return; }
  state.bet = Math.max(MIN_BET, Math.min(state.bet, maxBet(state.balance)));
  state.phase = 'deal'; state.doubled = false; Sfx.unlock();
  showPanel(null); hideBanner(); mascot('idle');
  clearTable();
  state.balance -= state.bet; state.lastWin = 0; updateStats();
  if (state.shoe.needsShuffle()) { state.shoe.shuffle(); updateDeck(); toast('Baralho embaralhado'); }
  await sleep(380);
  await draw('p'); await draw('d'); await draw('p'); await draw('d', false);
  if (isBlackjack(ranksOf(state.hands.p)) || isBlackjack(ranksOf(state.hands.d))) { await finish(); return; }
  state.phase = 'player'; showPanel('play'); refreshPlayButtons();
}
function refreshPlayButtons() {
  const first = state.hands.p.length === 2;
  $('dbl').disabled = !(first && state.balance >= state.bet);
}
async function hit() {
  if (state.phase !== 'player') return;
  state.phase = 'busy'; $('hit').disabled = $('stand').disabled = $('dbl').disabled = true;
  await draw('p');
  const t = total(ranksOf(state.hands.p));
  if (t > 21) await finish();
  else if (t === 21) await dealerPlay();
  else { state.phase = 'player'; $('hit').disabled = $('stand').disabled = false; refreshPlayButtons(); }
}
async function stand() {
  if (state.phase !== 'player') return;
  state.phase = 'busy'; await dealerPlay();
}
async function dbl() {
  if (state.phase !== 'player' || state.hands.p.length !== 2 || state.balance < state.bet) return;
  state.phase = 'busy'; Sfx.chip();
  state.balance -= state.bet; state.bet *= 2; state.doubled = true;
  updateStats(); renderChips(state.bet); toast('Aposta dobrada!');
  await draw('p');
  if (total(ranksOf(state.hands.p)) > 21) await finish(); else await dealerPlay();
}
async function dealerPlay() {
  state.phase = 'dealer'; showPanel(null);
  await revealHidden();
  while (dealerShouldHit(ranksOf(state.hands.d))) { await sleep(420); await draw('d'); }
  await sleep(250);
  await finish();
}

const RESULTS = {
  'blackjack':        { t: 'BLACKJACK!',            cls: 'bj',   mood: 'wow',   anim: 'bounce' },
  'win':              { t: 'VOCÊ GANHOU!',          cls: 'win',  mood: 'happy', anim: 'bounce' },
  'dealer-bust':      { t: 'DEALER ESTOUROU!',      cls: 'win',  mood: 'happy', anim: 'bounce' },
  'push':             { t: 'EMPATE',                cls: 'push', mood: 'idle',  anim: '' },
  'lose':             { t: 'DEALER VENCEU',         cls: 'lose', mood: 'sad',   anim: 'shake' },
  'dealer-blackjack': { t: 'BLACKJACK DO DEALER',   cls: 'lose', mood: 'sad',   anim: 'shake' },
  'bust':             { t: 'ESTOUROU!',             cls: 'lose', mood: 'sad',   anim: 'shake' },
};
async function finish() {
  state.phase = 'over'; showPanel(null);
  await revealHidden();
  const res = settle(ranksOf(state.hands.p), ranksOf(state.hands.d), state.bet);
  const info = RESULTS[res.outcome];
  state.balance += res.payout;
  state.lastWin = Math.max(0, res.net);
  const staked = state.bet;
  if (state.doubled) state.bet /= 2;
  state.doubled = false;

  banner(info.t, res.net > 0 ? `+${fmt(res.net)}` : res.net < 0 ? `−${fmt(staked)}` : 'Aposta devolvida', info.cls);
  mascot(info.mood, info.anim);
  if (res.outcome === 'blackjack') { Sfx.blackjack(); coinBurst(70); }
  else if (res.net > 0) { Sfx.win(res.net >= 250); coinBurst(Math.min(60, 14 + Math.floor(res.net / 20))); }
  else if (res.net < 0) Sfx.lose();
  else Sfx.push();

  state.bet = Math.max(MIN_BET, Math.min(state.bet, maxBet(state.balance)));
  state.phase = 'bet';
  updateStats(); renderChips(state.bet);
  if (state.lastWin) flashStat(ui.won);
  if (state.balance < MIN_BET) { setTimeout(showBroke, 1800); showPanel(null); }
  else showPanel('bet');
}

// ---------- apostas ----------
function setBet(v) {
  if (state.phase !== 'bet') return;
  const nb = Math.max(MIN_BET, Math.min(maxBet(state.balance), v));
  if (nb !== state.bet) { state.bet = nb; Sfx.chip(); updateStats(); renderChips(nb); }
  else updateStats();
}

// ---------- modais ----------
let openModal = null;
function showModal(id) { openModal = $(id); openModal.hidden = false; }
function closeModal() { if (openModal) { openModal.hidden = true; openModal = null; } }
// voltar ao menu: com rodada em andamento pede confirmação (a aposta já foi descontada)
$('btnBack').addEventListener('click', e => {
  if (state.phase !== 'bet') { e.preventDefault(); showModal('leaveModal'); }
});
function showBroke() { if (openModal) closeModal(); showModal('broke'); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m && m.id !== 'broke') closeModal();
}));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
$('btnHelp').onclick = () => { Sfx.click(); showModal('rules'); };
$('restart').onclick = () => {
  closeModal(); Sfx.unlock(); Sfx.win();
  state.balance = START_BALANCE; state.bet = MIN_BET; state.lastWin = 0;
  updateStats(); renderChips(state.bet); showPanel('bet'); mascot('happy', 'bounce');
};
function syncSoundIcon() { $('btnSound').textContent = Sfx.muted ? '🔇' : '🔊'; }
function toggleSound() { Sfx.setMuted(!Sfx.muted); syncSoundIcon(); if (!Sfx.muted) Sfx.click(); }
$('btnSound').onclick = toggleSound; syncSoundIcon();

// ---------- eventos ----------
$('bm').onclick = () => setBet(state.bet - MIN_BET);
$('bp').onclick = () => setBet(state.bet + MIN_BET);
$('bclr').onclick = () => setBet(MIN_BET);
$('ball').onclick = () => setBet(maxBet(state.balance));
document.querySelectorAll('.chip').forEach(b => b.onclick = () => setBet(state.bet + Number(b.dataset.v)));
$('deal').onclick = startRound;
$('hit').onclick = hit; $('stand').onclick = stand; $('dbl').onclick = dbl;

addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (openModal) { if (k === 'escape' && openModal.id !== 'broke') closeModal(); return; }
  if (k === 'escape') { $('btnBack').click(); return; }
  if (k === 'h') hit();
  else if (k === 's') stand();
  else if (k === 'd') dbl();
  else if (k === 'm') toggleSound();
  else if (k === '?' || k === 'f1') { e.preventDefault(); showModal('rules'); }
  else if (k === 'arrowup' || k === '+') { e.preventDefault(); setBet(state.bet + MIN_BET); }
  else if (k === 'arrowdown' || k === '-') { e.preventDefault(); setBet(state.bet - MIN_BET); }
  else if (k === 'enter' || k === ' ') {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') return; // o próprio botão trata o clique
    e.preventDefault(); startRound();
  }
});

Common.sparks($('sparks'));
// ícones decorativos (arte SVG) nos rótulos e nas faixas de resultado
Art.hydrate();
for (const n of Art.names) document.documentElement.style.setProperty('--ico-' + n, `url("${Art.url(n)}")`);

// ======================================================================
//  Loop
// ======================================================================
updateStats(false); renderChips(state.bet); updateDeck(); showPanel('bet');
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  stepTweens(dt); stepCoins(dt);
  for (const l of lanterns) l.pivot.rotation.z = Math.sin(t * 0.9 + l.phase) * 0.07;
  chipBump *= 0.86; betGroup.scale.setScalar(1 + chipBump * 0.1);
  camera.position.x += (camBase.x + mouse.x * 1.8 + Math.sin(t * 0.25) * 0.2 - camera.position.x) * 0.05;
  camera.position.y += (camBase.y - mouse.y * 0.8 - camera.position.y) * 0.05;
  camera.position.z = camBase.z;
  camera.lookAt(look);
  renderer.render(scene, camera);
  placeBadges();
});

})();
