const f3 = (x) => Number(x).toFixed(3);
const ci = (s) => `${f3(s.mean)} [${f3(s.ci[0])}, ${f3(s.ci[1])}]`;
const LABEL = { flagged: 'FLAGGED for further investigation', 'not-flagged': 'Not flagged', inconclusive: 'Inconclusive', informational: 'Informational' };

export function toJSON(result) { return JSON.stringify(result, null, 2); }

export function toCSV(result) {
  const cols = ['group', 'seed', 'delta', 'deltaDrift', 'avgPrice', 'premium', 'rigidity', 'dispersion', 'dev_immediateGain', 'dev_discountedGain', 'dev_rivalCut', 'dev_rivalCutShare', 'dev_punishmentPeriods'];
  const rows = [cols.join(',')];
  for (const g of ['test', 'baseline']) for (const r of result.groups[g].perSeed) {
    rows.push([g, r.seed, r.delta, r.deltaDrift, r.avgPrice, r.premium, r.rigidity, r.dispersion, r.dev.immediateGain, r.dev.discountedGain, r.dev.rivalCut, r.dev.rivalCutShare, r.dev.punishmentPeriods].join(','));
  }
  return rows.join('\n') + '\n';
}

export function toMarkdown(result, generatedAt = null) {
  const { config: c, benchmarks: b, groups: g } = result, S = g.test.summary, BS = g.baseline.summary;
  const L = [];
  L.push(`# Collusion Stress-Test report: ${c.name}`, '');
  if (c.description) L.push(c.description, '');
  L.push(`Engine v${result.engineVersion} · config hash \`${result.configHash}\`${generatedAt ? ` · generated ${generatedAt}` : ''}`, '');
  L.push('> **Important.** This is a simulation result. It can identify behavior that deserves further investigation; it cannot establish an agreement, intent, or any violation of antitrust law. Legal interpretation requires qualified counsel.', '');
  L.push('## Findings', '');
  for (const f of result.findings) {
    L.push(`### ${f.title}: ${LABEL[f.status]}`, '');
    for (const e of f.evidence) L.push(`- ${e}`);
    for (const e of f.caveats) L.push(`- *Caveat:* ${e}`);
    L.push('');
  }
  L.push('## Benchmarks (analytic, from the market definition)', '');
  L.push(`- Bertrand-Nash price: ${f3(b.nash)}; joint-profit-maximizing price: ${f3(b.monopoly)}`);
  L.push(`- Per-firm profit at Nash: ${f3(b.profitNash)}; at joint-profit maximum: ${f3(b.profitMonopoly)}`, '');
  L.push('## Metrics (mean [95% bootstrap CI over seeds], final window)', '');
  L.push('| Metric | Test agents | Competitive baseline |', '|---|---|---|');
  for (const [k, label] of [['delta', 'Profit gain Δ'], ['avgPrice', 'Average price'], ['premium', 'Price premium over Nash'], ['rigidity', 'Share of periods with no price change'], ['dispersion', 'Max–min price gap'], ['rivalCut', 'Rival price cut after deviation'], ['discountedGain', 'Discounted gain from deviating']]) {
    L.push(`| ${label} | ${ci(S[k])} | ${ci(BS[k])} |`);
  }
  L.push('', '## Setup', '', `- Test agents: ${c.agents.map((a) => JSON.stringify(a)).join(', ')}`, `- Baseline agents: ${c.baseline.agents.map((a) => JSON.stringify(a)).join(', ')}`);
  L.push(`- Seeds: ${c.seeds} (from ${c.baseSeed}); periods per run: ${c.periods}; analysis window: ${c.window}`, '');
  L.push('## Methodology and limits', '', '- Logit-demand Bertrand market with symmetric firms (Calvano et al. 2020 design). Δ = (π − π_Nash)/(π_monopoly − π_Nash).', '- Findings are explicit rules with stated criteria, not a composite score. Thresholds are configurable screening parameters.', '- Results hold only for this simulated market and these agent configurations; see docs/METHODOLOGY.md.', '', '## Reproduce', '', 'Run the configuration below in the platform (or `runExperiment` in `src/experiments/run.js`); the same config yields identical results.', '', '```json', JSON.stringify(c, null, 2), '```', '');
  return L.join('\n');
}
