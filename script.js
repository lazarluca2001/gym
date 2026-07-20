// CSERÉLD KI A SAJÁT ID-DRA:
const SPREADSHEET_ID = '1NxTR3teMZjljuzvJNljJxRs_1U08uHTX1aTcSQlhCkA';

let edzesAdatok = [];
let napiAdatok = [];
let gySulyChart, gyVolumenChart, sulyChartObj, kcalChartObj;

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

    const [resNapi, resEdzes] = await Promise.all([fetch(urlNapi), fetch(urlEdzes)]);
    const csvNapi = await resNapi.text();
    const csvEdzes = await resEdzes.text();

    napiAdatok = csvToObjects(csvNapi);
    edzesAdatok = csvToObjects(csvEdzes);

    uiFrissites();
    gyakorlatPillekFeltoltese();
    eletmodGrafikonokRajzolasa();
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
function gyakorlatPillekFeltoltese(){
  const tarolo = document.getElementById('gyakorlatPillek');
  if(!tarolo) return;

  const egyediGyakorlatok = [...new Set(edzesAdatok.map(e => mezo(e, 'gyakorlat')))].filter(Boolean);

  tarolo.innerHTML = '';
  egyediGyakorlatok.forEach((gy, idx) => {
    const pill = document.createElement('button');
    pill.className = 'pill' + (idx === 0 ? ' active' : '');
    pill.type = 'button';
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
}

rajzoldCiklusKereket('');
adatBetoltes();
