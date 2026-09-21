import { getAdminPassword, setAdminPassword } from './authStore';

/** Mirrors ADMIN_PASSWORD_MIN_LENGTH in shared/adminAuth.ts. */
export const ADMIN_PASSWORD_MIN_LENGTH = 4;

/**
 * Change the admin password.
 *
 * The current password is the one this session logged in with, so it is read
 * from the auth store rather than typed again — the operator is already past
 * the gate. On success the store is updated in place, so every later admin
 * write keeps authenticating without a re-login.
 *
 * Throws with the server's own message, which is written for the operator and
 * already in Spanish.
 */
export const changeAdminPassword = async (newPassword: string): Promise<void> => {
  const current = getAdminPassword();
  if (!current) {
    throw new Error('Tu sesión expiró. Vuelve a entrar al panel e inténtalo otra vez.');
  }

  const response = await fetch('/api/admin-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': current,
    },
    cache: 'no-store',
    body: JSON.stringify({ newPassword }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(body?.error || 'No se pudo cambiar la contraseña.');
  }

  // The old password would be rejected by the very next request, so the
  // session has to move to the new one at the same moment the server does.
  setAdminPassword(newPassword);
};
