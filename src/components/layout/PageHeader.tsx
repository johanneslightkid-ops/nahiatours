import React from 'react';
import { Barcode, Crosshair, Splatter } from '../ui/Illustrations';

interface PageHeaderProps {
  /** Marker scrawl above the title. */
  kicker?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Two drawings that flank the title on wide screens. */
  artLeft?: React.ReactNode;
  artRight?: React.ReactNode;
  tone?: 'paper' | 'lagoon' | 'mango';
  /** Filing line printed under the barcode. Defaults to the page's path. */
  fileRef?: string;
}

/**
 * The banner every inner page opens with.
 *
 * It used to be a pastel band with a wave cut out of the bottom. It is now a
 * printing plate: the page name set in poster caps, a red ray burst behind it,
 * a barcode and filing number in the corner, and the whole thing torn off
 * along the bottom edge.
 *
 * `tone` picks which plate is on top — bone, black or red — and the tear
 * inherits it, so a black banner rips into a red margin and a red one into
 * black. That is the same rule the section bands follow in globals.css.
 */
const PLATES: Record<NonNullable<PageHeaderProps['tone']>, React.CSSProperties> = {
  paper: { '--band': 'var(--paper)', '--tear-ink': 'var(--ink)' } as React.CSSProperties,
  lagoon: { '--band': 'var(--ink)', '--tear-ink': 'var(--blood)' } as React.CSSProperties,
  mango: { '--band': 'var(--blood)', '--tear-ink': 'var(--ink)' } as React.CSSProperties,
};

const PageHeader: React.FC<PageHeaderProps> = ({
  kicker,
  title,
  subtitle,
  artLeft,
  artRight,
  tone = 'paper',
  fileRef,
}) => {
  const isDark = tone !== 'paper';
  const reference =
    fileRef ||
    (typeof window !== 'undefined'
      ? window.location.pathname.replace('/', '') || 'index'
      : 'index');

  return (
    <header
      className={`home-section wavy-band-bottom relative overflow-hidden pb-24 pt-14 sm:pt-16 ${
        isDark ? 'text-paper' : 'text-ink'
      }`}
      style={PLATES[tone]}
    >
      {/* Ray burst behind the title, in whichever colour is not the plate. */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[140vw] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `repeating-conic-gradient(from 0deg at 50% 50%, ${
            tone === 'lagoon' ? 'rgba(193,18,31,0.5)' : tone === 'mango' ? 'rgba(12,12,13,0.4)' : 'rgba(12,12,13,0.14)'
          } 0deg 2.6deg, transparent 2.6deg 10deg)`,
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 8%, transparent 55%)',
          maskImage: 'radial-gradient(circle at 50% 50%, #000 8%, transparent 55%)',
        }}
      />

      <Splatter
        tone={isDark ? 'blood' : 'ink'}
        variant={2}
        className="pointer-events-none absolute -left-16 -top-12 h-80 w-80 opacity-[0.14]"
      />

      {artLeft && (
        <div className="pointer-events-none absolute bottom-12 left-2 hidden xl:block">{artLeft}</div>
      )}
      {artRight && (
        <div className="pointer-events-none absolute right-4 top-10 hidden xl:block">{artRight}</div>
      )}

      {/* Filing corner. */}
      <div className="pointer-events-none absolute right-6 top-6 hidden items-center gap-3 sm:flex">
        <span className={`tp-filenum ${isDark ? 'text-paper/50' : ''}`}>
          Ref. {reference.toUpperCase()}
        </span>
        <Barcode value={reference} tone={isDark ? 'bone' : 'ink'} className="h-5 w-20 opacity-50" />
        <Crosshair tone={isDark ? 'blood' : 'blood'} className="h-6 w-6" />
      </div>

      <div className="section-shell relative z-10 text-center">
        {/* `.hand-note` is inline-block so its rotation works, so the kicker
            needs its own block wrapper to sit above the title. */}
        {kicker && (
          <div className="mb-2">
            <span
              className="hand-note"
              style={
                // Red on red is unreadable: the marker flips to ink on the red
                // plate and to the light red on the black one.
                tone === 'mango'
                  ? { color: 'var(--ink)' }
                  : tone === 'lagoon'
                  ? { color: 'var(--blood-light)' }
                  : undefined
              }
            >
              {kicker}
            </span>
          </div>
        )}

        <h1
          className="mx-auto font-display text-5xl leading-[0.9] sm:text-6xl md:text-7xl"
          style={isDark ? { color: 'var(--bone)', textShadow: '5px 5px 0 rgba(12,12,13,0.55)' } : undefined}
        >
          {title}
        </h1>

        {/* A heavy rule under the title, ticked in the accent colour. */}
        <div className="relative mx-auto mt-5 h-1 w-40" style={{ background: isDark ? 'var(--bone)' : 'var(--ink)' }}>
          <span
            className="absolute -top-1 left-0 h-3 w-14"
            style={{ background: tone === 'mango' ? 'var(--ink)' : 'var(--blood)' }}
          />
        </div>

        {subtitle && (
          <p
            className={`mx-auto mt-6 max-w-2xl text-base font-medium leading-7 sm:text-lg ${
              isDark ? 'text-paper/85' : 'text-ink-soft'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
