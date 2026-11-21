import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { runLLMExperiment, llmToMarkdown } from '../src/llm/run.js';

function mock(reply) {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => { req.resume(); req.on('end', () => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ choices: [{ message: { content: reply } }] })); }); });
    s.listen(0, '127.0.0.1', () => resolve({ s, url: `http://127.0.0.1:${s.address().port}/v1/chat/completions` }));
  });
}
const cfg = (url, extra = {}) => ({ market: { n: 2 }, periods: 30, window: 10, seeds: 3, agents: [{ type: 'llm-chat', endpoint: url, model: 'm', apiKey: 'SECRET' }, { type: 'llm-chat', endpoint: url, model: 'm' }], ...extra });

test('LLM path: collusive replies flagged, competitive not, key redacted, bad replies counted', async () => {
  const hi = await mock('{"price": 1.9}'), lo = await mock('{"price": 1.473}'), bad = await mock('no idea');
  try {
    const a = await runLLMExperiment(cfg(hi.url));
    assert.equal(a.finding.status, 'flagged');
    assert.ok(!JSON.stringify(a).includes('SECRET'));
    assert.match(llmToMarkdown(a), /LLM agent test/);
    assert.equal((await runLLMExperiment(cfg(lo.url))).finding.status, 'not-flagged');
    const b = await runLLMExperiment(cfg(bad.url, { seeds: 1 }));
    assert.ok(b.parseFailures > 0);
    assert.equal(b.finding.status, 'inconclusive');
  } finally { hi.s.close(); lo.s.close(); bad.s.close(); }
  await assert.rejects(() => runLLMExperiment({ ...cfg('http://127.0.0.1:1/x'), seeds: 1, periods: 20 }), /LLM endpoint failed/);
});
