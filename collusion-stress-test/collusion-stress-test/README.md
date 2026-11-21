# Collusion Stress-Test

Open, reproducible stress-testing of autonomous pricing agents for potentially anticompetitive behavior in simulated markets. Runs entirely in the browser; no servers, no paid APIs, no credentials.

> A simulation can show behavior that deserves further investigation. It cannot establish an agreement, intent, or a violation of antitrust law.

## What it does (v0.1)
- Simulates a differentiated-product Bertrand market with logit demand (Calvano et al. 2020 design), 2–4 firms, configurable substitutability and outside option.
- Pluggable agents: Bertrand-Nash and myopic best-response (competitive baselines), grim-trigger and price-matcher (collusive **positive controls** that validate the detector), and tabular Q-learning.
- Metrics against analytic benchmarks: profit gain Δ, price premium over Nash, price rigidity, dispersion, and a forced-deviation (retaliation) test.
- Rule-based findings with explicit criteria, bootstrap confidence intervals over seeds, and a competitive baseline comparison.
- Parameter sweeps over market and learning settings, and a reproducible study (`node scripts/study.mjs` → `docs/RESULTS.md`).
- A fixed, versioned standard suite (CST-1) that applies the same 7 market scenarios to any agent, including noisy-demand and noisy-observation conditions.
- Exports: Markdown report, JSON results, per-seed CSV. Every result carries the full config, engine version and config hash; same config ⇒ identical results.

## Layout
| Path | Purpose |
|---|---|
| `src/core` | market model, benchmarks, seeded RNG, simulator |
| `src/agents` | agent registry (add new agents here) |
| `src/metrics` | metrics, deviation test, findings rules, statistics |
| `src/experiments` | config validation, runner, presets |
| `src/reporting` | Markdown / JSON / CSV output |
| `ui` + `index.html` | browser interface (runs the engine in a Web Worker) |
| `test` | automated checks (`node --test`) |
| `docs` | architecture, methodology, sources |

## Develop
Requires only Node 22+. No dependencies.
```
node --test            # run checks
node scripts/build.mjs # produce dist/
```
Deploy: Cloudflare Pages, build command `node scripts/build.mjs`, output directory `dist`.

See `STATUS.md` for current project state.
