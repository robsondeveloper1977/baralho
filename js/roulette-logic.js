/* Regras puras da Roleta do Tigre (roleta europeia, 37 casas). Funciona no navegador (window.RouletteLogic) e no Node. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RouletteLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Ordem física das casas na roda europeia (sentido horário). */
  const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const MIN_BET = 50;
  const CHIP_VALUES = [50, 100, 250, 500];
  const LUCKY_COUNT = 3;   // números do "Tigre da Sorte" a cada giro
  const LUCKY_MULT = 2;    // multiplicador dos lucros quando a bola cai num deles

  const colorOf = n => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');

  /** Apostas: 'n:17' (pleno), red, black, even, odd, low, high, d1..d3 (dúzias), c1..c3 (colunas). */
  const RULES = {
    red: { odds: 1, covers: n => colorOf(n) === 'red', label: 'Vermelho' },
    black: { odds: 1, covers: n => colorOf(n) === 'black', label: 'Preto' },
    even: { odds: 1, covers: n => n > 0 && n % 2 === 0, label: 'Par' },
    odd: { odds: 1, covers: n => n % 2 === 1, label: 'Ímpar' },
    low: { odds: 1, covers: n => n >= 1 && n <= 18, label: '1–18' },
    high: { odds: 1, covers: n => n >= 19 && n <= 36, label: '19–36' },
    d1: { odds: 2, covers: n => n >= 1 && n <= 12, label: '1ª dúzia' },
    d2: { odds: 2, covers: n => n >= 13 && n <= 24, label: '2ª dúzia' },
    d3: { odds: 2, covers: n => n >= 25 && n <= 36, label: '3ª dúzia' },
    c1: { odds: 2, covers: n => n > 0 && n % 3 === 1, label: '1ª coluna' },
    c2: { odds: 2, covers: n => n > 0 && n % 3 === 2, label: '2ª coluna' },
    c3: { odds: 2, covers: n => n > 0 && n % 3 === 0, label: '3ª coluna' },
  };

  /** Regra de uma aposta, ou null se a chave for inválida. */
  function ruleOf(key) {
    if (typeof key === 'string' && key.startsWith('n:')) {
      const num = Number(key.slice(2));
      if (!Number.isInteger(num) || num < 0 || num > 36 || String(num) !== key.slice(2)) return null;
      return { odds: 35, covers: n => n === num, label: String(num) };
    }
    return Object.prototype.hasOwnProperty.call(RULES, key) ? RULES[key] : null;
  }

  const totalBet = bets => Object.values(bets).reduce((s, v) => s + v, 0);

  /**
   * Resolve o giro. `bets`: { chave: valor }. `mult` multiplica apenas o LUCRO das apostas vencedoras
   * (a aposta de volta nunca é multiplicada). Retorna { staked, payout, net, wins }.
   */
  function settle(bets, number, mult = 1) {
    let payout = 0;
    const wins = [];
    for (const [key, amount] of Object.entries(bets)) {
      const rule = ruleOf(key);
      if (!rule || !(amount > 0)) continue;
      if (rule.covers(number)) {
        const p = amount + amount * rule.odds * mult;
        payout += p;
        wins.push({ key, amount, payout: p, label: rule.label });
      }
    }
    const staked = totalBet(bets);
    return { staked, payout, net: payout - staked, wins };
  }

  const spinNumber = (rng = Math.random) => Math.floor(rng() * 37);

  /** `count` números distintos para o Tigre da Sorte. */
  function luckyNumbers(rng = Math.random, count = LUCKY_COUNT) {
    const set = new Set();
    while (set.size < count) set.add(spinNumber(rng));
    return [...set].sort((a, b) => a - b);
  }

  /** Maior aposta total possível para um saldo (múltiplo da ficha mínima). */
  const maxStake = balance => Math.floor(balance / MIN_BET) * MIN_BET;

  return { WHEEL, MIN_BET, CHIP_VALUES, LUCKY_COUNT, LUCKY_MULT, RULES, colorOf, ruleOf, totalBet, settle, spinNumber, luckyNumbers, maxStake };
});
