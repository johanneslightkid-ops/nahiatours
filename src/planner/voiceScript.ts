import type { PlannerCopy } from './copy';
import type { FlowCopy } from './flowCopy';
import {
  ADULT_AGES,
  AIMS,
  BUDGETS,
  CONSTRAINTS,
  DAY_SHAPES,
  INTERESTS,
  OCCASIONS,
  partyOrder,
  StepId,
  TRANSPORTS,
} from './questions';
import { spokenList, VoiceOption } from './voice';

/**
 * Everything the voice guide says, as data.
 *
 * One function decides the words for each question, so the guide on the page
 * and the list of clips handed to whoever records them can never drift apart.
 * Every line has a stable id; a recorded clip is stored as
 * /audio/planner/<locale>/<id>.mp3 and played instead of the synthesiser
 * whenever it exists.
 */
export interface StepVoice {
  /** Clip id of the question as read aloud. */
  id: string;
  script: string;
  options: VoiceOption[];
  wantsNumber?: boolean;
}

const CHOICE_IDS: Partial<Record<StepId, readonly string[]>> = {
  adultAge: ADULT_AGES,
  aim: AIMS,
  dayShape: DAY_SHAPES,
  budget: BUDGETS,
  transport: TRANSPORTS,
  occasion: OCCASIONS,
};

export const stepVoice = (stepId: StepId, copy: PlannerCopy, flow: FlowCopy, locale: string): StepVoice => {
  const q = copy.questions as Record<string, any>;
  // A question read aloud needs to end like a sentence before the next one.
  const raw = String(q[stepId]?.title ?? '').trim();
  const title = /[.?!…]$/.test(raw) ? raw : `${raw}.`;
  const list = (labels: string[]) => `${flow.voice.youCanSay}: ${spokenList(labels, flow.voice.or)}`;
  const say = (labels: string[]) => `${list(labels)}.`;
  const id = `q-${stepId}`;

  const ids = stepId === 'partyType' ? partyOrder(locale) : CHOICE_IDS[stepId];
  if (ids) {
    const options = ids.map((key) => ({ id: key, label: String(q[stepId].options[key].label) }));
    return { id, script: `${title} ${say(options.map((o) => o.label))}`, options };
  }

  switch (stepId) {
    case 'interests': {
      const options = INTERESTS.map((key) => ({ id: key, label: copy.interests[key].label }));
      return { id, script: `${title} ${say(options.map((o) => o.label))} ${flow.voice.multiDone}`, options };
    }
    case 'constraints': {
      const options = CONSTRAINTS.map((key) => ({ id: key, label: copy.questions.constraints.options[key].label }));
      return { id, script: `${title} ${list(options.map((o) => o.label))}, ${flow.voice.constraintsNone}`, options };
    }
    case 'energy': {
      const options = copy.questions.energy.scale.map((step, index) => ({ id: String(index + 1), label: step.label }));
      return { id, script: `${title} ${say(options.map((o) => o.label))}`, options, wantsNumber: true };
    }
    case 'days':
      return { id, script: `${title} ${flow.voice.days}`, options: [], wantsNumber: true };
    case 'headcount':
      return { id, script: `${title} ${flow.voice.counts}`, options: [] };
    default:
      return { id, script: `${title} ${flow.voice.logistics}`, options: [] };
  }
};

/** Short lines the guide says between questions. */
export const feedbackLines = (copy: PlannerCopy, flow: FlowCopy): Array<{ id: string; text: string }> => [
  { id: 'fb-didnt-catch', text: flow.voice.didntCatch },
  { id: 'fb-pick-one', text: /[.!?]$/.test(copy.ui.pickAtLeastOne) ? copy.ui.pickAtLeastOne : `${copy.ui.pickAtLeastOne}.` },
];

/**
 * Fingerprint of a line's wording (FNV-1a). A recording is listed in the
 * manifest with the fingerprint of the words it was made from, so when the
 * copy changes the stale clip is skipped and the synthesiser reads the new
 * words until the line is recorded again.
 */
export const lineHash = (text: string): string => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

/** A ticked multi-select answer is confirmed by saying its label. */
export const echoId = (stepId: StepId, optionId: string) => `echo-${stepId}-${optionId}`;

/** Every clip for one language, in the order a recording session would take them. */
export const allVoiceLines = (
  steps: StepId[],
  copy: PlannerCopy,
  flow: FlowCopy,
  locale: string
): Array<{ id: string; text: string }> => {
  const lines: Array<{ id: string; text: string }> = [];
  for (const step of steps) {
    const voice = stepVoice(step, copy, flow, locale);
    lines.push({ id: voice.id, text: voice.script });
    if (step === 'interests' || step === 'constraints') {
      voice.options.forEach((option) => lines.push({ id: echoId(step, option.id), text: option.label }));
    }
  }
  return [...lines, ...feedbackLines(copy, flow)];
};
