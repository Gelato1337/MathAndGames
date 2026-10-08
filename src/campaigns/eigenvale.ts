import type { Campaign, CampaignCtx } from '../campaign';
import { t } from '../i18n';
import { det2, generateLA, type Mat } from '../math/linalg';
import { level } from '../math/mastery';
import { randInt } from '../math/problems';
import { game } from '../state';
import { trainer } from '../story/story';
import { choose, say, sayAll } from '../ui/dialog';
import { h, toast } from '../ui/dom';
import { messageBox } from '../ui/question';
import { askSteps } from '../ui/steps';
import { WorldMap, type EncounterDef, type NpcDef } from '../world/map';

/**
 * Eigenvale — linear algebra. Vectors and dot products on the Vector
 * Plains, matrices in the Matrix Mines, a determinant on the door, and
 * eigenvalues/eigenvectors to break the Eigenwarden's seals.
 */

export const EV_W = 60;
export const EV_H = 42;

export const EV_NPCS: NpcDef[] = [
  { id: 'ilona', x: 6, y: 16 },
  { id: 'kerttu', x: 14, y: 16 },
  { id: 'vera', x: 21, y: 16 },
  { id: 'ren', x: 10, y: 22 },
];

export const DOOR_TILES = [
  { x: 49, y: 16 },
  { x: 50, y: 16 },
];

export const EV_START = { x: 9, y: 19 };

export const EV_ENCOUNTERS: EncounterDef[] = [
  {
    id: 'plains',
    region: { x: 31, y: 12, w: 12, h: 14 },
    trigger: { x: 33, y: 12, w: 10, h: 14 },
    enemies: [
      { kind: 'wisp', x: 39, y: 15 },
      { kind: 'wisp', x: 40, y: 23 },
      { kind: 'scalar', x: 38, y: 18 },
      { kind: 'scalar', x: 41, y: 20 },
    ],
  },
  {
    id: 'mines',
    region: { x: 8, y: 31, w: 15, h: 9 },
    trigger: { x: 8, y: 32, w: 15, h: 8 },
    enemies: [
      { kind: 'crystal', x: 16, y: 35 },
      { kind: 'crystal', x: 19, y: 37 },
      { kind: 'bat', x: 14, y: 37 },
      { kind: 'bat', x: 20, y: 33 },
    ],
  },
  {
    id: 'spire',
    region: { x: 46, y: 3, w: 12, h: 13 },
    trigger: { x: 46, y: 3, w: 12, h: 12 },
    enemies: [{ kind: 'warden', x: 52, y: 7 }],
  },
];

function buildEigenvale(): WorldMap {
  const W = EV_W;
  const H = EV_H;
  const t: string[][] = Array.from({ length: H }, () => new Array<string>(W).fill('.'));
  const hgt: number[][] = Array.from({ length: H }, () => new Array<number>(W).fill(0));
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) t[yy][xx] = ch;
  };
  const lift = (x: number, y: number, w: number, h: number, v: number) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W) hgt[yy][xx] = v;
  };
  let seed = 4242;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // scattered flowers and woods
  for (let i = 0; i < 160; i++) t[randInt(rng, 1, H - 2)][randInt(rng, 1, W - 2)] = ',';
  for (let i = 0; i < 90; i++) t[randInt(rng, 1, 10)][randInt(rng, 1, 42)] = 'T';
  for (let i = 0; i < 50; i++) t[randInt(rng, 27, H - 2)][randInt(rng, 27, W - 2)] = 'T';
  lift(1, 1, 42, 9, 1);
  lift(6, 2, 12, 4, 2);

  // border
  fill(0, 0, W, 1, 'T');
  fill(0, H - 1, W, 1, 'T');
  fill(0, 0, 1, H, 'T');
  fill(W - 1, 0, 1, H, 'T');

  // stream with a bridge
  fill(27, 0, 2, 27, '~');
  fill(27, 27, 4, 3, '~');

  // town of Origin
  fill(2, 11, 24, 16, '.');
  lift(2, 11, 24, 16, 0);
  const house = (x: number, w: number, doorX: number) => {
    fill(x, 13, w, 2, 'R');
    for (let xx = x; xx < x + w; xx++) t[15][xx] = (xx - x) % 2 === 1 ? 'w' : 'H';
    t[15][doorX] = 'D';
    fill(doorX, 16, 1, 3, '=');
  };
  house(3, 6, 6); // Ilona's map house
  house(12, 5, 14); // Kerttu's tower
  house(19, 6, 21); // Vera's barracks
  for (const x of [7, 15, 22]) t[16][x] = 'l';
  // training posts in the plaza
  t[23][8] = 'F';
  t[23][12] = 'F';

  // main road east, and the road south to the mines
  fill(2, 19, 49, 2, '=');
  fill(27, 19, 2, 2, 'B');
  fill(12, 21, 2, 10, '=');

  // Vector Plains: open grass with two hills
  fill(31, 12, 12, 14, '.');
  lift(31, 12, 12, 14, 0);
  lift(33, 13, 3, 3, 1);
  lift(34, 14, 1, 1, 2);
  lift(38, 22, 4, 2, 1);
  t[16][36] = 'o';
  t[21][33] = 'o';
  t[17][41] = 'o';
  fill(31, 19, 12, 2, '=');
  // keep the plains' sides wooded
  fill(29, 10, 16, 2, 'T');
  fill(29, 26, 16, 1, 'T');

  // Matrix Mines: a walled quarry with crystal outcrops and ledges
  fill(7, 30, 17, 11, '#');
  fill(8, 31, 15, 9, '_');
  lift(7, 30, 17, 11, 1);
  lift(8, 31, 15, 9, 0);
  fill(12, 30, 2, 1, '_');
  lift(12, 30, 2, 1, 0);
  lift(9, 33, 3, 3, 1);
  lift(19, 31, 3, 2, 1);
  for (const [x, y] of [
    [10, 38],
    [15, 32],
    [21, 36],
    [17, 39],
  ])
    t[y][x] = 'X';
  t[31][8] = 'L';
  t[31][22] = 'L';

  // Eigen Spire: a high plateau behind the Determinant Door
  fill(45, 2, 14, 15, '#');
  fill(46, 3, 12, 13, '_');
  lift(45, 2, 14, 15, 3);
  lift(46, 3, 12, 13, 2);
  lift(51, 6, 4, 4, 3);
  for (const g of DOOR_TILES) t[g.y][g.x] = 'G';
  lift(49, 16, 2, 1, 2);
  // the stair up to the door
  fill(49, 17, 2, 2, '=');
  lift(49, 17, 2, 1, 1);
  t[4][47] = 'L';
  t[4][56] = 'L';
  t[14][47] = 'L';
  t[14][56] = 'L';
  t[5][49] = 'O';
  t[12][55] = 'O';

  // water and bridges are flat; buildings are tall
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ch = t[y][x];
      if (ch === '~') hgt[y][x] = -0.5;
      if ('HwD'.includes(ch)) hgt[y][x] = 2;
      if (ch === 'R') hgt[y][x] = t[y + 1]?.[x] === 'R' ? 3 : 2.5;
    }
  }
  for (const n of EV_NPCS) t[n.y][n.x] = t[n.y][n.x] === '=' ? '=' : '.';
  return new WorldMap({ tiles: t, heights: hgt });
}

// ---------- story ----------

const ev = () => game.ev;
const hasSealBreaker = () => game.learned.has('eprobe') || game.learned.has('eunbind');

function objective(): string {
  const f = ev();
  if (!f.metIlona) return t('ev.obj.talkIlona');
  if (f.wardenDone) return t('ev.obj.done');
  if (!f.plainsDone) return t('ev.obj.plains');
  if (!f.minesDone) return t('ev.obj.mines');
  if (!hasSealBreaker()) return t('ev.obj.train');
  if (!f.doorOpen) return t('ev.obj.door');
  return t('ev.obj.warden');
}

function sideObjective(): string | null {
  const f = ev();
  if (f.metIlona && f.plainsDone && f.mapStage === 0) return t('ev.obj.survey0');
  if (f.mapStage === 1) return t('ev.obj.survey1');
  return null;
}

/** Ilona's survey: where does the warp send each landmark? (matrix × vector) */
async function survey(ctx: CampaignCtx): Promise<void> {
  const f = ev();
  f.mapStage = 1;
  await sayAll('ilona', ['ev.ilona.survey1', 'ev.ilona.survey2']);
  let right = 0;
  for (let i = 0; i < 2; i++) {
    const r = await askSteps(generateLA('mat_vec', Math.max(2, level('mat_vec'))), { title: t('ev.ilona.surveyTitle', { n: i + 1 }), story: t('ev.ilona.surveyStory') });
    if (r.correct) right++;
  }
  if (right === 0) {
    await say('ilona', t('ev.ilona.surveyRetry'));
    return;
  }
  f.mapStage = 2;
  game.gold += 15 * right;
  game.inv.tonic += right;
  await say('ilona', t('ev.ilona.surveyDone', { n: right }));
  toast(t('ev.ilona.surveyReward', { g: 15 * right, n: right }));
  ctx.refresh();
}

async function ilona(ctx: CampaignCtx): Promise<void> {
  const f = ev();
  if (!f.metIlona) {
    await sayAll('ilona', ['ev.ilona.intro1', 'ev.ilona.intro2', 'ev.ilona.intro3']);
    await say('kai', t('ev.ilona.kai'));
    await say('sana', t('ev.ilona.sana'));
    await say('otso', t('ev.ilona.otso'));
    await say('ilona', t('ev.ilona.intro4'));
    f.metIlona = true;
    toast(t('ev.quests.main.started'));
    return;
  }
  for (;;) {
    const options = [
      { id: 'train', label: t('ev.ilona.optTrain') },
      { id: 'warden', label: t('ev.ilona.optWarden') },
      ...(f.plainsDone && f.mapStage < 2 ? [{ id: 'survey', label: t('ev.ilona.optSurvey') }] : []),
      { id: 'hint', label: t('ev.ilona.optHint') },
      { id: 'leave', label: t('common.leave') },
    ];
    const c = await choose('ilona', f.wardenDone ? t('ev.ilona.thanks') : t('ev.ilona.again'), options);
    if (c === 'leave') return;
    if (c === 'train') await trainer('ilona', ctx);
    if (c === 'warden') await sayAll('ilona', ['ev.ilona.warden1', 'ev.ilona.warden2']);
    if (c === 'survey') await survey(ctx);
    if (c === 'hint') await say('ilona', objective());
  }
}

async function talk(npc: NpcDef, ctx: CampaignCtx): Promise<void> {
  if (npc.id !== 'ilona' && !ev().metIlona) {
    await say(npc.id, t(`ev.${npc.id}.busy`));
    return;
  }
  if (npc.id === 'ilona') await ilona(ctx);
  else if (npc.id === 'kerttu') await trainer('kerttu', ctx);
  else if (npc.id === 'vera') await trainer('vera', ctx);
  else if (npc.id === 'ren') await trainer('renEv', ctx);
  ctx.refresh();
}

/** The Determinant Door opens only for a matrix that can be undone (det ≠ 0). */
const DOOR_LOCKS: Mat[] = [
  [
    [2, 4],
    [1, 2],
  ],
  [
    [3, 1],
    [6, 2],
  ],
  [
    [2, 1],
    [1, 3],
  ],
];

async function door(ctx: CampaignCtx): Promise<void> {
  const f = ev();
  if (!f.plainsDone || !f.minesDone) {
    await say(null, t('ev.door.lockedAreas'));
    return;
  }
  if (!hasSealBreaker()) {
    await say(null, t('ev.door.lockedSkill'));
    return;
  }
  await sayAll(null, ['ev.door.intro1', 'ev.door.intro2']);
  for (let i = 0; i < DOOR_LOCKS.length; i++) {
    const A = DOOR_LOCKS[i];
    const [[a, b], [c, d]] = A;
    for (;;) {
      const r = await askSteps(
        {
          topic: 'det2',
          title: { key: 'ev.door.lockTitle', params: { n: i + 1 } },
          eq: ['det', { mat: [[{ t: a, k: 1 }, { t: b, k: 2 }], [{ t: c, k: 2 }, { t: d, k: 1 }]], name: 'A' }, '=', { t: 'a·d', k: 1 }, '−', { t: 'b·c', k: 2 }],
          text: { key: 'la.det2.text' },
          gloss: { 1: { key: 'la.det2.g1' }, 2: { key: 'la.det2.g2' }, 3: { key: 'la.det2.g3' } },
          steps: [
            { label: [{ t: 'a·d', k: 1 }, '='], ans: { kind: 'num', v: a * d } },
            { label: [{ t: 'b·c', k: 2 }, '='], ans: { kind: 'num', v: b * c } },
          ],
          ask: [{ t: 'det A', k: 3 }, '='],
          answer: { kind: 'num', v: det2(A) },
          plot: { vectors: [{ v: [a, c], k: 1, label: 'Ae₁' }, { v: [b, d], k: 2, label: 'Ae₂' }], matrix: A, matrixK: 3 },
          hint: { key: 'la.det2.hint' },
          explain: [{ key: 'la.det2.ex', params: { a, b, c, d, ad: a * d, bc: b * c, D: det2(A) } }],
        },
        { story: t('ev.door.lockStory') },
      );
      if (r.correct) break;
    }
  }
  for (;;) {
    const pick = await choose(null, t('ev.door.which'), DOOR_LOCKS.map((A, i) => ({ id: String(i), label: t('ev.door.lockLabel', { n: i + 1, m: `[${A.map((r) => r.join(' ')).join(' ; ')}]` }) })));
    if (det2(DOOR_LOCKS[Number(pick)]) !== 0) break;
    await say(null, t('ev.door.wrong'));
  }
  f.doorOpen = true;
  ctx.world().replace(DOOR_TILES, '_');
  await say(null, t('ev.door.opened'));
  await say('aino', t('ev.door.aino'));
  ctx.refresh();
}

async function beforeBattle(id: string): Promise<void> {
  if (id === 'plains') {
    await say('sana', t('ev.battle.plains1'));
    await messageBox(t('tutorial.title'), [t('ev.tutorial.l1'), t('ev.tutorial.l2'), t('ev.tutorial.l3'), t('ev.tutorial.l4'), t('ev.tutorial.l5')]);
  } else if (id === 'mines') {
    await say('otso', t('ev.battle.mines1'));
    await messageBox(t('ev.battle.minesTitle'), [t('ev.battle.minesTip1'), t('ev.battle.minesTip2')]);
  } else {
    await say('warden', t('ev.battle.warden1'));
    await say('warden', t('ev.battle.warden2'));
    const tips: string[] = [t('ev.battle.sealRule')];
    if (game.learned.has('eprobe')) tips.push(t('ev.battle.tipProbe'));
    if (game.learned.has('eunbind')) tips.push(t('ev.battle.tipUnbind'));
    tips.push(t('ev.battle.tipPush'));
    await say('aino', t('ev.battle.wardenAino'));
    await messageBox(t('battle.sealTitle'), tips);
  }
}

async function afterBattle(id: string, ctx: CampaignCtx): Promise<boolean> {
  const f = ev();
  if (id === 'plains') {
    f.plainsDone = true;
    game.gold += 15;
    await messageBox(t('combat.winTitle'), [t('ev.win.plains'), t('combat.attuneNote')]);
  } else if (id === 'mines') {
    f.minesDone = true;
    game.gold += 15;
    game.inv.tea += 1;
    await messageBox(t('combat.winTitle'), [t('ev.win.mines')]);
  } else {
    f.wardenDone = true;
    await messageBox(t('combat.winTitle'), [t('ev.win.warden')]);
    return true;
  }
  toast(t('combat.goldGained', { n: 15 }));
  ctx.refresh();
  return false;
}

const step = (done: boolean, text: string) => h(`div${done ? '.good' : ''}`, { text: `${done ? '✔' : '○'} ${text}` });

export const eigenvale: Campaign = {
  id: 'eigenvale',
  party: ['kai', 'aino', 'sana', 'otso'],
  start: EV_START,
  buildWorld: buildEigenvale,
  npcs: EV_NPCS,
  interactables: [{ id: 'door', tiles: DOOR_TILES, active: (w) => DOOR_TILES.some((g) => w.get(g.x, g.y) === 'G') }],
  encounters: EV_ENCOUNTERS,
  entry: {
    plains: [
      { x: 32, y: 19 },
      { x: 32, y: 20 },
      { x: 31, y: 19 },
      { x: 31, y: 20 },
    ],
    mines: [
      { x: 12, y: 31 },
      { x: 13, y: 31 },
      { x: 12, y: 32 },
      { x: 13, y: 32 },
    ],
    spire: [
      { x: 49, y: 15 },
      { x: 50, y: 15 },
      { x: 48, y: 15 },
      { x: 51, y: 15 },
    ],
  },
  encounterActive: (id) => {
    const f = ev();
    if (id === 'plains') return !f.plainsDone;
    if (id === 'mines') return !f.minesDone;
    return f.doorOpen && !f.wardenDone;
  },
  encounterCleared: (id) => {
    const f = ev();
    return id === 'plains' ? f.plainsDone : id === 'mines' ? f.minesDone : f.wardenDone;
  },
  talk,
  examine: (_id, ctx) => door(ctx),
  beforeBattle,
  afterBattle,
  objective,
  sideObjective,
  quests: () => {
    const f = ev();
    const main = h('div.col', {}, [
      h('h3', { text: t('ev.quests.main.title') }),
      h('p.muted', { text: t('ev.quests.main.desc') }),
      step(f.metIlona, t('ev.quests.main.s1')),
      step(f.plainsDone, t('ev.quests.main.s2')),
      step(f.minesDone, t('ev.quests.main.s3')),
      step(f.doorOpen, t('ev.quests.main.s4')),
      step(f.wardenDone, t('ev.quests.main.s5')),
    ]);
    const side =
      f.mapStage > 0
        ? h('div.col', {}, [h('h3', { text: t('ev.quests.survey.title') }), h('p.muted', { text: t('ev.quests.survey.desc') }), step(f.mapStage >= 2, t('ev.quests.survey.s1'))])
        : h('p.muted', { text: t('quests.none') });
    return [main, side];
  },
  intro: ['ev.intro.p1', 'ev.intro.p2', 'ev.intro.p3'],
  ending: () => [t('ev.ending.title'), t('ev.ending.p1'), t('ev.ending.p2'), t('ev.ending.p3')],
  dev: (where, place, world) => {
    const f = ev();
    if (where === 'boss') {
      f.plainsDone = f.minesDone = f.doorOpen = true;
      world.replace(DOOR_TILES, '_');
      place(49, 17);
    } else if (where === 'plains') {
      place(29, 19);
    } else if (where === 'mines') {
      place(12, 28);
    } else if (where === 'door') {
      f.plainsDone = f.minesDone = true;
      place(49, 18);
    }
  },
};

