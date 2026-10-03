import { spriteUrl } from '../art/sprites';
import { t } from '../i18n';
import { askTutor, tutorStatus, type TutorMessage } from '../tutor/client';
import { h, img } from './dom';

export interface TutorContext {
  /** The problem as the player sees it right now. */
  problem: () => string;
  /** What else is on screen (title, story, picture). */
  context?: () => string;
  /** The built-in hint, if the player has already opened it. */
  hint?: () => string | null;
  attempts?: () => string[];
  /** Used only to keep the answer out of the tutor's replies. */
  answer: () => number;
}

/**
 * "Ask Owl" chat panel for a question modal. Returns null when no local tutor
 * is running, so the button only appears when it can work.
 */
export function tutorPanel(ctx: TutorContext): HTMLElement | null {
  if (!tutorStatus().online) return null;
  const root = h('div.tutor');
  const open = h('button.tutor-open', {}, [img(spriteUrl('owl', 2)), t('tutor.ask')]);
  root.append(open);

  const messages: TutorMessage[] = [];
  let level = 1;
  let busy = false;
  const log = h('div.tutor-log');
  const input = h('input.tutor-input', { type: 'text', autocomplete: 'off', placeholder: t('tutor.placeholder'), 'aria-label': t('tutor.placeholder') }) as HTMLInputElement;
  const send = h('button', { text: t('tutor.send') }) as HTMLButtonElement;
  const stuck = h('button', { text: t('tutor.stuck') }) as HTMLButtonElement;
  const levelEl = h('span.muted');
  const status = h('div.tutor-status');

  const bubble = (role: 'student' | 'tutor', text: string) => {
    log.append(h(`div.tutor-msg.${role}`, {}, [role === 'tutor' ? img(spriteUrl('owl', 2)) : null, h('span', { text })]));
    log.scrollTop = log.scrollHeight;
  };
  const renderLevel = () => (levelEl.textContent = t('tutor.level', { n: level }));

  const ask = async (question: string) => {
    if (busy) return;
    busy = true;
    send.disabled = stuck.disabled = true;
    if (question) bubble('student', question);
    status.className = 'tutor-status muted';
    status.textContent = t('tutor.thinking');
    try {
      const res = await askTutor(
        {
          problem: ctx.problem(),
          context: ctx.context?.(),
          hint: ctx.hint?.() ?? undefined,
          attempts: ctx.attempts?.(),
          level,
          messages: messages.slice(),
          question,
        },
        ctx.answer(),
      );
      if (question) messages.push({ role: 'student', text: question });
      messages.push({ role: 'tutor', text: res.text });
      bubble('tutor', res.text);
      status.textContent = res.redacted ? t('tutor.redacted') : '';
    } catch (e) {
      status.className = 'tutor-status bad';
      status.textContent = t('tutor.error', { err: (e as Error).message });
    } finally {
      busy = false;
      send.disabled = stuck.disabled = false;
      input.focus();
    }
  };

  send.addEventListener('click', () => {
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    void ask(q);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      send.click();
    }
  });
  stuck.addEventListener('click', () => {
    level = Math.min(3, level + 1);
    renderLevel();
    void ask(t('tutor.stuckMsg'));
  });

  open.addEventListener('click', () => {
    bubble('tutor', t('tutor.greeting'));
    renderLevel();
    root.replaceChildren(
      h('div.tutor-head', {}, [h('b', { text: t('tutor.title') }), h('div.spacer'), levelEl]),
      log,
      h('div.row', {}, [input, send, stuck]),
      status,
    );
    input.focus();
  });
  return root;
}
