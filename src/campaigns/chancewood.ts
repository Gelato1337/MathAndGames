import type { Campaign, CampaignCtx } from '../campaign';
import { t } from '../i18n';
import { fracText, probAns, statMeanOf, statMedianOf } from '../math/chance';
import type { StepProblem } from '../math/linalg';
import { randInt } from '../math/problems';
import { game } from '../state';
import { trainer } from '../story/story';
import { choose, say, sayAll } from '../ui/dialog';
import { h, toast } from '../ui/dom';
import { messageBox } from '../ui/question';
import { askSteps } from '../ui/steps';
import { WorldMap, type EncounterDef, type NpcDef } from '../world/map';

/**
 * Chancewood — basic probability and statistics. Mean, median and range
 * from Tilda; single events, "not", two events and dice from Hannu and Ren;
 * Madame Fortuna's seals ask for probabilities.
 */

export const CW_W = 60;
export const CW_H = 42;

export const CW_NPCS: NpcDef[] = [
  { id: 'tilda', x: 6, y: 16 },
  { id: 'hannu', x: 14, y: 16 },
  { id: 'ren', x: 21, y: 17 },
];

export const WHEEL_TILES = [
  { x: 49, y: 16 },
  { x: 50, y: 16 },
];

export const CW_START = { x: 9, y: 19 };

/** A ring of mushrooms closes the hollow until the glade is cleared. */
export const HOLLOW_BARRIER = [
  { x: 12, y: 29 },
  { x: 13, y: 29 },
];
/** Fallen logs block the maze until the hollow is cleared. */
export const MAZE_BARRIER = [
  { x: 46, y: 28 },
  { x: 47, y: 28 },
];

export const CW_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'glade',
    region: { x: 31, y: 12, w: 12, h: 14 },
    trigger: { x: 33, y: 12, w: 10, h: 14 },
    enemies: [
      { kind: 'imp', x: 38, y: 15 },
      { kind: 'imp', x: 40, y: 22 },
      { kind: 'imp', x: 41, y: 17 },
    ],
  },
  {
    id: 'hollow',
    region: { x: 8, y: 30, w: 15, h: 10 },
    trigger: { x: 8, y: 31, w: 15, h: 9 },
    enemies: [
      { kind: 'cube', x: 16, y: 34 },
      { kind: 'cube', x: 19, y: 37 },
      { kind: 'mimic', x: 21, y: 32 },
      { kind: 'imp', x: 11, y: 37 },
    ],
  },
  {
    id: 'maze',
    region: { x: 35, y: 29, w: 21, h: 11 },
    trigger: { x: 36, y: 31, w: 19, h: 8 },
    enemies: [
      { kind: 'bandit', x: 42, y: 33 },
      { kind: 'bandit', x: 52, y: 37 },
      { kind: 'joker', x: 53, y: 31 },
      { kind: 'cube', x: 39, y: 37 },
    ],
  },
  {
    id: 'carnival',
    region: { x: 46, y: 3, w: 12, h: 13 },
    trigger: { x: 46, y: 3, w: 12, h: 12 },
    enemies: [{ kind: 'fortuna', x: 52, y: 7 }],
  },
];

function buildChancewood(): WorldMap {
  const W = CW_W;
  const H = CW_H;
  const t: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill('.'));
  const hgt: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) t[yy][xx] = ch;
  };
  const lift = (x: number, y: number, w: number, h: number, v: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) hgt[yy][xx] = v;
  };
  let seed = 777;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // a dense, dark wood full of toadstools
  for (let i = 0; i < 140; i++) t[randInt(rng, 1, H - 2)][randInt(rng, 1, W - 2)] = ',';
  for (let i = 0; i < 260; i++) t[randInt(rng, 1, H - 2)][randInt(rng, 1, W - 2)] = 'T';
  for (let i = 0; i < 40; i++) t[randInt(rng, 1, H - 2)][randInt(rng, 1, W - 2)] = 'U';
  lift(1, 1, 42, 9, 1);
  lift(8, 2, 10, 4, 2);

  // border
  fill(0, 0, W, 1, 'T');
  fill(0, H - 1, W, 1, 'T');
  fill(0, 0, 1, H, 'T');
  fill(W - 1, 0, 1, H, 'T');

  // a brook with a bridge
  fill(27, 0, 2, 27, '~');
  fill(27, 27, 4, 3, '~');

  // the village of Fortune's Rest
  fill(2, 11, 24, 16, '.');
  lift(2, 11, 24, 16, 0);
  const house = (x: number, w: number, doorX: number) => {
    fill(x, 13, w, 2, 'R');
    for (let xx = x; xx < x + w; xx++) t[15][xx] = (xx - x) % 2 === 1 ? 'w' : 'H';
    t[15][doorX] = 'D';
    fill(doorX, 16, 1, 3, '=');
  };
  house(3, 6, 6); // Tilda's counting house
  house(12, 5, 14); // Hannu's dice parlour
  house(19, 6, 22); // the inn
  for (const x of [7, 15, 23]) t[16][x] = 'l';
  for (const [x, y] of [
    [4, 22],
    [9, 24],
    [18, 23],
    [23, 21],
  ])
    t[y][x] = 'U';

  // main road east, and the road south to the hollow
  fill(2, 19, 49, 2, '=');
  fill(27, 19, 2, 2, 'B');
  fill(12, 21, 2, 9, '=');

  // Stage 1 — Coinflip Glade: a fairy ring of toadstools
  fill(31, 12, 12, 14, '.');
  lift(31, 12, 12, 14, 0);
  fill(31, 19, 12, 2, '=');
  for (const [x, y] of [
    [35, 14],
    [38, 13],
    [41, 15],
    [34, 23],
    [37, 24],
    [41, 23],
  ])
    t[y][x] = 'U';
  lift(36, 16, 3, 2, 1);
  fill(29, 10, 16, 2, 'T');
  fill(29, 26, 16, 1, 'T');

  // Stage 2 — Dice Hollow: a sunken clearing ringed by trees and boulders
  fill(7, 29, 17, 12, 'T');
  fill(8, 30, 15, 10, '=');
  lift(7, 29, 17, 12, 1);
  lift(8, 30, 15, 10, 0);
  for (const b of HOLLOW_BARRIER) t[b.y][b.x] = 'U';
  lift(12, 29, 2, 1, 0);
  for (const [x, y] of [
    [10, 32],
    [15, 38],
    [20, 34],
  ])
    t[y][x] = 'o';
  lift(17, 31, 3, 2, 1);

  // Stage 3 — Gambler's Maze: hedges on a checkerboard
  fill(46, 21, 2, 7, '=');
  fill(34, 28, 23, 13, 'T');
  fill(35, 29, 21, 11, 'q');
  lift(35, 29, 21, 11, 0);
  fill(46, 28, 2, 1, 'q');
  for (const b of MAZE_BARRIER) t[b.y][b.x] = 'o';
  // hedge walls with gaps
  fill(38, 31, 1, 4, 'T');
  fill(44, 33, 1, 5, 'T');
  fill(48, 30, 4, 1, 'T');
  fill(50, 35, 1, 4, 'T');
  fill(40, 37, 3, 1, 'T');
  lift(52, 29, 4, 2, 1);

  // Fortuna's Carnival: a high stage behind the Wheel Gate
  fill(45, 2, 14, 15, '#');
  fill(46, 3, 12, 13, 'q');
  lift(45, 2, 14, 15, 3);
  lift(46, 3, 12, 13, 2);
  lift(51, 6, 4, 4, 3);
  for (const g of WHEEL_TILES) t[g.y][g.x] = 'G';
  lift(49, 16, 2, 1, 2);
  fill(49, 17, 2, 2, '=');
  lift(49, 17, 2, 1, 1);
  for (const [x, y] of [
    [47, 4],
    [56, 4],
    [47, 14],
    [56, 14],
  ])
    t[y][x] = 'L';

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = t[y][x];
      if (ch === '~') hgt[y][x] = -0.5;
      if ('HwD'.includes(ch)) hgt[y][x] = 2;
      if (ch === 'R') hgt[y][x] = t[y + 1]?.[x] === 'R' ? 3 : 2.5;
    }
  }
  for (const n of CW_NPCS) t[n.y][n.x] = t[n.y][n.x] === '=' ? '=' : '.';
  // keep the start and the path to the first NPCs clear
  fill(5, 17, 18, 2, '.');
  fill(2, 19, 49, 2, '=');
  return new WorldMap({ tiles: t, heights: hgt });
}

// ---------- story ----------

const cw = () => game.cw;
const hasSealBreaker = () => game.learned.has('cprobe') || game.learned.has('cunbind');

function objective(): string {
  const f = cw();
  if (!f.metTilda) return t('cw.obj.talkTilda');
  if (f.fortunaDone) return t('cw.obj.done');
  if (!f.gladeDone) return t('cw.obj.glade');
  if (!f.hollowDone) return t('cw.obj.hollow');
  if (!f.mazeDone) return t('cw.obj.maze');
  if (!hasSealBreaker()) return t('cw.obj.train');
  if (!f.gateOpen) return t('cw.obj.gate');
  return t('cw.obj.fortuna');
}

function sideObjective(): string | null {
  const f = cw();
  if (f.metTilda && f.gladeDone && f.logStage === 0) return t('cw.obj.log0');
  if (f.logStage === 1) return t('cw.obj.log1');
  return null;
}

/** Tilda's mushroom log: the mean and the median of a week of counts. */
const MUSHROOM_LOG = [3, 9, 2, 8, 3, 10, 7];

async function mushroomLog(ctx: CampaignCtx): Promise<void> {
  const f = cw();
  f.logStage = 1;
  await sayAll('tilda', ['cw.tilda.log1', 'cw.tilda.log2']);
  const story = t('cw.tilda.logStory', { data: MUSHROOM_LOG.join(', ') });
  const mean = await askSteps(statMeanOf(MUSHROOM_LOG), { title: t('cw.tilda.logTitle', { n: 1 }), story });
  const median = await askSteps(statMedianOf(MUSHROOM_LOG), { title: t('cw.tilda.logTitle', { n: 2 }), story });
  const right = Number(mean.correct) + Number(median.correct);
  if (right === 0) {
    await say('tilda', t('cw.tilda.logRetry'));
    return;
  }
  f.logStage = 2;
  game.gold += 15 * right;
  game.inv.tonic += right;
  await say('tilda', t('cw.tilda.logDone'));
  await say('aino', t('cw.tilda.logAino'));
  toast(t('cw.tilda.logReward', { g: 15 * right, n: right }));
  ctx.refresh();
}

async function tilda(ctx: CampaignCtx): Promise<void> {
  const f = cw();
  if (!f.metTilda) {
    await sayAll('tilda', ['cw.tilda.intro1', 'cw.tilda.intro2', 'cw.tilda.intro3']);
    await say('onni', t('cw.tilda.onni'));
    await say('kai', t('cw.tilda.kai'));
    await say('tilda', t('cw.tilda.intro4'));
    f.metTilda = true;
    toast(t('cw.quests.main.started'));
    return;
  }
  for (;;) {
    const options = [
      { id: 'train', label: t('cw.tilda.optTrain') },
      { id: 'fortuna', label: t('cw.tilda.optFortuna') },
      ...(f.gladeDone && f.logStage < 2 ? [{ id: 'log', label: t('cw.tilda.optLog') }] : []),
      { id: 'hint', label: t('cw.tilda.optHint') },
      { id: 'leave', label: t('common.leave') },
    ];
    const c = await choose('tilda', f.fortunaDone ? t('cw.tilda.thanks') : t('cw.tilda.again'), options);
    if (c === 'leave') return;
    if (c === 'train') await trainer('tilda', ctx);
    if (c === 'fortuna') await sayAll('tilda', ['cw.tilda.fortuna1', 'cw.tilda.fortuna2']);
    if (c === 'log') await mushroomLog(ctx);
    if (c === 'hint') await say('tilda', objective());
  }
}

async function talk(npc: NpcDef, ctx: CampaignCtx): Promise<void> {
  if (npc.id !== 'tilda' && !cw().metTilda) {
    await say(npc.id, t(`cw.${npc.id}.busy`));
    return;
  }
  if (npc.id === 'tilda') await tilda(ctx);
  else if (npc.id === 'hannu') await trainer('hannu', ctx);
  else if (npc.id === 'ren') await trainer('renCh', ctx);
  ctx.refresh();
}

/** The Wheel Gate's three spinners: [gold slices, all slices]. Only the best chance opens it. */
const WHEELS: Array<[number, number]> = [
  [2, 8],
  [3, 12],
  [1, 3],
];

function wheelProblem(i: number): StepProblem {
  const [gold, all] = WHEELS[i];
  const W = (name: string, k: number) => ({ t: `@pr.w.${name}`, k });
  return {
    topic: 'prob_simple',
    title: { key: 'cw.gate.wheelTitle', params: { n: i + 1 } },
    eq: [{ t: 'P', k: 3 }, '=', W('goldSlices', 1), '÷', W('allSlices', 2)],
    text: { key: 'cw.gate.wheelText', params: { gold, all } },
    gloss: { 1: { key: 'cw.gate.g1' }, 2: { key: 'cw.gate.g2' }, 3: { key: 'pr.prob_simple.g3' } },
    steps: [
      { label: [W('goldSlices', 1), '='], ans: { kind: 'num', v: gold } },
      { label: [W('allSlices', 2), '='], ans: { kind: 'num', v: all } },
    ],
    ask: [{ t: 'P', k: 3 }, '='],
    answer: probAns(gold, all),
    plot: { vectors: [], tokens: [{ k: 1, n: gold }, { k: 2, n: all - gold }], caption: { key: 'cw.gate.cap' } },
    hint: { key: 'pr.prob_simple.hint' },
    explain: [{ key: 'pr.prob_simple.ex', params: { gold, total: all, f: fracText(gold, all) } }],
  };
}

async function wheelGate(ctx: CampaignCtx): Promise<void> {
  const f = cw();
  if (!f.gladeDone || !f.hollowDone || !f.mazeDone) {
    await say(null, t('cw.gate.lockedAreas'));
    return;
  }
  if (!hasSealBreaker()) {
    await say(null, t('cw.gate.lockedSkill'));
    return;
  }
  await sayAll(null, ['cw.gate.intro1', 'cw.gate.intro2']);
  for (let i = 0; i < WHEELS.length; i++) {
    for (;;) {
      const r = await askSteps(wheelProblem(i), { story: t('cw.gate.wheelStory') });
      if (r.correct) break;
    }
  }
  for (;;) {
    const pick = await choose(
      null,
      t('cw.gate.which'),
      WHEELS.map(([g, a], i) => ({ id: String(i), label: t('cw.gate.wheelLabel', { n: i + 1, f: fracText(g, a) }) })),
    );
    const i = Number(pick);
    const best = WHEELS.every(([g, a]) => WHEELS[i][0] / WHEELS[i][1] >= g / a);
    if (best) break;
    await say(null, t('cw.gate.wrong', { f: fracText(WHEELS[i][0], WHEELS[i][1]) }));
  }
  f.gateOpen = true;
  ctx.world().replace(WHEEL_TILES, '_');
  await say(null, t('cw.gate.opened'));
  await say('onni', t('cw.gate.onni'));
  ctx.refresh();
}

async function beforeBattle(id: string): Promise<void> {
  if (id === 'glade') {
    await say('onni', t('cw.battle.glade1'));
    await messageBox(t('cw.battle.gladeTitle'), [t('cw.battle.gladeTip1'), t('cw.battle.gladeTip2'), t('cw.battle.gladeTip3')]);
  } else if (id === 'hollow') {
    await say('kai', t('cw.battle.hollow1'));
    await messageBox(t('cw.battle.hollowTitle'), [t('cw.battle.hollowTip1'), t('cw.battle.hollowTip2')]);
  } else if (id === 'maze') {
    await say('aino', t('cw.battle.maze1'));
    await messageBox(t('cw.battle.mazeTitle'), [t('cw.battle.mazeTip1'), t('cw.battle.mazeTip2')]);
  } else {
    await say('fortuna', t('cw.battle.fortuna1'));
    await say('fortuna', t('cw.battle.fortuna2'));
    const tips: string[] = [t('cw.battle.sealRule')];
    if (game.learned.has('cprobe')) tips.push(t('cw.battle.tipProbe'));
    if (game.learned.has('cunbind')) tips.push(t('cw.battle.tipUnbind'));
    await say('onni', t('cw.battle.fortunaOnni'));
    await messageBox(t('battle.sealTitle'), tips);
  }
}

async function afterBattle(id: string, ctx: CampaignCtx): Promise<boolean> {
  const f = cw();
  if (id === 'glade') {
    f.gladeDone = true;
    game.gold += 15;
    ctx.world().replace(HOLLOW_BARRIER, '=');
    await messageBox(t('combat.winTitle'), [t('cw.win.glade'), t('combat.attuneNote'), t('combat.pathOpens', { area: t('areas.hollow') })]);
  } else if (id === 'hollow') {
    f.hollowDone = true;
    game.gold += 15;
    game.inv.tea += 1;
    ctx.world().replace(MAZE_BARRIER, 'q');
    await messageBox(t('combat.winTitle'), [t('cw.win.hollow'), t('combat.pathOpens', { area: t('areas.maze') })]);
  } else if (id === 'maze') {
    f.mazeDone = true;
    game.gold += 15;
    game.inv.tonic += 1;
    await messageBox(t('combat.winTitle'), [t('cw.win.maze')]);
  } else {
    f.fortunaDone = true;
    await messageBox(t('combat.winTitle'), [t('cw.win.fortuna')]);
    return true;
  }
  toast(t('combat.goldGained', { n: 15 }));
  ctx.refresh();
  return false;
}

const step = (done: boolean, text: string) => h(`div${done ? '.good' : ''}`, { text: `${done ? '✔' : '○'} ${text}` });

export const chancewood: Campaign = {
  id: 'chancewood',
  party: ['kai', 'aino', 'onni'],
  start: CW_START,
  buildWorld: buildChancewood,
  prepareWorld: (w) => {
    const f = cw();
    if (f.gladeDone) w.replace(HOLLOW_BARRIER, '=');
    if (f.hollowDone) w.replace(MAZE_BARRIER, 'q');
    if (f.gateOpen) w.replace(WHEEL_TILES, '_');
  },
  stages: (g) => {
    const f = g.cw;
    return [
      { name: 'areas.glade', done: f.gladeDone },
      { name: 'areas.hollow', done: f.hollowDone },
      { name: 'areas.maze', done: f.mazeDone },
      { name: 'areas.carnival', done: f.fortunaDone, boss: true },
    ];
  },
  npcs: CW_NPCS,
  interactables: [{ id: 'wheel', tiles: WHEEL_TILES, active: (w) => WHEEL_TILES.some((g) => w.get(g.x, g.y) === 'G') }],
  encounters: CW_ENCOUNTERS,
  entry: {
    glade: [
      { x: 32, y: 19 },
      { x: 32, y: 20 },
      { x: 31, y: 19 },
    ],
    hollow: [
      { x: 12, y: 30 },
      { x: 13, y: 30 },
      { x: 12, y: 31 },
    ],
    maze: [
      { x: 46, y: 30 },
      { x: 47, y: 30 },
      { x: 45, y: 30 },
    ],
    carnival: [
      { x: 49, y: 15 },
      { x: 50, y: 15 },
      { x: 48, y: 15 },
    ],
  },
  encounterActive: (id) => {
    const f = cw();
    if (id === 'glade') return !f.gladeDone;
    if (id === 'hollow') return f.gladeDone && !f.hollowDone;
    if (id === 'maze') return f.hollowDone && !f.mazeDone;
    return f.gateOpen && !f.fortunaDone;
  },
  encounterCleared: (id) => {
    const f = cw();
    return id === 'glade' ? f.gladeDone : id === 'hollow' ? f.hollowDone : id === 'maze' ? f.mazeDone : f.fortunaDone;
  },
  talk,
  examine: (_id, ctx) => wheelGate(ctx),
  beforeBattle,
  afterBattle,
  objective,
  sideObjective,
  quests: () => {
    const f = cw();
    const main = h('div.col', {}, [
      h('h3', { text: t('cw.quests.main.title') }),
      h('p.muted', { text: t('cw.quests.main.desc') }),
      step(f.metTilda, t('cw.quests.main.s1')),
      step(f.gladeDone, t('cw.quests.main.glade')),
      step(f.hollowDone, t('cw.quests.main.hollow')),
      step(f.mazeDone, t('cw.quests.main.maze')),
      step(f.gateOpen, t('cw.quests.main.gate')),
      step(f.fortunaDone, t('cw.quests.main.fortuna')),
    ]);
    const side =
      f.logStage > 0
        ? h('div.col', {}, [h('h3', { text: t('cw.quests.log.title') }), h('p.muted', { text: t('cw.quests.log.desc') }), step(f.logStage >= 2, t('cw.quests.log.s1'))])
        : h('p.muted', { text: t('quests.none') });
    return [main, side];
  },
  intro: ['cw.intro.p1', 'cw.intro.p2', 'cw.intro.p3'],
  ending: () => [t('cw.ending.title'), t('cw.ending.p1'), t('cw.ending.p2'), t('cw.ending.p3')],
  dev: (where, place, world) => {
    const f = cw();
    f.metTilda = true;
    if (where === 'boss') {
      f.gladeDone = f.hollowDone = f.mazeDone = f.gateOpen = true;
      place(49, 17);
    } else if (where === 'glade') {
      place(29, 19);
    } else if (where === 'hollow') {
      f.gladeDone = true;
      place(12, 27);
    } else if (where === 'maze') {
      f.gladeDone = f.hollowDone = true;
      place(46, 25);
    } else if (where === 'gate') {
      f.gladeDone = f.hollowDone = f.mazeDone = true;
      place(49, 18);
    }
    chancewood.prepareWorld(world);
  },
};
