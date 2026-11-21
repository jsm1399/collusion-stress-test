// Forced-deviation (impulse-response) test, after Calvano et al. 2020, averaged for robustness.
// For each sampled end-state from the final window and each firm as deviator: freeze all agents and
// compare (A) undisturbed continuation with (B) a one-shot profit-maximizing deviation by that firm.
// Reveals whether rivals retaliate and whether deviating pays.
import { bestResponse, profitsOf } from '../core/market.js';

function roll(sim, start, deviator, horizon, dev) {
  const agents = sim.agents.map((a) => { const c = a.clone(); c.freeze(); return c; });
  const P = [], Pr = []; let last = start;
  for (let k = 0; k < horizon; k++) {
    const p = agents.map((a) => a.act({ t: sim.periods + k, last }));
    if (dev && k === 0) p[deviator] = bestResponse(sim.market, deviator, p).price;
    P.push(p); Pr.push(profitsOf(sim.market, p)); last = p;
  }
  return { P, Pr };
}

export function deviationTest(sim, { horizon = 25, window = 500, samples = 12 } = {}) {
  const { market, bench } = sim, n = market.n, d = market.discount, T = sim.periods;
  const tol = Math.max(1e-3, 0.02 * (bench.monopoly - bench.nash));
  const acc = { gain: 0, imm: 0, cut: 0, share: 0, pun: 0, unprof: 0, cnt: 0 };
  let sample = null;
  for (let s = 0; s < samples; s++) {
    const t = T - 1 - Math.floor((s * (window - 1)) / Math.max(1, samples - 1));
    const start = s === 0 ? sim.last : Array.from({ length: n }, (_, i) => sim.prices[t * n + i]);
    for (let dv = 0; dv < n; dv++) {
      const A = roll(sim, start, dv, horizon, false), B = roll(sim, start, dv, horizon, true);
      const rival = (p) => { let x = 0; for (let j = 0; j < n; j++) if (j !== dv) x += p[j]; return x / (n - 1); };
      const ra = A.P.map(rival), rb = B.P.map(rival);
      let gain = 0; for (let k = 0; k < horizon; k++) gain += d ** k * (B.Pr[k][dv] - A.Pr[k][dv]);
      const premium = ra[0] - bench.nash, cut = ra[1] - rb[1];
      let pun = 0; for (let k = 1; k < horizon; k++) if (rb[k] < ra[k] - tol) pun++;
      acc.gain += gain; acc.imm += B.Pr[0][dv] - A.Pr[0][dv]; acc.cut += cut;
      acc.share += premium > 1e-9 ? cut / premium : 0; acc.pun += pun; acc.unprof += gain < 0 ? 1 : 0; acc.cnt++;
      if (s === 0 && dv === 0) sample = { control: { deviator: A.P.map((p) => p[0]), rival: ra }, deviation: { deviator: B.P.map((p) => p[0]), rival: rb } };
    }
  }
  const c = acc.cnt;
  return {
    horizon, pairs: c, control: sample.control, deviation: sample.deviation,
    immediateGain: acc.imm / c, discountedGain: acc.gain / c, rivalCut: acc.cut / c,
    rivalCutShare: acc.share / c, punishmentPeriods: acc.pun / c, unprofitableShare: acc.unprof / c,
  };
}
