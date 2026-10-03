// Prompt building and request validation for the Numerola tutor bridge.
// Kept free of Node-only APIs (except loadRules) so tests can import it.
import { readFileSync } from 'node:fs';

export const LIMITS = { text: 600, messages: 12, attempts: 12 };

export function loadRules(file = new URL('./rules.md', import.meta.url)) {
  return readFileSync(file, 'utf8');
}

const clip = (s, n = LIMITS.text) => String(s ?? '').slice(0, n);

/** Validate and normalise a /hint request body. Throws on bad input. */
export function sanitizeRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('body must be a JSON object');
  const lang = body.lang === 'fi' ? 'fi' : 'en';
  const problem = clip(body.problem);
  if (!problem.trim()) throw new Error('problem is required');
  const level = Math.min(3, Math.max(1, Math.round(Number(body.level) || 1)));
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-LIMITS.messages)
    .filter((m) => m && (m.role === 'student' || m.role === 'tutor'))
    .map((m) => ({ role: m.role, text: clip(m.text) }));
  const attempts = (Array.isArray(body.attempts) ? body.attempts : []).slice(-LIMITS.attempts).map((a) => clip(a, 40));
  return {
    lang,
    problem,
    context: clip(body.context),
    hint: clip(body.hint),
    attempts,
    level,
    messages,
    question: clip(body.question),
    retry: body.retry === true,
  };
}

/** The user-turn prompt sent to the model. The answer is never included. */
export function buildPrompt(req) {
  const language = req.lang === 'fi' ? 'Finnish (suomi)' : 'English';
  const lines = [
    `Reply in ${language}.`,
    `Help level: ${req.level} of 3.`,
    '',
    `Problem the player sees: ${req.problem}`,
  ];
  if (req.context) lines.push(`Game context: ${req.context}`);
  if (req.hint) lines.push(`Built-in hint already shown to the player: ${req.hint}`);
  if (req.attempts.length) lines.push(`The player's earlier tries: ${req.attempts.join('; ')}`);
  if (req.messages.length) {
    lines.push('', 'Conversation so far:');
    for (const m of req.messages) lines.push(`${m.role === 'student' ? 'Player' : 'Owl'}: ${m.text}`);
  }
  lines.push('', `Player: ${req.question || '(pressed the help button without typing anything)'}`);
  if (req.retry) {
    lines.push('', 'Your previous draft gave away the answer. Write a new reply that does not contain the answer or any value the player should type.');
  }
  lines.push('', 'Write only Owl\'s next reply.');
  return lines.join('\n');
}

/** Offline stand-in for testing the game without any AI installed. */
export function mockReply(req) {
  const en = [
    'Hoo! Let us look together. What is the problem asking you to find?',
    'Think of a balance scale: whatever you take off one side, take off the other too. What could you take away first?',
    'Try a smaller one first: if x + 2 = 5, what would you take from both sides? Now, what is the first step in your problem?',
  ];
  const fi = [
    'Huhuu! Katsotaan yhdessä. Mitä tehtävässä pyydetään löytämään?',
    'Ajattele vaakaa: mitä otat toiselta puolelta, ota myös toiselta. Mitä voisit ottaa pois ensin?',
    'Kokeile ensin pienempää: jos x + 2 = 5, mitä ottaisit molemmilta puolilta? Mikä on sinun tehtäväsi ensimmäinen askel?',
  ];
  return (req.lang === 'fi' ? fi : en)[req.level - 1];
}
