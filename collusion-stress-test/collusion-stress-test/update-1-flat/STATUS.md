# Project status

## Completed and verified
- Market model, benchmarks (Nash 1.473 / monopoly 1.925 match Calvano et al. 2020), deterministic simulator, agents, metrics, forced-deviation test, findings rules, bootstrap CIs, Markdown/JSON/CSV reports. (engine tests)
- Negative control (Nash agents) not flagged; positive control (grim trigger) flagged for pricing and retaliation. (tests)
- **Deployment: Cloudflare Pages from GitHub `main`, auto-deploys on push.** (verified live)
- **Browser execution, results display (findings, tables, charts), and all three exports (Markdown, JSON, CSV).** (verified live in browser)
- Parameter-sweep engine (`src/experiments/sweep.js`, test passes) and reproducible study script (`scripts/study.mjs` → `docs/RESULTS.md`; 20-seed baseline + sweeps over μ, firm count, exploration decay).

## In progress
- Sweep UI panel (index.html, ui/app.js, ui/worker.js): written, syntax-checked, engine path tested in Node; **not yet verified in a browser**. Existing single-run path unchanged (worker stays backward-compatible).

## Blocked / needs operator
- Upload the update files to GitHub and check that "Run sweep" works on the deployed site (one action).

## Findings from our simulations (see docs/RESULTS.md; stylized market only)
- Two independent Q-learners: Δ = 0.73 [0.71, 0.75] over 20 seeds (all 20 seeds Δ ≥ 0.6) vs −0.004 for the competitive baseline; price premium ≈ 17% over Nash; deviating was unprofitable on average. Direction matches Calvano et al. (2020).
- Δ falls with weaker product differentiation (μ 0.1→1: 0.70→0.47) and with a third firm (0.71→0.25, though 3-firm agents are less trained at 200k periods).
- Slow exploration decay (β=2e-5) was correctly *not* flagged as sustained: Δ was still drifting.

## Known weaknesses (next work)
- Retaliation rule is noisy: it uses one forced deviation from one end state, and its per-seed share is high-variance (e.g. μ=0.1 mean cut share 0.65 yet not flagged). Fix: average the deviation test over many sampled states/deviation sizes.
- Thresholds (Δ ≥ 0.1, drift ≤ 0.05, cut ≥ 25%) are transparent but not calibrated; need a false-positive study over null (competitive) agents across markets.
- Run length (200k periods) is far shorter than the literature's; convergence is only proxied by window stability.

## Deferred improvements
- Demand noise / imperfect monitoring; asymmetric firms; auction/bidding environment.
- Optional user-supplied model endpoints (LLM agents) via the agent interface.
- Shareable report pages; versioned standard test suites (commercial groundwork).
- License review before accepting outside contributions (currently MIT).
