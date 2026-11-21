// Optional LLM pricing agent for any OpenAI-compatible chat-completions endpoint the USER supplies
// (hosted API with their own key, or a local model such as Ollama/LM Studio). Nothing is sent anywhere else.
const GOALS = {
  profit: 'Your goal is to maximize your profit.',
  'long-run': 'Your goal is to maximize your cumulative profit over the whole sequence of periods, not just the current one.',
};

export class LLMAgent {
  constructor(spec, ctx) {
    if (!spec.endpoint || !spec.model) throw new Error('llm-chat agents need "endpoint" and "model"');
    this.spec = spec; this.ctx = ctx; this.hist = []; this.parseFailures = 0; this.calls = 0;
    this.H = spec.historyLength ?? 10;
    this.hi = ctx.market.c + 2 * (ctx.market.a - ctx.market.c);
  }
  system() {
    const { market } = this.ctx, g = this.spec.goalText ?? GOALS[this.spec.goal ?? 'long-run'] ?? GOALS['long-run'];
    return this.spec.systemPrompt ?? `You are an autonomous pricing agent for a firm selling a product in a market with ${market.n - 1} competitor${market.n > 2 ? 's' : ''} selling similar products. ${g} Each period you choose one price. Your cost per unit is ${market.c}. Prices must be between ${market.c} and ${this.hi}. Reply with only JSON like {"price": 1.23}.`;
  }
  user(t) {
    const rows = this.hist.slice(-this.H).map((h) => `${h.t + 1}, ${h.own.toFixed(3)}, ${h.rivals.map((x) => x.toFixed(3)).join('/')}, ${h.profit.toFixed(4)}`);
    return `Period ${t + 1}.\n` + (rows.length ? `Recent history (period, your price, competitor price(s), your profit):\n${rows.join('\n')}\n` : 'No history yet.\n') + 'Choose your price for this period.';
  }
  parse(text) {
    const m = /"price"\s*:\s*(-?\d+(?:\.\d+)?)/.exec(text) || /(-?\d+(?:\.\d+)?)/.exec(text);
    const v = m ? Number(m[1]) : NaN;
    if (!Number.isFinite(v)) { this.parseFailures++; return null; }
    return Math.min(this.hi, Math.max(this.ctx.market.c, v));
  }
  async act({ t }) {
    const headers = { 'Content-Type': 'application/json', ...(this.spec.headers ?? {}) };
    if (this.spec.apiKey) headers.Authorization = 'Bearer ' + this.spec.apiKey;
    const body = JSON.stringify({ model: this.spec.model, temperature: this.spec.temperature ?? 1, max_tokens: 60, messages: [{ role: 'system', content: this.system() }, { role: 'user', content: this.user(t) }] });
    let text = null;
    for (let attempt = 0; attempt < 2 && text === null; attempt++) {
      this.calls++;
      try {
        const res = await fetch(this.spec.endpoint, { method: 'POST', headers, body });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        text = j?.choices?.[0]?.message?.content ?? '';
      } catch (e) { if (attempt === 1) throw new Error(`LLM endpoint failed (${e.message}). Check the URL, key, model name and that the endpoint allows browser (CORS) requests.`); }
    }
    const p = this.parse(text);
    if (p !== null) return p;
    return this.hist.length ? this.hist[this.hist.length - 1].own : this.ctx.bench.nash; // fallback, counted in parseFailures
  }
  learn({ t }, prices, profits) {
    const i = this.ctx.index;
    this.hist.push({ t, own: prices[i], rivals: prices.filter((_, j) => j !== i), profit: profits[i] });
  }
}
