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
