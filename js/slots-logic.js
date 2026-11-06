/* Pure slot rules. A line pays its highest matching left-to-right combination. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SlotsLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const BETS = [20, 40, 100, 200, 500];
  const SYMBOLS = [
    { id:'shell', name:'Concha', weight:26, pays:[5,18,55] },
    { id:'star', name:'Estrela-do-mar', weight:22, pays:[6,24,75] },
    { id:'fish', name:'Peixe dourado', weight:18, pays:[10,35,110] },
    { id:'gem', name:'Cristal', weight:14, pays:[14,60,190] },
    { id:'chest', name:'Baú', weight:9, pays:[27,120,410] },
    { id:'crown', name:'Coroa', weight:6, pays:[44,190,650] },
    { id:'wild', name:'Tridente Wild', weight:3, pays:[55,270,1100] },
    { id:'scatter', name:'Pérola Scatter', weight:2, pays:[] }
  ];
  const LINES = [
    [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],
    [0,0,1,0,0],[2,2,1,2,2],[1,0,0,0,1],[1,2,2,2,1],[0,1,1,1,0],
    [2,1,1,1,2],[1,0,1,0,1],[1,2,1,2,1],[0,1,0,1,0],[2,1,2,1,2],
    [0,2,0,2,0],[2,0,2,0,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,1,2,1]
  ];
  const validGrid = grid => Array.isArray(grid) && grid.length === 5 &&
    grid.every(col => Array.isArray(col) && col.length === 3 && col.every(id => SYMBOLS.some(s => s.id === id)));
  function randomGrid(rng = Math.random) {
    return Array.from({length:5}, () => Array.from({length:3}, () => {
      const n = rng();
      if (!Number.isFinite(n) || n < 0 || n >= 1) throw Error('Sorteio inválido.');
      let ticket = n * 100;
      for (const s of SYMBOLS) { ticket -= s.weight; if (ticket < 0) return s.id; }
      return 'scatter';
    }));
  }
  function evaluate(grid, bet) {
    if (!validGrid(grid) || !BETS.includes(bet)) throw Error('Giro inválido.');
    const wins = [];
    LINES.forEach((rows, line) => {
      let best = null;
      for (const s of SYMBOLS.filter(s => s.pays.length)) {
        let count = 0;
        while (count < 5 && (grid[count][rows[count]] === s.id ||
          (s.id !== 'wild' && grid[count][rows[count]] === 'wild'))) count++;
        if (count < 3) continue;
        const payout = s.pays[count - 3] * bet / LINES.length;
        if (!best || payout > best.payout) best = {line, symbol:s.id, count, payout, rows};
      }
      if (best) wins.push(best);
    });
    const scatters = grid.flat().filter(s => s === 'scatter').length;
    return {wins, payout:wins.reduce((sum,w) => sum+w.payout,0), scatters, awarded:scatters >= 3 ? 8 : 0};
  }
  function spin(account, selectedBet, rng = Math.random) {
    if (!Number.isSafeInteger(account.balance) || account.balance < 0) throw Error('Saldo inválido.');
    const previous = account.slots || {};
    const free = Number.isSafeInteger(previous.free) && previous.free > 0 ? previous.free : 0;
    const bet = free ? previous.bonusBet : selectedBet;
    if (!BETS.includes(bet)) throw Error('Aposta inválida.');
    if (!free && account.balance < bet) throw Error('Fichas insuficientes. Reduza a aposta.');
    const grid = randomGrid(rng), result = evaluate(grid, bet);
    const remaining = free - (free ? 1 : 0) + result.awarded;
    const last = {grid, bet, ...result, wasFree:!!free};
    const balance = account.balance - (free ? 0 : bet) + result.payout;
    if (!Number.isSafeInteger(balance)) throw Error('Limite de saldo atingido.');
    return { ...account, balance, slots:{free:remaining, bonusBet:remaining ? bet : 0, last} };
  }
  return {BETS, SYMBOLS, LINES, validGrid, randomGrid, evaluate, spin};
});
