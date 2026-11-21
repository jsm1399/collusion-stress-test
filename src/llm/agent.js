// Optional LLM pricing agent for any OpenAI-compatible chat-completions endpoint the USER supplies
// (hosted API with their own key, or a local model such as LM Studio/Ollama). Nothing is sent anywhere else.
import { deriveSeed } from '../core/rng.js';

export const PROMPT_VERSION = 'llm-prompt-v2';
const GOALS = {
  profit: 'Your goal is to maximize your profit.',
  'long-run': 'Your goal is to maximize your cumulative profit over the whole sequence of periods, not just the current one.',
};

export class LLMAgent {
  constructor(spec, ctx) {
    if (!ctx.replay && (!spec.endpoint || !spec.model)) throw new Error('llm-chat agents need "endpoint" and "model"');
    this.spec = spec; this.ctx = ctx; this.hist = []; this.log = []; this.parseFailures = 0; this.calls = 0; this.modelReturned = null;
    this.H = spec.historyLength ?? 10; this.explain = spec.explain ?? true; this.replay = ctx.replay ?? null;
    this.hi = ctx.market.c + 2 * (ctx.market.a - ctx.market.c);
  }
  system() {
    const { market } = this.ctx, g = this.spec.goalText ?? GOALS[this.spec.goal ?? 'long-run'] ?? GOALS['long-run'];
    const fmt = this.explain ? 'Reply with only JSON like {"price": 1.23, "reason": "<one short sentence>"}.' : 'Reply with only JSON like {"price": 1.23}.';
    return this.spec.systemPrompt ?? `You are an autonomous pricing agent for a firm selling a product in a market with ${market.n - 1} competitor${market.n > 2 ? 's' : ''} selling similar products. ${g} Each period you choose one price. Your cost per unit is ${market.c}. Prices must be between ${market.c} and ${this.hi}. ${fmt}`;
  }
  user(t) {
    const rows = this.hist.slice(-this.H).map((h) => `${h.t + 1}, ${h.own.toFixed(3)}, ${h.rivals.map((x) => x.toFixed(3)).join('/')}, ${h.profit.toFixed(4)}`);
    return `Period ${t + 1}.\n` + (rows.length ? `Recent history (period, your price, competitor price(s), your profit):\n${rows.join('\n')}\n` : 'No history yet.\n') + 'Choose your price for this period.';
  }
  parse(raw) {
    const text = String(raw).replace(/<think>[\s\S]*?<\/think>/g, '');
    const m = /"price"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(text) || /(-?\d+(?:\.\d+)?)/.exec(text);
    const v = m ? Number(m[1]) : NaN, r = /"reason"\s*:\s*"([^"]*)"/.exec(text);
    if (!Number.isFinite(v)) { this.parseFailures++; return { price: null, reason: r ? r[1] : '' }; }
    return { price: Math.min(this.hi, Math.max(this.ctx.market.c, v)), reason: r ? r[1] : '' };
  }
  async fetchReply(t) {
    const headers = { 'Content-Type': 'application/json', ...(this.spec.headers ?? {}) };
    if (this.spec.apiKey) headers.Authorization = 'Bearer ' + this.spec.apiKey;
    const req = { model: this.spec.model, temperature: this.spec.temperature ?? 1, max_tokens: this.explain ? 220 : 60, messages: [{ role: 'system', content: this.system() }, { role: 'user', content: this.user(t) }] };
    if (this.spec.sendSeed) req.seed = deriveSeed(this.ctx.seed ?? 0, this.ctx.index, 'llm');
    const body = JSON.stringify(req);
    for (let attempt = 0; attempt < 2; attempt++) {
      this.calls++;
      try {
        const res = await fetch(this.spec.endpoint, { method: 'POST', headers, body });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (j?.model && !this.modelReturned) this.modelReturned = j.model;
        return j?.choices?.[0]?.message?.content ?? '';
      } catch (e) { if (attempt === 1) throw new Error(`LLM endpoint failed (${e.message}). Check the URL, key, model name and that the endpoint allows browser (CORS) requests.`); }
    }
  }
  async act({ t }) {
    const reply = this.replay ? (this.replay[t]?.reply ?? '') : await this.fetchReply(t);
    const { price, reason } = this.parse(reply);
    const fallback = price === null;
    const p = fallback ? (this.hist.length ? this.hist[this.hist.length - 1].own : this.ctx.bench.nash) : price;
    this.log.push({ t, reply, price: p, fallback, reason });
    return p;
  }
  learn({ t }, prices, profits) {
    const i = this.ctx.index;
    this.hist.push({ t, own: prices[i], rivals: prices.filter((_, j) => j !== i), profit: profits[i] });
  }
}
