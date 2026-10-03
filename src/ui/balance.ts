import { spriteUrl } from '../art/sprites';
import { t } from '../i18n';
import { record } from '../math/mastery';
import { fmtSide } from '../math/seal';
import { parseAnswer } from '../math/answer';
import { autofocus, h, img, openModal } from './dom';

export interface BalanceState {
  leftBags: number;
  leftUnits: number;
  rightBags: number;
  rightUnits: number;
}

function equation(s: BalanceState): string {
  return `${fmtSide(s.leftBags, s.leftUnits)} = ${fmtSide(s.rightBags, s.rightUnits)}`;
}

function pieces(bags: number, units: number, onBag?: () => void, onUnit?: () => void): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (let i = 0; i < bags; i++) {
    const im = img(spriteUrl('bag', 3));
    im.title = t('balance.bag');
    out.push(onBag ? h('button.piece', { onclick: onBag, title: t('balance.removeBag') }, [im]) : im);
  }
  for (let i = 0; i < units; i++) {
    const im = img(spriteUrl('weight', 3));
    out.push(onUnit ? h('button.piece', { onclick: onUnit, title: t('balance.removeUnit') }, [im]) : im);
  }
  return out;
}

function scale(s: BalanceState, tilt: number, handlers?: { lb: () => void; lu: () => void; rb: () => void; ru: () => void }): HTMLElement {
  const deg = Math.max(-12, Math.min(12, tilt * 3));
  const shift = deg * 0.12;
  const beam = h('div.beam');
  beam.style.transform = `rotate(${deg}deg)`;
  const dense = Math.max(s.leftBags + s.leftUnits, s.rightBags + s.rightUnits) > 10 ? '.dense' : '';
  const left = h(`div.pan.left${dense}`, {}, pieces(s.leftBags, s.leftUnits, handlers?.lb, handlers?.lu));
  const right = h(`div.pan.right${dense}`, {}, pieces(s.rightBags, s.rightUnits, handlers?.rb, handlers?.ru));
  left.style.transform = `translateY(${-shift}em)`;
  right.style.transform = `translateY(${shift}em)`;
  return h('div.beam-wrap', {}, [h('div.post'), beam, left, right]);
}

/** Static picture of an equation as a balance scale (always level). */
export function balanceView(s: BalanceState): HTMLElement {
  return h('div.balance.static', {}, [scale(s, 0), h('div', { style: 'height:7.5em' })]);
}

export interface BalanceStage extends BalanceState {
  x: number;
}

/**
 * Interactive balance puzzle. The player removes bags/weights from the pans
 * (keeping it level) and splits groups until one bag stands alone.
 */
export function balancePuzzle(stage: BalanceStage, title: string, intro: string): Promise<void> {
  return new Promise((resolve) => {
    let s: BalanceState = { ...stage };
    const history: BalanceState[] = [];
    const wrap = h('div.balance');
    const status = h('div.feedback');
    const eq = h('div.equation');
    const splitBtn = h('button', { text: t('balance.split') }) as HTMLButtonElement;
    const undoBtn = h('button', { text: t('common.undo') }) as HTMLButtonElement;
    const resetBtn = h('button', { text: t('common.reset') }) as HTMLButtonElement;
    const answerRow = h('div.row.answer-row');
    const content = h('div.question', {}, [
      h('h2', { text: title }),
      h('p.story', { text: intro }),
      h('p.muted', { text: t('balance.howto') }),
      wrap,
      h('div', { style: 'height:7.5em' }),
      eq,
      status,
      h('div.row.answer-row', {}, [splitBtn, undoBtn, resetBtn]),
      answerRow,
    ]);
    const modal = openModal(content);
    const started = performance.now();

    const weightOf = (bags: number, units: number) => bags * stage.x + units;
    const balanced = () => weightOf(s.leftBags, s.leftUnits) === weightOf(s.rightBags, s.rightUnits);
    const isolated = () =>
      balanced() &&
      ((s.leftBags === 1 && s.leftUnits === 0 && s.rightBags === 0) || (s.rightBags === 1 && s.rightUnits === 0 && s.leftBags === 0));

    const canSplit = () => {
      if (!balanced()) return 0;
      const check = (bags: number, units: number, otherBags: number, otherUnits: number) =>
        bags > 1 && units === 0 && otherBags === 0 && otherUnits % bags === 0 ? bags : 0;
      return check(s.leftBags, s.leftUnits, s.rightBags, s.rightUnits) || check(s.rightBags, s.rightUnits, s.leftBags, s.leftUnits);
    };

    const change = (fn: (n: BalanceState) => void) => {
      history.push({ ...s });
      const n = { ...s };
      fn(n);
      s = n;
      render();
    };

    const askX = () => {
      const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off' }) as HTMLInputElement;
      const ok = h('button.primary', { text: t('common.submit') });
      const fb = h('span');
      const submit = () => {
        const v = parseAnswer(input.value);
        if (v === stage.x) {
          record('balance', true, performance.now() - started);
          modal.close();
          resolve();
        } else {
          fb.className = 'bad';
          fb.textContent = t('balance.countAgain');
        }
      };
      ok.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });
      answerRow.replaceChildren(h('span', { text: t('balance.soX') }), input, ok, fb);
      autofocus(answerRow);
    };

    const render = () => {
      const diff = weightOf(s.rightBags, s.rightUnits) - weightOf(s.leftBags, s.leftUnits);
      const handlers = {
        lb: () => s.leftBags > 0 && change((n) => n.leftBags--),
        lu: () => s.leftUnits > 0 && change((n) => n.leftUnits--),
        rb: () => s.rightBags > 0 && change((n) => n.rightBags--),
        ru: () => s.rightUnits > 0 && change((n) => n.rightUnits--),
      };
      wrap.replaceChildren(scale(s, Math.sign(diff) * Math.min(4, Math.abs(diff)), handlers));
      eq.textContent = balanced() ? equation(s) : `${fmtSide(s.leftBags, s.leftUnits)} ≠ ${fmtSide(s.rightBags, s.rightUnits)}`;
      const k = canSplit();
      splitBtn.disabled = !k;
      splitBtn.textContent = k ? t('balance.splitN', { n: k }) : t('balance.split');
      undoBtn.disabled = history.length === 0;
      if (!balanced()) {
        status.className = 'feedback bad';
        status.textContent = t('balance.tipped');
      } else if (isolated()) {
        status.className = 'feedback good';
        status.textContent = t('balance.alone');
        askX();
      } else {
        status.className = 'feedback muted';
        status.textContent = t('balance.level');
      }
    };

    splitBtn.addEventListener('click', () => {
      const k = canSplit();
      if (!k) return;
      change((n) => {
        n.leftBags /= k;
        n.leftUnits /= k;
        n.rightBags /= k;
        n.rightUnits /= k;
      });
    });
    undoBtn.addEventListener('click', () => {
      const prev = history.pop();
      if (prev) {
        s = prev;
        answerRow.replaceChildren();
        render();
      }
    });
    resetBtn.addEventListener('click', () => {
      history.length = 0;
      s = { ...stage };
      answerRow.replaceChildren();
      render();
    });
    render();
  });
}
