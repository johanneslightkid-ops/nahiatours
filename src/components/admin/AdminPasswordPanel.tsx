import React, { useState } from 'react';
import { FaKey, FaCheck } from 'react-icons/fa';
import { changeAdminPassword, ADMIN_PASSWORD_MIN_LENGTH } from '../../services/adminPasswordService';

type Status = { kind: 'idle' } | { kind: 'ok' } | { kind: 'error'; message: string };

/**
 * Change the admin password.
 *
 * The password used to be whatever was committed to wrangler.toml, which meant
 * changing it was a code change and a redeploy — so in practice it stayed as
 * the default. This writes the new one to KV, where the server checks it
 * first, so a change takes effect on the next request.
 *
 * The current password is not asked for: this panel only renders behind the
 * gate, and the session already holds it. Asking again would be theatre.
 */
const AdminPasswordPanel: React.FC = () => {
  const [next, setNext] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const tooShort = next.length > 0 && next.length < ADMIN_PASSWORD_MIN_LENGTH;
  const mismatch = confirmation.length > 0 && confirmation !== next;
  const canSave = !saving && next.length >= ADMIN_PASSWORD_MIN_LENGTH && confirmation === next;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus({ kind: 'idle' });
    try {
      await changeAdminPassword(next);
      setNext('');
      setConfirmation('');
      setStatus({ kind: 'ok' });
    } catch (error: any) {
      setStatus({ kind: 'error', message: error?.message || 'No se pudo cambiar la contraseña.' });
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full rounded-2xl border border-ink/15 bg-paper-card px-4 py-3 text-ink ' +
    'outline-none transition focus:border-lagoon-dark';

  return (
    <div className="mt-6 rounded-3xl border border-ink/10 p-5">
      <div className="mb-1 flex items-center gap-2">
        <FaKey className="text-lagoon-dark" />
        <h3 className="text-lg font-semibold text-ink">Contraseña del panel</h3>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-ink-soft">
        Cambia la contraseña con la que se entra a este panel. El cambio es inmediato: la
        próxima vez que alguien entre, tendrá que usar la nueva.
      </p>

      <div className="grid gap-4 md:max-w-xl md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Nueva contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            className={field}
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-ink-soft">Repite la contraseña</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') handleSave();
            }}
            className={field}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="rounded-full bg-lagoon-dark px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Cambiar contraseña'}
        </button>

        {tooShort && (
          <span className="text-sm text-sunset-dark">
            Al menos {ADMIN_PASSWORD_MIN_LENGTH} caracteres.
          </span>
        )}
        {mismatch && <span className="text-sm text-sunset-dark">Las dos no coinciden.</span>}
        {status.kind === 'error' && <span className="text-sm text-sunset-dark">{status.message}</span>}
        {status.kind === 'ok' && (
          <span className="flex items-center gap-2 text-sm font-semibold text-lagoon-dark">
            <FaCheck /> Contraseña cambiada.
          </span>
        )}
      </div>
    </div>
  );
};

export default AdminPasswordPanel;
