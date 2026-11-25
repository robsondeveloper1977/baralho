import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const L = createRequire(import.meta.url)('../js/crash-logic.js');

test('crashPoint: limites e validação', () => {
  assert.equal(L.crashPoint(0), 1);
  assert.equal(L.crashPoint(0.029), 1);          // abaixo da vantagem da casa → explode já em 1,00×
  assert.equal(L.crashPoint(0.5), 1.94);          // 0,97 / 0,5
  assert.equal(L.crashPoint(0.9), 9.7);
  assert.equal(L.crashPoint(1 - 1e-12), L.MAX_MULT); // teto
  for (const bad of [-0.1, 1, 2, NaN, undefined]) assert.throws(() => L.crashPoint(bad), RangeError);
});

test('crashPoint nunca sai de [1, MAX] e cresce com r', () => {
  let prev = 0;
  for (let i = 0; i < 1000; i++) {
    const p = L.crashPoint(i / 1000);
    assert.ok(p >= 1 && p <= L.MAX_MULT && p >= prev);
    prev = p;
  }
});

test('retorno esperado ≈ 97% para qualquer alvo de saque', () => {
  const N = 2_000_000;
  for (const target of [1.1, 1.5, 2, 5, 10, 50]) {
    let wins = 0;
    for (let i = 0; i < N; i++) if (L.crashPoint((i + 0.5) / N) >= target) wins++;
    const rtp = (wins / N) * target;
    assert.ok(Math.abs(rtp - (1 - L.EDGE)) < 0.003, `alvo ${target}: RTP ${rtp}`);
  }
});

test('multiplicador × tempo: monotônico e inversível', () => {
  assert.equal(L.multiplierAt(0), 1);
  assert.equal(L.multiplierAt(-500), 1);
  assert.equal(L.timeAt(1), 0);
  assert.equal(L.timeAt(0.5), 0); // abaixo de 1 vira 0
  for (const m of [1.5, 2, 3.7, 10, 100]) {
    assert.ok(Math.abs(L.multiplierAt(L.timeAt(m)) - m) < 1e-9);
  }
  assert.ok(L.multiplierAt(1000) < L.multiplierAt(2000));
  const t2 = L.timeAt(2) / 1000;
  assert.ok(t2 > 5 && t2 < 8, '2× em cerca de 6 s');
});

test('displayAt trunca e nunca passa do valor real', () => {
  for (let ms = 0; ms < 60000; ms += 137) {
    assert.ok(L.displayAt(ms) <= L.multiplierAt(ms) + 1e-12);
    assert.ok(L.multiplierAt(ms) - L.displayAt(ms) < 0.0100001);
  }
  assert.equal(L.displayAt(0), 1);
});

test('isCrashed respeita o instante exato da explosão', () => {
  const p = 3.21, t = L.timeAt(p);
  assert.equal(L.isCrashed(p, t - 1), false);
  assert.equal(L.isCrashed(p, t), true);
  assert.equal(L.isCrashed(1, 0), true); // 1,00× explode imediatamente
});

test('payout: inteiro, para baixo, sem erro de ponto flutuante', () => {
  assert.equal(L.payout(100, 2), 200);
  assert.equal(L.payout(50, 1.15), 57);   // 57,5 → 57
  assert.equal(L.payout(250, 1.01), 252);
  assert.equal(L.payout(333, 3.33), 1108);
  assert.equal(L.payout(50, 1.1), 55);    // 50 * 1.1 = 55.00000000000001 em float
  assert.ok(Number.isInteger(L.payout(777, 7.77)));
});

test('settle: ganha se sacou até o ponto, perde caso contrário', () => {
  assert.deepEqual(L.settle(100, 3, 2), { won: true, payout: 200, net: 100 });
  assert.deepEqual(L.settle(100, 2, 2), { won: true, payout: 200, net: 100 }); // alvo = ponto ganha
  assert.deepEqual(L.settle(100, 1.99, 2), { won: false, payout: 0, net: -100 });
  assert.deepEqual(L.settle(100, 5, null), { won: false, payout: 0, net: -100 });
});

test('parseTarget aceita 1,01–1000 e rejeita o resto', () => {
  assert.equal(L.parseTarget('2'), 2);
  assert.equal(L.parseTarget(' 2,5 '), 2.5);
  assert.equal(L.parseTarget('3.456'), 3.46);
  assert.equal(L.parseTarget('1.01'), 1.01);
  assert.equal(L.parseTarget('1000'), 1000);
  for (const bad of ['', '1', '1.005', '1001', 'abc', '-3', null, undefined, 'Infinity']) assert.equal(L.parseTarget(bad), null);
});

test('bucket e clampBet', () => {
  assert.equal(L.bucket(1.99), 'lo'); assert.equal(L.bucket(2), 'mid');
  assert.equal(L.bucket(9.99), 'mid'); assert.equal(L.bucket(10), 'hi');
  assert.equal(L.clampBet(10, 1000), 50);
  assert.equal(L.clampBet(5000, 1000), 1000);
  assert.equal(L.clampBet('abc', 1000), 50);
  assert.equal(L.clampBet(123.9, 1000), 123);
  assert.equal(L.clampBet(100, 20), 50); // saldo menor que o mínimo: não quebra
});
