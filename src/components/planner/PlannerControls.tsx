import React from 'react';
import type { IconType } from 'react-icons';
import { HiCheck, HiMinus, HiPlus } from 'react-icons/hi';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';
import { haptic, HAPTIC } from '../../planner/haptics';

interface OptionCardProps {
  /** Lets the voice guide find and light up this option while reading it. */
  voiceId?: string;
  emoji: string;
  /** Drawn in place of the emoji when there is one (src/planner/icons.ts). */
  icon?: IconType;
  label: string;
  description?: string;
  selected: boolean;
  index?: number;
  onSelect: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  voiceId,
  emoji,
  icon: Icon,
  label,
  description,
  selected,
  index,
  onSelect,
}) => (
  <button
    type="button"
    data-selected={selected}
    data-voice-option={voiceId}
    className="planner-option group"
    onMouseEnter={() => playHoverFx()}
    onClick={() => {
      playClickFx();
      haptic(HAPTIC.tap);
      onSelect();
    }}
    aria-pressed={selected}
  >
    <span className="planner-option-icon" aria-hidden="true">
      {Icon ? <Icon className="h-6 w-6" strokeWidth={1.6} /> : emoji}
    </span>

    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="font-display text-lg font-bold leading-tight text-paper">{label}</span>
      </span>
      {description && (
        <span className="mt-1 block text-sm leading-relaxed text-paper/85">{description}</span>
      )}
    </span>

    <span className="ml-1 shrink-0 self-center">
      {selected ? (
        <span className="grid h-7 w-7 place-items-center rounded-[3px] bg-ink text-mango">
          <HiCheck className="h-4 w-4" />
        </span>
      ) : (
        typeof index === 'number' && (
          <span className="planner-key hidden sm:inline-grid">{index}</span>
        )
      )}
    </span>
  </button>
);

interface ChipToggleProps {
  voiceId?: string;
  emoji?: string;
  icon?: IconType;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export const ChipToggle: React.FC<ChipToggleProps> = ({
  voiceId,
  emoji,
  icon: Icon,
  label,
  selected,
  disabled = false,
  onToggle,
}) => (
  <button
    type="button"
    data-selected={selected}
    data-voice-option={voiceId}
    disabled={disabled && !selected}
    className="planner-chip disabled:cursor-not-allowed disabled:opacity-35"
    onMouseEnter={() => playHoverFx()}
    onClick={() => {
      playClickFx();
      haptic(HAPTIC.tap);
      onToggle();
    }}
    aria-pressed={selected}
  >
    {Icon ? <Icon className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.7} aria-hidden="true" /> : emoji && <span className="text-base leading-none">{emoji}</span>}
    <span>{label}</span>
  </button>
);

interface CountStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  suffix?: string;
}

export const CountStepper: React.FC<CountStepperProps> = ({
  label,
  value,
  min = 0,
  max = 30,
  onChange,
  suffix,
}) => {
  const set = (next: number) => {
    playClickFx();
      haptic(HAPTIC.tap);
    onChange(Math.min(max, Math.max(min, next)));
  };

  return (
    <div className="planner-panel-soft flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm font-bold uppercase tracking-[0.14em] text-paper/85">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set(value - 1)}
          disabled={value <= min}
          aria-label={`− ${label}`}
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper/25 bg-paper/10 text-paper transition hover:border-lagoon-light hover:bg-lagoon-light/20 disabled:opacity-30"
        >
          <HiMinus className="h-4 w-4" />
        </button>
        <span className="min-w-[3.5rem] text-center font-display text-3xl font-bold text-paper tabular-nums">
          {value}
          {suffix && <span className="ml-1 text-base font-semibold text-paper/60">{suffix}</span>}
        </span>
        <button
          type="button"
          onClick={() => set(value + 1)}
          disabled={value >= max}
          aria-label={`+ ${label}`}
          className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper/25 bg-paper/10 text-paper transition hover:border-lagoon-light hover:bg-lagoon-light/20 disabled:opacity-30"
        >
          <HiPlus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface EnergyScaleProps {
  value: number;
  steps: Array<{ label: string; desc: string }>;
  onChange: (value: number) => void;
}

export const EnergyScale: React.FC<EnergyScaleProps> = ({ value, steps, onChange }) => {
  const active = steps[value - 1];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-2 sm:gap-3">
        {steps.map((step, index) => {
          const level = index + 1;
          const isActive = level === value;
          const isPassed = level <= value;

          return (
            <button
              key={step.label}
              type="button"
              onMouseEnter={() => playHoverFx()}
              onClick={() => {
                playClickFx();
      haptic(HAPTIC.tap);
                onChange(level);
              }}
              aria-label={step.label}
              aria-pressed={isActive}
              data-voice-option={String(level)}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl border px-1 py-3 transition-all duration-300 ${
                  isActive
                  ? 'border-lagoon-light bg-lagoon-light/20'
                  : 'border-paper/25 bg-paper/5 hover:border-lagoon-light hover:bg-paper/10'
              }`}
            >
              <span
                className={`block w-full rounded-full transition-all duration-300 ${
                    isPassed ? 'bg-mango' : 'bg-paper/20'
                }`}
                style={{ height: `${14 + index * 10}px` }}
              />
              <span
                className={`text-[0.6rem] font-bold uppercase tracking-wider ${
                    isActive ? 'text-lagoon-light' : 'text-paper/60'
                }`}
              >
                {level}
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="planner-panel-soft px-5 py-4 text-center">
          <div className="font-display text-xl font-bold text-paper">{active.label}</div>
          <div className="mt-1 text-sm text-paper/85">{active.desc}</div>
        </div>
      )}
    </div>
  );
};
