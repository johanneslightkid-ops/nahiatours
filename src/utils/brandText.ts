/**
 * Brand tokens in editable content.
 *
 * Blog posts and story copy used to name the company in their body text, so
 * renaming the business left the old name scattered through the content. They
 * carry `{{brand}}` instead, substituted here at render time with whatever the
 * brand is configured to be — the same name the menu bar shows.
 *
 * Content authored in the admin panel can use `{{brand}}` too.
 */

const BRAND_TOKEN = /\{\{\s*brand\s*\}\}/g;

/** Replaces every brand token in a single string. */
export const applyBrandTokens = (value: string, brandName: string): string =>
  value.replace(BRAND_TOKEN, brandName);

/**
 * Same substitution applied through a whole structure, leaving non-strings
 * untouched. Used on API payloads whose shape varies (blog articles, story
 * sections) so callers do not have to name every text field.
 */
export const applyBrandTokensDeep = <T>(value: T, brandName: string): T => {
  if (typeof value === 'string') {
    return applyBrandTokens(value, brandName) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyBrandTokensDeep(item, brandName)) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = applyBrandTokensDeep(item, brandName);
    }
    return result as unknown as T;
  }
  return value;
};
