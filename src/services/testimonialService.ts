import { ApiError, apiGet, apiPost, apiPut } from './apiClient';

export interface TestimonialRecord {
  id: string;
  name: string;
  email: string;
  review: string;
  rating: number;
  profileImage?: string;
  createdAt: string;
  /**
   * Missing on every review written before moderation existed, and those are
   * already published — so `undefined` means approved and only an explicit
   * `false` holds one back. Reversing that would silently un-publish the lot.
   */
  approved?: boolean;
}

/** A new site begins with no reviews — never with invented guest feedback. */
const defaultTestimonials: TestimonialRecord[] = [];

export const getAverageRating = (testimonials: TestimonialRecord[]): number | null => {
  const visible = testimonials.filter((testimonial) => testimonial.approved !== false);
  if (!visible.length) {
    return null;
  }

  const total = visible.reduce((sum, testimonial) => sum + Number(testimonial.rating || 0), 0);
  return Number((total / visible.length).toFixed(2));
};

export const getRatingVisibility = (
  testimonials: TestimonialRecord[],
  options?: { enabled?: boolean; min?: number; max?: number }
): { visible: boolean; average: number | null; count: number } => {
  const approved = testimonials.filter((testimonial) => testimonial.approved !== false);
  const average = getAverageRating(approved);
  const enabled = options?.enabled ?? true;
  const min = Math.min(Math.max(options?.min ?? 3, 1), 5);
  const max = Math.min(Math.max(options?.max ?? 5, min), 5);

  return {
    visible: enabled && approved.length > 0 && average !== null && average >= min && average <= max,
    average,
    count: approved.length,
  };
};

const unwrapTestimonialPayload = (payload: unknown): TestimonialRecord[] => {
  const record = (payload as Record<string, unknown>)?.record ?? payload;
  if (Array.isArray((record as Record<string, unknown>)?.testimonials)) {
    return (record as Record<string, unknown>).testimonials as TestimonialRecord[];
  }
  if (Array.isArray(record)) {
    return record as TestimonialRecord[];
  }
  return defaultTestimonials;
};

/** Everything stored, approved or not. The admin panel wants this one. */
export const getTestimonials = async (locale?: string): Promise<TestimonialRecord[]> => {
  try {
    const data = await apiGet<unknown>('testimonials', locale ? { locale } : undefined);
    return unwrapTestimonialPayload(data);
  } catch (error) {
    console.warn('Error loading testimonials:', error);
    return defaultTestimonials;
  }
};

/** What a visitor should see: everything except what is waiting for approval. */
export const getPublishedTestimonials = async (locale?: string): Promise<TestimonialRecord[]> =>
  (await getTestimonials(locale)).filter((t) => t.approved !== false);

/**
 * Replace the whole list. Admin only — it needs the password header.
 *
 * This used to catch its own failure and return the list it was given, so a
 * rejected write looked exactly like a successful one. It throws now: a save
 * that did not happen has to be able to say so.
 */
export const saveTestimonials = async (
  testimonials: TestimonialRecord[],
  locale?: string
): Promise<TestimonialRecord[]> => {
  await apiPut<unknown>('testimonials', { testimonials }, locale ? { locale } : undefined);
  return testimonials;
};

/**
 * A visitor leaving a review.
 *
 * Not `saveTestimonials`. That one is the generic writer, it is admin-only,
 * and a visitor calling it got a 401 that was then swallowed — the review
 * appeared on screen and was never stored. This posts the single review to an
 * endpoint that can do nothing else, and it comes back marked pending until
 * somebody approves it in the admin.
 */
export const submitTestimonial = async (input: {
  name: string;
  email: string;
  review: string;
  rating?: number;
  profileImage?: string;
}): Promise<{ testimonial: TestimonialRecord; pending: boolean }> => {
  try {
    const data = await apiPost<{
      ok: boolean;
      testimonial?: TestimonialRecord;
      pending?: boolean;
      error?: string;
    }>('testimonials', input);
    if (!data?.ok || !data.testimonial) {
      throw new Error(data?.error || 'The review could not be saved.');
    }
    return { testimonial: data.testimonial, pending: Boolean(data.pending) };
  } catch (error) {
    const body = error instanceof ApiError ? (error.body as { error?: string } | null) : null;
    throw new Error(body?.error || (error instanceof Error ? error.message : String(error)));
  }
};
