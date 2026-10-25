import type { RequestHandler } from './$types';
import { auth, SESSION_COOKIE } from '#lib/server/auth/auth.service.ts';
import { readBody, respond } from '#lib/server/shared/http.ts';
import { text, ValidationError } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ request, cookies, url }) =>
	respond(async () => {
		const body = await readBody(request);
		const session = auth.login(text(body, 'email', { required: true })!, text(body, 'password', { required: true })!);
		if (!session) throw new ValidationError('Wrong email or password', 'password');
		cookies.set(SESSION_COOKIE, session.sessionId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: url.protocol === 'https:',
			expires: session.expires
		});
		return { user: session.user };
	});
