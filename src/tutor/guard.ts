const NUMBER = /(?<![\w.,])[-−]?\d+(?:[.,]\d+)?(?:\s*\/\s*\d+)?(?!\w)/g;

/** Numbers written in a text, accepting "2,5" / "2.5" / "−3" and simple fractions "1/2". */
export function numbersIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(NUMBER)) {
    const n = toNumber(m[0]);
    if (n !== null) out.push(n);
  }
  return out;
}

function toNumber(token: string): number | null {
  const s = token.replace('−', '-').replace(',', '.').replace(/\s+/g, '');
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number);
    return b ? a / b : null;
  }
  return Number(s);
}

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/**
 * Does a tutor reply give away the answer? A number in the reply that equals
 * the answer counts, unless that number also appears in the problem itself
 * (then mentioning it reveals nothing).
 */
export function leaksAnswer(reply: string, answer: number, problem: string): boolean {
  if (numbersIn(problem).some((n) => same(n, answer))) return false;
  return numbersIn(reply).some((n) => same(n, answer));
}

/** Replace the answer wherever it appears in the reply. */
export function redact(reply: string, answer: number): string {
  return reply.replace(NUMBER, (m) => {
    const n = toNumber(m);
    return n !== null && same(n, answer) ? '■' : m;
  });
}
