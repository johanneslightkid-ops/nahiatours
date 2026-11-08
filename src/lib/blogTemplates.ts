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
  /** Target body length, kept practical for all four language editions. */
  targetWords: number;
  /** A direct, model-friendly structure with explicit scope. */
  structure: string;
  /** How the title should read. */
  title: string;
}

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: 'guide',
    label: { en: 'Tour guide', es: 'Guía de excursión', fr: 'Guide de l’excursion', de: 'Ausflugs-Guide' },
    hint: 'A practical, vivid guide to one excursion: what happens, who it suits, and how to prepare.',
    title: 'A promise of insider knowledge, naming the place or excursion.',
    targetWords: 1000,
    structure: `Write a practical guide to the named tour or destination. Use 6 sections in this
order: (1) what the experience is really like, (2) how the day unfolds using
only confirmed details, (3) the landscape and local culture, (4) what to bring
and prepare, (5) who it suits and who may prefer another option, (6) how to
choose or book. Use useful subheadings, not generic filler.`,
  },
  {
    id: 'story',
    label: { en: 'A day of…', es: 'Un día de…', fr: 'Une journée de…', de: 'Ein Tag voller…' },
    hint: 'A sensory, true-to-life day-in-the-life story, from the first moment to the journey home.',
    title: 'Evocative, a moment from the day, not a category.',
    targetWords: 900,
    structure: `Tell one plausible day in the second person and present tense. Use 6 chronological
sections: anticipation and preparation, the start, the journey or arrival, the
main experience, a quiet or social moment, and returning with a lasting
impression. Do not invent exact times, events, dialogue, or amenities; keep
scenes grounded in the operator notes and known tour details.`,
  },
  {
    id: 'list',
    label: { en: 'Worth knowing', es: 'Lo que conviene saber', fr: 'À savoir', de: 'Gut zu wissen' },
    hint: 'A useful, candid list of what travellers should know before they choose.',
    title: 'A number and a specific promise, e.g. "7 things nobody tells you about…".',
    targetWords: 900,
    structure: `Write exactly 7 numbered points as "## 1. …" through "## 7. …". Each point
answers one real planning question or offers one concrete observation. Include
one fair limitation and practical advice for it; do not manufacture a drawback
or claim. Keep each point distinct and useful.`,
  },
  {
    id: 'faq',
    label: { en: 'First-timer’s questions', es: 'Dudas antes de ir', fr: 'Questions avant de partir', de: 'Fragen vor dem Ausflug' },
    hint: 'Clear answers to the practical questions guests ask before booking.',
    title: 'The question a first-time visitor actually asks.',
    targetWords: 850,
    structure: `Write exactly 8 concise question-and-answer sections. Use each question as a
"## " subheading. Answer directly in the first sentence, then add useful
context. Cover fit, preparation, what is included only when confirmed, and
what to expect. Never guess prices, pickup details, duration, or restrictions.`,
  },
  {
    id: 'itinerary',
    label: { en: 'Plan the day', es: 'Planifica el día', fr: 'Organiser la journée', de: 'Den Tag planen' },
    hint: 'A flexible before, during, and after plan based on confirmed tour details.',
    title: 'A length of stay and who it is for, e.g. "Five days in Punta Cana with kids".',
    targetWords: 950,
    structure: `Create a flexible single-day plan with 5 "## " sections: before leaving,
getting there (no invented route or timing), the main experience, time to
unwind, and what to plan for the return. Separate confirmed tour inclusions
from optional ideas. Do not invent an itinerary the operator has not supplied.`,
  },
  {
    id: 'compare',
    label: { en: 'Choose your excursion', es: 'Elige tu excursión', fr: 'Choisir son excursion', de: 'Den Ausflug wählen' },
    hint: 'A fair comparison that helps different travellers choose between selected tours.',
    title: 'Two options and the decision, e.g. "Saona or Catalina: which island is yours?".',
    targetWords: 900,
    structure: `Compare the selected excursions only. If fewer than two are selected, compare two
ways of experiencing the one selected tour without inventing products. Use 5
sections: quick answer, what each experience feels like, who each suits, known
practical differences, and a balanced recommendation by traveller priorities.
State when a detail is not provided rather than guessing.`,
  },
  {
    id: 'local-culture',
    label: { en: 'Local culture & flavours', es: 'Cultura y sabores locales', fr: 'Culture et saveurs locales', de: 'Kultur und Geschmack vor Ort' },
    hint: 'A respectful, people-centred look at Dominican culture connected to the selected tour.',
    title: 'A specific local encounter or tradition, accurately named and grounded in the brief.',
    targetWords: 950,
    structure: `Build a respectful culture-and-place feature around details actually supplied by the
operator or selected tour. Use 5 sections: setting, people and local knowledge,
food/music/craft only when confirmed, how visitors can participate respectfully,
and practical context. Do not exoticise residents, invent traditions, or imply
that one encounter represents all Dominican life.`,
  },
  {
    id: 'family',
    label: { en: 'Family adventure', es: 'Aventura en familia', fr: 'Aventure en famille', de: 'Familienabenteuer' },
    hint: 'A realistic family-focused guide, including preparation and age-appropriate expectations.',
    title: 'A clear family benefit and the specific excursion, not a generic promise.',
    targetWords: 900,
    structure: `Write for the selected family audience without assuming every family is alike.
Use 5 sections: what children and adults may enjoy, how to prepare, moments to
share, practical comfort and safety questions that need confirmation, and who
may prefer another plan. Do not claim age suitability or safety guarantees
unless the operator notes provide them.`,
  },
  {
    id: 'romantic',
    label: { en: 'A slower escape for two', es: 'Una escapada en pareja', fr: 'Une parenthèse à deux', de: 'Eine Auszeit zu zweit' },
    hint: 'An intimate, grounded story for couples without resorting to clichés.',
    title: 'An inviting specific moment for two, connected to the selected tour.',
    targetWords: 850,
    structure: `Write a warm, unhurried feature for two people. Use 5 sections: the shared
setting, a moment worth slowing down for, how to make the day comfortable,
what is genuinely included versus optional, and who this experience suits.
Avoid wedding or honeymoon assumptions and avoid generic romance clichés.`,
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
