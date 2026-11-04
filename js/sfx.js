/* Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio). */
const Sfx = (() => {
  'use strict';
  let ctx = null, master = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('vu21.muted') === '1'; } catch {}

  function ensure() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = muted ? 0 : 0.55;
        master.connect(ctx.destination);
        noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch { return null; }
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.2, delay = 0, to = 0 } = {}) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, { vol = 0.2, freq = 3000, q = 0.8, delay = 0 } = {}) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime + delay;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }

  const arp = (notes, step, opts) => notes.forEach((n, i) => tone(n, 0.28, { delay: i * step, ...opts }));

  return {
    unlock: ensure,
    get muted() { return muted; },
    setMuted(v) {
      muted = !!v;
      try { localStorage.setItem('vu21.muted', muted ? '1' : '0'); } catch {}
      if (master) master.gain.value = muted ? 0 : 0.55;
    },
    tick() { tone(1500 + Math.random() * 300, 0.035, { type: 'square', vol: 0.035 }); },
    whoosh() { noise(0.7, { vol: 0.16, freq: 900, q: 0.4 }); },
    drop() { tone(220, 0.09, { type: 'triangle', vol: 0.16, to: 90 }); noise(0.08, { vol: 0.16, freq: 1800, q: 1 }); },
    click() { tone(660, 0.07, { type: 'triangle', vol: 0.1 }); },
    card() { noise(0.09, { vol: 0.28, freq: 2600, q: 0.7 }); tone(180, 0.06, { type: 'triangle', vol: 0.06 }); },
    flip() { noise(0.14, { vol: 0.22, freq: 3800, q: 0.6 }); },
    chip() { tone(1900, 0.06, { type: 'square', vol: 0.05 }); tone(1300, 0.09, { type: 'triangle', vol: 0.09, delay: 0.025 }); },
    win(big) {
      arp(big ? [523, 659, 784, 1047, 1319] : [523, 659, 784], 0.09, { type: 'triangle', vol: 0.16 });
      if (big) arp([1047, 1319, 1568], 0.07, { type: 'sine', vol: 0.1, delay: 0.1 });
    },
    blackjack() {
      arp([392, 523, 659, 784, 1047, 1319, 1568], 0.08, { type: 'triangle', vol: 0.17 });
      arp([784, 1047, 1319, 1568, 2093], 0.08, { type: 'sine', vol: 0.09, delay: 0.3 });
    },
    lose() { tone(330, 0.32, { type: 'sawtooth', vol: 0.09, to: 150 }); tone(247, 0.4, { type: 'triangle', vol: 0.1, delay: 0.14, to: 110 }); },
    push() { tone(440, 0.14, { type: 'triangle', vol: 0.12 }); tone(440, 0.14, { type: 'triangle', vol: 0.12, delay: 0.16 }); },
  };
})();
