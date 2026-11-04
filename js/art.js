/* Elementos gráficos em SVG (arte própria, tema "fortuna": vermelho e dourado).
   Símbolos inspirados na iconografia de Ano Novo Chinês: tangerina, rojão, moeda, saco de moedas, lingote e envelope. */
const Art = (() => {
  'use strict';

  const S = {
    orange: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="a-or" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#ffd98a"/><stop offset=".45" stop-color="#ff9a1f"/><stop offset="1" stop-color="#d9570a"/></radialGradient></defs>
<ellipse cx="50" cy="60" rx="37" ry="33" fill="url(#a-or)" stroke="#8a3200" stroke-width="3.5"/>
<path d="M50 28c-3-9 2-16 11-18 1 9-3 16-11 18z" fill="#3fae3a" stroke="#1f6a22" stroke-width="3"/><path d="M50 28c-7-4-14-2-18 5 8 4 15 2 18-5z" fill="#57c34a" stroke="#1f6a22" stroke-width="3"/>
<ellipse cx="35" cy="48" rx="9" ry="5.5" fill="#fff" opacity=".38" transform="rotate(-32 35 48)"/></svg>`,

    firecracker: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a-fc" x1="0" x2="1"><stop offset="0" stop-color="#ff6a58"/><stop offset=".5" stop-color="#e0212f"/><stop offset="1" stop-color="#8c1422"/></linearGradient></defs>
<g transform="rotate(32 50 58)"><rect x="34" y="28" width="32" height="58" rx="6" fill="url(#a-fc)" stroke="#5a0a14" stroke-width="3.5"/>
<rect x="34" y="28" width="32" height="9" fill="#f7c948" stroke="#8a5a00" stroke-width="2"/><rect x="34" y="77" width="32" height="9" fill="#f7c948" stroke="#8a5a00" stroke-width="2"/>
<circle cx="50" cy="57" r="11" fill="#f7c948" stroke="#8a5a00" stroke-width="2.5"/><text x="50" y="63" font-size="15" text-anchor="middle" fill="#8c1422" font-weight="900">福</text>
<path d="M50 28 Q50 16 58 11" stroke="#6b3f00" stroke-width="3.5" fill="none" stroke-linecap="round"/></g>
<path d="M70 4l3.5 8 8 3.5-8 3.5-3.5 8-3.5-8-8-3.5 8-3.5z" fill="#ffd54a" stroke="#c8860a" stroke-width="1.5"/></svg>`,

    coin: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="a-cn" cx=".35" cy=".3" r=".85"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f7c948"/><stop offset="1" stop-color="#b9780a"/></radialGradient></defs>
<circle cx="50" cy="50" r="43" fill="url(#a-cn)" stroke="#6b3f00" stroke-width="4"/><circle cx="50" cy="50" r="34" fill="none" stroke="#8a5a00" stroke-width="2.5"/>
<rect x="37" y="37" width="26" height="26" fill="#7a0f1a" stroke="#6b3f00" stroke-width="3"/><path d="M22 30 Q28 20 40 17" stroke="#fffbe0" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/></svg>`,

    sack: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a-sk" x1="0" x2="1"><stop offset="0" stop-color="#e8303c"/><stop offset="1" stop-color="#8c1422"/></linearGradient></defs>
<path d="M37 22 Q50 32 63 22 L60 35 Q87 50 85 77 Q83 93 50 93 Q17 93 15 77 Q13 50 40 35Z" fill="url(#a-sk)" stroke="#5a0a14" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M39 34 Q50 42 61 34" stroke="#f7c948" stroke-width="6" fill="none" stroke-linecap="round"/>
<path d="M37 22 Q42 9 50 18 Q58 9 63 22 Q50 30 37 22Z" fill="#c0202f" stroke="#5a0a14" stroke-width="3"/>
<circle cx="50" cy="66" r="16" fill="#f7c948" stroke="#8a5a00" stroke-width="3"/><text x="50" y="73" font-size="20" text-anchor="middle" fill="#8c1422" font-weight="900">福</text></svg>`,

    ingot: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a-ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f7c948"/><stop offset="1" stop-color="#b9780a"/></linearGradient></defs>
<path d="M5 44 Q14 76 50 78 Q86 76 95 44 Q74 57 50 57 Q26 57 5 44Z" fill="url(#a-ig)" stroke="#6b3f00" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M25 50 Q22 25 50 25 Q78 25 75 50 Q62 59 50 59 Q38 59 25 50Z" fill="url(#a-ig)" stroke="#6b3f00" stroke-width="3.5" stroke-linejoin="round"/>
<path d="M37 38 Q50 31 63 38" stroke="#fffbe0" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".85"/></svg>`,

    hongbao: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a-hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4a3a"/><stop offset="1" stop-color="#b3101f"/></linearGradient></defs>
<rect x="21" y="9" width="58" height="84" rx="7" fill="url(#a-hb)" stroke="#5a0a14" stroke-width="3.5"/>
<path d="M21 9 H79 V20 Q50 56 21 20Z" fill="#d7192a" stroke="#5a0a14" stroke-width="3" stroke-linejoin="round"/>
<circle cx="50" cy="46" r="13" fill="#f7c948" stroke="#8a5a00" stroke-width="3"/><text x="50" y="52" font-size="17" text-anchor="middle" fill="#8c1422" font-weight="900">福</text>
<rect x="30" y="71" width="40" height="3.5" rx="1.5" fill="#f7c948"/><rect x="35" y="79" width="30" height="3.5" rx="1.5" fill="#f7c948"/></svg>`,

    // nuvem dourada tradicional (xiangyun), para faixas decorativas
    cloud: `<svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#f7c948" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
<path d="M6 52 C6 41 17 37 25 41 C25 27 41 21 51 29 C57 17 77 19 79 33 C91 29 99 39 93 49 C91 52 88 52 86 52 Z"/>
<path d="M38 47 C38 40 47 38 49 44 C51 50 43 52 41 48"/><path d="M66 46 C66 40 74 38 76 43"/><path d="M97 52 H116"/></svg>`,
  };

  const names = Object.keys(S).filter(n => n !== 'cloud');
  const markup = (name, size = 48, cls = '') =>
    S[name].replace('<svg ', `<svg width="${size}" height="${size}" class="art-ico ${cls}" aria-hidden="true" focusable="false" `);
  const url = name => 'data:image/svg+xml;utf8,' + encodeURIComponent(S[name]);

  /** <img> pronto, reutilizável em CSS/JS (não depende de IDs de gradiente). */
  const img = (name, size = 48, cls = '') => {
    const i = new Image(size, size);
    i.src = url(name); i.alt = ''; i.className = 'art-ico ' + cls; i.draggable = false; i.setAttribute('aria-hidden', 'true');
    return i;
  };

  /** Substitui [data-art="nome"] pelo ícone (tamanho em data-size). */
  function hydrate(root = document) {
    root.querySelectorAll('[data-art]').forEach(el => {
      const n = el.dataset.art; if (!S[n]) return;
      el.replaceWith(img(n, +el.dataset.size || 40, el.className));
    });
  }

  return { names, svg: markup, url, img, hydrate };
})();
