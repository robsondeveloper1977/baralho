/* Original Web Audio effects. Audio starts only after a user gesture. */
const OceanAudio = (() => {
  'use strict';
  const KEY = 'vu21.ocean.sound';
  let muted = false, ctx = null, master = null, noiseBuffer = null, rolling = null;
  let unavailable = false;
  const voices = new Set();
  try { muted = localStorage.getItem(KEY) === '0'; } catch {}

  function unlock() {
    if (muted || unavailable || document.hidden) return false;
    try {
      if (!ctx) {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) { unavailable = true; return false; }
        ctx = new Audio();
        master = ctx.createGain(); master.gain.value = .65; master.connect(ctx.destination);
        noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx.state !== 'closed';
    } catch { unavailable = true; return false; }
  }

  function track(source, nodes) {
    voices.add(source);
    source.onended = () => {
      voices.delete(source); source.disconnect();
      nodes.forEach(node => node.disconnect());
    };
  }

  function note(frequency, duration = .16, delay = 0, volume = .12, type = 'sine', end = frequency) {
    if (!unlock()) return;
    const start = ctx.currentTime + delay, source = ctx.createOscillator(), gain = ctx.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(end, start + duration);
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(gain); gain.connect(master); track(source, [gain]);
    source.start(start); source.stop(start + duration + .02);
  }

  function noise(duration, frequency, volume) {
    if (!unlock()) return;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noiseBuffer; filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .65;
    const start = ctx.currentTime;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(master); track(source, [filter, gain]);
    source.start(start); source.stop(start + duration + .02);
  }

  function stopSpin() { if (rolling !== null) { clearInterval(rolling); rolling = null; } }
  function hush() {
    stopSpin();
    for (const source of voices) { try { source.stop(); } catch {} }
    voices.clear();
  }
  function click() { note(880, .07, 0, .09, 'triangle', 660); }
  function startSpin(quick = false) {
    hush();
    if (!unlock()) return;
    noise(.4, 650, .16);
    note(160, .22, 0, .16, 'triangle', 330);
    let tick = 0;
    rolling = setInterval(() => {
      note(950 + (tick++ % 4) * 90, .032, 0, .045, 'triangle');
      noise(.045, 1500, .07);
    }, quick ? 65 : 90);
  }
  function reelStop(index, pearl = false) {
    noise(.09, 650, .14);
    note(190 + index * 28, .11, 0, .16, 'triangle', 95);
    note(740 + index * 90, .15, .02, .08);
    if (pearl) note(1320, .5, .07, .10);
  }
  function result(payout, bet, bonus) {
    stopSpin();
    if (bonus) {
      [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => note(f, .5, i * .12, .13, 'triangle'));
      [523, 659, 784].forEach(f => note(f, 1.1, .85, .07));
    } else if (payout > 0) {
      const notes = payout >= bet * 5 ? [523, 659, 784, 1047, 1319, 1568] : [523, 659, 784, 1047];
      notes.forEach((f, i) => note(f, .36, i * .105, .13, 'triangle'));
      note(1568, .6, notes.length * .105, .06);
    } else {
      note(330, .2, 0, .06); note(262, .3, .13, .05);
    }
  }
  function setMuted(value) {
    muted = !!value;
    try { localStorage.setItem(KEY, muted ? '0' : '1'); } catch {}
    if (muted) {
      if (master) master.gain.setValueAtTime(0, ctx.currentTime);
      hush();
    } else if (unlock()) {
      master.gain.setValueAtTime(.65, ctx.currentTime);
      click();
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hush(); if (ctx?.state === 'running') ctx.suspend().catch(() => {}); }
    else if (ctx && !muted) unlock();
  });
  addEventListener('pagehide', hush);
  return { unlock, click, startSpin, stopSpin, reelStop, result, hush, setMuted,
    get muted() { return muted; }, get available() { return !unavailable; } };
})();
