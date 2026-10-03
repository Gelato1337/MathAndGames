import { tileCenter } from '../art/iso';
import { TILE } from '../art/tiles';
import { t } from '../i18n';
import { isHeld, mousePos, takeClicks, takePressed } from '../input';
import type { Renderer } from '../render';
import { ENCOUNTERS, GATE_TILES, inRect, MAX_STEP, NPCS, type EncounterDef, type NpcDef, type WorldMap } from './map';

/**
 * A character walking freely in the world. (rx, ry) is the real position in
 * tile units (tile i spans i … i+1); x, y is the tile it stands on.
 */
export interface Actor {
  sprite: string;
  rx: number;
  ry: number;
  x: number;
  y: number;
  /** legacy pixel position of the tile-origin the sprite is drawn from (= (rx − 0.5) × 16) */
  px: number;
  py: number;
  /** smoothed height, so steps up and down look like a hop, not a jump */
  z: number;
  moving: boolean;
  flip: boolean;
  /** distance walked, drives the walk bob */
  walked: number;
}

export function makeActor(sprite: string, x: number, y: number, z = 0): Actor {
  const a: Actor = { sprite, rx: x + 0.5, ry: y + 0.5, x, y, px: 0, py: 0, z, moving: false, flip: false, walked: 0 };
  sync(a);
  return a;
}

function sync(a: Actor): void {
  a.x = Math.floor(a.rx);
  a.y = Math.floor(a.ry);
  a.px = (a.rx - 0.5) * TILE;
  a.py = (a.ry - 0.5) * TILE;
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

/** Walking speed in tiles per second. */
const SPEED = 4.2;
/** Collision radius of a character, in tiles. */
const RADIUS = 0.26;
/** How far behind the leader the follower walks, in tiles. */
const FOLLOW_GAP = 0.95;
/** How close you must stand to talk to someone (tile-centre distance). */
const TALK_RANGE = 1.45;

const STEPS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * Exploration with free movement in any direction (Golden Sun / DOS2 style).
 * Arrow keys or WASD walk in screen directions; clicking walks along a path
 * found on the tile grid and smoothed. Battles stay on the grid.
 */
export class Explore {
  leader: Actor;
  follower: Actor;
  /** waypoints (tile centres) of a click-to-move route */
  path: Array<{ x: number; y: number }> = [];
  facing: [number, number] = [0, 1];
  pendingInteract: Target | null = null;
  private trail: Array<{ x: number; y: number }> = [];
  private hover: { x: number; y: number } | null = null;
  private hoverTarget: Target | null = null;
  private hoverPath: Array<{ x: number; y: number }> = [];
  private hoverKey = '';
  private dest: { x: number; y: number } | null = null;

  constructor(
    readonly world: WorldMap,
    readonly r: Renderer,
    readonly hooks: ExploreHooks,
    start: { x: number; y: number },
  ) {
    this.leader = makeActor('kai', start.x, start.y);
    this.follower = makeActor('aino', start.x - 1, start.y);
    this.resetTrail();
  }

  placeParty(x: number, y: number, fx: number, fy: number): void {
    this.leader = makeActor('kai', x, y, this.world.height(x, y));
    this.follower = makeActor('aino', fx, fy, this.world.height(fx, fy));
    this.path = [];
    this.dest = null;
    this.resetTrail();
  }

  private resetTrail(): void {
    this.trail = [
      { x: this.follower.rx, y: this.follower.ry },
      { x: this.leader.rx, y: this.leader.ry },
    ];
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

  /** Can a character centred at (rx, ry), coming from tile (fromX, fromY), stand there? */
  private free(rx: number, ry: number, fromX: number, fromY: number): boolean {
    const h0 = this.world.height(fromX, fromY);
    for (const [ox, oy] of [
      [0, 0],
      [RADIUS, RADIUS],
      [RADIUS, -RADIUS],
      [-RADIUS, RADIUS],
      [-RADIUS, -RADIUS],
    ]) {
      const tx = Math.floor(rx + ox);
      const ty = Math.floor(ry + oy);
      if (this.blocked(tx, ty)) return false;
      if (Math.abs(this.world.height(tx, ty) - h0) > MAX_STEP) return false;
    }
    return true;
  }

  /** Move an actor by (dx, dy), sliding along walls. Returns the distance actually moved. */
  private moveBy(a: Actor, dx: number, dy: number): number {
    const ox = a.rx;
    const oy = a.ry;
    if (this.free(a.rx + dx, a.ry, a.x, a.y)) a.rx += dx;
    sync(a);
    if (this.free(a.rx, a.ry + dy, a.x, a.y)) a.ry += dy;
    sync(a);
    const moved = Math.hypot(a.rx - ox, a.ry - oy);
    if (moved > 0.0001) {
      const screenDx = a.rx - ox - (a.ry - oy);
      if (Math.abs(screenDx) > 0.0005) a.flip = screenDx < 0;
      a.walked += moved;
    }
    return moved;
  }

  private canMove(x: number, y: number, dx: number, dy: number): boolean {
    const nx = x + dx;
    const ny = y + dy;
    if (this.blocked(nx, ny) || !this.world.canStep(x, y, nx, ny)) return false;
    if (dx && dy) {
      if (this.blocked(x + dx, y) || !this.world.canStep(x, y, x + dx, y)) return false;
      if (this.blocked(x, y + dy) || !this.world.canStep(x, y, x, y + dy)) return false;
    }
    return true;
  }

  /** Shortest 8-directional tile path from the leader's tile, excluding the start. */
  findPath(tx: number, ty: number): Array<{ x: number; y: number }> {
    const sx = this.leader.x;
    const sy = this.leader.y;
    if (sx === tx && sy === ty) return [];
    const key = (x: number, y: number) => y * this.world.w + x;
    const prev = new Map<number, number>([[key(sx, sy), -1]]);
    const q: Array<[number, number]> = [[sx, sy]];
    let found = false;
    for (let head = 0; head < q.length && prev.size < 4000; head++) {
      const [x, y] = q[head];
      if (x === tx && y === ty) {
        found = true;
        break;
      }
      for (const [dx, dy] of STEPS) {
        const k = key(x + dx, y + dy);
        if (prev.has(k) || !this.canMove(x, y, dx, dy)) continue;
        prev.set(k, key(x, y));
        q.push([x + dx, y + dy]);
      }
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

  /** Someone or something close enough to talk to / examine. */
  target(): Target | null {
    const { rx, ry } = this.leader;
    let best: { t: Target; d: number } | null = null;
    for (const n of NPCS) {
      const d = Math.hypot(n.x + 0.5 - rx, n.y + 0.5 - ry);
      if (d <= TALK_RANGE && (!best || d < best.d)) best = { t: { kind: 'npc', npc: n }, d };
    }
    for (const g of GATE_TILES) {
      if (this.world.get(g.x, g.y) !== 'G') continue;
      const d = Math.hypot(g.x + 0.5 - rx, g.y + 0.5 - ry);
      if (d <= TALK_RANGE && (!best || d < best.d)) best = { t: { kind: 'gate' }, d };
    }
    return best?.t ?? null;
  }

  /** What is under the mouse: a person (by their body, not just their tile), the gate, or a tile. */
  private pick(clientX: number, clientY: number): { tile: { x: number; y: number }; target: Target | null } {
    const p = this.r.toLogical(clientX, clientY);
    const people = [...NPCS].sort((a, b) => b.x + b.y - (a.x + a.y));
    for (const n of people) {
      const c = tileCenter(n.x, n.y, this.world.height(n.x, n.y));
      if (p.x >= c.x - 8 && p.x <= c.x + 8 && p.y >= c.y - 16 && p.y <= c.y + 3) return { tile: { x: n.x, y: n.y }, target: { kind: 'npc', npc: n } };
    }
    const tile = this.r.screenToTile(clientX, clientY, this.world);
    const gate = GATE_TILES.some((g) => g.x === tile.x && g.y === tile.y) && this.world.get(tile.x, tile.y) === 'G';
    return { tile, target: gate ? { kind: 'gate' } : null };
  }

  /** Path to stand next to a target, or null if unreachable. */
  private pathNextTo(tx: number, ty: number): Array<{ x: number; y: number }> | null {
    let best: Array<{ x: number; y: number }> | null = null;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const p = { x: tx + dx, y: ty + dy };
      if (p.x === this.leader.x && p.y === this.leader.y) return [];
      if (this.blocked(p.x, p.y)) continue;
      const path = this.findPath(p.x, p.y);
      if (path.length && (!best || path.length < best.length)) best = path;
    }
    return best;
  }

  /** Screen-relative keyboard direction → world direction (unit vector), or null. */
  private keyDirection(): { x: number; y: number } | null {
    let sx = 0;
    let sy = 0;
    if (isHeld('w', 'ArrowUp')) sy -= 1;
    if (isHeld('s', 'ArrowDown')) sy += 1;
    if (isHeld('a', 'ArrowLeft')) sx -= 1;
    if (isHeld('d', 'ArrowRight')) sx += 1;
    if (!sx && !sy) return null;
    // invert the isometric projection: screen (16, 8) per tile
    const wx = (sx / 16 + sy / 8) / 2;
    const wy = (sy / 8 - sx / 16) / 2;
    const len = Math.hypot(wx, wy);
    return { x: wx / len, y: wy / len };
  }

  update(dt: number): void {
    // hover: refresh the preview path only when the hovered tile changes
    const mp = mousePos();
    if (mp) {
      const { tile, target } = this.pick(mp.x, mp.y);
      this.hover = tile;
      this.hoverTarget = target;
      const k = `${tile.x},${tile.y},${this.leader.x},${this.leader.y},${target ? 'T' : ''}`;
      if (k !== this.hoverKey) {
        this.hoverKey = k;
        if (target) this.hoverPath = (target.kind === 'npc' ? this.pathNextTo(target.npc.x, target.npc.y) : this.pathNextTo(GATE_TILES[0].x, GATE_TILES[0].y)) ?? [];
        else this.hoverPath = this.blocked(tile.x, tile.y) ? [] : this.findPath(tile.x, tile.y);
      }
    } else {
      this.hover = null;
      this.hoverTarget = null;
    }
    this.r.canvas.style.cursor = this.hoverTarget ? 'pointer' : 'default';

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
      if (c.button !== 0) continue;
      const { tile, target } = this.pick(c.x, c.y);
      if (target) {
        const pos = target.kind === 'npc' ? target.npc : GATE_TILES[0];
        const path = this.pathNextTo(pos.x, pos.y);
        if (path) {
          this.path = path;
          this.pendingInteract = target;
          this.dest = path.length ? path[path.length - 1] : null;
        }
      } else {
        this.path = this.findPath(tile.x, tile.y);
        this.pendingInteract = null;
        this.dest = this.path.length ? tile : null;
      }
    }

    const a = this.leader;
    let moved = 0;
    const dir = this.keyDirection();
    if (dir) {
      // keyboard takes over from any click route
      this.path = [];
      this.dest = null;
      this.pendingInteract = null;
      moved = this.moveBy(a, dir.x * SPEED * dt, dir.y * SPEED * dt);
      this.facing = [Math.sign(Math.round(dir.x)), Math.sign(Math.round(dir.y))];
    } else if (this.path.length) {
      // skip waypoints we can already walk straight past (string pulling)
      while (this.path.length > 1 && this.straight(a.rx, a.ry, this.path[1].x + 0.5, this.path[1].y + 0.5)) this.path.shift();
      const wp = this.path[0];
      const tx = wp.x + 0.5 - a.rx;
      const ty = wp.y + 0.5 - a.ry;
      const d = Math.hypot(tx, ty);
      const stepLen = Math.min(d, SPEED * dt);
      moved = d > 0 ? this.moveBy(a, (tx / d) * stepLen, (ty / d) * stepLen) : 0;
      if (d < 0.08 || (moved < 0.0005 && d < 0.6)) this.path.shift();
      else if (moved < 0.0005) {
        // stuck on a corner: give up the route
        this.path = [];
        this.dest = null;
      }
      if (Math.abs(tx) > 0.1 || Math.abs(ty) > 0.1) this.facing = [Math.sign(Math.round(tx)), Math.sign(Math.round(ty))];
    } else {
      this.dest = null;
      if (this.pendingInteract) {
        const tg = this.pendingInteract;
        this.pendingInteract = null;
        this.hooks.interact(tg);
        return;
      }
    }
    a.moving = moved > 0.0005;

    // follower walks along the leader's trail
    const last = this.trail[this.trail.length - 1];
    if (Math.hypot(a.rx - last.x, a.ry - last.y) > 0.08) this.trail.push({ x: a.rx, y: a.ry });
    if (this.trail.length > 200) this.trail.splice(0, this.trail.length - 200);
    this.updateFollower(dt);

    // smooth height for both
    for (const c of [a, this.follower]) {
      const zt = this.world.height(c.x, c.y);
      c.z += (zt - c.z) * Math.min(1, dt * 14);
    }

    this.checkEncounter();
  }

  /** Straight walk between two points with no obstacles or cliffs? */
  private straight(ax: number, ay: number, bx: number, by: number): boolean {
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 0.2);
    let fx = Math.floor(ax);
    let fy = Math.floor(ay);
    for (let i = 1; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n;
      const y = ay + ((by - ay) * i) / n;
      if (!this.free(x, y, fx, fy)) return false;
      fx = Math.floor(x);
      fy = Math.floor(y);
    }
    return true;
  }

  private updateFollower(dt: number): void {
    const f = this.follower;
    // walk back along the trail to find the point FOLLOW_GAP tiles behind the leader
    let need = FOLLOW_GAP;
    let goal = this.trail[0];
    for (let i = this.trail.length - 1; i > 0; i--) {
      const p = this.trail[i];
      const q = this.trail[i - 1];
      const seg = Math.hypot(p.x - q.x, p.y - q.y);
      if (seg >= need) {
        goal = { x: p.x + ((q.x - p.x) * need) / seg, y: p.y + ((q.y - p.y) * need) / seg };
        break;
      }
      need -= seg;
    }
    const dx = goal.x - f.rx;
    const dy = goal.y - f.ry;
    const d = Math.hypot(dx, dy);
    if (d < 0.02) {
      f.moving = false;
      return;
    }
    const step = Math.min(d, SPEED * 1.25 * dt);
    const before = f.walked;
    // the follower ignores collisions (it walks exactly where the leader walked)
    f.rx += (dx / d) * step;
    f.ry += (dy / d) * step;
    const screenDx = dx - dy;
    if (Math.abs(screenDx) > 0.01) f.flip = screenDx < 0;
    f.walked = before + step;
    f.moving = step > 0.001;
    sync(f);
    // trim trail points the follower has passed
    while (this.trail.length > 2 && Math.hypot(this.trail[0].x - f.rx, this.trail[0].y - f.ry) < 0.1) this.trail.shift();
  }

  private checkEncounter(): void {
    for (const e of ENCOUNTERS) {
      if (this.hooks.encounterActive(e) && inRect(e.trigger, this.leader.x, this.leader.y)) {
        this.path = [];
        this.dest = null;
        this.hooks.encounter(e);
        return;
      }
    }
  }

  actorZ(a: Actor): number {
    return a.z;
  }

  draw(): void {
    const r = this.r;
    const bobT = r.frame / 8;
    const pulse = 0.35 + 0.25 * Math.sin(r.frame / 7);

    // hover feedback and destination marker
    if (this.hoverTarget) {
      const pos = this.hoverTarget.kind === 'npc' ? this.hoverTarget.npc : GATE_TILES[0];
      r.addOverlay(pos.x, pos.y, 'rgba(255,205,117,0.25)', 'rgba(255,205,117,0.9)');
      if (this.hoverTarget.kind === 'npc') {
        const n = this.hoverTarget.npc;
        r.addLate(() => {
          const c = tileCenter(n.x, n.y, this.world.height(n.x, n.y));
          r.text(t(`chars.${n.id}`), c.x, c.y - 24, { size: 17, color: '#ffcd75', bold: true });
        });
      }
    } else if (this.hover && !this.blocked(this.hover.x, this.hover.y)) {
      r.addOverlay(this.hover.x, this.hover.y, 'rgba(255,255,255,0.12)', this.hoverPath.length ? 'rgba(255,255,255,0.85)' : 'rgba(239,125,87,0.8)');
    }
    if (!this.path.length) {
      for (const p of this.hoverPath.slice(0, -1)) {
        const z = this.world.height(p.x, p.y);
        r.addSprite(p.x, p.y, () => {
          const c = tileCenter(p.x, p.y, z);
          r.ctx.fillStyle = 'rgba(26,28,44,0.5)';
          r.ctx.fillRect(c.x - 2, c.y - 1, 4, 3);
          r.ctx.fillStyle = 'rgba(255,255,255,0.85)';
          r.ctx.fillRect(c.x - 1, c.y - 1, 2, 2);
        });
      }
    }
    if (this.dest) r.addOverlay(this.dest.x, this.dest.y, `rgba(115,239,247,${(pulse * 0.6).toFixed(2)})`, 'rgba(115,239,247,0.9)');

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
      const fx = a.rx - 0.5;
      const fy = a.ry - 0.5;
      // sort with the tile the feet are on, nudged forward when near its front edge
      const sx = Math.floor(a.rx + 0.15);
      const sy = Math.floor(a.ry + 0.15);
      const bob = a.moving && Math.sin(a.walked * Math.PI * 2.2) > 0 ? -1 : 0;
      r.addSprite(sx, sy, () => r.drawSpriteAt(a.sprite, fx, fy, a.z, { bob, flip: a.flip }));
      // see-through silhouette when behind a house or tree
      r.addLate(() => r.drawSpriteAt(a.sprite, fx, fy, a.z, { alpha: 0.28, flip: a.flip, shadow: false }));
    }
  }
}
