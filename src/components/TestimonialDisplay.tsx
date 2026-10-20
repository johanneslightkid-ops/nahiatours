import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FaQuoteLeft, FaStar } from 'react-icons/fa';
import { HiPencil } from 'react-icons/hi';
import TestimonialForm from './TestimonialForm';
import { getAverageRating, getPublishedTestimonials, submitTestimonial, TestimonialRecord } from '../services/testimonialService';
import type { Locale } from '../contexts/I18nContext';
import AutoScrollGallery from './edt/AutoScrollGallery';

interface TestimonialDisplayProps {
  locale: string;
}

type L = Record<Locale, string>;

const COPY = {
  kicker: { en: 'Guest reviews', es: 'Opiniones', fr: 'Avis des voyageurs', de: 'Gästestimmen' },
  average: { en: 'average.', es: 'de media.', fr: 'de moyenne.', de: 'im Schnitt.' },
  why: { en: 'Here’s why.', es: 'Te contamos por qué.', fr: 'Voici pourquoi.', de: 'Und darum.' },
  title: { en: 'What our guests say', es: 'Lo que dicen nuestros viajeros', fr: 'Ce que disent nos voyageurs', de: 'Was unsere Gäste sagen' },
  text: { en: 'Straight from people who spent a day with us.', es: 'Directo de quienes pasaron un día con nosotros.', fr: 'Directement de ceux qui ont passé une journée avec nous.', de: 'Direkt von Menschen, die einen Tag mit uns verbracht haben.' },
  reviews: { en: 'reviews', es: 'reseñas', fr: 'avis', de: 'Bewertungen' },
  write: { en: 'Share your story', es: 'Comparte tu experiencia', fr: 'Partagez votre expérience', de: 'Erzähl uns davon' },
  close: { en: 'Close', es: 'Cerrar', fr: 'Fermer', de: 'Schließen' },
  pending: { en: 'Thank you! Your review is saved and will appear once we have read it.', es: '¡Gracias! Tu reseña quedó guardada y aparecerá en cuanto la revisemos.', fr: 'Merci ! Votre avis est enregistré et sera publié après relecture.', de: 'Danke! Deine Bewertung ist gespeichert und erscheint, sobald wir sie gelesen haben.' },
  published: { en: 'Thank you! Your review is published.', es: '¡Gracias! Tu reseña ya está publicada.', fr: 'Merci ! Votre avis est publié.', de: 'Danke! Deine Bewertung ist veröffentlicht.' },
  failed: { en: 'Your review could not be saved:', es: 'No se pudo guardar tu reseña:', fr: 'Votre avis n’a pas pu être enregistré :', de: 'Deine Bewertung konnte nicht gespeichert werden:' },
  empty: { en: 'Be the first to share your adventure!', es: '¡Sé el primero en contar tu aventura!', fr: 'Soyez le premier à raconter votre aventure !', de: 'Erzähl als Erste:r von deinem Abenteuer!' },
  label: { en: 'Guest reviews', es: 'Opiniones', fr: 'Avis', de: 'Bewertungen' },
};

const lang = (locale: string): Locale => (['es', 'fr', 'de'].includes(locale) ? (locale as Locale) : 'en');

const initials = (name: string) =>
  name
    .split(/[\s·]+/)
    .filter((part) => /^\p{L}/u.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

const ReviewCard: React.FC<{ testimonial: TestimonialRecord }> = ({ testimonial }) => {
  const [name, origin] = testimonial.name.split(' · ');
  return (
    <figure className="review-card w-[19rem] sm:w-[25rem]">
      <FaQuoteLeft className="h-7 w-7 text-gold" aria-hidden="true" />
      <blockquote className="mt-5 flex-1 text-[1.06rem] leading-relaxed text-ink">{testimonial.review}</blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-ink/10 pt-5">
        {testimonial.profileImage ? (
          <img src={testimonial.profileImage} alt="" className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-ink font-condensed text-sm font-bold tracking-[0.1em] text-mango-light">{initials(name)}</span>
        )}
        <span className="flex-1">
          <span className="block font-semibold text-ink">{name}</span>
          {origin && <span className="block text-sm text-ink-light">{origin}</span>}
        </span>
        <span className="flex gap-0.5" aria-label={`${testimonial.rating} / 5`}>
          {[...Array(5)].map((_, idx) => (
            <FaStar key={idx} className={`h-3.5 w-3.5 ${idx < testimonial.rating ? 'text-mango' : 'text-ink/15'}`} />
          ))}
        </span>
      </figcaption>
    </figure>
  );
};

/**
 * "4.99 average. Here's why." — the average is the real one, worked out from
 * the published reviews, and the reviews run below it as a reel. Writing one
 * opens the form in place.
 */
const TestimonialDisplay: React.FC<TestimonialDisplayProps> = ({ locale: rawLocale }) => {
  const locale = lang(rawLocale);
  const reduced = useReducedMotion();
  const region = useRef<HTMLElement>(null);
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [writing, setWriting] = useState(false);
  /** What to tell the visitor after they send one: kept, or not kept. */
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    getPublishedTestimonials().then(setTestimonials);
  }, []);

  /**
   * Send the review, THEN show it: nothing goes on screen until the server
   * has said it kept it.
   */
  const handleTestimonialSubmit = async (name: string, email: string, review: string, profileImage?: string) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const { testimonial, pending } = await submitTestimonial({ name, email, review, rating: 5, profileImage });
      if (!pending) setTestimonials([testimonial, ...testimonials]);
      setNotice({ tone: 'ok', text: pending ? COPY.pending[locale] : COPY.published[locale] });
      setWriting(false);
    } catch (error) {
      setNotice({ tone: 'bad', text: `${COPY.failed[locale]} ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const average = getAverageRating(testimonials);

  return (
    <section ref={region} className="home-section bay-section relative overflow-hidden py-20 sm:py-28" aria-label={COPY.label[locale]}>
      <div className="section-shell mb-12 grid gap-8 lg:grid-cols-[1.3fr,1fr] lg:items-end">
        <div>
          <span className="kicker">{COPY.kicker[locale]}</span>
          <h2 className="display-lg mt-4">
            {average !== null ? (
              <>
                <span className="text-mango-dark">{average.toFixed(2)}</span> {COPY.average[locale]}
                <br />
                {COPY.why[locale]}
              </>
            ) : (
              COPY.title[locale]
            )}
          </h2>
        </div>
        <div className="flex flex-col gap-5 lg:items-end">
          <p className="lede lg:text-right">
            {COPY.text[locale]}
            {testimonials.length > 0 && (
              <span className="mt-1 block font-condensed text-sm font-bold uppercase tracking-[0.18em] text-gold-dark">
                {testimonials.length} {COPY.reviews[locale]}
              </span>
            )}
          </p>
          <button type="button" onClick={() => setWriting((value) => !value)} className="btn-outline self-start lg:self-end" aria-expanded={writing}>
            <HiPencil className="h-4 w-4" /> {writing ? COPY.close[locale] : COPY.write[locale]}
          </button>
        </div>
      </div>

      <div className="section-shell">
        {notice && (
          <p
            className={`mx-auto mb-8 max-w-2xl rounded-[6px] border px-5 py-4 text-center text-sm font-semibold ${
              notice.tone === 'ok' ? 'border-jungle/40 bg-jungle/10 text-jungle-dark' : 'border-hibiscus/40 bg-hibiscus/10 text-hibiscus-dark'
            }`}
            role="status"
          >
            {notice.text}
          </p>
        )}
        <AnimatePresence>
          {writing && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-12"
            >
              <TestimonialForm onSubmit={handleTestimonialSubmit} isLoading={isSubmitting} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {testimonials.length > 0 ? (
        <AutoScrollGallery
          items={testimonials}
          itemKey={(item) => item.id}
          renderItem={(item) => <ReviewCard testimonial={item} />}
          regionRef={region}
          speed={26}
          label={COPY.label[locale]}
        />
      ) : (
        <div className="section-shell">
          <div className="rounded-[8px] border border-dashed border-gold/60 bg-paper py-12 text-center text-lg text-ink-light">{COPY.empty[locale]}</div>
        </div>
      )}
    </section>
  );
};

export default TestimonialDisplay;
