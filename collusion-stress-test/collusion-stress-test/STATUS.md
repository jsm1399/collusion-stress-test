# Project status

## Completed and verified
- Market model and benchmarks: Nash 1.473 / monopoly 1.925 match Calvano et al. (2020). (unit test)
- Deterministic simulator and seeded RNG; identical config ⇒ identical results. (test)
- Agents: nash, myopic-best-response, fixed, grim-trigger, price-matcher, q-learning. (tests exercise nash, grim-trigger, q-learning)
- Metrics, forced-deviation test, findings rules, bootstrap CIs. (negative control not flagged; positive control flagged for pricing and retaliation)
- Reports: Markdown / JSON / CSV. (test)
- Static build script (`dist/` produced). CI workflow written.

## In progress
- First deployment (GitHub repo → Cloudflare Pages).

## Blocked / needs operator
- Create GitHub repo and upload files; connect Cloudflare Pages (account actions only).

## Not yet verified
- Browser UI (`index.html`, `ui/`): syntax-checked and engine calls verified in Node, but not yet opened in a real browser. First check happens on the deployed site.
- GitHub Actions CI has not yet run on GitHub.

## Observations from development runs (not yet scientific claims)
- 2 Q-learning agents, 200k periods, 4 seeds: mean Δ ≈ 0.73, rivals cut price after a forced deviation, deviation unprofitable. Consistent in direction with Calvano et al. (2020); needs 8+ seeds and sensitivity analysis before being reported.
- Q-learner vs myopic best-responder: mean Δ ≈ 0.36 (4 seeds). Unexplained; hypothesis: the learner exploits a predictable rival.

## Deferred improvements
- Sensitivity sweeps (learning rate, exploration, market parameters) and cross-run reports.
- Demand noise / imperfect monitoring (Green–Porter-style) conditions; asymmetric firms.
- Auction/bidding environment.
- Optional user-supplied model endpoints (LLM agents) via the agent interface.
- License review before accepting outside contributions (currently MIT).
