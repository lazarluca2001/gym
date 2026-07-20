// CSERÉLD KI A SAJÁT ID-DRA:
const SPREADSHEET_ID = '1NxTR3teMZjljuzvJNljJxRs_1U08uHTX1aTcSQlhCkA';

let edzesAdatok = [];
let napiAdatok = [];
let tancAdatok = [];
let gySulyChart, gyVolumenChart, sulyChartObj, kcalChartObj, tancPercChart, tancTipusChart;

// ---------- DÁTUM ----------
const maiDatumEl = document.getElementById('maiDatum');
if(maiDatumEl){
  maiDatumEl.innerText = new Date().toLocaleDateString('hu-HU', { year:'numeric', month:'long', day:'numeric' });
}

// ---------- SÖTÉT MÓD (megosztott az oldalak között) ----------
const darkToggle = document.getElementById('darkToggle');
const mentettMod = localStorage.getItem('naplo-dark') === '1';
if(mentettMod) document.body.classList.add('dark');
if(darkToggle){
  darkToggle.checked = mentettMod;
  darkToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark', darkToggle.checked);
    localStorage.setItem('naplo-dark', darkToggle.checked ? '1' : '0');
    ujraRajzolMinden();
  });
}

function cssVar(name){
  return getComputedStyle(document.body).getPropertyValue(name).trim();
}

// Számok beolvasása: elfogadja a vesszős és pontos tizedes írásmódot is
function szamErtek(str){
  if(str === undefined || str === null || str === '') return NaN;
  return parseFloat(String(str).replace(',', '.'));
}

// Számok kiírása: mindig vessző a tizedesjegynél, magyar ezres tagolással
function szamFormat(num, maxTizedes){
  if(isNaN(num)) return '—';
  return num.toLocaleString('hu-HU', { maximumFractionDigits: maxTizedes !== undefined ? maxTizedes : 2 });
}

function chartAlapok(){
  return {
    responsive:true,
    maintainAspectRatio:false,
    layout:{ padding:{ top: 6 } },
    plugins:{
      legend:{ display:false },
      tooltip:{
        backgroundColor: cssVar('--card'), borderColor: cssVar('--border'), borderWidth:1,
        titleColor: cssVar('--ink-muted'), bodyColor: cssVar('--ink'),
        titleFont:{ family:"'Space Mono', monospace", size:11 },
        bodyFont:{ family:"'Space Mono', monospace", size:12 },
        padding:8, cornerRadius:8, displayColors:false,
        callbacks:{
          label: (ctx) => szamFormat(ctx.parsed.y)
        }
      }
    },
    scales:{
      x:{
        grid:{ display:false },
        ticks:{ color: cssVar('--ink-faint'), font:{ size:11, family:"'Space Mono', monospace" }, autoSkip:true, maxTicksLimit:7, maxRotation:0, minRotation:0 }
      },
      y:{
        grid:{ color: cssVar('--border') },
        ticks:{
          color: cssVar('--ink-faint'), font:{ size:11, family:"'Space Mono', monospace" }, maxTicksLimit:6,
          callback: (value) => szamFormat(value)
        }
      }
    }
  };
}

// ---------- ADATBETÖLTÉS ----------
async function adatBetoltes(){
  try{
    const urlNapi = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Napi_adatok`;
    const urlEdzes = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Edzes_Naplo`;
    const urlTanc = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Tanc_Naplo`;

    const [resNapi, resEdzes, resTanc] = await Promise.all([fetch(urlNapi), fetch(urlEdzes), fetch(urlTanc)]);
    const csvNapi = await resNapi.text();
    const csvEdzes = await resEdzes.text();
    const csvTanc = await resTanc.text();

    napiAdatok = csvToObjects(csvNapi);
    edzesAdatok = csvToObjects(csvEdzes);
    tancAdatok = csvToObjects(csvTanc);

    uiFrissites();
    gyakorlatPillekFeltoltese();
    eletmodGrafikonokRajzolasa();
    tancIskolaPillekFeltoltese();
  }catch(error){
    console.error("Hiba az adatok feldolgozásakor:", error);
  }
}

function csvToObjects(csvText){
  const sorok = csvText.split('\n').map(sor =>
    sor.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cella => cella.replace(/^"|"$/g, '').trim())
  );
  const fejlecek = sorok[0];
  return sorok.slice(1).filter(s => s.length >= fejlecek.length && s[0] !== "").map(sor => {
    let obj = {};
    fejlecek.forEach((fejlec, i) => { obj[fejlec] = sor[i]; });
    return obj;
  });
}

// Rugalmas mezőkeresés: az oszlop pontos nevétől függetlenül, kulcsszó alapján
function mezo(obj, ...kulcsszavak){
  const kulcsok = Object.keys(obj);
  for(const szo of kulcsszavak){
    const talalt = kulcsok.find(k => k.toLowerCase().includes(szo.toLowerCase()));
    if(talalt !== undefined && obj[talalt] !== undefined && obj[talalt] !== ''){
      return obj[talalt];
    }
  }
  return undefined;
}

// ---------- STATISZTIKA + CIKLUS SZAKASZ ----------
function uiFrissites(){
  if(napiAdatok.length === 0) return;
  const utolsoNapi = napiAdatok[napiAdatok.length - 1];

  const elSuly = document.getElementById('statSuly');
  if(elSuly) elSuly.innerText = szamFormat(szamErtek(mezo(utolsoNapi, 'testsúly')), 1) + ' kg';

  const elKcal = document.getElementById('statKcal');
  if(elKcal) elKcal.innerText = szamFormat(szamErtek(mezo(utolsoNapi, 'kalória', 'kcal')), 0) + ' kcal';

  const elLepes = document.getElementById('statLepes');
  if(elLepes) elLepes.innerText = szamFormat(szamErtek(mezo(utolsoNapi, 'lépés')) || 0, 0);

  const ciklusSzakasz = mezo(utolsoNapi, 'ciklus') || 'Nincs adat';
  const elFazis = document.getElementById('wheelPhaseName');
  if(elFazis) elFazis.innerText = ciklusSzakasz;

  let totalVol = 0;
  edzesAdatok.forEach(e => {
    const sz = szamErtek(mezo(e, 'széria')) || 0;
    const i = szamErtek(mezo(e, 'ismétlés')) || 0;
    const s = szamErtek(mezo(e, 'súly')) || 0;
    totalVol += (sz * i * s);
  });
  const elVol = document.getElementById('statVolumen');
  if(elVol) elVol.innerText = szamFormat(Math.round(totalVol), 0) + ' kg';

  rajzoldCiklusKereket(ciklusSzakasz);
}

// ---------- CIKLUS KERÉK ----------
function fazisSzinek(){
  return [
    { key:'menstru', nev:'Menstruáció',  szin: cssVar('--menstrual') },
    { key:'follik',  nev:'Follikuláris', szin: cssVar('--follicular') },
    { key:'ovul',    nev:'Ovuláció',     szin: cssVar('--ovulation') },
    { key:'luteal',  nev:'Luteális',     szin: cssVar('--luteal') }
  ];
}

function polarToCartesian(cx, cy, r, angleDeg){
  const a = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function donutArc(cx, cy, rOuter, rInner, startAngle, endAngle){
  const p0 = polarToCartesian(cx, cy, rOuter, endAngle);
  const p1 = polarToCartesian(cx, cy, rOuter, startAngle);
  const p2 = polarToCartesian(cx, cy, rInner, startAngle);
  const p3 = polarToCartesian(cx, cy, rInner, endAngle);
  const large = (endAngle - startAngle) > 180 ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${rOuter} ${rOuter} 0 ${large} 0 ${p1.x} ${p1.y}
          L ${p2.x} ${p2.y} A ${rInner} ${rInner} 0 ${large} 1 ${p3.x} ${p3.y} Z`;
}

let utolsoCiklusSzoveg = '';
function rajzoldCiklusKereket(aktivSzoveg){
  const svg = document.getElementById('ciklusSvg');
  if(!svg) return;
  if(aktivSzoveg !== undefined) utolsoCiklusSzoveg = aktivSzoveg;
  const cx = 120, cy = 120, rOuter = 108, rInner = 66;
  const fazisok = fazisSzinek();
  const talalt = fazisok.find(f => (utolsoCiklusSzoveg || '').toLowerCase().includes(f.key));
  const aktivKulcs = talalt ? talalt.key : null;

  let markup = '';
  fazisok.forEach((f, i) => {
    const start = i * 90;
    const end = start + 90;
    const isAktiv = f.key === aktivKulcs;
    const d = donutArc(cx, cy, isAktiv ? rOuter : rOuter - 10, rInner, start + 3, end - 3);
    markup += `<path d="${d}" fill="${f.szin}" opacity="${isAktiv ? 1 : 0.3}"></path>`;
  });

  svg.innerHTML = markup;
}

// ---------- ÉLETMÓD GRAFIKONOK (csak a főoldalon léteznek) ----------
function eletmodGrafikonokRajzolasa(){
  const sulyCanvas = document.getElementById('sulyChart');
  const kcalCanvas = document.getElementById('kcalChart');
  if(!sulyCanvas && !kcalCanvas) return;

  const datumok = napiAdatok.map(n => mezo(n, 'dátum'));
  const defaults = chartAlapok();

  if(sulyCanvas){
    const sulyok = napiAdatok.map(n => szamErtek(mezo(n, 'testsúly')));
    if(sulyChartObj) sulyChartObj.destroy();
    sulyChartObj = new Chart(sulyCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: sulyok, borderColor: cssVar('--luteal'), borderWidth:2.5, pointRadius:3, pointBackgroundColor: cssVar('--luteal'), tension:0.15 }] },
      options: defaults
    });
  }

  if(kcalCanvas){
    const kcalok = napiAdatok.map(n => szamErtek(mezo(n, 'kalória', 'kcal')));
    if(kcalChartObj) kcalChartObj.destroy();
    kcalChartObj = new Chart(kcalCanvas.getContext('2d'), {
      type:'bar',
      data:{ labels: datumok, datasets:[{ data: kcalok, backgroundColor: cssVar('--ovulation') + '46', borderColor: cssVar('--ovulation'), borderWidth:1, borderRadius:4 }] },
      options: defaults
    });
  }
}

// ---------- ERŐSZINT (csak az erőszint oldalon létezik) ----------
const GYAKORLAT_KATEGORIAK = [
  { key:'felsotest', nev:'Felsőtest', szavak:['chest','row','shoulder','biceps','triceps'] },
  { key:'torzs',      nev:'Törzs',     szavak:['abdominal','crunch','torso','rotation','back extension'] },
  { key:'alsotest',   nev:'Alsótest',  szavak:['leg','glute','calf','thigh'] }
];

function gyakorlatKategoria(nev){
  const n = (nev || '').toLowerCase();
  const talalt = GYAKORLAT_KATEGORIAK.find(k => k.szavak.some(sz => n.includes(sz)));
  return talalt ? talalt.key : 'egyeb';
}

function edzesDashboardStatok(kivalasztottGyakorlat){
  const elVolBig = document.getElementById('statVolumenNagy');
  const elGyakSzam = document.getElementById('statGyakSzam');
  const elUtolsoEdzes = document.getElementById('statUtolsoEdzes');
  const elRekord = document.getElementById('statRekord');
  if(!elVolBig && !elGyakSzam && !elUtolsoEdzes && !elRekord) return;

  if(elVolBig){
    let totalVol = 0;
    edzesAdatok.forEach(e => {
      const sz = szamErtek(mezo(e, 'széria')) || 0;
      const i = szamErtek(mezo(e, 'ismétlés')) || 0;
      const s = szamErtek(mezo(e, 'súly')) || 0;
      totalVol += (sz * i * s);
    });
    elVolBig.innerText = szamFormat(Math.round(totalVol), 0) + ' kg';
  }

  if(elGyakSzam){
    const egyedi = new Set(edzesAdatok.map(e => mezo(e, 'gyakorlat'))).size;
    elGyakSzam.innerText = egyedi;
  }

  if(elUtolsoEdzes && edzesAdatok.length){
    elUtolsoEdzes.innerText = mezo(edzesAdatok[edzesAdatok.length - 1], 'dátum') || '—';
  }

  if(elRekord){
    const szurt = edzesAdatok.filter(e => mezo(e, 'gyakorlat') === kivalasztottGyakorlat);
    const maxSuly = szurt.reduce((m, e) => Math.max(m, szamErtek(mezo(e, 'súly')) || 0), 0);
    elRekord.innerText = maxSuly ? szamFormat(maxSuly, 1) + ' kg' : '—';
  }
}

function gyakorlatPillekFeltoltese(){
  const tarolo = document.getElementById('gyakorlatPillek');
  if(!tarolo) return;

  const egyediGyakorlatok = [...new Set(edzesAdatok.map(e => mezo(e, 'gyakorlat')))].filter(Boolean);
  const fulTarolo = document.getElementById('kategoriaFulek');

  // Kategória fülek felépítése (csak azok, amelyekhez van adat)
  if(fulTarolo){
    const jelenlevoKategoriak = [...new Set(egyediGyakorlatok.map(gyakorlatKategoria))];
    const fulek = [{ key:'mind', nev:'Összes' }, ...GYAKORLAT_KATEGORIAK.filter(k => jelenlevoKategoriak.includes(k.key))];

    fulTarolo.innerHTML = '';
    fulek.forEach((f, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab' + (idx === 0 ? ' active' : '');
      btn.innerText = f.nev;
      btn.addEventListener('click', () => {
        fulTarolo.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        tarolo.querySelectorAll('.pill').forEach(p => {
          p.style.display = (f.key === 'mind' || p.dataset.kategoria === f.key) ? 'inline-flex' : 'none';
        });
      });
      fulTarolo.appendChild(btn);
    });
  }

  tarolo.innerHTML = '';
  egyediGyakorlatok.forEach((gy, idx) => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (idx === 0 ? ' active' : '');
    pill.type = 'button';
    pill.dataset.kategoria = gyakorlatKategoria(gy);
    pill.innerText = gy;
    pill.addEventListener('click', () => {
      tarolo.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      edzesGrafikonokFrissites(gy);
    });
    tarolo.appendChild(pill);
  });

  if(egyediGyakorlatok.length > 0) edzesGrafikonokFrissites(egyediGyakorlatok[0]);
}

function edzesGrafikonokFrissites(gyakorlatNev){
  const sulyCanvas = document.getElementById('gyakorlatSulyChart');
  const volCanvas = document.getElementById('gyakorlatVolumenChart');
  edzesDashboardStatok(gyakorlatNev);
  if(!sulyCanvas && !volCanvas) return;

  const szurt = edzesAdatok.filter(e => mezo(e, 'gyakorlat') === gyakorlatNev);
  const datumok = szurt.map(e => mezo(e, 'dátum'));
  const defaults = chartAlapok();

  const maxSulyok = szurt.map(e => szamErtek(mezo(e, 'súly')) || 0);
  const volumenek = szurt.map(e => {
    const sz = szamErtek(mezo(e, 'széria')) || 0;
    const i = szamErtek(mezo(e, 'ismétlés')) || 0;
    const s = szamErtek(mezo(e, 'súly')) || 0;
    return sz * i * s;
  });

  if(sulyCanvas){
    if(gySulyChart) gySulyChart.destroy();
    gySulyChart = new Chart(sulyCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: maxSulyok, borderColor: cssVar('--ovulation'), borderWidth:3, pointBackgroundColor: cssVar('--ovulation'), pointRadius:4, tension:0.05 }] },
      options: defaults
    });
  }

  if(volCanvas){
    if(gyVolumenChart) gyVolumenChart.destroy();
    gyVolumenChart = new Chart(volCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: volumenek, borderColor: cssVar('--menstrual'), backgroundColor: cssVar('--menstrual') + '24', fill:true, borderWidth:2, pointRadius:3, tension:0.1 }] },
      options: defaults
    });
  }
}

function ujraRajzolMinden(){
  rajzoldCiklusKereket();
  eletmodGrafikonokRajzolasa();
  const aktivPill = document.querySelector('#gyakorlatPillek .pill.active');
  if(aktivPill) edzesGrafikonokFrissites(aktivPill.innerText);
  const aktivTancPill = document.querySelector('#tancIskolaPillek .pill.active');
  tancDashboardRajzolasa(aktivTancPill ? aktivTancPill.innerText : null);
}

// ---------- TÁNC NAPLÓ (csak a tánc oldalon létezik) ----------
const TANC_TIPUS_SZINEK = ['--luteal', '--ovulation', '--menstrual', '--follicular'];

function tancIskolaPillekFeltoltese(){
  const tarolo = document.getElementById('tancIskolaPillek');
  if(!tarolo) return;

  const egyediIskolak = [...new Set(tancAdatok.map(t => mezo(t, 'kola')))].filter(Boolean);

  tarolo.innerHTML = '';
  const mindPill = document.createElement('button');
  mindPill.type = 'button';
  mindPill.className = 'pill active';
  mindPill.innerText = 'Összes';
  mindPill.addEventListener('click', () => {
    tarolo.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    mindPill.classList.add('active');
    tancDashboardRajzolasa(null);
  });
  tarolo.appendChild(mindPill);

  egyediIskolak.forEach(iskola => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'pill';
    pill.innerText = iskola;
    pill.addEventListener('click', () => {
      tarolo.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      tancDashboardRajzolasa(iskola);
    });
    tarolo.appendChild(pill);
  });

  tancDashboardRajzolasa(null);
}

function tancDashboardRajzolasa(iskolaSzures){
  const vanElem = document.getElementById('tancPercChart') || document.getElementById('tancTipusChart') || document.getElementById('tancLista') || document.getElementById('statTancOraszam');
  if(!vanElem) return;

  const szurt = iskolaSzures ? tancAdatok.filter(t => mezo(t, 'kola') === iskolaSzures) : tancAdatok;

  // ---- statisztikák ----
  const elOraszam = document.getElementById('statTancOraszam');
  if(elOraszam) elOraszam.innerText = szurt.length;

  const elPercek = document.getElementById('statTancPercek');
  if(elPercek){
    const osszPerc = szurt.reduce((sum, t) => sum + (szamErtek(mezo(t, 'perc')) || 0), 0);
    elPercek.innerText = szamFormat(osszPerc, 0) + ' perc';
  }

  const elIskolaSzam = document.getElementById('statTancIskolaSzam');
  if(elIskolaSzam) elIskolaSzam.innerText = new Set(tancAdatok.map(t => mezo(t, 'kola'))).size;

  const elUtolso = document.getElementById('statTancUtolso');
  if(elUtolso && szurt.length){
    const utolso = szurt[szurt.length - 1];
    elUtolso.innerText = (mezo(utolso, 'óra') || '—');
  }

  // ---- percek grafikon (óránként) ----
  const percCanvas = document.getElementById('tancPercChart');
  if(percCanvas){
    const datumok = szurt.map(t => mezo(t, 'dátum'));
    const percek = szurt.map(t => szamErtek(mezo(t, 'perc')) || 0);
    if(tancPercChart) tancPercChart.destroy();
    tancPercChart = new Chart(percCanvas.getContext('2d'), {
      type:'bar',
      data:{ labels: datumok, datasets:[{ data: percek, backgroundColor: cssVar('--luteal') + '46', borderColor: cssVar('--luteal'), borderWidth:1, borderRadius:4 }] },
      options: chartAlapok()
    });
  }

  // ---- típus szerinti megoszlás (donut) ----
  const tipusCanvas = document.getElementById('tancTipusChart');
  if(tipusCanvas){
    const tipusOsszegek = {};
    szurt.forEach(t => {
      const tip = mezo(t, 'típus') || 'Egyéb';
      tipusOsszegek[tip] = (tipusOsszegek[tip] || 0) + (szamErtek(mezo(t, 'perc')) || 0);
    });
    const cimkek = Object.keys(tipusOsszegek);
    const ertekek = Object.values(tipusOsszegek);
    const szinek = cimkek.map((_, i) => cssVar(TANC_TIPUS_SZINEK[i % TANC_TIPUS_SZINEK.length]));

    if(tancTipusChart) tancTipusChart.destroy();
    tancTipusChart = new Chart(tipusCanvas.getContext('2d'), {
      type:'doughnut',
      data:{ labels: cimkek, datasets:[{ data: ertekek, backgroundColor: szinek, borderColor: cssVar('--card'), borderWidth:2 }] },
      options:{
        responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{
          legend:{
            position:'bottom',
            labels:{ color: cssVar('--ink-muted'), font:{ family:"'Inter', sans-serif", size:11 }, boxWidth:10, padding:12 }
          },
          tooltip:{
            backgroundColor: cssVar('--card'), borderColor: cssVar('--border'), borderWidth:1,
            titleColor: cssVar('--ink-muted'), bodyColor: cssVar('--ink'),
            callbacks:{ label: (ctx) => `${ctx.label}: ${szamFormat(ctx.parsed, 0)} perc` }
          }
        }
      }
    });
  }

  // ---- óralista ----
  const listaEl = document.getElementById('tancLista');
  if(listaEl){
    listaEl.innerHTML = '';
    [...szurt].reverse().forEach(t => {
      const sor = document.createElement('div');
      sor.className = 'tanc-row';
      sor.innerHTML = `
        <span class="tanc-datum">${mezo(t, 'dátum') || ''}</span>
        <span class="tanc-nev">${mezo(t, 'óra') || ''}</span>
        <span class="tanc-iskola">${mezo(t, 'kola') || ''}</span>
        <span class="tanc-tipus">${mezo(t, 'típus') || ''}</span>
        <span class="tanc-perc">${szamFormat(szamErtek(mezo(t, 'perc')) || 0, 0)} perc</span>
      `;
      listaEl.appendChild(sor);
    });
  }
}

rajzoldCiklusKereket('');
adatBetoltes();
