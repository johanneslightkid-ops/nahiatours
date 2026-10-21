import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FaQuestionCircle, FaTimes, FaArrowLeft, FaArrowRight, FaExternalLinkAlt, FaInfoCircle, FaChevronDown } from 'react-icons/fa';

/**
 * A step-by-step guide for the payments admin: where each code, key or
 * number comes from. Every step is a small card placed next to the field it
 * explains (found by its `data-help` attribute), with an arrow pointing at
 * it; a side card holds what has to happen first — which account to open,
 * where to log in. Purely presentational: nothing here reads or saves values.
 */

export interface HelpLink {
  label: string;
  url: string;
}

export interface HelpStep {
  /** The `data-help` value of the field this step points at. */
  target: string;
  title: string;
  body: React.ReactNode;
  link?: HelpLink;
}

export interface HelpTopic {
  title: string;
  /** The groundwork, shown beside the steps for the whole tour. */
  intro: React.ReactNode;
  introLinks: HelpLink[];
  steps: HelpStep[];
}

export const HelpButton = ({ onClick, label = 'Ayuda paso a paso' }: { onClick: () => void; label?: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-1.5 rounded-full border border-lagoon-dark/40 bg-paper px-3 py-1.5 text-xs font-semibold text-lagoon-dark transition hover:bg-lagoon/10"
  >
    <FaQuestionCircle /> {label}
  </button>
);

const ExternalLink = ({ link }: { link: HelpLink }) => (
  <a
    href={link.url}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 break-all font-semibold text-lagoon-dark underline underline-offset-2"
  >
    {link.label} <FaExternalLinkAlt className="shrink-0 text-[0.65rem]" />
  </a>
);

const CARD_WIDTH = 340;
const GAP = 14;

interface Placement {
  top: number;
  left: number;
  width: number;
  above: boolean;
  arrowLeft: number;
  ring: { top: number; left: number; width: number; height: number } | null;
}

const PaymentHelpTour = ({ topic, onClose }: { topic: HelpTopic; onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const [introOpen, setIntroOpen] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)').matches : true
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const step = topic.steps[index];
  const total = topic.steps.length;

  const findTarget = () => document.querySelector<HTMLElement>(`[data-help="${step.target}"]`);

  // Bring the field into view when the step changes, and focus it so the
  // operator can paste straight away.
  useEffect(() => {
    const target = findTarget();
    if (!target) return;
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const focusable = target.matches('input, select, textarea') ? target : target.querySelector<HTMLElement>('input, select, textarea');
    focusable?.focus({ preventScroll: true });
  }, [index, topic]);

  // Follow the field while the page scrolls or resizes.
  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      const target = findTarget();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const width = Math.min(CARD_WIDTH, viewportWidth - 32);
      const cardHeight = cardRef.current?.offsetHeight ?? 220;
      if (!target) {
        setPlacement({ top: viewportHeight / 2 - cardHeight / 2, left: (viewportWidth - width) / 2, width, above: false, arrowLeft: -100, ring: null });
        return;
      }
      const rect = target.getBoundingClientRect();
      const roomBelow = viewportHeight - rect.bottom;
      const above = roomBelow < cardHeight + GAP + 16 && rect.top > roomBelow;
      const top = above ? rect.top - cardHeight - GAP : rect.bottom + GAP;
      const centre = rect.left + rect.width / 2;
      const left = Math.min(Math.max(16, centre - width / 2), viewportWidth - width - 16);
      setPlacement({
        top,
        left,
        width,
        above,
        arrowLeft: Math.min(Math.max(18, centre - left), width - 18),
        ring: { top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 },
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(place);
    };
    schedule();
    window.addEventListener('scroll', schedule, true);
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule, true);
      window.removeEventListener('resize', schedule);
    };
  }, [index, topic, introOpen]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight' && index < total - 1) setIndex(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) setIndex(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, total, onClose]);

  return (
    <>
      {/* The field being explained, ringed. Never blocks typing into it. */}
      {placement?.ring && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-2xl ring-4 ring-mango"
          style={{ top: placement.ring.top, left: placement.ring.left, width: placement.ring.width, height: placement.ring.height }}
        />
      )}

      {/* Groundwork: what to open before the first step. */}
      <aside
        className="fixed inset-x-4 top-4 z-[61] rounded-3xl border border-lagoon-dark/30 bg-paper p-4 shadow-xl lg:inset-x-auto lg:right-6 lg:top-24 lg:w-80"
        aria-label={`${topic.title}: antes de empezar`}
      >
        <button
          type="button"
          onClick={() => setIntroOpen(!introOpen)}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={introOpen}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <FaInfoCircle className="text-lagoon-dark" /> {topic.title} · antes de empezar
          </span>
          <FaChevronDown className={`shrink-0 text-ink-light transition-transform ${introOpen ? 'rotate-180' : ''}`} />
        </button>
        {introOpen && (
          <div className="mt-3 max-h-[40vh] space-y-3 overflow-y-auto text-xs leading-relaxed text-ink-soft lg:max-h-[60vh]">
            {topic.intro}
            <ul className="space-y-1.5">
              {topic.introLinks.map((link) => (
                <li key={link.url}>
                  <ExternalLink link={link} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* The step itself, pointing at its field. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-label={`${topic.title}: paso ${index + 1} de ${total}`}
        className="fixed z-[62] rounded-3xl border border-ink/10 bg-paper p-4 shadow-2xl"
        style={{ top: placement?.top ?? -9999, left: placement?.left ?? 0, width: placement?.width ?? CARD_WIDTH }}
      >
        {placement && placement.arrowLeft > 0 && (
          <span
            aria-hidden
            className={`absolute h-4 w-4 rotate-45 border-ink/10 bg-paper ${placement.above ? '-bottom-2 border-b border-r' : '-top-2 border-l border-t'}`}
            style={{ left: placement.arrowLeft - 8 }}
          />
        )}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="rounded-full bg-mango/25 px-2.5 py-0.5 text-xs font-bold text-ink">
            Paso {index + 1}/{total}
          </span>
          <button type="button" onClick={onClose} className="text-ink-light hover:text-ink" aria-label="Cerrar la ayuda">
            <FaTimes />
          </button>
        </div>
        <h5 className="text-sm font-semibold text-ink">{step.title}</h5>
        <div className="mt-1.5 space-y-2 text-xs leading-relaxed text-ink-soft">{step.body}</div>
        {step.link && (
          <div className="mt-2 text-xs">
            <ExternalLink link={step.link} />
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            disabled={index === 0}
            className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink-soft disabled:opacity-40"
          >
            <FaArrowLeft /> Anterior
          </button>
          <div className="flex gap-1" aria-hidden>
            {topic.steps.map((_, dot) => (
              <span key={dot} className={`h-1.5 w-1.5 rounded-full ${dot === index ? 'bg-lagoon-dark' : 'bg-ink/20'}`} />
            ))}
          </div>
          {index < total - 1 ? (
            <button
              type="button"
              onClick={() => setIndex(index + 1)}
              className="inline-flex items-center gap-1.5 rounded-full bg-lagoon-dark px-3 py-1.5 text-xs font-semibold text-white"
            >
              Siguiente <FaArrowRight />
            </button>
          ) : (
            <button type="button" onClick={onClose} className="rounded-full bg-lagoon-dark px-3 py-1.5 text-xs font-semibold text-white">
              Listo
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default PaymentHelpTour;
