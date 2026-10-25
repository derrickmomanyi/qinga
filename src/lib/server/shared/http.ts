import { error, json } from '@sveltejs/kit';
import { ValidationError } from './validation';

type User = NonNullable<App.Locals['user']>;

export function requireUser(locals: App.Locals): User {
	if (!locals.user) error(401, 'Sign in to the Qinga team desk first');
	return locals.user;
}

// Turns validation problems into 422 responses; anything else bubbles up as a 500.
export async function respond(fn: () => unknown | Promise<unknown>, status = 200): Promise<Response> {
	try {
		const data = await fn();
		return json(data ?? { ok: true }, { status });
	} catch (err) {
		if (err instanceof ValidationError) return json({ error: err.message, field: err.field }, { status: 422 });
		throw err;
	}
}

export async function readBody(request: Request): Promise<FormData | Record<string, unknown>> {
	const type = request.headers.get('content-type') ?? '';
	if (type.includes('application/json')) return (await request.json()) as Record<string, unknown>;
	return await request.formData();
}
