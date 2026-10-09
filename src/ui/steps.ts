import { fmtNum, t } from '../i18n';
import { parseAnswer } from '../math/answer';
import { ansNumbers, checkAns, segText, type Ans, type StepProblem } from '../math/linalg';
import { record } from '../math/mastery';
import { game } from '../state';
import { autofocus, h, openModal } from './dom';
import { colourText, linkTerms, plainText, segsEl } from './eq';
import { notebookPanel } from './notebook';
import { plotCanvas } from './plot';
import { stepText } from './question';
import { tutorPanel } from './tutor';

export interface StepsResult {
  correct: boolean;
  /** how many working steps were right */
  stepsRight: number;
  steps: number;
  ms: number;
  timedOut: boolean;
}

export interface StepsOpts {
  title?: string;
  story?: string;
  tag?: string;
  seconds?: number;
  hint?: boolean;
  /** close a moment after a correct answer, without a Continue button */
  quick?: boolean;
}

/** An input widget for one answer; `read` returns null until it's complete. */
interface Field {
  el: HTMLElement;
  inputs: HTMLInputElement[];
  read: () => Ans | null;
  mark: (ok: boolean | null) => void;
}

function input(label: string): HTMLInputElement {
  const el = h('input.cell', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': label }) as HTMLInputElement;
  return el;
}

/** A number typed in a step box; fractions and percentages work too ("3/8", "37.5 %"). */
function parseCell(text: string): number | null {
  const pct = /^\s*(.+?)\s*%\s*$/.exec(text);
  if (pct) {
    const v = parseAnswer(pct[1]);
    return v === null ? null : v / 100;
  }
  return parseAnswer(text);
}

function field(want: Ans, label: string): Field {
  const marker = h('span.step-mark');
  const mark = (ok: boolean | null) => {
    marker.textContent = ok === null ? '' : ok ? '✔' : '✗';
    marker.className = `step-mark ${ok === null ? '' : ok ? 'good' : 'bad'}`;
  };
  const nums = (ins: HTMLInputElement[]) => {
    const vals = ins.map((i) => parseCell(i.value));
    return vals.some((v) => v === null) ? null : (vals as number[]);
  };
  if (want.kind === 'num') {
    const i = input(label);
    return { el: h('span.field', {}, [i, marker]), inputs: [i], read: () => nums([i]) && { kind: 'num', v: nums([i])![0] }, mark };
  }
  if (want.kind === 'vec' || want.kind === 'dir') {
    const ins = want.v.map((_, k) => input(`${label} ${k + 1}`));
    const grid = h('span.mat', { style: 'grid-template-columns:auto' }, ins);
    return { el: h('span.field', {}, [h('span.bracket', {}, [grid]), marker]), inputs: ins, read: () => nums(ins) && { kind: want.kind, v: nums(ins)! }, mark };
  }
  if (want.kind === 'mat') {
    const r = want.v.length;
    const c = want.v[0].length;
    const ins = Array.from({ length: r * c }, (_, k) => input(`${label} ${Math.floor(k / c) + 1},${(k % c) + 1}`));
    const grid = h('span.mat', { style: `grid-template-columns:repeat(${c},auto)` }, ins);
    const read = (): Ans | null => {
      const v = nums(ins);
      return v ? { kind: 'mat', v: Array.from({ length: r }, (_, i) => v.slice(i * c, i * c + c)) } : null;
    };
    return { el: h('span.field', {}, [h('span.bracket', {}, [grid]), marker]), inputs: ins, read, mark };
  }
  // set: one box per value, any order
  const ins = want.v.map((_, k) => input(`${label} ${k + 1}`));
  const parts = ins.flatMap((i, k) => [k ? h('span.op', { text: ',' }) : null, i].filter(Boolean) as HTMLElement[]);
  return { el: h('span.field', {}, [...parts, marker]), inputs: ins, read: () => nums(ins) && { kind: 'set', v: nums(ins)! }, mark };
}

export function ansText(a: Ans): string {
  if (a.kind === 'num') return a.frac && a.frac[1] !== 1 ? `${a.frac[0]}/${a.frac[1]} = ${fmtNum(Math.round(a.v * 1000) / 1000)}` : fmtNum(a.v);
  if (a.kind === 'mat') return `[${a.v.map((r) => r.map(fmtNum).join(' ')).join(' ; ')}]`;
  if (a.kind === 'set') return a.v.map(fmtNum).join(', ');
  return `(${a.v.map(fmtNum).join(', ')})`;
}

/** Build the answer that the steps add up to (vectors and matrices built from their entries). */
function fromSteps(want: Ans, steps: Array<Ans | null>): Ans | null {
  if (steps.some((s) => !s || s.kind !== 'num')) return null;
  const v = steps.map((s) => (s as { v: number }).v);
  if (want.kind === 'vec') return { kind: 'vec', v };
  if (want.kind === 'mat') {
    const c = want.v[0].length;
    return { kind: 'mat', v: Array.from({ length: want.v.length }, (_, i) => v.slice(i * c, i * c + c)) };
  }
  return null;
}

/**
 * A worked problem: a colour-coded formula, a picture, the working steps and
 * the answer. Steps are graded too. The notebook and the tutor sit alongside.
 */
export function askSteps(p: StepProblem, opts: StepsOpts = {}): Promise<StepsResult> {
  return new Promise((resolve) => {
    const started = performance.now();
    const card = h('div.eq-card');
    const info = h('div.eq-info');
    card.append(segsEl(p.eq, 'eq big'), colourText(p.text), info);

    const stepFields = p.steps.map((s, i) => field(s.ans, t('steps.step', { n: i + 1 })));
    const work = h(
      'div.work',
      {},
      p.steps.map((s, i) => h('div.step-row', {}, [h('span.step-n', { text: `${i + 1}.` }), segsEl(s.label, 'eq inline'), stepFields[i].el])),
    );
    const final = p.stepsAreAnswer ? null : field(p.answer, t('steps.answer'));
    const answerRow = h('div.step-row.final', {}, [segsEl(p.ask, 'eq inline'), final ? final.el : h('span.muted', { text: t('steps.fromSteps') })]);
    if (p.steps.length) work.prepend(h('div.work-head', { text: t('steps.work') }));
    work.append(answerRow);
    // everything a step-by-step player types, in order
    const allInputs = [...stepFields.flatMap((f) => f.inputs), ...(final?.inputs ?? [])];

    const feedback = h('div.feedback');
    const explain = h('div');
    const check = h('button.primary', { text: t('steps.check') }) as HTMLButtonElement;
    const hintBtn = opts.hint !== false ? (h('button', { text: t('common.hint') }) as HTMLButtonElement) : null;
    const nbBtn = h('button', { text: t('notebook.open') }) as HTMLButtonElement;
    const buttons = h('div.row.answer-row', {}, [check, hintBtn, nbBtn]);
    const timerBar = h('div');
    const timer = opts.seconds ? h('div.timer', {}, [timerBar]) : null;
    const side = h('div.steps-side');
    if (p.plot) side.append(plotCanvas(p.plot), h('div.plot-caption.muted', { text: p.plot.caption ? stepText(p.plot.caption) : t('steps.plotCaption') }));

    const main = h('div.steps-main', {}, [card, timer, work, buttons, feedback, explain]);
    const body = h('div.steps-body', {}, [main, side]);
    const content = h('div.question.steps', {}, [opts.tag ? h('span.tag.oc', { text: opts.tag }) : null, h('h2', { text: opts.title ?? stepText(p.title) }), opts.story ? h('p.story', { text: opts.story }) : null, body]);
    linkTerms(content, info, p.gloss, t('steps.hover'));

    let hintShown = false;
    if (!opts.seconds) {
      const tutor = tutorPanel({
        problem: () => `${stepText(p.title)}: ${segText(p.eq)}. ${segText(p.ask)} ?`,
        context: () => [plainText(p.text), game.notes ? `${t('notebook.tutorNotes')}: ${game.notes.slice(-400)}` : ''].filter(Boolean).join(' — '),
        hint: () => (hintShown ? stepText(p.hint) : null),
        attempts: () =>
          stepFields
            .map((f, i) => {
              const v = f.read();
              return v ? `${segText(p.steps[i].label)} ${ansText(v)}` : '';
            })
            .filter(Boolean),
        // the tutor must never say the final answer's numbers
        answer: () => (p.answer.kind === 'num' || p.answer.kind === 'set' ? ansNumbers(p.answer)[0] : NaN),
      });
      if (tutor) main.append(tutor);
    }
    const modal = openModal(content);

    nbBtn.addEventListener('click', () => {
      const open = side.querySelector('.notebook');
      if (open) open.remove();
      else side.append(notebookPanel());
    });
    hintBtn?.addEventListener('click', () => {
      hintShown = true;
      feedback.className = 'feedback accent';
      feedback.textContent = stepText(p.hint);
    });

    // Enter moves to the next box; on the last box it checks
    allInputs.forEach((inp, i) => {
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (i < allInputs.length - 1) allInputs[i + 1].focus();
        else check.click();
      });
    });

    let finished = false;
    let raf = 0;
    const finish = (timedOut: boolean) => {
      if (finished) return;
      const stepVals = stepFields.map((f) => f.read());
      let stepsRight = 0;
      stepFields.forEach((f, i) => {
        const ok = !!stepVals[i] && checkAns(stepVals[i]!, p.steps[i].ans);
        if (ok) stepsRight++;
        f.mark(stepVals[i] ? ok : timedOut ? false : null);
      });
      const given = p.stepsAreAnswer ? fromSteps(p.answer, stepVals) : final!.read();
      if (!given && !timedOut) {
        feedback.className = 'feedback muted';
        feedback.textContent = p.stepsAreAnswer ? t('steps.fillSteps') : t('steps.fillAnswer');
        return;
      }
      finished = true;
      cancelAnimationFrame(raf);
      const correct = !!given && checkAns(given, p.answer);
      final?.mark(correct);
      const ms = performance.now() - started;
      record(p.topic, correct, ms);
      allInputs.forEach((i) => (i.disabled = true));
      check.disabled = true;
      if (hintBtn) hintBtn.disabled = true;
      const result: StepsResult = { correct, stepsRight, steps: p.steps.length, ms, timedOut };
      const stepsNote = p.steps.length && !p.stepsAreAnswer ? ` ${t('steps.stepsScore', { n: stepsRight, total: p.steps.length })}` : '';
      if (correct) {
        feedback.className = 'feedback good';
        feedback.textContent = `${t('common.correct')}${stepsNote}`;
      } else {
        feedback.className = 'feedback bad';
        feedback.textContent = `${timedOut ? t('common.timeUp') : t('common.wrong')} ${t('steps.theAnswer', { a: ansText(p.answer) })}${stepsNote}`;
        explain.className = 'explain';
        explain.replaceChildren(...p.explain.map((s) => h('p', { text: stepText(s) })));
      }
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        window.removeEventListener('keydown', onKey, true);
        modal.close();
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
      buttons.replaceChildren(cont, nbBtn);
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
      (window as unknown as { __steps: unknown }).__steps = { steps: p.steps.map((s) => s.ans), answer: p.answer, stepsAreAnswer: !!p.stepsAreAnswer };
    }
    autofocus(work);
  });
}
