import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { get, insert, run } from '../db/client';
import { audit } from '../audit/audit.service';

export type SessionUser = NonNullable<App.Locals['user']>;

const SESSION_DAYS = 7;
export const SESSION_COOKIE = 'qinga_session';

class AuthService {
	hash(password: string): string {
		const salt = randomBytes(16).toString('hex');
		const key = scryptSync(password, salt, 64).toString('hex');
		return `${salt}:${key}`;
	}

	private matches(password: string, stored: string): boolean {
		const [salt, key] = stored.split(':');
		const candidate = scryptSync(password, salt, 64);
		const expected = Buffer.from(key, 'hex');
		return candidate.length === expected.length && timingSafeEqual(candidate, expected);
	}

	createUser(name: string, email: string, password: string, role: string, org: string): number {
		return insert(
			'INSERT INTO users (name, email, password_hash, role, org) VALUES (?, ?, ?, ?, ?)',
			name,
			email.toLowerCase(),
			this.hash(password),
			role,
			org
		);
	}

	login(email: string, password: string): { sessionId: string; expires: Date; user: SessionUser } | null {
		const row = get<SessionUser & { password_hash: string }>(
			'SELECT id, name, email, role, org, password_hash FROM users WHERE email = ?',
			email.toLowerCase()
		);
		if (!row || !this.matches(password, row.password_hash)) return null;
		const sessionId = randomBytes(24).toString('hex');
		const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
		insert('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', sessionId, row.id, expires.toISOString());
		audit.record('user', row.id, 'signed_in', row.name);
		const { password_hash: _, ...user } = row;
		return { sessionId, expires, user };
	}

	userForSession(sessionId: string | undefined): SessionUser | null {
		if (!sessionId) return null;
		const user = get<SessionUser>(
			`SELECT u.id, u.name, u.email, u.role, u.org FROM sessions s JOIN users u ON u.id = s.user_id
			 WHERE s.id = ? AND s.expires_at > ?`,
			sessionId,
			new Date().toISOString()
		);
		return user ?? null;
	}

	logout(sessionId: string | undefined) {
		if (sessionId) run('DELETE FROM sessions WHERE id = ?', sessionId);
	}
}

export const auth = new AuthService();
