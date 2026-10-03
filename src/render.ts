import { BASE_Z, ISO_H, ISO_W, isoFace, isoTop, LEVEL, project, tileCenter } from './art/iso';
import { sprite } from './art/sprites';
import { TILE } from './art/tiles';
import { tileLook, type WorldMap } from './world/map';

/** Logical width the default zoom was designed around. */
const BASE_VIEW_W = 352;
const ZOOMS = [0.8, 1, 1.2, 1.45, 1.75, 2.1];
const DEFAULT_ZOOM = 4;
/** Battles step back to at most this zoom so the arena fits. */
export const COMBAT_ZOOM = 3;

export interface Camera {
  x: number;
  y: number;
}

interface Overlay {
  fill: string;
  stroke?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  kind: 'pollen' | 'smoke';
  size: number;
}

const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/**
 * Isometric (2.5D) renderer. Each frame: queue sprites and tile overlays,
 * then `flush` paints the map back-to-front, one diagonal at a time, so blocks
 * and characters hide each other correctly. Lighting, shadows and ambient
 * effects are layered on top.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  cam: Camera = { x: 0, y: 0 };
  /** Player camera nudge (WASD / arrows), in logical px. */
  pan = { x: 0, y: 0 };
  frame = 0;
  zoomIndex = DEFAULT_ZOOM;
  private sprites = new Map<number, Array<() => void>>();
  private overlays = new Map<number, Overlay[]>();
  private late: Array<() => void> = [];
  private particles: Particle[] = [];
  private chimneys: Array<{ x: number; y: number; z: number }> = [];
  private lights: Array<{ x: number; y: number; r: number; color: string; flicker: number }> = [];
  private time = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    try {
      const z = Number(localStorage.getItem('numerola.zoom'));
      if (Number.isInteger(z) && z >= 0 && z < ZOOMS.length) this.zoomIndex = z;
    } catch {
      // storage unavailable
    }
  }

  /** Match the canvas to its on-screen size so pixels stay sharp at any window size. */
  resize(): void {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(640, Math.round((r.width || 1056) * dpr));
    const h = Math.round((w * 7) / 11);
    if (this.canvas.width !== w) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  get scale(): number {
    return (this.canvas.width / BASE_VIEW_W) * ZOOMS[this.zoomIndex];
  }
  get viewW(): number {
    return this.canvas.width / this.scale;
  }
  get viewH(): number {
    return this.canvas.height / this.scale;
  }
  /** Size multiplier for text so it keeps its look at any canvas size. */
  private get textScale(): number {
    return this.canvas.width / 1056;
  }

  zoom(delta: number): void {
    this.zoomIndex = Math.max(0, Math.min(ZOOMS.length - 1, this.zoomIndex + delta));
    try {
      localStorage.setItem('numerola.zoom', String(this.zoomIndex));
    } catch {
      // ignore
    }
  }

  setChimneys(list: Array<{ x: number; y: number; z: number }>): void {
    this.chimneys = list;
  }

  private key(x: number, y: number): number {
    return y * 1000 + x;
  }

  /** Centre the camera on a tile position (fractional tiles allowed), plus the player's pan. */
  follow(fx: number, fy: number, z: number, smooth = 1): void {
    const c = tileCenter(fx, fy, z);
    const tx = c.x - this.viewW / 2 + this.pan.x;
    const ty = c.y - this.viewH / 2 - 8 + this.pan.y;
    this.cam.x += (tx - this.cam.x) * smooth;
    this.cam.y += (ty - this.cam.y) * smooth;
  }

  begin(dt = 1 / 60): void {
    this.time += dt;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const sky = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    sky.addColorStop(0, '#1d3045');
    sky.addColorStop(1, '#0b111c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.sprites.clear();
    this.overlays.clear();
    this.late = [];
    this.lights = [];
    this.world();
  }

  /** A warm (or coloured) light pool at a logical screen position, drawn additively. */
  addLight(x: number, y: number, r: number, color = '255,170,80', flicker = 1): void {
    this.lights.push({ x, y, r, color, flicker });
  }

  world(): void {
    const s = this.scale;
    const cx = Math.round(this.cam.x * s) / s;
    const cy = Math.round(this.cam.y * s) / s;
    this.ctx.setTransform(s, 0, 0, s, -cx * s, -cy * s);
    this.ctx.imageSmoothingEnabled = false;
  }

  /** Queue a draw call that belongs to tile (x, y) in depth order. */
  addSprite(x: number, y: number, draw: () => void): void {
    const k = this.key(Math.round(x), Math.round(y));
    let list = this.sprites.get(k);
    if (!list) this.sprites.set(k, (list = []));
    list.push(draw);
  }

  /** Tint the top face of a tile (movement range, targets, hover…). */
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

  private edge(ax: number, ay: number, bx: number, by: number, color: string, width = 1): void {
    const ctx = this.ctx;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  private treeName(x: number, y: number): string {
    const h = hash(x, y);
    const forest = x >= 34;
    const kind = forest ? (h % 3 === 2 ? 'birch' : 'pine') : h % 3 === 2 ? 'birch' : 'broad';
    return `tree_${kind}_${(h >> 4) % 3}`;
  }

  private drawBlock(map: WorldMap, x: number, y: number, animFrame: number): void {
    const ctx = this.ctx;
    const ch = map.get(x, y);
    const look = tileLook(ch);
    const z = map.height(x, y);
    const H = (dx: number, dy: number) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx < 0 || ny < 0 || nx >= map.w || ny >= map.h ? z : map.height(nx, ny);
    };
    const hpx = Math.round((z - BASE_Z) * LEVEL);
    const west = project(x, y + 1, z);
    const south = project(x + 1, y + 1, z);
    const east = project(x + 1, y, z);
    const north = project(x, y, z);
    if (hpx > 0) {
      ctx.drawImage(isoFace(look.left, 'left', hpx, x, y), west.x, west.y);
      ctx.drawImage(isoFace(look.right, 'right', hpx, x, y), south.x, south.y - ISO_H / 2);
    }
    ctx.drawImage(isoTop(look.top, x, y, animFrame), north.x - ISO_W / 2, north.y);

    // --- lighting ---
    const water = ch === '~';
    if (water) {
      // foam where the water meets land, gently pulsing
      const a = 0.45 + 0.2 * Math.sin(this.time * 2 + x + y);
      const foam = `rgba(210,245,255,${a.toFixed(2)})`;
      if (map.get(x - 1, y) !== '~') this.edge(north.x, north.y + 0.5, west.x, west.y + 0.5, foam);
      if (map.get(x, y - 1) !== '~') this.edge(north.x, north.y + 0.5, east.x, east.y + 0.5, foam);
      if (map.get(x, y + 1) !== '~' && map.get(x, y + 1) !== 'B') this.edge(west.x, west.y, south.x, south.y, foam);
      if (map.get(x + 1, y) !== '~' && map.get(x + 1, y) !== 'B') this.edge(south.x, south.y, east.x, east.y, foam);
      // sparkles
      if (hash(x, y + Math.floor(this.time * 3)) % 23 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(north.x - 3 + (hash(x, y) % 6), north.y + 6, 2, 1);
      }
    } else {
      // ruins are dim and cool, so torchlight stands out
      if (look.top === '_' || ch === '#') {
        this.diamond(x, y, z);
        ctx.fillStyle = 'rgba(12,16,42,0.22)';
        ctx.fill();
      }
      // higher ground catches more light
      if (z > 0 && look.top !== '_') {
        this.diamond(x, y, z);
        ctx.fillStyle = `rgba(255,236,190,${Math.min(0.14, 0.045 * z).toFixed(3)})`;
        ctx.fill();
      }
      // contact shadows from taller neighbours behind (light from the upper left)
      const dl = H(-1, 0) - z;
      const dr = H(0, -1) - z;
      const dd = H(-1, -1) - z;
      if (dl > 0) {
        ctx.fillStyle = `rgba(8,12,30,${Math.min(0.42, 0.2 + 0.08 * dl).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(north.x, north.y);
        ctx.lineTo(west.x, west.y);
        ctx.lineTo(west.x + 8 + Math.min(dl, 2) * 3, west.y + 4 + Math.min(dl, 2) * 1.5);
        ctx.lineTo(north.x + 8 + Math.min(dl, 2) * 3, north.y + 4 + Math.min(dl, 2) * 1.5);
        ctx.closePath();
        ctx.fill();
      }
      if (dr > 0) {
        ctx.fillStyle = `rgba(8,12,30,${Math.min(0.3, 0.12 + 0.06 * dr).toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(north.x, north.y);
        ctx.lineTo(east.x, east.y);
        ctx.lineTo(east.x - 6, east.y + 3);
        ctx.lineTo(north.x - 6, north.y + 3);
        ctx.closePath();
        ctx.fill();
      }
      if (dd > 0 && dl <= 0 && dr <= 0) {
        ctx.fillStyle = 'rgba(8,12,30,0.18)';
        ctx.beginPath();
        ctx.moveTo(north.x, north.y);
        ctx.lineTo(north.x + 5, north.y + 2.5);
        ctx.lineTo(north.x, north.y + 5);
        ctx.lineTo(north.x - 5, north.y + 2.5);
        ctx.closePath();
        ctx.fill();
      }
      // rim light along edges that drop away
      if (H(0, 1) < z) this.edge(west.x, west.y - 0.5, south.x, south.y - 0.5, 'rgba(255,248,215,0.5)');
      if (H(1, 0) < z) this.edge(south.x, south.y - 0.5, east.x, east.y - 0.5, 'rgba(255,248,215,0.28)');
      if (H(-1, 0) < z) this.edge(north.x, north.y + 0.5, west.x, west.y + 0.5, 'rgba(255,250,225,0.35)');
      if (H(0, -1) < z) this.edge(north.x, north.y + 0.5, east.x, east.y + 0.5, 'rgba(255,250,225,0.22)');
    }

    for (const o of this.overlays.get(this.key(x, y)) ?? []) {
      this.diamond(x, y, z, 0.5);
      ctx.fillStyle = o.fill;
      ctx.fill();
      if (o.stroke) {
        ctx.strokeStyle = o.stroke;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }
    }

    if (look.object === 'brazier' || look.object === 'lantern') {
      this.drawFlame(look.object, tileCenter(x, y, z), x, y);
      return;
    }
    if (look.object) {
      const name = look.object === 'treeTall' ? this.treeName(x, y) : look.object;
      const img = sprite(name);
      const c = tileCenter(x, y, z);
      if (look.object !== 'crop') {
        ctx.fillStyle = 'rgba(8,12,30,0.3)';
        ctx.beginPath();
        ctx.ellipse(c.x + 1, c.y + 1, Math.min(13, img.width * 0.42), Math.min(6.5, img.width * 0.2), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const lift = look.object === 'crop' ? 6 : 2;
      // trees sway a pixel in the breeze
      const sway = look.object === 'treeTall' && Math.sin(this.time * 1.3 + x * 0.9 + y * 0.6) > 0.7 ? 1 : 0;
      ctx.drawImage(img, Math.round(c.x - img.width / 2) + sway, Math.round(c.y - img.height + lift));
    }
  }

  private drawFlame(kind: 'brazier' | 'lantern', c: { x: number; y: number }, x: number, y: number): void {
    const ctx = this.ctx;
    const img = sprite(kind);
    ctx.fillStyle = 'rgba(8,12,30,0.3)';
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(img, Math.round(c.x - img.width / 2), Math.round(c.y - img.height + 2));
    const top = c.y - img.height + (kind === 'brazier' ? 7 : 6);
    const f = Math.floor(this.time * 10 + x * 3 + y);
    if (kind === 'brazier') {
      // three tongues of fire
      const flames = ['#ffcd75', '#ef7d57', '#b13e53'];
      for (let i = 0; i < 3; i++) {
        const h = 3 + ((f + i * 2) % 3);
        ctx.fillStyle = flames[(f + i) % 3];
        ctx.fillRect(Math.round(c.x - 3 + i * 2), Math.round(top - h), 2, h);
      }
      ctx.fillStyle = '#fff6c8';
      ctx.fillRect(Math.round(c.x - 1), Math.round(top - 2), 2, 2);
      this.addLight(c.x, top - 2, 46, '255,160,70', 1);
    } else {
      ctx.fillStyle = f % 7 === 0 ? '#ffe9a8' : '#ffcd75';
      ctx.fillRect(Math.round(c.x - 1), Math.round(top), 2, 3);
      this.addLight(c.x, top + 1, 30, '255,200,110', 0.5);
    }
  }

  private drawLights(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const l of this.lights) {
      const fl = 1 + l.flicker * 0.08 * Math.sin(this.time * 9 + l.x * 0.3) + l.flicker * 0.05 * Math.sin(this.time * 23 + l.y);
      const r = l.r * fl;
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r);
      g.addColorStop(0, `rgba(${l.color},0.32)`);
      g.addColorStop(0.45, `rgba(${l.color},0.12)`);
      g.addColorStop(1, `rgba(${l.color},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(l.x - r, l.y - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  private updateParticles(dt: number): void {
    const v = { x: this.cam.x, y: this.cam.y, w: this.viewW, h: this.viewH };
    // drifting pollen / fireflies
    while (this.particles.filter((p) => p.kind === 'pollen').length < 34) {
      this.particles.push({
        x: v.x + Math.random() * v.w,
        y: v.y + Math.random() * v.h,
        vx: 3 + Math.random() * 4,
        vy: -1 - Math.random() * 2,
        life: 0,
        max: 4 + Math.random() * 5,
        kind: 'pollen',
        size: Math.random() < 0.2 ? 1.5 : 1,
      });
    }
    // chimney smoke
    for (const c of this.chimneys) {
      if (Math.random() < dt * 2.2) {
        const p = project(c.x + 0.5, c.y + 0.5, c.z);
        this.particles.push({ x: p.x + 2, y: p.y - 4, vx: 2 + Math.random() * 2, vy: -6 - Math.random() * 3, life: 0, max: 2.6, kind: 'smoke', size: 1.5 });
      }
    }
    for (const p of this.particles) {
      p.life += dt;
      p.x += (p.vx + (p.kind === 'pollen' ? Math.sin(this.time * 1.7 + p.max * 9) * 4 : 0)) * dt;
      p.y += p.vy * dt;
      if (p.kind === 'smoke') p.size += dt * 2.2;
    }
    this.particles = this.particles.filter(
      (p) => p.life < p.max && p.x > v.x - 40 && p.x < v.x + v.w + 40 && p.y > v.y - 60 && p.y < v.y + v.h + 40,
    );
  }

  private drawAmbient(): void {
    const ctx = this.ctx;
    // cloud shadows drifting across the land
    ctx.fillStyle = 'rgba(10,20,45,0.10)';
    for (let i = 0; i < 4; i++) {
      const cx = ((this.time * 9 + i * 340) % 1400) - 300 + Math.floor(this.cam.x / 1400) * 1400;
      const cy = ((i * 211) % 420) + 120;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70 + i * 12, 30 + i * 6, -0.45, 0, Math.PI * 2);
      ctx.ellipse(cx + 50, cy + 14, 50, 24, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const p of this.particles) {
      const fade = Math.min(1, p.life * 2, (p.max - p.life) * 1.5);
      if (p.kind === 'pollen') {
        const tw = 0.5 + 0.5 * Math.sin(this.time * 4 + p.max * 7);
        ctx.fillStyle = `rgba(255,240,170,${(fade * (0.35 + 0.5 * tw)).toFixed(2)})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      } else {
        ctx.fillStyle = `rgba(210,215,225,${(fade * 0.35).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private vignette(): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createRadialGradient(w / 2, h * 0.45, h * 0.35, w / 2, h / 2, h * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(6,8,20,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    this.world();
  }

  /** Paint the map and everything queued, back to front. */
  flush(map: WorldMap, dt = 1 / 60): void {
    this.updateParticles(dt);
    const animFrame = Math.floor(this.frame / 10);
    const margin = 56;
    for (let s = 0; s <= map.w + map.h - 2; s++) {
      for (let x = Math.max(0, s - map.h + 1); x <= Math.min(map.w - 1, s); x++) {
        const y = s - x;
        const c = project(x + 0.5, y + 0.5, 0);
        if (c.x < this.cam.x - margin || c.x > this.cam.x + this.viewW + margin) continue;
        if (c.y < this.cam.y - margin || c.y > this.cam.y + this.viewH + margin * 2) continue;
        this.drawBlock(map, x, y, animFrame);
        for (const draw of this.sprites.get(this.key(x, y)) ?? []) draw();
      }
    }
    this.drawLights();
    this.drawAmbient();
    this.vignette();
    for (const fn of this.late) fn();
  }

  /** Draw a sprite standing on tile position (fx, fy) at height z (feet at the tile centre). */
  drawSpriteAt(
    name: string,
    fx: number,
    fy: number,
    z: number,
    opts: { flash?: boolean; alpha?: number; bob?: number; flip?: boolean; size?: number; shadow?: boolean } = {},
  ): void {
    const img = sprite(name);
    const ctx = this.ctx;
    const size = opts.size ?? 1;
    const c = tileCenter(fx + (size - 1) / 2, fy + (size - 1) / 2, z);
    const x = Math.round(c.x - img.width / 2);
    const y = Math.round(c.y - img.height + 2 + (opts.bob ?? 0));
    ctx.save();
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
    if (opts.shadow !== false) {
      ctx.fillStyle = 'rgba(8,12,30,0.35)';
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, img.width * 0.34, img.width * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
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

  /** Crisp text at a screen-space (pre-camera) logical position. Sizes are in px at a 1056-wide canvas. */
  text(str: string, sx0: number, sy0: number, opts: { color?: string; size?: number; align?: CanvasTextAlign; outline?: string; bold?: boolean } = {}): void {
    const ctx = this.ctx;
    const s = this.scale;
    const ts = this.textScale;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = (sx0 - this.cam.x) * s;
    const sy = (sy0 - this.cam.y) * s;
    ctx.font = `${opts.bold ? '600 ' : ''}${Math.round((opts.size ?? 16) * ts)}px 'Pixelify Sans', monospace`;
    ctx.textAlign = opts.align ?? 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4 * ts;
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
      x: ((clientX - r.left) / r.width) * this.viewW + this.cam.x,
      y: ((clientY - r.top) / r.height) * this.viewH + this.cam.y,
    };
  }

  /** Mouse position → the front-most tile drawn under it (tops and sides count). */
  screenToTile(clientX: number, clientY: number, map: WorldMap): { x: number; y: number } {
    const p = this.toLogical(clientX, clientY);
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
      if (dy >= Math.abs(dx) / 2 && dy <= ISO_H - Math.abs(dx) / 2 + side) return c;
    }
    return { x: gx, y: gy };
  }
}

/** Convert legacy pixel positions (tile × 16) to tile units. */
export const toTiles = (px: number): number => px / TILE;
