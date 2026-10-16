import React, { useEffect, useRef } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { useMediaQuery } from '../../lib/useMediaQuery';
import {
  AngelFish,
  BananaLeaf,
  Bubbles,
  Fern,
  Fish,
  Frigatebird,
  Heliconia,
  Hummingbird,
  MonsteraLeaf,
  PalmFrond,
  ParrotFish,
} from '../ui/Illustrations';

/**
 * The living layer that sits around the copy: leaves that lean in from the
 * edges and drift with the scroll, fish crossing the water bands, birds
 * crossing the sky, bubbles rising from the reef.
 *
 * Two budgets keep it honest on a phone:
 *   • every continuous loop is a CSS animation on `transform` — the
 *     compositor runs it without waking the main thread;
 *   • framer-motion is used where something has to react — to the scroll, to
 *     the pointer, to entering the viewport — and on a phone (coarse pointer)
 *     the counts drop and the pointer-driven pieces are not mounted at all.
 */

/** Small screens get fewer decorative layers. */
export const useLiteNature = () => useMediaQuery('(max-width: 767px), (pointer: coarse)');

/* ── Parallax ──────────────────────────────────────────────────────────── */

interface ParallaxProps {
  /** Pixels of travel across the element's pass through the viewport. */
  distance?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  rotate?: number;
}

export const Parallax: React.FC<ParallaxProps> = ({ distance = 80, className = '', style, children, rotate = 0 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);
  const r = useTransform(scrollYProgress, [0, 1], [-rotate, rotate]);

  return (
    <motion.div ref={ref} className={className} style={reduced ? style : { ...style, y, rotate: r }}>
      {children}
    </motion.div>
  );
};

/* ── Reveal ────────────────────────────────────────────────────────────── */

export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}> = ({ children, className = '', delay = 0, y = 28 }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.25 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

/* ── Leaf canopy ───────────────────────────────────────────────────────── */

type CanopyVariant = 'jungle' | 'shore' | 'garden';

interface LeafSpec {
  node: React.ReactNode;
  className: string;
  /** Static rotation/flip; on an inner wrapper so the parallax transform
      does not replace it. */
  turn: string;
  distance: number;
  rotate: number;
  origin: string;
  lite?: boolean;
}

const canopies: Record<CanopyVariant, LeafSpec[]> = {
  jungle: [
    {
      node: <MonsteraLeaf className="h-full w-full" />,
      className: '-left-16 -top-10 h-52 w-48 sm:h-72 sm:w-64',
      turn: '-rotate-[125deg]',
      distance: 60,
      rotate: 6,
      origin: '50% 100%',
      lite: true,
    },
    {
      node: <PalmFrond color="deep" className="h-full w-full" />,
      className: '-right-24 top-8 h-64 w-64 sm:h-96 sm:w-96',
      turn: 'rotate-[200deg] -scale-x-100',
      distance: 110,
      rotate: 4,
      origin: '0% 100%',
      lite: true,
    },
    {
      node: <BananaLeaf className="h-full w-full" />,
      className: '-left-10 bottom-0 hidden h-80 w-40 md:block',
      turn: 'rotate-[24deg]',
      distance: 140,
      rotate: 5,
      origin: '50% 100%',
    },
    {
      node: <Heliconia className="h-full w-full" />,
      className: 'right-2 -bottom-6 hidden h-56 w-32 lg:block',
      turn: '-rotate-6',
      distance: 50,
      rotate: 3,
      origin: '50% 100%',
    },
  ],
  shore: [
    {
      node: <PalmFrond color="jungle" className="h-full w-full" />,
      className: '-left-28 -top-16 h-72 w-72 sm:h-[26rem] sm:w-[26rem]',
      turn: 'rotate-[150deg] -scale-x-100',
      distance: 90,
      rotate: 5,
      origin: '0% 100%',
      lite: true,
    },
    {
      node: <Fern className="h-full w-full" />,
      className: '-right-10 bottom-4 hidden h-64 w-48 md:block',
      turn: '-rotate-[18deg]',
      distance: 70,
      rotate: 4,
      origin: '50% 100%',
    },
  ],
  garden: [
    {
      node: <MonsteraLeaf tone="fresh" className="h-full w-full" />,
      className: '-right-12 -top-12 h-48 w-44 sm:h-64 sm:w-56',
      turn: 'rotate-[140deg]',
      distance: 70,
      rotate: 6,
      origin: '50% 100%',
      lite: true,
    },
    {
      node: <Fern className="h-full w-full" />,
      className: '-left-12 bottom-6 hidden h-60 w-44 md:block',
      turn: 'rotate-[20deg]',
      distance: 90,
      rotate: 4,
      origin: '50% 100%',
    },
  ],
};

export const LeafCanopy: React.FC<{ variant?: CanopyVariant; className?: string }> = ({ variant = 'jungle', className = '' }) => {
  const lite = useLiteNature();
  const leaves = canopies[variant].filter((leaf) => !lite || leaf.lite);
  return (
    <div className={`pointer-events-none absolute inset-0 z-0 overflow-hidden ${className}`} aria-hidden="true">
      {leaves.map((leaf, i) => (
        <Parallax key={i} distance={lite ? leaf.distance * 0.4 : leaf.distance} className={`absolute ${leaf.className}`}>
          <div className={`h-full w-full ${leaf.turn}`}>
            <div className="leaf-sway h-full w-full" style={{ transformOrigin: leaf.origin, animationDelay: `${-i * 2.3}s` }}>
              {leaf.node}
            </div>
          </div>
        </Parallax>
      ))}
    </div>
  );
};

/* ── Swimming school ───────────────────────────────────────────────────── */

const SCHOOL = [
  { kind: 'parrot', top: '18%', size: 'h-12 w-20 sm:h-16 sm:w-28', duration: 38, delay: -4, dir: 'right' },
  { kind: 'angel', top: '62%', size: 'h-14 w-14 sm:h-20 sm:w-20', duration: 46, delay: -20, dir: 'left' },
  { kind: 'small', top: '40%', size: 'h-5 w-10 text-lagoon-dark', duration: 28, delay: -9, dir: 'right' },
  { kind: 'small', top: '44%', size: 'h-4 w-8 text-lagoon', duration: 28, delay: -10.2, dir: 'right' },
  { kind: 'small', top: '37%', size: 'h-4 w-8 text-sky-dark', duration: 28, delay: -11.1, dir: 'right' },
  { kind: 'parrot', top: '80%', size: 'h-10 w-16 sm:h-12 sm:w-20', duration: 52, delay: -31, dir: 'left' },
] as const;

export const SwimmingSchool: React.FC<{ className?: string; opacity?: number }> = ({ className = '', opacity = 0.9 }) => {
  const lite = useLiteNature();
  const fish = lite ? SCHOOL.slice(0, 3) : SCHOOL;
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ opacity }} aria-hidden="true">
      {fish.map((f, i) => (
        <div
          key={i}
          className="absolute left-0"
          style={{
            top: f.top,
            animation: `${f.dir === 'right' ? 'swimRight' : 'swimLeft'} ${f.duration}s linear infinite`,
            animationDelay: `${f.delay}s`,
          }}
        >
          <div style={{ animation: `swimBob ${4 + (i % 3)}s ease-in-out infinite`, animationDelay: `${-i}s` }}>
            {f.kind === 'parrot' && <ParrotFish className={f.size} />}
            {f.kind === 'angel' && <AngelFish className={f.size} />}
            {f.kind === 'small' && <Fish className={f.size} />}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Birds crossing the sky ────────────────────────────────────────────── */

export const GlidingBirds: React.FC<{ className?: string; tone?: string; count?: number }> = ({
  className = '',
  tone = 'text-ink/70',
  count = 3,
}) => {
  const lite = useLiteNature();
  const birds = Array.from({ length: lite ? Math.min(2, count) : count });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {birds.map((_, i) => (
        <div
          key={i}
          className="absolute left-0"
          style={{
            top: `${8 + i * 11}%`,
            animation: `glide ${46 + i * 13}s linear infinite`,
            animationDelay: `${-i * 17}s`,
          }}
        >
          <div style={{ animation: `bank ${7 + i * 2}s ease-in-out infinite` }}>
            <Frigatebird className={`${tone} ${i === 0 ? 'h-8 w-20' : 'h-6 w-14'}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Bubbles ───────────────────────────────────────────────────────────── */

export const RisingBubbles: React.FC<{ className?: string; columns?: number }> = ({ className = '', columns = 6 }) => {
  const lite = useLiteNature();
  const cols = Array.from({ length: lite ? Math.ceil(columns / 2) : columns });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {cols.map((_, i) => (
        <div
          key={i}
          className="absolute bottom-0"
          style={{
            left: `${8 + ((i * 37) % 86)}%`,
            animation: `bubbleRise ${12 + (i % 4) * 3}s linear infinite`,
            animationDelay: `${-i * 2.7}s`,
          }}
        >
          <Bubbles className="h-24 w-8 opacity-70" />
        </div>
      ))}
    </div>
  );
};

/* ── Hummingbird that follows the pointer ──────────────────────────────── */

/**
 * A Hispaniolan emerald that keeps a little way from the pointer, hovering,
 * turning to face where it is going. Fine pointers only: on a phone there is
 * no pointer to follow, and it would just be another layer to composite.
 */
export const PointerHummingbird: React.FC<{ boundsRef: React.RefObject<HTMLElement> }> = ({ boundsRef }) => {
  const fine = useMediaQuery('(pointer: fine) and (min-width: 1024px)');
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const facing = useMotionValue(1);
  const sx = useSpring(x, { stiffness: 38, damping: 12, mass: 1.2 });
  const sy = useSpring(y, { stiffness: 38, damping: 12, mass: 1.2 });
  const scaleX = useSpring(facing, { stiffness: 200, damping: 20 });

  useEffect(() => {
    const el = boundsRef.current;
    if (!el || !fine || reduced) return;
    const rect = () => el.getBoundingClientRect();
    const start = rect();
    x.set(start.width * 0.6);
    y.set(start.height * 0.22);

    const onMove = (event: PointerEvent) => {
      const r = rect();
      // Hover just ahead and above the pointer, never on top of it.
      const tx = event.clientX - r.left + 46;
      const ty = event.clientY - r.top - 54;
      facing.set(tx < x.get() ? 1 : -1);
      x.set(tx);
      y.set(ty);
    };
    el.addEventListener('pointermove', onMove, { passive: true });
    return () => el.removeEventListener('pointermove', onMove);
  }, [boundsRef, fine, reduced, x, y, facing]);

  if (!fine || reduced) return null;

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-30"
      style={{ x: sx, y: sy }}
      aria-hidden="true"
    >
      <motion.div style={{ scaleX, x: -40, y: -28 }}>
        <Hummingbird className="h-14 w-20" />
      </motion.div>
    </motion.div>
  );
};
