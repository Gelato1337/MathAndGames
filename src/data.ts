import type { Topic } from './math/problems';

export type CampaignId = 'numerola' | 'eigenvale' | 'chancewood';
export type HeroId = 'kai' | 'aino' | 'sana' | 'otso' | 'onni';
export type SkillId =
  // Numerola
  | 'strike'
  | 'flurry'
  | 'shadowStep'
  | 'probe'
  | 'bolt'
  | 'fireball'
  | 'mend'
  | 'unbind'
  // Eigenvale
  | 'dash'
  | 'vflurry'
  | 'eprobe'
  | 'beam'
  | 'emend'
  | 'eunbind'
  | 'shot'
  | 'aimed'
  | 'volley'
  | 'mark'
  | 'bash'
  | 'ward'
  | 'taunt'
  | 'quake'
  // Chancewood
  | 'cstep'
  | 'cflurry'
  | 'cprobe'
  | 'cstorm'
  | 'cmend'
  | 'cunbind'
  | 'toss'
  | 'jinx'
  | 'dice'
  | 'fortune';
export type ItemId = 'tonic' | 'tea' | 'seeds';
export type TrainerId = 'ren' | 'lumi' | 'ilona' | 'kerttu' | 'vera' | 'renEv' | 'renCh' | 'tilda' | 'hannu';

export type TrialDef =
  | { kind: 'problems'; topic: Topic; need: number }
  | { kind: 'probe' }
  | { kind: 'unbind' };

/** What a skill does when it lands. Numbers are base values before bonuses. */
export type Effect =
  | { kind: 'hit'; min: number; max: number; projectile?: string }
  | { kind: 'multi'; hits: number; dmg: number }
  | { kind: 'aoe'; dmg: number; fire?: boolean }
  | { kind: 'heal'; amount: number }
  | { kind: 'teleport' }
  | { kind: 'probe'; dmg: number }
  | { kind: 'unbind' }
  | { kind: 'shield'; amount: number }
  | { kind: 'taunt'; turns: number }
  | { kind: 'mark'; turns: number };

export interface SkillDef {
  id: SkillId;
  owner: HeroId;
  ap: number;
  cooldown: number;
  range: number;
  target: 'enemy' | 'ally' | 'tile' | 'emptyTile' | 'self';
  /** Radius of an area effect (Chebyshev), 0 for single target. */
  area: number;
  effect: Effect;
  basic?: boolean;
  /**
   * Focus: charge the skill this turn, release it at the start of the next
   * turn with a puzzle. A right answer multiplies the effect and pierces armor.
   */
  focus?: { topic: Topic; timed: boolean };
  trainer?: TrainerId;
  trial?: TrialDef;
}

const S = (d: SkillDef): SkillDef => d;

export const SKILLS: Record<SkillId, SkillDef> = {
  // ---------- Numerola ----------
  strike: S({ id: 'strike', owner: 'kai', ap: 2, cooldown: 0, range: 1, target: 'enemy', area: 0, basic: true, effect: { kind: 'hit', min: 6, max: 8 } }),
  flurry: S({
    id: 'flurry', owner: 'kai', ap: 3, cooldown: 2, range: 1, target: 'enemy', area: 0,
    effect: { kind: 'multi', hits: 2, dmg: 4 },
    focus: { topic: 'add_sub', timed: true },
    trainer: 'ren', trial: { kind: 'problems', topic: 'add_sub', need: 4 },
  }),
  shadowStep: S({
    id: 'shadowStep', owner: 'kai', ap: 1, cooldown: 3, range: 5, target: 'emptyTile', area: 0,
    effect: { kind: 'teleport' },
    trainer: 'ren', trial: { kind: 'problems', topic: 'mul', need: 4 },
  }),
  probe: S({
    id: 'probe', owner: 'kai', ap: 2, cooldown: 0, range: 1, target: 'enemy', area: 0,
    effect: { kind: 'probe', dmg: 5 },
    trainer: 'ren', trial: { kind: 'probe' },
  }),
  bolt: S({ id: 'bolt', owner: 'aino', ap: 2, cooldown: 0, range: 5, target: 'enemy', area: 0, basic: true, effect: { kind: 'hit', min: 5, max: 7, projectile: '#73eff7' } }),
  fireball: S({
    id: 'fireball', owner: 'aino', ap: 3, cooldown: 3, range: 6, target: 'tile', area: 1,
    effect: { kind: 'aoe', dmg: 9, fire: true },
    focus: { topic: 'area', timed: false },
    trainer: 'lumi', trial: { kind: 'problems', topic: 'area', need: 3 },
  }),
  mend: S({
    id: 'mend', owner: 'aino', ap: 2, cooldown: 2, range: 4, target: 'ally', area: 0,
    effect: { kind: 'heal', amount: 10 },
    focus: { topic: 'missing', timed: false },
    trainer: 'lumi', trial: { kind: 'problems', topic: 'missing', need: 4 },
  }),
  unbind: S({
    id: 'unbind', owner: 'aino', ap: 2, cooldown: 1, range: 6, target: 'enemy', area: 0,
    effect: { kind: 'unbind' },
    trainer: 'lumi', trial: { kind: 'unbind' },
  }),

  // ---------- Eigenvale ----------
  dash: S({
    id: 'dash', owner: 'kai', ap: 1, cooldown: 2, range: 5, target: 'emptyTile', area: 0,
    effect: { kind: 'teleport' },
    trainer: 'renEv', trial: { kind: 'problems', topic: 'vec_add', need: 3 },
  }),
  vflurry: S({
    id: 'vflurry', owner: 'kai', ap: 3, cooldown: 2, range: 1, target: 'enemy', area: 0,
    effect: { kind: 'multi', hits: 2, dmg: 5 },
    focus: { topic: 'dot', timed: true },
    trainer: 'renEv', trial: { kind: 'problems', topic: 'dot', need: 3 },
  }),
  eprobe: S({
    id: 'eprobe', owner: 'kai', ap: 2, cooldown: 0, range: 1, target: 'enemy', area: 0,
    effect: { kind: 'probe', dmg: 5 },
    trainer: 'renEv', trial: { kind: 'probe' },
  }),
  beam: S({
    id: 'beam', owner: 'aino', ap: 3, cooldown: 2, range: 6, target: 'tile', area: 1,
    effect: { kind: 'aoe', dmg: 9 },
    focus: { topic: 'mat_vec', timed: false },
    trainer: 'kerttu', trial: { kind: 'problems', topic: 'mat_vec', need: 3 },
  }),
  emend: S({
    id: 'emend', owner: 'aino', ap: 2, cooldown: 2, range: 4, target: 'ally', area: 0,
    effect: { kind: 'heal', amount: 12 },
    focus: { topic: 'vec_scale', timed: false },
    trainer: 'kerttu', trial: { kind: 'problems', topic: 'vec_scale', need: 3 },
  }),
  eunbind: S({
    id: 'eunbind', owner: 'aino', ap: 2, cooldown: 1, range: 6, target: 'enemy', area: 0,
    effect: { kind: 'unbind' },
    trainer: 'kerttu', trial: { kind: 'unbind' },
  }),
  shot: S({ id: 'shot', owner: 'sana', ap: 2, cooldown: 0, range: 6, target: 'enemy', area: 0, basic: true, effect: { kind: 'hit', min: 5, max: 7, projectile: '#ffcd75' } }),
  aimed: S({
    id: 'aimed', owner: 'sana', ap: 3, cooldown: 2, range: 7, target: 'enemy', area: 0,
    effect: { kind: 'hit', min: 9, max: 11, projectile: '#ffcd75' },
    focus: { topic: 'dot', timed: false },
    trainer: 'ilona', trial: { kind: 'problems', topic: 'dot', need: 3 },
  }),
  volley: S({
    id: 'volley', owner: 'sana', ap: 3, cooldown: 3, range: 6, target: 'tile', area: 1,
    effect: { kind: 'aoe', dmg: 7 },
    focus: { topic: 'vec_add', timed: false },
    trainer: 'ilona', trial: { kind: 'problems', topic: 'vec_add', need: 3 },
  }),
  mark: S({
    id: 'mark', owner: 'sana', ap: 1, cooldown: 3, range: 7, target: 'enemy', area: 0,
    effect: { kind: 'mark', turns: 2 },
    trainer: 'ilona', trial: { kind: 'problems', topic: 'perp', need: 3 },
  }),
  bash: S({ id: 'bash', owner: 'otso', ap: 2, cooldown: 0, range: 1, target: 'enemy', area: 0, basic: true, effect: { kind: 'hit', min: 6, max: 8 } }),
  ward: S({
    id: 'ward', owner: 'otso', ap: 2, cooldown: 2, range: 3, target: 'ally', area: 0,
    effect: { kind: 'shield', amount: 10 },
    focus: { topic: 'det2', timed: false },
    trainer: 'vera', trial: { kind: 'problems', topic: 'det2', need: 3 },
  }),
  taunt: S({
    id: 'taunt', owner: 'otso', ap: 1, cooldown: 3, range: 0, target: 'self', area: 0,
    effect: { kind: 'taunt', turns: 2 },
    trainer: 'vera', trial: { kind: 'problems', topic: 'vec_scale', need: 2 },
  }),
  quake: S({
    id: 'quake', owner: 'otso', ap: 3, cooldown: 3, range: 0, target: 'self', area: 1,
    effect: { kind: 'aoe', dmg: 8 },
    focus: { topic: 'mat_mul', timed: false },
    trainer: 'vera', trial: { kind: 'problems', topic: 'mat_mul', need: 2 },
  }),

  // ---------- Chancewood ----------
  cstep: S({
    id: 'cstep', owner: 'kai', ap: 1, cooldown: 2, range: 5, target: 'emptyTile', area: 0,
    effect: { kind: 'teleport' },
    trainer: 'renCh', trial: { kind: 'problems', topic: 'stat_range', need: 3 },
  }),
  cflurry: S({
    id: 'cflurry', owner: 'kai', ap: 3, cooldown: 2, range: 1, target: 'enemy', area: 0,
    effect: { kind: 'multi', hits: 2, dmg: 5 },
    focus: { topic: 'prob_simple', timed: true },
    trainer: 'renCh', trial: { kind: 'problems', topic: 'prob_simple', need: 3 },
  }),
  cprobe: S({
    id: 'cprobe', owner: 'kai', ap: 2, cooldown: 0, range: 1, target: 'enemy', area: 0,
    effect: { kind: 'probe', dmg: 5 },
    trainer: 'renCh', trial: { kind: 'probe' },
  }),
  cstorm: S({
    id: 'cstorm', owner: 'aino', ap: 3, cooldown: 2, range: 6, target: 'tile', area: 1,
    effect: { kind: 'aoe', dmg: 9 },
    focus: { topic: 'stat_mean', timed: false },
    trainer: 'tilda', trial: { kind: 'problems', topic: 'stat_mean', need: 3 },
  }),
  cmend: S({
    id: 'cmend', owner: 'aino', ap: 2, cooldown: 2, range: 4, target: 'ally', area: 0,
    effect: { kind: 'heal', amount: 12 },
    focus: { topic: 'stat_median', timed: false },
    trainer: 'tilda', trial: { kind: 'problems', topic: 'stat_median', need: 3 },
  }),
  cunbind: S({
    id: 'cunbind', owner: 'aino', ap: 2, cooldown: 1, range: 6, target: 'enemy', area: 0,
    effect: { kind: 'unbind' },
    trainer: 'tilda', trial: { kind: 'unbind' },
  }),
  toss: S({ id: 'toss', owner: 'onni', ap: 2, cooldown: 0, range: 4, target: 'enemy', area: 0, basic: true, effect: { kind: 'hit', min: 3, max: 9, projectile: '#ffcd75' } }),
  jinx: S({
    id: 'jinx', owner: 'onni', ap: 1, cooldown: 3, range: 6, target: 'enemy', area: 0,
    effect: { kind: 'mark', turns: 2 },
    trainer: 'hannu', trial: { kind: 'problems', topic: 'prob_not', need: 3 },
  }),
  dice: S({
    id: 'dice', owner: 'onni', ap: 3, cooldown: 3, range: 5, target: 'tile', area: 1,
    effect: { kind: 'aoe', dmg: 8 },
    focus: { topic: 'prob_dice', timed: false },
    trainer: 'hannu', trial: { kind: 'problems', topic: 'prob_dice', need: 2 },
  }),
  fortune: S({
    id: 'fortune', owner: 'onni', ap: 2, cooldown: 2, range: 3, target: 'ally', area: 0,
    effect: { kind: 'shield', amount: 10 },
    focus: { topic: 'expect', timed: false },
    trainer: 'hannu', trial: { kind: 'problems', topic: 'expect', need: 2 },
  }),
};

/** Which skills each hero has, per campaign (first one is the basic attack). */
export const PARTY_SKILLS: Record<CampaignId, Partial<Record<HeroId, SkillId[]>>> = {
  numerola: {
    kai: ['strike', 'flurry', 'shadowStep', 'probe'],
    aino: ['bolt', 'fireball', 'mend', 'unbind'],
  },
  eigenvale: {
    kai: ['strike', 'dash', 'vflurry', 'eprobe'],
    aino: ['bolt', 'beam', 'emend', 'eunbind'],
    sana: ['shot', 'aimed', 'volley', 'mark'],
    otso: ['bash', 'ward', 'taunt', 'quake'],
  },
  chancewood: {
    kai: ['strike', 'cstep', 'cflurry', 'cprobe'],
    aino: ['bolt', 'cstorm', 'cmend', 'cunbind'],
    onni: ['toss', 'jinx', 'dice', 'fortune'],
  },
};

/** Skills each trainer teaches, in the order they must be learned. */
export const TRAINER_SKILLS: Record<TrainerId, SkillId[]> = {
  ren: ['flurry', 'shadowStep', 'probe'],
  lumi: ['fireball', 'mend', 'unbind'],
  renEv: ['dash', 'vflurry', 'eprobe'],
  kerttu: ['beam', 'emend', 'eunbind'],
  ilona: ['aimed', 'volley', 'mark'],
  vera: ['ward', 'taunt', 'quake'],
  renCh: ['cstep', 'cflurry', 'cprobe'],
  tilda: ['cstorm', 'cmend', 'cunbind'],
  hannu: ['jinx', 'dice', 'fortune'],
};

/** The NPC sprite/name for a trainer (Ren teaches in both campaigns). */
export const TRAINER_NPC: Record<TrainerId, string> = { ren: 'ren', lumi: 'lumi', renEv: 'ren', kerttu: 'kerttu', ilona: 'ilona', vera: 'vera', renCh: 'ren', tilda: 'tilda', hannu: 'hannu' };

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
  sana: { id: 'sana', hp: 28, init: 12, speed: 3 },
  otso: { id: 'otso', hp: 40, init: 7, speed: 2 },
  onni: { id: 'onni', hp: 30, init: 11, speed: 3 },
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

/** Focus multipliers: full marks, right answer after being hit, and wrong answer. */
export const FOCUS_MULT = { perfect: 2.5, disrupted: 1.8, miss: 1 };
