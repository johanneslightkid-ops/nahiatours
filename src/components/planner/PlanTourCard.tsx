import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HiCheckCircle, HiExclamation, HiTrash, HiArrowRight } from 'react-icons/hi';
import { motion } from 'framer-motion';
import { usePlannerCopy } from '../../planner/usePlannerCopy';
import type { PlanItem } from '../../planner/types';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

interface PlanTourCardProps {
  item: PlanItem;
  index: number;
  onRemove: () => void;
  /** Just added by hand — bring it into view so the click has a visible effect. */
  highlight?: boolean;
}

const SLOT_ACCENT: Record<string, string> = {
  full: 'from-amber-400/90 to-orange-400/90',
  half: 'from-teal-300/90 to-cyan-400/90',
  short: 'from-sky-300/90 to-blue-400/90',
  evening: 'from-fuchsia-400/90 to-indigo-400/90',
};

export const PlanTourCard: React.FC<PlanTourCardProps> = ({
  item,
  index,
  onRemove,
  highlight = false,
}) => {
  const copy = usePlannerCopy();
  const { tour, profile: tourProfile, slug } = item.entry;
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = cardRef.current;
    // Never let a nice-to-have scroll take the plan down with it.
    if (!highlight || !node || typeof node.scrollIntoView !== 'function') return;
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      ref={cardRef}
      className={`planner-panel overflow-hidden ${
 highlight ? 'border-lagoon' : ''
      }`}
      onMouseEnter={() => playHoverFx()}
    >
      <div className="grid md:grid-cols-[15rem_1fr] lg:grid-cols-[18rem_1fr]">
        {/* Media */}
        <div className="relative h-48 overflow-hidden md:h-full">
          <img
            src={tour.image}
            alt={tour.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04131d]/85 via-[#04131d]/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#04131d]/70" />
          <span
            className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${
 SLOT_ACCENT[item.slot] ?? SLOT_ACCENT.half
            } px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-slate-950 shadow-lg`}
          >
            {item.slotLabel}
          </span>

          {item.pinned && (
            <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-slate-900 shadow-lg">
              ★ {copy.result.addedByYou}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-lagoon-light">
                <span className="text-base">{tourProfile.emoji}</span>
                {copy.result.hours(tourProfile.durationHours)}
              </div>
              <h4 className="font-display text-xl font-bold leading-tight text-paper sm:text-2xl">
                {tour.title}
              </h4>
            </div>

            <div className="text-right">
              <div className="font-display text-2xl font-bold text-mango-light">
                ${item.pricing.total}
                <span className="ml-1 text-xs font-semibold uppercase tracking-wider text-paper/60">USD</span>
              </div>
              <div className="text-[0.7rem] font-semibold text-paper/60">
                ${item.pricing.perPerson} {copy.result.perPerson}
              </div>
            </div>
          </div>

          {/* Why it fits */}
          {item.reasons.length > 0 && (
            <div>
              <div className="mb-2 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-paper/60">
                {copy.result.whyFits}
              </div>
              <ul className="space-y-1.5">
                {item.reasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-paper/85">
                    <HiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-lagoon-light" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price lines + warnings */}
          <div className="flex flex-wrap gap-2">
            {item.pricing.lines.map((line) => (
              <span
                key={`${line.label}-${line.unit}`}
                className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold text-paper/85"
              >
                {line.qty} × {line.label} · ${line.unit}
              </span>
            ))}
            {item.pricing.childrenAtAdultRate && (
              <span className="rounded-full border border-amber-400/30 bg-mango-light/20 px-3 py-1 text-[0.7rem] font-semibold text-mango-light">
                {copy.result.adultRateForKids}
              </span>
            )}
          </div>

          {item.cautions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.cautions.map((caution) => (
                <span
                  key={caution}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[0.7rem] font-semibold text-mango-light/90"
                >
                  <HiExclamation className="h-3.5 w-3.5" />
                  {caution}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-paper/20 pt-4">
            <Link
              to={`/details/tours/${slug}#top`}
              onClick={() => playClickFx()}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-lagoon-light transition hover:text-lagoon-light"
            >
              {copy.result.viewDetails} <HiArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => {
                playClickFx();
                onRemove();
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-paper/85 transition hover:border-rose-400/50 hover:bg-rose-500/15 hover:text-rose-200"
            >
              <HiTrash className="h-3.5 w-3.5" /> {copy.result.remove}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};
