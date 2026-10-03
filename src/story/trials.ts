import { SKILLS, type SkillId } from '../data';
import { t } from '../i18n';
import { level } from '../math/mastery';
import { generate, type Topic } from '../math/problems';
import { PRACTICE_SEAL } from '../math/seal';
import { learn } from '../state';
import { balancePuzzle, type BalanceStage } from '../ui/balance';
import { say } from '../ui/dialog';
import { messageBox, ask } from '../ui/question';
import { probeSeal } from '../ui/seals';

async function problemRun(skill: SkillId, topic: Topic, need: number, startLevel = 1): Promise<void> {
  let got = 0;
  const name = t(`skills.${skill}.name`);
  while (got < need) {
    const lv = Math.max(startLevel, level(topic));
    const r = await ask(generate(topic, lv), {
      title: t('trial.title', { skill: name }),
      story: t('trial.progress', { n: got, need }),
      hint: true,
    });
    if (r.correct) got++;
  }
}

/** Balance stages for Unbind: the same idea, three ways. */
export const BALANCE_STAGES: BalanceStage[] = [
  { leftBags: 1, leftUnits: 3, rightBags: 0, rightUnits: 7, x: 4 },
  { leftBags: 2, leftUnits: 1, rightBags: 0, rightUnits: 9, x: 4 },
  { leftBags: 3, leftUnits: 2, rightBags: 1, rightUnits: 8, x: 3 },
];

/** Run the learning trial for a skill. Resolves when learned. */
export async function runTrial(skill: SkillId): Promise<void> {
  const def = SKILLS[skill];
  const trial = def.trial;
  const trainer = def.trainer!;
  const name = t(`skills.${skill}.name`);
  await say(trainer, t(`trial.${skill}.intro`));

  if (!trial) return;
  if (trial.kind === 'problems') {
    await problemRun(skill, trial.topic, trial.need);
  } else if (trial.kind === 'probe') {
    await problemRun(skill, 'order_ops', 2);
    await say(trainer, t('trial.probe.guess'));
    const log: string[] = [];
    for (;;) {
      const r = await probeSeal(PRACTICE_SEAL, log, t('trial.title', { skill: name }));
      if (r.shattered) break;
      if (r.cancelled) await say(trainer, t('trial.probe.keepTrying'));
    }
  } else {
    for (let i = 0; i < BALANCE_STAGES.length; i++) {
      await balancePuzzle(BALANCE_STAGES[i], t('trial.title', { skill: name }), t(`trial.unbind.stage${i + 1}`));
    }
    await say(trainer, t('trial.unbind.symbols'));
    let got = 0;
    while (got < 2) {
      const topic: Topic = got === 0 ? 'eq1' : 'eq2';
      const r = await ask(generate(topic, Math.max(2, level(topic))), {
        title: t('trial.title', { skill: name }),
        story: t('trial.progress', { n: got, need: 2 }),
        hint: true,
      });
      if (r.correct) got++;
    }
  }

  learn(skill);
  await messageBox(t('trial.learnedTitle', { skill: name }), [t(`skills.${skill}.desc`), t(`trial.${skill}.outro`)]);
}

/** Quick practice to restore attunement: one question per faded skill. */
export async function practice(skills: SkillId[]): Promise<number> {
  let restored = 0;
  for (const id of skills) {
    const def = SKILLS[id];
    const topic: Topic = def.overcharge?.topic ?? (id === 'probe' ? 'order_ops' : 'eq2');
    const r = await ask(generate(topic, level(topic)), {
      title: t('practice.title', { skill: t(`skills.${id}.name`) }),
      hint: true,
    });
    if (r.correct) {
      learn(id);
      restored++;
    }
  }
  return restored;
}
