'use strict';
/* =========================================================
   IKEBUKURO GAMBIT — core engine
   160x144 indexed framebuffer, 4 shades, GB-style.
   ========================================================= */
const W = 160, H = 144, TS = 16;

const PALETTES = [
  { name: 'CLASSIC', c: ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'] },
  { name: 'POCKET',  c: ['#c4cfa1', '#8b956d', '#4d533c', '#1f1f1f'] },
  { name: 'FLEA',    c: ['#fbe9e2', '#e06b5e', '#7d1e2c', '#1a0509'] },
  { name: 'NEON',    c: ['#efe3ff', '#b48ad6', '#5a2d7a', '#170a22'] },
  { name: 'RIDER',   c: ['#e3f4f6', '#7cc4d4', '#2d5a6a', '#08161c'] },
];
const RGB = PALETTES.map(p => p.c.map(h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16))));

/* ---------------- FONT (5x7, some 8-row descenders) ---------------- */
const FONT_SRC = {
  A: '.###./#...#/#...#/#####/#...#/#...#/#...#', B: '####./#...#/#...#/####./#...#/#...#/####.',
  C: '.###./#...#/#..../#..../#..../#...#/.###.', D: '####./#...#/#...#/#...#/#...#/#...#/####.',
  E: '#####/#..../#..../####./#..../#..../#####', F: '#####/#..../#..../####./#..../#..../#....',
  G: '.###./#...#/#..../#.###/#...#/#...#/.####', H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
  I: '.###./..#../..#../..#../..#../..#../.###.', J: '..###/...#./...#./...#./...#./#..#./.##..',
  K: '#...#/#..#./#.#../##.../#.#../#..#./#...#', L: '#..../#..../#..../#..../#..../#..../#####',
  M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#', N: '#...#/#...#/##..#/#.#.#/#..##/#...#/#...#',
  O: '.###./#...#/#...#/#...#/#...#/#...#/.###.', P: '####./#...#/#...#/####./#..../#..../#....',
  Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#', R: '####./#...#/#...#/####./#.#../#..#./#...#',
  S: '.####/#..../#..../.###./....#/....#/####.', T: '#####/..#../..#../..#../..#../..#../..#..',
  U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.', V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
  W: '#...#/#...#/#...#/#.#.#/#.#.#/#.#.#/.#.#.', X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
  Y: '#...#/#...#/.#.#./..#../..#../..#../..#..', Z: '#####/....#/...#./..#../.#.../#..../#####',
  a: '...../...../.###./....#/.####/#...#/.####', b: '#..../#..../#.##./##..#/#...#/#...#/####.',
  c: '...../...../.###./#..../#..../#...#/.###.', d: '....#/....#/.##.#/#..##/#...#/#...#/.####',
  e: '...../...../.###./#...#/#####/#..../.###.', f: '..##./.#..#/.#.../###../.#.../.#.../.#...',
  g: '...../...../.####/#...#/#...#/.####/....#/.###.', h: '#..../#..../#.##./##..#/#...#/#...#/#...#',
  i: '..#../...../.##../..#../..#../..#../.###.', j: '...#./...../..##./...#./...#./...#./#..#./.##..',
  k: '#..../#..../#..#./#.#../##.../#.#../#..#.', l: '.##../..#../..#../..#../..#../..#../.###.',
  m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#', n: '...../...../#.##./##..#/#...#/#...#/#...#',
  o: '...../...../.###./#...#/#...#/#...#/.###.', p: '...../...../####./#...#/#...#/####./#..../#....',
  q: '...../...../.####/#...#/#...#/.####/....#/....#', r: '...../...../#.##./##..#/#..../#..../#....',
  s: '...../...../.####/#..../.###./....#/####.', t: '.#.../.#.../###../.#.../.#.../.#..#/..##.',
  u: '...../...../#...#/#...#/#...#/#..##/.##.#', v: '...../...../#...#/#...#/#...#/.#.#./..#..',
  w: '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.', x: '...../...../#...#/.#.#./..#../.#.#./#...#',
  y: '...../...../#...#/#...#/#...#/.####/....#/.###.', z: '...../...../#####/...#./..#../.#.../#####',
  '0': '.###./#...#/#..##/#.#.#/##..#/#...#/.###.', '1': '..#../.##../..#../..#../..#../..#../.###.',
  '2': '.###./#...#/....#/...#./..#../.#.../#####', '3': '#####/...#./..#../...#./....#/#...#/.###.',
  '4': '...#./..##./.#.#./#..#./#####/...#./...#.', '5': '#####/#..../####./....#/....#/#...#/.###.',
  '6': '..##./.#.../#..../####./#...#/#...#/.###.', '7': '#####/....#/...#./..#../.#.../.#.../.#...',
  '8': '.###./#...#/#...#/.###./#...#/#...#/.###.', '9': '.###./#...#/#...#/.####/....#/...#./.##..',
  '.': '...../...../...../...../...../.##../.##..', ',': '...../...../...../...../.##../..#../.#...',
  '!': '..#../..#../..#../..#../..#../...../..#..', '?': '.###./#...#/....#/...#./..#../...../..#..',
  "'": '..#../..#../.#.../...../...../...../.....', '"': '.#.#./.#.#./...../...../...../...../.....',
  '-': '...../...../...../.###./...../...../.....', ':': '...../.##../.##../...../.##../.##../.....',
  ';': '...../.##../.##../...../.##../..#../.#...', '(': '...#./..#../.#.../.#.../.#.../..#../...#.',
  ')': '.#.../..#../...#./...#./...#./..#../.#...', '/': '...../....#/...#./..#../.#.../#..../.....',
  '+': '...../..#../..#../#####/..#../..#../.....', '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
  '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#', '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
  '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.', '@': '.###./#...#/#.###/#.#.#/#.###/#..../.###.',
  '=': '...../...../#####/...../#####/...../.....', '<': '...#./..#../.#.../#..../.#.../..#../...#.',
  '>': '.#.../..#../...#./....#/...#./..#../.#...', '_': '...../...../...../...../...../...../#####',
  '[': '.###./.#.../.#.../.#.../.#.../.#.../.###.', ']': '.###./...#./...#./...#./...#./...#./.###.',
  '~': '...../...../.#..#/#.##./...../...../.....', '♥': '...../.#.#./#####/#####/.###./..#../.....',
  '▼': '...../...../#####/.###./..#../...../.....', '▶': '.#.../.##../.###./.####/.###./.##../.#...',
  '§': '.###./#...#/#...#/#####/##.##/##.##/#####', '✦': '...../..#../.###./#####/.###./..#../.....',
  '★': '..#../..#../#####/.###./.#.#./#...#/.....', '◷': '.###./#.#.#/#.#.#/#.##./#...#/.###./.....',
  '…': '...../...../...../...../...../#.#.#/.....', '—': '...../...../...../#####/...../...../.....',
  '♪': '..##./..#.#/..#../..#../.##../###../.#...', '·': '...../...../...../..#../...../...../.....',
  '¥': '#...#/.#.#./..#../#####/..#../#####/..#..', '→': '...../..#../...#./#####/...#./..#../.....',
};
const FONT = {};
for (const k in FONT_SRC) FONT[k] = FONT_SRC[k].split('/');

/* ---------------- FRAMEBUFFER ---------------- */
const fb = new Uint8Array(W * H);
let cv, ctx, imgData;
function pset(x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) fb[y * W + x] = c; }
function rect(x, y, w, h, c) {
  x |= 0; y |= 0;
  const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let j = y0; j < y1; j++) { const o = j * W; for (let i = x0; i < x1; i++) fb[o + i] = c; }
}
function frame(x, y, w, h, c) { rect(x, y, w, 1, c); rect(x, y + h - 1, w, 1, c); rect(x, y, 1, h, c); rect(x + w - 1, y, 1, h, c); }
function box(x, y, w, h) { rect(x, y, w, h, 0); frame(x, y, w, h, 3); frame(x + 1, y + 1, w - 2, h - 2, 1); frame(x + 2, y + 2, w - 4, h - 4, 3); }
function blit(s, x, y, o) {
  o = o || {};
  const sc = o.scale || 1, fl = o.flip, sh = o.shift || 0;
  x |= 0; y |= 0;
  for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
    let c = s.d[j * s.w + (fl ? s.w - 1 - i : i)];
    if (c === 255) continue;
    if (sh) c = Math.min(3, c + sh);
    if (o.color !== undefined) c = o.color;
    if (sc === 1) pset(x + i, y + j, c); else rect(x + i * sc, y + j * sc, sc, sc, c);
  }
}
function text(s, x, y, c, sc) {
  c = c === undefined ? 3 : c; sc = sc || 1;
  let cx = x;
  for (const ch of String(s)) {
    if (ch !== ' ') {
      const g = FONT[ch] || FONT['?'];
      for (let j = 0; j < g.length; j++) {
        const r = g[j];
        for (let i = 0; i < 5; i++) if (r[i] === '#') { if (sc === 1) pset(cx + i, y + j, c); else rect(cx + i * sc, y + j * sc, sc, sc, c); }
      }
    }
    cx += 6 * sc;
  }
  return cx - x;
}
function textC(s, y, c, sc) { sc = sc || 1; text(s, ((W - [...String(s)].length * 6 * sc) / 2) | 0, y, c, sc); }
function wrap(s, n) {
  const out = [];
  for (const para of String(s).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      if (!line) line = w;
      else if ([...(line + ' ' + w)].length <= n) line += ' ' + w;
      else { out.push(line); line = w; }
      while ([...line].length > n) { const a = [...line]; out.push(a.slice(0, n).join('')); line = a.slice(n).join(''); }
    }
    out.push(line);
  }
  return out;
}
function bar(x, y, w, frac) {
  frame(x, y, w, 5, 3); rect(x + 1, y + 1, w - 2, 3, 0);
  const f = Math.max(0, Math.min(1, frac));
  rect(x + 1, y + 1, Math.round((w - 2) * f), 3, f < 0.25 ? 1 : 2);
  if (f < 0.25) rect(x + 1, y + 2, Math.round((w - 2) * f), 1, 3);
}

/* ---------------- SPRITES ---------------- */
const LEGS_D1 = ['....OPPPPPPO....', '....OPPOOFFO....', '....OFFO.OO.....'];
const LEGS_S1 = ['....OPPPPPPO....', '...OPPO.OPPO....', '...OFFO..OFFO...'];
const TPL = {};
TPL.down0 = [
  '......OOOO......', '....OOHHHHOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..', '..OHHSSSSSSHHO..', '..OHSESSSSESHO..', '...OSSSSSSSSO...',
  '....OOSSSSOO....', '...OTCCIICCTO...', '..OSCCCIICCCSO..', '..OSOCCIICCOSO..',
  '...OOCCCCCCOO...', '....OPPPPPPO....', '....OPPOOPPO....', '....OFFOOFFO....'];
TPL.down1 = TPL.down0.slice(0, 13).concat(LEGS_D1);
TPL.up0 = [
  '......OOOO......', '....OOHHHHOO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..', '..OHHHHHHHHHHO..', '..OHHHHHHHHHHO..', '...OHHHHHHHHO...',
  '....OOOOOOOO....', '...OTCCCCCCTO...', '..OSCCCCCCCCSO..', '..OSOCCCCCCOSO..',
  '...OOCCCCCCOO...'].concat(TPL.down0.slice(13));
TPL.up1 = TPL.up0.slice(0, 13).concat(LEGS_D1);
TPL.side0 = [
  '......OOOOO.....', '....OOHHHHHO....', '...OHHHHHHHHO...', '..OHHHHHHHHHHO..',
  '..OHHHHHHHHHHO..', '..OSSSSHHHHHHO..', '..OSESSSHHHHHO..', '...OSSSSSHHHO...',
  '....OOSSSSOO....', '....OTCCCCTO....', '....OCCSSCCO....', '....OCCSSCCO....',
  '....OCCCCCCO....', '....OPPPPPPO....', '....OPPOPPO.....', '....OFFOFFO.....'];
TPL.side1 = TPL.side0.slice(0, 13).concat(LEGS_S1);

function setc(rows, j, i, ch) { if (rows[j] && rows[j][i] !== undefined) rows[j][i] = ch; }
function setrow(rows, j, s) { rows[j] = s.split(''); }
const FX = {
  fur(r, k) {
    if (k === 'up') { for (let i = 4; i <= 11; i++) setc(r, 8, i, 'T'); }
    else { [4, 5, 10, 11].forEach(i => setc(r, 8, i, 'T')); }
    if (k === 'down') { setc(r, 12, 5, 'T'); setc(r, 12, 10, 'T'); }
  },
  shades(r, k) {
    if (k === 'down') for (let i = 4; i <= 11; i++) setc(r, 6, i, 'O');
    if (k === 'side') for (let i = 3; i <= 6; i++) setc(r, 6, i, 'O');
  },
  glasses(r, k) {
    if (k === 'down') { [4, 6, 9, 11, 7, 8].forEach(i => setc(r, 6, i, 'O')); }
    if (k === 'side') { setc(r, 6, 3, 'O'); setc(r, 6, 5, 'O'); }
  },
  helmet(r, k) {
    for (let j = 0; j <= 8; j++) for (let i = 0; i < 16; i++) { if (r[j][i] === 'S' || r[j][i] === 'E') r[j][i] = 'V'; }
    if (k === 'down') { setc(r, 6, 5, 'v'); setc(r, 6, 6, 'v'); setc(r, 0, 4, 'O'); setc(r, 0, 11, 'O'); }
    if (k === 'up') { setc(r, 0, 4, 'O'); setc(r, 0, 11, 'O'); }
    if (k === 'side') { setc(r, 6, 4, 'v'); setc(r, 0, 5, 'O'); setc(r, 0, 11, 'O'); }
  },
  long(r, k) {
    if (k === 'down') { setrow(r, 7, '..OHSSSSSSSSHO..'); setrow(r, 8, '..OHHOSSSSOHHO..'); }
    if (k === 'up') { setrow(r, 7, '..OHHHHHHHHHHO..'); setrow(r, 8, '..OHHHHHHHHHHO..'); }
    if (k === 'side') { setrow(r, 7, '...OSSSSSHHHHO..'); setrow(r, 8, '....OOSSSOHHHO..'); }
  },
  skirt(r, k) {
    setrow(r, 13, k === 'side' ? '...OKKKKKKKO....' : '...OKKKKKKKKO...');
    for (let i = 0; i < 16; i++) if (r[14][i] === 'P') r[14][i] = 'S';
  },
  beanie(r) {
    for (let j = 0; j <= 3; j++) for (let i = 0; i < 16; i++) if (r[j][i] === 'H') r[j][i] = 'B';
    for (let i = 0; i < 16; i++) if (r[4][i] === 'H') r[4][i] = 'O';
  },
};
const CHARS = {
  izaya:   { H: 3, S: 0, E: 3, C: 3, T: 0, I: 1, P: 2, F: 3, fx: ['fur'] },
  shizuo:  { H: 0, S: 0, E: 3, C: 3, T: 0, I: 0, P: 3, F: 3, fx: ['shades'] },
  mikado:  { H: 3, S: 0, E: 3, C: 2, T: 2, I: 0, P: 2, F: 3 },
  masaomi: { H: 1, S: 0, E: 3, C: 0, T: 1, I: 1, P: 2, F: 3 },
  anri:    { H: 3, S: 0, E: 3, C: 2, T: 2, I: 0, P: 2, F: 3, K: 2, fx: ['glasses', 'long', 'skirt'] },
  celty:   { H: 3, S: 1, E: 1, C: 3, T: 3, I: 2, P: 3, F: 3, V: 1, v: 0, fx: ['helmet'] },
  simon:   { H: 3, S: 2, E: 3, C: 3, T: 3, I: 1, P: 3, F: 3 },
  dennis:  { H: 1, S: 0, E: 3, C: 0, T: 1, I: 0, P: 2, F: 3 },
  kadota:  { H: 3, S: 0, E: 3, C: 2, T: 1, I: 1, P: 2, F: 3, B: 2, fx: ['beanie'] },
  erika:   { H: 2, S: 0, E: 3, C: 3, T: 1, I: 1, P: 2, F: 3, K: 3, fx: ['long', 'skirt'] },
  rio:     { H: 2, S: 0, E: 3, C: 1, T: 1, I: 0, P: 2, F: 3, K: 2, fx: ['long', 'skirt'] },
  bully:   { H: 1, S: 0, E: 3, C: 2, T: 2, I: 0, P: 2, F: 3, K: 2, fx: ['long', 'skirt'] },
  girl:    { H: 3, S: 0, E: 3, C: 2, T: 0, I: 0, P: 2, F: 3, K: 2, fx: ['skirt'] },
  salary:  { H: 3, S: 0, E: 3, C: 2, T: 0, I: 0, P: 2, F: 3 },
  punk:    { H: 0, S: 0, E: 3, C: 3, T: 1, I: 1, P: 3, F: 3 },
  oldman:  { H: 1, S: 0, E: 3, C: 1, T: 2, I: 2, P: 2, F: 3 },
  suit:    { H: 3, S: 0, E: 3, C: 3, T: 0, I: 0, P: 3, F: 3, fx: ['shades'] },
  dollar:  { H: 2, S: 0, E: 3, C: 1, T: 2, I: 2, P: 2, F: 3 },
  dollar2: { H: 3, S: 0, E: 3, C: 2, T: 1, I: 1, P: 3, F: 3 },
  shinra:  { H: 2, S: 0, E: 3, C: 0, T: 0, I: 1, P: 2, F: 3, fx: ['glasses'] },
};
function buildChar(def) {
  const out = {};
  for (const key in TPL) {
    const rows = TPL[key].map(r => r.split(''));
    const kind = key.replace(/[01]$/, '');
    for (const f of def.fx || []) FX[f](rows, kind);
    const d = new Uint8Array(256);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const ch = rows[j][i];
      d[j * 16 + i] = ch === '.' ? 255 : ch === 'O' ? 3 : (def[ch] !== undefined ? def[ch] : 3);
    }
    out[key] = { w: 16, h: 16, d };
  }
  return out;
}
const SPR = {};
for (const k in CHARS) SPR[k] = buildChar(CHARS[k]);

/* ---------------- TILES ---------------- */
function mkTile(fn) {
  const d = new Uint8Array(256);
  const g = {
    d,
    f(c) { d.fill(c); },
    r(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (i >= 0 && j >= 0 && i < 16 && j < 16) d[j * 16 + i] = c; },
    p(x, y, c) { if (x >= 0 && y >= 0 && x < 16 && y < 16) d[y * 16 + x] = c; },
    pat(rows, map) { rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch] !== undefined) d[j * 16 + i] = map[ch]; })); },
  };
  fn(g);
  return { w: 16, h: 16, d };
}
const asph = g => { g.f(1); [[2, 3], [11, 5], [6, 12], [13, 13], [4, 9], [9, 1]].forEach(([x, y]) => g.p(x, y, 2)); };
const side = g => { g.f(0); g.r(0, 7, 16, 1, 1); g.r(0, 15, 16, 1, 1); g.r(7, 0, 1, 7, 1); g.r(15, 8, 1, 7, 1); };
const grass = g => { g.f(0); [[2, 5], [3, 4], [4, 5], [10, 11], [11, 10], [12, 11], [9, 2], [13, 6], [5, 13]].forEach(([x, y]) => g.p(x, y, 1)); };
const wood = g => { g.f(1); [3, 7, 11, 15].forEach(y => g.r(0, y, 16, 1, 2)); g.r(5, 0, 1, 3, 2); g.r(12, 4, 1, 3, 2); g.r(3, 8, 1, 3, 2); g.r(10, 12, 1, 3, 2); };
const conc = g => { g.f(0); g.r(0, 0, 16, 1, 1); g.r(0, 0, 1, 16, 1); g.p(5, 6, 1); g.p(11, 10, 1); g.p(8, 3, 1); };
const TREE = ['.....OOOOOO.....', '...OOaaaaaaOO...', '..OaaabaaabaaO..', '.OaabbaaaabbaaO.', '.OaaaaaabaaaaaO.',
  'OaabaaaaaaaabaaO', 'OaaaaabaaabaaaaO', '.OaaaaaaaaaaaaO.', '.OabaaaabaaaabO.', '..OOaaaaaaaaOO..',
  '....OOOOOOOO....', '......OaaO......', '......OaaO......', '......OaaO......', '.....OaaaaO.....', '....OOOOOOOO....'];
const VEND = ['.OOOOOOOOOOOOOO.', '.ObbbbbbbbbbbbO.', '.ObwwwwwwwwwwbO.', '.ObwawawawawwbO.', '.ObwawawawawwbO.',
  '.ObwwwwwwwwwwbO.', '.ObwawawawawwbO.', '.ObwawawawawwbO.', '.ObwwwwwwwwwwbO.', '.ObbbbbbbbbbbbO.',
  '.ObOaObbbbbbbbO.', '.ObbbbbbbbOObbO.', '.ObbaaaaaaaaabO.', '.ObbaOOOOOOOabO.', '.ObbbbbbbbbbbbO.', '.OOOOOOOOOOOOOO.'];
const TMAP = { O: 3, a: 2, b: 1, w: 0 };
const TILE_FN = {
  '.': asph, ',': side, 'g': grass, 'w': wood, 'R': conc,
  '=': g => { asph(g); g.r(3, 7, 10, 2, 0); },
  'z': g => { asph(g); g.r(1, 0, 5, 16, 0); g.r(9, 0, 5, 16, 0); },
  '#': g => { g.f(2); g.r(0, 0, 16, 1, 3); [2, 9].forEach(x => { g.r(x, 3, 5, 7, 3); g.r(x + 1, 4, 3, 5, 0); g.p(x + 1, 4, 1); g.r(x + 1, 7, 3, 1, 1); }); g.r(0, 13, 16, 1, 3); },
  'B': g => { g.f(2); for (let x = 0; x < 16; x++) g.r(x, 0, 1, 4, (x >> 1) & 1 ? 3 : 0); for (let x = 0; x < 16; x += 2) g.p(x, 4, 3); g.r(1, 6, 14, 9, 3); g.r(2, 7, 12, 7, 0); g.r(3, 8, 3, 1, 1); g.r(3, 9, 1, 2, 1); g.r(0, 15, 16, 1, 3); },
  '^': g => { g.f(3); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) if ((i + j * 3) % 7 === 0) g.p(i, j, 2); },
  'q': g => { g.f(2); g.r(0, 0, 16, 2, 3); g.r(0, 2, 2, 14, 3); g.r(14, 2, 2, 14, 3); g.r(3, 3, 10, 12, 1); g.r(3, 8, 10, 1, 3); g.r(8, 3, 1, 12, 3); g.p(4, 4, 0); g.p(5, 4, 0); g.p(4, 5, 0); },
  'n': g => { g.f(3); g.r(1, 3, 14, 2, 0); g.r(1, 11, 14, 2, 1); g.r(3, 7, 2, 2, 0); g.r(8, 7, 2, 2, 1); g.r(12, 7, 2, 2, 0); },
  'D': g => { g.f(2); g.r(2, 1, 12, 15, 3); g.r(4, 3, 8, 13, 2); g.r(7, 3, 1, 13, 3); g.p(6, 9, 0); g.p(9, 9, 0); g.r(2, 0, 12, 1, 1); },
  'T': g => { grass(g); g.pat(TREE, TMAP); },
  'V': g => { side(g); g.pat(VEND, TMAP); },
  'L': g => { side(g); g.r(7, 4, 2, 12, 3); g.r(5, 1, 6, 3, 3); g.r(6, 2, 4, 1, 0); g.r(5, 14, 6, 2, 3); },
  'h': g => { grass(g); g.r(1, 5, 14, 2, 3); g.r(1, 7, 14, 3, 2); g.r(1, 10, 14, 1, 3); g.r(2, 11, 2, 3, 3); g.r(12, 11, 2, 3, 3); g.r(3, 8, 10, 1, 1); },
  'F': g => { side(g); g.r(1, 3, 2, 12, 3); g.r(13, 3, 2, 12, 3); g.r(0, 5, 16, 2, 3); g.r(0, 10, 16, 2, 3); },
  'W': g => { g.f(1); for (let x = 0; x < 16; x += 4) g.r(x, 0, 1, 11, 2); g.r(0, 11, 16, 1, 2); g.r(0, 12, 16, 4, 3); },
  'Y': g => { g.f(2); g.r(1, 1, 14, 11, 3); g.r(2, 2, 12, 9, 0); g.r(2, 7, 3, 4, 2); g.r(5, 5, 2, 6, 3); g.r(7, 8, 3, 3, 2); g.r(10, 4, 2, 7, 3); g.r(12, 6, 2, 5, 2); g.p(4, 3, 1); g.p(6, 6, 0); g.p(10, 5, 0); g.r(0, 12, 16, 4, 3); },
  'K': g => { wood(g); g.r(0, 3, 16, 8, 2); g.r(0, 3, 16, 1, 3); g.r(0, 10, 16, 1, 3); g.r(1, 11, 2, 4, 3); g.r(13, 11, 2, 4, 3); g.r(3, 5, 4, 3, 0); g.r(9, 5, 3, 2, 3); },
  'P': g => { wood(g); g.r(0, 3, 16, 8, 2); g.r(0, 10, 16, 1, 3); g.r(1, 11, 2, 4, 3); g.r(13, 11, 2, 4, 3); g.r(3, 0, 10, 8, 3); g.r(4, 1, 8, 5, 1); g.r(5, 2, 5, 1, 0); g.r(5, 4, 3, 1, 0); g.r(7, 8, 2, 1, 3); g.r(4, 9, 8, 1, 3); },
  'b': g => { g.f(3); g.r(1, 1, 14, 14, 2); g.r(1, 7, 14, 1, 3); g.r(1, 14, 14, 1, 3); for (let i = 2; i < 14; i++) { const h = [5, 4, 5, 3, 5, 4][i % 6]; g.r(i, 7 - h, 1, h, [0, 1, 0, 3, 1, 0][i % 6]); const h2 = (i * 7) % 3 + 3; g.r(i, 14 - h2, 1, h2, [1, 0, 3][i % 3]); } },
  'C': g => { wood(g); g.r(1, 2, 14, 12, 3); g.r(2, 3, 12, 10, 2); for (let j = 0; j < 4; j++) for (let i = 0; i < 5; i++) g.r(3 + i * 2, 4 + j * 2, 2, 2, (i + j) % 2 ? 0 : 1); g.p(4, 5, 3); g.p(10, 9, 3); g.p(8, 7, 3); g.p(6, 9, 0); g.r(2, 14, 2, 2, 3); g.r(12, 14, 2, 2, 3); },
  'c': g => { wood(g); g.r(0, 2, 16, 13, 3); g.r(1, 3, 14, 4, 2); g.r(1, 8, 14, 5, 1); g.r(7, 8, 1, 5, 3); },
  'r': g => { g.f(2); frame2(g); for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) if (Math.abs(i - 7.5) + Math.abs(j - 7.5) < 4) g.p(i, j, 1); },
  'p': g => { wood(g); g.r(4, 10, 8, 6, 3); g.r(5, 11, 6, 4, 2); g.r(5, 2, 6, 8, 2); g.r(3, 4, 3, 4, 2); g.r(10, 4, 3, 4, 2); g.p(6, 3, 1); g.p(9, 5, 1); g.p(4, 6, 1); g.p(11, 6, 1); },
  'k': g => { g.f(2); g.r(0, 0, 16, 5, 0); g.r(0, 4, 16, 1, 3); for (let i = 1; i < 16; i += 4) g.r(i, 6, 1, 10, 3); g.r(3, 1, 4, 2, 1); g.r(10, 1, 3, 2, 1); g.p(4, 1, 3); g.p(11, 1, 2); },
  't': g => { wood(g); g.r(2, 3, 12, 9, 3); g.r(3, 4, 10, 7, 0); g.r(5, 6, 3, 2, 1); g.r(3, 12, 2, 3, 3); g.r(11, 12, 2, 3, 3); },
  'E': g => { conc(g); g.r(0, 4, 16, 2, 3); g.r(0, 10, 16, 2, 3); g.r(1, 2, 2, 13, 3); g.r(9, 2, 2, 13, 3); },
  'x': g => g.f(3),
  'f': g => { g.f(0); g.r(0, 0, 16, 1, 1); g.r(0, 0, 1, 16, 1); g.r(8, 8, 8, 1, 1); g.r(8, 8, 1, 8, 1); },
  'G': g => { g.f(0); g.r(0, 0, 16, 3, 2); g.r(2, 3, 4, 12, 3); g.r(10, 3, 4, 12, 3); g.r(3, 5, 2, 1, 0); g.r(11, 5, 2, 1, 1); g.r(6, 8, 4, 1, 2); },
  'O': g => { g.f(1); for (let j = 1; j < 16; j += 4) for (let i = (j % 8) ? 0 : 2; i < 16; i += 5) g.r(i, j, 3, 1, 0); g.r(6, 4, 4, 9, 2); g.r(7, 2, 2, 3, 3); g.r(5, 12, 6, 2, 3); g.p(7, 1, 0); g.p(8, 0, 0); },
  'a': g => { g.f(2); [[3, 3], [12, 6], [7, 12], [1, 9], [14, 14]].forEach(([x, y]) => g.p(x, y, 3)); g.r(3, 9, 5, 2, 1); g.p(10, 2, 1); },
  'H': g => { g.f(2); g.r(1, 1, 14, 15, 3); for (let y = 2; y < 16; y += 2) g.r(2, y, 12, 1, 2); g.r(5, 6, 6, 3, 1); g.p(12, 10, 1); },
  'M': g => { g.f(3); g.r(1, 1, 6, 6, 1); g.r(9, 1, 6, 6, 0); g.r(1, 9, 6, 5, 0); g.r(9, 9, 6, 5, 1); g.r(2, 3, 4, 1, 3); g.r(10, 4, 3, 1, 2); g.r(2, 11, 3, 1, 2); g.r(10, 11, 4, 1, 3); },
  'Z': g => { g.f(1); for (let x = 0; x < 16; x += 4) g.r(x, 0, 1, 12, 2); g.r(0, 12, 16, 4, 3); g.r(1, 1, 14, 10, 2); g.r(2, 2, 12, 8, 0); for (let k = 0; k < 9; k++) { g.p(3 + k, 3 + (k >> 1), 3); g.p(12 - k, 4 + (k >> 2), 3); } [[3, 3], [12, 4], [8, 8], [5, 7]].forEach(([x, y]) => g.r(x, y, 2, 2, 3)); },
  'X': g => { g.f(1); g.r(0, 4, 16, 8, 2); g.r(0, 4, 16, 1, 3); g.r(0, 11, 16, 1, 3); g.r(1, 12, 2, 4, 3); g.r(13, 12, 2, 4, 3); g.r(4, 0, 8, 6, 3); g.r(5, 1, 6, 4, 0); g.r(6, 2, 3, 1, 3); g.r(6, 3, 4, 1, 1); g.r(3, 6, 10, 2, 3); g.p(13, 7, 0); },
  'Q': g => { g.f(3); g.r(2, 1, 12, 14, 2); for (let y = 2; y < 14; y += 3) { g.r(3, y, 10, 2, 3); g.p(11, y, 0); g.p(9, y, 1); } },
  'i': g => { g.f(1); g.r(3, 0, 10, 16, 0); frame2(g); g.r(3, 0, 1, 16, 3); g.r(12, 0, 1, 16, 3); g.r(3, 6, 10, 1, 2); g.r(10, 3, 1, 2, 3); g.r(10, 8, 1, 3, 3); },
  'j': g => { g.f(1); g.r(0, 0, 16, 1, 2); g.r(0, 0, 1, 16, 2); g.p(6, 5, 2); g.p(11, 11, 2); },
  'm': g => { wood(g); g.r(1, 3, 14, 10, 2); g.r(2, 5, 12, 1, 1); g.r(2, 8, 12, 1, 1); g.r(2, 11, 12, 1, 1); },
};
function frame2(g) { g.r(0, 0, 16, 1, 3); g.r(0, 15, 16, 1, 3); g.r(0, 0, 1, 16, 3); g.r(15, 0, 1, 16, 3); }
const TILES = {};
for (const k in TILE_FN) TILES[k] = mkTile(TILE_FN[k]);
const SOLID = new Set('#B^qnTVLhFWYKPbCcktExpGOMZXQi'.split(''));
const TILE_TEXT = {
  V: 'A vending machine. In Ikebukuro, these count as ammunition.',
  L: 'A streetlamp, bent at a suspicious angle. You can guess why.',
  T: 'A tree. It has never once thrown anything at you. Refreshing.',
  Y: 'Shinjuku glitters below. So many lives. So many buttons to press.',
  q: 'IKEBUKURO STATION. A million stories walk through here every day.',
  B: 'A shop window. Your reflection smiles back. Good.',
  k: 'The counter smells of vinegar and Russian cooking.',
  E: "Don't lean too far. Gravity is the one thing you can't talk your way out of.",
  h: "A bench. Someone carved 'DOLLARS' into the wood.",
  c: 'A black leather couch. You do your best thinking here. Upside down.',
  p: 'A plant. It has excellent opinions and keeps them to itself.',
  t: 'A small table. Someone left a chopstick wrapper folded into a crane.',
  n: 'Neon hums overhead.',
  G: "Ticket gates. Trains to Shinjuku leave every few minutes. Ikebukuro isn't done with you yet.",
  O: 'The fountain at West Gate Park. Coins at the bottom. Wishes nobody will admit to.',
};

/* ---------------- STATE ---------------- */
const LV = [0, 2, 5, 9, 14];
const STAT_NAMES = { manip: 'MANIPULATION', intel: 'INFO NETWORK', escape: 'PARKOUR', foresight: 'FORESIGHT' };
const STAT_SHORT = { manip: 'MANIP', intel: 'INTEL', escape: 'ESCAPE', foresight: 'FORESIGHT' };
const REL_NAMES = { mikado: 'MIKADO', masaomi: 'MASAOMI', celty: 'CELTY', shizuo: 'SHIZUO', simon: 'SIMON', anri: 'ANRI', kadota: 'KADOTA', shinra: 'SHINRA' };
const REL_START = { mikado: 0, masaomi: -20, celty: 0, shizuo: -50, simon: 10, anri: 0, kadota: 0, shinra: 15 };
const SAVE_KEY = 'ikebukuro_gambit_v2', OPT_KEY = 'ikebukuro_gambit_opt';

const G = {
  frame: 0, mode: 'title', map: null, mapId: null, p: null, npcs: [], busy: 0,
  fade: 0, timers: [], waiters: [], toasts: [], emotes: [], observer: false,
  flags: {}, xp: {}, rel: {}, seeds: {}, bloomed: {}, chapter: 0, time: 0, wins: 0,
  opt: { pal: 0, music: true, sfx: true }, B: null, C: null, chat: null, card: null, prevMode: null,
};
function resetState() {
  Object.assign(G, {
    npcs: [], flags: {}, xp: { manip: 0, intel: 0, escape: 0, foresight: 0 },
    rel: Object.assign({}, REL_START), seeds: {}, bloomed: {}, chapter: 0, time: 0, wins: 0, observer: false, yen: 10000,
    toasts: [], emotes: [], B: null, C: null, chat: null,
    p: { x: 0, y: 0, dir: 'down', moving: false, prog: 0, step: 0, speed: 1 },
  });
}
function lvl(s) { let l = 0; for (const t of LV) if ((G.xp[s] || 0) >= t) l++; return l; }

/* ---------------- INPUT ---------------- */
const BTN = ['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'];
const held = {}, prev = {}, pressed = {}, keyHeld = {}, touchHeld = {}, repT = {};
const KEYMAP = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'a', KeyJ: 'a', Space: 'a', KeyX: 'b', KeyK: 'b', Enter: 'start', ShiftLeft: 'select', ShiftRight: 'select', Backspace: 'select' };
function updateInput() {
  for (const b of BTN) {
    held[b] = !!(keyHeld[b] || touchHeld[b]);
    pressed[b] = held[b] && !prev[b];
    prev[b] = held[b];
    if (held[b]) repT[b] = (repT[b] || 0) + 1; else repT[b] = 0;
  }
}
function rep(b) { return pressed[b] || (held[b] && repT[b] > 18 && repT[b] % 5 === 0); }
function setupInput() {
  addEventListener('keydown', e => { const b = KEYMAP[e.code]; if (b) { keyHeld[b] = true; e.preventDefault(); audioInit(); } });
  addEventListener('keyup', e => { const b = KEYMAP[e.code]; if (b) { keyHeld[b] = false; e.preventDefault(); } });
  const tstate = new Map();
  const recompute = () => { for (const b of BTN) touchHeld[b] = false; for (const v of tstate.values()) if (v) touchHeld[v] = true; };
  const buzz = () => { if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} };
  document.querySelectorAll('[data-b]').forEach(el => {
    el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); tstate.set(e.pointerId, el.dataset.b); el.classList.add('on'); recompute(); buzz(); });
    const up = e => { tstate.delete(e.pointerId); el.classList.remove('on'); recompute(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
  });
  const dp = document.getElementById('dpad');
  if (dp) {
    const dirOf = e => {
      const r = dp.getBoundingClientRect(); const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return null;
      return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
    };
    const show = d => dp.dataset.dir = d || '';
    dp.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); dp.setPointerCapture(e.pointerId); const d = dirOf(e); tstate.set(e.pointerId, d); show(d); recompute(); buzz(); });
    dp.addEventListener('pointermove', e => { if (!tstate.has(e.pointerId)) return; const d = dirOf(e); if (d !== tstate.get(e.pointerId)) { tstate.set(e.pointerId, d); show(d); recompute(); if (d) buzz(); } });
    const end = e => { tstate.delete(e.pointerId); show(null); recompute(); };
    dp.addEventListener('pointerup', end); dp.addEventListener('pointercancel', end);
  }
  addEventListener('blur', () => { for (const b of BTN) { keyHeld[b] = false; touchHeld[b] = false; } tstate.clear(); });
}

/* ---------------- AUDIO ---------------- */
const AU = { ctx: null, master: null, track: null, nextT: 0, step: 0 };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = 0.22; AU.master.connect(AU.ctx.destination);
    AU.nextT = AU.ctx.currentTime + 0.05;
  } catch (e) { AU.ctx = null; }
}
function toneAt(f, d, type, v, t, slide) {
  const c = AU.ctx; if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.linearRampToValueAtTime(slide, t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + d + 0.03);
}
function tone(f, d, type, v, delay, slide) { if (!AU.ctx || !G.opt.sfx) return; toneAt(f, d, type || 'square', v || 0.1, AU.ctx.currentTime + (delay || 0), slide); }
const SFX = {
  blip: () => tone(1250, 0.02, 'square', 0.03),
  sel: () => tone(880, 0.04, 'square', 0.06),
  ok: () => { tone(660, 0.05, 'square', 0.07); tone(990, 0.07, 'square', 0.07, 0.05); },
  back: () => tone(440, 0.06, 'square', 0.06),
  bump: () => tone(98, 0.07, 'square', 0.1),
  hit: () => { tone(220, 0.18, 'sawtooth', 0.14, 0, 50); tone(90, 0.12, 'square', 0.1, 0.02); },
  seed: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.09, 'square', 0.07, i * 0.07)),
  lvl: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.1, 'square', 0.07, i * 0.08)),
  door: () => { tone(330, 0.08, 'triangle', 0.15); tone(220, 0.1, 'triangle', 0.15, 0.08); },
  alarm: () => { tone(880, 0.12, 'square', 0.1, 0, 440); tone(880, 0.12, 'square', 0.1, 0.15, 440); },
  throw: () => tone(160, 0.35, 'sawtooth', 0.1, 0, 40),
  jump: () => tone(400, 0.12, 'square', 0.06, 0, 800),
  ping: () => { tone(1568, 0.06, 'square', 0.05); tone(2093, 0.1, 'square', 0.05, 0.07); },
};
function sfx(n) { if (SFX[n]) SFX[n](); }
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function n2f(s) { const m = /^([A-G])(#?)(\d)$/.exec(s); if (!m) return 440; const n = NOTE[m[1]] + (m[2] ? 1 : 0) + (parseInt(m[3], 10) + 1) * 12; return 440 * Math.pow(2, (n - 69) / 12); }
const TRACKS = {
  title: { bpm: 100, lead: 'A4 - C5 - E5 - A5 - G5 - E5 - D5 - E5 - F5 - E5 - D5 - C5 - B4 - G4 - A4 - - -', bass: 'A2 - - - A2 - - - F2 - - - F2 - - - D2 - - - D2 - - - E2 - - - E2 - - -' },
  city: { bpm: 132, lead: 'E5 E5 - G5 - E5 D5 - C5 - D5 - E5 - - - A4 - C5 - D5 - E5 G5 - E5 - D5 C5 - - -', bass: 'A2 - A3 - A2 - A3 - F2 - F3 - F2 - F3 - G2 - G3 - G2 - G3 - E2 - E3 - E2 - E3 -' },
  office: { bpm: 88, lead: 'E5 - - - B4 - - - C5 - - - G4 - - - A4 - - - E4 - - - F4 - - - G4 - - -', bass: 'A2 - - - - - - - E2 - - - - - - - F2 - - - - - - - G2 - - - - - - -' },
  battle: { bpm: 160, lead: 'A5 - A5 G5 A5 - C6 - B5 - G5 - E5 - G5 - A5 - A5 G5 A5 - E6 - D6 - C6 - B5 - G5 -', bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 F2 F3 F2 F3 G2 G3 G2 G3 G2 G3 G2 G3 E2 E3 E2 E3 E2 E3 E2 E3' },
  chase: { bpm: 184, lead: 'E5 E5 G5 E5 A5 - G5 E5 D5 D5 E5 D5 C5 - B4 - E5 E5 G5 E5 B5 - A5 G5 E5 - G5 - A5 - - -', bass: 'E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 B1 B2' },
  chat: { bpm: 112, lead: 'C5 - E5 G5 - E5 C5 - D5 - F5 A5 - F5 D5 - E5 - G5 C6 - G5 E5 - D5 - G5 B5 - G5 D5 -', bass: 'C3 - G2 - C3 - G2 - D3 - A2 - D3 - A2 - E3 - B2 - E3 - B2 - G2 - D3 - G2 - D3 -' },
  finale: { bpm: 120, lead: 'A4 - E5 - A5 - G5 E5 - D5 - E5 - - - F5 - E5 - D5 - C5 D5 - E5 - A5 - - - -', bass: 'A2 - A2 - A2 - A2 - F2 - F2 - F2 - F2 - D2 - D2 - D2 - D2 - E2 - E2 - E2 - E2 -' },
};
for (const k in TRACKS) { TRACKS[k].lead = TRACKS[k].lead.split(' '); TRACKS[k].bass = TRACKS[k].bass.split(' '); }
function music(name) { if (AU.track === name) return; AU.track = name || null; AU.step = 0; if (AU.ctx) AU.nextT = AU.ctx.currentTime + 0.08; }
function musicTick() {
  const c = AU.ctx; if (!c || !AU.track || !G.opt.music) return;
  const tr = TRACKS[AU.track]; if (!tr) return;
  const dt = 60 / tr.bpm / 2;
  if (AU.nextT < c.currentTime - 0.3) AU.nextT = c.currentTime + 0.05;
  while (AU.nextT < c.currentTime + 0.15) {
    const l = tr.lead[AU.step % tr.lead.length], b = tr.bass[AU.step % tr.bass.length];
    if (l !== '-') toneAt(n2f(l), dt * 0.9, 'square', 0.035, AU.nextT);
    if (b !== '-') toneAt(n2f(b), dt * 1.7, 'triangle', 0.12, AU.nextT);
    AU.nextT += dt; AU.step++;
  }
}

/* ---------------- ASYNC HELPERS ---------------- */
function frames(n) { return new Promise(res => G.timers.push({ n, res })); }
const wait = frames;
function until(cond) { return new Promise(res => G.waiters.push({ cond, res })); }
function run(fn, ...a) {
  G.busy++;
  return Promise.resolve().then(() => fn(...a)).catch(e => console.error(e)).finally(() => { G.busy--; });
}
async function fadeTo(t, spd) { spd = spd || 4; while (G.fade !== t) { G.fade += Math.sign(t - G.fade); await frames(spd); } }
function free() { return G.busy === 0 && UI.length === 0 && G.mode === 'world'; }
function toast(s) { G.toasts.push({ s, t: 110 }); }

/* ---------------- UI WIDGETS ---------------- */
const UI = [];
function pushUI(w) { w.age = 0; UI.push(w); return w; }
function popUI(w) { const i = UI.indexOf(w); if (i >= 0) UI.splice(i, 1); }

class TextBox {
  constructor(name, txt, o) { this.name = name; this.lines = wrap(txt, 24); this.page = 0; this.c = 0; this.o = o || {}; this.typed = false; }
  get pl() { return this.lines.slice(this.page * 3, this.page * 3 + 3); }
  isLast() { return (this.page + 1) * 3 >= this.lines.length; }
  update() {
    const total = this.pl.join('').length;
    if (this.c < total) {
      const p0 = Math.floor(this.c);
      this.c = Math.min(total, this.c + ((held.a || held.b) && this.age > 4 ? 4 : 0.7));
      if (Math.floor(this.c) !== p0 && Math.floor(this.c) % 3 === 0) sfx('blip');
      return;
    }
    if (this.o.keep) { if (this.isLast()) { this.typed = true; return; } }
    if (this.age > 2 && (pressed.a || pressed.b)) {
      if (!this.isLast()) { this.page++; this.c = 0; sfx('blip'); }
      else if (!this.o.keep) { popUI(this); if (this.o.onDone) this.o.onDone(); }
    }
  }
  draw() {
    if (this.name) { const w = [...this.name].length * 6 + 12; box(2, 83, w, 16); text(this.name, 8, 88, 3); }
    box(0, 96, 160, 48);
    let rem = Math.floor(this.c);
    this.pl.forEach((ln, k) => { const a = [...ln]; text(a.slice(0, Math.max(0, rem)).join(''), 8, 104 + k * 11, 3); rem -= a.length; });
    const total = this.pl.join('').length;
    if (this.c >= total && (!this.o.keep || !this.isLast()) && (G.frame >> 4) % 2) text('▼', 146, 134, 3);
  }
}

function reqOK(r) {
  if (!r) return true;
  if (Array.isArray(r)) return r.every(reqOK);
  if (r.stat) return lvl(r.stat) >= r.lv;
  if (r.rel) { const v = G.rel[r.rel] || 0; return (r.min === undefined || v >= r.min) && (r.max === undefined || v <= r.max); }
  if (r.seed) return !!G.seeds[r.seed];
  if (r.flag) return !!G.flags[r.flag];
  if (r.time) return G.time >= r.time;
  return true;
}
function reqWhy(r) {
  if (!r) return '';
  if (Array.isArray(r)) { const f = r.find(x => !reqOK(x)); return f ? reqWhy(f) : ''; }
  if (r.stat) return `§ ${STAT_SHORT[r.stat]} Lv${r.lv} needed (Lv${lvl(r.stat)})`;
  if (r.rel) { const n = REL_NAMES[r.rel], v = G.rel[r.rel] || 0; return r.min !== undefined ? `§ ${n} ♥${r.min}+ needed (♥${v})` : `§ ${n} ♥${r.max} or less (♥${v})`; }
  if (r.seed) return '§ Needs an earlier scheme';
  if (r.flag) return r.why || '§ Not yet...';
  if (r.time) return '§ No time left today (◷0)';
  return '§ Locked';
}
function drawBanner(s, atBottom) {
  const lines = wrap(s, 24).slice(0, 3);
  const h = lines.length * 10 + 7;
  const y = atBottom ? H - h : 0;
  box(0, y, 160, h);
  lines.forEach((l, k) => text(l, 6, y + 4 + k * 10, 3));
}

class Choice {
  constructor(items, o) {
    this.items = items; this.o = o || {};
    this.i = Math.max(0, items.findIndex(it => it.ok));
    const fs = lvl('foresight');
    items.forEach(it => { it.label = it.t + (it.seed && fs >= 2 && !G.seeds[it.seed] ? '✦' : ''); });
    const lw = Math.max(...items.map(it => [...it.label].length));
    const n = items.length;
    if (this.o.grid) { this.x = 64; this.y = 96; this.w = 96; this.h = 48; }
    else {
      this.w = Math.min(160, lw * 6 + 22); this.h = n * 11 + 9;
      if (this.o.pos === 'menu') { this.x = 160 - this.w; this.y = 0; }
      else if (this.o.pos === 'center') { this.x = ((160 - this.w) / 2) | 0; this.y = 76; }
      else if (this.o.pos === 'bottom' || G.mode === 'chat') { this.x = 0; this.w = 160; this.y = 144 - this.h; }
      else { this.x = 160 - this.w; this.y = 96 - this.h; }
    }
  }
  pick(v) { popUI(this); this.o.onPick(v); }
  update() {
    if (this.age < 1) return;
    const n = this.items.length;
    if (this.o.grid) {
      if (rep('left') || rep('right')) { this.i ^= 1; sfx('sel'); }
      if (rep('up') || rep('down')) { this.i ^= 2; if (this.i >= n) this.i -= 2; sfx('sel'); }
    } else {
      if (rep('up')) { this.i = (this.i + n - 1) % n; sfx('sel'); }
      if (rep('down')) { this.i = (this.i + 1) % n; sfx('sel'); }
    }
    if (pressed.a) {
      const it = this.items[this.i];
      if (!it.ok) { sfx('bump'); return; }
      sfx('ok'); this.pick(it.v !== undefined ? it.v : this.i);
    } else if (pressed.b && this.o.cancel) { sfx('back'); this.pick(null); }
  }
  draw() {
    if (this.o.grid) {
      box(0, 96, 64, 48); text('What will', 7, 108, 3); text('IZAYA do?', 7, 120, 3);
      box(this.x, this.y, this.w, this.h);
      this.items.forEach((it, k) => {
        const x = this.x + 8 + (k % 2) * 44, y = this.y + 13 + (k >> 1) * 16;
        if (k === this.i) text('▶', x, y, 3);
        text(it.label, x + 7, y, it.ok ? 3 : 2);
      });
      return;
    }
    box(this.x, this.y, this.w, this.h);
    this.items.forEach((it, k) => {
      const y = this.y + 6 + k * 11;
      if (k === this.i) text('▶', this.x + 6, y, 3);
      text(it.ok ? it.label : '§' + it.label.slice(0, 20), this.x + 14, y, it.ok ? 3 : 2);
    });
    const it = this.items[this.i];
    let info = '';
    if (!it.ok) info = it.why;
    else if (it.seed && !G.seeds[it.seed] && lvl('foresight') >= 2) {
      const S = (typeof SEEDS !== 'undefined') && SEEDS[it.seed];
      info = lvl('foresight') >= 4 && S ? `✦ ${S.n}: ${S.h}` : '✦ This choice plants a seed.';
    } else if (it.d) info = it.d;
    if (info) drawBanner(info, this.o.pos === 'menu' || this.y < 40);
  }
}
function normItems(items) {
  return items.filter(Boolean).map(it => {
    if (typeof it === 'string') it = { t: it };
    const ok = !it.dis && reqOK(it.req);
    return Object.assign({}, it, { ok, why: it.dis ? (it.disWhy || '§ Unavailable') : reqWhy(it.req) });
  });
}
function say(name, txt) {
  if (G.mode === 'chat') return chatSay(name, txt);
  return new Promise(res => pushUI(new TextBox(name, txt, { onDone: res })));
}
async function ask(prompt, items, o) {
  o = o || {};
  let tb = null;
  if (prompt) {
    if (G.mode === 'chat') await chatSay(null, prompt);
    else { tb = pushUI(new TextBox(o.name || null, prompt, { keep: true })); await until(() => tb.typed); }
  }
  const r = await new Promise(res => pushUI(new Choice(normItems(items), Object.assign({}, o, { onPick: res }))));
  if (tb) popUI(tb);
  return r;
}

class Panel {
  constructor(drawFn, o) { this.drawFn = drawFn; this.o = o || {}; this.sel = 0; this.full = true; }
  update() {
    if (this.age < 1) return;
    const n = this.o.n || 0;
    if (n) { if (rep('up') && this.sel > 0) { this.sel--; sfx('sel'); } if (rep('down') && this.sel < n - 1) { this.sel++; sfx('sel'); } }
    if (pressed.a || pressed.b || pressed.start) { sfx('back'); popUI(this); this.o.onDone(); }
  }
  draw() { this.drawFn(this); }
}
function panel(fn, o) { return new Promise(res => pushUI(new Panel(fn, Object.assign({}, o, { onDone: res })))); }

/* ---------------- CHAT MODE ---------------- */
class ChatWait {
  constructor(e, res) { this.e = e; this.res = res; }
  update() {
    const L = [...this.e.text].length;
    if (this.e.shown < L) { this.e.shown = Math.min(L, this.e.shown + (held.a && this.age > 4 ? 4 : 1)); if (this.e.shown % 4 === 0) sfx('blip'); return; }
    if (this.age > 3 && (pressed.a || pressed.b)) { popUI(this); this.res(); }
  }
  draw() { const L = [...this.e.text].length; if (this.e.shown >= L && (G.frame >> 4) % 2) text('▼', 150, 136, 3); }
}
function chatOpen(title) { G.prevMode = G.mode; G.mode = 'chat'; G.chat = { log: [], title: title || 'IKEBUKURO CHAT' }; music('chat'); }
function chatClose() { G.mode = G.prevMode || 'world'; G.chat = null; music(mapMusic()); }
function chatSay(name, txt) {
  return new Promise(res => { const e = { name, text: txt, shown: 0 }; G.chat.log.push(e); if (name) sfx('ping'); pushUI(new ChatWait(e, res)); });
}
function drawChat() {
  rect(0, 0, W, H, 0);
  for (let y = 14; y < H; y += 4) rect(0, y, W, 1, 0);
  rect(0, 0, W, 12, 3); text('◷ ' + G.chat.title, 4, 3, 0);
  const top = UI[UI.length - 1];
  const bottom = top instanceof Choice ? top.y - 2 : 142;
  const lines = [];
  for (const e of G.chat.log) {
    const shownTxt = [...e.text].slice(0, e.shown).join('');
    if (e.name) {
      lines.push({ s: (e.name === 'Kanra' ? '♥' : '') + e.name + ':', c: 2, x: 4 });
      wrap(shownTxt, 24).forEach(l => lines.push({ s: l, c: 3, x: 10 }));
    } else wrap('* ' + shownTxt, 25).forEach(l => lines.push({ s: l, c: 2, x: 4 }));
  }
  const maxL = Math.floor((bottom - 15) / 10);
  const vis = lines.slice(-maxL);
  vis.forEach((l, k) => text(l.s, l.x, 15 + k * 10, l.c));
}

/* ---------------- MAP & ENTITIES ---------------- */
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
const CH2DIR = { U: 'up', D: 'down', L: 'left', R: 'right' };
function tileAt(x, y) { const m = G.map; if (!m || y < 0 || y >= m.rows.length || x < 0 || x >= m.rows[0].length) return 'x'; return m.rows[y][x]; }
function warpAt(x, y) { return G.map.warps && G.map.warps[x + ',' + y]; }
function tileSolid(x, y) { const c = tileAt(x, y); if (c === 'D') return !warpAt(x, y); if (c === 'H') return !G.flags.hqFound; return SOLID.has(c); }
function npcAt(x, y, self) { return G.npcs.find(n => n !== self && !n.gone && ((n.x === x && n.y === y) || (n.moving && n.tx === x && n.ty === y))); }
function blocked(x, y, self) {
  if (tileSolid(x, y)) return true;
  if (npcAt(x, y, self)) return true;
  const p = G.p;
  if (self !== p && ((p.x === x && p.y === y) || (p.moving && p.tx === x && p.ty === y))) return true;
  return false;
}
function startMove(e, dir, ghost) {
  const [dx, dy] = DIRV[dir]; e.dir = dir;
  const nx = e.x + dx, ny = e.y + dy;
  if (!ghost && blocked(nx, ny, e)) return false;
  e.tx = nx; e.ty = ny; e.moving = true; e.prog = 0; return true;
}
function stepEntity(e) {
  if (!e.moving) return;
  e.prog += e.speed || 1;
  if (e.prog >= 16) { e.x = e.tx; e.y = e.ty; e.moving = false; e.prog = 0; e.step = (e.step || 0) + 1; if (e.onArrive) e.onArrive(e); }
}
function entPos(e) { if (!e.moving) return [e.x * 16, e.y * 16]; const [dx, dy] = DIRV[e.dir]; return [e.x * 16 + dx * e.prog, e.y * 16 + dy * e.prog]; }
async function moveEnt(e, path, ghost) {
  for (const ch of path) {
    if (ch === '.') { await frames(16); continue; }
    const dir = CH2DIR[ch]; let tries = 0;
    while (!startMove(e, dir, ghost)) { if (++tries > 40) break; await frames(6); }
    if (e.moving) await until(() => !e.moving);
  }
}
function npc(id) { return G.npcs.find(n => n.id === id && !n.gone); }
function moveNpc(id, path, ghost) { const n = typeof id === 'string' ? npc(id) : id; return n ? moveEnt(n, path, ghost) : Promise.resolve(); }
function movePlayer(path) { return moveEnt(G.p, path); }
function face(id, dir) { const n = typeof id === 'string' ? npc(id) : id; if (n) n.dir = dir; }
function addNpc(def) { const n = Object.assign({ dir: 'down', moving: false, prog: 0, step: 0, speed: 1, pi: 0, wait: 0 }, def); G.npcs.push(n); return n; }
function removeNpc(id) { G.npcs = G.npcs.filter(n => n.id !== id); }
function emote(id, ch, t) { const n = typeof id === 'string' ? (id === 'player' ? G.p : npc(id)) : id; if (n) G.emotes.push({ e: n, ch: ch || '!', t: t || 50 }); }
function mapMusic() { const m = G.map; if (!m) return null; return typeof m.music === 'function' ? m.music() : m.music; }
function isNight() { const m = G.map; return m && (typeof m.night === 'function' ? m.night() : m.night); }

function loadMap(id, x, y, dir) {
  const m = MAPS[id];
  G.map = m; G.mapId = id; G.mode = 'world';
  Object.assign(G.p, { x, y, dir: dir || 'down', moving: false, prog: 0, onArrive: onPlayerArrive });
  G.npcs = (m.npcs || []).filter(n => !n.when || n.when()).map(n => addNpcRaw(n));
  G.emotes = [];
  music(mapMusic());
}
function addNpcRaw(n) { return Object.assign({ dir: 'down', moving: false, prog: 0, step: 0, speed: 1, pi: 0, wait: 0 }, n); }
async function warpTo(id, x, y, dir) {
  sfx('door'); await fadeTo(-3, 3);
  loadMap(id, x, y, dir);
  await fadeTo(0, 3);
  if (G.map.onEnter) await G.map.onEnter();
}
function onPlayerArrive(p) {
  if (G.busy || UI.length) return;
  const k = p.x + ',' + p.y;
  const w = G.map.warps && G.map.warps[k];
  if (w) { run(typeof w === 'function' ? w : () => warpTo(...w)); return; }
  const s = G.map.steps && G.map.steps[k];
  if (s) run(s);
}

function playerControl() {
  const p = G.p;
  if (p.moving) return;
  if (pressed.start) { run(startMenu); return; }
  if (pressed.select) { G.observer = !G.observer; sfx(G.observer ? 'ping' : 'back'); toast(G.observer ? 'OBSERVER MODE: ON' : 'OBSERVER MODE: OFF'); return; }
  if (pressed.a) { interact(); return; }
  const d = held.up ? 'up' : held.down ? 'down' : held.left ? 'left' : held.right ? 'right' : null;
  if (!d) { p.hold = 0; p.chain = false; return; }
  if (d !== p.dir && !p.chain) { p.dir = d; p.hold = 0; return; }
  p.hold = (p.hold || 0) + 1;
  if (p.hold < 4 && !p.chain) return;
  p.speed = held.b ? 2 : 1;
  if (!startMove(p, d)) { p.chain = false; if (!p.bumpT) { sfx('bump'); p.bumpT = 16; } }
}
function interact() {
  const p = G.p, [dx, dy] = DIRV[p.dir], fx = p.x + dx, fy = p.y + dy;
  const n = npcAt(fx, fy);
  if (n) {
    if (!n.fixedFace) n.dir = OPP[p.dir];
    if (G.observer && n.secret && !G.flags['sec_' + n.id]) { run(readSecret, n); return; }
    if (n.talk) run(n.talk, n);
    return;
  }
  const ob = G.map.objects && G.map.objects[fx + ',' + fy];
  if (ob) { run(ob); return; }
  const tt = TILE_TEXT[tileAt(fx, fy)];
  if (tt) run(() => say(null, tt));
  else if (tileAt(fx, fy) === 'D') run(() => say(null, 'The door is locked.'));
}
async function readSecret(n) {
  const s = n.secret;
  if (lvl('intel') < s.lv) { await say(null, `You can't read this one yet. (INTEL Lv${s.lv})`); return; }
  G.flags['sec_' + n.id] = true;
  sfx('ping');
  await say('OBSERVE', s.text);
  await gainXP('intel', 1);
  if (s.flag) G.flags[s.flag] = true;
  if (s.seed) await plant(s.seed);
}
function worldUpdate() {
  const p = G.p;
  if (p.bumpT) p.bumpT--;
  const wasMoving = p.moving;
  stepEntity(p);
  if (wasMoving && !p.moving) {
    const d = held.up ? 'up' : held.down ? 'down' : held.left ? 'left' : held.right ? 'right' : null;
    p.chain = d === p.dir;
  }
  for (const n of G.npcs) stepEntity(n);
  if (free()) {
    playerControl();
    for (const n of G.npcs) { if (n.patrol) patrolTick(n); }
    for (const n of G.npcs) { if (n.sight && n.onSpot && sightCheck(n)) { run(n.onSpot, n); break; } }
  }
}
function patrolTick(n) {
  if (n.moving) return;
  if (n.wait > 0) { n.wait--; return; }
  const ch = n.patrol[n.pi % n.patrol.length];
  if (ch === '.') { n.wait = 20; n.pi++; return; }
  if (startMove(n, CH2DIR[ch])) n.pi++;
  else n.wait = 10;
}
function sightTiles(n) {
  const out = []; const [dx, dy] = DIRV[n.dir];
  let x = n.moving ? n.tx : n.x, y = n.moving ? n.ty : n.y;
  for (let k = 0; k < n.sight; k++) { x += dx; y += dy; if (tileSolid(x, y) || npcAt(x, y, n)) break; out.push([x, y]); }
  return out;
}
function sightCheck(n) {
  const p = G.p;
  return sightTiles(n).some(([x, y]) => (p.x === x && p.y === y) || (p.moving && p.tx === x && p.ty === y));
}

/* ---------------- WORLD RENDER ---------------- */
function camera() {
  const m = G.map, mw = m.rows[0].length * 16, mh = m.rows.length * 16;
  const [px, py] = entPos(G.p);
  let cx = px - 72, cy = py - 64;
  cx = mw <= W ? (mw - W) / 2 : Math.max(0, Math.min(mw - W, cx));
  cy = mh <= H ? (mh - H) / 2 : Math.max(0, Math.min(mh - H, cy));
  return [Math.round(cx), Math.round(cy)];
}
function spriteFrame(e) {
  const walk = e.moving && e.prog < 8;
  const st = (e.step || 0) % 2 === 1;
  if (e.dir === 'down') return [walk ? 'down1' : 'down0', walk && st];
  if (e.dir === 'up') return [walk ? 'up1' : 'up0', walk && st];
  return [walk ? 'side1' : 'side0', e.dir === 'right'];
}
function drawEnt(e, spr, cx, cy) {
  const [px, py] = entPos(e);
  const [k, flip] = spriteFrame(e);
  blit(spr[k], px - cx, py - cy - 4 + (e.yo || 0), { flip });
}
function drawWorld() {
  rect(0, 0, W, H, 3);
  const m = G.map, [cx, cy] = camera(), sh = isNight() ? 1 : 0;
  const x0 = Math.floor(cx / 16), y0 = Math.floor(cy / 16);
  for (let ty = y0; ty <= y0 + 10; ty++) for (let tx = x0; tx <= x0 + 11; tx++) {
    if (ty < 0 || tx < 0 || ty >= m.rows.length || tx >= m.rows[0].length) continue;
    const t = TILES[m.rows[ty][tx]] || TILES.x;
    blit(t, tx * 16 - cx, ty * 16 - cy, { shift: sh });
  }
  for (const l of m.labels || []) {
    const w = [...l.t].length * 6 + 3;
    rect(l.px - cx - 1, l.py - cy - 2, w, 11, 3); text(l.t, l.px - cx + 1, l.py - cy, 0);
  }
  if (G.observer) for (const n of G.npcs) if (n.sight && !n.gone) for (const [x, y] of sightTiles(n)) {
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) if ((i + j + (G.frame >> 2)) % 4 === 0) pset(x * 16 - cx + i, y * 16 - cy + j, 3);
  }
  const ents = G.npcs.filter(n => !n.gone && !n.hidden).map(n => ({ e: n, spr: SPR[n.ch] }));
  ents.push({ e: G.p, spr: SPR.izaya });
  ents.sort((a, b) => entPos(a.e)[1] - entPos(b.e)[1]);
  for (const o of ents) drawEnt(o.e, o.spr, cx, cy);
  if (G.observer) for (const s of m.spots || []) if (!s.when || s.when()) bubble(s.x * 16 - cx + 3, s.y * 16 - cy - 12, '?');
  if (G.observer) for (const n of G.npcs) {
    if (!n.secret || n.gone || G.flags['sec_' + n.id]) continue;
    const [px, py] = entPos(n); const can = lvl('intel') >= n.secret.lv;
    bubble(px - cx + 3, py - cy - 16, can ? '?' : '§');
  }
  G.emotes = G.emotes.filter(em => em.t-- > 0);
  for (const em of G.emotes) { const [px, py] = entPos(em.e); bubble(px - cx + 3, py - cy - 17, em.ch); }
  if (G.observer) { frame(0, 0, W, H, 3); frame(1, 1, W - 2, H - 2, 1); }
  if (G.time > 0 || G.flags.showClock) { box(118, 0, 42, 15); text('◷' + G.time, 125, 4, 3); text(G.observer ? '*' : '', 150, 4, 3); }
}
function bubble(x, y, ch) { rect(x, y, 11, 11, 0); frame(x, y, 11, 11, 3); pset(x + 5, y + 11, 3); pset(x + 4, y + 11, 3); text(ch, x + 3, y + 2, 3); }

/* ---------------- PROGRESSION ---------------- */
async function gainXP(s, n) {
  const before = lvl(s);
  G.xp[s] = (G.xp[s] || 0) + n;
  toast(`${STAT_SHORT[s]} +${n}xp`);
  if (lvl(s) > before) { sfx('lvl'); await say(null, `${STAT_NAMES[s]} rose to Lv${lvl(s)}!`); }
}
function rel(id, d) {
  G.rel[id] = Math.max(-100, Math.min(100, (G.rel[id] || 0) + d));
  toast(`${REL_NAMES[id]} ♥${d > 0 ? '+' : ''}${d}`);
}
async function plant(id) {
  if (G.seeds[id]) return;
  G.seeds[id] = 1; sfx('seed');
  await say(null, `✦ Seed planted: ${SEEDS[id].n}`);
}
async function bloom(id, txt) {
  if (!G.seeds[id]) return false;
  G.bloomed[id] = true; sfx('seed');
  await say(null, `★ ${SEEDS[id].n} blooms!`);
  if (txt) await say(null, txt);
  return true;
}
async function spend() {
  if (G.time <= 0) { await say(null, 'No time left. ◷0 — move the story forward.'); return false; }
  G.time--; toast(`◷ ${G.time} left`); return true;
}
async function card(title, sub) {
  await fadeTo(3);
  G.card = { title, sub }; const pm = G.mode; G.mode = 'card';
  await fadeTo(0);
  await Promise.race([frames(150), until(() => pressed.a || pressed.start)]);
  await fadeTo(3);
  G.card = null; G.mode = pm === 'card' ? 'world' : pm;
}
function drawCard() {
  rect(0, 0, W, H, 3);
  textC(G.card.title, 52, 0);
  rect(40, 64, 80, 1, 1);
  wrap(G.card.sub, 24).forEach((l, k) => textC(l, 72 + k * 11, 1));
}

/* ---------------- BATTLE ---------------- */
const MOVES = [
  { id: 'charm', n: 'CHARM', type: 'CHARM', pow: 6, stat: 'manip', d: 'CHARM: A smile with a hook in it.' },
  { id: 'reason', n: 'REASON', type: 'LOGIC', pow: 6, stat: 'foresight', d: 'LOGIC: Calm, patient, cold.' },
  { id: 'needle', n: 'NEEDLE', type: 'PROVOKE', pow: 9, stat: 'manip', rage: 1, d: 'PROVOKE: Poke the sore spot. They hit back harder.' },
  { id: 'expose', n: 'EXPOSE', type: 'INTEL', pow: 11, stat: 'intel', pp: 2, req: { stat: 'intel', lv: 2 }, d: 'INTEL: Reveal a buried secret. 2 uses.' },
  { id: 'mate', n: 'CHECKMATE', type: 'LOGIC', pow: 18, stat: 'foresight', fin: true, req: { stat: 'foresight', lv: 3 }, d: 'LOGIC: Finisher. Only works at half resolve or less.' },
];
async function battle(def) {
  const pm = G.mode, pmus = AU.track;
  sfx('alarm');
  for (let k = 0; k < 3; k++) { G.fade = -3; await frames(4); G.fade = 0; await frames(4); }
  await fadeTo(3, 3);
  const rv = def.rel ? (G.rel[def.rel] || 0) : 0;
  const max = Math.max(15, def.hp - Math.round(rv / 4) - (def.bonus ? def.bonus() : 0));
  const mh = 20 + 4 * lvl('foresight');
  const B = G.B = { def, foe: { hp: max, max, rage: 0 }, me: { hp: mh, max: mh }, pp: { expose: 2 }, shake: 0, meShake: 0, turn: 0, slide: 96 };
  G.mode = 'battle'; music('battle');
  await fadeTo(0, 3);
  while (B.slide > 0) { B.slide = Math.max(0, B.slide - 3); await frames(1); }
  await say(null, def.intro);
  let result = null;
  while (!result) {
    const act = await ask(null, [{ t: 'TALK', v: 'talk' }, { t: 'READ', v: 'read' }, { t: 'DODGE', v: 'dodge' }, { t: 'FLEE', v: 'flee' }], { grid: true });
    let guard = false;
    if (act === 'talk') {
      const items = MOVES.map(m => ({ t: m.n + (m.pp ? ` ${B.pp[m.id]}/${m.pp}` : ''), v: m.id, req: m.req, d: m.d, dis: m.pp && B.pp[m.id] <= 0, disWhy: '§ No uses left' }));
      const mv = await ask(null, items, { cancel: true, pos: 'bottom' });
      if (!mv) continue;
      const m = MOVES.find(x => x.id === mv);
      if (m.pp) B.pp[m.id]--;
      await say(null, `IZAYA used ${m.n}!`);
      if (def.immune) { sfx('bump'); await say(null, `It had no effect on ${def.name}...`); }
      else if (m.fin && B.foe.hp > B.foe.max / 2) { sfx('bump'); await say(null, "Too early. The board isn't ready."); }
      else {
        let mult = 1;
        if ((def.weak || []).includes(m.type)) mult = 2;
        if ((def.resist || []).includes(m.type)) mult = 0.5;
        const dmg = Math.max(1, Math.round(m.pow * (0.8 + 0.2 * lvl(m.stat)) * mult * (0.85 + Math.random() * 0.15)));
        B.foe.hp = Math.max(0, B.foe.hp - dmg); B.shake = 14; sfx('hit');
        await frames(16);
        if (mult > 1) await say(null, 'It struck a nerve!');
        else if (mult < 1) await say(null, `${def.name} shrugged it off.`);
        if (m.rage) { B.foe.rage++; await say(null, `${def.name} is getting angry!`); }
      }
    } else if (act === 'read') {
      G.flags['read_' + def.ch] = true;
      await say(null, `IZAYA studies ${def.name}...`);
      await say(null, def.read);
    } else if (act === 'dodge') {
      guard = true; const h = 4 + 2 * lvl('escape');
      B.me.hp = Math.min(B.me.max, B.me.hp + h); sfx('ok');
      await say(null, `IZAYA sidesteps, smiling. Composure +${h}.`);
    } else if (act === 'flee') {
      if (def.noFlee) { await say(null, "Run? Now? Where's the fun in that?"); continue; }
      sfx('door'); await say(null, def.immune ? 'Time to run!' : 'IZAYA slips away into the crowd.');
      result = 'flee'; break;
    }
    if (B.foe.hp <= 0) { result = 'win'; break; }
    B.turn++;
    const c = def.counters[Math.floor(Math.random() * def.counters.length)];
    await say(null, c.t);
    if (Math.random() < 0.06 * lvl('foresight') && !def.immune) { sfx('ok'); await say(null, 'You saw it coming! No damage.'); }
    else {
      const d = Math.max(1, Math.round(c.d * (1 + 0.25 * B.foe.rage) * (guard ? 0.5 : 1)));
      B.me.hp = Math.max(0, B.me.hp - d); B.meShake = 14; sfx('hit'); await frames(16);
    }
    if (B.me.hp <= 0) { result = 'lose'; break; }
    if (def.forceFleeAfter && B.turn >= def.forceFleeAfter) { await say(null, def.forceText || 'RUN!'); result = 'flee'; }
  }
  if (result === 'win') { sfx('lvl'); await say(null, def.winText || `${def.name}'s resolve broke!`); G.wins++; }
  if (result === 'lose') await say(null, def.loseText || 'IZAYA lost his composure... and laughed it off.');
  await fadeTo(3, 3);
  G.mode = pm; G.B = null; music(pmus);
  await fadeTo(0, 3);
  return result;
}
function drawBattle() {
  const B = G.B; rect(0, 0, W, H, 0);
  for (let y = 0; y < 96; y += 6) rect(0, y, W, 1, (y / 6) % 3 === 0 ? 1 : 0);
  const sl = B.slide;
  const fx = 104 + sl + (B.shake ? ((B.shake-- >> 1) % 2 ? 2 : -2) : 0);
  rect(96 + sl, 38, 56, 4, 1); rect(100 + sl, 42, 48, 2, 2);
  if (!(B.shake % 4 === 1)) blit(SPR[B.def.ch].down0, fx, 6, { scale: 2 });
  box(2, 4, 82, 30); text(B.def.name, 8, 9, 3);
  text('RES', 8, 21, 3); bar(30, 22, 48, B.def.immune ? 1 : B.foe.hp / B.foe.max);
  const mx = 14 - sl + (B.meShake ? ((B.meShake-- >> 1) % 2 ? 2 : -2) : 0);
  rect(4 - sl, 86, 56, 4, 1); rect(8 - sl, 90, 48, 2, 2);
  blit(SPR.izaya.up0, mx, 54, { scale: 2 });
  box(76, 54, 84, 38); text('IZAYA', 82, 59, 3);
  text('CMP', 82, 70, 3); bar(104, 71, 50, B.me.hp / B.me.max);
  text(`${B.me.hp}/${B.me.max}`, 106, 80, 3);
  if (!UI.length) box(0, 96, 160, 48);
}

/* ---------------- CHASE MINIGAME ---------------- */
const LANES = [36, 60, 84, 108];
function chase(o) {
  o = o || {};
  return new Promise(async res => {
    await fadeTo(3, 3);
    const esc = lvl('escape');
    G.prevMode = G.mode; G.mode = 'chase';
    G.C = { t: 0, dur: o.dur || 1200, lane: 1, x: LANES[1], jump: 0, lives: 1 + esc, obs: [], spawn: 30, throwT: 100,
      scroll: 0, inv: 0, end: null, endT: 0, res, esc, shz: LANES[1], intro: 100, shake: 0, practice: !!o.practice };
    music('chase');
    await fadeTo(0, 3);
  });
}
function chaseUpdate() {
  const C = G.C;
  if (C.end) { if (--C.endT === 0) endChase(); return; }
  C.t++;
  const prog = Math.min(1, C.t / C.dur);
  const sp = (1.5 + 1.7 * prog) * (1 - 0.06 * (C.esc - 1));
  C.scroll += sp;
  if (pressed.left && C.lane > 0) { C.lane--; sfx('sel'); }
  if (pressed.right && C.lane < 3) { C.lane++; sfx('sel'); }
  if (pressed.a && C.jump === 0) { C.jump = 30; sfx('jump'); }
  if (C.jump > 0) C.jump--;
  C.x += (LANES[C.lane] - C.x) * 0.35;
  C.shz += (C.x - C.shz) * 0.05;
  if (C.inv > 0) C.inv--;
  if (C.shake > 0) C.shake--;
  if (C.t > C.intro && C.t < C.dur - 60) {
    if (--C.spawn <= 0) {
      const kinds = ['cone', 'rail', 'sign', 'bike'], k = kinds[Math.floor(Math.random() * 4)];
      const low = k === 'cone' || k === 'rail';
      C.obs.push({ k, lane: Math.floor(Math.random() * 4), y: -16, h: low ? 9 : 14, low, warn: 0 });
      if (prog > 0.45 && Math.random() < 0.35) C.obs.push({ k: kinds[Math.floor(Math.random() * 4)], lane: Math.floor(Math.random() * 4), y: -40, h: 12, low: Math.random() < 0.5, warn: 0 });
      C.spawn = 42 + Math.random() * 30 - prog * 22;
    }
    if (!C.practice && --C.throwT <= 0) {
      sfx('throw');
      C.obs.push({ k: 'vend', lane: Math.random() < 0.5 ? C.lane : Math.floor(Math.random() * 4), y: 20 + Math.random() * 30, h: 15, low: false, warn: 48 });
      C.throwT = 110 - 50 * prog;
    }
  }
  for (const o of C.obs) {
    o.y += sp;
    if (o.warn > 0) { o.warn--; if (o.warn === 0) { sfx('hit'); C.shake = 8; } }
  }
  for (const o of C.obs) {
    if (o.warn > 0 || o.hitDone) continue;
    if (o.lane === C.lane && o.y + o.h > 94 && o.y < 108 && C.inv === 0) {
      if (o.low && C.jump > 3) continue;
      o.hitDone = true; C.lives--; C.inv = 70; C.shake = 12; sfx('hit');
      if (C.lives <= 0) { C.end = 'caught'; C.endT = 100; }
    }
  }
  C.obs = C.obs.filter(o => o.y < 160);
  if (C.t >= C.dur && !C.end) { C.end = 'escaped'; C.endT = 100; sfx('lvl'); }
}
async function endChase() {
  const C = G.C;
  await fadeTo(3, 3);
  G.mode = G.prevMode || 'world'; G.C = null; music(mapMusic());
  await fadeTo(0, 3);
  C.res(C.end === 'escaped');
}
function drawChase() {
  const C = G.C, sx = C.shake ? ((C.shake >> 1) % 2 ? 2 : -2) : 0;
  rect(0, 0, W, H, 1);
  rect(0, 0, 32, H, 0); rect(128, 0, 32, H, 0);
  for (let k = -1; k < 11; k++) {
    const y = Math.floor((k * 16 + C.scroll) % 176) - 16;
    rect(0, y, 32, 1, 1); rect(128, y, 32, 1, 1);
    rect(56 + sx, y + 4, 1, 8, 0); rect(80 + sx, y + 4, 1, 8, 0); rect(104 + sx, y + 4, 1, 8, 0);
  }
  for (let k = -1; k < 4; k++) {
    const y = Math.floor((k * 48 + C.scroll * 0.9) % 192) - 48;
    rect(0, y, 22, 40, 2); rect(3, y + 4, 6, 6, 0); rect(12, y + 4, 6, 6, 1); rect(3, y + 16, 6, 6, 1); rect(12, y + 16, 6, 6, 0);
    rect(138, y + 20, 22, 40, 2); rect(141, y + 24, 6, 6, 1); rect(150, y + 24, 6, 6, 0); rect(141, y + 36, 6, 6, 0);
  }
  rect(31, 0, 1, H, 3); rect(128, 0, 1, H, 3);
  for (const o of C.obs) {
    const cx = LANES[o.lane] + 8 + sx, y = Math.round(o.y);
    if (o.k === 'vend') {
      if (o.warn > 0) {
        const w = 4 + Math.round((48 - o.warn) / 48 * 12);
        rect(cx - (w >> 1), y + 13, w, 3, 2);
        blit(TILES.V, cx - 8, y - o.warn * 2);
      } else blit(TILES.V, cx - 8, y);
    } else if (o.k === 'cone') {
      for (let r = 0; r < 9; r++) { const w = 1 + Math.round(r * 0.9); rect(cx - (w >> 1), y + r, w, 1, r % 3 === 1 ? 0 : 3); }
      rect(cx - 5, y + 9, 10, 2, 3);
    } else if (o.k === 'rail') {
      rect(cx - 10, y, 20, 4, 3); rect(cx - 8, y + 1, 4, 2, 0); rect(cx, y + 1, 4, 2, 0); rect(cx - 9, y + 4, 2, 5, 3); rect(cx + 7, y + 4, 2, 5, 3);
    } else if (o.k === 'sign') {
      rect(cx - 6, y, 12, 8, 3); rect(cx - 5, y + 1, 10, 6, 0); rect(cx - 2, y + 3, 4, 2, 3); rect(cx - 1, y + 8, 2, 6, 3);
    } else {
      frame(cx - 9, y + 6, 7, 7, 3); frame(cx + 2, y + 6, 7, 7, 3); rect(cx - 6, y + 4, 12, 2, 3); rect(cx - 2, y, 2, 5, 3);
    }
  }
  const jo = C.jump > 0 ? Math.round(Math.sin((30 - C.jump) / 30 * Math.PI) * 14) : 0;
  rect(Math.round(C.x) + 3 + sx, 108, 10, 2, 2);
  if (!(C.inv && (C.inv >> 2) % 2)) {
    const run2 = (C.t >> 3) % 2;
    blit(SPR.izaya[run2 ? 'up1' : 'up0'], Math.round(C.x) + sx, 94 - jo, { flip: (C.t >> 4) % 2 === 1 });
  }
  if (!C.practice) {
    const sy = 124 + Math.round(Math.sin(C.t / 6) * 2);
    blit(SPR.shizuo[(C.t >> 3) % 2 ? 'up1' : 'up0'], Math.round(C.shz) + sx, sy);
    if ((C.t >> 3) % 6 < 2) { text('!', Math.round(C.shz) + 18, sy, 3); }
  }
  rect(0, 0, W, 10, 3);
  frame(44, 2, 72, 6, 0); rect(45, 3, Math.round(70 * Math.min(1, C.t / C.dur)), 4, 1);
  text('♥'.repeat(Math.max(0, C.lives)), 3, 2, 0);
  text(C.practice ? 'TRAIN' : 'RUN!', 122, 2, 0);
  if (C.t < C.intro) {
    box(16, 34, 128, 40);
    textC(C.practice ? 'PARKOUR DRILL' : 'SHIZUO IS COMING!', 42, 3);
    textC('◀ ▶ switch lanes', 53, 3);
    textC('A: vault low stuff', 63, 3);
  }
  if (C.end) { box(30, 54, 100, 26); textC(C.end === 'escaped' ? 'ESCAPED!' : 'CAUGHT!', 62, 3, 2); }
}

/* ---------------- TITLE ---------------- */
const SKY = [];
for (let i = 0; i < 24; i++) SKY.push({ x: i * 14, w: 10 + (i * 7) % 9, h: 22 + (i * 13) % 34 });
function drawTitle() {
  rect(0, 0, W, H, 0);
  rect(0, 0, W, 60, 1);
  rect(118, 14, 12, 12, 0); rect(121, 13, 6, 1, 0); rect(121, 26, 6, 1, 0);
  const off = (G.frame * 0.25) % 336;
  for (const b of SKY) {
    let x = Math.round(b.x - off); if (x < -20) x += 336;
    rect(x, 100 - b.h, b.w, b.h + 44, 2);
    for (let y = 104 - b.h; y < 98; y += 6) for (let wx = x + 2; wx < x + b.w - 2; wx += 4) if (((wx * 7 + y * 3) >> 2) % 3 === 0) rect(wx, y, 2, 2, 0);
  }
  rect(0, 100, W, 44, 3);
  rect(56, 92, 48, 8, 3); rect(56, 91, 48, 1, 2);
  const fl = (G.frame >> 5) % 2;
  blit(SPR.izaya[fl ? 'down1' : 'down0'], 72, 76, { flip: fl === 1 });
  text('IKEBUKURO', 26, 26, 3, 2); text('IKEBUKURO', 25, 25, 0, 2);
  text('GAMBIT', 44, 44, 3, 2); text('GAMBIT', 43, 43, 0, 2);
  textC('an Izaya Orihara story', 10, 3);
  if (!UI.length && (G.frame >> 5) % 2) textC('PRESS START', 116, 0);
  textC('fan game · for Firo', 132, 1);
}

/* ---------------- MENUS & SAVE ---------------- */
function saveGame() {
  const s = { mapId: G.mapId, x: G.p.x, y: G.p.y, dir: G.p.dir, flags: G.flags, xp: G.xp, rel: G.rel, seeds: G.seeds, bloomed: G.bloomed, chapter: G.chapter, time: G.time, wins: G.wins, yen: G.yen };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (!s) return false;
    resetState();
    Object.assign(G, { flags: s.flags || {}, xp: Object.assign(G.xp, s.xp), rel: Object.assign(G.rel, s.rel), seeds: s.seeds || {}, bloomed: s.bloomed || {}, chapter: s.chapter, time: s.time, wins: s.wins || 0, yen: s.yen === undefined ? 10000 : s.yen });
    loadMap(s.mapId, s.x, s.y, s.dir);
    return true;
  } catch (e) { return false; }
}
function saveOpts() { try { localStorage.setItem(OPT_KEY, JSON.stringify(G.opt)); } catch (e) {} }
function loadOpts() { try { Object.assign(G.opt, JSON.parse(localStorage.getItem(OPT_KEY)) || {}); } catch (e) {} if (!PALETTES[G.opt.pal]) G.opt.pal = 0; }

function drawStats() {
  rect(0, 0, W, H, 0); box(0, 0, 160, 144);
  text('IZAYA ORIHARA', 8, 8, 3); text('Informant · Shinjuku', 8, 18, 2);
  let y = 32;
  for (const s of ['manip', 'intel', 'escape', 'foresight']) {
    const l = lvl(s), xp = G.xp[s] || 0, lo = LV[l - 1], hi = LV[l];
    text(STAT_NAMES[s], 8, y, 3); text('Lv' + l, 130, y, 3);
    bar(8, y + 9, 144, hi === undefined ? 1 : (xp - lo) / (hi - lo));
    y += 20;
  }
  text(`WINS ${G.wins}   SEEDS ${Object.keys(G.seeds).length}/${Object.keys(SEEDS).length}`, 8, 116, 3);
  text(`TIME ◷${G.time}   CASH ¥${(G.yen || 0).toLocaleString('en-US')}`, 8, 128, 2);
}
function drawPeople() {
  rect(0, 0, W, H, 0); box(0, 0, 160, 144);
  text('PEOPLE', 8, 7, 3); text('-100   0  +100', 66, 7, 2);
  let y = 20;
  for (const k in REL_NAMES) {
    const v = G.rel[k] || 0;
    text(REL_NAMES[k], 8, y, 3);
    frame(64, y, 62, 7, 3); rect(65, y + 1, 60, 5, 0); rect(94, y - 1, 2, 9, 3);
    const w = Math.round(Math.abs(v) / 100 * 29);
    if (v > 0) rect(96, y + 1, w, 5, 3); else if (v < 0) rect(94 - w, y + 1, w, 5, 2);
    text((v > 0 ? '+' : '') + v, 130, y, 3);
    y += 14;
  }
  text(G.rel.shizuo <= -70 ? 'Shizuo is hunting you.' : 'Shizuo hates you. Normal.', 8, 132, 2);
}
function drawSchemes(p) {
  rect(0, 0, W, H, 0); box(0, 0, 160, 106);
  text('SCHEMES', 8, 6, 3);
  const ids = Object.keys(SEEDS);
  ids.forEach((id, k) => {
    const y = 15 + k * 9, has = G.seeds[id];
    if (k === p.sel) text('▶', 6, y, 3);
    text(has ? (G.bloomed[id] ? '★ ' : '✦ ') + SEEDS[id].n.slice(0, 19) : '? ???', 14, y, has ? 3 : 1);
  });
  const id = ids[p.sel];
  drawBanner(G.seeds[id] ? SEEDS[id].d : 'An unplanted seed. Some choices only appear for the right person, at the right time.', true);
}
async function startMenu() {
  sfx('ok');
  for (;;) {
    const r = await ask(null, [{ t: 'STATS', v: 's' }, { t: 'PEOPLE', v: 'p' }, { t: 'SCHEMES', v: 'k' }, { t: 'SAVE', v: 'v' }, { t: 'OPTION', v: 'o' }, { t: 'EXIT', v: 'x' }], { pos: 'menu', cancel: true });
    if (r === null || r === 'x') break;
    if (r === 's') await panel(drawStats);
    if (r === 'p') await panel(drawPeople);
    if (r === 'k') await panel(drawSchemes, { n: Object.keys(SEEDS).length });
    if (r === 'v') { await say(null, saveGame() ? 'Progress saved. The board remembers.' : 'Save failed.'); break; }
    if (r === 'o') await optionsMenu();
  }
}
async function optionsMenu() {
  for (;;) {
    const r = await ask(null, [
      { t: 'PALETTE: ' + PALETTES[G.opt.pal].name, v: 'pal', d: 'Cycle Game Boy color palettes.' },
      { t: 'MUSIC: ' + (G.opt.music ? 'ON' : 'OFF'), v: 'mus' },
      { t: 'SOUND: ' + (G.opt.sfx ? 'ON' : 'OFF'), v: 'sfx' },
      { t: 'DONE', v: 'x' }], { pos: 'menu', cancel: true });
    if (r === null || r === 'x') break;
    if (r === 'pal') { G.opt.pal = (G.opt.pal + 1) % PALETTES.length; updateTheme(); }
    if (r === 'mus') G.opt.music = !G.opt.music;
    if (r === 'sfx') G.opt.sfx = !G.opt.sfx;
    saveOpts();
  }
}
function updateTheme() { const c = PALETTES[G.opt.pal].c; document.documentElement.style.setProperty('--scr', c[3]); document.documentElement.style.setProperty('--hi', c[1]); }

/* ---------------- MAIN LOOP ---------------- */
function present() {
  const p = RGB[G.opt.pal], d = imgData.data, f = G.fade;
  for (let i = 0; i < W * H; i++) {
    let c = fb[i];
    if (f > 0) c = Math.min(3, c + f); else if (f < 0) c = Math.max(0, c + f);
    const q = p[c], k = i << 2;
    d[k] = q[0]; d[k + 1] = q[1]; d[k + 2] = q[2]; d[k + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}
function tick() {
  G.frame++;
  updateInput();
  for (let i = G.timers.length - 1; i >= 0; i--) { if (--G.timers[i].n <= 0) { const t = G.timers.splice(i, 1)[0]; t.res(); } }
  for (let i = G.waiters.length - 1; i >= 0; i--) { if (G.waiters[i].cond()) { const w = G.waiters.splice(i, 1)[0]; w.res(); } }
  const top = UI[UI.length - 1];
  if (top) { top.update(); top.age++; }
  if (G.mode === 'world') worldUpdate();
  else if (G.mode === 'chase' && !UI.length) chaseUpdate();
  else if (G.mode === 'title' && !UI.length && !G.busy && (pressed.start || pressed.a)) run(titleMenu);
  if (G.toasts.length && --G.toasts[0].t <= 0) G.toasts.shift();
  musicTick();
}
function render() {
  if (G.mode === 'world') drawWorld();
  else if (G.mode === 'battle') drawBattle();
  else if (G.mode === 'chase') drawChase();
  else if (G.mode === 'chat') drawChat();
  else if (G.mode === 'card') drawCard();
  else if (G.mode === 'title') drawTitle();
  else if (G.mode === 'results') drawResults();
  for (const w of UI) w.draw();
  if (G.toasts.length && (G.mode === 'world' || G.mode === 'chat') && !UI.some(w => w.full && G.mode === 'world')) {
    const s = G.toasts[0].s, w = [...s].length * 6 + 10;
    const y = G.mode === 'chat' ? 13 : (G.mode === 'world' ? 16 : 0);
    box(0, y, w, 14); text(s, 5, y + 4, 3);
  }
  present();
}
let acc = 0, last = 0;
function loop(t) {
  if (!last) last = t;
  acc += Math.min(100, t - last); last = t;
  let n = 0;
  while (acc >= 1000 / 60 && n < 4) { tick(); acc -= 1000 / 60; n++; }
  if (n >= 4) acc = 0;
  render();
  requestAnimationFrame(loop);
}
function boot() {
  cv = document.getElementById('screen');
  ctx = cv.getContext('2d');
  imgData = ctx.createImageData(W, H);
  loadOpts(); updateTheme();
  resetState(); G.mode = 'title'; music('title');
  setupInput();
  requestAnimationFrame(loop);
}
if (typeof module !== 'undefined') module.exports = { FONT, TPL, TILES, SPR, wrap, reqOK };
