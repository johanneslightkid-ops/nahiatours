import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Seconds of hold before the entrance starts, for staggering siblings. */
  delay?: number;
  /** Above the fold: play on mount rather than waiting to be scrolled to. */
  onMount?: boolean;
  style?: React.CSSProperties;
}

/**
 * A fade-and-rise entrance, done in CSS.
 *
 * This used to be `framer-motion`, which is forty kilobytes of gzipped
 * animation runtime — spring solvers, gesture handling, layout projection —
 * bought for the sake of two elements sliding up by twenty-six pixels. An
 * IntersectionObserver and a class does the same job, keeps the motion on the
 * compositor, and leaves framer-motion in the planner's own chunk where the
 * drag and layout work actually needs it.
 *
 * The transition itself lives in `globals.css` under `.reveal`, so the
 * site-wide reduced-motion rule reaches it like everything else.
 */
const Reveal: React.FC<RevealProps> = ({
  children,
  className = '',
  delay = 0,
  onMount = false,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;

    // No observer (or nothing to observe) means the content simply appears,
    // which is the right failure: never leave copy stuck at zero opacity.
    if (onMount || typeof IntersectionObserver === 'undefined' || !ref.current) {
      const frame = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onMount, shown]);

  return (
    <div
      ref={ref}
      className={`reveal${shown ? ' is-revealed' : ''}${className ? ` ${className}` : ''}`}
      style={delay ? { ...style, transitionDelay: `${delay}s` } : style}
    >
      {children}
    </div>
  );
};

export default Reveal;
