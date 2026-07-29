/* Napló — Naptár (Hónap / Nap) */
(function () {
  const N = window.Naplo, C = window.Calc, U = window.UI, CH = window.Charts, G = window.Garden;
  const gc = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  let APP, honapOffset = 0, szuro = 'osszes', kivalasztottNap = null;
  const DOW = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

  function esemenyekNapra(kulcs) {
    let arr = APP.data.esemenyek.filter(e => C.kulcs(e) === kulcs);
    if (szuro !== 'osszes') arr = arr.filter(e => {
      const t = (N.mezo(e, 'típus') || '').toLowerCase();
      if (szuro === 'egyeb') return !['edzes', 'tanc', 'merleg'].includes(t);
      return t === szuro;
    });
    return arr;
  }

  function renderHonap() {
    const ma = new Date(); ma.setMonth(ma.getMonth() + honapOffset);
    const ev = ma.getFullYear(), ho = ma.getMonth();
    document.getElementById('honapCim').textContent = new Date(ev, ho, 1).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' });
    const elso = new Date(ev, ho, 1);
    let kezd = (elso.getDay() + 6) % 7; // hétfő=0
    const napokSzama = new Date(ev, ho + 1, 0).getDate();
    const maKulcs = N.datumKulcs(`${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}`);
    const META = window.TIPUS_META;
    let cellak = '';
    for (let i = 0; i < kezd; i++) cellak += `<div class="cal-cell dim"></div>`;
    for (let d = 1; d <= napokSzama; d++) {
      const kulcs = `${ev}${String(ho + 1).padStart(2, '0')}${String(d).padStart(2, '0')}`;
      const esem = esemenyekNapra(kulcs);
      const tipusok = [...new Set(esem.map(e => (N.mezo(e, 'típus') || 'egyeb').toLowerCase()))];
      const ikonok = tipusok.slice(0, 4).map(t => (META[t] || META.egyeb).ikon).join('');
      cellak += `<div class="cal-cell ${kulcs === maKulcs ? 'today' : ''}" data-nap="${kulcs}" style="cursor:pointer">
        <div class="n">${d}</div><div class="cal-icons">${ikonok}</div></div>`;
    }
    document.getElementById('calGrid').innerHTML =
      DOW.map(x => `<div class="cal-dow">${x}</div>`).join('') + cellak;
    document.querySelectorAll('.cal-cell[data-nap]').forEach(c => c.addEventListener('click', () => {
      kivalasztottNap = c.dataset.nap; valt('nap'); renderNap();
    }));
  }

  function renderNap() {
    const { data, config } = APP;
    const napi = data.napi;
    const kulcs = kivalasztottNap || (C.maiSor(napi) ? C.kulcs(C.maiSor(napi)) : '');
    const sor = napi.find(s => C.kulcs(s) === kulcs);
    document.getElementById('napCim').textContent = kulcs
      ? new Date(+kulcs.slice(0, 4), +kulcs.slice(4, 6) - 1, +kulcs.slice(6, 8)).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric', weekday: 'long' })
      : '—';
    // idővonal
    U.timeline(document.getElementById('napIdovonal'), data.esemenyek.filter(e => C.kulcs(e) === kulcs));
    // napi rings
    const edzP = C.napiEdzesPerc(data.edzes, kulcs), tancP = C.napiTancPerc(data.tanc, kulcs);
    const ringek = [
      { id: 'nrKal', ertek: sor ? C.n(sor, 'kalória', 'kcal') || 0 : 0, cel: config.cel_kaloria, szin: gc('--kaloria'), egyseg: 'kcal', cim: 'Kalória', ikon: '🔥' },
      { id: 'nrLep', ertek: sor ? C.n(sor, 'lépés') || 0 : 0, cel: config.cel_lepes, szin: gc('--lepes'), egyseg: '', cim: 'Lépés', ikon: '👟' },
      { id: 'nrViz', ertek: sor ? C.n(sor, 'víz') || 0 : 0, cel: config.cel_viz, szin: gc('--viz'), egyseg: 'l', cim: 'Víz', ikon: '💧' },
      { id: 'nrMozg', ertek: edzP + tancP, cel: config.cel_edzes_perc + config.cel_tanc_perc, szin: gc('--edzes'), egyseg: 'perc', cim: 'Mozgás', ikon: '🏃' }
    ];
    const wrap = document.getElementById('napRingek');
    wrap.innerHTML = ringek.map(r => `<div class="card tight"><div id="${r.id}"></div></div>`).join('');
    ringek.forEach(r => U.ring(document.getElementById(r.id), r));
  }

  function renderAlso() {
    const { data, config } = APP;
    // Havi aktivitás: edzés/tánc percek hetente (utolsó 6 hét)
    const hetek = {};
    data.napi.slice(-42).forEach(s => {
      const hk = N.hetKulcs(C.datum(s)); const k = C.kulcs(s);
      hetek[hk] = hetek[hk] || { edzes: 0, tanc: 0 };
      hetek[hk].edzes += C.napiEdzesPerc(data.edzes, k);
      hetek[hk].tanc += C.napiTancPerc(data.tanc, k);
    });
    const hk = Object.keys(hetek).sort();
    CH.halmozott(document.getElementById('haviAktivitas'), {
      labels: hk.map(h => h.split('-')[1] + '. hét'),
      sorozatok: [{ nev: 'Edzés', data: hk.map(h => hetek[h].edzes), szin: gc('--edzes') }, { nev: 'Tánc', data: hk.map(h => hetek[h].tanc), szin: gc('--tanc') }]
    });

    // Hőtérkép: utolsó 70 nap eseményszáma
    const ut = data.napi.slice(-70);
    const maxE = Math.max(1, ...ut.map(s => data.esemenyek.filter(e => C.kulcs(e) === C.kulcs(s)).length));
    const heat = document.getElementById('hoterkep');
    heat.style.gridTemplateColumns = 'repeat(10,1fr)';
    heat.innerHTML = ut.map(s => {
      const n = data.esemenyek.filter(e => C.kulcs(e) === C.kulcs(s)).length;
      const op = 0.15 + (n / maxE) * 0.85;
      return `<div class="cell" title="${C.kulcs(s)}: ${n} esemény" style="background:color-mix(in srgb, ${gc('--sage')} ${Math.round(op * 100)}%, var(--sage-soft))"></div>`;
    }).join('');

    // Heti balansz radar (aktuális hét átlaga a célhoz)
    const het = C.hetSorai(data.napi, C.datum(C.maiSor(data.napi) || {}));
    const kulcsok = het.map(s => C.kulcs(s));
    const norm = (v, cel) => Math.max(0, Math.min(1, cel ? v / cel : 0));
    const edzHet = C.atlag(kulcsok.map(k => C.napiEdzesPerc(data.edzes, k)));
    const tancHet = C.atlag(kulcsok.map(k => C.napiTancPerc(data.tanc, k)));
    CH.radar(document.getElementById('hetiBalansz'), {
      labels: ['Edzés', 'Tánc', 'Víz', 'Lépés', 'Kalória', 'Alvás'],
      data: [
        norm(edzHet, config.cel_edzes_perc), norm(tancHet, config.cel_tanc_perc),
        norm(C.atlag(het.map(s => C.n(s, 'víz') || 0)), config.cel_viz),
        norm(C.atlag(het.map(s => C.n(s, 'lépés') || 0)), config.cel_lepes),
        norm(config.cel_kaloria, C.atlag(het.map(s => C.n(s, 'kalória', 'kcal') || config.cel_kaloria))),
        norm(C.atlag(het.map(s => C.n(s, 'alvás') || 0)), 8)
      ], szin: gc('--sage')
    });
  }

  function valt(nezet) {
    document.getElementById('view-honap').style.display = nezet === 'honap' ? '' : 'none';
    document.getElementById('view-nap').style.display = nezet === 'nap' ? '' : 'none';
    document.querySelectorAll('[data-nezet]').forEach(b => b.classList.toggle('active', b.dataset.nezet === nezet));
  }

  function init() {
    document.querySelectorAll('[data-nezet]').forEach(b => b.addEventListener('click', () => valt(b.dataset.nezet)));
    document.getElementById('honapPrev').addEventListener('click', () => { honapOffset--; renderHonap(); });
    document.getElementById('honapNext').addEventListener('click', () => { honapOffset++; renderHonap(); });
    document.querySelectorAll('[data-szuro]').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('[data-szuro]').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); szuro = b.dataset.szuro; renderHonap();
    }));
  }

  window.addEventListener('DOMContentLoaded', async () => {
    CH.alap();
    APP = await N.betolt();
    U.sidebar('naptar', APP); G.renderMini(APP); U.topbar({}); U.mintaJelzo(APP);
    init(); renderHonap(); renderNap(); renderAlso();
  });
})();
