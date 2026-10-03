import { t } from '../i18n';
import { evalSide, fmtSeal, fmtSide, sealSteps, solveSeal, type Seal } from '../math/seal';
import { h } from './dom';
import { ask, messageBox, numberPrompt } from './question';

export interface ProbeResult {
  shattered: boolean;
  /** The player calculated their guess correctly. */
  computedOk: boolean;
  cancelled: boolean;
}

/**
 * Ninja's way: guess and check. Pick a value for x, calculate both sides
 * yourself; if they match, the seal shatters. `log` keeps earlier guesses.
 */
export async function probeSeal(seal: Seal, log: string[], title = t('skills.probe.name')): Promise<ProbeResult> {
  const eq = fmtSeal(seal);
  const n = await numberPrompt({
    title,
    lines: log.length ? [t('probe.intro', { eq }), t('probe.logTitle')] : [t('probe.intro', { eq })],
    extra: log.length ? h('div.explain', {}, log.map((l) => h('p', { text: l }))) : null,
    label: t('probe.pick'),
    cancel: true,
    validate: (v) => (Number.isInteger(v) && v >= 0 && v <= 99 ? null : t('probe.wholeNumber')),
  });
  if (n === null) return { shattered: false, computedOk: false, cancelled: true };

  const lhs = evalSide(seal.a, seal.b, n);
  const rhs = evalSide(seal.c, seal.d, n);
  const sides: Array<{ coef: number; c: number; v: number; key: string }> = [{ coef: seal.a, c: seal.b, v: lhs, key: 'probe.left' }];
  if (seal.c !== 0) sides.push({ coef: seal.c, c: seal.d, v: rhs, key: 'probe.right' });

  for (const s of sides) {
    const expr = fmtSide(s.coef, s.c, n);
    const r = await ask(
      {
        topic: 'probe',
        prompt: { key: 'probe.compute', params: { expr } },
        answer: s.v,
        hint: { key: 'hint.opsMulFirst' },
        explain: [{ key: 'probe.explain', params: { expr, v: s.v } }],
      },
      { title, story: t(s.key, { n, eq }), hint: true },
    );
    if (!r.correct) {
      log.push(t('probe.logSlip', { n }));
      return { shattered: false, computedOk: false, cancelled: false };
    }
  }

  if (lhs === rhs) {
    log.push(t('probe.logHit', { n, lhs, rhs }));
    return { shattered: true, computedOk: true, cancelled: false };
  }
  // f(n) = lhs - rhs grows with n when a > c
  const bigger = (lhs < rhs) === seal.a > seal.c;
  const rel = lhs < rhs ? t('probe.less') : t('probe.more');
  const dir = bigger ? t('probe.tryBigger') : t('probe.trySmaller');
  const line = t('probe.logMiss', { n, lhs, rhs, rel });
  log.push(`${line} ${dir}`);
  await messageBox(title, [line, dir]);
  return { shattered: false, computedOk: true, cancelled: false };
}

/** Mage's way: solve the equation directly. */
export async function unbindSeal(seal: Seal, title = t('skills.unbind.name')): Promise<boolean> {
  const eq = fmtSeal(seal);
  const r = await ask(
    {
      topic: 'eq2',
      prompt: { key: 'unbind.prompt', params: { eq } },
      answer: solveSeal(seal),
      hint: { key: seal.c !== 0 ? 'unbind.hintBags' : 'unbind.hint' },
      explain: sealSteps(seal),
      visual: { kind: 'balance', leftBags: seal.a, leftUnits: seal.b, rightBags: seal.c, rightUnits: seal.d },
    },
    { title, story: t('unbind.story'), hint: true },
  );
  return r.correct;
}
