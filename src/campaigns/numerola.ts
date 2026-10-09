import type { Campaign } from '../campaign';
import { t } from '../i18n';
import { game } from '../state';
import { beforeBattle, examineGate, objective, sideObjective, talk } from '../story/story';
import { h } from '../ui/dom';
import { FIELD_SEEDS } from '../ui/farm';
import { messageBox } from '../ui/question';
import { toast } from '../ui/dom';
import { CAVE_BARRIER, ENCOUNTERS, GATE_TILES, MARSH_BARRIER, NPCS, PLAYER_START, WorldMap } from '../world/map';

const step = (done: boolean, text: string) => h(`div${done ? '.good' : ''}`, { text: `${done ? '✔' : '○'} ${text}` });

/** Primary school: arithmetic → area → missing numbers → first equations. */
export const numerola: Campaign = {
  id: 'numerola',
  party: ['kai', 'aino'],
  start: PLAYER_START,
  buildWorld: () => new WorldMap(),
  prepareWorld: (w) => {
    const f = game.flags;
    if (f.forestDone) w.replace(MARSH_BARRIER, '=');
    if (f.marshDone) w.replace(CAVE_BARRIER, '_');
    if (f.gateOpen) w.openGate();
  },
  stages: (g) => {
    const f = g.flags;
    return [
      { name: 'areas.forest', done: f.forestDone },
      { name: 'areas.marsh', done: f.marshDone },
      { name: 'areas.caves', done: f.cavesDone },
      { name: 'areas.ruins', done: f.golemDone, boss: true },
    ];
  },
  npcs: NPCS,
  interactables: [{ id: 'gate', tiles: GATE_TILES, active: (w) => GATE_TILES.some((g) => w.get(g.x, g.y) === 'G') }],
  encounters: ENCOUNTERS,
  entry: {
    forest: [
      { x: 38, y: 14 },
      { x: 37, y: 15 },
    ],
    marsh: [
      { x: 40, y: 34 },
      { x: 41, y: 34 },
    ],
    caves: [
      { x: 49, y: 37 },
      { x: 49, y: 38 },
    ],
    ruins: [
      { x: 49, y: 14 },
      { x: 49, y: 15 },
    ],
  },
  encounterActive: (id) => {
    const f = game.flags;
    if (id === 'forest') return !f.forestDone;
    if (id === 'marsh') return f.forestDone && !f.marshDone;
    if (id === 'caves') return f.marshDone && !f.cavesDone;
    return f.gateOpen && !f.golemDone;
  },
  encounterCleared: (id) => {
    const f = game.flags;
    return id === 'forest' ? f.forestDone : id === 'marsh' ? f.marshDone : id === 'caves' ? f.cavesDone : f.golemDone;
  },
  talk,
  examine: (_id, ctx) => examineGate(ctx),
  beforeBattle,
  afterBattle: async (id, ctx) => {
    const f = game.flags;
    if (id === 'forest') {
      f.forestDone = true;
      game.gold += 10;
      ctx.world().replace(MARSH_BARRIER, '=');
      await messageBox(t('combat.winTitle'), [t('combat.winForest'), t('combat.attuneNote'), t('combat.pathOpens', { area: t('areas.marsh') })]);
      toast(t('combat.goldGained', { n: 10 }));
      ctx.refresh();
      return false;
    }
    if (id === 'marsh') {
      f.marshDone = true;
      game.gold += 15;
      game.inv.tonic += 1;
      ctx.world().replace(CAVE_BARRIER, '_');
      await messageBox(t('combat.winTitle'), [t('combat.winMarsh'), t('combat.pathOpens', { area: t('areas.caves') })]);
      toast(t('combat.goldGained', { n: 15 }));
      ctx.refresh();
      return false;
    }
    if (id === 'caves') {
      f.cavesDone = true;
      game.gold += 15;
      await messageBox(t('combat.winTitle'), [t('combat.winCaves')]);
      toast(t('combat.goldGained', { n: 15 }));
      ctx.refresh();
      return false;
    }
    game.flags.golemDone = true;
    await messageBox(t('combat.winTitle'), [t('combat.winGolem')]);
    return true;
  },
  objective,
  sideObjective,
  quests: () => {
    const f = game.flags;
    const main = h('div.col', {}, [
      h('h3', { text: t('quests.main.title') }),
      h('p.muted', { text: t('quests.main.desc') }),
      step(f.metElder, t('quests.main.s1')),
      step(f.forestDone, t('quests.main.forest')),
      step(f.marshDone, t('quests.main.marsh')),
      step(f.cavesDone, t('quests.main.caves')),
      step(game.learned.has('probe') || game.learned.has('unbind'), t('quests.main.s2')),
      step(f.gateOpen, t('quests.main.s3')),
      step(f.golemDone, t('quests.main.s4')),
    ]);
    const farm =
      f.farmStage > 0
        ? h('div.col', {}, [
            h('h3', { text: t('quests.farm.title') }),
            h('p.muted', { text: t('quests.farm.desc') }),
            step(f.farmStage >= 2, t('quests.farm.s1')),
            step(f.farmStage >= 3, t('quests.farm.s2')),
            step(f.farmStage >= 4 || game.inv.seeds * 10 >= FIELD_SEEDS, t('quests.farm.s3')),
            step(f.farmStage >= 4, t('quests.farm.s4')),
          ])
        : h('p.muted', { text: t('quests.none') });
    return [main, farm];
  },
  intro: ['intro.p1', 'intro.p2', 'intro.p3'],
  ending: () => {
    const approaches = [...game.approaches].map((a) => t(`farm.approach.${a}`)).join(', ') || '—';
    return [
      t('ending.title'),
      t('ending.p1'),
      t('ending.p2'),
      t('ending.farm', { result: game.flags.farmResult ? t(`ending.farmResult.${game.flags.farmResult}`) : t('ending.farmResult.none') }),
      t('ending.approaches', { list: approaches }),
      t('ending.nextLand'),
    ];
  },
  dev: (where, place, world) => {
    const f = game.flags;
    if (where === 'boss') {
      f.forestDone = f.marshDone = f.cavesDone = f.gateOpen = true;
      numerola.prepareWorld(world);
      place(46, 14);
    } else if (where === 'forest') {
      place(35, 14);
    } else if (where === 'marsh') {
      f.forestDone = true;
      numerola.prepareWorld(world);
      place(40, 29);
    } else if (where === 'caves') {
      f.forestDone = f.marshDone = true;
      numerola.prepareWorld(world);
      place(45, 37);
    } else if (where === 'gate') {
      f.forestDone = f.marshDone = f.cavesDone = true;
      numerola.prepareWorld(world);
      place(45, 14);
    }
  },
};
