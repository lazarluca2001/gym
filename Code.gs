/**
 * Súlynapló + Edzés és tánc – Google Táblázat szinkron
 *
 * 1. Írj be egy saját titkos szót a TOKEN-hez (ugyanezt kell majd az appba is beírni).
 * 2. Telepítés → Új telepítés → Típus: Webes alkalmazás
 *    Végrehajtás mint: Én · Hozzáférés: Bárki → Telepítés
 * 3. A kapott „Webes alkalmazás URL”-t másold be az appba (Adatok és szinkron).
 *
 * A „_adatok” lapot ne szerkeszd kézzel – ebből dolgozik az app.
 * A „Súly”, „Edzés” és „Tánc” lapok minden mentéskor újragenerálódnak, ezeket nyugodtan nézegetheted.
 */
const TOKEN = 'ide-írd-a-titkos-szót';

const DATA_SHEET = '_adatok';
const COLLECTIONS = ['workouts', 'dance', 'weighins', 'settings'];
const DAYS = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'hibás kérés' }); }
  if (String(body.token || '') !== TOKEN) return out({ ok: false, error: 'hibás titkos szó' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const map = readMap();
    const ops = Array.isArray(body.ops) ? body.ops : [];
    ops.forEach(function (op) {
      if (COLLECTIONS.indexOf(op.c) < 0 || !op.id) return;
      const k = op.c + '/' + op.id;
      if (op.op === 'set') map[k] = [op.c, String(op.id), JSON.stringify(op.d), new Date()];
      else if (op.op === 'del') delete map[k];
    });
    if (ops.length) { writeMap(map); rebuildViews(map); }
    return out({ ok: true, data: toData(map) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return out({ ok: true, info: 'A napló szinkron működik (3. verzió).' });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet(name, header) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  if (header) {
    sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#cfe2f3');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readMap() {
  const sh = sheet(DATA_SHEET, ['gyűjtemény', 'azonosító', 'adat (json)', 'módosítva']);
  const map = {};
  const last = sh.getLastRow();
  if (last < 2) return map;
  sh.getRange(2, 1, last - 1, 4).getValues().forEach(function (r) {
    if (r[0] && r[1] !== '') map[r[0] + '/' + r[1]] = [r[0], String(r[1]), r[2], r[3]];
  });
  return map;
}

function writeMap(map) {
  const sh = sheet(DATA_SHEET, ['gyűjtemény', 'azonosító', 'adat (json)', 'módosítva']);
  const rows = Object.keys(map).sort().map(function (k) { return map[k]; });
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
  if (rows.length) {
    sh.getRange(2, 2, rows.length, 1).setNumberFormat('@');
    sh.getRange(2, 1, rows.length, 4).setValues(rows);
  }
}

function toData(map) {
  const data = { workouts: {}, dance: {}, weighins: {}, settings: {} };
  Object.keys(map).forEach(function (k) {
    const r = map[k];
    try { data[r[0]][r[1]] = JSON.parse(r[2]); } catch (err) {}
  });
  return data;
}

function huDate(iso) {
  const p = iso.split('-');
  return p[0] + '.' + p[1] + '.' + p[2] + '.';
}
function dayName(iso) {
  const p = iso.split('-').map(Number);
  return DAYS[new Date(p[0], p[1] - 1, p[2]).getDay()];
}

function rebuildViews(map) {
  const data = toData(map);

  const wHeader = ['Dátum', 'Nap', 'Testsúly (kg)', 'Bevitt kalória (kcal)', 'Fehérje (g)', 'Szénhidrát (g)', 'Zsír (g)', 'Derék (cm)', 'Menstruáció'];
  const wsh = sheet('Súly', wHeader);
  const wRows = Object.keys(data.weighins).sort().map(function (d) {
    const x = data.weighins[d];
    return [huDate(d), dayName(d), num(x.kg), num(x.kcal), num(x.p), num(x.c), num(x.f), num(x.waist), x.period ? true : false];
  });
  fill(wsh, wHeader.length, wRows);
  if (wRows.length) wsh.getRange(2, 9, wRows.length, 1).insertCheckboxes();

  const gymHeader = ['Dátum', 'Nap', 'Gyakorlat', 'Széria (hányadik)', 'Ismétlés', 'Súly (kg)', 'Volumen (kg)', 'Kész', 'RIR (gyakorlat)'];
  const gym = sheet('Edzés', gymHeader);
  const gymRows = [];
  Object.keys(data.workouts).sort().forEach(function (d) {
    (data.workouts[d].items || []).forEach(function (it) {
      let sets = Array.isArray(it.setsArr) && it.setsArr.length ? it.setsArr : null;
      if (!sets) { sets = []; for (let k = 0; k < Math.max(1, it.sets || 1); k++) sets.push({ reps: it.reps, kg: it.kg, done: it.done }); }
      sets.forEach(function (st, k) {
        const vol = (st.reps || 0) * (st.kg || 0);
        gymRows.push([huDate(d), dayName(d), it.ex || '', k + 1, num(st.reps), num(st.kg), vol || '', st.done ? true : false, k === sets.length - 1 ? num(it.rir) : '']);
      });
    });
  });
  fill(gym, gymHeader.length, gymRows);
  if (gymRows.length) gym.getRange(2, 8, gymRows.length, 1).insertCheckboxes();

  const danceHeader = ['Dátum', 'Nap', 'Típus', 'Óra típusa', 'Időtartam (perc)', 'Intenzitás (1-5)', 'Hol'];
  const dance = sheet('Tánc', danceHeader);
  const danceRows = [];
  Object.keys(data.dance).sort().forEach(function (d) {
    (data.dance[d].items || []).forEach(function (x) {
      danceRows.push([huDate(d), dayName(d), x.kind === 'buli' ? 'Buli' : 'Óra',
        x.kind === 'buli' ? '' : (x.sub === 'gyakorlas' ? 'Gyakorlás' : 'Technika'),
        num(x.min), num(x.intensity), x.note || '']);
    });
  });
  fill(dance, danceHeader.length, danceRows);
}

function num(v) { return typeof v === 'number' ? v : ''; }

function fill(sh, width, rows) {
  const last = sh.getLastRow();
  if (last > 1) {
    const r = sh.getRange(2, 1, last - 1, width);
    r.clearContent(); r.clearDataValidations();
  }
  if (rows.length) {
    sh.getRange(2, 1, rows.length, 1).setNumberFormat('@');
    sh.getRange(2, 1, rows.length, width).setValues(rows);
  }
}
