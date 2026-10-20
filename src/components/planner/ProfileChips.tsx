import React from 'react';
import { HiPencil } from 'react-icons/hi';
import { usePlanner } from '../../contexts/PlannerContext';
import { usePlannerCopy } from '../../planner/usePlannerCopy';
import type { StepId } from '../../planner/questions';
import { STEP_ICONS, optionIcon } from '../../planner/icons';

/** The answer's symbol, or its question's. */
const ChipIcon: React.FC<{ step: StepId; option?: string }> = ({ step, option }) => {
  const Icon = (option && optionIcon(step, option)) || STEP_ICONS[step];
  return <Icon className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />;
};

interface Chip {
  step: StepId;
  emoji: string;
  text: string;
  /** The answer's own key, where it has a symbol of its own (src/planner/icons.ts). */
  option?: string;
}

/**
 * The running answer summary. Every chip is a shortcut back to the question
 * that produced it, so nothing feels locked in.
 */
export const ProfileChips: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { profile, goToStep, steps } = usePlanner();
  const copy = usePlannerCopy();

  const available = new Set(steps.map((step) => step.id));
  const chips: Chip[] = [];

  if (profile.partyType) {
    const option = copy.questions.partyType.options[profile.partyType];
    chips.push({ step: 'partyType', emoji: option.emoji, text: option.label });
  }
  if (profile.adults + profile.children > 0 && available.has('headcount')) {
    chips.push({
      step: 'headcount',
      emoji: '👥',
      text: copy.result.priceFor(profile.adults, profile.children),
    });
  }
  if (profile.adultAge) {
    const option = copy.questions.adultAge.options[profile.adultAge];
    chips.push({ step: 'adultAge', emoji: option.emoji, text: option.label });
  }
  chips.push({
    step: 'energy',
    emoji: '🌡️',
    text: copy.questions.energy.scale[profile.energy - 1]?.label ?? '',
  });
  if (profile.interests.length > 0) {
    const shown = profile.interests.slice(0, 2).map((key) => copy.interests[key].label);
    const rest = profile.interests.length - shown.length;
    chips.push({
      step: 'interests',
      emoji: '💚',
      text: `${shown.join(', ')}${rest > 0 ? ` +${rest}` : ''}`,
    });
  }
  if (profile.aim) {
    chips.push({
      step: 'aim',
      emoji: copy.questions.aim.options[profile.aim].emoji,
      text: copy.questions.aim.options[profile.aim].label,
    });
  }
  if (profile.dayShape) {
    chips.push({
      step: 'dayShape',
      emoji: copy.questions.dayShape.options[profile.dayShape].emoji,
      text: copy.questions.dayShape.options[profile.dayShape].label,
    });
  }
  // "days" / "días" / "Tage" / "jours" → "day" / "día" / "Tag" / "jour" for one.
  const dayUnit = profile.days === 1 ? copy.questions.days.unit.replace(/(s|e)$/, '') : copy.questions.days.unit;
  chips.push({ step: 'days', emoji: '🗓️', text: `${profile.days} ${dayUnit}` });
  if (profile.budget) {
    chips.push({
      step: 'budget',
      emoji: copy.questions.budget.options[profile.budget].emoji,
      text: copy.questions.budget.options[profile.budget].label,
    });
  }
  if (profile.transport) {
    chips.push({
      step: 'transport',
      emoji: copy.questions.transport.options[profile.transport].emoji,
      text: copy.questions.transport.options[profile.transport].label,
    });
  }
  if (profile.occasion && profile.occasion !== 'none') {
    chips.push({
      step: 'occasion',
      emoji: copy.questions.occasion.options[profile.occasion].emoji,
      text: copy.questions.occasion.options[profile.occasion].label,
    });
  }
  profile.constraints.forEach((key) => {
    chips.push({
      step: 'constraints',
      option: key,
      emoji: copy.questions.constraints.options[key].emoji,
      text: copy.questions.constraints.options[key].label,
    });
  });

  if (chips.length === 0) return null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {!compact && (
        <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-paper/60">
          <HiPencil className="h-3.5 w-3.5" />
          {copy.ui.tapToEdit}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={`${chip.step}-${chip.text}`}
            type="button"
            onClick={() => goToStep(chip.step)}
            className="planner-chip !py-1.5 !text-xs"
            title={copy.ui.editAnswers}
          >
            <ChipIcon step={chip.step} option={chip.option} />
            <span className="max-w-[14rem] truncate">{chip.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
