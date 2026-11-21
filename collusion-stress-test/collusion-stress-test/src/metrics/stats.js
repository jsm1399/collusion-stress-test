import { mulberry32, deriveSeed } from '../core/rng.js';
export const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
export const sd = (v) => { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1)); };
// Percentile bootstrap CI of the mean (seeded => reproducible).
export function summarize(values, label = '', B = 1000, level = 0.95) {
  const n = values.length, m = mean(values);
  if (n < 2) return { n, mean: m, sd: 0, ci: [m, m] };
  const rng = mulberry32(deriveSeed('boot', label, n));
  const means = [];
  for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += values[Math.floor(rng() * n)]; means.push(s / n); }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor(((1 - level) / 2) * B)], hi = means[Math.min(B - 1, Math.floor((1 - (1 - level) / 2) * B))];
  return { n, mean: m, sd: sd(values), ci: [lo, hi] };
}
