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

/**
 * A tone is a WASH, not a fill.
 *
 * These used to be flat slabs of colour — `bg-[#DFF6FF]` and friends — which
 * put a hard-edged rectangle of a completely different hue on top of the
 * canvas and made every inner page open with a seam. Each one is now a
 * gradient that fades out before it reaches the bottom of the band, so the
 * weave underneath carries through and the banner reads as light falling on
 * the page rather than as a box laid over it.
 */
const TONES: Record<NonNullable<PageHeaderProps['tone']>, string> = {
  paper:
    'bg-[radial-gradient(90%_70%_at_50%_0%,rgba(255,206,122,0.3),transparent_72%)]',
  lagoon:
    'bg-[radial-gradient(90%_70%_at_50%_0%,rgba(143,220,208,0.45),transparent_72%)]',
  mango:
    'bg-[radial-gradient(90%_70%_at_50%_0%,rgba(255,154,129,0.34),transparent_72%)]',
};

/**
 * The banner every inner page opens with: a wash of light at the top of the
 * page, a painted drawing on either side of the title, and the Taino fret
 * closing it off at the bottom. It gives Tours, Transport, Contact and the
 * Blog the same entrance the home page gets from the hero.
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  artLeft,
  artRight,
  tone = 'paper',
}) => (
  <header className={`wavy-band-bottom relative overflow-hidden ${TONES[tone]} pb-24 pt-20 sm:pt-24 lg:pt-28`}>
    {artLeft && (
      <div className="pointer-events-none absolute bottom-10 left-6 hidden opacity-90 xl:block">{artLeft}</div>
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
      <h1 className="scribble-title-bg mx-auto font-display text-[2.6rem] font-bold text-ink sm:text-5xl md:text-[3.7rem]">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-7 max-w-measure text-base leading-7 text-ink-soft sm:text-lg">
          {subtitle}
        </p>
      )}
    </div>
  </header>
);

export default PageHeader;
