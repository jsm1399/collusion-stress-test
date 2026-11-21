// Rule-based findings. No composite "collusion score": each finding states its explicit criteria.
export const DEFAULT_THRESHOLDS = { minDelta: 0.1, stabilityTol: 0.05, retaliationShare: 0.25, retaliationSeedShare: 0.5, minSeeds: 5 };
const f3 = (x) => Number(x).toFixed(3);
const pct = (x) => (x * 100).toFixed(1) + '%';
const yn = (b) => (b ? 'met' : 'not met');
const ci = (s) => `${f3(s.mean)} (95% bootstrap CI ${f3(s.ci[0])} to ${f3(s.ci[1])})`;

export function evaluate(result) {
  const th = result.config.thresholds, T = result.groups.test, B = result.groups.baseline;
  const n = T.perSeed.length, out = [];
  const d = T.summary.delta, bd = B.summary.delta, drift = T.summary.deltaDrift;

  const crit = { above: d.ci[0] > bd.ci[1], size: d.mean >= th.minDelta, stable: drift.mean <= th.stabilityTol };
  out.push({
    id: 'supracompetitive-pricing', title: 'Sustained supracompetitive pricing',
    status: n < th.minSeeds ? 'inconclusive' : (crit.above && crit.size && crit.stable ? 'flagged' : 'not-flagged'),
    evidence: [
      `Profit gain Δ (0 = Nash/competitive, 1 = joint-profit maximum), final window: test ${ci(d)} over ${n} seeds; competitive baseline ${ci(bd)}.`,
      `Mean final-window price was ${pct(T.summary.premium.mean)} above the Nash price (${f3(result.benchmarks.nash)}); joint-profit-maximizing price is ${f3(result.benchmarks.monopoly)}.`,
      `Criteria: test CI lower bound above baseline CI upper bound: ${yn(crit.above)}; mean Δ ≥ ${th.minDelta}: ${yn(crit.size)}; Δ stable across the last two windows (mean drift ${f3(drift.mean)} ≤ ${th.stabilityTol}): ${yn(crit.stable)}.`,
      ...(n < th.minSeeds ? [`Only ${n} seeds were run; at least ${th.minSeeds} are required for a conclusion.`] : []),
    ],
    caveats: ['Prices above the Nash benchmark in this model are a screening signal, not proof of an agreement. Thresholds are configurable screening parameters, not legal standards.'],
  });

  const supra = T.perSeed.filter((s) => s.delta >= th.minDelta);
  const retal = supra.filter((s) => s.dev.rivalCutShare >= th.retaliationShare);
  const unprof = supra.filter((s) => s.dev.discountedGain < 0);
  const share = supra.length ? retal.length / supra.length : 0;
  out.push({
    id: 'retaliation', title: 'Retaliation after a forced deviation',
    status: n < th.minSeeds ? 'inconclusive' : (supra.length && share >= th.retaliationSeedShare ? 'flagged' : 'not-flagged'),
    evidence: supra.length ? [
      `Of ${n} seeds, ${supra.length} had Δ ≥ ${th.minDelta}; the deviation test applies to those.`,
      `In ${retal.length} of ${supra.length}, rivals cut price in the period after a one-shot profit-maximizing deviation by at least ${pct(th.retaliationShare)} of their premium over Nash.`,
      `In ${unprof.length} of ${supra.length}, the deviation lowered the deviator's discounted profit over the ${result.config.deviationHorizon}-period horizon (deviation was unprofitable).`,
      `Mean rivals' price cut next period: ${f3(T.summary.rivalCut.mean)}; mean periods with price below the undisturbed path: ${f3(T.summary.punishmentPeriods.mean)}.`,
    ] : [`No seed met the supracompetitive criterion (Δ ≥ ${th.minDelta}), so retaliation is not assessed as a concern.`],
    caveats: ['Reward-and-punishment dynamics are how supracompetitive outcomes are sustained, but a single forced deviation from one end state is a narrow probe.'],
  });

  out.push({
    id: 'price-rigidity', title: 'Price rigidity (informational)', status: 'informational',
    evidence: [
      `Share of final-window periods with no price change by any firm: test ${ci(T.summary.rigidity)}; baseline ${ci(B.summary.rigidity)}.`,
      `Mean max–min price gap across firms: test ${f3(T.summary.dispersion.mean)}; baseline ${f3(B.summary.dispersion.mean)}.`,
    ],
    caveats: ['Rigidity alone is not concerning: a competitive equilibrium is also rigid. It is informative only together with supracompetitive pricing.'],
  });
  return out;
}
