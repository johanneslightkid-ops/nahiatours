import React from 'react';
import { AdinkraStamp } from './CarnivalMarks';

/**
 * The banner pulled across the top of a carnival stand.
 *
 * It is the one piece of motion on this site that is doing a job rather than
 * decorating: it is carrying words, and a banner that does not move is just a
 * list. Everything else that moves here could be switched off without losing
 * information.
 *
 * HOW IT LOOPS WITHOUT A SEAM. The track holds the phrase list TWICE and
 * slides exactly -50% of its own width. At the moment it reaches the end of
 * the first copy, the second copy is sitting precisely where the first
 * started, so resetting to 0 is invisible. The alternative — measuring the
 * content and animating a pixel value — would have to re-measure on every
 * resize and would animate a length, which is a layout every frame.
 *
 * It is `transform` only, so the compositor owns it. Hovering pauses it,
 * because a moving target is a hostile thing to try to read.
 */

interface CarnivalTickerProps {
  /** Said twice, in order. Keep them short — this is read in passing. */
  phrases: string[];
  className?: string;
}

const CarnivalTicker: React.FC<CarnivalTickerProps> = ({ phrases, className = '' }) => {
  if (phrases.length === 0) return null;

  // Two passes of the same list. `aria-hidden` on the second: it is there for
  // the geometry, and a screen reader should not hear the phrases twice.
  const run = (hidden: boolean) => (
    <span className="inline-flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {phrases.map((phrase, i) => (
        <span key={`${phrase}-${i}`} className="inline-flex items-center">
          <span className="px-6 py-2 font-display text-sm uppercase tracking-[0.16em] sm:text-base">
            {phrase}
          </span>
          <AdinkraStamp className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </span>
      ))}
    </span>
  );

  return (
    <div
      className={`relative overflow-hidden border-y-[3px] border-ink bg-ink text-paper ${className}`}
    >
      <div className="banner-track">
        {run(false)}
        {run(true)}
      </div>
    </div>
  );
};

export default CarnivalTicker;
