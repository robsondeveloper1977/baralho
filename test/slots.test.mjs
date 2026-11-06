import test from 'node:test';
import assert from 'node:assert/strict';
import L from '../js/slots-logic.js';
import createWallet from '../js/wallet.js';
const grid = id => Array.from({length:5},()=>Array(3).fill(id));
test('20 linhas distintas e sorteios dentro do catálogo',()=>{
 assert.equal(new Set(L.LINES.map(x=>x.join())).size,20);
 assert.ok(L.validGrid(L.randomGrid(()=>0)));
 assert.equal(L.randomGrid(()=>.999)[0][0],'scatter');
 assert.throws(()=>L.randomGrid(()=>1));
});
test('cinco conchas pagam cada linha exatamente uma vez',()=>{
 const result=L.evaluate(grid('shell'),20);
 assert.equal(result.wins.length,20);assert.equal(result.payout,1100);
});
test('Wild escolhe o prêmio maior, sem duplicar a mesma linha',()=>{
 const g=grid('wild'); g[3]=['shell','shell','shell']; g[4]=['shell','shell','shell'];
 // Three Wilds pay 55; five shells also pay 55. Only one is paid per line.
 assert.equal(L.evaluate(g,20).payout,1100);
 g[3]=['crown','crown','crown'];g[4]=['crown','crown','crown'];
 assert.equal(L.evaluate(g,20).payout,13000);
 assert.equal(L.evaluate(grid('wild'),20).payout,22000);
});
test('Scatter não é substituído e três pérolas liberam oito giros',()=>{
 const g=grid('shell');g[0]=['scatter','scatter','scatter'];
 const r=L.evaluate(g,20);assert.equal(r.awarded,8);assert.equal(r.payout,0);
});
test('somente sequências a partir da primeira coluna são pagas',()=>{
 const g=grid('shell');g[0]=['fish','fish','fish'];
 assert.equal(L.evaluate(g,20).payout,0);
 g[0]=['shell','shell','shell'];g[3]=['fish','fish','fish'];g[4]=['fish','fish','fish'];
 assert.equal(L.evaluate(g,20).payout,100);
});
test('giro grátis usa aposta do bônus, desconta um giro e pode reativar',()=>{
 const a={balance:0,slots:{free:2,bonusBet:40}};
 const next=L.spin(a,500,()=>0);assert.equal(next.balance,2200);
 assert.equal(next.slots.free,1);assert.equal(next.slots.last.bet,40);
 const bonus=L.spin(a,20,()=>.999);assert.equal(bonus.slots.free,9);assert.equal(bonus.balance,0);
 assert.deepEqual(a,{balance:0,slots:{free:2,bonusBet:40}});
});
test('aposta paga é debitada uma vez e saldo insuficiente é rejeitado',()=>{
 assert.equal(L.spin({balance:1000},20,()=>0).balance,2080);
 assert.throws(()=>L.spin({balance:19},20));assert.throws(()=>L.spin({balance:1000},30));
});
test('carteira migra zero sem reposição e salva resultado + saldo atomicamente',()=>{
 const map=new Map([['vu21.balance','0']]);let writes=0;
 const wallet=createWallet(()=>({getItem:k=>map.get(k)??null,setItem:(k,v)=>{writes++;map.set(k,v);}}));
 assert.equal(wallet.get(),0);wallet.set(1000);writes=0;
 const saved=wallet.commit(a=>L.spin(a,20,()=>0));
 assert.equal(writes,1);assert.deepEqual(wallet.read(),saved);
 assert.equal(wallet.read().balance,2080);assert.equal(wallet.read().balance,2080);
 wallet.set(1500);assert.deepEqual(wallet.read().slots,saved.slots);
});
test('falha de persistência não retorna um giro confirmado',()=>{
 const wallet=createWallet(()=>({getItem:()=>null,setItem:()=>{throw Error('Quota');}}));
 assert.throws(()=>wallet.commit(a=>L.spin(a,20,()=>0)),/Quota/);
 assert.equal(wallet.get(),1000);
});

test('older games tolerate unavailable storage; slot commits still fail safely',()=>{
 const wallet=createWallet(()=>{throw Error('Storage blocked');});
 assert.equal(wallet.get(),1000);assert.equal(wallet.set(500),null);
 assert.throws(()=>wallet.commit(a=>L.spin(a,20)),/Storage blocked/);
});
