/* Regras puras do Foguete do Tigre (Crash). Funciona no navegador (global CrashLogic) e no Node (testes). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CrashLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const MIN_BET = 50;
  const EDGE = 0.03;        // vantagem da casa: retorno esperado de 97% para qualquer alvo de saque
  const MAX_MULT = 1000;    // teto do multiplicador
  const MIN_TARGET = 1.01;  // menor saque automático aceito
  const GROWTH = 0.11;      // m(t) = e^(GROWTH·t), t em segundos (2× em ~6,3 s, 10× em ~21 s)

  /** Ponto de explosão a partir de r em [0,1). P(ponto ≥ x) = (1 − EDGE) / x para x ≥ 1 (arredondado a 2 casas). */
  function crashPoint(r, edge = EDGE) {
    if (!(r >= 0 && r < 1)) throw new RangeError('r deve estar em [0, 1)');
    const x = Math.floor(100 * (1 - edge) / (1 - r)) / 100;
    return Math.min(MAX_MULT, Math.max(1, x));
  }

  /** Multiplicador contínuo após `ms` milissegundos de voo. */
  const multiplierAt = ms => Math.exp(GROWTH * Math.max(0, ms) / 1000);
  /** Instante (ms) em que o multiplicador contínuo atinge `m`. */
  const timeAt = m => Math.log(Math.max(1, m)) / GROWTH * 1000;
  /** Multiplicador exibido (truncado em 2 casas, nunca acima do real). */
  const displayAt = ms => Math.floor(multiplierAt(ms) * 100 + 1e-9) / 100;
  /** O foguete já explodiu após `ms` de voo? */
  const isCrashed = (point, ms) => ms >= timeAt(point);

  /** Prêmio bruto (stake incluso) de sacar em `mult`; sempre inteiro, arredondado para baixo. */
  const payout = (stake, mult) => Math.floor(stake * Math.round(mult * 100) / 100);

  /** Resultado de uma aposta: cashMult = multiplicador do saque (null se não sacou). */
  function settle(stake, point, cashMult) {
    const won = cashMult != null && cashMult <= point;
    const gross = won ? payout(stake, cashMult) : 0;
    return { won, payout: gross, net: gross - stake };
  }

  /** Interpreta o campo de saque automático: número entre 1,01 e 1000 com 2 casas, ou null (desligado/ inválido). */
  function parseTarget(text) {
    const n = Number(String(text ?? '').trim().replace(',', '.'));
    if (!Number.isFinite(n) || n < MIN_TARGET || n > MAX_MULT) return null;
    return Math.round(n * 100) / 100;
  }

  /** Faixa de cor do histórico. */
  const bucket = m => (m < 2 ? 'lo' : m < 10 ? 'mid' : 'hi');

  const clampBet = (v, balance) => {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n)) return MIN_BET;
    return Math.max(MIN_BET, Math.min(n, Math.max(MIN_BET, Math.floor(balance))));
  };

  return { MIN_BET, EDGE, MAX_MULT, MIN_TARGET, GROWTH, crashPoint, multiplierAt, timeAt, displayAt, isCrashed, payout, settle, parseTarget, bucket, clampBet };
});
