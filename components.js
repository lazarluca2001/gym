/* ==========================================================================
   Napló — components.js : megosztott UI-építők + számítási segédek
   Globálok: UI, Calc  (a Naplo.* segédekre épül)
   ========================================================================== */
(function (global) {
  'use strict';
  const N = global.Naplo;

  // ------------------------------------------------------------------ Calc
  const Calc = {
    n(sor, ...kw) { return N.szamErtek(N.mezo(sor, ...kw)); },
    datum(sor) { return N.mezo(sor, 'dátum'); },
    kulcs(sor) { return N.datumKulcs(this.datum(sor)); },

    // Mai (vagy legutolsó) napi sor
    maiSor(napi, refKulcs) {
      if (!napi || !napi.length) return null;
      if (refKulcs) { const t = napi.find(s => this.kulcs(s) === refKulcs); if (t) return t; }
      return napi[napi.length - 1];
    },
    elozoSor(napi) { return napi && napi.length > 1 ? napi[napi.length - 2] : null; },

    // ISO hét sorai egy referencia-dátumhoz
    hetSorai(sorok, refDatum) {
      const rk = N.hetKulcs(refDatum);
      return (sorok || []).filter(s => N.hetKulcs(this.datum(s)) === rk);
    },
    osszeg(arr) { return arr.reduce((a, b) => a + (b || 0), 0); },
    atlag(arr) { return arr.length ? this.osszeg(arr) / arr.length : 0; },

    napiEdzesPerc(edzes, kulcs) {
      // A napi rész-időtartamok összege (a te per-gyakorlat bejegyzéseidhez).
      return this.osszeg(edzes.filter(e => this.kulcs(e) === kulcs).map(e => N.idoPerc(N.mezo(e, 'időtartam')) || 0));
    },
    napiTancPerc(tanc, kulcs) {
      return this.osszeg(tanc.filter(t => this.kulcs(t) === kulcs).map(t => this.n(t, 'idő') || 0));
    },
    edzesVolumen(edzes, szuroFn) {
      return this.osszeg((edzes || []).filter(szuroFn || (() => true)).map(e =>
        (this.n(e, 'széria') || 0) * (this.n(e, 'ismétlés') || 0) * (this.n(e, 'súly') || 0)));
    },

    // Mai célállapot (a kerthez + heti célokhoz). Kalória DÖNTÉS: deficit.
    maiCelok(app) {
      const { config, data } = app;
      const mai = this.maiSor(data.napi);
      const k = mai ? this.kulcs(mai) : '';
      const edzesPerc = this.napiEdzesPerc(data.edzes, k);
      const tancPerc = this.napiTancPerc(data.tanc, k);
      const viz = mai ? this.n(mai, 'víz') || 0 : 0;
      const lepes = mai ? this.n(mai, 'lépés') || 0 : 0;
      const kaloria = mai ? this.n(mai, 'kalória', 'kcal') : NaN;
      const vanMerleg = mai && !isNaN(this.n(mai, 'testsúly'));
      return {
        edzes: edzesPerc >= config.cel_edzes_perc,
        tanc: tancPerc >= config.cel_tanc_perc,
        viz: viz >= config.cel_viz,
        lepes: lepes >= config.cel_lepes,
        kaloria: N.kaloriaCelTeljesult(kaloria, config.cel_kaloria, config.kaloria_irany),
        merleg: !!vanMerleg,
        ertekek: { edzesPerc, tancPerc, viz, lepes, kaloria, suly: vanMerleg ? this.n(mai, 'testsúly') : NaN }
      };
    }
  };

  // ------------------------------------------------------------------ UI
  const NAV = [
    { href: 'index.html', ic: '🏠', txt: 'Kezdőlap', k: 'kezdolap' },
    { href: 'egeszseg.html', ic: '🌿', txt: 'Egészség', k: 'egeszseg' },
    { href: 'aktivitasok.html', ic: '🏃', txt: 'Aktivitások', k: 'aktivitasok' },
    { href: 'naptar.html', ic: '📅', txt: 'Naptár', k: 'naptar' },
    { href: 'elemzesek.html', ic: '📈', txt: 'Elemzések', k: 'elemzesek' }
  ];

  const UI = {
    maDatum() {
      return new Date().toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    },

    // Sidebar beinjektálása + aktív elem + profil + kert-mini
    sidebar(aktiv, app) {
      const el = document.getElementById('sidebar');
      if (!el) return;
      const cfg = app ? app.config : {};
      el.innerHTML = `
        <button class="nav-toggle" id="navToggle" aria-label="Menü">☰</button>
        <div class="brand"><span class="brand-word">Napló</span><span class="brand-leaf">🌿</span></div>
        <nav class="nav" id="nav">
          ${NAV.map(x => `<a href="${x.href}" class="${x.k === aktiv ? 'active' : ''}"><span class="ic">${x.ic}</span>${x.txt}</a>`).join('')}
        </nav>
        <div class="side-spacer"></div>
        <div class="side-profile">
          <div class="avatar" aria-hidden="true"></div>
          <div><div class="who">${cfg.felhasznalo_nev || 'Napló'}</div><div class="lvl">Szint ${cfg.szint || 1}</div></div>
        </div>
        <a class="side-garden" href="index.html" id="sideGarden">
          <div class="cim">Napi kertem</div>
          <div class="kert-mini" id="kertMini"></div>
          <div class="track"><i id="kertMiniBar" style="width:0%"></i></div>
        </a>`;
      // hamburger
      const t = el.querySelector('#navToggle'), nav = el.querySelector('#nav');
      if (t && nav) t.addEventListener('click', () => nav.classList.toggle('open'));
    },

    topbar(opts) {
      opts = opts || {};
      const el = document.getElementById('topbar');
      if (!el) return;
      el.innerHTML = `
        <span class="datum">${this.maDatum()}</span>
        ${opts.cikluspill || ''}
        <button class="top-btn" aria-label="Naptár">📅</button>
        <button class="top-btn" aria-label="Értesítések">🔔</button>`;
    },

    // Progress gyűrű SVG
    ring(el, { ertek, cel, szin, egyseg, cim, ikon, spark }) {
      const pct = cel > 0 ? Math.min(100, (ertek / cel) * 100) : 0;
      const R = 52, C = 2 * Math.PI * R;
      const dash = (pct / 100) * C;
      const hatra = Math.max(0, cel - ertek);
      el.classList.add('ring-tile');
      el.innerHTML = `
        <div class="top">${ikon ? `<span>${ikon}</span>` : ''}${cim || ''}</div>
        <div class="ring-wrap">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--sage-soft)" stroke-width="10"/>
            <circle cx="60" cy="60" r="${R}" fill="none" stroke="${szin}" stroke-width="10" stroke-linecap="round"
              stroke-dasharray="${dash} ${C}"/>
          </svg>
          <div class="ring-center">
            <div class="v">${N.szamFormat(ertek, egyseg === 'l' ? 1 : 0)}</div>
            <div class="c">/ ${N.szamFormat(cel, egyseg === 'l' ? 1 : 0)}${egyseg ? ' ' + egyseg : ''}</div>
          </div>
        </div>
        <div class="pct" style="color:${szin}">${Math.round(pct)}%</div>
        <div class="note">${hatra > 0 ? 'Még ' + N.szamFormat(hatra, egyseg === 'l' ? 1 : 0) + (egyseg ? ' ' + egyseg : '') : 'Kész ✓'}</div>
        ${spark ? this.sparkHtml(spark, szin) : ''}`;
    },
    sparkHtml(vals, szin) {
      const max = Math.max(1, ...vals);
      return `<div class="spark">${vals.map(v => `<i style="height:${Math.max(3, (v / max) * 34)}px;background:${szin};opacity:.55"></i>`).join('')}</div>`;
    },

    // Progress sáv sor
    bar(el, rows) {
      el.innerHTML = rows.map(r => {
        const pct = r.cel > 0 ? Math.min(100, (r.ertek / r.cel) * 100) : 0;
        return `<div class="bar-row">
          ${r.ikon ? `<span class="ic">${r.ikon}</span>` : ''}
          <span class="lbl">${r.lbl}</span>
          <span class="bar-track"><i style="width:${pct}%;background:${r.szin || 'var(--sage)'}"></i></span>
          <span class="val">${r.val != null ? r.val : N.szamFormat(r.ertek, r.dec || 0) + '/' + N.szamFormat(r.cel, r.dec || 0)}</span>
        </div>`;
      }).join('');
    },

    // Idővonal az eseményekből
    timeline(el, esemenyek) {
      if (!esemenyek || !esemenyek.length) { el.innerHTML = `<div class="empty">Nincs esemény ezen a napon 🌱</div>`; return; }
      const META = global.TIPUS_META || {};
      const sorok = esemenyek.slice().sort((a, b) => (N.mezo(a, 'időpont', 'idő') || '').localeCompare(N.mezo(b, 'időpont', 'idő') || ''));
      el.classList.add('timeline');
      el.innerHTML = sorok.map(e => {
        const tip = (N.mezo(e, 'típus') || 'egyeb').toLowerCase();
        const m = META[tip] || META.egyeb || { ikon: '🌿', szin: 'var(--sage)' };
        return `<div class="tl-row">
          <div class="tl-time">${N.mezo(e, 'időpont', 'idő') || ''}</div>
          <div class="tl-dot"><span class="icon" style="background:${m.szin}22">${m.ikon}</span></div>
          <div class="tl-body"><div class="t">${N.mezo(e, 'cím') || ''}</div><div class="s">${N.mezo(e, 'leírás') || ''}</div></div>
        </div>`;
      }).join('');
    },

    // Mood arcsor
    mood(el, ertek) {
      const arcok = ['😞', '😕', '😐', '🙂', '😊'];
      const akt = Math.round(ertek);
      el.classList.add('mood-row');
      el.innerHTML = arcok.map((a, i) => `<div class="mood-face ${i + 1 === akt ? 'active' : ''}">${a}</div>`).join('');
    },

    empty(el, txt) { el.innerHTML = `<div class="empty">${txt || 'Nincs még adat 🌱'}</div>`; },

    // Minta-mód jelző
    mintaJelzo(app) {
      if (!app.mintaMod) return;
      const d = document.createElement('div');
      d.className = 'minta-jelzo';
      d.innerHTML = `🌿 <b>Mintaadat</b> — tölts fel élő Sheetet a valós adatokért`;
      document.body.appendChild(d);
    }
  };

  global.Calc = Calc;
  global.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
