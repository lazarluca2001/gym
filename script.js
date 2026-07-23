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

// ---------- MOBIL HAMBURGER MENÜ ----------
const navToggle = document.getElementById('navToggle');
const pageNav = document.querySelector('.page-nav');
if(navToggle && pageNav){
  navToggle.addEventListener('click', () => {
    pageNav.classList.toggle('nyitva');
  });
  pageNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => pageNav.classList.remove('nyitva'));
  });
  document.addEventListener('click', (ev) => {
    if(!pageNav.classList.contains('nyitva')) return;
    if(!pageNav.contains(ev.target) && !navToggle.contains(ev.target)){
      pageNav.classList.remove('nyitva');
    }
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

// Dátum normalizálása összehasonlításhoz (bármilyen elválasztóval: 2026.07.20 / 2026.07.20. / 2026. 07. 20.)
function datumKulcs(str){
  if(!str) return '';
  return String(str).replace(/[^0-9]/g, '').slice(0, 8);
}

// ISO hét-kulcs egy dátumhoz (év + hét sorszáma), a heti összesítésekhez
function hetKulcs(datumStr){
  const k = datumKulcs(datumStr);
  if(k.length < 8) return null;
  const d = new Date(+k.slice(0,4), +k.slice(4,6) - 1, +k.slice(6,8));
  const csutortok = new Date(d);
  csutortok.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const evEleje = new Date(csutortok.getFullYear(), 0, 1);
  const het = Math.ceil(((csutortok - evEleje) / 86400000 + 1) / 7);
  return `${csutortok.getFullYear()}-${String(het).padStart(2,'0')}`;
}

// Heti átlag/összeg trend: utolsó teli hét vs. az azt megelőző, nyíllal
function hetiTrendSzoveg(bejegyzesek, datumFn, ertekFn, mod){
  const csoportok = {};
  bejegyzesek.forEach(b => {
    const hk = hetKulcs(datumFn(b));
    if(!hk) return;
    if(!csoportok[hk]) csoportok[hk] = [];
    csoportok[hk].push(ertekFn(b));
  });
  const hetek = Object.keys(csoportok).sort();
  if(hetek.length === 0) return null;

  const szamol = (arr) => mod === 'atlag'
    ? arr.reduce((a,b)=>a+b,0) / arr.length
    : arr.reduce((a,b)=>a+b,0);

  const utolsoHet = szamol(csoportok[hetek[hetek.length - 1]]);
  if(hetek.length < 2) return { ertek: utolsoHet, valtozas: null };

  const elozoHet = szamol(csoportok[hetek[hetek.length - 2]]);
  return { ertek: utolsoHet, valtozas: utolsoHet - elozoHet };
}

function trendNyil(valtozas, maxTizedes){
  if(valtozas === null || valtozas === undefined || isNaN(valtozas)) return '';
  if(Math.abs(valtozas) < 0.05) return '<span class="trend-flat">— nincs változás</span>';
  const nyil = valtozas > 0 ? '▲' : '▼';
  const osztaly = valtozas > 0 ? 'trend-up' : 'trend-down';
  return `<span class="${osztaly}">${nyil} ${szamFormat(Math.abs(valtozas), maxTizedes)}</span>`;
}

// Ciklusszakasz kulcsa egy szöveges cellából (Menstruáció / Follikuláris / Ovuláció / Luteális)
function fazisKulcsSzovegbol(szoveg){
  const n = (szoveg || '').toLowerCase();
  if(n.includes('menstru')) return 'menstru';
  if(n.includes('follik')) return 'follik';
  if(n.includes('ovul')) return 'ovul';
  if(n.includes('luteal')) return 'luteal';
  return null;
}

// ---- Chart.js kiegészítő pluginok ----
const ciklusSavPlugin = {
  id: 'ciklusSav',
  beforeDatasetsDraw(chart, args, opts){
    if(!opts || !opts.fazisok || !opts.fazisok.length) return;
    const { ctx, chartArea, scales } = chart;
    const xScale = scales.x;
    const fazisok = opts.fazisok;
    if(!chartArea) return;
    const lepes = fazisok.length > 1 ? (xScale.getPixelForValue(1) - xScale.getPixelForValue(0)) : (chartArea.right - chartArea.left);
    ctx.save();
    let i = 0;
    while(i < fazisok.length){
      const kulcs = fazisok[i];
      let j = i;
      while(j + 1 < fazisok.length && fazisok[j+1] === kulcs) j++;
      if(kulcs){
        const xStart = xScale.getPixelForValue(i) - lepes/2;
        const xEnd = xScale.getPixelForValue(j) + lepes/2;
        ctx.fillStyle = (opts.szinek[kulcs] || '#888') + '20';
        ctx.fillRect(Math.max(xStart, chartArea.left), chartArea.top, Math.min(xEnd, chartArea.right) - Math.max(xStart, chartArea.left), chartArea.bottom - chartArea.top);
      }
      i = j + 1;
    }
    ctx.restore();
  }
};

const celVonalPlugin = {
  id: 'celVonal',
  afterDatasetsDraw(chart, args, opts){
    if(!opts || opts.ertek === undefined || opts.ertek === null || isNaN(opts.ertek)) return;
    const { ctx, chartArea, scales } = chart;
    const y = scales.y.getPixelForValue(opts.ertek);
    if(y < chartArea.top || y > chartArea.bottom) return;
    ctx.save();
    ctx.strokeStyle = opts.szin || cssVar('--accent');
    ctx.setLineDash([6,4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    ctx.restore();
  }
};

if(typeof Chart !== 'undefined'){
  Chart.register(ciklusSavPlugin, celVonalPlugin);
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
  document.body.classList.add('betoltes');
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
    naptarRajzolas();
    kezdolapRajzolas();
    trendekRajzolas();
    document.body.classList.remove('betoltes');
  }catch(error){
    document.body.classList.remove('betoltes');
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

  const heroSuly = document.getElementById('heroSuly');
  if(heroSuly){
    heroSuly.innerHTML = `${szamFormat(szamErtek(mezo(utolsoNapi, 'testsúly')), 1)}<small>kg</small>`;
    const heroSub = document.getElementById('heroSulySub');
    if(heroSub){
      const t = hetiTrendSzoveg(napiAdatok, n => mezo(n,'dátum'), n => szamErtek(mezo(n,'testsúly')) || 0, 'atlag');
      heroSub.innerHTML = t ? `Heti átlag: ${szamFormat(t.ertek,1)} kg ${trendNyil(t.valtozas,1)}` : '';
    }
  }

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
let lepesChartObj;

function celErtekOlvasas(kulcs){
  const mentett = localStorage.getItem(kulcs);
  return mentett ? szamErtek(mentett) : NaN;
}

function celokBeallitasa(){
  const sulyInput = document.getElementById('celSuly');
  const kcalInput = document.getElementById('celKcal');
  if(!sulyInput && !kcalInput) return;

  if(sulyInput){
    const mentett = localStorage.getItem('naplo-cel-suly');
    if(mentett) sulyInput.value = mentett;
    sulyInput.addEventListener('change', () => {
      if(sulyInput.value) localStorage.setItem('naplo-cel-suly', sulyInput.value.replace(',', '.'));
      else localStorage.removeItem('naplo-cel-suly');
      eletmodGrafikonokRajzolasa();
    });
  }
  if(kcalInput){
    const mentett = localStorage.getItem('naplo-cel-kcal');
    if(mentett) kcalInput.value = mentett;
    kcalInput.addEventListener('change', () => {
      if(kcalInput.value) localStorage.setItem('naplo-cel-kcal', kcalInput.value.replace(',', '.'));
      else localStorage.removeItem('naplo-cel-kcal');
      eletmodGrafikonokRajzolasa();
    });
  }
}

function eletmodGrafikonokRajzolasa(){
  const sulyCanvas = document.getElementById('sulyChart');
  const kcalCanvas = document.getElementById('kcalChart');
  const lepesCanvas = document.getElementById('lepesChart');
  if(!sulyCanvas && !kcalCanvas && !lepesCanvas) return;

  const datumok = napiAdatok.map(n => mezo(n, 'dátum'));
  const fazisok = napiAdatok.map(n => fazisKulcsSzovegbol(mezo(n, 'ciklus')));
  const fazisSzinTerkep = {
    menstru: cssVar('--menstrual'), follik: cssVar('--follicular'),
    ovul: cssVar('--ovulation'), luteal: cssVar('--luteal')
  };

  if(sulyCanvas){
    const sulyok = napiAdatok.map(n => szamErtek(mezo(n, 'testsúly')));
    const defaults = chartAlapok();
    defaults.plugins.ciklusSav = { fazisok, szinek: fazisSzinTerkep };
    defaults.plugins.celVonal = { ertek: celErtekOlvasas('naplo-cel-suly'), szin: cssVar('--luteal') };

    if(sulyChartObj) sulyChartObj.destroy();
    sulyChartObj = new Chart(sulyCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: sulyok, borderColor: cssVar('--luteal'), borderWidth:2.5, pointRadius:3, pointBackgroundColor: cssVar('--luteal'), tension:0.15 }] },
      options: defaults
    });

    const elTrend = document.getElementById('sulyTrend');
    if(elTrend){
      const t = hetiTrendSzoveg(napiAdatok, n => mezo(n,'dátum'), n => szamErtek(mezo(n,'testsúly')) || 0, 'atlag');
      elTrend.innerHTML = t ? `Heti átlag: <strong>${szamFormat(t.ertek,1)} kg</strong> ${trendNyil(t.valtozas,1)}` : '';
    }
  }

  if(kcalCanvas){
    const kcalok = napiAdatok.map(n => szamErtek(mezo(n, 'kalória', 'kcal')));
    const defaults = chartAlapok();
    defaults.plugins.ciklusSav = { fazisok, szinek: fazisSzinTerkep };
    defaults.plugins.celVonal = { ertek: celErtekOlvasas('naplo-cel-kcal'), szin: cssVar('--ovulation') };

    if(kcalChartObj) kcalChartObj.destroy();
    kcalChartObj = new Chart(kcalCanvas.getContext('2d'), {
      type:'bar',
      data:{ labels: datumok, datasets:[{ data: kcalok, backgroundColor: cssVar('--ovulation') + '46', borderColor: cssVar('--ovulation'), borderWidth:1, borderRadius:4 }] },
      options: defaults
    });

    const elTrend = document.getElementById('kcalTrend');
    if(elTrend){
      const t = hetiTrendSzoveg(napiAdatok, n => mezo(n,'dátum'), n => szamErtek(mezo(n,'kalória','kcal')) || 0, 'atlag');
      elTrend.innerHTML = t ? `Heti átlag: <strong>${szamFormat(t.ertek,0)} kcal</strong> ${trendNyil(t.valtozas,0)}` : '';
    }
  }

  if(lepesCanvas){
    const lepesek = napiAdatok.map(n => szamErtek(mezo(n, 'lépés')) || 0);
    const defaults = chartAlapok();
    defaults.plugins.ciklusSav = { fazisok, szinek: fazisSzinTerkep };

    if(lepesChartObj) lepesChartObj.destroy();
    lepesChartObj = new Chart(lepesCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: lepesek, borderColor: cssVar('--follicular'), backgroundColor: cssVar('--follicular') + '20', fill:true, borderWidth:2, pointRadius:2, tension:0.2 }] },
      options: defaults
    });

    const elTrend = document.getElementById('lepesTrend');
    if(elTrend){
      const t = hetiTrendSzoveg(napiAdatok, n => mezo(n,'dátum'), n => szamErtek(mezo(n,'lépés')) || 0, 'atlag');
      elTrend.innerHTML = t ? `Heti átlag: <strong>${szamFormat(t.ertek,0)}</strong> ${trendNyil(t.valtozas,0)}` : '';
    }
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
      data:{ labels: datumok, datasets:[{ data: maxSulyok, borderColor: cssVar('--dom-ero'), borderWidth:3, pointBackgroundColor: cssVar('--dom-ero'), pointRadius:4, tension:0.05 }] },
      options: defaults
    });
  }

  if(volCanvas){
    if(gyVolumenChart) gyVolumenChart.destroy();
    gyVolumenChart = new Chart(volCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: volumenek, borderColor: cssVar('--dom-ero-2'), backgroundColor: cssVar('--dom-ero-2') + '24', fill:true, borderWidth:2, pointRadius:3, tension:0.1 }] },
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
  naptarRajzolas();
  kezdolapRajzolas();
  trendekRajzolas();
}

// ---------- TÁNC NAPLÓ (csak a tánc oldalon létezik) ----------
const TANC_TIPUS_SZINEK = ['--dom-tanc', '--dom-tanc-2', '--dom-tanc-3', '--dom-tanc-4'];
let tancIskolaChart;

// Hány egymást követő héten volt legalább egy táncóra (az utolsó adatot tartalmazó hétig visszaszámolva)
function tancSorozatSzamitas(bejegyzesek){
  const hetek = new Set(bejegyzesek.map(t => hetKulcs(mezo(t, 'dátum'))).filter(Boolean));
  if(hetek.size === 0) return 0;
  const rendezettHetek = [...hetek].sort();
  let utolsoHet = rendezettHetek[rendezettHetek.length - 1];
  let sorozat = 0;
  let [ev, het] = utolsoHet.split('-').map(Number);
  while(hetek.has(`${ev}-${String(het).padStart(2,'0')}`)){
    sorozat++;
    het--;
    if(het < 1){ ev--; het = 52; }
  }
  return sorozat;
}

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

  const elSorozat = document.getElementById('statTancSorozat');
  if(elSorozat) elSorozat.innerText = tancSorozatSzamitas(szurt) + ' hét';

  // ---- percek grafikon: napi összesítéssel (egy nap = egy oszlop) ----
  const percCanvas = document.getElementById('tancPercChart');
  if(percCanvas){
    const napiOsszeg = {};
    szurt.forEach(t => {
      const d = mezo(t, 'dátum');
      const perc = szamErtek(mezo(t, 'perc')) || 0;
      if(!napiOsszeg[d]) napiOsszeg[d] = 0;
      napiOsszeg[d] += perc;
    });
    const napok = Object.keys(napiOsszeg);
    const percOsszesek = napok.map(d => napiOsszeg[d]);

    if(tancPercChart) tancPercChart.destroy();
    tancPercChart = new Chart(percCanvas.getContext('2d'), {
      type:'bar',
      data:{ labels: napok, datasets:[{ data: percOsszesek, backgroundColor: cssVar('--dom-tanc') + '46', borderColor: cssVar('--dom-tanc'), borderWidth:1, borderRadius:4 }] },
      options: chartAlapok()
    });

    const elTrend = document.getElementById('tancTrend');
    if(elTrend){
      const t = hetiTrendSzoveg(szurt, x => mezo(x,'dátum'), x => szamErtek(mezo(x,'perc')) || 0, 'osszeg');
      elTrend.innerHTML = t ? `Heti összesen: <strong>${szamFormat(t.ertek,0)} perc</strong> ${trendNyil(t.valtozas,0)}` : '';
    }
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
            labels:{ color: cssVar('--ink-muted'), font:{ family:"'Plus Jakarta Sans', sans-serif", size:11 }, boxWidth:10, padding:12 }
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

  // ---- iskolánkénti megoszlás (csak "Összes" szűrésnél van értelme) ----
  const iskolaCanvas = document.getElementById('tancIskolaChart');
  if(iskolaCanvas){
    const iskolaOsszegek = {};
    tancAdatok.forEach(t => {
      const isk = mezo(t, 'kola') || 'Egyéb';
      iskolaOsszegek[isk] = (iskolaOsszegek[isk] || 0) + (szamErtek(mezo(t, 'perc')) || 0);
    });
    const iskolaNevek = Object.keys(iskolaOsszegek);
    const iskolaPercek = Object.values(iskolaOsszegek);

    if(tancIskolaChart) tancIskolaChart.destroy();
    tancIskolaChart = new Chart(iskolaCanvas.getContext('2d'), {
      type:'bar',
      data:{ labels: iskolaNevek, datasets:[{ data: iskolaPercek, backgroundColor: cssVar('--dom-tanc-2') + '46', borderColor: cssVar('--dom-tanc-2'), borderWidth:1, borderRadius:4 }] },
      options:{
        indexAxis:'y',
        responsive:true, maintainAspectRatio:false,
        plugins:{
          legend:{ display:false },
          tooltip:{
            backgroundColor: cssVar('--card'), borderColor: cssVar('--border'), borderWidth:1,
            titleColor: cssVar('--ink-muted'), bodyColor: cssVar('--ink'), displayColors:false,
            callbacks:{ label: (ctx) => szamFormat(ctx.parsed.x, 0) + ' perc' }
          }
        },
        scales:{
          x:{ grid:{ color: cssVar('--border') }, ticks:{ color: cssVar('--ink-faint'), font:{ size:11, family:"'Space Mono', monospace" }, callback: v => szamFormat(v,0) } },
          y:{ grid:{ display:false }, ticks:{ color: cssVar('--ink-muted'), font:{ size:11, family:"'Plus Jakarta Sans', sans-serif" } } }
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

// ---------- NAPTÁR (csak a naptár oldalon létezik) ----------
const HONAP_NEVEK = ['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December'];
const HONAP_NEVEK_ROVID_GEN = ['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
const NAPTAR_ELSO_EV = 2026;
let naptarEv, naptarHonap, naptarNezet = 'racs', naptarKivalasztott = null;

function naptarInit(){
  const racs = document.getElementById('naptarRacs');
  if(!racs) return;
  const ma = new Date();
  naptarEv = ma.getFullYear();
  naptarHonap = ma.getMonth();
  if(window.innerWidth < 700) naptarNezet = 'lista';

  const elozoBtn = document.getElementById('naptarElozo');
  const kovetkezoBtn = document.getElementById('naptarKovetkezo');
  const maBtn = document.getElementById('naptarMa');
  const evValaszto = document.getElementById('naptarEvValaszto');
  const racsBtn = document.getElementById('naptarNezetRacs');
  const listaBtn = document.getElementById('naptarNezetLista');
  const modalHatter = document.getElementById('napModalHatter');
  const modalBezar = document.getElementById('napModalBezar');

  if(elozoBtn) elozoBtn.addEventListener('click', () => { naptarHonap--; if(naptarHonap < 0){ naptarHonap = 11; naptarEv--; } naptarRajzolas(); });
  if(kovetkezoBtn) kovetkezoBtn.addEventListener('click', () => { naptarHonap++; if(naptarHonap > 11){ naptarHonap = 0; naptarEv++; } naptarRajzolas(); });
  if(maBtn) maBtn.addEventListener('click', () => { naptarEv = ma.getFullYear(); naptarHonap = ma.getMonth(); naptarRajzolas(); });

  if(evValaszto){
    evValaszto.innerHTML = '';
    const utolsoEv = Math.max(ma.getFullYear(), NAPTAR_ELSO_EV) + 1;
    for(let ev = NAPTAR_ELSO_EV; ev <= utolsoEv; ev++){
      const opt = document.createElement('option');
      opt.value = ev; opt.innerText = ev;
      evValaszto.appendChild(opt);
    }
    evValaszto.addEventListener('change', () => { naptarEv = +evValaszto.value; naptarRajzolas(); });
  }

  if(racsBtn) racsBtn.addEventListener('click', () => { naptarNezet = 'racs'; naptarNezetFrissit(); });
  if(listaBtn) listaBtn.addEventListener('click', () => { naptarNezet = 'lista'; naptarNezetFrissit(); });
  if(modalHatter) modalHatter.addEventListener('click', (ev) => { if(ev.target === modalHatter) naptarModalBezaras(); });
  if(modalBezar) modalBezar.addEventListener('click', naptarModalBezaras);

  naptarRajzolas();
}

function naptarNezetFrissit(){
  const racsBtn = document.getElementById('naptarNezetRacs');
  const listaBtn = document.getElementById('naptarNezetLista');
  const racs = document.getElementById('naptarRacs');
  const hetnapok = document.getElementById('naptarHetnapokSor');
  const lista = document.getElementById('naptarLista');
  if(racsBtn) racsBtn.classList.toggle('active', naptarNezet === 'racs');
  if(listaBtn) listaBtn.classList.toggle('active', naptarNezet === 'lista');
  if(racs) racs.style.display = naptarNezet === 'racs' ? 'grid' : 'none';
  if(hetnapok) hetnapok.style.display = naptarNezet === 'racs' ? 'grid' : 'none';
  if(lista) lista.style.display = naptarNezet === 'lista' ? 'flex' : 'none';
}

function naptarRajzolas(){
  const racs = document.getElementById('naptarRacs');
  if(!racs || naptarEv === undefined) return;

  const cim = document.getElementById('naptarCim');
  if(cim) cim.innerText = HONAP_NEVEK[naptarHonap];
  const evValaszto = document.getElementById('naptarEvValaszto');
  if(evValaszto) evValaszto.value = naptarEv;
  naptarNezetFrissit();

  // Térképek dátumkulcs → adatok (teljes bejegyzés-tömbök, hogy a napi részletablak is tudjon belőlük dolgozni)
  const napiTerkep = {};
  napiAdatok.forEach(n => { const k = datumKulcs(mezo(n,'dátum')); if(k) napiTerkep[k] = n; });

  const edzesTerkep = {};
  edzesAdatok.forEach(e => { const k = datumKulcs(mezo(e,'dátum')); if(k){ if(!edzesTerkep[k]) edzesTerkep[k] = []; edzesTerkep[k].push(e); } });

  const tancTerkep = {};
  tancAdatok.forEach(t => { const k = datumKulcs(mezo(t,'dátum')); if(k){ if(!tancTerkep[k]) tancTerkep[k] = []; tancTerkep[k].push(t); } });

  const fazisSzinTerkep = {
    menstru: cssVar('--menstrual'), follik: cssVar('--follicular'),
    ovul: cssVar('--ovulation'), luteal: cssVar('--luteal')
  };

  const elsoNap = new Date(naptarEv, naptarHonap, 1);
  const napokSzama = new Date(naptarEv, naptarHonap + 1, 0).getDate();
  const kezdoOffszet = (elsoNap.getDay() + 6) % 7; // hétfővel kezdve
  const maKulcs = datumKulcs(new Date().toISOString());

  // ---- havi összegzés (sport szerint, a táblázathoz) ----
  let honapEdzesNap = 0, honapEdzesGyakSzam = 0, honapEdzesVolumen = 0, honapEdzesVanSuly = false, honapTancDb = 0, honapTancPerc = 0;

  let racsMarkup = '';
  let listaMarkup = '';
  let vanListaElem = false;

  // hétsor-állapot: az aktuális hét napjainak dátumkulcsai, a heti "Összesen" cellához
  let hetNapok = [];
  for(let i = 0; i < kezdoOffszet; i++){
    racsMarkup += `<div class="nap-cella nap-ures"></div>`;
    hetNapok.push(null);
  }

  const hetOsszesenCella = () => {
    let hetEdzesNap = 0, hetTancDb = 0, hetTancPerc = 0;
    hetNapok.forEach(k => {
      if(!k) return;
      const edzesLista = edzesTerkep[k] || [];
      const tancLista = tancTerkep[k] || [];
      if(edzesLista.length) hetEdzesNap++;
      hetTancDb += tancLista.length;
      hetTancPerc += tancLista.reduce((s,t) => s + (szamErtek(mezo(t,'perc')) || 0), 0);
    });
    const vanAdat = hetEdzesNap || hetTancDb;
    return `<div class="nap-cella nap-osszesen">
      <span class="nap-osszesen-cim">Össz.</span>
      ${vanAdat ? `
        ${hetEdzesNap ? `<span class="nap-osszesen-sor">🏋️ ${hetEdzesNap}</span>` : ''}
        ${hetTancDb ? `<span class="nap-osszesen-sor">💃 ${hetTancDb} · ${szamFormat(hetTancPerc,0)} p</span>` : ''}
      ` : `<span class="nap-osszesen-ures">—</span>`}
    </div>`;
  };

  for(let nap = 1; nap <= napokSzama; nap++){
    const kulcs = `${naptarEv}${String(naptarHonap+1).padStart(2,'0')}${String(nap).padStart(2,'0')}`;
    const napiRek = napiTerkep[kulcs];
    const fazisKulcs = napiRek ? fazisKulcsSzovegbol(mezo(napiRek,'ciklus')) : null;
    const fazisSzin = fazisKulcs ? fazisSzinTerkep[fazisKulcs] : null;
    const edzesLista = edzesTerkep[kulcs] || [];
    const tancLista = tancTerkep[kulcs] || [];
    const tancPercOssz = tancLista.reduce((s,t) => s + (szamErtek(mezo(t,'perc')) || 0), 0);
    const maE = kulcs === maKulcs;
    const dow = new Date(naptarEv, naptarHonap, nap).getDay();
    const hetvege = dow === 0 || dow === 6;

    if(edzesLista.length){
      honapEdzesNap++;
      honapEdzesGyakSzam += edzesLista.length;
      edzesLista.forEach(e => {
        const suly = szamErtek(mezo(e,'súly'));
        if(!isNaN(suly)) honapEdzesVanSuly = true;
        honapEdzesVolumen += (szamErtek(mezo(e,'széria'))||0) * (szamErtek(mezo(e,'ismétlés'))||0) * (suly||0);
      });
    }
    honapTancDb += tancLista.length;
    honapTancPerc += tancPercOssz;

    // intenzitás-szintek
    const edzesSzint = edzesLista.length >= 2 ? 'szint-3' : edzesLista.length === 1 ? 'szint-2' : '';
    const tancSzint = tancPercOssz >= 100 ? 'szint-3' : tancPercOssz >= 45 ? 'szint-2' : tancPercOssz > 0 ? 'szint-1' : '';

    racsMarkup += `
      <div class="nap-cella${maE ? ' nap-ma' : ''}${hetvege ? ' nap-hetvege' : ''}${naptarKivalasztott === kulcs ? ' nap-kivalasztott' : ''}"
           ${fazisSzin ? `style="--fazis-szin:${fazisSzin}"` : ''} data-kulcs="${kulcs}">
        <span class="nap-szam">${nap}</span>
        <div class="nap-jelolok">
          ${edzesLista.length ? `<span class="nap-jelolo ${edzesSzint}" title="edzés">🏋️</span>` : ''}
          ${tancLista.length ? `<span class="nap-jelolo ${tancSzint}" title="${szamFormat(tancPercOssz,0)} perc tánc">💃${tancLista.length > 1 ? '×'+tancLista.length : ''}</span>` : ''}
        </div>
      </div>`;

    hetNapok.push(kulcs);
    if(hetNapok.length === 7){
      racsMarkup += hetOsszesenCella();
      hetNapok = [];
    }

    // lista/agenda nézet: csak azok a napok, amikhez van bármilyen adat
    if(napiRek || edzesLista.length || tancLista.length){
      vanListaElem = true;
      listaMarkup += `
        <div class="agenda-nap" data-kulcs="${kulcs}" ${fazisSzin ? `style="--fazis-szin:${fazisSzin}"` : ''}>
          <div class="agenda-datum">
            <span class="agenda-nap-szam">${nap}</span>
            <span class="agenda-het">${['V','H','K','SZE','CS','P','SZO'][dow]}</span>
          </div>
          <div class="agenda-tartalom">
            ${napiRek ? `<span class="agenda-sor">⚖️ ${szamFormat(szamErtek(mezo(napiRek,'testsúly')),1)} kg · 🔥 ${szamFormat(szamErtek(mezo(napiRek,'kalória','kcal')),0)} kcal</span>` : ''}
            ${edzesLista.length ? `<span class="agenda-sor">🏋️ ${edzesLista.map(e => mezo(e,'gyakorlat')).join(', ')}</span>` : ''}
            ${tancLista.length ? `<span class="agenda-sor">💃 ${tancLista.map(t => `${mezo(t,'óra')} (${szamFormat(szamErtek(mezo(t,'perc')),0)} perc)`).join(', ')}</span>` : ''}
          </div>
        </div>`;
    }
  }

  // az utolsó, esetleg nem teljes hét lezárása + Összesen cella
  if(hetNapok.length){
    while(hetNapok.length < 7){ racsMarkup += `<div class="nap-cella nap-ures"></div>`; hetNapok.push(null); }
    racsMarkup += hetOsszesenCella();
  }

  racs.innerHTML = racsMarkup;
  racs.querySelectorAll('.nap-cella:not(.nap-ures):not(.nap-osszesen)').forEach(cella => {
    cella.addEventListener('click', () => {
      naptarKivalasztott = cella.dataset.kulcs;
      naptarRajzolas();
      naptarModalMegnyitasa();
    });
  });

  const listaEl = document.getElementById('naptarLista');
  if(listaEl){
    listaEl.innerHTML = vanListaElem ? listaMarkup : `<p class="agenda-ures">Ebben a hónapban nincs rögzített adat.</p>`;
    listaEl.querySelectorAll('.agenda-nap').forEach(sor => {
      sor.addEventListener('click', () => { naptarKivalasztott = sor.dataset.kulcs; naptarRajzolas(); naptarModalMegnyitasa(); });
    });
  }

  // ---- havi összesítő táblázat (sport szerint) ----
  const honapTabla = document.getElementById('naptarHonapTabla');
  if(honapTabla){
    honapTabla.innerHTML = `
      <p class="card-label">${HONAP_NEVEK[naptarHonap]} összesen</p>
      <table class="naptar-tabla">
        <thead><tr><th>Típus</th><th>Alkalom</th><th>Összesen</th></tr></thead>
        <tbody>
          <tr><td><span class="tabla-pont" style="background:var(--dom-ero)"></span>Edzés</td><td>${honapEdzesNap}</td><td>${honapEdzesGyakSzam} gyakorlat</td></tr>
          <tr><td><span class="tabla-pont" style="background:var(--dom-tanc)"></span>Tánc</td><td>${honapTancDb}</td><td>${szamFormat(honapTancPerc,0)} perc</td></tr>
        </tbody>
      </table>
    `;
  }

  naptarReszletMutat();
}

function naptarModalMegnyitasa(){
  const modal = document.getElementById('napModalHatter');
  if(modal) modal.classList.add('nyitva');
}
function naptarModalBezaras(){
  const modal = document.getElementById('napModalHatter');
  if(modal) modal.classList.remove('nyitva');
  naptarKivalasztott = null;
}

function naptarReszletMutat(){
  const panel = document.getElementById('napReszletPanel');
  if(!panel) return;
  if(!naptarKivalasztott) return;

  const k = naptarKivalasztott;
  const nap = +k.slice(6,8), honap = +k.slice(4,6), ev = k.slice(0,4);
  const napiRek = napiAdatok.find(n => datumKulcs(mezo(n,'dátum')) === k);
  const edzesek = edzesAdatok.filter(e => datumKulcs(mezo(e,'dátum')) === k);
  const tancok = tancAdatok.filter(t => datumKulcs(mezo(t,'dátum')) === k);

  let html = `<div class="reszlet-fejlec"><h3>${ev}. ${HONAP_NEVEK[honap-1]} ${nap}.</h3></div>`;

  if(!napiRek && !edzesek.length && !tancok.length){
    html += `<p class="agenda-ures">Erre a napra nincs rögzített adat.</p>`;
  } else {
    if(napiRek){
      html += `<div class="reszlet-blokk"><p class="reszlet-cim">⚖️ Életmód</p>
        <p class="reszlet-sor">Testsúly: <strong>${szamFormat(szamErtek(mezo(napiRek,'testsúly')),1)} kg</strong></p>
        <p class="reszlet-sor">Kalória: <strong>${szamFormat(szamErtek(mezo(napiRek,'kalória','kcal')),0)} kcal</strong></p>
      </div>`;
    }
    if(edzesek.length){
      html += `<div class="reszlet-blokk"><p class="reszlet-cim">🏋️ Edzés</p>` +
        edzesek.map(e => {
          const suly = szamErtek(mezo(e,'súly'));
          return `<p class="reszlet-sor">${mezo(e,'gyakorlat')} — ${mezo(e,'széria')}×${mezo(e,'ismétlés')}${!isNaN(suly) ? ' · ' + szamFormat(suly,1) + ' kg' : ''}</p>`;
        }).join('') +
        `</div>`;
    }
    if(tancok.length){
      html += `<div class="reszlet-blokk"><p class="reszlet-cim">💃 Tánc</p>` +
        tancok.map(t => `<p class="reszlet-sor">${mezo(t,'óra')} (${mezo(t,'kola')}) — ${szamFormat(szamErtek(mezo(t,'perc')),0)} perc, ${mezo(t,'típus')}</p>`).join('') +
        `</div>`;
    }
  }

  panel.innerHTML = html;
}

// ---------- KEZDŐLAP (csak a kezdőlapon létezik — szándékosan nincs rajta ciklusadat) ----------
let kezdoSulyChart;

function kezdolapRajzolas(){
  const vanElem = document.getElementById('heroHetiOsszes') || document.getElementById('kezdoSulyChart');
  if(!vanElem) return;

  const maHetKulcs = hetKulcs(new Date().toISOString());

  const eHetiEdzesek = edzesAdatok.filter(e => hetKulcs(mezo(e, 'dátum')) === maHetKulcs);
  const elVolHet = document.getElementById('statHetiVolumen');
  if(elVolHet){
    let vol = 0;
    eHetiEdzesek.forEach(e => {
      const sz = szamErtek(mezo(e, 'széria')) || 0;
      const i = szamErtek(mezo(e, 'ismétlés')) || 0;
      const s = szamErtek(mezo(e, 'súly')) || 0;
      vol += sz * i * s;
    });
    elVolHet.innerText = szamFormat(Math.round(vol), 0) + ' kg';
  }
  const elEdzesDb = document.getElementById('statHetiEdzesDb');
  if(elEdzesDb) elEdzesDb.innerText = new Set(eHetiEdzesek.map(e => mezo(e,'dátum'))).size;

  const eHetiTanc = tancAdatok.filter(t => hetKulcs(mezo(t, 'dátum')) === maHetKulcs);
  const elTancPerc = document.getElementById('statHetiTancPerc');
  if(elTancPerc){
    const perc = eHetiTanc.reduce((sum,t) => sum + (szamErtek(mezo(t,'perc')) || 0), 0);
    elTancPerc.innerText = szamFormat(perc, 0) + ' perc';
  }
  const elTancDb = document.getElementById('statHetiTancDb');
  if(elTancDb) elTancDb.innerText = eHetiTanc.length;

  const heroErtek = document.getElementById('heroHetiOsszes');
  if(heroErtek){
    const edzesNapDb = new Set(eHetiEdzesek.map(e => mezo(e,'dátum'))).size;
    const tancDb = eHetiTanc.length;
    heroErtek.innerHTML = `${edzesNapDb + tancDb}<small>alkalom</small>`;
    const heroSub = document.getElementById('heroHetiOsszesSub');
    if(heroSub){
      const reszek = [];
      if(edzesNapDb) reszek.push(`${edzesNapDb} edzésnap`);
      if(tancDb) reszek.push(`${tancDb} tánc alkalom`);
      heroSub.innerText = reszek.length ? reszek.join(' · ') + ' ezen a héten' : 'Ezen a héten még nincs rögzített aktivitás.';
    }
  }

  const sulyCanvas = document.getElementById('kezdoSulyChart');
  if(sulyCanvas){
    const utolsoNehany = napiAdatok.slice(-14);
    const datumok = utolsoNehany.map(n => mezo(n,'dátum'));
    const sulyok = utolsoNehany.map(n => szamErtek(mezo(n,'testsúly')));
    if(kezdoSulyChart) kezdoSulyChart.destroy();
    kezdoSulyChart = new Chart(sulyCanvas.getContext('2d'), {
      type:'line',
      data:{ labels: datumok, datasets:[{ data: sulyok, borderColor: cssVar('--luteal'), borderWidth:2.5, pointRadius:2, pointBackgroundColor: cssVar('--luteal'), tension:0.15, fill:true, backgroundColor: cssVar('--luteal') + '14' }] },
      options: chartAlapok()
    });
  }
}

// ---------- TRENDEK / ELEMZÉSEK (csak a trendek oldalon létezik) ----------
function trendekRajzolas(){
  const tarolo = document.getElementById('fazisElemzesRacs');
  if(!tarolo) return;

  const FAZISOK_ELEMZES = [
    { key:'menstru', nev:'Menstruáció',  szin: cssVar('--menstrual') },
    { key:'follik',  nev:'Follikuláris', szin: cssVar('--follicular') },
    { key:'ovul',    nev:'Ovuláció',     szin: cssVar('--ovulation') },
    { key:'luteal',  nev:'Luteális',     szin: cssVar('--luteal') }
  ];

  // dátum → fázis térkép, a napi adatok alapján
  const fazisTerkep = {};
  napiAdatok.forEach(n => {
    const k = datumKulcs(mezo(n,'dátum'));
    const f = fazisKulcsSzovegbol(mezo(n,'ciklus'));
    if(k && f) fazisTerkep[k] = f;
  });

  tarolo.innerHTML = '';
  FAZISOK_ELEMZES.forEach(f => {
    const napok = napiAdatok.filter(n => fazisKulcsSzovegbol(mezo(n,'ciklus')) === f.key);
    const sulyAtlag = napok.length ? napok.reduce((s,n) => s + (szamErtek(mezo(n,'testsúly')) || 0), 0) / napok.length : NaN;
    const kcalAtlag = napok.length ? napok.reduce((s,n) => s + (szamErtek(mezo(n,'kalória','kcal')) || 0), 0) / napok.length : NaN;

    let edzesVol = 0;
    edzesAdatok.forEach(e => {
      const k = datumKulcs(mezo(e,'dátum'));
      if(fazisTerkep[k] === f.key){
        const sz = szamErtek(mezo(e,'széria')) || 0;
        const i = szamErtek(mezo(e,'ismétlés')) || 0;
        const s = szamErtek(mezo(e,'súly')) || 0;
        edzesVol += sz * i * s;
      }
    });

    let tancPerc = 0;
    tancAdatok.forEach(t => {
      const k = datumKulcs(mezo(t,'dátum'));
      if(fazisTerkep[k] === f.key) tancPerc += (szamErtek(mezo(t,'perc')) || 0);
    });

    const panel = document.createElement('div');
    panel.className = 'fazis-panel';
    panel.style.setProperty('--fazis-szin', f.szin);
    panel.innerHTML = `
      <p class="fazis-panel-cim">${f.nev}</p>
      <p class="fazis-panel-nap">${napok.length} nap adat</p>
      <div class="fazis-panel-sorok">
        <div><span>Átlag testsúly</span><strong>${isNaN(sulyAtlag) ? '—' : szamFormat(sulyAtlag,1) + ' kg'}</strong></div>
        <div><span>Átlag kalória</span><strong>${isNaN(kcalAtlag) ? '—' : szamFormat(kcalAtlag,0) + ' kcal'}</strong></div>
        <div><span>Edzésvolumen</span><strong>${szamFormat(Math.round(edzesVol),0)} kg</strong></div>
        <div><span>Tánc percek</span><strong>${szamFormat(tancPerc,0)} perc</strong></div>
      </div>
    `;
    tarolo.appendChild(panel);
  });
}

rajzoldCiklusKereket('');
celokBeallitasa();
naptarInit();
adatBetoltes();
