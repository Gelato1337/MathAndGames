import { PARTY_SKILLS, SKILLS } from '../data';
import { t } from '../i18n';
import type { Seg } from '../math/linalg';
import type { Topic } from '../math/problems';
import { game } from '../state';
import { h } from './dom';
import { colourText, linkTerms, segsEl } from './eq';

/**
 * The notebook: the player's own scratch notes (kept for the whole campaign)
 * and a formula sheet for everything they have learned so far.
 */

const T = (t: string, k: number): Seg => ({ t, k });

/** Formula sheet entries per topic: a colour-coded formula and a sentence. */
const FORMULAS: Partial<Record<Topic, Seg[]>> = {
  add_sub: [T('a', 1), '+', T('b', 2), '=', T('b', 2), '+', T('a', 1)],
  mul: [T('a', 1), '×', T('b', 2), '=', T('b', 2), '+', T('b', 2), '+ … +', T('b', 2)],
  area: [T('A', 3), '=', T('w', 1), '×', T('h', 2)],
  missing: ['□ +', T('a', 1), '=', T('c', 2), '→ □ =', T('c', 2), '−', T('a', 1)],
  order_ops: ['( )', '→', '× ÷', '→', '+ −'],
  eq2: [T('a', 1), 'x +', T('b', 2), '=', T('c', 3), '→ x = (', T('c', 3), '−', T('b', 2), ') ÷', T('a', 1)],
  vec_add: [T('u', 1), '+', T('v', 2), '= (', T('u₁', 1), '+', T('v₁', 2), ',', T('u₂', 1), '+', T('v₂', 2), ')'],
  vec_scale: [T('c', 1), T('v', 2), '= (', T('c', 1), T('v₁', 2), ',', T('c', 1), T('v₂', 2), ')'],
  dot: [T('u', 1), '·', T('v', 2), '=', T('u₁', 1), T('v₁', 2), '+', T('u₂', 1), T('v₂', 2)],
  perp: [T('u', 1), '⊥', T('v', 2), '⇔', T('u', 1), '·', T('v', 2), '= 0'],
  mat_vec: [T('A', 1), T('v', 2), '= (', T('row₁', 1), '·', T('v', 2), ',', T('row₂', 1), '·', T('v', 2), ')'],
  mat_mul: [T('c', 3), T('ᵢⱼ', 3), '=', T('rowᵢ(A)', 1), '·', T('colⱼ(B)', 2)],
  det2: ['det', T('A', 0), '=', T('ad', 1), '−', T('bc', 2)],
  eigen_val: [T('λ', 3), '² −', T('tr A', 4), T('λ', 3), '+', T('det A', 5), '= 0'],
  eigen_vec: ['(', T('A', 1), '−', T('λ', 3), T('I', 4), ')', T('v', 2), '= 0'],
};

/** Topics the player has met in this campaign (through learned skills). */
export function knownTopics(): Topic[] {
  const out = new Set<Topic>();
  for (const list of Object.values(PARTY_SKILLS[game.campaign])) {
    for (const id of list!) {
      if (!game.learned.has(id)) continue;
      const d = SKILLS[id];
      if (d.trial?.kind === 'problems') out.add(d.trial.topic);
      if (d.focus) out.add(d.focus.topic);
      if (d.trial?.kind === 'unbind') out.add(game.campaign === 'eigenvale' ? 'eigen_val' : 'eq2');
      if (d.trial?.kind === 'probe') out.add(game.campaign === 'eigenvale' ? 'det2' : 'order_ops');
    }
  }
  if (game.campaign === 'eigenvale' && out.has('eigen_val')) out.add('eigen_vec');
  return [...out].filter((tp) => FORMULAS[tp]);
}

function formulaSheet(): HTMLElement {
  const topics = knownTopics();
  if (!topics.length) return h('p.muted', { text: t('notebook.noFormulas') });
  return h(
    'div.formula-list',
    {},
    topics.map((tp) => {
      const card = h('div.formula', {}, [h('div.formula-name', { text: t(`notebook.f.${tp}`) }), segsEl(FORMULAS[tp]!, 'eq small'), colourText({ key: `notebook.d.${tp}` })]);
      const info = h('div.eq-info');
      card.append(info);
      linkTerms(card, info, {}, '');
      info.remove();
      return card;
    }),
  );
}

/**
 * Notebook panel: tabs for notes and formulas. `extraLines` lets a puzzle
 * show its own scratch area that also feeds the tutor.
 */
export function notebookPanel(onChange?: (notes: string) => void): HTMLElement {
  const notes = h('textarea.notes', { rows: '6', placeholder: t('notebook.placeholder'), 'aria-label': t('notebook.mine') }) as HTMLTextAreaElement;
  notes.value = game.notes;
  notes.addEventListener('input', () => {
    game.notes = notes.value;
    onChange?.(notes.value);
  });
  // typing in the notebook must not trigger game keys
  notes.addEventListener('keydown', (e) => e.stopPropagation());
  const body = h('div.nb-body');
  const tabs = h('div.row.nb-tabs');
  const mine = h('button.on', { text: t('notebook.mine') });
  const sheet = h('button', { text: t('notebook.formulas') });
  const showMine = () => {
    mine.className = 'on';
    sheet.className = '';
    body.replaceChildren(h('p.muted', { text: t('notebook.mineHelp') }), notes);
  };
  const showSheet = () => {
    mine.className = '';
    sheet.className = 'on';
    body.replaceChildren(formulaSheet());
  };
  mine.addEventListener('click', showMine);
  sheet.addEventListener('click', showSheet);
  tabs.append(mine, sheet);
  showMine();
  return h('div.notebook', {}, [h('div.nb-head', {}, [h('b', { text: t('notebook.title') })]), tabs, body]);
}
