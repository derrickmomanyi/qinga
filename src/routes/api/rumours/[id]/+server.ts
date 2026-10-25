import type { RequestHandler } from './$types';
import { rumours, RUMOUR_STATUSES } from '#lib/server/rumours/rumours.service.ts';
import { readBody, requireUser, respond } from '#lib/server/shared/http.ts';
import { number, oneOf, text } from '#lib/server/shared/validation.ts';

export const POST: RequestHandler = async ({ params, locals, request }) => {
	const user = requireUser(locals);
	return respond(async () => {
		const body = await readBody(request);
		rumours.resolve(
			Number(params.id),
			user,
			oneOf(body, 'status', RUMOUR_STATUSES)!,
			text(body, 'verdict', { max: 300 }),
			number(body, 'incident_id', { min: 1 })
		);
	});
};
