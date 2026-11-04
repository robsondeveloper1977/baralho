import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../js/roulette-logic.js';

const { WHEEL, colorOf, ruleOf, settle, luckyNumbers, spinNumber, totalBet, maxStake, LUCKY_MULT } = R;

test('roda europeia: 37 casas, 0..36 uma vez cada, vizinhos conhecidos', () => {
  assert.equal(WHEEL.length, 37);
  assert.deepEqual([...WHEEL].sort((a, b) => a - b), Array.from({ length: 37 }, (_, i) => i));
  assert.equal(WHEEL[0], 0);
  assert.deepEqual(WHEEL.slice(0, 3), [0, 32, 15]);
  assert.equal(WHEEL.at(-1), 26);
});

test('cores: 18 vermelhos, 18 pretos, 1 verde; alternam na roda (exceto no 0)', () => {
  const count = c => WHEEL.filter(n => colorOf(n) === c).length;
  assert.equal(count('red'), 18);
  assert.equal(count('black'), 18);
  assert.equal(count('green'), 1);
  for (let i = 1; i < 36; i++) assert.notEqual(colorOf(WHEEL[i]), colorOf(WHEEL[i + 1]), `casas ${WHEEL[i]} e ${WHEEL[i + 1]}`);
  assert.equal(colorOf(1), 'red'); assert.equal(colorOf(2), 'black'); assert.equal(colorOf(0), 'green');
});

test('cada número (1–36) pertence a exatamente uma dúzia, uma coluna, e uma paridade; 0 a nenhuma', () => {
  for (let n = 1; n <= 36; n++) {
    assert.equal(['d1', 'd2', 'd3'].filter(k => ruleOf(k).covers(n)).length, 1, `dúzia de ${n}`);
    assert.equal(['c1', 'c2', 'c3'].filter(k => ruleOf(k).covers(n)).length, 1, `coluna de ${n}`);
    assert.equal(['even', 'odd'].filter(k => ruleOf(k).covers(n)).length, 1, `paridade de ${n}`);
    assert.equal(['low', 'high'].filter(k => ruleOf(k).covers(n)).length, 1, `metade de ${n}`);
    assert.equal(['red', 'black'].filter(k => ruleOf(k).covers(n)).length, 1, `cor de ${n}`);
  }
  for (const k of ['red', 'black', 'even', 'odd', 'low', 'high', 'd1', 'd2', 'd3', 'c1', 'c2', 'c3'])
    assert.equal(ruleOf(k).covers(0), false, `0 não deve ganhar em ${k}`);
});

test('colunas seguem o layout da mesa (c1: 1,4,7… c3: 3,6,9…)', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].filter(n => ruleOf('c1').covers(n)), [1, 4]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].filter(n => ruleOf('c2').covers(n)), [2, 5]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].filter(n => ruleOf('c3').covers(n)), [3, 6]);
});

test('pagamentos: pleno 35:1, dúzia/coluna 2:1, chances simples 1:1', () => {
  assert.deepEqual(settle({ 'n:17': 100 }, 17), { staked: 100, payout: 3600, net: 3500, wins: [{ key: 'n:17', amount: 100, payout: 3600, label: '17' }] });
  assert.equal(settle({ d1: 100 }, 5).payout, 300);
  assert.equal(settle({ c2: 50 }, 8).payout, 150);
  assert.equal(settle({ red: 100 }, 1).payout, 200);
  assert.equal(settle({ black: 100 }, 1).payout, 0);
  assert.equal(settle({ red: 100 }, 1).net, 100);
  assert.equal(settle({ black: 100 }, 1).net, -100);
});

test('zero: só o pleno no 0 ganha; todo o resto perde', () => {
  const bets = { red: 50, black: 50, even: 50, odd: 50, low: 50, high: 50, d1: 50, d2: 50, d3: 50, c1: 50, c2: 50, c3: 50 };
  assert.equal(settle(bets, 0).payout, 0);
  assert.equal(settle(bets, 0).net, -600);
  assert.equal(settle({ ...bets, 'n:0': 50 }, 0).payout, 50 * 36);
});

test('várias apostas na mesma rodada somam', () => {
  const r = settle({ 'n:7': 50, red: 100, odd: 50, high: 50 }, 7);
  assert.equal(r.staked, 250);
  assert.equal(r.payout, 50 * 36 + 100 * 2 + 50 * 2 + 0);
  assert.equal(r.wins.length, 3);
});

test('Tigre da Sorte: multiplica só o LUCRO, nunca a aposta devolvida', () => {
  assert.equal(LUCKY_MULT, 2);
  assert.equal(settle({ red: 100 }, 1, 2).payout, 100 + 100 * 1 * 2);
  assert.equal(settle({ 'n:1': 50 }, 1, 2).payout, 50 + 50 * 35 * 2);
  assert.equal(settle({ black: 100 }, 1, 2).payout, 0, 'perdedora continua perdendo');
});

test('chaves inválidas são ignoradas', () => {
  assert.equal(ruleOf('n:37'), null);
  assert.equal(ruleOf('n:-1'), null);
  assert.equal(ruleOf('n:1.5'), null);
  assert.equal(ruleOf('n:01'), null);
  assert.equal(ruleOf('constructor'), null);
  assert.equal(ruleOf('__proto__'), null);
  assert.equal(settle({ banana: 100, 'n:99': 100 }, 5).payout, 0);
  assert.equal(settle({ red: -50, 'n:5': 0 }, 5).payout, 0);
});

test('spinNumber cobre 0..36 e respeita os extremos do rng', () => {
  assert.equal(spinNumber(() => 0), 0);
  assert.equal(spinNumber(() => 0.999999), 36);
  const seen = new Set();
  for (let i = 0; i < 20000; i++) seen.add(spinNumber());
  assert.equal(seen.size, 37);
});

test('luckyNumbers: distintos, ordenados, dentro do intervalo, com rng ruim não trava', () => {
  for (let i = 0; i < 200; i++) {
    const l = luckyNumbers();
    assert.equal(l.length, 3);
    assert.equal(new Set(l).size, 3);
    assert.ok(l.every(n => n >= 0 && n <= 36));
    assert.deepEqual(l, [...l].sort((a, b) => a - b));
  }
  let k = 0; const seq = [0.0, 0.0, 0.0, 0.5, 0.9];
  assert.equal(luckyNumbers(() => seq[k++ % seq.length]).length, 3);
});

test('totalBet e maxStake', () => {
  assert.equal(totalBet({ red: 100, 'n:3': 50 }), 150);
  assert.equal(totalBet({}), 0);
  assert.equal(maxStake(1000), 1000);
  assert.equal(maxStake(125), 100);
  assert.equal(maxStake(49), 0);
});

test('vantagem da casa na roleta europeia ≈ 2,70% (exata, sem multiplicador)', () => {
  const bet = (key) => { let ret = 0; for (let n = 0; n <= 36; n++) ret += settle({ [key]: 100 }, n).payout; return ret / 37 / 100; };
  for (const k of ['red', 'd2', 'c3', 'n:17', 'low']) assert.ok(Math.abs(bet(k) - 36 / 37) < 1e-9, `${k}: ${bet(k)}`);
});
