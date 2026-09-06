import React, { useEffect } from 'react';
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

const PlanMyDay: React.FC = () => {
  const { stage, progress, steps, stepIndex, loading } = usePlanner();
  const copy = usePlannerCopy();
  const { locale } = useI18n();
  const { brandSettings } = useBrand();

  useEffect(() => {
    const previous = document.title;
    document.title =
      locale === 'es'
        ? 'Planea mi Día · Excursiones en Punta Cana'
        : 'Plan My Day · Punta Cana Excursions';
    return () => {
      document.title = previous;
    };
  }, [locale]);

  // Every step — and the finished plan — starts at the top. Without this a
  // guest who pressed the button near the bottom of a long card sees nothing
  // move and assumes it did not work.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stage, stepIndex]);

  return (
    <div className="planner relative min-h-screen px-4 py-12 sm:py-16 md:px-8">
      <FABWhatsApp phoneNumber={brandSettings.phoneNumber} />

      {/* Painted washes behind the panels. They deliberately bleed past the
          page edges, so they live in a clipping wrapper — otherwise they widen
          the document and summon a horizontal scrollbar. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="planner-glow left-[-10%] top-24 h-[28rem] w-[28rem]"
          style={{ background: '#0C0C0D' }}
        />
        <div
          className="planner-glow bottom-10 right-[-8%] h-[24rem] w-[24rem]"
          style={{ background: '#C1121F' }}
        />
      </div>

      <div className="relative mx-auto w-full max-w-5xl">
        {/* Progress rail — only while answering */}
        {stage === 'questions' && (
          <div className="mb-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="font-display text-lg font-extrabold text-ink">{copy.tab}</span>
              <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-ink-soft">
                {copy.ui.stepOf(stepIndex + 1, steps.length)}
              </span>
            </div>
            <div className="planner-rail">
              <div className="planner-rail-fill" style={{ width: `${progress * 100}%` }} />
            </div>
            <ProfileChips compact />
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
