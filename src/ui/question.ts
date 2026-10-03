import { PALETTE } from '../art/sprites';
import { fmtNum, t } from '../i18n';
import { parseAnswer } from '../math/answer';
import { record } from '../math/mastery';
import type { Problem, Step, Visual } from '../math/problems';
import { balanceView } from './balance';
import { autofocus, h, openModal } from './dom';

export interface AskOpts {
  title?: string;
  story?: string;
  /** Seconds on the clock; 0/undefined = untimed. */
  seconds?: number;
  hint?: boolean;
  /** Close automatically shortly after a correct answer. */
  quick?: boolean;
  tag?: string;
  /** Extra element shown above the prompt (e.g. rune stones). */
  extra?: HTMLElement;
}

export interface AskResult {
  correct: boolean;
  ms: number;
  timedOut: boolean;
}

export function stepText(s: Step): string {
  return t(s.key, s.params);
}

export function gridVisual(w: number, hgt: number, cell = 14): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = w * cell + 2;
  cv.height = hgt * cell + 2;
  cv.className = 'grid-visual';
  const ctx = cv.getContext('2d')!;
  for (let y = 0; y < hgt; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 2 ? PALETTE.o : PALETTE.y;
      ctx.fillRect(1 + x * cell, 1 + y * cell, cell - 1, cell - 1);
    }
  }
  cv.style.width = `${Math.min(w * 1.3, 18)}em`;
  return cv;
}

export function visualEl(v: Visual | undefined): HTMLElement | null {
  if (!v) return null;
  if (v.kind === 'grid') return h('div', {}, [gridVisual(v.w, v.h)]);
  return balanceView(v);
}

/** Ask one math problem in a modal. Records the result for adaptive difficulty. */
export function ask(p: Problem, opts: AskOpts = {}): Promise<AskResult> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': t('common.answerLabel') }) as HTMLInputElement;
    const feedback = h('div.feedback');
    const explain = h('div');
    const submit = h('button.primary', { text: t('common.submit') }) as HTMLButtonElement;
    const hintBtn = opts.hint ? (h('button', { text: t('common.hint') }) as HTMLButtonElement) : null;
    const timerBar = h('div');
    const timer = opts.seconds ? h('div.timer', {}, [timerBar]) : null;
    const answerRow = h('div.row.answer-row', {}, [input, submit, hintBtn]);
    const content = h('div.question', {}, [
      opts.tag ? h('span.tag.oc', { text: opts.tag }) : null,
      opts.title ? h('h2', { text: opts.title }) : null,
      opts.story ? h('p.story', { text: opts.story }) : null,
      visualEl(p.visual),
      opts.extra ?? null,
      h('div.prompt', { text: stepText(p.prompt) }),
      timer,
      answerRow,
      feedback,
      explain,
    ]);
    const modal = openModal(content);
    if (import.meta.env.DEV) (window as unknown as { __answer: number }).__answer = p.answer;
    const start = performance.now();
    let finished = false;
    let raf = 0;

    const finish = (correct: boolean, timedOut: boolean) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      const ms = performance.now() - start;
      record(p.topic, correct, ms);
      input.disabled = true;
      submit.disabled = true;
      if (hintBtn) hintBtn.disabled = true;
      const result: AskResult = { correct, ms, timedOut };
      if (correct) {
        feedback.className = 'feedback good';
        feedback.textContent = `${t('common.correct')} (${fmtNum(Math.round(ms / 100) / 10)} s)`;
      } else {
        feedback.className = 'feedback bad';
        feedback.textContent = `${timedOut ? t('common.timeUp') : t('common.wrong')} ${t('common.theAnswer', { answer: p.answer })}`;
        explain.className = 'explain';
        explain.replaceChildren(...p.explain.map((s) => h('p', { text: stepText(s) })));
      }
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      };
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener('keydown', onKey, true);
        modal.close();
        resolve(result);
      };
      if (correct && opts.quick) {
        setTimeout(close, 650);
        return;
      }
      const cont = h('button.primary', { text: t('common.continue'), onclick: close });
      answerRow.replaceChildren(cont);
      setTimeout(() => {
        if (closed) return;
        window.addEventListener('keydown', onKey, true);
        cont.focus();
      }, 250);
    };

    const trySubmit = () => {
      const v = parseAnswer(input.value);
      if (v === null) {
        feedback.className = 'feedback muted';
        feedback.textContent = t('common.typeNumber');
        return;
      }
      finish(Math.abs(v - p.answer) < 1e-9, false);
    };
    submit.addEventListener('click', trySubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        trySubmit();
      }
    });
    hintBtn?.addEventListener('click', () => {
      feedback.className = 'feedback accent';
      feedback.textContent = stepText(p.hint);
      input.focus();
    });

    if (opts.seconds) {
      const total = opts.seconds * 1000;
      const tick = () => {
        const left = total - (performance.now() - start);
        timerBar.style.width = `${Math.max(0, (left / total) * 100)}%`;
        if (left <= 0) finish(false, true);
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    autofocus(content);
  });
}

export interface NumberPromptOpts {
  title?: string;
  lines: string[];
  label: string;
  extra?: HTMLElement | null;
  cancel?: boolean;
  /** Return an error message to keep the prompt open. */
  validate?: (n: number) => string | null;
}

/** Ask the player for any number (not graded). Resolves null on cancel. */
export function numberPrompt(opts: NumberPromptOpts): Promise<number | null> {
  return new Promise((resolve) => {
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': opts.label }) as HTMLInputElement;
    const feedback = h('div.feedback');
    const ok = h('button.primary', { text: t('common.ok') });
    const cancel = opts.cancel ? h('button', { text: t('common.cancel') }) : null;
    const content = h('div.question', {}, [
      opts.title ? h('h2', { text: opts.title }) : null,
      ...opts.lines.map((l) => h('p', { text: l })),
      opts.extra ?? null,
      h('div.row.answer-row', {}, [h('span', { text: opts.label }), input, ok, cancel]),
      feedback,
    ]);
    const modal = openModal(content);
    const done = (v: number | null) => {
      modal.close();
      resolve(v);
    };
    const submit = () => {
      const v = parseAnswer(input.value);
      if (v === null) {
        feedback.className = 'feedback muted';
        feedback.textContent = t('common.typeNumber');
        return;
      }
      const err = opts.validate?.(v);
      if (err) {
        feedback.className = 'feedback bad';
        feedback.textContent = err;
        return;
      }
      done(v);
    };
    ok.addEventListener('click', submit);
    cancel?.addEventListener('click', () => done(null));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape' && opts.cancel) {
        done(null);
      }
    });
    autofocus(content);
  });
}

/** Simple message box with a single button. */
export function messageBox(title: string, lines: string[], button = t('common.continue')): Promise<void> {
  return new Promise((resolve) => {
    const btn = h('button.primary', { text: button });
    const content = h('div.col', {}, [h('h2', { text: title }), ...lines.map((l) => h('p', { text: l })), h('div.row', {}, [h('div.spacer'), btn])]);
    const modal = openModal(content);
    btn.addEventListener('click', () => {
      modal.close();
      resolve();
    });
    autofocus(content);
  });
}
