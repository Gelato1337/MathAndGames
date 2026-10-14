import { t } from '../i18n';
import { record } from '../math/mastery';
import { dragOk, exactText, type DragTask } from '../math/trig';
import { h, openModal } from './dom';
import { stepText } from './question';
import type { StepsResult, StepsOpts } from './steps';
import { trigLens } from './triglens';

/** Text for the target value: exact when it is a special value ("−√3/2"), else a decimal. */
function valueText(task: DragTask): string {
  return exactText(task.fn, task.answer);
}

/**
 * Answer by turning the beam: drag the Trig Lens until sin, cos or tan has
 * the asked value, inside the asked range. Used for trials, Focus puzzles
 * and the Beacon Gate.
 */
export function askAngle(task: DragTask, opts: StepsOpts = {}): Promise<StepsResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const lens = trigLens({ angle: task.lo === 0 && task.hi >= 90 ? 10 : (task.lo + task.hi) / 2 + 7, interactive: true, readout: true, width: 400 });
    const prompt = task.text ? stepText(task.text) : t(`lens.task.${task.fn}`, { v: valueText(task), lo: task.lo, hi: task.hi });
    const feedback = h('div.feedback');
    const explain = h('div');
    const check = h('button.primary', { text: t('lens.confirm') }) as HTMLButtonElement;
    const hintBtn = opts.hint !== false && !opts.seconds ? (h('button', { text: t('common.hint') }) as HTMLButtonElement) : null;
    const buttons = h('div.row.answer-row', {}, [check, hintBtn]);
    const timerBar = h('div');
    const timer = opts.seconds ? h('div.timer', {}, [timerBar]) : null;
    const content = h('div.question.drag', {}, [
      opts.tag ? h('span.tag.oc', { text: opts.tag }) : null,
      h('h2', { text: opts.title ?? t('lens.title') }),
      opts.story ? h('p.story', { text: opts.story }) : null,
      h('p.lens-task', { text: prompt }),
      timer,
      lens.el,
      buttons,
      feedback,
      explain,
    ]);
    const modal = openModal(content);
    let finished = false;
    let raf = 0;

    hintBtn?.addEventListener('click', () => {
      feedback.className = 'feedback accent';
      feedback.textContent = t(`lens.hint.${task.fn}`);
    });

    const finish = (timedOut: boolean) => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      const correct = !timedOut && dragOk(task, lens.angle);
      const ms = performance.now() - started;
      record('trig_drag', correct, ms);
      check.disabled = true;
      if (hintBtn) hintBtn.disabled = true;
      const result: StepsResult = { correct, stepsRight: 0, steps: 0, ms, timedOut };
      if (correct) {
        feedback.className = 'feedback good';
        feedback.textContent = t('common.correct');
      } else {
        feedback.className = 'feedback bad';
        feedback.textContent = `${timedOut ? t('common.timeUp') : t('common.wrong')} ${t('lens.answerWas', { a: task.answer })}`;
        lens.set(task.answer);
      }
      explain.className = 'explain';
      explain.replaceChildren(h('p', { text: t(`lens.ex.${task.fn}`, { a: task.answer, v: valueText(task) }) }));
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener('keydown', onKey, true);
        modal.close();
        lens.destroy();
        resolve(result);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      };
      if (correct && opts.quick) {
        setTimeout(close, 700);
        return;
      }
      const cont = h('button.primary', { text: t('common.continue'), onclick: close });
      buttons.replaceChildren(cont);
      setTimeout(() => {
        if (closed) return;
        window.addEventListener('keydown', onKey, true);
        cont.focus();
      }, 250);
    };
    check.addEventListener('click', () => finish(false));

    if (opts.seconds) {
      const total = opts.seconds * 1000;
      const tick = () => {
        const left = total - (performance.now() - started);
        timerBar.style.width = `${Math.max(0, (left / total) * 100)}%`;
        if (left <= 0) finish(true);
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    if (import.meta.env.DEV) {
      (window as unknown as { __drag: unknown }).__drag = { answer: task.answer, set: (d: number) => lens.set(d) };
    }
    requestAnimationFrame(() => (lens.el.querySelector('canvas') as HTMLCanvasElement | null)?.focus());
  });
}
