import { PRESETS } from '../src/experiments/presets.js';
import { AGENT_TYPES } from '../src/agents/index.js';
import { toJSON, toCSV, toMarkdown } from '../src/reporting/report.js';
import { lineChart } from './charts.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const f3 = (x) => Number(x).toFixed(3);
const ci = (s) => `${f3(s.mean)} <span class="mut">[${f3(s.ci[0])}, ${f3(s.ci[1])}]</span>`;
const LABEL = { flagged: 'Flagged for investigation', 'not-flagged': 'Not flagged', inconclusive: 'Inconclusive', informational: 'Informational' };

let cfg = null, last = null, worker = null;

function agentList(n, existing) {
  return Array.from({ length: n }, (_, i) => existing?.[i] ?? { type: 'nash' });
}
function syncForm() {
  $('n').value = cfg.market.n ?? 2; $('mu').value = cfg.market.mu ?? 0.25; $('a0').value = cfg.market.a0 ?? 0;
  $('periods').value = cfg.periods; $('seeds').value = cfg.seeds; $('baseSeed').value = cfg.baseSeed ?? 1;
  $('agents').innerHTML = cfg.agents.map((a, i) => `<div><label>Firm ${i + 1} agent</label><select data-i="${i}">${
    Object.entries(AGENT_TYPES).map(([k, v]) => `<option value="${k}" ${k === a.type ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div>`).join('');
  $('agents').querySelectorAll('select').forEach((s) => s.addEventListener('change', () => { cfg.agents[+s.dataset.i] = { type: s.value }; syncJson(); }));
  syncJson();
}
function syncJson() { $('json').value = JSON.stringify(cfg, null, 2); $('jsonerr').textContent = ''; }
function loadPreset(key) { cfg = JSON.parse(JSON.stringify(PRESETS[key])); syncForm(); }

for (const [k, v] of Object.entries(PRESETS)) $('preset').insertAdjacentHTML('beforeend', `<option value="${k}">${esc(v.name)}</option>`);
$('preset').addEventListener('change', () => loadPreset($('preset').value));
$('n').addEventListener('change', () => {
  const n = +$('n').value; cfg.market.n = n; cfg.agents = agentList(n, cfg.agents);
  if (cfg.baseline) delete cfg.baseline; syncForm();
});
for (const [id, apply] of [['mu', (v) => (cfg.market.mu = v)], ['a0', (v) => (cfg.market.a0 = v)], ['periods', (v) => (cfg.periods = v)], ['seeds', (v) => (cfg.seeds = v)], ['baseSeed', (v) => (cfg.baseSeed = v)]]) {
  $(id).addEventListener('change', () => { const v = Number($(id).value); if (Number.isFinite(v)) { apply(v); if (id === 'periods') delete cfg.window; syncJson(); } });
}
$('loadjson').addEventListener('click', () => {
  try { const c = JSON.parse($('json').value); if (!c.market) c.market = {}; c.market.n ??= c.agents?.length ?? 2; c.agents = agentList(c.market.n, c.agents); cfg = c; syncForm(); }
  catch (e) { $('jsonerr').textContent = 'Invalid JSON: ' + e.message; }
});

$('run').addEventListener('click', () => {
  if (worker) worker.terminate();
  $('run').disabled = true; $('results').innerHTML = ''; $('prog').style.width = '0'; $('progtxt').textContent = 'Starting…';
  try { worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' }); }
  catch (e) { $('progtxt').textContent = 'This browser cannot run module workers: ' + e.message; $('run').disabled = false; return; }
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') { $('prog').style.width = (100 * m.d / m.t) + '%'; $('progtxt').textContent = `Completed ${m.d} of ${m.t} runs`; }
    else if (m.type === 'done') { last = m.res; $('run').disabled = false; $('progtxt').textContent = 'Done.'; render(m.res); }
    else { $('run').disabled = false; $('progtxt').textContent = ''; $('results').innerHTML = `<div class="panel"><b>Could not run:</b> ${esc(m.message)}</div>`; }
  };
  worker.onerror = (e) => { $('run').disabled = false; $('progtxt').textContent = 'Worker error: ' + (e.message || 'unknown'); };
  worker.postMessage(JSON.parse(JSON.stringify(cfg)));
});

function download(name, text, type) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

function render(r) {
  const S = r.groups.test.summary, B = r.groups.baseline.summary, s = r.groups.test.sample, b = r.benchmarks;
  const slug = r.configHash;
  const rows = [['Profit gain Δ (0 = Nash, 1 = joint-profit max)', 'delta'], ['Average price', 'avgPrice'], ['Price premium over Nash', 'premium'], ['Share of periods with no price change', 'rigidity'], ['Max–min price gap', 'dispersion'], ['Rival price cut after a deviation', 'rivalCut'], ['Discounted gain from deviating', 'discountedGain']];
  $('results').innerHTML = `
  <h2>Findings</h2>
  ${r.findings.map((f) => `<div class="finding"><b>${esc(f.title)}</b> <span class="badge ${f.status}">${LABEL[f.status]}</span><ul>${f.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}${f.caveats.map((e) => `<li class="mut"><i>Caveat:</i> ${esc(e)}</li>`).join('')}</ul></div>`).join('')}
  <h2>Metrics <span class="mut">(mean [95% bootstrap CI over ${r.config.seeds} seeds], final ${r.config.window} periods)</span></h2>
  <div class="scroll"><table><tr><th>Metric</th><th>Test agents</th><th>Competitive baseline</th></tr>${rows.map(([l, k]) => `<tr><td>${l}</td><td>${ci(S[k])}</td><td>${ci(B[k])}</td></tr>`).join('')}</table></div>
  <p class="mut">Benchmarks: Nash price ${f3(b.nash)}; joint-profit-maximizing price ${f3(b.monopoly)}. Engine v${esc(r.engineVersion)}, config hash ${esc(r.configHash)}.</p>
  <h2>Price paths (seed ${r.config.baseSeed})</h2>
  ${lineChart([{ name: 'Average price per bucket of ' + s.trajectoryBucket + ' periods', values: s.trajectory }], [{ y: b.nash, label: 'Nash' }, { y: b.monopoly, label: 'Joint-profit max' }], 'Learning trajectory (time →)')}
  ${lineChart(s.lastPrices[0].map((_, i) => ({ name: 'Firm ' + (i + 1), values: s.lastPrices.map((p) => p[i]) })), [{ y: b.nash, label: 'Nash' }, { y: b.monopoly, label: 'Joint-profit max' }], 'Final 100 periods')}
  ${lineChart([{ name: 'Rival price, undisturbed', values: s.deviation.control.rival }, { name: 'Rival price, after firm 1 deviates', values: s.deviation.deviation.rival }, { name: 'Firm 1 price, after deviating', values: s.deviation.deviation.deviator }], [{ y: b.nash, label: 'Nash' }], 'Forced-deviation test (period 1 = deviation)')}
  <div class="row"><button class="sec" id="x-md">Download report (.md)</button><button class="sec" id="x-json">Download results (.json)</button><button class="sec" id="x-csv">Download per-seed data (.csv)</button></div>`;
  $('x-md').onclick = () => download(`report-${slug}.md`, toMarkdown(last, new Date().toISOString()), 'text/markdown');
  $('x-json').onclick = () => download(`results-${slug}.json`, toJSON(last), 'application/json');
  $('x-csv').onclick = () => download(`seeds-${slug}.csv`, toCSV(last), 'text/csv');
}

loadPreset('positive-control');
$('preset').value = 'positive-control';
