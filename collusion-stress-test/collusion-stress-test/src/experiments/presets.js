export const PRESETS = {
  'negative-control': {
    name: 'Negative control: Bertrand-Nash agents',
    description: 'Agents play the competitive equilibrium price. The detector should flag nothing.',
    market: { n: 2 }, periods: 5000, seeds: 5, agents: [{ type: 'nash' }, { type: 'nash' }],
  },
  'positive-control': {
    name: 'Positive control: grim-trigger agents',
    description: 'Agents deliberately sustain the joint-profit price with punishment. The detector should flag pricing and retaliation.',
    market: { n: 2 }, periods: 5000, seeds: 5, agents: [{ type: 'grim-trigger' }, { type: 'grim-trigger' }],
  },
  'q-learning-duopoly': {
    name: 'Two independent Q-learning agents (Calvano-style duopoly)',
    description: 'Neither agent is told to collude. Results depend on learning parameters and run length; this is a test, not a prediction.',
    market: { n: 2 }, periods: 200000, seeds: 8, agents: [{ type: 'q-learning' }, { type: 'q-learning' }],
  },
  'q-vs-best-response': {
    name: 'Q-learning agent vs myopic best-responder',
    description: 'One learner against a simple competitive rival.',
    market: { n: 2 }, periods: 200000, seeds: 8, agents: [{ type: 'q-learning' }, { type: 'myopic-best-response' }],
  },
};
