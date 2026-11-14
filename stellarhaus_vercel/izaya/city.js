'use strict';
/* =========================================================
   IKEBUKURO GAMBIT — the full city, Izaya's hidden HQ, FLEA OS
   ========================================================= */

/* ---------------- CITY BUILDER (60 x 44 tiles) ----------------
   West: Raira Academy, Metropolitan Theatre, West Gate Park, Shinra's apartment
   Middle: Ikebukuro Station (walk-through concourse)
   East: Otome Road, Russia Sushi, Sunshine 60 Street, Sunshine City,
         the back alleys, and the closed mahjong parlor hiding the HQ.  */
function buildIkebukuro() {
  const MW = 60, MH = 44;
  const g = Array.from({ length: MH }, () => Array(MW).fill('^'));
  const R = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < MH && x >= 0 && x < MW) g[y][x] = c; };
  const P = (x, y, c) => { g[y][x] = c; };
  const dash = (x0, x1, y) => { for (let x = x0; x <= x1; x++) if (x % 2 === 0) P(x, y, '='); };
  const block = (x0, x1, y0, yF, front) => { R(x0, y0, x1, yF - 1, '^'); R(x0, yF, x1, yF, '#'); R(x0, yF + 1, x1, yF + 1, front || 'B'); };

  // ---- West side
  block(1, 14, 2, 6, '#'); P(7, 7, 'D'); P(8, 7, 'D');                 // Raira Academy
  R(1, 8, 14, 10, 'R'); R(1, 11, 14, 11, 'F'); P(7, 11, 'R'); P(8, 11, 'R');
  block(15, 18, 2, 10, 'B'); P(16, 11, 'D');                           // Metropolitan Theatre
  R(0, 12, 21, 12, ','); R(0, 13, 20, 15, '.'); dash(0, 18, 14);         // West Exit road
  R(19, 12, 20, 41, '.'); R(18, 16, 18, 38, ','); R(21, 12, 21, 41, ',');
  R(0, 16, 17, 16, ',');
  R(0, 17, 17, 30, 'g');                                               // West Gate Park
  for (let x = 0; x <= 17; x += 2) { P(x, 17, 'T'); P(x, 30, 'T'); }
  for (let y = 17; y <= 30; y += 2) P(0, y, 'T');
  R(1, 23, 17, 23, 'R'); R(9, 17, 9, 30, 'R');
  R(8, 22, 10, 24, 'O');
  [[4, 20], [14, 20], [4, 28], [14, 28]].forEach(([x, y]) => P(x, y, 'h'));
  [[6, 19], [13, 25], [3, 21], [15, 26]].forEach(([x, y]) => P(x, y, 'T'));
  R(0, 31, 17, 31, ',');
  block(1, 12, 32, 36, 'B'); P(6, 37, 'D');                            // Shinra's apartment
  block(13, 17, 32, 36, 'B'); P(15, 37, 'D');                          // konbini

  // ---- Station
  R(22, 2, 29, 37, 'q'); R(22, 19, 29, 20, 'f'); R(24, 18, 27, 18, 'G');

  // ---- South road (full width)
  R(0, 38, 59, 38, ','); R(0, 39, 59, 41, '.'); dash(0, 59, 40); R(0, 42, 59, 42, ',');
  [19, 20, 30, 31].forEach(x => P(x, 38, 'z'));

  // ---- East side
  block(30, 59, 2, 6, 'B'); [34, 40, 47, 54].forEach(x => P(x, 7, 'D')); // Otome Road
  R(30, 8, 59, 8, ','); R(30, 9, 59, 11, '.'); dash(30, 59, 10); R(30, 12, 59, 12, ',');
  R(30, 8, 31, 41, '.'); R(32, 12, 32, 38, ',');
  block(33, 51, 13, 15, 'B');                                          // Russia Sushi row
  R(34, 15, 40, 15, 'n'); P(37, 16, 'D'); P(44, 16, 'D'); R(47, 15, 51, 15, 'n'); P(49, 16, 'D');
  R(52, 12, 52, 38, ',');
  block(53, 59, 13, 35, 'B'); P(56, 36, 'D'); R(53, 37, 59, 37, ',');   // Sunshine City
  R(32, 17, 51, 17, ','); R(32, 18, 51, 20, '.'); dash(32, 51, 19); R(32, 21, 51, 21, ','); // Sunshine 60 St.
  block(33, 51, 22, 25, 'B'); [36, 42, 49].forEach(x => P(x, 26, 'D'));
  R(33, 27, 51, 27, 'a');                                              // alley
  block(33, 51, 28, 30, '#'); P(37, 31, 'D'); P(47, 31, 'H');          // mahjong parlor (HQ)
  R(33, 32, 51, 33, 'a'); R(52, 32, 52, 33, 'F');                      // back alley, dead end
  block(33, 51, 34, 36, 'B'); P(40, 37, 'D');

  // ---- street furniture
  [[33, 17], [51, 21], [2, 12], [45, 8], [35, 38], [17, 12]].forEach(([x, y]) => P(x, y, 'V'));
  [[40, 21], [12, 12], [25, 38], [44, 8], [10, 31], [16, 16], [36, 21], [50, 12], [58, 8]].forEach(([x, y]) => P(x, y, 'L'));
  return g.map(r => r.join(''));
}

const IKE_LABELS = [
  { px: 2 * 16 + 30, py: 4 * 16 + 4, t: 'RAIRA ACADEMY' },
  { px: 15 * 16 + 4, py: 5 * 16, t: 'THEATRE' },
  { px: 1 * 16 + 30, py: 17 * 16 + 4, t: 'WEST GATE PARK' },
  { px: 22 * 16 + 14, py: 10 * 16 + 4, t: 'IKEBUKURO STA.' },
  { px: 33 * 16 + 4, py: 4 * 16 + 4, t: 'OTOME ROAD' },
  { px: 46 * 16 + 4, py: 4 * 16 + 4, t: 'TOKYU HANDS' },
  { px: 34 * 16 + 18, py: 14 * 16 + 2, t: 'RUSSIA SUSHI' },
  { px: 42 * 16 + 4, py: 14 * 16 + 2, t: 'KARAOKE' },
  { px: 53 * 16 + 12, py: 22 * 16, t: 'SUNSHINE 60' },
  { px: 39 * 16 + 4, py: 23 * 16 + 4, t: 'ROOF ACCESS' },
  { px: 44 * 16 + 4, py: 29 * 16 + 2, t: 'MAHJONG-CLOSED' },
  { px: 2 * 16 + 20, py: 34 * 16, t: "SHINRA'S APT" },
];
const IKE_DOORS = {
  '7,7': 'Raira Academy. Classes are over. Mikado will be a student here soon.',
  '8,7': 'Raira Academy. Classes are over. Mikado will be a student here soon.',
  '16,11': 'The Metropolitan Theatre box office. Tonight: a tragedy. Fitting.',
  '6,37': "Shinra's apartment. Celty's spare helmet hangs on a hook inside the door.",
  '15,37': 'A konbini. You buy nothing. You just like watching the cashier read people.',
  '34,7': "Animate. Erika's second home.",
  '40,7': "A manga cafe. Erika's first home.",
  '47,7': 'Tokyu Hands. Everything a person could want, except meaning.',
  '54,7': "A ramen shop. Walker's favorite. He's been banned twice.",
  '44,16': 'A karaoke bar. Someone inside is murdering a love song.',
  '49,16': "Game center. The high score belongs to 'KANRA'. Wasn't you. Probably.",
  '36,26': 'Pachinko. Thousands of silver balls, all falling exactly where physics tells them. Boring.',
  '49,26': 'A maid cafe. The maids recognize you and stop smiling.',
  '37,31': 'A capsule hotel. Fully booked. Everyone in Ikebukuro needs a place to hide.',
  '40,37': "A clinic. Closed. Shinra's legitimate competition.",
  '56,36': 'Sunshine City. The aquarium is closed for the night. The fish are relieved.',
};
const LANDMARKS = [
  { n: 'IKEBUKURO STATION', x: 25, y: 19, d: 'right' },
  { n: 'WEST GATE PARK', x: 18, y: 23, d: 'left' },
  { n: 'RAIRA ACADEMY', x: 7, y: 12, d: 'up' },
  { n: 'OTOME ROAD', x: 36, y: 8, d: 'down' },
  { n: 'RUSSIA SUSHI', x: 36, y: 17, d: 'up' },
  { n: 'SUNSHINE 60', x: 52, y: 21, d: 'right' },
  { n: "SHINRA'S APT", x: 9, y: 38, d: 'up' },
  { n: 'HQ ALLEY', x: 47, y: 32, d: 'up' },
];

/* ---------------- THE HQ ---------------- */
const HQ_MAP = {
  rows: [
    'MMMMMWWZZWQQ',
    'jjjjjjjjjjjj',
    'jjjXjjjjjjjj',
    'jjjjjjjjjCjj',
    'jjjjjjjjjjjj',
    'jjjjjjjjjccj',
    'jpjjjjjjjjij',
    'jjjjjjjjjjjj',
    'xxxxxmxxxxxx',
  ],
  music: 'office',
  warps: { '5,8': ['ikebukuro', 47, 32, 'down'] },
  objects: {
    '3,2': hqLaptop, '0,0': hqMonitors, '1,0': hqMonitors, '2,0': hqMonitors, '3,0': hqMonitors, '4,0': hqMonitors,
    '7,0': appBoard, '8,0': appBoard,
    '10,0': () => N('Your servers. They hold every secret in Ikebukuro, and a few in Tokyo. They hum like a cat.'),
    '11,0': () => N('A backup of the backup. Paranoia is just foresight with a bad reputation.'),
    '9,3': () => appSim(),
    '9,5': hqCouch, '10,5': hqCouch,
    '10,6': () => N('The fridge: ootoro from Simon, energy drinks, and a single carton of milk labeled "BAIT."'),
  },
  onEnter: hqEnter,
  npcs: [],
};
async function hqSecret() {
  if (G.flags.hqFound) return;
  if (!G.observer) { await N('A rusted shutter. A sign: CLOSED FOREVER. ...Forever is a long time.'); await N('(Something about it feels off. Try OBSERVER MODE.)'); return; }
  sfx('ping');
  await say('OBSERVE', 'A hairline seam in the shutter. A keypad hidden behind a loose tile.');
  await N('You type 3-5-3-2. F-L-E-A, if you squint.');
  sfx('door'); G.flags.hqFound = true;
  await N('The shutter clicks. Stairs lead down into the dark.');
  await gainXP('intel', 1);
}
async function hqDoor() { if (G.flags.hqFound) await warpTo('hq', 5, 7, 'up'); }
async function hqEnter() {
  if (G.flags.hqIntro) return;
  G.flags.hqIntro = true;
  await N('Your Ikebukuro safehouse. Nobody knows it exists. Not even Shinra.');
  await I("Monitors, servers, a corkboard full of strings. And my baby: the laptop.");
  await N('The LAPTOP runs FLEA OS: live city cameras, fast travel, dossiers, an info market, a rumor board, and a mind-battle simulator.');
}
async function hqCouch() {
  const r = await ask('Nap on the couch? Restores nothing but your ego.', [{ t: 'Nap', v: 1 }, { t: 'Later', v: 0 }]);
  if (!r) return;
  await fadeTo(3); await wait(30); await fadeTo(0);
  await I('Dreamt I was a god. Woke up and checked: still true.');
}
async function hqMonitors() {
  const t = await appMap();
  if (t) await travel(t);
}
async function hqLaptop() {
  const prevMus = AU.track; music('chat');
  const t = await new Promise(res => pushUI(new Laptop(res)));
  music(prevMus);
  if (t) await travel(t);
}
async function travel(t) {
  if (t.n === 'HQ ALLEY' && G.mapId === 'hq') { await N("You're already here."); return; }
  await warpTo('ikebukuro', t.x, t.y, t.d);
  toast('→ ' + t.n);
}

/* ---------------- FLEA OS ---------------- */
const APPS = [
  { id: 'map', n: 'EYE', d: 'Live city cameras. See who is where. Fast travel anywhere.' },
  { id: 'files', n: 'FILES', d: 'Dossiers: what people want, how to win them, their weak spots.' },
  { id: 'board', n: 'BOARD', d: 'Your scheme web. Hints for seeds you have not planted.' },
  { id: 'market', n: 'MARKET', d: 'Sell secrets you observed. Buy time, gifts, and favors.' },
  { id: 'bbs', n: 'BBS', d: 'The Dollars forum. Post a rumor and bend the city.' },
  { id: 'sim', n: 'SIM', d: 'Rehearse a mind battle against an AI proxy. Free XP.' },
  { id: 'todo', n: 'NEXT', d: 'Ask the board what your next move should be.' },
  { id: 'off', n: 'OFF', d: 'Close the laptop.' },
];
function yenStr(n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0) + 'k' : '' + n; }
function line(x0, y0, x1, y1, c, dotted) {
  x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let e = dx + dy, k = 0;
  for (;;) {
    if (!dotted || (k++ >> 1) % 2 === 0) pset(x0, y0, c);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * e;
    if (e2 >= dy) { e += dy; x0 += sx; }
    if (e2 <= dx) { e += dx; y0 += sy; }
  }
}
const ICONS = {
  map(x, y) { rect(x + 2, y + 6, 18, 6, 3); rect(x + 5, y + 3, 12, 12, 3); rect(x + 7, y + 5, 8, 8, 0); rect(x + 9, y + 7, 4, 4, 3); pset(x + 10, y + 8, 0); },
  files(x, y) { rect(x + 2, y + 3, 8, 3, 2); rect(x + 2, y + 5, 18, 12, 2); frame(x + 2, y + 5, 18, 12, 3); rect(x + 5, y + 2, 12, 4, 0); frame(x + 5, y + 1, 12, 5, 3); },
  board(x, y) { rect(x + 1, y + 2, 20, 14, 2); frame(x + 1, y + 2, 20, 14, 3); line(x + 5, y + 5, x + 16, y + 12, 0); line(x + 16, y + 5, x + 9, y + 12, 0); [[5, 5], [16, 12], [16, 5], [9, 12]].forEach(([a, b]) => rect(x + a - 1, y + b - 1, 3, 3, 3)); },
  market(x, y) { rect(x + 5, y + 2, 12, 14, 3); rect(x + 3, y + 4, 16, 10, 3); rect(x + 7, y + 4, 8, 10, 0); text('¥', x + 8, y + 5, 3); },
  bbs(x, y) { rect(x + 2, y + 2, 18, 11, 3); rect(x + 3, y + 3, 16, 9, 0); rect(x + 5, y + 5, 10, 1, 3); rect(x + 5, y + 8, 7, 1, 3); rect(x + 5, y + 13, 3, 2, 3); pset(x + 5, y + 15, 3); },
  sim(x, y) { rect(x + 8, y + 2, 6, 5, 3); rect(x + 9, y + 7, 4, 5, 3); rect(x + 6, y + 12, 10, 2, 3); rect(x + 5, y + 14, 12, 2, 3); pset(x + 9, y + 3, 0); },
  todo(x, y) { rect(x + 4, y + 1, 14, 16, 3); rect(x + 5, y + 2, 12, 14, 0); for (let k = 0; k < 3; k++) { rect(x + 7, y + 4 + k * 4, 2, 2, k < 2 ? 3 : 1); rect(x + 10, y + 4 + k * 4, 5, 1, 2); } },
  off(x, y) { frame(x + 5, y + 4, 12, 12, 3); rect(x + 10, y + 1, 2, 8, 3); rect(x + 9, y + 3, 4, 1, 0); },
};
class Laptop {
  constructor(res) { this.res = res; this.i = 0; this.busy = false; this.full = true; }
  close(v) { popUI(this); this.res(v); }
  update() {
    if (this.age < 2 || this.busy) return;
    if (rep('left')) { this.i = (this.i + 7) % 8; sfx('sel'); }
    if (rep('right')) { this.i = (this.i + 1) % 8; sfx('sel'); }
    if (rep('up') || rep('down')) { this.i ^= 4; sfx('sel'); }
    if (pressed.b || pressed.start) { sfx('back'); this.close(null); return; }
    if (pressed.a) {
      const a = APPS[this.i]; sfx('ok');
      if (a.id === 'off') { this.close(null); return; }
      this.busy = true;
      openApp(a.id).then(t => { this.busy = false; if (t) this.close(t); }).catch(e => { console.error(e); this.busy = false; });
    }
  }
  draw() {
    if (G.mode !== 'world') return;
    rect(0, 0, W, H, 0);
    for (let y = 13; y < 104; y += 3) for (let x = (y * 5) % 9; x < W; x += 9) pset(x, y, 1);
    rect(0, 0, W, 11, 3); text('FLEA OS', 3, 2, 0); text('♥', 47, 2, 1);
    const st = `¥${yenStr(G.yen)} ◷${G.time}`; text(st, W - 3 - [...st].length * 6, 2, 0);
    APPS.forEach((a, k) => {
      const cx = 3 + (k % 4) * 39, cy = 14 + (k >> 2) * 45;
      if (k === this.i) { rect(cx, cy, 38, 42, 1); frame(cx, cy, 38, 42, 3); }
      ICONS[a.id](cx + 8, cy + 5);
      text(a.n, cx + ((38 - a.n.length * 6) >> 1) + 1, cy + 30, 3);
    });
    box(0, 104, 160, 40);
    const a = APPS[this.i];
    wrap(a.d, 24).slice(0, 3).forEach((l, k) => text(l, 7, 109 + k * 10, 3));
  }
}
async function openApp(id) {
  if (id === 'map') return appMap();
  if (id === 'files') await appFiles();
  if (id === 'board') await appBoard();
  if (id === 'market') await appMarket();
  if (id === 'bbs') await appBBS();
  if (id === 'sim') await appSim();
  if (id === 'todo') await appTodo();
  return null;
}

/* ---- EYE: live cameras + fast travel ---- */
const MINI = { '.': 1, '=': 1, 'z': 1, ',': 0, 'R': 0, 'a': 2, 'f': 0, 'g': 1, 'T': 2, 'O': 0, 'h': 1, 'F': 2, 'V': 2, 'L': 0, 'D': 0, 'H': 3, 'G': 2, 'B': 2, '#': 2, 'n': 2 };
const VIP = ['mikado', 'masaomi', 'celty', 'simon', 'kadota', 'anri', 'shinra', 'shizuo'];
function cityPeople() {
  if (G.mapId === 'ikebukuro') return G.npcs.filter(n => VIP.includes(n.id) && !n.gone).map(n => ({ id: n.id, x: n.x, y: n.y }));
  return (MAPS.ikebukuro.npcs || []).filter(n => VIP.includes(n.id) && (!n.when || n.when())).map(n => ({ id: n.id, x: n.x, y: n.y }));
}
class MapView {
  constructor(res) { this.res = res; this.sel = 0; this.people = cityPeople(); this.full = true; }
  update() {
    if (this.age < 1) return;
    const L = LANDMARKS.length;
    if (rep('up') || rep('left')) { this.sel = (this.sel + L - 1) % L; sfx('sel'); }
    if (rep('down') || rep('right')) { this.sel = (this.sel + 1) % L; sfx('sel'); }
    if (pressed.b) { sfx('back'); popUI(this); this.res(null); return; }
    if (pressed.a) {
      if (G.chapter === 1) { sfx('ok'); popUI(this); this.res(LANDMARKS[this.sel]); }
      else sfx('bump');
    }
  }
  draw() {
    rect(0, 0, W, H, 0);
    rect(0, 0, W, 11, 3); text('EYE · LIVE CCTV', 3, 2, 0);
    if ((G.frame >> 4) % 2) rect(W - 9, 3, 5, 5, 1);
    const rows = MAPS.ikebukuro.rows, ox = 20, oy = 13;
    frame(ox - 1, oy - 1, 122, 90, 3);
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[0].length; x++) {
      const ch = rows[y][x];
      let c = MINI[ch] !== undefined ? MINI[ch] : 3;
      if (ch === 'g' && (x + y) % 2) c = 0;
      if (ch === 'H' && G.flags.hqFound) c = (G.frame >> 3) % 2 ? 0 : 3;
      rect(ox + x * 2, oy + y * 2, 2, 2, c);
    }
    const blink = (G.frame >> 3) % 2;
    if (!G.flags.shizuoGone && !G.flags.shizuoLured && G.chapter === 1) {
      for (let x = 41; x <= 49; x++) if ((x + (G.frame >> 2)) % 3) rect(ox + x * 2, oy + 17 * 2, 2, 2, 3);
      text('S!', ox + 50 * 2 + 1, oy + 14 * 2, 3);
    }
    for (const p of this.people) if (p.id !== 'shizuo') { rect(ox + p.x * 2 - 1, oy + p.y * 2 - 1, 4, 4, blink ? 3 : 0); rect(ox + p.x * 2, oy + p.y * 2, 2, 2, blink ? 0 : 3); }
    if (G.mapId === 'ikebukuro') { rect(ox + G.p.x * 2 - 1, oy + G.p.y * 2 - 1, 4, 4, 3); }
    const L = LANDMARKS[this.sel], lx = ox + L.x * 2 + 1, ly = oy + L.y * 2 + 1;
    line(lx - 6, ly, lx - 3, ly, 3); line(lx + 3, ly, lx + 6, ly, 3); line(lx, ly - 6, lx, ly - 3, 3); line(lx, ly + 3, lx, ly + 6, 3);
    if (blink) frame(lx - 3, ly - 3, 7, 7, 3);
    box(0, 102, 160, 42);
    text('▶ ' + L.n, 7, 107, 3);
    const here = this.people.filter(p => Math.abs(p.x - L.x) + Math.abs(p.y - L.y) <= 6 && p.id !== 'shizuo').map(p => REL_NAMES[p.id]);
    text(here.length ? 'NEAR: ' + here.slice(0, 2).join(', ') : 'NEAR: nobody you know', 7, 118, 2);
    text(G.chapter === 1 ? 'A: TRAVEL  B: BACK' : 'B: BACK (travel: day only)', 7, 129, 3);
  }
}
function appMap() { return new Promise(res => pushUI(new MapView(res))); }

/* ---- FILES: dossiers ---- */
const DOSSIER = {
  mikado:  { role: 'Raira first-year. Just moved here.', wants: 'The extraordinary.', tip: 'Charm him. Dangle mysteries. The Dollars.', battle: 'mikado' },
  masaomi: { role: "Mikado's best friend. Ex-Yellow Scarves.", wants: 'To forget Saki. And you.', tip: 'He hates you. Every word costs.', battle: 'masaomi' },
  celty:   { role: 'Headless courier. The Black Rider.', wants: 'Her head.', tip: 'Pay well. Compliment Shooter. Never ask.' },
  shizuo:  { role: 'Debt collector. Walking disaster.', wants: 'You, flattened.', tip: 'Distance. Rumors. Milk, oddly.', battle: 'shizuo' },
  simon:   { role: 'Russia Sushi tout. Ex-mercenary.', wants: 'Peace. And customers.', tip: 'Buy sushi. Then ask about rumors.' },
  anri:    { role: 'Raira first-year. Very quiet.', wants: 'To live quietly, attached to someone.', tip: 'Help without asking for anything.' },
  kadota:  { role: 'Van crew leader. Maybe a Dollar.', wants: 'A quiet life. Free food.', tip: 'Feed the crew. Respect the van.' },
  shinra:  { role: 'Underground doctor. "Friend."', wants: 'Celty. Only ever Celty.', tip: 'Ask about Celty. Listen for an hour.' },
  rio:     { role: 'Girl from the suicide site.', wants: 'To be seen.', tip: 'Logic, not pity.', battle: 'rio' },
};
function weakKnown(b) { return lvl('intel') >= 3 || G.flags['read_' + BATTLES[b].ch]; }
async function appFiles() {
  for (;;) {
    const ids = Object.keys(DOSSIER);
    const r = await ask(null, ids.map(id => ({ t: REL_NAMES[id] || id.toUpperCase(), v: id })).concat([{ t: 'BACK', v: 'x' }]), { pos: 'menu', cancel: true });
    if (!r || r === 'x') return;
    await panel(() => drawDossier(r));
  }
}
function drawDossier(id) {
  const D = DOSSIER[id];
  rect(0, 0, W, H, 0); box(0, 0, 160, 144);
  rect(3, 3, 154, 12, 3); text('FILE: ' + (REL_NAMES[id] || id.toUpperCase()), 7, 5, 0);
  blit(SPR[id].down0, 136, 18);
  let y = 19;
  const put = (s, c) => { wrap(s, 21).forEach(l => { text(l, 7, y, c); y += 9; }); };
  put(D.role, 2);
  y += 2;
  if (G.rel[id] !== undefined) { text('♥ ' + (G.rel[id] > 0 ? '+' : '') + G.rel[id], 7, y, 3); y += 11; }
  put('WANTS: ' + D.wants, 3);
  put('TIP: ' + D.tip, 3);
  if (D.battle) {
    const B = BATTLES[D.battle];
    put(weakKnown(D.battle) ? (B.immune ? 'WEAK: nothing. RUN.' : `WEAK: ${(B.weak || []).join('/')}` + (B.resist ? `  RESISTS: ${B.resist.join('/')}` : '')) : 'WEAK: ??? (READ them in a battle, or INTEL Lv3)', weakKnown(D.battle) ? 3 : 2);
  }
  const sec = G.flags['sec_' + id];
  y = Math.max(y, 122);
  text(sec ? '✦ SECRET ON FILE' : '§ No secret yet. OBSERVE', 7, Math.min(y, 132), sec ? 3 : 2);
}

/* ---- BOARD: the scheme web ---- */
const SEED_HINTS = {
  kanra: 'Your Shinjuku PC. The chatroom loves gossip, and Kanra loves to give it.',
  courier: 'A headless courier takes jobs. A phone call, or a face-to-face offer.',
  dollars: 'The new kid. A name he is dying to hear. (INTEL Lv2)',
  yagiri: 'Someone at Russia Sushi wears a company lanyard. Look closer. (INTEL Lv2)',
  rio: 'Win the girl on the roof back from the edge. LOGIC reaches her.',
  van: 'The van crew on Otome Road. They are always hungry.',
  slasher: 'Simon knows the night rumors, but only for friends. (SIMON ♥20)',
  anri: 'The quiet girl in West Gate Park. Help, watch, or send someone.',
  meetup: 'The night chat. Kanra could suggest something big.',
  taro: 'Who types like a nervous new kid? (Meet him first.)',
};
async function appBoard() { await panel(drawBoard, { n: Object.keys(SEEDS).length }); }
function drawBoard(p) {
  rect(0, 0, W, H, 1);
  for (let k = 0; k < 40; k++) pset((k * 37) % 160, 14 + (k * 53) % 82, 2);
  rect(0, 0, W, 11, 3); text('BOARD · SCHEMES', 3, 2, 0);
  const ids = Object.keys(SEEDS), cx = 80, cy = 55;
  const pos = ids.map((_, k) => { const a = -Math.PI / 2 + k * Math.PI * 2 / ids.length; return [cx + Math.cos(a) * 62, cy + Math.sin(a) * 36]; });
  ids.forEach((id, k) => line(cx, cy, pos[k][0], pos[k][1], G.seeds[id] ? 3 : 2, !G.seeds[id]));
  for (let k = 0; k < ids.length; k++) if (G.seeds[ids[k]] && G.seeds[ids[(k + 1) % ids.length]]) line(pos[k][0], pos[k][1], pos[(k + 1) % ids.length][0], pos[(k + 1) % ids.length][1], 3, true);
  rect(cx - 9, cy - 9, 18, 18, 3); blit(SPR.izaya.down0, cx - 8, cy - 9);
  ids.forEach((id, k) => {
    const [x, y] = pos[k], on = G.seeds[id], bl = G.bloomed[id];
    if (k === p.sel && (G.frame >> 3) % 2) frame(x - 6, y - 6, 13, 13, 3);
    rect(x - 4, y - 4, 9, 9, on ? 3 : 0); frame(x - 4, y - 4, 9, 9, 3);
    text(bl ? '★' : on ? '✦' : '?', x - 2, y - 3, on ? 0 : 3);
  });
  const id = ids[p.sel];
  drawBanner(G.seeds[id] ? `✦ ${SEEDS[id].n}: ${SEEDS[id].d}` : `? ${SEED_HINTS[id]}`, true);
}

/* ---- MARKET: the information economy ---- */
const SECRET_VALUE = { celty: 9000, masaomi: 6000, anri: 6000, yagiriman: 8000 };
function unsoldSecrets() { return Object.keys(G.flags).filter(k => k.startsWith('sec_') && !G.flags['sold_' + k.slice(4)]).map(k => k.slice(4)); }
async function appMarket() {
  for (;;) {
    const un = unsoldSecrets(), ch = G.chapter;
    const r = await ask(null, [
      { t: `Sell secrets (${un.length})`, v: 'sell', dis: !un.length, disWhy: '§ Nothing to sell. OBSERVE people first.', d: 'Clients pay well for what you see in OBSERVER MODE.' },
      { t: 'All-nighter ◷+1 ¥6k', v: 'time', dis: G.flags['allnight' + ch] || G.yen < 6000, disWhy: G.flags['allnight' + ch] ? '§ Once per chapter.' : '§ Not enough ¥.', d: 'Coffee, pills, and spite. One extra action today.' },
      { t: 'Gift ♥+10 ¥4k', v: 'gift', dis: G.yen < 4000, disWhy: '§ Not enough ¥.', d: 'Send someone a perfectly chosen present.' },
      { t: 'Bribe a clerk ¥5k', v: 'bribe', dis: G.flags['bribe' + ch] || G.yen < 5000, disWhy: G.flags['bribe' + ch] ? '§ Once per chapter.' : '§ Not enough ¥.', d: 'Phone records, rental logs, CCTV. INTEL +3xp.' },
      { t: 'Milk to Shizuo ¥3k', v: 'milk', dis: G.flags.milk || G.yen < 3000, disWhy: G.flags.milk ? '§ He drank it. Suspiciously.' : '§ Not enough ¥.', d: 'Anonymous. He loves milk. Shizuo ♥+15.' },
      { t: 'BACK', v: 'x' },
    ], { pos: 'menu', cancel: true });
    if (!r || r === 'x') return;
    if (r === 'sell') {
      let total = 0; un.forEach(id => { total += SECRET_VALUE[id] || 3000; G.flags['sold_' + id] = true; });
      G.yen += total; sfx('seed');
      await N(`${un.length} secret${un.length > 1 ? 's' : ''} sold to anonymous clients. +¥${total.toLocaleString('en-US')}`);
      await gainXP('intel', 1);
    } else if (r === 'time') {
      G.yen -= 6000; G.time++; G.flags['allnight' + ch] = true; sfx('ok');
      await N('You will sleep when you are dead. ◷+1');
    } else if (r === 'gift') {
      const who = await ask('Gift for whom?', Object.keys(REL_NAMES).filter(k => k !== 'shizuo').map(k => ({ t: REL_NAMES[k], v: k, dis: G.flags['gift_' + k], disWhy: '§ Already sent one.' })).concat([{ t: 'CANCEL', v: 'x' }]), { pos: 'menu', cancel: true });
      if (who && who !== 'x') { G.yen -= 4000; G.flags['gift_' + who] = true; rel(who, 10); await N(`A gift arrives for ${REL_NAMES[who]}. No card. They'll know.`); }
    } else if (r === 'bribe') {
      G.yen -= 5000; G.flags['bribe' + ch] = true;
      await N('A clerk at a phone shop forgets to lock a drawer. How careless.'); await gainXP('intel', 3);
    } else if (r === 'milk') {
      G.yen -= 3000; G.flags.milk = true; rel('shizuo', 15);
      await N('A crate of premium milk lands on Shizuo\'s doorstep. He drinks it all. He is calmer. Slightly.');
    }
  }
}

/* ---- BBS: the Dollars forum ---- */
function drawBBS() {
  rect(0, 0, W, H, 0); rect(0, 0, W, 11, 3); text('DOLLARS BBS', 3, 2, 0);
  const posts = [
    ['Anon', 'Black Rider on Meiji St. NO HEAD.'],
    ['Taro?', 'Is the offline meetup real??'],
    ['Bakyura', 'Guy threw a vending machine. Tuesday.'],
    ['Setton', 'Stop posting Rider photos. Please.'],
  ];
  let y = 15;
  posts.forEach(([n, t]) => { text(n + ':', 4, y, 2); y += 9; wrap(t, 25).forEach(l => { text(l, 6, y, 3); y += 9; }); y += 3; });
  if ((G.frame >> 5) % 2) text('A:POST', 118, 2, 0);
}
async function appBBS() {
  await panel(drawBBS);
  const r = await ask('Post a rumor? (◷1)', [
    !G.flags.r_shizuo && { t: '"Shizuo in Shinjuku!"', v: 's', dis: G.chapter !== 1 || G.flags.shizuoGone, disWhy: '§ Shizuo is not on the street.', d: 'He leaves to hunt you. Main street is safe all day.' },
    !G.flags.r_celty && { t: '"The Rider = hero"', v: 'c', d: 'Good PR for a headless courier. Celty ♥+10.' },
    !G.flags.r_simon && { t: '"Free sushi!"', v: 'm', d: 'Crowds for Russia Sushi. Simon ♥+15.' },
    !G.flags.r_scarf && { t: '"Yellow Scarves back"', v: 'y', d: 'Kida-kun will not sleep tonight. MANIP +2xp, Masaomi ♥-10.' },
    { t: 'Just lurk', v: 'x' },
  ]);
  if (!r || r === 'x') return;
  if (!(await spend())) return;
  sfx('ping');
  if (r === 's') { G.flags.r_shizuo = true; G.flags.shizuoLured = true; if (G.mapId === 'ikebukuro') removeNpc('shizuo'); rel('shizuo', -5); await N('Within minutes, a blond blur is seen sprinting toward Shinjuku. The main street is yours.'); }
  if (r === 'c') { G.flags.r_celty = true; rel('celty', 10); await N('The post goes viral. Kids start drawing the Rider as a superhero.'); }
  if (r === 'm') { G.flags.r_simon = true; rel('simon', 15); await N('A line forms outside Russia Sushi. Simon is weeping with joy.'); }
  if (r === 'y') { G.flags.r_scarf = true; rel('masaomi', -10); await N('Yellow bandanas trend for an hour. Somewhere, Kida stares at his phone.'); await gainXP('manip', 2); }
}

/* ---- SIM: mind battle rehearsal ---- */
async function appSim() {
  const ch = G.chapter;
  if (G.flags['sim' + ch]) { await N('SIMULATOR: cooling down. One rehearsal per chapter.'); return; }
  const types = ['CHARM', 'LOGIC', 'PROVOKE', 'INTEL'];
  const wk = types[Math.floor(Math.random() * 4)];
  await N('SIMULATOR: building a proxy from 10,000 chat logs...');
  G.flags['sim' + ch] = true;
  const winsBefore = G.wins;
  const res = await battle({
    name: 'PROXY', ch: 'dollar2', hp: 24, weak: [wk],
    intro: 'A simulated stranger flickers into being.',
    read: `Simulated weakness: ${wk}. In real fights, READ first, then hit the weak spot.`,
    counters: [{ t: 'PROXY recites a statistically average insult.', d: 4 }, { t: 'PROXY glitches menacingly.', d: 3 }],
    winText: 'SIMULATION COMPLETE.',
  });
  G.wins = winsBefore;
  if (res === 'win') { await gainXP('manip', 1); await gainXP('foresight', 2); }
  else await gainXP('foresight', 1);
}

/* ---- NEXT: objective hints ---- */
async function appTodo() {
  const tips = [];
  if (G.chapter === 1) {
    if (!G.flags.metMikado) tips.push('Find Mikado and Kida on the sidewalk south of Sunshine 60 Street, just east of the station.');
    else if (!G.flags.rooftopDone) tips.push('Your "date" waits on the roof: the ROOF ACCESS door, south side of Sunshine 60 St. The day ends after.');
    if (!G.flags.shizuoGone && !G.flags.shizuoLured) tips.push('Shizuo patrols Sunshine 60 St. Use OBSERVER MODE or the BBS to dodge him.');
    if (unsoldSecrets().length) tips.push('You have secrets to sell on the MARKET.');
    const open = Object.keys(SEEDS).filter(id => !G.seeds[id] && ['courier', 'dollars', 'yagiri', 'van', 'slasher', 'anri'].includes(id));
    if (open.length) tips.push(`${open.length} seeds can still be planted today. Check the BOARD.`);
  }
  if (!tips.length) tips.push('Every piece is in motion. Watch, and enjoy it.');
  for (const t of tips) await say('NEXT', t);
}
