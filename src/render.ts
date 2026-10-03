import { sprite } from './art/sprites';
import { TILE, tileCanvas } from './art/tiles';
import type { WorldMap } from './world/map';

export const SCALE = 3;
export const VIEW_W = 22;
export const VIEW_H = 14;
export const VIEW_PX_W = VIEW_W * TILE;
export const VIEW_PX_H = VIEW_H * TILE;

export interface Camera {
  x: number;
  y: number;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  cam: Camera = { x: 0, y: 0 };
  frame = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Centre camera on a pixel position, clamped to map bounds. */
  follow(px: number, py: number, world: WorldMap, smooth = 1): void {
    const tx = Math.max(0, Math.min(world.w * TILE - VIEW_PX_W, px - VIEW_PX_W / 2 + TILE / 2));
    const ty = Math.max(0, Math.min(world.h * TILE - VIEW_PX_H, py - VIEW_PX_H / 2 + TILE / 2));
    this.cam.x += (tx - this.cam.x) * smooth;
    this.cam.y += (ty - this.cam.y) * smooth;
  }

  begin(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.world();
  }

  /** Switch to world-space drawing (logical pixels). */
  world(): void {
    const cx = Math.round(this.cam.x * SCALE) / SCALE;
    const cy = Math.round(this.cam.y * SCALE) / SCALE;
    this.ctx.setTransform(SCALE, 0, 0, SCALE, -cx * SCALE, -cy * SCALE);
    this.ctx.imageSmoothingEnabled = false;
  }

  drawMap(map: WorldMap): void {
    const x0 = Math.max(0, Math.floor(this.cam.x / TILE));
    const y0 = Math.max(0, Math.floor(this.cam.y / TILE));
    const x1 = Math.min(map.w - 1, x0 + VIEW_W + 1);
    const y1 = Math.min(map.h - 1, y0 + VIEW_H + 1);
    const animFrame = Math.floor(this.frame / 10);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.ctx.drawImage(tileCanvas(map.get(x, y), x, y, animFrame), x * TILE, y * TILE);
      }
    }
  }

  drawSprite(name: string, px: number, py: number, opts: { flash?: boolean; alpha?: number; bob?: number; flip?: boolean } = {}): void {
    const img = sprite(name);
    const ctx = this.ctx;
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    const y = Math.round(py + (opts.bob ?? 0));
    const x = Math.round(px);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + img.width / 2, y + img.height - 1, img.width * 0.32, 2, 0, 0, Math.PI * 2);
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

  tileRect(x: number, y: number, w: number, h: number, fill: string, stroke?: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, w * TILE - 1, h * TILE - 1);
    }
  }

  /** Crisp text at a world pixel position (drawn at screen resolution). */
  text(str: string, px: number, py: number, opts: { color?: string; size?: number; align?: CanvasTextAlign; outline?: string; bold?: boolean } = {}): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = (px - this.cam.x) * SCALE;
    const sy = (py - this.cam.y) * SCALE;
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
  }

  /** Screen position (CSS px inside canvas element) → world tile. */
  screenToTile(clientX: number, clientY: number): { x: number; y: number } {
    const r = this.canvas.getBoundingClientRect();
    const lx = ((clientX - r.left) / r.width) * VIEW_PX_W + this.cam.x;
    const ly = ((clientY - r.top) / r.height) * VIEW_PX_H + this.cam.y;
    return { x: Math.floor(lx / TILE), y: Math.floor(ly / TILE) };
  }
}
