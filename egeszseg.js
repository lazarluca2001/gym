/* Napló — Egészség (Test / Táplálkozás / Ciklus / Összehangolás) */
(function () {
  const N = window.Naplo, C = window.Calc, U = window.UI, CH = window.Charts;
  const gc = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  const FAZISOK = [
    { k: 'menstru', nev: 'Menstruáció', v: '--menstrual', n1: 1, n2: 5 },
    { k: 'follik', nev: 'Follikuláris', v: '--follicular', n1: 6, n2: 13 },
    { k: 'ovul', nev: 'Ovuláció', v: '--ovulation', n1: 14, n2: 16 },
    { k: 'luteal', nev: 'Luteális', v: '--luteal', n1: 17, n2: 28 }
  ];

  function delta(mai, elozo, kw, dec) {
    if (!mai || !elozo) return '';
    const a = C.n(mai, kw), b = C.n(elozo, kw);
    if (isNaN(a) || isNaN(b)) return '';
    return N.trendNyil(a - b, dec);
  }
  function utolsoNap(napi, n) { return napi.slice(-n); }
  function cimkek(sorok) { return sorok.map(s => { const k = C.kulcs(s); return k.slice(4, 6) + '.' + k.slice(6, 8) + '.'; }); }
  function trendVonal(vals) { // egyszerű lineáris regresszió
    const xs = vals.map((_, i) => i), n = vals.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = vals.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (vals[i] - my); den += (x - mx) ** 2; });
    const m = den ? num / den : 0, b = my - m * mx;
    return xs.map(x => +(m * x + b).toFixed(2));
  }

  let APP, sulyNap = 30;

  function tabTest() {
    const { data, config } = APP;
    const mai = C.maiSor(data.napi), elozo = C.elozoSor(data.napi);
    // 4 tile
    document.getElementById('testTiles').innerHTML = [
      { k: '⚖️ Testsúly', v: N.szamFormat(mai ? C.n(mai, 'testsúly') : NaN, 1) + ' kg', d: delta(mai, elozo, 'testsúly', 1) },
      { k: '🔥 Energia', v: N.szamFormat(mai ? C.n(mai, 'kalória', 'kcal') : NaN, 0) + ' kcal', d: delta(mai, elozo, 'kalória', 0) },
      { k: '💧 Víz', v: N.szamFormat(mai ? C.n(mai, 'víz') : NaN, 1) + ' l', d: delta(mai, elozo, 'víz', 1) },
      { k: '👟 Lépésszám', v: N.szamFormat(mai ? C.n(mai, 'lépés') : NaN, 0), d: delta(mai, elozo, 'lépés', 0) }
    ].map(t => `<div class="tile"><div class="k">${t.k}</div><div class="v">${t.v}</div><div class="d">${t.d}</div></div>`).join('');
    // hangulat
    const h = mai ? C.n(mai, 'hangulat') : 3;
    document.getElementById('napiHangulat').innerHTML =
      `<div class="mood-face active" style="width:64px;height:64px;font-size:34px;background:var(--sage-tint)">${['😞', '😕', '😐', '🙂', '😊'][Math.round(h) - 1] || '🙂'}</div>
       <div><div style="font-weight:700;font-size:18px">${h >= 4 ? 'Jó napod van!' : h >= 3 ? 'Kiegyensúlyozott nap' : 'Nehezebb nap'}</div><div class="muted">Továbbra is figyelj magadra</div></div>`;
    rajzSuly();
    // Testösszetétel: DÖNTÉS → csak BMI a magasságból
    const bmi = N.bmi(mai ? C.n(mai, 'testsúly') : NaN, config.magassag_m);
    const kat = bmi == null ? '' : bmi < 18.5 ? 'sovány' : bmi < 25 ? 'normál' : bmi < 30 ? 'túlsúly' : 'elhízott';
    U.bar(document.getElementById('testossz'), [
      { lbl: 'BMI', ertek: bmi || 0, cel: 30, szin: gc('--sage'), val: bmi ? N.szamFormat(bmi, 1) : '—' }
    ]);
    document.getElementById('bmiKat').textContent = bmi ? `${kat} · magasság ${N.szamFormat(config.magassag_m, 2)} m` : 'Adj meg magasságot a Configban';
    // Testtrendek: testsúly + BMI (mindkettő számolható)
    const sorok30 = utolsoNap(data.napi, 30);
    const sulyArr = sorok30.map(s => C.n(s, 'testsúly'));
    const bmiArr = sulyArr.map(w => N.bmi(w, config.magassag_m));
    CH.ketVonal(document.getElementById('testtrendek'), {
      labels: cimkek(sorok30), aData: sulyArr, aSzin: gc('--sage'), aCim: 'Testsúly (kg)',
      bData: bmiArr, bSzin: gc('--kaloria'), bCim: 'BMI'
    });
  }

  function rajzSuly() {
    const { data, config } = APP;
    const sorok = utolsoNap(data.napi, sulyNap);
    const vals = sorok.map(s => C.n(s, 'testsúly'));
    const elso = vals[0], utolso = vals[vals.length - 1];
    document.getElementById('sulyFo').innerHTML =
      `${N.szamFormat(utolso, 1)}<small class="muted"> kg</small> <span style="font-size:14px">${N.trendNyil(utolso - elso, 1)} az elmúlt ${sulyNap} napban</span>`;
    CH.vonal(document.getElementById('sulyChart'), { labels: cimkek(sorok), data: vals, szin: gc('--sage'), fill: true, trend: trendVonal(vals) });
  }

  function tabTapl() {
    const { data } = APP;
    const mai = C.maiSor(data.napi);
    const feh = mai ? C.n(mai, 'fehérje') || 0 : 0, szenh = mai ? C.n(mai, 'szénhidrát') || 0 : 0, zsir = mai ? C.n(mai, 'zsír') || 0 : 0;
    const kcal = mai ? C.n(mai, 'kalória', 'kcal') || 0 : 0;
    if (feh + szenh + zsir > 0) {
      CH.donut(document.getElementById('makroChart'), { labels: ['Fehérje', 'Szénhidrát', 'Zsír'], data: [feh, szenh, zsir], szinek: [gc('--kaloria'), gc('--sage'), gc('--merleg')] });
      document.getElementById('makroCenter').innerHTML = `<div class="v">${N.szamFormat(kcal, 0)}</div><div class="k">kcal</div>`;
      const g = feh + szenh + zsir;
      document.getElementById('makroLegend').innerHTML = [
        ['Fehérje', feh, '--kaloria'], ['Szénhidrát', szenh, '--sage'], ['Zsír', zsir, '--merleg']
      ].map(([nm, v, c]) => `<div class="bar-row"><span class="dot" style="background:${gc(c)}"></span><span class="lbl">${nm}</span><span class="val">${v} g (${Math.round(v / g * 100)}%)</span></div>`).join('');
    } else U.empty(document.getElementById('makroWrap'), 'Nincs makró adat — add hozzá a Napi_adatokhoz 🌱');
    // Heti összefoglaló
    const mk = mai ? C.datum(mai) : '';
    const het = C.hetSorai(data.napi, mk);
    const kartya = (k, v, d, kw) => `<div class="tile"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
    const t = (kw, dec, mod) => N.hetiTrendSzoveg(data.napi, s => C.datum(s), s => C.n(s, kw) || 0, mod || 'atlag');
    const edzHet = new Set(data.edzes.filter(e => het.map(x => C.kulcs(x)).includes(C.kulcs(e))).map(e => C.kulcs(e))).size;
    document.getElementById('hetiOssz').innerHTML =
      kartya('Átlag testsúly', N.szamFormat(C.atlag(het.map(s => C.n(s, 'testsúly')).filter(x => !isNaN(x))), 1) + ' kg', N.trendNyil((t('testsúly', 1) || {}).valtozas, 1)) +
      kartya('Átlag kalória', N.szamFormat(C.atlag(het.map(s => C.n(s, 'kalória', 'kcal')).filter(x => !isNaN(x))), 0) + ' kcal', N.trendNyil((t('kalória', 0) || {}).valtozas, 0)) +
      kartya('Átlag lépés', N.szamFormat(C.atlag(het.map(s => C.n(s, 'lépés')).filter(x => !isNaN(x))), 0), N.trendNyil((t('lépés', 0) || {}).valtozas, 0)) +
      kartya('Edzések', edzHet + ' db', '');
  }

  function tabCiklus() {
    const { data, config } = APP;
    const nap = (data.napi.length % config.ciklus_hossz) || config.ciklus_hossz;
    const fazis = FAZISOK.find(f => nap >= f.n1 && nap <= f.n2) || FAZISOK[0];
    // cikluskör
    const R = 80, cx = 100, cy = 100, C2 = 2 * Math.PI;
    function ivPath(a1, a2) {
      const p = (ang, r) => [cx + r * Math.cos(ang - Math.PI / 2), cy + r * Math.sin(ang - Math.PI / 2)];
      const [x1, y1] = p(a1, R), [x2, y2] = p(a2, R);
      const large = a2 - a1 > Math.PI ? 1 : 0;
      return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
    }
    let ivek = '';
    FAZISOK.forEach(f => {
      const a1 = (f.n1 - 1) / config.ciklus_hossz * C2, a2 = f.n2 / config.ciklus_hossz * C2;
      ivek += `<path d="${ivPath(a1, a2)}" stroke="${gc(f.v)}" stroke-width="14" fill="none" stroke-linecap="round" opacity="${f.k === fazis.k ? 1 : .4}"/>`;
    });
    const angNow = (nap - 0.5) / config.ciklus_hossz * C2;
    const mx = cx + R * Math.cos(angNow - Math.PI / 2), my = cy + R * Math.sin(angNow - Math.PI / 2);
    document.getElementById('ciklusKor').innerHTML =
      `<svg viewBox="0 0 200 200" style="width:200px;height:200px">${ivek}<circle cx="${mx}" cy="${my}" r="8" fill="#fff" stroke="${gc(fazis.v)}" stroke-width="4"/>
        <text x="100" y="96" text-anchor="middle" font-size="13" fill="var(--ink-muted)">Ciklus nap</text>
        <text x="100" y="120" text-anchor="middle" font-size="26" font-weight="800" fill="var(--ink)">${nap}/${config.ciklus_hossz}</text></svg>`;
    document.getElementById('ciklusFazis').textContent = fazis.nev;
    document.getElementById('ciklusFazis').style.color = gc(fazis.v);
    const hatra = config.ciklus_hossz - nap;
    document.getElementById('ciklusSub').textContent = `${hatra} nap a következő ciklusig`;
  }

  function tabOssz() {
    const { data, config } = APP;
    const mai = C.maiSor(data.napi), mk = mai ? C.datum(mai) : '';
    const het = C.hetSorai(data.napi, mk);
    const felett = (kw, cel) => het.filter(s => (C.n(s, kw) || 0) >= cel).length;
    const alatt = (kw, cel) => het.filter(s => { const v = C.n(s, kw); return !isNaN(v) && v <= cel; }).length;
    const edzNap = new Set(data.edzes.filter(e => het.map(x => C.kulcs(x)).includes(C.kulcs(e))).map(e => C.kulcs(e))).size;
    const tancNap = new Set(data.tanc.filter(x => het.map(y => C.kulcs(y)).includes(C.kulcs(x))).map(x => C.kulcs(x))).size;
    U.bar(document.getElementById('celokHetre'), [
      { ikon: '🏋️', lbl: 'Edzés', ertek: edzNap, cel: config.heti_edzes_cel, szin: gc('--edzes'), val: `${edzNap}/${config.heti_edzes_cel}` },
      { ikon: '👟', lbl: 'Lépésszám', ertek: felett('lépés', config.cel_lepes), cel: config.heti_lepes_napok, szin: gc('--lepes'), val: `${felett('lépés', config.cel_lepes)}/${config.heti_lepes_napok}` },
      { ikon: '💧', lbl: 'Víz', ertek: felett('víz', config.cel_viz), cel: config.heti_viz_napok, szin: gc('--viz'), val: `${felett('víz', config.cel_viz)}/${config.heti_viz_napok}` },
      { ikon: '🔥', lbl: 'Kalória', ertek: alatt('kalória', config.cel_kaloria), cel: config.heti_kaloria_napok, szin: gc('--kaloria'), val: `${alatt('kalória', config.cel_kaloria)}/${config.heti_kaloria_napok}` }
    ]);
    // Kiemelt trend: kalória - cél az elmúlt 7 napban (deficit → negatív a jó)
    const s7 = utolsoNap(data.napi, 7);
    const kalDiff = s7.map(s => (C.n(s, 'kalória', 'kcal') || 0) - config.cel_kaloria);
    CH.vonal(document.getElementById('kiemeltTrend'), { labels: cimkek(s7), data: kalDiff, szin: gc('--sage'), fill: true });
    const atlagDiff = C.atlag(kalDiff);
    document.getElementById('kiemeltFo').innerHTML = `${atlagDiff <= 0 ? '−' : '+'}${N.szamFormat(Math.abs(atlagDiff), 0)}<small class="muted"> kcal átlag</small>`;
    // Alvás/Energia + jegyzet
    document.getElementById('alvasEnergia').innerHTML = [
      { k: '😴 Alvás', v: N.szamFormat(mai ? N.idoOra(N.mezo(mai, 'alvás')) : NaN, 1) + ' óra' },
      { k: '⚡ Energia', v: (mai ? C.n(mai, 'energia') : NaN) + ' / 5' }
    ].map(t => `<div class="tile"><div class="k">${t.k}</div><div class="v">${t.v}</div></div>`).join('');
    const jegyzet = mai ? N.mezo(mai, 'jegyzet') : '';
    document.getElementById('megjegyzes').textContent = jegyzet || 'Nincs mai jegyzet.';
  }

  function initTabs() {
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tabpanel').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('tab-' + b.dataset.tab).classList.add('active');
    }));
    document.querySelectorAll('[data-suly]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-suly]').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); sulyNap = +b.dataset.suly; rajzSuly();
    }));
  }

  window.addEventListener('DOMContentLoaded', async () => {
    CH.alap();
    APP = await N.betolt();
    U.sidebar('egeszseg', APP); window.Garden.renderMini(APP); U.topbar({}); U.mintaJelzo(APP);
    initTabs(); tabTest(); tabTapl(); tabCiklus(); tabOssz();
  });
})();
