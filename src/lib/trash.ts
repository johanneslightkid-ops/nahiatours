import { getAdminPassword } from '../services/authStore';

/**
 * The admin's wastebasket, from the browser's side (the server is
 * functions/api/trash.ts). An admin page that deletes something asks first
 * (`confirmTrash`), puts a copy here (`moveToTrash`), and only then removes
 * it. Admin › Papelera lists what is here by section, puts things back, or
 * deletes them for good.
 */

/** What kind of thing an item is; it decides how it is put back. */
export type TrashSection = 'tours' | 'transport' | 'vehicles' | 'blog' | 'testimonials' | 'destinations';

export interface TrashItem<T = unknown> {
  id: string;
  at: number;
  section: TrashSection;
  label: string;
  locale?: string;
  data: T;
}

const headers = () => ({ 'Content-Type': 'application/json', 'X-Admin-Password': getAdminPassword() ?? '' });

const read = async (response: Response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((body as { error?: string }).error || `HTTP ${response.status}`);
  return body;
};

/**
 * Ask before deleting. Says where the thing will go, so "Eliminar" is never a
 * surprise and never final.
 */
export const confirmTrash = (label: string): boolean =>
  window.confirm(`¿Eliminar «${label || 'este elemento'}»?\n\nSe moverá a la papelera (Admin › Papelera), desde donde puedes recuperarlo o borrarlo para siempre.`);

/**
 * Keep a copy in the wastebasket. Resolves false (and says so in the console)
 * when it could not, so the caller can decide whether to delete anyway.
 */
export const moveToTrash = async <T>(section: TrashSection, label: string, data: T, locale?: string): Promise<boolean> => {
  try {
    await read(await fetch('/api/trash', { method: 'POST', headers: headers(), body: JSON.stringify({ section, label, data, locale }) }));
    return true;
  } catch (error) {
    console.error('Could not put the item in the wastebasket:', error);
    return false;
  }
};

/**
 * The usual sequence: ask, keep a copy, and say so if the copy failed — then
 * the operator chooses whether to delete without a way back.
 */
export const confirmAndTrash = async <T>(section: TrashSection, label: string, data: T, locale?: string): Promise<boolean> => {
  if (!confirmTrash(label)) return false;
  if (await moveToTrash(section, label, data, locale)) return true;
  return window.confirm('No se pudo guardar una copia en la papelera. ¿Eliminar de todos modos, sin poder recuperarlo?');
};

export const listTrash = async (): Promise<TrashItem[]> => {
  const body = await read(await fetch('/api/trash', { headers: headers(), cache: 'no-store' }));
  return Array.isArray(body.items) ? body.items : [];
};

export const purgeTrash = async (which: { id: string } | { section: TrashSection } | { all: true }): Promise<number> => {
  const query = 'id' in which ? `id=${encodeURIComponent(which.id)}` : 'section' in which ? `section=${which.section}` : 'all=1';
  const body = await read(await fetch(`/api/trash?${query}`, { method: 'DELETE', headers: headers() }));
  return Number(body.deleted) || 0;
};
