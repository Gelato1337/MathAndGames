import type { Campaign } from '../campaign';
import { t } from '../i18n';
import { game } from '../state';
import { beforeBattle, examineGate, objective, sideObjective, talk } from '../story/story';
import { h } from '../ui/dom';
import { FIELD_SEEDS } from '../ui/farm';
import { messageBox } from '../ui/question';
import { toast } from '../ui/dom';
import { ENCOUNTERS, GATE_TILES, NPCS, PLAYER_START, WorldMap } from '../world/map';

const step = (done: boolean, text: string) => h(`div${done ? '.good' : ''}`, { text: `${done ? '✔' : '○'} ${text}` });

/** Primary school: arithmetic → area → missing numbers → first equations. */
export const numerola: Campaign = {
  id: 'numerola',
  party: ['kai', 'aino'],
  start: PLAYER_START,
  buildWorld: () => new WorldMap(),
  npcs: NPCS,
  interactables: [{ id: 'gate', tiles: GATE_TILES, active: (w) => GATE_TILES.some((g) => w.get(g.x, g.y) === 'G') }],
  encounters: ENCOUNTERS,
  entry: {
    forest: [
      { x: 38, y: 14 },
      { x: 37, y: 15 },
    ],
    ruins: [
      { x: 49, y: 14 },
      { x: 49, y: 15 },
    ],
  },
  encounterActive: (id) => (id === 'forest' ? !game.flags.forestDone : game.flags.gateOpen && !game.flags.golemDone),
  encounterCleared: (id) => (id === 'forest' ? game.flags.forestDone : game.flags.golemDone),
  talk,
  examine: (_id, ctx) => examineGate(ctx),
  beforeBattle,
  afterBattle: async (id, ctx) => {
    if (id === 'forest') {
      game.flags.forestDone = true;
      game.gold += 10;
      await messageBox(t('combat.winTitle'), [t('combat.winForest'), t('combat.attuneNote')]);
      toast(t('combat.goldGained', { n: 10 }));
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
    ];
  },
  dev: (where, place, world) => {
    if (where === 'boss') {
      game.flags.gateOpen = true;
      game.flags.forestDone = true;
      world.openGate();
      place(46, 14);
    } else if (where === 'forest') {
      place(35, 14);
    }
  },
};
