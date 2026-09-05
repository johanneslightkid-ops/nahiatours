import React from 'react';
import { HiCheck, HiMinus, HiPlus } from 'react-icons/hi';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

interface OptionCardProps {
  emoji: string;
  label: string;
  description?: string;
  selected: boolean;
  index?: number;
  onSelect: () => void;
}

export const OptionCard: React.FC<OptionCardProps> = ({
  emoji,
  label,
  description,
  selected,
  index,
  onSelect,
}) => (
  <button
    type="button"
    data-selected={selected}
    className="planner-option group"
    onMouseEnter={() => playHoverFx()}
    onClick={() => {
      playClickFx();
      onSelect();
    }}
    aria-pressed={selected}
  >
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-2xl ring-1 ring-white/15">
      {emoji}
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
        <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-300 text-slate-950">
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
  emoji?: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export const ChipToggle: React.FC<ChipToggleProps> = ({
  emoji,
  label,
  selected,
  disabled = false,
  onToggle,
}) => (
  <button
    type="button"
    data-selected={selected}
    disabled={disabled && !selected}
    className="planner-chip disabled:cursor-not-allowed disabled:opacity-35"
    onMouseEnter={() => playHoverFx()}
    onClick={() => {
      playClickFx();
      onToggle();
    }}
    aria-pressed={selected}
  >
    {emoji && <span className="text-base leading-none">{emoji}</span>}
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
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-paper transition hover:border-teal-300/70 hover:bg-lagoon-light/20 disabled:opacity-30"
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
          className="grid h-10 w-10 place-items-center rounded-full border border-white/20 bg-white/10 text-paper transition hover:border-teal-300/70 hover:bg-lagoon-light/20 disabled:opacity-30"
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
                onChange(level);
              }}
              aria-label={step.label}
              aria-pressed={isActive}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl border px-1 py-3 transition-all duration-300 ${
 isActive
                  ? 'border-teal-300/90 bg-lagoon-light/20'
                  : 'border-white/12 bg-white/5 hover:border-teal-300/50 hover:bg-white/10'
              }`}
            >
              <span
                className={`block w-full rounded-full transition-all duration-300 ${
 isPassed ? 'bg-gradient-to-t from-teal-400 to-amber-300' : 'bg-white/15'
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
