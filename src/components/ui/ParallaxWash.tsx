import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { useMotionBudget } from '../../lib/useMotionBudget';

interface ParallaxWashProps {
  /** Which side of the section it blooms from. */
  side?: 'left' | 'right';
  /** How far it travels over the section's scroll, in percent of its own height. */
  depth?: number;
  className?: string;
}

/**
 * A bloom of colour drifting behind a section.
 *
 * This is the site's depth cue between the backdrop and the content: a soft
 * blurred shape that moves at a different rate from the words in front of it,
 * so scrolling past a section feels like moving through it.
 *
 * COST. The blur is baked into a single `filter: blur()` on one element, which
 * the compositor rasterises ONCE and then only translates — the expensive part
 * happens at mount, not per frame. It is transform-only after that, and it is
 * mounted only on the full motion budget, so no phone ever pays for it. Below
 * `sm` the stylesheet hides it outright as a second line of defence.
 */
const ParallaxWash: React.FC<ParallaxWashProps> = ({ side = 'left', depth = 22, className = '' }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const budget = useMotionBudget();
  const reduced = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  // Opposite directions on opposite sides, so a section with both reads as
  // opening up rather than sliding.
  const travel = side === 'left' ? depth : -depth;
  const y = useTransform(scrollYProgress, [0, 1], [`${travel}%`, `${-travel}%`]);

  if (budget !== 'full' || reduced) {
    return null;
  }

  return (
    <motion.div
      ref={ref}
      aria-hidden
      style={{ y }}
      className={`parallax-wash parallax-wash-${side} ${className}`}
    />
  );
};

export default ParallaxWash;
