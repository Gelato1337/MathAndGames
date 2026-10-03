import { SEEDS_PER_M2 } from '../data';
import { t } from '../i18n';
import { parseAnswer } from '../math/answer';
import { record } from '../math/mastery';
import { game } from '../state';
import { FIELD } from '../world/map';
import { autofocus, h, openModal } from './dom';
import { tutorPanel } from './tutor';

export const FIELD_AREA = FIELD.w * FIELD.h - FIELD.cutW * FIELD.cutH;
export const FIELD_SEEDS = FIELD_AREA * SEEDS_PER_M2;

type Approach = 'none' | 'count' | 'split' | 'subtract';

const NS = 'http://www.w3.org/2000/svg';
function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function label(text: string, x: number, y: number, color = '#f4f4f4', size = 13): SVGElement {
  const el = svgEl('text', { x, y, fill: color, 'font-size': size, 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Pixelify Sans, monospace' });
  el.textContent = text;
  return el;
}

function fieldSvg(approach: Approach): SVGElement {
  const c = 30;
  const pad = 34;
  const { w, h: hh, cutW, cutH } = FIELD;
  const W = w * c + pad * 2;
  const H = hh * c + pad * 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: '24em', class: 'field-svg' });
  const X = (gx: number) => pad + gx * c;
  const Y = (gy: number) => pad + gy * c;
  const pts = [
    [0, 0],
    [w - cutW, 0],
    [w - cutW, cutH],
    [w, cutH],
    [w, hh],
    [0, hh],
  ]
    .map(([x, y]) => `${X(x)},${Y(y)}`)
    .join(' ');
  svg.append(svgEl('polygon', { points: pts, fill: '#8a5a34', stroke: '#1a1c2c', 'stroke-width': 3 }));

  const m = t('farm.m');
  if (approach === 'count') {
    let n = 0;
    for (let y = 0; y < hh; y++) {
      for (let x = 0; x < w; x++) {
        if (x >= w - cutW && y < cutH) continue;
        n++;
        svg.append(svgEl('rect', { x: X(x) + 1, y: Y(y) + 1, width: c - 2, height: c - 2, fill: 'none', stroke: '#c79a62', 'stroke-width': 1 }));
        svg.append(label(String(n), X(x) + c / 2, Y(y) + c / 2, '#ffcd75', 10));
      }
    }
  } else if (approach === 'split') {
    svg.append(svgEl('line', { x1: X(0), y1: Y(cutH), x2: X(w), y2: Y(cutH), stroke: '#ffcd75', 'stroke-width': 3, 'stroke-dasharray': '6 4' }));
    svg.append(label(`A: ${w - cutW} × ${cutH}`, X((w - cutW) / 2), Y(cutH / 2), '#ffcd75', 14));
    svg.append(label(`B: ${w} × ${hh - cutH}`, X(w / 2), Y(cutH + (hh - cutH) / 2), '#ffcd75', 14));
  } else if (approach === 'subtract') {
    svg.append(svgEl('rect', { x: X(w - cutW), y: Y(0), width: cutW * c, height: cutH * c, fill: 'rgba(177,62,83,0.25)', stroke: '#ef7d57', 'stroke-width': 2, 'stroke-dasharray': '6 4' }));
    svg.append(label(`${cutW} × ${cutH}`, X(w - cutW / 2), Y(cutH / 2), '#ef7d57', 14));
    svg.append(label(`${w} × ${hh} − ${cutW} × ${cutH}`, X(w / 2), Y(hh / 2 + 0.5), '#ffcd75', 15));
  }

  // edge lengths
  svg.append(label(`${w} ${m}`, X(w / 2), Y(hh) + 16));
  svg.append(label(`${hh} ${m}`, X(0) - 18, Y(hh / 2)));
  svg.append(label(`${w - cutW} ${m}`, X((w - cutW) / 2), Y(0) - 14));
  svg.append(label(`${cutH} ${m}`, X(w - cutW) + 14, Y(cutH / 2) - 2, '#94b0c2', 11));
  svg.append(label(`${cutW} ${m}`, X(w - cutW / 2), Y(cutH) - 10, '#94b0c2', 11));
  svg.append(label(`${hh - cutH} ${m}`, X(w) + 18, Y(cutH + (hh - cutH) / 2)));
  return svg;
}

/**
 * The farm planner: figure out the area of Helmi's crooked field with any
 * approach, then the number of seeds. Resolves true when both are solved.
 */
export function farmPlanner(): Promise<boolean> {
  return new Promise((resolve) => {
    let approach: Approach = 'none';
    const started = performance.now();
    const pic = h('div');
    const tools = h('div.row.approach-btns', { style: 'justify-content:center' });
    const question = h('div.prompt');
    const input = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off' }) as HTMLInputElement;
    const submit = h('button.primary', { text: t('common.submit') });
    const fb = h('div.feedback');
    const close = h('button', { text: t('common.close') });
    const content = h('div.question', {}, [
      h('h2', { text: t('farm.title') }),
      h('p.story', { text: t('farm.intro', { rate: SEEDS_PER_M2 }) }),
      tools,
      pic,
      question,
      h('div.row.answer-row', {}, [input, submit, close]),
      fb,
    ]);
    const attempts: string[] = [];
    const tutor = tutorPanel({
      problem: () => question.textContent ?? '',
      context: () => t('tutor.farmContext'),
      attempts: () => attempts,
      answer: () => (stage() === 'area' ? FIELD_AREA : FIELD_SEEDS),
    });
    if (tutor) content.append(tutor);
    const modal = openModal(content);

    const approaches: Approach[] = ['count', 'split', 'subtract'];
    const renderTools = () => {
      tools.replaceChildren(
        h('span.muted', { text: t('farm.tools') }),
        ...approaches.map((a) =>
          h(`button${approach === a ? '.on' : ''}`, {
            text: t(`farm.approach.${a}`),
            onclick: () => {
              approach = a;
              game.approaches.add(a);
              renderTools();
              pic.replaceChildren(fieldSvg(approach));
              fb.textContent = '';
              input.focus();
            },
          }),
        ),
      );
    };

    const stage = () => (game.flags.farmStage >= 2 ? 'seeds' : 'area');
    const renderQuestion = () => {
      question.textContent = stage() === 'area' ? t('farm.qArea') : t('farm.qSeeds', { area: FIELD_AREA, rate: SEEDS_PER_M2 });
      input.value = '';
    };

    const doSubmit = () => {
      const v = parseAnswer(input.value);
      if (v === null) {
        fb.className = 'feedback muted';
        fb.textContent = t('common.typeNumber');
        return;
      }
      attempts.push(input.value.trim());
      if (stage() === 'area') {
        const ok = v === FIELD_AREA;
        record('farm', ok, performance.now() - started);
        if (ok) {
          game.flags.farmStage = 2;
          fb.className = 'feedback good';
          fb.textContent = t('farm.areaRight', { area: FIELD_AREA });
          renderQuestion();
        } else {
          fb.className = 'feedback bad';
          const big = FIELD.w * FIELD.h;
          fb.textContent = v === big ? t('farm.forgotCorner') : t(`farm.hint.${approach}`);
        }
      } else {
        const ok = v === FIELD_SEEDS;
        record('farm', ok, performance.now() - started);
        if (ok) {
          game.flags.farmStage = 3;
          modal.close();
          resolve(true);
        } else {
          fb.className = 'feedback bad';
          fb.textContent = t('farm.seedsHint', { area: FIELD_AREA, rate: SEEDS_PER_M2 });
        }
      }
    };
    submit.addEventListener('click', doSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') doSubmit();
    });
    close.addEventListener('click', () => {
      modal.close();
      resolve(false);
    });

    renderTools();
    pic.replaceChildren(fieldSvg(approach));
    renderQuestion();
    autofocus(content);
  });
}
