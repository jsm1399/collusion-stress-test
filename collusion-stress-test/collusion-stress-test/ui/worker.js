import { runExperiment } from '../src/experiments/run.js';
import { runSweep } from '../src/experiments/sweep.js';
import { runSuite } from '../src/suites/standard.js';
import { runLLMExperiment } from '../src/llm/run.js';
self.onmessage = async (e) => {
  try {
    if (e.data && e.data.kind === 'sweep') {
      const res = runSweep(e.data.cfg, e.data.sweep, (d, t) => self.postMessage({ type: 'progress', d, t }));
      self.postMessage({ type: 'sweep-done', res });
    } else if (e.data && e.data.kind === 'llm') {
      const res = await runLLMExperiment(e.data.cfg, (d, t) => self.postMessage({ type: 'progress', d, t }));
      self.postMessage({ type: 'llm-done', res });
    } else if (e.data && e.data.kind === 'suite') {
      const res = runSuite(e.data.agent, e.data.opts, (d, t) => self.postMessage({ type: 'progress', d, t }));
      self.postMessage({ type: 'suite-done', res });
    } else {
      const res = runExperiment(e.data, (d, t) => self.postMessage({ type: 'progress', d, t }));
      self.postMessage({ type: 'done', res });
    }
  } catch (err) { self.postMessage({ type: 'error', message: String(err.message || err) }); }
};
