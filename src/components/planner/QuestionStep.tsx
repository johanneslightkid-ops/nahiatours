import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiArrowRight } from 'react-icons/hi';
import { usePlanner } from '../../contexts/PlannerContext';
import { usePlannerCopy } from '../../planner/usePlannerCopy';
import {
  ADULT_AGES,
  AIMS,
  BUDGETS,
  CONSTRAINTS,
  DAY_SHAPES,
  INTERESTS,
  KID_AGES,
  MAX_INTERESTS,
  OCCASIONS,
  PARTY_TYPES,
  TRANSPORTS,
} from '../../planner/questions';
import type { ConstraintKey, KidAgeBand, TravelProfile } from '../../planner/types';
import type { InterestKey } from '../../planner/tourProfiles';
import { ChipToggle, CountStepper, EnergyScale, OptionCard } from './PlannerControls';
import { playClickFx } from '../../lib/soundEngine';

interface OptionEntry {
  id: string;
  label: string;
  desc?: string;
  emoji: string;
}

export const QuestionStep: React.FC = () => {
  const { profile, currentStep, setAnswer, patchProfile, goNext, goBack, stepIndex, steps } =
    usePlanner();
  const copy = usePlannerCopy();

  const stepId = currentStep?.id;
  const questionCopy = stepId ? (copy.questions as Record<string, any>)[stepId] : undefined;

  /** Single-choice steps share one shape, so they share one renderer. */
  const choice = useMemo((): {
    entries: OptionEntry[];
    value?: string;
    select: (id: string) => void;
  } | null => {
    const build = (ids: readonly string[], options: Record<string, any>): OptionEntry[] =>
      ids.map((id) => ({ id, ...options[id] }));

    switch (stepId) {
      case 'partyType':
        return {
          entries: build(PARTY_TYPES, copy.questions.partyType.options),
          value: profile.partyType,
          select: (id) => setAnswer('partyType', id as TravelProfile['partyType']),
        };
      case 'adultAge':
        return {
          entries: build(ADULT_AGES, copy.questions.adultAge.options),
          value: profile.adultAge,
          select: (id) => setAnswer('adultAge', id as TravelProfile['adultAge']),
        };
      case 'aim':
        return {
          entries: build(AIMS, copy.questions.aim.options),
          value: profile.aim,
          select: (id) => setAnswer('aim', id as TravelProfile['aim']),
        };
      case 'dayShape':
        return {
          entries: build(DAY_SHAPES, copy.questions.dayShape.options),
          value: profile.dayShape,
          select: (id) => setAnswer('dayShape', id as TravelProfile['dayShape']),
        };
      case 'budget':
        return {
          entries: build(BUDGETS, copy.questions.budget.options),
          value: profile.budget,
          select: (id) => setAnswer('budget', id as TravelProfile['budget']),
        };
      case 'transport':
        return {
          entries: build(TRANSPORTS, copy.questions.transport.options),
          value: profile.transport,
          select: (id) => setAnswer('transport', id as TravelProfile['transport']),
        };
      case 'occasion':
        return {
          entries: build(OCCASIONS, copy.questions.occasion.options),
          value: profile.occasion,
          select: (id) => setAnswer('occasion', id as TravelProfile['occasion']),
        };
      default:
        return null;
    }
  }, [stepId, copy, profile, setAnswer]);

  const toggleInterest = useCallback(
    (key: InterestKey) => {
      const selected = profile.interests.includes(key);
      if (selected) {
        setAnswer('interests', profile.interests.filter((item) => item !== key));
      } else if (profile.interests.length < MAX_INTERESTS) {
        setAnswer('interests', [...profile.interests, key]);
      }
    },
    [profile.interests, setAnswer]
  );

  const toggleConstraint = useCallback(
    (key: ConstraintKey) => {
      const selected = profile.constraints.includes(key);
      setAnswer(
        'constraints',
        selected ? profile.constraints.filter((item) => item !== key) : [...profile.constraints, key]
      );
    },
    [profile.constraints, setAnswer]
  );

  const toggleKidAge = useCallback(
    (key: KidAgeBand) => {
      const selected = profile.kidAges.includes(key);
      setAnswer(
        'kidAges',
        selected ? profile.kidAges.filter((item) => item !== key) : [...profile.kidAges, key]
      );
    },
    [profile.kidAges, setAnswer]
  );

  const canContinue = currentStep
    ? currentStep.optional || currentStep.isAnswered(profile)
    : false;

  // A pending auto-advance must be cancellable: tapping an option and then
  // hitting Continue used to fire goNext twice and skip a question.
  const advanceTimer = useRef<number | null>(null);

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current !== null) {
      window.clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  useEffect(() => clearAdvance, [clearAdvance]);

  const advance = useCallback(() => {
    clearAdvance();
    goNext();
  }, [clearAdvance, goNext]);

  const handleSelect = useCallback(
    (id: string) => {
      choice?.select(id);
      if (currentStep?.autoAdvance) {
        clearAdvance();
        advanceTimer.current = window.setTimeout(() => {
          advanceTimer.current = null;
          goNext();
        }, 260);
      }
    },
    [choice, currentStep, goNext, clearAdvance]
  );

  // Keyboard: 1–9 picks an option, Enter continues, ← goes back.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      // Enter still advances while typing a date or hotel name; digits do not.
      if (event.key === 'Enter' && canContinue) {
        event.preventDefault();
        if (typing) (target as HTMLInputElement).blur();
        playClickFx();
        advance();
        return;
      }
      if (typing) return;

      if (event.key === 'ArrowLeft' && stepIndex > 0) {
        event.preventDefault();
        clearAdvance();
        goBack();
        return;
      }

      const digit = Number(event.key);
      if (!Number.isInteger(digit) || digit < 1) return;

      if (choice && choice.entries[digit - 1]) {
        event.preventDefault();
        playClickFx();
        handleSelect(choice.entries[digit - 1].id);
      } else if (stepId === 'interests' && INTERESTS[digit - 1]) {
        event.preventDefault();
        toggleInterest(INTERESTS[digit - 1]);
      } else if (stepId === 'constraints' && CONSTRAINTS[digit - 1]) {
        event.preventDefault();
        toggleConstraint(CONSTRAINTS[digit - 1]);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [advance, canContinue, choice, clearAdvance, goBack, handleSelect, stepId, stepIndex, toggleConstraint, toggleInterest]);

  if (!currentStep || !questionCopy) return null;

  return (
    <motion.div
      key={currentStep.id}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="planner-panel px-5 py-7 sm:px-9 sm:py-10"
    >
      <header className="mb-7">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full border-2 border-lagoon-light/50 bg-lagoon-light/20 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-lagoon-light">
            {copy.ui.stepOf(stepIndex + 1, steps.length)}
          </span>
          {currentStep.optional && (
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-paper/60">
              {copy.ui.optional}
            </span>
          )}
        </div>
        <h2 className="font-display text-2xl font-bold leading-tight text-paper sm:text-4xl">
          {questionCopy.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/85 sm:text-base">
          {questionCopy.hint}
        </p>
      </header>

      {/* ── Single choice ─────────────────────────────────────────────── */}
      {choice && (
        <div className="grid gap-3 sm:grid-cols-2">
          {choice.entries.map((entry, index) => (
            <OptionCard
              key={entry.id}
              emoji={entry.emoji}
              label={entry.label}
              description={entry.desc}
              index={index + 1}
              selected={choice.value === entry.id}
              onSelect={() => handleSelect(entry.id)}
            />
          ))}
        </div>
      )}

      {/* ── Interests ─────────────────────────────────────────────────── */}
      {stepId === 'interests' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {INTERESTS.map((key) => (
              <ChipToggle
                key={key}
                emoji={copy.interests[key].emoji}
                label={copy.interests[key].label}
                selected={profile.interests.includes(key)}
                disabled={profile.interests.length >= MAX_INTERESTS}
                onToggle={() => toggleInterest(key)}
              />
            ))}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/60">
            {profile.interests.length === 0
              ? copy.ui.pickAtLeastOne
              : `${copy.ui.selected}: ${profile.interests.length}/${MAX_INTERESTS}`}
          </p>
        </div>
      )}

      {/* ── Constraints ───────────────────────────────────────────────── */}
      {stepId === 'constraints' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {CONSTRAINTS.map((key, index) => (
            <OptionCard
              key={key}
              emoji={copy.questions.constraints.options[key].emoji}
              label={copy.questions.constraints.options[key].label}
              description={copy.questions.constraints.options[key].desc}
              index={index + 1}
              selected={profile.constraints.includes(key)}
              onSelect={() => toggleConstraint(key)}
            />
          ))}
        </div>
      )}

      {/* ── Headcount ─────────────────────────────────────────────────── */}
      {stepId === 'headcount' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <CountStepper
              label={copy.ui.adults}
              value={profile.adults}
              min={1}
              max={30}
              onChange={(value) => setAnswer('adults', value)}
            />
            <CountStepper
              label={copy.ui.children}
              value={profile.children}
              min={0}
              max={20}
              onChange={(value) => {
                setAnswer('children', value);
                if (value === 0) setAnswer('kidAges', []);
              }}
            />
          </div>

          {profile.children > 0 && (
            <div className="planner-panel-soft space-y-3 px-5 py-4">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-paper/85">
                {copy.ui.kidsAges}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {KID_AGES.map((band) => (
                  <ChipToggle
                    key={band}
                    label={
                      band === 'toddler'
                        ? '0–3'
                        : band === 'child'
                        ? '4–7'
                        : band === 'tween'
                        ? '8–12'
                        : '13–17'
                    }
                    selected={profile.kidAges.includes(band)}
                    onToggle={() => toggleKidAge(band)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Energy ────────────────────────────────────────────────────── */}
      {stepId === 'energy' && (
        <EnergyScale
          value={profile.energy}
          steps={copy.questions.energy.scale}
          onChange={(value) => setAnswer('energy', value)}
        />
      )}

      {/* ── Days ──────────────────────────────────────────────────────── */}
      {stepId === 'days' && (
        <CountStepper
          label={copy.questions.days.unit}
          value={profile.days}
          min={1}
          max={5}
          onChange={(value) => setAnswer('days', value)}
        />
      )}

      {/* ── Logistics ─────────────────────────────────────────────────── */}
      {stepId === 'logistics' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="planner-panel-soft block space-y-2 px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/85">
              {copy.questions.logistics.dateLabel}
            </span>
            <input
              type="date"
              value={profile.startDate ?? ''}
              onChange={(event) => patchProfile({ startDate: event.target.value })}
              className="w-full rounded-xl border-2 border-paper/30 bg-paper/10 px-4 py-2.5 text-sm font-semibold text-paper outline-none transition focus:border-lagoon-light"
            />
          </label>
          <label className="planner-panel-soft block space-y-2 px-5 py-4">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-paper/85">
              {copy.questions.logistics.zoneLabel}
            </span>
            <input
              type="text"
              value={profile.pickupZone ?? ''}
              placeholder={copy.questions.logistics.zonePlaceholder}
              onChange={(event) => patchProfile({ pickupZone: event.target.value })}
              className="w-full rounded-xl border-2 border-paper/30 bg-paper/10 px-4 py-2.5 text-sm font-semibold text-paper placeholder:text-paper/60 outline-none transition focus:border-lagoon-light"
            />
          </label>
        </div>
      )}

      {/* ── Footer nav ────────────────────────────────────────────────── */}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-paper/20 pt-6">
        <button
          type="button"
          onClick={() => {
            playClickFx();
            clearAdvance();
            goBack();
          }}
          disabled={stepIndex === 0}
          className="planner-cta-ghost disabled:cursor-not-allowed disabled:opacity-30"
        >
          <HiArrowLeft className="h-4 w-4" /> {copy.ui.back}
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden text-[0.7rem] font-medium text-paper/60 lg:block">
            {copy.ui.keyboardHint}
          </span>
          <button
            type="button"
            onClick={() => {
              playClickFx();
              advance();
            }}
            disabled={!canContinue}
            className="planner-cta disabled:cursor-not-allowed disabled:opacity-40"
          >
            {stepIndex === steps.length - 1 ? copy.ui.seePlan : copy.ui.next}
            <HiArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </motion.div>
  );
};
