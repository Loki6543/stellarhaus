'use strict';
/* =========================================================
   IKEBUKURO GAMBIT — story, maps, schemes (Arc 1)
   Fan game. Original dialogue inspired by the series.
   ========================================================= */
const I = t => say('IZAYA', t);
const N = t => say(null, t);

const SEEDS = {
  kanra:   { n: "Kanra's Mask", d: 'You charmed the chatroom as cute, nosy Kanra.', h: 'Taro and Setton will trust Kanra.' },
  courier: { n: 'A Debt in Black', d: 'You hired the Black Rider for a "delivery."', h: 'Celty will owe you at the perfect moment.' },
  dollars: { n: 'The Hook', d: 'You dangled the Dollars in front of Mikado.', h: 'Mikado will chase the colorless gang.' },
  yagiri:  { n: 'Pharma Whispers', d: 'Yagiri men are hunting a girl with a scarred neck.', h: 'Expose them when the crowd gathers.' },
  rio:     { n: 'The Girl Who Lived', d: 'Rio stepped back from the edge. Now she watches for you.', h: 'Rio becomes your informant.' },
  van:     { n: "Kadota's Van", d: 'You fed the van crew. They remember free food.', h: 'Someone will stand between you and Shizuo.' },
  slasher: { n: "Saika's Whisper", d: 'Simon heard of night cuts and red eyes.', h: 'Something sharp is coming. (Arc 2)' },
  anri:    { n: 'The Quiet Girl', d: 'Anri Sonohara hides something old behind her glasses.', h: 'She is more than she seems. (Arc 2)' },
  meetup:  { n: 'Offline Meeting', d: 'You suggested the Dollars meet in person.', h: 'The Dollars will gather on Sunday.' },
  taro:    { n: "Taro's Real Face", d: 'You know who hides behind "Tanaka Taro."', h: 'Use it against him at the end.' },
};

/* ---------------- PUZZLES ---------------- */
const PUZ = {
  logic: [
    { q: "Three thugs. Exactly one is lying.\nA: 'B is the boss.'\nB: 'I'm not the boss.'\nC: 'B is lying.'", p: 'Who is the boss?', o: ['A is the boss', 'B is the boss', 'C is the boss'], a: 1, e: 'If B lies, A and C are both honest: one liar. B is the boss.' },
    { q: 'A rumor doubles its listeners every hour. At 6 PM, all of Ikebukuro has heard it.', p: 'When had half heard it?', o: ['5 PM', '3 PM', 'Noon'], a: 0, e: 'Doubling means half were in on it one hour earlier: 5 PM.' },
    { q: 'Square table, four seats. Mikado sits left of Masaomi. Anri sits across from Mikado. Celty takes the last seat.', p: 'Who is across from Masaomi?', o: ['Celty', 'Anri', 'Nobody'], a: 0, e: 'Anri is paired with Mikado, so Masaomi faces the last seat: Celty.' },
    { q: "Simon and Dennis each either always lie or always tell the truth. Simon says: 'We are both liars.'", p: 'What is true?', o: ['Both lie', 'Both are honest', 'Only Simon lies'], a: 2, e: "An honest Simon couldn't say it. So Simon lies, which makes 'both liars' false: Dennis is honest." },
    { q: 'Your informant fees this month went: 1, 1, 2, 3, 5, 8...', p: 'Next fee?', o: ['11', '12', '13'], a: 2, e: 'Each fee is the sum of the two before it: 5 + 8 = 13.' },
    { q: 'All Dollars carry a black card. Kadota carries a black card.', p: 'So Kadota...', o: ['Is a Dollar', 'Might be a Dollar', 'Is not a Dollar'], a: 1, e: 'The card proves nothing. Others carry black cards too. Classic trap.' },
    { q: "Shizuo throws 3 vending machines on Monday, twice that on Tuesday, and half of Tuesday's on Wednesday.", p: 'Total thrown?', o: ['12', '9', '15'], a: 0, e: '3 + 6 + 3 = 12. The vending companies hate him.' },
    { q: "Celty leaves at 9:40 and rides for 35 minutes. The client said 'come at a quarter past ten.'", p: 'Is she...?', o: ['Early', 'Late', 'On time'], a: 2, e: '9:40 + 35 minutes = 10:15. Punctual, as always.' },
  ],
  read: [
    { q: 'A salaryman, 42. He checks his phone every minute. Pale tan line where a ring used to be.', p: 'Which line hooks him?', o: ['Busy day at work?', 'She kept the ring?', 'Nice suit!'], a: 1, e: 'Lead with the wound. He will talk for an hour.' },
    { q: 'A girl in a Raira uniform refreshes a chatroom over and over. She smiles at every ping.', p: 'Best opener?', o: ['Phones rot brains.', 'Waiting for someone?', 'Are you lost?'], a: 1, e: 'She wants to be asked about the person behind the screen.' },
    { q: 'A brand new gang recruit. His bandana still has the store creases in it.', p: 'Best opener?', o: ['Nice bandana.', 'New, huh? Careful.', 'Run.'], a: 1, e: 'Press the insecurity. He will prove himself by telling you everything.' },
    { q: 'An old man on a bench. Two cups of coffee. Nobody beside him.', p: 'Best opener?', o: ['Who is cup two for?', 'Coffee is bad for you.', 'Mind if I sit?'], a: 0, e: 'He came here to talk about someone. Let him.' },
    { q: 'A shy student. Studies the floor whenever someone speaks to her.', p: 'Best opener?', o: ['Speak up!', 'No need to talk.', 'What are you hiding?'], a: 1, e: 'Remove the pressure and she will fill the silence herself.' },
  ],
};
async function puzzle(kind, idx) {
  const pool = PUZ[kind];
  const used = G.flags['used_' + kind] || [];
  let i = idx;
  if (i === undefined) {
    const avail = pool.map((_, k) => k).filter(k => !used.includes(k));
    if (!avail.length) { await N('You have already mastered every trick in here.'); return null; }
    i = avail[Math.floor(Math.random() * avail.length)];
  } else if (used.includes(i)) { await N('You already read them like a book.'); return null; }
  G.flags['used_' + kind] = used.concat([i]);
  const P = pool[i];
  await N(P.q);
  const r = await ask(P.p, P.o.map((t, k) => ({ t, v: k })));
  const stat = kind === 'logic' ? 'foresight' : 'manip';
  if (r === P.a) { sfx('ok'); await N('Correct. ' + P.e); await gainXP(stat, 2); return true; }
  sfx('bump'); await N('Wrong. ' + P.e); await gainXP(stat, 1); return false;
}

/* ---------------- BATTLES ---------------- */
const BATTLES = {
  masaomi: {
    name: 'MASAOMI', ch: 'masaomi', hp: 34, rel: 'masaomi', weak: ['INTEL'], resist: ['CHARM'],
    bonus: () => (G.flags.masaomiRead ? 8 : 0),
    intro: 'MASAOMI steps between you and Mikado!',
    read: 'He clowns to hide guilt. Something about a girl named Saki. INTEL cuts deep. CHARM bounces off.',
    counters: [{ t: 'MASAOMI cracks a terrible pun. It is somehow hurtful.', d: 4 }, { t: "MASAOMI: 'Stay away from him, Izaya.'", d: 6 }, { t: "MASAOMI glares. 'I know what you did.'", d: 5 }],
    winText: 'MASAOMI looks away first.',
  },
  rio: {
    name: 'RIO', ch: 'rio', hp: 32, weak: ['LOGIC'], resist: ['PROVOKE'], noFlee: true,
    intro: 'RIO grips the railing. Wind tugs at her coat.',
    read: 'She wants to be seen, not saved. LOGIC about what death really means will reach her. Needling will push her away.',
    counters: [{ t: "RIO: 'You don't know what it's like!'", d: 5 }, { t: 'RIO grips the railing tighter.', d: 4 }, { t: "RIO: 'Stop smiling at me!'", d: 6 }],
    winText: "RIO's despair cracks. She steps back from the edge.",
    loseText: 'RIO stops listening. She turns toward the edge...',
  },
  shizuo: {
    name: 'SHIZUO', ch: 'shizuo', hp: 999, immune: true, forceFleeAfter: 1,
    intro: 'SHIZUO rips a street sign out of the ground!',
    read: 'Words are useless here. Legs are not.',
    counters: [{ t: 'SHIZUO swings the street sign like a baseball bat!', d: 9 }, { t: 'SHIZUO hurls a trash can at you!', d: 7 }],
    forceText: "He's lifting a vending machine. RUN!",
  },
  mikado: {
    name: 'MIKADO', ch: 'mikado', hp: 46, rel: 'mikado', weak: ['LOGIC', 'INTEL'], resist: ['PROVOKE'], noFlee: true,
    bonus: () => (G.seeds.taro ? 10 : 0) + (G.seeds.dollars ? 4 : 0),
    intro: 'MIKADO squares his shoulders. He is shaking, but he does not run.',
    read: 'He craves the extraordinary and is terrified of it. LOGIC and INTEL will open him up. Provoking him makes him stubborn.',
    counters: [{ t: "MIKADO: 'I won't be your chess piece!'", d: 6 }, { t: 'MIKADO grips his phone like a sword.', d: 5 }, { t: "MIKADO: 'The Dollars are my friends!'", d: 7 }],
    winText: "MIKADO lowers his phone. He's... smiling.",
  },
};

/* ---------------- MAPS ---------------- */
const MAPS = {
  office: {
    rows: [
      'YYYYYYYYYYYY',
      'bbwwwwwwwwbb',
      'wwwwwKPKwwww',
      'wwwwwwwwwwww',
      'wwrrrrwwwwww',
      'wwrCrrwwwcww',
      'wwrrrrwwwcww',
      'wpwwwwwwwwpw',
      'wwwwwwwwwwww',
      'xxxxxmmxxxxx',
    ],
    music: () => (G.chapter >= 3 ? 'title' : 'office'),
    steps: { '5,9': officeExit, '6,9': officeExit },
    objects: {
      '6,2': officePC, '5,2': officePhone, '7,2': officeDossier, '3,5': officeBoard,
      '0,1': officeBooks, '1,1': officeBooks, '10,1': officeBooks, '11,1': officeBooks,
    },
    npcs: [],
  },
  ikebukuro: {
    rows: [
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
      'qqqq##nnnn##########nnnn######',
      'qqDq##BBDB####BBBB##BBDB##BDB#',
      ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
      ',V,,,L,,,,,,L,,,,V,,,L,,,,,,V,',
      '......zz......................',
      '=.=.=.zz=.=.=.=.=.=.=.=.=.=.=.',
      '......zz......................',
      ',,,,,L,,,,,L,,,,,,,,,L,,,,,,,,',
      ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
      'TgTgTgTgT,,^^^^^^^^,,,^^^^^^^^',
      'gggggggggg,^^^^^^^^,,,^^^^^^^^',
      'gTghggghgT,nnnnnnnn,,,########',
      'gggggggggg,BBBDBBBB,V,####D###',
      'TggTgggTgg,,,,,,,,,,,,,,,,,,,,',
      'gggggggggg,,,,,,,,,,,,,,,,,,,,',
      'TgTgTgTgTg,F,,,,,,,,,,,,F,,,,,',
      'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    ],
    music: () => (G.chapter === 4 ? 'finale' : 'city'),
    night: () => G.chapter === 4,
    labels: [{ px: 4, py: 36, t: 'STATION' }, { px: 202, py: 214, t: 'RUSSIA SUSHI' }, { px: 98, py: 36, t: 'LOFT' }, { px: 322, py: 36, t: 'SUNSHINE 60' }],
    warps: { '2,3': stationDoor, '14,14': ['sushi', 4, 6, 'up'], '26,14': rooftopDoor },
    objects: { '11,17': parkour, '24,17': parkour, '8,3': () => N('LOFT. Closed for inventory. Pity.'), '22,3': () => N("A karaoke bar. Someone inside is murdering a love song."), '27,3': () => N('A manga shop. Erika has probably bought everything in it.') },
    npcs: [
      { id: 'mikado', ch: 'mikado', x: 8, y: 10, dir: 'right', when: () => G.chapter === 1, talk: meetMikado,
        secret: { lv: 1, text: 'His phone shows a black login page. His thumb hovers over it like it belongs there.', flag: 'taroHint' } },
      { id: 'masaomi', ch: 'masaomi', x: 9, y: 10, dir: 'left', when: () => G.chapter === 1, talk: meetMikado,
        secret: { lv: 2, text: 'Kida jokes too loudly. His eyes keep flicking to you. Guilt, old and heavy. Something about a girl named Saki.', flag: 'masaomiRead' } },
      { id: 'shizuo', ch: 'shizuo', x: 16, y: 10, dir: 'right', sight: 4, patrol: 'RRRRRRR..LLLLLLL..', when: () => G.chapter === 1 && !G.flags.shizuoGone, talk: n => shizuoSpot(n), onSpot: n => shizuoSpot(n),
        secret: { lv: 1, text: 'Pure rage, barely held in by a bartender vest. He is looking for someone. Specifically you.' } },
      { id: 'simon', ch: 'simon', x: 15, y: 15, dir: 'down', when: () => G.chapter === 1, talk: talkSimon },
      { id: 'celty', ch: 'celty', x: 20, y: 16, dir: 'left', when: () => G.chapter === 1, talk: talkCelty,
        secret: { lv: 3, text: 'Under the helmet: nothing. Black shadow curls where a neck should end. She is searching for something she lost.' } },
      { id: 'kadota', ch: 'kadota', x: 27, y: 16, dir: 'down', when: () => G.chapter === 1, talk: talkKadota,
        secret: { lv: 1, text: "No colors on Kadota's crew. But Erika's phone has a black login page bookmarked." } },
      { id: 'erika', ch: 'erika', x: 28, y: 16, dir: 'left', when: () => G.chapter === 1, talk: talkKadota },
      { id: 'anri', ch: 'anri', x: 5, y: 15, dir: 'up', when: () => G.chapter === 1, talk: talkAnri,
        secret: { lv: 2, text: "Behind her glasses: calm. Far too calm for a girl being bullied. Like she's listening to a voice only she can hear.", seed: 'anri' } },
      { id: 'bully1', ch: 'bully', x: 5, y: 14, dir: 'down', when: () => G.chapter === 1 && !G.flags.anriDone, talk: talkAnri },
      { id: 'bully2', ch: 'bully', x: 4, y: 15, dir: 'right', when: () => G.chapter === 1 && !G.flags.anriDone, talk: talkAnri },
      { id: 'bully3', ch: 'bully', x: 6, y: 15, dir: 'left', when: () => G.chapter === 1 && !G.flags.anriDone, talk: talkAnri },
      { id: 'salary', ch: 'salary', x: 19, y: 4, dir: 'down', patrol: 'LLL..RRR..', when: () => G.chapter === 1, talk: crowd(0, 'SALARYMAN', "Not now. I'm late. I'm always late.") },
      { id: 'girl', ch: 'girl', x: 24, y: 5, dir: 'left', when: () => G.chapter === 1, talk: crowd(1, 'STUDENT', "Hm? Oh, sorry, I'm in the middle of a chat.") },
      { id: 'punk', ch: 'punk', x: 13, y: 16, dir: 'down', when: () => G.chapter === 1, talk: crowd(2, 'PUNK', "Whatchu lookin' at?!") },
      { id: 'oldman', ch: 'oldman', x: 8, y: 13, dir: 'left', fixedFace: true, when: () => G.chapter === 1, talk: crowd(3, 'OLD MAN', 'Lovely evening. She would have liked it.') },
      { id: 'dgirl', ch: 'girl', x: 13, y: 5, dir: 'down', when: () => G.chapter === 1, talk: () => say('STUDENT', "Huh? N-nothing! I'm not on any website!"),
        secret: { lv: 1, text: 'Her screen: a black page, one password field. DOLLARS. She is smiling like she belongs to something.' } },
    ],
  },
  sushi: {
    rows: [
      'WWWWWWWWWW',
      'wwwwwwwwww',
      'kkkkkkkwww',
      'wwwwwwwwww',
      'wtwwwtwwpw',
      'wwwwwwwwww',
      'wtwwwtwwww',
      'xxxxmxxxxx',
    ],
    music: 'city',
    warps: { '4,7': ['ikebukuro', 14, 15, 'down'] },
    objects: Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(x => [x + ',2', () => say('DENNIS', G.flags.ateSushi ? 'Simon told me you tipped. Suspicious. Thank you.' : "We're out of fatty tuna. We're always out of fatty tuna. Simon gives it away.")])),
    npcs: [
      { id: 'dennis', ch: 'dennis', x: 3, y: 1, dir: 'down', talk: () => say('DENNIS', "Simon's outside again? He scares off more customers than he brings in. Don't tell him I said that.") },
      { id: 'yagiriman', ch: 'salary', x: 6, y: 4, dir: 'left', when: () => G.chapter === 1, talk: () => say('CUSTOMER', "Mind your own business. I'm eating."),
        secret: { lv: 2, text: "A YAGIRI PHARMACEUTICALS lanyard under his jacket. Into his phone: 'The girl with the scar on her neck. By Sunday.'", seed: 'yagiri' } },
    ],
  },
  rooftop: {
    rows: [
      'EEEEEEEEEE',
      'ERRRRRRRRE',
      'ERRRRRRRRE',
      'ERRRRRRRRE',
      'ERRRRRRRRE',
      'ERRRRRRRRE',
      'ERRRRRRRRE',
      'ERRRRRRRRE',
      'EEEEDEEEEE',
    ],
    music: 'title',
    warps: { '4,8': () => N('The stairwell door. Not yet.') },
    onEnter: rooftopScene,
    npcs: [{ id: 'rio', ch: 'rio', x: 5, y: 1, dir: 'up', when: () => !G.flags.rooftopDone }],
  },
};

/* ---------------- TITLE / NEW GAME ---------------- */
async function titleMenu() {
  sfx('ok');
  const r = await ask(null, [
    { t: 'NEW GAME', v: 'new' },
    { t: 'CONTINUE', v: 'cont', dis: !hasSave(), disWhy: 'No saved game yet.' },
    { t: 'OPTION', v: 'opt' },
  ], { pos: 'center', cancel: true });
  if (r === 'new') await newGame();
  else if (r === 'cont') { await fadeTo(3); if (loadSave()) { await fadeTo(0); toast('Welcome back.'); } else { G.mode = 'title'; await fadeTo(0); } }
  else if (r === 'opt') await optionsMenu();
}
async function newGame() {
  await fadeTo(3);
  resetState();
  G.chapter = 0; G.time = 2;
  await card('PROLOGUE', 'The Informant');
  loadMap('office', 6, 3, 'up');
  await fadeTo(0);
  await N('Shinjuku. 2:14 AM.');
  await I('Ikebukuro is waking up. Not the streets. The people.');
  await I("A courier with no head. A man who throws vending machines. A gang nobody has ever seen.");
  await I("And me? I simply love humans. All of them. So much I can't stop poking.");
  await N('D-PAD: move. A: talk / inspect. Hold B: run. START: menu. SELECT: OBSERVER MODE.');
  await N('You have ◷2 actions tonight. Spend them training, then head out the door at the bottom.');
  saveGame();
}

/* ---------------- PROLOGUE / OFFICE ---------------- */
async function officeBoard() {
  if (G.flags.board) { await I('Every piece is where I left it. Patience.'); return; }
  G.flags.board = true;
  await I('My board. Chess, shogi, and an Othello disc. Why play one game when you can play all of them?');
  await I('Every move I make plants a seed. Some bloom weeks later.');
  await N('SEEDS are schemes you set in motion. Track them in START > SCHEMES.');
  await N('FORESIGHT Lv2 reveals which choices plant seeds (✦). At Lv4 you see what they will grow into.');
  const r = await ask('Which piece do I move first?', [
    { t: 'The King', v: 'k', d: 'A king who does not know he is one.' },
    { t: 'The Knight', v: 'n', d: 'A headless knight who moves in Ls.' },
    { t: 'The Othello disc', v: 'o', d: 'Black on one side, white on the other.' },
  ]);
  if (r === 'k') { await I("The king. A boy who built a kingdom by accident. Let's see if he notices."); await gainXP('foresight', 1); }
  if (r === 'n') { await I('The knight. No head, all heart. Information follows her everywhere.'); await gainXP('intel', 1); }
  if (r === 'o') { await I('The disc. Kida-kun used to be one color. Flip him and see what happens.'); await gainXP('manip', 1); }
}
async function officeBooks() {
  const r = await ask('Psychology, criminology, and three books on game theory. Study a logic problem? (◷1)', [{ t: 'Study', v: 1 }, { t: 'Not now', v: 0 }]);
  if (!r || !(await spend())) return;
  await puzzle('logic');
}
async function officeDossier() {
  const r = await ask('Files on half of Ikebukuro. Practice a cold read? (◷1)', [{ t: 'Read a file', v: 1 }, { t: 'Not now', v: 0 }]);
  if (!r || !(await spend())) return;
  await puzzle('read');
}
async function officePhone() {
  if (G.chapter >= 3) { await I("No calls tonight. The chatroom's more fun."); return; }
  if (G.flags.calledShinra) { await I("Shinra's probably talking to Celty about me. Flattering."); return; }
  G.flags.calledShinra = true;
  await I('Shinra! It\'s me. Is your lovely roommate free for a delivery?');
  await say('SHINRA', 'Izaya... It\'s 2 AM. Celty is typing something. She says: "What\'s in the package?"');
  const r = await ask('How do I answer?', [
    { t: '"Boring documents."', v: 'lie', seed: 'courier' },
    { t: '"It\'s a secret ♥"', v: 'truth', seed: 'courier', req: { stat: 'manip', lv: 2 }, d: 'Honest-ish. She respects that.' },
    { t: '"Never mind. Sleep."', v: 'no' },
  ]);
  if (r === 'lie') { await say('SHINRA', 'She says yes. She also says she doesn\'t believe you.'); rel('celty', -5); await plant('courier'); }
  if (r === 'truth') { await say('SHINRA', 'Ha! She says at least you\'re honest about being dishonest. She\'ll do it.'); rel('celty', 5); await plant('courier'); }
  if (r === 'no') { await say('SHINRA', 'Thank you. Truly. Good night, Izaya.'); rel('shinra', 5); }
}
async function officePC() {
  if (G.chapter === 0) return prologueChat();
  if (G.chapter === 3) return nightChat();
  await I('The chatroom is quiet.');
}
async function prologueChat() {
  if (G.flags.chat0) { await N("The chatroom's quiet. Everyone is asleep. Probably."); return; }
  const go = await ask('Log in as "Kanra"? (◷1)', [{ t: 'Log in', v: 1 }, { t: 'Not now', v: 0 }]);
  if (!go || !(await spend())) return;
  G.flags.chat0 = true;
  chatOpen('IKEBUKURO CHAT');
  await say(null, 'Kanra has entered the room.');
  await say('Kanra', 'Good evening~! Kanra-chan is here ♥');
  await say('Setton', 'Evening, Kanra.');
  await say('Taro', "Um, hello! First time here. I'm moving to Ikebukuro soon!");
  const r = await ask(null, [
    { t: '"Kanra knows rumors~"', v: 1, seed: 'kanra' },
    { t: 'Ask Setton: Rider?', v: 2 },
    { t: '"Heard of Dollars?"', v: 3, seed: 'kanra', req: { stat: 'intel', lv: 2 } },
  ]);
  if (r === 1) {
    await say('Kanra', 'Welcome~! Ikebukuro is FULL of rumors. Ask Kanra anything ♪');
    await say('Taro', 'Really? Like what?');
    await say('Kanra', 'Like... a headless rider on a black motorbike! ♥');
    await say('Setton', "That's just an urban legend.");
    await say(null, '(Setton answered fast. Too fast.)');
    rel('mikado', 5); await plant('kanra'); await gainXP('intel', 1);
  } else if (r === 2) {
    await say('Kanra', "Setton-san, you're always online at night~ Ever seen the Black Rider?");
    await say('Setton', '...Why would I know anything about that.');
    await say('Setton', 'I have to go. Work.');
    await say(null, '(Defensive. Interesting.)');
    rel('celty', -5); await gainXP('intel', 2);
  } else {
    await say('Kanra', 'Taro-kun! Have you heard of the Dollars? A gang with no colors~');
    await say('Taro', "The Dollars? I've heard... a little. Are they real?");
    await say('Kanra', 'Who knows~? ♥');
    await say(null, '(He typed that too fast. He knows more than "a little.")');
    G.flags.taroHint = true; rel('mikado', 5); await plant('kanra'); await gainXP('intel', 1);
  }
  await say('Taro', 'I should sleep. Good night!');
  await say(null, 'Taro has left the room.');
  chatClose();
}
async function officeExit() {
  if (G.chapter === 0) {
    const r = await ask('Head out to Ikebukuro?' + (G.time > 0 ? ` (◷${G.time} unused)` : ''), [{ t: 'Go', v: 1 }, { t: 'Not yet', v: 0 }]);
    if (!r) { await movePlayer('U'); return; }
    await startCh1();
    return;
  }
  await N(G.chapter === 3 ? 'The chatroom is waiting. Check the PC on the desk.' : 'Not now.');
  await movePlayer('U');
}

/* ---------------- CHAPTER 1: IKEBUKURO ---------------- */
async function startCh1() {
  G.chapter = 1; G.time = 3;
  await card('CHAPTER 1', 'Spring in Ikebukuro');
  loadMap('ikebukuro', 2, 4, 'down');
  await fadeTo(0);
  await N('Ikebukuro. Spring. New students, new gangs, new rumors.');
  await I("A boy named Ryugamine Mikado arrived today. Kida-kun's childhood friend. Let's say hello.");
  await N('You have ◷3 actions today. Shizuo is patrolling the main street. SELECT shows who is watching.');
  saveGame();
}
async function stationDoor() {
  await N("No train home yet. There's still someone waiting for you in Ikebukuro.");
  await movePlayer('D');
}
async function rooftopDoor() {
  if (!G.flags.metMikado) { await N('A stairwell to the roof. Locked. Your "date" from the suicide site isn\'t here yet.'); await movePlayer('D'); return; }
  const r = await ask('Go up to the roof? The day ends after this.' + (G.time > 0 ? ` (◷${G.time} unused)` : ''), [{ t: 'Go up', v: 1 }, { t: 'Not yet', v: 0 }]);
  if (!r) { await movePlayer('D'); return; }
  G.chapter = 2;
  await warpTo('rooftop', 4, 7, 'up');
}
async function meetMikado() {
  if (G.flags.metMikado) {
    await say('MIKADO', G.rel.mikado >= 15 ? 'Orihara-san! Um... thanks for earlier.' : '...Orihara-san.');
    await say('MASAOMI', G.rel.masaomi < -30 ? "Keep walking, Izaya." : "Come on, Mikado. Sushi's calling.");
    return;
  }
  G.flags.metMikado = true;
  face('masaomi', 'right'); face('mikado', 'right');
  emote('masaomi', '!'); await wait(30);
  await say('MASAOMI', '...Izaya-san.');
  await I("Kida-kun! It's been a while. And this must be the childhood friend.");
  await say('MIKADO', 'R-Ryugamine Mikado. Nice to meet you?');
  await say('MASAOMI', "Mikado, this guy is bad news. Let's go.");
  const r = await ask('How do I play this?', [
    { t: 'Be charming', v: 'charm' },
    { t: 'Needle Kida-kun', v: 'fight', d: 'Start a mind battle with Masaomi.' },
    { t: 'Drop "Dollars"', v: 'dollars', seed: 'dollars', req: { stat: 'intel', lv: 2 } },
    { t: 'Give him a card', v: 'card', req: { stat: 'manip', lv: 2 } },
  ]);
  if (r === 'charm') {
    await I('Mikado-kun. Welcome to Ikebukuro. It\'s a city where anything can happen. Anything at all.');
    await say('MIKADO', '...Anything?');
    rel('mikado', 10); rel('masaomi', -5); await gainXP('manip', 1);
  } else if (r === 'fight') {
    await I('Still wearing yellow, Kida-kun? Or did that stop after what happened to Saki?');
    const res = await battle(BATTLES.masaomi);
    if (res === 'win') { await say('MASAOMI', "...Let's go, Mikado. Now."); await say('MIKADO', '(He knows something about Masaomi. Something even I don\'t.)'); rel('masaomi', -10); rel('mikado', 15); await gainXP('manip', 1); }
    else { await say('MASAOMI', 'Nice try. Come on, Mikado, I know a great sushi place.'); rel('mikado', -5); rel('masaomi', 5); }
  } else if (r === 'dollars') {
    await I('Have you heard of the Dollars? A gang with no colors, no leader anyone has met. Some say they don\'t exist.');
    await say('MIKADO', '...!');
    await N("Mikado's eyes light up like a phone screen at midnight.");
    rel('mikado', 10); await plant('dollars'); await gainXP('intel', 1);
  } else if (r === 'card') {
    await I("My card. If you ever need information, call me. The first one's free.");
    await say('MIKADO', 'An... information broker? That\'s a real job?');
    rel('mikado', 5); G.flags.gaveCard = true; await gainXP('manip', 1);
  }
  await wait(20);
  sfx('ping');
  await N('Your phone buzzes. A message from the suicide site: "I\'m on the roof of the building past Russia Sushi. Come alone."');
  await I('Ah. My date. The rooftop door east of the sushi shop. I have until then to play.');
}
function crowd(idx, name, line) {
  return async function () {
    await say(name, line);
    if ((G.flags.used_read || []).includes(idx)) return;
    const r = await ask('People-watch them? (◷1)', [{ t: 'Read them', v: 1 }, { t: 'Leave it', v: 0 }]);
    if (!r || !(await spend())) return;
    await puzzle('read', idx);
  };
}
async function shizuoSpot(n) {
  if (G.flags.shizuoGone) return;
  n.dir = n.x > G.p.x ? 'left' : n.x < G.p.x ? 'right' : n.y > G.p.y ? 'up' : 'down';
  emote(n, '!'); sfx('alarm'); await wait(40);
  await say('SHIZUO', 'IIIZAAAYAAA-KUUUN...!');
  await say('SHIZUO', "Didn't I tell you to never show your face in Ikebukuro again?!");
  await I("Shizu-chan! Is that a vending machine in your hands, or are you just happy to see me?");
  rel('shizuo', -15);
  await battle(BATTLES.shizuo);
  const ok = await chase();
  if (ok) { await N('You vanish down an alley. Somewhere behind you, a mailbox dies.'); await gainXP('escape', 2); }
  else {
    await N('A vending machine clips you. You land in a pile of bicycles. Ow.');
    await gainXP('escape', 1);
    if (G.time > 0) { G.time--; toast('◷ -1 (recovering)'); }
  }
  G.flags.shizuoGone = true; removeNpc('shizuo');
}
async function parkour() {
  const r = await ask('A fence, a wall, a gap. Practice parkour? (◷1)', [{ t: 'Practice', v: 1 }, { t: 'Later', v: 0 }]);
  if (!r || !(await spend())) return;
  await N('You vault, roll, sprint. Imagine Shizuo behind you. Easy.');
  const ok = await chase({ dur: 720, practice: true });
  await gainXP('escape', ok ? 2 : 1);
}
async function talkSimon() {
  await say('SIMON', 'Izaya! Sushi! Sushi is good! You eat, you become good person!');
  if (!G.flags.simonWarn) { G.flags.simonWarn = true; await say('SIMON', 'No fighting with Shizuo today. Fighting is bad. Bad for business also.'); }
  for (;;) {
    const r = await ask('Simon beams at you.', [
      !G.flags.ateSushi && { t: 'Buy sushi (◷1)', v: 'buy', d: 'Simon likes customers. A lot.' },
      !G.seeds.slasher && { t: 'Ask about rumors', v: 'rum', req: { rel: 'simon', min: 20 }, seed: 'slasher' },
      { t: 'Leave', v: 'x' },
    ]);
    if (r === 'buy') {
      if (!(await spend())) continue;
      G.flags.ateSushi = true;
      await N('You eat fatty tuna while Simon talks about Russia. You learn three new swear words.');
      rel('simon', 15); await gainXP('intel', 1);
    } else if (r === 'rum') {
      await say('SIMON', 'Rumor? Hmm. At night, people get cut. Small cuts. They say the cutter has red eyes.');
      await say('SIMON', 'Like you. But sadder.');
      await plant('slasher'); await gainXP('intel', 1);
    } else { await say('SIMON', 'Come back! Sushi waits for you!'); return; }
  }
}
async function talkCelty() {
  await N('Celty types on her PDA and shoves it at you.');
  if (G.seeds.courier && !G.flags.celtyPaid) {
    G.flags.celtyPaid = true;
    await say('CELTY', '"Your package is delivered. No questions asked. I still don\'t like you."');
    rel('celty', 5);
  } else await say('CELTY', '"Izaya. What do you want."');
  for (;;) {
    const r = await ask('Celty waits. Her helmet tilts.', [
      !G.flags.askHead && { t: 'Ask about her head', v: 'head' },
      !G.flags.bike && { t: 'Compliment the bike', v: 'bike' },
      !G.seeds.courier && { t: 'Hire her (◷1)', v: 'hire', seed: 'courier' },
      { t: 'Leave', v: 'x' },
    ]);
    if (r === 'head') {
      G.flags.askHead = true;
      await I("Still looking for your head, Celty? I hear it's closer than you think.");
      await N('She types nothing. Her shadow flickers. That is an answer.');
      rel('celty', -10); await gainXP('foresight', 1);
    } else if (r === 'bike') {
      G.flags.bike = true;
      await I('Your bike is beautiful. Does it really whinny?');
      await say('CELTY', '"...Shooter appreciates it."');
      rel('celty', 5);
    } else if (r === 'hire') {
      if (!(await spend())) continue;
      await I("A small delivery. Envelope, Shinjuku to Ikebukuro. I'll pay triple.");
      await say('CELTY', '"Triple? ...Fine. Don\'t make me regret it."');
      rel('celty', 5); await plant('courier');
    } else return;
  }
}
async function talkKadota() {
  if (!G.flags.metKadota) {
    G.flags.metKadota = true;
    await say('KADOTA', "Orihara. Whatever you're planning, leave us out of it.");
    await say('ERIKA', 'Iza-Iza! Are you here to see Shizu-Shizu? Is it FATE?! ♥');
  } else await say('KADOTA', 'You again.');
  for (;;) {
    const r = await ask('Kadota folds his arms.', [
      !G.flags.kAsk && { t: 'Ask about Dollars', v: 'd' },
      !G.seeds.van && { t: 'Buy dinner (◷1)', v: 'f', seed: 'van' },
      !G.flags.kTease && { t: 'Tease Erika', v: 't' },
      { t: 'Leave', v: 'x' },
    ]);
    if (r === 'd') {
      G.flags.kAsk = true;
      await say('KADOTA', "Colorless gang. No leader anyone's met. Anyone with a phone can join.");
      await say('KADOTA', '...We might be members. Might.');
      rel('kadota', 5); await gainXP('intel', 1);
    } else if (r === 'f') {
      if (!(await spend())) continue;
      await I('Dinner on me. All of you. Order the expensive ramen.');
      await say('KADOTA', 'Free food? ...Fine. We owe you one. One.');
      await say('ERIKA', "Walker's going to cry! He loves free ramen!");
      rel('kadota', 15); await plant('van');
    } else if (r === 't') {
      G.flags.kTease = true;
      await I('Still drawing comics about me and Shizu-chan, Erika?');
      await say('ERIKA', "They're DOUJINSHI and they're ART!");
      rel('kadota', -5); await gainXP('manip', 1);
    } else return;
  }
}
async function talkAnri() {
  if (G.flags.anriDone) { await say('ANRI', G.rel.anri > 10 ? '...Thank you. For earlier.' : '...'); return; }
  await say('BULLY', "Sonohara, you're so creepy. Hey. Are you even listening?");
  await say('ANRI', '...');
  const r = await ask('A quiet girl, three bullies. What do I do?', [
    { t: 'Intervene, charmingly', v: 'help', seed: 'anri', req: { stat: 'manip', lv: 2 } },
    { t: 'Just watch (◷1)', v: 'watch', seed: 'anri' },
    { t: 'Send Mikado in', v: 'mikado', seed: 'anri', req: { flag: 'metMikado', why: '§ Meet Mikado first' } },
    { t: 'Walk away', v: 'x' },
  ]);
  if (r === 'help') {
    await I("Ladies! I know all your names, your schools, and your mothers' phone numbers. Shall I call them?");
    await say('BULLY', "Wh-who IS this guy? Let's go!");
    await clearBullies();
    await say('ANRI', '...Thank you.');
    await N("She doesn't look relieved. She looks like someone who didn't need saving.");
    rel('anri', 15); await plant('anri'); await gainXP('manip', 1);
  } else if (r === 'watch') {
    if (!(await spend())) return;
    await N('You watch. She never flinches. Her hand drifts toward her side, like reaching for something that isn\'t there.');
    await I("Not fear. Something old. Something sharp. How interesting.");
    await gainXP('foresight', 2); await plant('anri');
    G.flags.anriDone = true;
  } else if (r === 'mikado') {
    await N('You text Kida a single line. Two minutes later, Mikado comes running, stammering about teachers.');
    await clearBullies();
    await N('Anri stares at Mikado like he just stepped out of a story.');
    rel('mikado', 5); rel('anri', 5); await plant('anri');
  }
}
async function clearBullies() {
  G.flags.anriDone = true;
  await Promise.all([moveNpc('bully1', 'UUU', true), moveNpc('bully2', 'LLL', true), moveNpc('bully3', 'RRR', true)]);
  ['bully1', 'bully2', 'bully3'].forEach(removeNpc);
}

/* ---------------- CHAPTER 2: ROOFTOP ---------------- */
async function rooftopScene() {
  if (G.flags.rooftopDone) return;
  await card('CHAPTER 2', 'The Girl on the Roof');
  await fadeTo(0);
  await movePlayer('UUU');
  await N('Wind. City noise. A girl stands at the railing.');
  face('rio', 'down'); await wait(20);
  await say('RIO', "You're... Nakura-san? From the site?");
  await I("That's me. You came. Most people don't.");
  await say('RIO', 'I want to go somewhere without pain. You said you would come with me.');
  await I('Did I? Hmm. Before we go anywhere, let me ask you something...');
  const res = await battle(BATTLES.rio);
  if (res === 'win') {
    await say('RIO', "I... I don't want to die. I don't...");
    await I("There it is! That face! That's what I came for. You're so much more interesting alive.");
    await plant('rio'); await gainXP('manip', 1); await gainXP('foresight', 1);
  } else {
    await N('She climbs the railing. Your smile slips, just slightly.');
  }
  sfx('door');
  addNpc({ id: 'celty', ch: 'celty', x: 4, y: 7, dir: 'up' });
  emote('celty', '!');
  await N('The stairwell door bursts open. A black shape moves faster than anything should.');
  await moveNpc('celty', 'UURUUU', true);
  await N('Celty grabs Rio and pulls her away from the railing. Shadow wraps them both like a coat.');
  await say('CELTY', '"What did you DO to her?!"');
  if (res === 'win') { await I('Me? She stepped back all on her own. Ask her.'); rel('celty', -5); }
  else { await I('Perfect timing, as always, Black Rider.'); rel('celty', -15); }
  G.flags.rooftopDone = true;
  await N('The sun goes down on Ikebukuro.');
  await startCh3();
}

/* ---------------- CHAPTER 3: NIGHT CHAT ---------------- */
async function startCh3() {
  G.chapter = 3; G.time = 2;
  await card('CHAPTER 3', 'Kanra');
  loadMap('office', 6, 3, 'up');
  await fadeTo(0);
  await N('Shinjuku. Night again.');
  await I('The chatroom will be lively tonight. But first, a little homework.');
  await N('You have ◷2 actions before you log in. The PC starts the chat when you are ready.');
  saveGame();
}
async function nightChat() {
  const go = await ask('Log in as Kanra? Training ends for tonight.', [{ t: 'Log in', v: 1 }, { t: 'Not yet', v: 0 }]);
  if (!go) return;
  chatOpen('IKEBUKURO CHAT');
  await say(null, 'Kanra has entered the room.');
  await say('Kanra', 'Kanra-chan is back~ ♥ Who saw something fun today?');
  await say('Taro', 'I met a scary guy near the station. Black coat with fur. He knew my friend.');
  await say('Setton', 'Stay away from him. Seriously.');
  if (G.seeds.kanra) await say('Taro', 'Kanra-san, you know everything. Who IS he?');
  const a = await ask(null, [
    { t: '"He sounds dreamy~"', v: 'dreamy' },
    { t: 'Warn Taro, sweetly', v: 'warn' },
    G.seeds.kanra && { t: '"He\'s an informant ♥"', v: 'truth', req: { stat: 'manip', lv: 3 }, d: 'Tell the truth. Nobody will believe Kanra.' },
  ]);
  if (a === 'dreamy') { await say('Kanra', 'Ooh~ he sounds dreamy. Kanra would love to meet him ♥'); await say('Setton', '...Kanra.'); await gainXP('manip', 1); }
  if (a === 'warn') { await say('Kanra', 'Hmm~ men like that know EVERYTHING about you. Be careful, Taro-kun ♪'); await say('Taro', "Th-that's scary!"); rel('mikado', 5); await gainXP('manip', 1); }
  if (a === 'truth') { await say('Kanra', "He's an information broker~ He sells secrets! Kanra knows him VERY well ♥"); await say('Taro', "Ha ha, you're joking, right?"); await say(null, '(Hiding in plain sight. Delicious.)'); rel('mikado', 10); await gainXP('manip', 2); }
  await say('Taro', 'By the way... the Dollars site has been really busy lately.');
  const b = await ask(null, [
    { t: '"Dollars should meet!"', v: 'meet', seed: 'meetup' },
    { t: '"Sunday, Sunshine St."', v: 'meet2', seed: 'meetup', req: { stat: 'foresight', lv: 3 }, d: 'Name the exact time and place.' },
    { t: '"Gangs are boring~"', v: 'no' },
  ]);
  if (b === 'meet') {
    await say('Kanra', 'Ne, ne~ What if the Dollars met in person? Just once! A huge offline meeting~ ♥');
    await say('Taro', '...An offline meeting.');
    await say('Taro', 'That could actually work.');
    await plant('meetup');
  } else if (b === 'meet2') {
    await say('Kanra', 'Sunday night, Sunshine Street~ No colors, no names. Just phones glowing in the dark ♪');
    await say('Setton', "That's oddly specific.");
    await say('Taro', "Sunday... Yes. I'll post it on the site.");
    G.flags.meetupPerfect = true; await plant('meetup'); await gainXP('foresight', 1);
  } else {
    await say('Taro', 'Oh. Okay.');
    await say(null, "(He'll do it anyway. But without your fingerprints, the board gets messy.)");
  }
  await say(null, 'Taro types fast, apologizes constantly, and just moved to Ikebukuro.');
  const c = await ask(null, [
    { t: 'Taro = Kida Masaomi', v: 'k' },
    { t: 'Taro = Mikado', v: 'm', req: { flag: 'metMikado', why: '§ You never met the new kid' } },
    { t: 'Taro = a nobody', v: 'n' },
    { t: '[Read typing style]', v: 'm', seed: 'taro', req: { stat: 'foresight', lv: 3 }, d: 'Let the rhythm of his typos tell you.' },
  ]);
  if (c === 'm' && (G.flags.metMikado)) {
    await say(null, G.flags.taroHint ? '(The black login page on his phone. Of course.)' : '(The stammer. The new-kid nerves. Of course.)');
    await plant('taro'); await gainXP('foresight', 1);
  } else {
    await say(null, '(A wrong guess. You will have to find out the hard way.)');
  }
  await say('Setton', 'Good night, everyone.');
  await say('Taro', 'Night!');
  await say(null, 'Setton and Taro have left the room.');
  await say('Kanra', 'Kanra is all alone~ ♥');
  chatClose();
  await I('Sunday, then. I should get some sleep. Ha. As if.');
  await finale();
}

/* ---------------- FINAL CHAPTER: THE DOLLARS ---------------- */
const CROWD = [[9, 5], [10, 6], [13, 7], [14, 8], [16, 6], [17, 7], [18, 4], [19, 8], [10, 9], [13, 10], [15, 9], [17, 10], [20, 6], [21, 8], [23, 5], [22, 10], [8, 8], [7, 10], [24, 7], [11, 5]];
async function finale() {
  G.chapter = 4; G.time = 0;
  await card('FINAL CHAPTER', 'The Dollars');
  loadMap('ikebukuro', 12, 4, 'down');
  CROWD.forEach(([x, y], k) => addNpc({ id: 'crowd' + k, ch: k % 3 ? 'dollar' : (k % 2 ? 'dollar2' : 'girl'), x, y, dir: k % 2 ? 'up' : 'left' }));
  addNpc({ id: 'mikado', ch: 'mikado', x: 15, y: 5, dir: 'down' });
  ['s1', 's2', 's3'].forEach((id, k) => addNpc({ id, ch: 'suit', x: 25 + k, y: 9, dir: 'left' }));
  await fadeTo(0);
  await N('Sunday night. Sunshine Street.');
  await N('Hundreds of strangers. No colors. No banners. Just phones, glowing.');
  await I("Look at them! Nobody knows anyone. They're all waiting for someone to tell them who they are.");
  if (G.seeds.meetup) await bloom('meetup', G.flags.meetupPerfect ? 'Sunday. Sunshine Street. Exactly where you typed it.' : 'You said "meet in person." They listened.');
  else await N('The meetup happened without your help. A little smaller. A little sloppier.');
  sfx('ping'); await wait(10); sfx('ping');
  await N('Every phone on the street buzzes at once.');
  await N('MESSAGE: "Everyone who is not a Dollar, please leave quietly."');
  await N('Three men in suits look around. They are the only ones without phones in their hands.');
  if (G.seeds.yagiri) {
    await bloom('yagiri', 'You knew they were Yagiri Pharmaceutical. You made sure the right people knew too.');
    await N("Two hundred faces turn toward the suits. Silently. The suits run.");
  } else await N('The suits back away. Something about a kidnapping falls apart tonight. You are not quite sure what.');
  await Promise.all(['s1', 's2', 's3'].map(id => moveNpc(id, 'RRRRR', true)));
  ['s1', 's2', 's3'].forEach(removeNpc);
  if (G.seeds.rio) await bloom('rio', 'A text from Rio: "Black van on the north road. They had a girl with a scar." Your new eyes work beautifully.');
  addNpc({ id: 'celty', ch: 'celty', x: 15, y: 11, dir: 'up' });
  await N('An engine with no sound. A horse that whinnies.');
  await moveNpc('celty', 'UUUUUUUUUUU', true);
  removeNpc('celty');
  await N('The Black Rider drives straight up the building wall. Hundreds of phones rise to film her.');
  if (G.seeds.courier) await bloom('courier', 'Halfway up the wall, her helmet turns toward you. A debt, paid in spectacle.');
  if (G.rel.shizuo <= -60) {
    addNpc({ id: 'shizuo', ch: 'shizuo', x: 27, y: 4, dir: 'left' });
    emote('shizuo', '!'); sfx('alarm'); await wait(30);
    await say('SHIZUO', 'IIIZAAAAYAAAA!!');
    if (G.seeds.van) {
      addNpc({ id: 'kadota', ch: 'kadota', x: 26, y: 5, dir: 'up' });
      await say('KADOTA', "Not tonight, Shizuo. Let the kids have their party.");
      await bloom('van', 'Kadota steps in. Free dinner: the best investment you ever made.');
      await moveNpc('shizuo', 'RR', true); removeNpc('shizuo'); removeNpc('kadota');
    } else {
      await I('Ah. Terrible timing, Shizu-chan.');
      const ok = await chase({ dur: 1000 });
      if (ok) { await N('You lose him in the crowd. Two hundred witnesses, and not one of them saw you.'); await gainXP('escape', 1); }
      else { G.flags.finaleCaught = true; await N('Shizuo throws you over a parked car. The crowd thinks it is part of the show.'); }
      removeNpc('shizuo');
    }
  } else await N('No Shizuo tonight. He hates crowds almost as much as he hates you.');
  await N('The crowd melts into the city. Just like that, the Dollars are real.');
  CROWD.forEach((_, k) => removeNpc('crowd' + k));
  await wait(20);
  await movePlayer('RRD');
  G.p.dir = 'right'; face('mikado', 'left');
  await I('Well, well. Tanaka Taro-kun.');
  if (G.seeds.taro) await bloom('taro', 'You knew from the start. He can see it in your smile.');
  await say('MIKADO', '...Orihara-san. How do you know that name?');
  await I('I know everything worth knowing. Tonight, you became extraordinary. How does it feel?');
  const res = await battle(BATTLES.mikado);
  if (res === 'win') {
    await say('MIKADO', '...It feels amazing.');
    await I("Welcome to the extraordinary, Mikado-kun. I'll be watching. Always.");
    rel('mikado', 10); G.flags.beatMikado = true;
  } else {
    await say('MIKADO', "I don't need you to tell me who I am.");
    await I('Ha! Even better. A piece who thinks he is a player.');
  }
  if (G.seeds.dollars) await bloom('dollars', 'You hooked him on the Dollars weeks ago. Tonight he reeled himself in.');
  if (G.seeds.kanra) await bloom('kanra', "Somewhere, Kanra's chat window blinks. They'll tell Kanra everything.");
  await epilogue();
}
async function epilogue() {
  await fadeTo(3);
  G.chapter = 5;
  loadMap('office', 6, 3, 'up');
  await fadeTo(0);
  await N('Later. Shinjuku.');
  await I('A headless rider. A boy king. A gang with no face. A quiet girl with something sharp inside her.');
  if (G.seeds.slasher) await bloom('slasher', "Simon's rumor about night cuts... You smile. Arc 2 will be bloody fun.");
  if (G.seeds.anri) await bloom('anri', "And the quiet girl. You still don't know what she is. That's the best part.");
  await N('On the shelf, inside a glass case, something sleeps. A head. Waiting.');
  await I("I love humans! Every single one of them. Which is why I'll never let this city get boring.");
  await results();
}

/* ---------------- RESULTS ---------------- */
function score() {
  const bloomed = Object.keys(G.bloomed).length, planted = Object.keys(G.seeds).length;
  let s = bloomed * 10 + (planted - bloomed) * 4 + G.wins * 8;
  for (const k in G.rel) if (k !== 'shizuo' && G.rel[k] > 0) s += Math.round(G.rel[k] / 5);
  for (const k of ['manip', 'intel', 'escape', 'foresight']) s += lvl(k) * 3;
  if (G.flags.finaleCaught) s -= 10;
  return s;
}
function rank(s) {
  if (s >= 150) return ['S', 'God of Ikebukuro'];
  if (s >= 115) return ['A', "Shinjuku's Informant"];
  if (s >= 80) return ['B', 'Pawn Pusher'];
  return ['C', 'Just a Flea'];
}
async function results() {
  const s = score(), [r, title] = rank(s);
  try {
    const best = JSON.parse(localStorage.getItem('ikebukuro_gambit_best') || 'null');
    if (!best || best.s < s) localStorage.setItem('ikebukuro_gambit_best', JSON.stringify({ s, r }));
  } catch (e) {}
  await fadeTo(3);
  G.mode = 'results'; G.res = { s, r, title };
  music('title');
  await fadeTo(0);
  sfx('lvl');
  await until(() => pressed.a || pressed.start);
  await card('TO BE CONTINUED', 'Arc 2: Saika. The city is about to get sharp.');
  try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  G.mode = 'title'; music('title');
  await fadeTo(0);
}
function drawResults() {
  const R = G.res;
  rect(0, 0, W, H, 0); box(0, 0, 160, 144);
  textC('ARC 1 COMPLETE', 8, 3);
  text(R.r, 14, 24, 3, 3);
  text(R.title, 40, 26, 3); text('SCORE ' + R.s, 40, 38, 2);
  let y = 54;
  const ids = Object.keys(SEEDS);
  text(`SEEDS ${Object.keys(G.seeds).length}/${ids.length}  BLOOMED ${Object.keys(G.bloomed).length}`, 8, y, 3); y += 11;
  text(`MIND BATTLES WON ${G.wins}`, 8, y, 3); y += 11;
  text(`MAN${lvl('manip')} INT${lvl('intel')} ESC${lvl('escape')} FOR${lvl('foresight')}`, 8, y, 3); y += 13;
  const tip = Object.keys(G.seeds).length < ids.length ? 'Some seeds stayed hidden. Try other people, other choices.' : 'Every seed planted. Terrifying.';
  wrap(tip, 24).forEach((l, k) => text(l, 8, y + k * 10, 2));
  if ((G.frame >> 5) % 2) textC('PRESS A', 132, 3);
}

boot();
