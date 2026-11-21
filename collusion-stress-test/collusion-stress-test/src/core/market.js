// Differentiated-product Bertrand market with logit demand (the canonical setup of
// Calvano et al. 2020). Market size is normalized to 1. Firms are symmetric in quality and cost.
export const DEFAULT_MARKET = { n: 2, a: 2, a0: 0, mu: 0.25, c: 1, gridSize: 15, xi: 0.1, discount: 0.95 };

export function normalizeMarket(m = {}) {
  const x = { ...DEFAULT_MARKET, ...m };
  const bad = (msg) => { throw new Error('Invalid market: ' + msg); };
  if (!Number.isInteger(x.n) || x.n < 2 || x.n > 6) bad('n must be an integer from 2 to 6');
  if (!(x.mu > 0)) bad('mu (substitutability) must be > 0');
  if (!(x.c >= 0)) bad('c (marginal cost) must be >= 0');
  if (!(x.a > x.c)) bad('quality a must exceed marginal cost c');
  if (!(x.discount > 0 && x.discount < 1)) bad('discount must be in (0,1)');
  if (!Number.isInteger(x.gridSize) || x.gridSize < 5 || x.gridSize > 41) bad('gridSize must be an integer from 5 to 41');
  if (!(x.xi >= 0)) bad('xi must be >= 0');
  for (const k of ['demandNoise', 'monitoringNoise']) if (x[k] !== undefined && !(x[k] >= 0 && x[k] <= 1)) bad(k + ' must be between 0 and 1');
  return x;
}

export function demand(m, prices) {
  const out = m.a0 / m.mu;
  const w = prices.map((p) => (m.a - p) / m.mu);
  const mx = Math.max(out, ...w);
  let s = Math.exp(out - mx);
  const e = w.map((x) => Math.exp(x - mx));
  for (const x of e) s += x;
  return e.map((x) => x / s);
}

export function profitsOf(m, prices) {
  const q = demand(m, prices);
  return prices.map((p, i) => (p - m.c) * q[i]);
}

function argmax(f, lo, hi, tol = 1e-10) {
  const g = (Math.sqrt(5) - 1) / 2;
  let a = lo, b = hi, c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
  while (b - a > tol) {
    if (fc > fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
    else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
  }
  return (a + b) / 2;
}
const upper = (m) => m.c + (m.a - m.c) + 30 * m.mu;

export function bestResponse(m, i, prices) {
  // Own-price FOC for logit: g(p) = 1 - (p-c)(1-s(p))/mu is strictly decreasing; solve by bisection.
  let W = Math.exp(m.a0 / m.mu);
  for (let j = 0; j < prices.length; j++) if (j !== i) W += Math.exp((m.a - prices[j]) / m.mu);
  const share = (p) => 1 / (1 + W * Math.exp((p - m.a) / m.mu));
  let lo = m.c, hi = upper(m);
  for (let k = 0; k < 60; k++) {
    const mid = 0.5 * (lo + hi);
    if (1 - ((mid - m.c) * (1 - share(mid))) / m.mu > 0) lo = mid; else hi = mid;
  }
  const price = 0.5 * (lo + hi);
  return { price, profit: (price - m.c) * share(price) };
}

export function nashPrice(m) {
  let p = m.c + m.mu;
  for (let k = 0; k < 100000; k++) {
    const q = demand(m, Array(m.n).fill(p))[0];
    const np = 0.5 * p + 0.5 * (m.c + m.mu / (1 - q));
    if (Math.abs(np - p) < 1e-13) { p = np; break; }
    p = np;
  }
  return p;
}

export function monopolyPrice(m) {
  return argmax((p) => (p - m.c) * demand(m, Array(m.n).fill(p))[0], m.c, upper(m));
}

export function benchmarks(m) {
  const nash = nashPrice(m), monopoly = monopolyPrice(m);
  return {
    nash, monopoly,
    profitNash: profitsOf(m, Array(m.n).fill(nash))[0],
    profitMonopoly: profitsOf(m, Array(m.n).fill(monopoly))[0],
  };
}

export function priceGrid(m, bench = benchmarks(m)) {
  const lo = bench.nash - m.xi * (bench.monopoly - bench.nash);
  const hi = bench.monopoly + m.xi * (bench.monopoly - bench.nash);
  return Array.from({ length: m.gridSize }, (_, k) => lo + ((hi - lo) * k) / (m.gridSize - 1));
}

export function nearestIndex(grid, p) {
  const step = (grid[grid.length - 1] - grid[0]) / (grid.length - 1);
  return Math.min(grid.length - 1, Math.max(0, Math.round((p - grid[0]) / step)));
}

// Profit gain (Calvano et al. 2020): 0 = Nash-equilibrium profit, 1 = joint-profit-maximizing profit.
export const profitGain = (avgProfit, b) => (avgProfit - b.profitNash) / (b.profitMonopoly - b.profitNash);
