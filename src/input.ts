import { isBlocking } from './ui/dom';

const held = new Set<string>();
const pressed: string[] = [];
const clicks: Array<{ x: number; y: number; button: number }> = [];
let mouse: { x: number; y: number } | null = null;
let wheel = 0;

export function initInput(canvas: HTMLCanvasElement): void {
  window.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    if (isBlocking()) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!held.has(k)) pressed.push(k);
    held.add(k);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    held.delete(k);
  });
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('mousedown', (e) => {
    if (isBlocking()) return;
    clicks.push({ x: e.clientX, y: e.clientY, button: e.button });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('mousemove', (e) => {
    mouse = { x: e.clientX, y: e.clientY };
  });
  // listen on the whole game area so HUD panels don't swallow the wheel
  (canvas.parentElement ?? canvas).addEventListener(
    'wheel',
    (e) => {
      if (isBlocking()) return; // let modals scroll
      e.preventDefault();
      wheel += Math.sign(e.deltaY);
    },
    { passive: false },
  );
  canvas.addEventListener('mouseleave', () => {
    mouse = null;
  });
}

export function isHeld(...keys: string[]): boolean {
  if (isBlocking()) return false;
  return keys.some((k) => held.has(k));
}

/** Keys pressed since last call. */
export function takePressed(): string[] {
  const out = pressed.splice(0);
  return isBlocking() ? [] : out;
}

export function takeClicks(): Array<{ x: number; y: number; button: number }> {
  const out = clicks.splice(0);
  return isBlocking() ? [] : out;
}

/** Mouse-wheel notches since last call (positive = scrolled down / away). */
export function takeWheel(): number {
  const w = wheel;
  wheel = 0;
  return w;
}

export function mousePos(): { x: number; y: number } | null {
  return mouse;
}

export function clearInput(): void {
  held.clear();
  pressed.length = 0;
  clicks.length = 0;
}
