import type { Params } from '../i18n';

export type Topic =
  // Chancewood (probability and statistics)
  | 'stat_mean'
  | 'stat_median'
  | 'stat_range'
  | 'prob_simple'
  | 'prob_not'
  | 'prob_two'
  | 'prob_dice'
  | 'expect'
  | 'add_sub'
  | 'mul'
  | 'area'
  | 'missing'
  | 'order_ops'
  | 'eq1'
  | 'eq2'
  | 'percent'
  | 'sequence'
  | 'balance'
  | 'probe'
  | 'farm'
  // linear algebra (step problems, see linalg.ts)
  | 'vec_add'
  | 'vec_scale'
  | 'dot'
  | 'perp'
  | 'mat_vec'
  | 'mat_mul'
  | 'det2'
  | 'eigen_val'
  | 'eigen_vec';

export interface Step {
  key: string;
  params?: Params;
}

export type Visual =
  | { kind: 'grid'; w: number; h: number }
  | { kind: 'balance'; leftBags: number; leftUnits: number; rightBags: number; rightUnits: number };

export interface Problem {
  topic: Topic;
  prompt: Step;
  answer: number;
  hint: Step;
  explain: Step[];
  visual?: Visual;
}

export type Rng = () => number;

export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function addSub(level: number, rng: Rng): Problem {
  const add = rng() < 0.55;
  let a: number;
  let b: number;
  if (level === 1) {
    a = randInt(rng, 2, 9);
    b = randInt(rng, 1, 9);
  } else if (level === 2) {
    a = randInt(rng, 6, 15);
    b = randInt(rng, 3, 9);
  } else {
    a = randInt(rng, 21, 79);
    b = randInt(rng, 11, 39);
  }
  if (add) {
    const ans = a + b;
    return {
      topic: 'add_sub',
      prompt: { key: 'q.add', params: { a, b } },
      answer: ans,
      hint: { key: 'hint.add', params: { a, b } },
      explain:
        level === 3
          ? [{ key: 'explain.addTens', params: { a, b, bt: b - (b % 10), bo: b % 10, s1: a + b - (b % 10), ans } }]
          : [{ key: 'explain.add', params: { a, b, ans } }],
    };
  }
  if (b > a) [a, b] = [b, a];
  if (a === b) a += randInt(rng, 1, 5);
  const ans = a - b;
  return {
    topic: 'add_sub',
    prompt: { key: 'q.sub', params: { a, b } },
    answer: ans,
    hint: { key: 'hint.sub', params: { a, b } },
    explain: [{ key: 'explain.sub', params: { a, b, ans } }],
  };
}

function mul(level: number, rng: Rng): Problem {
  let a: number;
  let b: number;
  if (level === 1) {
    a = pick(rng, [2, 5, 10]);
    b = randInt(rng, 1, 10);
  } else if (level === 2) {
    a = randInt(rng, 2, 6);
    b = randInt(rng, 2, 9);
  } else {
    a = randInt(rng, 3, 9);
    b = randInt(rng, 3, 12);
  }
  if (rng() < 0.5) [a, b] = [b, a];
  const ans = a * b;
  const small = Math.min(a, b);
  const big = Math.max(a, b);
  const seq = [1, 2, 3].map((k) => k * big).join(', ');
  return {
    topic: 'mul',
    prompt: { key: 'q.mul', params: { a, b } },
    answer: ans,
    hint: { key: 'hint.mul', params: { big, small, seq } },
    explain: [{ key: 'explain.mul', params: { big, small, ans } }],
  };
}

function area(level: number, rng: Rng): Problem {
  const [lo, hi] = level === 1 ? [2, 5] : level === 2 ? [3, 8] : [5, 12];
  const w = randInt(rng, lo, hi);
  const h = randInt(rng, lo, Math.min(hi, 9));
  const ans = w * h;
  return {
    topic: 'area',
    prompt: { key: 'q.area', params: { w, h } },
    answer: ans,
    hint: { key: 'hint.area', params: { w, h } },
    explain: [{ key: 'explain.area', params: { w, h, ans } }],
    visual: { kind: 'grid', w, h },
  };
}

function missing(level: number, rng: Rng): Problem {
  const forms = level === 1 ? ['add', 'sub'] : ['add', 'sub', 'mul'];
  const form = pick(rng, forms);
  const big = level === 3 ? 30 : level === 2 ? 20 : 12;
  if (form === 'add') {
    const ans = randInt(rng, 1, big - 3);
    const a = randInt(rng, 2, big - ans);
    const c = ans + a;
    return {
      topic: 'missing',
      prompt: { key: 'q.missingAdd', params: { a, c } },
      answer: ans,
      hint: { key: 'hint.missingAdd', params: { a, c } },
      explain: [{ key: 'explain.missingAdd', params: { a, c, ans } }],
    };
  }
  if (form === 'sub') {
    const c = randInt(rng, 6, big);
    const ans = randInt(rng, 1, c - 1);
    const a = c - ans;
    return {
      topic: 'missing',
      prompt: { key: 'q.missingSub', params: { a, c } },
      answer: ans,
      hint: { key: 'hint.missingSub', params: { a, c } },
      explain: [{ key: 'explain.missingSub', params: { a, c, ans } }],
    };
  }
  const a = randInt(rng, 2, level === 3 ? 9 : 5);
  const ans = randInt(rng, 2, level === 3 ? 9 : 6);
  const c = a * ans;
  return {
    topic: 'missing',
    prompt: { key: 'q.missingMul', params: { a, c } },
    answer: ans,
    hint: { key: 'hint.missingMul', params: { a, c } },
    explain: [{ key: 'explain.missingMul', params: { a, c, ans } }],
  };
}

function orderOps(level: number, rng: Rng): Problem {
  const forms = level === 1 ? ['mulAdd', 'addMul'] : level === 2 ? ['mulAdd', 'addMul', 'paren'] : ['addMul', 'paren', 'mulSub'];
  const form = pick(rng, forms);
  const a = randInt(rng, 2, level === 3 ? 9 : 6);
  const b = randInt(rng, 2, level === 3 ? 9 : 5);
  const c = randInt(rng, 1, 9);
  switch (form) {
    case 'mulAdd': {
      const p = a * b;
      const ans = p + c;
      return {
        topic: 'order_ops',
        prompt: { key: 'q.opsMulAdd', params: { a, b, c } },
        answer: ans,
        hint: { key: 'hint.opsMulFirst' },
        explain: [{ key: 'explain.opsMulAdd', params: { a, b, c, p, ans } }],
      };
    }
    case 'addMul': {
      // c + a × b
      const p = a * b;
      const ans = c + p;
      return {
        topic: 'order_ops',
        prompt: { key: 'q.opsAddMul', params: { a, b, c } },
        answer: ans,
        hint: { key: 'hint.opsMulFirst' },
        explain: [{ key: 'explain.opsAddMul', params: { a, b, c, p, ans } }],
      };
    }
    case 'paren': {
      // (c + a) × b
      const s = c + a;
      const ans = s * b;
      return {
        topic: 'order_ops',
        prompt: { key: 'q.opsParen', params: { a, b, c } },
        answer: ans,
        hint: { key: 'hint.opsParen' },
        explain: [{ key: 'explain.opsParen', params: { a, b, c, s, ans } }],
      };
    }
    default: {
      // a × b − c, keep positive
      const p = a * b;
      const cc = Math.min(c, p - 1);
      const ans = p - cc;
      return {
        topic: 'order_ops',
        prompt: { key: 'q.opsMulSub', params: { a, b, c: cc } },
        answer: ans,
        hint: { key: 'hint.opsMulFirst' },
        explain: [{ key: 'explain.opsMulSub', params: { a, b, c: cc, p, ans } }],
      };
    }
  }
}

function eq1(level: number, rng: Rng): Problem {
  const forms = level === 1 ? ['add'] : level === 2 ? ['add', 'sub'] : ['add', 'sub', 'mul'];
  const form = pick(rng, forms);
  const x = randInt(rng, 2, level === 3 ? 15 : 9);
  if (form === 'add') {
    const a = randInt(rng, 2, 9);
    const b = x + a;
    return {
      topic: 'eq1',
      prompt: { key: 'q.eqAdd', params: { a, b } },
      answer: x,
      hint: { key: 'hint.eqAdd', params: { a } },
      explain: [{ key: 'explain.eqAdd', params: { a, b, ans: x } }],
      visual: { kind: 'balance', leftBags: 1, leftUnits: a, rightBags: 0, rightUnits: b },
    };
  }
  if (form === 'sub') {
    const a = randInt(rng, 1, x - 1 > 0 ? x - 1 : 1);
    const b = x - a;
    return {
      topic: 'eq1',
      prompt: { key: 'q.eqSub', params: { a, b } },
      answer: x,
      hint: { key: 'hint.eqSub', params: { a } },
      explain: [{ key: 'explain.eqSub', params: { a, b, ans: x } }],
    };
  }
  const a = randInt(rng, 2, 6);
  const b = a * x;
  return {
    topic: 'eq1',
    prompt: { key: 'q.eqMul', params: { a, b } },
    answer: x,
    hint: { key: 'hint.eqMul', params: { a } },
    explain: [{ key: 'explain.eqMul', params: { a, b, ans: x } }],
  };
}

function eq2(level: number, rng: Rng): Problem {
  const a = randInt(rng, 2, level === 1 ? 3 : 5);
  const x = randInt(rng, 2, level === 3 ? 12 : 7);
  const b = randInt(rng, 1, 9);
  const c = a * x + b;
  const d = c - b;
  const visual: Visual | undefined =
    c <= 30 ? { kind: 'balance', leftBags: a, leftUnits: b, rightBags: 0, rightUnits: c } : undefined;
  return {
    topic: 'eq2',
    prompt: { key: 'q.eq2', params: { a, b, c } },
    answer: x,
    hint: { key: 'hint.eq2', params: { a, b } },
    explain: [
      { key: 'explain.eq2a', params: { a, b, c, d } },
      { key: 'explain.eq2b', params: { a, d, ans: x } },
    ],
    visual,
  };
}

function percent(level: number, rng: Rng): Problem {
  const pct = level === 1 ? pick(rng, [10, 50]) : pick(rng, [10, 20, 25, 50]);
  const bases: Record<number, number[]> = {
    10: [10, 20, 30, 40, 50],
    20: [10, 20, 30, 40, 50],
    25: [4, 8, 12, 20, 40],
    50: [4, 6, 10, 20, 30],
  };
  const p = pick(rng, bases[pct]);
  const off = (p * pct) / 100;
  const ans = p - off;
  return {
    topic: 'percent',
    prompt: { key: 'q.percent', params: { p, pct } },
    answer: ans,
    hint: { key: 'hint.percent', params: { p, pct } },
    explain: [{ key: 'explain.percent', params: { p, pct, off, ans } }],
  };
}

const generators: Partial<Record<Topic, (level: number, rng: Rng) => Problem>> = {
  add_sub: addSub,
  mul,
  area,
  missing,
  order_ops: orderOps,
  eq1,
  eq2,
  percent,
};

export function generate(topic: Topic, level: number, rng: Rng = Math.random): Problem {
  const gen = generators[topic];
  if (!gen) throw new Error(`No generator for topic ${topic}`);
  return gen(level, rng);
}

export const GENERATED_TOPICS = Object.keys(generators) as Topic[];
