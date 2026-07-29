/* ==========================================================================
   Napló — charts.js : Chart.js közös beállítások + rajzolók
   Globál: Charts
   ========================================================================== */
(function (global) {
  'use strict';
  const N = global.Naplo;
  function cssVar(name) { return getComputedStyle(document.body).getPropertyValue(name).trim(); }

  function alap() {
    if (!global.Chart) return;
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    Chart.defaults.color = cssVar('--ink-muted');
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.boxWidth = 8;
    Chart.defaults.plugins.tooltip.backgroundColor = cssVar('--ink');
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
  }

  function tengelyek(opts) {
    opts = opts || {};
    return {
      x: { grid: { display: false }, ticks: { color: cssVar('--ink-faint'), font: { size: 11 }, maxTicksLimit: opts.xTicks || 8 } },
      y: {
        grid: { color: cssVar('--border') }, border: { display: false },
        ticks: { color: cssVar('--ink-faint'), font: { size: 11 }, maxTicksLimit: 6, callback: v => N.szamFormat(v, 0) },
        beginAtZero: opts.zero !== false
      }
    };
  }

  const store = {};
  function ujra(id) { if (store[id]) { store[id].destroy(); delete store[id]; } }

  const Charts = {
    alap,
    // Vonal (opc. trendvonallal + kitöltéssel)
    vonal(canvas, { labels, data, szin, fill, trend }) {
      const id = canvas.id; ujra(id);
      const c = szin || cssVar('--sage');
      const ds = [{ data, borderColor: c, backgroundColor: fill ? c + '22' : 'transparent', fill: !!fill, tension: .35, pointRadius: 2, pointBackgroundColor: c, borderWidth: 2 }];
      if (trend) ds.push({ data: trend, borderColor: c, borderDash: [5, 5], borderWidth: 1.5, pointRadius: 0, fill: false });
      store[id] = new Chart(canvas, { type: 'line', data: { labels, datasets: ds }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: tengelyek({ zero: false }) } });
      return store[id];
    },
    // Oszlop (átlag-vonal opcióval)
    oszlop(canvas, { labels, data, szin, atlagVonal }) {
      const id = canvas.id; ujra(id);
      const c = szin || cssVar('--sage');
      const plugins = { legend: { display: false } };
      const ann = [];
      store[id] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ data, backgroundColor: c, borderRadius: 6, maxBarThickness: 26 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins, scales: tengelyek() }
      });
      return store[id];
    },
    // Halmozott oszlop
    halmozott(canvas, { labels, sorozatok }) {
      const id = canvas.id; ujra(id);
      store[id] = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: sorozatok.map(s => ({ label: s.nev, data: s.data, backgroundColor: s.szin, borderRadius: 5, maxBarThickness: 26, stack: 's' })) },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { color: cssVar('--ink-faint'), font: { size: 11 } } }, y: { stacked: true, ...tengelyek().y } } }
      });
      return store[id];
    },
    // Donut
    donut(canvas, { labels, data, szinek }) {
      const id = canvas.id; ujra(id);
      store[id] = new Chart(canvas, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: szinek, borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } }
      });
      return store[id];
    },
    // Kombi: oszlop (bal y) + vonal (jobb y)
    kombi(canvas, { labels, oszlopData, oszlopSzin, vonalData, vonalSzin, jobbCim, balCim }) {
      const id = canvas.id; ujra(id);
      store[id] = new Chart(canvas, {
        data: {
          labels,
          datasets: [
            { type: 'bar', label: balCim, data: oszlopData, backgroundColor: oszlopSzin, borderRadius: 5, maxBarThickness: 22, yAxisID: 'y' },
            { type: 'line', label: jobbCim, data: vonalData, borderColor: vonalSzin, backgroundColor: vonalSzin, tension: .35, pointRadius: 2, borderWidth: 2, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
          scales: {
            x: { grid: { display: false }, ticks: { color: cssVar('--ink-faint'), font: { size: 11 }, maxTicksLimit: 8 } },
            y: { position: 'left', grid: { color: cssVar('--border') }, border: { display: false }, ticks: { color: cssVar('--ink-faint'), callback: v => N.szamFormat(v, 0) } },
            y1: { position: 'right', grid: { display: false }, border: { display: false }, ticks: { color: cssVar('--ink-faint'), callback: v => N.szamFormat(v, 0) } }
          }
        }
      });
      return store[id];
    },
    // Kettős vonal (két y-tengely)
    ketVonal(canvas, { labels, aData, aSzin, aCim, bData, bSzin, bCim }) {
      const id = canvas.id; ujra(id);
      store[id] = new Chart(canvas, {
        type: 'line',
        data: {
          labels, datasets: [
            { label: aCim, data: aData, borderColor: aSzin, backgroundColor: aSzin, tension: .35, pointRadius: 2, borderWidth: 2, yAxisID: 'y' },
            { label: bCim, data: bData, borderColor: bSzin, backgroundColor: bSzin, tension: .35, pointRadius: 2, borderWidth: 2, yAxisID: 'y1' }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } },
          scales: {
            x: { grid: { display: false }, ticks: { color: cssVar('--ink-faint'), font: { size: 11 }, maxTicksLimit: 8 } },
            y: { position: 'left', grid: { color: cssVar('--border') }, border: { display: false }, ticks: { color: aSzin } },
            y1: { position: 'right', grid: { display: false }, border: { display: false }, ticks: { color: bSzin } }
          }
        }
      });
      return store[id];
    },
    // Radar
    radar(canvas, { labels, data, szin }) {
      const id = canvas.id; ujra(id);
      const c = szin || cssVar('--sage');
      store[id] = new Chart(canvas, {
        type: 'radar',
        data: { labels, datasets: [{ data, borderColor: c, backgroundColor: c + '33', pointBackgroundColor: c, borderWidth: 2 }] },
        options: {
          responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { r: { min: 0, max: 1, grid: { color: cssVar('--border') }, angleLines: { color: cssVar('--border') }, pointLabels: { color: cssVar('--ink-muted'), font: { size: 12 } }, ticks: { display: false } } }
        }
      });
      return store[id];
    }
  };

  global.Charts = Charts;
})(typeof window !== 'undefined' ? window : globalThis);
