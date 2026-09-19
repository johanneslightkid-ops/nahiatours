import React from 'react';

interface PageHeaderProps {
  /** The field-guide label above the title. */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Two drawings that flank the title on wide screens. */
  artLeft?: React.ReactNode;
  artRight?: React.ReactNode;
  tone?: 'paper' | 'lagoon' | 'mango';
}

/** Three washes, all pale enough to carry ink type at full contrast. */
const TONES: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  paper: 'bg-paper',
  lagoon: 'bg-gradient-to-b from-[#E7F4F4] to-[#D9EDEA]',
  mango: 'bg-gradient-to-b from-[#FDF1E0] to-[#F8E4CE]',
};

/**
 * The band every inner page opens with: a wash that ends in a painted edge,
 * with a drawing leaning in from either side of the title. It gives Tours,
 * Transport, Contact and the Blog the entrance the home page gets from its
 * hero, without pretending each of them has one.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  artLeft,
  artRight,
  tone = 'paper',
}) => (
  <header className={`wavy-band-bottom relative overflow-hidden ${TONES[tone]} pb-24 pt-14 sm:pt-20`}>
    {artLeft && (
      <div className="pointer-events-none absolute -left-6 bottom-8 hidden opacity-70 xl:block">{artLeft}</div>
    )}
    {artRight && (
      <div className="pointer-events-none absolute -right-4 top-8 hidden opacity-60 xl:block">{artRight}</div>
    )}

    <div className="section-shell relative z-10 text-center">
      {kicker && (
        <div className="mb-4 flex justify-center">
          <span className="hand-note">{kicker}</span>
        </div>
      )}
      <h1 className="scribble-title-bg mx-auto font-display text-4xl font-semibold text-ink sm:text-5xl md:text-[3.5rem]">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">{subtitle}</p>
      )}
    </div>
  </header>
);

export default PageHeader;
