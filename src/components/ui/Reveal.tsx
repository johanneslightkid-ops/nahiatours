import React, { useEffect, useRef, useState } from 'react';

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger within a group, in milliseconds. Keep it under ~240ms total. */
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li' | 'header';
}

/**
 * Arrive once, on the way past.
 *
 * This replaces framer-motion's `whileInView` everywhere it was used for a
 * simple fade-and-rise. That library is 110 kB of JavaScript that has to parse
 * before the first paint, and it was pulled in to do what one
 * IntersectionObserver and two CSS properties do here.
 *
 * The animation is `opacity` and `transform` only, so it runs on the
 * compositor and never triggers layout or paint. The observer disconnects
 * after the first intersection: nothing on this page should animate twice, and
 * an observer left attached to fifty cards is fifty callbacks per scroll.
 *
 * `prefers-reduced-motion` is handled in CSS rather than here, so the element
 * is visible from the first frame for anyone who asked for that.
 */
const Reveal: React.FC<RevealProps> = ({ children, className = '', delay = 0, as = 'div' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No observer (old Safari, a test runner): show the content, don't hide it.
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // A little before the edge, so the movement has finished by the time the
      // element is properly in view.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${shown ? 'is-revealed' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
};

export default Reveal;
