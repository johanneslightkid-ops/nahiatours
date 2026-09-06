import React, { useState } from 'react';
import { setAdminPassword } from '../services/authStore';

interface PasswordModalProps {
	onAuthenticate: (authenticated: boolean) => void;
}

/**
 * Admin gate.
 *
 * This used to compare the typed password against
 * `import.meta.env.VITE_ADMIN_PASSWORD`, a build-time constant. That shipped
 * the password to every visitor in the JS bundle, and it broke outright on the
 * Worker deployment: wrangler.toml [vars] are runtime values, so the Vite build
 * never saw one, the constant compiled to '', and the `expected &&` guard
 * rejected every password including the right one.
 *
 * The check now happens on the server (/api/admin-auth), against the same
 * runtime variable the write endpoints use. Nothing secret reaches the browser,
 * and there is a single source of truth for what the password is.
 */
const PasswordModal: React.FC<PasswordModalProps> = ({ onAuthenticate }) => {
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isChecking, setIsChecking] = useState(false);

	const handleSubmit = async (e?: React.FormEvent) => {
		e?.preventDefault();
		if (isChecking || !password) return;

		setIsChecking(true);
		setError(null);

		try {
			const response = await fetch('/api/admin-auth', {
				method: 'POST',
				headers: { 'X-Admin-Password': password },
				cache: 'no-store',
			});

			if (response.ok) {
				// apiClient reads this back to sign admin writes.
				setAdminPassword(password);
				onAuthenticate(true);
				return;
			}

			const body = await response.json().catch(() => null);
			// A 500 means the deployment has no password configured — say so,
			// rather than leaving someone retyping a correct password.
			setError(body?.error || 'Incorrect password');
		} catch {
			setError('Could not reach the server. Check your connection and try again.');
		} finally {
			setIsChecking(false);
		}
	};

	return (
		<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/60 p-4">
			<div className="w-full max-w-md rounded-[26px] border-[3px] border-ink bg-paper p-6 shadow-ink-lg">
				<h2 className="mb-4 font-display text-xl font-extrabold text-ink">Admin login</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="Enter admin password"
						autoFocus
						disabled={isChecking}
						className="w-full rounded-xl border-2 border-ink px-4 py-3 disabled:opacity-60"
					/>
					{error && <div className="text-sm font-bold text-hibiscus-dark">{error}</div>}
					<div className="flex justify-end">
						<button type="submit" disabled={isChecking || !password} className="tropical-button disabled:opacity-60">
							{isChecking ? 'Checking…' : 'Enter'}
						</button>
					</div>
				</form>
				<p className="mt-3 text-xs font-semibold text-ink-light">Enter admin password to access dashboard.</p>
			</div>
		</div>
	);
};

export default PasswordModal;
