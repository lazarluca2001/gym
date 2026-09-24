/* Hamburger menü a lapok között + értesítés, ha új verzió van fent */
(function(){
  const path=location.pathname;
  const here=/suly\.html$/.test(path)?'suly':/edzes\.html$/.test(path)?'edzes':/stats\.html$/.test(path)?'stats':'ma';
  const onMa=here==='ma';
  const items=[
    {id:'ma',href:'./',t:'Ma',s:'Mai súly, étkezés, edzés, tánc',c:'#1b2320'},
    {id:'suly',href:'suly.html',t:'Súlynapló',s:'Súly, étkezés, derék, ciklus',c:'#0ca678'},
    {id:'edzes',href:'edzes.html',t:'Edzés és tánc',s:'Gyakorlatok szériánként, táncórák',c:'#f76707'},
    {id:'stats',href:'stats.html',t:'Statisztika',s:'Grafikonok: súly, derék, kcal, edzés',c:'#1c7ed6'},
    {id:'sync',href:'./#szinkron',t:'Adatok és szinkron',s:'Google Táblázat, biztonsági mentés',c:'#ae3ec9'}
  ];
  const css=`
  .navwrap{display:flex;align-items:center;gap:12px}
  .navbtn{width:44px;height:44px;flex:none;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);display:grid;place-items:center;padding:0;cursor:pointer}
  .navbtn span{display:block;width:18px;height:2px;background:currentColor;border-radius:2px;box-shadow:0 -6px 0 currentColor,0 6px 0 currentColor}
  .navov{position:fixed;inset:0;background:rgba(10,14,18,.45);opacity:0;pointer-events:none;transition:opacity .2s;z-index:50}
  .navov.open{opacity:1;pointer-events:auto}
  .drawer{position:fixed;top:0;bottom:0;left:0;width:min(320px,86vw);background:var(--surface);color:var(--ink);z-index:51;transform:translateX(-102%);transition:transform .22s ease;display:flex;flex-direction:column;gap:6px;
    padding:calc(env(safe-area-inset-top,0px) + 18px) 14px calc(env(safe-area-inset-bottom,0px) + 18px);box-shadow:4px 0 24px rgba(0,0,0,.15)}
  .drawer.open{transform:none}
  .drawer .dh{display:flex;justify-content:space-between;align-items:center;padding:0 6px 10px}
  .drawer .dh b{font-family:var(--display);font-size:18px}
  .drawer .dh button{background:none;border:none;color:var(--muted);font-size:22px;padding:4px 8px;cursor:pointer}
  .drawer a{display:flex;gap:12px;align-items:flex-start;padding:12px;border-radius:12px;text-decoration:none;color:var(--ink)}
  .drawer a:hover{background:var(--sunk)}
  .drawer a.cur{background:var(--sunk)}
  .drawer a i{width:12px;height:12px;border-radius:50%;margin-top:5px;flex:none}
  .drawer a b{display:block;font-family:var(--display);font-weight:600}
  .drawer a small{display:block;color:var(--muted);font-size:12px}
  .drawer .foot{margin-top:auto;padding:10px 12px}
  .drawer a[data-id="ma"] i{background:var(--ink)!important}
  .updbar{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:60;background:var(--ink);color:var(--bg);border-radius:14px;padding:10px 12px 10px 16px;display:flex;gap:12px;align-items:center;box-shadow:0 6px 24px rgba(0,0,0,.25);font-size:14px;max-width:calc(100vw - 32px)}
  .updbar button{background:var(--accent);color:var(--accent-ink);border:none;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer}
  @media (prefers-reduced-motion:reduce){.drawer,.navov{transition:none}}`;
  const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  const ov=document.createElement('div'); ov.className='navov';
  const dr=document.createElement('nav'); dr.className='drawer'; dr.setAttribute('aria-label','Menü'); dr.setAttribute('aria-hidden','true');
  dr.innerHTML=`<div class="dh"><b>Menü</b><button type="button" aria-label="Menü bezárása">×</button></div>`+
    items.map(x=>`<a href="${x.href}" data-id="${x.id}" class="${x.id===here?'cur':''}" tabindex="-1"><i style="background:${x.c}"></i><span><b>${x.t}</b><small>${x.s}</small></span></a>`).join('')+
    `<div class="foot"><span class="status" data-sync-status><i></i><span></span></span></div>`;
  document.body.append(ov,dr);

  const btn=document.createElement('button'); btn.type='button'; btn.className='navbtn'; btn.setAttribute('aria-label','Menü'); btn.setAttribute('aria-expanded','false'); btn.innerHTML='<span></span>';
  const header=document.querySelector('header');
  if(header){const first=header.firstElementChild;const w=document.createElement('div');w.className='navwrap';header.insertBefore(w,first);w.append(btn,first)}
  else{btn.style.cssText='position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:10px;z-index:40';document.body.appendChild(btn)}

  const links=()=>dr.querySelectorAll('a');
  function open(){dr.classList.add('open');ov.classList.add('open');dr.setAttribute('aria-hidden','false');btn.setAttribute('aria-expanded','true');links().forEach(a=>a.tabIndex=0);if(window.LocalDB)LocalDB.status();(dr.querySelector('a.cur')||links()[0]).focus()}
  function close(){dr.classList.remove('open');ov.classList.remove('open');dr.setAttribute('aria-hidden','true');btn.setAttribute('aria-expanded','false');links().forEach(a=>a.tabIndex=-1)}
  btn.addEventListener('click',open);
  ov.addEventListener('click',close);
  dr.querySelector('.dh button').addEventListener('click',()=>{close();btn.focus()});
  addEventListener('keydown',e=>{if(e.key==='Escape'&&dr.classList.contains('open')){close();btn.focus()}});
  dr.addEventListener('click',e=>{
    const a=e.target.closest('a'); if(!a) return;
    if(a.dataset.id===here){e.preventDefault();close();window.scrollTo({top:0,behavior:'smooth'});return}
    if(a.dataset.id==='sync'&&onMa){e.preventDefault();close();const d=document.getElementById('syncdetails');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'})}}
  });
  if(window.LocalDB) LocalDB.status();

  // --- frissítésjelzés: ha a GitHubra új változat kerül, szól ---
  const WATCH=['./','edzes.html','suly.html','stats.html','store.js','nav.js'];
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
