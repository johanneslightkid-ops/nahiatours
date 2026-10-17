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
import type { VoiceOption } from './voice';

/**
 * Everything the voice guide says, as data.
 *
 * One function decides the words for each question, so the guide on the page
 * and the list of clips handed to whoever records them can never drift apart.
 *
 * A question is read as a sequence of segments — the question itself, then
 * each option on its own, then any closing instruction — so the page always
 * knows which option is being spoken and can show it. Every segment has a
 * stable id; a recorded clip is stored as /audio/planner/<locale>/<id>.mp3
 * and played instead of the synthesiser whenever it exists.
 */
export interface VoiceSegment {
  id: string;
  text: string;
  /** Set while an option is being read, so the page can point at it. */
  optionId?: string;
}

export interface StepVoice {
  segments: VoiceSegment[];
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

/** The clip of one option's label, also used to confirm a ticked answer. */
export const optionId = (stepId: StepId, option: string) => `opt-${stepId}-${option}`;

export const stepVoice = (stepId: StepId, copy: PlannerCopy, flow: FlowCopy, locale: string): StepVoice => {
  const q = copy.questions as Record<string, any>;
  // A question read aloud needs to end like a sentence before the next one.
  const raw = String(q[stepId]?.title ?? '').trim();
  const title = /[.?!…]$/.test(raw) ? raw : `${raw}.`;
  const intro = { id: `q-${stepId}` };

  // "You can say:" then each option, the last one joined with "or".
  const listed = (options: VoiceOption[], closing?: string): VoiceSegment[] => [
    { ...intro, text: `${title} ${flow.voice.youCanSay}:` },
    ...options.map((option, index) =>
      index === options.length - 1 && options.length > 1
        ? { id: `${optionId(stepId, option.id)}-or`, text: `${flow.voice.or} ${option.label}.`, optionId: option.id }
        : { id: optionId(stepId, option.id), text: `${option.label},`, optionId: option.id }
    ),
    ...(closing ? [{ id: `q-${stepId}-end`, text: closing }] : []),
  ];

  const ids = stepId === 'partyType' ? partyOrder(locale) : CHOICE_IDS[stepId];
  if (ids) {
    const options = ids.map((key) => ({ id: key, label: String(q[stepId].options[key].label) }));
    return { segments: listed(options), options };
  }

  switch (stepId) {
    case 'interests': {
      const options = INTERESTS.map((key) => ({ id: key, label: copy.interests[key].label }));
      return { segments: listed(options, flow.voice.multiDone), options };
    }
    case 'constraints': {
      const options = CONSTRAINTS.map((key) => ({ id: key, label: copy.questions.constraints.options[key].label }));
      const none = flow.voice.constraintsNone.charAt(0).toUpperCase() + flow.voice.constraintsNone.slice(1);
      return { segments: listed(options, none), options };
    }
    case 'energy': {
      const options = copy.questions.energy.scale.map((step, index) => ({ id: String(index + 1), label: step.label }));
      return { segments: listed(options), options, wantsNumber: true };
    }
    case 'days':
      return { segments: [{ ...intro, text: `${title} ${flow.voice.days}` }], options: [], wantsNumber: true };
    case 'headcount':
      return { segments: [{ ...intro, text: `${title} ${flow.voice.counts}` }], options: [] };
    default:
      return { segments: [{ ...intro, text: `${title} ${flow.voice.logistics}` }], options: [] };
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
export const echoLine = (stepId: StepId, option: VoiceOption): VoiceSegment => ({
  id: optionId(stepId, option.id),
  text: `${option.label},`,
  optionId: option.id,
});

/** Every clip for one language, in the order a recording session would take them. */
export const allVoiceLines = (
  steps: StepId[],
  copy: PlannerCopy,
  flow: FlowCopy,
  locale: string
): Array<{ id: string; text: string }> => {
  const seen = new Map<string, string>();
  const add = (id: string, text: string) => {
    if (!seen.has(id)) seen.set(id, text);
  };
  for (const step of steps) {
    const voice = stepVoice(step, copy, flow, locale);
    voice.segments.forEach((segment) => add(segment.id, segment.text));
    if (step === 'interests' || step === 'constraints') {
      voice.options.forEach((option) => {
        const echo = echoLine(step, option);
        add(echo.id, echo.text);
      });
    }
  }
  feedbackLines(copy, flow).forEach((line) => add(line.id, line.text));
  return [...seen.entries()].map(([id, text]) => ({ id, text }));
};
