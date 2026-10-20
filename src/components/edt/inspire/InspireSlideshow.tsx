import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { InspireTransition } from '../../../edt/inspireConfig';
import { preloadImage } from '../../../edt/bigScreen';

/**
 * Pictures that give way to each other with a chosen transition — the show's
 * background, and a tour's photos.
 *
 * At most two layers exist: the picture leaving and the one arriving. The
 * arriving one is fetched and decoded first, so a transition never starts
 * on a half-loaded picture; the leaving one is removed the moment the
 * transition ends, so the TV holds two decoded pictures, never a pile.
 *
 * Every transition is a pair of CSS keyframes in globals.css (`tr-<name>-in`,
 * `tr-<name>-out`) moving only transform and opacity, which a TV's compositor
 * does without repainting. Going backwards sets `--dir` to -1, which the
 * keyframes multiply into their distances and pivots, so "previous" slides
 * in from the left. Ken Burns is a cross-dissolve plus
 * a slow drift on the picture that holds the stage; `drift` turns that off
 * on a screen that cannot afford it.
 */

const CONCRETE: Exclude<InspireTransition, 'random' | 'kenburns'>[] = ['dissolve', 'push', 'cover', 'zoom', 'wipe', 'iris', 'cube', 'flip'];
/** The picture inside the moving frame has its own motion for these two. */
const INNER: Partial<Record<InspireTransition, string>> = { wipe: 'tr-wipe-inner', iris: 'tr-iris-inner' };

interface Layer {
  key: number;
  src: string;
  role: 'still' | 'in' | 'out';
  transition: Exclude<InspireTransition, 'random'>;
  reverse: boolean;
}

interface Props {
  slides: string[];
  index: number;
  transition: InspireTransition;
  transitionSeconds: number;
  /** For Ken Burns: how long a picture stays, so its drift lasts as long. */
  holdSeconds: number;
  /** Ken Burns drift on the picture holding the stage. */
  drift: boolean;
  /** Show nothing until the first change (something else shows the first picture). */
  startEmpty?: boolean;
  className?: string;
}

const InspireSlideshow: React.FC<Props> = ({ slides, index, transition, transitionSeconds, holdSeconds, drift, startEmpty = false, className = '' }) => {
  const [layers, setLayers] = useState<Layer[]>(() =>
    startEmpty || !slides.length ? [] : [{ key: 0, src: slides[index % slides.length], role: 'still', transition: 'dissolve', reverse: false }]
  );
  const stage = useRef<HTMLDivElement>(null);
  const shown = useRef(index);
  const seq = useRef(1);
  const timer = useRef(0);

  // The iris needs the stage's size: a circle that covers it from the centre.
  useLayoutEffect(() => {
    const element = stage.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      element.style.setProperty('--tr-w', `${width}px`);
      element.style.setProperty('--tr-h', `${height}px`);
      element.style.setProperty('--tr-d', `${Math.ceil(Math.hypot(width, height))}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!slides.length || index === shown.current) return undefined;
    let live = true;
    const count = slides.length;
    const forward = (index - shown.current + count) % count <= count / 2;
    shown.current = index;
    const src = slides[index % count];
    const chosen: Exclude<InspireTransition, 'random'> =
      transition === 'random' ? CONCRETE[Math.floor(Math.random() * CONCRETE.length)] : transition;

    preloadImage(src).then(() => {
      if (!live) return;
      const key = seq.current++;
      window.clearTimeout(timer.current);
      setLayers((current) => {
        // A change during a transition: the arriving picture becomes the one leaving.
        const top = current.filter((layer) => layer.role !== 'out').slice(-1)[0];
        return [
          ...(top ? [{ ...top, role: 'out' as const, transition: chosen, reverse: !forward }] : []),
          { key, src, role: 'in', transition: chosen, reverse: !forward },
        ];
      });
      timer.current = window.setTimeout(() => {
        setLayers((current) => current.filter((layer) => layer.key === key).map((layer) => ({ ...layer, role: 'still' })));
      }, transitionSeconds * 1000 + 60);
    });
    return () => {
      live = false;
    };
  }, [index, slides, transition, transitionSeconds]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const ms = `${Math.round(transitionSeconds * 1000)}ms`;

  return (
    <div ref={stage} className={`tr-stage ${className}`} aria-hidden="true">
      {layers.map((layer) => {
        const moving = layer.role !== 'still';
        const name = layer.transition === 'kenburns' ? 'dissolve' : layer.transition;
        const frame = (moving
          ? { animationName: `tr-${name}-${layer.role}`, animationDuration: ms, '--dir': layer.reverse ? -1 : 1 }
          : {}) as React.CSSProperties;
        const inner = INNER[name];
        const picture: React.CSSProperties =
          moving && inner && layer.role === 'in'
            ? { animationName: inner, animationDuration: ms }
            : // Kept while it leaves too, so the drift fades out instead of snapping back.
            drift && layer.transition === 'kenburns'
            ? { animationName: `tr-drift-${layer.key % 4}`, animationDuration: `${Math.round((holdSeconds + transitionSeconds * 2) * 1000)}ms` }
            : {};
        return (
          <div
            key={layer.key}
            className={`tr-layer ${moving ? 'tr-anim' : ''} ${name === 'iris' && layer.role === 'in' ? 'tr-iris' : ''}`}
            style={{ ...frame, zIndex: layer.role === 'out' ? 1 : 2 }}
          >
            <img src={layer.src} alt="" decoding="async" className="tr-picture" style={picture} />
          </div>
        );
      })}
    </div>
  );
};

export default InspireSlideshow;
