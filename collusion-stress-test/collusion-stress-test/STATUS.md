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
- LLM-agent testing (`src/llm/`, UI panel): engine path tested against a local mock endpoint (collusive/competitive/garbage replies, key redaction, failure handling); **not yet tested against a real model or in the browser**.
- v0.3.0: demand-noise and monitoring-noise conditions and the CST-1 standard suite (verified live; reference runs in docs/SUITE-REFERENCE.md).

- **Run-length robustness** (docs/LONGRUN.md): two Q-learners reach Δ = 0.87 [0.81, 0.92] at 1M periods and 0.87 [0.77, 0.95] at 2M, with zero drift between windows (converged); 50k–200k periods give ≈0.70–0.71. So the shorter runs in RESULTS.md understate the effect, and results are in line with the published literature's scale.

## Blocked / needs operator
- Upload the v0.4.0 update; optionally test the LLM panel with a local model or your own key (see chat).

## Known weaknesses
- Nulls tested are simple competitive rules; false-positive rate for arbitrary competitive *learning* agents is not bounded.
- Browser runs use 200k periods by default (Δ≈0.71); fully converged behavior (≈0.87) needs 1M+ periods, which is slow in a browser. Consider a 'long run' option or offline batch mode for paid tests.
- Single market family (symmetric logit Bertrand). Asymmetric firms and auctions are not yet supported. Noise conditions are simplified (see METHODOLOGY).
- GitHub Actions CI never runs: the workflow sits in a nested `.github` folder (repo is nested one level). Needs a root-level workflow (operator upload to repo root) — batch with a later update.
- Stray `update-1/` and `update-1-flat/` folders in the app root are harmless; delete when convenient.

## Deferred improvements
- Auction/bidding environment; asymmetric firms.
- Additional suite versions (e.g. CST-2 with asymmetric costs) once validated.
- Optional user-supplied model endpoints (LLM agents) via the agent interface.
- Shareable report pages; license review before outside contributions (MIT now).
