import { HEROES, type HeroId, type SkillId } from '../data';
import { KNIGHT_SEALS, WARDEN_SEALS, type AnySeal } from '../math/eigenseal';
import { GOLEM_SEALS } from '../math/seal';

export type EnemyKind =
  | 'slime'
  | 'frog'
  | 'splitter'
  | 'droplet'
  | 'beetle'
  | 'shade'
  | 'golem'
  | 'wisp'
  | 'scalar'
  | 'crystal'
  | 'bat'
  | 'sentry'
  | 'wraith'
  | 'knight'
  | 'warden';
export type UnitKind = HeroId | EnemyKind;

/**
 * Enemy abilities:
 * - blink: hops away from the nearest hero after its turn
 * - grow: gains max HP every turn (a scalar that keeps scaling up)
 * - reflect: hurts back heroes who hit it with a learned (unfocused) attack
 * - drain: heals itself for half the damage it deals
 * - push: its attacks shove the target back along the attack direction
 * - pull: its attacks drag the target one tile closer
 * - split: bursts into two droplets when defeated
 * - mend: heals a hurt ally instead of attacking
 * - harden: gains 1 armor every turn (up to 6)
 * - chill: its hits slow the target (2 less AP next turn)
 */
export type Ability = 'blink' | 'grow' | 'reflect' | 'drain' | 'push' | 'pull' | 'split' | 'mend' | 'harden' | 'chill';

export interface Attack {
  id: string;
  ap: number;
  min: number;
  max: number;
  range: number;
  minRange: number;
  /** hits every hero within this radius of the target */
  aoe?: number;
}

export interface EnemyDef {
  hp: number;
  init: number;
  speed: number;
  maxAp: number;
  regen: number;
  /** damage removed from every unfocused hit */
  armor: number;
  size: number;
  attacks: Attack[];
  abilities: Ability[];
  seals?: AnySeal[];
  /** HP at which the next seal forms, per phase */
  thresholds?: number[];
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  // Numerola
  slime: { hp: 16, init: 8, speed: 2, maxAp: 6, regen: 4, armor: 0, size: 1, abilities: [], attacks: [{ id: 'bite', ap: 2, min: 4, max: 6, range: 1, minRange: 1 }] },
  // Numerola stage 2: Times-Table Marsh
  frog: { hp: 14, init: 11, speed: 3, maxAp: 5, regen: 4, armor: 0, size: 1, abilities: ['pull'], attacks: [{ id: 'tongue', ap: 2, min: 3, max: 5, range: 2, minRange: 1 }] },
  splitter: { hp: 18, init: 6, speed: 2, maxAp: 5, regen: 4, armor: 0, size: 1, abilities: ['split'], attacks: [{ id: 'bite', ap: 2, min: 4, max: 6, range: 1, minRange: 1 }] },
  droplet: { hp: 6, init: 9, speed: 3, maxAp: 4, regen: 4, armor: 0, size: 1, abilities: [], attacks: [{ id: 'bite', ap: 2, min: 2, max: 3, range: 1, minRange: 1 }] },
  // Numerola stage 3: Echo Caves
  beetle: { hp: 20, init: 5, speed: 2, maxAp: 4, regen: 3, armor: 2, size: 1, abilities: [], attacks: [{ id: 'pinch', ap: 2, min: 4, max: 6, range: 1, minRange: 1 }] },
  shade: { hp: 14, init: 12, speed: 3, maxAp: 4, regen: 3, armor: 0, size: 1, abilities: ['mend'], attacks: [{ id: 'gloom', ap: 2, min: 2, max: 4, range: 3, minRange: 1 }] },
  golem: {
    hp: 75, init: 6, speed: 2, maxAp: 4, regen: 3, armor: 2, size: 2, abilities: [],
    attacks: [
      { id: 'slam', ap: 2, min: 7, max: 9, range: 1, minRange: 1 },
      { id: 'throw', ap: 3, min: 5, max: 7, range: 5, minRange: 2 },
    ],
    seals: GOLEM_SEALS,
    thresholds: [50, 25, 0],
  },
  // Eigenvale
  wisp: { hp: 15, init: 13, speed: 3, maxAp: 5, regen: 4, armor: 0, size: 1, abilities: ['blink'], attacks: [{ id: 'zap', ap: 2, min: 3, max: 5, range: 4, minRange: 1 }] },
  scalar: { hp: 18, init: 7, speed: 2, maxAp: 6, regen: 4, armor: 1, size: 1, abilities: ['grow'], attacks: [{ id: 'bite', ap: 2, min: 5, max: 7, range: 1, minRange: 1 }] },
  crystal: { hp: 30, init: 6, speed: 2, maxAp: 5, regen: 3, armor: 4, size: 1, abilities: ['reflect'], attacks: [{ id: 'slam', ap: 2, min: 7, max: 9, range: 1, minRange: 1 }] },
  bat: { hp: 13, init: 15, speed: 4, maxAp: 6, regen: 4, armor: 0, size: 1, abilities: ['drain'], attacks: [{ id: 'leech', ap: 2, min: 4, max: 6, range: 1, minRange: 1 }] },
  // Eigenvale stage 3: Shear Glacier
  sentry: { hp: 22, init: 5, speed: 1, maxAp: 4, regen: 3, armor: 1, size: 1, abilities: ['harden'], attacks: [{ id: 'icicle', ap: 3, min: 4, max: 6, range: 5, minRange: 2 }] },
  wraith: { hp: 16, init: 14, speed: 3, maxAp: 4, regen: 3, armor: 0, size: 1, abilities: ['chill'], attacks: [{ id: 'frost', ap: 2, min: 3, max: 5, range: 2, minRange: 1 }] },
  knight: {
    hp: 34, init: 8, speed: 2, maxAp: 5, regen: 3, armor: 2, size: 1, abilities: [],
    attacks: [{ id: 'lance', ap: 3, min: 6, max: 8, range: 2, minRange: 1 }],
    seals: KNIGHT_SEALS,
    thresholds: [0],
  },
  warden: {
    hp: 100, init: 9, speed: 2, maxAp: 5, regen: 4, armor: 3, size: 2, abilities: ['push'],
    attacks: [
      { id: 'stretch', ap: 2, min: 6, max: 9, range: 4, minRange: 1 },
      { id: 'pulse', ap: 3, min: 5, max: 7, range: 1, minRange: 1, aoe: 1 },
    ],
    seals: WARDEN_SEALS,
    thresholds: [70, 35, 0],
  },
};

export interface Focus {
  skill: SkillId;
  x: number;
  y: number;
  targetUid: number | null;
  /** hit while charging: the bonus shrinks */
  disrupted: boolean;
}

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
  seal: AnySeal | null;
  sealPhase: number;
  probeLog: string[];
  dead: boolean;
  armor: number;
  /** absorbs damage before HP */
  shield: number;
  /** turns left forcing enemies to attack this unit */
  taunt: number;
  /** turns left of taking +50% damage */
  mark: number;
  /** chilled: 2 less AP at the start of the next turn */
  chill: number;
  /** turns until an ability (a shade's mend) can be used again */
  abilityCd: number;
  focus: Focus | null;
  abilities: Ability[];
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
    armor: 0,
    shield: 0,
    taunt: 0,
    mark: 0,
    chill: 0,
    abilityCd: 0,
    focus: null,
    abilities: [],
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

export function makeEnemy(kind: EnemyKind, x: number, y: number): Unit {
  const d = ENEMIES[kind];
  const u = base(kind, 'enemy', x, y);
  u.hp = u.maxHp = d.hp;
  u.init = d.init;
  u.speed = d.speed;
  u.maxAp = d.maxAp;
  u.regen = d.regen;
  u.armor = d.armor;
  u.size = d.size;
  u.abilities = [...d.abilities];
  if (d.seals) u.seal = d.seals[0];
  return u;
}

/** Chebyshev distance between two unit footprints. */
export function unitDist(a: { x: number; y: number; size: number }, b: { x: number; y: number; size: number }): number {
  const dx = Math.max(0, a.x - (b.x + b.size - 1), b.x - (a.x + a.size - 1));
  const dy = Math.max(0, a.y - (b.y + b.size - 1), b.y - (a.y + a.size - 1));
  return Math.max(dx, dy);
}

export function occupies(u: Unit, x: number, y: number): boolean {
  return x >= u.x && x < u.x + u.size && y >= u.y && y < u.y + u.size;
}
