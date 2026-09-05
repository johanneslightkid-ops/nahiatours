
import React, { useState } from 'react';
import { setAdminPassword } from '../services/authStore';

interface PasswordModalProps {
	onAuthenticate: (authenticated: boolean) => void;
}

const PasswordModal: React.FC<PasswordModalProps> = ({ onAuthenticate }) => {
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e?: React.FormEvent) => {
		e?.preventDefault();
		const expected = (import.meta.env.VITE_ADMIN_PASSWORD ?? '').toString();
		if (expected && password === expected) {
			setAdminPassword(password);
			setError(null);
			onAuthenticate(true);
		} else {
			setError('Incorrect password');
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
						className="w-full rounded-xl border-2 border-ink px-4 py-3"
					/>
					{error && <div className="text-sm font-bold text-hibiscus-dark">{error}</div>}
					<div className="flex justify-end">
						<button
							type="submit"
							className="tropical-button"
						>
							Enter
						</button>
					</div>
				</form>
				<p className="mt-3 text-xs font-semibold text-ink-light">Enter admin password to access dashboard.</p>
			</div>
		</div>
	);
};

export default PasswordModal;
