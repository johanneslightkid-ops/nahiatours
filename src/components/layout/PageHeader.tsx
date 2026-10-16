import React from 'react';
import { motion } from 'framer-motion';
import { GlidingBirds, LeafCanopy, Parallax } from '../nature/Nature';

interface PageHeaderProps {
  /** Field-book note above the title. */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Two drawings that flank the title on wide screens. */
  artLeft?: React.ReactNode;
  artRight?: React.ReactNode;
  tone?: 'paper' | 'lagoon' | 'mango';
}

const TONES: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  paper: 'bg-[linear-gradient(180deg,#DDF3EE_0%,#F3F1E2_60%,#FBF5E8_100%)]',
  lagoon: 'bg-[linear-gradient(180deg,#BFEDE8_0%,#DDF6F2_55%,#ECFAF6_100%)]',
  mango: 'bg-[linear-gradient(180deg,#FFE7BE_0%,#FDF0DA_60%,#FBF5E8_100%)]',
};

/**
 * Every inner page opens in a clearing: the vine of the navigation hangs over
 * a band of soft colour, leaves lean in from the corners and drift with the
 * scroll, and the page's two drawings sit either side of the title.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  artLeft,
  artRight,
  tone = 'paper',
}) => (
  <header className={`wavy-band-bottom relative -mt-[5rem] overflow-hidden ${TONES[tone]} pb-28 pt-32 lg:-mt-[9rem] lg:pt-48`}>
    <LeafCanopy variant="garden" />
    <GlidingBirds count={2} />
    {artLeft && (
      <Parallax distance={40} className="pointer-events-none absolute bottom-12 left-6 hidden xl:block">
        {artLeft}
      </Parallax>
    )}
    {artRight && (
      <Parallax distance={60} className="pointer-events-none absolute right-10 top-40 hidden xl:block">
        {artRight}
      </Parallax>
    )}

    <motion.div
      className="section-shell relative z-10 text-center"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {kicker && (
        <div className="mb-2">
          <span className="hand-note">{kicker}</span>
        </div>
      )}
      <h1 className="scribble-title-bg mx-auto font-display text-4xl font-bold text-ink sm:text-5xl md:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-7 text-ink-soft sm:text-lg">
          {subtitle}
        </p>
      )}
    </motion.div>
  </header>
);

export default PageHeader;
