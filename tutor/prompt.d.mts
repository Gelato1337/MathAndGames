export interface TutorReq {
  lang: 'en' | 'fi';
  problem: string;
  context: string;
  hint: string;
  attempts: string[];
  level: number;
  messages: Array<{ role: 'student' | 'tutor'; text: string }>;
  question: string;
  retry: boolean;
}
export const LIMITS: { text: number; messages: number; attempts: number };
export function loadRules(file?: URL | string): string;
export function sanitizeRequest(body: unknown): TutorReq;
export function buildPrompt(req: TutorReq): string;
export function mockReply(req: { lang: string; level: number }): string;
