/* Heti terv: 2 erősítő edzés (A: hétfő, B: szombat) + tánc + lépésszám.
   A Heti terv, az Edzés és a Ma oldal is innen dolgozik. */
(function(){
  const DEFAULT_START='2026-11-16'; // a program 1. hetének hétfője (a Heti terv oldalon átírható)

  const WORKOUTS={
    a:{key:'a',name:'A edzés',day:'Hétfő',dow:1,when:'munka után, 17:30-tól',focus:'Combfeszítő + hát + has',min:'55–60 perc',
      items:[
        {ex:'Hack guggolás',sets:4,reps:10,kg:40,start:35,last:'40 kg (RIR 0)'},
        {ex:'Glute drive',sets:3,reps:10,kg:35,start:35,last:'40 kg (RIR 1)'},
        {ex:'Leg curl',sets:3,reps:12,kg:12.5,start:12.5,last:'15 kg (2. széria csak 8 ism.)'},
        {ex:'Lat Pulldown',sets:3,reps:10,kg:12.5,start:12.5,last:'13,75 kg (RIR 1)'},
        {ex:'Seated Row',sets:3,reps:10,kg:20,start:20,last:'20 kg (RIR 2)'},
        {ex:'Abdominal Crunch',sets:3,reps:12,kg:20,start:20,last:'22,5 kg'}
      ],
      extra:[{ex:'Leg Extension',sets:2,reps:12,kg:17.5,start:17.5,last:'15 kg (RIR 1)'}]},
    b:{key:'b',name:'B edzés',day:'Szombat',dow:6,when:'délelőtt',focus:'Farizom + mell/váll + vádli',min:'55–60 perc',
      items:[
        {ex:'Leg Press',sets:4,reps:12,kg:30,start:30,last:'30 kg × 10 (RIR 2)'},
        {ex:'Csípőfeszítés',sets:3,reps:10,kg:20,start:20,last:'22,5 kg (RIR 1)'},
        {ex:'Outer Thigh',sets:3,reps:12,kg:30,start:30,last:'35 kg (RIR 1)'},
        {ex:'Chest Press',sets:3,reps:10,kg:12.5,start:12.5,range:'12,5–15',last:'10 kg × 10 / 20 kg × 8 (RIR 0)'},
        {ex:'Shoulder Press',sets:3,reps:10,kg:5,start:5,range:'5–7,5',last:'7,5 kg (RIR 0)'},
        {ex:'Calf Raise',sets:3,reps:15,kg:35,start:35,range:'35–40',last:'35 kg × 10 (RIR 4)'}
      ],
      extra:[{ex:'Triceps Extension',sets:2,reps:10,kg:10,start:10,last:'12,5 kg (RIR 2)'},{ex:'Leg Raise',sets:3,reps:12,kg:null,start:null,last:'–'}]}
  };
  // a "kg" mező = kezdősúly az edzés oldal előtöltéséhez
  Object.values(WORKOUTS).forEach(w=>[...w.items,...w.extra].forEach(it=>{it.kg=it.start}));

  // Hét napjai: 0 = hétfő ... 6 = vasárnap. steps: [1–2. hét, 3–4. hét, 5. héttől]
  const WEEK=[
    {dn:'Hétfő',  type:'gym',  gym:'a', label:'A edzés',        sub:'munka után (17:30-tól)', steps:[7000,7500,8000]},
    {dn:'Kedd',   type:'dance',dance:180,label:'Tánc 3 óra',     sub:'a lépéscél a táncon felül', steps:[5000,5000,5000],plusDance:true},
    {dn:'Szerda', type:'walk', label:'Aktív pihenő',             sub:'hosszabb séta – ez a „lépésnap”', steps:[8000,9000,10000]},
    {dn:'Csütörtök',type:'dance',dance:150,label:'Tánc 2,5 óra', sub:'a lépéscél a táncon felül', steps:[5000,5000,5000],plusDance:true},
    {dn:'Péntek', type:'dance',dance:90,label:'Tánc 1,5 óra',    sub:'14:00 után séta is belefér', steps:[7000,7500,8000],plusDance:true},
    {dn:'Szombat',type:'gym',  gym:'b', label:'B edzés',         sub:'délelőtt', steps:[7000,8000,9000]},
    {dn:'Vasárnap',type:'rest',label:'Pihenő',                   sub:'könnyű séta', steps:[8000,9000,10000]}
  ];
  const PHASES=['1–2. hét','3–4. hét','5. héttől'];

  const toD=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
  const mondayOf=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()-((d.getDay()+6)%7));
  function startOf(prog){const s=prog&&prog.start;return /^\d{4}-\d{2}-\d{2}$/.test(s||'')?s:DEFAULT_START}
  function weekNo(dateIso,prog){ // 1-től számolva; a kezdés előtt 0
    const s=mondayOf(toD(startOf(prog))), d=mondayOf(toD(dateIso));
    const w=Math.round((d-s)/(7*864e5)); return w<0?0:w+1;
  }
  function phase(dateIso,prog){const w=weekNo(dateIso,prog);return w<=2?0:w<=4?1:2}
  function dayPlan(dateIso,prog){
    const d=toD(dateIso), k=(d.getDay()+6)%7, p=phase(dateIso,prog), x=WEEK[k];
    return {...x,k,phase:p,phaseName:PHASES[p],week:weekNo(dateIso,prog),target:x.steps[p],workout:x.gym?WORKOUTS[x.gym]:null};
  }
  const ALL=Object.values(WORKOUTS).flatMap(w=>[...w.items,...w.extra].map(it=>({...it,w:w.key})));
  const norm=s=>String(s||'').trim().toLowerCase();
  function item(name){const n=norm(name);return ALL.find(x=>norm(x.ex)===n)||null}
  function templates(){return {a:WORKOUTS.a.items.map(x=>x.ex),b:WORKOUTS.b.items.map(x=>x.ex)}}

  window.PLAN={DEFAULT_START,WORKOUTS,WEEK,PHASES,startOf,weekNo,phase,dayPlan,item,templates,GOALS:{gym:2,dance:3}};
})();
