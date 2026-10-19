import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronLeft, HiChevronRight, HiX } from 'react-icons/hi';
import { MdFullscreen } from 'react-icons/md';
import { useReducedMotion } from 'framer-motion';
import { localeText } from '../../lib/localeText';

/**
 * The photographs of a tour, one at a time.
 *
 * A row of full-width slides in a native scroll-snap track: a finger swipes
 * it, a trackpad scrolls it, the arrows, the dots, the thumbnails and the
 * keyboard move it, and the browser does the moving — nothing is animated by
 * script. Only the first photograph is fetched up front. A tap opens the same
 * track full screen.
 *
 * The look of every part (frame, arrows, dots, thumbnails) comes from the
 * site's own `.dv-carousel*` rules in globals.css; the layout here works
 * without them.
 */

interface Props {
  images: string[];
  title: string;
  locale: string;
}

const useTrack = (count: number) => {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = track.current;
    if (!element || count < 2) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setIndex(Number((entry.target as HTMLElement).dataset.index ?? 0));
        }
      },
      { root: element, threshold: 0.6 }
    );
    element.querySelectorAll('[data-index]').forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [count]);

  const go = useCallback(
    (next: number) => {
      const element = track.current;
      if (!element || count === 0) return;
      const target = (next + count) % count;
      element.scrollTo({ left: target * element.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
    },
    [count, reduced]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(index + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(index - 1);
    }
  };

  return { track, index, go, onKeyDown };
};

const Slides: React.FC<{
  images: string[];
  title: string;
  track: React.RefObject<HTMLDivElement>;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onOpen?: (index: number) => void;
  fit: 'cover' | 'contain';
  startAt?: number;
  label: string;
}> = ({ images, title, track, onKeyDown, onOpen, fit, startAt = 0, label }) => {
  useEffect(() => {
    if (startAt && track.current) track.current.scrollLeft = startAt * track.current.clientWidth;
  }, [startAt, track]);
  return (
    <div
      ref={track}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={label}
      className="dv-carousel-track flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {images.map((src, index) => (
        <figure key={`${src}-${index}`} data-index={index} className="dv-carousel-slide relative m-0 h-full w-full shrink-0 snap-center" aria-label={`${index + 1} / ${images.length}`}>
          {onOpen ? (
            <button type="button" onClick={() => onOpen(index)} className="block h-full w-full cursor-zoom-in" aria-label={`${title} — ${index + 1}`}>
              <img
                src={src}
                alt={`${title} — ${index + 1}`}
                className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                draggable={false}
                {...(index === 0 ? { fetchpriority: 'high' } : {})}
              />
            </button>
          ) : (
            <img
              src={src}
              alt={`${title} — ${index + 1}`}
              className={`h-full w-full ${fit === 'cover' ? 'object-cover' : 'object-contain'}`}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          )}
        </figure>
      ))}
    </div>
  );
};

const Controls: React.FC<{ count: number; index: number; go: (next: number) => void; locale: string; dark?: boolean }> = ({ count, index, go, locale }) =>
  count > 1 ? (
    <>
      <button
        type="button"
        onClick={() => go(index - 1)}
        className="dv-carousel-arrow dv-carousel-prev absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center"
        aria-label={localeText(locale, { en: 'Previous photo', es: 'Foto anterior', de: 'Vorheriges Foto', fr: 'Photo précédente' })}
      >
        <HiChevronLeft className="h-6 w-6" />
      </button>
      <button
        type="button"
        onClick={() => go(index + 1)}
        className="dv-carousel-arrow dv-carousel-next absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center"
        aria-label={localeText(locale, { en: 'Next photo', es: 'Foto siguiente', de: 'Nächstes Foto', fr: 'Photo suivante' })}
      >
        <HiChevronRight className="h-6 w-6" />
      </button>
      <span className="dv-carousel-count absolute right-3 top-3 z-10 tabular-nums" aria-live="polite">
        {index + 1} / {count}
      </span>
      <div className="dv-carousel-dots absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
        {Array.from({ length: Math.min(count, 12) }, (_, dot) => (
          <button
            key={dot}
            type="button"
            onClick={() => go(dot)}
            aria-label={`${dot + 1} / ${count}`}
            aria-current={dot === index ? 'true' : undefined}
            className="dv-carousel-dot h-2 w-2 rounded-full"
            data-active={dot === index}
          />
        ))}
      </div>
    </>
  ) : null;

const Lightbox: React.FC<{ images: string[]; title: string; startAt: number; locale: string; onClose: () => void }> = ({ images, title, startAt, locale, onClose }) => {
  const { track, index, go, onKeyDown } = useTrack(images.length);
  useEffect(() => {
    const root = document.documentElement;
    const previous = { body: document.body.style.overflow, root: root.style.overflow };
    document.body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    track.current?.focus();
    return () => {
      document.body.style.overflow = previous.body;
      root.style.overflow = previous.root;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, track]);
  return createPortal(
    <div className="dv-lightbox fixed inset-0 z-[120] bg-ink/95" role="dialog" aria-modal="true" aria-label={title}>
      <Slides images={images} title={title} track={track} onKeyDown={onKeyDown} fit="contain" startAt={startAt} label={title} />
      <Controls count={images.length} index={index} go={go} locale={locale} dark />
      <button
        type="button"
        onClick={onClose}
        className="dv-carousel-arrow dv-lightbox-close absolute left-3 top-3 z-20 grid h-11 w-11 place-items-center"
        aria-label={localeText(locale, { en: 'Close', es: 'Cerrar', de: 'Schließen', fr: 'Fermer' })}
      >
        <HiX className="h-6 w-6" />
      </button>
    </div>,
    document.body
  );
};

const DetailCarousel: React.FC<Props> = ({ images, title, locale }) => {
  const { track, index, go, onKeyDown } = useTrack(images.length);
  const [open, setOpen] = useState<number | null>(null);
  const thumbs = useRef<HTMLDivElement>(null);

  // Keep the current thumbnail in view as the photos change.
  useEffect(() => {
    const active = thumbs.current?.querySelector<HTMLElement>(`[data-thumb="${index}"]`);
    const strip = thumbs.current;
    if (active && strip) strip.scrollTo({ left: active.offsetLeft - strip.clientWidth / 2 + active.clientWidth / 2, behavior: 'smooth' });
  }, [index]);

  if (images.length === 0) return null;

  return (
    <div className="dv-carousel" role="region" aria-roledescription="carousel" aria-label={title}>
      <div className="dv-carousel-frame relative aspect-[4/3] overflow-hidden sm:aspect-[16/10]">
        <Slides images={images} title={title} track={track} onKeyDown={onKeyDown} onOpen={setOpen} fit="cover" label={title} />
        <Controls count={images.length} index={index} go={go} locale={locale} />
        <button
          type="button"
          onClick={() => setOpen(index)}
          className="dv-carousel-zoom absolute bottom-3 right-3 z-10 grid h-10 w-10 place-items-center"
          aria-label={localeText(locale, { en: 'Show full screen', es: 'Ver en pantalla completa', de: 'Vollbild', fr: 'Plein écran' })}
        >
          <MdFullscreen className="h-6 w-6" />
        </button>
      </div>

      {images.length > 1 && (
        <div ref={thumbs} className="dv-carousel-thumbs mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
          {images.map((src, thumb) => (
            <button
              key={`${src}-${thumb}`}
              type="button"
              data-thumb={thumb}
              data-active={thumb === index}
              onClick={() => go(thumb)}
              className="dv-carousel-thumb h-16 w-24 shrink-0 overflow-hidden sm:h-20 sm:w-28"
              aria-label={`${thumb + 1} / ${images.length}`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      {open !== null && <Lightbox images={images} title={title} startAt={open} locale={locale} onClose={() => setOpen(null)} />}
    </div>
  );
};

export default DetailCarousel;
