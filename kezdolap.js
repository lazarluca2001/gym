/* Napló — Kezdőlap */
(function () {
  const N = window.Naplo, C = window.Calc, U = window.UI, G = window.Garden, CH = window.Charts;
  const NAPOK_HU = ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'];

  function utolsoN(napi, n, ...kw) {
    return napi.slice(-n).map(s => C.n(s, ...kw) || 0);
  }
  function napszakKoszones() {
    const h = new Date().getHours();
    return h < 11 ? 'Jó reggelt' : h < 18 ? 'Szép napot' : 'Jó estét';
  }

  function render(app) {
    const { config, data } = app;
    const mai = C.maiSor(data.napi), elozo = C.elozoSor(data.napi);
    const maiK = mai ? C.kulcs(mai) : '';
    const cel = C.maiCelok(app);

    // Fejléc
    document.getElementById('koszones').textContent = `${napszakKoszones()}, ${config.felhasznalo_nev || ''}!`;

    // Ciklus mini (topbar)
    const ciklusNap = (data.napi.length % config.ciklus_hossz) || config.ciklus_hossz;
    const pillHtml = `<span class="cikluspill"><span><span class="k">Ciklus nap</span><br><span class="v">${ciklusNap} / ${config.ciklus_hossz}</span></span></span>`;
    U.topbar({ cikluspill: pillHtml });

    // Mai fókusz — 5 gyűrű
    const fokusz = [
      { id: 'ringKal', ertek: mai ? C.n(mai, 'kalória', 'kcal') || 0 : 0, cel: config.cel_kaloria, szin: 'var(--kaloria)', egyseg: 'kcal', cim: 'Kalória', ikon: '🔥', spark: utolsoN(data.napi, 10, 'kalória', 'kcal') },
      { id: 'ringLep', ertek: mai ? C.n(mai, 'lépés') || 0 : 0, cel: config.cel_lepes, szin: 'var(--lepes)', egyseg: 'lépés', cim: 'Lépések', ikon: '👟', spark: utolsoN(data.napi, 10, 'lépés') },
      { id: 'ringViz', ertek: cel.ertekek.viz, cel: config.cel_viz, szin: 'var(--viz)', egyseg: 'l', cim: 'Vízbevitel', ikon: '💧', spark: utolsoN(data.napi, 10, 'víz') },
      { id: 'ringEdz', ertek: cel.ertekek.edzesPerc, cel: config.cel_edzes_perc, szin: 'var(--edzes)', egyseg: 'perc', cim: 'Edzés', ikon: '🏋️' },
      { id: 'ringTanc', ertek: cel.ertekek.tancPerc, cel: config.cel_tanc_perc, szin: 'var(--tanc)', egyseg: 'perc', cim: 'Tánc', ikon: '💃' }
    ];
    fokusz.forEach(f => { const el = document.getElementById(f.id); if (el) U.ring(el, f); });

    // Mai áttekintés — idővonal
    const maiEsem = data.esemenyek.filter(e => C.kulcs(e) === maiK);
    U.timeline(document.getElementById('idovonal'), maiEsem);

    // Mai teendők (az események listaként)
    const todoEl = document.getElementById('teendok');
    if (maiEsem.length) {
      const M = window.TIPUS_META;
      todoEl.innerHTML = maiEsem.slice().sort((a, b) => (N.mezo(a, 'időpont', 'idő') || '').localeCompare(N.mezo(b, 'időpont', 'idő') || ''))
        .map(e => {
          const t = (N.mezo(e, 'típus') || 'egyeb').toLowerCase();
          const m = M[t] || M.egyeb;
          const kesz = t === 'merleg' || t === 'edzes' || t === 'tanc' || t === 'viz' || t === 'jegyzet';
          return `<div class="todo"><span class="ic" style="background:${m.szin}22">${m.ikon}</span>
            <span class="txt"><span class="t">${N.mezo(e, 'cím') || ''}</span><span class="s">${N.mezo(e, 'leírás') || ''}</span></span>
            <span class="time">${N.mezo(e, 'időpont', 'idő') || ''}</span>
            <span class="check ${kesz ? 'done' : ''}">${kesz ? '✓' : ''}</span></div>`;
        }).join('');
    } else U.empty(todoEl, 'Nincs mai teendő 🌱');

    // Heti aktivitás — halmozott oszlop (H–V)
    const hetNapi = C.hetSorai(data.napi, C.datum(mai || {}));
    const napokKulcs = hetNapi.map(s => C.kulcs(s));
    const edzP = [], tancP = [], egyeb = [], moodArr = [], hetCimke = [];
    hetNapi.forEach(s => {
      const k = C.kulcs(s);
      const d = new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8));
      hetCimke.push(NAPOK_HU[d.getDay()]);
      edzP.push(C.napiEdzesPerc(data.edzes, k));
      tancP.push(C.napiTancPerc(data.tanc, k));
      egyeb.push(Math.round((C.n(s, 'lépés') || 0) / 130));
      moodArr.push(C.n(s, 'hangulat') || null);
    });
    CH.halmozott(document.getElementById('hetiAktivitas'), {
      labels: hetCimke, sorozatok: [
        { nev: 'Edzés', data: edzP, szin: getCss('--edzes') },
        { nev: 'Tánc', data: tancP, szin: getCss('--tanc') },
        { nev: 'Egyéb', data: egyeb, szin: getCss('--kaloria') }
      ]
    });

    // Heti célok
    const felett = (kw, cel) => hetNapi.filter(s => (C.n(s, kw) || 0) >= cel).length;
    const alatt = (kw, cel) => hetNapi.filter(s => { const v = C.n(s, kw); return !isNaN(v) && v <= cel; }).length;
    const edzesNapok = new Set(data.edzes.filter(e => napokKulcs.includes(C.kulcs(e))).map(e => C.kulcs(e))).size;
    const tancNapok = new Set(data.tanc.filter(t => napokKulcs.includes(C.kulcs(t))).map(t => C.kulcs(t))).size;
    U.bar(document.getElementById('hetiCelok'), [
      { ikon: '🏋️', lbl: 'Edzés', ertek: edzesNapok, cel: config.heti_edzes_cel, szin: getCss('--edzes'), val: `${edzesNapok} / ${config.heti_edzes_cel}` },
      { ikon: '💃', lbl: 'Tánc', ertek: tancNapok, cel: config.heti_tanc_cel, szin: getCss('--tanc'), val: `${tancNapok} / ${config.heti_tanc_cel}` },
      { ikon: '👟', lbl: 'Lépések', ertek: felett('lépés', config.cel_lepes), cel: config.heti_lepes_napok, szin: getCss('--lepes'), val: `${felett('lépés', config.cel_lepes)} / ${config.heti_lepes_napok}` },
      { ikon: '💧', lbl: 'Víz', ertek: felett('víz', config.cel_viz), cel: config.heti_viz_napok, szin: getCss('--viz'), val: `${felett('víz', config.cel_viz)} / ${config.heti_viz_napok}` },
      { ikon: '🔥', lbl: 'Kalória', ertek: alatt('kalória', config.cel_kaloria), cel: config.heti_kaloria_napok, szin: getCss('--kaloria'), val: `${alatt('kalória', config.cel_kaloria)} / ${config.heti_kaloria_napok}` }
    ]);

    // Heti hangulat
    const moodVal = moodArr.filter(v => v != null);
    document.getElementById('hangulatAtlag').textContent = moodVal.length ? N.szamFormat(C.atlag(moodVal), 1) + ' / 5' : '—';
    U.mood(document.getElementById('moodRow'), C.atlag(moodVal) || 3);
    CH.vonal(document.getElementById('hangulatChart'), { labels: hetCimke, data: moodArr.map(v => v || null), szin: getCss('--sage'), fill: true });

    // Napi kertem
    const kert = G.compute(cel);
    G.render(document.getElementById('kertNagy'), kert);
    document.getElementById('kertUzenet').textContent = kert.uzenet;
  }

  function getCss(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  window.addEventListener('DOMContentLoaded', async () => {
    CH.alap();
    const app = await N.betolt();
    U.sidebar('kezdolap', app);
    G.renderMini(app);
    U.mintaJelzo(app);
    render(app);
  });
})();
