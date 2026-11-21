// Agent registry. An agent exposes: act({t,last}) -> price, learn(state, prices, profits),
// clone(), freeze(). `last` is the previous period's price vector (null in period 0).
import { bestResponse, nearestIndex, profitsOf } from '../core/market.js';
import { gaussian, mulberry32 } from '../core/rng.js';

class Base {
  constructor(spec, ctx) { this.spec = spec; this.ctx = ctx; }
  learn() {}
  freeze() {}
  clone() {
    const c = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    if (this.rng) { c.rng = mulberry32(0); c.rng.setState(this.rng.getState()); }
    return c;
  }
}

class Nash extends Base { act() { return this.ctx.bench.nash; } }

class Fixed extends Base { act() { return this.spec.price ?? this.ctx.bench.monopoly; } }

class BestResponse extends Base {
  constructor(s, c) { super(s, c); this.noise = s.noise ?? 0; this.rng = c.rng; }
  freeze() { this.noise = 0; }
  act({ last }) {
    const { market, index, bench } = this.ctx;
    let p = last ? bestResponse(market, index, last).price : (this.spec.initialPrice ?? bench.monopoly);
    if (this.noise > 0) p += this.noise * gaussian(this.rng);
    return Math.max(market.c, p);
  }
}

// POSITIVE CONTROL: deliberately encodes collusion + punishment. Used to validate detectors.
class GrimTrigger extends Base {
  constructor(s, c) { super(s, c); this.triggered = false; }
  act({ last }) {
    const { bench, index } = this.ctx;
    const pc = this.spec.price ?? bench.monopoly, tol = this.spec.tolerance ?? 1e-6;
    if (last && !this.triggered) {
      for (let j = 0; j < last.length; j++) if (j !== index && last[j] < pc - tol) { this.triggered = true; break; }
    }
    return this.triggered ? bench.nash : pc;
  }
}

// POSITIVE CONTROL: starts at the collusive price, then matches the lowest rival price.
class PriceMatcher extends Base {
  act({ last }) {
    const { bench, index } = this.ctx;
    const pc = this.spec.price ?? bench.monopoly;
    if (!last) return pc;
    let m = Infinity;
    for (let j = 0; j < last.length; j++) if (j !== index) m = Math.min(m, last[j]);
    return Math.min(pc, Math.max(bench.nash, m));
  }
}

// Tabular Q-learning with state = last-period prices (Calvano et al. 2020 design).
class QLearner extends Base {
  constructor(spec, ctx) {
    super(spec, ctx);
    const { market, grid, index } = ctx;
    this.m = grid.length; this.n = market.n;
    if (this.n > 4) throw new Error('q-learning supports at most 4 firms (state space grows as grid^n)');
    this.S = this.m ** this.n;
    this.alpha = spec.alpha ?? 0.15;
    this.beta = spec.beta ?? 10 / ctx.periods; // exploration prob = exp(-beta*t)
    this.delta = market.discount; this.rng = ctx.rng; this.frozen = false;
    const q0 = new Float64Array(this.m), combos = this.m ** (this.n - 1);
    for (let a = 0; a < this.m; a++) {
      let tot = 0;
      for (let k = 0; k < combos; k++) {
        const pr = []; let r = k;
        for (let j = 0; j < this.n; j++) {
          if (j === index) pr.push(grid[a]); else { pr.push(grid[r % this.m]); r = Math.floor(r / this.m); }
        }
        tot += profitsOf(market, pr)[index];
      }
      q0[a] = tot / combos / (1 - this.delta);
    }
    this.Q = new Float64Array(this.S * this.m);
    for (let s = 0; s < this.S; s++) this.Q.set(q0, s * this.m);
    this.s = 0; this.a = 0;
  }
  stateOf(prices) {
    let s = 0, mul = 1;
    for (let j = 0; j < this.n; j++) { s += nearestIndex(this.ctx.grid, prices[j]) * mul; mul *= this.m; }
    return s;
  }
  freeze() { this.frozen = true; }
  act({ t, last }) {
    const s = last ? this.stateOf(last) : Math.floor(this.rng() * this.S);
    this.s = s;
    const eps = this.frozen ? 0 : Math.exp(-this.beta * t);
    let a;
    if (this.rng() < eps) a = Math.floor(this.rng() * this.m);
    else { let best = -Infinity; a = 0; const b = s * this.m; for (let k = 0; k < this.m; k++) if (this.Q[b + k] > best) { best = this.Q[b + k]; a = k; } }
    this.a = a;
    return this.ctx.grid[a];
  }
  learn(_state, prices, profits) {
    if (this.frozen) return;
    const b = this.stateOf(prices) * this.m;
    let mx = -Infinity;
    for (let k = 0; k < this.m; k++) if (this.Q[b + k] > mx) mx = this.Q[b + k];
    const i = this.s * this.m + this.a;
    this.Q[i] = (1 - this.alpha) * this.Q[i] + this.alpha * (profits[this.ctx.index] + this.delta * mx);
  }
  clone() { const c = super.clone(); c.Q = this.Q.slice(); return c; }
}

export const AGENT_TYPES = {
  'nash': { cls: Nash, role: 'baseline', label: 'Bertrand-Nash (competitive benchmark)' },
  'myopic-best-response': { cls: BestResponse, role: 'baseline', label: 'Myopic best response (competitive, optional noise)' },
  'fixed': { cls: Fixed, role: 'baseline', label: 'Fixed price (default: joint-profit-maximizing)' },
  'grim-trigger': { cls: GrimTrigger, role: 'positive-control', label: 'Grim trigger (collusive positive control)' },
  'price-matcher': { cls: PriceMatcher, role: 'positive-control', label: 'Price matcher / tit-for-tat (collusive positive control)' },
  'q-learning': { cls: QLearner, role: 'learning', label: 'Q-learning (tabular, Calvano-style)' },
};

export function createAgent(spec, ctx) {
  const t = AGENT_TYPES[spec.type];
  if (!t) throw new Error(`Unknown agent type "${spec.type}". Known: ${Object.keys(AGENT_TYPES).join(', ')}`);
  return new t.cls(spec, ctx);
}
