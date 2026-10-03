/**
 * Procedural pixel-art trees: round broadleaf, pine and birch. Drawn once per
 * variant into small canvases with a 4-tone shade toward a top-left light.
 */

type RGB = [number, number, number];

const hex = (s: string): RGB => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const LEAF = { outline: hex('#10261d'), dark: hex('#1d5636'), mid: hex('#2e8546'), light: hex('#55b750'), high: hex('#a7f070') };
const PINE = { outline: hex('#0b1f1a'), dark: hex('#143f35'), mid: hex('#1f6247'), light: hex('#358a55'), high: hex('#6cc06a') };
const BIRCH = { outline: hex('#183019'), dark: hex('#3c7d31'), mid: hex('#5fa43c'), light: hex('#8fcb4f'), high: hex('#d2ef7a') };
const BARK = { outline: hex('#1a1c2c'), dark: hex('#4a2c19'), mid: hex('#7a4a2a'), light: hex('#9c6a3a') };

function rng(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

class Pix {
  data: Uint8ClampedArray;
  mask: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
    this.mask = new Uint8Array(w * h);
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }
  canvas(): HTMLCanvasElement {
    const cv = document.createElement('canvas');
    cv.width = this.w;
    cv.height = this.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

function trunk(p: Pix, cx: number, top: number, bottom: number, width: number, birch = false): void {
  for (let y = top; y <= bottom; y++) {
    for (let x = cx - Math.floor(width / 2) - 1; x <= cx + Math.ceil(width / 2); x++) {
      const edge = x === cx - Math.floor(width / 2) - 1 || x === cx + Math.ceil(width / 2);
      if (birch) {
        const mark = (y * 7 + x * 3) % 9 === 0 || (y % 5 === 0 && x === cx);
        p.set(x, y, edge ? BARK.outline : mark ? hex('#2a2a2a') : x < cx ? hex('#f4f4ec') : hex('#c9c9bd'));
      } else {
        p.set(x, y, edge ? BARK.outline : x < cx ? BARK.light : x === cx ? BARK.mid : BARK.dark);
      }
    }
  }
  // roots
  p.set(cx - Math.floor(width / 2) - 2, bottom, BARK.outline);
  p.set(cx + Math.ceil(width / 2) + 1, bottom, BARK.outline);
}

type Pal = typeof LEAF;

/** Fill a canopy mask from blobs, shade each pixel by distance to a light point, then outline. */
function canopy(p: Pix, blobs: Array<{ x: number; y: number; r: number }>, pal: Pal, rnd: () => number, holes = 0): void {
  const shade = new Float32Array(p.w * p.h).fill(9);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      for (const b of blobs) {
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y);
        if (d > b.r) continue;
        if (holes && d > b.r - 1.2 && rnd() < holes) continue;
        p.mask[y * p.w + x] = 1;
        // light comes from the upper left
        const l = Math.hypot(x + 0.5 - (b.x - b.r * 0.35), y + 0.5 - (b.y - b.r * 0.4)) / b.r;
        shade[y * p.w + x] = Math.min(shade[y * p.w + x], l);
      }
    }
  }
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const i = y * p.w + x;
      if (!p.mask[i]) continue;
      const out = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx < 0 || ny < 0 || nx >= p.w || ny >= p.h || !p.mask[ny * p.w + nx];
      });
      const s = shade[i] + (rnd() - 0.5) * 0.18 + ((x + y) % 2) * 0.04;
      p.set(x, y, out ? pal.outline : s < 0.35 ? pal.high : s < 0.7 ? pal.light : s < 1.05 ? pal.mid : pal.dark);
    }
  }
}

export function broadleaf(seed: number): HTMLCanvasElement {
  const rnd = rng(seed);
  const p = new Pix(28, 36);
  trunk(p, 14, 20, 35, 4);
  const blobs = [{ x: 14, y: 13, r: 9 }];
  for (let i = 0; i < 4; i++) blobs.push({ x: 8 + rnd() * 12, y: 8 + rnd() * 12, r: 5 + rnd() * 3 });
  canopy(p, blobs, LEAF, rnd);
  return p.canvas();
}

export function birch(seed: number): HTMLCanvasElement {
  const rnd = rng(seed + 77);
  const p = new Pix(22, 38);
  trunk(p, 11, 14, 37, 2, true);
  const blobs = [];
  for (let i = 0; i < 6; i++) blobs.push({ x: 6 + rnd() * 10, y: 6 + rnd() * 14, r: 3.5 + rnd() * 2.5 });
  canopy(p, blobs, BIRCH, rnd, 0.35);
  return p.canvas();
}

export function pine(seed: number): HTMLCanvasElement {
  const rnd = rng(seed + 13);
  const W = 22;
  const H = 40;
  const p = new Pix(W, H);
  trunk(p, 11, 30, 39, 2);
  const cx = 11;
  const tiers = [
    { top: 1, bottom: 12, half: 5 },
    { top: 7, bottom: 20, half: 7.5 },
    { top: 14, bottom: 28, half: 9.5 },
    { top: 21, bottom: 33, half: 10.5 },
  ];
  const shade = new Float32Array(W * H).fill(9);
  for (const t of tiers) {
    for (let y = t.top; y <= t.bottom; y++) {
      const k = (y - t.top) / (t.bottom - t.top);
      const half = t.half * k + 0.6 + (rnd() < 0.3 ? 1 : 0) * (k > 0.5 ? 1 : 0);
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        if (x < 0 || x >= W || Math.abs(x + 0.5 - cx) > half) continue;
        p.mask[y * W + x] = 1;
        const side = (x + 0.5 - cx) / (half + 0.01); // −1 left … 1 right
        const s = 0.55 + side * 0.45 + k * 0.35;
        shade[y * W + x] = Math.min(shade[y * W + x], s);
      }
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!p.mask[i]) continue;
      const below = y + 1 >= H || !p.mask[(y + 1) * W + x];
      const out = below || x === 0 || x === W - 1 || !p.mask[i - 1] || !p.mask[i + 1] || y === 0 || !p.mask[i - W];
      const s = shade[i] + (rnd() - 0.5) * 0.15;
      p.set(x, y, out ? PINE.outline : s < 0.35 ? PINE.high : s < 0.62 ? PINE.light : s < 0.95 ? PINE.mid : PINE.dark);
    }
  }
  return p.canvas();
}

export const TREE_VARIANTS = 3;
