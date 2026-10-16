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

/**
 * Shown when the site has no reviews of its own yet.
 *
 * These are examples, not this operator's reviews. They are what a fresh
 * install displays so the section is not an empty hole, and the moment KV
 * holds anything they are gone.
 */
const defaultTestimonials: TestimonialRecord[] = [
  {
    id: '1',
    name: 'Sarah Martinez',
    email: 'sarah@example.com',
    review:
      'The quad adventure was absolutely incredible! Our guide knew everything about the jungle, and the cenote was so refreshing. Best day of our vacation!',
    rating: 5,
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'michael@example.com',
    review:
      'The Saona Island party boat exceeded all expectations. The energy was infectious, the food was delicious, and the snorkeling was amazing. Definitely doing it again next year!',
    rating: 5,
    createdAt: '2024-03-10',
  },
  {
    id: '3',
    name: 'Emma García',
    email: 'emma@example.com',
    review:
      'Las cascadas de Samaná fueron hermosas. La caminata fue perfecta, el guía muy atento, y las fotos quedaron espectaculares. Una experiencia que nunca voy a olvidar.',
    rating: 5,
    createdAt: '2024-03-05',
  },
];

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
export const getTestimonials = async (): Promise<TestimonialRecord[]> => {
  try {
    const data = await apiGet<unknown>('testimonials');
    return unwrapTestimonialPayload(data);
  } catch (error) {
    console.warn('Error loading testimonials:', error);
    return defaultTestimonials;
  }
};

/** What a visitor should see: everything except what is waiting for approval. */
export const getPublishedTestimonials = async (): Promise<TestimonialRecord[]> =>
  (await getTestimonials()).filter((t) => t.approved !== false);

/**
 * Replace the whole list. Admin only — it needs the password header.
 *
 * This used to catch its own failure and return the list it was given, so a
 * rejected write looked exactly like a successful one. It throws now: a save
 * that did not happen has to be able to say so.
 */
export const saveTestimonials = async (
  testimonials: TestimonialRecord[]
): Promise<TestimonialRecord[]> => {
  await apiPut<unknown>('testimonials', { testimonials });
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
