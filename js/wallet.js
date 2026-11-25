/* One record for chips and round state, serialized across tabs. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.CasinoWallet = factory(() => root.localStorage, root.indexedDB);
})(typeof globalThis !== 'undefined' ? globalThis : this, (storage, indexedDB) => {
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
  function check(next) {
    if (!next || !Number.isSafeInteger(next.balance) || next.balance < 0) throw Error('Saldo inválido.');
    return next;
  }
  let database;
  function openDatabase() {
    database ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(KEY, 2);
      request.onupgradeneeded = () => request.result.createObjectStore('accounts');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch(error => { database = null; throw error; });
    return database;
  }
  function migrate() {
    try { return read(); } catch { return { balance: START, slots: null }; }
  }
  async function access(transform) {
    if (!indexedDB) throw Error('O navegador não pode salvar rodadas com segurança.');
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('accounts', transform ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('accounts');
      const request = store.get('wallet');
      let result, failure;
      request.onsuccess = () => {
        try {
          const current = request.result ?? migrate();
          result = transform ? check(transform(current)) : check(current);
          if (transform) store.put(result, 'wallet');
        } catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(failure || transaction.error);
    });
  }
  const channel = indexedDB && typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null;
  async function transact(transform) {
    const next = await access(transform);
    if (channel) channel.postMessage('changed');
    else {
      try { storage().setItem(KEY + ':changed', String(Date.now()) + Math.random()); } catch {}
    }
    return next;
  }
  function watch(listener) {
    if (channel) channel.addEventListener('message', listener);
    else addEventListener('storage', event => { if (event.key === KEY + ':changed') listener(); });
  }
  return {
    START, get: () => migrate().balance, snapshot: () => access(), transact, watch,
  };
});
