import { tileCanvas } from './tiles';

/** Isometric geometry: a tile is a 32 × 16 diamond, one height level is 8 px. */
export const ISO_W = 32;
export const ISO_H = 16;
export const LEVEL = 8;
/** Lowest level drawn; terrain blocks extend down to here. */
export const BASE_Z = -1;

/** Screen position of the north corner of tile (fx, fy) at height z. */
export function project(fx: number, fy: number, z: number): { x: number; y: number } {
  return { x: (fx - fy) * (ISO_W / 2), y: (fx + fy) * (ISO_H / 2) - z * LEVEL };
}

/** Screen position of the centre of the top face of tile (fx, fy). */
export function tileCenter(fx: number, fy: number, z: number): { x: number; y: number } {
  return project(fx + 0.5, fy + 0.5, z);
}

function pixels(src: HTMLCanvasElement): Uint8ClampedArray {
  return src.getContext('2d')!.getImageData(0, 0, 16, 16).data;
}

const topCache = new Map<string, HTMLCanvasElement>();

/** A 16 × 16 square tile re-sampled (nearest neighbour) onto a 32 × 16 diamond. */
export function isoTop(ch: string, x: number, y: number, frame: number): HTMLCanvasElement {
  const src = tileCanvas(ch, x, y, frame);
  let cv = topCache.get(src.dataset.key ?? '');
  if (cv) return cv;
  const data = pixels(src);
  cv = document.createElement('canvas');
  cv.width = ISO_W;
  cv.height = ISO_H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(ISO_W, ISO_H);
  for (let Y = 0; Y < ISO_H; Y++) {
    for (let X = 0; X < ISO_W; X++) {
      const dx = X + 0.5 - ISO_W / 2;
      const dy = Y + 0.5;
      const u = Math.floor((dx + 2 * dy) / 2);
      const v = Math.floor((2 * dy - dx) / 2);
      if (u < 0 || v < 0 || u > 15 || v > 15) continue;
      const si = (v * 16 + u) * 4;
      const di = (Y * ISO_W + X) * 4;
      img.data[di] = data[si];
      img.data[di + 1] = data[si + 1];
      img.data[di + 2] = data[si + 2];
      img.data[di + 3] = data[si + 3];
    }
  }
  ctx.putImageData(img, 0, 0);
  topCache.set(src.dataset.key ?? '', cv);
  return cv;
}

const faceCache = new Map<string, HTMLCanvasElement>();

/**
 * A side face of a block, `h` px tall. 'left' is the +y face (lower-left on
 * screen), 'right' the +x face (lower-right). The texture repeats every 16 px.
 */
export function isoFace(ch: string, side: 'left' | 'right', h: number, x: number, y: number): HTMLCanvasElement {
  const src = tileCanvas(ch, x, y, 0);
  const key = `${src.dataset.key}|${side}|${h}`;
  let cv = faceCache.get(key);
  if (cv) return cv;
  const data = pixels(src);
  cv = document.createElement('canvas');
  cv.width = 16;
  cv.height = h + 9;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(16, h + 9);
  const shade = side === 'left' ? 0.8 : 0.62;
  for (let px = 0; px < 16; px++) {
    const off = side === 'left' ? Math.floor(px / 2) : Math.floor((15 - px) / 2);
    for (let py = 0; py <= h; py++) {
      const v = Math.min(15, py % 16);
      const si = (v * 16 + px) * 4;
      const di = ((off + py) * 16 + px) * 4;
      // lit top edge, then darker toward the ground (ambient occlusion)
      const k = py === 0 ? shade + 0.2 : shade * (1 - 0.32 * Math.min(1, py / 24));
      img.data[di] = data[si] * k;
      img.data[di + 1] = data[si + 1] * k;
      img.data[di + 2] = data[si + 2] * k;
      img.data[di + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  faceCache.set(key, cv);
  return cv;
}
