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
