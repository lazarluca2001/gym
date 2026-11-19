/* Alsó menüsor a lapok között + értesítés, ha új verzió van fent */
(function(){
  const path=location.pathname;
  const here=/edzes\.html$/.test(path)?'edzes':/stats\.html$/.test(path)?'stats':/terv\.html$/.test(path)?'terv':'ma';
  const ic={
    ma:'<path d="M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    terv:'<rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    edzes:'<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    stats:'<path d="M5 20V11M12 20V5M19 20v-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'};
  const items=[{id:'ma',href:'./',t:'Napló'},{id:'terv',href:'terv.html',t:'Terv'},{id:'stats',href:'stats.html',t:'Statisztika'}];
  const bar=document.createElement('nav'); bar.className='tabbar'; bar.setAttribute('aria-label','Oldalak');
  bar.innerHTML=items.map(x=>`<a href="${x.href}" class="${x.id===here?'cur':''}" ${x.id===here?'aria-current="page"':''}><svg viewBox="0 0 24 24" aria-hidden="true">${ic[x.id]}</svg>${x.t}</a>`).join('');
  document.body.appendChild(bar);
  if(window.LocalDB) LocalDB.status();

  // --- frissítésjelzés: ha a GitHubra új változat kerül, szól ---
  const WATCH=['./','stats.html','terv.html','store.js','plan.js','nav.js','theme.css'];
  async function sig(){
    try{
      const parts=await Promise.all(WATCH.map(u=>fetch(u,{method:'HEAD',cache:'no-store'}).then(r=>r.ok?(r.headers.get('etag')||r.headers.get('last-modified')||''):'')));
      const s=parts.join('|'); return s.replace(/\|/g,'')?s:null;
    }catch(e){return null}
  }
  let base=null, lastCheck=0, shown=false;
  sig().then(s=>{base=s;lastCheck=Date.now()});
  async function check(){
    if(shown||!navigator.onLine||Date.now()-lastCheck<5*60*1000) return;
    lastCheck=Date.now(); const s=await sig(); if(!s) return;
    if(base==null){base=s;return}
    if(s!==base) showUpdate();
  }
  function showUpdate(){
    shown=true; const b=document.createElement('div'); b.className='updbar'; b.setAttribute('role','status');
    b.innerHTML='<span>Új verzió érhető el.</span><button type="button">Frissítés</button>';
    b.querySelector('button').addEventListener('click',()=>location.reload());
    document.body.appendChild(b);
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
  setInterval(check,15*60*1000);
})();
