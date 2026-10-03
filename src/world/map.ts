import { randInt } from '../math/problems';

export const MAP_W = 60;
export const MAP_H = 32;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface NpcDef {
  id: 'elder' | 'ren' | 'lumi' | 'pekka' | 'helmi';
  x: number;
  y: number;
}

export interface EnemyPlacement {
  kind: 'slime' | 'golem';
  x: number;
  y: number;
}

export interface EncounterDef {
  id: 'forest' | 'ruins';
  region: Rect;
  /** Leader entering this rect starts the fight. */
  trigger: Rect;
  enemies: EnemyPlacement[];
}

const BLOCKING = new Set(['T', 'R', 'H', 'w', 'D', 'F', '#', 'G', 'o', 'O', '~']);

export const NPCS: NpcDef[] = [
  { id: 'elder', x: 5, y: 12 },
  { id: 'ren', x: 13, y: 12 },
  { id: 'lumi', x: 20, y: 12 },
  { id: 'pekka', x: 28, y: 12 },
  { id: 'helmi', x: 14, y: 24 },
];

/** Helmi's crooked field: an 8 × 6 rectangle with a 3 × 2 corner missing. */
export const FIELD = { x: 5, y: 21, w: 8, h: 6, cutW: 3, cutH: 2 };

export const GATE_TILES = [
  { x: 47, y: 14 },
  { x: 47, y: 15 },
];

export const PLAYER_START = { x: 6, y: 14 };

export const ENCOUNTERS: EncounterDef[] = [
  {
    id: 'forest',
    region: { x: 36, y: 9, w: 9, h: 12 },
    trigger: { x: 38, y: 9, w: 7, h: 12 },
    enemies: [
      { kind: 'slime', x: 42, y: 11 },
      { kind: 'slime', x: 43, y: 17 },
    ],
  },
  {
    id: 'ruins',
    region: { x: 48, y: 8, w: 10, h: 14 },
    trigger: { x: 49, y: 8, w: 9, h: 14 },
    enemies: [{ kind: 'golem', x: 54, y: 14 }],
  },
];

export function inRect(r: Rect, x: number, y: number): boolean {
  return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
}

export class WorldMap {
  readonly w = MAP_W;
  readonly h = MAP_H;
  tiles: string[][];

  constructor() {
    this.tiles = buildTiles();
  }

  get(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 'T';
    return this.tiles[y][x];
  }

  set(x: number, y: number, ch: string): void {
    this.tiles[y][x] = ch;
  }

  walkable(x: number, y: number): boolean {
    return !BLOCKING.has(this.get(x, y));
  }

  openGate(): void {
    for (const g of GATE_TILES) this.set(g.x, g.y, '_');
  }
}

function buildTiles(): string[][] {
  const t: string[][] = [];
  for (let y = 0; y < MAP_H; y++) t.push(new Array<string>(MAP_W).fill('.'));
  const fill = (x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) t[yy][xx] = ch;
  };

  // deterministic scenery
  let seed = 1337;
  const rng = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  // flowers sprinkled everywhere
  for (let i = 0; i < 140; i++) t[randInt(rng, 1, MAP_H - 2)][randInt(rng, 1, MAP_W - 2)] = ',';

  // northern woods behind the village
  for (let i = 0; i < 70; i++) t[randInt(rng, 1, 6)][randInt(rng, 1, 31)] = 'T';
  // south-east woods
  for (let i = 0; i < 40; i++) t[randInt(rng, 18, MAP_H - 2)][randInt(rng, 21, 31)] = 'T';

  // eastern forest, dense
  fill(34, 1, 13, MAP_H - 2, 'T');
  for (let i = 0; i < 25; i++) t[randInt(rng, 1, MAP_H - 2)][randInt(rng, 34, 46)] = '.';
  // forest clearing (first battle)
  fill(36, 9, 9, 12, '.');
  t[11][39] = 'o';
  t[18][41] = 'o';
  t[12][44] = 'o';
  t[19][37] = ',';

  // border
  fill(0, 0, MAP_W, 1, 'T');
  fill(0, MAP_H - 1, MAP_W, 1, 'T');
  fill(0, 0, 1, MAP_H, 'T');
  fill(MAP_W - 1, 0, 1, MAP_H, 'T');

  // river with bridge
  fill(32, 0, 2, MAP_H, '~');

  // main road
  fill(2, 14, 45, 2, '=');
  fill(32, 14, 2, 2, 'B');

  // houses: 2 rows roof, 1 row wall with door at doorX
  const house = (x: number, w: number, doorX: number) => {
    fill(x, 8, w, 3, '.');
    fill(x, 9, w, 2, 'R');
    for (let xx = x; xx < x + w; xx++) t[11][xx] = (xx - x) % 2 === 1 ? 'w' : 'H';
    t[11][doorX] = 'D';
    fill(doorX, 12, 1, 2, '=');
  };
  house(3, 5, 5); // elder
  house(10, 6, 13); // dojo
  house(18, 6, 20); // library
  house(26, 5, 28); // shop
  // clear trees right in front of houses
  for (let x = 2; x <= 31; x++) for (const y of [12, 13]) if (t[y][x] === 'T') t[y][x] = '.';

  // farm with fence
  fill(3, 18, 16, 12, '.');
  fill(3, 18, 16, 1, 'F');
  fill(3, 29, 16, 1, 'F');
  fill(3, 18, 1, 12, 'F');
  fill(18, 18, 1, 12, 'F');
  fill(10, 16, 1, 3, '=');
  // Helmi's crooked field (soil)
  fill(FIELD.x, FIELD.y, FIELD.w, FIELD.h, 's');
  fill(FIELD.x + FIELD.w - FIELD.cutW, FIELD.y, FIELD.cutW, FIELD.cutH, '.');
  // an already planted strip
  fill(14, 27, 4, 1, 'c');
  fill(5, 28, 8, 1, 'c');

  // ruins
  fill(47, 7, 12, 16, '#');
  fill(48, 8, 10, 14, '_');
  for (const g of GATE_TILES) t[g.y][g.x] = 'G';
  t[10][50] = 'O';
  t[19][50] = 'O';
  t[10][55] = 'O';
  t[19][55] = 'O';
  t[14][46] = '=';
  t[15][46] = '=';

  // keep NPC spots and paths clear
  for (const n of NPCS) t[n.y][n.x] = t[n.y][n.x] === '=' ? '=' : '.';
  return t;
}
