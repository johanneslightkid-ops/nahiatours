import React from 'react';
import { motion } from 'framer-motion';
import { GlidingBirds, Parallax } from '../nature/Nature';
import { SunBurst } from '../ui/Illustrations';

interface PageHeaderProps {
  /** A hand-written note above the title. */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Two drawings that flank the title on wide screens. */
  artLeft?: React.ReactNode;
  artRight?: React.ReactNode;
  tone?: 'paper' | 'lagoon' | 'mango';
}

/** The sky of each painting. */
const SKY: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  paper: 'linear-gradient(180deg, #A9BAF5 0%, #DCE3FB 46%, #F7EFE1 100%)',
  lagoon: 'linear-gradient(180deg, #2F4FD1 0%, #5C7BE6 44%, #A9E4EE 100%)',
  mango: 'linear-gradient(180deg, #FFDD6E 0%, #FFE9A8 48%, #F7EFE1 100%)',
};

/** Hills, a band of sea and the beach, painted flat along the foot of the band. */
const Landscape: React.FC = () => (
  <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full sm:h-32" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 70 C120 30 220 40 330 62 C430 82 520 30 640 34 C760 38 820 70 940 60 C1040 52 1120 30 1200 40 L1200 120 L0 120 Z" fill="#4F9136" stroke="#1D2346" strokeWidth={3} />
    <path d="M0 86 C200 76 400 92 600 84 C800 76 1000 92 1200 82 L1200 120 L0 120 Z" fill="#3FAFC9" stroke="#1D2346" strokeWidth={3} />
    <path d="M0 102 C200 96 400 108 600 102 C800 96 1000 108 1200 100 L1200 120 L0 120 Z" fill="#F7EFE1" stroke="#1D2346" strokeWidth={3} />
  </svg>
);

/**
 * Every inner page opens on a small painting: a sky in the page's own
 * colour, the turning sun, a stroke of birds, hills and sea along the foot,
 * and the page's two drawings either side of the title.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ kicker, title, subtitle, artLeft, artRight, tone = 'paper' }) => (
  <header className="relative -mt-[5.5rem] overflow-hidden pb-36 pt-32 lg:-mt-[9.75rem] lg:pt-52" style={{ background: SKY[tone] }}>
    <div className="pointer-events-none absolute right-[6%] top-24 h-28 w-28 sm:h-36 sm:w-36 lg:top-44" aria-hidden="true">
      <SunBurst spin className="h-full w-full" />
    </div>
    <GlidingBirds count={2} tone={tone === 'lagoon' ? 'text-paper/85' : 'text-ink/70'} />
    <Landscape />
    {artLeft && (
      <Parallax distance={40} className="pointer-events-none absolute bottom-16 left-6 z-[1] hidden xl:block">
        {artLeft}
      </Parallax>
    )}
    {artRight && (
      <Parallax distance={60} className="pointer-events-none absolute right-16 top-56 z-[1] hidden xl:block">
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
        <div className="mb-3">
          <span className={`hand-note ${tone === 'lagoon' ? '!text-mango-light' : ''}`}>{kicker}</span>
        </div>
      )}
      <h1 className={`scribble-title-bg mx-auto font-display text-4xl sm:text-5xl md:text-6xl ${tone === 'lagoon' ? 'page-title-dark' : 'text-ink'}`}>
        {title}
      </h1>
      {subtitle && (
        <p
          className={`mx-auto mt-6 max-w-2xl rounded-[10px_16px_10px_16px] border-[3px] border-ink bg-paper-card px-5 py-3 text-base font-medium leading-7 text-ink shadow-ink-sm sm:text-lg`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  </header>
);

export default PageHeader;
