/* ==========================================================================
   Napló — Adatréteg (data.js)
   7-fül Google Sheets loader + Config + cache + újrahasznosított segédek.
   Böngészőben a `Naplo` globálra kerül; Node-ban module.exports (teszthez).
   ========================================================================== */
(function (global) {
  'use strict';

  // ------- Konfiguráció -------
  const SPREADSHEET_ID = '1NxTR3teMZjljuzvJNljJxRs_1U08uHTX1aTcSQlhCkA';
  const FULEK = ['Config', 'Napi_adatok', 'Edzes_Naplo', 'Tanc_Naplo', 'Esemenyek', 'Gyakorlatok', 'Tanc_tipusok'];
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 perc

  // Config fallback default — ha a fül hiányzik/üres, ezekkel megy tovább a UI.
  // A típus (number vs string) itt dönti el, hogyan parse-oljuk a cellát.
  const CONFIG_DEFAULTS = {
    felhasznalo_nev: '',
    szint: 1,
    magassag_m: 1.62,
    cel_sulycel: 58,
    cel_kaloria: 1300,
    cel_lepes: 10000,
    cel_viz: 2.5,
    cel_edzes_perc: 45,
    cel_tanc_perc: 120,
    heti_edzes_cel: 4,
    heti_tanc_cel: 5,
    heti_lepes_napok: 7,
    heti_viz_napok: 7,
    heti_kaloria_napok: 7,
    ciklus_hossz: 28,
    kaloria_irany: 'deficit' // 'deficit' → cél teljesül, ha kalória <= cel_kaloria
  };

  // ===================== Újrahasznosított segédfüggvények =====================

  // CSV → objektumtömb (idézőjeles cellákat is kezel)
  function csvToObjects(csvText) {
    if (!csvText) return [];
    const sorok = csvText.split('\n').map(sor =>
      sor.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cella => cella.replace(/^"|"$/g, '').trim())
    );
    if (sorok.length === 0) return [];
    const fejlecek = sorok[0];
    return sorok.slice(1)
      .filter(s => s.length >= fejlecek.length && s[0] !== '')
      .map(sor => {
        const obj = {};
        fejlecek.forEach((fejlec, i) => { obj[fejlec] = sor[i]; });
        return obj;
      });
  }

  // Rugalmas oszlopkeresés kulcsszó alapján (a pontos fejléctől függetlenül)
  function mezo(obj, ...kulcsszavak) {
    if (!obj) return undefined;
    const kulcsok = Object.keys(obj);
    for (const szo of kulcsszavak) {
      const talalt = kulcsok.find(k => k.toLowerCase().includes(szo.toLowerCase()));
      if (talalt !== undefined && obj[talalt] !== undefined && obj[talalt] !== '') {
        return obj[talalt];
      }
    }
    return undefined;
  }

  // Vesszős/pontos tizedes → szám
  function szamErtek(str) {
    if (str === undefined || str === null || str === '') return NaN;
    return parseFloat(String(str).replace(/\s/g, '').replace(',', '.'));
  }

  // Idő/időtartam olvasása. Kezeli: "H:MM:SS(.mmm)" szöveget, nap-törtet (<1),
  // és a sima számot. idoOra → órában, idoPerc → percben.
  function idoReszek(x) {
    if (x === undefined || x === null || x === '') return null;
    const s = String(x).trim();
    const m = s.match(/^(\d+):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/);
    if (m) return { o: +m[1], p: +m[2], mp: m[3] ? parseFloat(m[3]) : 0 };
    return null;
  }
  function idoOra(x) {
    const r = idoReszek(x);
    if (r) return r.o + r.p / 60 + r.mp / 3600;
    const n = szamErtek(x);
    if (!isNaN(n) && n > 0 && n < 1) return n * 24; // nap-tört → óra
    return n;
  }
  function idoPerc(x) {
    const r = idoReszek(x);
    if (r) return r.o * 60 + r.p + r.mp / 60;
    const n = szamErtek(x);
    if (!isNaN(n) && n > 0 && n < 1) return n * 1440; // nap-tört → perc
    return n;
  }

  // Szám → hu-HU formátum (vessző tizedes, ezres tagolás)
  function szamFormat(num, maxTizedes) {
    if (num === null || num === undefined || isNaN(num)) return '—';
    return num.toLocaleString('hu-HU', { maximumFractionDigits: maxTizedes !== undefined ? maxTizedes : 2 });
  }

  // Dátum normalizálás összehasonlításhoz → 'YYYYMMDD'
  function datumKulcs(str) {
    if (!str) return '';
    return String(str).replace(/[^0-9]/g, '').slice(0, 8);
  }

  // ISO év-hét kulcs egy dátumhoz (heti összesítésekhez)
  function hetKulcs(datumStr) {
    const k = datumKulcs(datumStr);
    if (k.length < 8) return null;
    const d = new Date(+k.slice(0, 4), +k.slice(4, 6) - 1, +k.slice(6, 8));
    const csut = new Date(d);
    csut.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const evEleje = new Date(csut.getFullYear(), 0, 1);
    const het = Math.ceil(((csut - evEleje) / 86400000 + 1) / 7);
    return `${csut.getFullYear()}-${String(het).padStart(2, '0')}`;
  }

  // Heti átlag/összeg trend: utolsó teli hét vs. előző, változással
  function hetiTrendSzoveg(bejegyzesek, datumFn, ertekFn, mod) {
    const csoportok = {};
    (bejegyzesek || []).forEach(b => {
      const hk = hetKulcs(datumFn(b));
      if (!hk) return;
      (csoportok[hk] = csoportok[hk] || []).push(ertekFn(b));
    });
    const hetek = Object.keys(csoportok).sort();
    if (hetek.length === 0) return null;
    const szamol = arr => mod === 'atlag'
      ? arr.reduce((a, b) => a + b, 0) / arr.length
      : arr.reduce((a, b) => a + b, 0);
    const utolso = szamol(csoportok[hetek[hetek.length - 1]]);
    if (hetek.length < 2) return { ertek: utolso, valtozas: null };
    const elozo = szamol(csoportok[hetek[hetek.length - 2]]);
    return { ertek: utolso, valtozas: utolso - elozo };
  }

  // Trend-nyíl HTML (▲/▼) — küszöb alatt „nincs változás"
  function trendNyil(valtozas, maxTizedes) {
    if (valtozas === null || valtozas === undefined || isNaN(valtozas)) return '';
    if (Math.abs(valtozas) < 0.05) return '<span class="trend-flat">— nincs változás</span>';
    const nyil = valtozas > 0 ? '▲' : '▼';
    const osztaly = valtozas > 0 ? 'trend-up' : 'trend-down';
    return `<span class="${osztaly}">${nyil} ${szamFormat(Math.abs(valtozas), maxTizedes)}</span>`;
  }

  // ===================== Config =====================

  // Config aliasok: emberi címke → belső kulcs (ékezet/space-független).
  const CONFIG_ALIAS = {
    celsuly: 'cel_sulycel', celsulycel: 'cel_sulycel',
    kaloria: 'cel_kaloria', kaloriacel: 'cel_kaloria', napikaloria: 'cel_kaloria',
    lepes: 'cel_lepes', lepesek: 'cel_lepes', lepesszam: 'cel_lepes',
    viz: 'cel_viz',
    'edzes/het': 'heti_edzes_cel', edzeshet: 'heti_edzes_cel', edzes: 'heti_edzes_cel',
    'tanc/het': 'heti_tanc_cel', tanchet: 'heti_tanc_cel', tanc: 'heti_tanc_cel',
    edzesperc: 'cel_edzes_perc', edzesido: 'cel_edzes_perc',
    tancperc: 'cel_tanc_perc', tancido: 'cel_tanc_perc',
    magassag: 'magassag_m', magassagm: 'magassag_m',
    ciklus: 'ciklus_hossz', ciklushossz: 'ciklus_hossz',
    nev: 'felhasznalo_nev', felhasznalo: 'felhasznalo_nev', felhasznalonev: 'felhasznalo_nev',
    szint: 'szint', kaloriairany: 'kaloria_irany', irany: 'kaloria_irany'
  };
  function normKulcs(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').trim();
  }
  function configToObject(configRows) {
    const ki = Object.assign({}, CONFIG_DEFAULTS);
    (configRows || []).forEach(sor => {
      // Kulcs: dedikált oszlop, vagy tartalékként az első oszlop.
      let kulcsRaw = mezo(sor, 'kulcs', 'key');
      if (kulcsRaw === undefined) { const vals = Object.values(sor); kulcsRaw = vals.length ? vals[0] : undefined; }
      let ertekRaw = mezo(sor, 'érték', 'ertek', 'value');
      if (ertekRaw === undefined) { const vals = Object.values(sor); ertekRaw = vals.length > 1 ? vals[1] : undefined; }
      if (kulcsRaw === undefined || ertekRaw === undefined) return;

      let k = String(kulcsRaw).trim().toLowerCase();
      if (!(k in CONFIG_DEFAULTS)) { const alias = CONFIG_ALIAS[normKulcs(kulcsRaw)]; if (alias) k = alias; }
      const alap = CONFIG_DEFAULTS[k];
      if (typeof alap === 'number' || (alap === undefined && !isNaN(szamErtek(ertekRaw)))) {
        const n = szamErtek(ertekRaw);
        if (!isNaN(n)) ki[k] = n;
      } else {
        ki[k] = String(ertekRaw).trim();
      }
    });
    return ki;
  }

  // ===================== Derivált mutatók (a lezárt döntések) =====================

  // BMI a magasságból (nincs külön testösszetétel-oszlop). magassag_m a Configból.
  function bmi(testsulyKg, magassagM) {
    const s = szamErtek(testsulyKg);
    const m = szamErtek(magassagM);
    if (isNaN(s) || isNaN(m) || m <= 0) return null;
    return s / (m * m);
  }

  // Kalória-cél teljesült-e? DÖNTÉS: deficit → kalória <= cél a jó.
  function kaloriaCelTeljesult(kaloria, cel, irany) {
    const k = szamErtek(kaloria), c = szamErtek(cel);
    if (isNaN(k) || isNaN(c)) return false;
    return (irany === 'elér' || irany === 'eler') ? k >= c : k <= c; // default: deficit
  }

  // ===================== Fetch + cache =====================

  const vanBongeszo = typeof window !== 'undefined' && typeof fetch !== 'undefined';
  // Egyes böngészők (privát mód, file://) hozzáférés-hibát dobnak a storage-ra → óvatosan.
  let vanCache = false;
  try { vanCache = typeof sessionStorage !== 'undefined' && sessionStorage !== null; } catch (_) { vanCache = false; }

  function fulUrl(ful) {
    return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(ful)}`;
  }

  function cacheKulcs(ful) { return `naplo:csv:${ful}`; }

  function cacheOlvas(ful) {
    if (!vanCache) return null;
    try {
      const raw = sessionStorage.getItem(cacheKulcs(ful));
      if (!raw) return null;
      const { t, csv } = JSON.parse(raw);
      if (Date.now() - t > CACHE_TTL_MS) return null;
      return csv;
    } catch (_) { return null; }
  }

  function cacheIr(ful, csv) {
    if (!vanCache) return;
    try { sessionStorage.setItem(cacheKulcs(ful), JSON.stringify({ t: Date.now(), csv })); } catch (_) {}
  }

  async function fulBetolt(ful) {
    const gyorsitott = cacheOlvas(ful);
    if (gyorsitott !== null) return gyorsitott;
    const res = await fetch(fulUrl(ful));
    if (!res.ok) throw new Error(`${ful}: HTTP ${res.status}`);
    const csv = await res.text();
    // Nem publikus / hiányzó fül → a Google HTML bejelentkező/hibaoldalt ad (akár 200-zal).
    const eleje = csv.slice(0, 200).trim().toLowerCase();
    if (eleje.startsWith('<') || eleje.includes('<!doctype') || eleje.includes('<html'))
      throw new Error(`${ful}: nem CSV válasz (nincs publikálva vagy hiányzik a fül?)`);
    cacheIr(ful, csv);
    return csv;
  }

  // Eseménykeltés a meglévő fülekből (ha nincs külön Esemenyek fül/adat).
  // Így a Naptár és az idővonalak működnek dupla adatbevitel nélkül.
  function esemenyekSzarmaztat(data) {
    const ki = [];
    (data.napi || []).forEach(s => {
      const d = mezo(s, 'dátum'); if (!d) return;
      const suly = szamErtek(mezo(s, 'testsúly'));
      if (!isNaN(suly)) ki.push({ 'Dátum': d, 'Időpont': '07:00', 'Típus': 'merleg', 'Cím': 'Mérlegelés', 'Leírás': szamFormat(suly, 1) + ' kg' });
      const viz = szamErtek(mezo(s, 'víz'));
      if (!isNaN(viz) && viz > 0) ki.push({ 'Dátum': d, 'Időpont': '08:00', 'Típus': 'viz', 'Cím': 'Vízbevitel', 'Leírás': szamFormat(viz, 1) + ' l' });
      const jegyzet = mezo(s, 'jegyzet');
      if (jegyzet && String(jegyzet).trim()) ki.push({ 'Dátum': d, 'Időpont': '12:30', 'Típus': 'jegyzet', 'Cím': 'Jegyzet', 'Leírás': String(jegyzet).trim() });
    });
    const edzNap = {};
    (data.edzes || []).forEach(e => { const k = datumKulcs(mezo(e, 'dátum')); (edzNap[k] = edzNap[k] || []).push(e); });
    Object.values(edzNap).forEach(arr => {
      const d = mezo(arr[0], 'dátum');
      const perc = arr.reduce((a, e) => a + (idoPerc(mezo(e, 'időtartam')) || 0), 0);
      const vol = arr.reduce((a, e) => a + (szamErtek(mezo(e, 'széria')) || 0) * (szamErtek(mezo(e, 'ismétlés')) || 0) * (szamErtek(mezo(e, 'súly')) || 0), 0);
      const gyakDb = new Set(arr.map(e => mezo(e, 'gyakorlat'))).size;
      ki.push({ 'Dátum': d, 'Időpont': '18:00', 'Típus': 'edzes', 'Cím': 'Edzés', 'Leírás': (perc ? Math.round(perc) + ' perc · ' : '') + gyakDb + ' gyakorlat · ' + szamFormat(vol, 0) + ' kg' });
    });
    (data.tanc || []).forEach(t => {
      const d = mezo(t, 'dátum'); if (!d) return;
      const perc = szamErtek(mezo(t, 'idő')) || 0;
      ki.push({ 'Dátum': d, 'Időpont': '20:00', 'Típus': 'tanc', 'Cím': mezo(t, 'óra') || 'Tánc', 'Leírás': (mezo(t, 'típus') || '') + (perc ? ' · ' + perc + ' perc' : '') });
    });
    return ki;
  }

  // Fő betöltő.
  // - Ha van ÉLŐ adat (Napi/Edzés/Tánc valamelyike) → élő mód: a hiányzó
  //   fülekhez NEM kever mintát, az Esemenyek-et pedig származtatja.
  // - Ha semmi élő adat nincs → teljes MINTA (offline prototípus).
  async function betolt(opts) {
    opts = opts || {};
    if (typeof document !== 'undefined') document.body.classList.add('betoltes');
    const eredmenyek = await Promise.allSettled(FULEK.map(fulBetolt));

    const csvMap = {};
    const hibak = [];
    FULEK.forEach((ful, i) => {
      const r = eredmenyek[i];
      if (r.status === 'fulfilled') csvMap[ful] = r.value;
      else { csvMap[ful] = ''; hibak.push({ ful, hiba: String(r.reason) }); }
    });

    const napiElo = csvToObjects(csvMap['Napi_adatok']);
    const edzesElo = csvToObjects(csvMap['Edzes_Naplo']);
    const tancElo = csvToObjects(csvMap['Tanc_Naplo']);
    const eloMod = napiElo.length > 0 || edzesElo.length > 0 || tancElo.length > 0;
    const minta = eloMod ? null : (opts.minta || (typeof global.MINTA !== 'undefined' ? global.MINTA : null));

    const forrasok = {};
    function beolvas(ful, mintaKulcs) {
      const arr = csvToObjects(csvMap[ful]);
      if (arr.length) { forrasok[mintaKulcs] = 'elo'; return arr; }
      if (minta && minta[mintaKulcs] && minta[mintaKulcs].length) { forrasok[mintaKulcs] = 'minta'; return minta[mintaKulcs]; }
      forrasok[mintaKulcs] = 'ures'; return [];
    }

    const configRows = csvToObjects(csvMap['Config']);
    let config;
    if (configRows.length) { config = configToObject(configRows); forrasok.config = 'elo'; }
    else if (minta && minta.config) { config = Object.assign({}, CONFIG_DEFAULTS, minta.config); forrasok.config = 'minta'; }
    else { config = configToObject([]); forrasok.config = 'ures'; }

    const data = {
      napi:        beolvas('Napi_adatok', 'napi'),
      edzes:       beolvas('Edzes_Naplo', 'edzes'),
      tanc:        beolvas('Tanc_Naplo', 'tanc'),
      esemenyek:   beolvas('Esemenyek', 'esemenyek'),
      gyakorlatok: beolvas('Gyakorlatok', 'gyakorlatok'),
      tanctipusok: beolvas('Tanc_tipusok', 'tanctipusok')
    };

    // Nincs élő/minta esemény → származtatjuk a többi fülből.
    if (!data.esemenyek.length) {
      data.esemenyek = esemenyekSzarmaztat(data);
      forrasok.esemenyek = data.esemenyek.length ? 'szarmaztatott' : 'ures';
    }

    if (typeof document !== 'undefined') document.body.classList.remove('betoltes');

    const mintaMod = !eloMod && Object.values(forrasok).some(f => f === 'minta');
    const app = { config, data, hibak, forrasok, eloMod, mintaMod, betoltve: new Date() };
    if (vanBongeszo) global.App = app;
    return app;
  }

  // ===================== Export =====================
  const Naplo = {
    SPREADSHEET_ID, FULEK, CONFIG_DEFAULTS, CACHE_TTL_MS,
    csvToObjects, mezo, szamErtek, szamFormat, idoOra, idoPerc, datumKulcs, hetKulcs,
    hetiTrendSzoveg, trendNyil, configToObject, esemenyekSzarmaztat, bmi, kaloriaCelTeljesult,
    fulUrl, betolt
  };

  global.Naplo = Naplo;
  if (typeof module !== 'undefined' && module.exports) module.exports = Naplo;

})(typeof window !== 'undefined' ? window : globalThis);
