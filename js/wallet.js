/* One atomic storage record keeps the shared balance and slot result together. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.CasinoWallet = factory(() => root.localStorage);
})(typeof globalThis !== 'undefined' ? globalThis : this, storage => {
  'use strict';
  const KEY = 'vu21.wallet.v2', START = 1000;
  function read() {
    const raw = storage().getItem(KEY);
    if (raw !== null) {
      const data = JSON.parse(raw);
      if (!data || !Number.isSafeInteger(data.balance) || data.balance < 0) throw Error('Carteira inválida.');
      return data;
    }
    const legacy = JSON.parse(storage().getItem('vu21.balance') || 'null');
    return {balance:Number.isSafeInteger(legacy) && legacy >= 0 ? legacy : START, slots:null};
  }
  function commit(transform) {
    const next = transform(read());
    if (!next || !Number.isSafeInteger(next.balance) || next.balance < 0) throw Error('Saldo inválido.');
    storage().setItem(KEY, JSON.stringify(next));
    return next;
  }
  return {
    KEY, START, read, commit,
    get() { try { return read().balance; } catch { return START; } },
    // Older tables also remain playable when browser storage is unavailable.
    set(balance) { try { return commit(current => ({...current,balance})); } catch { return null; } }
  };
});
