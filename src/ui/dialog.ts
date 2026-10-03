import { spriteUrl } from '../art/sprites';
import { t } from '../i18n';
import { h, img, openModal } from './dom';

export type Speaker = 'elder' | 'ren' | 'lumi' | 'pekka' | 'helmi' | 'kai' | 'aino' | 'golem' | null;

export interface Choice {
  id: string;
  label: string;
}

function frame(speaker: Speaker, text: string): { box: HTMLElement; body: HTMLElement } {
  const body = h('div.body', {}, [
    speaker ? h('div.name', { text: t(`chars.${speaker}`) }) : null,
    h('div.text', { text }),
  ]);
  const portrait = speaker ? img(spriteUrl(speaker, 6), 'portrait') : null;
  const box = h('div.panel.dialog', {}, [portrait, body]);
  return { box, body };
}

/** Show one line of dialogue; resolves when the player advances. */
export function say(speaker: Speaker, text: string): Promise<void> {
  return new Promise((resolve) => {
    const { box, body } = frame(speaker, text);
    body.append(h('div.advance', { text: t('common.advance') }));
    const modal = openModal(box, { clear: true, wrap: false });
    const opened = performance.now();
    const done = () => {
      if (performance.now() - opened < 180) return;
      window.removeEventListener('keydown', onKey, true);
      modal.close();
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (['Enter', ' ', 'e', 'E', 'Escape'].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        done();
      }
    };
    box.addEventListener('click', done);
    window.addEventListener('keydown', onKey, true);
  });
}

/** Say several lines in a row. */
export async function sayAll(speaker: Speaker, keys: string[], params?: Record<string, string | number>): Promise<void> {
  for (const k of keys) await say(speaker, t(k, params));
}

/** Show a line with choices; resolves with the chosen id. */
export function choose(speaker: Speaker, text: string, options: Choice[]): Promise<string> {
  return new Promise((resolve) => {
    const { box, body } = frame(speaker, text);
    const list = h('div.choices');
    const opened = performance.now();
    const pickIdx = (i: number) => {
      if (performance.now() - opened < 180) return;
      window.removeEventListener('keydown', onKey, true);
      modal.close();
      resolve(options[i].id);
    };
    options.forEach((o, i) => {
      list.append(h('button', { onclick: () => pickIdx(i) }, [`${i + 1}. ${o.label}`]));
    });
    body.append(list);
    const modal = openModal(box, { clear: true, wrap: false });
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) {
        e.preventDefault();
        e.stopPropagation();
        pickIdx(n - 1);
      }
    };
    window.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => list.querySelector('button')?.focus());
  });
}
