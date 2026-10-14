import { t } from '../i18n';
import { clean, cosD, exactText, sinD, tanD } from '../math/trig';
import { h } from './dom';
import { TERM_COLORS } from './plot';

/**
 * The Trig Lens: an interactive unit circle. Drag the beam (or drag along
 * the wave) and watch the triangle, the sine wave and the tangent change
 * together. Colours: 1 opposite/sin, 2 adjacent/cos, 3 radius/hypotenuse,
 * 4 tan, 5 the angle.
 *
 * Ideas borrowed from classic interactive diagrams: the unit circle that
 * "unwraps" into the sine wave (GeoGebra, Jason Davies' animated trig), and
 * BetterExplained's "wall" picture where tan is how high the beam hits a
 * wall one radius away.
 */
export interface LensOpts {
  angle: number;
  /** dragging allowed */
  interactive?: boolean;
  /** show sin/cos/tan as numbers */
  readout?: boolean;
  /** start with these layers on */
  layers?: Partial<Record<Layer, boolean>>;
  /** highlight the arc (radians = arc length in radii) */
  arc?: boolean;
  /** a problem's triangle: the radius stands for this many units */
  scale?: number;
  given?: 'hyp' | 'adj';
  /** canvas width in CSS pixels (height follows) */
  width?: number;
  onChange?: (angle: number) => void;
}

export type Layer = 'triangle' | 'wave' | 'cos' | 'wall';

export interface Lens {
  el: HTMLElement;
  get angle(): number;
  set(angle: number): void;
  destroy(): void;
}

const C = TERM_COLORS;
const SNAP = 15;

export function trigLens(opts: LensOpts): Lens {
  const width = opts.width ?? 340;
  const height = Math.round(width * 0.6);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cv = h('canvas.lens', { tabindex: opts.interactive ? '0' : '-1', 'aria-label': t('lens.aria') }) as HTMLCanvasElement;
  cv.width = width * dpr;
  cv.height = height * dpr;
  const ctx = cv.getContext('2d')!;
  ctx.scale(dpr, dpr);

  const layers: Record<Layer, boolean> = { triangle: true, wave: true, cos: false, wall: false, ...opts.layers };
  let angle = norm(opts.angle);
  let playing = false;
  let raf = 0;
  const start = angle;

  // geometry: the circle on the left, the unrolled wave on the right, same vertical scale
  const R = height * 0.36;
  const cx = R + 34;
  const cy = height / 2;
  const wx0 = cx + R + 34;
  const wx1 = width - 10;
  const X = (d: number) => wx0 + ((wx1 - wx0) * d) / 360;

  const readout = h('div.lens-readout');
  const buttons: HTMLElement[] = [];
  const toggle = (layer: Layer, label: string) => {
    const b = h(`button.small${layers[layer] ? '.on' : ''}`, {
      text: label,
      onclick: () => {
        layers[layer] = !layers[layer];
        b.classList.toggle('on', layers[layer]);
        draw();
      },
    });
    buttons.push(b);
  };
  toggle('triangle', t('lens.triangle'));
  toggle('wave', t('lens.wave'));
  toggle('cos', t('lens.cosWave'));
  toggle('wall', t('lens.wall'));
  if (opts.interactive) {
    const play = h('button.small', {
      text: '▶',
      'aria-label': t('lens.play'),
      onclick: () => {
        playing = !playing;
        play.textContent = playing ? '❚❚' : '▶';
        if (playing) {
          let last = performance.now();
          const step = (now: number) => {
            if (!playing) return;
            set(angle + ((now - last) / 1000) * 45, false);
            last = now;
            raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
        }
      },
    });
    buttons.push(play);
    buttons.push(h('button.small', { text: t('lens.reset'), onclick: () => set(start, false) }));
  }
  const controls = h('div.lens-controls', {}, buttons);
  const help = opts.interactive ? h('div.muted.lens-help', { text: t('lens.help') }) : null;
  const el = h('div.lens-wrap', {}, [cv, readout, controls, help]);

  function norm(d: number): number {
    return ((d % 360) + 360) % 360;
  }

  function set(d: number, snap = true): void {
    let a = norm(d);
    if (snap) {
      const s = Math.round(a / SNAP) * SNAP;
      if (Math.abs(s - a) < 2.5) a = norm(s);
    }
    angle = a;
    draw();
    opts.onChange?.(angle);
  }

  // ---------- input ----------
  const fromPointer = (e: PointerEvent) => {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * width;
    const y = ((e.clientY - r.top) / r.height) * height;
    if (x > wx0 - 6) set(((x - wx0) / (wx1 - wx0)) * 360);
    else set((Math.atan2(cy - y, x - cx) * 180) / Math.PI);
  };
  if (opts.interactive) {
    let dragging = false;
    cv.addEventListener('pointerdown', (e) => {
      dragging = true;
      playing = false;
      cv.setPointerCapture(e.pointerId);
      fromPointer(e);
    });
    cv.addEventListener('pointermove', (e) => {
      if (dragging) fromPointer(e);
    });
    cv.addEventListener('pointerup', () => (dragging = false));
    cv.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(angle + (e.shiftKey ? 15 : 1), false);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(angle - (e.shiftKey ? 15 : 1), false);
      else return;
      e.preventDefault();
      e.stopPropagation();
    });
  }

  // ---------- drawing ----------
  function line(x0: number, y0: number, x1: number, y1: number, color: string, w = 2, dash: number[] = []): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function label(text: string, x: number, y: number, color: string, align: CanvasTextAlign = 'center'): void {
    ctx.font = "600 12px 'Pixelify Sans', monospace";
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(18,22,36,0.85)';
    const w = ctx.measureText(text).width;
    const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    ctx.fillRect(x0 - 2, y - 7, w + 4, 14);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function draw(): void {
    const s = clean(sinD(angle));
    const c = clean(cosD(angle));
    const px = cx + R * c;
    const py = cy - R * s;
    ctx.fillStyle = '#121624';
    ctx.fillRect(0, 0, width, height);

    // quadrant tint where sin and cos are positive/negative
    ctx.fillStyle = 'rgba(115,168,255,0.05)';
    const q = Math.floor(angle / 90) % 4;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R + 10, -(q + 1) * (Math.PI / 2), -q * (Math.PI / 2));
    ctx.closePath();
    ctx.fill();

    // axes and the circle
    line(cx - R - 12, cy, cx + R + 12, cy, 'rgba(148,176,194,0.45)', 1);
    line(cx, cy - R - 12, cx, cy + R + 12, 'rgba(148,176,194,0.45)', 1);
    ctx.strokeStyle = 'rgba(244,244,244,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "11px 'Pixelify Sans', monospace";
    ctx.fillStyle = 'rgba(148,176,194,0.6)';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('0°', cx + R + 3, cy - 8);
    ctx.textAlign = 'right';
    ctx.fillText('180°', cx - R - 3, cy - 8);
    ctx.textAlign = 'center';
    ctx.fillText('90°', cx, cy - R - 8);
    ctx.fillText('270°', cx, cy + R + 9);

    // the arc: radians are arc length measured in radii
    if (opts.arc) {
      ctx.strokeStyle = C[3];
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, -((angle * Math.PI) / 180), true);
      ctx.stroke();
    }
    // the angle
    ctx.strokeStyle = C[5];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, -((angle * Math.PI) / 180), true);
    ctx.stroke();

    // the tangent wall: x = 1, the beam extended until it hits it
    if (layers.wall && Math.abs(c) > 0.05) {
      const tn = clean(tanD(angle));
      const wy = cy - R * tn;
      const clipY = Math.max(-20, Math.min(height + 20, wy));
      line(cx + R, 0, cx + R, height, 'rgba(115,168,255,0.35)', 1, [3, 3]);
      line(cx, cy, cx + R, clipY, 'rgba(242,125,176,0.45)', 1, [4, 3]);
      line(cx + R, cy, cx + R, clipY, C[4], 3);
      if (Math.abs(tn) < 3) label(`tan ${fmt(tn)}`, cx + R + 4, wy, C[4], 'left');
    }

    // the triangle: opposite (sin) and adjacent (cos)
    if (layers.triangle) {
      line(cx, cy, px, cy, C[2], 3);
      line(px, cy, px, py, C[1], 3);
      if (Math.abs(s) > 0.08 && Math.abs(c) > 0.08) {
        const dx = px > cx ? -7 : 7;
        const dy = py < cy ? -7 : 7;
        ctx.strokeStyle = 'rgba(244,244,244,0.6)';
        ctx.lineWidth = 1;
        ctx.strokeRect(Math.min(px, px + dx), Math.min(cy, cy + dy), 7, 7);
      }
      if (opts.scale !== undefined) {
        const given = opts.given ?? 'hyp';
        label(given === 'hyp' ? `${opts.scale}` : '?', (cx + px) / 2 - 8 * s, (cy + py) / 2 - 8 * c, C[3]);
        label(given === 'adj' ? `${opts.scale}` : '?', (cx + px) / 2, cy + (s >= 0 ? 10 : -10), C[2]);
        label('?', px + (c >= 0 ? 10 : -10), (cy + py) / 2, C[1]);
      } else if (opts.readout !== false) {
        if (Math.abs(s) > 0.15) label('sin', px + (c >= 0 ? 14 : -14), (cy + py) / 2, C[1]);
        if (Math.abs(c) > 0.15) label('cos', (cx + px) / 2, cy + (s >= 0 ? 10 : -10), C[2]);
      }
    }
    // the beam (radius 1) and its tip
    line(cx, cy, px, py, C[3], 3);
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C[3];
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    // the unrolled wave: same height scale as the circle
    if (layers.wave || layers.cos) {
      line(wx0, cy, wx1, cy, 'rgba(148,176,194,0.45)', 1);
      line(wx0, cy - R - 6, wx0, cy + R + 6, 'rgba(148,176,194,0.45)', 1);
      ctx.fillStyle = 'rgba(148,176,194,0.6)';
      ctx.font = "10px 'Pixelify Sans', monospace";
      ctx.textAlign = 'center';
      for (const d of [90, 180, 270, 360]) ctx.fillText(`${d}°`, X(d), cy + R + 14);
      const curve = (f: (d: number) => number, color: string, dash: number[] = []) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash(dash);
        ctx.beginPath();
        for (let d = 0; d <= 360; d += 3) {
          const y = cy - R * f(d);
          if (d === 0) ctx.moveTo(X(d), y);
          else ctx.lineTo(X(d), y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };
      if (layers.cos) curve(cosD, C[2] + 'aa', [5, 4]);
      if (layers.wave) {
        curve(sinD, C[1] + '88');
        // the part already "unrolled"
        ctx.strokeStyle = C[1];
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let d = 0; d <= angle; d += 2) {
          const y = cy - R * sinD(d);
          if (d === 0) ctx.moveTo(X(d), y);
          else ctx.lineTo(X(d), y);
        }
        ctx.lineTo(X(angle), py);
        ctx.stroke();
        line(px, py, X(angle), py, 'rgba(169,146,255,0.6)', 1, [3, 3]);
        line(X(angle), cy, X(angle), py, C[1], 2);
        ctx.fillStyle = C[1];
        ctx.beginPath();
        ctx.arc(X(angle), py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      if (layers.cos) {
        const yc = cy - R * c;
        ctx.fillStyle = C[2];
        ctx.beginPath();
        ctx.arc(X(angle), yc, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    renderReadout(s, c);
  }

  function renderReadout(s: number, c: number): void {
    const special = angle % 15 === 0 && (angle % 30 === 0 || angle % 45 === 0);
    const exact = (fn: 'sin' | 'cos' | 'tan') => (special ? ` = ${exactText(fn, angle)}` : '');
    const radText = special ? radFrac(angle) : `${fmt((angle * Math.PI) / 180)}`;
    const cells: HTMLElement[] = [h('span.t5', { text: `θ = ${Math.round(angle)}° (${radText} rad)` })];
    if (opts.readout !== false) {
      cells.push(h('span.t1', { text: `sin θ = ${fmt(s)}${exact('sin')}` }), h('span.t2', { text: `cos θ = ${fmt(c)}${exact('cos')}` }));
      cells.push(h('span.t4', { text: Math.abs(c) < 1e-9 ? 'tan θ = —' : `tan θ = ${fmt(clean(tanD(angle)))}${exact('tan')}` }));
      cells.push(h('span.muted', { text: t('lens.signs', { s: s > 0 ? '+' : s < 0 ? '−' : '0', c: c > 0 ? '+' : c < 0 ? '−' : '0' }) }));
    }
    readout.replaceChildren(...cells);
  }

  draw();
  return {
    el,
    get angle() {
      return angle;
    },
    set: (d) => set(d, false),
    destroy: () => {
      playing = false;
      cancelAnimationFrame(raf);
    },
  };
}

function fmt(x: number): string {
  const v = Math.round(x * 1000) / 1000;
  return (Object.is(v, -0) ? 0 : v).toFixed(3).replace('-', '−');
}

/** 150° → "5π/6". */
function radFrac(d: number): string {
  if (d === 0) return '0';
  const g = gcdInt(d, 180);
  const n = d / g;
  const m = 180 / g;
  return `${n === 1 ? '' : n}π${m === 1 ? '' : `/${m}`}`;
}

function gcdInt(a: number, b: number): number {
  return b === 0 ? a : gcdInt(b, a % b);
}
