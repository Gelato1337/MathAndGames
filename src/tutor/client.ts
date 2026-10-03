import { getLang } from '../i18n';
import { leaksAnswer, redact } from './guard';

export interface TutorStatus {
  online: boolean;
  provider?: string;
}

export interface TutorMessage {
  role: 'student' | 'tutor';
  text: string;
}

export interface TutorRequest {
  problem: string;
  context?: string;
  hint?: string;
  attempts?: string[];
  level: number;
  messages: TutorMessage[];
  question: string;
}

function baseUrl(): string {
  try {
    const q = new URLSearchParams(location.search).get('tutor');
    if (q) return q.replace(/\/$/, '');
    const saved = localStorage.getItem('numerola.tutorUrl');
    if (saved) return saved.replace(/\/$/, '');
  } catch {
    // storage unavailable
  }
  return 'http://127.0.0.1:8787';
}

let status: TutorStatus = { online: false };

export function tutorStatus(): TutorStatus {
  return status;
}

/** Ping the local tutor bridge. Safe to call often; never throws. */
export async function checkTutor(): Promise<TutorStatus> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const r = await fetch(`${baseUrl()}/health`, { signal: ctrl.signal });
    clearTimeout(timer);
    const j = (await r.json()) as { ok?: boolean; provider?: string };
    status = { online: !!j.ok, provider: j.provider };
  } catch {
    status = { online: false };
  }
  return status;
}

async function post(req: TutorRequest, retry: boolean): Promise<string> {
  const r = await fetch(`${baseUrl()}/hint`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, lang: getLang(), retry }),
  });
  const j = (await r.json()) as { reply?: string; error?: string };
  if (!r.ok || !j.reply) throw new Error(j.error ?? `HTTP ${r.status}`);
  return j.reply;
}

/**
 * Ask the tutor. The answer stays inside the game: if a reply contains it
 * anyway, the tutor is asked once to rephrase, and as a last resort the
 * number is hidden.
 */
export async function askTutor(req: TutorRequest, answer: number): Promise<{ text: string; redacted: boolean }> {
  let text = await post(req, false);
  if (!leaksAnswer(text, answer, req.problem)) return { text, redacted: false };
  text = await post(req, true);
  if (!leaksAnswer(text, answer, req.problem)) return { text, redacted: false };
  return { text: redact(text, answer), redacted: true };
}
