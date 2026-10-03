import { fmtNum, t } from '../i18n';
import type { Step } from './problems';

/** A linear equation  a·x + b = c·x + d  with a whole-number solution. */
export interface Seal {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * The Riddle Golem's three seals, from elementary to "real" algebra.
 * Phase 2 (3x + 4 = 25) is foreshadowed by the rune gate sequence 7, 10, 13, ...
 */
export const GOLEM_SEALS: Seal[] = [
  { a: 1, b: 7, c: 0, d: 15 },
  { a: 3, b: 4, c: 0, d: 25 },
  { a: 2, b: 5, c: 1, d: 12 },
];

/** Practice seal used in the Probe Strike trial. */
export const PRACTICE_SEAL: Seal = { a: 2, b: 1, c: 0, d: 11 };

export function solveSeal(s: Seal): number {
  return (s.d - s.b) / (s.a - s.c);
}

export function evalSide(coef: number, constant: number, x: number): number {
  return coef * x + constant;
}

/** Format  coef·x + constant  e.g. "3x + 4", "x + 7", "x", "25". */
export function fmtSide(coef: number, constant: number, value?: number): string {
  const v = t('math.var');
  const parts: string[] = [];
  if (coef !== 0) {
    const xs = value === undefined ? v : `(${fmtNum(value)})`;
    if (value === undefined) parts.push(coef === 1 ? xs : `${fmtNum(coef)}${xs}`);
    else parts.push(coef === 1 ? fmtNum(value) : `${fmtNum(coef)} × ${fmtNum(value)}`);
  }
  if (constant !== 0 || parts.length === 0) {
    if (parts.length) parts.push(constant < 0 ? `− ${fmtNum(-constant)}` : `+ ${fmtNum(constant)}`);
    else parts.push(fmtNum(constant));
  }
  return parts.join(' ');
}

export function fmtSeal(s: Seal): string {
  return `${fmtSide(s.a, s.b)} = ${fmtSide(s.c, s.d)}`;
}

/** Worked solution steps, phrased as balance-scale moves. */
export function sealSteps(s: Seal): Step[] {
  const steps: Step[] = [];
  let a = s.a;
  let d = s.d;
  if (s.c > 0) {
    a = s.a - s.c;
    steps.push({ key: 'explain.sealBags', params: { c: s.c, eq: `${fmtSide(a, s.b)} = ${fmtSide(0, d)}` } });
  }
  if (s.b !== 0) {
    d = d - s.b;
    steps.push({ key: 'explain.sealUnits', params: { b: s.b, eq: `${fmtSide(a, 0)} = ${fmtSide(0, d)}` } });
  }
  if (a !== 1) {
    steps.push({ key: 'explain.sealSplit', params: { a, eq: `${t('math.var')} = ${fmtNum(d / a)}` } });
  }
  steps.push({ key: 'explain.sealCheck', params: { x: solveSeal(s), lhs: fmtSide(s.a, s.b, solveSeal(s)), rhs: fmtSide(s.c, s.d, solveSeal(s)), v: evalSide(s.a, s.b, solveSeal(s)) } });
  return steps;
}
