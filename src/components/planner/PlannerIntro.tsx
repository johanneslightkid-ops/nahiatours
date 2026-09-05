import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiArrowRight, HiSparkles } from 'react-icons/hi';
import { usePlanner } from '../../contexts/PlannerContext';
import { usePlannerCopy } from '../../planner/usePlannerCopy';
import { ProfileChips } from './ProfileChips';
import { playClickFx, playHoverFx } from '../../lib/soundEngine';

/** Slow drifting strip of real catalogue photography behind the intro. */
const CatalogueDrift: React.FC<{ images: string[] }> = ({ images }) => {
  if (images.length === 0) return null;
  const strip = [...images, ...images];

  return (
    <div className="pointer-events-none relative overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="planner-marquee">
        {strip.map((src, index) => (
          <span
            key={`${src}-${index}`}
            className="block h-24 w-36 shrink-0 overflow-hidden rounded-2xl border border-paper/20 sm:h-28 sm:w-44"
          >
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover opacity-70" />
          </span>
        ))}
      </div>
    </div>
  );
};

export const PlannerIntro: React.FC = () => {
  const { start, resume, hasProgress, catalogue } = usePlanner();
  const copy = usePlannerCopy();

  const images = catalogue.slice(0, 10).map((entry) => entry.tour.image).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="planner-panel overflow-hidden">
        <div className="px-6 py-10 sm:px-12 sm:py-14">
          <span className="inline-flex items-center gap-2 rounded-full border border-mango-light/50 bg-mango-light/20 px-3.5 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-mango-light">
            <HiSparkles className="h-3.5 w-3.5" />
            {copy.hero.eyebrow}
          </span>

          <h1 className="mt-6 whitespace-pre-line font-display text-4xl font-bold leading-[1.05] text-paper sm:text-6xl">
            {copy.hero.title}
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-paper/85 sm:text-lg">
            {copy.hero.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onMouseEnter={() => playHoverFx()}
              onClick={() => {
                playClickFx();
                start();
              }}
              className="planner-cta !px-8 !py-4 !text-base"
            >
              {copy.hero.start} <HiArrowRight className="h-4 w-4" />
            </button>

            {hasProgress && (
              <button
                type="button"
                onClick={() => {
                  playClickFx();
                  resume();
                }}
                className="planner-cta-ghost"
              >
                {copy.hero.resume}
              </button>
            )}

            <Link to="/tours#top" onClick={() => playClickFx()} className="planner-cta-ghost">
              {copy.hero.browse}
            </Link>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-paper/60">
            {copy.hero.minutes}
          </p>

          {hasProgress && (
            <div className="mt-8 border-t border-paper/20 pt-6">
              <ProfileChips compact />
            </div>
          )}
        </div>

        <CatalogueDrift images={images} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {copy.hero.bullets.map((bullet, index) => (
          <motion.div
            key={bullet.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 + index * 0.08 }}
            className="planner-panel-soft px-6 py-6"
          >
            <div className="text-3xl">{bullet.emoji}</div>
            <h3 className="mt-3 font-display text-lg font-bold text-paper">{bullet.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-paper/85">{bullet.text}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
