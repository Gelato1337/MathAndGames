import { BASE_Z, ISO_H, ISO_W, isoFace, isoTop, LEVEL, project, tileCenter } from './art/iso';
import { sprite } from './art/sprites';
import { TILE } from './art/tiles';
import { tileLook, type WorldMap } from './world/map';

export const SCALE = 3;
export const VIEW_PX_W = 352;
export const VIEW_PX_H = 224;

export interface Camera {
  x: number;
  y: number;
}

interface Overlay {
  fill: string;
  stroke?: string;
}

interface QueuedSprite {
  draw: () => void;
}

/**
 * Isometric (2.5D) renderer. Each frame: queue sprites and tile overlays,
 * then `flush` paints the map back-to-front, one diagonal at a time, so blocks
 * and characters hide each other correctly.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  cam: Camera = { x: 0, y: 0 };
  frame = 0;
  private sprites = new Map<number, QueuedSprite[]>();
  private overlays = new Map<number, Overlay[]>();
  private late: Array<() => void> = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  private key(x: number, y: number): number {
    return y * 1000 + x;
  }

  /** Centre the camera on a tile position (fractional tiles allowed). */
  follow(fx: number, fy: number, z: number, smooth = 1): void {
    const c = tileCenter(fx, fy, z);
    const tx = c.x - VIEW_PX_W / 2;
    const ty = c.y - VIEW_PX_H / 2 - 8;
    this.cam.x += (tx - this.cam.x) * smooth;
    this.cam.y += (ty - this.cam.y) * smooth;
  }

  begin(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#10131f';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.sprites.clear();
    this.overlays.clear();
    this.late = [];
    this.world();
  }

  world(): void {
    const cx = Math.round(this.cam.x * SCALE) / SCALE;
    const cy = Math.round(this.cam.y * SCALE) / SCALE;
    this.ctx.setTransform(SCALE, 0, 0, SCALE, -cx * SCALE, -cy * SCALE);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Queue a draw call that belongs to tile (x, y) in depth order. */
  addSprite(x: number, y: number, draw: () => void): void {
    const k = this.key(Math.round(x), Math.round(y));
    let list = this.sprites.get(k);
    if (!list) this.sprites.set(k, (list = []));
    list.push({ draw });
  }

  /** Tint the top face of a tile (movement range, targets…). */
  addOverlay(x: number, y: number, fill: string, stroke?: string): void {
    const k = this.key(x, y);
    let list = this.overlays.get(k);
    if (!list) this.overlays.set(k, (list = []));
    list.push({ fill, stroke });
  }

  /** Draw after everything else (floating text, HP bars). */
  addLate(draw: () => void): void {
    this.late.push(draw);
  }

  private diamond(x: number, y: number, z: number, inset = 0): void {
    const ctx = this.ctx;
    const n = project(x, y, z);
    ctx.beginPath();
    ctx.moveTo(n.x, n.y + inset);
    ctx.lineTo(n.x + ISO_W / 2 - inset * 2, n.y + ISO_H / 2);
    ctx.lineTo(n.x, n.y + ISO_H - inset);
    ctx.lineTo(n.x - ISO_W / 2 + inset * 2, n.y + ISO_H / 2);
    ctx.closePath();
  }

  private drawBlock(map: WorldMap, x: number, y: number, animFrame: number): void {
    const ctx = this.ctx;
    const ch = map.get(x, y);
    const look = tileLook(ch);
    const z = map.height(x, y);
    const hpx = Math.round((z - BASE_Z) * LEVEL);
    const west = project(x, y + 1, z);
    const south = project(x + 1, y + 1, z);
    if (hpx > 0) {
      ctx.drawImage(isoFace(look.left, 'left', hpx, x, y), west.x, west.y);
      ctx.drawImage(isoFace(look.right, 'right', hpx, x, y), south.x, south.y - ISO_H / 2);
    }
    const n = project(x, y, z);
    ctx.drawImage(isoTop(look.top, x, y, animFrame), n.x - ISO_W / 2, n.y);
    for (const o of this.overlays.get(this.key(x, y)) ?? []) {
      this.diamond(x, y, z, 0.5);
      ctx.fillStyle = o.fill;
      ctx.fill();
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
    if (look.object) {
      const img = sprite(look.object);
      const c = tileCenter(x, y, z);
      const lift = look.object === 'crop' ? 6 : 1;
      ctx.drawImage(img, Math.round(c.x - img.width / 2), Math.round(c.y - img.height + lift));
    }
  }

  /** Paint the map and everything queued, back to front. */
  flush(map: WorldMap): void {
    const animFrame = Math.floor(this.frame / 10);
    const margin = 48;
    for (let s = 0; s <= map.w + map.h - 2; s++) {
      for (let x = Math.max(0, s - map.h + 1); x <= Math.min(map.w - 1, s); x++) {
        const y = s - x;
        const c = project(x + 0.5, y + 0.5, 0);
        if (c.x < this.cam.x - margin || c.x > this.cam.x + VIEW_PX_W + margin) continue;
        if (c.y < this.cam.y - margin || c.y > this.cam.y + VIEW_PX_H + margin * 2) continue;
        this.drawBlock(map, x, y, animFrame);
        for (const sp of this.sprites.get(this.key(x, y)) ?? []) sp.draw();
      }
    }
    for (const fn of this.late) fn();
  }

  /** Draw a sprite standing on tile position (fx, fy) at height z (feet at the tile centre). */
  drawSpriteAt(
    name: string,
    fx: number,
    fy: number,
    z: number,
    opts: { flash?: boolean; alpha?: number; bob?: number; flip?: boolean; size?: number } = {},
  ): void {
    const img = sprite(name);
    const ctx = this.ctx;
    const size = opts.size ?? 1;
    const c = tileCenter(fx + (size - 1) / 2, fy + (size - 1) / 2, z);
    const x = Math.round(c.x - img.width / 2);
    const y = Math.round(c.y - img.height + 2 + (opts.bob ?? 0));
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, img.width * 0.32, img.width * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    if (opts.flip) {
      ctx.translate(x + img.width, y);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
    } else {
      ctx.drawImage(img, x, y);
    }
    if (opts.flash) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, img.width, img.height);
    }
    ctx.restore();
  }

  /** Crisp text at a screen-space (pre-camera) logical position. */
  text(str: string, sx0: number, sy0: number, opts: { color?: string; size?: number; align?: CanvasTextAlign; outline?: string; bold?: boolean } = {}): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = (sx0 - this.cam.x) * SCALE;
    const sy = (sy0 - this.cam.y) * SCALE;
    ctx.font = `${opts.bold ? '600 ' : ''}${opts.size ?? 16}px 'Pixelify Sans', monospace`;
    ctx.textAlign = opts.align ?? 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = opts.outline ?? '#1a1c2c';
    ctx.strokeText(str, sx, sy);
    ctx.fillStyle = opts.color ?? '#f4f4f4';
    ctx.fillText(str, sx, sy);
    ctx.restore();
    this.world();
  }

  /** Mouse position → logical screen coordinates (camera included). */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * VIEW_PX_W + this.cam.x,
      y: ((clientY - r.top) / r.height) * VIEW_PX_H + this.cam.y,
    };
  }

  /** Mouse position → the front-most tile drawn under it (tops and sides count). */
  screenToTile(clientX: number, clientY: number, map: WorldMap): { x: number; y: number } {
    const p = this.toLogical(clientX, clientY);
    // rough guess at ground level, then test nearby tiles front to back
    const gx = Math.floor((p.x / (ISO_W / 2) + p.y / (ISO_H / 2)) / 2);
    const gy = Math.floor((p.y / (ISO_H / 2) - p.x / (ISO_W / 2)) / 2);
    const cands: Array<{ x: number; y: number }> = [];
    for (let dy = -2; dy <= 5; dy++) for (let dx = -2; dx <= 5; dx++) cands.push({ x: gx + dx, y: gy + dy });
    cands.sort((a, b) => b.x + b.y - (a.x + a.y));
    for (const c of cands) {
      if (c.x < 0 || c.y < 0 || c.x >= map.w || c.y >= map.h) continue;
      const z = map.height(c.x, c.y);
      const n = project(c.x, c.y, z);
      const dx = p.x - n.x;
      const dy = p.y - n.y;
      if (Math.abs(dx) > ISO_W / 2) continue;
      const side = (z - BASE_Z) * LEVEL;
      if (dy >= Math.abs(dx) / 2 && dy <= ISO_H - Math.abs(dx) / 2 + side) {
        // only the top face picks the tile itself; a side face picks it too (it is in front)
        return c;
      }
    }
    return { x: gx, y: gy };
  }
}

/** Convert legacy pixel positions (tile × 16) to tile units. */
export const toTiles = (px: number): number => px / TILE;
