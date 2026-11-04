import test from 'node:test';
import assert from 'node:assert/strict';
import Logic from '../js/logic.js';

const { total, isBlackjack, isSoft, settle, Shoe, chipBreakdown, maxBet, dealerShouldHit } = Logic;

test('total: ases valem 11 e viram 1 quando estoura', () => {
  assert.equal(total(['A', 'K']), 21);
  assert.equal(total(['A', 'A']), 12);
  assert.equal(total(['A', 'A', '9']), 21);
  assert.equal(total(['A', '5', 'K']), 16);
  assert.equal(total(['K', 'Q', '5']), 25);
  assert.equal(total([]), 0);
});

test('isSoft', () => {
  assert.equal(isSoft(['A', '6']), true);
  assert.equal(isSoft(['A', '6', 'K']), false);
  assert.equal(isSoft(['10', '7']), false);
});

test('blackjack só com duas cartas', () => {
  assert.equal(isBlackjack(['A', '10']), true);
  assert.equal(isBlackjack(['7', '7', '7']), false);
});

test('dealer para no 17 (inclusive soft 17)', () => {
  assert.equal(dealerShouldHit(['10', '6']), true);
  assert.equal(dealerShouldHit(['10', '7']), false);
  assert.equal(dealerShouldHit(['A', '6']), false);
});

test('settle: todos os desfechos', () => {
  assert.deepEqual(settle(['10', '5', 'K'], ['10', '7'], 100), { outcome: 'bust', payout: 0, net: -100 });
  assert.deepEqual(settle(['A', 'K'], ['10', '7'], 100), { outcome: 'blackjack', payout: 250, net: 150 });
  assert.deepEqual(settle(['A', 'K'], ['A', 'Q'], 100), { outcome: 'push', payout: 100, net: 0 });
  assert.deepEqual(settle(['10', '7'], ['A', 'K'], 100), { outcome: 'dealer-blackjack', payout: 0, net: -100 });
  assert.deepEqual(settle(['10', '7'], ['10', '6', '9'], 100), { outcome: 'dealer-bust', payout: 200, net: 100 });
  assert.deepEqual(settle(['10', '9'], ['10', '7'], 100), { outcome: 'win', payout: 200, net: 100 });
  assert.deepEqual(settle(['10', '7'], ['10', '9'], 100), { outcome: 'lose', payout: 0, net: -100 });
  assert.deepEqual(settle(['10', '8'], ['9', '9'], 100), { outcome: 'push', payout: 100, net: 0 });
});

test('21 com três cartas não é blackjack', () => {
  assert.equal(settle(['7', '7', '7'], ['10', '9'], 50).outcome, 'win');
  assert.equal(settle(['7', '7', '7'], ['A', 'K'], 50).outcome, 'dealer-blackjack');
});

test('blackjack paga 3:2 com aposta mínima sem fração', () => {
  assert.equal(settle(['A', 'K'], ['10', '7'], 50).payout, 125);
});

test('Shoe: 4 baralhos, sem perder cartas, reembaralha só pelo corte', () => {
  const shoe = new Shoe(4);
  assert.equal(shoe.remaining, 208);
  assert.equal(shoe.needsShuffle(), false);
  const seen = new Map();
  for (let i = 0; i < 208; i++) {
    const c = shoe.draw();
    const k = c.rank + c.suit;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  assert.equal(seen.size, 52);
  for (const n of seen.values()) assert.equal(n, 4);
  assert.equal(shoe.needsShuffle(), true);
  shoe.draw(); // esgotado: não pode lançar erro
  assert.equal(shoe.remaining, 207);
});

test('chipBreakdown soma exatamente a aposta', () => {
  for (const bet of [50, 100, 150, 300, 750, 1250, 5050]) {
    const sum = chipBreakdown(bet).reduce((s, c) => s + c.denom * c.count, 0);
    assert.equal(sum, bet);
  }
});

test('maxBet', () => {
  assert.equal(maxBet(1000), 1000);
  assert.equal(maxBet(125), 100);
  assert.equal(maxBet(49), 0);
});
