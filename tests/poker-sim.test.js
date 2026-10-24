// Headless simulation of full final tables with every seat on AI.
// Run from the repo root: node --test
const test = require('node:test');
const assert = require('node:assert');
const W = require('../stellarhaus_vercel/poker-engine.js');
const B = require('../stellarhaus_vercel/poker-bots.js');

const SEATS = [
  { id: 'kevin', name: 'Kevin', kind: 'human' },
  { id: 'firo', name: 'Firo', kind: 'human' },
  { id: 'dwan', name: 'Tom Dwan', kind: 'bot', persona: 'dwan' },
  { id: 'hellmuth', name: 'Phil Hellmuth', kind: 'bot', persona: 'hellmuth' },
  { id: 'negreanu', name: 'Daniel Negreanu', kind: 'bot', persona: 'negreanu' },
];
const total = G => G.players.reduce((s, p) => s + p.stack + p.bet, 0) + W.potTotal(G) - G.players.reduce((s, p) => s + p.bet, 0);

function playGame(maxHands = 400) {
  const G = W.newGame(SEATS);
  const start = G.players.reduce((s, p) => s + p.stack, 0);
  const sorted = G.players.slice().sort((a, b) => b.stack - a.stack).map(p => p.id);
  assert.strictEqual(sorted[2], 'firo', 'Firo is 3rd in chips');
  assert.strictEqual(sorted[4], 'kevin', 'Kevin is last in chips');
  W.drawForButton(G);
  let actions = 0;
  while (G.phase !== 'over' && G.handNo < maxHands) {
    W.startHand(G);
    B.onHandStart(G);
    let guard = 0;
    while (G.phase !== 'handEnd' && G.phase !== 'over') {
      if (++guard > 500) throw new Error('hand stuck in ' + G.phase);
      assert.strictEqual(total(G), start, `chips conserved (hand ${G.handNo}, ${G.phase})`);
      if (G.phase === 'betting') {
        const d = B.decide(G, G.toAct);
        assert.ok(d, 'bot produced a decision');
        const r = W.applyAction(G, G.toAct, d);
        assert.ok(r.ok, r.err);
        actions++;
      } else if (G.phase === 'deal') W.dealStreet(G);
      else if (G.phase === 'showdown') W.resolveShowdown(G);
      else if (G.phase === 'showmuck') W.showOrMuck(G, G.showmuck.seat, B.showChoice(G, G.showmuck.seat));
      else throw new Error('unexpected phase ' + G.phase);
    }
    B.onHandEnd(G);
    const live = G.players.reduce((s, p) => s + p.stack, 0);
    assert.strictEqual(live, start, 'chips conserved at hand end');
    for (const p of G.players) {
      assert.ok(p.stack % W.UNIT === 0, 'stacks stay in chip units');
      assert.ok(p.stack >= 0);
    }
  }
  return { G, actions };
}

test('evaluator ranks hands correctly', () => {
  const c = s => s.match(/../g).map(x => W.RANKS.indexOf(x[0]) * 4 + W.SUITS.indexOf(x[1]));
  const e = h => W.evaluate(c(h));
  assert.ok(e('AsKsQsJsTs2d3c') > e('9s9d9c9h2s3d4c'));
  assert.ok(e('9s9d9c9h2s3d4c') > e('KsKdKcQhQs2d3c'));
  assert.ok(e('KsKdKcQhQs2d3c') > e('As9s7s4s2sKd3c'));
  assert.ok(e('As9s7s4s2sKd3c') > e('9h8d7c6s5hKdKc'));
  assert.ok(e('6h5d4c3s2hKdKc') > e('Ah2d3c4s5hKdKc'), 'six-high straight beats the wheel');
  assert.ok(e('7h7d7c2s5hKdQc') > e('7h7d2c2s5h5dQc'));
  assert.ok(e('AhAd2c2s5h5dKc') > e('AhAd2c2s5h5dQc'), 'kicker plays with three pairs');
  assert.strictEqual(e('AhKd2c3s5h9dQc') , e('AsKc2c3s5h9dQc'));
});

test('side pots and odd chips', () => {
  const G = W.newGame(SEATS, { stacks: { kevin: 10e6, firo: 50e6, dwan: 80e6, hellmuth: 30e6, negreanu: 60e6 } });
  G.button = 4; W.startHand(G);
  // Everyone shoves / calls preflop
  let guard = 0;
  while (G.phase === 'betting' && guard++ < 20) W.applyAction(G, G.toAct, { type: 'raise', to: 1e12 });
  assert.notStrictEqual(G.phase, 'betting');
  const pots = W.buildPots(G);
  assert.ok(pots.length >= 3, 'multiple side pots');
  assert.strictEqual(pots.reduce((s, p) => s + p.amount, 0), W.potTotal(G));
  while (G.phase === 'deal') W.dealStreet(G);
  W.resolveShowdown(G);
  assert.strictEqual(G.players.reduce((s, p) => s + p.stack, 0), 230e6);
});

test('incomplete all-in raise does not reopen betting', () => {
  const G = W.newGame(SEATS, { stacks: { kevin: 7e6, firo: 100e6, dwan: 100e6, hellmuth: 100e6, negreanu: 100e6 } });
  G.button = 1; W.startHand(G); // SB dwan, BB hellmuth, UTG negreanu, CO kevin, BTN firo
  assert.strictEqual(G.players[G.toAct].id, 'negreanu');
  W.applyAction(G, G.toAct, { type: 'raise', to: 5e6 });   // open to 5M (raise of 3M)
  W.applyAction(G, G.toAct, { type: 'raise', to: 7e6 });   // kevin all-in 7M: only +2M, incomplete
  W.applyAction(G, G.toAct, { type: 'fold' });             // firo
  W.applyAction(G, G.toAct, { type: 'fold' });             // dwan
  W.applyAction(G, G.toAct, { type: 'call' });             // hellmuth calls 7M
  const la = W.legalActions(G, G.toAct);
  assert.strictEqual(G.players[G.toAct].id, 'negreanu');
  assert.strictEqual(la.canRaise, false, 'opener may only call or fold');
});

test('heads-up: button posts small blind and acts first preflop', () => {
  const G = W.newGame(SEATS, { stacks: { kevin: 0, firo: 50e6, dwan: 0, hellmuth: 0, negreanu: 60e6 } });
  G.players.forEach(p => { if (!p.stack) p.out = true; });
  G.button = 1; W.startHand(G);
  assert.strictEqual(G.sb, G.button);
  assert.strictEqual(G.toAct, G.button);
});

test('full AI final tables finish with correct payouts', () => {
  let hands = 0, games = 0;
  for (let g = 0; g < 12; g++) {
    const { G } = playGame();
    assert.strictEqual(G.phase, 'over', 'game reached a champion');
    const places = G.results.map(r => r.place).sort();
    assert.deepStrictEqual(places, [1, 2, 3, 4, 5]);
    const paid = G.results.reduce((s, r) => s + r.prize, 0);
    assert.strictEqual(paid, W.PAYOUTS.reduce((a, b) => a + b, 0));
    hands += G.handNo; games++;
  }
  console.log(`  ${games} games, avg ${Math.round(hands / games)} hands`);
});
