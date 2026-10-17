import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { HiArrowLeft, HiArrowRight, HiLightBulb } from 'react-icons/hi';
import { usePlanner } from '../../contexts/PlannerContext';
import { useI18n } from '../../contexts/I18nContext';
import { usePlannerCopy } from '../../planner/usePlannerCopy';
import { getFlowCopy } from '../../planner/flowCopy';
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
  partyOrder,
  TRANSPORTS,
} from '../../planner/questions';
import type { ConstraintKey, KidAgeBand, TravelProfile } from '../../planner/types';
import type { InterestKey } from '../../planner/tourProfiles';
import { spokenList, VoiceMatch, VoiceOption } from '../../planner/voice';
import { ChipToggle, CountStepper, EnergyScale, OptionCard } from './PlannerControls';
import { VoiceGuide, VoiceOutcome } from './VoiceGuide';
import { playClickFx } from '../../lib/soundEngine';

interface OptionEntry {
  id: string;
  label: string;
  desc?: string;
  emoji: string;
}

/** "Saona Island: Paradise Found" → "Saona Island". */
const shortTitle = (title: string) => title.split(/\s*[:–—]\s+/)[0] || title;

/**
 * The plan as it stands, under the question. Every answer visibly moves it,
 * which is the whole reason to keep answering.
 */
const TakingShape: React.FC<{ spark?: string }> = ({ spark }) => {
  const { plan, profile } = usePlanner();
  const { locale } = useI18n();
  const flow = getFlowCopy(locale);
  const items = profile.partyType ? (plan?.days.flatMap((day) => day.items) ?? []).slice(0, 4) : [];

  return (
    <div className="planner-panel-soft mt-7 px-4 py-4 sm:px-5">
      <p className="text-[0.66rem] font-extrabold uppercase tracking-[0.18em] text-lagoon-light">
        {flow.takingShape}
      </p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-paper/70">{flow.takingShapeEmpty}</p>
      ) : (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {items.map((item, index) => (
            <motion.span
              key={item.entry.profile.key}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-paper/10 px-3 py-1.5 text-xs font-bold text-paper"
            >
              <span className="text-base leading-none">{item.entry.profile.emoji}</span>
              <span className="truncate">{shortTitle(item.entry.tour.title)}</span>
            </motion.span>
          ))}
        </div>
      )}
      {spark && <p className="mt-3 border-t border-paper/15 pt-3 text-xs leading-relaxed text-paper/75">🌴 {spark}</p>}
    </div>
  );
};

export const QuestionStep: React.FC = () => {
  const { profile, currentStep, setAnswer, patchProfile, goNext, goBack, stepIndex, steps, refining } =
    usePlanner();
  const copy = usePlannerCopy();
  const { locale } = useI18n();
  const flow = getFlowCopy(locale);

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
          entries: build(partyOrder(locale), copy.questions.partyType.options),
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
  }, [stepId, copy, profile, setAnswer, locale]);

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

  const finishWithNothing = useCallback(() => {
    setAnswer('constraints', []);
    advance();
  }, [advance, setAnswer]);

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

      if (event.key === 'ArrowLeft' && (stepIndex > 0 || refining)) {
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
  }, [advance, canContinue, choice, clearAdvance, goBack, handleSelect, refining, stepId, stepIndex, toggleConstraint, toggleInterest]);

  // ── Voice: what to read, what to listen for, what an answer does ─────────
  const voice = useMemo((): { script: string; options: VoiceOption[]; wantsNumber?: boolean } => {
    if (!stepId || !questionCopy) return { script: '', options: [] };
    const say = (labels: string[]) => `${flow.voice.youCanSay}: ${spokenList(labels, flow.voice.or)}.`;
    const title = String(questionCopy.title);

    if (choice) {
      const options = choice.entries.map((entry) => ({ id: entry.id, label: entry.label }));
      return { script: `${title} ${say(options.map((o) => o.label))}`, options };
    }
    switch (stepId) {
      case 'interests': {
        const options = INTERESTS.map((key) => ({ id: key, label: copy.interests[key].label }));
        return { script: `${title} ${say(options.map((o) => o.label))} ${flow.voice.multiDone}`, options };
      }
      case 'constraints': {
        const options = CONSTRAINTS.map((key) => ({ id: key, label: copy.questions.constraints.options[key].label }));
        return { script: `${title} ${say(options.map((o) => o.label))} ${flow.voice.constraintsNone}`, options };
      }
      case 'energy': {
        const options = copy.questions.energy.scale.map((step, index) => ({ id: String(index + 1), label: step.label }));
        return { script: `${title} ${say(options.map((o) => o.label))}`, options, wantsNumber: true };
      }
      case 'days':
        return { script: `${title} ${flow.voice.days}`, options: [], wantsNumber: true };
      case 'headcount':
        return { script: `${title} ${flow.voice.counts}`, options: [] };
      default:
        return { script: `${title} ${flow.voice.logistics}`, options: [] };
    }
  }, [stepId, questionCopy, choice, copy, flow]);

  const onVoice = useCallback(
    (match: VoiceMatch): VoiceOutcome => {
      const multi = stepId === 'interests' || stepId === 'constraints';

      if (match.kind === 'command') {
        if (match.command === 'back') {
          clearAdvance();
          goBack();
          return { listenAgain: false };
        }
        if (match.command === 'none') {
          if (stepId === 'constraints') {
            finishWithNothing();
            return { listenAgain: false };
          }
          if (stepId === 'occasion') {
            handleSelect('none');
            return { listenAgain: false };
          }
        }
        if (match.command === 'next' || match.command === 'none') {
          if (canContinue) {
            advance();
            return { listenAgain: false };
          }
          return { listenAgain: true, say: copy.ui.pickAtLeastOne };
        }
        return { listenAgain: true };
      }

      if (match.kind === 'number') {
        if (stepId === 'days') {
          setAnswer('days', Math.min(5, Math.max(1, match.value)));
          advance();
          return { listenAgain: false };
        }
        if (stepId === 'energy' && match.value >= 1 && match.value <= 5) {
          setAnswer('energy', match.value);
          advance();
          return { listenAgain: false };
        }
        return { listenAgain: true, say: flow.voice.didntCatch };
      }

      // An option, by name or by number.
      if (choice) {
        handleSelect(match.id);
        return { listenAgain: false };
      }
      if (stepId === 'energy') {
        setAnswer('energy', Number(match.id));
        advance();
        return { listenAgain: false };
      }
      if (multi) {
        const label = voice.options.find((option) => option.id === match.id)?.label ?? '';
        if (stepId === 'interests') toggleInterest(match.id as InterestKey);
        else toggleConstraint(match.id as ConstraintKey);
        return { listenAgain: true, say: label };
      }
      return { listenAgain: false };
    },
    [advance, canContinue, choice, clearAdvance, copy.ui.pickAtLeastOne, finishWithNothing, flow.voice.didntCatch, goBack, handleSelect, setAnswer, stepId, toggleConstraint, toggleInterest, voice.options]
  );

  if (!currentStep || !questionCopy) return null;

  const why = flow.why[currentStep.id];
  const spark = refining ? undefined : flow.spark[currentStep.id];
  const isLast = refining || stepIndex === steps.length - 1;

  return (
    <motion.div
      key={currentStep.id}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="planner-panel px-5 py-7 sm:px-9 sm:py-10"
    >
      <VoiceGuide
        stepKey={`${refining ?? 'core'}-${currentStep.id}`}
        script={voice.script}
        options={voice.options}
        wantsNumber={voice.wantsNumber}
        onMatch={onVoice}
      />

      <header className="mb-7">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="rounded-full border-2 border-lagoon-light/50 bg-lagoon-light/20 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-lagoon-light">
            {refining ? flow.fineTune : copy.ui.stepOf(stepIndex + 1, steps.length)}
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
        {why && (
          <p className="mt-3 flex max-w-2xl items-start gap-2 rounded-2xl bg-mango/15 px-3.5 py-2.5 text-xs leading-relaxed text-paper/90 sm:text-sm">
            <HiLightBulb className="mt-0.5 h-4 w-4 shrink-0 text-mango-light" />
            <span>
              <span className="font-extrabold text-mango-light">{flow.whyLabel}: </span>
              {why}
            </span>
          </p>
        )}
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
        <div className="space-y-4">
          {profile.constraints.length === 0 && !refining && (
            <button
              type="button"
              onClick={() => {
                playClickFx();
                finishWithNothing();
              }}
              className="planner-cta w-full !py-4 !text-base sm:w-auto"
            >
              ✨ {flow.nothingApplies}
            </button>
          )}
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

      {/* ── What the answers have built so far ────────────────────────── */}
      {!refining && stepIndex > 0 && <TakingShape spark={spark} />}
      {!refining && stepIndex === 0 && spark && (
        <p className="mt-6 text-xs leading-relaxed text-paper/70">🌴 {spark}</p>
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
          disabled={stepIndex === 0 && !refining}
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
            {refining ? flow.updatePlan : isLast ? copy.ui.seePlan : copy.ui.next}
            <HiArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </motion.div>
  );
};
