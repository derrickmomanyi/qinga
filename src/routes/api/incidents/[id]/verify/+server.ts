import type { RequestHandler } from './$types';
import { incidents } from '#lib/server/incidents/incidents.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { bool, text } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => {
		const body = await readBody(request);
		incidents.verify(Number(params.id), user, {
			confirmedBy: text(body, 'confirmed_by', { required: true, max: 80 })!,
			summary: text(body, 'summary', { required: true, max: 200 })!,
			advice: text(body, 'advice', { max: 300 }),
			severity: text(body, 'severity'),
			extreme: bool(body, 'extreme')
		});
	});
};
