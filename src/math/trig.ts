/**
 * Trigonometry for the Tidewatch campaign. Colour slots match the Trig Lens:
 * 1 = opposite / sin, 2 = adjacent / cos, 3 = hypotenuse / radius,
 * 4 = tan, 5 = the angle θ.
 */
import { t, type Params } from '../i18n';
import type { Ans, Seg, StepProblem } from './linalg';
import { randInt, type Rng, type Step, type Topic } from './problems';

const T = (s: string, k: number): Seg => ({ t: s, k });
const W = (name: string, k: number): Seg => T(`@tr.w.${name}`, k);
const p = (key: string, params?: Params): Step => ({ key, params });
const num = (v: number, extra: Partial<{ tol: number; text: string }> = {}): Ans => ({ kind: 'num', v, ...extra });

export const rad = (deg: number) => (deg * Math.PI) / 180;
export const deg = (r: number) => (r * 180) / Math.PI;
export const sinD = (d: number) => Math.sin(rad(d));
export const cosD = (d: number) => Math.cos(rad(d));
export const tanD = (d: number) => Math.tan(rad(d));

/** Round tiny float noise away: sin(180°) is 0, not 1.2e-16. */
export const clean = (x: number) => (Math.abs(x) < 1e-12 ? 0 : Math.round(x * 1e12) / 1e12);

/** Exact value of sin or cos at a multiple of 30° or 45°, e.g. "−√3/2". */
export function exactText(fn: 'sin' | 'cos' | 'tan', d: number): string {
  const v = clean(fn === 'sin' ? sinD(d) : fn === 'cos' ? cosD(d) : tanD(d));
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  const known: Array<[number, string]> = [
    [0, '0'],
    [0.5, '1/2'],
    [Math.SQRT1_2, '√2/2'],
    [Math.sqrt(3) / 2, '√3/2'],
    [1, '1'],
    [1 / Math.sqrt(3), '√3/3'],
    [Math.sqrt(3), '√3'],
  ];
  for (const [x, s] of known) if (Math.abs(a - x) < 1e-9) return a === 0 ? '0' : sign + s;
  return (Math.round(v * 1000) / 1000).toString();
}

/** Pythagorean triples for right triangles with whole sides. */
const TRIPLES: Array<[number, number, number]> = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
];

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function fracAns(n: number, d: number, tol = 0.005): Ans {
  const g = gcd(n, d) || 1;
  return { kind: 'num', v: n / d, frac: [n / g, d / g], tol };
}

// ---------- right triangles ----------

/** SOH CAH TOA as a ratio of two sides. */
function trigRatio(level: number, rng: Rng): StepProblem {
  const [o, a, h] = TRIPLES[randInt(rng, 0, level === 1 ? 1 : TRIPLES.length - 1)];
  const fn = level === 1 ? (['sin', 'cos'] as const)[randInt(rng, 0, 1)] : (['sin', 'cos', 'tan'] as const)[randInt(rng, 0, 2)];
  const [top, bottom, kt, kb, wt, wb] =
    fn === 'sin' ? [o, h, 1, 3, 'opposite', 'hypotenuse'] : fn === 'cos' ? [a, h, 2, 3, 'adjacent', 'hypotenuse'] : [o, a, 1, 2, 'opposite', 'adjacent'];
  return {
    topic: 'trig_ratio',
    title: p('tr.trig_ratio.title'),
    eq: [T(`${fn} θ`, 5), '=', W(wt as string, kt as number), '÷', W(wb as string, kb as number)],
    text: p(`tr.trig_ratio.text.${fn}`, { o, a, h }),
    gloss: { 1: p('tr.g.opposite'), 2: p('tr.g.adjacent'), 3: p('tr.g.hypotenuse'), 5: p('tr.g.theta') },
    steps: [
      { label: [W(wt as string, kt as number), '='], ans: num(top as number) },
      { label: [W(wb as string, kb as number), '='], ans: num(bottom as number) },
    ],
    ask: [T(`${fn} θ`, 5), '='],
    answer: fracAns(top as number, bottom as number),
    plot: { vectors: [], triangle: { opp: o, adj: a, hyp: h, show: ['opp', 'adj', 'hyp'] }, caption: p('tr.cap.triangle') },
    hint: p('tr.trig_ratio.hint'),
    explain: [p('tr.trig_ratio.ex', { fn, top: top as number, bottom: bottom as number })],
  };
}

/** A side from an angle: opposite = hyp · sin θ, adjacent = hyp · cos θ, opposite = adj · tan θ. */
function trigSides(level: number, rng: Rng): StepProblem {
  const special = level === 1;
  const angle = special ? [30, 60][randInt(rng, 0, 1)] : randInt(rng, 2, 8) * 5 + (level === 3 ? 0 : 0);
  const mode = level === 3 ? (['sin', 'cos', 'tan'] as const)[randInt(rng, 0, 2)] : (['sin', 'cos'] as const)[randInt(rng, 0, 1)];
  const known = special ? 2 * randInt(rng, 2, 8) : randInt(rng, 4, 20);
  const f = mode === 'sin' ? sinD(angle) : mode === 'cos' ? cosD(angle) : tanD(angle);
  const want = known * f;
  const [knownWord, wantWord, kk, kw] =
    mode === 'sin' ? ['hypotenuse', 'opposite', 3, 1] : mode === 'cos' ? ['hypotenuse', 'adjacent', 3, 2] : ['adjacent', 'opposite', 2, 1];
  return {
    topic: 'trig_sides',
    title: p('tr.trig_sides.title'),
    eq: [W(wantWord, kw), '=', W(knownWord, kk), '×', T(`${mode} θ`, 5)],
    text: p(`tr.trig_sides.text.${mode}`, { angle, known }),
    gloss: { 1: p('tr.g.opposite'), 2: p('tr.g.adjacent'), 3: p('tr.g.hypotenuse'), 5: p('tr.g.theta') },
    steps: [{ label: [T(`${mode} ${angle}°`, 5), '='], ans: num(clean(f), { tol: 0.01, text: exactText(mode, angle) }) }],
    ask: [W(wantWord, kw), '='],
    answer: num(clean(want), { tol: special ? 0.01 : Math.max(0.06, Math.abs(want) * 0.01) }),
    plot: { vectors: [], trig: { angle, lens: !special, readout: !special, scale: known, given: mode === 'tan' ? 'adj' : 'hyp', wall: mode === 'tan' }, caption: p(special ? 'tr.cap.triangle' : 'tr.cap.lens') },
    hint: p(special ? 'tr.trig_sides.hintSpecial' : 'tr.trig_sides.hint'),
    explain: [p('tr.trig_sides.ex', { mode, angle, f: exactText(mode, angle), known, want: Math.round(want * 100) / 100 })],
  };
}

/** An angle from two sides: sin θ = opp ÷ hyp, then read θ off the lens. */
function trigAngle(level: number, rng: Rng): StepProblem {
  // level 1: the classic 1 : 2 triangle (30°); later any angle, read from the lens
  const angle = level === 1 ? 30 : randInt(rng, 2, 16) * 5;
  const hyp = level === 1 ? 2 * randInt(rng, 2, 6) : randInt(rng, 6, 20);
  const opp = Math.round(hyp * sinD(angle) * 10) / 10;
  const s = opp / hyp;
  const exact = deg(Math.asin(s));
  return {
    topic: 'trig_angle',
    title: p('tr.trig_angle.title'),
    eq: [T('sin θ', 5), '=', W('opposite', 1), '÷', W('hypotenuse', 3), '→', T('θ', 5), '= ?'],
    text: p('tr.trig_angle.text', { opp, hyp }),
    gloss: { 1: p('tr.g.opposite'), 3: p('tr.g.hypotenuse'), 5: p('tr.g.theta') },
    steps: [{ label: [T('sin θ', 5), '='], ans: num(s, { tol: 0.006 }) }],
    ask: [T('θ', 5), '=', '? °'],
    answer: num(Math.round(exact * 10) / 10, { tol: 1.1 }),
    plot: { vectors: [], trig: { angle: 45, lens: true, readout: true }, caption: p('tr.cap.find') },
    hint: p('tr.trig_angle.hint'),
    explain: [p('tr.trig_angle.ex', { s: Math.round(s * 1000) / 1000, a: Math.round(exact) })],
  };
}

// ---------- the unit circle ----------

const SPECIAL = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330, 0, 90, 180, 270];

function unitCircle(level: number, rng: Rng): StepProblem {
  const pool = level === 1 ? [30, 45, 60, 0, 90] : level === 2 ? SPECIAL.slice(0, 6) : SPECIAL;
  const angle = pool[randInt(rng, 0, pool.length - 1)];
  const fn = (['sin', 'cos'] as const)[randInt(rng, 0, 1)];
  const ref = [0, 180, 360].some((x) => x === angle) ? 0 : angle % 90 === 0 ? 90 : angle <= 90 ? angle : angle <= 180 ? 180 - angle : angle <= 270 ? angle - 180 : 360 - angle;
  const v = clean(fn === 'sin' ? sinD(angle) : cosD(angle));
  const sign = v > 0 ? 1 : v < 0 ? -1 : 0;
  return {
    topic: 'unit_circle',
    title: p('tr.unit_circle.title'),
    eq: ref === angle ? [T(`${fn} ${angle}°`, fn === 'sin' ? 1 : 2), '= ?'] : [T(`${fn} ${angle}°`, fn === 'sin' ? 1 : 2), '=', '±', T(`${fn} ${ref}°`, fn === 'sin' ? 1 : 2)],
    text: p(`tr.unit_circle.text.${fn}`, { angle }),
    gloss: { 1: p('tr.g.sinCircle'), 2: p('tr.g.cosCircle'), 5: p('tr.g.theta') },
    steps: [
      { label: [W('refAngle', 5), '='], ans: num(ref) },
      { label: [W('sign', 0), '(+1, −1, 0) ='], ans: num(sign) },
    ],
    ask: [T(`${fn} ${angle}°`, fn === 'sin' ? 1 : 2), '='],
    answer: num(v, { tol: 0.006, text: exactText(fn, angle) }),
    plot: { vectors: [], trig: { angle, lens: true, readout: false }, caption: p('tr.cap.circle') },
    hint: p('tr.unit_circle.hint'),
    explain: [p('tr.unit_circle.ex', { fn, angle, ref, v: exactText(fn, angle) })],
  };
}

/** Degrees ↔ radians: π radians is half a turn. */
function radians(level: number, rng: Rng): StepProblem {
  const angles = level === 1 ? [90, 180, 360, 45] : [30, 45, 60, 120, 135, 150, 270, 240, 300];
  const d = angles[randInt(rng, 0, angles.length - 1)];
  const g = gcd(d, 180);
  if (level === 3) {
    return {
      topic: 'radians',
      title: p('tr.radians.title'),
      eq: [T('θ°', 5), '=', T('θ (rad)', 3), '× 180 ÷', T('π', 3)],
      text: p('tr.radians.textBack', { n: d / g, m: 180 / g }),
      gloss: { 3: p('tr.g.radian'), 5: p('tr.g.theta') },
      steps: [{ label: [T('π', 3), '= ? °'], ans: num(180) }],
      ask: [T('θ', 5), '= ? °'],
      answer: num(d),
      plot: { vectors: [], trig: { angle: d, lens: true, readout: false, arc: true }, caption: p('tr.cap.arc') },
      hint: p('tr.radians.hintBack'),
      explain: [p('tr.radians.exBack', { n: d / g, m: 180 / g, d })],
    };
  }
  return {
    topic: 'radians',
    title: p('tr.radians.title'),
    eq: [T('θ (rad)', 3), '=', T('θ°', 5), '÷ 180 ×', T('π', 3)],
    text: p('tr.radians.text', { d }),
    gloss: { 3: p('tr.g.radian'), 5: p('tr.g.theta') },
    steps: [{ label: [T('π', 3), '= ? °'], ans: num(180) }],
    ask: [T('θ', 5), '=', '? ×', T('π', 3)],
    answer: { kind: 'num', v: d / 180, frac: [d / g, 180 / g], tol: 0.005 },
    plot: { vectors: [], trig: { angle: d, lens: true, readout: false, arc: true }, caption: p('tr.cap.arc') },
    hint: p('tr.radians.hint'),
    explain: [p('tr.radians.ex', { d, n: d / g, m: 180 / g })],
  };
}

/** sin² θ + cos² θ = 1: the Pythagorean theorem on the unit circle. */
function pythagId(level: number, rng: Rng): StepProblem {
  const [o, a, h] = TRIPLES[randInt(rng, 0, level === 1 ? 0 : TRIPLES.length - 1)];
  const angle = deg(Math.atan2(o, a));
  const wantTan = level === 3;
  return {
    topic: 'pythag_id',
    title: p('tr.pythag_id.title'),
    eq: [T('sin² θ', 1), '+', T('cos² θ', 2), '= 1'],
    text: p(wantTan ? 'tr.pythag_id.textTan' : 'tr.pythag_id.text', { o, h }),
    gloss: { 1: p('tr.g.sinCircle'), 2: p('tr.g.cosCircle'), 4: p('tr.g.tan') },
    steps: [
      { label: [T('sin² θ', 1), '='], ans: fracAns(o * o, h * h, 0.002) },
      { label: [T('cos² θ', 2), '= 1 −', T('sin² θ', 1), '='], ans: fracAns(a * a, h * h, 0.002) },
      ...(wantTan ? [{ label: [T('cos θ', 2), '='], ans: fracAns(a, h) }] : []),
    ],
    ask: wantTan ? [T('tan θ', 4), '='] : [T('cos θ', 2), '='],
    answer: wantTan ? fracAns(o, a) : fracAns(a, h),
    plot: { vectors: [], trig: { angle, lens: true, readout: false }, caption: p('tr.cap.circle') },
    hint: p(wantTan ? 'tr.pythag_id.hintTan' : 'tr.pythag_id.hint'),
    explain: [p('tr.pythag_id.ex', { o, a, h })],
  };
}

/** Reading a wave y = A · sin(B · x): its height (amplitude) and its length (period). */
function waves(level: number, rng: Rng): StepProblem {
  const A = randInt(rng, 1, 5);
  const B = [1, 2, 3, 4][randInt(rng, 0, level === 1 ? 0 : 3)];
  const askPeriod = level >= 2;
  return {
    topic: 'waves',
    title: p('tr.waves.title'),
    eq: [T('y', 0), '=', T(String(A), 1), '· sin(', T(String(B), 2), '· x )'],
    text: p(askPeriod ? 'tr.waves.textPeriod' : 'tr.waves.text', { A, B }),
    gloss: { 1: p('tr.g.amplitude'), 2: p('tr.g.frequency') },
    steps: askPeriod ? [{ label: [W('amplitude', 1), '='], ans: num(A) }] : [{ label: [W('highest', 1), '='], ans: num(A) }],
    ask: askPeriod ? [W('period', 2), '= ? °'] : [W('amplitude', 1), '='],
    answer: num(askPeriod ? 360 / B : A),
    plot: { vectors: [], wave: { A, B }, caption: p('tr.cap.wave') },
    hint: p(askPeriod ? 'tr.waves.hintPeriod' : 'tr.waves.hint'),
    explain: [p(askPeriod ? 'tr.waves.exPeriod' : 'tr.waves.ex', { A, B, P: 360 / B })],
  };
}

export const TRIG_GEN: Partial<Record<Topic, (level: number, rng: Rng) => StepProblem>> = {
  trig_ratio: trigRatio,
  trig_sides: trigSides,
  trig_angle: trigAngle,
  unit_circle: unitCircle,
  radians,
  pythag_id: pythagId,
  waves,
};

// ---------- drag puzzles: answer by turning the beam ----------

export interface DragTask {
  fn: 'sin' | 'cos' | 'tan';
  value: number;
  /** allowed angle range in degrees, inclusive */
  lo: number;
  hi: number;
  /** one right answer, for the explanation */
  answer: number;
  /** a story text instead of the default */
  text?: Step;
}

/** "Turn the beam until sin θ = 1/2, with θ between 90° and 180°." */
export function generateDrag(level: number, rng: Rng = Math.random): DragTask {
  const pool = level === 1 ? [30, 45, 60, 90, 0] : level === 2 ? [30, 45, 60, 120, 135, 150, 180] : SPECIAL;
  const answer = pool[randInt(rng, 0, pool.length - 1)];
  const fns: Array<DragTask['fn']> = level === 3 && answer % 90 !== 0 ? ['sin', 'cos', 'tan'] : ['sin', 'cos'];
  const fn = fns[randInt(rng, 0, fns.length - 1)];
  const value = clean(fn === 'sin' ? sinD(answer) : fn === 'cos' ? cosD(answer) : tanD(answer));
  // the quadrant (or the axis) that makes the answer unique
  const q = Math.floor((answer % 360) / 90);
  const onAxis = answer % 90 === 0;
  const lo = onAxis ? Math.max(0, answer - 20) : q * 90;
  const hi = onAxis ? Math.min(360, answer + 20) : q * 90 + 90;
  return { fn, value, lo, hi, answer };
}

/** Is the beam at a right answer for this task? */
export function dragOk(task: DragTask, angle: number): boolean {
  const a = ((angle % 360) + 360) % 360;
  const inRange = a >= task.lo - 0.5 && a <= task.hi + 0.5;
  const v = task.fn === 'sin' ? sinD(a) : task.fn === 'cos' ? cosD(a) : tanD(a);
  const tol = task.fn === 'tan' ? 0.06 : 0.03;
  return inRange && Math.abs(v - task.value) <= tol;
}

// ---------- the Tide Serpent's seals ----------

export interface TrigSeal {
  kind: 'trig';
  id: 'ladder' | 'circle' | 'identity' | 'practice';
}

/** The fixed question behind each seal. */
export function trigSealProblem(s: TrigSeal): StepProblem {
  if (s.id === 'circle') {
    return {
      topic: 'unit_circle',
      title: p('tseal.title'),
      eq: [T('cos 120°', 2), '=', '−', T('cos 60°', 2)],
      text: p('tseal.circle'),
      gloss: { 2: p('tr.g.cosCircle'), 5: p('tr.g.theta') },
      steps: [
        { label: [W('refAngle', 5), '='], ans: num(60) },
        { label: [W('sign', 0), '(+1, −1, 0) ='], ans: num(-1) },
      ],
      ask: [T('cos 120°', 2), '='],
      answer: num(-0.5, { tol: 0.006, text: '−1/2' }),
      plot: { vectors: [], trig: { angle: 120, lens: true, readout: false }, caption: p('tr.cap.circle') },
      hint: p('tr.unit_circle.hint'),
      explain: [p('tr.unit_circle.ex', { fn: 'cos', angle: 120, ref: 60, v: '−1/2' })],
    };
  }
  if (s.id === 'identity') {
    return {
      topic: 'pythag_id',
      title: p('tseal.title'),
      eq: [T('tan θ', 4), '=', T('sin θ', 1), '÷', T('cos θ', 2)],
      text: p('tseal.identity'),
      gloss: { 1: p('tr.g.sinCircle'), 2: p('tr.g.cosCircle'), 4: p('tr.g.tan') },
      steps: [{ label: [T('cos θ', 2), '= √(1 − sin² θ) ='], ans: fracAns(4, 5) }],
      ask: [T('tan θ', 4), '='],
      answer: fracAns(3, 4),
      plot: { vectors: [], trig: { angle: deg(Math.atan2(3, 4)), lens: true, readout: false }, caption: p('tr.cap.circle') },
      hint: p('tr.pythag_id.hintTan'),
      explain: [p('tr.pythag_id.ex', { o: 3, a: 4, h: 5 })],
    };
  }
  const [hyp, ans] = s.id === 'ladder' ? [10, 5] : [8, 4];
  return {
    topic: 'trig_sides',
    title: p('tseal.title'),
    eq: [W('opposite', 1), '=', W('hypotenuse', 3), '×', T('sin θ', 5)],
    text: p('tseal.ladder', { hyp }),
    gloss: { 1: p('tr.g.opposite'), 3: p('tr.g.hypotenuse'), 5: p('tr.g.theta') },
    steps: [{ label: [T('sin 30°', 5), '='], ans: num(0.5, { tol: 0.01, text: '1/2' }) }],
    ask: [W('opposite', 1), '='],
    answer: num(ans, { tol: 0.01 }),
    plot: { vectors: [], trig: { angle: 30, lens: false, readout: false, scale: hyp, given: 'hyp' }, caption: p('tr.cap.triangle') },
    hint: p('tr.trig_sides.hintSpecial'),
    explain: [p('tr.trig_sides.ex', { mode: 'sin', angle: 30, f: '1/2', known: hyp, want: ans })],
  };
}

export const SERPENT_SEALS: TrigSeal[] = [
  { kind: 'trig', id: 'ladder' },
  { kind: 'trig', id: 'circle' },
  { kind: 'trig', id: 'identity' },
];

export const PRACTICE_TRIG: TrigSeal = { kind: 'trig', id: 'practice' };

export function trigLabel(s: TrigSeal): string {
  return t(`tseal.label.${s.id}`);
}
