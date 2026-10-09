import type { CampaignId, HeroId } from './data';
import type { GameState } from './state';
import type { EncounterDef, NpcDef, WorldMap } from './world/map';

/** Something in the world you can click to examine (a gate, a door, a sign). */
export interface Interactable {
  id: string;
  tiles: Array<{ x: number; y: number }>;
  /** still there to examine (an opened door is no longer examinable) */
  active: (world: WorldMap) => boolean;
}

/** One step of a campaign's road to its final boss (shown on the world map and in the quest log). */
export interface Stage {
  /** lang key of the area's name */
  name: string;
  done: boolean;
  boss?: boolean;
}

/** What a campaign's story code can ask the game to do. */
export interface CampaignCtx {
  refresh: () => void;
  world: () => WorldMap;
}

/**
 * A campaign is one subject taught as one adventure: its own world, cast,
 * skills and story. All campaigns share the engine (world, battles,
 * puzzles, notebook, tutor).
 */
export interface Campaign {
  id: CampaignId;
  /** party order: the first hero leads, the others follow */
  party: HeroId[];
  start: { x: number; y: number };
  buildWorld: () => WorldMap;
  /** open the gates, doors and barriers the current progress has already opened */
  prepareWorld: (world: WorldMap) => void;
  /** the 3 stages and the final boss, in order, for a saved game of this campaign */
  stages: (g: GameState) => Stage[];
  npcs: NpcDef[];
  interactables: Interactable[];
  encounters: EncounterDef[];
  /** where the party stands when a lost battle is retried */
  entry: Record<string, Array<{ x: number; y: number }>>;
  encounterActive: (id: string) => boolean;
  encounterCleared: (id: string) => boolean;
  talk: (npc: NpcDef, ctx: CampaignCtx) => Promise<void>;
  examine: (id: string, ctx: CampaignCtx) => Promise<void>;
  beforeBattle: (id: string) => Promise<void>;
  /** returns true when the campaign is finished */
  afterBattle: (id: string, ctx: CampaignCtx) => Promise<boolean>;
  objective: () => string;
  sideObjective: () => string | null;
  quests: () => HTMLElement[];
  /** lang keys of the intro slides */
  intro: string[];
  /** lines for the ending screen */
  ending: () => string[];
  /** dev shortcuts (?dev=…) */
  dev: (where: string | null, place: (x: number, y: number) => void, world: WorldMap) => void;
}
