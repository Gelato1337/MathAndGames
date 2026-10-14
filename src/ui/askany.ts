import { generateLA, isStepTopic } from '../math/linalg';
import { generate, type Topic } from '../math/problems';
import { generateDrag } from '../math/trig';
import { askAngle } from './askangle';
import { ask } from './question';
import { askSteps, type StepsOpts, type StepsResult } from './steps';

/** Topics answered by turning the Trig Lens instead of typing. */
export function isDragTopic(topic: Topic): boolean {
  return topic === 'trig_drag';
}

/** Ask one problem of any kind (typed, step puzzle, or drag-the-beam). */
export async function askProblem(topic: Topic, level: number, opts: StepsOpts = {}): Promise<StepsResult> {
  if (isDragTopic(topic)) return askAngle(generateDrag(level), opts);
  if (isStepTopic(topic)) return askSteps(generateLA(topic, level), opts);
  const r = await ask(generate(topic, level), { title: opts.title, story: opts.story, tag: opts.tag, seconds: opts.seconds, quick: opts.quick, hint: opts.hint ?? !opts.seconds });
  return { correct: r.correct, stepsRight: 0, steps: 0, ms: r.ms, timedOut: r.timedOut };
}
