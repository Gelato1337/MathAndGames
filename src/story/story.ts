import type { CampaignCtx } from '../campaign';
import { SEEDS_PER_BAG, TRAINER_NPC, TRAINER_SKILLS, type TrainerId } from '../data';
import { t } from '../i18n';
import { attunement, game } from '../state';
import { choose, say, sayAll, type Choice } from '../ui/dialog';
import { toast } from '../ui/dom';
import { FIELD_AREA, FIELD_SEEDS, farmPlanner } from '../ui/farm';
import { messageBox } from '../ui/question';
import { runePuzzle } from '../ui/runes';
import { openShop } from '../ui/shop';
import type { NpcDef } from '../world/map';
import { practice, runTrial } from './trials';

export type StoryCtx = CampaignCtx;

export function hasSealBreaker(): boolean {
  return game.learned.has('probe') || game.learned.has('unbind');
}

/** The current main objective, shown in the HUD. */
export function objective(): string {
  const f = game.flags;
  if (!f.metElder) return t('obj.talkElder');
  if (f.golemDone) return t('obj.done');
  if (!hasSealBreaker()) return t('obj.train');
  if (!f.gateOpen) return t('obj.gate');
  return t('obj.golem');
}

export function sideObjective(): string | null {
  const s = game.flags.farmStage;
  if (s === 0 && game.flags.metElder) return t('obj.farm0');
  if (s >= 1 && s <= 3) return t(`obj.farm${s}`, { seeds: FIELD_SEEDS });
  return null;
}

async function elder(): Promise<void> {
  const f = game.flags;
  if (!f.metElder) {
    await sayAll('elder', ['elder.intro1', 'elder.intro2', 'elder.intro3', 'elder.intro4']);
    await say('kai', t('elder.kaiReply'));
    await say('aino', t('elder.ainoReply'));
    await say('elder', t('elder.intro5'));
    f.metElder = true;
    toast(t('quests.main.started'));
    return;
  }
  if (f.golemDone) {
    await say('elder', t('elder.thanks'));
    return;
  }
  for (;;) {
    const c = await choose('elder', t('elder.again'), [
      { id: 'golem', label: t('elder.optGolem') },
      { id: 'hint', label: t('elder.optHint') },
      { id: 'leave', label: t('common.leave') },
    ]);
    if (c === 'leave') return;
    if (c === 'golem') await sayAll('elder', ['elder.golem1', 'elder.golem2']);
    if (c === 'hint') {
      if (!hasSealBreaker()) await say('elder', t('elder.hintTrain'));
      else if (!f.gateOpen) await say('elder', t('elder.hintGate'));
      else await say('elder', t('elder.hintGolem'));
    }
  }
}

/** Talk to a trainer: take the next trial, practise faded skills, or chat. Shared by all campaigns. */
export async function trainer(id: TrainerId, ctx: StoryCtx): Promise<void> {
  const who = TRAINER_NPC[id];
  const seenKey = `${id}Seen`;
  const seen = (game.flags as unknown as Record<string, boolean>)[seenKey];
  if (!seen) {
    await sayAll(who, [`${id}.intro1`, `${id}.intro2`]);
    (game.flags as unknown as Record<string, boolean>)[seenKey] = true;
  }
  for (;;) {
    const next = TRAINER_SKILLS[id].find((s) => !game.learned.has(s));
    const faded = TRAINER_SKILLS[id].filter((s) => game.learned.has(s) && attunement(s) < 1);
    const options: Choice[] = [];
    if (next) options.push({ id: 'train', label: t('trainer.train', { skill: t(`skills.${next}.name`) }) });
    if (faded.length) options.push({ id: 'practice', label: t('trainer.practice', { n: faded.length }) });
    options.push({ id: 'about', label: t('trainer.about') });
    options.push({ id: 'leave', label: t('common.leave') });
    const c = await choose(who, next ? t(`${id}.menu`) : t(`${id}.menuDone`), options);
    if (c === 'leave') return;
    if (c === 'about') await sayAll(who, [`${id}.about1`, `${id}.about2`]);
    if (c === 'train' && next) {
      await runTrial(next);
      ctx.refresh();
      if (['probe', 'unbind', 'eprobe', 'eunbind'].includes(next)) await say(who, t(`${id}.sealHint`));
    }
    if (c === 'practice') {
      const n = await practice(faded);
      await say(who, t('trainer.practiced', { n, total: faded.length }));
      ctx.refresh();
    }
  }
}

async function pekka(ctx: StoryCtx): Promise<void> {
  for (;;) {
    const c = await choose('pekka', t('pekka.hello'), [
      { id: 'shop', label: t('pekka.optShop') },
      { id: 'chat', label: t('pekka.optChat') },
      { id: 'leave', label: t('common.leave') },
    ]);
    if (c === 'leave') return;
    if (c === 'shop') await openShop(ctx.refresh);
    if (c === 'chat') await sayAll('pekka', ['pekka.chat1', 'pekka.chat2']);
  }
}

async function helmi(ctx: StoryCtx): Promise<void> {
  const f = game.flags;
  if (f.farmStage === 0) {
    await sayAll('helmi', ['helmi.intro1', 'helmi.intro2', 'helmi.intro3']);
    const c = await choose('helmi', t('helmi.ask'), [
      { id: 'yes', label: t('helmi.optHelp') },
      { id: 'no', label: t('helmi.optLater') },
    ]);
    if (c === 'no') {
      await say('helmi', t('helmi.later'));
      return;
    }
    f.farmStage = 1;
    toast(t('quests.farm.started'));
    ctx.refresh();
  }
  if (f.farmStage <= 2) {
    const done = await farmPlanner();
    ctx.refresh();
    if (!done) {
      await say('helmi', t('helmi.comeBack'));
      return;
    }
    await say('helmi', t('helmi.planned', { area: FIELD_AREA, seeds: FIELD_SEEDS, bag: SEEDS_PER_BAG }));
    ctx.refresh();
    return;
  }
  if (f.farmStage === 3) {
    const have = game.inv.seeds * SEEDS_PER_BAG;
    if (have === 0) {
      await say('helmi', t('helmi.needSeeds', { seeds: FIELD_SEEDS, bag: SEEDS_PER_BAG }));
      return;
    }
    if (have < FIELD_SEEDS) {
      const c = await choose('helmi', t('helmi.short', { have, need: FIELD_SEEDS, missing: FIELD_SEEDS - have }), [
        { id: 'more', label: t('helmi.optMore') },
        { id: 'plant', label: t('helmi.optPlantAnyway') },
      ]);
      if (c === 'more') return;
    }
    const used = game.inv.seeds;
    game.inv.seeds = 0;
    let reward: number;
    if (have < FIELD_SEEDS) {
      f.farmResult = 'under';
      const pct = Math.round((have / FIELD_SEEDS) * 100);
      reward = Math.max(5, Math.round((20 * have) / FIELD_SEEDS));
      await say('helmi', t('helmi.under', { pct }));
    } else if (have - FIELD_SEEDS >= SEEDS_PER_BAG) {
      f.farmResult = 'over';
      reward = 20;
      await say('helmi', t('helmi.over', { extra: have - FIELD_SEEDS, bags: used - Math.ceil(FIELD_SEEDS / SEEDS_PER_BAG) }));
    } else {
      f.farmResult = 'exact';
      reward = 30;
      game.inv.tonic += 2;
      await say('helmi', t('helmi.exact', { bags: used, left: have - FIELD_SEEDS }));
    }
    game.gold += reward;
    f.farmStage = 4;
    toast(t('helmi.reward', { n: reward }));
    ctx.refresh();
    return;
  }
  await say('helmi', t(f.farmResult === 'exact' ? 'helmi.doneExact' : 'helmi.done'));
}

export async function talk(npc: NpcDef, ctx: StoryCtx): Promise<void> {
  if (npc.id !== 'elder' && !game.flags.metElder) {
    await say(npc.id, t(`${npc.id}.busy`));
    return;
  }
  switch (npc.id) {
    case 'elder':
      await elder();
      break;
    case 'ren':
    case 'lumi':
      await trainer(npc.id as TrainerId, ctx);
      break;
    case 'pekka':
      await pekka(ctx);
      break;
    case 'helmi':
      await helmi(ctx);
      break;
  }
  ctx.refresh();
}

export async function examineGate(ctx: StoryCtx): Promise<void> {
  if (!hasSealBreaker()) {
    await say(null, t('gate.locked'));
    return;
  }
  await say(null, t('gate.intro'));
  await runePuzzle();
  game.flags.gateOpen = true;
  ctx.world().openGate();
  await say(null, t('gate.opened'));
  await say('aino', t('gate.foreshadow'));
  ctx.refresh();
}

export async function beforeBattle(id: string): Promise<void> {
  if (id === 'forest') {
    await say('kai', t('battle.forest1'));
    await messageBox(t('tutorial.title'), [t('tutorial.l1'), t('tutorial.l2'), t('tutorial.l3'), t('tutorial.l4'), t('tutorial.l5'), t('tutorial.l6'), t('tutorial.l7')]);
  } else {
    await say('golem', t('battle.golem1'));
    await say('golem', t('battle.golem2'));
    const tips: string[] = [];
    if (game.learned.has('probe')) tips.push(t('battle.tipProbe'));
    if (game.learned.has('unbind')) tips.push(t('battle.tipUnbind'));
    await say('aino', t('battle.golemAino'));
    await messageBox(t('battle.sealTitle'), [t('battle.sealRule'), ...tips]);
  }
}
