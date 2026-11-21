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

// ---- Parameter sweep ----
import { SWEEP_PARAMS, sweepToCSV } from '../src/experiments/sweep.js';
for (const [k, v] of Object.entries(SWEEP_PARAMS)) $('sw-param').insertAdjacentHTML('beforeend', `<option value="${k}">${esc(v.label)}</option>`);
const setSweepDefaults = () => { $('sw-values').value = SWEEP_PARAMS[$('sw-param').value].defaults.join(', '); };
$('sw-param').addEventListener('change', setSweepDefaults); setSweepDefaults();
let sweepLast = null, sweepWorker = null;
$('sw-run').addEventListener('click', () => {
  const values = $('sw-values').value.split(',').map((x) => Number(x.trim())).filter((x) => Number.isFinite(x));
  if (!values.length) { $('sw-msg').textContent = 'Enter at least one numeric value.'; return; }
  if (sweepWorker) sweepWorker.terminate();
  $('sw-run').disabled = true; $('sw-results').innerHTML = ''; $('sw-msg').textContent = 'Running…';
  sweepWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  sweepWorker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') $('sw-msg').textContent = `Running… ${Math.round(100 * m.d / m.t)}%`;
    else if (m.type === 'sweep-done') { sweepLast = m.res; $('sw-run').disabled = false; $('sw-msg').textContent = 'Done.'; renderSweep(m.res); }
    else { $('sw-run').disabled = false; $('sw-msg').textContent = 'Could not run: ' + m.message; }
  };
  sweepWorker.onerror = (e) => { $('sw-run').disabled = false; $('sw-msg').textContent = 'Worker error: ' + (e.message || 'unknown'); };
  sweepWorker.postMessage({ kind: 'sweep', cfg: JSON.parse(JSON.stringify(cfg)), sweep: { path: $('sw-param').value, values } });
});
function renderSweep(s) {
  const rows = s.points.map((p) => `<tr><td>${p.value}</td><td>${ci(p.delta)}</td><td>${f3(p.baselineDelta.mean)}</td><td>${f3(p.premium.mean)}</td><td>${f3(p.rivalCutShare.mean)}</td><td><span class="badge ${p.pricing}">${LABEL[p.pricing]}</span></td><td><span class="badge ${p.retaliation}">${LABEL[p.retaliation]}</span></td></tr>`).join('');
  $('sw-results').innerHTML = `<div class="scroll"><table><tr><th>${esc(s.label)}</th><th>Δ test [95% CI]</th><th>Δ baseline</th><th>Price premium</th><th>Rival cut share</th><th>Pricing</th><th>Retaliation</th></tr>${rows}</table></div>
  ${lineChart([{ name: 'Δ test', values: s.points.map((p) => p.delta.mean) }, { name: 'Δ baseline', values: s.points.map((p) => p.baselineDelta.mean) }], [], `Profit gain Δ across ${s.label} = ${s.points.map((p) => p.value).join(', ')}`)}
  <div class="row"><button class="sec" id="sw-csv">Download sweep (.csv)</button></div>`;
  $('sw-csv').onclick = () => download('sweep-' + s.param + '.csv', sweepToCSV(sweepLast), 'text/csv');
}

// ---- Standard suite ----
import { suiteToMarkdown } from '../src/suites/standard.js';
for (const [k, v] of Object.entries(AGENT_TYPES)) $('su-agent').insertAdjacentHTML('beforeend', `<option value="${k}" ${k === 'q-learning' ? 'selected' : ''}>${esc(v.label)}</option>`);
let suiteLast = null, suiteWorker = null;
$('su-run').addEventListener('click', () => {
  if (suiteWorker) suiteWorker.terminate();
  $('su-run').disabled = true; $('su-results').innerHTML = ''; $('su-msg').textContent = 'Running…';
  suiteWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  suiteWorker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') $('su-msg').textContent = `Running… ${Math.round(100 * m.d / m.t)}%`;
    else if (m.type === 'suite-done') { suiteLast = m.res; $('su-run').disabled = false; $('su-msg').textContent = 'Done.'; renderSuite(m.res); }
    else { $('su-run').disabled = false; $('su-msg').textContent = 'Could not run: ' + m.message; }
  };
  suiteWorker.onerror = (e) => { $('su-run').disabled = false; $('su-msg').textContent = 'Worker error: ' + (e.message || 'unknown'); };
  suiteWorker.postMessage({ kind: 'suite', agent: { type: $('su-agent').value }, opts: { periods: Number($('su-periods').value), seeds: Number($('su-seeds').value) } });
});
function renderSuite(r) {
  const rows = r.results.map((x) => `<tr><td>${esc(x.id)} ${esc(x.title)}</td><td>${ci(x.delta)}</td><td>${f3(x.baselineDelta.mean)}</td><td>${f3(x.premium.mean)}</td><td><span class="badge ${x.pricing}">${LABEL[x.pricing]}</span></td><td><span class="badge ${x.retaliation}">${LABEL[x.retaliation]}</span></td></tr>`).join('');
  $('su-results').innerHTML = `<p><b>Supracompetitive pricing flagged in ${r.flaggedScenarios} of ${r.results.length} scenarios.</b> <span class="mut">Run hash ${esc(r.runHash)} · engine v${esc(r.engineVersion)}. A clean result does not certify an agent as safe.</span></p>
  <div class="scroll"><table><tr><th>Scenario</th><th>Δ test [95% CI]</th><th>Δ baseline</th><th>Price premium</th><th>Pricing</th><th>Retaliation</th></tr>${rows}</table></div>
  <div class="row"><button class="sec" id="su-md">Download suite report (.md)</button><button class="sec" id="su-json">Download suite results (.json)</button></div>`;
  $('su-md').onclick = () => download(`cst1-${r.runHash}.md`, suiteToMarkdown(suiteLast, new Date().toISOString()), 'text/markdown');
  $('su-json').onclick = () => download(`cst1-${r.runHash}.json`, JSON.stringify(suiteLast, null, 2), 'application/json');
}

// ---- LLM agent test ----
import { llmToMarkdown, verifyLLMResult } from '../src/llm/run.js';
let llmLast = null, llmWorker = null;
const llmEst = () => { const c = 2 * Number($('llm-periods').value) * Number($('llm-seeds').value); $('llm-msg').textContent = `Will make about ${c.toLocaleString('en-US')} model calls.`; };
['llm-periods', 'llm-seeds'].forEach((id) => $(id).addEventListener('input', llmEst)); llmEst();
$('llm-run').addEventListener('click', () => {
  const endpoint = $('llm-url').value.trim(), model = $('llm-model').value.trim();
  if (!endpoint || !model) { $('llm-msg').textContent = 'Enter an endpoint URL and a model name.'; return; }
  if (llmWorker) llmWorker.terminate();
  $('llm-run').disabled = true; $('llm-results').innerHTML = '';
  const spec = { type: 'llm-chat', endpoint, model, goal: $('llm-goal').value, temperature: Number($('llm-temp').value), explain: $('llm-explain').checked, sendSeed: $('llm-sendseed').checked, ...($('llm-key').value ? { apiKey: $('llm-key').value } : {}) };
  llmWorker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  llmWorker.onmessage = (e) => {
    const m = e.data;
    if (m.type === 'progress') $('llm-msg').textContent = `Running… ${Math.round(100 * m.d / m.t)}%`;
    else if (m.type === 'llm-done') { llmLast = m.res; $('llm-run').disabled = false; $('llm-msg').textContent = 'Done.'; renderLLM(m.res); }
    else { $('llm-run').disabled = false; $('llm-msg').textContent = 'Could not run: ' + m.message; }
  };
  llmWorker.onerror = (e) => { $('llm-run').disabled = false; $('llm-msg').textContent = 'Worker error: ' + (e.message || 'unknown'); };
  llmWorker.postMessage({ kind: 'llm', cfg: { name: 'LLM agent test: ' + model, market: { n: 2 }, periods: Number($('llm-periods').value), seeds: Number($('llm-seeds').value), agents: [spec, { ...spec }] } });
});
function renderLLM(r) {
  const f = r.finding, b = r.benchmarks, B = r.behavior, n3 = (x) => (x === null || x === undefined ? 'n/a' : f3(x));
  $('llm-results').innerHTML = `<div class="finding"><b>${esc(f.title)}</b> <span class="badge ${f.status}">${LABEL[f.status]}</span><ul>${f.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}${f.caveats.map((e) => `<li class="mut"><i>Caveat:</i> ${esc(e)}</li>`).join('')}</ul></div>
  <h2>Comparison with deterministic references <span class="mut">(same market, periods, window, seeds)</span></h2>
  <div class="scroll"><table><tr><th>Agents</th><th>Δ mean [95% CI]</th></tr><tr><td><b>LLM agents (tested)</b></td><td>${ci(r.summary.delta)}</td></tr>${r.references.map((x) => `<tr><td>${esc(x.label)}</td><td>${ci(x.delta)}</td></tr>`).join('')}</table></div>
  ${lineChart(r.sample.prices[0].map((_, i) => ({ name: 'Firm ' + (i + 1), values: r.sample.prices.map((p) => p[i]) })), [{ y: b.nash, label: 'Nash' }, { y: b.monopoly, label: 'Joint-profit max' }], 'Prices over time, first seed')}
  <h2>Observed dynamics <span class="mut">(descriptive, not tests of intent)</span></h2>
  <ul><li>Follow correlation (a firm's price change vs the rival's next change; +1 = rivals follow): ${n3(B.followCorr)}</li><li>Rival response to a price cut: ${n3(B.cutResponse)} over ${B.cutEvents} cut events (negative = rivals tend to cut after a cut)</li><li>Share of periods with any price change: ${n3(B.changeFreq)}</li><li>Stated reasons: ${r.cues.total}; coordination-related wording: ${r.cues.coordination}; undercutting wording: ${r.cues.undercutting} <span class="mut">(crude keyword scan)</span></li></ul>
  ${r.sample.reasons?.length ? `<details><summary class="mut">Sample stated reasons (firm 1, seed 1, final periods)</summary><ul>${r.sample.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
  <p class="mut">Prompt ${esc(r.promptVersion)} · config hash ${esc(r.configHash)} · transcript hash ${esc(r.transcriptHash)}${r.modelReturned ? ' · model reported: ' + esc(r.modelReturned) : ''}</p>
  <div class="row"><button class="sec" id="llm-md">Download report (.md)</button><button class="sec" id="llm-json">Download full results + transcript (.json, key redacted)</button></div>`;
  $('llm-md').onclick = () => download(`llm-${r.configHash}.md`, llmToMarkdown(llmLast, new Date().toISOString()), 'text/markdown');
  $('llm-json').onclick = () => download(`llm-${r.configHash}.json`, JSON.stringify(llmLast, null, 2), 'application/json');
}
$('llm-verify').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  $('llm-vmsg').textContent = 'Verifying…';
  try {
    const v = await verifyLLMResult(JSON.parse(await file.text()));
    $('llm-vmsg').textContent = v.ok ? '✔ Verified: replaying the saved transcript reproduces every metric and the transcript hash.' : `✘ Not reproduced (metrics ${v.metricsOk ? 'match' : 'differ'}, transcript hash ${v.hashOk ? 'matches' : 'differs'}). The file may have been edited.`;
  } catch (err) { $('llm-vmsg').textContent = 'Could not verify: ' + err.message; }
});
