import type { Topic } from './problems';

interface TopicStats {
  attempts: number;
  correct: number;
  recent: boolean[];
  totalMs: number;
}

const stats = new Map<Topic, TopicStats>();

function get(topic: Topic): TopicStats {
  let s = stats.get(topic);
  if (!s) {
    s = { attempts: 0, correct: 0, recent: [], totalMs: 0 };
    stats.set(topic, s);
  }
  return s;
}

export function record(topic: Topic, correct: boolean, ms: number): void {
  const s = get(topic);
  s.attempts++;
  if (correct) s.correct++;
  s.totalMs += ms;
  s.recent.push(correct);
  if (s.recent.length > 6) s.recent.shift();
}

/**
 * Difficulty level 1..3 for a topic, adapted from the player's recent answers.
 * Starts easy, climbs after a streak of correct answers, eases off after misses.
 */
export function level(topic: Topic): 1 | 2 | 3 {
  const s = get(topic);
  if (s.recent.length < 2) return 1;
  const rate = s.recent.filter(Boolean).length / s.recent.length;
  if (s.recent.length >= 4 && rate >= 0.85) return 3;
  if (rate >= 0.6) return 2;
  return 1;
}

export function summary(): { attempts: number; correct: number; topics: number } {
  let attempts = 0;
  let correct = 0;
  for (const s of stats.values()) {
    attempts += s.attempts;
    correct += s.correct;
  }
  return { attempts, correct, topics: stats.size };
}

export function resetMastery(): void {
  stats.clear();
}
