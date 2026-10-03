import { HEROES, type HeroId, type SkillId } from '../data';
import { GOLEM_SEALS, type Seal } from '../math/seal';

export type UnitKind = HeroId | 'slime' | 'golem';

export interface Unit {
  uid: number;
  kind: UnitKind;
  team: 'hero' | 'enemy';
  x: number;
  y: number;
  size: number;
  hp: number;
  maxHp: number;
  ap: number;
  maxAp: number;
  regen: number;
  init: number;
  /** tiles per AP */
  speed: number;
  moveLeft: number;
  cooldowns: Partial<Record<SkillId, number>>;
  hidden: boolean;
  stagger: boolean;
  seal: Seal | null;
  sealPhase: number;
  probeLog: string[];
  dead: boolean;
  // animation
  px: number;
  py: number;
  flash: number;
}

let nextUid = 1;

function base(kind: UnitKind, team: Unit['team'], x: number, y: number): Unit {
  return {
    uid: nextUid++,
    kind,
    team,
    x,
    y,
    size: 1,
    hp: 10,
    maxHp: 10,
    ap: 0,
    maxAp: 6,
    regen: 4,
    init: 10,
    speed: 3,
    moveLeft: 0,
    cooldowns: {},
    hidden: false,
    stagger: false,
    seal: null,
    sealPhase: 0,
    probeLog: [],
    dead: false,
    px: x * 16,
    py: y * 16,
    flash: 0,
  };
}

export function makeHero(id: HeroId, x: number, y: number): Unit {
  const d = HEROES[id];
  const u = base(id, 'hero', x, y);
  u.hp = u.maxHp = d.hp;
  u.init = d.init;
  u.speed = d.speed;
  return u;
}

export function makeEnemy(kind: 'slime' | 'golem', x: number, y: number): Unit {
  const u = base(kind, 'enemy', x, y);
  if (kind === 'slime') {
    u.hp = u.maxHp = 14;
    u.init = 8;
    u.speed = 2;
  } else {
    u.size = 2;
    u.hp = u.maxHp = 75;
    u.init = 6;
    u.speed = 2;
    u.maxAp = 4;
    u.regen = 3;
    u.seal = GOLEM_SEALS[0];
  }
  return u;
}

/** HP at which the golem's next seal reforms, per phase. */
export const GOLEM_THRESHOLDS = [50, 25, 0];

export const ENEMY_ATTACKS: Record<'slime' | 'golem', Array<{ id: string; ap: number; min: number; max: number; range: number; minRange: number }>> = {
  slime: [{ id: 'bite', ap: 2, min: 4, max: 5, range: 1, minRange: 1 }],
  golem: [
    { id: 'slam', ap: 2, min: 6, max: 8, range: 1, minRange: 1 },
    { id: 'throw', ap: 3, min: 4, max: 6, range: 5, minRange: 2 },
  ],
};

/** Chebyshev distance between two unit footprints. */
export function unitDist(a: { x: number; y: number; size: number }, b: { x: number; y: number; size: number }): number {
  const dx = Math.max(0, a.x - (b.x + b.size - 1), b.x - (a.x + a.size - 1));
  const dy = Math.max(0, a.y - (b.y + b.size - 1), b.y - (a.y + a.size - 1));
  return Math.max(dx, dy);
}

export function occupies(u: Unit, x: number, y: number): boolean {
  return x >= u.x && x < u.x + u.size && y >= u.y && y < u.y + u.size;
}
