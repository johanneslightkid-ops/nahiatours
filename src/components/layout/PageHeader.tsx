import React from 'react';

interface PageHeaderProps {
  /** Hand-lettered line above the title. */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Two drawings that flank the title on wide screens. */
  artLeft?: React.ReactNode;
  artRight?: React.ReactNode;
  tone?: 'paper' | 'lagoon' | 'mango';
}

const TONES: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  paper: 'bg-paper',
  lagoon: 'bg-[#DFF6FF]',
  mango: 'bg-[#FFEFD6]',
};

/**
 * The banner every inner page opens with: a painted band, cut off at the
 * bottom with the site's wave edge, with a drawing on either side of the
 * title. It gives Tours, Transport, Contact and the Blog the same entrance the
 * home page gets from the hero.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  artLeft,
  artRight,
  tone = 'paper',
}) => (
  <header className={`wavy-band-bottom relative overflow-hidden ${TONES[tone]} pb-24 pt-14 sm:pt-16`}>
    {artLeft && (
      <div className="pointer-events-none absolute left-2 bottom-10 hidden opacity-90 xl:block">{artLeft}</div>
    )}
    {artRight && (
      <div className="pointer-events-none absolute right-4 top-10 hidden opacity-90 xl:block">{artRight}</div>
    )}

    <div className="section-shell relative z-10 text-center">
      {/* `.hand-note` is inline-block so the marker rotation works, so the
          kicker needs its own block wrapper to sit above the title. */}
      {kicker && (
        <div className="mb-2">
          <span className="hand-note">{kicker}</span>
        </div>
      )}
      <h1 className="scribble-title-bg mx-auto font-display text-4xl font-extrabold text-ink sm:text-5xl md:text-6xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-6 max-w-2xl text-base font-semibold leading-7 text-ink-soft sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  </header>
);

export default PageHeader;
