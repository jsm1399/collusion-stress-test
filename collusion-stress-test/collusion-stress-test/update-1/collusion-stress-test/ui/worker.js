import { runExperiment } from '../src/experiments/run.js';
import { runSweep } from '../src/experiments/sweep.js';
self.onmessage = (e) => {
  try {
    if (e.data && e.data.kind === 'sweep') {
      const res = runSweep(e.data.cfg, e.data.sweep, (d, t) => self.postMessage({ type: 'progress', d, t }));
      self.postMessage({ type: 'sweep-done', res });
    } else {
      const res = runExperiment(e.data, (d, t) => self.postMessage({ type: 'progress', d, t }));
      self.postMessage({ type: 'done', res });
    }
  } catch (err) { self.postMessage({ type: 'error', message: String(err.message || err) }); }
};
