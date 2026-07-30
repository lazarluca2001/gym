/* Napló — Aktivitások (Edzés / Tánc / Mindennapi) */
(function () {
  const N = window.Naplo, C = window.Calc, U = window.UI, CH = window.Charts;
  const gc = v => getComputedStyle(document.body).getPropertyValue(v).trim();
  let APP, hetOffset = 0;

  function hetKulcsok(offset) {
    // aktuális hét kulcsa - offset
    const napi = APP.data.napi; const mai = C.maiSor(napi);
    const alap = mai ? C.datum(mai) : new Date().toISOString();
    const d = new Date(+C.kulcs(mai).slice(0, 4), +C.kulcs(mai).slice(4, 6) - 1, +C.kulcs(mai).slice(6, 8));
    d.setDate(d.getDate() + offset * 7);
    return N.hetKulcs(`${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`);
  }
  function edzHeten(hk) { return APP.data.edzes.filter(e => N.hetKulcs(C.datum(e)) === hk); }
  function vol(e) { return (C.n(e, 'széria') || 0) * (C.n(e, 'ismétlés') || 0) * (C.n(e, 'súly') || 0); }
  function napok(edz) { return [...new Set(edz.map(e => C.kulcs(e)))]; }
  function ossz(arr) { return arr.reduce((a, b) => a + b, 0); }
  function sparkSvg(vals, szin) {
    if (!vals.length) return '';
    const w = 70, h = 26, max = Math.max(...vals), min = Math.min(...vals), rng = max - min || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1 || 1)) * w},${h - ((v - min) / rng) * h}`).join(' ');
    return `<svg width="${w}" height="${h}"><polyline points="${pts}" fill="none" stroke="${szin}" stroke-width="2"/></svg>`;
  }

  function renderEdzes() {
    const { data } = APP;
    const hk = hetKulcsok(hetOffset), hkPrev = hetKulcsok(hetOffset - 1);
    const edz = edzHeten(hk), edzPrev = edzHeten(hkPrev);
    const napjai = napok(edz);
    const osszPerc = ossz(napjai.map(k => C.napiEdzesPerc(data.edzes, k)));
    const osszVol = ossz(edz.map(vol));
    const prevVol = ossz(edzPrev.map(vol));
    const prevNap = napok(edzPrev).length;
    const prevPerc = ossz(napok(edzPrev).map(k => C.napiEdzesPerc(data.edzes, k)));
    const kcal = Math.round(osszPerc * 8); // becsült
    const o = Math.floor(osszPerc / 60), p = osszPerc % 60;
    document.getElementById('edzHeti').innerHTML = [
      { ik: '🏋️', v: napjai.length, l: 'edzés', d: N.trendNyil(napjai.length - prevNap, 0) },
      { ik: '⏱️', v: `${o} óra ${p} p`, l: 'össz. idő', d: N.trendNyil(osszPerc - prevPerc, 0) },
      { ik: '🔥', v: N.szamFormat(kcal, 0), l: 'kcal (becsült)', d: '' },
      { ik: '📊', v: N.szamFormat(osszVol, 0), l: 'kg volumen', d: N.trendNyil(osszVol - prevVol, 0) }
    ].map(x => `<div style="text-align:center"><div style="font-size:22px">${x.ik}</div><div class="big-num" style="font-size:22px">${x.v}</div><div class="muted" style="font-size:12px">${x.l}</div><div style="font-size:12px">${x.d}</div></div>`).join('');
    document.getElementById('edzHetLabel').textContent = hetOffset === 0 ? 'Aktuális hét' : `${Math.abs(hetOffset)} héttel ezelőtt`;

    // Izomcsoportok (szettszám)
    const izmok = {};
    edz.forEach(e => { const iz = N.mezo(e, 'izomcsoport') || 'Egyéb'; izmok[iz] = (izmok[iz] || 0) + (C.n(e, 'széria') || 0); });
    U.bar(document.getElementById('izomcsoportok'),
      Object.entries(izmok).sort((a, b) => b[1] - a[1]).map(([nm, v]) => ({ lbl: nm, ertek: v, cel: Math.max(...Object.values(izmok)), szin: gc('--edzes'), val: v + ' szett' })));

    // Rekordok (teljes napló)
    const all = data.edzes;
    const maxSuly = all.reduce((m, e) => C.n(e, 'súly') > (m ? C.n(m, 'súly') : -1) ? e : m, null);
    const maxIsm = all.reduce((m, e) => C.n(e, 'ismétlés') > (m ? C.n(m, 'ismétlés') : -1) ? e : m, null);
    const napVol = {}; all.forEach(e => { const k = C.kulcs(e); napVol[k] = (napVol[k] || 0) + vol(e); });
    const napPerc = {}; all.forEach(e => { const k = C.kulcs(e); napPerc[k] = (napPerc[k] || 0) + (N.idoPerc(N.mezo(e, 'időtartam')) || 0); });
    const legVolNap = Object.entries(napVol).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const legPercNap = Object.entries(napPerc).sort((a, b) => b[1] - a[1])[0] || ['', 0];
    const fmtK = k => k ? `${k.slice(0, 4)}.${k.slice(4, 6)}.${k.slice(6, 8)}.` : '';
    document.getElementById('rekordok').innerHTML = [
      { k: 'Legnagyobb súly', v: N.szamFormat(maxSuly ? C.n(maxSuly, 'súly') : 0, 0) + ' kg', d: fmtK(maxSuly && C.kulcs(maxSuly)) },
      { k: 'Legtöbb ismétlés', v: (maxIsm ? C.n(maxIsm, 'ismétlés') : 0) + ' ism.', d: fmtK(maxIsm && C.kulcs(maxIsm)) },
      { k: 'Leghosszabb edzés', v: N.szamFormat(legPercNap[1], 0) + ' perc', d: fmtK(legPercNap[0]) },
      { k: 'Legnagyobb volumen', v: N.szamFormat(legVolNap[1], 0) + ' kg', d: fmtK(legVolNap[0]) }
    ].map(r => `<div class="record"><div class="k">${r.k}</div><div class="v">${r.v}</div><div class="date">${r.d}</div></div>`).join('');

    // Volumen az utolsó 7 edzésnapon + átlag
    const napVolRend = Object.entries(napVol).sort((a, b) => a[0].localeCompare(b[0])).slice(-7);
    const vals = napVolRend.map(x => x[1]);
    CH.oszlop(document.getElementById('volumenChart'), { labels: napVolRend.map(x => fmtK(x[0]).slice(5)), data: vals, szin: gc('--edzes') });
    document.getElementById('volumenAtlag').textContent = 'Átlag: ' + N.szamFormat(ossz(vals) / (vals.length || 1), 0) + ' kg';

    // Gyakorlat tábla
    const gyMeta = {}; data.gyakorlatok.forEach(g => gyMeta[N.mezo(g, 'név')] = g);
    const perGyak = {};
    all.forEach(e => { const nm = N.mezo(e, 'gyakorlat'); (perGyak[nm] = perGyak[nm] || []).push(e); });
    const sorok = Object.entries(perGyak).slice(0, 6).map(([nm, arr]) => {
      arr.sort((a, b) => C.kulcs(a).localeCompare(C.kulcs(b)));
      const ut = arr[arr.length - 1];
      const meta = gyMeta[nm] || {};
      const szin = N.mezo(meta, 'szín') || gc('--sage');
      const izom = N.mezo(meta, 'izomcsoport') || N.mezo(ut, 'izomcsoport') || '—';
      // fejlődés: utolsó vs első volumen
      const volArr = arr.map(vol);
      const fejl = volArr.length > 1 && volArr[0] ? Math.round((volArr[volArr.length - 1] - volArr[0]) / volArr[0] * 100) : 0;
      return `<tr>
        <td>${nm}</td>
        <td><span class="dot" style="background:${szin}"></span>${izom}</td>
        <td>${C.n(ut, 'széria') || 0} szett × ${C.n(ut, 'ismétlés') || 0} ism. × ${C.n(ut, 'súly') || 0} kg</td>
        <td><span class="${fejl >= 0 ? 'trend-up' : 'trend-down'}">${fejl >= 0 ? '▲' : '▼'} ${Math.abs(fejl)}%</span></td>
        <td>${sparkSvg(volArr.slice(-8), gc('--sage'))}</td></tr>`;
    }).join('');
    document.getElementById('gyakTabla').querySelector('tbody').innerHTML = sorok;

    // Fejlődés: kumulatív volumen (30 nap)
    const utolso30 = Object.entries(napVol).sort((a, b) => a[0].localeCompare(b[0])).slice(-30);
    let kum = 0; const kumArr = utolso30.map(x => (kum += x[1]));
    CH.vonal(document.getElementById('fejlodesChart'), { labels: utolso30.map(x => fmtK(x[0]).slice(5)), data: kumArr, szin: gc('--sage'), fill: true });
    document.getElementById('fejlodesFo').innerHTML = N.szamFormat(kum, 0) + '<small class="muted"> kg</small>';
  }

  function renderTanc() {
    const { data } = APP;
    const hk = hetKulcsok(0);
    const tHet = data.tanc.filter(t => N.hetKulcs(C.datum(t)) === hk);
    const perc = ossz(tHet.map(t => C.n(t, 'idő') || 0));
    const o = Math.floor(perc / 60), p = perc % 60;
    document.getElementById('tancHeti').innerHTML = [
      { ik: '💃', v: tHet.length, l: 'óra' }, { ik: '⏱️', v: `${o}ó ${p}p`, l: 'össz. idő' },
      { ik: '⭐', v: N.szamFormat(C.atlag(tHet.map(t => C.n(t, 'értékelés')).filter(x => !isNaN(x))), 1), l: 'átlag értékelés' }
    ].map(x => `<div style="text-align:center"><div style="font-size:22px">${x.ik}</div><div class="big-num" style="font-size:22px">${x.v}</div><div class="muted" style="font-size:12px">${x.l}</div></div>`).join('');
    // típus megoszlás
    const tip = {}; data.tanc.forEach(t => { const k = N.mezo(t, 'típus') || 'egyéb'; tip[k] = (tip[k] || 0) + (C.n(t, 'idő') || 0); });
    CH.donut(document.getElementById('tancTipus'), { labels: Object.keys(tip), data: Object.values(tip), szinek: [gc('--tanc'), gc('--kaloria'), gc('--menstrual')] });
    document.getElementById('tancTipusLegend').innerHTML = Object.entries(tip).map(([k, v], i) =>
      `<div class="bar-row"><span class="dot" style="background:${[gc('--tanc'), gc('--kaloria'), gc('--menstrual')][i % 3]}"></span><span class="lbl">${k}</span><span class="val">${v} perc</span></div>`).join('');
    // értékelés/fáradtság trend (utolsó 12)
    const ut = data.tanc.slice(-12);
    CH.ketVonal(document.getElementById('tancTrend'), {
      labels: ut.map(t => C.kulcs(t).slice(4, 6) + '.' + C.kulcs(t).slice(6, 8)),
      aData: ut.map(t => C.n(t, 'értékelés')), aSzin: gc('--tanc'), aCim: 'Értékelés',
      bData: ut.map(t => C.n(t, 'fáradtság')), bSzin: gc('--kaloria'), bCim: 'Fáradtság'
    });
    const legHosszabb = data.tanc.reduce((m, t) => C.n(t, 'idő') > (m ? C.n(m, 'idő') : -1) ? t : m, null);
    document.getElementById('tancRekord').innerHTML = legHosszabb
      ? `<div class="record"><div class="k">Leghosszabb tánc nap</div><div class="v">${C.n(legHosszabb, 'idő')} perc</div><div class="date">${C.kulcs(legHosszabb).replace(/(\d{4})(\d{2})(\d{2})/, '$1.$2.$3.')}</div></div>` : '';
  }

  function renderMindennapi() {
    const { data } = APP;
    const ut = data.napi.slice(-14);
    CH.oszlop(document.getElementById('lepesChart'), { labels: ut.map(s => C.kulcs(s).slice(4, 6) + '.' + C.kulcs(s).slice(6, 8)), data: ut.map(s => C.n(s, 'lépés') || 0), szin: gc('--lepes') });
    const atlag = C.atlag(ut.map(s => C.n(s, 'lépés') || 0));
    document.getElementById('lepesAtlag').innerHTML = N.szamFormat(atlag, 0) + '<small class="muted"> átlag lépés / nap</small>';
  }

  function initTabs() {
    document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(x => x.classList.remove('active'));
      document.querySelectorAll('.tabpanel').forEach(x => x.classList.remove('active'));
      b.classList.add('active'); document.getElementById('tab-' + b.dataset.tab).classList.add('active');
    }));
    document.getElementById('hetPrev').addEventListener('click', () => { hetOffset--; renderEdzes(); });
    document.getElementById('hetNext').addEventListener('click', () => { if (hetOffset < 0) { hetOffset++; renderEdzes(); } });
  }

  window.addEventListener('DOMContentLoaded', async () => {
    CH.alap();
    APP = await N.betolt();
    U.sidebar('aktivitasok', APP); window.Garden.renderMini(APP); U.topbar({}); U.mintaJelzo(APP);
    initTabs(); renderEdzes(); renderTanc(); renderMindennapi();
  });
})();
