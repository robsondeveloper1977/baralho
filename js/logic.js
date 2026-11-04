/* Regras puras do Blackjack (sem DOM/WebGL) — funciona no navegador (window.Logic) e no Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const MIN_BET = 50;
  const CHIP_VALUES = [50, 100, 250, 500];
  const DEALER_STANDS_ON = 17;

  function value(rank) {
    if (rank === 'A') return 11;
    if (rank === 'K' || rank === 'Q' || rank === 'J' || rank === '10') return 10;
    return Number(rank);
  }

  /** Total da mão (array de ranks); ases valem 11 e viram 1 enquanto estourar. */
  function total(ranks) {
    let t = 0, aces = 0;
    for (const r of ranks) { t += value(r); if (r === 'A') aces++; }
    while (t > 21 && aces > 0) { t -= 10; aces--; }
    return t;
  }

  function isSoft(ranks) {
    let t = 0, aces = 0;
    for (const r of ranks) { t += value(r); if (r === 'A') aces++; }
    while (t > 21 && aces > 0) { t -= 10; aces--; }
    return aces > 0 && t <= 21;
  }

  const isBlackjack = ranks => ranks.length === 2 && total(ranks) === 21;
  const dealerShouldHit = ranks => total(ranks) < DEALER_STANDS_ON;

  class Shoe {
    constructor(decks = 4, rng = Math.random) {
      this.decks = decks;
      this.rng = rng;
      this.cards = [];
      this.cutAt = Math.floor(decks * 52 * 0.2); // reembaralha quando restar ~20%
      this.shuffle();
    }
    shuffle() {
      const cards = [];
      for (let d = 0; d < this.decks; d++)
        for (const suit of SUITS) for (const rank of RANKS) cards.push({ rank, suit });
      for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      this.cards = cards;
    }
    get remaining() { return this.cards.length; }
    /** Só deve ser consultado ENTRE rodadas — nunca no meio de uma mão. */
    needsShuffle() { return this.cards.length < this.cutAt; }
    draw() {
      if (!this.cards.length) this.shuffle(); // segurança extra; não ocorre no fluxo normal
      return this.cards.pop();
    }
  }

  /**
   * Resolve a rodada. `bet` é o total apostado (já dobrado, se for o caso).
   * Retorna { outcome, payout, net }: payout = quanto volta ao jogador (0 se perdeu).
   */
  function settle(player, dealer, bet) {
    const p = total(player), d = total(dealer);
    const pb = isBlackjack(player), db = isBlackjack(dealer);
    let outcome, payout;
    if (p > 21) { outcome = 'bust'; payout = 0; }
    else if (pb && db) { outcome = 'push'; payout = bet; }
    else if (pb) { outcome = 'blackjack'; payout = Math.round(bet * 2.5); }
    else if (db) { outcome = 'dealer-blackjack'; payout = 0; }
    else if (d > 21) { outcome = 'dealer-bust'; payout = bet * 2; }
    else if (p > d) { outcome = 'win'; payout = bet * 2; }
    else if (p < d) { outcome = 'lose'; payout = 0; }
    else { outcome = 'push'; payout = bet; }
    return { outcome, payout, net: payout - bet };
  }

  /** Decompõe a aposta em fichas (maiores primeiro). */
  function chipBreakdown(bet, denoms = CHIP_VALUES.slice().reverse()) {
    const out = [];
    let rest = bet;
    for (const denom of denoms) {
      const count = Math.floor(rest / denom);
      if (count > 0) { out.push({ denom, count }); rest -= count * denom; }
    }
    return out;
  }

  /** Maior aposta possível (múltiplo da aposta mínima) para um saldo. */
  const maxBet = balance => Math.floor(balance / MIN_BET) * MIN_BET;

  return { SUITS, RANKS, MIN_BET, CHIP_VALUES, DEALER_STANDS_ON,
           value, total, isSoft, isBlackjack, dealerShouldHit, Shoe, settle, chipBreakdown, maxBet };
});
