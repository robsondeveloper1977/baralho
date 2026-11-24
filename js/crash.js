/* Foguete do Tigre — rodadas, apostas e desenho do gráfico (canvas 2D). Regras puras em crash-logic.js. */
(() => {
'use strict';
const L = CrashLogic, $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('pt-BR');
const fx = m => m.toFixed(2).replace('.', ',') + '×';
const BET_MS = 6500, CRASH_MS = 3200;
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : v; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};

// ---------- estado ----------
const st = {
  balance: Common.wallet.get(),
  bet: 100,
  phase: 'bet',          // bet (contagem) → fly → crashed
  phaseAt: performance.now(),
  point: 1,              // ponto de explosão da rodada em voo
  cur: null,             // aposta desta rodada: { stake, state: 'live'|'cashed'|'lost', mult, payout }
  next: 0,               // aposta registrada para a próxima decolagem (já descontada do saldo)
  history: [],
  lastNet: 0,
};
if (st.balance < L.MIN_BET) { st.balance = Common.wallet.START; Common.wallet.set(st.balance); }
st.bet = L.clampBet(parseInt(store.get('vu21.cr.bet', '100'), 10), st.balance);
try {
  const h = JSON.parse(store.get('vu21.cr.history', '[]'));
  if (Array.isArray(h)) st.history = h.filter(x => Number.isFinite(x) && x >= 1 && x <= L.MAX_MULT).slice(0, 14);
} catch {}

// ---------- ações da interface ----------
Art.hydrate();
const tiger = Common.createTiger($('tiger'));
const medal = $('medal');
const hopMedal = () => { medal.classList.remove('hop'); void medal.offsetWidth; medal.classList.add('hop'); };
const el = { bal: $('bal'), betOut: $('betOut'), won: $('won'), act: $('act'), betIn: $('betIn'), autoIn: $('autoIn'), autoBet: $('autoBet'),
  mult: $('mult'), status: $('status'), bar: $('bar'), hist: $('hist'), banner: $('banner'), toast: $('toast') };
const setText = (node, text) => { if (node.textContent !== text) node.textContent = text; };
const setClass = (node, cls) => { if (node.className !== cls) node.className = cls; };

el.autoIn.value = store.get('vu21.cr.auto', '');
el.autoBet.checked = store.get('vu21.cr.autobet', '0') === '1';
const autoTarget = () => L.parseTarget(el.autoIn.value);

function toast(msg) {
  el.toast.textContent = msg; el.toast.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.toast.classList.remove('show'), 1800);
}
let bannerTimer = 0;
function banner(title, amount, cls, sub) {
  el.banner.querySelector('.t').textContent = title;
  el.banner.querySelector('.a').innerHTML = '';
  el.banner.querySelector('.a').append(amount);
  if (sub) { const s = document.createElement('span'); s.className = 'sub'; s.textContent = sub; el.banner.querySelector('.a').append(s); }
  el.banner.className = 'show ' + cls;
  clearTimeout(bannerTimer); bannerTimer = setTimeout(() => { el.banner.className = ''; }, 3200);
}
const modals = [...document.querySelectorAll('.modal')];
const anyModal = () => modals.some(m => !m.hidden);
const showModal = id => { $(id).hidden = false; };
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { b.closest('.modal').hidden = true; }));

function saveBalance() { Common.wallet.set(st.balance); }
function setBet(v) {
  st.bet = L.clampBet(v, st.balance);
  el.betIn.value = String(st.bet); store.set('vu21.cr.bet', String(st.bet));
  render();
}

function placeBet() {
  if (st.next > 0) return;
  const stake = L.clampBet(st.bet, st.balance);
  if (st.balance < L.MIN_BET || stake > st.balance) { toast('Saldo insuficiente'); return; }
  st.balance -= stake; st.next = stake; saveBalance();
  Sfx.chip(); render();
}
function cancelBet() {
  if (st.next <= 0) return;
  st.balance += st.next; st.next = 0; saveBalance(); Sfx.click(); render();
}
function currentFlightMs(now = performance.now()) { return now - st.phaseAt; }
function cashOut(mult) {
  const c = st.cur;
  if (!c || c.state !== 'live') return;
  c.state = 'cashed'; c.mult = mult; c.payout = L.payout(c.stake, mult);
  st.balance += c.payout; saveBalance();
  st.lastNet = c.payout - c.stake;
  Sfx.win(mult >= 5); tiger.setMood('happy', 2200); hopMedal();
  burstAtTip(26, 'gold');
  banner('SACOU EM ' + fx(mult), '+' + fmt(c.payout - c.stake), 'win', 'Prêmio ' + fmt(c.payout));
  render();
}
function mainAction() {
  if (anyModal()) return;
  const c = st.cur;
  if (c && c.state === 'live' && st.phase === 'fly') {
    const ms = currentFlightMs();
    if (!L.isCrashed(st.point, ms)) cashOut(L.displayAt(ms));
  } else if (st.next > 0) cancelBet();
  else placeBet();
}

// campo de aposta
el.betIn.addEventListener('input', () => { el.betIn.value = el.betIn.value.replace(/\D/g, '').slice(0, 9); });
el.betIn.addEventListener('change', () => setBet(el.betIn.value));
el.betIn.addEventListener('keydown', e => { if (e.key === 'Enter') { setBet(el.betIn.value); el.betIn.blur(); e.stopPropagation(); } });
$('betMinus').addEventListener('click', () => setBet(Math.max(L.MIN_BET, st.bet - 50)));
$('betPlus').addEventListener('click', () => setBet(st.bet + 50));
document.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
  const q = b.dataset.q;
  setBet(q === 'half' ? Math.floor(st.bet / 2) : q === 'dbl' ? st.bet * 2 : st.balance);
}));
el.autoIn.addEventListener('input', () => { el.autoIn.value = el.autoIn.value.replace(/[^\d.,]/g, '').slice(0, 8); store.set('vu21.cr.auto', el.autoIn.value); });
el.autoIn.addEventListener('keydown', e => { if (e.key === 'Enter') { el.autoIn.blur(); e.stopPropagation(); } });
el.autoBet.addEventListener('change', () => store.set('vu21.cr.autobet', el.autoBet.checked ? '1' : '0'));
el.act.addEventListener('click', mainAction);

// som, ajuda, voltar
const btnSound = $('btnSound');
const syncSound = () => { btnSound.textContent = Sfx.muted ? '🔇' : '🔊'; };
syncSound();
btnSound.addEventListener('click', () => { Sfx.setMuted(!Sfx.muted); syncSound(); Sfx.click(); });
$('btnHelp').addEventListener('click', () => showModal('rules'));
addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
$('btnBack').addEventListener('click', e => {
  if (st.cur && st.cur.state === 'live' && st.phase === 'fly') { e.preventDefault(); showModal('leaveModal'); }
});
$('restart').addEventListener('click', () => {
  st.balance = Common.wallet.START; saveBalance(); $('broke').hidden = true; setBet(100); render();
});

addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = e.target && e.target.tagName;
  if (e.key === 'Escape') {
    const open = modals.find(m => !m.hidden && m.id !== 'broke');
    if (open) open.hidden = true; else $('btnBack').click();
    return;
  }
  if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'A') return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mainAction(); }
  else if (e.key === 'm' || e.key === 'M') btnSound.click();
  else if (e.key === '?' ) showModal('rules');
  else if (e.key === '[') setBet(Math.floor(st.bet / 2));
  else if (e.key === ']') setBet(st.bet * 2);
});

// devolve a aposta registrada se a página for fechada antes da decolagem
addEventListener('pagehide', () => {
  if (st.next > 0) { Common.wallet.set(Common.wallet.get() + st.next); st.balance += st.next; st.next = 0; }
});
addEventListener('pageshow', e => { if (e.persisted) { st.balance = Common.wallet.get(); render(); } });

// ---------- rodadas ----------
function randomR() {
  try { const a = new Uint32Array(2); crypto.getRandomValues(a); return (a[0] * 2 ** 21 + (a[1] >>> 11)) / 2 ** 53; }
  catch { return Math.random(); }
}
function startFlight(now) {
  st.point = L.crashPoint(randomR());
  st.phase = 'fly'; st.phaseAt = now; view.t = 6; view.m = 2; lastRise = 0;
  st.cur = st.next > 0 ? { stake: st.next, state: 'live', mult: 0, payout: 0 } : null;
  st.next = 0; st.lastNet = 0;
  trail.length = 0;
  Sfx.whoosh(); tiger.setMood('happy', 1200);
  render();
}
function endRound(now) {
  st.phase = 'crashed'; st.phaseAt = now;
  st.history.unshift(st.point); st.history.length = Math.min(st.history.length, 14);
  store.set('vu21.cr.history', JSON.stringify(st.history));
  const c = st.cur;
  Sfx.boom(); shake = 0.45; burstAtTip(70, 'boom');
  if (c && c.state === 'live') {
    c.state = 'lost'; st.lastNet = -c.stake;
    tiger.setMood('sad', CRASH_MS); Sfx.lose();
    banner('EXPLODIU EM ' + fx(st.point), '−' + fmt(c.stake), 'lose', 'Você não sacou a tempo');
  } else if (!c) tiger.setMood(st.point >= 10 ? 'wow' : 'idle', 1800);
  renderHistory(true); render();
}
function newBetPhase(now) {
  st.phase = 'bet'; st.phaseAt = now; st.cur = null;
  if (el.autoBet.checked && st.next === 0 && st.balance >= L.MIN_BET) {
    st.bet = L.clampBet(st.bet, st.balance); el.betIn.value = String(st.bet); placeBet();
  }
  if (st.next === 0 && st.balance < L.MIN_BET) showModal('broke');
  else if (st.next === 0 && st.bet > st.balance) setBet(st.balance);
  render();
}
let lastCount = -1;
function update(now) {
  if (st.phase === 'bet') {
    const remain = BET_MS - (now - st.phaseAt);
    const sec = Math.ceil(remain / 1000);
    if (sec !== lastCount) { lastCount = sec; if (sec > 0 && sec <= 3) Sfx.tick(); }
    if (remain <= 0) startFlight(now);
  } else if (st.phase === 'fly') {
    const ms = now - st.phaseAt, c = st.cur, auto = autoTarget();
    if (c && c.state === 'live' && auto !== null && auto <= st.point && ms >= L.timeAt(auto)) cashOut(auto);
    if (L.isCrashed(st.point, ms)) endRound(now);
  } else if (now - st.phaseAt >= CRASH_MS) newBetPhase(now);
}

// ---------- renderização da interface (texto/estado) ----------
function renderHistory(fresh) {
  el.hist.innerHTML = '';
  st.history.forEach((m, i) => {
    const s = document.createElement('span');
    s.className = 'hchip ' + L.bucket(m) + (fresh && i === 0 ? ' new' : '');
    s.textContent = fx(m); el.hist.appendChild(s);
  });
}
let shownBal = null;
function render() {
  if (shownBal !== st.balance) { setText(el.bal, fmt(st.balance)); shownBal = st.balance; }
  const c = st.cur, live = c && c.state === 'live' && st.phase === 'fly';
  const stakeShown = c ? c.stake : st.next;
  setText(el.betOut, fmt(stakeShown));
  let won = 0;
  if (c && c.state === 'cashed') won = c.payout;
  else if (live) won = L.payout(c.stake, L.displayAt(currentFlightMs()));
  setText(el.won, fmt(won));
  setClass(el.won, won > 0 ? 'up' : '');
  if (live) {
    setClass(el.act, 'act cash');
    el.act.innerHTML = 'SACAR<small>' + fx(L.displayAt(currentFlightMs())) + ' · ' + fmt(won) + '</small>';
    el.act.disabled = false;
  } else if (st.next > 0) {
    setClass(el.act, 'act stand cancel');
    el.act.innerHTML = 'CANCELAR<small>aposta de ' + fmt(st.next) + ' registrada</small>'; el.act.disabled = false;
  } else {
    setClass(el.act, 'act hit');
    const can = st.balance >= L.MIN_BET;
    el.act.innerHTML = 'APOSTAR<small>' + (can ? fmt(L.clampBet(st.bet, st.balance)) + ' fichas' : 'sem saldo') + '</small>';
    el.act.disabled = !can;
  }
}
// só o texto do botão SACAR e o ganho mudam a cada quadro
function renderLive() {
  const c = st.cur;
  if (!(c && c.state === 'live' && st.phase === 'fly')) return;
  const m = L.displayAt(currentFlightMs()), p = L.payout(c.stake, m);
  const small = el.act.querySelector('small'), t = fx(m) + ' · ' + fmt(p);
  if (small && small.textContent !== t) small.textContent = t;
  setText(el.won, fmt(p)); setClass(el.won, p > 0 ? 'up' : '');
}
function renderReadout(now) {
  const c = st.cur;
  if (st.phase === 'bet') {
    const remain = Math.max(0, BET_MS - (now - st.phaseAt));
    setClass(el.mult, 'wait'); setText(el.mult, 'Decola em ' + (remain / 1000).toFixed(1).replace('.', ',') + 's');
    setClass(el.status, st.next > 0 ? 'ok' : '');
    setText(el.status, st.next > 0 ? 'APOSTA REGISTRADA · ' + fmt(st.next) : 'FAÇA SUA APOSTA');
    el.bar.className = 'on'; el.bar.firstElementChild.style.transform = 'scaleX(' + (remain / BET_MS).toFixed(3) + ')';
  } else {
    el.bar.className = '';
    if (st.phase === 'fly') {
      const m = L.displayAt(now - st.phaseAt);
      setClass(el.mult, m >= 10 ? 'blaze' : m >= 2 ? 'hot' : '');
      setText(el.mult, fx(m));
      if (c && c.state === 'cashed') { setClass(el.status, 'ok'); setText(el.status, 'VOCÊ SACOU EM ' + fx(c.mult) + ' · +' + fmt(c.payout - c.stake)); }
      else if (c) { setClass(el.status, ''); setText(el.status, 'APOSTA NO AR · ' + fmt(c.stake)); }
      else { setClass(el.status, ''); setText(el.status, st.next > 0 ? 'APOSTA PARA A PRÓXIMA RODADA' : 'RODADA EM ANDAMENTO'); }
      if (m >= 2) tiger.mood !== 'happy' && m < 10 && tiger.setMood('happy', 1500);
      if (m >= 10 && tiger.mood !== 'wow') tiger.setMood('wow', 2500);
    } else {
      setClass(el.mult, 'bust'); setText(el.mult, fx(st.point));
      if (c && c.state === 'lost') { setClass(el.status, 'bad'); setText(el.status, 'EXPLODIU · −' + fmt(c.stake)); }
      else if (c && c.state === 'cashed') { setClass(el.status, 'ok'); setText(el.status, 'EXPLODIU · VOCÊ SACOU EM ' + fx(c.mult)); }
      else { setClass(el.status, ''); setText(el.status, 'O FOGUETE EXPLODIU'); }
    }
  }
}

// ---------- gráfico ----------
const cv = $('chart'), g = cv.getContext('2d');
// Foguete desenhado em SVG (ponta em cima, bocal embaixo): ogiva dourada, corpo vermelho com faixas, aletas e janela com o tigre.
const ROCKET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200">
<defs>
  <linearGradient id="rb" x1="0" x2="1"><stop offset="0" stop-color="#ff5a46"/><stop offset=".45" stop-color="#e0212f"/><stop offset="1" stop-color="#7a0f1a"/></linearGradient>
  <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#f7c948"/><stop offset="1" stop-color="#9a6206"/></linearGradient>
  <linearGradient id="rf" x1="0" x2="1"><stop offset="0" stop-color="#ffd54a"/><stop offset="1" stop-color="#b9780a"/></linearGradient>
  <radialGradient id="rw" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe7a0"/><stop offset=".55" stop-color="#3a0c12"/><stop offset="1" stop-color="#12030a"/></radialGradient>
</defs>
<path d="M40 126 L12 170 Q10 178 20 180 L44 168 Z" fill="url(#rf)" stroke="#5a0a14" stroke-width="3" stroke-linejoin="round"/>
<path d="M80 126 L108 170 Q110 178 100 180 L76 168 Z" fill="url(#rf)" stroke="#5a0a14" stroke-width="3" stroke-linejoin="round"/>
<path d="M34 50 L86 50 L86 170 Q86 179 77 180 L43 180 Q34 179 34 170 Z" fill="url(#rb)" stroke="#5a0a14" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M60 2 C77 18 85 34 87 52 L33 52 C35 34 43 18 60 2 Z" fill="url(#rg)" stroke="#8a5a00" stroke-width="2.5" stroke-linejoin="round"/>
<rect x="31" y="50" width="58" height="7" rx="2" fill="url(#rg)" stroke="#8a5a00" stroke-width="2"/>
<rect x="31" y="116" width="58" height="9" rx="2" fill="url(#rg)" stroke="#8a5a00" stroke-width="2"/>
<path d="M42 62 L42 108 Q42 110 44 110 L44 62 Z" fill="#fff" opacity=".22"/>
<circle cx="60" cy="88" r="19" fill="url(#rg)" stroke="#8a5a00" stroke-width="2"/>
<circle cx="60" cy="88" r="15" fill="url(#rw)"/>
<circle cx="60" cy="90" r="10" fill="#ff8a1c" stroke="#2b1100" stroke-width="1.5"/>
<circle cx="52" cy="80" r="3.2" fill="#ff8a1c" stroke="#2b1100" stroke-width="1.2"/>
<circle cx="68" cy="80" r="3.2" fill="#ff8a1c" stroke="#2b1100" stroke-width="1.2"/>
<path d="M60 80 L60 85 M54 86 L49 88 M66 86 L71 88" stroke="#2b1100" stroke-width="2" stroke-linecap="round"/>
<circle cx="56" cy="92" r="1.6" fill="#2b1100"/><circle cx="64" cy="92" r="1.6" fill="#2b1100"/>
<path d="M58 95 L62 95 L60 98 Z" fill="#d93a55"/>
<text x="60" y="140" font-size="15" text-anchor="middle" fill="#f7c948" font-weight="900" font-family="Microsoft YaHei,Noto Sans CJK SC,serif">福</text>
<rect x="44" y="178" width="32" height="8" rx="2" fill="#3a0c12" stroke="#1a0206" stroke-width="2"/>
</svg>`;
const rocketImg = new Image(); rocketImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ROCKET_SVG);
let W = 0, H = 0, DPR = 1, box = { l: 60, r: 0, t: 120, b: 0 };
const view = { t: 6, m: 2 };
const stars = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, v: 0.4 + Math.random() }));
const particles = [], trail = [];
let shake = 0, lastRise = 0;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1); W = innerWidth; H = innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
  const small = W < 760, ph = $('panel').offsetHeight;
  box = { l: small ? 42 : 66, r: W - (small ? 14 : 36), t: small ? 112 : 128, b: Math.max(box.t + 120, H - ph - (small ? 30 : 38)) };
  box.b = Math.max(box.t + 120, H - ph - (small ? 30 : 38));
  document.body.style.setProperty('--ro-top', ((box.t + box.b) / 2 / H * 100 - 4).toFixed(1) + '%');
}
addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe($('panel'));

const xOf = t => box.l + (t / view.t) * (box.r - box.l);
const yOf = m => box.b - ((m - 1) / (view.m - 1)) * (box.b - box.t);
const niceStep = (range, n) => { const raw = range / n, p = 10 ** Math.floor(Math.log10(raw)); return [1, 2, 2.5, 5, 10].map(k => k * p).find(s => s >= raw) || 10 * p; };

function burstAtTip(n, kind) {
  const p = tip();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 7, v = (kind === 'boom' ? 80 : 50) + Math.random() * (kind === 'boom' ? 340 : 200);
    particles.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0, max: 0.6 + Math.random() * 0.8, r: 2 + Math.random() * 4,
      c: kind === 'gold' ? ['#fff3b0', '#f4cf6a', '#cfb579'][i % 3] : ['#fff3b0', '#ffb347', '#ff6a3d', '#e0212f'][i % 4], g: 260 });
  }
}
function curvePoints(ms) {
  const pts = [], n = 96;
  for (let i = 0; i <= n; i++) { const t = ms * i / n; pts.push([xOf(t / 1000), yOf(L.multiplierAt(t))]); }
  return pts;
}
function tip() {
  if (st.phase === 'bet') return { x: box.l + 44, y: box.b - 34, ang: 0.85 };
  const ms = st.phase === 'crashed' ? L.timeAt(st.point) : Math.min(currentFlightMs(), L.timeAt(st.point));
  const x = xOf(ms / 1000), y = yOf(L.multiplierAt(ms));
  const x0 = xOf(Math.max(0, ms - 140) / 1000), y0 = yOf(L.multiplierAt(Math.max(0, ms - 140)));
  return { x, y, ang: Math.atan2(x - x0, -(y - y0)) || 0.85 };
}

function drawGrid(ms) {
  g.save();
  g.font = '600 11px "Segoe UI",system-ui,sans-serif'; g.textBaseline = 'middle';
  const ys = niceStep(view.m - 1, 5);
  for (let v = Math.ceil(1.0001 / ys) * ys; v < view.m; v += ys) {
    const y = yOf(v); if (y < box.t - 4) break;
    g.strokeStyle = '#cfb57922'; g.lineWidth = 1; g.beginPath(); g.moveTo(box.l, y); g.lineTo(box.r, y); g.stroke();
    g.fillStyle = '#cfb579aa'; g.textAlign = 'right'; g.fillText(Number(v.toFixed(2)).toString().replace('.', ',') + '×', box.l - 8, y);
  }
  g.textAlign = 'center'; g.textBaseline = 'top';
  const xs = niceStep(view.t, 6);
  for (let t = xs; t < view.t; t += xs) {
    const x = xOf(t);
    g.strokeStyle = '#cfb57916'; g.beginPath(); g.moveTo(x, box.t); g.lineTo(x, box.b); g.stroke();
    g.fillStyle = '#cfb579aa'; g.fillText(Number(t.toFixed(1)) + 's', x, box.b + 8);
  }
  g.strokeStyle = '#cfb57988'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(box.l, box.t); g.lineTo(box.l, box.b); g.lineTo(box.r, box.b); g.stroke();
  g.restore();
}
function drawStars(dt, ms) {
  g.save();
  for (const s of stars) {
    const drift = (st.phase === 'fly' ? 0.045 + Math.min(0.2, ms / 1000 * 0.004) : 0.006);
    s.x -= drift * s.v * dt; if (s.x < 0) { s.x += 1; s.y = Math.random(); }
    g.globalAlpha = 0.12 + 0.2 * s.v / 1.4; g.fillStyle = '#eee0bb';
    g.beginPath(); g.arc(box.l + s.x * (box.r - box.l), box.t + s.y * (box.b - box.t), s.s, 0, 7); g.fill();
  }
  g.restore();
}
function drawCurve(ms, crashed) {
  const pts = curvePoints(ms); if (pts.length < 2) return;
  const lastP = pts[pts.length - 1];
  const stroke = crashed ? '#ff7a6e' : '#eee0bb';
  g.save();
  g.beginPath(); g.moveTo(pts[0][0], box.b); pts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(lastP[0], box.b); g.closePath();
  const fill = g.createLinearGradient(0, box.t, 0, box.b);
  fill.addColorStop(0, crashed ? '#ff7a6e55' : '#cfb57977'); fill.addColorStop(1, crashed ? '#ff7a6e08' : '#cfb57908');
  g.fillStyle = fill; g.fill();
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.lineJoin = g.lineCap = 'round';
  g.shadowColor = crashed ? '#ff3b2e' : '#cfb579'; g.shadowBlur = 16; g.strokeStyle = stroke; g.lineWidth = 5; g.stroke();
  g.restore();
}
// chama tremendo atrás do bocal (eixo local: y cresce para trás do foguete)
function drawFlame(s, fly) {
  const len = s * (fly ? 0.95 : 0.4) * (0.82 + Math.random() * 0.36), w = s * (fly ? 0.2 : 0.1);
  const y0 = s * 0.92;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.fillStyle = '#ff6a3d'; g.shadowColor = '#ff6a3d'; g.shadowBlur = 14;
  g.beginPath(); g.moveTo(-w, y0); g.quadraticCurveTo(-w * 0.2, y0 + len * 0.7, 0, y0 + len); g.quadraticCurveTo(w * 0.2, y0 + len * 0.7, w, y0); g.closePath(); g.fill();
  const wi = w * 0.5, li = len * 0.6;
  g.fillStyle = '#fff3b0'; g.shadowColor = '#ffe27a';
  g.beginPath(); g.moveTo(-wi, y0); g.quadraticCurveTo(0, y0 + li * 0.7, 0, y0 + li); g.quadraticCurveTo(0, y0 + li * 0.7, wi, y0); g.closePath(); g.fill();
  g.restore();
}
function drawRocket(p, dt) {
  const s = Math.max(54, Math.min(90, W * 0.078));           // comprimento do foguete (px)
  const bob = st.phase === 'bet' ? Math.sin(performance.now() / 260) * 3 : 0;
  const x = p.x, y = p.y + bob;
  const dx = Math.sin(p.ang), dy = -Math.cos(p.ang);         // direção do voo (y cresce para baixo)
  g.save(); g.translate(x, y); g.rotate(p.ang);              // ponta do foguete sobre a curva
  drawFlame(s, st.phase === 'fly');
  if (rocketImg.complete && rocketImg.naturalWidth) {
    const w = s * 0.6;
    g.shadowColor = '#0008'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    g.drawImage(rocketImg, -w / 2, 0, w, s);
  }
  g.restore();
  // faíscas saindo do bocal
  const tx = x - dx * s * 0.9, ty = y - dy * s * 0.9;
  const emit = st.phase === 'fly' ? 3 : (Math.random() < 0.35 ? 1 : 0);
  for (let i = 0; i < emit; i++) {
    const sp = 60 + Math.random() * 120;
    particles.push({ x: tx + (Math.random() - .5) * 6, y: ty + (Math.random() - .5) * 6,
      vx: -dx * sp + (Math.random() - .5) * 50, vy: -dy * sp + (Math.random() - .5) * 50, life: 0, max: 0.35 + Math.random() * 0.4, r: 3 + Math.random() * 4,
      c: ['#fff3b0', '#ffc24d', '#ff8a3d'][i % 3], g: -20 });
  }
}
function drawParticles(dt) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i]; q.life += dt;
    if (q.life >= q.max) { particles.splice(i, 1); continue; }
    q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    const k = 1 - q.life / q.max;
    g.globalAlpha = k * 0.9; g.fillStyle = q.c; g.beginPath(); g.arc(q.x, q.y, q.r * (0.4 + k), 0, 7); g.fill();
  }
  if (particles.length > 500) particles.splice(0, particles.length - 500);
  g.restore();
}

let last = performance.now();
function frame() {
  const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(now);
  const ms = st.phase === 'fly' ? currentFlightMs(now) : st.phase === 'crashed' ? L.timeAt(st.point) : 0;
  // escala do gráfico: acompanha o foguete durante o voo; volta ao padrão entre rodadas
  if (st.phase === 'fly') { view.t = Math.max(6, ms / 1000 * 1.12); view.m = Math.max(2, L.multiplierAt(ms) * 1.12); }
  else if (st.phase === 'bet') { const k = Math.min(1, dt * 5); view.t += (6 - view.t) * k; view.m += (2 - view.m) * k; }

  g.clearRect(0, 0, W, H);
  g.save();
  if (shake > 0) { shake = Math.max(0, shake - dt); const a = shake * 22; g.translate((Math.random() - .5) * a, (Math.random() - .5) * a); }
  drawGrid(ms);
  drawStars(dt, ms);
  if (st.phase !== 'bet') drawCurve(ms, st.phase === 'crashed');
  if (st.phase !== 'crashed') drawRocket(tip(), dt);
  drawParticles(dt);
  g.restore();

  if (st.phase === 'fly' && now - lastRise > 130) { lastRise = now; Sfx.rise(L.multiplierAt(ms)); }
  renderReadout(now); renderLive();
  requestAnimationFrame(frame);
}

resize(); el.betIn.value = String(st.bet); renderHistory(false); render();
if (st.balance < L.MIN_BET) showModal('broke');
requestAnimationFrame(frame);
})();
