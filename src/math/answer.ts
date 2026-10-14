/**
 * Parse what the player typed into a number.
 * Accepts "5", "-3", "2.5", "2,5" (Finnish), "1/2", "x = 4", "x=4", "4 m²".
 */
export function parseAnswer(input: string): number | null {
  let s = input.trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/−/g, '-'); // unicode minus
  s = s.replace(/^[a-z]\s*=\s*/, ''); // "x = 4"
  s = s.replace(/\s*(m²|m2|m\^2|m|kpl|pcs|gold|kultaa)$/, '');
  s = s.replace(/\s+/g, '');
  s = s.replace(',', '.');
  const frac = /^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/.exec(s);
  if (frac) {
    const d = Number(frac[2]);
    if (d === 0) return null;
    return Number(frac[1]) / d;
  }
  if (!/^-?\d+(?:\.\d+)?$|^-?\.\d+$/.test(s)) return null;
  return Number(s);
}

export function checkAnswer(input: string, expected: number, tolerance = 1e-9): boolean {
  const v = parseAnswer(input);
  if (v === null) return false;
  return Math.abs(v - expected) <= tolerance;
}

/**
 * A small, safe calculator for typed answers like "√3/2", "-sqrt(2)/2",
 * "2·π/3" or "10 * 0,5". Only numbers, + − × ÷ * /, brackets, √/sqrt and π.
 */
export function parseExpr(input: string): number | null {
  const src = input
    .trim()
    .toLowerCase()
    .replace(/−/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/[÷:]/g, '/')
    .replace(/sqrt/g, '√')
    .replace(/pi/g, 'π')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\s+/g, '');
  if (!src || /[^0-9.+\-*/()√π]/.test(src)) return null;
  let i = 0;
  const peek = () => src[i];
  const number = (): number | null => {
    const m = /^\d+(?:\.\d+)?|^\.\d+/.exec(src.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  // factor := ('-'|'+') factor | '√' factor | number | 'π' | '(' expr ')' ; with implicit multiplication ("2π", "2√3")
  const factor = (): number | null => {
    const c = peek();
    if (c === '-' || c === '+') {
      i++;
      const f = factor();
      return f === null ? null : c === '-' ? -f : f;
    }
    let v: number | null;
    if (c === '√') {
      i++;
      const f = factor();
      v = f === null || f < 0 ? null : Math.sqrt(f);
    } else if (c === 'π') {
      i++;
      v = Math.PI;
    } else if (c === '(') {
      i++;
      v = expr();
      if (peek() !== ')') return null;
      i++;
    } else v = number();
    if (v === null) return null;
    const n = peek();
    if (n === 'π' || n === '√' || n === '(') {
      const f = factor();
      return f === null ? null : v * f;
    }
    return v;
  };
  const term = (): number | null => {
    let v = factor();
    while (v !== null && (peek() === '*' || peek() === '/')) {
      const op = src[i++];
      const f = factor();
      if (f === null || (op === '/' && f === 0)) return null;
      v = op === '*' ? v * f : v / f;
    }
    return v;
  };
  const expr = (): number | null => {
    let v = term();
    while (v !== null && (peek() === '+' || peek() === '-')) {
      const op = src[i++];
      const f = term();
      if (f === null) return null;
      v = op === '+' ? v + f : v - f;
    }
    return v;
  };
  const v = expr();
  return v !== null && i === src.length && Number.isFinite(v) ? v : null;
}
