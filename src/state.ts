import type { CampaignId, ItemId, SkillId } from './data';
import { PARTY_SKILLS, SKILLS } from './data';
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

/** Eigenvale (linear algebra campaign) progress. */
export interface EvFlags {
  metIlona: boolean;
  plainsDone: boolean;
  minesDone: boolean;
  doorOpen: boolean;
  wardenDone: boolean;
  /** 0 not started, 1 accepted, 2 done */
  mapStage: number;
}

export interface GameState {
  campaign: CampaignId;
  gold: number;
  inv: Record<ItemId, number>;
  learned: Set<SkillId>;
  /** 0..1 per learned skill. Fades between battles, restored by practice. */
  attune: Partial<Record<SkillId, number>>;
  flags: Flags;
  ev: EvFlags;
  approaches: Set<string>;
  /** The player's own notebook, per campaign (free text). */
  notes: string;
}

/** Every hero starts with their basic attack. */
function basics(campaign: CampaignId): SkillId[] {
  return Object.values(PARTY_SKILLS[campaign]).map((list) => list![0]);
}

function fresh(campaign: CampaignId = 'numerola'): GameState {
  return {
    campaign,
    gold: 40,
    inv: { tonic: campaign === 'eigenvale' ? 3 : 2, tea: campaign === 'eigenvale' ? 1 : 0, seeds: 0 },
    learned: new Set<SkillId>(basics(campaign)),
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
    ev: { metIlona: false, plainsDone: false, minesDone: false, doorOpen: false, wardenDone: false, mapStage: 0 },
    approaches: new Set(),
    notes: '',
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

export function newGame(campaign: CampaignId = 'numerola'): void {
  game = fresh(campaign);
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

/** After each battle, skills not released with a right Focus answer fade a bit. */
export function fadeAttunement(refreshed: Set<SkillId>): void {
  for (const id of game.learned) {
    if (SKILLS[id].basic) continue;
    if (refreshed.has(id)) game.attune[id] = 1;
    else game.attune[id] = Math.max(0, (game.attune[id] ?? 1) - 0.25);
  }
}

export function devUnlockAll(): void {
  for (const list of Object.values(PARTY_SKILLS[game.campaign])) for (const id of list!) learn(id);
  game.flags.metElder = true;
  game.ev.metIlona = true;
  game.gold = 100;
}
