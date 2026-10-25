import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { text } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => {
		const body = await readBody(request);
		incidents.reject(Number(params.id), user, text(body, 'reason', { required: true, max: 200 })!);
	});
};
