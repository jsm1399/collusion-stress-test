import { benchmarks, priceGrid, profitsOf } from './market.js';
import { mulberry32, deriveSeed, gaussian } from './rng.js';
import { createAgent } from '../agents/index.js';

// Optional imperfections (default off, results unchanged when off):
//  market.demandNoise: realized profit is scaled by a mean-1 lognormal shock per firm per period.
//  market.monitoringNoise: each agent sees rivals' prices with additive Gaussian noise (own price exact).
export function runSimulation({ market, agentSpecs, periods, seed }) {
  const bench = benchmarks(market), grid = priceGrid(market, bench), n = market.n;
  const agents = agentSpecs.map((spec, index) =>
    createAgent(spec, { market, bench, grid, index, periods, rng: mulberry32(deriveSeed(seed, index, spec.type)) }));
  const dn = market.demandNoise ?? 0, mn = market.monitoringNoise ?? 0, env = mulberry32(deriveSeed(seed, 'env'));
  const observe = (p) => p.map((_, i) => (mn > 0 ? p.map((x, j) => (j === i ? x : x + mn * gaussian(env))) : p));
  const prices = new Float32Array(periods * n), profits = new Float32Array(periods * n);
  let last = null, obs = null;
  for (let t = 0; t < periods; t++) {
    const p = agents.map((a, i) => a.act({ t, last: obs ? obs[i] : null }));
    const pr = profitsOf(market, p);
    if (dn > 0) for (let i = 0; i < n; i++) pr[i] *= Math.exp(dn * gaussian(env) - (dn * dn) / 2);
    const nobs = observe(p);
    for (let i = 0; i < n; i++) {
      agents[i].learn({ t, last: obs ? obs[i] : null }, nobs[i], pr);
      prices[t * n + i] = p[i]; profits[t * n + i] = pr[i];
    }
    last = p; obs = nobs;
  }
  return { market, agents, bench, grid, prices, profits, periods, last };
}
