/* Peças compartilhadas entre o menu e os jogos: mascote (tigre) e faíscas douradas. */
const Common = (() => {
  'use strict';

  /** Desenha o tigre numa área 220×220. Com clear=false não apaga o canvas (para compor em outras artes). */
  function drawTiger(g, mood, blinking, clear = true) {
    if (clear) g.clearRect(0, 0, 220, 220);
    g.lineJoin = g.lineCap = 'round';
    const OR = '#ff8a1c', DK = '#2b1100';
    const ell = (x, y, rx, ry) => { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); };
    for (const sx of [-1, 1]) { // orelhas
      const x = 110 + sx * 60;
      g.fillStyle = OR; g.strokeStyle = DK; g.lineWidth = 5; ell(x, 58, 26, 25); g.fill(); g.stroke();
      g.fillStyle = '#ffd1a1'; ell(x, 61, 13, 13); g.fill();
    }
    const hg = g.createRadialGradient(95, 85, 8, 110, 120, 105); hg.addColorStop(0, '#ffb750'); hg.addColorStop(1, '#f0720a');
    g.fillStyle = hg; g.strokeStyle = DK; g.lineWidth = 5; ell(110, 122, 88, 76); g.fill(); g.stroke();
    // listras
    g.strokeStyle = DK; g.lineWidth = 8;
    for (const sx of [-1, 1]) {
      const X = x => 110 + sx * (x - 110) * -1; // espelha em torno de 110
      g.beginPath(); g.moveTo(X(142), 56); g.lineTo(X(136), 72); g.stroke();
      g.beginPath(); g.moveTo(X(40), 118); g.lineTo(X(66), 124); g.stroke();
      g.beginPath(); g.moveTo(X(40), 142); g.lineTo(X(66), 140); g.stroke();
      g.beginPath(); g.moveTo(X(50), 164); g.lineTo(X(72), 154); g.stroke();
    }
    g.fillStyle = DK; g.font = 'bold 32px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('王', 110, 64);
    // focinho
    g.fillStyle = '#fff6e6'; g.strokeStyle = DK; g.lineWidth = 3; ell(110, 154, 46, 31); g.fill(); g.stroke();
    g.fillStyle = '#d93a55'; g.beginPath(); g.moveTo(99, 134); g.lineTo(121, 134); g.lineTo(110, 147); g.closePath(); g.fill();
    g.strokeStyle = DK; g.lineWidth = 3.5; g.fillStyle = DK;
    g.beginPath(); g.moveTo(110, 147); g.lineTo(110, 156); g.stroke();
    if (mood === 'happy' || mood === 'wow') {
      g.fillStyle = '#7a0f1a'; g.beginPath(); g.moveTo(88, 158); g.quadraticCurveTo(110, 192, 132, 158); g.quadraticCurveTo(110, 164, 88, 158); g.fill(); g.stroke();
      g.fillStyle = '#ff7a8a'; ell(110, 176, 9, 5); g.fill();
    } else if (mood === 'sad') {
      g.beginPath(); g.moveTo(90, 172); g.quadraticCurveTo(100, 156, 110, 160); g.quadraticCurveTo(120, 156, 130, 172); g.stroke();
    } else {
      g.beginPath(); g.moveTo(88, 158); g.quadraticCurveTo(99, 172, 110, 157); g.quadraticCurveTo(121, 172, 132, 158); g.stroke();
    }
    // olhos
    for (const sx of [-1, 1]) {
      const x = 110 + sx * 33, y = 108;
      if (mood === 'happy' && !blinking) { g.strokeStyle = DK; g.lineWidth = 7; g.beginPath(); g.arc(x, y + 8, 13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); continue; }
      if (blinking) { g.strokeStyle = DK; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 13, y + 4); g.lineTo(x + 13, y + 4); g.stroke(); continue; }
      const big = mood === 'wow';
      g.fillStyle = '#fff'; g.strokeStyle = DK; g.lineWidth = 4; ell(x, y, big ? 17 : 14, big ? 20 : 17); g.fill(); g.stroke();
      g.fillStyle = DK; ell(x + (mood === 'sad' ? 0 : 2), y + (mood === 'sad' ? 6 : 1), big ? 6 : 8.5, big ? 6 : 10); g.fill();
      g.fillStyle = '#fff'; ell(x + 4, y - 5, 3, 3); g.fill();
      if (mood === 'sad') { g.strokeStyle = DK; g.lineWidth = 5; g.beginPath(); g.moveTo(x - sx * 14, y - 26); g.lineTo(x + sx * 14, y - 19); g.stroke(); }
    }
    if (mood === 'happy' || mood === 'wow') { // brilhos
      g.fillStyle = '#fff3b0';
      for (const [sx, sy, r] of [[28, 40, 9], [194, 44, 11], [200, 120, 7]]) {
        g.beginPath(); g.moveTo(sx, sy - r); g.quadraticCurveTo(sx, sy, sx + r, sy); g.quadraticCurveTo(sx, sy, sx, sy + r); g.quadraticCurveTo(sx, sy, sx - r, sy); g.quadraticCurveTo(sx, sy, sx, sy - r); g.fill();
      }
    }
  }

  /** Tigre animado num <canvas> 220×220: pisca sozinho e muda de humor por um tempo. */
  function createTiger(canvas) {
    const g = canvas.getContext('2d');
    let mood = 'idle', blinking = false, timer = 0;
    const redraw = () => drawTiger(g, mood, blinking);
    (function blinkLoop() {
      setTimeout(() => {
        if (mood !== 'happy') { blinking = true; redraw(); setTimeout(() => { blinking = false; redraw(); }, 130); }
        blinkLoop();
      }, 2400 + Math.random() * 2600);
    })();
    redraw();
    return {
      get mood() { return mood; },
      setMood(m, revertMs = 2600) {
        mood = m; redraw(); clearTimeout(timer);
        if (m !== 'idle') timer = setTimeout(() => { mood = 'idle'; redraw(); }, revertMs);
      },
    };
  }

  /** Tigre numa posição/tamanho qualquer de um canvas (centro cx,cy; diâmetro size). */
  function drawTigerAt(g, cx, cy, size, mood = 'idle') {
    g.save(); g.translate(cx - size / 2, cy - size / 2); g.scale(size / 220, size / 220);
    drawTiger(g, mood, false, false); g.restore();
  }

  const tigerCache = {};
  /** URL (data:) de uma imagem PNG do tigre, para usar em <img>/CSS. */
  function tigerURL(mood = 'idle') {
    if (!tigerCache[mood]) { const c = document.createElement('canvas'); c.width = c.height = 220; drawTiger(c.getContext('2d'), mood, false); tigerCache[mood] = c.toDataURL('image/png'); }
    return tigerCache[mood];
  }

  /** Shared wallet, with automatic migration of the original balance key. */
  const wallet = CasinoWallet;

  /** Faíscas douradas subindo no fundo (CSS .spark). */
  function sparks(box, n = 26) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span'), size = 3 + Math.random() * 6;
      s.className = 'spark';
      s.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;--dx:${(Math.random() - 0.5) * 120}px;animation-duration:${9 + Math.random() * 12}s;animation-delay:${-Math.random() * 20}s`;
      box.appendChild(s);
    }
  }

  return { createTiger, sparks, drawTiger, drawTigerAt, tigerURL, wallet };
})();
