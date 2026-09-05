import React, { useState } from 'react';

interface Props {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
  className?: string;
  ariaLabel?: string;
}

const MobileNumberPicker: React.FC<Props> = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100,
  label,
  className = '',
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const current = value ?? 0;

  const handleChange = (newValue: number) => {
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, newValue));
    onChange(clamped);
  };

  const increment = () => handleChange(current + (step ?? 1));
  const decrement = () => handleChange(current - (step ?? 1));

  return (
    <div className={`w-full ${className}`}>
      <label className="mb-1.5 block text-xs font-medium text-ink-light">
        {label}
      </label>

      <div
        onClick={() => setIsOpen(true)}
        className="relative w-full cursor-pointer rounded-2xl border-2 border-ink bg-white px-4 py-4 text-base transition focus-within:bg-lagoon-light"
      >
        <div className="flex items-center justify-between">
          <span className="text-ink-soft font-semibold text-xl">{current}</span>
          <span className="text-ink-light">⬍</span>
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:items-center md:justify-center" onClick={() => setIsOpen(false)}>
          <div className="w-full rounded-t-3xl bg-white px-6 py-8 md:max-w-sm md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-6 text-lg font-semibold text-ink-soft">{label}</h3>

            <div className="mb-8 flex items-center justify-center gap-6">
              <button
                onClick={decrement}
                className="flex h-24 w-24 items-center justify-center rounded-2xl bg-paper-warm text-4xl font-bold text-ink-soft active:bg-slate-200 transition hover:bg-slate-200"
                aria-label={`${ariaLabel} decrease`}
              >
                −
              </button>

              <div className="flex flex-col items-center gap-2">
                <div className="text-6xl font-bold text-lagoon-dark">{current}</div>
                <div className="text-sm text-ink-light">{label}</div>
              </div>

              <button
                onClick={increment}
                className="flex h-24 w-24 items-center justify-center rounded-2xl bg-paper-warm text-4xl font-bold text-ink-soft active:bg-slate-200 transition hover:bg-slate-200"
                aria-label={`${ariaLabel} increase`}
              >
                +
              </button>
            </div>

            {max !== undefined && max <= 10 && (
              <div className="mb-6 grid grid-cols-5 gap-2">
                {Array.from({ length: Math.min(10, (max ?? 10) + 1) }, (_, i) => i).map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleChange(num);
                      setIsOpen(false);
                    }}
                    className={`rounded-lg px-3 py-3 font-semibold text-sm transition ${
 current === num ? 'bg-lagoon text-white' : 'bg-paper-warm text-ink-soft hover:bg-slate-200'
 }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            )}

            <div className="mb-6">
              <input
                type="number"
                value={current}
                onChange={(e) => {
                  const num = parseInt(e.target.value, 10);
                  if (!isNaN(num)) handleChange(num);
                }}
                min={min}
                max={max}
                className="w-full rounded-lg border border-ink/20 px-4 py-3 text-center text-lg font-semibold focus:bg-lagoon-light focus:outline-none"
                inputMode="numeric"
              />
              {min !== undefined && max !== undefined && (
                <p className="mt-2 text-xs text-ink-light text-center">
                  Range: {min}–{max}
                </p>
              )}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full rounded-xl bg-lagoon px-4 py-4 font-bold text-white hover:bg-lagoon transition active:scale-[0.98]"
            >
              ✓ Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNumberPicker;
