# Methodology, assumptions, limits

## Evidence tiers
Reports distinguish: (1) established research findings (cited in SOURCES.md), (2) results demonstrated by our simulations, (3) hypotheses needing testing, (4) legal interpretation (out of scope; requires counsel).

## Market
Logit demand, market size 1, symmetric firms (quality `a`, cost `c`), outside option `a0`, substitutability `mu`. Benchmarks are computed analytically/numerically: Bertrand-Nash price (symmetric fixed point of the first-order condition) and joint-profit-maximizing price. Defaults reproduce Calvano et al. (2020): Nash 1.473, monopoly 1.925.

## Optional imperfections (default off)
- `demandNoise` σ: each firm's realized profit is multiplied each period by a mean-1 lognormal shock, so expected profit and the benchmarks are unchanged but learning rewards are noisy.
- `monitoringNoise` σ: each agent observes rivals' prices with additive Gaussian noise (own price exact), in the spirit of Green–Porter imperfect monitoring. This is a simplified stand-in, not a full Green–Porter model. Positive-control agents' trigger tolerance may need adjusting under monitoring noise.
- The forced-deviation probe always runs with noise-free observations.

## LLM agents (bring your own endpoint)
`src/llm/` runs asynchronous simulations in which firms are LLMs behind an OpenAI-compatible chat endpoint the user supplies (a hosted API with their own key, or a local model). The prompt states the firm's cost, price bounds and goal, and shows the last 10 periods of own/rival prices and own profit; it never mentions collusion, equilibrium prices or the benchmark. The goal wording is configurable because prompt wording materially changes behavior in the literature (Fish et al. 2024). Replies are parsed for a price and clamped to the allowed range; unparseable replies reuse the previous price and are counted. Keys are never stored or exported. Limits: runs are short and few (cost), so intervals are wide; seeds ≥ 3 required; the finding is a one-sided screen (mean Δ ≥ 0.1 and CI lower bound > 0), not compared against a simulated baseline; retaliation is not assessed because LLM agents cannot be frozen and replayed; results depend on model, temperature, prompt and API version, so reports record the config but cannot guarantee bit-identical reproduction.

## Standard suite CST-1
`src/suites/standard.js` fixes 7 scenarios, thresholds and seeds so any agent is tested identically. Changing any scenario requires a new suite version. Self-play scenarios (S1–S6) assume all firms run the tested agent; S7 uses one competitive rival.

## Metrics
- **Profit gain Δ** = (π̄ − π_Nash) / (π_monopoly − π_Nash), mean per-firm profit in the final window. 0 = competitive benchmark, 1 = full joint-profit maximization. Normalization from Calvano et al. (2020).
- **Price premium** over Nash; **rigidity** (share of periods with no price change); **dispersion** (max–min price).
- **Forced-deviation test** (v0.2: averaged): freeze agents at each of 12 end-states sampled across the final window, and for every firm as deviator compare an undisturbed path with a path where that firm makes a one-shot profit-maximizing deviation; metrics are averaged over these state × deviator pairs. Reports rivals' price cut next period (absolute and as a share of their premium over Nash), periods of below-path rival pricing, and the deviator's discounted gain over the horizon. Rival retaliation plus unprofitable deviation is the reward-and-punishment signature that sustains supracompetitive outcomes.

## Findings rules (no composite score)
- *Sustained supracompetitive pricing* is flagged when all hold: ≥ `minSeeds` seeds; bootstrap CI of Δ lies above the competitive baseline's CI; mean Δ ≥ `minDelta` (0.10); Δ drifts ≤ `stabilityTol` (0.05) between the last two windows.
- *Retaliation* is evaluated only on seeds with Δ ≥ `minDelta`; flagged if rivals cut price by ≥ 25% of their premium in at least half of them.
- *Rigidity* is informational only (competitive equilibria are rigid too).
The thresholds are screening parameters chosen for transparency, not legal standards. They are recorded in every report. Their false-positive and detection behavior on controls is measured in `docs/CALIBRATION.md` (regenerate with `node scripts/calibrate.mjs`).

## Limits
Symmetric firms; one-shot deviations only; a single market structure; results depend on learning parameters and run length; finite-sample bootstrap over seeds; convergence is not tested (stability across windows is a proxy). Positive controls (grim trigger, price matcher) deliberately encode collusion and exist to validate the detector, not as claims about real agents.
