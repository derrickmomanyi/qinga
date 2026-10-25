import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { auth, SESSION_COOKIE } from '#lib/server/auth/auth.service.ts';

export const POST: RequestHandler = ({ cookies }) => {
	auth.logout(cookies.get(SESSION_COOKIE));
	cookies.delete(SESSION_COOKIE, { path: '/' });
	return json({ ok: true });
};
