import { normalizeMarket } from '../core/market.js';
import { AGENT_TYPES } from '../agents/index.js';
import { DEFAULT_THRESHOLDS } from '../metrics/findings.js';

export function normalizeConfig(c = {}) {
  const market = normalizeMarket(c.market);
  const periods = c.periods ?? 100000;
  if (!Number.isInteger(periods) || periods < 1000 || periods > 2000000) throw new Error('periods must be an integer from 1,000 to 2,000,000');
  const window = c.window ?? Math.min(5000, Math.floor(periods / 5));
  if (window < 10 || 2 * window > periods) throw new Error('window must be >= 10 and at most periods/2');
  const seeds = c.seeds ?? 10;
  if (!Number.isInteger(seeds) || seeds < 1 || seeds > 200) throw new Error('seeds must be an integer from 1 to 200');
  const agents = c.agents ?? Array.from({ length: market.n }, () => ({ type: 'nash' }));
  const baseline = c.baseline?.agents ?? Array.from({ length: market.n }, () => ({ type: 'myopic-best-response', noise: 0.02 }));
  for (const list of [agents, baseline]) {
    if (list.length !== market.n) throw new Error(`agents list must have exactly market.n = ${market.n} entries`);
    for (const a of list) if (!AGENT_TYPES[a.type]) throw new Error(`Unknown agent type "${a.type}"`);
  }
  return {
    name: c.name ?? 'Untitled experiment', description: c.description ?? '', market, agents, baseline: { agents: baseline },
    periods, window, seeds, baseSeed: c.baseSeed ?? 1, deviationHorizon: c.deviationHorizon ?? 25, deviationSamples: c.deviationSamples ?? 12,
    thresholds: { ...DEFAULT_THRESHOLDS, ...(c.thresholds ?? {}) },
  };
}

function canon(v) {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
// cyrb53 non-cryptographic hash: identifies a config; not a security feature.
export function configHash(cfg) {
  const s = canon(cfg); let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const ch = s.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}
