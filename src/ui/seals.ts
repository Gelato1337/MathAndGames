import { fmtNum, t } from '../i18n';
import { eigenLabel, fmtMat, isEigenSeal, type AnySeal, type EigenSeal } from '../math/eigenseal';
import { eigenValueProblem, eigenvalues, eigenVectorProblem, matVec } from '../math/linalg';
import { askSteps } from './steps';
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
    tutor: {
      problem: () => eq,
      context: () => t('tutor.probeTask'),
      attempts: () => log,
      answer: () => solveSeal(seal),
    },
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

// ---------- Eigenvale: matrix seals ----------

/**
 * Guess and check for an eigenvalue: pick λ, work out det(A − λI) yourself.
 * Zero means λ is an eigenvalue and the seal breaks. For a vector seal: pick
 * v, work out Av, and see if it equals λv.
 */
export async function probeEigen(seal: EigenSeal, log: string[], title = t('skills.eprobe.name')): Promise<ProbeResult> {
  const m = fmtMat(seal.A);
  const [[a, b], [c, d]] = seal.A;
  const T = (s: string, k: number) => ({ t: s, k });
  if (seal.mode === 'value') {
    const n = await numberPrompt({
      title,
      lines: log.length ? [t('eseal.probeValue', { m }), t('probe.logTitle')] : [t('eseal.probeValue', { m })],
      extra: log.length ? h('div.explain', {}, log.map((l) => h('p', { text: l }))) : null,
      label: 'λ =',
      cancel: true,
      validate: (v) => (Number.isInteger(v) && Math.abs(v) <= 20 ? null : t('eseal.wholeLambda')),
      tutor: { problem: () => t('eseal.probeValue', { m }), context: () => t('tutor.eprobeTask'), attempts: () => log, answer: () => eigenvalues(seal.A)[0] },
    });
    if (n === null) return { shattered: false, computedOk: false, cancelled: true };
    const D = (a - n) * (d - n) - b * c;
    const r = await askSteps(
      {
        topic: 'det2',
        title: { key: 'eseal.probeTitle' },
        eq: [{ mat: seal.A, k: 1, name: 'A' }, ',', 'det(', T('A', 1), '−', T(fmtNum(n), 3), T('I', 4), ')'],
        text: { key: 'eseal.probeText', params: { l: n } },
        gloss: { 1: { key: 'la.eigen_val.g1' }, 3: { key: 'eseal.gGuess' }, 4: { key: 'la.eigen_vec.g4' } },
        steps: [
          { label: [T('a', 1), '−', T(fmtNum(n), 3), '='], ans: { kind: 'num', v: a - n } },
          { label: [T('d', 1), '−', T(fmtNum(n), 3), '='], ans: { kind: 'num', v: d - n } },
        ],
        ask: ['(a − λ)(d − λ) − bc ='],
        answer: { kind: 'num', v: D },
        hint: { key: 'eseal.probeHint' },
        explain: [{ key: 'eseal.probeEx', params: { a, d, b, c, l: n, D } }],
      },
      { title },
    );
    if (!r.correct) {
      log.push(t('probe.logSlip', { n }));
      return { shattered: false, computedOk: false, cancelled: false };
    }
    if (D === 0) {
      log.push(t('eseal.logHit', { l: n }));
      return { shattered: true, computedOk: true, cancelled: false };
    }
    const line = t('eseal.logMiss', { l: n, D });
    log.push(line);
    await messageBox(title, [line, t('eseal.missTip', { tr: a + d, det: a * d - b * c })]);
    return { shattered: false, computedOk: true, cancelled: false };
  }

  // vector mode: guess a direction v and test Av = λv
  const l = seal.lambda!;
  const vx = await numberPrompt({ title, lines: [t('eseal.probeVector', { m, l })], label: 'v₁ =', cancel: true, validate: (v) => (Number.isInteger(v) && Math.abs(v) <= 9 ? null : t('eseal.wholeLambda')) });
  if (vx === null) return { shattered: false, computedOk: false, cancelled: true };
  const vy = await numberPrompt({ title, lines: [t('eseal.probeVector', { m, l })], label: 'v₂ =', cancel: true, validate: (v) => (Number.isInteger(v) && Math.abs(v) <= 9 ? null : t('eseal.wholeLambda')) });
  if (vy === null) return { shattered: false, computedOk: false, cancelled: true };
  const v = [vx, vy];
  const Av = matVec(seal.A, v);
  const r = await askSteps(
    {
      topic: 'mat_vec',
      title: { key: 'eseal.probeVecTitle' },
      eq: [{ mat: seal.A, k: 1, name: 'A' }, { vec: v, k: 2, name: 'v' }, '=?', T(fmtNum(l), 3), T('v', 2)],
      text: { key: 'eseal.probeVecText', params: { l } },
      gloss: { 1: { key: 'la.mat_vec.g1' }, 2: { key: 'la.mat_vec.g2' }, 3: { key: 'la.eigen_val.g3' } },
      steps: [
        { label: [T('row₁', 1), '·', T('v', 2), '='], ans: { kind: 'num', v: Av[0] } },
        { label: [T('row₂', 1), '·', T('v', 2), '='], ans: { kind: 'num', v: Av[1] } },
      ],
      ask: [T('Av', 3), '='],
      answer: { kind: 'vec', v: Av },
      stepsAreAnswer: true,
      plot: { vectors: [{ v, k: 2, label: 'v' }, { v: Av, k: 3, label: 'Av' }], matrix: seal.A, matrixK: 1 },
      hint: { key: 'la.mat_vec.hint' },
      explain: [{ key: 'la.mat_vec.ex', params: { w: `(${Av.join(', ')})` } }],
    },
    { title },
  );
  if (!r.correct) {
    log.push(t('eseal.logVecSlip', { v: `(${vx}, ${vy})` }));
    return { shattered: false, computedOk: false, cancelled: false };
  }
  const hit = Av[0] === l * vx && Av[1] === l * vy && (vx !== 0 || vy !== 0);
  const line = hit ? t('eseal.logVecHit', { v: `(${vx}, ${vy})` }) : t('eseal.logVecMiss', { v: `(${vx}, ${vy})`, av: `(${Av.join(', ')})`, lv: `(${l * vx}, ${l * vy})` });
  log.push(line);
  if (!hit) await messageBox(title, [line, t('eseal.vecTip')]);
  return { shattered: hit, computedOk: true, cancelled: false };
}

/** Solve the seal directly with the eigenvalue / eigenvector method. */
export async function unbindEigen(seal: EigenSeal, title = t('skills.eunbind.name')): Promise<boolean> {
  const p = seal.mode === 'value' ? eigenValueProblem(2, Math.random, seal.A) : eigenVectorProblem(2, Math.random, { A: seal.A, l: seal.lambda! });
  const r = await askSteps(p, { title, story: t('eseal.unbindStory') });
  return r.correct;
}

/** Text shown above a sealed enemy, for either kind of seal. */
export function sealLabel(s: AnySeal): string {
  return isEigenSeal(s) ? eigenLabel(s) : fmtSeal(s);
}

export function probeAny(s: AnySeal, log: string[]): Promise<ProbeResult> {
  return isEigenSeal(s) ? probeEigen(s, log) : probeSeal(s, log);
}

export function unbindAny(s: AnySeal): Promise<boolean> {
  return isEigenSeal(s) ? unbindEigen(s) : unbindSeal(s);
}
