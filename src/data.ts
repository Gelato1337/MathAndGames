import type { Topic } from './math/problems';

export type HeroId = 'kai' | 'aino';
export type SkillId = 'strike' | 'flurry' | 'shadowStep' | 'probe' | 'bolt' | 'fireball' | 'mend' | 'unbind';
export type ItemId = 'tonic' | 'tea' | 'seeds';
export type TrainerId = 'ren' | 'lumi';

export type TrialDef =
  | { kind: 'problems'; topic: Topic; need: number }
  | { kind: 'probe' }
  | { kind: 'unbind' };

export interface SkillDef {
  id: SkillId;
  owner: HeroId;
  ap: number;
  cooldown: number;
  range: number;
  target: 'enemy' | 'ally' | 'tile' | 'emptyTile';
  /** Radius of an area effect (Chebyshev), 0 for single target. */
  area: number;
  basic?: boolean;
  /** Optional in-combat question that empowers the cast. */
  overcharge?: { topic: Topic; timed: boolean };
  trainer?: TrainerId;
  trial?: TrialDef;
}

export const SKILLS: Record<SkillId, SkillDef> = {
  strike: { id: 'strike', owner: 'kai', ap: 2, cooldown: 0, range: 1, target: 'enemy', area: 0, basic: true },
  flurry: {
    id: 'flurry',
    owner: 'kai',
    ap: 3,
    cooldown: 2,
    range: 1,
    target: 'enemy',
    area: 0,
    overcharge: { topic: 'add_sub', timed: true },
    trainer: 'ren',
    trial: { kind: 'problems', topic: 'add_sub', need: 4 },
  },
  shadowStep: {
    id: 'shadowStep',
    owner: 'kai',
    ap: 1,
    cooldown: 3,
    range: 5,
    target: 'emptyTile',
    area: 0,
    overcharge: { topic: 'mul', timed: true },
    trainer: 'ren',
    trial: { kind: 'problems', topic: 'mul', need: 4 },
  },
  probe: {
    id: 'probe',
    owner: 'kai',
    ap: 2,
    cooldown: 0,
    range: 1,
    target: 'enemy',
    area: 0,
    trainer: 'ren',
    trial: { kind: 'probe' },
  },
  bolt: { id: 'bolt', owner: 'aino', ap: 2, cooldown: 0, range: 5, target: 'enemy', area: 0, basic: true },
  fireball: {
    id: 'fireball',
    owner: 'aino',
    ap: 3,
    cooldown: 3,
    range: 6,
    target: 'tile',
    area: 1,
    overcharge: { topic: 'area', timed: false },
    trainer: 'lumi',
    trial: { kind: 'problems', topic: 'area', need: 3 },
  },
  mend: {
    id: 'mend',
    owner: 'aino',
    ap: 2,
    cooldown: 2,
    range: 4,
    target: 'ally',
    area: 0,
    overcharge: { topic: 'missing', timed: false },
    trainer: 'lumi',
    trial: { kind: 'problems', topic: 'missing', need: 4 },
  },
  unbind: {
    id: 'unbind',
    owner: 'aino',
    ap: 2,
    cooldown: 1,
    range: 6,
    target: 'enemy',
    area: 0,
    trainer: 'lumi',
    trial: { kind: 'unbind' },
  },
};

/** Skills each trainer teaches, in the order they must be learned. */
export const TRAINER_SKILLS: Record<TrainerId, SkillId[]> = {
  ren: ['flurry', 'shadowStep', 'probe'],
  lumi: ['fireball', 'mend', 'unbind'],
};

export const HERO_SKILLS: Record<HeroId, SkillId[]> = {
  kai: ['strike', 'flurry', 'shadowStep', 'probe'],
  aino: ['bolt', 'fireball', 'mend', 'unbind'],
};

export interface HeroDef {
  id: HeroId;
  hp: number;
  init: number;
  /** tiles per AP */
  speed: number;
}

export const HEROES: Record<HeroId, HeroDef> = {
  kai: { id: 'kai', hp: 32, init: 14, speed: 3 },
  aino: { id: 'aino', hp: 26, init: 10, speed: 3 },
};

export interface ItemDef {
  id: ItemId;
  price: number;
  combat: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  tonic: { id: 'tonic', price: 5, combat: true },
  tea: { id: 'tea', price: 8, combat: true },
  seeds: { id: 'seeds', price: 2, combat: false },
};

export const SEEDS_PER_BAG = 10;
export const SEEDS_PER_M2 = 3;
export const TONIC_HEAL = 15;
export const TEA_AP = 2;
