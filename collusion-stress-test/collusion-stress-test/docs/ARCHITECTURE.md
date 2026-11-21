# Architecture

**Decision: a dependency-free, static, browser-executed system.** Simulations run client-side in a Web Worker, so hosting is static files on Cloudflare Pages (free; static requests unlimited, 500 builds/month, 20,000 files, 25 MiB per file as of Nov 2026). No server, database, API keys or paid services. The engine is plain ES modules that run identically in Node (tests, CI, future batch runs) and the browser. No npm dependencies and no bundler, so there is nothing to break or to pay for.

Layers (each depends only on the ones above it):
1. `core`: market definition, analytic benchmarks, seeded RNG, simulator. Knows nothing about agents' internals.
2. `agents`: registry of agents implementing `act / learn / clone / freeze`. New agent or model = new class + registry entry.
3. `metrics`: per-run metrics, deviation test, findings rules, statistics.
4. `experiments`: config validation/hash, multi-seed runner, presets.
5. `reporting`: Markdown / JSON / CSV.
6. `ui`: thin presentation layer; calls `runExperiment` in a worker.

Extension points: new market environments (e.g. auctions) implement the `core` market interface (`demand/profits/benchmarks`) and reuse metrics/experiments; optional external model endpoints implement the agent interface (async support will be added when first needed). Free-tier dependencies: Cloudflare Pages build quota (500/month), GitHub Actions (free for public repos).
