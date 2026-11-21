import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMarket, benchmarks } from '../src/core/market.js';
import { runExperiment } from '../src/experiments/run.js';
import { PRESETS } from '../src/experiments/presets.js';
import { toMarkdown, toCSV } from '../src/reporting/report.js';

const status = (r, id) => r.findings.find((f) => f.id === id).status;

test('benchmarks match published Calvano et al. (2020) values', () => {
  const b = benchmarks(normalizeMarket({}));
  assert.ok(Math.abs(b.nash - 1.473) < 0.001, `nash ${b.nash}`);
  assert.ok(Math.abs(b.monopoly - 1.925) < 0.001, `monopoly ${b.monopoly}`);
});

test('negative control (Nash agents) is not flagged', () => {
  const r = runExperiment(PRESETS['negative-control']);
  assert.ok(Math.abs(r.groups.test.summary.delta.mean) < 0.01);
  assert.equal(status(r, 'supracompetitive-pricing'), 'not-flagged');
  assert.equal(status(r, 'retaliation'), 'not-flagged');
});

test('positive control (grim trigger) is flagged for pricing and retaliation', () => {
  const r = runExperiment(PRESETS['positive-control']);
  assert.ok(r.groups.test.summary.delta.mean > 0.95);
  assert.equal(status(r, 'supracompetitive-pricing'), 'flagged');
  assert.equal(status(r, 'retaliation'), 'flagged');
  assert.ok(r.groups.test.summary.discountedGain.mean < 0);
});

test('experiments are deterministic and q-learning runs', () => {
  const cfg = { market: { n: 2 }, periods: 3000, seeds: 2, window: 200, agents: [{ type: 'q-learning' }, { type: 'q-learning' }] };
  const a = JSON.stringify(runExperiment(cfg)), b = JSON.stringify(runExperiment(cfg));
  assert.equal(a, b);
  assert.equal(runExperiment(cfg).findings.find((f) => f.id === 'supracompetitive-pricing').status, 'inconclusive'); // <5 seeds
});

test('reports render and reject bad configs', () => {
  const r = runExperiment(PRESETS['negative-control']);
  assert.match(toMarkdown(r), /cannot establish an agreement/);
  assert.equal(toCSV(r).trim().split('\n').length, 1 + 10);
  assert.throws(() => runExperiment({ agents: [{ type: 'nope' }, { type: 'nash' }] }), /Unknown agent type/);
  assert.throws(() => runExperiment({ market: { n: 3 }, agents: [{ type: 'nash' }] }), /exactly market.n/);
});
