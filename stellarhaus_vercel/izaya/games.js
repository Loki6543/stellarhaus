'use strict';
/* =========================================================
   IKEBUKURO GAMBIT — duels & parlor games
   Heads-up No-Limit Hold'em (hand evaluator from our Final Table
   project, WSOP engine), Mau-Mau, Kniffel, Reversi, Superhirn.
   These replace the old turn-based battle screen.
   ========================================================= */
Object.assign(FONT, {
  '♠': '..#../.###./#####/#####/#.#.#/..#../.###.'.split('/'),
  '♦': '..#../.###./#####/#####/.###./..#../.....'.split('/'),
  '♣': '.###./.###./#.#.#/#####/#.#.#/..#../.###.'.split('/'),
  '◀': '...#./..##./.###./####./.###./..##./...#.'.split('/'),
  '▲': '...../...../..#../.###./#####/...../.....'.split('/'),
});
const RK = '23456789TJQKA', SU = ['♠', '♥', '♦', '♣'];
const rnd = n => Math.floor(Math.random() * n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function yen(n) { return '¥' + n.toLocaleString('en-US'); }
function drawCard(c, x, y, up, hi) {
  if (hi) y -= 4;
  rect(x, y, 15, 21, 3); rect(x + 1, y + 1, 13, 19, up ? 0 : 2);
  if (up) { text(RK[c >> 2], x + 2, y + 2, 3); text(SU[c & 3], x + 8, y + 12, 3); }
  else { frame(x + 3, y + 3, 9, 15, 3); rect(x + 5, y + 5, 5, 11, 1); }
}

/* ---------------- shared widget ---------------- */
class GameW {
  constructor() { this.full = true; this.msg = ''; this.menu = null; this.waitA = null; this.sel = null; }
  say(t, auto) { this.msg = t; return new Promise(r => { this.waitA = r; this.auto = auto || 0; this.sayAge = 0; }); }
  ask(opts) { return new Promise(r => { this.menu = { opts: opts.filter(Boolean), i: 0, res: r }; }); }
  pick(n, o) { return new Promise(r => { this.sel = Object.assign({ n, i: 0, res: r }, o); }); }
  done(v) { const s = this.sel; this.sel = null; s.res(v); }
  update() {
    if (this.age < 2) return;
    if (this.menu) {
      const m = this.menu, n = m.opts.length;
      if (rep('up')) { m.i = (m.i + n - 1) % n; sfx('sel'); }
      if (rep('down')) { m.i = (m.i + 1) % n; sfx('sel'); }
      const o = m.opts[m.i];
      if (o.adj) {
        if (rep('left')) { o.k = (o.k + o.adj.length - 1) % o.adj.length; sfx('sel'); }
        if (rep('right')) { o.k = (o.k + 1) % o.adj.length; sfx('sel'); }
      }
      if (pressed.a) { sfx('ok'); this.menu = null; m.res(o.adj ? { v: o.v, x: o.adj[o.k] } : { v: o.v }); }
      return;
    }
    if (this.waitA) {
      this.sayAge++;
      if ((this.sayAge > 6 && (pressed.a || pressed.b)) || (this.auto && this.sayAge >= this.auto)) { const r = this.waitA; this.waitA = null; r(); }
      return;
    }
    if (this.sel) this.onSel(this.sel);
  }
  onSel(s) {
    if (rep('left')) { s.i = (s.i + s.n - 1) % s.n; sfx('sel'); }
    if (rep('right')) { s.i = (s.i + 1) % s.n; sfx('sel'); }
    if (pressed.a) { if (!s.ok || s.ok(s.i)) { sfx('ok'); this.done(s.i); } else sfx('bump'); }
    else if (pressed.b && s.b) { sfx('back'); this.done(-1); }
  }
  bottom() {
    box(0, 104, 160, 40);
    if (this.menu) {
      const n = this.menu.opts.length, st = n > 3 ? 8 : 10, y0 = n > 3 ? 108 : 109;
      this.menu.opts.forEach((o, k) => {
        const y = y0 + k * st;
        if (k === this.menu.i) text('▶', 6, y, 3);
        text(o.adj ? `${o.t} ${o.fmt(o.adj[o.k])}` + (o.adj.length > 1 ? ' ◀▶' : '') : o.t, 14, y, 3);
      });
    } else {
      wrap(this.msg, 24).slice(0, 3).forEach((l, k) => text(l, 7, 109 + k * 10, 3));
      if (this.waitA && !this.auto && (G.frame >> 4) % 2) text('▼', 147, 133, 3);
    }
  }
}
async function withGame(w, fn) {
  await fadeTo(3, 3); pushUI(w); await fadeTo(0, 3);
  try { return await fn(w); }
  finally { await fadeTo(3, 3); popUI(w); await fadeTo(0, 3); }
}

/* =========================================================
   HEADS-UP NO-LIMIT HOLD'EM
   ========================================================= */
function pkEquity(hole, board, n) {
  const used = new Set(hole.concat(board)), rest = [];
  for (let i = 0; i < 52; i++) if (!used.has(i)) rest.push(i);
  const need = 2 + 5 - board.length; let w = 0;
  for (let k = 0; k < n; k++) {
    for (let i = 0; i < need; i++) { const j = i + rnd(rest.length - i); [rest[i], rest[j]] = [rest[j], rest[i]]; }
    const b = board.concat(rest.slice(2, need));
    const a = WSOP.evaluate(hole.concat(b)), o = WSOP.evaluate([rest[0], rest[1]].concat(b));
    w += a > o ? 1 : a === o ? 0.5 : 0;
  }
  return w / n;
}
class PokerW extends GameW {
  constructor(opp) { super(); this.opp = opp; this.S = null; }
  draw() {
    const S = this.S, o = this.opp;
    rect(0, 0, W, H, 1); rect(0, 30, W, 38, 2); rect(2, 32, W - 4, 34, 1);
    blit(SPR[o.ch].down0, 3, 3); text(o.name, 22, 3, 3); text(yen(S.stack[1]), 22, 13, 3);
    if (S.bet[1]) text('BET ' + S.bet[1], 22, 22, 3);
    S.hole[1].forEach((c, i) => drawCard(c, 122 + i * 17, 4, S.show));
    for (let i = 0; i < 5; i++) { if (i < S.board.length) drawCard(S.board[i], 36 + i * 18, 42, true); else frame(36 + i * 18, 42, 15, 21, 2); }
    text('POT', 4, 40, 3); text('' + (S.pot + S.bet[0] + S.bet[1]), 4, 50, 3);
    text('#' + S.hand, 136, 50, 3);
    S.hole[0].forEach((c, i) => drawCard(c, 4 + i * 17, 78, true));
    text('IZAYA ' + yen(S.stack[0]), 42, 72, 3);
    if (S.bet[0]) text('BET ' + S.bet[0], 42, 82, 3);
    if (S.desc) text(S.desc, 42, 92, 3);
    if (S.myEq !== null && S.myEq !== undefined) text(Math.round(S.myEq * 100) + '%', 136, 82, 3);
    const bx = S.btn === 0 ? 148 : 108, by = S.btn === 0 ? 92 : 14;
    rect(bx, by, 9, 9, 3); text('D', bx + 2, by + 1, 0);
    this.bottom();
  }
}
async function pokerMatch(opp) {
  return withGame(new PokerW(opp), async T => {
    const bb = opp.buy / 20, sb = bb / 2, r2 = x => Math.max(sb, Math.round(x / sb) * sb);
    const S = T.S = { stack: [opp.buy, opp.buy], pot: 0, bet: [0, 0], board: [], hole: [[], []], btn: rnd(2), show: false, hand: 0, desc: '', myEq: null };
    const pay = (i, a) => { a = Math.max(0, Math.min(a, S.stack[i])); S.stack[i] -= a; S.bet[i] += a; };
    const fs = lvl('foresight'), mp = lvl('manip');
    const look = () => {
      S.desc = S.board.length ? WSOP.CAT_NAME[WSOP.scoreCat(WSOP.evaluate(S.hole[0].concat(S.board)))] : '';
      S.myEq = fs >= 2 ? pkEquity(S.hole[0], S.board, 200) : null;
    };
    async function round(first) {
      const acted = [false, false]; let cur = first;
      for (;;) {
        const o = 1 - cur, toCall = S.bet[o] - S.bet[cur];
        if (S.stack[cur] === 0 || (S.stack[o] === 0 && toCall <= 0)) acted[cur] = true;
        else {
          const maxTo = S.bet[cur] + Math.min(S.stack[cur], S.stack[o] + S.bet[o] - S.bet[cur]);
          const minTo = Math.min(maxTo, Math.max(S.bet[o] * 2, S.bet[o] + bb, bb));
          const canRaise = maxTo > S.bet[o], potNow = S.pot + S.bet[0] + S.bet[1];
          const potTo = Math.min(maxTo, Math.max(minTo, r2(S.bet[o] + potNow + toCall)));
          const halfTo = Math.min(maxTo, Math.max(minTo, r2(S.bet[o] + (potNow + toCall) / 2)));
          const sizes = [...new Set([minTo, halfTo, potTo, maxTo])].sort((a, b) => a - b);
          const fmt = x => (x === maxTo && x - S.bet[cur] >= S.stack[cur] ? 'ALL-IN' : '¥' + x);
          let a;
          if (cur === 0) {
            T.msg = '';
            a = await T.ask(toCall > 0
              ? [{ t: toCall >= S.stack[0] ? 'CALL ALL-IN' : 'CALL ¥' + toCall, v: 'call' }, canRaise && { t: 'RAISE', v: 'raise', adj: sizes, k: 0, fmt }, { t: 'FOLD', v: 'fold' }]
              : [{ t: 'CHECK', v: 'call' }, canRaise && { t: 'BET', v: 'raise', adj: sizes, k: 0, fmt }]);
          } else {
            const eq = pkEquity(S.hole[1], S.board, 140), z = Math.random();
            if (toCall > 0) {
              const odds = toCall / (potNow + toCall);
              if (eq > 0.72 && canRaise && z < opp.aggr) a = { v: 'raise', x: potTo };
              else if (eq > odds + 0.06 - opp.loose * 0.08) a = { v: 'call' };
              else if (canRaise && z < opp.bluff * 0.4) a = { v: 'raise', x: halfTo, bluff: true };
              else a = { v: 'fold' };
            } else if (canRaise && eq > 0.6 && z < opp.aggr + 0.25) a = { v: 'raise', x: eq > 0.8 ? potTo : halfTo };
            else if (canRaise && z < opp.bluff) a = { v: 'raise', x: halfTo, bluff: eq < 0.45 };
            else a = { v: 'call' };
            if (a.bluff && Math.random() < 0.16 * mp) await T.say(`(${opp.name} ${opp.tell} A tell?)`);
            sfx(a.v === 'fold' ? 'back' : 'sel');
            await T.say(a.v === 'fold' ? `${opp.name} folds.` : a.v === 'call' ? `${opp.name} ${toCall > 0 ? 'calls' : 'checks'}.` : `${opp.name} ${toCall > 0 ? 'raises' : 'bets'} to ¥${a.x}${a.x - S.bet[1] >= S.stack[1] ? ' (ALL-IN)' : ''}.`, 70);
          }
          if (a.v === 'fold') return cur;
          if (a.v === 'call') pay(cur, toCall); else { pay(cur, a.x - S.bet[cur]); acted[o] = false; }
          acted[cur] = true;
        }
        if (acted[0] && acted[1]) break;
        cur = o;
      }
      const d = S.bet[0] - S.bet[1];
      if (d > 0) { S.bet[0] -= d; S.stack[0] += d; } else if (d < 0) { S.bet[1] += d; S.stack[1] -= d; }
      S.pot += S.bet[0] + S.bet[1]; S.bet = [0, 0];
      return -1;
    }
    await T.say(`${opp.name}: "${opp.hello}"`);
    await T.say(`Heads-up No-Limit Hold'em. Blinds ${sb}/${bb}. Up to 10 hands.` + (fs >= 2 ? ' FORESIGHT shows your win odds.' : ''));
    while (S.stack[0] > 0 && S.stack[1] > 0 && S.hand < 10) {
      S.hand++; S.btn = 1 - S.btn;
      const d = WSOP.shuffledDeck(); S.hole = [[d[0], d[1]], [d[2], d[3]]]; const run = d.slice(4, 9);
      S.board = []; S.show = false; S.pot = 0; S.bet = [0, 0]; sfx('door');
      pay(S.btn, sb); pay(1 - S.btn, bb); look();
      let folded = await round(S.btn);
      for (const n of [3, 4, 5]) {
        if (folded >= 0) break;
        S.board = run.slice(0, n); sfx('sel'); look();
        if (S.stack[0] > 0 && S.stack[1] > 0) folded = await round(1 - S.btn); else await T.say(n === 3 ? 'All in. The cards run out...' : '...', 45);
      }
      if (folded >= 0) {
        const w = 1 - folded, win = S.pot + S.bet[0] + S.bet[1];
        S.stack[w] += win; S.pot = 0; S.bet = [0, 0];
        if (w === 0) sfx('ok');
        await T.say(w === 0 ? `You take the pot: ¥${win}.` : `You fold. ${opp.name} takes ¥${win}.`);
      } else {
        S.show = true;
        const a = WSOP.evaluate(S.hole[0].concat(S.board)), o = WSOP.evaluate(S.hole[1].concat(S.board)), win = S.pot;
        const nm = s => WSOP.CAT_NAME[WSOP.scoreCat(s)];
        S.pot = 0;
        if (a > o) { S.stack[0] += win; sfx('seed'); await T.say(`${nm(a)} beats ${nm(o)}. You win ¥${win}!`); }
        else if (a < o) { S.stack[1] += win; sfx('hit'); await T.say(`${opp.name}'s ${nm(o)} beats your ${nm(a)}. ¥${win} gone.`); }
        else { S.stack[0] += win / 2; S.stack[1] += win / 2; await T.say('Split pot.'); }
      }
      if (S.stack[0] > 0 && S.stack[1] > 0 && S.hand < 10) {
        T.msg = '';
        const c = await T.ask([{ t: 'DEAL NEXT HAND', v: 'go' }, { t: 'CASH OUT ' + yen(S.stack[0]), v: 'out' }]);
        if (c.v === 'out') break;
      }
    }
    const net = S.stack[0] - opp.buy;
    await T.say(S.stack[1] === 0 ? `${opp.name} is felted. "${opp.bust}"` : S.stack[0] === 0 ? `You're out of chips. "${opp.win}"` : `You cash out ${net >= 0 ? 'up' : 'down'} ¥${Math.abs(net)}.`);
    return { stack: S.stack[0], net, bust: S.stack[1] === 0 };
  });
}

/* =========================================================
   MAU-MAU (32-card German deck)
   ========================================================= */
class MauW extends GameW {
  constructor(opp) { super(); this.opp = opp; this.S = null; }
  onSel(s) {
    const n = this.S.hands[0].length;
    if (rep('left')) { s.i = (s.i + n - 1) % n; sfx('sel'); }
    if (rep('right')) { s.i = (s.i + 1) % n; sfx('sel'); }
    if (pressed.a) { if (mauOK(this.S, this.S.hands[0][s.i])) { sfx('ok'); this.done(s.i); } else sfx('bump'); }
    else if (pressed.b) { sfx('door'); this.done(-1); }
  }
  draw() {
    const S = this.S;
    rect(0, 0, W, H, 1);
    blit(SPR[this.opp.ch].down0, 3, 3); text(this.opp.name, 22, 3, 3); text(S.hands[1].length + ' cards', 22, 13, 3);
    const on = S.hands[1].length, osp = Math.min(10, 70 / Math.max(1, on));
    S.hands[1].forEach((c, i) => drawCard(c, 84 + Math.round(i * osp), 3, S.peek));
    drawCard(0, 46, 36, false); text('' + S.deck.length, 49, 60, 3);
    drawCard(S.top, 78, 36, true);
    text('SUIT', 100, 38, 3); rect(104, 47, 11, 11, 0); frame(104, 47, 11, 11, 3); text(SU[S.suit], 107, 49, 3);
    const h = S.hands[0], n = h.length, sp = Math.min(17, 138 / Math.max(1, n)), x0 = Math.round((W - (sp * (n - 1) + 15)) / 2);
    h.forEach((c, i) => { if (!(this.sel && this.sel.i === i)) drawCard(c, x0 + Math.round(i * sp), 78, true); });
    if (this.sel && h[this.sel.i] !== undefined) { const i = this.sel.i; drawCard(h[i], x0 + Math.round(i * sp), 78, true, true); if (!mauOK(S, h[i])) text('×', x0 + Math.round(i * sp) + 5, 66, 3); }
    this.bottom();
  }
}
FONT['×'] = '...../#...#/.#.#./..#../.#.#./#...#/.....'.split('/');
function mauOK(S, c) { return (c >> 2) === 9 || (c & 3) === S.suit || (c >> 2) === (S.top >> 2); }
async function mauMau(opp) {
  return withGame(new MauW(opp), async T => {
    const deck = []; for (let r = 5; r <= 12; r++) for (let s = 0; s < 4; s++) deck.push(r << 2 | s);
    shuffle(deck);
    const mp = lvl('manip');
    const S = T.S = { deck, hands: [[], []], pile: [], top: 0, suit: 0, peek: mp >= 4 };
    const draw1 = p => { if (!S.deck.length) { S.deck = shuffle(S.pile.splice(0)); } if (S.deck.length) S.hands[p].push(S.deck.pop()); };
    for (let i = 0; i < 5; i++) { draw1(0); draw1(1); }
    if (mp >= 3) draw1(1);
    S.top = S.deck.pop(); S.suit = S.top & 3;
    const sortH = () => S.hands[0].sort((a, b) => (a & 3) - (b & 3) || a - b);
    sortH();
    T.msg = 'A: play  B: draw a card';
    await T.say(mp >= 4 ? 'MANIP Lv4: you read his whole hand.' : mp >= 3 ? `MANIP Lv3: you talk ${opp.name} into an extra card.` : 'First to empty their hand wins.');
    let turn = 0;
    for (;;) {
      const me = turn === 0, h = S.hands[turn];
      let idx;
      if (me) { T.msg = 'A: play  B: draw a card'; idx = await T.pick(h.length, {}); }
      else {
        await T.say(`${opp.name} thinks...`, 35);
        const ok = h.map((c, i) => i).filter(i => mauOK(S, h[i]));
        const pr = c => ((c >> 2) === 5 ? 3 : (c >> 2) === 6 ? 2 : (c >> 2) === 9 ? 0 : 1);
        idx = ok.length ? ok.sort((a, b) => pr(h[b]) - pr(h[a]))[0] : -1;
      }
      let skip = false;
      if (idx < 0) { draw1(turn); if (me) sortH(); sfx('sel'); await T.say(me ? 'You draw a card.' : `${opp.name} draws a card.`, 45); }
      else {
        const c = h.splice(idx, 1)[0]; S.pile.push(S.top); S.top = c; S.suit = c & 3; sfx('door');
        const r = c >> 2, who = me ? 'You play' : `${opp.name} plays`;
        if (h.length === 1) await T.say(me ? 'Izaya: "Mau."' : `${opp.name}: "Mau!"`, 50);
        if (h.length === 0) { await T.say(me ? 'Izaya: "Mau-Mau! Too easy, Kida-kun."' : `${opp.name}: "MAU-MAU!"`); return me; }
        if (r === 5) { draw1(1 - turn); draw1(1 - turn); if (!me) sortH(); skip = true; await T.say(`${who} a 7. ${me ? opp.name + ' draws' : 'You draw'} two and skip${me ? 's' : ''}.`, 80); }
        else if (r === 6) { skip = true; await T.say(`${who} an 8. ${me ? opp.name + ' is' : 'You are'} skipped.`, 70); }
        else if (r === 9) {
          if (me) { T.msg = ''; const a = await T.ask(SU.map((s, k) => ({ t: s + ' ' + ['Spades', 'Hearts', 'Diamonds', 'Clubs'][k], v: k }))); S.suit = a.v; }
          else { const cnt = [0, 0, 0, 0]; h.forEach(x => cnt[x & 3]++); S.suit = cnt.indexOf(Math.max(...cnt)); }
          await T.say(`${who} a Jack. Wild! Suit is now ${SU[S.suit]}.`, 70);
        }
      }
      if (!skip) turn = 1 - turn;
    }
  });
}

/* =========================================================
   KNIFFEL (three rounds, best combination)
   ========================================================= */
function kScore(d) {
  const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach(v => c[v]++);
  const m = Math.max(...c), pairs = c.filter(x => x >= 2).length, u = c.map((x, i) => (x && i ? 1 : 0)).join('');
  if (m === 5) return [50, 'KNIFFEL!'];
  if (u.includes('11111')) return [40, 'GROSSE STRASSE'];
  if (m === 4) return [35, 'VIERERPASCH'];
  if (u.includes('1111')) return [30, 'KLEINE STRASSE'];
  if (m === 3 && pairs === 2) return [25, 'FULL HOUSE'];
  if (m === 3) return [18, 'DREIERPASCH'];
  if (pairs === 2) return [12, 'ZWEI PAARE'];
  if (m === 2) return [6, 'EIN PAAR'];
  return [0, 'NIX'];
}
class KniffelW extends GameW {
  constructor(opp) { super(); this.opp = opp; this.S = null; }
  onSel(s) {
    if (rep('left')) { s.i = (s.i + 6) % 7; sfx('sel'); }
    if (rep('right')) { s.i = (s.i + 1) % 7; sfx('sel'); }
    if (rep('down') && s.i < 5) { s.i = 5; sfx('sel'); }
    if (rep('up') && s.i >= 5) { s.i = 2; sfx('sel'); }
    if (pressed.a) {
      if (s.i < 5) { this.S.hold[s.i] = !this.S.hold[s.i]; sfx('sel'); }
      else if (s.i === 5 && this.S.rolls <= 0) sfx('bump');
      else { sfx('ok'); this.done(s.i); }
    }
  }
  draw() {
    const S = this.S;
    rect(0, 0, W, H, 1);
    blit(SPR[this.opp.ch].down0, 3, 3); text(this.opp.name + ' ' + S.total[1], 22, 7, 3);
    text('IZAYA ' + S.total[0], 96, 7, 3);
    text(`ROUND ${S.round}/3`, 4, 24, 3); text(S.who === 0 ? 'YOUR DICE' : 'THEIR DICE', 94, 24, 3);
    S.dice.forEach((v, i) => {
      const x = 9 + i * 29, y = 40 - (S.hold[i] ? 5 : 0) + (S.shake ? rnd(3) - 1 : 0);
      rect(x, y, 22, 22, 3); rect(x + 1, y + 1, 20, 20, S.hold[i] ? 2 : 0);
      const P = { 1: [[1, 1]], 2: [[0, 0], [2, 2]], 3: [[0, 0], [1, 1], [2, 2]], 4: [[0, 0], [2, 0], [0, 2], [2, 2]], 5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]], 6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]] }[S.shake ? 1 + rnd(6) : v];
      P.forEach(([a, b]) => rect(x + 4 + a * 6, y + 4 + b * 6, 3, 3, S.hold[i] ? 0 : 3));
      if (S.hold[i]) text('HOLD', x - 1, 66, 3);
      if (this.sel && this.sel.i === i) { text('▼', x + 8, y - 9, 3); }
    });
    const sc = kScore(S.dice); text(S.shake ? '' : `${sc[1]} ${sc[0]}`, 8, 78, 3);
    if (this.sel) {
      const b = (k, x, t) => { rect(x, 88, 66, 13, this.sel.i === k ? 3 : 0); frame(x, 88, 66, 13, 3); text(t, x + 5, 91, this.sel.i === k ? 0 : 3); };
      b(5, 8, `ROLL (${S.rolls})`); b(6, 84, 'KEEP');
    }
    this.bottom();
  }
}
async function kniffel(opp) {
  return withGame(new KniffelW(opp), async T => {
    const S = T.S = { dice: [1, 2, 3, 4, 5], hold: [0, 0, 0, 0, 0], total: [0, 0], round: 1, who: 0, rolls: 0, shake: 0 };
    let bonus = lvl('foresight') >= 3 ? 1 : 0;
    const roll = async () => { S.shake = 1; sfx('jump'); await T.say(T.msg, 22); S.shake = 0; S.dice = S.dice.map((v, i) => (S.hold[i] ? v : 1 + rnd(6))); sfx('sel'); };
    await T.say('KNIFFEL: 3 rounds. Roll, HOLD the dice you like, roll again (2 rerolls). Best combination scores.' + (bonus ? ' FORESIGHT Lv3: one bonus reroll.' : ''));
    for (S.round = 1; S.round <= 3; S.round++) {
      S.who = 0; S.hold = [0, 0, 0, 0, 0]; S.rolls = 2 + bonus; bonus = 0;
      T.msg = 'Rolling...'; await roll();
      for (;;) {
        T.msg = 'A on a die: hold it. Then ROLL or KEEP.';
        const a = await T.pick(7, { i: 5 });
        if (a === 6) break;
        S.rolls--; T.msg = 'Rolling...'; await roll();
        if (S.rolls <= 0) { await T.say('No rerolls left.', 40); break; }
      }
      let sc = kScore(S.dice); S.total[0] += sc[0]; if (sc[0] >= 30) sfx('seed');
      await T.say(`${sc[1]}! +${sc[0]} points.`);
      S.who = 1; S.hold = [0, 0, 0, 0, 0]; S.rolls = 2;
      T.msg = `${opp.name} rolls...`; await roll();
      for (let k = 0; k < 2; k++) {
        if (kScore(S.dice)[0] >= 35) break;
        const c = [0, 0, 0, 0, 0, 0, 0]; S.dice.forEach(v => c[v]++);
        const uniq = [...new Set(S.dice)].sort();
        let run = [], best = [];
        uniq.forEach((v, i) => { run = i && v === uniq[i - 1] + 1 ? run.concat(v) : [v]; if (run.length > best.length) best = run; });
        if (best.length >= 4 && Math.max(...c) < 3) { const seen = new Set(); S.hold = S.dice.map(v => (best.includes(v) && !seen.has(v) ? (seen.add(v), 1) : 0)); }
        else { const m = Math.max(...c), keep = c.lastIndexOf(m); S.hold = S.dice.map(v => (v === keep ? 1 : 0)); }
        await T.say(`${opp.name} holds ${S.hold.filter(Boolean).length}...`, 45);
        S.rolls--; await roll();
      }
      sc = kScore(S.dice); S.total[1] += sc[0];
      await T.say(`${opp.name}: ${sc[1]}, +${sc[0]}.`);
    }
    const win = S.total[0] > S.total[1];
    await T.say(S.total[0] === S.total[1] ? `Tie, ${S.total[0]} all. House rules: ties go to the house.` : `${S.total[0]} to ${S.total[1]}. ${win ? 'You win!' : opp.name + ' wins.'}`);
    return win;
  });
}

/* =========================================================
   REVERSI 6x6 — Izaya's board
   ========================================================= */
const RV_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function rvFlips(b, i, p) {
  if (b[i]) return [];
  const x = i % 6, y = (i / 6) | 0, out = [];
  for (const [dx, dy] of RV_DIRS) {
    const line = []; let cx = x + dx, cy = y + dy;
    while (cx >= 0 && cy >= 0 && cx < 6 && cy < 6 && b[cy * 6 + cx] === 3 - p) { line.push(cy * 6 + cx); cx += dx; cy += dy; }
    if (line.length && cx >= 0 && cy >= 0 && cx < 6 && cy < 6 && b[cy * 6 + cx] === p) out.push(...line);
  }
  return out;
}
function rvMoves(b, p) { const m = []; for (let i = 0; i < 36; i++) { const f = rvFlips(b, i, p); if (f.length) m.push({ i, f }); } return m; }
const RV_W = [9, -3, 2, 2, -3, 9, -3, -5, 0, 0, -5, -3, 2, 0, 1, 1, 0, 2, 2, 0, 1, 1, 0, 2, -3, -5, 0, 0, -5, -3, 9, -3, 2, 2, -3, 9];
class ReversiW extends GameW {
  constructor(opp) { super(); this.opp = opp; this.S = null; }
  onSel(s) {
    let x = s.i % 6, y = (s.i / 6) | 0;
    if (rep('left')) { x = (x + 5) % 6; sfx('sel'); } if (rep('right')) { x = (x + 1) % 6; sfx('sel'); }
    if (rep('up')) { y = (y + 5) % 6; sfx('sel'); } if (rep('down')) { y = (y + 1) % 6; sfx('sel'); }
    s.i = y * 6 + x;
    if (pressed.a) { if (rvFlips(this.S.b, s.i, 1).length) { sfx('ok'); this.done(s.i); } else sfx('bump'); }
  }
  draw() {
    const S = this.S, fs = lvl('foresight');
    rect(0, 0, W, H, 1); rect(3, 3, 98, 98, 3); rect(5, 5, 94, 94, 2);
    for (let i = 0; i < 36; i++) {
      const x = 6 + (i % 6) * 15.5 | 0, y = 6 + ((i / 6) | 0) * 15.5 | 0;
      rect(x, y, 14, 14, 1);
      const v = S.b[i];
      if (v) {
        const c = v === 1 ? 3 : 0, fl = S.flash.includes(i) && (G.frame >> 2) % 2;
        rect(x + 3, y + 1, 8, 12, 3); rect(x + 1, y + 3, 12, 8, 3);
        rect(x + 4, y + 2, 6, 10, fl ? 2 : c); rect(x + 2, y + 4, 10, 6, fl ? 2 : c);
      } else if (this.sel && fs >= 2) {
        const f = rvFlips(S.b, i, 1).length;
        if (f) { if (fs >= 4) text('' + f, x + 4, y + 3, 3); else rect(x + 6, y + 6, 2, 2, 3); }
      }
      if (this.sel && this.sel.i === i && (G.frame >> 3) % 2) frame(x - 1, y - 1, 16, 16, 0);
    }
    const n1 = S.b.filter(v => v === 1).length, n2 = S.b.filter(v => v === 2).length;
    blit(SPR[this.opp.ch].down0, 106, 6); text(this.opp.name.slice(0, 5), 124, 6, 3); text('○ ' + n2, 124, 16, 3);
    blit(SPR.izaya.down0, 106, 58); text('IZAYA', 124, 58, 3); text('● ' + n1, 124, 68, 3);
    text(S.turn === 1 ? 'YOUR' : 'THEIR', 110, 84, 3); text('MOVE', 110, 93, 3);
    this.bottom();
  }
}
FONT['●'] = '...../.###./#####/#####/#####/.###./.....'.split('/');
FONT['○'] = '...../.###./#...#/#...#/#...#/.###./.....'.split('/');
async function reversi(opp) {
  return withGame(new ReversiW(opp), async T => {
    const b = new Array(36).fill(0); b[14] = 2; b[15] = 1; b[20] = 1; b[21] = 2;
    const S = T.S = { b, turn: 1, flash: [] };
    const fs = lvl('foresight');
    await T.say('REVERSI: trap their discs between yours to flip them. Most discs wins. Corners are power.' + (fs >= 4 ? ' FORESIGHT Lv4 shows flip counts.' : fs >= 2 ? ' FORESIGHT marks legal moves.' : ''));
    let passes = 0, cur = 14;
    while (passes < 2) {
      const mv = rvMoves(b, S.turn);
      if (!mv.length) { passes++; if (rvMoves(b, 3 - S.turn).length) await T.say(S.turn === 1 ? 'No legal move. You pass.' : `${opp.name} has no move and passes.`, 70); S.turn = 3 - S.turn; continue; }
      passes = 0;
      let m;
      if (S.turn === 1) { T.msg = 'Place a dark disc. A: confirm.'; const i = await T.pick(36, { i: cur }); cur = i; m = mv.find(x => x.i === i); }
      else {
        await T.say(`${opp.name} studies the board...`, 40);
        m = Math.random() < opp.err ? mv[rnd(mv.length)] : mv.slice().sort((a, c) => (c.f.length + RV_W[c.i]) - (a.f.length + RV_W[a.i]))[0];
      }
      b[m.i] = S.turn; m.f.forEach(i => { b[i] = S.turn; });
      S.flash = m.f.concat(m.i); sfx('door'); await T.say(S.turn === 1 ? `You flip ${m.f.length}.` : `${opp.name} flips ${m.f.length}.`, 40); S.flash = [];
      S.turn = 3 - S.turn;
    }
    const n1 = b.filter(v => v === 1).length, n2 = b.filter(v => v === 2).length;
    await T.say(`Final count: ${n1} to ${n2}. ${n1 > n2 ? 'The board is yours.' : n1 === n2 ? 'A draw. He held his ground.' : opp.name + ' wins the board.'}`);
    return n1 > n2;
  });
}

/* =========================================================
   SUPERHIRN — read what someone really feels
   ========================================================= */
const SH_SYM = ['♥', '★', '♪', '◷'];
class SuperW extends GameW {
  constructor(opp) { super(); this.opp = opp; this.S = null; }
  onSel(s) {
    const g = this.S.cur;
    if (rep('left')) { s.i = (s.i + 3) % 4; sfx('sel'); } if (rep('right')) { s.i = (s.i + 1) % 4; sfx('sel'); }
    if (rep('up')) { g[s.i] = (g[s.i] + 1) % 4; sfx('sel'); } if (rep('down')) { g[s.i] = (g[s.i] + 3) % 4; sfx('sel'); }
    if (pressed.a) { sfx('ok'); this.done(0); }
  }
  draw() {
    const S = this.S;
    rect(0, 0, W, H, 0); rect(0, 0, 100, 104, 1);
    S.rows.forEach((r, k) => {
      const y = 4 + k * 10;
      text((k + 1) + '', 3, y, 2);
      r.g.forEach((v, i) => text(SH_SYM[v], 14 + i * 11, y, 3));
      for (let i = 0; i < 4; i++) { const x = 62 + i * 8; if (i < r.b) rect(x, y + 1, 5, 5, 3); else if (i < r.b + r.w) frame(x, y + 1, 5, 5, 3); else pset(x + 2, y + 3, 2); }
    });
    if (this.sel) {
      const y = 4 + S.rows.length * 10;
      rect(11, y - 1, 46, 10, 0);
      S.cur.forEach((v, i) => { text(SH_SYM[v], 14 + i * 11, y, 3); if (i === this.sel.i && (G.frame >> 3) % 2) frame(12 + i * 11, y - 2, 10, 11, 3); });
    }
    blit(SPR[this.opp.ch].down0, 122, 6, { scale: 1 }); text(this.opp.name, 108, 26, 3);
    text(`TRY ${Math.min(S.rows.length + 1, S.max)}/${S.max}`, 104, 40, 3);
    rect(104, 56, 5, 5, 3); text('right', 112, 55, 3); text('spot', 112, 64, 3);
    frame(104, 78, 5, 5, 3); text('wrong', 112, 77, 3); text('spot', 112, 86, 3);
    this.bottom();
  }
}
async function superhirn(opp) {
  return withGame(new SuperW(opp), async T => {
    const code = [rnd(4), rnd(4), rnd(4), rnd(4)];
    const S = T.S = { rows: [], cur: [0, 1, 2, 3], max: Math.min(9, 6 + lvl('intel')) };
    await T.say(`SUPERHIRN: ${opp.name} hides four feelings in order. ♥ love  ★ hope  ♪ voice  ◷ time.`);
    await T.say(`Black peg: right feeling, right spot. Hollow peg: right feeling, wrong spot. ${S.max} tries (INTEL adds more).`);
    while (S.rows.length < S.max) {
      T.msg = '◀▶ pick a slot. ▲▼ change it. A: say it.';
      await T.pick(4, {});
      const g = S.cur.slice(); let b = 0, w = 0; const cc = [0, 0, 0, 0], gc = [0, 0, 0, 0];
      g.forEach((v, i) => { if (v === code[i]) b++; else { cc[code[i]]++; gc[v]++; } });
      for (let k = 0; k < 4; k++) w += Math.min(cc[k], gc[k]);
      S.rows.push({ g, b, w });
      if (b === 4) { sfx('seed'); await T.say(opp.solved || 'You read them perfectly.'); return true; }
      sfx(b >= 2 ? 'ok' : 'bump');
      await T.say((opp.lines || ['...'])[rnd((opp.lines || ['...']).length)], 0);
    }
    await T.say(`Out of tries. The answer was ${code.map(v => SH_SYM[v]).join(' ')}.`);
    return false;
  });
}

/* =========================================================
   DUEL DISPATCHER (replaces the old battle screen)
   ========================================================= */
const GAME_NAMES = { maumau: 'MAU-MAU', reversi: 'REVERSI', superhirn: 'SUPERHIRN', kniffel: 'KNIFFEL', poker: "HOLD'EM", run: 'RUN!' };
const GAME_TIPS = {
  maumau: 'Match suit or rank. 7: they draw two. 8: skip. Jack: wild. MANIP helps.',
  reversi: 'Take corners. Avoid the squares next to them. FORESIGHT helps.',
  superhirn: 'Deduce four hidden feelings. INTEL gives extra tries.',
  kniffel: 'Hold pairs and runs. FORESIGHT Lv3 gives a bonus reroll.',
  poker: 'MANIP spots bluffs. FORESIGHT Lv2 shows your odds.',
  run: 'Words do nothing. PARKOUR does.',
};
const GAME_FN = { maumau: mauMau, reversi, superhirn, kniffel };
async function battle(def) {
  const pmus = AU.track;
  sfx('alarm');
  for (let k = 0; k < 3; k++) { G.fade = -3; await frames(4); G.fade = 0; await frames(4); }
  await N(def.intro);
  if (def.game === 'run') { await N(def.forceText); return 'flee'; }
  music('battle');
  const win = await GAME_FN[def.game](def);
  music(pmus);
  if (win) { G.wins++; sfx('lvl'); await N(def.winText || `${def.name} is beaten.`); }
  else await N(def.loseText || 'IZAYA lost... and laughed it off.');
  return win ? 'win' : 'lose';
}

/* ---------------- venues ---------------- */
const POKER_OPP = {
  cash: { name: 'SHIKI', ch: 'suit', buy: 5000, aggr: 0.6, bluff: 0.12, loose: 0.3, tell: 'taps his cigarette twice.', hello: 'Informant. Sit. Cash only.', bust: 'Hm. Take it. Carefully.', win: 'The house thanks you.' },
  info: { name: 'AKABAYASHI', ch: 'oldman', buy: 3000, aggr: 0.5, bluff: 0.32, loose: 0.6, tell: 'spins his cane.', hello: "Ohh, Orihara! Beat me and I'll tell you a story.", bust: 'Ha! Fine, fine. Lean in.', win: 'No story today, young man.' },
};
async function pokerRoom() {
  await N('Behind the karaoke bar: a windowless room, green felt, one dealer. The Awakusu-kai run a heads-up table here.');
  const ch = G.chapter;
  const r = await ask("Heads-up Hold'em. Each match takes ◷1.", [
    { t: 'Shiki: cash ¥5k', v: 'cash', dis: G.flags['pk_cash' + ch] || G.yen < 5000 || G.time < 1, disWhy: G.flags['pk_cash' + ch] ? '§ Shiki has left for the day.' : G.yen < 5000 ? '§ Buy-in is ¥5,000.' : '§ No time left (◷0).', d: 'Win yen. Keep whatever you cash out.' },
    { t: 'Akabayashi: info ¥3k', v: 'info', dis: G.flags['pk_info' + ch] || G.yen < 3000 || G.time < 1, disWhy: G.flags['pk_info' + ch] ? '§ He has told his story.' : G.yen < 3000 ? '§ Buy-in is ¥3,000.' : '§ No time left (◷0).', d: 'Finish ahead and he pays in secrets.' },
    { t: 'Leave', v: 'x' },
  ]);
  if (!r || r === 'x') return;
  if (!(await spend())) return;
  const opp = POKER_OPP[r];
  G.flags['pk_' + r + ch] = true; G.yen -= opp.buy;
  const pm = AU.track; music('battle');
  const res = await pokerMatch(opp);
  music(pm); G.yen += res.stack;
  if (res.net > 0) { G.wins++; await gainXP('manip', res.bust ? 2 : 1); }
  if (r === 'cash') await N(res.net >= 0 ? `You leave ¥${res.net.toLocaleString('en-US')} richer. Shiki's eyes follow you out.` : `You leave ¥${Math.abs(res.net).toLocaleString('en-US')} lighter. Tuition.`);
  else if (res.net > 0) {
    await say('AKABAYASHI', 'A promise is a promise. Yagiri Pharmaceutical hired outside muscle. They are hunting a girl with a scar around her neck. They will be in any big crowd this Sunday.');
    await gainXP('intel', 3);
    if (!G.seeds.yagiri) await plant('yagiri');
    else { G.flags.sec_awakusu = true; await N("You already knew that. But how the Awakusu know it... that's a secret worth selling. (MARKET)"); }
  } else await say('AKABAYASHI', 'Better luck next time. Stories are expensive.');
}
async function kniffelTable() {
  const ch = G.chapter;
  await say('DENNIS', G.flags['kn' + ch] ? "No more dice today. I have fish to cut." : 'Simon says you are from a family of gamblers. Kniffel? ¥2,000 a game. A German tourist taught me.');
  if (G.flags['kn' + ch]) return;
  const r = await ask('Play Kniffel for ¥2,000?', [{ t: 'Roll the dice', v: 1, dis: G.yen < 2000, disWhy: '§ You need ¥2,000.' }, { t: 'Not now', v: 0 }]);
  if (!r) return;
  G.flags['kn' + ch] = true; G.yen -= 2000;
  const pm = AU.track; music('battle');
  const win = await kniffel({ name: 'DENNIS', ch: 'dennis' });
  music(pm);
  if (win) { G.yen += 4000; G.wins++; rel('simon', 5); await say('DENNIS', 'Tch. ¥4,000. Take it. Simon will hear about this.'); await gainXP('foresight', 1); }
  else await say('DENNIS', 'The house always wins. Have some miso.');
}
