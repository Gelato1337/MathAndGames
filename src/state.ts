import type { ItemId, SkillId } from './data';
import { SKILLS } from './data';
import { resetMastery } from './math/mastery';

export type TimerMode = 'normal' | 'relaxed' | 'off';

export interface Flags {
  metElder: boolean;
  /** 0 not started, 1 talked, 2 area known, 3 seeds known, 4 planted */
  farmStage: number;
  farmResult: 'exact' | 'over' | 'under' | null;
  forestDone: boolean;
  gateOpen: boolean;
  golemDone: boolean;
  haggled: boolean;
}

export interface GameState {
  gold: number;
  inv: Record<ItemId, number>;
  learned: Set<SkillId>;
  /** 0..1 per learned skill. Fades between battles, restored by practice. */
  attune: Partial<Record<SkillId, number>>;
  flags: Flags;
  approaches: Set<string>;
}

function fresh(): GameState {
  return {
    gold: 40,
    inv: { tonic: 2, tea: 0, seeds: 0 },
    learned: new Set<SkillId>(['strike', 'bolt']),
    attune: {},
    flags: {
      metElder: false,
      farmStage: 0,
      farmResult: null,
      forestDone: false,
      gateOpen: false,
      golemDone: false,
      haggled: false,
    },
    approaches: new Set(),
  };
}

export let game: GameState = fresh();

export const settings: { timers: TimerMode } = { timers: 'normal' };
try {
  const saved = localStorage.getItem('numerola.timers');
  if (saved === 'normal' || saved === 'relaxed' || saved === 'off') settings.timers = saved;
} catch {
  // ignore
}

export function setTimers(mode: TimerMode): void {
  settings.timers = mode;
  try {
    localStorage.setItem('numerola.timers', mode);
  } catch {
    // ignore
  }
}

/** Seconds for a timed question, or 0 for untimed. */
export function timerSeconds(base: number): number {
  if (settings.timers === 'off') return 0;
  return settings.timers === 'relaxed' ? base * 2 : base;
}

export function newGame(): void {
  game = fresh();
  resetMastery();
}

export function learn(id: SkillId): void {
  game.learned.add(id);
  game.attune[id] = 1;
}

export function attunement(id: SkillId): number {
  if (SKILLS[id].basic) return 1;
  return game.attune[id] ?? 0;
}

/** Damage/heal multiplier from attunement: 60% at worst, 100% when fresh. */
export function attuneMult(id: SkillId): number {
  return 0.6 + 0.4 * attunement(id);
}

/** After each battle, skills that were not overcharged fade a bit. */
export function fadeAttunement(refreshed: Set<SkillId>): void {
  for (const id of game.learned) {
    if (SKILLS[id].basic) continue;
    if (refreshed.has(id)) game.attune[id] = 1;
    else game.attune[id] = Math.max(0, (game.attune[id] ?? 1) - 0.25);
  }
}

export function devUnlockAll(): void {
  for (const id of Object.keys(SKILLS) as SkillId[]) learn(id);
  game.flags.metElder = true;
  game.gold = 100;
}
