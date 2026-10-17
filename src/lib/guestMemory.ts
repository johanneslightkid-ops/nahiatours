/**
 * The guest's own details, remembered on their device so the next form they
 * meet is already filled in — the contact form, the call-back request, the
 * payment widget. Nothing here leaves the browser except when the guest
 * sends a form themselves.
 */
export interface GuestProfile {
  name?: string;
  phone?: string;
  email?: string;
}

const KEY = 'guest_profile_v1';

export const readGuest = (): GuestProfile => {
  try {
    const raw = localStorage.getItem(KEY);
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

export const rememberGuest = (patch: GuestProfile) => {
  try {
    const next = { ...readGuest() };
    (Object.keys(patch) as Array<keyof GuestProfile>).forEach((key) => {
      const value = String(patch[key] ?? '').trim();
      if (value) next[key] = value.slice(0, 120);
    });
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the forms simply start empty next time */
  }
};
