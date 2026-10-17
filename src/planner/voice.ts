/**
 * Voice for the planner, without understanding language.
 *
 * The guide never has to know what a sentence means. Every question offers a
 * handful of answers on screen, so all it has to do is tell which of those
 * answers — or which of a few commands — the guest just said. That is a
 * matching problem over a dozen known phrases, which the browser's own speech
 * recogniser plus this file solve reliably in four languages, with no model,
 * no server of ours and no library.
 *
 * Everything here is pure, so it can be tested without a microphone.
 */

export type VoiceLocale = 'en' | 'es' | 'de' | 'fr';

export type VoiceCommand = 'next' | 'back' | 'repeat' | 'none' | 'stop';

export interface VoiceOption {
  id: string;
  label: string;
  /** Extra words that should also pick this option. */
  aliases?: string[];
}

export type VoiceMatch =
  | { kind: 'option'; id: string; heard: string }
  | { kind: 'number'; value: number; heard: string }
  | { kind: 'command'; command: VoiceCommand; heard: string };

export const voiceLocale = (locale: string): VoiceLocale =>
  (['es', 'de', 'fr'] as const).find((code) => locale.startsWith(code)) ?? 'en';

/**
 * Recogniser language. Spanish is set to Mexico's because the guests writing
 * in Spanish here come from across Latin America, and es-MX is the variant
 * every major engine supports best for those accents.
 */
export const RECOGNITION_LANG: Record<VoiceLocale, string> = {
  en: 'en-US',
  es: 'es-MX',
  de: 'de-DE',
  fr: 'fr-FR',
};

/** Voices in order of preference for each language. */
const VOICE_PREFERENCE: Record<VoiceLocale, string[]> = {
  en: ['en-US', 'en-CA', 'en-GB', 'en'],
  es: ['es-MX', 'es-US', 'es-419', 'es-CO', 'es-AR', 'es-ES', 'es'],
  de: ['de-DE', 'de-AT', 'de-CH', 'de'],
  fr: ['fr-FR', 'fr-CA', 'fr-BE', 'fr-CH', 'fr'],
};

/**
 * Pick the system voice to read with. A voice the device synthesises itself
 * (`localService`) is preferred: it starts instantly, works offline and runs
 * on the phone's own speech engine rather than a network round trip.
 */
export const pickVoice = (
  voices: SpeechSynthesisVoice[],
  locale: VoiceLocale
): SpeechSynthesisVoice | undefined => {
  const norm = (tag: string) => tag.replace('_', '-').toLowerCase();
  for (const tag of VOICE_PREFERENCE[locale]) {
    const want = norm(tag);
    const fits = voices.filter((voice) => {
      const lang = norm(voice.lang);
      return want.length === 2 ? lang.startsWith(want) : lang === want;
    });
    const local = fits.find((voice) => voice.localService);
    if (local || fits[0]) return local ?? fits[0];
  }
  return undefined;
};

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export const normalize = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const NUMBER_WORDS: Record<VoiceLocale, string[][]> = {
  // index = value; each entry lists the words that mean it
  en: [[], ['one', 'first'], ['two', 'second'], ['three', 'third'], ['four', 'fourth'], ['five', 'fifth'], ['six', 'sixth'], ['seven', 'seventh'], ['eight', 'eighth'], ['nine', 'ninth'], ['ten', 'tenth']],
  es: [[], ['uno', 'una', 'un', 'primero', 'primera'], ['dos', 'segundo', 'segunda'], ['tres', 'tercero', 'tercera'], ['cuatro', 'cuarto', 'cuarta'], ['cinco', 'quinto', 'quinta'], ['seis', 'sexto', 'sexta'], ['siete', 'septimo', 'septima'], ['ocho', 'octavo', 'octava'], ['nueve', 'noveno', 'novena'], ['diez', 'decimo', 'decima']],
  de: [[], ['eins', 'ein', 'eine', 'erste', 'erstes', 'ersten', 'erster'], ['zwei', 'zwo', 'zweite', 'zweites', 'zweiten'], ['drei', 'dritte', 'drittes', 'dritten'], ['vier', 'vierte', 'viertes', 'vierten'], ['funf', 'fuenf', 'funfte', 'funften'], ['sechs', 'sechste', 'sechsten'], ['sieben', 'siebte', 'siebten'], ['acht', 'achte', 'achten'], ['neun', 'neunte', 'neunten'], ['zehn', 'zehnte', 'zehnten']],
  fr: [[], ['un', 'une', 'premier', 'premiere'], ['deux', 'deuxieme', 'second', 'seconde'], ['trois', 'troisieme'], ['quatre', 'quatrieme'], ['cinq', 'cinquieme'], ['six', 'sixieme'], ['sept', 'septieme'], ['huit', 'huitieme'], ['neuf', 'neuvieme'], ['dix', 'dixieme']],
};

/** Words that carry no meaning of their own in an answer. */
const FILLER: Record<VoiceLocale, string[]> = {
  en: ['the', 'a', 'an', 'and', 'of', 'please', 'option', 'number', 'i', 'we', 'want', 'like', 'would', 'just', 'um', 'uh', 'its', 'it', 's', 'is', 'my', 'our', 'with', 'us'],
  es: ['el', 'la', 'los', 'las', 'de', 'del', 'y', 'por', 'favor', 'opcion', 'numero', 'quiero', 'queremos', 'me', 'nos', 'eh', 'es', 'un', 'una', 'con', 'mi', 'en'],
  de: ['der', 'die', 'das', 'und', 'bitte', 'option', 'nummer', 'ich', 'wir', 'mochte', 'mochten', 'will', 'ah', 'ahm', 'ist', 'mit', 'ein', 'eine', 'den', 'dem', 'zu', 'mein'],
  fr: ['le', 'la', 'les', 'de', 'des', 'du', 'et', 's', 'il', 'vous', 'plait', 'option', 'numero', 'je', 'nous', 'veux', 'voudrais', 'euh', 'c', 'est', 'l', 'd', 'un', 'une', 'avec', 'en', 'au'],
};

const COMMANDS: Record<VoiceLocale, Record<VoiceCommand, string[]>> = {
  en: {
    next: ['next', 'continue', 'done', 'ready', 'go on', 'go ahead', 'thats it', 'finished', 'ok', 'okay', 'build my day', 'skip'],
    back: ['back', 'go back', 'previous'],
    repeat: ['repeat', 'again', 'say that again', 'what', 'pardon'],
    none: ['nothing', 'none', 'no', 'nope', 'nothing applies', 'all good'],
    stop: ['stop', 'quiet', 'be quiet', 'stop talking', 'voice off'],
  },
  es: {
    next: ['siguiente', 'continuar', 'continua', 'listo', 'lista', 'listos', 'ya', 'adelante', 'sigue', 'seguir', 'eso es todo', 'ok', 'vale', 'omitir', 'saltar'],
    back: ['atras', 'volver', 'regresar', 'anterior'],
    repeat: ['repite', 'repetir', 'otra vez', 'de nuevo', 'como', 'que'],
    none: ['nada', 'ninguno', 'ninguna', 'no', 'todo bien'],
    stop: ['para', 'basta', 'silencio', 'callate', 'detente'],
  },
  de: {
    next: ['weiter', 'fertig', 'nachste', 'naechste', 'los', 'ok', 'okay', 'das wars', 'passt', 'uberspringen'],
    back: ['zuruck', 'zurueck', 'vorherige'],
    repeat: ['wiederholen', 'nochmal', 'noch mal', 'noch einmal', 'wie bitte', 'was'],
    none: ['nichts', 'keins', 'keine', 'nein', 'nichts davon', 'alles gut'],
    stop: ['stopp', 'stop', 'ruhe', 'halt', 'leise'],
  },
  fr: {
    next: ['suivant', 'suivante', 'continuer', 'continue', 'termine', 'fini', 'c est bon', 'ok', 'd accord', 'cest bon', 'passer', 'vas y'],
    back: ['retour', 'precedent', 'precedente', 'revenir'],
    repeat: ['repete', 'repeter', 'encore', 'pardon', 'quoi', 'comment'],
    none: ['rien', 'aucun', 'aucune', 'non', 'rien de tout ca', 'tout va bien'],
    stop: ['stop', 'arrete', 'silence', 'tais toi'],
  },
};

/** Word in, number out — "three", "tres", "drei", "trois" and "3" all give 3. */
export const numberIn = (text: string, locale: VoiceLocale): number | null => {
  const words = normalize(text).split(' ');
  for (const word of words) {
    if (/^\d+$/.test(word)) return Number(word);
    const value = NUMBER_WORDS[locale].findIndex((list) => list.includes(word));
    if (value > 0) return value;
  }
  return null;
};

const significant = (text: string, locale: VoiceLocale): string[] => {
  const filler = new Set(FILLER[locale]);
  return normalize(text)
    .split(' ')
    .filter((word) => word && !filler.has(word));
};

/** Two words are the same if they agree on a stem — "snorkel" ≈ "snorkelling". */
const sameWord = (a: string, b: string): boolean => {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4) return false;
  const stem = Math.min(a.length, b.length, 6);
  return a.slice(0, stem) === b.slice(0, stem);
};

const commandIn = (heard: string, locale: VoiceLocale): VoiceCommand | null => {
  const text = ` ${normalize(heard)} `;
  const table = COMMANDS[locale];
  // The whole utterance must be the command (give or take filler), so that
  // "no early mornings" is an answer, not "no".
  const bare = ` ${significant(heard, locale).join(' ')} `;
  for (const command of Object.keys(table) as VoiceCommand[]) {
    if (table[command].some((phrase) => bare === ` ${phrase} ` || text === ` ${phrase} `)) return command;
  }
  return null;
};

/**
 * Score one option against one utterance: the share of the option's
 * meaningful words that were said, with a bonus when the label was said
 * whole. Numbers inside a label ("30 – 44") count as words.
 */
const scoreOption = (heard: string, option: VoiceOption, locale: VoiceLocale): number => {
  const said = significant(heard, locale);
  if (said.length === 0) return 0;
  const phrases = [option.label, ...(option.aliases ?? [])];
  let best = 0;
  for (const phrase of phrases) {
    const want = significant(phrase, locale);
    if (want.length === 0) continue;
    const hits = want.filter((word) => said.some((saidWord) => sameWord(word, saidWord))).length;
    let score = hits / want.length;
    if (normalize(heard).includes(normalize(phrase))) score += 0.5;
    // Between two labels said in full, the longer one is the more specific
    // answer: "anniversaire de mariage" over "anniversaire".
    score += hits * 0.01;
    best = Math.max(best, score);
  }
  return best;
};

/**
 * Decide what the guest said.
 *
 * `alternatives` are the recogniser's guesses, best first. Each is tried in
 * turn: a command, then an option by its words, then a spoken number — as a
 * value when the question asks for one, otherwise as "option number N".
 */
export const matchUtterance = (
  alternatives: string[],
  options: VoiceOption[],
  locale: VoiceLocale,
  opts: { wantsNumber?: boolean } = {}
): VoiceMatch | null => {
  const guesses = alternatives.filter(Boolean);

  // Words first, across every guess: the recogniser's second guess naming an
  // option beats its first guess containing a stray number.
  for (const heard of guesses) {
    const command = commandIn(heard, locale);
    if (command) return { kind: 'command', command, heard };

    if (options.length > 0) {
      const ranked = options
        .map((option) => ({ option, score: scoreOption(heard, option, locale) }))
        .sort((a, b) => b.score - a.score);
      const [first, second] = ranked;
      // Clear winner only: half the words of a label, and ahead of the rest.
      if (first && first.score >= 0.5 && (!second || first.score > second.score)) {
        return { kind: 'option', id: first.option.id, heard };
      }
    }
  }

  // Then a number said on its own ("three", "number two", "drei Tage"), as a
  // value when the question asks for one, otherwise as "option N". A longer
  // phrase such as "thirty to forty four" is not read as "four".
  for (const heard of guesses) {
    if (significant(heard, locale).length > 2) continue;
    const value = numberIn(heard, locale);
    if (value === null) continue;
    if (opts.wantsNumber) return { kind: 'number', value, heard };
    const option = options[value - 1];
    if (option) return { kind: 'option', id: option.id, heard };
  }
  return null;
};

/** "a, b, c or d" in the guest's language. */
export const spokenList = (items: string[], or: string): string =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} ${or} ${items[items.length - 1]}`;

/** Labels such as "$80 – $150" read badly; give the synthesiser plain words. */
export const speakable = (text: string, locale: VoiceLocale): string => {
  const to = { en: 'to', es: 'a', de: 'bis', fr: 'à' }[locale];
  const dollars = { en: 'dollars', es: 'dólares', de: 'Dollar', fr: 'dollars' }[locale];
  return text
    .replace(/\s*[–—-]\s*(?=\$?\d)/g, ` ${to} `)
    .replace(/(\d+)\s*\+/g, (_, n) => `${n} ${locale === 'en' ? 'plus' : '+'}`)
    .replace(/\$(\d+)/g, (_, n) => `${n} ${dollars}`)
    .replace(/\n/g, ' ');
};
