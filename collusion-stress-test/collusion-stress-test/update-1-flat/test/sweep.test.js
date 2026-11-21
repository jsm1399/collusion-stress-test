import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSweep, sweepToCSV } from '../src/experiments/sweep.js';

test('sweep runs across values; rejects bad params', () => {
  const base = { market: { n: 2 }, periods: 2000, window: 200, seeds: 2, agents: [{ type: 'grim-trigger' }, { type: 'grim-trigger' }] };
  const s = runSweep(base, { path: 'market.mu', values: [0.25, 0.5] });
  assert.equal(s.points.length, 2);
  assert.ok(s.points.every((p) => p.delta.mean > 0.9));
  assert.equal(sweepToCSV(s).trim().split('\n').length, 3);
  const n3 = runSweep(base, { path: 'market.n', values: [3] });
  assert.equal(n3.points.length, 1);
  assert.throws(() => runSweep(base, { path: 'agent.alpha', values: [0.1] }), /q-learning/);
  assert.throws(() => runSweep(base, { path: 'bogus', values: [1] }), /Unknown sweep/);
});
