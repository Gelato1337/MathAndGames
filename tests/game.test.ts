import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HERO_SKILLS, ITEMS, SKILLS, TRAINER_SKILLS } from '../src/data';
import en from '../src/lang/en.json';
import fi from '../src/lang/fi.json';
import { parseAnswer, checkAnswer } from '../src/math/answer';
import { GENERATED_TOPICS, generate, type Problem } from '../src/math/problems';
import { evalSide, fmtSeal, GOLEM_SEALS, PRACTICE_SEAL, sealSteps, solveSeal } from '../src/math/seal';
import { SPRITES } from '../src/art/sprites';
import { ENCOUNTERS, FIELD, GATE_TILES, inRect, NPCS, PLAYER_START, WorldMap } from '../src/world/map';

type Dict = { [k: string]: string | Dict };

function flatten(d: Dict, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(d)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const EN = flatten(en as Dict);
const FI = flatten(fi as Dict);
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return p.endsWith('.ts') ? [p] : [];
  });
}

describe('language files', () => {
  it('have exactly the same keys', () => {
    expect(Object.keys(FI).sort()).toEqual(Object.keys(EN).sort());
  });

  it('use the same placeholders in every string', () => {
    for (const k of Object.keys(EN)) expect(placeholders(FI[k]), k).toEqual(placeholders(EN[k]));
  });

  it('contain every literal key used in the source', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(join(__dirname, '../src'))) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) if (!(m[1] in EN)) missing.push(`${file}: ${m[1]}`);
      for (const m of src.matchAll(/key: '([a-zA-Z0-9_.]+)'/g)) if (!(m[1] in EN)) missing.push(`${file}: ${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('cover dynamic keys for skills, items, characters and trials', () => {
    const keys: string[] = [];
    for (const id of Object.keys(SKILLS) as Array<keyof typeof SKILLS>) {
      keys.push(`skills.${id}.name`, `skills.${id}.desc`);
      if (SKILLS[id].overcharge) keys.push(`skills.${id}.oc`);
      if (SKILLS[id].trial) keys.push(`trial.${id}.intro`, `trial.${id}.outro`);
    }
    for (const id of Object.keys(ITEMS)) keys.push(`items.${id}.name`, `items.${id}.desc`);
    keys.push('items.tonic.short', 'items.tea.short');
    for (const n of NPCS) keys.push(`chars.${n.id}`, `${n.id === 'elder' ? 'elder.intro1' : `${n.id}.busy`}`);
    for (const id of ['kai', 'aino', 'slime', 'golem']) keys.push(`chars.${id}`);
    for (const tr of Object.keys(TRAINER_SKILLS)) {
      for (const s of ['intro1', 'intro2', 'menu', 'menuDone', 'about1', 'about2', 'sealHint']) keys.push(`${tr}.${s}`);
    }
    for (const a of ['count', 'split', 'subtract']) keys.push(`farm.approach.${a}`, `farm.hint.${a}`);
    keys.push('farm.hint.none');
    for (const m of ['normal', 'relaxed', 'off']) keys.push(`settings.timers.${m}`);
    for (const r of ['exact', 'over', 'under', 'none']) keys.push(`ending.farmResult.${r}`);
    for (const a of ['bite', 'slam', 'throw']) keys.push(`combat.attacks.${a}`);
    for (let i = 1; i <= 3; i++) keys.push(`trial.unbind.stage${i}`, `intro.p${i}`);
    for (let i = 0; i <= 3; i++) keys.push(`obj.farm${i}`);
    for (const k of ['en', 'fi']) keys.push(`langs.${k}`);
    expect(keys.filter((k) => !(k in EN))).toEqual([]);
  });
});

describe('answer parsing', () => {
  it('accepts common formats', () => {
    expect(parseAnswer('12')).toBe(12);
    expect(parseAnswer(' 2,5 ')).toBe(2.5);
    expect(parseAnswer('2.5')).toBe(2.5);
    expect(parseAnswer('1/2')).toBe(0.5);
    expect(parseAnswer('x = 7')).toBe(7);
    expect(parseAnswer('−3')).toBe(-3);
    expect(parseAnswer('42 m²')).toBe(42);
    expect(parseAnswer('abc')).toBeNull();
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('1/0')).toBeNull();
    expect(checkAnswer('0,5', 0.5)).toBe(true);
  });
});

describe('problem generators', () => {
  const p = (prob: Problem) => prob.prompt.params as Record<string, number>;
  const verify: Record<string, (prob: Problem) => number> = {
    'q.add': (x) => p(x).a + p(x).b,
    'q.sub': (x) => p(x).a - p(x).b,
    'q.mul': (x) => p(x).a * p(x).b,
    'q.area': (x) => p(x).w * p(x).h,
    'q.missingAdd': (x) => p(x).c - p(x).a,
    'q.missingSub': (x) => p(x).c - p(x).a,
    'q.missingMul': (x) => p(x).c / p(x).a,
    'q.opsMulAdd': (x) => p(x).a * p(x).b + p(x).c,
    'q.opsAddMul': (x) => p(x).c + p(x).a * p(x).b,
    'q.opsParen': (x) => (p(x).c + p(x).a) * p(x).b,
    'q.opsMulSub': (x) => p(x).a * p(x).b - p(x).c,
    'q.eqAdd': (x) => p(x).b - p(x).a,
    'q.eqSub': (x) => p(x).b + p(x).a,
    'q.eqMul': (x) => p(x).b / p(x).a,
    'q.eq2': (x) => (p(x).c - p(x).b) / p(x).a,
    'q.percent': (x) => p(x).p * (1 - p(x).pct / 100),
  };

  for (const topic of GENERATED_TOPICS) {
    it(`${topic} produces correct, whole, non-negative answers at every level`, () => {
      const rng = seeded(42);
      for (const level of [1, 2, 3]) {
        for (let i = 0; i < 300; i++) {
          const prob = generate(topic, level, rng);
          expect(prob.prompt.key in EN, prob.prompt.key).toBe(true);
          expect(prob.hint.key in EN).toBe(true);
          for (const s of prob.explain) expect(s.key in EN, s.key).toBe(true);
          expect(Number.isInteger(prob.answer), `${prob.prompt.key} ${JSON.stringify(prob.prompt.params)}`).toBe(true);
          expect(prob.answer).toBeGreaterThanOrEqual(0);
          const check = verify[prob.prompt.key];
          expect(check, prob.prompt.key).toBeDefined();
          expect(check(prob)).toBeCloseTo(prob.answer);
          // every placeholder in the prompt is filled
          for (const ph of placeholders(EN[prob.prompt.key])) expect(prob.prompt.params?.[ph], ph).toBeDefined();
          for (const s of [prob.hint, ...prob.explain]) for (const ph of placeholders(EN[s.key])) expect(s.params?.[ph], `${s.key}:${ph}`).toBeDefined();
        }
      }
    });
  }
});

describe('golem seals', () => {
  it('all have whole-number solutions in the guessable range', () => {
    for (const s of [...GOLEM_SEALS, PRACTICE_SEAL]) {
      const x = solveSeal(s);
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(20);
      expect(evalSide(s.a, s.b, x)).toBe(evalSide(s.c, s.d, x));
      expect(sealSteps(s).length).toBeGreaterThan(0);
    }
  });

  it('progress from one step to variables on both sides', () => {
    expect(fmtSeal(GOLEM_SEALS[0])).toBe('x + 7 = 15');
    expect(fmtSeal(GOLEM_SEALS[1])).toBe('3x + 4 = 25');
    expect(fmtSeal(GOLEM_SEALS[2])).toBe('2x + 5 = x + 12');
  });
});

describe('sprites', () => {
  it('are rectangular', () => {
    for (const [name, rows] of Object.entries(SPRITES)) {
      const w = rows[0].length;
      for (const [i, r] of rows.entries()) expect(r.length, `${name} row ${i}`).toBe(w);
    }
  });
});

describe('world map', () => {
  const world = new WorldMap();

  it('has the right size', () => {
    expect(world.tiles.length).toBe(world.h);
    for (const row of world.tiles) expect(row.length).toBe(world.w);
  });

  it('every NPC, the gate and both arenas are reachable from the start', () => {
    world.openGate();
    const seen = new Set<string>();
    const q = [[PLAYER_START.x, PLAYER_START.y]];
    seen.add(`${PLAYER_START.x},${PLAYER_START.y}`);
    while (q.length) {
      const [x, y] = q.shift()!;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (seen.has(k) || !world.canStep(x, y, nx, ny)) continue;
        if (NPCS.some((n) => n.x === nx && n.y === ny)) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    for (const n of NPCS) {
      const adj = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([dx, dy]) => seen.has(`${n.x + dx},${n.y + dy}`));
      expect(adj, n.id).toBe(true);
    }
    for (const g of GATE_TILES) expect(seen.has(`${g.x - 1},${g.y}`)).toBe(true);
    for (const e of ENCOUNTERS) {
      expect(seen.has(`${e.trigger.x},14`), e.id).toBe(true);
      for (const en of e.enemies) {
        const size = en.kind === 'golem' ? 2 : 1;
        for (let dy = 0; dy < size; dy++)
          for (let dx = 0; dx < size; dx++) {
            expect(world.walkable(en.x + dx, en.y + dy)).toBe(true);
            expect(inRect(e.region, en.x + dx, en.y + dy)).toBe(true);
          }
      }
    }
  });

  it('has no unclimbable cliffs inside the battle arenas', () => {
    for (const e of ENCOUNTERS) {
      for (let y = e.region.y; y < e.region.y + e.region.h; y++)
        for (let x = e.region.x; x < e.region.x + e.region.w - 1; x++) {
          if (!world.walkable(x, y) || !world.walkable(x + 1, y)) continue;
          expect(Math.abs(world.height(x, y) - world.height(x + 1, y)), `${e.id} ${x},${y}`).toBeLessThanOrEqual(1);
        }
    }
  });

  it("draws Helmi's field with the same shape the puzzle uses", () => {
    let soil = 0;
    for (let y = FIELD.y; y < FIELD.y + FIELD.h; y++) for (let x = FIELD.x; x < FIELD.x + FIELD.w; x++) if (world.get(x, y) === 's') soil++;
    expect(soil).toBe(FIELD.w * FIELD.h - FIELD.cutW * FIELD.cutH);
  });
});

describe('skills', () => {
  it('each hero has four skills, one basic', () => {
    for (const list of Object.values(HERO_SKILLS)) {
      expect(list.length).toBe(4);
      expect(list.filter((s) => SKILLS[s].basic).length).toBe(1);
    }
  });
  it('every learnable skill has a trainer and trial', () => {
    for (const s of Object.values(SKILLS)) if (!s.basic) expect(s.trainer && s.trial, s.id).toBeTruthy();
  });
});
