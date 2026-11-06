/* Roleta do Tigre — cena 3D (roda + bola), mesa de apostas e fluxo do giro. Regras em js/roulette-logic.js. */
(() => {
'use strict';

const L = RouletteLogic;
const { WHEEL, MIN_BET, LUCKY_MULT } = L;
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => Math.round(n).toLocaleString('pt-BR');
const short = n => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.', ',') + 'k' : String(n));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const TAU = Math.PI * 2, SLOT = TAU / 37, A0 = -Math.PI / 2;
const slotAngle = i => A0 + i * SLOT;                       // ângulo da casa i (sentido horário visto de cima)
const COLOR_NAME = { red: 'VERMELHO', black: 'PRETO', green: 'VERDE' };

// ======================================================================
//  Estado
// ======================================================================
function loadHistory() { try { const h = JSON.parse(localStorage.getItem('vu21.rl.history')); return Array.isArray(h) ? h.filter(n => Number.isInteger(n) && n >= 0 && n <= 36).slice(0, 14) : []; } catch { return []; } }
const st = {
  balance: Common.wallet.get(),
  bets: {}, order: [], last: {},
  chip: 50,
  phase: 'bet',            // bet | spin | settle
  lucky: [],
  history: loadHistory(),
  won: 0,
};
const stake = () => L.totalBet(st.bets);

// ======================================================================
//  Renderer / cena
// ======================================================================
let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
catch (err) { $('fallback').style.display = 'grid'; console.error(err); return; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.id = 'scene';
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
const PITCH = 58 * Math.PI / 180;
let camDist = 16;
const mouse = { x: 0, y: 0 };
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
addEventListener('pointermove', e => { if (reducedMotion.matches || e.pointerType !== 'mouse') return; mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });

scene.add(new THREE.HemisphereLight(0xffe6bf, 0x132a20, 0.95));
const spot = new THREE.SpotLight(0xfff0d0, 230, 40, 0.75, 0.5, 1.4);
spot.position.set(0, 12, 4); spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -0.0004;
scene.add(spot);
const warm = new THREE.PointLight(0xffd6a0, 25, 16, 1.6); warm.position.set(-4, 3, -3); scene.add(warm);

CasinoRender.setup(renderer, scene);

const goldMat = CasinoRender.brass();
const lacquer = CasinoRender.wood();
const darkMat = new THREE.MeshStandardMaterial({ color: 0x24040a, roughness: 0.6 });

// ---------- textura da roda (disco giratório) ----------
function makeWheelTexture() {
  const S = 1536, C = S / 2, U = C / 2.6;
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const R0 = 1.45 * U, R1 = 2.5 * U, RO = 2.6 * U;
  let gr = g.createRadialGradient(C, C, 0, C, C, RO); gr.addColorStop(0, '#7a4a00'); gr.addColorStop(0.9, '#d9a017'); gr.addColorStop(1, '#8a5a00');
  g.fillStyle = gr; g.beginPath(); g.arc(C, C, RO, 0, TAU); g.fill();
  gr = g.createRadialGradient(C, C, 0, C, C, R0); gr.addColorStop(0, '#9b1626'); gr.addColorStop(1, '#4a0812');
  g.fillStyle = gr; g.beginPath(); g.arc(C, C, R0, 0, TAU); g.fill();
  WHEEL.forEach((n, i) => {
    const a0 = slotAngle(i) - SLOT / 2, a1 = slotAngle(i) + SLOT / 2, col = L.colorOf(n);
    const pg = g.createRadialGradient(C, C, R0, C, C, R1);
    if (col === 'red') { pg.addColorStop(0, '#9c0f24'); pg.addColorStop(1, '#e0213a'); }
    else if (col === 'black') { pg.addColorStop(0, '#0a0a0e'); pg.addColorStop(1, '#2c2c34'); }
    else { pg.addColorStop(0, '#0b6a2c'); pg.addColorStop(1, '#27c457'); }
    g.fillStyle = pg; g.beginPath(); g.arc(C, C, R1, a0, a1); g.arc(C, C, R0, a1, a0, true); g.closePath(); g.fill();
    g.strokeStyle = '#f7c948'; g.lineWidth = 4; g.beginPath(); g.moveTo(C + R0 * Math.cos(a0), C + R0 * Math.sin(a0)); g.lineTo(C + R1 * Math.cos(a0), C + R1 * Math.sin(a0)); g.stroke();
    // número, com o topo apontando para fora
    const a = slotAngle(i), r = 1.8 * U;
    g.save(); g.translate(C + r * Math.cos(a), C + r * Math.sin(a)); g.rotate(a + Math.PI / 2);
    g.fillStyle = '#fff'; g.font = 'bold 44px Georgia, serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#000'; g.shadowBlur = 4; g.fillText(String(n), 0, 0); g.restore();
  });
  g.strokeStyle = '#fff3b0'; g.lineWidth = 7; g.beginPath(); g.arc(C, C, R1, 0, TAU); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.arc(C, C, R0, 0, TAU); g.stroke();
  g.strokeStyle = '#6b3f00'; g.lineWidth = 5; g.beginPath(); g.arc(C, C, RO - 4, 0, TAU); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
}

// ---------- textura do cubo central (tigre) ----------
function makeHubTexture() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 20, S / 2, S / 2, S / 2); gr.addColorStop(0, '#265743'); gr.addColorStop(0.75, '#143c2d'); gr.addColorStop(1, '#09251c');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.strokeStyle = '#f7c948'; g.lineWidth = 14; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 12, 0, TAU); g.stroke();
  g.lineWidth = 4; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 34, 0, TAU); g.stroke();
  g.fillStyle = '#d8c393'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '52px Georgia'; g.fillText('FORTUNA', S / 2, S / 2 - 30);
  g.font = '22px Georgia'; g.fillText('EUROPEAN ROULETTE', S / 2, S / 2 + 30);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

// ---------- disco da roda com casas rebaixadas e separadores (frets) em relevo ----------
const R_IN = 1.45, R_OUT = 2.5, R_RIM = 2.6;    // bolso interno, externo e borda da roda (mesmos raios da textura)
const Y_WHEEL = 0.16, FRET_H = 0.03, POCKET_D = 0.09;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function wheelHeight(r, a) {
  const rel = (a - A0) / SLOT, t = rel - Math.floor(rel);          // 0 = centro da casa, 0.5 = separador
  const db = Math.abs(t - 0.5) * SLOT * r;                          // distância do separador (em unidades de mundo)
  const fret = 1 - sstep(0.012, 0.04, db);
  const band = sstep(R_IN - 0.02, R_IN + 0.03, r) * (1 - sstep(R_OUT - 0.04, R_OUT + 0.02, r));
  const pocket = sstep(0.04, 0.11, db) * sstep(R_IN + 0.02, R_IN + 0.09, r) * (1 - sstep(R_OUT - 0.1, R_OUT - 0.02, r));
  return Y_WHEEL + FRET_H * fret * band - POCKET_D * pocket;
}
function makeWheelGeometry() {
  const M = 12, NR = 40, N = WHEEL.length * M;                      // subdivisões por casa e radiais
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= NR; j++) {
    const r = R_RIM * j / NR;
    for (let k = 0; k < N; k++) {
      const a = A0 + (k / M) * SLOT;
      const x = r * Math.cos(a), z = r * Math.sin(a);
      pos.push(x, wheelHeight(r, a), z);
      uv.push(0.5 + x / (2 * R_RIM), 0.5 - z / (2 * R_RIM));         // mesmo mapeamento da textura do disco
    }
  }
  for (let j = 0; j < NR; j++) for (let k = 0; k < N; k++) {
    const k1 = (k + 1) % N, v00 = j * N + k, v01 = j * N + k1, v10 = (j + 1) * N + k, v11 = (j + 1) * N + k1;
    idx.push(v00, v10, v01, v01, v10, v11);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---------- montagem 3D ----------
const wheelGroup = new THREE.Group(); scene.add(wheelGroup);
{
  const disc = new THREE.Mesh(makeWheelGeometry(), new THREE.MeshStandardMaterial({ map: makeWheelTexture(), roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide }));
  disc.receiveShadow = true; wheelGroup.add(disc);
  // parede externa da roda: tubo aberto em cima (o disco fecha o topo), então os bolsos afundam sem vazar
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R_RIM, 2.45, 0.32, 96, 1, true), darkMat); body.castShadow = true; wheelGroup.add(body);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(R_RIM, 0.05, 12, 128), goldMat); lip.rotation.x = Math.PI / 2; lip.position.y = Y_WHEEL; wheelGroup.add(lip);
}
// bacia fixa: pista da bola + aro dourado
{
  // An open bowl keeps the housing from covering the recessed numbered pockets.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.75, 3.5, 0.5, 96, 1, true), lacquer); base.position.y = -0.12; base.castShadow = base.receiveShadow = true; scene.add(base);
  const track = new THREE.Mesh(new THREE.RingGeometry(2.6, 3.25, 128), new THREE.MeshStandardMaterial({ color: 0x211912, roughness: 0.25, metalness: 0.15 }));
  track.rotation.x = -Math.PI / 2; track.position.y = 0.14; track.receiveShadow = true; scene.add(track);
  const groove = new THREE.Mesh(new THREE.RingGeometry(2.78, 2.9, 128), new THREE.MeshBasicMaterial({ color: 0xf7c948, transparent: true, opacity: 0.35 }));
  groove.rotation.x = -Math.PI / 2; groove.position.y = 0.145; scene.add(groove);
  const outer = new THREE.Mesh(new THREE.RingGeometry(3.25, 3.62, 128), CasinoRender.wood());
  outer.rotation.x = -Math.PI / 2; outer.position.y = 0.2; scene.add(outer);
  const rim1 = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.1, 16, 128), goldMat); rim1.rotation.x = Math.PI / 2; rim1.position.y = 0.2; rim1.castShadow = true; scene.add(rim1);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(3.64, 0.14, 16, 128), goldMat); rim2.rotation.x = Math.PI / 2; rim2.position.y = 0.22; rim2.castShadow = true; scene.add(rim2);
  const shadowCatcher = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x174e37, roughness: 1, bumpMap: CasinoRender.texture("felt"), bumpScale: .025 }));
  shadowCatcher.rotation.x = -Math.PI / 2; shadowCatcher.position.y = -0.38; shadowCatcher.receiveShadow = true; scene.add(shadowCatcher);
  // cubo central fixo com o tigre
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.5, 0.34, 64), goldMat); hub.position.y = 0.34; hub.castShadow = true; scene.add(hub);
  const hubTop = new THREE.Mesh(new THREE.CircleGeometry(1.26, 64), new THREE.MeshStandardMaterial({ map: makeHubTexture(), roughness: 0.4 }));
  hubTop.rotation.x = -Math.PI / 2; hubTop.position.y = 0.515; scene.add(hubTop);
  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(1.34, 0.06, 12, 64), goldMat); hubRing.rotation.x = Math.PI / 2; hubRing.position.y = 0.52; scene.add(hubRing);
}

const ball = new THREE.Mesh(new THREE.SphereGeometry(0.095, 24, 18), new THREE.MeshStandardMaterial({ color: 0xfffaf0, roughness: 0.2, metalness: 0 }));
ball.castShadow = true; scene.add(ball);

// marcadores do Tigre da Sorte (giram com a roda) e destaque da casa vencedora
const luckyPivots = [];
const tigerTex = (() => { const t = new THREE.TextureLoader().load(Common.tigerURL()); t.colorSpace = THREE.SRGBColorSpace; return t; })();
function setLuckyMarkers(nums) {
  luckyPivots.forEach(p => wheelGroup.remove(p)); luckyPivots.length = 0;
  nums.forEach(n => {
    const i = WHEEL.indexOf(n), th = slotAngle(i);
    const pivot = new THREE.Group(); pivot.rotation.y = -(th + Math.PI / 2);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), new THREE.MeshBasicMaterial({ map: tigerTex, transparent: true }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, 0.245, -2.33); pivot.add(m);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.25, 32), new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.9 }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(0, 0.24, -2.33); pivot.add(halo);
    wheelGroup.add(pivot); luckyPivots.push(pivot);
  });
}
let winMark = null;
function markWinner(idx) {
  clearWinner();
  winMark = new THREE.Mesh(new THREE.RingGeometry(1.45, 2.5, 1, 1, -(slotAngle(idx) + SLOT / 2), SLOT),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  winMark.rotation.x = -Math.PI / 2; winMark.position.y = 0.23; wheelGroup.add(winMark);
}
function clearWinner() { if (winMark) { wheelGroup.remove(winMark); winMark = null; } }

const coins = Coins.create(scene, { floorY: 0.3 });

// ======================================================================
//  Layout responsivo (roda à esquerda no desktop, em cima no celular)
// ======================================================================
let boardOrient = null;
function layout() {
  const W = innerWidth, H = innerHeight, wide = W >= 1000 && W / H >= 1.3;
  document.body.classList.toggle('wide', wide); document.body.classList.toggle('stack', !wide);
  const orient = !wide && W < 640 ? 'v' : 'h';
  if (orient !== boardOrient) buildBoard(orient);
  const ph = $('panel').offsetHeight;
  document.body.style.setProperty('--panel-h', ph + 'px');
  if (!wide) document.body.style.setProperty('--wheel-h', Math.round(Math.max(200, Math.min(H * (W < 640 ? 0.27 : 0.4), 440))) + 'px');
  renderer.setSize(W, H); camera.aspect = W / H;
  let fx = 0, fy = 70, fw, fh;
  if (wide) { fw = $('side').getBoundingClientRect().left - 10; fh = H - ph - 78; }
  else { fw = W; fh = parseFloat(getComputedStyle(document.body).getPropertyValue('--wheel-h')) - 6; }
  const ppu = Math.max(20, Math.min(fw * 0.94 / 7.7, fh * 0.94 / (7.7 * Math.sin(PITCH) + 0.5)));
  camDist = H / (2 * Math.tan(camera.fov * Math.PI / 360) * ppu);
  camera.setViewOffset(W, H, W / 2 - (fx + fw / 2), H / 2 - (fy + fh / 2), W, H);
  camera.updateProjectionMatrix();
  // faixa de resultado centralizada sobre a roda
  const b = $('banner'); b.style.left = (fx + fw / 2) + 'px'; b.style.top = (fy + 40) + 'px';
}

// ======================================================================
//  UI
// ======================================================================
const tiger = Common.createTiger($('tiger'));
const medal = $('medal');
medal.addEventListener('animationend', () => medal.classList.remove('bounce', 'shake'));
function mascot(m, cls) { tiger.setMood(m); medal.classList.remove('bounce', 'shake'); void medal.offsetWidth; if (cls) medal.classList.add(cls); }

function animateNumber(el, to, ms = 600) {
  const from = el.dataset.v === undefined ? to : Number(el.dataset.v);
  el.dataset.v = to; cancelAnimationFrame(el._raf);
  if (from === to || !ms) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = now => { const k = Math.min((now - t0) / ms, 1), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) el._raf = requestAnimationFrame(step); };
  el._raf = requestAnimationFrame(step);
}
function toast(text, ms = 1800) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); }
const nball = n => { const s = document.createElement('span'); s.className = 'nball ' + L.colorOf(n); s.textContent = n; return s; };

// ---------- mesa ----------
const cells = {};
function cell(key, label, cls, col, row, colSpan = 1, rowSpan = 1, aria) {
  const b = document.createElement('button');
  b.className = 'cell ' + cls; b.dataset.key = key; b.setAttribute('aria-label', aria);
  b.style.gridColumn = `${col} / span ${colSpan}`; b.style.gridRow = `${row} / span ${rowSpan}`;
  b.innerHTML = `<span class="lbl">${label}</span><span class="mark" hidden></span>`;
  cells[key] = b; return b;
}
function buildBoard(orient) {
  boardOrient = orient;
  const board = $('board'); board.innerHTML = ''; board.className = orient;
  for (const k of Object.keys(cells)) delete cells[k];
  const frag = document.createDocumentFragment(), add = (...a) => frag.appendChild(cell(...a));
  const num = n => `${L.colorOf(n)}`;
  if (orient === 'h') {
    add('n:0', '0', 'num green', 1, 1, 1, 3, 'Número 0, verde');
    for (let n = 1; n <= 36; n++) add('n:' + n, n, 'num ' + num(n), Math.ceil(n / 3) + 1, 3 - ((n - 1) % 3), 1, 1, `Número ${n}, ${COLOR_NAME[num(n)].toLowerCase()}`);
    add('c3', '2:1', 'out', 14, 1, 1, 1, '3ª coluna, paga 2 para 1'); add('c2', '2:1', 'out', 14, 2, 1, 1, '2ª coluna, paga 2 para 1'); add('c1', '2:1', 'out', 14, 3, 1, 1, '1ª coluna, paga 2 para 1');
    add('d1', '1ª DÚZIA', 'out', 2, 4, 4, 1, '1ª dúzia, números 1 a 12'); add('d2', '2ª DÚZIA', 'out', 6, 4, 4, 1, '2ª dúzia, números 13 a 24'); add('d3', '3ª DÚZIA', 'out', 10, 4, 4, 1, '3ª dúzia, números 25 a 36');
    [['low', '1–18', ''], ['even', 'PAR', ''], ['red', '◆', 'red'], ['black', '◆', 'black'], ['odd', 'ÍMPAR', ''], ['high', '19–36', '']]
      .forEach(([k, lbl, c], i) => add(k, lbl, 'out ' + c, 2 + i * 2, 5, 2, 1, L.RULES[k].label));
  } else {
    add('n:0', '0', 'num green', 1, 1, 3, 1, 'Número 0, verde');
    for (let n = 1; n <= 36; n++) add('n:' + n, n, 'num ' + num(n), ((n - 1) % 3) + 1, Math.ceil(n / 3) + 1, 1, 1, `Número ${n}, ${COLOR_NAME[num(n)].toLowerCase()}`);
    add('c1', '2:1', 'out', 1, 14, 1, 1, '1ª coluna, paga 2 para 1'); add('c2', '2:1', 'out', 2, 14, 1, 1, '2ª coluna, paga 2 para 1'); add('c3', '2:1', 'out', 3, 14, 1, 1, '3ª coluna, paga 2 para 1');
    add('d1', '1ª DÚZIA', 'out', 4, 2, 1, 4, '1ª dúzia'); add('d2', '2ª DÚZIA', 'out', 4, 6, 1, 4, '2ª dúzia'); add('d3', '3ª DÚZIA', 'out', 4, 10, 1, 4, '3ª dúzia');
    [['low', '1–18', ''], ['even', 'PAR', ''], ['red', '◆', 'red'], ['black', '◆', 'black'], ['odd', 'ÍMPAR', ''], ['high', '19–36', '']]
      .forEach(([k, lbl, c], i) => add(k, lbl, 'out ' + c, 5, 2 + i * 2, 1, 2, L.RULES[k].label));
  }
  board.appendChild(frag);
  renderBoard();
}
function markColor(a) { return a >= 500 ? '#4a3a78' : a >= 250 ? '#d4351c' : a >= 100 ? '#1fa34a' : '#2b6fe0'; }
function renderBoard() {
  for (const [key, el] of Object.entries(cells)) {
    const a = st.bets[key] || 0, m = el.querySelector('.mark');
    if (a) { m.hidden = false; m.textContent = short(a); m.style.setProperty('--mc', markColor(a)); } else m.hidden = true;
    el.classList.toggle('lucky', key.startsWith('n:') && st.lucky.includes(Number(key.slice(2))));
  }
}
function clearHint() { for (const el of Object.values(cells)) el.classList.remove('hint'); }
$('board').addEventListener('pointerover', e => {
  const b = e.target.closest('.cell'); clearHint(); if (!b) return;
  const rule = L.ruleOf(b.dataset.key); if (!rule || b.dataset.key.startsWith('n:')) return;
  for (let n = 0; n <= 36; n++) if (rule.covers(n)) cells['n:' + n]?.classList.add('hint');
});
$('board').addEventListener('pointerleave', clearHint);
$('board').addEventListener('click', e => { const b = e.target.closest('.cell'); if (b) placeBet(b.dataset.key); });
$('board').addEventListener('contextmenu', e => { const b = e.target.closest('.cell'); if (b) { e.preventDefault(); removeBet(b.dataset.key); } });

function renderLucky() {
  const box = $('luckNums'); box.innerHTML = ''; st.lucky.forEach(n => box.appendChild(nball(n)));
}
function renderHistory() { const h = $('history'); h.innerHTML = ''; st.history.forEach(n => h.appendChild(nball(n))); }

function updateStats(animate = true) {
  animateNumber($('bal'), st.balance, animate ? 500 : 0);
  animateNumber($('bet'), stake(), animate ? 250 : 0);
  animateNumber($('won'), st.won, animate && st.won ? 900 : 0);
  $('won').classList.toggle('has', st.won > 0);
  const open = st.phase === 'bet', any = stake() > 0;
  $('spin').disabled = !open || !any;
  $('bundo').disabled = !open || !st.order.length;
  $('bclr').disabled = !open || !any;
  $('brep').disabled = !open || !Object.keys(st.last).length;
  $('bdbl').disabled = !open || !any || st.balance < stake();
  document.querySelectorAll('.chip').forEach(b => { b.disabled = !open; });
}

// ---------- apostas ----------
function placeBet(key, amount = st.chip) {
  if (st.phase !== 'bet') return;
  if (st.balance < amount) { toast('Fichas insuficientes'); return; }
  st.balance -= amount; st.bets[key] = (st.bets[key] || 0) + amount; st.order.push({ key, amount });
  clearWin(); Sfx.chip(); renderBoard(); updateStats();
}
function removeBet(key) { // botão direito: tira a última ficha daquela casa
  if (st.phase !== 'bet') return;
  for (let i = st.order.length - 1; i >= 0; i--) if (st.order[i].key === key) { undoAt(i); return; }
}
function undoAt(i) {
  const { key, amount } = st.order.splice(i, 1)[0];
  st.bets[key] -= amount; if (st.bets[key] <= 0) delete st.bets[key];
  st.balance += amount; Sfx.click(); renderBoard(); updateStats();
}
const undo = () => { if (st.phase === 'bet' && st.order.length) undoAt(st.order.length - 1); };
function clearBets() {
  if (st.phase !== 'bet' || !stake()) return;
  st.balance += stake(); st.bets = {}; st.order = []; Sfx.click(); renderBoard(); updateStats();
}
function repeatBets() {
  if (st.phase !== 'bet') return;
  const total = L.totalBet(st.last);
  if (!total) return;
  if (st.balance + stake() < total) { toast('Fichas insuficientes para repetir'); return; }
  st.balance += stake(); st.bets = {}; st.order = [];
  for (const [key, amount] of Object.entries(st.last)) { st.bets[key] = amount; st.order.push({ key, amount }); st.balance -= amount; }
  clearWin(); Sfx.chip(); renderBoard(); updateStats();
}
function doubleBets() {
  if (st.phase !== 'bet' || !stake()) return;
  if (st.balance < stake()) { toast('Fichas insuficientes para dobrar'); return; }
  for (const [key, amount] of Object.entries({ ...st.bets })) { st.bets[key] += amount; st.order.push({ key, amount }); st.balance -= amount; }
  Sfx.chip(); renderBoard(); updateStats();
}
function selectChip(v) {
  st.chip = v; Sfx.click();
  document.querySelectorAll('.chip').forEach(b => { const on = Number(b.dataset.v) === v; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); });
}

// ---------- faixa de resultado ----------
function banner(number, amountText, cls, subText) {
  const b = $('banner'); b.className = cls;
  const t = b.querySelector('.t'); t.innerHTML = '';
  t.appendChild(nball(number)); t.appendChild(document.createTextNode(COLOR_NAME[L.colorOf(number)]));
  const a = b.querySelector('.a'); a.textContent = amountText;
  let sub = b.querySelector('.sub'); if (!sub) { sub = document.createElement('span'); sub.className = 'sub'; b.appendChild(sub); }
  sub.textContent = subText || ''; sub.style.display = subText ? 'block' : 'none';
  void b.offsetWidth; b.classList.add('show');
  clearTimeout(banner.t); banner.t = setTimeout(hideBanner, 5200);   // não fica tampando a roda
}
const hideBanner = () => $('banner').classList.remove('show');
function clearWin() { document.querySelectorAll('.cell.win').forEach(c => c.classList.remove('win')); }

// ======================================================================
//  Giro
// ======================================================================
let W = 0, omega = -0.15, omegaTarget = -0.15;   // W: ângulo da roda (mesma convenção de slotAngle)
let anim = null, ballIdx = 0;
const R_TRACK = 2.84, R_POCKET = 2.2, Y_BALL = 0.25;
const Y_POCKET = 0.165;   // bola no fundo do bolso (piso 0.07 + raio 0.095)

function ballPose(idx, p) {
  const th = slotAngle(idx) + W;
  let a = th, r = R_POCKET, y = Y_POCKET;
  if (p < 1) {
    a = th - TAU * anim.K * Math.pow(1 - p, anim.e);
    if (p < 0.07) { const k = ease(p / 0.07); r = lerp(R_POCKET, R_TRACK, k); y = lerp(Y_POCKET, Y_BALL, k) + Math.sin(k * Math.PI) * 0.22; }
    else if (p < 0.62) { r = R_TRACK; y = Y_BALL; }
    else if (p < 0.84) { const k = ease((p - 0.62) / 0.22); r = lerp(R_TRACK, R_POCKET, k); y = lerp(Y_BALL, Y_POCKET, k); }
    else { const q = (p - 0.84) / 0.16; r = R_POCKET + 0.07 * Math.sin(q * 38) * (1 - q); y = Y_POCKET + Math.abs(Math.sin(q * Math.PI * 6)) * 0.15 * Math.pow(1 - q, 1.5); }
    if (p >= 0.62) {   // enquanto cai, a bola salta por cima dos separadores (frets)
      const rel = a - W - A0, fp = rel / SLOT - Math.floor(rel / SLOT);
      y += 0.14 * Math.max(0, 1 - Math.abs(fp - 0.5) * 8) * (1 - sstep(0.92, 1, p));
    }
  }
  return { a, r, y };
}
function placeBall(idx, p) { const { a, r, y } = ballPose(idx, p); ball.position.set(r * Math.cos(a), y, r * Math.sin(a)); return a; }

function launchBall(result) {
  return new Promise(resolve => {
    anim = { t: 0, T: 7.6, K: 7, e: 2.25, idx: WHEEL.indexOf(result), lastSlot: null, lastTick: 0, dropped: false, resolve };
    omegaTarget = -1.1; Sfx.whoosh();
  });
}

async function spin() {
  if (st.phase !== 'bet' || !stake()) return;
  Sfx.unlock();
  st.phase = 'spin'; st.last = { ...st.bets };
  Common.wallet.set(st.balance);            // aposta já descontada: salva só o que não pode ser desfeito
  hideBanner(); clearWin(); clearWinner(); st.won = 0; mascot('idle');
  updateStats();
  const result = L.spinNumber();
  await launchBall(result);
  omegaTarget = -0.15;
  await sleep(450);

  // ---------- liquidação ----------
  st.phase = 'settle';
  const luckyHit = st.lucky.includes(result);
  const res = L.settle(st.bets, result, luckyHit ? LUCKY_MULT : 1);
  const staked = res.staked;
  st.balance += res.payout; st.won = Math.max(0, res.net);
  Common.wallet.set(st.balance);
  st.history.unshift(result); st.history.length = Math.min(st.history.length, 14);
  try { localStorage.setItem('vu21.rl.history', JSON.stringify(st.history)); } catch {}
  markWinner(ballIdx = WHEEL.indexOf(result));
  for (const w of res.wins) cells[w.key]?.classList.add('win'); cells['n:' + result]?.classList.add('win');
  st.bets = {}; st.order = []; renderBoard(); renderHistory();

  const big = res.net >= staked * 5;
  if (res.net > 0) {
    banner(result, `+${fmt(res.net)}`, luckyHit ? 'win lucky' : 'win', luckyHit ? 'TIGRE DA SORTE ×2!' : (big ? 'GRANDE PRÊMIO!' : ''));
    luckyHit || big ? (Sfx.blackjack(), mascot('wow', 'bounce')) : (Sfx.win(res.net >= 250), mascot('happy', 'bounce'));
    coins.burst(Math.min(70, 14 + Math.floor(res.net / 20)), { w: 5, d: 5, top: 7 });
  } else if (res.net === 0) {
    banner(result, 'Aposta devolvida', 'push', luckyHit ? 'Tigre da Sorte!' : ''); Sfx.push();
  } else {
    // mostra o resultado líquido (numa aposta parcialmente vencedora, perde-se menos que o total apostado)
    banner(result, `−${fmt(-res.net)}`, 'lose', luckyHit ? 'O tigre estava de olho…' : (res.wins.length ? 'Você acertou parte das apostas' : '')); Sfx.lose(); mascot('sad', 'shake');
  }
  newRound();
  st.phase = 'bet'; updateStats();
  if (st.balance < MIN_BET) setTimeout(showBroke, 1900);
}
function newRound() {
  st.lucky = L.luckyNumbers(); setLuckyMarkers(st.lucky); renderLucky(); renderBoard();
}

// ======================================================================
//  Modais, som, teclado
// ======================================================================
let openModal = null;
function showModal(id) { openModal = $(id); openModal.hidden = false; }
function closeModal() { if (openModal) { openModal.hidden = true; openModal = null; } }
function showBroke() { if (st.balance >= MIN_BET) return; if (openModal) closeModal(); showModal('broke'); }
document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m && m.id !== 'broke') closeModal(); }));
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeModal));
$('btnHelp').onclick = () => { Sfx.click(); showModal('rules'); };
$('btnBack').addEventListener('click', e => { if (st.phase !== 'bet') { e.preventDefault(); showModal('leaveModal'); } });
$('restart').onclick = () => {
  closeModal(); Sfx.unlock(); Sfx.win();
  st.balance = Common.wallet.START; Common.wallet.set(st.balance); st.won = 0; st.bets = {}; st.order = [];
  updateStats(); renderBoard(); mascot('happy', 'bounce');
};
const syncSound = () => { $('btnSound').textContent = Sfx.muted ? '🔇' : '🔊'; };
function toggleSound() { Sfx.setMuted(!Sfx.muted); syncSound(); if (!Sfx.muted) Sfx.click(); }
$('btnSound').onclick = toggleSound; syncSound();

document.querySelectorAll('.chip').forEach(b => b.onclick = () => selectChip(Number(b.dataset.v)));
$('bundo').onclick = undo; $('bclr').onclick = clearBets; $('brep').onclick = repeatBets; $('bdbl').onclick = doubleBets; $('spin').onclick = spin;

addEventListener('keydown', e => {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (openModal) { if (k === 'escape' && openModal.id !== 'broke') closeModal(); return; }
  if (k === 'escape') { $('btnBack').click(); return; }
  if (k === 'm') toggleSound();
  else if (k === '?' || k === 'f1') { e.preventDefault(); showModal('rules'); }
  else if (k >= '1' && k <= '4') selectChip(L.CHIP_VALUES[Number(k) - 1]);
  else if (k === 'z') undo();
  else if (k === 'c') clearBets();
  else if (k === 'r') repeatBets();
  else if (k === 'd') doubleBets();
  else if (k === 'enter' || k === ' ') {
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
    e.preventDefault(); spin();
  }
});

// ======================================================================
//  Início
// ======================================================================
document.documentElement.style.setProperty('--tiger', `url(${Common.tigerURL()})`);
Art.hydrate();
Common.sparks($('sparks'));
let resizeRaf = 0;
addEventListener('resize', () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(layout); });
newRound(); renderHistory(); updateStats(false); layout();
ballIdx = 0; W = 0;
if (st.balance < MIN_BET) showBroke();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  omega += (omegaTarget - omega) * Math.min(1, dt * 1.6);
  W += omega * dt; wheelGroup.rotation.y = -W;

  if (anim) {
    anim.t += dt; const p = Math.min(anim.t / anim.T, 1);
    const a = placeBall(anim.idx, p);
    const slotNow = Math.floor((a - W - A0) / SLOT);               // tique ao passar pelas casas
    if (anim.lastSlot !== null && slotNow !== anim.lastSlot && p < 0.9 && t - anim.lastTick > 0.045) { Sfx.tick(); anim.lastTick = t; }
    anim.lastSlot = slotNow;
    if (!anim.dropped && p > 0.7) { anim.dropped = true; Sfx.drop(); }
    if (p >= 1) { ballIdx = anim.idx; const done = anim.resolve; anim = null; done(); }
  } else {
    placeBall(ballIdx, 1);
  }
  for (const lp of luckyPivots) lp.children[1].material.opacity = 0.55 + 0.45 * Math.sin(t * 4);
  if (winMark) winMark.material.opacity = 0.35 + 0.3 * Math.sin(t * 6);
  coins.step(dt);

  camera.position.set(mouse.x * 0.9, camDist * Math.sin(PITCH) - mouse.y * 0.5, camDist * Math.cos(PITCH));
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
});

})();
