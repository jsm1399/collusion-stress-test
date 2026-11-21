import { benchmarks, priceGrid, profitsOf } from './market.js';
import { mulberry32, deriveSeed } from './rng.js';
import { createAgent } from '../agents/index.js';

export function runSimulation({ market, agentSpecs, periods, seed }) {
  const bench = benchmarks(market), grid = priceGrid(market, bench), n = market.n;
  const agents = agentSpecs.map((spec, index) =>
    createAgent(spec, { market, bench, grid, index, periods, rng: mulberry32(deriveSeed(seed, index, spec.type)) }));
  const prices = new Float32Array(periods * n), profits = new Float32Array(periods * n);
  let last = null;
  for (let t = 0; t < periods; t++) {
    const state = { t, last };
    const p = agents.map((a) => a.act(state));
    const pr = profitsOf(market, p);
    for (let i = 0; i < n; i++) { agents[i].learn(state, p, pr); prices[t * n + i] = p[i]; profits[t * n + i] = pr[i]; }
    last = p;
  }
  return { market, agents, bench, grid, prices, profits, periods, last };
}
