import { SKILLS, TRAINER_NPC, type SkillId } from '../data';
import { t } from '../i18n';
import { PRACTICE_CHANCE } from '../math/chance';
import { PRACTICE_EIGEN } from '../math/eigenseal';
import { generateLA, isLinalg } from '../math/linalg';
import { level } from '../math/mastery';
import { generate, type Topic } from '../math/problems';
import { PRACTICE_SEAL } from '../math/seal';
import { learn } from '../state';
import { balancePuzzle, type BalanceStage } from '../ui/balance';
import { say } from '../ui/dialog';
import { ask, messageBox } from '../ui/question';
import { probeChance, probeEigen, probeSeal } from '../ui/seals';
import { askSteps } from '../ui/steps';

/** One question of any kind; true when answered right. */
async function askTopic(topic: Topic, lv: number, title: string, story?: string): Promise<boolean> {
  if (isLinalg(topic)) return (await askSteps(generateLA(topic, lv), { title, story })).correct;
  return (await ask(generate(topic, lv), { title, story, hint: true })).correct;
}

async function problemRun(skill: SkillId, topic: Topic, need: number, startLevel = 1): Promise<void> {
  let got = 0;
  const name = t(`skills.${skill}.name`);
  while (got < need) {
    const lv = Math.max(startLevel, level(topic));
    if (await askTopic(topic, lv, t('trial.title', { skill: name }), t('trial.progress', { n: got, need }))) got++;
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
  const who = TRAINER_NPC[def.trainer!];
  const name = t(`skills.${skill}.name`);
  const title = t('trial.title', { skill: name });
  await say(who, t(`trial.${skill}.intro`));

  if (!trial) return;
  if (trial.kind === 'problems') {
    await problemRun(skill, trial.topic, trial.need);
  } else if (trial.kind === 'probe' && skill === 'eprobe') {
    // Eigenvale: determinants first, then guess-and-check an eigenvalue
    await problemRun(skill, 'det2', 2);
    await say(who, t('trial.eprobe.guess'));
    const log: string[] = [];
    for (;;) {
      const r = await probeEigen(PRACTICE_EIGEN, log, title);
      if (r.shattered) break;
      if (r.cancelled) await say(who, t('trial.probe.keepTrying'));
    }
  } else if (trial.kind === 'probe' && skill === 'cprobe') {
    // Chancewood: a few pouches first, then a practice seal against the clock
    await problemRun(skill, 'prob_simple', 2);
    await say(who, t('trial.cprobe.seal'));
    const log: string[] = [];
    for (;;) {
      const r = await probeChance(PRACTICE_CHANCE, log, title);
      if (r.shattered) break;
      await say(who, t('trial.cprobe.again'));
    }
  } else if (trial.kind === 'probe') {
    await problemRun(skill, 'order_ops', 2);
    await say(who, t('trial.probe.guess'));
    const log: string[] = [];
    for (;;) {
      const r = await probeSeal(PRACTICE_SEAL, log, title);
      if (r.shattered) break;
      if (r.cancelled) await say(who, t('trial.probe.keepTrying'));
    }
  } else if (skill === 'cunbind') {
    // Chancewood: one outcome, the complement, then two events together
    await problemRun(skill, 'prob_simple', 1);
    await say(who, t('trial.cunbind.not'));
    await problemRun(skill, 'prob_not', 1);
    await say(who, t('trial.cunbind.two'));
    await problemRun(skill, 'prob_two', 1);
  } else if (skill === 'eunbind') {
    // Eigenvale: determinant → eigenvalues → eigenvectors
    await problemRun(skill, 'det2', 1);
    await say(who, t('trial.eunbind.values'));
    await problemRun(skill, 'eigen_val', 2);
    await say(who, t('trial.eunbind.vectors'));
    await problemRun(skill, 'eigen_vec', 1);
  } else {
    for (let i = 0; i < BALANCE_STAGES.length; i++) {
      await balancePuzzle(BALANCE_STAGES[i], title, t(`trial.unbind.stage${i + 1}`));
    }
    await say(who, t('trial.unbind.symbols'));
    let got = 0;
    while (got < 2) {
      const topic: Topic = got === 0 ? 'eq1' : 'eq2';
      if (await askTopic(topic, Math.max(2, level(topic)), title, t('trial.progress', { n: got, need: 2 }))) got++;
    }
  }

  learn(skill);
  await messageBox(t('trial.learnedTitle', { skill: name }), [t(`skills.${skill}.desc`), t(`trial.${skill}.outro`)]);
}

/** The topic used to practise a skill. */
function practiceTopic(id: SkillId): Topic {
  const def = SKILLS[id];
  if (def.focus) return def.focus.topic;
  if (def.trial?.kind === 'problems') return def.trial.topic;
  if (id === 'probe') return 'order_ops';
  if (id === 'eprobe') return 'det2';
  if (id === 'eunbind') return 'eigen_val';
  if (id === 'cprobe') return 'prob_simple';
  if (id === 'cunbind') return 'prob_two';
  return 'eq2';
}

/** Quick practice to restore attunement: one question per faded skill. */
export async function practice(skills: SkillId[]): Promise<number> {
  let restored = 0;
  for (const id of skills) {
    const topic = practiceTopic(id);
    if (await askTopic(topic, level(topic), t('practice.title', { skill: t(`skills.${id}.name`) }))) {
      learn(id);
      restored++;
    }
  }
  return restored;
}
