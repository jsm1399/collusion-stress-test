import { runExperiment } from '../src/experiments/run.js';
self.onmessage = (e) => {
  try {
    const res = runExperiment(e.data, (d, t) => self.postMessage({ type: 'progress', d, t }));
    self.postMessage({ type: 'done', res });
  } catch (err) { self.postMessage({ type: 'error', message: String(err.message || err) }); }
};
