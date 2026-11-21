import { profitGain } from '../core/market.js';
import { deviationTest } from './deviation.js';

function windowStats(sim, from, to) {
  const { prices, profits, market } = sim, n = market.n, cnt = to - from;
  let sp = 0, spr = 0, same = 0, disp = 0;
  for (let t = from; t < to; t++) {
    let mn = Infinity, mx = -Infinity, unchanged = t > 0;
    for (let i = 0; i < n; i++) {
      const p = prices[t * n + i]; sp += p; spr += profits[t * n + i];
      if (p < mn) mn = p; if (p > mx) mx = p;
      if (t > 0 && p !== prices[(t - 1) * n + i]) unchanged = false;
    }
    if (unchanged) same++; disp += mx - mn;
  }
  return { avgPrice: sp / (cnt * n), avgProfit: spr / (cnt * n), rigidity: same / cnt, dispersion: disp / cnt };
}
const r4 = (x) => Math.round(x * 1e4) / 1e4;

export function analyzeRun(sim, cfg, wantSample) {
  const { periods: T, bench } = sim, w = cfg.window, n = sim.market.n;
  const fin = windowStats(sim, T - w, T), prev = windowStats(sim, T - 2 * w, T - w);
  const delta = profitGain(fin.avgProfit, bench), deltaPrev = profitGain(prev.avgProfit, bench);
  const dev = deviationTest(sim, { horizon: cfg.deviationHorizon, window: w, samples: cfg.deviationSamples });
  const metrics = {
    delta, deltaDrift: Math.abs(delta - deltaPrev), avgPrice: fin.avgPrice,
    premium: fin.avgPrice / bench.nash - 1, rigidity: fin.rigidity, dispersion: fin.dispersion,
    dev: {
      immediateGain: dev.immediateGain, discountedGain: dev.discountedGain, rivalCut: dev.rivalCut,
      rivalCutShare: dev.rivalCutShare, punishmentPeriods: dev.punishmentPeriods, unprofitableShare: dev.unprofitableShare,
    },
  };
  let sample = null;
  if (wantSample) {
    const tail = Math.min(100, T), buckets = 100, bs = Math.floor(T / buckets), traj = [];
    for (let b = 0; b < buckets; b++) { let s = 0; for (let t = b * bs; t < (b + 1) * bs; t++) for (let i = 0; i < n; i++) s += sim.prices[t * n + i]; traj.push(r4(s / (bs * n))); }
    const lastPrices = [];
    for (let t = T - tail; t < T; t++) lastPrices.push(Array.from({ length: n }, (_, i) => r4(sim.prices[t * n + i])));
    const rr = (a) => a.map(r4);
    sample = {
      trajectory: traj, trajectoryBucket: bs, lastPrices,
      deviation: { control: { deviator: rr(dev.control.deviator), rival: rr(dev.control.rival) }, deviation: { deviator: rr(dev.deviation.deviator), rival: rr(dev.deviation.rival) } },
    };
  }
  return { metrics, sample };
}
