/* Default to lighter rendering on touchscreens and when reduced motion is requested. */
const CasinoQuality = (() => {
  'use strict';
  const key = 'vu21.graphics';
  const touch = matchMedia('(pointer: coarse)');
  const narrow = matchMedia('(max-width: 650px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function read() {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  let preference = read();
  const isLight = () => preference === 'light' || (preference !== 'full' && (touch.matches || narrow.matches || reduced.matches));
  const listeners = new Set();
  function refresh() {
    const light = isLight();
    document.documentElement.dataset.graphics = light ? 'light' : 'full';
    const button = document.querySelector('[data-quality]');
    if (button) {
      button.textContent = light ? 'Leve' : '3D';
      button.setAttribute('aria-pressed', String(light));
    }
    for (const listener of listeners) listener(light);
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('[data-quality]')?.addEventListener('click', () => {
      preference = isLight() ? 'full' : 'light';
      try { localStorage.setItem(key, preference); } catch {}
      refresh();
    });
    refresh();
  });
  for (const query of [touch, narrow, reduced]) query.addEventListener('change', refresh);
  addEventListener('storage', event => { if (event.key === key) { preference = read(); refresh(); } });

  function watch(listener) {
    listeners.add(listener);
    listener(isLight());
  }
  function configure(renderer, resize, { shadows = true, fullRatio = 2 } = {}) {
    watch(light => {
      renderer.setPixelRatio(Math.min(devicePixelRatio, light ? 1 : fullRatio));
      renderer.shadowMap.enabled = shadows && !light;
      resize();
    });
  }
  function drawWhenDue(render) {
    let lastFrame = -Infinity;
    return time => {
      if (document.hidden || (isLight() && time - lastFrame < 1000 / 30 - 1)) return;
      lastFrame = time;
      render();
    };
  }
  return { isLight, watch, configure, drawWhenDue };
})();
