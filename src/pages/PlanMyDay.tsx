import React, { useEffect } from 'react';
import { localeText } from '../lib/localeText';
import { motion } from 'framer-motion';
import { usePlanner } from '../contexts/PlannerContext';
import { usePlannerCopy } from '../planner/usePlannerCopy';
import { useI18n } from '../contexts/I18nContext';
import { PlannerIntro } from '../components/planner/PlannerIntro';
import { QuestionStep } from '../components/planner/QuestionStep';
import { PlanResult } from '../components/planner/PlanResult';
import { ProfileChips } from '../components/planner/ProfileChips';
import FABWhatsApp from '../components/FABWhatsApp';
import { useBrand } from '../contexts/BrandContext';
import type { StepId } from '../planner/questions';

const STEP_EMOJI: Record<StepId, string> = {
  partyType: '👥',
  headcount: '🔢',
  interests: '💚',
  energy: '🌡️',
  adultAge: '🎂',
  days: '🗓️',
  occasion: '🎉',
  constraints: '🛟',
  budget: '💵',
  dayShape: '⚖️',
  aim: '🧭',
  transport: '🚐',
  logistics: '📍',
};

const PlanMyDay: React.FC = () => {
  const { stage, steps, stepIndex, loading, refining, hasProgress } = usePlanner();
  const copy = usePlannerCopy();
  const { locale } = useI18n();
  const { brandSettings } = useBrand();

  useEffect(() => {
    const previous = document.title;
    document.title = localeText(locale, {
      en: 'Plan My Day · Punta Cana Excursions',
      es: 'Planea mi Día · Excursiones en Punta Cana',
      de: 'Meinen Tag planen · Ausflüge in Punta Cana',
      fr: 'Planifier ma journée · Excursions à Punta Cana',
    });
    return () => {
      document.title = previous;
    };
  }, [locale]);

  // Every new planner state is placed at the viewport origin immediately.
  // A smooth scroll leaves the preceding question in view while a timed
  // auto-advance is already showing the next one, which makes the guided flow
  // feel as though it stalled.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }));
    return () => window.cancelAnimationFrame(frame);
  }, [stage, stepIndex]);

  return (
    <div className="planner page-top relative min-h-screen px-4 pb-12 sm:pb-16 md:px-8">
      <FABWhatsApp phoneNumber={brandSettings.phoneNumber} />

      {/* Painted washes behind the panels. They deliberately bleed past the
          page edges, so they live in a clipping wrapper — otherwise they widen
          the document and summon a horizontal scrollbar. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="planner-glow left-[-10%] top-24 h-[28rem] w-[28rem]"
          style={{ background: '#7FE3DA' }}
        />
        <div
          className="planner-glow bottom-10 right-[-8%] h-[24rem] w-[24rem]"
          style={{ background: '#FFC861' }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        {/* Progress — one stepping stone per question, only while answering */}
        {stage === 'questions' && !refining && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-display text-lg font-extrabold text-ink">{copy.tab}</span>
            </div>
            <ol className="planner-stones" aria-hidden="true">
              <li className="planner-stones-fill" style={{ transform: `scaleX(${steps.length > 1 ? stepIndex / (steps.length - 1) : 1})` }} />
              {steps.map((step, index) => (
                <li
                  key={step.id}
                  className="planner-stone"
                  data-state={index < stepIndex ? 'done' : index === stepIndex ? 'here' : 'ahead'}
                >
                  {STEP_EMOJI[step.id]}
                </li>
              ))}
            </ol>
            {hasProgress && <ProfileChips compact />}
          </div>
        )}

        {/* Deliberately no AnimatePresence: with `mode="wait"` a second
            navigation arriving mid-exit (tap an option, then hit Continue)
            deadlocks the presence machinery — the outgoing question stays on
            screen forever while the state has already moved on. Keyed enter
            animations give the same feel and cannot wedge. */}
        <div key={`${stage}-${stepIndex}`}>
          {stage === 'intro' ? (
            <PlannerIntro />
          ) : stage === 'questions' ? (
            <QuestionStep />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <PlanResult />
            </motion.div>
          )}
        </div>

        {loading && stage === 'intro' && (
          <p className="mt-6 text-center text-xs font-extrabold uppercase tracking-[0.18em] text-ink-soft">
            {copy.result.building}
          </p>
        )}
      </div>
    </div>
  );
};

export default PlanMyDay;
