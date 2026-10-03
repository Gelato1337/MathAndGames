import { PALETTE as P, sprite } from './sprites';

export const TILE = 16;

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ctx = CanvasRenderingContext2D;

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function grass(ctx: Ctx, rnd: () => number): void {
  px(ctx, P.g, 0, 0, 16, 16);
  for (let i = 0; i < 10; i++) px(ctx, P.G, Math.floor(rnd() * 16), Math.floor(rnd() * 16));
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rnd() * 14);
    const y = Math.floor(rnd() * 14) + 1;
    px(ctx, P.l, x, y);
    px(ctx, P.l, x + 1, y - 1);
  }
}

function floor(ctx: Ctx, rnd: () => number): void {
  px(ctx, P.m, 0, 0, 16, 16);
  px(ctx, P.f, 0, 15, 16, 1);
  px(ctx, P.f, 15, 0, 1, 16);
  for (let i = 0; i < 4; i++) px(ctx, P.s, Math.floor(rnd() * 15), Math.floor(rnd() * 15));
  if (rnd() < 0.3) {
    const x = 3 + Math.floor(rnd() * 8);
    px(ctx, P.f, x, 5, 1, 3);
    px(ctx, P.f, x + 1, 8, 2, 1);
  }
}

const builders: Record<string, (ctx: Ctx, rnd: () => number, frame: number) => void> = {
  '.': grass,
  ',': (ctx, rnd) => {
    grass(ctx, rnd);
    const colors = [P.y, P.w, P.o, P.c];
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(rnd() * 12);
      const y = 2 + Math.floor(rnd() * 12);
      px(ctx, colors[Math.floor(rnd() * colors.length)], x, y);
      px(ctx, P.G, x, y + 1);
    }
  },
  '=': (ctx, rnd) => {
    px(ctx, P.e, 0, 0, 16, 16);
    for (let i = 0; i < 6; i++) px(ctx, P.u, Math.floor(rnd() * 16), Math.floor(rnd() * 16));
    for (let i = 0; i < 3; i++) px(ctx, P.y, Math.floor(rnd() * 16), Math.floor(rnd() * 16));
  },
  '~': (ctx, _rnd, frame) => {
    px(ctx, P.b, 0, 0, 16, 16);
    for (let row = 0; row < 3; row++) {
      const y = 3 + row * 5;
      const off = (frame + row * 3) % 8;
      px(ctx, P.c, (off + 1) % 16, y, 4, 1);
      px(ctx, P.c, (off + 9) % 16, y + 2, 3, 1);
    }
  },
  B: (ctx) => {
    px(ctx, P.u, 0, 0, 16, 16);
    for (let x = 0; x < 16; x += 4) px(ctx, P.U, x, 0, 1, 16);
    px(ctx, P.e, 0, 1, 16, 1);
    px(ctx, P.e, 0, 14, 16, 1);
    px(ctx, P.U, 0, 0, 16, 1);
    px(ctx, P.U, 0, 15, 16, 1);
  },
  T: (ctx, rnd) => {
    grass(ctx, rnd);
    ctx.drawImage(sprite('tree'), 0, 0);
  },
  o: (ctx, rnd) => {
    grass(ctx, rnd);
    ctx.drawImage(sprite('rock'), 0, 0);
  },
  O: (ctx, rnd) => {
    floor(ctx, rnd);
    ctx.drawImage(sprite('rock'), 0, 0);
  },
  R: (ctx) => {
    px(ctx, P.r, 0, 0, 16, 16);
    for (let y = 3; y < 16; y += 4) px(ctx, P.p, 0, y, 16, 1);
    for (let y = 0; y < 16; y += 4) {
      const off = (y / 4) % 2 === 0 ? 0 : 4;
      for (let x = off; x < 16; x += 8) px(ctx, P.p, x, y, 1, 3);
    }
    px(ctx, P.o, 0, 0, 16, 1);
  },
  H: (ctx) => {
    px(ctx, P.e, 0, 0, 16, 16);
    for (let y = 4; y < 16; y += 4) px(ctx, P.u, 0, y, 16, 1);
    px(ctx, P.U, 0, 0, 16, 1);
  },
  w: (ctx) => {
    builders.H(ctx, () => 0, 0);
    px(ctx, P.U, 3, 3, 10, 9);
    px(ctx, P.c, 4, 4, 8, 7);
    px(ctx, P.i, 5, 5, 2, 2);
    px(ctx, P.U, 7, 4, 2, 7);
    px(ctx, P.U, 4, 7, 8, 1);
  },
  D: (ctx) => {
    builders.H(ctx, () => 0, 0);
    px(ctx, P.k, 3, 2, 10, 14);
    px(ctx, P.U, 4, 3, 8, 13);
    px(ctx, P.u, 5, 4, 2, 11);
    px(ctx, P.u, 9, 4, 2, 11);
    px(ctx, P.y, 10, 9, 1, 1);
  },
  F: (ctx, rnd) => {
    grass(ctx, rnd);
    px(ctx, P.U, 0, 6, 16, 2);
    px(ctx, P.U, 0, 11, 16, 2);
    px(ctx, P.e, 0, 6, 16, 1);
    px(ctx, P.e, 0, 11, 16, 1);
    px(ctx, P.u, 2, 3, 3, 12);
    px(ctx, P.u, 11, 3, 3, 12);
    px(ctx, P.k, 2, 14, 3, 1);
    px(ctx, P.k, 11, 14, 3, 1);
  },
  s: (ctx, rnd) => {
    px(ctx, P.u, 0, 0, 16, 16);
    for (let y = 2; y < 16; y += 4) px(ctx, P.U, 0, y, 16, 1);
    for (let i = 0; i < 4; i++) px(ctx, P.e, Math.floor(rnd() * 16), Math.floor(rnd() * 16));
  },
  c: (ctx, rnd) => {
    builders.s(ctx, rnd, 0);
    ctx.drawImage(sprite('crop'), 0, 2);
  },
  '#': (ctx) => {
    px(ctx, P.f, 0, 0, 16, 16);
    for (let y = 0; y < 16; y += 5) {
      px(ctx, P.k, 0, y, 16, 1);
      const off = (y / 5) % 2 === 0 ? 0 : 5;
      for (let x = off; x < 16; x += 10) px(ctx, P.k, x, y, 1, 5);
    }
    px(ctx, P.m, 1, 1, 3, 1);
    px(ctx, P.m, 7, 6, 3, 1);
    px(ctx, P.m, 2, 11, 3, 1);
  },
  _: floor,
  dirt: (ctx, rnd) => {
    px(ctx, P.u, 0, 0, 16, 16);
    for (let y = 3; y < 16; y += 5) px(ctx, P.U, 0, y, 16, 1);
    for (let i = 0; i < 6; i++) px(ctx, P.e, Math.floor(rnd() * 16), Math.floor(rnd() * 16));
    px(ctx, P.G, 0, 0, 16, 1);
  },
  G: (ctx, _rnd, frame) => {
    builders['#'](ctx, () => 0, 0);
    px(ctx, P.k, 2, 1, 12, 15);
    px(ctx, P.n, 3, 2, 10, 14);
    const glow = frame % 8 < 4 ? P.i : P.c;
    px(ctx, glow, 7, 4, 2, 8);
    px(ctx, glow, 5, 6, 6, 1);
    px(ctx, glow, 5, 10, 6, 1);
  },
};

const tileCache = new Map<string, HTMLCanvasElement>();

/** Get a 16×16 canvas for tile `ch`, with a deterministic variant per position. */
export function tileCanvas(ch: string, x: number, y: number, frame: number): HTMLCanvasElement {
  const animated = ch === '~' || ch === 'G';
  const variant = ((x * 73856093) ^ (y * 19349663)) % 4;
  const key = `${ch}:${Math.abs(variant)}:${animated ? frame % 8 : 0}`;
  let cv = tileCache.get(key);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = TILE;
    cv.height = TILE;
    const ctx = cv.getContext('2d')!;
    const build = builders[ch] ?? grass;
    build(ctx, mulberry(Math.abs(variant) * 977 + ch.charCodeAt(0)), frame % 8);
    cv.dataset.key = key;
    tileCache.set(key, cv);
  }
  return cv;
}

export const TILE_CHARS = Object.keys(builders);
