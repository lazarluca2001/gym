/* Közös adattár a Súlynaplóhoz és az Edzés és tánc oldalhoz:
   helyi tárolás a telefonon + opcionális szinkron egy Google Táblázattal. */
(function(){
  const KEY='edzes-tanc-v1', PKEY='edzes-tanc-v1-pending', CFG='edzes-tanc-sync';
  const SEED={"workouts": {"2026-09-23": {"date": "2026-09-23", "items": [{"done": true, "ex": "Lat Pulldown", "kg": 13.75, "reps": 10, "rir": 1, "sets": 4}, {"done": true, "ex": "Chest Press", "kg": 20, "reps": 8, "rir": 0, "sets": 2}, {"done": true, "ex": "Triceps Extension", "kg": 12.5, "reps": 8, "rir": 2, "sets": 3}, {"done": true, "ex": "Abdominal Crunch", "kg": 20, "reps": 12, "rir": 4, "sets": 3}, {"done": true, "ex": "Seated Row", "kg": 20, "reps": 10, "rir": 2, "sets": 2}]}}, "dance": {"2026-09-24": {"date": "2026-09-24", "items": [{"intensity": 3, "kind": "ora", "min": 90, "note": "SH - Versenyző óra", "sub": "technika"}]}, "2026-09-22": {"date": "2026-09-22", "items": [{"intensity": 5, "kind": "ora", "min": 90, "note": "SH - Csoportos magánóra", "sub": "gyakorlas"}]}}, "settings": {"templates": {"hetfo": ["Hack guggolás", "Leg Press", "Leg Extension", "Glute drive", "Calf Raise", "Abdominal Crunch", "Leg Raise"], "pentek": ["Csípőfeszítés", "Glute drive", "Outer Thigh", "Inner Thigh", "Leg curl", "Abdominal Crunch", "Calf Raise"], "szerda": ["Lat Pulldown", "Seated Row", "Chest Press", "Shoulder Press", "Biceps Curl", "Triceps Extension", "Abdominal Crunch"]}, "goals": {"dance": 4, "gym": 2}, "plan": {"goal": 54, "intake": 1396, "start": 60, "startDate": "2026-09-24", "tdeeA": 2267, "tdeeB": 2000}}, "weighins": {"2026-09-24": {"date": "2026-09-24", "items": {"ebed": [], "nasi": [], "reggeli": [], "vacsora": []}, "kg": 60.4, "period": false, "waist": 85}}};
  const COLS=['workouts','dance','weighins'];
  const clone=o=>JSON.parse(JSON.stringify(o));
  const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?f:v}catch(e){return f}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};

  let st=read(KEY,null); if(!st||typeof st!=='object') st={};
  let pending=read(PKEY,[]); const seeded=[];
  COLS.forEach(c=>{ if(!st[c]){ st[c]=clone(SEED[c]||{}); Object.entries(st[c]).forEach(([id,d])=>seeded.push({op:'set',c,id,d})) } });
  st.settings=st.settings||{};
  Object.entries(SEED.settings||{}).forEach(([id,d])=>{ if(!(id in st.settings)){ st.settings[id]=clone(d); seeded.push({op:'set',c:'settings',id,d}) } });
  if(seeded.length){ pending=pending.concat(seeded); write(PKEY,pending) }
  write(KEY,st);

  const save=()=>write(KEY,st), savePending=()=>write(PKEY,pending);
  const col=c=>(st[c]=st[c]||{});
  const subs=new Set(); const fire=()=>subs.forEach(f=>{try{f()}catch(e){console.error(e)}});
  const listen=f=>{subs.add(f);setTimeout(f,0);return()=>subs.delete(f)};
  function docRef(c,id){return{
    async get(){return {exists:!!col(c)[id],data:()=>col(c)[id]}},
    async set(d){col(c)[id]=clone(d);save();pending.push({op:'set',c,id,d:clone(d)});savePending();fire();sync()},
    async delete(){if(!(id in col(c)))return;delete col(c)[id];save();pending.push({op:'del',c,id});savePending();fire();sync()},
    onSnapshot(n){return listen(()=>n({exists:!!col(c)[id],data:()=>col(c)[id]}))}
  }}
  const db={
    collection:c=>({orderBy(){return this},doc:id=>docRef(c,id),
      onSnapshot(n){return listen(()=>n({docs:Object.values(col(c)).slice().sort((a,b)=>String(a.date)<String(b.date)?-1:1).map(d=>({data:()=>d}))}))}}),
    doc:p=>{const [c,id]=p.split('/');return docRef(c,id)}
  };

  const cfg=()=>read(CFG,{});
  let syncing=false, again=false, lastErr='', lastOk=null;
  function allOps(){const ops=[];Object.keys(st).forEach(c=>Object.entries(st[c]||{}).forEach(([id,d])=>ops.push({op:'set',c,id,d})));return ops}
  function statusText(){
    const c=cfg();
    if(!c.url) return {t:'Mentve ezen a telefonon',ok:true};
    if(syncing) return {t:'Szinkronizálás…',ok:true};
    if(lastErr) return {t:`Nincs szinkronizálva${pending.length?` (${pending.length} változás vár)`:''}`,ok:false};
    return {t:'Szinkronizálva a táblázattal',ok:true};
  }
  function status(){
    const s=statusText();
    document.querySelectorAll('[data-sync-status]').forEach(el=>{el.className='status'+(s.ok?' ok':'');const sp=el.querySelector('span');if(sp)sp.textContent=s.t});
    const el=document.getElementById('status');
    if(el){el.className='status'+(s.ok?' ok':'');el.querySelector('span').textContent=s.t}
    const d=document.getElementById('syncinfo'), c=cfg();
    if(d) d.textContent=!c.url?'Nincs beállítva szinkron – az adatok csak ezen az eszközön vannak.'
      :lastErr?(/titkos/.test(lastErr)?`Hiba: ${lastErr}. Ellenőrizd, hogy ugyanaz-e, mint a Code.gs fájlban.`:`Hiba: ${lastErr}. Újrapróbálom, amikor újra van internet.`)
      :lastOk?`Utolsó szinkron: ${lastOk.toLocaleTimeString('hu-HU',{hour:'2-digit',minute:'2-digit'})}`:'Kapcsolódás…';
  }
  async function sync(){
    const c=cfg(); if(!c.url){status();return}
    if(syncing){again=true;return}
    syncing=true; status();
    try{
      const ops=pending.slice();
      const res=await fetch(c.url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:c.token||'',ops})});
      const j=await res.json();
      if(!j.ok) throw new Error(j.error||'ismeretlen hiba');
      pending=pending.slice(ops.length); savePending();
      if(j.data&&!pending.length){
        const push=[], next={...st};
        Object.keys(j.data).forEach(cn=>{
          const rem=j.data[cn]||{}, loc=st[cn]||{};
          if(cn==='settings'){
            const extra={}; Object.entries(loc).forEach(([id,d])=>{if(!(id in rem)){extra[id]=d;push.push({op:'set',c:cn,id,d})}});
            next[cn]={...rem,...extra};
          } else if(!Object.keys(rem).length&&Object.keys(loc).length){
            Object.entries(loc).forEach(([id,d])=>push.push({op:'set',c:cn,id,d})); next[cn]=loc;
          } else next[cn]=rem;
        });
        st=next; save(); fire();
        if(push.length){pending=push;savePending();again=true}
      }
      lastErr=''; lastOk=new Date();
    }catch(e){lastErr=e&&e.message&&!/Failed to fetch|NetworkError|Load failed|JSON/i.test(e.message)?e.message:'nincs internet vagy rossz a cím'}
    finally{syncing=false;status();if(again){again=false;setTimeout(sync,300)}}
  }
  function download(){
    const blob=new Blob([JSON.stringify(st,null,1)],{type:'application/json'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
    const t=new Date(); a.download=`naplo-mentes-${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}.json`;
    document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);
  }
  function importObj(o){
    if(!o||typeof o!=='object'||!(o.workouts||o.weighins)) throw new Error('Ez nem egy napló-mentés.');
    st={workouts:o.workouts||{},dance:o.dance||{},weighins:o.weighins||{},settings:o.settings||{}}; save();
    pending=allOps(); savePending(); fire(); sync();
  }
  window.LocalDB={db,sync,status,statusText,cfg,setCfg:c=>{write(CFG,c);lastErr='';lastOk=null;status();sync()},download,importObj};
  addEventListener('online',sync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
  setTimeout(sync,50);
})();
