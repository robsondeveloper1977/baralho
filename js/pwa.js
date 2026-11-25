(() => {
  'use strict';
  if (!window.isSecureContext || !('serviceWorker' in navigator)) return;
  const button = document.getElementById('install-app');
  const help = document.getElementById('install-help');
  const status = document.getElementById('offline-status');
  const standalone = matchMedia('(display-mode: standalone)');
  let installPrompt;
  let availableOffline = false;
  let installed = false;
  function refresh() {
    if (button) button.hidden = !availableOffline || installed || standalone.matches || navigator.standalone;
    if (status) status.textContent = availableOffline && !navigator.onLine ? 'Modo offline' : '';
  }
  if (button) addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    refresh();
  });
  button?.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      try {
        const result = await prompt.prompt();
        if (result.outcome === 'accepted') { installed = true; refresh(); }
        return;
      } catch {}
    }
    help.showModal();
  });
  addEventListener('appinstalled', () => { installed = true; installPrompt = null; refresh(); });
  standalone.addEventListener('change', refresh);
  addEventListener('online', refresh);
  addEventListener('offline', refresh);
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    availableOffline = true;
    refresh();
  }).catch(() => {});
})();
