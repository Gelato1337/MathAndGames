import { TILE } from '../art/tiles';
import { isHeld, takeClicks, takePressed } from '../input';
import type { Renderer } from '../render';
import { ENCOUNTERS, GATE_TILES, inRect, NPCS, type EncounterDef, type NpcDef, type WorldMap } from './map';

export interface Actor {
  sprite: string;
  x: number;
  y: number;
  px: number;
  py: number;
  fromX: number;
  fromY: number;
  t: number;
  moving: boolean;
  flip: boolean;
}

export function makeActor(sprite: string, x: number, y: number): Actor {
  return { sprite, x, y, px: x * TILE, py: y * TILE, fromX: x, fromY: y, t: 1, moving: false, flip: false };
}

export type Target = { kind: 'npc'; npc: NpcDef } | { kind: 'gate' };

export interface ExploreHooks {
  interact: (t: Target) => void;
  encounter: (e: EncounterDef) => void;
  encounterActive: (e: EncounterDef) => boolean;
  enemySprites: () => Array<{ sprite: string; x: number; y: number }>;
  menu: () => void;
  hotkey: (k: string) => void;
}

const SPEED = 7; // tiles per second

const DIRS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
};

export class Explore {
  leader: Actor;
  follower: Actor;
  path: Array<{ x: number; y: number }> = [];
  facing: [number, number] = [0, 1];

  constructor(
    readonly world: WorldMap,
    readonly r: Renderer,
    readonly hooks: ExploreHooks,
    start: { x: number; y: number },
  ) {
    this.leader = makeActor('kai', start.x, start.y);
    this.follower = makeActor('aino', start.x - 1, start.y);
  }

  placeParty(x: number, y: number, fx: number, fy: number): void {
    this.leader = makeActor('kai', x, y);
    this.follower = makeActor('aino', fx, fy);
    this.path = [];
  }

  blocked(x: number, y: number): boolean {
    if (!this.world.walkable(x, y)) return true;
    if (NPCS.some((n) => n.x === x && n.y === y)) return true;
    for (const e of this.hooks.enemySprites()) {
      const size = e.sprite === 'golem' ? 2 : 1;
      if (x >= e.x && x < e.x + size && y >= e.y && y < e.y + size) return true;
    }
    return false;
  }

  /** 4-directional BFS path, excluding start. */
  findPath(tx: number, ty: number): Array<{ x: number; y: number }> {
    const sx = this.leader.x;
    const sy = this.leader.y;
    const key = (x: number, y: number) => y * this.world.w + x;
    const prev = new Map<number, number>();
    const q: Array<[number, number]> = [[sx, sy]];
    prev.set(key(sx, sy), -1);
    let found = false;
    while (q.length) {
      const [x, y] = q.shift()!;
      if (x === tx && y === ty) {
        found = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        const k = key(nx, ny);
        if (prev.has(k) || this.blocked(nx, ny) || !this.world.canStep(x, y, nx, ny)) continue;
        prev.set(k, key(x, y));
        q.push([nx, ny]);
      }
      if (prev.size > 3000) break;
    }
    if (!found) return [];
    const out: Array<{ x: number; y: number }> = [];
    let k = key(tx, ty);
    while (k !== key(sx, sy)) {
      out.unshift({ x: k % this.world.w, y: Math.floor(k / this.world.w) });
      k = prev.get(k)!;
    }
    return out;
  }

  private step(a: Actor, x: number, y: number): void {
    a.fromX = a.x;
    a.fromY = a.y;
    if (x !== a.x) a.flip = x < a.x;
    a.x = x;
    a.y = y;
    a.t = 0;
    a.moving = true;
  }

  private tryMove(dx: number, dy: number): boolean {
    this.facing = [dx, dy];
    const nx = this.leader.x + dx;
    const ny = this.leader.y + dy;
    if (this.blocked(nx, ny) || !this.world.canStep(this.leader.x, this.leader.y, nx, ny)) {
      if (dx !== 0) this.leader.flip = dx < 0;
      return false;
    }
    const lx = this.leader.x;
    const ly = this.leader.y;
    this.step(this.leader, nx, ny);
    if (this.follower.x !== nx || this.follower.y !== ny) this.step(this.follower, lx, ly);
    return true;
  }

  target(): Target | null {
    const { x, y } = this.leader;
    const cand: Array<[number, number]> = [this.facing, [0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of cand) {
      const npc = NPCS.find((n) => n.x === x + dx && n.y === y + dy);
      if (npc) return { kind: 'npc', npc };
      if (GATE_TILES.some((g) => g.x === x + dx && g.y === y + dy) && this.world.get(x + dx, y + dy) === 'G') return { kind: 'gate' };
    }
    return null;
  }

  update(dt: number): void {
    for (const a of [this.leader, this.follower]) {
      if (!a.moving) continue;
      a.t = Math.min(1, a.t + dt * SPEED);
      a.px = (a.fromX + (a.x - a.fromX) * a.t) * TILE;
      a.py = (a.fromY + (a.y - a.fromY) * a.t) * TILE;
      if (a.t >= 1) a.moving = false;
    }

    for (const k of takePressed()) {
      if (k === 'e' || k === 'Enter' || k === ' ') {
        const tg = this.target();
        if (tg) {
          this.path = [];
          this.hooks.interact(tg);
          return;
        }
      } else if (k === 'Escape') {
        this.hooks.menu();
        return;
      } else {
        this.hooks.hotkey(k);
      }
    }

    for (const c of takeClicks()) {
      const t = this.r.screenToTile(c.x, c.y, this.world);
      const npc = NPCS.find((n) => n.x === t.x && n.y === t.y);
      const gate = GATE_TILES.some((g) => g.x === t.x && g.y === t.y) && this.world.get(t.x, t.y) === 'G';
      if (npc || gate) {
        // walk next to it, then interact
        const adj = [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]
          .map(([dx, dy]) => ({ x: t.x + dx, y: t.y + dy }))
          .filter((p) => !this.blocked(p.x, p.y) || (p.x === this.leader.x && p.y === this.leader.y));
        let best: Array<{ x: number; y: number }> | null = null;
        for (const p of adj) {
          if (p.x === this.leader.x && p.y === this.leader.y) {
            best = [];
            break;
          }
          const path = this.findPath(p.x, p.y);
          if (path.length && (!best || path.length < best.length)) best = path;
        }
        if (best) {
          this.path = best;
          this.pendingInteract = npc ? { kind: 'npc', npc } : { kind: 'gate' };
        }
      } else {
        this.path = this.findPath(t.x, t.y);
        this.pendingInteract = null;
      }
    }

    if (this.leader.moving) return;

    this.checkEncounter();

    // keyboard movement overrides click path
    for (const [k, [dx, dy]] of Object.entries(DIRS)) {
      if (isHeld(k)) {
        this.path = [];
        this.pendingInteract = null;
        this.tryMove(dx, dy);
        return;
      }
    }
    if (this.path.length) {
      const next = this.path.shift()!;
      if (!this.tryMove(next.x - this.leader.x, next.y - this.leader.y)) this.path = [];
      return;
    }
    if (this.pendingInteract) {
      const tg = this.pendingInteract;
      this.pendingInteract = null;
      // face it
      const pos = tg.kind === 'npc' ? tg.npc : GATE_TILES[0];
      this.facing = [Math.sign(pos.x - this.leader.x), Math.sign(pos.y - this.leader.y)];
      this.hooks.interact(tg);
    }
  }

  pendingInteract: Target | null = null;

  private checkEncounter(): void {
    for (const e of ENCOUNTERS) {
      if (this.hooks.encounterActive(e) && inRect(e.trigger, this.leader.x, this.leader.y)) {
        this.path = [];
        this.hooks.encounter(e);
        return;
      }
    }
  }

  /** Height of an actor, smoothly following its step. */
  actorZ(a: Actor): number {
    const z0 = this.world.height(a.fromX, a.fromY);
    const z1 = this.world.height(a.x, a.y);
    return a.moving ? z0 + (z1 - z0) * a.t : z1;
  }

  draw(): void {
    const r = this.r;
    const bobT = r.frame / 8;
    for (const n of NPCS) {
      const z = this.world.height(n.x, n.y);
      r.addSprite(n.x, n.y, () => r.drawSpriteAt(n.id, n.x, n.y, z, { bob: Math.sin(bobT + n.x) > 0.6 ? -1 : 0 }));
    }
    for (const e of this.hooks.enemySprites()) {
      const size = e.sprite === 'golem' ? 2 : 1;
      const z = this.world.height(e.x, e.y);
      r.addSprite(e.x + size - 1, e.y + size - 1, () =>
        r.drawSpriteAt(e.sprite, e.x, e.y, z, { size, bob: Math.sin(bobT * 0.7 + e.x) > 0 ? -1 : 0 }),
      );
    }
    for (const a of [this.follower, this.leader]) {
      const fx = a.px / TILE;
      const fy = a.py / TILE;
      // sort by the tile being entered so the actor is never hidden by the floor it walks onto
      const sx = a.moving ? Math.max(a.x, a.fromX) : a.x;
      const sy = a.moving ? Math.max(a.y, a.fromY) : a.y;
      const z = this.actorZ(a);
      r.addSprite(sx, sy, () => r.drawSpriteAt(a.sprite, fx, fy, z, { bob: a.moving && a.t < 0.5 ? -1 : 0, flip: a.flip }));
    }
  }
}
