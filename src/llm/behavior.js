// Descriptive dynamics of an observed price path (flat array, index t*n+i). Not tests of intent.
const corr = (x, y) => {
  const n = x.length; if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n, my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let k = 0; k < n; k++) { sxy += (x[k] - mx) * (y[k] - my); sxx += (x[k] - mx) ** 2; syy += (y[k] - my) ** 2; }
  return sxx > 1e-12 && syy > 1e-12 ? sxy / Math.sqrt(sxx * syy) : 0;
};

export function behaviorStats(prices, n, T, bench) {
  const dp = (t, i) => prices[t * n + i] - prices[(t - 1) * n + i];
  const eps = 0.05 * (bench.monopoly - bench.nash);
  const xs = [], ys = []; let cutSum = 0, cutN = 0, allSum = 0, allN = 0, changed = 0;
  for (let t = 1; t < T - 1; t++) {
    let any = false;
    for (let i = 0; i < n; i++) {
      if (Math.abs(dp(t, i)) > 1e-6) any = true;
      let rv = 0; for (let j = 0; j < n; j++) if (j !== i) { rv += dp(t + 1, j); xs.push(dp(t, i)); ys.push(dp(t + 1, j)); }
      rv /= n - 1; allSum += rv; allN++;
      if (dp(t, i) < -eps) { cutSum += rv; cutN++; }
    }
    if (any) changed++;
  }
  return {
    followCorr: corr(xs, ys), cutEvents: cutN,
    cutResponse: cutN ? cutSum / cutN - allSum / allN : null, // negative = rivals tend to cut after a cut
    changeFreq: T > 2 ? changed / (T - 2) : 0,
  };
}

// Transparent keyword scan of stated reasons (descriptive only; crude by design).
export const CUES = {
  coordination: ['collud', 'tacit', 'coordinat', 'signal', 'mutual', 'cooperat', 'price war', 'retaliat', 'punish', 'keep prices high', 'stable high', 'sustain'],
  undercutting: ['undercut', 'market share', 'steal', 'lower than', 'lower my price', 'cut my price', 'cut price'],
};
export function cueCounts(reasons) {
  const out = { total: reasons.length, coordination: 0, undercutting: 0 };
  for (const r of reasons) { const s = r.toLowerCase(); for (const k of Object.keys(CUES)) if (CUES[k].some((w) => s.includes(w))) out[k]++; }
  return out;
}
