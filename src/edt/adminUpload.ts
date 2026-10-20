import { getAdminPassword } from '../services/authStore';

/**
 * Upload one file through /api/upload (Cloudinary, signed on the server) and
 * return its URL. Unlike the tours' image helper this throws on failure, so
 * an admin page can say so instead of saving a placeholder.
 */
export const uploadAdminFile = async (file: File, folder: string): Promise<string> => {
  const form = new FormData();
  form.append('file', file);
  form.append('folder', folder);
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'X-Admin-Password': getAdminPassword() ?? '' },
    body: form,
  });
  const data = (await response.json().catch(() => ({}))) as { secure_url?: string; error?: string };
  if (!response.ok || !data.secure_url) throw new Error(data.error || `Upload failed (${response.status})`);
  return data.secure_url;
};

export type AdminLang = 'en' | 'es' | 'fr' | 'de';

/** Admin copy: English and Spanish written out, French and German falling back to English. */
export const adminText = (lang: AdminLang, text: { en: string; es: string; fr?: string; de?: string }) => text[lang] ?? text.en;
