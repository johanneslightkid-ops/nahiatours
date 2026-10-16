/**
 * Article shapes for the blog generator.
 *
 * A model asked for "a blog post" writes the same post every time: a welcome,
 * five adjective-heavy sections and a call to action. What people share and
 * search for has a shape — the honest list, the first-timer's questions, the
 * story of one day, the "this or that" — and each shape is a structure the
 * model can follow and a promise the title can make.
 *
 * Every template says what the reader is trying to decide, so the piece is
 * written to answer that, and ends with questions phrased the way people ask
 * them, which is also how they appear in search.
 */

import type { BlogLang } from './blogTopics';

export interface BlogTemplate {
  id: string;
  label: Record<BlogLang, string>;
  /** One line for the admin: what this shape is good for. */
  hint: string;
  /** The structure, written to the model. */
  structure: string;
  /** How the title should read. */
  title: string;
}

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: 'guide',
    label: { en: 'Insider guide', es: 'Guía local', fr: 'Guide d’initié', de: 'Insider-Guide' },
    hint: 'Lo que un local te contaría: cómo es, cuándo ir, qué evitar.',
    title: 'A promise of insider knowledge, naming the place or excursion.',
    structure: `An insider's guide. Sections: what it is really like (not the brochure);
the best time of day and of year; how the day runs, hour by hour; what to bring
and wear; mistakes first-timers make; who will love it and who should pick
something else; how this operator does it differently.`,
  },
  {
    id: 'story',
    label: { en: 'A day, as a story', es: 'Un día contado', fr: 'Une journée racontée', de: 'Ein Tag als Geschichte' },
    hint: 'Narrativa en primera persona del lector: emociona y se comparte.',
    title: 'Evocative, a moment from the day, not a category.',
    structure: `A narrative of one day, told in the second person and in the present
tense, from pick-up to the drive home. Each section is a moment — a sound, a
taste, a view — and ends with the practical detail a reader needs to live it
too. Close with what stays with you afterwards.`,
  },
  {
    id: 'list',
    label: { en: 'Honest list', es: 'Lista honesta', fr: 'Liste honnête', de: 'Ehrliche Liste' },
    hint: 'Top 7 / 10 razones: el formato que más se comparte en redes.',
    title: 'A number and a specific promise, e.g. "7 things nobody tells you about…".',
    structure: `A numbered list of 7 to 10 items, each its own "## " subheading with a
number. Every item is specific and useful, at least one is a surprise, and one
is an honest drawback with how to deal with it. Two to three paragraphs each.`,
  },
  {
    id: 'faq',
    label: { en: 'First-timer FAQ', es: 'Preguntas frecuentes', fr: 'Questions fréquentes', de: 'Häufige Fragen' },
    hint: 'Responde lo que la gente pregunta en Google y en los comentarios.',
    title: 'The question a first-time visitor actually asks.',
    structure: `Questions and answers. Each "## " subheading is a real question in the
words a visitor would type it (price questions only if the notes give prices).
Answer in the first sentence, then explain. Eight to twelve questions, ordered
from "should I go" to "what do I do on the day".`,
  },
  {
    id: 'itinerary',
    label: { en: 'Itinerary', es: 'Itinerario', fr: 'Itinéraire', de: 'Reiseplan' },
    hint: 'Plan de 3, 5 o 7 días combinando las excursiones elegidas.',
    title: 'A length of stay and who it is for, e.g. "Five days in Punta Cana with kids".',
    structure: `A day-by-day itinerary that combines the featured excursions with rest
days, beach time and one local meal. Each day is a "## " subheading with
morning, afternoon and evening, and a line on why it sits on that day.`,
  },
  {
    id: 'compare',
    label: { en: 'This or that', es: 'Esto o aquello', fr: 'Ceci ou cela', de: 'Dies oder das' },
    hint: 'Compara dos excursiones para ayudar a decidir (ideal con 2 elegidas).',
    title: 'Two options and the decision, e.g. "Saona or Catalina: which island is yours?".',
    structure: `A comparison of the featured excursions (or two styles of the same day).
Sections: the short answer; what each day feels like; who each one suits; the
practical differences (time on the road, time in the water, what is included,
only as far as the notes say); the verdict for each kind of traveller.`,
  },
];

export const templateById = (id: string): BlogTemplate =>
  BLOG_TEMPLATES.find((t) => t.id === id) ?? BLOG_TEMPLATES[0];

/**
 * How each language's readers read, so an edition is written for them rather
 * than translated at them. Broad tendencies of the travel press in each
 * language, used as tone, never as claims about the reader.
 */
export const LANGUAGE_VOICE: Record<BlogLang, string> = {
  en: 'International English, warm and direct, short paragraphs that read well on a phone.',
  es: 'Latin American Spanish, Dominican where it is natural, "tú" not "usted", idioms that exist in Spanish rather than English ones carried across.',
  fr: 'French as the French-language travel press writes it: "vous", elegant but not stiff, attentive to food, culture and authenticity; French typography (a space before ? ! : ;).',
  de: 'German as German travel magazines write it: "du" for a holiday blog, clear and well organised, concrete practical details (timings, what is included, what to bring), honest about drawbacks; no exaggeration.',
};

export const LANGUAGE_NAME: Record<BlogLang, string> = {
  en: 'ENGLISH',
  es: 'SPANISH',
  fr: 'FRENCH',
  de: 'GERMAN',
};
