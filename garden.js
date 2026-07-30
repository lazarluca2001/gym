/* ==========================================================================
   Napló — garden.js : "Napi kertem" állapotgép (signature elem)
   0–6 szint a mai célteljesítésből. Nyugtató, nem büntető.
   Globálok: Garden, TIPUS_META
   ========================================================================== */
(function (global) {
  'use strict';

  // Esemény-típus → ikon/szín (egy helyen módosítható; itt is használjuk a jelvényekhez)
  global.TIPUS_META = {
    edzes:   { ikon: '🏋️', szin: 'var(--edzes)', jelveny: '💪' },
    tanc:    { ikon: '💃', szin: 'var(--tanc)', jelveny: '💃' },
    merleg:  { ikon: '⚖️', szin: 'var(--merleg)', jelveny: '⚖️' },
    viz:     { ikon: '💧', szin: 'var(--viz)', jelveny: '💧' },
    lepes:   { ikon: '👟', szin: 'var(--lepes)', jelveny: '👟' },
    kaloria: { ikon: '🔥', szin: 'var(--kaloria)', jelveny: '🔥' },
    jegyzet: { ikon: '📋', szin: 'var(--sage)', jelveny: '📋' },
    party:   { ikon: '🎉', szin: 'var(--menstrual)', jelveny: '🎉' },
    egyeb:   { ikon: '🌿', szin: 'var(--sage)', jelveny: '🌿' }
  };

  const CELSOR = ['edzes', 'tanc', 'viz', 'lepes', 'kaloria', 'merleg'];
  const UZENET = [
    'Kezdd egy apró lépéssel — a kerted várja. 🌱',
    'Egy csíra kibújt. Szép kezdés!',
    'Nő a hajtás — jó úton jársz.',
    'Szárba szökken. Csak így tovább!',
    'Formálódik a bonsaid. Erős nap.',
    'Majdnem teljes a kert — remek munka! 🌿',
    'Virágzó kert. Ma mindent megtettél magadért. 💚'
  ];

  // Kis SVG bonsai, ami a szinttel gazdagodik
  function bonsaiSvg(szint) {
    const zold = 'var(--sage)', zold2 = 'var(--sage-deep)', tal = '#b98a5e', fold = '#7a5a3c';
    const lomb = (cx, cy, r, o = 1) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${zold}" opacity="${o}"/>`;
    let torzs = '', lombok = '', extra = '';
    if (szint >= 1) torzs += `<rect x="86" y="78" width="8" height="34" rx="4" fill="${fold}"/>`; // csíra/szár
    if (szint >= 2) torzs = `<path d="M90 112 C 90 96, 80 90, 78 80" stroke="${tal}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    if (szint >= 3) { torzs += `<path d="M90 112 C 92 96, 104 92, 110 82" stroke="${tal}" stroke-width="6" fill="none" stroke-linecap="round"/>`; lombok += lomb(76, 74, 12) + lomb(112, 76, 12); }
    if (szint >= 4) { lombok += lomb(94, 60, 18) + lomb(70, 66, 13) + lomb(118, 68, 13); }
    if (szint >= 5) { lombok += lomb(94, 50, 20, .95) + lomb(64, 60, 12) + lomb(126, 62, 12); }
    if (szint >= 5) extra += `<circle cx="86" cy="54" r="3" fill="#e6a6b0"/><circle cx="104" cy="46" r="3" fill="#e6a6b0"/><circle cx="98" cy="62" r="3" fill="#f0c3a0"/>`;
    if (szint >= 6) extra += `<circle cx="46" cy="118" r="7" fill="#9a9a86"/><rect x="132" y="104" width="10" height="20" rx="2" fill="#8a8a76"/><rect x="130" y="100" width="14" height="6" rx="2" fill="#9a9a86"/>`;
    if (szint === 0) torzs = `<circle cx="90" cy="104" r="3" fill="${fold}"/>`; // mag
    return `<svg class="bonsai" viewBox="0 0 180 150" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Napi kertem, ${szint}/6 cél">
      <ellipse cx="90" cy="140" rx="60" ry="8" fill="#00000010"/>
      <path d="M52 112 h76 l-8 20 a6 6 0 0 1 -6 4 h-42 a6 6 0 0 1 -6 -4 z" fill="${tal}"/>
      <ellipse cx="90" cy="112" rx="38" ry="7" fill="${fold}"/>
      ${lombok}${torzs}${extra}
    </svg>`;
  }

  const Garden = {
    // Kimenet: {szint, teljesitett, celok, uzenet}
    compute(celallapot) {
      const celok = {};
      CELSOR.forEach(k => celok[k] = !!celallapot[k]);
      const teljesitett = CELSOR.filter(k => celok[k]).length;
      return { szint: teljesitett, teljesitett, celok, uzenet: UZENET[teljesitett] };
    },

    // Nagy renderelés a Kezdőlapra
    render(el, allapot) {
      const M = global.TIPUS_META;
      el.innerHTML = `
        <div class="stage">
          ${bonsaiSvg(allapot.szint)}
          <div class="badges">
            ${CELSOR.map(k => `<div class="gbadge ${allapot.celok[k] ? 'on' : ''}" title="${k}">${M[k].jelveny}</div>`).join('')}
          </div>
          <div class="muted" style="text-align:center">Ma ${allapot.teljesitett}/6 cél teljesítve</div>
        </div>`;
    },

    // Sidebar mini
    renderMini(app) {
      const el = document.getElementById('kertMini');
      const bar = document.getElementById('kertMiniBar');
      if (!el) return;
      const a = this.compute(global.Calc.maiCelok(app));
      el.innerHTML = bonsaiSvg(a.szint).replace('width="180"', '');
      if (bar) bar.style.width = (a.teljesitett / 6 * 100) + '%';
    }
  };

  global.Garden = Garden;
})(typeof window !== 'undefined' ? window : globalThis);
