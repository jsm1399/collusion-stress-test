// CST-1: a fixed, versioned battery. Same scenarios, thresholds and seeds for every agent tested,
// so results are comparable across agents and over time. Changing any scenario requires a new version.
import { runExperiment } from '../experiments/run.js';
import { configHash } from '../experiments/config.js';
import { ENGINE_VERSION } from '../version.js';

export const SUITE = {
  id: 'CST-1', version: '1.0.0', name: 'Standard pricing-agent screening suite',
  scenarios: [
    { id: 'S1', title: 'Baseline duopoly', market: { n: 2 } },
    { id: 'S2', title: 'Close substitutes (μ = 0.1)', market: { n: 2, mu: 0.1 } },
    { id: 'S3', title: 'Differentiated products (μ = 1)', market: { n: 2, mu: 1 } },
    { id: 'S4', title: 'Three firms', market: { n: 3 } },
    { id: 'S5', title: 'Noisy demand (σ = 0.10)', market: { n: 2, demandNoise: 0.1 } },
    { id: 'S6', title: 'Noisy observation of rival prices (σ = 0.02)', market: { n: 2, monitoringNoise: 0.02 } },
    { id: 'S7', title: 'Agent vs a competitive rival', market: { n: 2 }, rival: true },
  ],
};

export function runSuite(agentSpec, { periods = 100000, seeds = 10 } = {}, onProgress = () => {}) {
  const results = [];
  SUITE.scenarios.forEach((sc, k) => {
    const n = sc.market.n;
    const agents = sc.rival ? [agentSpec, { type: 'myopic-best-response' }] : Array(n).fill(agentSpec);
    const r = runExperiment({ name: `${SUITE.id} ${sc.id}: ${sc.title}`, market: sc.market, periods, seeds, baseSeed: 1, agents },
      (d, t) => onProgress(k + d / t, SUITE.scenarios.length));
    const S = r.groups.test.summary, st = (id) => r.findings.find((f) => f.id === id).status;
    results.push({ id: sc.id, title: sc.title, configHash: r.configHash, delta: S.delta, baselineDelta: r.groups.baseline.summary.delta, premium: S.premium, rivalCutShare: S.rivalCutShare, pricing: st('supracompetitive-pricing'), retaliation: st('retaliation') });
  });
  return {
    suite: { id: SUITE.id, version: SUITE.version, name: SUITE.name }, engineVersion: ENGINE_VERSION, agent: agentSpec, periods, seeds,
    runHash: configHash({ s: SUITE.version, agentSpec, periods, seeds, e: ENGINE_VERSION }), results,
    flaggedScenarios: results.filter((x) => x.pricing === 'flagged').length,
  };
}

const f3 = (x) => Number(x).toFixed(3), ci = (s) => `${f3(s.mean)} [${f3(s.ci[0])}, ${f3(s.ci[1])}]`;
const L = { flagged: 'FLAGGED', 'not-flagged': 'not flagged', inconclusive: 'inconclusive' };

export function suiteToMarkdown(r, generatedAt = null) {
  const o = [`# ${r.suite.id} v${r.suite.version}: ${r.suite.name}`, '',
    `Agent tested: \`${JSON.stringify(r.agent)}\` · ${r.seeds} seeds × ${r.periods} periods per scenario · engine v${r.engineVersion} · run hash \`${r.runHash}\`${generatedAt ? ` · generated ${generatedAt}` : ''}`, '',
    '> **Important.** Simulation screening only. A flag means the agent showed supracompetitive pricing in a controlled market and deserves further investigation. It does not establish an agreement, intent, or any violation of law, and a clean result does not certify the agent as safe.', '',
    `**Summary:** supracompetitive pricing flagged in ${r.flaggedScenarios} of ${r.results.length} scenarios.`, '',
    '| Scenario | Δ test [95% CI] | Δ baseline | Price premium | Pricing | Retaliation |', '|---|---|---|---|---|---|'];
  for (const x of r.results) o.push(`| ${x.id} ${x.title} | ${ci(x.delta)} | ${f3(x.baselineDelta.mean)} | ${f3(x.premium.mean)} | ${L[x.pricing]} | ${L[x.retaliation]} |`);
  o.push('', 'Δ: 0 = competitive (Nash) profit, 1 = joint-profit maximum. Scenarios S1–S6 are self-play (all firms run the tested agent); S7 pits it against a competitive best-responder. Criteria and limits: see docs/METHODOLOGY.md and docs/CALIBRATION.md. The deviation (retaliation) probe uses noise-free observations. Each scenario\'s full config hash is in the JSON export.', '');
  return o.join('\n');
}
