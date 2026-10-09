import { fmtNum, t } from '../i18n';
import type { Cell, Seg } from '../math/linalg';
import type { Step } from '../math/problems';
import { h } from './dom';

/**
 * Colour-linked formulas: each idea has a colour slot (t1…t6). The same
 * colour is used in the formula, in the sentence below it and in the
 * picture. Hovering (or tapping) a coloured term highlights every term of
 * that colour and shows what it means.
 */

const num = (v: number | string) => (typeof v === 'number' ? fmtNum(v) : v);

function term(text: string, k: number): HTMLElement {
  // '@key' terms are words in the player's language
  return h(`span.term.t${k}`, { 'data-k': String(k), tabindex: '0', text: text.startsWith('@') ? t(text.slice(1)) : text });
}

function cellEl(c: Cell, k?: number): HTMLElement {
  if (typeof c === 'object') return term(num(c.t), c.k);
  return k ? term(num(c), k) : h('span', { text: num(c) });
}

/** A matrix's or vector's name, written small under its bracket. */
function nameEl(name: string, k: number): HTMLElement {
  const el = term(name, k);
  el.classList.add('mat-name');
  return el;
}

export function segEl(s: Seg): HTMLElement {
  if (typeof s === 'string') return h('span.op', { text: s });
  if ('t' in s) return term(s.t, s.k);
  if ('mat' in s) {
    const grid = h('span.mat', { style: `grid-template-columns:repeat(${s.mat[0].length},auto)` }, s.mat.flat().map((c) => cellEl(c, s.k || undefined)));
    return h('span.mat-wrap', {}, [h(`span.bracket${s.k ? `.b${s.k}` : ''}`, {}, [grid]), s.name ? nameEl(s.name, s.k || 1) : null]);
  }
  const grid = h('span.mat', { style: 'grid-template-columns:auto' }, s.vec.map((c) => cellEl(c, s.k || undefined)));
  return h('span.mat-wrap', {}, [h(`span.bracket${s.k ? `.b${s.k}` : ''}`, {}, [grid]), s.name ? nameEl(s.name, s.k || 1) : null]);
}

export function segsEl(segs: Seg[], cls = 'eq'): HTMLElement {
  return h(`div.${cls}`, {}, segs.map(segEl));
}

/** A translated sentence where {k|words} become colour-linked terms. */
export function colourText(step: Step): HTMLElement {
  const raw = t(step.key, step.params);
  const p = h('p.eq-text');
  let last = 0;
  for (const m of raw.matchAll(/\{(\d)\|([^}]+)\}/g)) {
    if (m.index! > last) p.append(raw.slice(last, m.index));
    p.append(term(m[2], Number(m[1])));
    last = m.index! + m[0].length;
  }
  p.append(raw.slice(last));
  return p;
}

/** Plain text of a {k|word} sentence (for the tutor). */
export function plainText(step: Step): string {
  return t(step.key, step.params).replace(/\{\d\|([^}]+)\}/g, '$1');
}

/**
 * Wire hover/tap highlighting inside `root`: hovering a colour shows its
 * meaning in `info`, using `gloss` (colour → explanation).
 */
export function linkTerms(root: HTMLElement, info: HTMLElement, gloss: Record<number, Step>, idle: string): void {
  let pinned: string | null = null;
  const show = (k: string | null) => {
    root.classList.toggle('eq-focus', !!k);
    root.querySelectorAll<HTMLElement>('.term').forEach((el) => el.classList.toggle('on', el.dataset.k === k));
    if (!k || !gloss[Number(k)]) {
      info.className = 'eq-info muted';
      info.textContent = idle;
      return;
    }
    const label = root.querySelector<HTMLElement>(`p.eq-text .term[data-k="${k}"]`)?.textContent ?? root.querySelector<HTMLElement>(`.term[data-k="${k}"]`)?.textContent ?? '';
    info.className = 'eq-info';
    info.replaceChildren(h(`b.t${k}`, { text: label }), ` — ${t(gloss[Number(k)].key, gloss[Number(k)].params)}`);
  };
  root.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.term');
    if (el) show(el.dataset.k ?? null);
  });
  root.addEventListener('mouseout', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.term');
    const to = (e.relatedTarget as HTMLElement | null)?.closest?.('.term');
    if (el && !to) show(pinned);
  });
  root.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.term');
    if (!el) return;
    pinned = pinned === el.dataset.k ? null : (el.dataset.k ?? null);
    show(pinned);
  });
  root.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('.term');
    if (el) show(el.dataset.k ?? null);
  });
  show(null);
}
