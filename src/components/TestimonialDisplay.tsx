import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { FaStar } from 'react-icons/fa';
import TestimonialForm from './TestimonialForm';
import { getTestimonials, saveTestimonials, TestimonialRecord } from '../services/testimonialService';

interface TestimonialDisplayProps {
  locale: string;
}

const TestimonialDisplay: React.FC<TestimonialDisplayProps> = ({ locale }) => {
  const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadTestimonials = async () => {
      const remoteTestimonials = await getTestimonials();
      setTestimonials(remoteTestimonials);
    };
    loadTestimonials();
  }, []);

  const handleTestimonialSubmit = async (name: string, email: string, review: string, profileImage?: string) => {
    setIsSubmitting(true);
    try {
      const newTestimonial: TestimonialRecord = {
        id: Date.now().toString(),
        name,
        email,
        review,
        rating: 5,
        profileImage,
        createdAt: new Date().toISOString().split('T')[0]
      };
      const updated = [newTestimonial, ...testimonials];
      setTestimonials(updated);
      await saveTestimonials(updated);
    } catch (error) {
      console.error('Error submitting testimonial:', error);
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
          <TestimonialForm onSubmit={handleTestimonialSubmit} isLoading={isSubmitting} />
        </div>

        {/* Testimonials Grid */}
        {testimonials.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="group rounded-[28px] border border-ink/15 bg-paper p-7 shadow-ink-sm transition-all hover:-translate-y-2 hover: shadow-ink-sm"
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
