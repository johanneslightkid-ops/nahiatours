import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { FaStar } from 'react-icons/fa';
import TestimonialForm from './TestimonialForm';
import { getPublishedTestimonials, submitTestimonial, TestimonialRecord } from '../services/testimonialService';

interface TestimonialDisplayProps {
  locale: string;
}

const TestimonialDisplay: React.FC<TestimonialDisplayProps> = ({ locale }) => {
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** What to tell the visitor after they send one: kept, or not kept. */
  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  useEffect(() => {
    const loadTestimonials = async () => {
      const remoteTestimonials = await getPublishedTestimonials();
      setTestimonials(remoteTestimonials);
    };
    loadTestimonials();
  }, []);

  /**
   * Send the review, THEN show it.
   *
   * The old order was the other way round: the review went into React state
   * first, so it appeared immediately, and the save that followed was allowed
   * to fail in silence. It always did fail — the write it used is admin-only
   * and a visitor has no password — so every review anyone ever left lasted
   * until the next page load and was never stored. Nothing goes on screen now
   * until the server has said it kept it.
   */
  const handleTestimonialSubmit = async (
    name: string,
    email: string,
    review: string,
    profileImage?: string
  ) => {
    setIsSubmitting(true);
    setNotice(null);
    try {
      const { testimonial, pending } = await submitTestimonial({
        name,
        email,
        review,
        rating: 5,
        profileImage,
      });
      // A pending review is not shown here — it is not published yet, and
      // showing it to its author would suggest it is.
      if (!pending) setTestimonials([testimonial, ...testimonials]);
      setNotice({
        tone: 'ok',
        text: pending
          ? '¡Gracias! Tu reseña quedó guardada y aparecerá en cuanto la revisemos.'
          : '¡Gracias! Tu reseña ya está publicada.',
      });
    } catch (error) {
      setNotice({
        tone: 'bad',
        text: `No se pudo guardar tu reseña: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="home-section bay-section px-4 py-20 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-ink mb-4">
            <FormattedMessage id="testimonials.title" />
          </h2>
          <p className="text-lg text-ink-soft">
            Join travelers who came home with brighter stories from the Caribbean
          </p>
        </div>

        {/* Form */}
        <div className="mb-16">
          {notice && (
            <p
              className={`mx-auto mb-5 max-w-2xl rounded-2xl border px-5 py-4 text-center text-sm font-semibold ${
                notice.tone === 'ok'
                  ? 'border-jungle/40 bg-jungle/10 text-jungle-dark'
                  : 'border-hibiscus/40 bg-hibiscus/10 text-hibiscus-dark'
              }`}
              role="status"
            >
              {notice.text}
            </p>
          )}
          <TestimonialForm onSubmit={handleTestimonialSubmit} isLoading={isSubmitting} />
        </div>

        {/* Testimonials Grid */}
        {testimonials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="group rounded-[28px] border border-ink/15 bg-paper p-7 shadow-oil-sm transition-all hover:-translate-y-2 hover: shadow-oil-sm"
              >
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, idx) => (
                    <FaStar
                      key={idx}
                      className={`text-lg ${
                        idx < testimonial.rating ? 'text-mango' : 'text-ink/25'
                      }`}
                    />
                  ))}
                </div>

                {/* Review */}
                <p className="text-ink-soft mb-4 leading-relaxed italic">
                  "{testimonial.review}"
                </p>

                {/* Author */}
                <div className="border-t-2 border-ink/20 pt-4">
                  <p className="font-bold text-ink">{testimonial.name}</p>
                  <p className="text-sm text-ink-light">{testimonial.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-mango-light">
            <p className="text-ink-light text-lg">
              <FormattedMessage id="testimonials.noTestimonials" />
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default TestimonialDisplay;
