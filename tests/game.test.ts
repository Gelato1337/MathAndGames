import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEROES, ITEMS, PARTY_SKILLS, SKILLS, TRAINER_NPC, TRAINER_SKILLS } from '../src/data';
import { ENEMIES } from '../src/combat/units';
import { CAMPAIGNS } from '../src/campaigns/registry';
import { game, newGame } from '../src/state';
import { LANDS, ROADS } from '../src/journey';
import { checkAns, det2, eigenMatrix, eigenvalues, generateLA, LA_TOPICS, matVec, sub, type Ans } from '../src/math/linalg';
import { WARDEN_SEALS, eigenSolution, PRACTICE_EIGEN } from '../src/math/eigenseal';
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
      if (SKILLS[id].focus) keys.push(`notebook.f.${SKILLS[id].focus!.topic}`, `notebook.d.${SKILLS[id].focus!.topic}`);
      if (SKILLS[id].trial) keys.push(`trial.${id}.intro`, `trial.${id}.outro`);
    }
    for (const id of Object.keys(ITEMS)) keys.push(`items.${id}.name`, `items.${id}.desc`);
    keys.push('items.tonic.short', 'items.tea.short');
    for (const n of NPCS) keys.push(`chars.${n.id}`, `${n.id === 'elder' ? 'elder.intro1' : `${n.id}.busy`}`);
    for (const id of Object.keys(HEROES)) keys.push(`chars.${id}`, `classes.${id}`);
    for (const id of Object.keys(ENEMIES)) keys.push(`chars.${id}`);
    for (const e of Object.values(ENEMIES)) for (const a of e.attacks) keys.push(`combat.attacks.${a.id}`);
    for (const c of Object.values(CAMPAIGNS)) {
      for (const k of ['name', 'tier', 'desc']) keys.push(`campaigns.${c.id}.${k}`);
      for (const n of c.npcs) keys.push(`chars.${n.id}`);
      keys.push(...c.intro);
    }
    for (const l of LANDS) for (const k of ['name', 'tier', 'desc']) keys.push(`campaigns.${l.id}.${k}`);
    for (const st of ['cleared', 'here', 'open', 'early', 'later']) keys.push(`worldmap.status.${st}`);
    for (const topic of LA_TOPICS) keys.push(`la.${topic}.title`, `la.${topic}.text`, `notebook.f.${topic}`, `notebook.d.${topic}`);
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
    for (const party of Object.values(PARTY_SKILLS))
      for (const list of Object.values(party)) {
        if (!list) continue;
        expect(list.length).toBe(4);
        expect(SKILLS[list[0]].basic).toBe(true);
        expect(list.filter((s) => SKILLS[s].basic).length).toBe(1);
      }
  });
  it('every learnable skill has a trainer and trial', () => {
    for (const s of Object.values(SKILLS)) if (!s.basic) expect(s.trainer && s.trial, s.id).toBeTruthy();
  });
  it('every trainer maps to an NPC in some campaign', () => {
    const npcs = new Set(Object.values(CAMPAIGNS).flatMap((c) => c.npcs.map((n) => n.id)));
    for (const tr of Object.keys(TRAINER_SKILLS) as Array<keyof typeof TRAINER_NPC>) expect(npcs.has(TRAINER_NPC[tr]), tr).toBe(true);
  });
});

describe('linear algebra problems', () => {
  it('checkAns accepts any multiple of an eigenvector, and sets in any order', () => {
    expect(checkAns({ kind: 'dir', v: [2, -2] }, { kind: 'dir', v: [1, -1] })).toBe(true);
    expect(checkAns({ kind: 'dir', v: [0, 0] }, { kind: 'dir', v: [1, -1] })).toBe(false);
    expect(checkAns({ kind: 'dir', v: [1, 1] }, { kind: 'dir', v: [1, -1] })).toBe(false);
    expect(checkAns({ kind: 'set', v: [3, 1] }, { kind: 'set', v: [1, 3] })).toBe(true);
    expect(checkAns({ kind: 'vec', v: [1, 2] }, { kind: 'vec', v: [2, 1] })).toBe(false);
  });

  it('eigen matrices have the whole-number eigenvalues they claim', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const { A, l } = eigenMatrix(1 + (i % 3), rng);
      expect(l[0]).not.toBe(l[1]);
      expect([...eigenvalues(A)].sort((a, b) => a - b)).toEqual([...l].sort((a, b) => a - b));
      for (const x of l) expect(det2(sub(A, x)) === 0).toBe(true);
    }
  });

  it('every generator gives a consistent problem with matching step and answer kinds', () => {
    const rng = seeded(11);
    for (const topic of LA_TOPICS)
      for (let lv = 1; lv <= 3; lv++)
        for (let i = 0; i < 30; i++) {
          const p = generateLA(topic, lv, rng);
          expect(p.topic).toBe(topic);
          expect(p.steps.length).toBeGreaterThan(0);
          for (const n of [p.answer, ...p.steps.map((s) => s.ans)].flatMap((a: Ans) => (a.kind === 'num' ? [a.v] : a.kind === 'mat' ? a.v.flat() : a.v)))
            expect(Number.isFinite(n), topic).toBe(true);
          expect(checkAns(p.answer, p.answer)).toBe(true);
          if (p.stepsAreAnswer) {
            const nums = p.steps.map((s) => (s.ans.kind === 'num' ? s.ans.v : NaN));
            const want = p.answer.kind === 'mat' ? p.answer.v.flat() : (p.answer.v as number[]);
            expect(nums, topic).toEqual(want);
          }
        }
  });

  it('eigenvector answers really are eigenvectors', () => {
    const rng = seeded(3);
    for (let i = 0; i < 50; i++) {
      const p = generateLA('eigen_vec', 1 + (i % 3), rng);
      expect(p.answer.kind).toBe('dir');
      const v = p.answer.v as number[];
      expect(v.some((x) => x !== 0)).toBe(true);
    }
  });
});

describe('eigen seals', () => {
  it('have whole-number answers and consistent vectors', () => {
    for (const s of [...WARDEN_SEALS, PRACTICE_EIGEN]) {
      const sol = eigenSolution(s);
      for (const l of sol.values) {
        expect(Number.isInteger(l)).toBe(true);
        expect(det2(sub(s.A, l)) === 0).toBe(true);
      }
      if (s.mode === 'vector') {
        const v = sol.vector!;
        expect(matVec(s.A, v)).toEqual(v.map((x) => x * s.lambda!));
      }
    }
  });
});

/** Every tile the party can walk to from the campaign's start. */
function reach(world: WorldMap, c: (typeof CAMPAIGNS)[keyof typeof CAMPAIGNS]): Set<string> {
  const seen = new Set<string>([`${c.start.x},${c.start.y}`]);
  const q = [[c.start.x, c.start.y]];
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
      if (c.npcs.some((n) => n.x === nx && n.y === ny)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return seen;
}

describe('journey', () => {
  it('every playable land is a campaign, and every road joins known lands', () => {
    for (const l of LANDS) if (l.campaign) expect(CAMPAIGNS[l.campaign], l.id).toBeTruthy();
    for (const c of Object.keys(CAMPAIGNS)) expect(LANDS.some((l) => l.campaign === c), c).toBe(true);
    const ids = new Set(LANDS.map((l) => l.id));
    for (const [a, b] of ROADS) expect(ids.has(a) && ids.has(b)).toBe(true);
    // Numerola is the tutorial: it needs nothing, everything else comes after it
    expect(LANDS.find((l) => l.id === 'numerola')!.after).toEqual([]);
    for (const l of LANDS) if (l.id !== 'numerola') expect(l.after.length, l.id).toBeGreaterThan(0);
  });
});

describe('campaigns', () => {
  for (const c of Object.values(CAMPAIGNS)) {
    it(`${c.id}: NPCs, objects, entries and enemies are reachable`, () => {
      const world = c.buildWorld();
      for (const row of world.tiles) expect(row.length).toBe(world.w);
      // with every stage cleared, every barrier is open
      newGame(c.id);
      c.dev('boss', () => {}, world);
      for (const o of c.interactables) world.replace(o.tiles, '_');
      const seen = reach(world, c);
      const near = (x: number, y: number) =>
        [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`));
      for (const n of c.npcs) expect(near(n.x, n.y), n.id).toBe(true);
      for (const o of c.interactables) expect(o.tiles.some((g) => seen.has(`${g.x},${g.y}`)), o.id).toBe(true);
      for (const e of c.encounters) {
        for (const p of c.entry[e.id] ?? []) expect(seen.has(`${p.x},${p.y}`), `${e.id} entry ${p.x},${p.y}`).toBe(true);
        expect(c.entry[e.id]?.length ?? 0, e.id).toBeGreaterThanOrEqual(c.party.length);
        for (const en of e.enemies) {
          const size = ENEMIES[en.kind].size;
          for (let dy = 0; dy < size; dy++)
            for (let dx = 0; dx < size; dx++) {
              expect(world.walkable(en.x + dx, en.y + dy), `${e.id} ${en.kind}`).toBe(true);
              expect(inRect(e.region, en.x + dx, en.y + dy)).toBe(true);
            }
        }
      }
    });
    it(`${c.id}: has three stages and a boss, and later stages are closed off at the start`, () => {
      newGame(c.id);
      const stages = c.stages(game);
      expect(stages.length).toBe(4);
      expect(stages.filter((s) => s.boss).length).toBe(1);
      expect(stages[3].boss).toBe(true);
      for (const s of stages) expect(s.name in EN, s.name).toBe(true);
      const world = c.buildWorld();
      c.prepareWorld(world);
      const seen = reach(world, c);
      const [first, ...later] = c.encounters;
      expect([...seen].some((k) => { const [x, y] = k.split(',').map(Number); return inRect(first.trigger, x, y); }), first.id).toBe(true);
      for (const e of later) {
        const inside = [...seen].some((k) => { const [x, y] = k.split(',').map(Number); return inRect(e.trigger, x, y); });
        expect(inside, `${e.id} should be closed at the start`).toBe(false);
      }
    });
  }
  it('every enemy kind has a sprite', () => {
    for (const k of Object.keys(ENEMIES)) expect(SPRITES[k], k).toBeTruthy();
    for (const k of Object.keys(HEROES)) expect(SPRITES[k], k).toBeTruthy();
  });
});
