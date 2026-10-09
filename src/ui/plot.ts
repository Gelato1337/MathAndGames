import type { Plot } from '../math/linalg';

/** Colour slots shared with the formulas (dark-theme values). */
export const TERM_COLORS: Record<number, string> = {
  0: '#94b0c2',
  1: '#A992FF',
  2: '#52CC94',
  3: '#F27DB0',
  4: '#73A8FF',
  5: '#F0A24C',
  6: '#4FC8D8',
};

/**
 * A small coordinate plane: arrows for vectors, and the unit square with its
 * image under a matrix (the image's area is the determinant).
 */
export function plotCanvas(plot: Plot, size = 240): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = size * dpr;
  cv.height = size * dpr;
  cv.className = 'plot';
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);
  if (plot.tokens) return drawTokens(ctx, cv, plot.tokens, size);
  if (plot.dice) return drawDice(ctx, cv, plot.dice, size);
  if (plot.bars) return drawBars(ctx, cv, plot.bars, size);

  // fit everything that will be drawn
  const pts: number[][] = [[1, 1]];
  for (const v of plot.vectors) {
    const from = v.from ?? [0, 0];
    pts.push(from, [from[0] + v.v[0], from[1] + v.v[1]]);
  }
  if (plot.matrix) {
    const [[a, b], [c, d]] = plot.matrix;
    pts.push([a, c], [b, d], [a + b, c + d]);
  }
  const extent = Math.max(3, ...pts.flat().map((x) => Math.abs(x))) + 1;
  const s = size / 2 / extent;
  const X = (x: number) => size / 2 + x * s;
  const Y = (y: number) => size / 2 - y * s;

  ctx.fillStyle = '#121624';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(148,176,194,0.12)';
  ctx.lineWidth = 1;
  for (let i = -Math.floor(extent); i <= Math.floor(extent); i++) {
    ctx.beginPath();
    ctx.moveTo(X(i), 0);
    ctx.lineTo(X(i), size);
    ctx.moveTo(0, Y(i));
    ctx.lineTo(size, Y(i));
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(148,176,194,0.45)';
  ctx.beginPath();
  ctx.moveTo(X(0), 0);
  ctx.lineTo(X(0), size);
  ctx.moveTo(0, Y(0));
  ctx.lineTo(size, Y(0));
  ctx.stroke();

  if (plot.matrix) {
    const [[a, b], [c, d]] = plot.matrix;
    // unit square
    ctx.strokeStyle = 'rgba(244,244,244,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(X(0), Y(1), s, s);
    ctx.setLineDash([]);
    // its image: a parallelogram spanned by the columns
    const col = TERM_COLORS[plot.matrixK ?? 1];
    ctx.fillStyle = col + '33';
    ctx.strokeStyle = col;
    ctx.beginPath();
    ctx.moveTo(X(0), Y(0));
    ctx.lineTo(X(a), Y(c));
    ctx.lineTo(X(a + b), Y(c + d));
    ctx.lineTo(X(b), Y(d));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  for (const v of plot.vectors) {
    const [fx, fy] = v.from ?? [0, 0];
    const tx = fx + v.v[0];
    const ty = fy + v.v[1];
    const col = TERM_COLORS[v.k] ?? '#f4f4f4';
    ctx.strokeStyle = col;
    ctx.fillStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X(fx), Y(fy));
    ctx.lineTo(X(tx), Y(ty));
    ctx.stroke();
    const ang = Math.atan2(Y(ty) - Y(fy), X(tx) - X(fx));
    ctx.beginPath();
    ctx.moveTo(X(tx), Y(ty));
    ctx.lineTo(X(tx) - 9 * Math.cos(ang - 0.4), Y(ty) - 9 * Math.sin(ang - 0.4));
    ctx.lineTo(X(tx) - 9 * Math.cos(ang + 0.4), Y(ty) - 9 * Math.sin(ang + 0.4));
    ctx.closePath();
    ctx.fill();
    if (v.label) {
      ctx.font = "600 13px 'Pixelify Sans', monospace";
      ctx.fillText(v.label, X(tx) + 5, Y(ty) - 5);
    }
  }
  return cv;
}

const FONT = "600 13px 'Pixelify Sans', monospace";

function background(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = '#121624';
  ctx.fillRect(0, 0, size, size);
}

/** A pouch of coins: one circle per outcome, coloured by its formula colour. */
function drawTokens(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, groups: NonNullable<Plot['tokens']>, size: number): HTMLCanvasElement {
  background(ctx, size);
  const all = groups.flatMap((g) => new Array<number>(g.n).fill(g.k));
  const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(all.length))));
  const rows = Math.ceil(all.length / cols);
  const cell = Math.min(52, (size - 40) / Math.max(cols, rows));
  const x0 = (size - cols * cell) / 2;
  const y0 = (size - rows * cell) / 2;
  // the pouch
  ctx.strokeStyle = 'rgba(199,154,98,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x0 - 10, y0 - 10, cols * cell + 20, rows * cell + 20, 18);
  ctx.stroke();
  all.forEach((k, i) => {
    const cx = x0 + (i % cols) * cell + cell / 2;
    const cy = y0 + Math.floor(i / cols) * cell + cell / 2;
    const r = cell * 0.36;
    ctx.fillStyle = TERM_COLORS[k];
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  return cv;
}

/** The 6 × 6 table of two dice (or one row for a single die), with the favourable cells lit. */
function drawDice(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, d: NonNullable<Plot['dice']>, size: number): HTMLCanvasElement {
  background(ctx, size);
  const rows = d.single ? 1 : 6;
  const cell = (size - 40) / 6;
  const x0 = 30;
  const y0 = d.single ? size / 2 - cell / 2 : 30;
  const hit = new Set(d.hit.map(([a, b]) => `${a},${b}`));
  ctx.font = FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let a = 1; a <= 6; a++) {
    ctx.fillStyle = '#94b0c2';
    ctx.fillText(String(a), x0 + (a - 1) * cell + cell / 2, y0 - 12);
    for (let b = 1; b <= rows; b++) {
      if (!d.single && a === 1) {
        ctx.fillStyle = '#94b0c2';
        ctx.fillText(String(b), x0 - 14, y0 + (b - 1) * cell + cell / 2);
      }
      const on = hit.has(`${a},${b}`);
      ctx.fillStyle = on ? TERM_COLORS[d.k] : 'rgba(148,176,194,0.14)';
      ctx.fillRect(x0 + (a - 1) * cell + 2, y0 + (b - 1) * cell + 2, cell - 4, cell - 4);
      if (!d.single) {
        ctx.fillStyle = on ? '#121624' : 'rgba(244,244,244,0.35)';
        ctx.fillText(String(a + b), x0 + (a - 1) * cell + cell / 2, y0 + (b - 1) * cell + cell / 2);
      }
    }
  }
  ctx.textAlign = 'start';
  return cv;
}

/** A bar for each value of a small data set, in the order given. */
function drawBars(ctx: CanvasRenderingContext2D, cv: HTMLCanvasElement, b: NonNullable<Plot['bars']>, size: number): HTMLCanvasElement {
  background(ctx, size);
  const max = Math.max(1, ...b.values.map(Math.abs));
  const base = size - 34;
  const top = 24;
  const w = (size - 30) / b.values.length;
  ctx.strokeStyle = 'rgba(148,176,194,0.45)';
  ctx.beginPath();
  ctx.moveTo(14, base);
  ctx.lineTo(size - 10, base);
  ctx.stroke();
  ctx.font = FONT;
  ctx.textAlign = 'center';
  b.values.forEach((v, i) => {
    const hgt = (Math.abs(v) / max) * (base - top);
    const x = 18 + i * w;
    ctx.fillStyle = TERM_COLORS[b.k];
    ctx.fillRect(x + w * 0.15, v >= 0 ? base - hgt : base, w * 0.7, Math.max(2, hgt * (v >= 0 ? 1 : 0.3)));
    ctx.fillStyle = '#f4f4f4';
    ctx.fillText(String(v), x + w / 2, v >= 0 ? base - hgt - 6 : base + 14);
  });
  ctx.textAlign = 'start';
  return cv;
}
