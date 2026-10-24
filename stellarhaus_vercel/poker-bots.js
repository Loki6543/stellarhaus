/* ─────────────────────────────────────────────────────────────
   WSOP 2027 Final Table — AI opponents
   Each bot models every opponent (VPIP, PFR, fold-to-bet, shown
   bluffs) and adjusts on the fly. Pure logic, no DOM.
   ───────────────────────────────────────────────────────────── */
(function (root) {
'use strict';
const W = root.WSOP || (typeof require !== 'undefined' ? require('./poker-engine.js') : null);
const { rank, suit, evaluate, scoreCat, scoreKick, rand, roundUnit, inHand, canAct, curLevel, legalActions } = W;

const PERSONAS = {
  dwan: {
    id: 'dwan', name: 'Tom Dwan', short: 'Dwan', nick: '“durrrr”', initials: 'TD', color: '#3fa7ff',
    era: '2008 · the online wunderkind',
    style: 'Hyper-aggressive wildcard',
    bio: 'The kid who built a bankroll from $50 online and started firing at nosebleed games. Opens half his hands, 3-bets light, and fires big polarized overbets. Most likely player at the table to be bluffing.',
    strengths: ['Relentless pressure — light 3-bets and triple barrels', 'Big polarized overbets that are hard to play against', 'Thin value bets — he gets paid with second-best hands'],
    weaknesses: ['Over-bluffs, especially into sticky callers', 'Spews for a few hands after a big loss', 'Barrels into scary boards even when you have it'],
    tell: 'River overbets are close to 50/50 bluffs. Hero-call him with bluff-catchers.',
    open: 0.50, limp: 0.02, callWide: 1.12, threeBet: 0.07, threeBetBluff: 0.22, cbet: 0.85, barrel: 0.62,
    bluff: 0.40, semi: 0.70, valueRel: 1.10, raiseRel: 1.50, callAdj: 0.0, allinAdj: -0.01, loose: 1.3,
    value: [0.75, 1.0, 1.4], bluffSize: [0.75, 1.0, 1.4, 1.8], openBB: 2.4, think: [500, 2400], wild: 0.14,
  },
  hellmuth: {
    id: 'hellmuth', name: 'Phil Hellmuth', short: 'Hellmuth', nick: '“The Poker Brat”', initials: 'PH', color: '#e8c15a',
    era: '1989 · the youngest world champion',
    style: 'Tight-aggressive — until he tilts',
    bio: 'Fresh off his 1989 Main Event win, playing textbook tight-aggressive poker: few hands, raised hard. Lose a big pot to him and you\'ll hear about it. Lose one he thinks he should have won and there\'s a coin flip he explodes.',
    strengths: ['Disciplined preflop — he rarely enters a pot with junk', 'Folds big hands when he\'s beat', 'Value-heavy: when he bets, he usually has it'],
    weaknesses: ['After losing a big pot, 50% chance he goes on TILT for several hands', 'On tilt he makes completely random plays — min-raises, shoves, folds', 'Too tight when calm — steal his blinds'],
    tell: 'Calm Hellmuth betting = strong. Tilted Hellmuth = anything. Watch the TILT badge.',
    open: 0.15, limp: 0, callWide: 0.70, threeBet: 0.045, threeBetBluff: 0.03, cbet: 0.68, barrel: 0.38,
    bluff: 0.10, semi: 0.45, valueRel: 1.28, raiseRel: 1.70, callAdj: 0.05, allinAdj: 0.07, loose: 0.8,
    value: [0.6, 0.75], bluffSize: [0.5, 0.6], openBB: 2.5, think: [900, 2600], tiltChance: 0.5,
  },
  negreanu: {
    id: 'negreanu', name: 'Daniel Negreanu', short: 'Negreanu', nick: '“Kid Poker”', initials: 'DN', color: '#ff7a59',
    era: 'Early 2000s · pre-solver small ball',
    style: 'Loose-passive soul reader',
    bio: 'Talks through every hand and is scarily good at telling you what you hold. Snuffs out bluffs. But this is before solvers and GTO — he plays far too many hands, limps a ton, and calls raises with anything suited.',
    strengths: ['Soul reads — often knows when you\'re bluffing', 'Calls down light against aggressive players', 'Small-ball pots keep his risk low'],
    weaknesses: ['Plays way too many hands and limps a lot', 'Calls raises out of position with weak hands', 'Bet-sizing tell: tiny bets = medium hands, big bets = the nuts'],
    tell: 'Small bet (⅓ pot) = medium hand you can raise. Pot-sized bet = he has it.',
    open: 0.20, limp: 0.30, callWide: 1.45, threeBet: 0.05, threeBetBluff: 0.04, cbet: 0.60, barrel: 0.30,
    bluff: 0.14, semi: 0.55, valueRel: 1.18, raiseRel: 1.65, callAdj: -0.01, allinAdj: 0.02, loose: 1.1,
    value: [0.8, 1.0], medium: [0.33, 0.4], bluffSize: [0.33, 0.4], openBB: 2.2, think: [800, 2900],
    read: 0.35, readAcc: 0.76,
  },
  auto: {
    id: 'auto', name: 'Autopilot', short: 'Auto', nick: '', initials: 'AP', color: '#9aa4b2',
    era: '', style: 'Solid regular', bio: 'Plays the empty seat until its owner connects.',
    strengths: [], weaknesses: [], tell: '',
    open: 0.25, limp: 0, callWide: 1.0, threeBet: 0.06, threeBetBluff: 0.06, cbet: 0.65, barrel: 0.4,
    bluff: 0.2, semi: 0.5, valueRel: 1.2, raiseRel: 1.6, callAdj: 0, allinAdj: 0.03, loose: 1,
    value: [0.66], bluffSize: [0.66], openBB: 2.3, think: [700, 1500],
  },
};

const LINES = {
  dwan: {
    start: ['Let’s gamble.', 'durrrr.', 'Five left. Somebody’s gotta take the chips, might as well be me.'],
    win: ['Ship it.', 'Standard.', 'nh to me.', 'That felt routine.'],
    bigwin: ['That’s the one I wanted.', 'Thanks for the chips.', 'Stack is looking healthy now.'],
    lose: ['Variance.', 'Sick.', 'All good, I’ll get it back.', 'gg wp, that was a sweat'],
    showBluff: ['Had to keep you honest.', 'Seven-deuce is a lifestyle.', 'You’d have called if you had it.', 'Couldn’t let you have that one.'],
    wild: ['Feeling frisky this orbit.', 'Let’s make this interesting.', 'Who wants to play a big pot?'],
    bust: ['gg, played great.', 'Good game. Unlucky.'],
    chat: ['lol', 'durrrr', 'You sure about that?', 'I like your energy.', 'Stop talking and put chips in.'],
  },
  hellmuth: {
    start: ['I’m the best Hold’em player in the world. I just need the cards to cooperate.', 'Let me show you all how to play poker.'],
    win: ['That’s how you play poker, folks.', 'I read you like a book.', 'Too easy.', 'Never in doubt.'],
    bigwin: ['THAT is world-class poker.', 'See? Perfect poker gets rewarded eventually.'],
    lose: ['Unbelievable.', 'How do you CALL there?!', 'Typical.', 'Of course. Of course you hit.'],
    tilt: ['If there weren’t luck involved, I’d win every one!', 'You don’t even know what you’re DOING and you win?!', 'These amateurs just keep sucking out!', 'I can’t believe this. I CANNOT believe this!', 'Dealer, can we get a new deck? This one hates me.'],
    antics: ['Hellmuth stands up and walks a full lap around the table.', 'Hellmuth tosses his sunglasses onto the felt.', 'Hellmuth asks the floor whether the deck has been tested.', 'Hellmuth lies down on the carpet next to the table for a moment.', 'Hellmuth starts counting his bracelets out loud.', 'Hellmuth orders a sandwich in the middle of the hand.', 'Hellmuth gives a speech to the rail about how unlucky he is.'],
    calm: ['Okay. Deep breath. Back to playing perfect poker.', 'White magic, baby. I’m back.', 'Alright. Focus, Phil. Focus.'],
    composed: ['I’m fine. I’m totally fine.', 'Whatever. Still the best player here.'],
    fold: ['I fold. I KNOW you have it.', 'Great laydown, if I do say so myself.'],
    bust: ['Good riddance — I mean, gg.', 'Another one bites the dust.'],
    chat: ['Don’t talk to me while I’m playing perfect poker.', 'Do you know who I am?', 'You’re lucky I’m in a good mood.', 'Just wait. I’ll get you.'],
  },
  negreanu: {
    start: ['Alright, let’s have some fun, guys!', 'Final table at the Main Event — does it get any better than this?'],
    win: ['Knew it!', 'Small ball, big results.', 'I had a feeling about that one.', 'Called it!'],
    bigwin: ['SOUL READ, baby!', 'I knew exactly where you were in that hand.'],
    lose: ['Ugh, I knew it and I still played the hand.', 'Nice hand. Well played.', 'I just wanted to see a flop…'],
    readBluff: ['That bet looks like a bluff to me, {name}.', 'Something smells fishy here…', 'You missed your draw, didn’t you {name}?', 'I don’t think you have it.'],
    readStrong: ['You’ve got it, don’t you {name}? I can tell.', 'That’s a big hand. I’m not paying you off.', 'I think you’ve got me beat here, {name}.'],
    loose: ['Any two can win!', 'I just want to see a flop.', 'Suited! Gotta play it.'],
    bust: ['gg, that was a great run!', 'Tough spot, well played all tournament.'],
    chat: ['Haha, I love the table talk!', 'You’re a tough read, I’ll give you that.', 'I think you’re bluffing right now. In the chat.', 'Good vibes at this table!'],
  },
};
/* ── Rivalry files ─────────────────────────────────────────
   Seeded from real televised hands between these three, then
   reshaped live by the head-to-head ledger at this table.
   adj keys: bluffMul · valueAdj (thinner value) · callAdj (− = calls lighter)
   threeBetMul · floatAdj (flop/turn calls) · riverCallAdj · trap (slow-play
   big pairs vs them) · tiltMul · isoMul (attack their limps) · readAccAdj
   sizeMul · bluffPrior · tiltPounce / tiltTarget (when Hellmuth is tilting) */
const RIVALRY = {
  dwan: {
    hellmuth: {
      title: 'Has cracked his aces twice',
      hands: [
        'Poker After Dark: 4-bet Hellmuth light, then moved all-in for $120K on the river with the ten Hellmuth feared — Hellmuth called with 9-7 and lost a pot of almost $330K.',
        '2008 NBC Heads-Up Championship: busted Hellmuth with pocket tens against pocket aces.',
        'High Stakes Duel III, Round 2 (2021): cracked Hellmuth’s slow-played A♥ A♣ with 9♠ 3♣ — his first loss on the show.',
      ],
      plan: 'Value-bets him thin and big because Hellmuth calls polarized shoves. 3-bets his opens light. Bluffs him less on the river, and isolates him when he tilts.',
      adj: { valueAdj: 0.08, bluffMul: 0.8, threeBetMul: 1.6, sizeMul: 1.2, tiltTarget: 1.6 },
      taunt: ['Same as Poker After Dark, Phil.', 'You knew I had it, didn’t you Phil?', 'Thought you’d have learned by now, Phil.'],
      gripe: ['Okay Phil, you got me that time.', 'Revenge round, huh Phil?'],
    },
    negreanu: {
      title: 'Hero-called him with nine-high',
      hands: [
        'High Stakes Poker, Season 6: called Negreanu’s $28,200 river bet with 9♥ 5♥, reading a missed straight draw — Negreanu had floated with K♠ 10♠ and turned top pair.',
        'High Stakes Poker, Season 6: rivered two pair to take a pot from Negreanu’s top pair.',
      ],
      plan: 'Bluffs him less (Daniel floats), value-bets thinner, and still can’t resist hero-calling his river bets.',
      adj: { bluffMul: 0.6, valueAdj: 0.06, riverCallAdj: -0.06 },
      taunt: ['Floating me doesn’t work every time, Daniel.', 'Not a float this time, huh Daniel?'],
      gripe: ['If you can float that, my call was terrible.', 'You floated me again?'],
    },
  },
  hellmuth: {
    dwan: {
      title: 'Knows he bluffs — calls him anyway',
      hands: [
        'Poker After Dark: called Dwan’s $120K river shove with 9-7 and lost a pot of almost $330K.',
        'Lost pocket aces to Dwan in 2008 (NBC Heads-Up) and again in 2021 (High Stakes Duel III).',
        'High Stakes Duel III, Round 3 (2022): got his revenge and beat Dwan heads-up.',
      ],
      plan: 'Calls Dwan down light, slow-plays big pairs to trap him — and tilts faster when Dwan takes a pot off him.',
      adj: { callAdj: -0.08, trap: 0.5, tiltMul: 1.5 },
      taunt: ['Not this time, durrrr. Not this time.', 'Remember High Stakes Duel round three? This is that.'],
      gripe: ['You cracked my aces on NBC and you’re STILL doing this to me?!', 'How does this kid keep getting there against me?!'],
    },
    negreanu: {
      title: 'Swept him 3–0',
      hands: [
        'High Stakes Duel II (2021): beat Negreanu in all three matches — including a comeback from roughly 9-to-1 down and a runner-runner flush to close Round 2.',
      ],
      plan: 'Plays more pots against him, isolates his limps and value-bets thin. Rarely bluffs him — Daniel calls.',
      adj: { isoMul: 1.3, valueAdj: 0.06, bluffMul: 0.5 },
      taunt: ['That’s four in a row, Daniel. Check the tapes.', 'Three-oh in the Duel, and now this.'],
      gripe: ['Enjoy it, Daniel. It doesn’t happen often against me.', 'Daniel got lucky. Write it down, it’s rare.'],
    },
  },
  negreanu: {
    hellmuth: {
      title: '0–3 in High Stakes Duel II',
      hands: [
        'High Stakes Duel II (2021): lost all three matches to Hellmuth, including blowing a roughly 9-to-1 chip lead.',
      ],
      plan: 'Respects calm Hellmuth’s bets and folds more — but pounces when Phil tilts. Reads him better than anyone.',
      adj: { callAdj: 0.04, tiltPounce: -0.08, readAccAdj: 0.06 },
      taunt: ['Finally! Phil, I needed that one.', 'Put that one in your book, Phil.'],
      gripe: ['Phil, you owe me a rematch. A real one.', 'Of course. Of course it’s Phil again.'],
    },
    dwan: {
      title: 'Floats his c-bets',
      hands: [
        'High Stakes Poker, Season 6: floated Dwan’s flop bet with two overcards, turned top pair, and got hero-called by nine-high.',
        'High Stakes Poker: folded K♦ 4♦ in the family pot where Dwan’s Q♦ 10♦ pushed Barry Greenstein off pocket aces.',
      ],
      plan: 'Floats Dwan’s flop and turn bets with overcards and assumes he’s bluffing more often.',
      adj: { floatAdj: -0.06, bluffPrior: 0.15 },
      taunt: ['I knew you were full of it, Tom!', 'Floated you again, Tom. Overcards are live!'],
      gripe: ['You had it this time, huh Tom?', 'I knew it and I still paid you.'],
    },
  },
};
const RIVALRY_SOURCES = [
  { label: 'PokerListings — Dwan paints Phil a river masterpiece', url: 'https://www.pokerlistings.com/hand-analysis/dwan-paints-phil-a-river-masterpiece' },
  { label: 'PokerNews — Dwan cracks Hellmuth’s aces again (High Stakes Duel III)', url: 'https://www.pokernews.com/news/2021/08/tom-dwan-beats-phil-hellmuth-high-stakes-duel-39704.htm' },
  { label: 'PokerNews — Hellmuth outplays Dwan in Round 3', url: 'https://www.pokernews.com/news/2022/01/phil-hellmuth-tom-dwan-poker-2-40610.htm' },
  { label: 'Card Player — Hellmuth sweeps Negreanu in High Stakes Duel II', url: 'https://www.cardplayer.com/cardplayer-poker-magazines/66467-joao-vieira-34-16/articles/24296-phil-hellmuth-sweeps-daniel-negreanu-in-three-straight-matches-to-win-high-stakes-duel-ii' },
  { label: 'PokerNews — High Stakes Poker S6E13 (nine-high hero call)', url: 'https://www.pokernews.com/news/2010/05/high-stakes-poker-season-6-episode-13-expensive-brawls-hero-8277.htm' },
  { label: 'PokerListings — Dwan makes the impossible possible on HSP', url: 'https://www.pokerlistings.com/hand-analysis/dwan-makes-impossible-possible-on-high-stakes-poker' },
];

const pick = a => a[Math.floor(rand() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/* ── Preflop playability: HU equity + bonus for suited / connected ── */
const PLAY_PCT = new Float64Array(169);
(function () {
  // Rebuild HU equity ranking from W.handPct, then add playability bonuses.
  const score = new Float64Array(169), idx = [];
  for (let i = 0; i < 169; i++) {
    const hi = Math.floor(i / 13), lo = i % 13;
    let r1, r2, sameSuit;
    if (hi === lo) { r1 = r2 = hi; sameSuit = false; }
    else if (hi > lo) { r1 = hi; r2 = lo; sameSuit = true; }
    else { r1 = lo; r2 = hi; sameSuit = false; }
    const c1 = r1 * 4, c2 = r2 * 4 + (sameSuit ? 0 : 1) + (r1 === r2 ? 1 : 0);
    let sc = 1 - W.handPct(c1, c2);
    const gap = r1 - r2;
    if (sameSuit) sc += 0.10;
    if (r1 === r2) sc += 0.06;
    else if (gap === 1) sc += 0.05; else if (gap === 2) sc += 0.025;
    score[i] = sc; idx.push(i);
  }
  idx.sort((a, b) => score[b] - score[a]);
  let cum = 0;
  for (const i of idx) {
    const hi = Math.floor(i / 13), lo = i % 13, n = hi === lo ? 6 : hi > lo ? 4 : 12;
    PLAY_PCT[i] = (cum + n / 2) / 1326; cum += n;
  }
})();
const playPct = (c1, c2) => PLAY_PCT[W.pfIndex(c1, c2)];

/* ── Opponent modeling ─────────────────────────────────────── */
function persona(p) { return PERSONAS[p.persona] || PERSONAS.auto; }
function mem(G, id) { return G.bot[id] || (G.bot[id] = { tilt: 0, mood: '', wild: false, stuck: 0, lastTalk: 0 }); }
function file(me, opp) { return (RIVALRY[me.persona] && RIVALRY[me.persona][opp.persona]) || null; }
const ledger = (G, a, b) => (G.h2h && G.h2h[a + '>' + b]) || { faced: 0, fold: 0, sd: 0, won: 0, caught: 0, shownBluff: 0, net: 0 };

// How `me` plays against `opp`: real-history rivalry priors + this table's head-to-head ledger.
function rival(G, me, opp) {
  const f = file(me, opp), b = f ? f.adj : {};
  const out = {
    bluffMul: b.bluffMul || 1, valueAdj: b.valueAdj || 0, callAdj: b.callAdj || 0, threeBetMul: b.threeBetMul || 1,
    floatAdj: b.floatAdj || 0, riverCallAdj: b.riverCallAdj || 0, trap: b.trap || 0, tiltMul: b.tiltMul || 1,
    isoMul: b.isoMul || 1, readAccAdj: b.readAccAdj || 0, sizeMul: b.sizeMul || 1, bluffPrior: b.bluffPrior || 0,
  };
  if (opp.persona === 'hellmuth' && mem(G, opp.id).tilt > 0) {
    out.callAdj += b.tiltPounce || 0;
    if (b.tiltTarget) { out.isoMul *= b.tiltTarget; out.valueAdj += 0.06; }
  }
  const mine = ledger(G, me.id, opp.id), theirs = ledger(G, opp.id, me.id), bb = curLevel(G).bb;
  // They fold to MY bets a lot → fire at them more (and vice versa).
  if (mine.faced >= 3) out.bluffMul *= clamp(((mine.fold + 1.26) / (mine.faced + 3)) / 0.42, 0.5, 1.8);
  // I caught them bluffing / they showed me a bluff → call them lighter.
  out.callAdj -= 0.03 * Math.min(mine.caught, 3) + 0.025 * Math.min(mine.shownBluff, 3);
  // They caught ME bluffing → they call, so bluff them less.
  out.bluffMul *= Math.pow(0.75, Math.min(theirs.caught, 3));
  // Down big against them → more willing to tangle.
  if (mine.net < -15 * bb) out.callAdj -= 0.02;
  return out;
}
function avgRival(G, me, opps) {
  const rs = opps.map(o => rival(G, me, o)), n = rs.length || 1;
  const avg = k => rs.reduce((s, r) => s + r[k], 0) / n;
  return { bluffMul: avg('bluffMul'), valueAdj: avg('valueAdj'), sizeMul: avg('sizeMul'), isoMul: Math.max(1, ...rs.map(r => r.isoMul)) };
}

function model(G, observer, opp) {
  const s = G.stats[opp.id], obsP = persona(observer);
  const k = obsP.read ? 5 : 9;                       // Negreanu learns faster
  const m = {
    vpip: (s.vpip + 0.32 * k) / (s.hands + k),
    pfr: (s.pfr + 0.20 * k) / (s.hands + k),
    fold: (s.foldFaced + 0.42 * k) / (s.faced + k),
    bluff: (s.bluffShown + 0.30 * 4) / (s.aggShown + 4),
    af: (s.postAgg + 1.2 * k) / (s.postCall + k),
  };
  const fl = file(observer, opp);
  if (fl && fl.adj.bluffPrior) m.bluff = clamp(m.bluff + fl.adj.bluffPrior, 0.05, 0.85);
  // Negreanu's reads: he blends toward an opponent's true tendencies.
  if (obsP.read && opp.kind === 'bot') {
    const t = persona(opp), tilt = mem(G, opp.id).tilt > 0;
    m.vpip = 0.5 * m.vpip + 0.5 * (t.open + t.limp + (tilt ? 0.3 : 0));
    m.pfr = 0.5 * m.pfr + 0.5 * (t.open + (tilt ? 0.2 : 0));
    m.bluff = 0.5 * m.bluff + 0.5 * clamp(t.bluff * 1.3 + (tilt ? 0.3 : 0), 0.05, 0.8);
  }
  return m;
}

function rangeTop(G, observer, opp) {
  const h = G.hand[opp.id], m = model(G, observer, opp);
  let top;
  if (h.pfr) {
    top = h.pfLevel <= 1 ? m.pfr * 1.15 : h.pfLevel === 2 ? m.pfr * 0.38 : m.pfr * 0.16;
    if (opp.allIn) {
      const bbs = (opp.total) / curLevel(G).bb;
      top = Math.max(top, clamp(2.3 / Math.max(bbs, 1) + 0.04, 0.05, 0.8));
    }
  } else if (h.vpip) top = m.vpip;
  else top = 1;
  return clamp(top, 0.02, 1);
}

// 0 air · 1 weak pair / draw · 2 top pair / good draw · 3 two pair+
function categorize(hole, board) {
  const all = hole.concat(board), s = evaluate(all), c = scoreCat(s);
  if (board.length >= 5 && evaluate(board) === s) return 0;
  let lvl = 0;
  if (c >= 2) {
    // two pair using a board pair only counts as one pair
    lvl = (c === 2 && scoreCat(evaluate(board)) >= 1) ? 2 : 3;
  } else if (c === 1) {
    const pr = scoreKick(s, 0), top = Math.max(...board.map(rank));
    if (!hole.some(x => rank(x) === pr)) lvl = 0;
    else lvl = pr >= top ? 2 : 1;
  }
  if (lvl < 2 && board.length < 5) {
    for (let st = 0; st < 4; st++) {
      if (all.filter(x => suit(x) === st).length === 4 && hole.some(x => suit(x) === st)) return 2;
    }
    if (W.draws(hole, board).length) lvl = Math.max(lvl, 1);
  }
  return lvl;
}

function buildRange(G, observer, opp, dead) {
  const top = rangeTop(G, observer, opp), h = G.hand[opp.id], m = model(G, observer, opp);
  const board = G.board, post = board.length >= 3;
  const req = !post ? 0 : h.postAgg >= 2 ? 2 : h.postAgg === 1 ? 1 : h.postCall > 0 ? 1 : 0;
  const bluffW = clamp(m.bluff, 0.04, 0.85);
  const hands = [], w = [];
  for (let a = 0; a < 52; a++) {
    if (dead[a]) continue;
    for (let b = a + 1; b < 52; b++) {
      if (dead[b]) continue;
      const pp = playPct(a, b);
      let wt = pp <= top ? 1 : pp <= top * 1.4 ? 0.3 : 0.03;
      if (req) {
        const lv = categorize([a, b], board);
        if (req === 1) wt *= lv >= 1 ? 1 : (h.postAgg ? bluffW : 0.3);
        else wt *= lv >= 2 ? 1 : lv === 1 ? 0.35 : bluffW;
      }
      if (wt > 0) { hands.push(a, b); w.push(wt); }
    }
  }
  const cum = new Float64Array(w.length); let t = 0;
  for (let i = 0; i < w.length; i++) { t += w[i]; cum[i] = t; }
  return { hands, cum, total: t };
}

function sampleFrom(r, used) {
  for (let tries = 0; tries < 12; tries++) {
    const x = rand() * r.total;
    let lo = 0, hi = r.cum.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (r.cum[mid] < x) lo = mid + 1; else hi = mid; }
    const a = r.hands[lo * 2], b = r.hands[lo * 2 + 1];
    if (!used[a] && !used[b]) return [a, b];
  }
  return null;
}

function equity(G, p, opps, iters) {
  const dead = new Uint8Array(52);
  for (const c of p.cards) dead[c] = 1;
  for (const c of G.board) dead[c] = 1;
  const ranges = opps.map(o => buildRange(G, p, o, dead));
  let win = 0, n = 0;
  const used = new Uint8Array(52);
  for (let it = 0; it < iters; it++) {
    used.set(dead);
    const oh = [];
    let ok = true;
    for (const r of ranges) {
      const hnd = sampleFrom(r, used);
      if (!hnd) { ok = false; break; }
      used[hnd[0]] = used[hnd[1]] = 1; oh.push(hnd);
    }
    if (!ok) continue;
    const board = G.board.slice();
    while (board.length < 5) { const c = Math.floor(rand() * 52); if (!used[c]) { used[c] = 1; board.push(c); } }
    const me = evaluate(p.cards.concat(board));
    let best = 0, ties = 0, lost = false;
    for (const hnd of oh) {
      const s = evaluate(hnd.concat(board));
      if (s > me) { lost = true; break; }
      if (s === me) ties++;
      best = Math.max(best, s);
    }
    n++;
    if (!lost) win += ties ? 1 / (ties + 1) : 1;
  }
  return n ? win / n : 0.5;
}

// Equity vs an opponent's actual cards (only used for Negreanu's soul reads).
function trueEquity(G, p, opp) {
  const used = new Uint8Array(52);
  for (const c of p.cards.concat(opp.cards, G.board)) used[c] = 1;
  let w = 0;
  for (let it = 0; it < 300; it++) {
    const b = G.board.slice(), u = used.slice();
    while (b.length < 5) { const c = Math.floor(rand() * 52); if (!u[c]) { u[c] = 1; b.push(c); } }
    const a = evaluate(p.cards.concat(b)), o = evaluate(opp.cards.concat(b));
    w += a > o ? 1 : a === o ? 0.5 : 0;
  }
  return w / 300;
}

/* ── Position ──────────────────────────────────────────────── */
function lateness(G, seat) {
  const live = G.players.filter(x => !x.out);
  if (seat === G.button) return 1;
  if (live.length === 2) return 0.55;
  if (seat === G.sb) return 0.5;
  if (seat === G.bb) return 0.55;
  const order = []; let i = G.bb;
  for (let k = 0; k < 5; k++) { i = W.nextSeat(G, i, x => !x.out); if (i === G.button) break; order.push(i); }
  const k = order.indexOf(seat), m = order.length;
  return 0.45 + 0.3 * (k + 1) / Math.max(m, 1);
}

/* ── Sizing helpers ────────────────────────────────────────── */
function sizeTo(la, frac) {
  let to = la.currentBet === 0 ? la.pot * frac : la.currentBet + (la.pot + la.toCall) * frac;
  to = Math.max(roundUnit(to), la.minTo);
  // If the bet leaves a small stack behind relative to the pot, just move in.
  const behind = la.maxTo - to;
  if (behind < (la.pot + to) * 0.45) to = la.maxTo;
  return Math.min(to, la.maxTo);
}
const act = (type, to, extra) => Object.assign({ type, to }, extra || {});

function randomAction(la) {
  const opts = ['fold', la.canCheck ? 'check' : 'call'];
  if (la.canRaise) opts.push('minraise', 'pot', 'allin');
  const o = pick(opts);
  if (o === 'minraise') return act('raise', la.minTo);
  if (o === 'pot') return act('raise', sizeTo(la, 1));
  if (o === 'allin') return act('raise', la.maxTo);
  return act(o);
}

/* ── Decisions ─────────────────────────────────────────────── */
function decide(G, seat) {
  const p = G.players[seat], per = persona(p), me = mem(G, p.id);
  const la = legalActions(G, seat);
  if (!la) return null;
  const think = per.think[0] + rand() * (per.think[1] - per.think[0]);
  const tilt = me.tilt > 0;
  const say = [];
  if (tilt && rand() < 0.33) {
    if (rand() < 0.45) say.push({ who: p.id, kind: 'emote', text: pick(LINES.hellmuth.antics) });
    return Object.assign(randomAction(la), { think: 400 + rand() * 900, say, random: true });
  }
  const opps = G.players.filter(o => inHand(o) && o !== p);
  const d = G.street === 'preflop' ? preflop(G, p, per, me, la, opps, tilt, say) : postflop(G, p, per, me, la, opps, tilt, say);
  // Difficulty (0-10, default 3.4): below 10 the pros make human-sized mistakes —
  // they pay off value bets, give up on bluffs and miss thin value.
  const diff = G.difficulty == null ? 3.4 : G.difficulty;
  const err = (10 - diff) / 10 * 0.45;
  if (err > 0 && rand() < err) {
    if (d.type === 'fold' && la.toCall > 0 && la.call < p.stack * 0.5) d.type = 'call';
    else if (d.type === 'raise' && !la.canCheck && la.toCall > 0) d.type = 'call';
    else if (d.type === 'raise' && la.canCheck && rand() < 0.6) d.type = 'check';
  }
  // Final legality guard.
  if (d.type === 'raise' && !la.canRaise) d.type = la.canCheck ? 'check' : 'call';
  if (d.type === 'fold' && la.canCheck) d.type = 'check';
  d.think = d.think || think;
  d.say = say.concat(d.say || []).map(x => Object.assign({ who: p.id }, x));
  return d;
}

function preflop(G, p, per, me, la, opps, tilt, say) {
  const L = curLevel(G), bb = L.bb, late = lateness(G, p.seat);
  const pct = playPct(p.cards[0], p.cards[1]);
  const effStack = Math.min(p.stack + p.bet, Math.max(...opps.map(o => o.stack + o.bet)));
  const effBB = effStack / bb;
  const tiltMul = tilt ? 2.2 : 1;
  const wildMul = me.wild ? 1.5 : 1;
  const stuckMul = me.stuck > 0 ? 1.25 : 1;

  // Opening-range adaptation: tight players left to act → steal more.
  const behind = G.players.filter(o => canAct(o) && o !== p && !G.hand[o.id].vpip);
  const avgV = behind.length ? behind.reduce((s, o) => s + model(G, p, o).vpip, 0) / behind.length : 0.3;
  const steal = clamp(1.3 - avgV, 0.85, 1.3);

  // Short-stack push/fold.
  if (effBB <= 13) {
    if (G.raiseCount === 0) {
      const shove = clamp(2.3 / effBB + 0.04, 0.12, 0.8) * (0.7 + 0.6 * late) * per.loose * tiltMul;
      if (pct < shove) return act('raise', la.maxTo);
      return act(la.canCheck ? 'check' : 'fold');
    }
    const e = equity(G, p, opps, 350);
    const potOdds = la.toCall / (la.pot + la.toCall);
    const need = potOdds + per.allinAdj + (opps.length > 1 ? 0.04 : 0);
    if (e > need + 0.12 && la.canRaise) return act('raise', la.maxTo);
    if (e > need) return act('call');
    return act('fold');
  }

  if (G.raiseCount === 0) {
    const limpers = opps.filter(o => G.hand[o.id].vpip).length;
    const iso = avgRival(G, p, opps.filter(o => G.hand[o.id].vpip || o.seat === G.bb || o.seat === G.sb)).isoMul;
    const open = clamp(per.open * (0.55 + 0.8 * late) * steal * tiltMul * wildMul * stuckMul * iso, 0.03, 0.92);
    if (pct < open) {
      const to = roundUnit(bb * (per.openBB + limpers) * (p.seat === G.sb && opps.length > 1 ? 1.15 : 1));
      return act('raise', to >= la.maxTo * 0.4 ? la.maxTo : to);
    }
    if (per.limp && !la.canCheck && pct < open + per.limp * (0.6 + 0.4 * late)) {
      if (rand() < 0.2) say.push({ kind: 'talk', text: pick(LINES.negreanu.loose) });
      return act('call');
    }
    return act(la.canCheck ? 'check' : 'fold');
  }

  // Facing a raise.
  const aggr = G.players[G.lastAggressor];
  const e = equity(G, p, opps, 320);
  const potOdds = la.toCall / (la.pot + la.toCall);
  const suited = suit(p.cards[0]) === suit(p.cards[1]), pair = rank(p.cards[0]) === rank(p.cards[1]);
  let realize = 0.72 + 0.18 * late + (suited ? 0.05 : 0) + (pair ? 0.04 : 0) + (pct < 0.08 ? 0.12 : 0);
  realize = clamp(realize + (per.callWide - 1) * 0.25, 0.55, 1.12);
  const implied = (effBB > 35 && (pair || suited) && la.toCall < p.stack * 0.1) ? 0.04 + (per.callWide - 1) * 0.06 : 0;
  const eAdj = e * realize + implied;
  const callingAllIn = la.call >= p.stack || (aggr && aggr.allIn);
  const rv = aggr ? rival(G, p, aggr) : rival(G, p, p);
  const need = potOdds + per.callAdj + rv.callAdj + (callingAllIn ? per.allinAdj : 0);

  // Rivalry trap: Hellmuth flats big pairs against Dwan, like the aces he slow-played on High Stakes Duel.
  if (aggr && rv.trap && pct < 0.03 && G.raiseCount === 1 && effBB > 20 && !callingAllIn && rand() < rv.trap) return act('call');
  const valueThresh = per.threeBet * (G.raiseCount === 1 ? 1 : 0.45) * (tilt ? 2 : 1) * (me.wild ? 1.4 : 1);
  if (la.canRaise && (pct < valueThresh || e * (opps.length + 1) > per.raiseRel * 1.15)) {
    const mult = G.raiseCount === 1 ? (late >= 0.75 ? 3 : 3.5) : 2.3;
    const to = roundUnit(G.currentBet * mult);
    return act('raise', to >= la.maxTo * 0.38 ? la.maxTo : to);
  }
  if (la.canRaise && G.raiseCount === 1 && pct > 0.06 && pct < 0.42 && effBB > 25 && aggr) {
    const foldAdj = clamp(model(G, p, aggr).fold / 0.42, 0.6, 1.6);
    if (rand() < per.threeBetBluff * foldAdj * rv.threeBetMul * (me.wild ? 1.6 : 1)) {
      const to = roundUnit(G.currentBet * (late >= 0.75 ? 3 : 3.5));
      return act('raise', to >= la.maxTo * 0.38 ? la.maxTo : to);
    }
  }
  if (eAdj > need) {
    if (per.limp && pct > 0.35 && rand() < 0.25) say.push({ kind: 'talk', text: pick(LINES.negreanu.loose) });
    return act('call');
  }
  if (p.persona === 'hellmuth' && la.toCall > bb * 3 && pct < 0.12 && rand() < 0.5) say.push({ kind: 'talk', text: pick(LINES.hellmuth.fold) });
  return act('fold');
}

function postflop(G, p, per, me, la, opps, tilt, say) {
  const n = opps.length;
  let e = equity(G, p, opps, n > 2 ? 260 : 420);
  const rel = e * (n + 1);
  const fold = opps.reduce((s, o) => s + model(G, p, o).fold, 0) / n;
  const foldF = clamp(fold / 0.42, 0.5, 1.7) * Math.pow(0.6, n - 1);
  const dr = W.draws(p.cards, G.board);
  const strongDraw = dr.some(x => /flush|Open/.test(x));
  const wildMul = me.wild ? 1.8 : 1;
  const stuckMul = me.stuck > 0 ? 1.3 : 1;
  const tiltMul = tilt ? 1.8 : 1;
  const rvAll = avgRival(G, p, opps);
  const bluffMul = wildMul * stuckMul * tiltMul * rvAll.bluffMul;
  const valueRel = per.valueRel - rvAll.valueAdj;
  const prevStreet = { flop: 'preflop', turn: 'flop', river: 'turn' }[G.street];
  const wasAgg = G.hand[p.id].aggStreet === prevStreet || (G.street === 'flop' && G.pfAggressor === p.seat);
  const scary = isScary(G);
  const pickSize = (arr) => arr[Math.floor(rand() * arr.length)];

  if (la.toCall === 0) {
    if (rel >= valueRel) {
      if (rel > 1.8 && rand() < (p.persona === 'dwan' ? 0.05 : 0.18) && G.street !== 'river') return act('check');
      let frac = pickSize(per.value) * rvAll.sizeMul;
      if (per.medium && rel < 1.5) frac = pickSize(per.medium);         // Negreanu's sizing tell
      return act('raise', sizeTo(la, frac));
    }
    if (G.street === 'flop' && G.pfAggressor === p.seat && rand() < per.cbet * (n === 1 ? 1 : 0.5) * clamp(foldF * rvAll.bluffMul, 0.5, 1.5) * (tilt ? 1.3 : 1)) {
      return act('raise', sizeTo(la, p.persona === 'dwan' ? pickSize([0.5, 0.75]) : pickSize([0.33, 0.5])));
    }
    if (wasAgg && G.street !== 'flop' && rand() < per.barrel * foldF * (scary ? 1.3 : 1) * bluffMul) {
      return act('raise', sizeTo(la, pickSize(per.bluffSize)));
    }
    if (strongDraw && G.street !== 'river' && rand() < per.semi * 0.55 * foldF) {
      return act('raise', sizeTo(la, pickSize(per.bluffSize)));
    }
    if (rel < 0.8 && rand() < per.bluff * 0.5 * foldF * bluffMul * (G.street === 'river' ? 1.3 : 0.7)) {
      return act('raise', sizeTo(la, pickSize(per.bluffSize)));
    }
    return act('check');
  }

  // Facing a bet.
  const aggr = G.players[G.lastAggressor];
  const rv = aggr ? rival(G, p, aggr) : rival(G, p, p);
  if (per.read && aggr && aggr.cards && aggr.cards.length && n >= 1 && la.toCall >= la.pot * 0.2 && rand() < per.read) {
    const te = trueEquity(G, p, aggr);
    const right = rand() < (per.readAcc + rv.readAccAdj) * (0.6 + 0.04 * (G.difficulty == null ? 3.4 : G.difficulty));
    const believed = right ? te : 1 - te;
    e = 0.45 * e + 0.55 * believed;
    if (rand() < 0.6) {
      const lines = believed > 0.5 ? LINES.negreanu.readBluff : LINES.negreanu.readStrong;
      say.push({ kind: 'talk', text: pick(lines).replace('{name}', aggr.name.split(' ')[0]) });
    }
  }
  const potOdds = la.toCall / (la.pot + la.toCall);
  const implied = strongDraw && G.street !== 'river' && p.stack > la.pot ? 0.04 : 0;
  const callingAllIn = la.call >= p.stack || (aggr && aggr.allIn);
  const need = potOdds + per.callAdj + rv.callAdj + (callingAllIn ? per.allinAdj : 0) +
    (G.street === 'river' ? rv.riverCallAdj : rv.floatAdj);
  const rel2 = e * (n + 1);
  if (la.canRaise && rel2 >= per.raiseRel && rand() < 0.75) {
    return act('raise', sizeTo(la, pickSize(per.value)));
  }
  if (e + implied >= need) {
    if (la.canRaise && strongDraw && rand() < per.semi * 0.2 * foldF) return act('raise', sizeTo(la, pickSize(per.bluffSize)));
    return act('call');
  }
  if (la.canRaise && G.street !== 'river' && rand() < per.bluff * 0.3 * foldF * bluffMul) {
    return act('raise', sizeTo(la, pickSize(per.bluffSize)));
  }
  if (la.canRaise && G.street === 'river' && p.persona === 'dwan' && rand() < 0.12 * foldF * bluffMul) {
    return act('raise', la.maxTo);
  }
  return act('fold');
}

function isScary(G) {
  const b = G.board; if (b.length < 4) return false;
  const last = b[b.length - 1];
  const sameSuit = b.filter(c => suit(c) === suit(last)).length >= 3;
  const over = rank(last) > Math.max(...b.slice(0, -1).map(rank));
  const paired = b.slice(0, -1).some(c => rank(c) === rank(last));
  return sameSuit || over || paired;
}

/* ── Hand lifecycle hooks ──────────────────────────────────── */
function onHandStart(G) {
  const out = [];
  for (const p of G.players) {
    if (p.kind !== 'bot' || p.out) continue;
    const per = persona(p), m = mem(G, p.id);
    m.wild = !!per.wild && rand() < per.wild;
    if (p.persona === 'dwan') {
      m.mood = m.wild ? 'wild' : (m.stuck > 0 ? 'stuck' : '');
      if (m.wild && rand() < 0.5) out.push({ who: p.id, kind: 'talk', text: pick(LINES.dwan.wild) });
    }
    if (G.handNo === 1 && LINES[p.persona] && rand() < 0.8) out.push({ who: p.id, kind: 'talk', text: pick(LINES[p.persona].start) });
  }
  return out;
}

function onHandEnd(G) {
  const out = [];
  const bb = curLevel(G).bb;
  const busted = G.results.filter(r => r.hand === G.handNo && r.place > 1);
  for (const p of G.players) {
    if (p.kind !== 'bot' || !LINES[p.persona]) continue;
    const m = mem(G, p.id), lines = LINES[p.persona];
    const delta = p.stack - p.startStack;
    const big = Math.abs(delta) >= Math.max(0.15 * p.startStack, 8 * bb);
    if (p.out && busted.some(r => r.id === p.id)) { m.tilt = 0; m.mood = ''; continue; }
    if (p.persona === 'hellmuth') {
      if (m.tilt > 0) {
        m.tilt--;
        if (m.tilt === 0) { m.mood = ''; out.push({ who: p.id, kind: 'talk', text: pick(lines.calm) }); }
      }
      // Any real loss (8% of his stack / 4 BB, or a lost showdown) can set him off.
      const badBeat = delta < 0 && G.allinEq && G.allinEq[p.seat] >= 60;
      const stung = delta < 0 && (-delta >= Math.max(0.08 * p.startStack, 4 * bb) || (p.shown && !p.folded));
      if (stung || badBeat) {
        const beaters = G.winners.map(w => G.players[w.seat]).filter(w => w && w !== p);
        const tMul = Math.max(1, ...beaters.map(w => rival(G, p, w).tiltMul));
        if (m.tilt === 0 && rand() < Math.min(0.9, persona(p).tiltChance * tMul)) {
          m.tilt = 3 + Math.floor(rand() * 5); m.mood = 'tilt';
          out.push({ who: p.id, kind: 'talk', text: pick(lines.tilt) });
          out.push({ who: p.id, kind: 'emote', text: pick(lines.antics) });
          out.push({ who: 'system', kind: 'system', text: `Phil Hellmuth is ON TILT for the next ${m.tilt} hands.`, ann: { type: 'tilt', title: 'HELLMUTH IS ON TILT', sub: 'ANYTHING CAN HAPPEN' } });
        } else if (m.tilt === 0) out.push({ who: p.id, kind: 'talk', text: pick(lines.composed) });
        else out.push({ who: p.id, kind: 'talk', text: pick(lines.lose) });
        continue;
      }
    }
    if (p.persona === 'dwan') {
      if (delta < 0 && big) m.stuck = 3; else if (m.stuck > 0) m.stuck--;
    }
    // Rivalry banter: aimed at whoever this pot went to / came from.
    const rivalLine = rivalryLine(G, p, delta);
    if (rivalLine && rand() < 0.6) { out.push({ who: p.id, kind: 'talk', text: rivalLine }); continue; }
    // Banter
    const shownBluff = p.shown && G.board.length >= 3 && G.hand[p.id].postAgg > 0 && W.isWeak(p.cards, G.board);
    if (shownBluff && lines.showBluff) out.push({ who: p.id, kind: 'talk', text: pick(lines.showBluff) });
    else if (delta > 0 && big && rand() < 0.65) out.push({ who: p.id, kind: 'talk', text: pick(lines.bigwin || lines.win) });
    else if (delta > 0 && rand() < 0.18) out.push({ who: p.id, kind: 'talk', text: pick(lines.win) });
    else if (delta < 0 && big && rand() < 0.55) out.push({ who: p.id, kind: 'talk', text: pick(lines.lose) });
    if (busted.length && !p.out && rand() < 0.5) out.push({ who: p.id, kind: 'talk', text: pick(lines.bust) });
  }
  return out;
}

function rivalryLine(G, p, delta) {
  if (!delta) return null;
  const others = G.players.filter(o => o !== p && o.kind === 'bot' && file(p, o));
  let best = null, amt = 0;
  for (const o of others) {
    const od = o.stack - o.startStack;
    if (delta > 0 && od < 0 && -od > amt) { best = o; amt = -od; }
    if (delta < 0 && od > 0 && od > amt) { best = o; amt = od; }
  }
  if (!best || amt < 4 * curLevel(G).bb) return null;
  const f = file(p, best);
  return pick(delta > 0 ? f.taunt : f.gripe);
}

// Bot won uncontested: show or muck?
function showChoice(G, seat) {
  const p = G.players[seat];
  const bluffing = G.board.length >= 3 && W.isWeak(p.cards, G.board);
  if (p.persona === 'dwan') return bluffing ? rand() < 0.4 : rand() < 0.08;
  if (p.persona === 'negreanu') return rand() < 0.18;
  if (p.persona === 'hellmuth') return mem(G, p.id).tilt > 0 ? rand() < 0.5 : (!bluffing && rand() < 0.15);
  return false;
}

// Bots occasionally answer table chat that mentions them.
function onChat(G, fromName, text) {
  const t = text.toLowerCase(), out = [];
  const map = { dwan: /dwan|tom|durr/, hellmuth: /hellmuth|phil|brat/, negreanu: /negreanu|daniel|danny|kid/ };
  for (const p of G.players) {
    if (p.kind !== 'bot' || !LINES[p.persona]) continue;
    const named = map[p.persona] && map[p.persona].test(t);
    if ((named && rand() < 0.85) || (!named && rand() < 0.08)) {
      out.push({ who: p.id, kind: 'talk', text: pick(LINES[p.persona].chat), delay: 1200 + rand() * 2500 });
    }
  }
  if (/\b(gg|nh|wp)\b/.test(t) && !out.length && rand() < 0.5) {
    const bots = G.players.filter(p => p.kind === 'bot' && !p.out && LINES[p.persona]);
    if (bots.length) out.push({ who: pick(bots).id, kind: 'talk', text: pick(['ty', 'nh', 'gl', 'thanks!']), delay: 1500 });
  }
  return out;
}

// Plain-English read on how each bot is adapting (Scouting tab).
function notes(G, botId) {
  const b = G.players.find(p => p.id === botId);
  if (!b) return [];
  const out = [], m = mem(G, botId);
  if (m.tilt > 0) out.push(`ON TILT — ${m.tilt} more hand${m.tilt > 1 ? 's' : ''} of chaos.`);
  if (m.wild) out.push('Wild mode this hand — bluffs doubled, overbets likely.');
  if (m.stuck > 0) out.push('Stuck after a big loss — playing even looser.');
  for (const o of G.players) {
    if (o.id === botId || o.out) continue;
    const L = ledger(G, botId, o.id), T = ledger(G, o.id, botId), first = o.name.split(' ')[0];
    if (L.faced >= 3 && L.fold / L.faced >= 0.6) out.push(`${first} has folded to his bets ${L.fold}/${L.faced} times — firing at ${first} more.`);
    if (L.caught) out.push(`Caught ${first} bluffing ${L.caught > 1 ? L.caught + ' times' : 'once'} — calling ${first} lighter.`);
    if (L.shownBluff) out.push(`${first} showed him a bluff — he wants revenge.`);
    if (T.caught) out.push(`${first} has caught his bluffs — bluffing ${first} less.`);
    if (o.persona === 'hellmuth' && mem(G, o.id).tilt > 0 && file(b, o)) out.push(`Hellmuth is tilting — ${b.persona === 'dwan' ? 'isolating him and value-betting big' : 'calling him down light'}.`);
  }
  for (const o of G.players) {
    if (o.id === botId || o.out) continue;
    const s = G.stats[o.id], md = model(G, b, o), first = o.name.split(' ')[0];
    if (s.hands < 4) continue;
    if (md.fold > 0.55 && s.faced >= 3) out.push(`Sees ${first} folding to bets ${Math.round(md.fold * 100)}% — bluffing ${first} more.`);
    else if (md.fold < 0.3 && s.faced >= 3) out.push(`${first} rarely folds — value-betting thinner, bluffing less.`);
    if (md.vpip > 0.45) out.push(`${first} plays ${Math.round(md.vpip * 100)}% of hands — widening calling range.`);
    else if (md.vpip < 0.18 && s.hands >= 6) out.push(`${first} is tight (${Math.round(md.vpip * 100)}% VPIP) — stealing ${first}'s blinds.`);
    if (s.aggShown >= 2 && md.bluff > 0.4) out.push(`Caught ${first} bluffing — calling down lighter.`);
  }
  return out.slice(0, 7);
}

const API = { PERSONAS, LINES, RIVALRY, RIVALRY_SOURCES, rival, ledger, decide, onHandStart, onHandEnd, showChoice, onChat, notes, playPct, equity, model, mem };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.WSOP_BOTS = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
