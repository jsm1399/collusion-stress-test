// Parameter sweep: reruns the full experiment (test + baseline, all seeds) for each value.
import { runExperiment } from './run.js';
import { normalizeConfig } from './config.js';

export const SWEEP_PARAMS = {
  'market.mu': { label: 'Substitutability μ', defaults: [0.1, 0.25, 0.5, 1] },
  'market.a0': { label: 'Outside-option value a₀', defaults: [-0.5, 0, 0.5, 1] },
  'market.n': { label: 'Number of firms', defaults: [2, 3] },
  'agent.alpha': { label: 'Q-learning rate α', defaults: [0.05, 0.15, 0.3] },
  'agent.beta': { label: 'Q-learning exploration decay β', defaults: [0.00002, 0.00005, 0.0001] },
  periods: { label: 'Periods per run', defaults: [20000, 50000, 200000] },
};

function apply(cfg, path, v) {
  const c = JSON.parse(JSON.stringify(cfg));
  if (!(path in SWEEP_PARAMS)) throw new Error(`Unknown sweep parameter "${path}"`);
  if (path === 'periods') { c.periods = v; delete c.window; }
  else if (path === 'market.n') {
    c.market = { ...c.market, n: v }; c.agents = Array.from({ length: v }, (_, i) => c.agents[Math.min(i, c.agents.length - 1)]); delete c.baseline;
  } else if (path.startsWith('market.')) c.market = { ...c.market, [path.slice(7)]: v };
  else {
    const key = path.slice(6);
    if (!c.agents.some((a) => a.type === 'q-learning')) throw new Error(`Sweeping ${path} needs at least one q-learning agent`);
    c.agents = c.agents.map((a) => (a.type === 'q-learning' ? { ...a, [key]: v } : a));
  }
  return c;
}

export function runSweep(base, { path, values }, onProgress = () => {}) {
  if (!Array.isArray(values) || !values.length || values.length > 8) throw new Error('Provide 1 to 8 sweep values');
  const points = [];
  values.forEach((v, k) => {
    const r = runExperiment(apply(normalizeConfig(base), path, v), (d, t) => onProgress(k * 1000 + (1000 * d) / t, values.length * 1000));
    const S = r.groups.test.summary, st = (id) => r.findings.find((f) => f.id === id).status;
    points.push({
      value: v, configHash: r.configHash, delta: S.delta, baselineDelta: r.groups.baseline.summary.delta, premium: S.premium,
      rivalCutShare: S.rivalCutShare, discountedGain: S.discountedGain, rigidity: S.rigidity,
      pricing: st('supracompetitive-pricing'), retaliation: st('retaliation'), seeds: r.config.seeds,
    });
  });
  return { param: path, label: SWEEP_PARAMS[path].label, baseName: normalizeConfig(base).name, points };
}

export function sweepToCSV(s) {
  const rows = ['param,value,delta_mean,delta_ci_lo,delta_ci_hi,baseline_delta_mean,premium_mean,rival_cut_share_mean,pricing_finding,retaliation_finding,seeds'];
  for (const p of s.points) rows.push([s.param, p.value, p.delta.mean, p.delta.ci[0], p.delta.ci[1], p.baselineDelta.mean, p.premium.mean, p.rivalCutShare.mean, p.pricing, p.retaliation, p.seeds].join(','));
  return rows.join('\n') + '\n';
}
