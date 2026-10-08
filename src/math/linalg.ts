/**
 * Linear algebra problems for the Eigenvale campaign. Each problem is solved
 * in steps; steps are graded too, because the working is part of the answer.
 * Terms carry a colour slot (1–6) so the formula, the sentence and the
 * picture all use the same colour for the same idea.
 */
import type { Params } from '../i18n';
import { randInt, type Rng, type Step, type Topic } from './problems';

export type Mat = number[][];
export type Vec = number[];

export type Ans =
  | { kind: 'num'; v: number }
  | { kind: 'vec'; v: Vec }
  | { kind: 'mat'; v: Mat }
  /** unordered list of numbers (e.g. both eigenvalues) */
  | { kind: 'set'; v: number[] }
  /** a direction: any non-zero multiple of v is right (eigenvectors) */
  | { kind: 'dir'; v: Vec };

/** A cell inside a matrix/vector: a number, or a coloured number. */
export type Cell = number | string | { t: number | string; k: number };

/** A piece of a formula. Plain strings are operators and symbols. */
export type Seg = string | { t: string; k: number } | { mat: Cell[][]; k?: number; name?: string } | { vec: Cell[]; k?: number; name?: string };

export interface StepDef {
  label: Seg[];
  ans: Ans;
}

export interface Plot {
  vectors: Array<{ v: Vec; k: number; from?: Vec; label?: string }>;
  /** draw the unit square and its image under this matrix */
  matrix?: Mat;
  matrixK?: number;
}

export interface StepProblem {
  topic: Topic;
  title: Step;
  /** the big formula at the top */
  eq: Seg[];
  /** a sentence with {k|word} colour markers */
  text: Step;
  /** what each colour means */
  gloss: Record<number, Step>;
  /** working steps; the last element of the work is `ask` + `answer` */
  steps: StepDef[];
  ask: Seg[];
  answer: Ans;
  /** when true, the steps together are the answer (e.g. matrix products) */
  stepsAreAnswer?: boolean;
  plot?: Plot;
  hint: Step;
  explain: Step[];
}

// ---------- small linear algebra helpers ----------

export const dot = (u: Vec, v: Vec): number => u.reduce((s, x, i) => s + x * v[i], 0);
export const matVec = (A: Mat, v: Vec): Vec => A.map((row) => dot(row, v));
export const col = (A: Mat, j: number): Vec => A.map((row) => row[j]);
export const matMul = (A: Mat, B: Mat): Mat => A.map((row) => B[0].map((_, j) => dot(row, col(B, j))));
export const det2 = (A: Mat): number => A[0][0] * A[1][1] - A[0][1] * A[1][0];
export const trace = (A: Mat): number => A.reduce((s, row, i) => s + row[i], 0);
export const sub = (A: Mat, l: number): Mat => A.map((row, i) => row.map((x, j) => (i === j ? x - l : x)));

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

/** Smallest whole-number vector along v, first non-zero entry positive. */
export function normDir(v: Vec): Vec {
  const g = v.reduce((acc, x) => gcd(acc, x), 0) || 1;
  let out = v.map((x) => x / g);
  const first = out.find((x) => x !== 0) ?? 1;
  if (first < 0) out = out.map((x) => -x);
  return out.map((x) => (Object.is(x, -0) ? 0 : x));
}

/** Eigenvectors of a 2×2 matrix for eigenvalue l (as a direction). */
export function eigenvector(A: Mat, l: number): Vec {
  const [[a, b], [c, d]] = A;
  if (b !== 0 || l - a !== 0) return normDir([b, l - a]);
  return normDir([l - d, c]);
}

export function eigenvalues(A: Mat): number[] {
  const t = trace(A);
  const D = det2(A);
  const disc = t * t - 4 * D;
  if (disc < 0) return [];
  const r = Math.sqrt(disc);
  return [(t - r) / 2, (t + r) / 2];
}

const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Is a typed answer right? Directions accept any non-zero multiple. */
export function checkAns(given: Ans, want: Ans): boolean {
  if (given.kind !== want.kind) return false;
  switch (want.kind) {
    case 'num':
      return eq((given as typeof want).v, want.v);
    case 'vec': {
      const g = (given as typeof want).v;
      return g.length === want.v.length && g.every((x, i) => eq(x, want.v[i]));
    }
    case 'mat': {
      const g = (given as typeof want).v;
      return g.length === want.v.length && g.every((row, i) => row.length === want.v[i].length && row.every((x, j) => eq(x, want.v[i][j])));
    }
    case 'set': {
      const g = [...(given as typeof want).v].sort((a, b) => a - b);
      const w = [...want.v].sort((a, b) => a - b);
      return g.length === w.length && g.every((x, i) => eq(x, w[i]));
    }
    case 'dir': {
      const g = (given as typeof want).v;
      if (g.length !== want.v.length || g.every((x) => eq(x, 0))) return false;
      // parallel: all 2×2 minors vanish
      for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (!eq(g[i] * want.v[j] - g[j] * want.v[i], 0)) return false;
      return true;
    }
  }
}

/** All the numbers in an answer (used to keep them out of tutor replies). */
export function ansNumbers(a: Ans): number[] {
  if (a.kind === 'num') return [a.v];
  if (a.kind === 'mat') return a.v.flat();
  return a.v;
}

// ---------- formula pieces ----------

const T = (t: string, k: number): Seg => ({ t, k });
const V = (v: Vec, k: number, name?: string): Seg => ({ vec: v, k, name });
const M = (m: Mat | Cell[][], k: number, name?: string): Seg => ({ mat: m, k, name });
const p = (key: string, params?: Params): Step => ({ key, params });

function randVec(rng: Rng, n: number, lo: number, hi: number, nonzero = false): Vec {
  for (;;) {
    const v = Array.from({ length: n }, () => randInt(rng, lo, hi));
    if (!nonzero || v.some((x) => x !== 0)) return v;
  }
}

function randMat(rng: Rng, r: number, c: number, lo: number, hi: number): Mat {
  return Array.from({ length: r }, () => randVec(rng, c, lo, hi));
}

const range = (level: number): [number, number] => (level === 1 ? [0, 4] : level === 2 ? [-3, 5] : [-6, 7]);

// ---------- generators ----------

function vecAdd(level: number, rng: Rng): StepProblem {
  const n = level === 3 ? 3 : 2;
  const [lo, hi] = range(level);
  const u = randVec(rng, n, lo, hi, true);
  const v = randVec(rng, n, lo, hi, true);
  const w = u.map((x, i) => x + v[i]);
  return {
    topic: 'vec_add',
    title: p('la.vec_add.title'),
    eq: [V(u, 1, 'u'), '+', V(v, 2, 'v'), '=', T('w', 3)],
    text: p('la.vec_add.text'),
    gloss: { 1: p('la.vec_add.g1'), 2: p('la.vec_add.g2'), 3: p('la.vec_add.g3') },
    steps: u.map((x, i) => ({ label: [T(`u${i + 1}`, 1), '+', T(`v${i + 1}`, 2), '='], ans: { kind: 'num' as const, v: x + v[i] } })),
    ask: [T('w', 3), '='],
    answer: { kind: 'vec', v: w },
    stepsAreAnswer: true,
    plot: n === 2 ? { vectors: [{ v: u, k: 1, label: 'u' }, { v, k: 2, from: u, label: 'v' }, { v: w, k: 3, label: 'w' }] } : undefined,
    hint: p('la.vec_add.hint'),
    explain: [p('la.vec_add.ex', { w: `(${w.join(', ')})` })],
  };
}

function vecScale(level: number, rng: Rng): StepProblem {
  const n = level === 3 ? 3 : 2;
  const [lo, hi] = range(level);
  const c = level === 1 ? randInt(rng, 2, 3) : [-2, 2, 3, -1, 4][randInt(rng, 0, 4)];
  const v = randVec(rng, n, Math.max(lo, -4), Math.min(hi, 4), true);
  const w = v.map((x) => c * x);
  return {
    topic: 'vec_scale',
    title: p('la.vec_scale.title'),
    eq: [T(String(c), 1), '·', V(v, 2, 'v'), '=', T('w', 3)],
    text: p('la.vec_scale.text'),
    gloss: { 1: p('la.vec_scale.g1'), 2: p('la.vec_scale.g2'), 3: p('la.vec_scale.g3') },
    steps: v.map((x, i) => ({ label: [T(String(c), 1), '·', T(`v${i + 1}`, 2), '='], ans: { kind: 'num' as const, v: c * x } })),
    ask: [T('w', 3), '='],
    answer: { kind: 'vec', v: w },
    stepsAreAnswer: true,
    plot: n === 2 ? { vectors: [{ v, k: 2, label: 'v' }, { v: w, k: 3, label: 'cv' }] } : undefined,
    hint: p('la.vec_scale.hint', { c }),
    explain: [p('la.vec_scale.ex', { c, w: `(${w.join(', ')})` })],
  };
}

function dotProblem(level: number, rng: Rng, perp = false): StepProblem {
  const n = level === 3 ? 3 : 2;
  const [lo, hi] = range(level);
  const u = randVec(rng, n, lo, hi, true);
  let v = randVec(rng, n, lo, hi, true);
  if (perp && rng() < 0.5 && n === 2) {
    // make a perpendicular pair: (a, b) · (−b, a) = 0
    const s = rng() < 0.5 ? 1 : -1;
    v = [-u[1] * s, u[0] * s];
    if (v.every((x) => x === 0)) v = [1, 0];
  }
  const d = dot(u, v);
  const topic: Topic = perp ? 'perp' : 'dot';
  return {
    topic,
    title: p(`la.${topic}.title`),
    eq: [V(u, 1, 'u'), '·', V(v, 2, 'v'), '=', T(perp ? '0 ?' : 'u·v', 3)],
    text: p(`la.${topic}.text`),
    gloss: { 1: p('la.dot.g1'), 2: p('la.dot.g2'), 3: p(`la.${topic}.g3`) },
    steps: u.map((x, i) => ({ label: [T(`u${i + 1}`, 1), '·', T(`v${i + 1}`, 2), '='], ans: { kind: 'num' as const, v: x * v[i] } })),
    ask: [T('u·v', 3), '='],
    answer: { kind: 'num', v: d },
    plot: n === 2 ? { vectors: [{ v: u, k: 1, label: 'u' }, { v, k: 2, label: 'v' }] } : undefined,
    hint: p('la.dot.hint'),
    explain: [p('la.dot.ex', { parts: u.map((x, i) => `${x}·${v[i]}`).join(' + '), d }), ...(perp ? [p(d === 0 ? 'la.perp.yes' : 'la.perp.no')] : [])],
  };
}

function matVecProblem(level: number, rng: Rng): StepProblem {
  const n = level === 3 ? 3 : 2;
  const [lo, hi] = level === 1 ? [0, 3] : range(level);
  let A: Mat;
  let v: Vec;
  // a matrix that really moves v (no flattening, v not left in place)
  do {
    A = randMat(rng, n, n, lo, hi);
    v = randVec(rng, n, lo, hi, true);
  } while ((n === 2 && det2(A) === 0) || matVec(A, v).every((x, i) => x === v[i]));
  const w = matVec(A, v);
  return {
    topic: 'mat_vec',
    title: p('la.mat_vec.title'),
    eq: [M(A, 1, 'A'), V(v, 2, 'v'), '=', T('Av', 3)],
    text: p('la.mat_vec.text'),
    gloss: { 1: p('la.mat_vec.g1'), 2: p('la.mat_vec.g2'), 3: p('la.mat_vec.g3') },
    steps: A.map((row, i) => ({ label: rowLabel(i), ans: { kind: 'num' as const, v: dot(row, v) } })),
    ask: [T('Av', 3), '='],
    answer: { kind: 'vec', v: w },
    stepsAreAnswer: true,
    plot: n === 2 ? { vectors: [{ v, k: 2, label: 'v' }, { v: w, k: 3, label: 'Av' }], matrix: A, matrixK: 1 } : undefined,
    hint: p('la.mat_vec.hint'),
    explain: [p('la.mat_vec.ex', { w: `(${w.join(', ')})` })],
  };
}

/** "row i · v =" with the row in colour 1 and v in colour 2. */
function rowLabel(i: number): Seg[] {
  return [T(`row${i + 1}(A)`, 1), '·', T('v', 2), '='];
}

function matMulProblem(level: number, rng: Rng): StepProblem {
  const [lo, hi] = level === 1 ? [0, 3] : range(level);
  const A = randMat(rng, 2, 2, lo, hi);
  const B = randMat(rng, 2, 2, lo, hi);
  const C = matMul(A, B);
  const steps: StepDef[] = [];
  for (let i = 0; i < 2; i++)
    for (let j = 0; j < 2; j++) steps.push({ label: [T(`c${i + 1}${j + 1}`, 3), '=', T(`row${i + 1}(A)`, 1), '·', T(`col${j + 1}(B)`, 2), '='], ans: { kind: 'num', v: C[i][j] } });
  return {
    topic: 'mat_mul',
    title: p('la.mat_mul.title'),
    eq: [M(A, 1, 'A'), M(B, 2, 'B'), '=', T('C', 3)],
    text: p('la.mat_mul.text'),
    gloss: { 1: p('la.mat_mul.g1'), 2: p('la.mat_mul.g2'), 3: p('la.mat_mul.g3') },
    steps,
    ask: [T('C', 3), '='],
    answer: { kind: 'mat', v: C },
    stepsAreAnswer: true,
    hint: p('la.mat_mul.hint'),
    explain: [p('la.mat_mul.ex', { c: `[${C.map((r) => r.join(' ')).join(' ; ')}]` })],
  };
}

function det2Problem(level: number, rng: Rng): StepProblem {
  const [lo, hi] = level === 1 ? [0, 4] : range(level);
  let A = randMat(rng, 2, 2, lo, hi);
  while (det2(A) === 0 && level > 1) A = randMat(rng, 2, 2, lo, hi);
  const [[a, b], [c, d]] = A;
  const D = det2(A);
  const cells: Cell[][] = [
    [{ t: a, k: 1 }, { t: b, k: 2 }],
    [{ t: c, k: 2 }, { t: d, k: 1 }],
  ];
  return {
    topic: 'det2',
    title: p('la.det2.title'),
    eq: ['det', M(cells, 0, 'A'), '=', T('a·d', 1), '−', T('b·c', 2), '=', T('det A', 3)],
    text: p('la.det2.text'),
    gloss: { 1: p('la.det2.g1'), 2: p('la.det2.g2'), 3: p('la.det2.g3') },
    steps: [
      { label: [T('a·d', 1), '='], ans: { kind: 'num', v: a * d } },
      { label: [T('b·c', 2), '='], ans: { kind: 'num', v: b * c } },
    ],
    ask: [T('det A', 3), '='],
    answer: { kind: 'num', v: D },
    plot: { vectors: [{ v: col(A, 0), k: 1, label: 'Ae₁' }, { v: col(A, 1), k: 2, label: 'Ae₂' }], matrix: A, matrixK: 3 },
    hint: p('la.det2.hint'),
    explain: [p('la.det2.ex', { a, b, c, d, ad: a * d, bc: b * c, D })],
  };
}

/** A 2×2 integer matrix with two different whole-number eigenvalues. */
export function eigenMatrix(level: number, rng: Rng): { A: Mat; l: [number, number] } {
  for (let tries = 0; tries < 500; tries++) {
    const l1 = randInt(rng, level === 1 ? 1 : -2, level === 1 ? 4 : 6);
    const l2 = randInt(rng, level === 1 ? 1 : -2, level === 1 ? 5 : 7);
    if (l1 === l2) continue;
    const a = randInt(rng, level === 1 ? 1 : -2, 5);
    const d = l1 + l2 - a;
    const k = a * d - l1 * l2; // must equal b·c
    let b: number;
    let c: number;
    if (k === 0) {
      b = randInt(rng, 1, 3) * (rng() < 0.5 ? 1 : -1);
      c = 0;
      if (rng() < 0.5) [b, c] = [c, b];
    } else {
      const divs: number[] = [];
      for (let x = 1; x <= Math.abs(k); x++) if (k % x === 0) divs.push(x, -x);
      b = divs[randInt(rng, 0, divs.length - 1)];
      c = k / b;
    }
    const A = [
      [a, b],
      [c, d],
    ];
    if (A.flat().every((x) => Math.abs(x) <= 9)) return { A, l: [Math.min(l1, l2), Math.max(l1, l2)] };
  }
  return {
    A: [
      [2, 1],
      [1, 2],
    ],
    l: [1, 3],
  };
}

export function eigenValueProblem(level: number, rng: Rng, given?: Mat): StepProblem {
  const A = given ?? eigenMatrix(level, rng).A;
  const t = trace(A);
  const D = det2(A);
  const l = eigenvalues(A);
  return {
    topic: 'eigen_val',
    title: p('la.eigen_val.title'),
    eq: [M(A, 1, 'A'), T('v', 2), '=', T('λ', 3), T('v', 2)],
    text: p('la.eigen_val.text'),
    gloss: { 1: p('la.eigen_val.g1'), 2: p('la.eigen_val.g2'), 3: p('la.eigen_val.g3'), 4: p('la.eigen_val.g4'), 5: p('la.eigen_val.g5') },
    steps: [
      { label: [T('tr A', 4), '= a + d ='], ans: { kind: 'num', v: t } },
      { label: [T('det A', 5), '= ad − bc ='], ans: { kind: 'num', v: D } },
    ],
    ask: [T('λ', 3), '² −', T('tr A', 4), T('λ', 3), '+', T('det A', 5), '= 0  →', T('λ₁, λ₂', 3), '='],
    answer: { kind: 'set', v: l },
    plot: { vectors: [{ v: col(A, 0), k: 1, label: 'Ae₁' }, { v: col(A, 1), k: 1, label: 'Ae₂' }], matrix: A, matrixK: 1 },
    hint: p('la.eigen_val.hint'),
    explain: [p('la.eigen_val.ex1', { t, D }), p('la.eigen_val.ex2', { t, D, l1: l[0], l2: l[1] })],
  };
}

export function eigenVectorProblem(level: number, rng: Rng, given?: { A: Mat; l: number }): StepProblem {
  let A: Mat;
  let lambda: number;
  if (given) {
    A = given.A;
    lambda = given.l;
  } else {
    const m = eigenMatrix(level, rng);
    A = m.A;
    lambda = m.l[randInt(rng, 0, 1)];
  }
  const S = sub(A, lambda);
  const v = eigenvector(A, lambda);
  return {
    topic: 'eigen_vec',
    title: p('la.eigen_vec.title'),
    eq: ['(', M(A, 1, 'A'), '−', T(String(lambda), 3), T('I', 4), ')', T('v', 2), '=', T('0', 6)],
    text: p('la.eigen_vec.text', { l: lambda }),
    gloss: { 1: p('la.eigen_vec.g1'), 2: p('la.eigen_vec.g2'), 3: p('la.eigen_vec.g3'), 4: p('la.eigen_vec.g4'), 6: p('la.eigen_vec.g6') },
    steps: [{ label: [M(A, 1, 'A'), '−', T(String(lambda), 3), T('I', 4), '='], ans: { kind: 'mat', v: S } }],
    ask: [T('v', 2), '='],
    answer: { kind: 'dir', v },
    plot: { vectors: [], matrix: A, matrixK: 1 },
    hint: p('la.eigen_vec.hint'),
    explain: [p('la.eigen_vec.ex1', { m: `[${S.map((r) => r.join(' ')).join(' ; ')}]` }), p('la.eigen_vec.ex2', { v: `(${v.join(', ')})` })],
  };
}

const GEN: Partial<Record<Topic, (level: number, rng: Rng) => StepProblem>> = {
  vec_add: vecAdd,
  vec_scale: vecScale,
  dot: (l, r) => dotProblem(l, r),
  perp: (l, r) => dotProblem(l, r, true),
  mat_vec: matVecProblem,
  mat_mul: matMulProblem,
  det2: det2Problem,
  eigen_val: (l, r) => eigenValueProblem(l, r),
  eigen_vec: (l, r) => eigenVectorProblem(l, r),
};

export const LA_TOPICS = Object.keys(GEN) as Topic[];

export function isLinalg(topic: Topic): boolean {
  return topic in GEN;
}

export function generateLA(topic: Topic, level: number, rng: Rng = Math.random): StepProblem {
  const g = GEN[topic];
  if (!g) throw new Error(`No linear algebra generator for ${topic}`);
  return g(level, rng);
}

/** Plain-text version of a formula (for the tutor and for logs). */
export function segText(segs: Seg[]): string {
  const cell = (c: Cell) => (typeof c === 'object' ? String(c.t) : String(c));
  return segs
    .map((s) => {
      if (typeof s === 'string') return s;
      if ('t' in s) return s.t;
      if ('mat' in s) return `${s.name ? s.name + ' = ' : ''}[${s.mat.map((r) => r.map(cell).join(' ')).join('; ')}]`;
      return `${s.name ? s.name + ' = ' : ''}(${s.vec.map(cell).join(', ')})`;
    })
    .join(' ');
}
