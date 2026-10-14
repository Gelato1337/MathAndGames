import type { Campaign, CampaignCtx } from '../campaign';
import { t } from '../i18n';
import type { StepProblem } from '../math/linalg';
import { randInt } from '../math/problems';
import { tanD, type DragTask } from '../math/trig';
import { game } from '../state';
import { trainer } from '../story/story';
import { askAngle } from '../ui/askangle';
import { choose, say, sayAll } from '../ui/dialog';
import { h, toast } from '../ui/dom';
import { messageBox } from '../ui/question';
import { askSteps } from '../ui/steps';
import { WorldMap, type EncounterDef, type NpcDef } from '../world/map';

/**
 * Tidewatch — trigonometry. Right triangles (SOH CAH TOA), the unit circle,
 * radians, sin² + cos² = 1 and waves, taught with the interactive Trig Lens.
 * The lighthouse beam is the unit circle; the tides are sine waves.
 */

export const TW_W = 60;
export const TW_H = 42;

export const TW_NPCS: NpcDef[] = [
  { id: 'keeper', x: 6, y: 16 },
  { id: 'aava', x: 14, y: 16 },
  { id: 'ren', x: 21, y: 17 },
];

export const BEACON_TILES = [
  { x: 49, y: 16 },
  { x: 50, y: 16 },
];

export const TW_START = { x: 9, y: 19 };

/** A rockfall on the cliff path, cleared once the tidepools are safe. */
export const CLIFF_BARRIER = [
  { x: 12, y: 29 },
  { x: 13, y: 29 },
];
/** Driftwood blocks the way to the reef until the cliffs are cleared. */
export const REEF_BARRIER = [
  { x: 46, y: 28 },
  { x: 47, y: 28 },
];

export const TW_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'pools',
    region: { x: 31, y: 12, w: 12, h: 14 },
    trigger: { x: 33, y: 12, w: 10, h: 14 },
    enemies: [
      { kind: 'crab', x: 38, y: 15 },
      { kind: 'crab', x: 40, y: 22 },
      { kind: 'gull', x: 41, y: 17 },
    ],
  },
  {
    id: 'cliffs',
    region: { x: 8, y: 30, w: 15, h: 10 },
    trigger: { x: 8, y: 31, w: 15, h: 9 },
    enemies: [
      { kind: 'gull', x: 16, y: 33 },
      { kind: 'gull', x: 20, y: 37 },
      { kind: 'urchin', x: 18, y: 34 },
      { kind: 'crab', x: 11, y: 37 },
    ],
  },
  {
    id: 'reef',
    region: { x: 35, y: 29, w: 21, h: 11 },
    trigger: { x: 36, y: 31, w: 19, h: 8 },
    enemies: [
      { kind: 'drowned', x: 42, y: 33 },
      { kind: 'drowned', x: 52, y: 37 },
      { kind: 'eel', x: 39, y: 37 },
      { kind: 'siren', x: 53, y: 31 },
    ],
  },
  {
    id: 'rock',
    region: { x: 46, y: 3, w: 12, h: 13 },
    trigger: { x: 46, y: 3, w: 12, h: 12 },
    enemies: [{ kind: 'serpent', x: 52, y: 7 }],
  },
];

function buildTidewatch(): WorldMap {
  const W = TW_W;
  const H = TW_H;
  const t: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill('.'));
  const hgt: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) t[yy][xx] = ch;
  };
  const lift = (x: number, y: number, w: number, h: number, v: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) hgt[yy][xx] = v;
  };
  let seed = 9090;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // coastal heath with wind-bent trees
  for (let i = 0; i < 160; i++) t[randInt(rng, 1, H - 2)][randInt(rng, 1, W - 2)] = ',';
  for (let i = 0; i < 150; i++) t[randInt(rng, 1, H - 2)][randInt(rng, 1, W - 2)] = 'T';
  lift(1, 1, 42, 9, 1);
  lift(8, 2, 10, 4, 2);

  // the open sea along the south edge, with a beach
  fill(0, H - 3, W, 3, '~');
  fill(0, H - 4, W, 1, 'Y');
  // border
  fill(0, 0, W, 1, 'T');
  fill(0, 0, 1, H - 4, 'T');
  fill(W - 1, 0, 1, H - 4, 'T');

  // a sea inlet cuts the coast; a bridge crosses it
  fill(27, 0, 2, 27, '~');
  fill(27, 27, 4, 3, '~');

  // Lantern Cove: the harbour village
  fill(2, 11, 24, 16, '.');
  lift(2, 11, 24, 16, 0);
  const house = (x: number, w: number, doorX: number) => {
    fill(x, 13, w, 2, 'R');
    for (let xx = x; xx < x + w; xx++) t[15][xx] = (xx - x) % 2 === 1 ? 'w' : 'H';
    t[15][doorX] = 'D';
    fill(doorX, 16, 1, 3, '=');
  };
  house(3, 6, 6); // the keeper's cottage
  house(12, 5, 14); // the harbour office
  house(19, 6, 22); // the net loft
  for (const x of [7, 15, 23]) t[16][x] = 'l';
  fill(3, 23, 8, 3, 'Y');
  fill(14, 24, 10, 2, 'Y');

  // main road east, and the cliff path south
  fill(2, 19, 49, 2, '=');
  fill(27, 19, 2, 2, 'B');
  fill(12, 21, 2, 9, '=');

  // Stage 1 — the Tidepools: sand and shallow water
  fill(31, 12, 12, 14, 'Y');
  lift(31, 12, 12, 14, 0);
  fill(31, 19, 12, 2, '=');
  for (const [x, y, w, hh] of [
    [33, 13, 3, 2],
    [39, 14, 2, 3],
    [34, 22, 3, 2],
    [40, 23, 2, 2],
  ])
    fill(x, y, w, hh, 'V');
  for (const [x, y] of [
    [36, 16],
    [41, 21],
    [33, 24],
  ])
    t[y][x] = 'o';
  fill(29, 10, 16, 2, 'T');
  fill(29, 26, 16, 1, 'T');

  // Stage 2 — the Gull Cliffs: grassy terraces stepping up from the sea
  fill(7, 29, 17, 12, 'T');
  fill(8, 30, 15, 10, '.');
  lift(7, 29, 17, 12, 1);
  lift(8, 30, 15, 10, 0);
  lift(15, 30, 8, 4, 1);
  lift(18, 30, 5, 2, 2);
  lift(8, 36, 5, 4, 1);
  for (const b of CLIFF_BARRIER) t[b.y][b.x] = 'o';
  lift(12, 29, 2, 1, 0);
  for (const [x, y] of [
    [10, 32],
    [15, 38],
    [21, 35],
  ])
    t[y][x] = 'o';

  // Stage 3 — Shipwreck Reef: sand bars, shallows and broken hulls
  fill(46, 21, 2, 7, '=');
  fill(34, 28, 23, 13, 'T');
  fill(35, 29, 21, 11, 'Y');
  lift(35, 29, 21, 11, 0);
  fill(46, 28, 2, 1, 'Y');
  for (const b of REEF_BARRIER) t[b.y][b.x] = 'F';
  for (const [x, y, w, hh] of [
    [36, 35, 4, 2],
    [44, 30, 4, 2],
    [48, 36, 5, 3],
  ])
    fill(x, y, w, hh, 'V');
  // the wreck: planks you can't pass, and a raised deck
  fill(41, 32, 1, 4, 'F');
  fill(50, 33, 3, 1, 'F');
  lift(52, 29, 4, 2, 1);

  // Lighthouse Rock: a high stone platform behind the Beacon Gate
  fill(45, 2, 14, 15, '#');
  fill(46, 3, 12, 13, '_');
  lift(45, 2, 14, 15, 3);
  lift(46, 3, 12, 13, 2);
  lift(51, 6, 4, 4, 3);
  for (const g of BEACON_TILES) t[g.y][g.x] = 'G';
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
      if (ch === 'V') hgt[y][x] = Math.min(hgt[y][x], 0);
      if ('HwD'.includes(ch)) hgt[y][x] = 2;
      if (ch === 'R') hgt[y][x] = t[y + 1]?.[x] === 'R' ? 3 : 2.5;
    }
  }
  for (const n of TW_NPCS) t[n.y][n.x] = t[n.y][n.x] === '=' ? '=' : '.';
  fill(5, 17, 18, 2, '.');
  fill(2, 19, 49, 2, '=');
  return new WorldMap({ tiles: t, heights: hgt });
}

// ---------- story ----------

const tw = () => game.tw;
const hasSealBreaker = () => game.learned.has('tprobe') || game.learned.has('tunbind');

function objective(): string {
  const f = tw();
  if (!f.metKeeper) return t('tw.obj.talkKeeper');
  if (f.serpentDone) return t('tw.obj.done');
  if (!f.poolsDone) return t('tw.obj.pools');
  if (!f.cliffsDone) return t('tw.obj.cliffs');
  if (!f.reefDone) return t('tw.obj.reef');
  if (!hasSealBreaker()) return t('tw.obj.train');
  if (!f.gateOpen) return t('tw.obj.gate');
  return t('tw.obj.serpent');
}

function sideObjective(): string | null {
  const f = tw();
  if (f.metKeeper && f.poolsDone && f.surveyStage === 0) return t('tw.obj.survey0');
  if (f.surveyStage === 1) return t('tw.obj.survey1');
  return null;
}

/** The keeper's survey: how tall is the lighthouse? height = distance × tan(angle of elevation). */
function surveyProblem(): StepProblem {
  const dist = 20;
  const angle = 35;
  const height = dist * tanD(angle);
  const W = (name: string, k: number) => ({ t: `@tr.w.${name}`, k });
  return {
    topic: 'trig_sides',
    title: { key: 'tw.keeper.surveyTitle' },
    eq: [W('height', 1), '=', W('distance', 2), '×', { t: 'tan θ', k: 4 }],
    text: { key: 'tw.keeper.surveyText', params: { dist, angle } },
    gloss: { 1: { key: 'tw.keeper.gHeight' }, 2: { key: 'tw.keeper.gDist' }, 4: { key: 'tr.g.tan' }, 5: { key: 'tr.g.theta' } },
    steps: [{ label: [{ t: `tan ${angle}°`, k: 4 }, '='], ans: { kind: 'num', v: tanD(angle), tol: 0.01 } }],
    ask: [W('height', 1), '='],
    answer: { kind: 'num', v: Math.round(height * 10) / 10, tol: 0.3 },
    plot: { vectors: [], trig: { angle, lens: true, readout: true, wall: true }, caption: { key: 'tw.keeper.surveyCap' } },
    hint: { key: 'tw.keeper.surveyHint' },
    explain: [{ key: 'tw.keeper.surveyEx', params: { dist, angle, h: Math.round(height * 10) / 10 } }],
  };
}

async function survey(ctx: CampaignCtx): Promise<void> {
  const f = tw();
  f.surveyStage = 1;
  await sayAll('keeper', ['tw.keeper.survey1', 'tw.keeper.survey2']);
  const r = await askSteps(surveyProblem(), { story: t('tw.keeper.surveyStory') });
  if (!r.correct) {
    await say('keeper', t('tw.keeper.surveyRetry'));
    return;
  }
  f.surveyStage = 2;
  game.gold += 30;
  game.inv.tonic += 2;
  await say('keeper', t('tw.keeper.surveyDone'));
  await say('meri', t('tw.keeper.surveyMeri'));
  toast(t('tw.keeper.surveyReward', { g: 30, n: 2 }));
  ctx.refresh();
}

async function keeper(ctx: CampaignCtx): Promise<void> {
  const f = tw();
  if (!f.metKeeper) {
    await sayAll('keeper', ['tw.keeper.intro1', 'tw.keeper.intro2', 'tw.keeper.intro3']);
    await say('meri', t('tw.keeper.meri'));
    await say('aino', t('tw.keeper.aino'));
    await say('keeper', t('tw.keeper.intro4'));
    f.metKeeper = true;
    toast(t('tw.quests.main.started'));
    return;
  }
  for (;;) {
    const options = [
      { id: 'train', label: t('tw.keeper.optTrain') },
      { id: 'serpent', label: t('tw.keeper.optSerpent') },
      ...(f.poolsDone && f.surveyStage < 2 ? [{ id: 'survey', label: t('tw.keeper.optSurvey') }] : []),
      { id: 'hint', label: t('tw.keeper.optHint') },
      { id: 'leave', label: t('common.leave') },
    ];
    const c = await choose('keeper', f.serpentDone ? t('tw.keeper.thanks') : t('tw.keeper.again'), options);
    if (c === 'leave') return;
    if (c === 'train') await trainer('keeper', ctx);
    if (c === 'serpent') await sayAll('keeper', ['tw.keeper.serpent1', 'tw.keeper.serpent2']);
    if (c === 'survey') await survey(ctx);
    if (c === 'hint') await say('keeper', objective());
  }
}

async function talk(npc: NpcDef, ctx: CampaignCtx): Promise<void> {
  if (npc.id !== 'keeper' && !tw().metKeeper) {
    await say(npc.id, t(`tw.${npc.id}.busy`));
    return;
  }
  if (npc.id === 'keeper') await keeper(ctx);
  else if (npc.id === 'aava') await trainer('aava', ctx);
  else if (npc.id === 'ren') await trainer('renTw', ctx);
  ctx.refresh();
}

/** The Beacon Gate: turn the beam onto three ships. */
const SHIPS: DragTask[] = [
  { fn: 'tan', value: 1, lo: 0, hi: 90, answer: 45, text: { key: 'tw.gate.ship1' } },
  { fn: 'cos', value: 0, lo: 60, hi: 120, answer: 90, text: { key: 'tw.gate.ship2' } },
  { fn: 'tan', value: -1, lo: 90, hi: 180, answer: 135, text: { key: 'tw.gate.ship3' } },
];

async function beaconGate(ctx: CampaignCtx): Promise<void> {
  const f = tw();
  if (!f.poolsDone || !f.cliffsDone || !f.reefDone) {
    await say(null, t('tw.gate.lockedAreas'));
    return;
  }
  if (!hasSealBreaker()) {
    await say(null, t('tw.gate.lockedSkill'));
    return;
  }
  await sayAll(null, ['tw.gate.intro1', 'tw.gate.intro2']);
  for (let i = 0; i < SHIPS.length; i++) {
    for (;;) {
      const r = await askAngle(SHIPS[i], { title: t('tw.gate.shipTitle', { n: i + 1 }), story: t('tw.gate.story') });
      if (r.correct) break;
    }
  }
  f.gateOpen = true;
  ctx.world().replace(BEACON_TILES, '_');
  await say(null, t('tw.gate.opened'));
  await say('meri', t('tw.gate.meri'));
  ctx.refresh();
}

async function beforeBattle(id: string): Promise<void> {
  if (id === 'pools') {
    await say('meri', t('tw.battle.pools1'));
    await messageBox(t('tw.battle.poolsTitle'), [t('tw.battle.poolsTip1'), t('tw.battle.poolsTip2'), t('tw.battle.poolsTip3')]);
  } else if (id === 'cliffs') {
    await say('kai', t('tw.battle.cliffs1'));
    await messageBox(t('tw.battle.cliffsTitle'), [t('tw.battle.cliffsTip1'), t('tw.battle.cliffsTip2')]);
  } else if (id === 'reef') {
    await say('aino', t('tw.battle.reef1'));
    await messageBox(t('tw.battle.reefTitle'), [t('tw.battle.reefTip1'), t('tw.battle.reefTip2')]);
  } else {
    await say('serpent', t('tw.battle.serpent1'));
    await say('serpent', t('tw.battle.serpent2'));
    const tips: string[] = [t('tw.battle.sealRule')];
    if (game.learned.has('tprobe')) tips.push(t('tw.battle.tipProbe'));
    if (game.learned.has('tunbind')) tips.push(t('tw.battle.tipUnbind'));
    await say('meri', t('tw.battle.serpentMeri'));
    await messageBox(t('battle.sealTitle'), tips);
  }
}

async function afterBattle(id: string, ctx: CampaignCtx): Promise<boolean> {
  const f = tw();
  if (id === 'pools') {
    f.poolsDone = true;
    game.gold += 15;
    ctx.world().replace(CLIFF_BARRIER, '=');
    await messageBox(t('combat.winTitle'), [t('tw.win.pools'), t('combat.attuneNote'), t('combat.pathOpens', { area: t('areas.cliffs') })]);
  } else if (id === 'cliffs') {
    f.cliffsDone = true;
    game.gold += 15;
    game.inv.tea += 1;
    ctx.world().replace(REEF_BARRIER, 'Y');
    await messageBox(t('combat.winTitle'), [t('tw.win.cliffs'), t('combat.pathOpens', { area: t('areas.reef') })]);
  } else if (id === 'reef') {
    f.reefDone = true;
    game.gold += 15;
    game.inv.tonic += 1;
    await messageBox(t('combat.winTitle'), [t('tw.win.reef')]);
  } else {
    f.serpentDone = true;
    await messageBox(t('combat.winTitle'), [t('tw.win.serpent')]);
    return true;
  }
  toast(t('combat.goldGained', { n: 15 }));
  ctx.refresh();
  return false;
}

const step = (done: boolean, text: string) => h(`div${done ? '.good' : ''}`, { text: `${done ? '✔' : '○'} ${text}` });

export const tidewatch: Campaign = {
  id: 'tidewatch',
  party: ['kai', 'aino', 'meri'],
  start: TW_START,
  buildWorld: buildTidewatch,
  prepareWorld: (w) => {
    const f = tw();
    if (f.poolsDone) w.replace(CLIFF_BARRIER, '=');
    if (f.cliffsDone) w.replace(REEF_BARRIER, 'Y');
    if (f.gateOpen) w.replace(BEACON_TILES, '_');
  },
  stages: (g) => {
    const f = g.tw;
    return [
      { name: 'areas.pools', done: f.poolsDone },
      { name: 'areas.cliffs', done: f.cliffsDone },
      { name: 'areas.reef', done: f.reefDone },
      { name: 'areas.rock', done: f.serpentDone, boss: true },
    ];
  },
  npcs: TW_NPCS,
  interactables: [{ id: 'beacon', tiles: BEACON_TILES, active: (w) => BEACON_TILES.some((g) => w.get(g.x, g.y) === 'G') }],
  encounters: TW_ENCOUNTERS,
  entry: {
    pools: [
      { x: 32, y: 19 },
      { x: 32, y: 20 },
      { x: 31, y: 19 },
    ],
    cliffs: [
      { x: 12, y: 30 },
      { x: 13, y: 30 },
      { x: 12, y: 31 },
    ],
    reef: [
      { x: 46, y: 30 },
      { x: 47, y: 30 },
      { x: 45, y: 30 },
    ],
    rock: [
      { x: 49, y: 15 },
      { x: 50, y: 15 },
      { x: 48, y: 15 },
    ],
  },
  encounterActive: (id) => {
    const f = tw();
    if (id === 'pools') return !f.poolsDone;
    if (id === 'cliffs') return f.poolsDone && !f.cliffsDone;
    if (id === 'reef') return f.cliffsDone && !f.reefDone;
    return f.gateOpen && !f.serpentDone;
  },
  encounterCleared: (id) => {
    const f = tw();
    return id === 'pools' ? f.poolsDone : id === 'cliffs' ? f.cliffsDone : id === 'reef' ? f.reefDone : f.serpentDone;
  },
  talk,
  examine: (_id, ctx) => beaconGate(ctx),
  beforeBattle,
  afterBattle,
  objective,
  sideObjective,
  quests: () => {
    const f = tw();
    const main = h('div.col', {}, [
      h('h3', { text: t('tw.quests.main.title') }),
      h('p.muted', { text: t('tw.quests.main.desc') }),
      step(f.metKeeper, t('tw.quests.main.s1')),
      step(f.poolsDone, t('tw.quests.main.pools')),
      step(f.cliffsDone, t('tw.quests.main.cliffs')),
      step(f.reefDone, t('tw.quests.main.reef')),
      step(f.gateOpen, t('tw.quests.main.gate')),
      step(f.serpentDone, t('tw.quests.main.serpent')),
    ]);
    const side =
      f.surveyStage > 0
        ? h('div.col', {}, [h('h3', { text: t('tw.quests.survey.title') }), h('p.muted', { text: t('tw.quests.survey.desc') }), step(f.surveyStage >= 2, t('tw.quests.survey.s1'))])
        : h('p.muted', { text: t('quests.none') });
    return [main, side];
  },
  intro: ['tw.intro.p1', 'tw.intro.p2', 'tw.intro.p3'],
  ending: () => [t('tw.ending.title'), t('tw.ending.p1'), t('tw.ending.p2'), t('tw.ending.p3')],
  dev: (where, place, world) => {
    const f = tw();
    f.metKeeper = true;
    if (where === 'boss') {
      f.poolsDone = f.cliffsDone = f.reefDone = f.gateOpen = true;
      place(49, 17);
    } else if (where === 'pools') {
      place(29, 19);
    } else if (where === 'cliffs') {
      f.poolsDone = true;
      place(12, 27);
    } else if (where === 'reef') {
      f.poolsDone = f.cliffsDone = true;
      place(46, 25);
    } else if (where === 'gate') {
      f.poolsDone = f.cliffsDone = f.reefDone = true;
      place(49, 18);
    }
    tidewatch.prepareWorld(world);
  },
};
