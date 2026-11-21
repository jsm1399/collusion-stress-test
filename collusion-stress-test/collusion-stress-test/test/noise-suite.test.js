import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment } from '../src/experiments/run.js';
import { runSuite, suiteToMarkdown, SUITE } from '../src/suites/standard.js';

const base = { periods: 3000, window: 300, seeds: 2, agents: [{ type: 'myopic-best-response' }, { type: 'myopic-best-response' }] };

test('zero noise is identical to no noise; noise changes outcomes deterministically', () => {
  const a = runExperiment({ ...base, market: { n: 2 } }).groups;
  const b = runExperiment({ ...base, market: { n: 2, demandNoise: 0, monitoringNoise: 0 } }).groups;
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  const n1 = JSON.stringify(runExperiment({ ...base, market: { n: 2, demandNoise: 0.2, monitoringNoise: 0.05 } }).groups);
  const n2 = JSON.stringify(runExperiment({ ...base, market: { n: 2, demandNoise: 0.2, monitoringNoise: 0.05 } }).groups);
  assert.equal(n1, n2);
  assert.notEqual(n1, JSON.stringify(a));
  assert.throws(() => runExperiment({ ...base, market: { n: 2, demandNoise: 2 } }), /demandNoise/);
});

test('standard suite runs and reports', () => {
  const r = runSuite({ type: 'grim-trigger' }, { periods: 3000, seeds: 5 });
  assert.equal(r.results.length, SUITE.scenarios.length);
  assert.equal(r.results[0].pricing, 'flagged');
  assert.match(suiteToMarkdown(r), /CST-1 v1\.0\.0/);
});
