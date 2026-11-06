/* Menu de jogos. Para adicionar um jogo novo, basta incluir um item em GAMES. */
(() => {
'use strict';

const GAMES = [
  { id: 'oceano', name: 'Tesouros do Oceano', href: 'tesouros-do-oceano.html', available: true,
    desc: 'Explore cinco rolos de tesouros. Encontre pérolas para liberar oito giros grátis.',
    tags: ['20 linhas', 'Wild', 'Giros grátis'], art: 'ocean' },
  {
    id: 'vinte-e-um', name: 'Vinte e Um', href: 'vinte-e-um.html', available: true,
    desc: 'O clássico Blackjack em 3D. Chegue a 21 sem estourar e vença o dealer.',
    tags: ['3D', 'Paga 3:2', 'Dobrar'], art: 'bj',
  },
  {
    id: 'roleta', name: 'Roleta do Tigre', href: 'roleta-do-tigre.html', available: true,
    desc: 'Roleta europeia em 3D com o Tigre da Sorte: caia num número dele e seus lucros dobram.',
    tags: ['3D', 'Tigre da Sorte ×2', 'Paga 35:1'], art: 'roulette',
  },
  {
    id: 'bacara', name: 'Bacará', available: false,
    desc: 'Jogador, Banca ou Empate: o jogo de cartas mais elegante do salão.',
    tags: ['Cartas', 'Rápido'], art: 'baccarat',
  },
  {
    id: 'video-poker', name: 'Video Poker', available: false,
    desc: 'Monte a melhor mão de cinco cartas e conquiste a tabela de prêmios.',
    tags: ['Poker', 'Cinco cartas'], art: 'poker',
  },
];

const ART = {
  bj: `<div class="art-bj"><div class="pcard"><small>A</small>♠<small class="b">A</small></div><div class="pcard red"><small>K</small>♥<small class="b">K</small></div><i class="chipd c1"></i><i class="chipd c2"></i></div>`,
  roulette: `<div class="wheel"><img class="wheel-tiger" alt="" src="${Common.tigerURL()}"></div>`,
  baccarat: `<div class="art-bac"><div class="pcard red"><small>9</small>♦<small class="b">9</small></div><div class="pcard"><small>K</small>♣<small class="b">K</small></div></div>`,
  poker: `<div class="art-poker">${[['10', '♠', ''], ['J', '♥', 'red'], ['Q', '♦', 'red'], ['K', '♣', ''], ['A', '♠', '']]
    .map(([r, s, c]) => `<div class="pcard ${c}"><small>${r}</small>${s}<small class="b">${r}</small></div>`).join('')}</div>`,
};

const box = document.getElementById('games');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

GAMES.forEach((g, i) => {
  const el = document.createElement(g.available ? 'a' : 'div');
  el.className = 'game' + (g.available ? '' : ' locked');
  el.style.setProperty('--i', i);
  if (g.available) el.href = g.href; else el.setAttribute('aria-disabled', 'true');
  el.innerHTML = `
    <div class="art">${g.available ? `<img class="table-preview" src="${g.art === 'ocean' ? 'img/ocean-preview.svg' : 'img/' + (g.art === 'bj' ? 'blackjack' : 'roulette') + '-table.png'}" alt="Prévia de ${esc(g.name)}" width="1000" height="550" decoding="async">` : ART[g.art] || ''}${g.available ? '' : '<span class="lock" aria-hidden="true">🔒</span><span class="ribbon">EM BREVE</span>'}</div>
    <div class="info">
      <h3>${esc(g.name)}</h3>
      <p>${esc(g.desc)}</p>
      <ul class="tags">${g.tags.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    </div>
    <span class="go">${g.available ? 'JOGAR' : 'EM BREVE'}</span>`;
  el.dataset.game = g.id;
  box.appendChild(el);
});

// ---------- fichas salvas pelo jogo (só leitura) ----------
// Read the shared wallet without automatically refilling low balances.
function refreshWallet() { document.getElementById('wallet').textContent = Common.wallet.get().toLocaleString('pt-BR'); }
refreshWallet();
addEventListener('pageshow', refreshWallet);
addEventListener('storage', e => { if (e.key === Common.wallet.KEY) refreshWallet(); });

// ---------- gráficos decorativos ----------
Art.hydrate();
{
  const fl = document.createElement('div'); fl.className = 'floaters'; fl.setAttribute('aria-hidden', 'true'); document.body.prepend(fl);
  for (let i = 0; i < 14; i++) {
    const size = 26 + Math.random() * 34, im = Art.img(Art.names[i % Art.names.length], Math.round(size), 'floaty');
    im.style.cssText = `left:${((i + Math.random() * 0.8) / 14 * 100).toFixed(1)}%;animation-duration:${(16 + Math.random() * 16).toFixed(1)}s;animation-delay:${(-Math.random() * 30).toFixed(1)}s;--rot:${((Math.random() - 0.5) * 80).toFixed(0)}deg;--dx:${((Math.random() - 0.5) * 90).toFixed(0)}px`;
    fl.appendChild(im);
  }
  const cl = document.querySelector('.clouds'); if (cl) cl.style.backgroundImage = `url("${Art.url('cloud')}")`;
}

// ---------- mascote, faíscas ----------
Common.sparks(document.getElementById('sparks'), 30);
const tiger = Common.createTiger(document.getElementById('tiger'));
const medallion = document.getElementById('medal');
const hop = () => { medallion.classList.remove('bounce'); void medallion.offsetWidth; medallion.classList.add('bounce'); };
medallion.addEventListener('animationend', e => { if (e.animationName === 'hop') medallion.classList.remove('bounce'); });
medallion.addEventListener('click', () => { tiger.setMood('happy', 1800); hop(); });
medallion.style.pointerEvents = 'auto';

const playable = [...box.querySelectorAll('a.game')];
playable.forEach(card => {
  card.addEventListener('pointerenter', () => tiger.setMood('happy', 60000));
  card.addEventListener('pointerleave', () => { tiger.setMood('idle'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
  card.addEventListener('focus', () => tiger.setMood('happy', 60000));
  card.addEventListener('blur', () => tiger.setMood('idle'));
  card.addEventListener('pointermove', e => { // inclinação 3D suave seguindo o mouse
    if (e.pointerType !== 'mouse') return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 9).toFixed(2) + 'deg');
    card.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - 0.5) * 9).toFixed(2) + 'deg');
  });
  card.addEventListener('click', e => { // transição suave; Ctrl/⌘/botão do meio continuam abrindo em nova aba
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    tiger.setMood('wow', 1000); hop();
    document.body.classList.add('leaving');
    setTimeout(() => { location.href = card.href; }, 380);
  });
});

// voltar pelo histórico (bfcache) não pode deixar a tela escura
addEventListener('pageshow', () => document.body.classList.remove('leaving'));
})();
