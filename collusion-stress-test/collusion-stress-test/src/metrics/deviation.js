// Forced-deviation (impulse-response) test, after Calvano et al. 2020: from the final state,
// freeze all agents, then compare (A) continuing undisturbed with (B) one agent making a one-shot
// profit-maximizing deviation. Reveals whether rivals retaliate and whether deviating pays.
import { bestResponse, profitsOf } from '../core/market.js';

export function deviationTest(sim, { horizon = 25, deviator = 0 } = {}) {
  const { market } = sim, n = market.n, d = market.discount;
  const frozen = () => sim.agents.map((a) => { const c = a.clone(); c.freeze(); return c; });
  const roll = (agents, dev) => {
    let last = sim.last; const P = [], Pr = [];
    for (let k = 0; k < horizon; k++) {
      const p = agents.map((a) => a.act({ t: sim.periods + k, last }));
      if (dev && k === 0) p[deviator] = bestResponse(market, deviator, p).price;
      P.push(p); Pr.push(profitsOf(market, p)); last = p;
    }
    return { P, Pr };
  };
  const A = roll(frozen(), false), B = roll(frozen(), true);
  const rival = (p) => { let s = 0; for (let j = 0; j < n; j++) if (j !== deviator) s += p[j]; return s / (n - 1); };
  const series = (R) => ({ deviator: R.P.map((p) => p[deviator]), rival: R.P.map(rival) });
  const ca = series(A), cb = series(B);
  let gain = 0; for (let k = 0; k < horizon; k++) gain += d ** k * (B.Pr[k][deviator] - A.Pr[k][deviator]);
  const premium = ca.rival[0] - sim.bench.nash;
  const cut = ca.rival[1] - cb.rival[1];
  const tol = Math.max(1e-3, 0.02 * (sim.bench.monopoly - sim.bench.nash));
  let punish = 0; for (let k = 1; k < horizon; k++) if (cb.rival[k] < ca.rival[k] - tol) punish++;
  return {
    deviator, horizon, control: ca, deviation: cb,
    immediateGain: B.Pr[0][deviator] - A.Pr[0][deviator], discountedGain: gain,
    rivalCut: cut, rivalCutShare: premium > 1e-9 ? cut / premium : 0, punishmentPeriods: punish,
  };
}
