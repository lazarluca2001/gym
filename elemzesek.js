/* Napló — Elemzések */
(function () {
  const N = window.Naplo, C = window.Calc, U = window.UI, CH = window.Charts;
  const gc = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  let APP, tartomany = 30;

  function szurtNapi() { return tartomany === 0 ? APP.data.napi : APP.data.napi.slice(-tartomany); }
  function elozoNapi() {
    if (tartomany === 0) return [];
    const n = APP.data.napi.length;
    return APP.data.napi.slice(Math.max(0, n - 2 * tartomany), n - tartomany);
  }
  function kulcsokKozott(sorok) { return sorok.map(s => C.kulcs(s)); }
  function trendVonal(vals) {
    const xs = vals.map((_, i) => i), n = vals.length || 1;
    const mx = xs.reduce((a, b) => a + b, 0) / n, my = vals.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (vals[i] - my); den += (x - mx) ** 2; });
    const m = den ? num / den : 0, b = my - m * mx; return xs.map(x => +(m * x + b).toFixed(2));
  }
  function cimke(s) { const k = C.kulcs(s); return k.slice(4, 6) + '.' + k.slice(6, 8); }

  function render() {
    const { data } = APP;
    const sorok = szurtNapi(), elozo = elozoNapi();
    const kulcsok = kulcsokKozott(sorok);
    const edz = data.edzes.filter(e => kulcsok.includes(C.kulcs(e)));
    const tanc = data.tanc.filter(t => kulcsok.includes(C.kulcs(t)));

    // KPI-k
    const atlag = (arr, kw) => C.atlag(arr.map(s => C.n(s, kw)).filter(x => !isNaN(x)));
    const edzNapokE = new Set(kulcsokKozott(elozo).length ? data.edzes.filter(e => kulcsokKozott(elozo).includes(C.kulcs(e))).map(e => C.kulcs(e)) : []).size;
    const kpi = [
      { k: '⚖️ Átlag testsúly', v: N.szamFormat(atlag(sorok, 'testsúly'), 1) + ' kg', d: N.trendNyil(atlag(sorok, 'testsúly') - atlag(elozo, 'testsúly'), 1) },
      { k: '🏋️ Edzésnapok', v: new Set(edz.map(e => C.kulcs(e))).size, d: N.trendNyil(new Set(edz.map(e => C.kulcs(e))).size - edzNapokE, 0) },
      { k: '💃 Tánc perc', v: N.szamFormat(C.osszeg(tanc.map(t => C.n(t, 'idő') || 0)), 0), d: '' },
      { k: '👟 Átlag lépés', v: N.szamFormat(atlag(sorok, 'lépés'), 0), d: N.trendNyil(atlag(sorok, 'lépés') - atlag(elozo, 'lépés'), 0) },
      { k: '🔥 Átlag kalória', v: N.szamFormat(atlag(sorok, 'kalória', 'kcal'), 0), d: N.trendNyil(atlag(sorok, 'kalória', 'kcal') - atlag(elozo, 'kalória', 'kcal'), 0) }
    ];
    document.getElementById('kpi').innerHTML = kpi.map(x => `<div class="tile"><div class="k">${x.k}</div><div class="v">${x.v}</div><div class="d">${x.d}</div></div>`).join('');

    // Testsúly trend
    const sulyArr = sorok.map(s => C.n(s, 'testsúly'));
    CH.vonal(document.getElementById('sulyTrend'), { labels: sorok.map(cimke), data: sulyArr, szin: gc('--sage'), fill: true, trend: trendVonal(sulyArr) });

    // Kalória vs testsúly
    CH.kombi(document.getElementById('kalVsSuly'), {
      labels: sorok.map(cimke), oszlopData: sorok.map(s => C.n(s, 'kalória', 'kcal') || 0), oszlopSzin: gc('--kaloria'),
      vonalData: sulyArr, vonalSzin: gc('--sage'), balCim: 'Kalória', jobbCim: 'Testsúly'
    });

    // Edzés vs tánc (perc)
    const edzPerc = C.osszeg([...new Set(edz.map(e => C.kulcs(e)))].map(k => C.napiEdzesPerc(data.edzes, k)));
    const tancPerc = C.osszeg(tanc.map(t => C.n(t, 'idő') || 0));
    CH.donut(document.getElementById('edzVsTanc'), { labels: ['Edzés', 'Tánc'], data: [edzPerc, tancPerc], szinek: [gc('--edzes'), gc('--tanc')] });
    document.getElementById('edzVsTancLegend').innerHTML =
      `<div class="bar-row"><span class="dot" style="background:${gc('--edzes')}"></span><span class="lbl">Edzés</span><span class="val">${N.szamFormat(edzPerc, 0)} p</span></div>
       <div class="bar-row"><span class="dot" style="background:${gc('--tanc')}"></span><span class="lbl">Tánc</span><span class="val">${N.szamFormat(tancPerc, 0)} p</span></div>`;

    // Legaktívabb napszakok (események óra szerint)
    const esem = data.esemenyek.filter(e => kulcsok.includes(C.kulcs(e)));
    const savok = { 'Hajnal': 0, 'Reggel': 0, 'Délelőtt': 0, 'Délután': 0, 'Este': 0, 'Éjjel': 0 };
    esem.forEach(e => {
      const h = parseInt((N.mezo(e, 'időpont', 'idő') || '0').split(':')[0], 10) || 0;
      const s = h < 5 ? 'Hajnal' : h < 9 ? 'Reggel' : h < 12 ? 'Délelőtt' : h < 17 ? 'Délután' : h < 21 ? 'Este' : 'Éjjel';
      savok[s]++;
    });
    CH.oszlop(document.getElementById('napszakok'), { labels: Object.keys(savok), data: Object.values(savok), szin: gc('--sage') });

    // Top teljesítmények
    const napVol = {}; edz.forEach(e => { const k = C.kulcs(e); napVol[k] = (napVol[k] || 0) + (C.n(e, 'széria') || 0) * (C.n(e, 'ismétlés') || 0) * (C.n(e, 'súly') || 0); });
    const legSuly = edz.reduce((m, e) => C.n(e, 'súly') > (m ? C.n(m, 'súly') : -1) ? e : m, null);
    const legVol = Object.entries(napVol).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const legLepes = sorok.reduce((m, s) => (C.n(s, 'lépés') || 0) > (m ? C.n(m, 'lépés') || 0 : -1) ? s : m, null);
    document.getElementById('topRek').innerHTML = [
      { k: 'Legnagyobb súly', v: N.szamFormat(legSuly ? C.n(legSuly, 'súly') : 0, 0) + ' kg', d: legSuly ? N.mezo(legSuly, 'gyakorlat') : '' },
      { k: 'Legnagyobb napi volumen', v: N.szamFormat(legVol[1], 0) + ' kg', d: legVol[0].replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3.') },
      { k: 'Legtöbb lépés', v: N.szamFormat(legLepes ? C.n(legLepes, 'lépés') : 0, 0), d: legLepes ? C.kulcs(legLepes).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3.') : '' }
    ].map(r => `<div class="record"><div class="k">${r.k}</div><div class="v">${r.v}</div><div class="date">${r.d}</div></div>`).join('');

    // Hőtérkép
    const maxE = Math.max(1, ...sorok.map(s => data.esemenyek.filter(e => C.kulcs(e) === C.kulcs(s)).length));
    const heat = document.getElementById('hoterkepE');
    heat.style.gridTemplateColumns = 'repeat(10,1fr)';
    heat.innerHTML = sorok.slice(-70).map(s => {
      const n = data.esemenyek.filter(e => C.kulcs(e) === C.kulcs(s)).length;
      const op = Math.round((0.15 + (n / maxE) * 0.85) * 100);
      return `<div class="cell" title="${C.kulcs(s)}" style="background:color-mix(in srgb, ${gc('--sage')} ${op}%, var(--sage-soft))"></div>`;
    }).join('');

    // Havi áttekintés
    const honapok = {};
    APP.data.napi.forEach(s => {
      const k = C.kulcs(s), h = k.slice(0, 6);
      (honapok[h] = honapok[h] || []).push(s);
    });
    const sorokHtml = Object.entries(honapok).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 6).map(([h, arr]) => {
      const kk = arr.map(x => C.kulcs(x));
      const edzDb = new Set(APP.data.edzes.filter(e => kk.includes(C.kulcs(e))).map(e => C.kulcs(e))).size;
      const tancDb = new Set(APP.data.tanc.filter(t => kk.includes(C.kulcs(t))).map(t => C.kulcs(t))).size;
      const honapNev = new Date(+h.slice(0, 4), +h.slice(4, 6) - 1, 1).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
      return `<tr><td>${honapNev}</td><td>${N.szamFormat(C.atlag(arr.map(s => C.n(s, 'testsúly')).filter(x => !isNaN(x))), 1)} kg</td>
        <td>${edzDb}</td><td>${tancDb}</td><td>${N.szamFormat(C.atlag(arr.map(s => C.n(s, 'lépés')).filter(x => !isNaN(x))), 0)}</td></tr>`;
    }).join('');
    document.getElementById('haviTabla').querySelector('tbody').innerHTML = sorokHtml;
  }

  function exportCsv() {
    const sorok = szurtNapi();
    if (!sorok.length) return;
    const fejlec = Object.keys(sorok[0]);
    const sor = r => fejlec.map(f => `"${String(r[f] ?? '').replace(/"/g, '""')}"`).join(',');
    const csv = [fejlec.join(','), ...sorok.map(sor)].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `naplo_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  function init() {
    document.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-range]').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); tartomany = +b.dataset.range; render();
    }));
    document.getElementById('exportBtn').addEventListener('click', exportCsv);
  }

  window.addEventListener('DOMContentLoaded', async () => {
    CH.alap();
    APP = await N.betolt();
    U.sidebar('elemzesek', APP); window.Garden.renderMini(APP); U.topbar({}); U.mintaJelzo(APP);
    init(); render();
  });
})();
