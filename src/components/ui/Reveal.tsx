import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

type Direction = 'up' | 'left' | 'right' | 'none';

interface RevealProps {
  children: React.ReactNode;
  /** Which way the piece slides in from. */
  from?: Direction;
  /** Seconds of delay — used to stagger a row without a parent orchestrator. */
  delay?: number;
  /** Travel distance in px. Smaller for small things. */
  distance?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'header' | 'footer';
}

const offsets: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

/**
 * A piece of the painting arriving as you reach it.
 *
 * This is the site's only universal motion, and it is deliberately the
 * cheapest kind: `transform` and `opacity`, once, then done. `viewport.once`
 * makes framer-motion drop the IntersectionObserver after the first crossing,
 * so a long page does not accumulate a hundred live observers, and nothing
 * here is still animating by the time you have read it.
 *
 * Under `prefers-reduced-motion` the content is simply present — not faded in
 * faster, not moved less. The request was for no motion.
 */
const Reveal: React.FC<RevealProps> = ({
  children,
  from = 'up',
  delay = 0,
  distance = 26,
  className,
  as = 'div',
}) => {
  const reduced = useReducedMotion();
  const Component = motion[as] as typeof motion.div;

  if (reduced) {
    const Plain = as as React.ElementType;
    return <Plain className={className}>{children}</Plain>;
  }

  const { x, y } = offsets[from];

  return (
    <Component
      className={className}
      initial={{ opacity: 0, x: x * distance, y: y * distance }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: '0px 0px -8% 0px' }}
      transition={{
        duration: 0.7,
        delay,
        // A brush stroke slows as it lifts; it does not bounce.
        ease: [0.22, 0.61, 0.36, 1],
      }}
    >
      {children}
    </Component>
  );
};

export default Reveal;
