(() => {
  'use strict';
  const L=SlotsLogic, wallet=CasinoWallet, $=id=>document.getElementById(id);
  const fmt=n=>n.toLocaleString('pt-BR'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let account, busy=false, last=null, lineIndex=0, quick=false;
  const columns=[],cells=[],timers=new Set();
  for(let col=0;col<5;col++){
    const reel=document.createElement('div');reel.className='reel';columns.push(reel);cells[col]=[];
    for(let row=0;row<3;row++){
      const cell=document.createElement('div');cell.className='symbol';cell.setAttribute('role','img');
      const img=new Image();img.alt='';img.draggable=false;cell.append(img);reel.append(cell);cells[col].push(cell);
    }
    $('reels').append(reel);
  }
  function symbol(col,row,id){
    const s=L.SYMBOLS.find(s=>s.id===id);
    cells[col][row].firstChild.src=SlotsArt.urls[id];
    cells[col][row].setAttribute('aria-label','Rolo '+(col+1)+', posição '+(row+1)+': '+s.name);
  }
  function draw(grid){grid.forEach((col,c)=>col.forEach((id,r)=>symbol(c,r,id)));}
  draw([['shell','gem','star'],['fish','wild','crown'],['chest','scatter','gem'],['crown','shell','fish'],['star','gem','chest']]);
  $('wild-preview').src=SlotsArt.urls.wild;$('scatter-preview').src=SlotsArt.urls.scatter;
  for(const bet of L.BETS){const o=document.createElement('option');o.value=bet;o.textContent=fmt(bet);$('bet').append(o);}
  $('bet').value='20';
  for(const s of L.SYMBOLS.filter(s=>s.pays.length)){
    const tr=document.createElement('tr');
    tr.innerHTML='<td><img src="'+SlotsArt.urls[s.id]+'" alt="">'+s.name+'</td>'+s.pays.map(p=>'<td>'+fmt(p)+'×</td>').join('');
    $('paytable').append(tr);
  }
  L.LINES.forEach((rows,i)=>{
    const f=document.createElement('figure');
    f.innerHTML='<svg viewBox="0 0 100 60" aria-hidden="true">'+
      Array.from({length:15},(_,n)=>'<circle cx="'+(10+(n%5)*20)+'" cy="'+(10+Math.floor(n/5)*20)+'" r="2" fill="#426b69"/>').join('')+
      '<polyline points="'+rows.map((r,c)=>(10+c*20)+','+(10+r*20)).join(' ')+'" fill="none" stroke="#e4cc90" stroke-width="2"/></svg><figcaption>Linha '+(i+1)+'</figcaption>';
    $('line-gallery').append(f);
  });
  function soundLabel(){
    const muted=OceanAudio.muted;
    $('sound').textContent=OceanAudio.available?(muted?'Som desligado':'Som ligado'):'Som indispon\u00edvel';
    $('sound').setAttribute('aria-pressed',String(!muted && OceanAudio.available));
    $('sound').setAttribute('aria-label',muted?'Ativar som':'Desativar som');
  }
  soundLabel();
  const unlockSound=()=>{OceanAudio.unlock();soundLabel();};
  document.addEventListener('pointerdown',unlockSound,{passive:true});
  document.addEventListener('keydown',unlockSound,{passive:true});
  $('sound').onclick=()=>{OceanAudio.setMuted(!OceanAudio.muted);soundLabel();};
  $('speed').onclick=()=>{quick=!quick;$('speed').setAttribute('aria-pressed',String(quick));OceanAudio.click();};
  function message(text){$('status').textContent=text;}
  function update(){
    if(!account)return;
    const free=account.slots?.free||0;
    if(free)$('bet').value=String(account.slots.bonusBet);
    $('balance').textContent=fmt(account.balance);
    $('prize').textContent=fmt(last?.payout||0);
    $('bonus').textContent=free?free+' GIROS GRÁTIS · APOSTA '+fmt(account.slots.bonusBet):'3 PÉROLAS · 8 GIROS GRÁTIS';
    document.querySelector('.machine').classList.toggle('bonus-active',free>0);
    const index=L.BETS.indexOf(Number($('bet').value));
    $('less').disabled=busy||!!free||index===0;$('more').disabled=busy||!!free||index===L.BETS.length-1;
    $('bet').disabled=busy||!!free;
    $('spin').disabled=busy||(!free&&account.balance<Number($('bet').value));
    $('spin-label').textContent=busy?'EXPLORANDO…':free?'GIRO GRÁTIS':'GIRAR';
    $('spin-hint').textContent=free?'SEM DÉBITO DE FICHAS':'ESPAÇO OU ENTER';
    $('refill').hidden=account.balance>=L.BETS[0]||!!free||busy;
  }
  function clearHighlights(){
    cells.flat().forEach(c=>c.classList.remove('winner','scatter-win'));
    $('payline').firstElementChild.setAttribute('points','');
  }
  function highlight(index){
    clearHighlights();if(!last)return;
    if(last.awarded)last.grid.forEach((col,c)=>col.forEach((s,r)=>{if(s==='scatter')cells[c][r].classList.add('scatter-win');}));
    if(!last.wins.length)return;
    const win=last.wins[index%last.wins.length];
    for(let col=0;col<win.count;col++)cells[col][win.rows[col]].classList.add('winner');
    $('payline').firstElementChild.setAttribute('points',win.rows.map((r,c)=>(50+c*100)+','+(50+r*100)).join(' '));
    $('lines').textContent='Linha '+(win.line+1)+' · '+fmt(win.payout)+' fichas';
    $('lines').setAttribute('aria-label','Linha '+(win.line+1)+', prêmio '+win.payout+'. Mostrar próxima linha premiada');
  }
  function present(restored=false){
    if(!last)return;
    draw(last.grid);lineIndex=0;highlight(0);
    $('lines').hidden=!last.wins.length;
    let text=last.payout?'Você ganhou '+fmt(last.payout)+' fichas em '+last.wins.length+' '+(last.wins.length===1?'linha.':'linhas.'):'Nenhuma linha premiada neste giro.';
    if(last.awarded)text+=' +8 giros grátis!';
    if(restored)text='Último resultado salvo. '+text;
    message(text);
  }
  function read(){
    account=wallet.read();
    const saved=account.slots?.last;
    last=saved&&L.validGrid(saved.grid)&&L.BETS.includes(saved.bet)?{...saved,...L.evaluate(saved.grid,saved.bet)}:null;
  }
  try{read();present(true);update();}catch{message('Não foi possível ler a carteira. Habilite o armazenamento local para jogar.');$('spin').disabled=true;}
  function betStep(delta){
    OceanAudio.click();
    const index=L.BETS.indexOf(Number($('bet').value));$('bet').value=String(L.BETS[Math.max(0,Math.min(L.BETS.length-1,index+delta))]);update();
  }
  $('less').onclick=()=>betStep(-1);$('more').onclick=()=>betStep(1);$('bet').onchange=()=>{update();OceanAudio.click();};
  $('lines').onclick=()=>{lineIndex++;highlight(lineIndex);OceanAudio.click();};
  function random(){
    const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);return bytes[0]/4294967296;
  }
  const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function animate(grid){
    if(reduced.matches){draw(grid);await wait(100);return;}
    const duration=quick?300:750,step=quick?90:190;
    await Promise.all(columns.map(async(reel,c)=>{
      reel.classList.remove('stopped');reel.classList.add('spinning');
      const timer=setInterval(()=>{for(let r=0;r<3;r++)symbol(c,r,L.SYMBOLS[Math.floor(Math.random()*L.SYMBOLS.length)].id);},80);
      timers.add(timer);
      await wait(duration+c*step);
      clearInterval(timer);timers.delete(timer);
      grid[c].forEach((s,r)=>symbol(c,r,s));reel.classList.remove('spinning');reel.classList.add('stopped');OceanAudio.reelStop(c,grid[c].includes('scatter'));
    }));
  }
  async function withWalletLock(fn){
    if(!navigator.locks)throw Error('Este navegador não oferece gravação segura entre abas. Use uma versão recente do navegador.');
    return navigator.locks.request('vu21-wallet',fn);
  }
  async function spin(){
    if(busy||$('rules').open)return;
    busy=true;clearHighlights();$('lines').hidden=true;$('reels').setAttribute('aria-busy','true');update();message('Os tesouros estão a caminho…');OceanAudio.unlock();
    try{
      // Saving the entire settlement first means reloads never replay money or bonus awards.
      account=await withWalletLock(()=>wallet.commit(current=>L.spin(current,Number($('bet').value),random)));
      last=account.slots.last;
      OceanAudio.startSpin(quick || reduced.matches);
      await animate(last.grid);present();
      OceanAudio.result(last.payout,last.bet,last.awarded);
    }catch(error){
      message(error.name==='QuotaExceededError'||error.name==='SecurityError'?'Não foi possível salvar o giro. Libere o armazenamento do navegador.':error.message);
    }finally{
      OceanAudio.stopSpin();
      timers.forEach(clearInterval);timers.clear();columns.forEach(r=>r.classList.remove('spinning'));
      busy=false;$('reels').setAttribute('aria-busy','false');
      try{account=wallet.read();}catch{}
      update();
    }
  }
  $('spin').onclick=spin;
  $('refill').onclick=async()=>{
    if(busy)return;
    busy=true;update();
    try{
      account=await withWalletLock(()=>wallet.commit(a=>{
        if(a.balance>=L.BETS[0]||a.slots?.free)return a;
        return {...a,balance:wallet.START,slots:null};
      }));
      last=account.slots?.last||null;clearHighlights();$('lines').hidden=true;message('Nova expedição: 1.000 fichas virtuais.');
    }catch{message('Não foi possível salvar a carteira.');}finally{busy=false;update();}
  };
  $('help').onclick=()=>{OceanAudio.click();$('rules').showModal();};
  $('close-help').onclick=()=>{$('rules').close();$('help').focus();};
  $('rules').addEventListener('click',e=>{if(e.target===$('rules')){const r=$('rules').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('rules').close();}});
  addEventListener('keydown',e=>{
    if(e.repeat||$('rules').open||e.ctrlKey||e.metaKey||e.altKey||/^(BUTTON|SELECT|INPUT|TEXTAREA|A)$/.test(e.target.tagName))return;
    if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!$('spin').disabled)spin();}
  });
  addEventListener('storage',e=>{
    if(e.key!==wallet.KEY||busy)return;
    try{read();present(true);update();}catch{message('A carteira foi alterada em outra aba. Recarregue para continuar.');$('spin').disabled=true;}
  });
  addEventListener('pageshow',e=>{if(e.persisted&&!busy){try{read();present(true);update();}catch{}}});
})();
