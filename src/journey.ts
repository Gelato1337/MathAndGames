import type { CampaignId } from './data';
import type { GameState } from './state';

/** Every land on the world map. Lands without a campaign are coming later. */
export type LandId = CampaignId | 'chancewood' | 'fluxreach' | 'bitforge' | 'forcehold';

export interface Land {
  id: LandId;
  campaign: CampaignId | null;
  /** position on the 192 × 112 world map */
  x: number;
  y: number;
  /** lands to clear first (the recommended order) */
  after: LandId[];
  /** sprites shown on the land's card */
  sprites: string[];
}

export const LANDS: Land[] = [
  { id: 'numerola', campaign: 'numerola', x: 40, y: 76, after: [], sprites: ['kai', 'golem', 'aino'] },
  { id: 'eigenvale', campaign: 'eigenvale', x: 100, y: 50, after: ['numerola'], sprites: ['sana', 'warden', 'otso'] },
  { id: 'chancewood', campaign: 'chancewood', x: 38, y: 28, after: ['numerola'], sprites: ['onni', 'fortuna', 'tilda'] },
  { id: 'fluxreach', campaign: null, x: 156, y: 28, after: ['eigenvale'], sprites: [] },
  { id: 'bitforge', campaign: null, x: 110, y: 94, after: ['eigenvale'], sprites: [] },
  { id: 'forcehold', campaign: null, x: 164, y: 82, after: ['fluxreach'], sprites: [] },
];

/** Roads drawn between lands. */
export const ROADS: Array<[LandId, LandId]> = [
  ['numerola', 'eigenvale'],
  ['numerola', 'chancewood'],
  ['eigenvale', 'fluxreach'],
  ['eigenvale', 'bitforge'],
  ['fluxreach', 'forcehold'],
];

export function land(id: LandId): Land {
  return LANDS.find((l) => l.id === id)!;
}

interface Saved {
  cleared: CampaignId[];
}

const KEY = 'numerola.journey';

function load(): Set<CampaignId> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const s = JSON.parse(raw) as Saved;
    return new Set((s.cleared ?? []).filter((c) => c === 'numerola' || c === 'eigenvale' || c === 'chancewood'));
  } catch {
    return new Set();
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ cleared: [...journey.cleared] } satisfies Saved));
  } catch {
    // private mode: progress lasts for this visit only
  }
}

/**
 * The whole journey across lands. Cleared lands are remembered between
 * visits; the state of each land the party has walked in is kept for this
 * visit, so travelling away and back loses nothing.
 */
export const journey = {
  cleared: load(),
  /** the land the party is in (null before the journey starts) */
  current: null as CampaignId | null,
  sessions: new Map<CampaignId, { state: GameState; x: number; y: number }>(),
};

export function markCleared(id: CampaignId): void {
  journey.cleared.add(id);
  save();
}

export function resetJourney(): void {
  journey.cleared.clear();
  journey.sessions.clear();
  journey.current = null;
  save();
}

/** Has the recommended order been followed up to this land? */
export function recommended(l: Land): boolean {
  return l.after.every((a) => journey.cleared.has(a as CampaignId));
}

export function hasJourney(): boolean {
  return journey.cleared.size > 0 || journey.sessions.size > 0;
}
