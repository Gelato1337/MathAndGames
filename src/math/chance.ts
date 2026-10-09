/**
 * Probability and statistics problems for the Chancewood campaign. Like the
 * linear algebra problems they are solved in steps, with colour-coded terms:
 * colour 1 is always "what we count" (favourable outcomes, the data), colour 2
 * "everything" (all outcomes, how many values), colour 3 the result.
 */
import { t, type Params } from '../i18n';
import type { Ans, Seg, StepProblem } from './linalg';
import { randInt, type Rng, type Step, type Topic } from './problems';

const T = (t: string, k: number): Seg => ({ t, k });
const p = (key: string, params?: Params): Step => ({ key, params });
/** A translated word in a formula (`pr.w.<name>`). */
const W = (name: string, k: number): Seg => T(`@pr.w.${name}`, k);

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

/** A fraction in lowest terms, e.g. [6, 36] → [1, 6]. */
export function reduce(n: number, d: number): [number, number] {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

/** "3/8", or a whole number when the fraction is one. */
export function fracText(n: number, d: number): string {
  const [a, b] = reduce(n, d);
  return b === 1 ? String(a) : `${a}/${b}`;
}

/** A probability as an answer: the value, shown as a reduced fraction. */
export function probAns(n: number, d: number): Ans {
  return { kind: 'num', v: n / d, frac: reduce(n, d) };
}

const num = (v: number): Ans => ({ kind: 'num', v });

// ---------- statistics ----------

/** A small data set whose mean is a whole number. */
function dataWithMean(rng: Rng, n: number, lo: number, hi: number): number[] {
  for (;;) {
    const vals = Array.from({ length: n }, () => randInt(rng, lo, hi));
    const sum = vals.reduce((a, b) => a + b, 0);
    if (sum % n === 0 && new Set(vals).size > 1) return vals;
  }
}

function statMean(level: number, rng: Rng): StepProblem {
  const n = level === 1 ? 4 : level === 2 ? 5 : 6;
  return statMeanOf(dataWithMean(rng, n, level === 1 ? 1 : 2, level === 3 ? 24 : 12));
}

/** The mean of a given data set, as a step problem. */
export function statMeanOf(vals: number[]): StepProblem {
  const n = vals.length;
  const sum = vals.reduce((a, b) => a + b, 0);
  return {
    topic: 'stat_mean',
    title: p('pr.stat_mean.title'),
    eq: [W('mean', 3), '=', W('sum', 1), '÷', W('count', 2)],
    text: p('pr.stat_mean.text', { data: vals.join(', ') }),
    gloss: { 1: p('pr.stat_mean.g1'), 2: p('pr.stat_mean.g2'), 3: p('pr.stat_mean.g3') },
    steps: [
      { label: [W('sum', 1), '='], ans: num(sum) },
      { label: [W('count', 2), '='], ans: num(n) },
    ],
    ask: [W('mean', 3), '='],
    answer: num(sum / n),
    plot: { vectors: [], bars: { values: vals, k: 1 }, caption: p('pr.cap.bars') },
    hint: p('pr.stat_mean.hint'),
    explain: [p('pr.stat_mean.ex', { sum, n, m: sum / n })],
  };
}

function statMedian(level: number, rng: Rng): StepProblem {
  const n = level === 3 ? 6 : 5;
  return statMedianOf(Array.from({ length: n }, () => randInt(rng, 1, level === 1 ? 12 : 30)));
}

/** The median of a given data set, as a step problem. */
export function statMedianOf(vals: number[]): StepProblem {
  const n = vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = (n + 1) / 2;
  const median = n % 2 ? sorted[mid - 1] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return {
    topic: 'stat_median',
    title: p('pr.stat_median.title'),
    eq: [W('median', 3), '=', W('middleValue', 1)],
    text: p('pr.stat_median.text', { data: vals.join(', ') }),
    gloss: { 1: p('pr.stat_median.g1'), 2: p('pr.stat_median.g2'), 3: p('pr.stat_median.g3') },
    steps: [
      { label: [W('smallest', 2), '='], ans: num(sorted[0]) },
      { label: [W('middlePos', 1), '='], ans: num(mid) },
    ],
    ask: [W('median', 3), '='],
    answer: num(median),
    plot: { vectors: [], bars: { values: vals, k: 2 }, caption: p('pr.cap.bars') },
    hint: p(n % 2 ? 'pr.stat_median.hint' : 'pr.stat_median.hintEven'),
    explain: [p('pr.stat_median.ex', { sorted: sorted.join(', '), m: median })],
  };
}

function statRange(level: number, rng: Rng): StepProblem {
  const n = level === 1 ? 5 : level === 2 ? 6 : 7;
  const vals = Array.from({ length: n }, () => randInt(rng, level === 3 ? -5 : 1, level === 1 ? 15 : 40));
  if (new Set(vals).size === 1) vals[0]++;
  const hi = Math.max(...vals);
  const lo = Math.min(...vals);
  return {
    topic: 'stat_range',
    title: p('pr.stat_range.title'),
    eq: [W('range', 3), '=', W('largest', 1), '−', W('smallest', 2)],
    text: p('pr.stat_range.text', { data: vals.join(', ') }),
    gloss: { 1: p('pr.stat_range.g1'), 2: p('pr.stat_range.g2'), 3: p('pr.stat_range.g3') },
    steps: [
      { label: [W('largest', 1), '='], ans: num(hi) },
      { label: [W('smallest', 2), '='], ans: num(lo) },
    ],
    ask: [W('range', 3), '='],
    answer: num(hi - lo),
    plot: { vectors: [], bars: { values: vals, k: 1 }, caption: p('pr.cap.bars') },
    hint: p('pr.stat_range.hint'),
    explain: [p('pr.stat_range.ex', { hi, lo, r: hi - lo })],
  };
}

// ---------- probability ----------

/** A pouch of gold and copper coins (and silver at level 3). */
function pouch(level: number, rng: Rng): { gold: number; other: number } {
  const total = level === 1 ? randInt(rng, 3, 6) : level === 2 ? randInt(rng, 5, 10) : randInt(rng, 8, 12);
  const gold = randInt(rng, 1, total - 1);
  return { gold, other: total - gold };
}

function probSimple(level: number, rng: Rng): StepProblem {
  const { gold, other } = pouch(level, rng);
  const total = gold + other;
  return {
    topic: 'prob_simple',
    title: p('pr.prob_simple.title'),
    eq: [W('pGold', 3), '=', W('goldCoins', 1), '÷', W('allCoins', 2)],
    text: p('pr.prob_simple.text', { gold, other }),
    gloss: { 1: p('pr.prob_simple.g1'), 2: p('pr.prob_simple.g2'), 3: p('pr.prob_simple.g3') },
    steps: [
      { label: [W('favourable', 1), '='], ans: num(gold) },
      { label: [W('total', 2), '='], ans: num(total) },
    ],
    ask: [W('pGold', 3), '='],
    answer: probAns(gold, total),
    plot: { vectors: [], tokens: [{ k: 1, n: gold }, { k: 2, n: other }], caption: p('pr.cap.tokens') },
    hint: p('pr.prob_simple.hint'),
    explain: [p('pr.prob_simple.ex', { gold, total, f: fracText(gold, total) })],
  };
}

function probNot(level: number, rng: Rng): StepProblem {
  const { gold, other } = pouch(level, rng);
  const total = gold + other;
  return {
    topic: 'prob_not',
    title: p('pr.prob_not.title'),
    eq: [W('pNotGold', 4), '= 1 −', W('pGold', 3)],
    text: p('pr.prob_not.text', { gold, other }),
    gloss: { 1: p('pr.prob_simple.g1'), 2: p('pr.prob_simple.g2'), 3: p('pr.prob_simple.g3'), 4: p('pr.prob_not.g4') },
    steps: [{ label: [W('pGold', 3), '='], ans: probAns(gold, total) }],
    ask: [W('pNotGold', 4), '='],
    answer: probAns(other, total),
    plot: { vectors: [], tokens: [{ k: 3, n: gold }, { k: 4, n: other }], caption: p('pr.cap.tokens') },
    hint: p('pr.prob_not.hint'),
    explain: [p('pr.prob_not.ex', { p: fracText(gold, total), q: fracText(other, total) })],
  };
}

/** Simple events for two-step problems: [phrase key, favourable, outcomes]. */
const EVENTS: Array<[string, number, number]> = [
  ['@pr.ev.heads', 1, 2],
  ['@pr.ev.six', 1, 6],
  ['@pr.ev.even', 3, 6],
  ['@pr.ev.high', 2, 6],
];

function probTwo(level: number, rng: Rng): StepProblem {
  // level 1: two coins; level 2: a coin and a die; level 3: two dice
  const pick = (opts: number[]) => EVENTS[opts[randInt(rng, 0, opts.length - 1)]];
  const a = level === 3 ? pick([1, 2, 3]) : EVENTS[0];
  const b = level === 1 ? EVENTS[0] : pick([1, 2, 3]);
  const [an, ad] = reduce(a[1], a[2]);
  const [bn, bd] = reduce(b[1], b[2]);
  return {
    topic: 'prob_two',
    title: p('pr.prob_two.title'),
    eq: [W('pAB', 3), '=', T('P(A)', 1), '×', T('P(B)', 2)],
    text: p('pr.prob_two.text', { a: a[0], b: b[0] }),
    gloss: { 1: p('pr.prob_two.g1'), 2: p('pr.prob_two.g2'), 3: p('pr.prob_two.g3') },
    steps: [
      { label: [T('P(A)', 1), '='], ans: probAns(an, ad) },
      { label: [T('P(B)', 2), '='], ans: probAns(bn, bd) },
    ],
    ask: [W('pAB', 3), '='],
    answer: probAns(an * bn, ad * bd),
    hint: p('pr.prob_two.hint'),
    explain: [p('pr.prob_two.ex', { a: fracText(an, ad), b: fracText(bn, bd), c: fracText(an * bn, ad * bd) })],
  };
}

function probDice(level: number, rng: Rng): StepProblem {
  if (level === 1) {
    // one die: "at least k"
    const k = randInt(rng, 3, 6);
    const ways = 7 - k;
    return {
      topic: 'prob_dice',
      title: p('pr.prob_dice.title'),
      eq: [T('P', 3), '=', W('ways', 1), '÷', T('6', 2)],
      text: p('pr.prob_dice.textOne', { k }),
      gloss: { 1: p('pr.prob_dice.g1'), 2: p('pr.prob_dice.g2one'), 3: p('pr.prob_dice.g3') },
      steps: [
        { label: [W('ways', 1), '='], ans: num(ways) },
        { label: [W('outcomes', 2), '='], ans: num(6) },
      ],
      ask: [T('P', 3), '='],
      answer: probAns(ways, 6),
      plot: { vectors: [], dice: { hit: Array.from({ length: ways }, (_, i) => [k + i, 1] as [number, number]), k: 1, single: true }, caption: p('pr.cap.dice') },
      hint: p('pr.prob_dice.hint'),
      explain: [p('pr.prob_dice.ex', { ways, total: 6, f: fracText(ways, 6) })],
    };
  }
  const sum = level === 2 ? randInt(rng, 4, 10) : randInt(rng, 2, 12);
  const hit: Array<[number, number]> = [];
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b === sum) hit.push([a, b]);
  return {
    topic: 'prob_dice',
    title: p('pr.prob_dice.title'),
    eq: [T('P', 3), '(', W('sum', 3), '=', T(String(sum), 3), ') =', W('ways', 1), '÷', T('36', 2)],
    text: p('pr.prob_dice.text', { s: sum }),
    gloss: { 1: p('pr.prob_dice.g1'), 2: p('pr.prob_dice.g2'), 3: p('pr.prob_dice.g3') },
    steps: [
      { label: [W('ways', 1), '='], ans: num(hit.length) },
      { label: [W('outcomes', 2), '='], ans: num(36) },
    ],
    ask: [T('P', 3), '='],
    answer: probAns(hit.length, 36),
    plot: { vectors: [], dice: { hit, k: 1 }, caption: p('pr.cap.dice') },
    hint: p('pr.prob_dice.hint'),
    explain: [p('pr.prob_dice.ex', { ways: hit.length, total: 36, f: fracText(hit.length, 36) })],
  };
}

function expect(level: number, rng: Rng): StepProblem {
  // roll a die; on `ways` of the 6 faces you win `prize` gold (a multiple of 6 keeps it whole)
  const ways = randInt(rng, 1, level === 1 ? 2 : 4);
  const prize = 6 * randInt(rng, 1, level === 3 ? 5 : 3);
  const cost = level === 3 ? randInt(rng, 1, 4) : 0;
  const e = (ways * prize) / 6 - cost;
  return {
    topic: 'expect',
    title: p('pr.expect.title'),
    eq: cost ? [T('E', 3), '=', W('pWin', 1), '×', W('prize', 2), '−', W('cost', 4)] : [T('E', 3), '=', W('pWin', 1), '×', W('prize', 2)],
    text: p(cost ? 'pr.expect.textCost' : 'pr.expect.text', { ways, prize, cost }),
    gloss: { 1: p('pr.expect.g1'), 2: p('pr.expect.g2'), 3: p('pr.expect.g3'), 4: p('pr.expect.g4') },
    steps: [{ label: [W('pWin', 1), '='], ans: probAns(ways, 6) }],
    ask: [T('E', 3), '='],
    answer: num(e),
    plot: { vectors: [], dice: { hit: Array.from({ length: ways }, (_, i) => [6 - i, 1] as [number, number]), k: 1, single: true }, caption: p('pr.cap.dice') },
    hint: p('pr.expect.hint'),
    explain: [p('pr.expect.ex', { f: fracText(ways, 6), prize, e: (ways * prize) / 6 }), ...(cost ? [p('pr.expect.exCost', { cost, e })] : [])],
  };
}

export const CHANCE_GEN: Partial<Record<Topic, (level: number, rng: Rng) => StepProblem>> = {
  stat_mean: statMean,
  stat_median: statMedian,
  stat_range: statRange,
  prob_simple: probSimple,
  prob_not: probNot,
  prob_two: probTwo,
  prob_dice: probDice,
  expect,
};

// ---------- Madame Fortuna's seals ----------

export interface ChanceSeal {
  kind: 'chance';
  /** which fixed question the seal asks */
  id: 'pouch' | 'dice7' | 'coins' | 'practice';
}

/** The fixed question behind a seal, as a step problem. */
export function chanceSealProblem(s: ChanceSeal): StepProblem {
  if (s.id === 'dice7') {
    const hit: Array<[number, number]> = [];
    for (let a = 1; a <= 6; a++) hit.push([a, 7 - a]);
    return {
      topic: 'prob_dice',
      title: p('cseal.title'),
      eq: [T('P', 3), '(', W('sum', 3), '=', T('7', 3), ') =', W('ways', 1), '÷', T('36', 2)],
      text: p('cseal.dice7'),
      gloss: { 1: p('pr.prob_dice.g1'), 2: p('pr.prob_dice.g2'), 3: p('pr.prob_dice.g3') },
      steps: [
        { label: [W('ways', 1), '='], ans: num(6) },
        { label: [W('outcomes', 2), '='], ans: num(36) },
      ],
      ask: [T('P', 3), '(', W('sum', 3), '=', T('7', 3), ') ='],
      answer: probAns(6, 36),
      plot: { vectors: [], dice: { hit, k: 1 }, caption: p('pr.cap.dice') },
      hint: p('pr.prob_dice.hint'),
      explain: [p('pr.prob_dice.ex', { ways: 6, total: 36, f: '1/6' })],
    };
  }
  if (s.id === 'coins') {
    return {
      topic: 'prob_not',
      title: p('cseal.title'),
      eq: [W('pAtLeast', 4), '= 1 −', W('pNone', 3)],
      text: p('cseal.coins'),
      gloss: { 3: p('cseal.gNone'), 4: p('cseal.gAtLeast') },
      steps: [{ label: [W('pNone', 3), '=', W('pTails', 0), '×', W('pTails', 0), '='], ans: probAns(1, 4) }],
      ask: [W('pAtLeast', 4), '='],
      answer: probAns(3, 4),
      hint: p('cseal.coinsHint'),
      explain: [p('cseal.coinsEx')],
    };
  }
  const [gold, other] = s.id === 'pouch' ? [3, 5] : [1, 3];
  return {
    topic: 'prob_simple',
    title: p('cseal.title'),
    eq: [W('pGold', 3), '=', W('goldCoins', 1), '÷', W('allCoins', 2)],
    text: p('pr.prob_simple.text', { gold, other }),
    gloss: { 1: p('pr.prob_simple.g1'), 2: p('pr.prob_simple.g2'), 3: p('pr.prob_simple.g3') },
    steps: [
      { label: [W('favourable', 1), '='], ans: num(gold) },
      { label: [W('total', 2), '='], ans: num(gold + other) },
    ],
    ask: [W('pGold', 3), '='],
    answer: probAns(gold, gold + other),
    plot: { vectors: [], tokens: [{ k: 1, n: gold }, { k: 2, n: other }], caption: p('pr.cap.tokens') },
    hint: p('pr.prob_simple.hint'),
    explain: [p('pr.prob_simple.ex', { gold, total: gold + other, f: fracText(gold, gold + other) })],
  };
}

/** Madame Fortuna's three seals: a pouch, two dice, two coins. */
export const FORTUNA_SEALS: ChanceSeal[] = [
  { kind: 'chance', id: 'pouch' },
  { kind: 'chance', id: 'dice7' },
  { kind: 'chance', id: 'coins' },
];

export const PRACTICE_CHANCE: ChanceSeal = { kind: 'chance', id: 'practice' };

/** Short label floating above a sealed boss. */
export function chanceLabel(s: ChanceSeal): string {
  return t(`cseal.label.${s.id}`);
}
