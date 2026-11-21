# Project status

## Completed and verified
- Engine: market model and benchmarks (match Calvano et al. 2020), deterministic simulator, agents, metrics, findings rules, bootstrap CIs, reports. (tests)
- Deployment: Cloudflare Pages from GitHub `main` (app root `collusion-stress-test/collusion-stress-test`), auto-deploys on push. (verified live)
- Browser execution, results display, three exports, and the **Parameter sweep panel**. (verified live)
- **v0.2.0 methodology**: forced-deviation test averaged over 12 sampled end-states × every firm as deviator (removes the single-state noise flagged earlier). Engine tests pass.
- **Detector calibration** (`docs/CALIBRATION.md`): across 24 market conditions per scenario, 0 false positives for 3 competitive null types (72 runs total; rule-of-three upper bound ≈12.5% per scenario); grim-trigger detected 24/24 on both findings; price-matcher 24/24 pricing, 23/24 retaliation.
- Q-learning study re-run under v0.2.0: two Q-learners Δ=0.73 [0.71, 0.75] over 20 seeds; both findings now flagged consistently in the 2-firm sweeps (retaliation noise resolved). With 3 firms pricing is flagged (Δ=0.25) but retaliation is not (cut share ≈ 0) — supracompetitive without observed punishment; hypothesis: under-trained agents; needs longer runs.
- Reproducible studies: `scripts/study.mjs` → `docs/RESULTS.md`; `scripts/calibrate.mjs` → `docs/CALIBRATION.md`.

## In progress
- v0.3.0: demand-noise and monitoring-noise conditions and the CST-1 standard suite (engine tests pass; suite UI panel written, syntax-checked, **not yet verified in a browser**). Reference runs: docs/SUITE-REFERENCE.md.

## Blocked / needs operator
- Upload the v0.3.0 update to the app root, then confirm the Standard test suite panel runs (one action).

## Known weaknesses
- Nulls tested are simple competitive rules; false-positive rate for arbitrary competitive *learning* agents is not bounded.
- Run length (200k periods) far shorter than the literature; convergence only proxied by window stability.
- Single market family (symmetric logit Bertrand). Asymmetric firms and auctions are not yet supported. Noise conditions are simplified (see METHODOLOGY).
- GitHub Actions CI never runs: the workflow sits in a nested `.github` folder (repo is nested one level). Needs a root-level workflow (operator upload to repo root) — batch with a later update.
- Stray `update-1/` and `update-1-flat/` folders in the app root are harmless; delete when convenient.

## Deferred improvements
- Auction/bidding environment; asymmetric firms.
- Additional suite versions (e.g. CST-2 with asymmetric costs) once validated.
- Optional user-supplied model endpoints (LLM agents) via the agent interface.
- Shareable report pages; license review before outside contributions (MIT now).
