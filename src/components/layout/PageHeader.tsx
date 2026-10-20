import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageHeaderProps {
  /** Small caps above the title. */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Kept for the shared call sites; this site puts a photograph behind the title instead. */
  artLeft?: React.ReactNode;
  artRight?: React.ReactNode;
  tone?: 'paper' | 'lagoon' | 'mango';
  /** The photograph behind the title. */
  image?: string;
}

const IMAGES: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  paper: '/imgs/edt/gallery/aerial-beach.webp',
  lagoon: '/imgs/edt/banners/excursions.webp',
  mango: '/imgs/edt/banners/saona-beach.webp',
};

/**
 * Every inner page opens on a photograph: a wide, graded band with the title
 * in Anton, bottom-left, and a gold rule. Short enough that the page's own
 * content starts above the fold.
 */
const PageHeader: React.FC<PageHeaderProps> = ({ kicker, title, subtitle, tone = 'paper', image }) => {
  const reduced = useReducedMotion();
  return (
    <header className="relative isolate overflow-hidden bg-ink text-white">
      <img src={image || IMAGES[tone]} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" fetchPriority="high" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,rgb(20_22_26/0.85)_0%,rgb(20_22_26/0.55)_45%,rgb(20_22_26/0.2)_100%)]" />
      <div className="absolute inset-0 -z-10" style={{ background: 'var(--grade)' }} />
      <div className="hero-grain absolute inset-0 -z-10" />
      <motion.div
        className="section-shell pb-14 pt-32 sm:pb-20 lg:pt-44"
        initial={reduced ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        {kicker && <span className="kicker kicker-light">{kicker}</span>}
        <h1 className="display-lg mt-4 max-w-4xl text-white">{title}</h1>
        {subtitle && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/85">{subtitle}</p>}
      </motion.div>
    </header>
  );
};

export default PageHeader;
