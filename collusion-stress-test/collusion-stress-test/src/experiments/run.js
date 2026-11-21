import { benchmarks } from '../core/market.js';
import { runSimulation } from '../core/simulate.js';
import { analyzeRun } from '../metrics/analyze.js';
import { summarize } from '../metrics/stats.js';
import { evaluate } from '../metrics/findings.js';
import { normalizeConfig, configHash } from './config.js';
import { ENGINE_VERSION } from '../version.js';

const KEYS = ['delta', 'deltaDrift', 'avgPrice', 'premium', 'rigidity', 'dispersion'];
const DEV = ['immediateGain', 'discountedGain', 'rivalCut', 'rivalCutShare', 'punishmentPeriods'];

function summarizeGroup(perSeed, tag) {
  const s = {};
  for (const k of KEYS) s[k] = summarize(perSeed.map((r) => r[k]), tag + k);
  for (const k of DEV) s[k] = summarize(perSeed.map((r) => r.dev[k]), tag + k);
  return s;
}

export function runExperiment(input, onProgress = () => {}) {
  const cfg = normalizeConfig(input);
  const total = cfg.seeds * 2; let done = 0;
  const groups = {};
  for (const [name, specs] of [['test', cfg.agents], ['baseline', cfg.baseline.agents]]) {
    const perSeed = []; let sample = null;
    for (let k = 0; k < cfg.seeds; k++) {
      const sim = runSimulation({ market: cfg.market, agentSpecs: specs, periods: cfg.periods, seed: cfg.baseSeed + k });
      const a = analyzeRun(sim, cfg, k === 0);
      perSeed.push({ seed: cfg.baseSeed + k, ...a.metrics });
      if (k === 0) sample = a.sample;
      onProgress(++done, total);
    }
    groups[name] = { agents: specs, perSeed, summary: summarizeGroup(perSeed, name), sample };
  }
  const result = { engineVersion: ENGINE_VERSION, configHash: configHash(cfg), config: cfg, benchmarks: benchmarks(cfg.market), groups };
  result.findings = evaluate(result);
  return result;
}
