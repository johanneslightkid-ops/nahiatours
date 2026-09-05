import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaWhatsapp } from 'react-icons/fa';
import {
  HiChevronDown,
  HiMinus,
  HiOutlineClock,
  HiPencilAlt,
  HiPlus,
  HiRefresh,
  HiShieldCheck,
  HiTruck,
} from 'react-icons/hi';
import { usePlanner } from '../../contexts/PlannerContext';
import { usePlannerCopy } from '../../planner/usePlannerCopy';
import { buildPlanMessage } from '../../planner/engine';
import { useBrand } from '../../contexts/BrandContext';
import { generateWhatsAppMessage } from '../../utils/whatsapp';
import { ProfileChips } from './ProfileChips';
import { PlanTourCard } from './PlanTourCard';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

export const PlanResult: React.FC = () => {
  const {
    plan,
    profile,
    loading,
    removeTour,
    addTour,
    lastAdded,
    addDay,
    removeDay,
    maxDays,
    reset,
    goToStep,
    steps,
  } = usePlanner();
  const copy = usePlannerCopy();
  const { brandSettings } = useBrand();
  const [showRuledOut, setShowRuledOut] = useState(false);

  const whatsappUrl = useMemo(() => {
    if (!plan) return '';
    return generateWhatsAppMessage(brandSettings.phoneNumber, buildPlanMessage(plan, profile, copy));
  }, [plan, profile, copy, brandSettings.phoneNumber]);

  if (loading || !plan) {
    return (
      <div className="planner-panel flex flex-col items-center gap-4 px-8 py-20 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-mango border-t-transparent" />
        <p className="text-paper/85">{copy.result.building}</p>
      </div>
    );
  }

  const perDay = Math.round(plan.perPersonTotal / Math.max(1, plan.days.length));
  const totalItems = plan.days.reduce((sum, day) => sum + day.items.length, 0);

  return (
    <div className="space-y-8">
      {/* ── Persona header ──────────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="planner-panel px-6 py-8 sm:px-10 sm:py-10"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="rounded-full border-2 border-lagoon-light/50 bg-lagoon-light/20 px-3 py-1 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-lagoon-light">
              {copy.result.eyebrow}
            </span>
            <h2 className="mt-4 flex flex-wrap items-center gap-3 font-display text-3xl font-bold leading-tight text-paper sm:text-5xl">
              <span className="text-4xl sm:text-5xl">{plan.persona.emoji}</span>
              {plan.persona.title}
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-paper/85">
              {plan.persona.blurb}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                playClickFx();
                goToStep(steps[0].id);
              }}
              onMouseEnter={() => playHoverFx()}
              className="planner-cta-ghost !px-4 !py-2 !text-xs"
            >
              <HiPencilAlt className="h-4 w-4" /> {copy.ui.editAnswers}
            </button>
            <button
              type="button"
              onClick={() => {
                playClickFx();
                reset();
              }}
              className="planner-cta-ghost !px-4 !py-2 !text-xs"
            >
              <HiRefresh className="h-4 w-4" /> {copy.ui.startOver}
            </button>
          </div>
        </div>

        <div className="mt-7 border-t border-paper/20 pt-6">
          <ProfileChips />
        </div>
      </motion.header>

      {/* ── Money bar ───────────────────────────────────────────────────── */}
      <section className="planner-panel grid gap-6 px-6 py-6 sm:grid-cols-3 sm:px-9">
        <div>
          <div className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-paper/60">
            {copy.result.grandTotal}
          </div>
          <div className="mt-1 font-display text-4xl font-bold text-mango-light">
            ${plan.grandTotal}
            <span className="ml-1.5 text-sm font-semibold uppercase text-paper/60">USD</span>
          </div>
          <div className="mt-1 text-xs text-paper/60">
            {copy.result.priceFor(profile.adults, profile.children)} · 🎟️ {totalItems} · 🗓️{' '}
            {plan.days.length}
          </div>
        </div>

        <div>
          <div className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-paper/60">
            {copy.result.perPerson}
          </div>
          <div className="mt-1 font-display text-4xl font-bold text-paper">${plan.perPersonTotal}</div>
          <div className="mt-1 text-xs text-paper/60">${perDay} / {copy.questions.days.unit.replace(/s$/, '')}</div>
        </div>

        <div className="flex flex-col justify-center">
          {plan.budgetCapPerPersonPerDay !== null && (
            <>
              <div className="mb-2 flex items-center justify-between text-[0.66rem] font-bold uppercase tracking-[0.16em]">
                <span className={plan.overBudget ? 'text-mango-light' : 'text-lagoon-light'}>
                  {plan.overBudget ? '⚠︎' : '✓'} ${perDay} / ${plan.budgetCapPerPersonPerDay}
                </span>
              </div>
              <div className="planner-rail">
                <div
                  className="planner-rail-fill"
                  style={{
                    width: `${Math.min(100, (perDay / plan.budgetCapPerPersonPerDay) * 100)}%`,
                  }}
                />
              </div>
              <p className={`mt-2 text-xs ${plan.overBudget ? 'text-mango-light/90' : 'text-paper/60'}`}>
                {plan.overBudget ? copy.result.budgetOver : copy.result.budgetOk}
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Length of the trip ──────────────────────────────────────────── */}
      <section className="planner-panel flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-9">
        <div>
          <div className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-paper/60">
            {copy.result.daysLabel}
          </div>
          <p className="mt-1 text-sm text-paper/60">{copy.questions.days.hint}</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={copy.result.removeDay}
            title={copy.result.removeDay}
            disabled={plan.days.length <= 1}
            onClick={() => {
              playClickFx();
              removeDay();
            }}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper/30 bg-paper/10 text-paper transition hover:border-lagoon-light hover:bg-lagoon-light/25 disabled:opacity-30"
          >
            <HiMinus className="h-4 w-4" />
          </button>

          <span className="min-w-[4.5rem] text-center font-display text-3xl font-bold text-paper tabular-nums">
            {plan.days.length}
            <span className="ml-1.5 text-sm font-semibold text-paper/60">
              {copy.questions.days.unit}
            </span>
          </span>

          <button
            type="button"
            aria-label={copy.result.addDay}
            title={copy.result.addDay}
            disabled={plan.days.length >= maxDays}
            onClick={() => {
              playClickFx();
              addDay();
            }}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-paper/30 bg-paper/10 text-paper transition hover:border-lagoon-light hover:bg-lagoon-light/25 disabled:opacity-30"
          >
            <HiPlus className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* ── The days ────────────────────────────────────────────────────── */}
      {plan.days.map((day) => (
        <section key={day.index} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <h3 className="flex items-center gap-3 font-display text-2xl font-bold text-paper">
              <span className="grid h-10 w-10 place-items-center rounded-2xl border-2 border-ink bg-mango font-display text-lg font-extrabold text-ink">
                {day.index}
              </span>
              {copy.result.dayLabel(day.index)}
            </h3>
            <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.14em] text-paper/60">
              <span className="inline-flex items-center gap-1.5">
                <HiOutlineClock className="h-4 w-4" /> {copy.result.hours(day.activeHours)}
              </span>
              <span className="text-mango-light">
                {copy.result.dayTotal}: ${day.dayTotal}
              </span>
            </div>
          </div>

          {day.items.length === 0 ? (
            <div className="planner-panel px-6 py-10 text-center text-paper/60">
              {copy.result.empty}
            </div>
          ) : (
            <div className="space-y-4">
              {day.items.map((item, index) => (
                <PlanTourCard
                  key={item.entry.profile.key}
                  item={item}
                  index={index}
                  highlight={lastAdded === item.entry.profile.key}
                  onRemove={() => removeTour(item.entry.profile.key)}
                />
              ))}

              {day.note && (
                <p className="planner-panel-soft px-5 py-3 text-center text-xs text-paper/60">
                  {day.note}
                </p>
              )}
            </div>
          )}
        </section>
      ))}

      {/* ── Transport ───────────────────────────────────────────────────── */}
      <section className="planner-panel flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lagoon-light/20 text-2xl text-lagoon-light border-2 border-lagoon-light/40">
            <HiTruck />
          </span>
          <div>
            <h4 className="font-display text-lg font-bold text-paper">{copy.result.transportTitle}</h4>
            <p className="mt-1 max-w-xl text-sm text-paper/85">{plan.transport.vehicleNote}</p>
            {plan.transport.choice !== 'included' && (
              <p className="mt-1 text-sm font-semibold text-lagoon-light">
                {copy.result.vehicleSuggestion(plan.transport.vehicleLabel, plan.transport.passengers)}
              </p>
            )}
          </div>
        </div>

        {plan.transport.choice !== 'included' && (
          <Link
            to="/transport#top"
            onClick={() => playClickFx()}
            className="planner-cta-ghost shrink-0 !text-xs"
          >
            {copy.result.openCalculator}
          </Link>
        )}
      </section>

      {/* ── Alternates ──────────────────────────────────────────────────── */}
      {plan.alternates.length > 0 && (
        <section className="planner-panel px-6 py-7 sm:px-9">
          <div className="mb-5">
            <h3 className="font-display text-xl font-bold text-paper">{copy.result.alternates}</h3>
            <p className="mt-1 text-sm text-paper/60">{copy.result.alternatesHint}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.alternates.map((alternate) => (
              <button
                key={alternate.entry.profile.key}
                type="button"
                onMouseEnter={() => playHoverFx()}
                onClick={() => {
                  playClickFx();
                  addTour(alternate.entry.profile.key);
                }}
                className="planner-option !flex-col !items-stretch !gap-3 !p-3"
              >
                <span className="relative block h-28 overflow-hidden rounded-2xl">
                  <img
                    src={alternate.entry.tour.image}
                    alt={alternate.entry.tour.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <span className="absolute bottom-2 left-3 right-3 truncate text-sm font-bold text-paper">
                    {alternate.entry.tour.title}
                  </span>
                </span>

                <span className="flex items-center justify-between gap-2 px-1">
                  <span className="truncate text-xs text-paper/85">
                    {alternate.reasons[0] ?? copy.reasons.variety}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-mango-light">
                    ${alternate.pricing.total}
                  </span>
                </span>

                <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-lagoon-light/20 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-lagoon-light">
                  <HiPlus className="h-3.5 w-3.5" /> {copy.result.add}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Ruled out ───────────────────────────────────────────────────── */}
      {plan.ruledOut.length > 0 && (
        <section className="planner-panel-soft px-6 py-4">
          <button
            type="button"
            onClick={() => {
              playClickFx();
              setShowRuledOut((value) => !value);
            }}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-paper/60">
              {copy.result.ruledOut} ({plan.ruledOut.length})
            </span>
            <HiChevronDown
              className={`h-4 w-4 text-paper/60 transition-transform ${showRuledOut ? 'rotate-180' : ''}`}
            />
          </button>

          {showRuledOut && (
            <ul className="mt-4 space-y-2">
              {plan.ruledOut.map((entry) => (
                <li key={entry.title} className="flex flex-wrap items-center gap-2 text-sm text-paper/60">
                  <span className="font-semibold text-paper/85">{entry.title}</span>
                  <span className="rounded-full border border-paper/20 bg-paper/5 px-2.5 py-0.5 text-[0.68rem]">
                    {entry.reason}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* ── Hand-off ────────────────────────────────────────────────────── */}
      <section className="planner-panel flex flex-col items-center gap-4 px-6 py-9 text-center sm:px-10">
        <h3 className="font-display text-2xl font-bold text-paper sm:text-3xl">
          {plan.persona.title} · ${plan.grandTotal} USD
        </h3>

        {/* What actually happens next — no surprise charges, no auto-booking. */}
        <div className="w-full max-w-2xl rounded-3xl border-2 border-lagoon-light/40 bg-lagoon-light/15 px-5 py-4 text-left">
          <div className="flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-lagoon-light">
            <HiShieldCheck className="h-4 w-4" />
            {copy.result.reviewTitle}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-paper/85">{copy.result.reviewBody}</p>
        </div>

        <p className="max-w-xl text-sm text-paper/85">{copy.result.bookHint}</p>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => playClickFx()}
          onMouseEnter={() => playHoverFx()}
          className="planner-cta !px-9 !py-4 !text-base"
        >
          <FaWhatsapp className="h-5 w-5" /> {copy.result.book}
        </a>

        <Link to="/tours#top" onClick={() => playClickFx()} className="planner-cta-ghost !text-xs">
          {copy.hero.browse}
        </Link>

        <p className="text-[0.68rem] text-paper/60">{copy.result.savedNote}</p>
      </section>
    </div>
  );
};
