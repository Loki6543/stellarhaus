/* ─────────────────────────────────────────────────────────────
   WSOP 2027 Main Event — Final Table engine
   Pure game logic (no DOM). Runs in the browser and in Node.
   Chips are integers; every amount is a multiple of UNIT.
   ───────────────────────────────────────────────────────────── */
(function (root) {
'use strict';

const UNIT = 100000;
const RANKS = '23456789TJQKA';
const SUITS = 'shdc';                       // spades, hearts, diamonds, clubs
const SUIT_SYM = ['♠', '♥', '♦', '♣'];
const RANK_NAME = ['Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Jack','Queen','King','Ace'];
const RANK_PLURAL = ['Twos','Threes','Fours','Fives','Sixes','Sevens','Eights','Nines','Tens','Jacks','Queens','Kings','Aces'];
const CAT_NAME = ['High Card','Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush'];

// Blinds go up every 5 hands. Big-blind ante (BBA) = BB, as at the WSOP.
const LEVELS = [
  [1000000, 2000000], [1200000, 2400000], [1500000, 3000000], [2000000, 4000000],
  [2500000, 5000000], [3000000, 6000000], [4000000, 8000000], [5000000, 10000000],
  [6000000, 12000000], [8000000, 16000000], [10000000, 20000000], [12000000, 24000000],
  [15000000, 30000000], [20000000, 40000000], [25000000, 50000000], [30000000, 60000000],
  [40000000, 80000000], [50000000, 100000000], [60000000, 120000000], [80000000, 160000000],
].map(([sb, bb], i) => ({ n: i + 1, sb, bb, ante: bb }));

// Fictional 2027 Main Event final-five payouts.
const PAYOUTS = [12000000, 7000000, 4700000, 3500000, 2800000];

const rank = c => c >> 2;
const suit = c => c & 3;
const cardStr = c => RANKS[rank(c)] + SUITS[suit(c)];
const cardPretty = c => (RANKS[rank(c)] === 'T' ? '10' : RANKS[rank(c)]) + SUIT_SYM[suit(c)];

/* ── RNG ───────────────────────────────────────────────────── */
function rand() {
  if (root.crypto && root.crypto.getRandomValues) {
    const a = new Uint32Array(1); root.crypto.getRandomValues(a); return a[0] / 4294967296;
  }
  return Math.random();
}
function shuffledDeck() {
  const d = []; for (let i = 0; i < 52; i++) d.push(i);
  for (let i = 51; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

/* ── Hand evaluator (5–7 cards) ────────────────────────────── */
function straightHigh(mask) {
  const m = (mask << 1) | ((mask >> 12) & 1);           // ace also plays low
  for (let r = 12; r >= 3; r--) if (((m >> (r - 3)) & 31) === 31) return r;
  return -1;
}
function pack(cat, k) {
  let v = cat;
  for (let i = 0; i < 5; i++) v = v * 16 + ((k[i] === undefined ? -1 : k[i]) + 1);
  return v;
}
const RC = new Int8Array(13);
function evaluate(cards) {
  RC.fill(0);
  const sm = [0, 0, 0, 0], sc = [0, 0, 0, 0];
  let rm = 0;
  for (let i = 0; i < cards.length; i++) {
    const r = cards[i] >> 2, s = cards[i] & 3;
    RC[r]++; sm[s] |= 1 << r; sc[s]++; rm |= 1 << r;
  }
  let fs = -1;
  for (let s = 0; s < 4; s++) if (sc[s] >= 5) fs = s;
  if (fs >= 0) { const h = straightHigh(sm[fs]); if (h >= 0) return pack(8, [h]); }
  let quad = -1; const trips = [], pairs = [];
  for (let r = 12; r >= 0; r--) {
    if (RC[r] === 4) quad = r; else if (RC[r] === 3) trips.push(r); else if (RC[r] === 2) pairs.push(r);
  }
  const kick = (ex, n) => { const k = []; for (let r = 12; r >= 0 && k.length < n; r--) if (RC[r] && ex.indexOf(r) < 0) k.push(r); return k; };
  if (quad >= 0) return pack(7, [quad].concat(kick([quad], 1)));
  if (trips.length && (trips.length > 1 || pairs.length)) {
    return pack(6, [trips[0], Math.max(trips.length > 1 ? trips[1] : -1, pairs.length ? pairs[0] : -1)]);
  }
  if (fs >= 0) { const k = []; for (let r = 12; r >= 0 && k.length < 5; r--) if ((sm[fs] >> r) & 1) k.push(r); return pack(5, k); }
  const st = straightHigh(rm);
  if (st >= 0) return pack(4, [st]);
  if (trips.length) return pack(3, [trips[0]].concat(kick([trips[0]], 2)));
  if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1]].concat(kick([pairs[0], pairs[1]], 1)));
  if (pairs.length) return pack(1, [pairs[0]].concat(kick([pairs[0]], 3)));
  return pack(0, kick([], 5));
}
const scoreCat = s => Math.floor(s / 1048576);
const scoreKick = (s, i) => (Math.floor(s / Math.pow(16, 4 - i)) % 16) - 1;

function scoreName(s) {
  const c = scoreCat(s), k0 = scoreKick(s, 0), k1 = scoreKick(s, 1);
  switch (c) {
    case 8: return k0 === 12 ? 'Royal Flush' : `Straight Flush, ${RANK_NAME[k0]}-high`;
    case 7: return `Four of a Kind, ${RANK_PLURAL[k0]}`;
    case 6: return `Full House, ${RANK_PLURAL[k0]} full of ${RANK_PLURAL[k1]}`;
    case 5: return `Flush, ${RANK_NAME[k0]}-high`;
    case 4: return `Straight, ${RANK_NAME[k0]}-high`;
    case 3: return `Three of a Kind, ${RANK_PLURAL[k0]}`;
    case 2: return `Two Pair, ${RANK_PLURAL[k0]} and ${RANK_PLURAL[k1]}`;
    case 1: return `Pair of ${RANK_PLURAL[k0]}`;
    default: return `${RANK_NAME[k0]}-high`;
  }
}

// The five cards that make the hand (for highlighting).
function bestFive(cards) {
  let best = -1, bestSet = cards.slice(0, 5);
  const pick = (start, cur) => {
    if (cur.length === 5) { const s = evaluate(cur); if (s > best) { best = s; bestSet = cur.slice(); } return; }
    for (let i = start; i < cards.length; i++) { cur.push(cards[i]); pick(i + 1, cur); cur.pop(); }
  };
  pick(0, []);
  return bestSet;
}

/* ── Preflop strength ──────────────────────────────────────── */
// Heads-up equity (x1000) vs a random hand. Matrix index hi*13+lo:
// hi>lo suited, hi<lo offsuit, hi==lo pair.
const PF_EQ = [503,320,333,343,336,342,368,391,417,441,472,503,548,358,533,350,364,359,364,377,405,426,452,477,514,564,368,387,571,382,378,385,399,406,432,464,493,521,568,378,397,413,601,399,402,413,428,445,471,506,533,575,380,398,413,434,635,425,435,442,458,482,512,539,577,378,399,415,434,454,661,452,461,484,496,518,557,590,405,412,428,447,462,483,690,482,499,515,535,556,601,423,432,441,456,475,491,509,722,513,530,555,582,610,446,457,466,471,492,509,521,544,750,554,568,595,627,473,482,486,498,506,526,540,556,573,774,581,602,633,501,508,520,525,535,546,558,574,597,602,796,611,647,528,541,553,560,568,575,582,595,618,624,637,823,652,575,581,586,599,600,609,620,629,649,654,662,668,854];
const PF_PCT = new Float64Array(169);   // 0 = best hand, 1 = worst (combo-weighted percentile)
(function buildPct() {
  const idx = []; for (let i = 0; i < 169; i++) idx.push(i);
  idx.sort((a, b) => PF_EQ[b] - PF_EQ[a]);
  let cum = 0;
  for (const i of idx) {
    const hi = Math.floor(i / 13), lo = i % 13;
    const combos = hi === lo ? 6 : hi > lo ? 4 : 12;
    PF_PCT[i] = (cum + combos / 2) / 1326; cum += combos;
  }
})();
function pfIndex(c1, c2) {
  const r1 = rank(c1), r2 = rank(c2), hi = Math.max(r1, r2), lo = Math.min(r1, r2);
  if (hi === lo) return hi * 13 + hi;
  return suit(c1) === suit(c2) ? hi * 13 + lo : lo * 13 + hi;
}
const handPct = (c1, c2) => PF_PCT[pfIndex(c1, c2)];

function preflopName(cards) {
  const [a, b] = cards, ra = rank(a), rb = rank(b), hi = Math.max(ra, rb), lo = Math.min(ra, rb);
  if (ra === rb) return `Pocket ${RANK_PLURAL[ra]}`;
  return `${RANK_NAME[hi]}-${RANK_NAME[lo]} ${suit(a) === suit(b) ? 'suited' : 'offsuit'}`;
}
function preflopTier(cards) {
  const p = handPct(cards[0], cards[1]);
  if (p < 0.035) return 'Premium';
  if (p < 0.10) return 'Strong';
  if (p < 0.25) return 'Playable';
  if (p < 0.45) return 'Speculative';
  return 'Weak';
}

/* ── Draw detection (flop / turn) ──────────────────────────── */
function draws(hole, board) {
  const out = [];
  if (board.length < 3 || board.length > 4) return out;
  const all = hole.concat(board);
  for (let s = 0; s < 4; s++) {
    const n = all.filter(c => suit(c) === s).length, nh = hole.filter(c => suit(c) === s).length;
    if (n === 4 && nh > 0) {
      const nut = hole.some(c => suit(c) === s && rank(c) === 12) ||
        (board.some(c => suit(c) === s && rank(c) === 12) && hole.some(c => suit(c) === s && rank(c) === 11));
      out.push(nut ? 'Nut flush draw' : 'Flush draw');
    }
  }
  if (scoreCat(evaluate(all)) < 4) {
    let mask = 0; for (const c of all) mask |= 1 << rank(c);
    let hmask = 0; for (const c of hole) hmask |= 1 << rank(c);
    const m = (mask << 1) | ((mask >> 12) & 1), hm = (hmask << 1) | ((hmask >> 12) & 1);
    let outs = 0;
    for (let r = 0; r < 13; r++) {
      if ((mask >> r) & 1) continue;
      const nm = m | (1 << (r + 1)) | (r === 12 ? 1 : 0);
      for (let h = 12; h >= 3; h--) {
        const w = 31 << (h - 3);
        if ((nm & w) === w && (hm & w)) { outs++; break; }
      }
    }
    if (outs >= 2) out.push('Open-ended straight draw'); else if (outs === 1) out.push('Gutshot straight draw');
  }
  return out;
}

// Human-friendly read of "what do I have" for the seat owner.
function describeHand(hole, board) {
  if (!hole || hole.length < 2) return null;
  if (!board || board.length < 3) {
    return { main: preflopName(hole), sub: preflopTier(hole) + ' starting hand', cat: -1, draws: [] };
  }
  const s = evaluate(hole.concat(board)), c = scoreCat(s), k0 = scoreKick(s, 0);
  const boardScore = board.length >= 5 ? evaluate(board) : -1;
  let sub = '';
  const br = board.map(rank).sort((a, b) => b - a);
  if (boardScore === s) sub = 'Playing the board';
  else if (c === 1) {
    const pocket = rank(hole[0]) === rank(hole[1]);
    if (pocket && k0 > br[0]) sub = 'Overpair';
    else if (pocket) sub = 'Pocket pair';
    else if (br.indexOf(k0) < 0) sub = 'Pair';
    else if (k0 === br[0]) sub = 'Top pair';
    else if (k0 === br[br.length - 1]) sub = 'Bottom pair';
    else sub = 'Middle pair';
    if (board.filter(x => rank(x) === k0).length === 2 && !hole.some(x => rank(x) === k0)) sub = 'Pair on board';
  } else if (c === 3) {
    sub = (rank(hole[0]) === rank(hole[1]) && rank(hole[0]) === k0) ? 'Set' : 'Trips';
    if (!hole.some(x => rank(x) === k0)) sub = 'Trips on board';
  }
  const d = board.length < 5 ? draws(hole, board) : [];
  return { main: scoreName(s), sub, cat: c, draws: d, score: s };
}

/* ── Game setup ────────────────────────────────────────────── */
function roundUnit(x) { return Math.max(0, Math.round(x / UNIT) * UNIT); }
function randBetween(a, b) { return a + rand() * (b - a); }

// Seats (clockwise): Kevin, Firo, Dwan, Hellmuth, Negreanu.
// Chip ranks: two bots lead (1st & 2nd), Firo 3rd and close to 2nd, a bot 4th, Kevin last.
function dealStacks(botIds) {
  const order = botIds.slice().sort(() => rand() - 0.5);
  const s1 = roundUnit(randBetween(185e6, 235e6));
  const s2 = roundUnit(randBetween(126e6, 150e6));
  const s3 = roundUnit(s2 * randBetween(0.91, 0.97));
  const s4 = roundUnit(randBetween(72e6, 95e6));
  const s5 = roundUnit(Math.min(randBetween(34e6, 52e6), s4 - 12e6));
  return { [order[0]]: s1, [order[1]]: s2, firo: s3, [order[2]]: s4, kevin: s5 };
}

function newGame(seats, opts) {
  opts = opts || {};
  const stacks = opts.stacks || dealStacks(seats.filter(s => s.kind === 'bot').map(s => s.id));
  const G = {
    v: 1, seq: 0, created: Date.now(), gid: Math.floor(rand() * 2176782336).toString(36),
    handNo: 0, level: 0, handsAtLevel: 0, handsPerLevel: opts.handsPerLevel || 5,
    payouts: PAYOUTS.slice(),
    players: seats.map((s, i) => ({
      id: s.id, name: s.name, kind: s.kind, persona: s.persona || null, seat: i, endsGame: !!s.endsGame,
      stack: stacks[s.id], startStack: stacks[s.id], cards: [], folded: false, allIn: false,
      bet: 0, total: 0, acted: false, actSeq: -1, last: '', out: false, place: 0, prize: 0,
      shown: false, handName: '',
    })),
    button: -1, sb: -1, bb: -1, dead: 0,
    deck: [], board: [], street: 'idle', phase: 'lobby',
    toAct: -1, turnId: 0, currentBet: 0, minRaise: 0, fullRaiseSeq: 0, raiseCount: 0,
    lastAggressor: -1, pfAggressor: -1, tabled: false, runout: false,
    winners: [], results: [], equity: null, showmuck: null,
    hand: {}, stats: {}, bot: {}, h2h: {},
    log: [], logId: 0,
  };
  for (const p of G.players) G.stats[p.id] = blankStats();
  return G;
}
function blankStats() {
  return { hands: 0, vpip: 0, pfr: 0, postAgg: 0, postCall: 0, postCheck: 0, faced: 0, foldFaced: 0,
    sd: 0, sdWon: 0, aggShown: 0, bluffShown: 0, won: 0 };
}

function log(G, kind, text, extra) {
  const n = ++G.logId;
  const e = Object.assign({ id: G.gid + ':' + n, n, kind, text, hand: G.handNo, t: Date.now() }, extra || {});
  G.log.push(e);
  if (G.log.length > 1500) G.log.splice(0, G.log.length - 1500);
  return e;
}

const P = (G, i) => G.players[i];
const alive = p => !p.out;
const inHand = p => !p.out && !p.folded;
const canAct = p => !p.out && !p.folded && !p.allIn;
function nextSeat(G, from, pred) {
  const n = G.players.length;
  for (let k = 1; k <= n; k++) { const i = (from + k + n) % n; if (pred(G.players[i])) return i; }
  return -1;
}
const fmt = n => {
  if (n >= 1e6) { const m = n / 1e6; return (m >= 100 ? m.toFixed(0) : m.toFixed(m % 1 === 0 ? 0 : 1)) + 'M'; }
  if (n >= 1e3) return Math.round(n / 1e3) + 'K';
  return String(n);
};
const money = n => '$' + n.toLocaleString('en-US');
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 > 10 && n % 100 < 14) ? 0 : Math.min(n % 10, 4) % 4] || 'th');
const curLevel = G => LEVELS[Math.min(G.level, LEVELS.length - 1)];

// High card for the button — spades > hearts > diamonds > clubs breaks ties.
function drawForButton(G) {
  const deck = shuffledDeck();
  const draws = G.players.map((p, i) => ({ i, c: deck[i] }));
  const val = c => rank(c) * 4 + (3 - suit(c));
  draws.sort((a, b) => val(b.c) - val(a.c));
  G.button = draws[0].i;
  log(G, 'system', 'Drawing for the button: ' + G.players.map((p, i) => `${p.name} ${cardPretty(deck[i])}`).join(' · '));
  log(G, 'system', `${P(G, G.button).name} wins the button.`);
  return deck.slice(0, G.players.length);
}

/* ── Hand flow ─────────────────────────────────────────────── */
function startHand(G) {
  if (G.handNo > 0 && G.handsAtLevel >= G.handsPerLevel && G.level < LEVELS.length - 1) {
    G.level++; G.handsAtLevel = 0;
    const L = curLevel(G);
    log(G, 'level', `Blinds up — Level ${L.n}: ${fmt(L.sb)} / ${fmt(L.bb)}, ${fmt(L.ante)} big-blind ante.`,
      { ann: { type: 'level', title: `LEVEL ${L.n}`, sub: `BLINDS ${fmt(L.sb)} / ${fmt(L.bb)} · ${fmt(L.ante)} BB ANTE` } });
  }
  G.handNo++; G.handsAtLevel++;
  const L = curLevel(G);
  G.deck = shuffledDeck(); G.board = []; G.street = 'preflop'; G.dead = 0;
  G.winners = []; G.equity = null; G.showmuck = null; G.tabled = false; G.runout = false;
  G.currentBet = 0; G.minRaise = L.bb; G.fullRaiseSeq = 0; G.raiseCount = 0; G.lastAggressor = -1; G.pfAggressor = -1;
  G.hand = {}; G.allinEq = null;
  for (const p of G.players) {
    Object.assign(p, { cards: [], folded: p.out, allIn: false, bet: 0, total: 0, acted: false, actSeq: -1,
      last: '', shown: false, handName: '', startStack: p.stack });
    G.hand[p.id] = { vpip: false, pfr: false, pfLevel: 0, postAgg: 0, postCall: 0, aggStreet: '', foldedTo: null };
  }
  const live = G.players.filter(alive).length;
  if (!(G.handNo === 1 && G.button >= 0)) G.button = nextSeat(G, Math.max(G.button, -1), alive);
  if (live === 2) { G.sb = G.button; G.bb = nextSeat(G, G.sb, alive); }
  else { G.sb = nextSeat(G, G.button, alive); G.bb = nextSeat(G, G.sb, alive); }

  // WSOP: the big blind is posted first, then the big-blind ante from what remains.
  const bbP = P(G, G.bb), sbP = P(G, G.sb);
  post(bbP, L.bb);
  const ante = Math.min(L.ante, bbP.stack);
  bbP.stack -= ante; G.dead = ante; if (bbP.stack === 0) bbP.allIn = true;
  post(sbP, L.sb);
  sbP.last = 'SB'; bbP.last = 'BB';
  G.currentBet = L.bb;

  log(G, 'hand', `Hand #${G.handNo} — Level ${L.n} (${fmt(L.sb)}/${fmt(L.bb)}, ${fmt(L.ante)} BBA). Button: ${P(G, G.button).name}.`);
  for (let r = 0; r < 2; r++) {
    let i = G.sb;
    for (let k = 0; k < live; k++) { P(G, i).cards.push(G.deck.pop()); i = nextSeat(G, i, alive); }
  }
  for (const p of G.players.filter(alive)) G.stats[p.id].hands++;
  G.phase = 'betting';
  const first = live === 2 ? G.sb : nextSeat(G, G.bb, alive);
  progress(G, first - 1);
  return G;
}
function post(p, amt) {
  const a = Math.min(amt, p.stack);
  p.stack -= a; p.bet += a; p.total += a;
  if (p.stack === 0) p.allIn = true;
}
function potTotal(G) { return G.dead + G.players.reduce((s, p) => s + p.total, 0); }

function legalActions(G, i) {
  const p = P(G, i), L = curLevel(G);
  if (G.phase !== 'betting' || G.toAct !== i || !canAct(p)) return null;
  const toCall = Math.max(0, G.currentBet - p.bet);
  const call = Math.min(toCall, p.stack);
  const maxTo = p.bet + p.stack;
  const othersLive = G.players.some(o => o !== p && canAct(o));
  // Raise rights: not yet acted this round, or a full raise has happened since.
  const rights = p.actSeq < G.fullRaiseSeq;
  const canRaise = rights && othersLive && maxTo > G.currentBet;
  const minTo = Math.min(G.currentBet === 0 ? L.bb : G.currentBet + G.minRaise, maxTo);
  return {
    toCall, call, canCheck: toCall === 0, canCall: toCall > 0,
    canRaise, minTo, maxTo,
    verb: G.currentBet === 0 ? 'Bet' : 'Raise',
    pot: potTotal(G), bb: L.bb, currentBet: G.currentBet, myBet: p.bet, stack: p.stack,
  };
}

// a = {type:'fold'|'check'|'call'|'raise', to?}
function applyAction(G, i, a) {
  const la = legalActions(G, i);
  if (!la) return { ok: false, err: 'Not your turn' };
  const p = P(G, i), st = G.stats[p.id], hf = G.hand[p.id];
  const pre = G.street === 'preflop';
  const pot0 = potTotal(G);
  let type = a.type;
  if (type === 'check' && !la.canCheck) type = 'call';
  if (type === 'call' && la.toCall === 0) type = 'check';
  if (type === 'raise' && !la.canRaise) type = la.canCheck ? 'check' : 'call';
  let text = '';

  if (!pre && la.toCall > 0) st.faced++;
  // Head-to-head ledger: how this player responds to a specific aggressor.
  const ag = la.toCall > 0 && G.lastAggressor >= 0 && G.lastAggressor !== i ? P(G, G.lastAggressor) : null;
  if (ag) pair(G, ag.id, p.id).faced++;
  if (type === 'fold') {
    p.folded = true; p.last = 'Fold'; text = `${p.name} folds`;
    if (!pre && la.toCall > 0) st.foldFaced++;
    if (ag) { pair(G, ag.id, p.id).fold++; hf.foldedTo = ag.id; }
  } else if (type === 'check') {
    p.last = 'Check'; text = `${p.name} checks`;
    if (!pre) st.postCheck++;
  } else if (type === 'call') {
    post(p, la.call);
    p.last = p.allIn ? 'All-in' : 'Call';
    text = `${p.name} calls ${fmt(la.call)}${p.allIn ? ' and is ALL-IN' : ''}`;
    if (pre) hf.vpip = true; else { st.postCall++; hf.postCall++; }
  } else if (type === 'raise') {
    let to = roundUnit(+a.to || 0);
    if (to >= la.maxTo) to = la.maxTo;
    if (to < la.minTo) to = la.minTo;
    const wasBet = G.currentBet === 0;
    const by = to - G.currentBet;
    // An all-in for less than a full raise does not reopen the betting.
    const full = wasBet ? to >= curLevel(G).bb : by >= G.minRaise;
    post(p, to - p.bet);
    if (full) { G.minRaise = by; G.fullRaiseSeq++; }
    G.currentBet = to;
    G.raiseCount++; G.lastAggressor = i;
    if (pre) { hf.vpip = true; hf.pfr = true; hf.pfLevel = G.raiseCount; G.pfAggressor = i; } else { hf.postAgg++; st.postAgg++; }
    hf.aggStreet = G.street;
    for (const o of G.players) if (o !== p && canAct(o)) o.acted = false;
    const verb = wasBet ? 'bets' : 'raises to';
    p.last = p.allIn ? 'All-in' : (wasBet ? 'Bet' : 'Raise');
    text = `${p.name} ${verb} ${fmt(to)}${p.allIn ? ' — ALL-IN' : ''}`;
  }
  p.acted = true; p.actSeq = G.fullRaiseSeq;
  log(G, 'action', text, { who: p.id, act: type, amt: p.bet, pot: pot0 });
  G.hand[p.id].lastAct = type;
  progress(G);
  return { ok: true, type };
}

// Decide what happens after an action (or after the blinds, with `from` = seat before first actor).
function progress(G, from) {
  const live = G.players.filter(inHand);
  if (live.length === 1) return winUncontested(G, live[0]);
  const actors = live.filter(p => !p.allIn);
  const pending = actors.filter(p => !p.acted || p.bet < G.currentBet);
  if (pending.length === 0) return endRound(G);
  // Lone player left with chips and nothing to call: no decision to make.
  if (actors.length === 1 && actors[0].bet >= G.currentBet) return endRound(G);
  G.toAct = nextSeat(G, from === undefined ? G.toAct : from, p => pending.indexOf(p) >= 0);
  G.turnId++;
}

// Return an uncalled bet, then sweep bets into the pot.
function collectBets(G) {
  const withBet = G.players.filter(p => p.bet > 0).sort((a, b) => b.bet - a.bet);
  if (withBet.length) {
    const top = withBet[0], second = withBet.length > 1 ? withBet[1].bet : 0;
    if (top.bet > second) {
      const back = top.bet - second;
      top.stack += back; top.bet -= back; top.total -= back;
      if (top.stack > 0) top.allIn = false;
      if (back > 0 && !top.folded) log(G, 'action', `Uncalled ${fmt(back)} returned to ${top.name}`);
    }
  }
  for (const p of G.players) p.bet = 0;
}

function endRound(G) {
  collectBets(G);
  G.currentBet = 0; G.minRaise = curLevel(G).bb; G.fullRaiseSeq = 0; G.raiseCount = 0;
  for (const p of G.players) { p.acted = false; p.actSeq = -1; if (!p.folded && !p.allIn) p.last = ''; }
  const live = G.players.filter(inHand);
  const actors = live.filter(p => !p.allIn);
  G.runout = actors.length <= 1;
  G.toAct = -1; G.turnId++;
  if (G.runout && !G.tabled && live.length > 1) {
    G.tabled = true;
    for (const p of live) p.shown = true;
    log(G, 'allin', 'All-in! Cards are tabled: ' + live.map(p => `${p.name} ${p.cards.map(cardPretty).join(' ')}`).join(' · '),
      { ann: { type: 'allin', title: 'ALL IN', sub: live.map(p => p.name.split(' ').pop()).join(' vs ') } });
  }
  G.phase = G.street === 'river' ? 'showdown' : 'deal';
  if (G.tabled) { computeEquity(G); if (!G.allinEq) G.allinEq = Object.assign({}, G.equity); }
}

function dealStreet(G) {
  if (G.phase !== 'deal') return;
  G.deck.pop();                                           // burn
  if (G.street === 'preflop') { G.board.push(G.deck.pop(), G.deck.pop(), G.deck.pop()); G.street = 'flop'; }
  else if (G.street === 'flop') { G.board.push(G.deck.pop()); G.street = 'turn'; }
  else if (G.street === 'turn') { G.board.push(G.deck.pop()); G.street = 'river'; }
  const label = { flop: 'Flop', turn: 'Turn', river: 'River' }[G.street];
  log(G, 'board', `${label}: ${G.board.map(cardPretty).join(' ')}  (pot ${fmt(potTotal(G))})`, { board: G.board.slice() });
  if (G.runout) {
    G.phase = G.street === 'river' ? 'showdown' : 'deal';
    if (G.tabled) computeEquity(G);
  } else {
    G.phase = 'betting';
    G.toAct = nextSeat(G, G.button, canAct);
    G.turnId++;
  }
}

// Main pot + side pots from each player's total contribution.
// Pot boundaries come only from all-in players (plus the top contribution).
function buildPots(G) {
  const live = G.players.filter(inHand);
  const top = Math.max(0, ...live.map(p => p.total));
  const levels = [...new Set(live.filter(p => p.allIn).map(p => p.total).concat(top))].filter(x => x > 0).sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const L of levels) {
    let amount = 0;
    for (const p of G.players) amount += Math.min(p.total, L) - Math.min(p.total, prev);
    pots.push({ amount, eligible: live.filter(p => p.total >= L).map(p => p.seat) });
    prev = L;
  }
  const leftover = G.players.reduce((s, p) => s + Math.max(0, p.total - prev), 0);
  if (!pots.length) pots.push({ amount: 0, eligible: live.map(p => p.seat) });
  pots[pots.length - 1].amount += leftover;
  pots[0].amount += G.dead;
  // Merge pots with the same eligible set (e.g. when nobody is all-in)
  const merged = [];
  for (const pt of pots) {
    const last = merged[merged.length - 1];
    if (last && last.eligible.join() === pt.eligible.join()) last.amount += pt.amount; else merged.push(pt);
  }
  return merged.filter(p => p.amount > 0);
}

function splitAmount(G, amount, winners) {
  const units = Math.round(amount / UNIT), each = Math.floor(units / winners.length);
  let odd = units - each * winners.length;
  // Odd chips go to the first winner clockwise from the button.
  const order = winners.slice().sort((a, b) => ((a - G.button + 5) % 5 || 5) - ((b - G.button + 5) % 5 || 5));
  const res = {};
  for (const w of order) { res[w] = each * UNIT + (odd > 0 ? UNIT : 0); if (odd > 0) odd--; }
  return res;
}

function resolveShowdown(G) {
  if (G.phase !== 'showdown') return;
  const live = G.players.filter(inHand);
  const scores = {};
  for (const p of live) { scores[p.seat] = evaluate(p.cards.concat(G.board)); p.handName = scoreName(scores[p.seat]); }
  const pots = buildPots(G);
  const potWinners = pots.map(pt => {
    const best = Math.max(...pt.eligible.map(s => scores[s]));
    return pt.eligible.filter(s => scores[s] === best);
  });
  const winSeats = new Set(potWinners.flat());

  // Showing order: last river aggressor first (else first live seat left of the button).
  const n = G.players.length;
  const first = G.lastAggressor >= 0 && inHand(P(G, G.lastAggressor)) ? G.lastAggressor : nextSeat(G, G.button, inHand);
  let bestShown = -1;
  for (let k = 0, i = first; k < n; k++, i = (i + 1) % n) {
    const p = P(G, i); if (!inHand(p)) continue;
    if (G.tabled || winSeats.has(i) || scores[i] >= bestShown) {
      if (!p.shown) log(G, 'show', `${p.name} shows ${p.cards.map(cardPretty).join(' ')} — ${p.handName}`, { who: p.id });
      p.shown = true; bestShown = Math.max(bestShown, scores[i]);
    } else {
      log(G, 'show', `${p.name} mucks`, { who: p.id });
    }
  }
  const won = {};
  pots.forEach((pt, k) => {
    const shares = splitAmount(G, pt.amount, potWinners[k]);
    const label = pots.length > 1 ? (k === 0 ? 'the main pot' : `side pot ${k}`) : 'the pot';
    for (const s in shares) {
      const p = P(G, +s); p.stack += shares[s]; won[s] = (won[s] || 0) + shares[s];
      G.winners.push({ seat: +s, amount: shares[s], hand: p.handName, pot: k });
      log(G, 'win', `${p.name} wins ${label} (${fmt(shares[s])}) with ${p.handName}${potWinners[k].length > 1 ? ' — split' : ''}`, { who: p.id, amount: shares[s] });
    }
  });
  for (const p of live) {
    const st = G.stats[p.id]; st.sd++;
    if (won[p.seat]) { st.sdWon++; st.won++; }
    if (G.hand[p.id].postAgg > 0) { st.aggShown++; if (isWeak(p.cards, G.board)) st.bluffShown++; }
  }
  // Head-to-head showdowns: who beat whom, and who got caught bluffing by whom.
  for (const w of live) for (const l of live) {
    if (w === l || !won[w.seat] || won[l.seat]) continue;
    pair(G, w.id, l.id).sd++; pair(G, w.id, l.id).won++; pair(G, l.id, w.id).sd++;
    if (G.hand[l.id].postAgg > 0 && isWeak(l.cards, G.board)) pair(G, w.id, l.id).caught++;
  }
  for (const p of G.players) { if (G.hand[p.id].vpip) G.stats[p.id].vpip++; if (G.hand[p.id].pfr) G.stats[p.id].pfr++; }
  for (const p of G.players) { p.total = 0; p.bet = 0; }
  G.dead = 0; G.equity = null;
  settle(G);
}

// "Weak" = worse than top pair (or just playing the board) — used to spot shown bluffs.
function isWeak(cards, board) {
  if (board.length < 3) return false;
  const s = evaluate(cards.concat(board)), c = scoreCat(s);
  if (board.length >= 5 && evaluate(board) === s) return true;
  if (c === 0) return true;
  if (c >= 2) return false;
  const pr = scoreKick(s, 0);
  if (!cards.some(x => rank(x) === pr)) return true;
  return pr < Math.max(...board.map(rank));
}

function winUncontested(G, p) {
  collectBets(G);
  const amount = potTotal(G);
  p.stack += amount;
  G.winners = [{ seat: p.seat, amount, hand: '', pot: 0 }];
  log(G, 'win', `${p.name} wins ${fmt(amount)} — no showdown`, { who: p.id, amount });
  G.stats[p.id].won++;
  for (const q of G.players) { if (G.hand[q.id].vpip) G.stats[q.id].vpip++; if (G.hand[q.id].pfr) G.stats[q.id].pfr++; }
  for (const q of G.players) { q.total = 0; q.bet = 0; }
  G.dead = 0; G.toAct = -1; G.turnId++;
  G.showmuck = { seat: p.seat, hand: G.handNo };
  G.phase = 'showmuck';
}

// Winner of an uncontested pot chooses to show or muck.
function showOrMuck(G, seat, show) {
  if (G.phase !== 'showmuck' || !G.showmuck || G.showmuck.seat !== seat) return false;
  const p = P(G, seat);
  if (show) {
    p.shown = true;
    const d = describeHand(p.cards, G.board);
    log(G, 'show', `${p.name} shows ${p.cards.map(cardPretty).join(' ')}${d && G.board.length >= 3 ? ' — ' + d.main : ''}`, { who: p.id });
    if (G.hand[p.id].postAgg > 0 && G.board.length >= 3) {
      G.stats[p.id].aggShown++;
      if (isWeak(p.cards, G.board)) {
        G.stats[p.id].bluffShown++;
        // Everyone who folded to this bluff remembers it.
        for (const q of G.players) if (G.hand[q.id] && G.hand[q.id].foldedTo === p.id) pair(G, q.id, p.id).shownBluff++;
      }
    }
  } else log(G, 'show', `${p.name} mucks`, { who: p.id });
  G.showmuck = null;
  settle(G);
  return true;
}

// Head-to-head record of `a` against `b`.
function pair(G, a, b) {
  if (!G.h2h) G.h2h = {};
  const k = a + '>' + b;
  return G.h2h[k] || (G.h2h[k] = { faced: 0, fold: 0, sd: 0, won: 0, caught: 0, shownBluff: 0, net: 0 });
}
// Chips that changed hands this hand, split from each loser to the winners.
function ledgerNet(G) {
  const d = G.players.map(p => p.stack - p.startStack);
  const gain = d.reduce((s, x) => s + Math.max(0, x), 0);
  if (!gain) return;
  G.players.forEach((l, li) => {
    if (d[li] >= 0) return;
    G.players.forEach((w, wi) => {
      if (d[wi] <= 0) return;
      const amt = Math.round(-d[li] * d[wi] / gain);
      pair(G, w.id, l.id).net += amt; pair(G, l.id, w.id).net -= amt;
    });
  });
}

// Eliminations, payouts, champion.
function settle(G) {
  ledgerNet(G);
  // Busted in the same hand: the bigger starting stack finishes higher; exact ties split the prizes.
  let place = G.players.filter(alive).length;
  const busted = G.players.filter(p => alive(p) && p.stack === 0).sort((a, b) => a.startStack - b.startStack);
  let i = 0;
  while (i < busted.length) {
    let j = i; while (j + 1 < busted.length && busted[j + 1].startStack === busted[i].startStack) j++;
    const places = []; for (let k = i; k <= j; k++) places.push(place--);
    const prize = roundUnit(places.reduce((s, pl) => s + G.payouts[pl - 1], 0) / places.length);
    for (let k = i; k <= j; k++) {
      const p = busted[k];
      p.out = true; p.place = places[places.length - 1]; p.prize = prize;
      G.results.push({ id: p.id, name: p.name, place: p.place, prize: p.prize, hand: G.handNo });
      log(G, 'bust', `${p.name} is eliminated in ${ordinal(p.place)} place and collects ${money(p.prize)}.`,
        { who: p.id, ann: { type: 'bust', title: `${p.name.toUpperCase()} ELIMINATED`, sub: `${ordinal(p.place).toUpperCase()} PLACE · ${money(p.prize)}` } });
    }
    i = j + 1;
  }
  let left = G.players.filter(alive);
  // A player marked endsGame (Firo) busting ends the event: the rest finish in chip order. No rebuys.
  if (left.length > 1 && G.players.some(p => p.endsGame && p.out && G.results.some(r => r.id === p.id && r.hand === G.handNo))) {
    const order = left.slice().sort((a, b) => b.stack - a.stack);
    for (let k = order.length - 1; k >= 1; k--) {
      const p = order[k]; p.out = true; p.place = k + 1; p.prize = G.payouts[k];
      G.results.push({ id: p.id, name: p.name, place: p.place, prize: p.prize, hand: G.handNo });
      log(G, 'bust', `${p.name} finishes ${ordinal(p.place)} on chips and collects ${money(p.prize)}.`, { who: p.id });
    }
    left = [order[0]];
  }
  if (left.length === 1) {
    const w = left[0];
    w.place = 1; w.prize = G.payouts[0];
    G.results.push({ id: w.id, name: w.name, place: 1, prize: w.prize, hand: G.handNo });
    log(G, 'champion', `${w.name} wins the 2027 WSOP Main Event! ${money(w.prize)} and the gold bracelet.`,
      { who: w.id, ann: { type: 'champion', title: `${w.name.toUpperCase()}`, sub: `2027 WORLD CHAMPION · ${money(w.prize)} + THE BRACELET` } });
    G.phase = 'over';
  } else {
    G.phase = 'handEnd';
  }
}

/* ── All-in equity (broadcast style) ───────────────────────── */
function computeEquity(G) {
  const live = G.players.filter(inHand);
  if (live.length < 2) { G.equity = null; return; }
  const used = new Set(G.board); live.forEach(p => p.cards.forEach(c => used.add(c)));
  const rest = []; for (let c = 0; c < 52; c++) if (!used.has(c)) rest.push(c);
  const need = 5 - G.board.length, wins = {};
  live.forEach(p => wins[p.seat] = 0);
  let trials = 0;
  const run = extra => {
    const b = G.board.concat(extra);
    let best = -1, ws = [];
    for (const p of live) { const s = evaluate(p.cards.concat(b)); if (s > best) { best = s; ws = [p.seat]; } else if (s === best) ws.push(p.seat); }
    for (const w of ws) wins[w] += 1 / ws.length; trials++;
  };
  if (need === 0) run([]);
  else if (need === 1) for (const a of rest) run([a]);
  else if (need === 2) for (let a = 0; a < rest.length; a++) for (let b = a + 1; b < rest.length; b++) run([rest[a], rest[b]]);
  else {
    for (let t = 0; t < 4000; t++) {
      const pick = []; const pool = rest.slice();
      for (let k = 0; k < need; k++) { const j = Math.floor(rand() * pool.length); pick.push(pool[j]); pool[j] = pool[pool.length - 1]; pool.pop(); }
      run(pick);
    }
  }
  G.equity = {}; live.forEach(p => G.equity[p.seat] = Math.round(wins[p.seat] / trials * 1000) / 10);
}

/* ── What each viewer may see ─────────────────────────────── */
function publicView(G, viewerId) {
  const L = curLevel(G), next = LEVELS[Math.min(G.level + 1, LEVELS.length - 1)];
  const pots = G.phase === 'betting' || G.phase === 'deal' || G.phase === 'showdown' ? buildPots(G) : [];
  return {
    v: G.v, gid: G.gid, seq: G.seq, handNo: G.handNo, phase: G.phase, street: G.street, board: G.board.slice(),
    level: L, nextLevel: next, handsLeft: G.handsPerLevel - G.handsAtLevel, handsPerLevel: G.handsPerLevel,
    button: G.button, sb: G.sb, bb: G.bb, toAct: G.toAct, turnId: G.turnId,
    pot: potTotal(G), pots: pots.map(p => ({ amount: p.amount, eligible: p.eligible })),
    legal: G.toAct >= 0 ? legalActions(G, G.toAct) : null,
    winners: G.winners.slice(), results: G.results.slice(), equity: G.equity, payouts: G.payouts,
    showmuck: G.showmuck, tabled: G.tabled,
    players: G.players.map(p => ({
      id: p.id, name: p.name, kind: p.kind, persona: p.persona, seat: p.seat, stack: p.stack, bet: p.bet,
      folded: p.folded, allIn: p.allIn, out: p.out, place: p.place, prize: p.prize, last: p.last,
      hasCards: p.cards.length > 0 && !p.folded,
      cards: (p.id === viewerId || p.shown) ? p.cards.slice() : null,
      shown: p.shown, handName: p.shown ? p.handName : '',
      mood: (G.bot[p.id] && G.bot[p.id].mood) || '',
    })),
  };
}

const API = {
  UNIT, LEVELS, PAYOUTS, RANKS, SUITS, SUIT_SYM, RANK_NAME, CAT_NAME,
  rank, suit, cardStr, cardPretty, rand, shuffledDeck,
  evaluate, scoreCat, scoreKick, scoreName, bestFive, handPct, pfIndex, preflopName, preflopTier, draws, describeHand,
  dealStacks, newGame, drawForButton, startHand, legalActions, applyAction, dealStreet, resolveShowdown,
  showOrMuck, buildPots, potTotal, pair, computeEquity, publicView, log, nextSeat, curLevel,
  fmt, money, ordinal, roundUnit, isWeak, inHand, canAct, alive,
};
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.WSOP = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
