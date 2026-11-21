const W = 640, H = 220, M = { l: 48, r: 12, t: 12, b: 24 };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const COLORS = ['#1f77b4', '#d62728', '#2ca02c', '#9467bd'];

// series: [{name, values}], refs: [{y, label}], x labels: xlabel
export function lineChart(series, refs = [], xlabel = '') {
  const all = series.flatMap((s) => s.values).concat(refs.map((r) => r.y));
  let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo || 1) * 0.08; lo -= pad; hi += pad;
  const len = Math.max(...series.map((s) => s.values.length));
  const X = (i) => M.l + (i / Math.max(1, len - 1)) * (W - M.l - M.r), Y = (v) => H - M.b - ((v - lo) / (hi - lo)) * (H - M.t - M.b);
  let g = '';
  for (let k = 0; k <= 4; k++) { const v = lo + ((hi - lo) * k) / 4; g += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" opacity=".12"/><text x="${M.l - 4}" y="${Y(v) + 4}" font-size="10" text-anchor="end" fill="currentColor">${v.toFixed(2)}</text>`; }
  for (const r of refs) g += `<line x1="${M.l}" x2="${W - M.r}" y1="${Y(r.y)}" y2="${Y(r.y)}" stroke="currentColor" stroke-dasharray="5 4" opacity=".6"/><text x="${W - M.r}" y="${Y(r.y) - 3}" font-size="10" text-anchor="end" fill="currentColor">${esc(r.label)}</text>`;
  series.forEach((s, k) => { g += `<polyline fill="none" stroke="${COLORS[k % 4]}" stroke-width="1.8" points="${s.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>`; });
  const legend = series.map((s, k) => `<span style="color:${COLORS[k % 4]}">■</span> ${esc(s.name)}`).join(' &nbsp; ');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(xlabel)}"><g color="currentColor">${g}</g><text x="${W / 2}" y="${H - 4}" font-size="10" text-anchor="middle" fill="currentColor">${esc(xlabel)}</text></svg><div class="mut">${legend}</div>`;
}
