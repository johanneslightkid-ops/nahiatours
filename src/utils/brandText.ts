/**
 * The company's names in text: which one a sentence gets, and the tokens in
 * editable content.
 *
 * A business has a brand name and, often, the person guests deal with
 * (Admin › Marca: "Nombre del negocio", "Persona de contacto"). Where the
 * sentence settles which one it means, it gets that one — the legal pages and
 * the copyright name the company; "Maria will get back to you personally"
 * names the person. Everywhere else the site uses the one the admin prefers.
 * Whichever is asked for, the other stands in when it is not set.
 *
 * Content carries tokens rather than a written-out name, so renaming the
 * business renames it everywhere at once:
 *
 *   {{brand}}    the company      (contact person when there is no company name)
 *   {{contact}}  the person       (company when there is no contact person)
 *   {{name}}     the preferred one of the two
 */
export type NamePreference = 'brand' | 'contact';

export interface SiteNames {
  brand: string;
  contact: string;
  name: string;
}

export const siteNames = (settings: { brandName?: string; contactName?: string; namePreference?: NamePreference }): SiteNames => {
  const company = (settings.brandName ?? '').trim();
  const person = (settings.contactName ?? '').trim();
  const brand = company || person;
  const contact = person || company;
  return { brand, contact, name: settings.namePreference === 'contact' ? contact : brand };
};

const TOKEN = /\{\{\s*(brand|contact|name)\s*\}\}/g;

/** Replaces every name token in a single string. A bare string fills all three. */
export const applyBrandTokens = (value: string, names: SiteNames | string): string => {
  const set = typeof names === 'string' ? { brand: names, contact: names, name: names } : names;
  return value.replace(TOKEN, (_token, key: keyof SiteNames) => set[key]);
};

/**
 * Same substitution applied through a whole structure, leaving non-strings
 * untouched. Used on API payloads whose shape varies (blog articles, story
 * sections) so callers do not have to name every text field.
 */
export const applyBrandTokensDeep = <T>(value: T, names: SiteNames | string): T => {
  if (typeof value === 'string') {
    return applyBrandTokens(value, names) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyBrandTokensDeep(item, names)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = applyBrandTokensDeep(item, names);
    }
    return result as unknown as T;
  }
  return value;
};
