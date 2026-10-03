import { t } from '../i18n';
import type { Problem, Step } from '../math/problems';
import { h } from './dom';
import { ask } from './question';

/** The rune gate shows the sequence 3n + 4 — the same rule as the golem's second seal. */
export const RUNE_RULE = { mul: 3, add: 4 };
const term = (n: number) => RUNE_RULE.mul * n + RUNE_RULE.add;

function stones(values: Array<number | null>, positions = true): HTMLElement {
  return h(
    'div.row.runes',
    {},
    values.map((v, i) =>
      h(`div.rune-stone${v === null ? '.unknown' : ''}`, {}, [v === null ? '?' : String(v), positions ? h('span.pos', { text: t('runes.pos', { n: i + 1 }) }) : null]),
    ),
  );
}

async function untilCorrect(make: () => { p: Problem; extra: HTMLElement }, title: string, story: string): Promise<void> {
  for (;;) {
    const { p, extra } = make();
    const r = await ask(p, { title, story, hint: true, extra });
    if (r.correct) return;
  }
}

/** Three stages: next term, the 10th term, and which term equals 25. */
export async function runePuzzle(): Promise<void> {
  const known = [1, 2, 3, 4].map(term);
  const title = t('runes.title');

  await untilCorrect(
    () => ({
      p: {
        topic: 'sequence',
        prompt: { key: 'runes.q1' },
        answer: term(5),
        hint: { key: 'runes.h1' },
        explain: [{ key: 'runes.e1', params: { d: RUNE_RULE.mul, last: term(4), ans: term(5) } }],
      },
      extra: stones([...known, null]),
    }),
    title,
    t('runes.s1'),
  );

  await untilCorrect(
    () => ({
      p: {
        topic: 'sequence',
        prompt: { key: 'runes.q2' },
        answer: term(10),
        hint: { key: 'runes.h2', params: { m: RUNE_RULE.mul, a: RUNE_RULE.add } },
        explain: [{ key: 'runes.e2', params: { m: RUNE_RULE.mul, a: RUNE_RULE.add, ans: term(10) } }],
      },
      extra: stones([...known, term(5)]),
    }),
    title,
    t('runes.s2'),
  );

  const target = 25;
  const n = (target - RUNE_RULE.add) / RUNE_RULE.mul;
  await untilCorrect(
    () => ({
      p: {
        topic: 'sequence',
        prompt: { key: 'runes.q3', params: { v: target } },
        answer: n,
        hint: { key: 'runes.h3', params: { m: RUNE_RULE.mul, a: RUNE_RULE.add, v: target } },
        explain: [
          { key: 'runes.e3a', params: { m: RUNE_RULE.mul, a: RUNE_RULE.add, v: target } },
          { key: 'runes.e3b', params: { m: RUNE_RULE.mul, d: target - RUNE_RULE.add, ans: n } },
        ] as Step[],
      },
      extra: stones([...known, term(5)]),
    }),
    title,
    t('runes.s3'),
  );
}
