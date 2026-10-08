import { fmtNum, t } from '../i18n';
import { eigenvalues, eigenvector, type Mat } from './linalg';
import type { Seal } from './seal';

/**
 * Eigenvale's seals: a matrix that hides an eigenvalue (or, later, an
 * eigenvector). Find it and the seal breaks.
 */
export interface EigenSeal {
  kind: 'eig';
  A: Mat;
  mode: 'value' | 'vector';
  /** for vector mode: which eigenvalue's direction to find */
  lambda?: number;
}

export type AnySeal = Seal | EigenSeal;

export function isEigenSeal(s: AnySeal): s is EigenSeal {
  return (s as EigenSeal).kind === 'eig';
}

/** The Eigenwarden's three seals: an eigenvalue, an eigenvector, then a harder eigenvalue. */
export const WARDEN_SEALS: EigenSeal[] = [
  {
    kind: 'eig',
    A: [
      [2, 1],
      [1, 2],
    ],
    mode: 'value',
  },
  {
    kind: 'eig',
    A: [
      [4, 1],
      [2, 3],
    ],
    mode: 'vector',
    lambda: 5,
  },
  {
    kind: 'eig',
    A: [
      [5, -2],
      [1, 2],
    ],
    mode: 'value',
  },
];

export const PRACTICE_EIGEN: EigenSeal = {
  kind: 'eig',
  A: [
    [3, 0],
    [1, 2],
  ],
  mode: 'value',
};

export function fmtMat(A: Mat): string {
  return `[${A.map((r) => r.map(fmtNum).join(' ')).join(' ; ')}]`;
}

/** Short label drawn above a sealed enemy. */
export function eigenLabel(s: EigenSeal): string {
  return s.mode === 'value' ? t('eseal.labelValue', { m: fmtMat(s.A) }) : t('eseal.labelVector', { m: fmtMat(s.A), l: s.lambda ?? 0 });
}

export function eigenSolution(s: EigenSeal): { values: number[]; vector?: number[] } {
  const values = eigenvalues(s.A);
  return s.mode === 'vector' ? { values, vector: eigenvector(s.A, s.lambda!) } : { values };
}
