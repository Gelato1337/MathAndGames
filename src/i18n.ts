import en from './lang/en.json';
import fi from './lang/fi.json';

export type Lang = 'en' | 'fi';
export type Params = Record<string, string | number>;

type Dict = { [key: string]: string | Dict };

const dictionaries: Record<Lang, Dict> = { en: en as Dict, fi: fi as Dict };
export const LANGS: Lang[] = ['en', 'fi'];

let current: Lang = 'en';
const listeners: Array<() => void> = [];

try {
  const saved = localStorage.getItem('numerola.lang');
  if (saved === 'en' || saved === 'fi') current = saved;
} catch {
  // storage unavailable; keep default
}

export function getLang(): Lang {
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem('numerola.lang', lang);
  } catch {
    // ignore
  }
  document.documentElement.lang = lang;
  listeners.forEach((fn) => fn());
}

export function onLangChange(fn: () => void): void {
  listeners.push(fn);
}

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function has(key: string): boolean {
  return lookup(dictionaries[current], key) !== undefined || lookup(dictionaries.en, key) !== undefined;
}

/** Format a number for the current language (Finnish uses a decimal comma). */
export function fmtNum(n: number): string {
  if (Number.isInteger(n)) return n < 0 ? `−${Math.abs(n)}` : String(n);
  const s = (Math.round(n * 1000) / 1000).toString();
  const out = current === 'fi' ? s.replace('.', ',') : s;
  return out.startsWith('-') ? `−${out.slice(1)}` : out;
}

/** Translate a key. `{name}` placeholders are filled from params. */
export function t(key: string, params?: Params): string {
  const raw = lookup(dictionaries[current], key) ?? lookup(dictionaries.en, key) ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    if (v === undefined) return m;
    return typeof v === 'number' ? fmtNum(v) : v;
  });
}
